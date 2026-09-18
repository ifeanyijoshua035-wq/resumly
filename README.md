# Resumly

A real resume builder: Node/Express + Postgres backend, vanilla JS frontend,
Google Gemini for AI features, Flutterwave for premium payments.

## What's real here

- **Accounts**: registration/login with bcrypt-hashed passwords and JWT sessions.
- **Data**: resumes, cover letters, and job-tracker entries are stored in a real
  Postgres database (e.g. a free [Neon](https://neon.tech) project), scoped per
  user. This survives restarts and redeploys — unlike a SQLite file sitting on
  a host's local disk, which most hosts (Render included) wipe on every
  restart or scale event.
- **AI**: the AI Assistant, "draft with AI" and "generate cover letter" buttons call
  Google's Gemini API from the *server* (your key never reaches the browser).
- **Payments — a real recurring subscription**: Premium is a genuine monthly
  subscription via [Flutterwave Payment Plans](https://developer.flutterwave.com/v3.0/docs/payment-plans-1),
  not a one-time unlock. "Upgrade" creates (or reuses) a payment plan for the
  user's region and redirects to a real Flutterwave checkout page for the
  first charge. From then on, **Flutterwave itself re-charges the saved card
  every month automatically** — this server does nothing to trigger renewals;
  it only listens for the results via webhook. Each user's access is tracked
  with a real `premium_until` expiry (`src/db.js`), which is re-checked and
  self-corrected on every login — so if a renewal is ever missed (card
  declined, subscription cancelled), the account quietly reverts to `free` on
  its own once the paid period ends, with no cron job required. Users can
  cancel auto-renewal from the Subscription page (`POST /api/payments/cancel`)
  and keep access through the period they already paid for, same as any
  normal subscription product.
- **Regional pricing, detected automatically**: three tiers — Nigeria (₦5,000/mo),
  rest of Africa (₦8,000/mo), outside Africa ($10/mo). The region isn't something the
  user picks — it's detected from their IP address via
  [ipinfo.io](https://ipinfo.io) (`src/utils/geo.js`) every time they open the
  Subscription page and again right before checkout, so nobody can select a
  cheaper region than where they're actually connecting from. The server
  ignores any region value a client might try to send directly; the amount
  charged always comes from `src/utils/pricing.js`. **Read the note at the top
  of `pricing.js`** — a Flutterwave account usually settles in one home
  currency unless multi-currency payouts are enabled, so confirm that with
  Flutterwave before relying on the $10 tier landing in your account as USD.
  Worth knowing: IP geolocation isn't perfect — a VPN or a mobile carrier
  routing traffic through another country can occasionally show the wrong
  region. That's a limitation of IP-based detection generally, not something
  this implementation can fully close.
- **Security**: `helmet` for standard security headers, and rate limiting on
  login/register (brute-force protection) and on the AI routes (so one abusive
  client can't run up your Gemini bill).
- **Logo**: an original icon — a folded document with an ascending bar chart —
  used as the favicon (`public/logo-mark.svg`) and inline in the app header.
- **Watermark**: free-plan PDF downloads carry the actual Resumly logo mark
  (tiled diagonally across the page), not placeholder text — and it disappears
  entirely the moment an account is premium, no separate toggle needed.
- **Premium templates**: 2 of the 6 layouts (Elegant, Creative — 18 of the 54
  layout/color combinations) are premium-only, shown with a lock icon to free
  users. This is enforced in `routes/resumes.js`, not just hidden in the UI —
  a request built directly against the API to set a locked template is
  rejected with a 403, same pattern as the AI and ATS routes.

## Product touches worth knowing about

- **Resume completeness meter**: a live progress bar in the editor scores the
  resume on 5 basics (personal info, summary, experience, education, skills)
  and tells the user what's missing.
- **Autosave status**: "Saving…" / "Saved just now" next to the Save button, so
  users trust their work isn't lost.
- **Onboarding checklist**: the dashboard shows a short checklist (create a
  resume, add experience, download a PDF, try AI/ATS) that disappears once
  completed — nudges new users toward the features that show the product's
  value fastest.
- **Real portfolio links**: the "personal website / portfolio link" premium
  feature isn't just a text field — toggling "Make this resume public" in the
  editor's Sharing section generates a live, no-login-required page at
  `/r/:resumeId` that anyone can open (e.g. to paste into a LinkedIn profile
  or send to a recruiter). It's gated both by the resume's own visibility flag
  and by the owner still being on premium, so a lapsed subscription quietly
  takes the link down rather than leaving it public forever.

## What's still on you

- Hosting: run this somewhere with a public URL (Render, Railway, Fly.io, a VPS,
  etc.) — Flutterwave needs to redirect back to a real address, not `localhost`.
- HTTPS in production.
- Your own API keys and a Postgres connection string (see below).
- **Fill in the placeholders in `public/privacy.html` and `public/terms.html`
  before submitting for Flutterwave business verification** — both pages
  exist and are linked from the app's footer and login screen, but they
  contain bracketed placeholders (`[YOUR LEGAL BUSINESS NAME]`,
  `[YOUR SUPPORT EMAIL]`, a refund policy, and a governing-law clause) that
  need real values. Submitting with placeholders still in place is likely to
  get the verification rejected — and none of this is legal advice; for
  anything beyond the basics (refund terms, governing law, data protection
  compliance for your specific countries), have a lawyer review both pages
  before relying on them.

## 1. Install

```bash
cd backend
npm install
```

## 2. Set up a Postgres database

The easiest option is a free [Neon](https://neon.tech) project — create one,
and copy the connection string it gives you (looks like
`postgresql://user:password@ep-xxxx.region.aws.neon.tech/dbname?sslmode=require`).
Any other Postgres provider works too, as long as you have a connection string.

You don't need to create any tables yourself — `server.js` runs the `CREATE
TABLE IF NOT EXISTS` statements automatically on startup.

## 3. Configure

```bash
cp .env.example .env
```

Then edit `.env`:

- `DATABASE_URL` — the Postgres connection string from step 2.
- `JWT_SECRET` — any long random string (e.g. `openssl rand -hex 32`).
- `GEMINI_API_KEY` — from https://aistudio.google.com/apikey
- `FLW_SECRET_KEY` / `FLW_PUBLIC_KEY` — from your Flutterwave dashboard
  (https://dashboard.flutterwave.com/settings/apis). Use the `FLWSECK_TEST-...`
  key while developing.
- `FLW_SECRET_HASH` — a secret string *you* make up, pasted into both `.env`
  and your Flutterwave dashboard under Settings → Webhooks ("Secret hash"
  field). It's how the server confirms a webhook call really came from
  Flutterwave (see step 5).
- Pricing itself isn't in `.env` — it's three region tiers defined in
  `src/utils/pricing.js` (see the **Pricing** section below).
- `IPINFO_TOKEN` — optional while testing (ipinfo.io works unauthenticated at
  a low rate limit), but sign up for a free token at https://ipinfo.io before
  going live, since every Upgrade click makes one lookup.
- `APP_URL` — the URL the app is reachable at (`http://localhost:4000` locally;
  your real domain in production). Flutterwave redirects here after checkout.

## 4. Run

```bash
npm start
```

Visit `http://localhost:4000`. Register an account, build a resume, and try
upgrading — with Flutterwave **test** keys you can pay with their published
test cards (in the Flutterwave docs) without moving real money.

If the server exits immediately with a database connection error, double-check
`DATABASE_URL` — a typo'd password or a missing `?sslmode=require` are the
usual culprits.

## 5. Set up the Flutterwave webhook (not optional — this is where renewals happen)

In your Flutterwave dashboard → Settings → Webhooks:

1. Set the webhook URL to:
   ```
   https://your-domain.com/api/payments/webhook
   ```
2. Set the "Secret hash" field to the same value you put in `FLW_SECRET_HASH`
   in `.env`.

For a one-time payment this webhook would just be a nice-to-have (a redirect
usually gets there first). For a subscription it's essential: **every monthly
renewal is billed by Flutterwave automatically, with no request from this
server at all** — the webhook is the only way this app ever finds out a
renewal happened, so without it, users would lose premium access every month
even though they're still being charged.

## Deploying (e.g. Render)

- Set the **root directory** to `backend` (that's where `package.json` lives).
- **Build command**: `npm install`. **Start command**: `npm start`.
- Add every variable from `.env` as an environment variable in your host's
  dashboard — including `DATABASE_URL`.
- This project ships a `.node-version` file pinning Node to `20` (an LTS
  release). Some hosts will otherwise default to whatever their latest
  supported Node build is, which can be a very new, less-tested version —
  that's what originally caused a native-module build failure here before the
  Postgres migration removed the need for any native compilation at all.

## Project layout

```
backend/
  server.js              Express app, connects to Postgres, mounts routes, serves the frontend
  .node-version           pins the Node version for hosts that read it (e.g. Render)
  src/
    db.js                  Postgres connection pool + schema + query helpers
    middleware/auth.js     JWT auth + premium-plan gate
    routes/
      auth.js              register / login / profile
      resumes.js           resume CRUD
      covers.js             cover letter CRUD
      jobs.js               job tracker CRUD
      ai.js                  Gemini-powered writer/cover/interview/grammar/improve + ATS score
      payments.js           Flutterwave: create/reuse payment plans, initialize, verify, cancel, webhook
      public.js               no-auth route that serves shared /r/:id resume links
    utils/
      ats.js                 keyword-matching ATS scorer
      pricing.js             region -> price/currency lookup (source of truth for billing)
      geo.js                  IP address -> pricing region, via ipinfo.io
      publicUser.js           the user object shape returned to the frontend
      asyncHandler.js         forwards a failed async route to Express's error handler
  public/
    index.html             app shell, favicon, meta tags
    styles.css              all styling (themes, layout, resume templates)
    app.js                   frontend logic — auth, editor, previews, PDF export, API calls
    logo-mark.svg            standalone logo icon (used as favicon)
```

## Pricing

Set in `backend/src/utils/pricing.js`:

| Region | Price | Currency |
|---|---|---|
| Nigeria | ₦5,000 | NGN |
| Rest of Africa | ₦8,000 | NGN |
| Outside Africa | $10 | USD |

The non-Africa tier is priced in USD since that's the more standard choice
internationally — change `PRICING.INTL.currency`/`amount` in that file if you'd
rather charge a flat NGN amount instead (simpler if you haven't confirmed
multi-currency payouts with Flutterwave yet). Unlike Paystack, Flutterwave
amounts are in the currency's normal unit, not the smallest unit — `5000`
means ₦5,000, `10` means $10.00, no kobo/cents conversion needed.

## Notes on the free vs. premium split

Gating is enforced **server-side** (`requirePremium` middleware on the AI and ATS
routes, a template check in `routes/resumes.js`, and a check in `PUT /api/auth/me`
for the portfolio-link field) — not just hidden in the UI — so a user can't
bypass it by editing frontend JS or calling the API directly.

PDF export happens in the browser (`html2canvas` + `jsPDF`); the free-plan
watermark is applied client-side based on `profile.plan`, same as templates and
dark mode, since none of those need a server round-trip.