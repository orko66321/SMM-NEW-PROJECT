# SMM Panel

A social-media-marketing reseller panel: customers buy engagement services (followers, likes, views…) on
credit from a prepaid wallet; admins manage the catalog, orders, users, and deposits.

**Status: Phase 1 + Phase 2 + Phase 3 + Phase 4.** Phase 1 shipped the money-safety/access-control core —
auth, RBAC, the atomic wallet ledger, order placement with server-side price validation, service catalog,
support tickets, and both dashboards. Phase 2 added the payment-gateway/provider *framework* — encrypted
credential storage, a generic JAP-standard provider client with per-service opt-in auto-fulfillment +
one-level failover, background cron reconciliation, and bKash as the reference gateway adapter. Phase 3
made the whole payment system **dynamic**: the old hardcoded deposit-method list is gone, replaced by an
admin-managed `PaymentMethod` catalog (create/edit/toggle/delete any number of manual or automated
methods, each with its own account number, instructions, min/max, and deposit bonus %), a manual deposit
queue with duplicate-TrxID prevention, and **ZiniPay** — a second automated gateway (Bangladeshi
aggregator fronting bKash/Nagad/Rocket/cards) — shipped **disabled** alongside bKash, since no real
merchant/provider account exists yet (see "What's still not live" below). Phase 4 rounded out the
customer-facing product: an admin UI for both gateways (bKash + ZiniPay) with a per-gateway auto-verify
safety switch, a public landing page / services catalog / API docs site, glassmorphism-redesigned auth
pages plus a real password-reset flow, a reseller API key (hashed, `X-API-Key` header auth) with working
docs, a user profile page, an admin-managed Notice banner and Coupon-code system (redeemable on the
deposit page, credited atomically with the deposit), a USD/BDT display-currency switcher, WhatsApp/live-chat
widgets, and Recharts analytics on the admin dashboard. On top of that, **Google OAuth** ("Sign in with
Google") shipped full-stack: server-side ID-token verification (`google-auth-library`), auto-registration
with an initialized wallet for new Google users, account linking by email for existing ones, and a
`GoogleLogin` button on both auth pages that simply doesn't render when `GOOGLE_CLIENT_ID`/`SECRET` aren't
configured — no crash, no dead button. Everything described here is real, tested, runnable code, not a
mockup. Modules that are **schema-only** are listed at the bottom.

## Stack

- **API** — Node + TypeScript + Express + Prisma (PostgreSQL). Argon2id password hashing, JWT access
  tokens + rotating httpOnly refresh tokens, Zod validation on every request, rate limiting, Helmet, audit
  logging.
- **Web** — React + Vite + TypeScript + Tailwind (design tokens taken from
  `stitch_ai_instruction_design/sovereign_fintech/DESIGN.md`), TanStack Query, React Router.
- **DB** — PostgreSQL 16 via Docker Compose for local dev.
- **Shared** — `packages/shared` holds Zod schemas used by both the API and the web app, so validation
  can never drift between frontend and backend.

## Setup

```bash
cp .env.example .env
# then edit .env: at minimum set real values for JWT_SECRET (openssl rand -base64 48),
# ENCRYPTION_KEY (openssl rand -base64 32), and POSTGRES_PASSWORD — never keep the placeholders.

docker compose up -d          # starts Postgres (see note below if you don't have Docker)
npm install                   # installs all workspaces; also builds packages/shared

npm run db:migrate            # applies the Prisma schema
npm run db:seed               # creates a demo admin + demo user + sample services

npm run dev                   # runs the API (http://localhost:4000) and web app (http://localhost:5173)
```

The seed script prints the demo admin/user credentials it created — use those to log in locally.
**Change or remove them before deploying anywhere real.**

**No Docker?** `brew install postgresql@16 && brew services start postgresql@16` works as a drop-in
replacement — create a role/database matching your `DATABASE_URL`, and grant it `CREATEDB` so
`prisma migrate dev` can manage its shadow database (`ALTER ROLE smm_panel CREATEDB;`). This repo's own
local dev environment is running this way.

**Test database:** the integration suite's `resetDb()` truncates every table between tests, so it runs
against a separate `<database>_test` database (auto-derived from `DATABASE_URL` by
`apps/api/tests/setup-env.ts`) rather than your dev database — create it once (same owner/privileges) and
run `DATABASE_URL=.../<db>_test prisma migrate deploy` against it after each new migration.

## Verification

```bash
npm run typecheck   # tsc --noEmit across api + web — zero type/syntax errors gate
npm run lint         # eslint across api + web
npm run test         # vitest integration suite (needs the Postgres container running)
```

The test suite specifically proves the two highest-risk properties of a wallet-based system:

- **`tests/wallet.test.ts`** fires 20 concurrent debits against a fixed balance and asserts exactly the
  affordable number succeed and the final balance is exact — proving the row-lock-based race condition
  fix, not just documenting the intent.
- **`tests/orders.test.ts`** proves a client-supplied price/charge in the order request body is ignored
  and the server always recalculates it, and that replaying the same `Idempotency-Key` never double-charges.
- **`tests/rbac.test.ts`** proves every `/api/admin/*` route rejects a plain `USER` token with 403 — even
  when the request body itself claims `{ "role": "ADMIN" }`.
- **`tests/crypto.test.ts`** proves at-rest encryption round-trips correctly and that tampered ciphertext
  fails loudly instead of decrypting to silently-wrong plaintext.
- **`tests/providerClient.test.ts`** exercises the JAP-standard provider client against a real local mock
  HTTP server (`tests/mocks/japProvider.ts`) — no real upstream account needed to verify it.
- **`tests/autoFulfillment.test.ts`** is the load-bearing test for Phase 2's money safety: a PENDING
  auto-submit order is fulfilled by the primary provider, falls back to the backup provider on primary
  failure, and — if both fail — is marked FAILED **and the wallet is refunded in full**, proving a broken
  provider integration can never silently keep a customer's money.
- **`tests/payments.test.ts`** proves the payment gateway callback route cannot be tricked into crediting
  a wallet from query-string parameters alone (it mocks the gateway's own confirm API, not the browser
  redirect), and that hitting the callback twice for one payment only credits once.
- **`tests/manualDeposit.test.ts`** proves a duplicate TrxID is rejected both via the API's friendly
  pre-check and — bypassing that pre-check entirely — via the underlying DB unique constraint (the actual
  guarantee), and that a payment method's deposit bonus % is credited as its own ledger row, exactly once,
  only on approval.
- **`tests/zinipay.test.ts`** proves the ZiniPay webhook cannot credit a wallet from its own claimed
  `status` field (only a server-side `verify()` call decides), that a replayed webhook never double-credits,
  and that the browser-redirect leg (which carries *our* reference, not ZiniPay's) resolves correctly.
- **`tests/paymentMethods.test.ts`** proves admin CRUD works, the public list only ever returns `ACTIVE`
  methods, and deleting a method with deposit history is blocked (disable it instead) rather than silently
  breaking the ledger's "paid via X" trail.
- **`tests/coupon.test.ts`** proves a coupon's bonus (percent or fixed) is credited atomically with the
  deposit it was applied to, that the same coupon can never be redeemed twice by the same user, that
  `maxUses` is enforced, that a coupon going stale between deposit creation and approval skips the bonus
  without blocking the deposit's own principal credit, and that a coupon with redemption history can't be
  deleted (disable it instead — same pattern as payment methods).
- **`tests/passwordReset.test.ts`** proves the forgot-password endpoint always returns 204 whether or not
  the account exists (no enumeration), that a reset token is single-use and expires, and that resetting a
  password revokes every existing refresh-token session.
- **`tests/apiKey.test.ts`** proves a generated reseller API key authenticates via `X-API-Key` exactly like
  a JWT would, that regenerating invalidates the previous key, and that revoking or suspending the account
  stops it working immediately.
- **`tests/gatewayAutoVerify.test.ts`** proves `PaymentGatewayConfig.autoVerify` actually gates
  auto-crediting: disabled, a gateway-verified payment lands in the manual Deposits queue instead of
  crediting the wallet; enabled (the default), it auto-credits exactly as Phase 2/3 always did.
- **`tests/publicRoutes.test.ts`** proves the unauthenticated `/api/public/*` routes never leak SMTP
  credentials or other secrets, and that the public services/categories endpoints work without auth where
  the authenticated `/api/services` route does not.
- **`tests/googleAuth.test.ts`** (Google OAuth configured, via a per-file env mock) proves a new Google
  identity auto-registers with an initialized $0 wallet and USER role, a repeat sign-in never creates a
  duplicate account, an existing password account gets `googleId` linked by email match without touching
  its password, an unverified Google email is rejected, a failed/tampered token verification is rejected,
  and a suspended account is blocked even with a valid Google credential.
- **`tests/googleAuthDisabled.test.ts`** proves the real (unconfigured-by-default) environment never
  crashes — `POST /api/auth/google` returns a clear 400 and `/api/public/settings` reports
  `googleAuthEnabled: false` so the frontend hides the button entirely.

## Project layout

```
apps/api      Express API — see src/services (business logic) and src/routes
apps/web      React app — customer dashboard at /dashboard, admin at /admin (role-gated)
packages/shared  Zod schemas + types shared by both
```

## Security notes

- Secrets live only in `.env` (gitignored); `.env.example` documents every variable with no real values.
- Money fields are Prisma `Decimal`, never `float`. All wallet mutations go through
  `apps/api/src/services/wallet.service.ts`, which takes a row lock (`SELECT ... FOR UPDATE`) before
  reading/writing a balance — this is the only code path allowed to change a `Wallet.balance`
  (see the comments in that file for the full reasoning).
- `/api/admin/*` is gated by `authenticate` + `requireRole("ADMIN")` on every route, verified against the
  database on each request (not trusted from the JWT), so a demoted/suspended account loses access
  immediately rather than after its token expires.
- Rate limiting is in-memory (`express-rate-limit`), which is fine for a single process but does **not**
  share state across horizontally scaled instances — swap in a Redis-backed store before running more
  than one API replica. The Phase 2 cron jobs (`apps/api/src/cron/`) have the same single-instance caveat.
- Provider API keys and payment gateway credentials are encrypted at rest (AES-256-GCM,
  `apps/api/src/lib/crypto.ts`) using `ENCRYPTION_KEY` from `.env` — the admin panel is where you add or
  rotate a provider/gateway, not `.env`, so that's a config change rather than a redeploy.
- Every payment gateway `confirm()` call re-verifies payment status with the gateway itself using our
  stored credentials — a callback/redirect's query string is only ever a trigger to re-check, never
  trusted as proof of payment (see `apps/api/src/services/payments/types.ts`).
- Manual-deposit transaction IDs (`Deposit.trxId`) are globally unique at the database level — the same
  real-world bKash/Nagad TrxID (or a reused screenshot of one) can never be submitted twice, by the same
  or a different user, to claim a second credit.

## What's still not live

- **Google OAuth** is implemented against `google-auth-library` (Google's own official SDK) for
  server-side ID-token verification, and against `@react-oauth/google` (Google Identity Services) on the
  frontend — both real, current, official Google libraries, not hand-rolled. What hasn't happened yet: an
  actual end-to-end run through Google's consent screen with a real registered OAuth client, since no real
  `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` exists in this environment. Manually verified so far: with fake
  credentials configured, Google's real button widget renders correctly in the app's theme (confirming the
  integration wiring); the actual token-verification logic is covered by `tests/googleAuth.test.ts` against
  a mocked `OAuth2Client` (Google's own libraries aren't something a local mock server can stand in for the
  way `tests/mocks/japProvider.ts` or `tests/mocks/zinipay.ts` do for those integrations). Create real
  credentials at https://console.cloud.google.com/apis/credentials and confirm one real sign-in end-to-end
  before relying on this in production — same "reviewed but unverified until a real account exists"
  treatment as bKash below.
- **bKash** is implemented against bKash's public Tokenized Checkout API docs but has **not been run
  against a real bKash sandbox** (no merchant account exists yet) — treat it as reviewed-but-unverified.
  Configure it from the admin Payment Gateways page in SANDBOX mode and confirm a real test transaction
  end-to-end before ever switching to LIVE mode.
- **ZiniPay** is implemented against their public docs (https://zinipay.com/docs — Create Invoice, Verify
  Invoice, webhook). One assumption isn't confirmed against a real response: the docs show `payment_url`
  but not a separate `invoice_id` field on invoice creation, so the invoice id is parsed from the URL's
  last path segment (see the comment in `apps/api/src/services/payments/zinipay.ts`). Verify this against
  a real sandbox response before going live. No webhook signature scheme is documented — ZiniPay's own
  guidance is "always verify from your backend," which is exactly what `confirm()` does regardless of what
  a webhook claims, so nothing extra was needed there.
- **Provider API sync** is implemented against the de facto JAP-standard reseller API and verified against
  a local mock server, but has not been run against a real upstream provider — add one from the admin
  Providers page and confirm "Sync now" and a real test order before enabling `autoSubmit` on any service.
- Every payment method an admin creates as **MANUAL** (the default — e.g. bKash/Nagad/Rocket numbers you
  actually receive money on) goes through the admin-approval deposit queue regardless of which real-world
  gateway it names; only methods explicitly set to **AUTOMATED** with a `gatewayProvider` route through a
  live integration, and today that's bKash or ZiniPay once one is enabled.
- **ZiniPay's `merchantId` credential field** (Phase 4) is stored and encrypted like the others but unused
  by the adapter — ZiniPay's documented API never asks for one. Same forward-compatible-only treatment as
  `secretKey` already got in Phase 3; remove or wire it up if a real account turns out to need it.
- **SMTP/email is unconfigured by default** (Phase 4) — no real mail account exists yet. Password-reset
  links are logged server-side (`lib/mailer.ts`) instead of emailed until an admin fills in real SMTP
  credentials on the admin Settings page and enables sending. The reset flow itself (token generation,
  single-use expiry, session revocation) is real and tested (`tests/passwordReset.test.ts`) — only the
  "actually deliver the email" leg needs a real mailbox to go live.
- **Live chat (Tawk.to/Crisp)** only loads the provider's official embed script by widget ID — an admin
  needs a real Tawk.to or Crisp account and widget ID for it to show anything; the loader itself works
  today, there's just no demo widget ID configured out of the box.

## What's deferred to a later phase

Drip-feed automation, affiliates/referrals, child-panel reseller wizard, 2FA, IP allow-listing, a global
command palette, CSV export, bulk user actions, fraud/duplicate-account detection, provider health
monitoring/alerting beyond the sync-log + failover already built, and a granular per-permission admin role
matrix (role-level RBAC exists: USER / STAFF / ADMIN, with STAFF not yet granted any admin routes).
Coupon redemption and admin analytics charts, previously listed here, shipped in Phase 4.
