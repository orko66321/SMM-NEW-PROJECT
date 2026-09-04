 # Builds and runs apps/api on Railway. A plain Dockerfile rather than
# Nixpacks/Railpack auto-detection — the auto-detected build kept hitting
# "EBUSY: resource busy or locked, rmdir '/app/node_modules/.cache'"
# because Nixpacks' default JS provider wraps the install step in a
# BuildKit cache mount at that exact path, which `npm ci`'s clean-install
# (it removes node_modules before installing) can't rmdir since it's an
# active mount point. A Dockerfile sidesteps that whole class of
# buildpack-specific behavior — every command here is the same sequence
# already verified locally and in apps/api/package.json's own scripts.
FROM node:20-slim AS build
WORKDIR /app

# Prisma's engine binaries need libssl at runtime; slim images don't
# always have it preinstalled.
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Install dependencies first (better layer caching on unrelated source changes).
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci

COPY . .

RUN npx prisma generate --schema=apps/api/prisma/schema.prisma
RUN npm run build --workspace=packages/shared
RUN npm run build --workspace=apps/api
# apps/web depends on packages/shared (built above); build it too so this
# same image can serve the built SPA when SERVICE_TARGET=web is set on a
# Railway service (see CMD below). Existing services never set that var,
# so this only adds a slightly longer build for them, nothing else.
RUN npm run build --workspace=apps/web

FROM node:20-slim
WORKDIR /app
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/apps/api ./apps/api
COPY --from=build /app/packages/shared ./packages/shared
COPY --from=build /app/apps/web/dist ./apps/web/dist

# `serve` is only exercised when SERVICE_TARGET=web (see CMD below);
# harmless extra bytes for every other service using this image.
RUN npm install -g serve@14
CMD ["sh", "-c", "if [ \"$SERVICE_TARGET\" = \"web\" ]; then serve -s apps/web/dist -l ${PORT:-4173}; else node apps/api/dist/scripts/applyMigrations.js && node apps/api/dist/server.js; fi"]
