import { createApp } from "./app.js";
import { env } from "./env.js";
import { logger } from "./lib/logger.js";
import { startCronJobs } from "./cron/index.js";
const app = createApp();
const server = app.listen(env.PORT, () => {
    logger.info(`API listening on http://localhost:${env.PORT}`);
    if (env.NODE_ENV !== "test") {
        startCronJobs();
    }
});
function shutdown(signal) {
    logger.info(`Received ${signal}, shutting down gracefully`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10_000).unref();
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
