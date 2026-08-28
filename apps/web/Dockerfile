# Builds and serves apps/web (the Vite SPA) on Railway as static files.
#
# This is SEPARATE from the root /Dockerfile, which is API-only — its own
# header says "Builds and runs apps/api on Railway" and its final stage
# only copies /app/node_modules, /app/package.json, /app/apps/api and
# /app/packages/shared into the image. It never copies apps/web, so the
# @smm/web service (pointed at that same root Dockerfile) crashed every
# deploy with:
#   npm error No workspaces found:
#   npm error --workspace=@smm/web
# because apps/web simply wasn't in the runtime image.
#
# Build context is the REPO ROOT (Railway "Root Directory" stays "/"),
# same as the root Dockerfile.

FROM node:20-slim AS build
WORKDIR /app

# Install deps first for better layer caching. All workspace manifests
# must be present so `npm ci` can reconcile against the root lockfile
# (workspaces globs: apps/*, packages/*).
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci

COPY . .

# @smm/web depends on @smm/shared: "*" — shared must build first (same
# order as the root package.json "build" script).
RUN npm run build --workspace=packages/shared
RUN npm run build --workspace=apps/web

# ── Runtime: minimal static file server ─────────────────────────────────
FROM node:20-slim
WORKDIR /app/web
ENV NODE_ENV=production

# `serve -s` serves a Single-Page App: unknown routes fall back to
# index.html so client-side (react-router) routing works on refresh /
# deep links.
RUN npm install -g serve@14

COPY --from=build /app/apps/web/dist ./dist

# Railway injects $PORT at runtime; 4173 is only a local-run default.
ENV PORT=4173
EXPOSE 4173
CMD ["sh", "-c", "serve -s dist -l ${PORT:-4173}"]
