# SMM Panel

A social-media-marketing reseller panel: customers buy engagement services (followers, likes, views…) on
credit from a prepaid wallet; admins manage the catalog, orders, users, and deposits.

**Status: Phase 1 foundation.** This ships a fully working, tested core — auth, RBAC, the atomic wallet
ledger, order placement with server-side price validation, service catalog, manual deposit approval flow,
support tickets, and both the customer and admin dashboards. It is a real, runnable application, not a
mockup. Modules from the original design docs that are **not yet built** are listed at the bottom — the
Prisma schema already has tables reserved for them so adding the modules later won't require migrations
that touch existing data.

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
# then edit .env: at minimum set a real JWT_SECRET (openssl rand -base64 48)
# and a real POSTGRES_PASSWORD — never keep the placeholder values.

docker compose up -d          # starts Postgres
npm install                   # installs all workspaces

npm run db:migrate            # applies the Prisma schema
npm run db:seed               # creates a demo admin + demo user + sample services

npm run dev                   # runs the API (http://localhost:4000) and web app (http://localhost:5173)
```

The seed script prints the demo admin/user credentials it created — use those to log in locally.
**Change or remove them before deploying anywhere real.**

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
  than one API replica.

## What's deferred to a later phase

Drip-feed automation, affiliates/referrals, child-panel reseller wizard, live payment gateway integrations
(bKash/Nagad/Rocket/Upay/crypto/etc. — Phase 1 has a manual "submit deposit → admin approves" flow instead),
provider API integration + cron sync + auto-failover, coupon redemption, 2FA, IP allow-listing, a global
command palette, CSV export, analytics charts, bulk user actions, fraud/duplicate-account detection, and a
granular per-permission admin role matrix (Phase 1 has role-level RBAC: USER / STAFF / ADMIN, with STAFF
not yet granted any admin routes).
