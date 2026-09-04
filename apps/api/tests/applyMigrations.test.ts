import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { splitStatements } from "../src/scripts/splitStatements.js";

const MIGRATIONS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../prisma/migrations");

// Regression for a deploy outage: a hand-written migration comment contained
// "(a PACKAGE intent has no Service); its FK" — the `;` inside the `--`
// comment made the old naive `split(";")` emit `its FK ... ALTER TABLE ...`
// as its own statement, a syntax error that crashed `applyMigrations.js` on
// boot (Dockerfile CMD is `applyMigrations && server`), so every request
// 502'd. `psql -f` parses comments correctly and never saw it.
describe("applyMigrations.splitStatements", () => {
  it("drops `--` line comments, including ones containing a semicolon", () => {
    const sql = [
      "-- a comment; with a semicolon in it",
      'CREATE TYPE "X" AS ENUM (\'A\', \'B\');',
      "-- another; tricky; comment",
      'ALTER TABLE "T" ADD COLUMN "c" TEXT;',
    ].join("\n");

    expect(splitStatements(sql)).toEqual([
      'CREATE TYPE "X" AS ENUM (\'A\', \'B\')',
      'ALTER TABLE "T" ADD COLUMN "c" TEXT',
    ]);
  });

  it("strips a trailing comment after a statement on the same line", () => {
    expect(splitStatements('ALTER TABLE "T" DROP COLUMN "c"; -- note; with ;')).toEqual([
      'ALTER TABLE "T" DROP COLUMN "c"',
    ]);
  });

  it("every committed migration.sql splits into non-empty, comment-free statements", () => {
    const dirs = readdirSync(MIGRATIONS_DIR).filter((d) => statSync(path.join(MIGRATIONS_DIR, d)).isDirectory());
    expect(dirs.length).toBeGreaterThan(0);
    for (const dir of dirs) {
      const sql = readFileSync(path.join(MIGRATIONS_DIR, dir, "migration.sql"), "utf8");
      for (const stmt of splitStatements(sql)) {
        expect(stmt.length, `${dir}: empty statement`).toBeGreaterThan(0);
        expect(stmt.startsWith("--"), `${dir}: comment leaked into a statement: ${stmt.slice(0, 60)}`).toBe(false);
        // A statement should begin with a SQL keyword, never prose fragments
        // torn off a comment (the bug: "its FK\nALTER TABLE ...").
        expect(/^[A-Za-z"]/.test(stmt), `${dir}: statement starts oddly: ${stmt.slice(0, 60)}`).toBe(true);
        expect(/^(CREATE|ALTER|DROP|INSERT|UPDATE|DELETE|COMMENT|SELECT|SET|GRANT|REVOKE|WITH|DO)\b/i.test(stmt), `${dir}: not a DDL/DML statement: ${stmt.slice(0, 60)}`).toBe(true);
      }
    }
  });
});
