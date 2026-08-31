-- Role enum: drop the unused STAFF value, add MODERATOR. Postgres can't
-- ALTER TYPE ... DROP VALUE and can't safely ADD VALUE + use it in the same
-- transaction (applyMigrations.ts runs the whole file in one tx), so swap
-- the type wholesale — same shape Prisma's own enum-change migrations use.
ALTER TYPE "Role" RENAME TO "Role_old";

CREATE TYPE "Role" AS ENUM ('USER', 'MODERATOR', 'ADMIN');

ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;

ALTER TABLE "User"
  ALTER COLUMN "role" TYPE "Role"
  USING ((CASE "role"::text WHEN 'STAFF' THEN 'MODERATOR' ELSE "role"::text END)::"Role");

ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'USER';

DROP TYPE "Role_old";

-- Admin-assignable reseller grant (parallel to the existing isVip flag).
ALTER TABLE "User" ADD COLUMN "isReseller" BOOLEAN NOT NULL DEFAULT false;
