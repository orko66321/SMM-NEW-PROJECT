-- One-time first-deposit bonus. A per-user flag plus four SiteSettings
-- knobs. Every column is defaulted so existing rows are untouched.
-- (No semicolons anywhere in these comments so splitStatements is happy.)

ALTER TABLE "User" ADD COLUMN "hasDeposited" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "SiteSettings" ADD COLUMN "firstDepositBonusEnabled" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "SiteSettings" ADD COLUMN "firstDepositBonusPercent" DECIMAL(5,2) NOT NULL DEFAULT 0;

ALTER TABLE "SiteSettings" ADD COLUMN "firstDepositMinAmount" DECIMAL(18,4) NOT NULL DEFAULT 0;

ALTER TABLE "SiteSettings" ADD COLUMN "firstDepositMaxBonus" DECIMAL(18,4) NOT NULL DEFAULT 0;

-- Backfill: anyone who has ever had an approved deposit has already made
-- their first deposit, so they must not see the offer or get the bonus.
UPDATE "User" SET "hasDeposited" = true WHERE "id" IN (SELECT DISTINCT "userId" FROM "Deposit" WHERE "status" = 'APPROVED');
