const { Pool, types } = require('pg');

// Postgres's BIGINT (used for our millisecond timestamps) and NUMERIC (used
// for payment amounts) columns come back from `pg` as strings by default -
// safe in general since BIGINT can exceed JS's safe integer range, but our
// timestamps never do, and returning them as strings breaks `new Date(...)`
// on the frontend (it tries to parse the string as a date, not a number).
// Parsing them as JS numbers here, once, keeps every route's data shape
// identical to what it was under SQLite.
types.setTypeParser(20, (val) => parseInt(val, 10)); // BIGINT
types.setTypeParser(1700, (val) => parseFloat(val)); // NUMERIC

if (!process.env.DATABASE_URL) {
  console.error('Missing DATABASE_URL in .env - point it at your Postgres connection string (e.g. from Neon).');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Neon (and most managed Postgres providers) require SSL, using certificates
  // that don't always chain to a CA Node trusts by default - relaxing
  // rejectUnauthorized is the standard, documented way to connect to them.
  ssl: { rejectUnauthorized: false },
  // Neon's free tier suspends its compute when idle and "wakes up" on the
  // next connection, which can take a few seconds - pg's 0-second (no limit
  // in older versions) or short default timeout can trip during that wake-up,
  // surfacing as a confusing failure on whatever request happens to be first.
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
  // Fires for errors on idle clients in the pool (e.g. Neon closing a
  // connection after its own idle timeout) - without this handler, such
  // errors crash the whole Node process instead of just failing that query.
  console.error('Unexpected Postgres pool error:', err.message);
});

async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      plan TEXT NOT NULL DEFAULT 'free',
      premium_until BIGINT,
      phone TEXT DEFAULT '',
      location TEXT DEFAULT '',
      website TEXT DEFAULT '',
      created_at BIGINT NOT NULL
    );

    -- Adds the column if this database was created before premium_until
    -- existed. Postgres supports "ADD COLUMN IF NOT EXISTS" directly, unlike
    -- SQLite, so no separate migration step is needed.
    ALTER TABLE users ADD COLUMN IF NOT EXISTS premium_until BIGINT;

    CREATE TABLE IF NOT EXISTS resumes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL DEFAULT 'Untitled resume',
      template TEXT NOT NULL DEFAULT 'classic',
      color TEXT NOT NULL DEFAULT '#2453B8',
      data TEXT NOT NULL,
      is_public BOOLEAN NOT NULL DEFAULT false,
      updated_at BIGINT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cover_letters (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL DEFAULT 'Untitled letter',
      body TEXT NOT NULL DEFAULT '',
      updated_at BIGINT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      company TEXT NOT NULL,
      role TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Saved',
      date TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      created_at BIGINT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      reference TEXT NOT NULL UNIQUE,
      region TEXT NOT NULL DEFAULT 'INTL',
      amount NUMERIC NOT NULL,
      currency TEXT NOT NULL DEFAULT 'NGN',
      status TEXT NOT NULL DEFAULT 'pending',
      created_at BIGINT NOT NULL
    );

    -- One Flutterwave "payment plan" per pricing region, created on demand the
    -- first time someone in that region upgrades. Recurring monthly billing is
    -- attached to whichever plan a user's first charge referenced.
    CREATE TABLE IF NOT EXISTS payment_plans (
      region TEXT PRIMARY KEY,
      flw_plan_id TEXT NOT NULL,
      amount NUMERIC NOT NULL,
      currency TEXT NOT NULL,
      created_at BIGINT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_resumes_user ON resumes(user_id);
    CREATE INDEX IF NOT EXISTS idx_covers_user ON cover_letters(user_id);
    CREATE INDEX IF NOT EXISTS idx_jobs_user ON jobs(user_id);
    CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
  `);
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

// Premium is a real subscription now, not a permanent flag - this is the one
// place that decides whether a user is *currently* entitled to it. Called
// every time a user row is fetched for anything that matters (login, auth
// middleware), so a lapsed renewal downgrades someone the next time they load
// the app, even if the "subscription.cancelled" webhook was somehow missed.
async function applyPlanExpiry(row) {
  if (!row) return row;
  const stillActive = row.premium_until && Number(row.premium_until) > Date.now();
  const effectivePlan = stillActive ? 'premium' : 'free';
  if (effectivePlan !== row.plan) {
    await run('UPDATE users SET plan = $1 WHERE id = $2', [effectivePlan, row.id]);
    row.plan = effectivePlan;
  }
  return row;
}

async function getUserById(id) {
  const row = await applyPlanExpiry(await get('SELECT * FROM users WHERE id = $1', [id]));
  if (row) delete row.password_hash; // never let this leave db.js
  return row;
}
async function getUserByEmail(email) {
  const row = await applyPlanExpiry(await get('SELECT * FROM users WHERE email = $1', [email]));
  if (row) delete row.password_hash;
  return row;
}

// Extends a user's premium period by one billing cycle from whichever is
// later: right now, or their existing expiry (so renewing a few days early
// doesn't cost them time - it stacks onto what they already paid for).
async function extendPremium(userId, days = 30) {
  const user = await get('SELECT premium_until FROM users WHERE id = $1', [userId]);
  const base = user?.premium_until && Number(user.premium_until) > Date.now() ? Number(user.premium_until) : Date.now();
  const premiumUntil = base + days * 24 * 60 * 60 * 1000;
  await run('UPDATE users SET plan = $1, premium_until = $2 WHERE id = $3', ['premium', premiumUntil, userId]);
  return premiumUntil;
}

// Thin helpers mirroring better-sqlite3's .get()/.all()/.run() shape (just
// async now), so the route files stay close to how they read before this
// moved from SQLite to Postgres.
async function get(text, params = []) {
  const res = await pool.query(text, params);
  return res.rows[0];
}
async function all(text, params = []) {
  const res = await pool.query(text, params);
  return res.rows;
}
async function run(text, params = []) {
  const res = await pool.query(text, params);
  return { changes: res.rowCount, rows: res.rows };
}

module.exports = { pool, init, get, all, run, getUserById, getUserByEmail, extendPremium };
