const jwt = require('jsonwebtoken');
const db = require('../db');

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = db.prepare('SELECT id, name, email, plan, phone, location, website FROM users WHERE id = ?').get(payload.sub);
    if (!user) return res.status(401).json({ error: 'Not authenticated' });
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requirePremium(req, res, next) {
  if (req.user.plan !== 'premium') {
    return res.status(403).json({ error: 'This feature requires a premium subscription', code: 'PREMIUM_REQUIRED' });
  }
  next();
}

module.exports = { requireAuth, requirePremium };
