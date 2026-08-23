import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./tests/setup-env.ts"],
    include: ["tests/**/*.test.ts"],
    hookTimeout: 30_000,
    testTimeout: 30_000,
    // These are integration tests sharing one Postgres database — running
    // test files in parallel would race on the same rows (e.g. two files
    // both resetting/seeding the wallet at once), so keep them sequential.
    fileParallelism: false,
  },
});
