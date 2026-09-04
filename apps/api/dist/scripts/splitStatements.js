// Prisma's query engine always runs raw queries as a Postgres prepared
// statement, and Postgres refuses to prepare a string containing more than
// one command — so a whole migration.sql (many `CREATE TABLE ... ;`
// statements back to back) has to be split and executed one statement at a
// time. Safe here because Prisma-generated migration.sql files are plain
// DDL with a `;` terminating every statement and no semicolons inside
// string literals or dollar-quoted bodies (verified across this project's
// migrations) — this is not a general-purpose SQL statement splitter.
//
// SQL comments (`--` line and `/* */` block, the latter is what Prisma's own
// "Warnings:" headers use) are stripped BEFORE splitting on `;`: a
// hand-written migration once put a `;` inside a `-- prose comment`, so
// `split(";")` tore the comment's second half ("... its FK\nALTER TABLE ...")
// into its own syntactically-invalid "statement" — `applyMigrations.js`
// threw on deploy and, since the Dockerfile CMD is `applyMigrations &&
// server`, the API never started and every request 502'd. `psql -f` and
// `prisma migrate` strip comments first and never see this. Same "nothing
// meaningful inside string literals" assumption as the `;` split itself.
//
// Kept in its own module (not exported from applyMigrations.ts) so tests can
// import it without triggering that file's top-level `main()`.
export function splitStatements(sql) {
    return sql
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/--.*$/gm, "")
        .split(";")
        .map((statement) => statement.trim())
        .filter((statement) => statement.length > 0);
}
