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
# touched by this script (see the --exclude on both rsync calls) — real
# secrets never pass through git or this script.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_ROOT="/home/allinons/smm-api"
PUBLIC_HTML="/home/allinons/public_html"
VENV="/home/allinons/nodevenv/smm-api/20/bin/activate"

echo "==> Syncing checkout into $APP_ROOT (keeping .env)"
mkdir -p "$APP_ROOT"
rsync -a --delete --exclude='.git' --exclude='.env' "$REPO_ROOT"/ "$APP_ROOT"/

echo "==> Activating the Node 20 app environment"
# shellcheck disable=SC1090
source "$VENV"
cd "$APP_ROOT"

echo "==> Installing dependencies"
npm ci

echo "==> Building packages/shared, apps/api, apps/web"
npm run build --workspace=packages/shared
npm run build --workspace=apps/api
npm run build --workspace=apps/web

echo "==> Publishing the frontend build to public_html"
rsync -a --delete --exclude='.well-known' apps/web/dist/ "$PUBLIC_HTML"/

echo "==> Applying database migrations"
if [ ! -f "$APP_ROOT/.env" ]; then
  echo "ERROR: $APP_ROOT/.env does not exist yet." >&2
  echo "Create it by hand via File Manager before the first deploy — see chat for the template." >&2
  exit 1
fi
set -a
# shellcheck disable=SC1091
source "$APP_ROOT/.env"
set +a
npx prisma generate --schema=apps/api/prisma/schema.prisma
npx prisma migrate deploy --schema=apps/api/prisma/schema.prisma

echo "==> Restarting the Node.js app (Passenger)"
mkdir -p "$APP_ROOT/tmp"
touch "$APP_ROOT/tmp/restart.txt"

echo "==> Deploy complete"
