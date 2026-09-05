-- Referral program. New enum types, three User columns (referralCode is
-- backfilled deterministically from the id so the unique index is safe),
-- four SiteSettings knobs, a REFERRAL_REWARD wallet-tx type (swapped in
-- wholesale rather than ALTER TYPE ADD VALUE, which applyMigrations.ts runs
-- one file per transaction cannot do safely), and the ReferralLog table.
-- (No semicolons in these comments.)

CREATE TYPE "ReferrerRewardType" AS ENUM ('PERCENTAGE', 'FIXED');

CREATE TYPE "ReferralStatus" AS ENUM ('COMPLETED', 'FAILED');

ALTER TABLE "User" ADD COLUMN "referralCode" TEXT;

ALTER TABLE "User" ADD COLUMN "referredById" TEXT;

ALTER TABLE "User" ADD COLUMN "totalReferralEarnings" DECIMAL(18,4) NOT NULL DEFAULT 0;

UPDATE "User" SET "referralCode" = upper(substr(md5("id"), 1, 8)) WHERE "referralCode" IS NULL;

ALTER TABLE "User" ALTER COLUMN "referralCode" SET NOT NULL;

CREATE UNIQUE INDEX "User_referralCode_key" ON "User"("referralCode");

CREATE INDEX "User_referredById_idx" ON "User"("referredById");

ALTER TABLE "User" ADD CONSTRAINT "User_referredById_fkey" FOREIGN KEY ("referredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SiteSettings" ADD COLUMN "referralSystemEnabled" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "SiteSettings" ADD COLUMN "referrerRewardType" "ReferrerRewardType" NOT NULL DEFAULT 'PERCENTAGE';

ALTER TABLE "SiteSettings" ADD COLUMN "referrerRewardValue" DECIMAL(18,4) NOT NULL DEFAULT 0;

ALTER TABLE "SiteSettings" ADD COLUMN "refereeBonusPercent" DECIMAL(5,2) NOT NULL DEFAULT 0;

ALTER TYPE "WalletTxType" RENAME TO "WalletTxType_old";

CREATE TYPE "WalletTxType" AS ENUM ('DEPOSIT', 'DEPOSIT_BONUS', 'ORDER_DEBIT', 'ORDER_REFUND', 'ADMIN_ADJUSTMENT', 'AFFILIATE_PAYOUT', 'CHILD_PANEL_FEE', 'REFERRAL_REWARD');

ALTER TABLE "WalletTransaction" ALTER COLUMN "type" TYPE "WalletTxType" USING ("type"::text::"WalletTxType");

DROP TYPE "WalletTxType_old";

CREATE TABLE "ReferralLog" (
    "id" TEXT NOT NULL,
    "referrerId" TEXT NOT NULL,
    "refereeId" TEXT NOT NULL,
    "rewardAmount" DECIMAL(18,4) NOT NULL,
    "refereeBonusAmount" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "refereeDepositAmount" DECIMAL(18,4) NOT NULL,
    "status" "ReferralStatus" NOT NULL DEFAULT 'COMPLETED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReferralLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReferralLog_refereeId_key" ON "ReferralLog"("refereeId");

CREATE INDEX "ReferralLog_referrerId_idx" ON "ReferralLog"("referrerId");

ALTER TABLE "ReferralLog" ADD CONSTRAINT "ReferralLog_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ReferralLog" ADD CONSTRAINT "ReferralLog_refereeId_fkey" FOREIGN KEY ("refereeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
