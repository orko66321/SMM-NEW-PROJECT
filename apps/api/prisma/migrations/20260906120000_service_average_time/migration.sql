-- Service "Average Time" + "Recently Completed" (SMMGen-style). Two nullable
-- Order columns freeze each order's completion duration, two nullable
-- Service columns cache the rolling average, two defaulted SiteSettings
-- knobs tune it. Every column is nullable or defaulted so existing rows are
-- untouched. (No semicolons anywhere in these comments so splitStatements
-- stays happy.)

ALTER TABLE "Order" ADD COLUMN "completedAt" TIMESTAMP(3);

ALTER TABLE "Order" ADD COLUMN "completionSeconds" INTEGER;

ALTER TABLE "Service" ADD COLUMN "avgCompletionSeconds" INTEGER;

ALTER TABLE "Service" ADD COLUMN "lastCompletedAt" TIMESTAMP(3);

ALTER TABLE "SiteSettings" ADD COLUMN "avgCompletionSampleSize" INTEGER NOT NULL DEFAULT 15;

ALTER TABLE "SiteSettings" ADD COLUMN "recentlyCompletedWindowHours" INTEGER NOT NULL DEFAULT 24;

CREATE INDEX "Order_serviceId_status_completedAt_idx" ON "Order"("serviceId", "status", "completedAt");

-- Best-effort backfill for orders that already finished: treat updatedAt as
-- the completion moment (the last thing that touched a terminal-state order
-- is almost always the status flip itself) and clamp the duration at zero.
UPDATE "Order"
SET "completedAt" = "updatedAt",
    "completionSeconds" = GREATEST(0, CAST(EXTRACT(EPOCH FROM ("updatedAt" - "createdAt")) AS INTEGER))
WHERE "status" IN ('COMPLETED', 'PARTIAL')
  AND "completedAt" IS NULL;

-- Seed each service's cached average from its most recent 15 completed
-- orders (15 = the default avgCompletionSampleSize) using a window function.
UPDATE "Service" s
SET "avgCompletionSeconds" = agg.avg_secs,
    "lastCompletedAt" = agg.last_at
FROM (
  SELECT "serviceId",
         CAST(ROUND(AVG("completionSeconds")) AS INTEGER) AS avg_secs,
         MAX("completedAt") AS last_at
  FROM (
    SELECT "serviceId",
           "completionSeconds",
           "completedAt",
           ROW_NUMBER() OVER (PARTITION BY "serviceId" ORDER BY "completedAt" DESC) AS rn
    FROM "Order"
    WHERE "serviceId" IS NOT NULL
      AND "status" IN ('COMPLETED', 'PARTIAL')
      AND "completionSeconds" IS NOT NULL
  ) ranked
  WHERE rn <= 15
  GROUP BY "serviceId"
) agg
WHERE s."id" = agg."serviceId";
