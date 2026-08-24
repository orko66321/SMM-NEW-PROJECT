#!/usr/bin/env node
// One-off diagnostic: test PostgreSQL connectivity from this exact account
// / process context against every host candidate we know about, using the
// same driver (PrismaClient via apps/api/generated-client) applyMigrations.js
// uses — not a generic TCP probe, so it reflects exactly what the real
// migration/app code would see. Read-only (SELECT 1), never prints
// credentials. Run from the repo root (bin/deploy-cpanel.sh does
// `cd "$APP_ROOT"` before this runs, and APP_ROOT mirrors the repo layout).
import { PrismaClient } from "../apps/api/generated-client/index.js";

const raw = process.env.DATABASE_URL;
if (!raw) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

function buildCandidateUrl(rawUrl, host) {
  const url = new URL(rawUrl.replace(/^postgresql:/, "postgres:"));
  url.searchParams.delete("host");
  if (host.startsWith("/")) {
    // Unix socket directory — libpq/Prisma convention: keep a placeholder
    // hostname in the authority (required for a valid URL) and pass the
    // real socket dir via the "host" query param instead.
    url.hostname = "localhost";
    url.searchParams.set("host", host);
  } else {
    url.hostname = host;
    url.port = "5432";
  }
  return url.toString().replace(/^postgres:/, "postgresql:");
}

const candidates = ["localhost", "127.0.0.1", "127.0.0.200", "/var/run/postgresql", "/tmp"];

for (const host of candidates) {
  const url = buildCandidateUrl(raw, host);
  const client = new PrismaClient({ datasources: { db: { url } } });
  try {
    await client.$queryRawUnsafe("SELECT 1");
    console.log(`OK   host=${host}`);
  } catch (err) {
    // Prisma's connection-error messages start with blank lines before the
    // actual reason, so collapse whitespace instead of taking line 1 (which
    // is empty). Verified this error shape never echoes the connection
    // string/credentials — only "Can't reach database server at `host:port`".
    const reason = String(err instanceof Error ? err.message : err)
      .trim()
      .replace(/\s+/g, " ");
    console.log(`FAIL host=${host}: ${reason}`);
  } finally {
    await client.$disconnect();
  }
}
