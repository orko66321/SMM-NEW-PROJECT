#!/bin/bash
# Run by .cpanel.yml (cPanel "Git Version Control" → Deploy HEAD Commit).
# Publishes the pre-built frontend (apps/web/dist) to public_html —
# nothing else.
#
# This account used to also run the API (Setup Node.js App at
# api.allinonsr.com), with this script syncing the whole repo into a
# separate Application Root, installing production deps, and applying
# migrations. That's gone: after an extended investigation, cPanel's
# Passenger/LiteSpeed integration on this host never actually routed
# traffic to the app no matter what was tried (correct .htaccess,
# correct startup file, the underlying code crash fixed and verified,
# a from-scratch app recreation — see git log around 2026-08-25/26 for
# the full trail), so the API now runs on Railway instead (Dockerfile +
# railway.json at the repo root; api.allinonsr.com is a CNAME to Railway
# now, not this account). This account is frontend-only static hosting
# from here on — apps/web/.env.production already points the built
# frontend at the Railway API, so no server-side config is needed here
# at all.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PUBLIC_HTML="/home/allinons/public_html"

echo "==> Publishing the pre-built frontend to public_html"
mkdir -p "$PUBLIC_HTML"
find "$PUBLIC_HTML" -mindepth 1 -maxdepth 1 -not -name '.well-known' -exec rm -rf {} +
cp -a "$REPO_ROOT"/apps/web/dist/. "$PUBLIC_HTML"/

echo "==> Deploy complete"
