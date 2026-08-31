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
      phone TEXT DEFAULT '',
      location TEXT DEFAULT '',
      website TEXT DEFAULT '',
      created_at BIGINT NOT NULL
    );

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

    CREATE INDEX IF NOT EXISTS idx_resumes_user ON resumes(user_id);
    CREATE INDEX IF NOT EXISTS idx_covers_user ON cover_letters(user_id);
    CREATE INDEX IF NOT EXISTS idx_jobs_user ON jobs(user_id);
    CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
  `);
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

module.exports = { pool, init, get, all, run };
