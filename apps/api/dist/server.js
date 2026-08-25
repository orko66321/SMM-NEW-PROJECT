import { appendFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
// Passenger (this app's process manager on the cPanel host) has no
// discoverable log surface for this account — a real production incident
// spent hours undiagnosable because a startup crash was completely
// invisible: Passenger just silently falls back to its own generic
// placeholder response instead of surfacing anything. This file-based
// crash log is the fix — readable via plain File Manager, no SSH needed.
// A dynamic import() (not a static one) is required to make *any*
// startup failure — including a throw during module evaluation itself,
// which is exactly what caused the original incident — land in this
// try/catch at all; a static top-level import failing crashes the
// process before this file's own code (including the log-appending
// exception handlers below) ever runs.
// 3 levels up from dist/server.js reaches the repo root's tmp/ — same
// path env.ts's dotenv.config() uses for the repo-root .env, and the same
// tmp/ bin/deploy-cpanel.sh already creates for Passenger's restart.txt.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CRASH_LOG = path.resolve(__dirname, "../../../tmp/crash.log");
function logCrash(label, err) {
    const detail = err instanceof Error ? (err.stack ?? err.message) : String(err);
    const line = `[${new Date().toISOString()}] ${label}: ${detail}\n`;
    try {
        appendFileSync(CRASH_LOG, line);
    }
    catch {
        // tmp/ not writable — fall through to stderr only, still better than nothing.
    }
    // eslint-disable-next-line no-console
    console.error(line);
}
process.on("uncaughtException", (err) => {
    logCrash("uncaughtException", err);
    process.exit(1);
});
process.on("unhandledRejection", (err) => {
    logCrash("unhandledRejection", err);
    process.exit(1);
});
try {
    const { createApp } = await import("./app.js");
    const { env } = await import("./env.js");
    const { logger } = await import("./lib/logger.js");
    const { startCronJobs } = await import("./cron/index.js");
    const app = createApp();
    const server = app.listen(env.PORT, () => {
        logger.info(`API listening on http://localhost:${env.PORT}`);
        if (env.NODE_ENV !== "test") {
            startCronJobs();
        }
    });
    server.on("error", (err) => {
        logCrash("server.listen", err);
        process.exit(1);
    });
    const shutdown = (signal) => {
        logger.info(`Received ${signal}, shutting down gracefully`);
        server.close(() => process.exit(0));
        setTimeout(() => process.exit(1), 10_000).unref();
    };
    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
}
catch (err) {
    logCrash("startup", err);
    process.exit(1);
}
