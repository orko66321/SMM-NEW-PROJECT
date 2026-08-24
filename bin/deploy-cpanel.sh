#!/bin/bash
# Run by .cpanel.yml (cPanel "Git Version Control" → Deploy HEAD Commit)
# after cPanel checks out a new commit. Publishes the monorepo's already
# -built output to two places on the account:
#
#   - APP_ROOT (Setup Node.js App's "Application root") — a full copy of
#     this repo, kept in sync every deploy. env.ts resolves .env relative
#     to apps/api/dist/, which only lands on APP_ROOT/.env because APP_ROOT
#     mirrors the monorepo's own directory layout — don't flatten this.
#   - PUBLIC_HTML — just the built frontend (apps/web/dist).
#
# .env at APP_ROOT is created ONCE by hand via File Manager and is never
# touched by this script — real secrets never pass through git or this
# script. Uses plain cp/find rather than rsync: this host doesn't have
# rsync on PATH for deploy tasks (confirmed via the deploy log), and
# cp/find/rm are guaranteed to exist everywhere rsync might not be.
#
# IMPORTANT — this script deliberately never runs tsc, vite, `prisma
# generate`, or `prisma migrate deploy`. The account's Node.js App has
# ulimit -v hard-capped at 4GB (the host won't raise it), and any
# WebAssembly instantiation crashes under that cap
# ("WebAssembly.Instance(): Out of memory") — that's Vite/Rollup's WASM
# fallback for the frontend build, and Prisma CLI's schema-engine WASM for
# both `generate` and `migrate`. So every build step now happens on a dev
# machine and its output is committed to git:
#   - apps/web/dist, apps/api/dist, packages/shared/dist  (npm run build)
#   - apps/api/generated-client                            (prisma generate,
#     with binaryTargets covering this host — see schema.prisma; the
#     generated PrismaClient uses a native query-engine binary at runtime,
#     never WASM, so it's safe to actually query the database with)
# Migrations are applied by apps/api/dist/scripts/applyMigrations.js, a
# plain PrismaClient script (native engine, no CLI, no WASM) — see
# apps/api/src/scripts/applyMigrations.ts.
#
# Whenever schema.prisma, apps/api/src, apps/web/src, or packages/shared/src
# changes, you MUST rebuild locally and commit the new dist/generated-client
# before pushing — this script will not do it for you anymore.
set -euo pipefail

# If the account's memory ulimit has headroom between its soft and hard
# limits, raise the soft limit to the hard one for this process — cheap to
# try, and may be all that's needed if some other OOM shows up. No-op
# (silently) if not permitted.
ulimit -Sv "$(ulimit -Hv)" 2>/dev/null || true

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_ROOT="/home/allinons/smm-api"
PUBLIC_HTML="/home/allinons/public_html"
VENV="/home/allinons/nodevenv/smm-api/20/bin/activate"

echo "==> Server diagnostics (plain files/commands only, no WASM involved)"
cat /etc/os-release 2>&1 || true
echo "---"
free -h 2>&1 || true
echo "---"
ulimit -a 2>&1 || true

echo "==> Syncing checkout into $APP_ROOT (keeping .env)"
mkdir -p "$APP_ROOT"
ENV_BACKUP=""
if [ -f "$APP_ROOT/.env" ]; then
  ENV_BACKUP="$(mktemp)"
  cp "$APP_ROOT/.env" "$ENV_BACKUP"
fi
find "$APP_ROOT" -mindepth 1 -maxdepth 1 -exec rm -rf {} +
cp -a "$REPO_ROOT"/. "$APP_ROOT"/
rm -rf "$APP_ROOT/.git"
if [ -n "$ENV_BACKUP" ]; then
  cp "$ENV_BACKUP" "$APP_ROOT/.env"
  rm -f "$ENV_BACKUP"
fi

echo "==> Activating the Node 20 app environment"
# cPanel's own activate script references its own internal variables
# (e.g. CL_VIRTUAL_ENV) without guarding them — harmless under a normal
# shell, but this script's `set -u` turns that into a hard failure. Not
# our script to fix, so nounset is relaxed for just this one line.
set +u
# shellcheck disable=SC1090
source "$VENV"
set -u
cd "$APP_ROOT"

echo "==> Installing production dependencies"
# Nothing on the server compiles anything anymore (no tsc/vite/prisma), so
# devDependencies (typescript, vite, eslint, prisma CLI, ...) aren't
# needed here — unlike before, plain `npm ci` (which already skips dev
# deps under Application mode: Production's NODE_ENV=production) is
# exactly what we want.
npm ci

if [ ! -f "$APP_ROOT/.env" ]; then
  echo "ERROR: $APP_ROOT/.env does not exist yet." >&2
  echo "Create it by hand via File Manager before the first deploy — see chat for the template." >&2
  exit 1
fi
set -a
# shellcheck disable=SC1091
source "$APP_ROOT/.env"
set +a

echo "==> Publishing the pre-built frontend to public_html"
mkdir -p "$PUBLIC_HTML"
find "$PUBLIC_HTML" -mindepth 1 -maxdepth 1 -not -name '.well-known' -exec rm -rf {} +
cp -a apps/web/dist/. "$PUBLIC_HTML"/

echo "==> PostgreSQL reachability diagnostics (read-only, no credentials printed)"
# Two straight failed migration attempts (TCP localhost:5432, then the
# Unix socket path phpPgAdmin itself uses) both failed with "Can't reach
# database server" — this narrows down whether it's a CageFS filesystem
# visibility issue (socket path not mounted into this account's jail),
# a permissions issue, or something else, without needing another guess
# to burn a whole deploy cycle.
echo "-- running as:"; id 2>&1 || true
echo "-- /var/run/postgresql listing:"; ls -la /var/run/postgresql/ 2>&1 || true
echo "-- socket file stat:"; stat /var/run/postgresql/.s.PGSQL.5432 2>&1 || true
echo "-- available client tools:"; command -v psql pg_isready nc 2>&1 || true
echo "-- pg_isready via socket dir:"; pg_isready -h /var/run/postgresql -p 5432 2>&1 || true
echo "-- pg_isready via localhost:5432:"; pg_isready -h localhost -p 5432 2>&1 || true
echo "-- pg_isready via 127.0.0.200:5432:"; pg_isready -h 127.0.0.200 -p 5432 2>&1 || true

echo "==> Applying database migrations"
# apps/api/generated-client (the pre-generated Prisma client, engine
# binaries included) was already synced into APP_ROOT above along with the
# rest of the checkout — schema.prisma's custom `output` makes it fully
# self-contained there (its own runtime/ and engine binaries), so nothing
# needs to be copied into node_modules for it.
node apps/api/dist/scripts/applyMigrations.js

echo "==> Restarting the Node.js app (Passenger)"
mkdir -p "$APP_ROOT/tmp"
touch "$APP_ROOT/tmp/restart.txt"

echo "==> Deploy complete"
