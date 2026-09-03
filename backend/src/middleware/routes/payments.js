const express = require('express');
const crypto = require('crypto');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { PRICING, resolvePricing } = require('../utils/pricing');
const { detectRegion } = require('../utils/geo');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.get('/pricing', (req, res) => {
  res.json({ pricing: PRICING });
});

// Lets the frontend show "here's your price" before checkout, using the same
// IP-based detection /initialize uses - so nothing is a surprise once they
// click Upgrade.
router.get('/region', requireAuth, asyncHandler(async (req, res) => {
  const { region, country } = await detectRegion(req.ip);
  res.json({ region, country, pricing: resolvePricing(region) });
}));

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
router.post('/initialize', requireAuth, asyncHandler(async (req, res) => {
  if (!process.env.FLW_SECRET_KEY) return res.status(500).json({ error: 'Flutterwave is not configured on the server' });

  // The region is never taken from the client - it's detected from the
  // request's own IP address, every time, so nobody can pay the Nigeria
  // price from outside Nigeria just by picking a button in devtools.
  const { region, country } = await detectRegion(req.ip);
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
        meta: { user_id: req.user.id, region, country },
      }),
    });

    await db.run(
      'INSERT INTO payments (id, user_id, reference, region, amount, currency, status, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
      [crypto.randomUUID(), req.user.id, txRef, region, amount, currency, 'pending', Date.now()]
    );

    res.json({ paymentLink: data.data.link, txRef, region, country });
  } catch (err) {
    res.status(502).json({ error: err.message || 'Could not start checkout' });
  }
}));

// Called by the frontend after Flutterwave redirects back, using the
// transaction_id it appends to the redirect URL, to confirm and unlock premium.
router.get('/verify/:transactionId', requireAuth, asyncHandler(async (req, res) => {
  if (!process.env.FLW_SECRET_KEY) return res.status(500).json({ error: 'Flutterwave is not configured on the server' });
  try {
    const data = await flwFetch(`/transactions/${encodeURIComponent(req.params.transactionId)}/verify`);
    const tx = data.data;

    const payment = await db.get('SELECT * FROM payments WHERE reference = $1', [tx.tx_ref]);
    if (!payment || payment.user_id !== req.user.id) {
      return res.status(404).json({ error: 'No matching payment record for this transaction' });
    }

    // Never trust "successful" alone - also check the amount and currency
    // charged match what we asked for, so a tampered client request can't
    // pay a smaller amount and still get marked premium. payment.amount is a
    // NUMERIC column, which pg (deliberately) hands back as a string - cast
    // it before comparing.
    const success = tx.status === 'successful' && tx.currency === payment.currency && Number(tx.amount) >= Number(payment.amount);

    await db.run('UPDATE payments SET status = $1 WHERE reference = $2', [success ? 'success' : tx.status, tx.tx_ref]);
    if (success) {
      await db.run('UPDATE users SET plan = $1 WHERE id = $2', ['premium', req.user.id]);
    }
    const user = await db.get('SELECT id, name, email, plan, phone, location, website FROM users WHERE id = $1', [req.user.id]);
    res.json({ success, user });
  } catch (err) {
    res.status(502).json({ error: err.message || 'Could not verify payment' });
  }
}));

// Flutterwave server-to-server webhook - the reliable source of truth in
// production (redirects can be interrupted by a closed tab; this can't be).
// Flutterwave doesn't HMAC-sign the body - instead you set a secret string in
// your dashboard (Settings -> Webhooks) and it echoes it back in this header.
router.post('/webhook', asyncHandler(async (req, res) => {
  const signature = req.headers['verif-hash'];
  if (!signature || !process.env.FLW_SECRET_HASH || signature !== process.env.FLW_SECRET_HASH) {
    return res.status(401).send('Invalid signature');
  }

  const event = req.body;
  if (event.event === 'charge.completed' && event.data && event.data.status === 'successful') {
    const tx = event.data;
    const payment = await db.get('SELECT * FROM payments WHERE reference = $1', [tx.tx_ref]);
    if (payment && tx.currency === payment.currency && Number(tx.amount) >= Number(payment.amount)) {
      await db.run('UPDATE payments SET status = $1 WHERE reference = $2', ['success', tx.tx_ref]);
      await db.run('UPDATE users SET plan = $1 WHERE id = $2', ['premium', payment.user_id]);
    }
  }
  res.sendStatus(200);
}));

module.exports = router;