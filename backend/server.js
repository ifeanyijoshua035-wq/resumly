require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const db = require('./src/db');
const authRoutes = require('./src/routes/auth');
const resumeRoutes = require('./src/routes/resumes');
const coverRoutes = require('./src/routes/covers');
const jobRoutes = require('./src/routes/jobs');
const aiRoutes = require('./src/routes/ai');
const paymentRoutes = require('./src/routes/payments');
const publicRoutes = require('./src/routes/public');

if (!process.env.JWT_SECRET) {
  console.error('Missing JWT_SECRET in .env - copy .env.example to .env and fill it in.');
  process.exit(1);
}

const app = express();
app.set('trust proxy', 1); // needed for correct client IPs behind a host's reverse proxy (Render, Railway, etc.)

// CSP is left off by default because this app intentionally loads Google Fonts
// and the html2canvas/jsPDF scripts from cdnjs - tune contentSecurityPolicy
// once you've settled on a final CDN list, rather than fighting it during dev.
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
// Flutterwave webhooks are verified with a static secret header (see
// routes/payments.js), not an HMAC over the raw body, so a plain JSON parser
// is all that's needed here.
app.use(express.json());

// Rate limits protect against brute-forced logins, spammed registrations, and
// runaway Gemini/Flutterwave API costs from a single abusive client.
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false });
const aiLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 40, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many AI requests - please wait a bit and try again.' } });
const paymentLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false });

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/ai', aiLimiter);
app.use('/api/payments/initialize', paymentLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/resumes', resumeRoutes);
app.use('/api/covers', coverRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/public/resumes', publicRoutes);

app.get('/api/health', (req, res) => res.json({ ok: true }));

// Serve the frontend
app.use(express.static(path.join(__dirname, 'public')));
// '/r/:id' is a real (non-hash) path so shared resume links work as plain
// URLs - anyone opening one gets the SPA shell, which then fetches the
// public resume data client-side and renders a read-only view, no login needed.
app.get(['/', '/payment/callback', '/r/:id'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on the server' });
});

const PORT = process.env.PORT || 4000;

// The Postgres pool connects lazily on first query with better-sqlite3's old
// synchronous file-open, this app could start listening immediately: init()
// now runs the CREATE TABLE statements up front, so a bad DATABASE_URL fails
// loudly at startup instead of on someone's first request.
db.init()
  .then(() => {
    app.listen(PORT, () => console.log(`Resumly API listening on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('Failed to connect to the database - check DATABASE_URL in .env:', err.message);
    process.exit(1);
  });