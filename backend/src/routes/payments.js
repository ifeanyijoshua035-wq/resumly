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

const FLW_BASE = 'https://api.flutterwave.com/v3';

async function flwFetch(path, options = {}) {
  const res = await fetch(`${FLW_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${process.env.FLW_SECRET_KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const data = await res.json();
  if (!res.ok || data.status === 'error') throw new Error(data.message || `Flutterwave error (${res.status})`);
  return data;
}

// Start a checkout - returns a hosted Flutterwave payment page link to redirect the user to.
router.post('/initialize', requireAuth, async (req, res) => {
  if (!process.env.FLW_SECRET_KEY) return res.status(500).json({ error: 'Flutterwave is not configured on the server' });

  const region = ['NG', 'AFRICA', 'INTL'].includes(req.body?.region) ? req.body.region : 'INTL';
  const { amount, currency } = resolvePricing(region);

  try {
    const txRef = 'rsm_' + crypto.randomBytes(12).toString('hex');
    const redirectUrl = `${process.env.APP_URL}/payment/callback`;

    const data = await flwFetch('/payments', {
      method: 'POST',
      body: JSON.stringify({
        tx_ref: txRef,
        amount,
        currency,
        redirect_url: redirectUrl,
        customer: { email: req.user.email, name: req.user.name },
        customizations: { title: 'Resumly Premium', description: `Resumly premium upgrade (${region})` },
        meta: { user_id: req.user.id, region },
      }),
    });

    db.prepare('INSERT INTO payments (id, user_id, reference, region, amount, currency, status, created_at) VALUES (?,?,?,?,?,?,?,?)').run(
      crypto.randomUUID(), req.user.id, txRef, region, amount, currency, 'pending', Date.now()
    );

    res.json({ paymentLink: data.data.link, txRef });
  } catch (err) {
    res.status(502).json({ error: err.message || 'Could not start checkout' });
  }
});

// Called by the frontend after Flutterwave redirects back, using the
// transaction_id it appends to the redirect URL, to confirm and unlock premium.
router.get('/verify/:transactionId', requireAuth, async (req, res) => {
  if (!process.env.FLW_SECRET_KEY) return res.status(500).json({ error: 'Flutterwave is not configured on the server' });
  try {
    const data = await flwFetch(`/transactions/${encodeURIComponent(req.params.transactionId)}/verify`);
    const tx = data.data;

    const payment = db.prepare('SELECT * FROM payments WHERE reference = ?').get(tx.tx_ref);
    if (!payment || payment.user_id !== req.user.id) {
      return res.status(404).json({ error: 'No matching payment record for this transaction' });
    }

    // Never trust "successful" alone - also check the amount and currency
    // charged match what we asked for, so a tampered client request can't
    // pay a smaller amount and still get marked premium.
    const success = tx.status === 'successful' && tx.currency === payment.currency && Number(tx.amount) >= payment.amount;

    db.prepare('UPDATE payments SET status = ? WHERE reference = ?').run(success ? 'success' : tx.status, tx.tx_ref);
    if (success) {
      db.prepare('UPDATE users SET plan = ? WHERE id = ?').run('premium', req.user.id);
    }
    const user = db.prepare('SELECT id, name, email, plan, phone, location, website FROM users WHERE id = ?').get(req.user.id);
    res.json({ success, user });
  } catch (err) {
    res.status(502).json({ error: err.message || 'Could not verify payment' });
  }
});

// Flutterwave server-to-server webhook - the reliable source of truth in
// production (redirects can be interrupted by a closed tab; this can't be).
// Flutterwave doesn't HMAC-sign the body - instead you set a secret string in
// your dashboard (Settings -> Webhooks) and it echoes it back in this header.
router.post('/webhook', (req, res) => {
  const signature = req.headers['verif-hash'];
  if (!signature || !process.env.FLW_SECRET_HASH || signature !== process.env.FLW_SECRET_HASH) {
    return res.status(401).send('Invalid signature');
  }

  const event = req.body;
  if (event.event === 'charge.completed' && event.data && event.data.status === 'successful') {
    const tx = event.data;
    const payment = db.prepare('SELECT * FROM payments WHERE reference = ?').get(tx.tx_ref);
    if (payment && tx.currency === payment.currency && Number(tx.amount) >= payment.amount) {
      db.prepare('UPDATE payments SET status = ? WHERE reference = ?').run('success', tx.tx_ref);
      db.prepare('UPDATE users SET plan = ? WHERE id = ?').run('premium', payment.user_id);
    }
  }
  res.sendStatus(200);
});

module.exports = router;
