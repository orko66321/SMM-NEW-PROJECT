#!/bin/bash
# Run by .cpanel.yml (cPanel "Git Version Control" → Deploy HEAD Commit)
# after cPanel checks out a new commit. Builds the monorepo and publishes
# it to two places on the account:
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
set -euo pipefail

# If the account's memory ulimit has headroom between its soft and hard
# limits, raise the soft limit to the hard one for this process — cheap to
# try, and may be all that's needed if the OOM below is a soft cap rather
# than a true hard resource ceiling. No-op (silently) if not permitted.
ulimit -Sv "$(ulimit -Hv)" 2>/dev/null || true

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_ROOT="/home/allinons/smm-api"
PUBLIC_HTML="/home/allinons/public_html"
VENV="/home/allinons/nodevenv/smm-api/20/bin/activate"

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

echo "==> Installing dependencies"
# Setup Node.js App's "Application mode: Production" makes the activated
# venv export NODE_ENV=production, which makes plain `npm ci` silently
# skip devDependencies — that's exactly where typescript/vite/eslint live,
# so the build below needs them installed regardless of NODE_ENV.
npm ci --include=dev

if [ ! -f "$APP_ROOT/.env" ]; then
  echo "ERROR: $APP_ROOT/.env does not exist yet." >&2
  echo "Create it by hand via File Manager before the first deploy — see chat for the template." >&2
  exit 1
fi
set -a
# shellcheck disable=SC1091
source "$APP_ROOT/.env"
set +a

echo "==> Server diagnostics (plain files/commands only, no WASM involved)"
# Moved to right after install, before any build step — apps/web's own
# build just OOM'd on a WebAssembly instantiation too (esbuild's WASM
# fallback, most likely), not just Prisma's, so this now needs to be
# captured before ANY build attempt, not just before the Prisma one.
cat /etc/os-release 2>&1 || true
echo "---"
free -h 2>&1 || true
echo "---"
ulimit -a 2>&1 || true

echo "==> Building packages/shared and apps/web"
# apps/web doesn't touch Prisma at all — built and published before
# anything Prisma-related runs, so a backend-side failure below (still
# being chased — see chat) never blocks the frontend from going live.
npm run build --workspace=packages/shared
npm run build --workspace=apps/web

echo "==> Publishing the frontend build to public_html"
mkdir -p "$PUBLIC_HTML"
find "$PUBLIC_HTML" -mindepth 1 -maxdepth 1 -not -name '.well-known' -exec rm -rf {} +
cp -a apps/web/dist/. "$PUBLIC_HTML"/

echo "==> Generating the Prisma client"
# Must run before building apps/api — tsc needs the generated types
# (Prisma.Decimal, Role, WalletTxType, ...), not just the @prisma/client
# stub that npm install alone leaves behind.
npx prisma generate --schema=apps/api/prisma/schema.prisma

echo "==> Building apps/api"
npm run build --workspace=apps/api

echo "==> Applying database migrations"
npx prisma migrate deploy --schema=apps/api/prisma/schema.prisma

echo "==> Restarting the Node.js app (Passenger)"
mkdir -p "$APP_ROOT/tmp"
touch "$APP_ROOT/tmp/restart.txt"

echo "==> Deploy complete"
