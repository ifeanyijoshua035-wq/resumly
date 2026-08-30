# Resumly

A real resume builder: Node/Express + SQLite backend, vanilla JS frontend, Google
Gemini for AI features, Flutterwave for premium payments.

## What's real here

- **Accounts**: registration/login with bcrypt-hashed passwords and JWT sessions.
- **Data**: resumes, cover letters, and job-tracker entries are stored in a SQLite
  database on the server (`backend/data.sqlite`), scoped per user.
- **AI**: the AI Assistant, "draft with AI" and "generate cover letter" buttons call
  Google's Gemini API from the *server* (your key never reaches the browser).
- **Payments**: "Upgrade" redirects to a real Flutterwave checkout page.
  Flutterwave redirects back to `/payment/callback` with a `transaction_id`,
  the frontend calls `/api/payments/verify/:transactionId`, and the server
  confirms the charge with Flutterwave — checking status, amount, *and*
  currency — before flipping the account to `premium`. A webhook endpoint
  (`/api/payments/webhook`) is also included, which is the reliable way to
  confirm payments in production (redirects can be interrupted; webhooks can't).
- **Regional pricing**: three tiers — Nigeria (₦5,000), rest of Africa (₦8,000),
  outside Africa ($10). The user picks a region on the Subscription page; the
  server looks up the real price from `src/utils/pricing.js` and ignores any
  amount the client might send, so the price can't be tampered with from the
  browser. **Read the note at the top of `pricing.js`** — a Flutterwave account
  usually settles in one home currency unless multi-currency payouts are
  enabled, so confirm that with Flutterwave before relying on the $10 tier
  landing in your account as USD.
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
- A production database if you outgrow SQLite (Postgres is a natural next step —
  swap `src/db.js`).
- Your own API keys (see below).
- Legal basics if this goes live for real users: a privacy policy, terms of
  service, and Flutterwave business verification (KYC) before live payments work.

## 1. Install

```bash
cd backend
npm install
```

## 2. Configure

```bash
cp .env.example .env
```

Then edit `.env`:

- `JWT_SECRET` — any long random string (e.g. `openssl rand -hex 32`).
- `GEMINI_API_KEY` — from https://aistudio.google.com/apikey
- `FLW_SECRET_KEY` / `FLW_PUBLIC_KEY` — from your Flutterwave dashboard
  (https://dashboard.flutterwave.com/settings/apis). Use the `FLWSECK_TEST-...`
  key while developing.
- `FLW_SECRET_HASH` — a secret string *you* make up, pasted into both `.env`
  and your Flutterwave dashboard under Settings → Webhooks ("Secret hash"
  field). It's how the server confirms a webhook call really came from
  Flutterwave (see step 4).
- Pricing itself isn't in `.env` — it's three region tiers defined in
  `src/utils/pricing.js` (see the **Pricing** section below).
- `APP_URL` — the URL the app is reachable at (`http://localhost:4000` locally;
  your real domain in production). Flutterwave redirects here after checkout.

## 3. Run

```bash
npm start
```

Visit `http://localhost:4000`. Register an account, build a resume, and try
upgrading — with Flutterwave **test** keys you can pay with their published
test cards (in the Flutterwave docs) without moving real money.

## 4. Set up the Flutterwave webhook (recommended before going live)

In your Flutterwave dashboard → Settings → Webhooks:

1. Set the webhook URL to:
   ```
   https://your-domain.com/api/payments/webhook
   ```
2. Set the "Secret hash" field to the same value you put in `FLW_SECRET_HASH`
   in `.env`.

This is what reliably marks a user premium even if they close the browser tab
right after paying, before the redirect fires.

## Project layout

```
backend/
  server.js              Express app, mounts routes, serves the frontend
  src/
    db.js                 SQLite schema + connection
    middleware/auth.js     JWT auth + premium-plan gate
    routes/
      auth.js              register / login / profile
      resumes.js           resume CRUD
      covers.js             cover letter CRUD
      jobs.js               job tracker CRUD
      ai.js                  Gemini-powered writer/cover/interview/grammar/improve + ATS score
      payments.js           Flutterwave initialize / verify / webhook
      public.js               no-auth route that serves shared /r/:id resume links
    utils/
      ats.js                 keyword-matching ATS scorer
      pricing.js             region -> price/currency lookup (source of truth for billing)
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
routes, and a check in `PUT /api/auth/me` for the portfolio-link field) — not just
hidden in the UI — so a user can't bypass it by editing frontend JS.

PDF export happens in the browser (`html2canvas` + `jsPDF`); the free-plan
watermark is applied client-side based on `profile.plan`, same as templates and
dark mode, since none of those need a server round-trip.
