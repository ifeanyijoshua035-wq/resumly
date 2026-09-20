const express = require('express');
const crypto = require('crypto');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { PRICING, resolvePricing } = require('../utils/pricing');
const { detectRegion } = require('../utils/geo');
const { publicUser } = require('../utils/publicUser');
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
  if (!res.ok || data.status === 'error') {
    // Flutterwave's top-level "message" is often a generic summary (e.g. "One
    // or more parameter is needed") that doesn't say which field is the
    // problem - but the full response body usually does, in a nested
    // "data" or "errors" object. Logging all of it here means the real cause
    // shows up in the server logs instead of having to guess.
    console.error(`Flutterwave API error on ${path}:`, JSON.stringify(data));
    throw new Error(data.message || `Flutterwave error (${res.status})`);
  }
  return data;
}

// One Flutterwave payment plan per pricing region (they can't share a plan
// since each region has a different amount/currency). Created the first time
// anyone in that region upgrades, then reused for every subsequent person in
// the same region.
async function getOrCreatePlan(region) {
  const existing = await db.get('SELECT * FROM payment_plans WHERE region = $1', [region]);
  if (existing) return existing;

  const { amount, currency, name } = resolvePricing(region);
  const data = await flwFetch('/payment-plans', {
    method: 'POST',
    body: JSON.stringify({
      amount,
      currency,
      interval: 'monthly',
      name: `Resumly Premium - ${name} (Monthly)`,
    }),
  });

  return db.get(
    'INSERT INTO payment_plans (region, flw_plan_id, amount, currency, created_at) VALUES ($1,$2,$3,$4,$5) RETURNING *',
    [region, String(data.data.id), amount, currency, Date.now()]
  );
}

// Start a checkout - returns a hosted Flutterwave payment page link. Attaching
// payment_plan makes this the first charge of a real subscription: once it
// succeeds, Flutterwave stores the card and automatically re-charges it every
// month on its own, with no further action needed from this server.
router.post('/initialize', requireAuth, asyncHandler(async (req, res) => {
  if (!process.env.FLW_SECRET_KEY) return res.status(500).json({ error: 'Flutterwave is not configured on the server' });
  if (!process.env.APP_URL || !/^https?:\/\//.test(process.env.APP_URL)) {
    // A missing/malformed APP_URL produces a broken redirect_url below, which
    // Flutterwave rejects with a generic "one or more parameter is needed"
    // error that doesn't point at the real cause - catching it here instead
    // gives a message that actually says what's wrong.
    console.error('APP_URL is missing or invalid:', process.env.APP_URL);
    return res.status(500).json({ error: 'Server misconfiguration: APP_URL is not set to a valid URL (check environment variables)' });
  }

  // The region is never taken from the client - it's detected from the
  // request's own IP address, every time, so nobody can pay the Nigeria
  // price from outside Nigeria just by picking a button in devtools.
  const { region, country } = await detectRegion(req.ip);

  try {
    const plan = await getOrCreatePlan(region);
    const txRef = 'rsm_' + crypto.randomBytes(12).toString('hex');
    const redirectUrl = `${process.env.APP_URL}/payment/callback`;

    const data = await flwFetch('/payments', {
      method: 'POST',
      body: JSON.stringify({
        tx_ref: txRef,
        amount: plan.amount,
        currency: plan.currency,
        redirect_url: redirectUrl,
        payment_plan: Number(plan.flw_plan_id),
        customer: { email: req.user.email, name: req.user.name },
        customizations: { title: 'Resumly Premium', description: `Resumly Premium - ${region} (monthly, auto-renews)` },
        meta: { user_id: req.user.id, region, country },
      }),
    });

    await db.run(
      'INSERT INTO payments (id, user_id, reference, region, amount, currency, status, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
      [crypto.randomUUID(), req.user.id, txRef, region, plan.amount, plan.currency, 'pending', Date.now()]
    );

    res.json({ paymentLink: data.data.link, txRef, region });
  } catch (err) {
    res.status(502).json({ error: err.message || 'Could not start checkout' });
  }
}));

