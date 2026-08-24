// Replacement for `prisma migrate deploy` on hosts where the Prisma CLI
// can't run at all — the cPanel host's Node.js App has ulimit -v hard-capped
// at 4GB, and the CLI's schema-engine (WASM) crashes with
// "WebAssembly.Instance(): Out of memory" the moment it's invoked. This
// script uses only PrismaClient's native query engine (a real binary, no
// WASM) to apply migration.sql files directly, tracking them in a
// "_prisma_migrations" table shaped the same way Prisma's own CLI shapes it
// — so if the CLI is ever usable again on this host (or migrations are
// applied from a dev machine with `prisma migrate deploy`), it recognizes
// this history as its own instead of trying to re-apply or conflict with it.
import { readFile, readdir } from "node:fs/promises";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { prisma } from "../lib/prisma.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// dist/scripts/applyMigrations.js -> apps/api/prisma/migrations (the raw
// .sql files live outside src/, so they're never touched by tsc — they're
// just copied along with the rest of the repo checkout).
const MIGRATIONS_DIR = path.resolve(__dirname, "../../prisma/migrations");

const CREATE_TRACKING_TABLE = `
CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
    "id"                    VARCHAR(36) PRIMARY KEY NOT NULL,
    "checksum"              VARCHAR(64) NOT NULL,
    "finished_at"           TIMESTAMPTZ,
    "migration_name"        VARCHAR(255) NOT NULL,
    "logs"                  TEXT,
    "rolled_back_at"        TIMESTAMPTZ,
    "started_at"            TIMESTAMPTZ NOT NULL DEFAULT now(),
    "applied_steps_count"   INTEGER NOT NULL DEFAULT 0
);
`;

interface MigrationRow {
  migration_name: string;
  finished_at: Date | null;
}

// Prisma's query engine always runs raw queries as a Postgres prepared
// statement, and Postgres refuses to prepare a string containing more than
// one command — so a whole migration.sql (many `CREATE TABLE ... ;`
// statements back to back) has to be split and executed one statement at a
// time. Safe here because Prisma-generated migration.sql files are plain
// DDL with a `;` terminating every statement and no semicolons inside
// string literals or dollar-quoted bodies (verified across this project's
// migrations) — this is not a general-purpose SQL statement splitter.
function splitStatements(sql: string): string[] {
  return sql
    .split(";")
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);
}

async function listMigrationDirs(): Promise<string[]> {
  const entries = await readdir(MIGRATIONS_DIR, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

async function main() {
  console.log(`Applying migrations from ${MIGRATIONS_DIR}`);

  await prisma.$executeRawUnsafe(CREATE_TRACKING_TABLE);

  const existingRows = await prisma.$queryRawUnsafe<MigrationRow[]>(
    `SELECT "migration_name", "finished_at" FROM "_prisma_migrations"`,
  );
  const appliedNames = new Set(
    existingRows.filter((row) => row.finished_at !== null).map((row) => row.migration_name),
  );

  const incomplete = existingRows.find((row) => row.finished_at === null);
  if (incomplete) {
    throw new Error(
      `Migration "${incomplete.migration_name}" is recorded as started but never finished. ` +
        `Inspect the database and resolve this by hand before running this script again — ` +
        `it will not guess whether that migration's SQL partially applied.`,
    );
  }

  const dirs = await listMigrationDirs();
  let appliedCount = 0;

  for (const dir of dirs) {
    if (appliedNames.has(dir)) {
      continue;
    }

    const sqlPath = path.join(MIGRATIONS_DIR, dir, "migration.sql");
    const sql = await readFile(sqlPath, "utf8");
    const checksum = crypto.createHash("sha256").update(sql).digest("hex");
    const id = crypto.randomUUID();
    const statements = splitStatements(sql);

    console.log(`Applying migration ${dir} (${statements.length} statement(s))...`);

    await prisma.$transaction(async (tx) => {
      for (const statement of statements) {
        await tx.$executeRawUnsafe(statement);
      }
      await tx.$executeRawUnsafe(
        `INSERT INTO "_prisma_migrations"
          ("id", "checksum", "finished_at", "migration_name", "started_at", "applied_steps_count")
         VALUES ($1, $2, now(), $3, now(), $4)`,
        id,
        checksum,
        dir,
        statements.length,
      );
    });

    appliedCount += 1;
    console.log(`Applied ${dir}`);
  }

  if (appliedCount === 0) {
    console.log("No pending migrations — database is already up to date.");
  } else {
    console.log(`Applied ${appliedCount} migration(s).`);
  }
}

main()
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
