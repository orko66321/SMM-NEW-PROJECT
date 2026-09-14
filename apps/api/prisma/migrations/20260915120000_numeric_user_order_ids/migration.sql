-- Adds short, sequential, human-readable numbers alongside the existing
-- cuid `id` primary keys — "User #1001", "Order #10001" — for customer
-- support to read/copy easily. `id` stays the real primary key everywhere
-- (FKs, route params, lookups); these are display-only.
--
-- Existing rows are backfilled in creation order (oldest first) so the
-- numbering reads the way a human expects. New rows get the next value
-- from a real Postgres sequence via DEFAULT nextval(...), which is atomic
-- under concurrent inserts — no app-level locking or counter table needed.

-- ── User.userNumber, starting at 1001 ───────────────────────────────────
ALTER TABLE "User" ADD COLUMN "userNumber" INTEGER;

WITH ordered AS (
  SELECT "id", ROW_NUMBER() OVER (ORDER BY "createdAt", "id") + 1000 AS rn
  FROM "User"
)
UPDATE "User" u SET "userNumber" = ordered.rn
FROM ordered WHERE ordered.id = u.id;

CREATE SEQUENCE "User_userNumber_seq" OWNED BY "User"."userNumber";
SELECT setval('"User_userNumber_seq"', GREATEST((SELECT COALESCE(MAX("userNumber"), 1000) FROM "User"), 1000));

ALTER TABLE "User" ALTER COLUMN "userNumber" SET DEFAULT nextval('"User_userNumber_seq"');
ALTER TABLE "User" ALTER COLUMN "userNumber" SET NOT NULL;
CREATE UNIQUE INDEX "User_userNumber_key" ON "User"("userNumber");

-- ── Order.orderNumber, starting at 10001 ────────────────────────────────
ALTER TABLE "Order" ADD COLUMN "orderNumber" INTEGER;

WITH ordered AS (
  SELECT "id", ROW_NUMBER() OVER (ORDER BY "createdAt", "id") + 10000 AS rn
  FROM "Order"
)
UPDATE "Order" o SET "orderNumber" = ordered.rn
FROM ordered WHERE ordered.id = o.id;

CREATE SEQUENCE "Order_orderNumber_seq" OWNED BY "Order"."orderNumber";
SELECT setval('"Order_orderNumber_seq"', GREATEST((SELECT COALESCE(MAX("orderNumber"), 10000) FROM "Order"), 10000));

ALTER TABLE "Order" ALTER COLUMN "orderNumber" SET DEFAULT nextval('"Order_orderNumber_seq"');
ALTER TABLE "Order" ALTER COLUMN "orderNumber" SET NOT NULL;
CREATE UNIQUE INDEX "Order_orderNumber_key" ON "Order"("orderNumber");
