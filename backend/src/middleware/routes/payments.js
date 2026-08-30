const express = require('express');
const crypto = require('crypto');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { PRICING, resolvePricing } = require('../utils/pricing');

const router = express.Router();

// The client only ever sends which region tier they picked (NG / AFRICA / INTL) -
// never an amount. The actual price is always looked up here, server-side, so
// nobody can pay less by editing frontend JS or the network request.
router.get('/pricing', (req, res) => {
  res.json({ pricing: PRICING });
});

const PAYSTACK_BASE = 'https://api.paystack.co';

async function paystackFetch(path, options = {}) {
  const res = await fetch(`${PAYSTACK_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || `Paystack error (${res.status})`);
  return data;
}

// Start a checkout - returns a hosted Paystack payment page URL to redirect the user to.
router.post('/initialize', requireAuth, async (req, res) => {
  if (!process.env.PAYSTACK_SECRET_KEY) return res.status(500).json({ error: 'Paystack is not configured on the server' });

  const region = ['NG', 'AFRICA', 'INTL'].includes(req.body?.region) ? req.body.region : 'INTL';
  const { amount, currency } = resolvePricing(region);

  try {
    const reference = 'rsm_' + crypto.randomBytes(12).toString('hex');
    const callbackUrl = `${process.env.APP_URL}/payment/callback`;

    const data = await paystackFetch('/transaction/initialize', {
      method: 'POST',
      body: JSON.stringify({
        email: req.user.email,
        amount,
        currency,
        reference,
        callback_url: callbackUrl,
        metadata: { user_id: req.user.id, region },
      }),
    });

    db.prepare('INSERT INTO payments (id, user_id, reference, region, amount, currency, status, created_at) VALUES (?,?,?,?,?,?,?,?)').run(
      crypto.randomUUID(), req.user.id, reference, region, amount, currency, 'pending', Date.now()
    );

    res.json({ authorizationUrl: data.data.authorization_url, reference });
  } catch (err) {
    res.status(502).json({ error: err.message || 'Could not start checkout' });
  }
});

// Called by the frontend after Paystack redirects back, to confirm and unlock premium.
router.get('/verify/:reference', requireAuth, async (req, res) => {
  if (!process.env.PAYSTACK_SECRET_KEY) return res.status(500).json({ error: 'Paystack is not configured on the server' });
  const { reference } = req.params;
  try {
    const data = await paystackFetch(`/transaction/verify/${encodeURIComponent(reference)}`);
    const tx = data.data;
    const success = tx.status === 'success';

    db.prepare('UPDATE payments SET status = ? WHERE reference = ?').run(success ? 'success' : tx.status, reference);

    if (success) {
      db.prepare('UPDATE users SET plan = ? WHERE id = ?').run('premium', req.user.id);
    }
    const user = db.prepare('SELECT id, name, email, plan, phone, location, website FROM users WHERE id = ?').get(req.user.id);
    res.json({ success, user });
  } catch (err) {
    res.status(502).json({ error: err.message || 'Could not verify payment' });
  }
});

// Paystack server-to-server webhook - the reliable source of truth in production.
// server.js captures req.rawBody via express.json's verify hook so the signature can be checked.
router.post('/webhook', (req, res) => {
  const signature = req.headers['x-paystack-signature'];
  const expected = crypto.createHmac('sha512', process.env.PAYSTACK_SECRET_KEY || '').update(req.rawBody || Buffer.from('')).digest('hex');
  if (!signature || signature !== expected) return res.status(401).send('Invalid signature');

  const event = req.body;
  if (event.event === 'charge.success') {
    const tx = event.data;
    const payment = db.prepare('SELECT * FROM payments WHERE reference = ?').get(tx.reference);
    if (payment) {
      db.prepare('UPDATE payments SET status = ? WHERE reference = ?').run('success', tx.reference);
      db.prepare('UPDATE users SET plan = ? WHERE id = ?').run('premium', payment.user_id);
    }
  }
  res.sendStatus(200);
});

module.exports = router;