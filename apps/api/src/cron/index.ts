import cron from "node-cron";
import { logger } from "../lib/logger.js";
import { submitPendingOrders } from "./submitPendingOrders.js";
import { pollOrderStatus } from "./pollOrderStatus.js";
import { reconcilePendingDeposits } from "./reconcilePendingDeposits.js";
import { syncAllActiveProviders } from "./syncProviders.js";

function runSafely(name: string, fn: () => Promise<{ [k: string]: number }>) {
  return async () => {
    try {
      const result = await fn();
      logger.debug({ job: name, ...result }, "Cron job completed");
    } catch (err) {
      logger.error({ err, job: name }, "Cron job threw unexpectedly");
    }
  };
}

/**
 * Registers Phase 2 background jobs. Skipped entirely in tests (see
 * server.ts) — the same logic is called directly and synchronously in
 * tests/autoFulfillment.test.ts instead of waiting on a schedule.
 *
 * NOTE: schedules run in-process against an in-memory nothing — safe for a
 * single API instance. Running more than one instance would run each job
 * multiple times concurrently; move to a proper job queue (e.g. BullMQ)
 * before horizontally scaling, same caveat as the in-memory rate limiter.
 */
export function startCronJobs() {
  cron.schedule("*/2 * * * *", runSafely("submitPendingOrders", submitPendingOrders));
  cron.schedule("*/5 * * * *", runSafely("pollOrderStatus", pollOrderStatus));
  cron.schedule("*/5 * * * *", runSafely("reconcilePendingDeposits", reconcilePendingDeposits));
  cron.schedule("0 */6 * * *", runSafely("syncAllActiveProviders", syncAllActiveProviders));
  logger.info("Cron jobs registered");
}