// Called by the frontend after Flutterwave redirects back, using the
// transaction_id it appends to the redirect URL, to confirm the first charge
// and unlock premium for the first billing period.
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
    // pay a smaller amount and still get marked premium.
    const success = tx.status === 'successful' && tx.currency === payment.currency && Number(tx.amount) >= Number(payment.amount);

    await db.run('UPDATE payments SET status = $1 WHERE reference = $2', [success ? 'success' : tx.status, tx.tx_ref]);
    if (success) {
      await db.extendPremium(req.user.id, 30);
    }
    const user = await db.getUserById(req.user.id);
    res.json({ success, user: publicUser(user) });
  } catch (err) {
    res.status(502).json({ error: err.message || 'Could not verify payment' });
  }
}));

// Stops future auto-renewal. Premium access itself is left alone - it runs
// out naturally at the end of the period already paid for (premium_until),
// same as cancelling any normal subscription.
router.post('/cancel', requireAuth, asyncHandler(async (req, res) => {
  if (!process.env.FLW_SECRET_KEY) return res.status(500).json({ error: 'Flutterwave is not configured on the server' });
  try {
    const data = await flwFetch(`/subscriptions?email=${encodeURIComponent(req.user.email)}&status=active`);
    const subs = data.data || [];
    if (!subs.length) {
      return res.status(404).json({ error: 'No active subscription found. If you were charged, contact support.' });
    }
    await Promise.all(subs.map((sub) => flwFetch(`/subscriptions/${sub.id}/cancel`, { method: 'PUT' })));
    res.json({ ok: true, message: 'Auto-renewal cancelled. Your premium access continues until the current billing period ends.' });
  } catch (err) {
    res.status(502).json({ error: err.message || 'Could not cancel the subscription' });
  }
}));

// Flutterwave server-to-server webhook - the reliable source of truth for
// BOTH the first charge and every automatic monthly renewal after it (a
// renewal happens with no /initialize call from us at all, so this is the
// only place that ever learns about it). Flutterwave doesn't HMAC-sign the
// body - instead you set a secret string in your dashboard (Settings ->
// Webhooks) and it echoes it back in this header.
router.post('/webhook', asyncHandler(async (req, res) => {
  const signature = req.headers['verif-hash'];
  if (!signature || !process.env.FLW_SECRET_HASH || signature !== process.env.FLW_SECRET_HASH) {
    return res.status(401).send('Invalid signature');
  }

  const event = req.body;

  if (event.event === 'charge.completed' && event.data && event.data.status === 'successful') {
    const tx = event.data;
    const payment = await db.get('SELECT * FROM payments WHERE reference = $1', [tx.tx_ref]);

    if (payment) {
      // Matches a checkout we started ourselves - the first charge on a new
      // subscription. Verify amount/currency before trusting it, same as /verify.
      if (tx.currency === payment.currency && Number(tx.amount) >= Number(payment.amount)) {
        await db.run('UPDATE payments SET status = $1 WHERE reference = $2', ['success', tx.tx_ref]);
        await db.extendPremium(payment.user_id, 30);
      }
    } else if (tx.customer && tx.customer.email) {
      // No matching row - Flutterwave auto-billed a renewal on its own.
      // Identify which plan (and therefore which region) by matching the
      // charged amount/currency, then credit whichever user owns that email.
      const planRow = await db.get('SELECT * FROM payment_plans WHERE currency = $1 AND amount = $2', [tx.currency, tx.amount]);
      const user = await db.get('SELECT id FROM users WHERE email = $1', [tx.customer.email.toLowerCase()]);
      if (planRow && user) {
        await db.extendPremium(user.id, 30);
        await db.run(
          `INSERT INTO payments (id, user_id, reference, region, amount, currency, status, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (reference) DO NOTHING`,
          [crypto.randomUUID(), user.id, tx.tx_ref, planRow.region, tx.amount, tx.currency, 'success', Date.now()]
        );
      }
    }
  }

  if (event.event === 'subscription.cancelled') {
    // Flutterwave already stopped billing (customer cancelled via their email
    // link, or 3 failed retries). We don't force an immediate downgrade here -
    // premium_until still holds through whatever period was already paid for,
    // and the self-healing check in db.js naturally lets it lapse from there.
    console.log('Subscription cancelled for', event.data?.customer?.email || 'unknown customer');
  }

  res.sendStatus(200);
}));

module.exports = router;
