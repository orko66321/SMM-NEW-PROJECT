-- Admin Panel -> unified "Broadcast & Campaign Center": adds Bulk Email
-- alongside the existing Bulk SMS campaigns, sharing the same target-group
-- and status vocabulary (renamed from Sms-prefixed to channel-agnostic
-- names -- Postgres updates every column using them automatically).

ALTER TYPE "SmsCampaignTargetGroup" RENAME TO "CampaignTargetGroup";

ALTER TYPE "SmsCampaignStatus" RENAME TO "CampaignStatus";

ALTER TABLE "SiteSettings" ADD COLUMN     "emailBroadcastEnabled" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "EmailCampaign" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "bodyHtml" TEXT NOT NULL,
    "targetGroup" "CampaignTargetGroup" NOT NULL,
    "recipientEmails" TEXT[],
    "recipientUsernames" TEXT[],
    "recipientCount" INTEGER NOT NULL,
    "processedCount" INTEGER NOT NULL DEFAULT 0,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "status" "CampaignStatus" NOT NULL DEFAULT 'PENDING',
    "sentById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "EmailCampaign_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EmailCampaign_status_idx" ON "EmailCampaign"("status");

CREATE INDEX "EmailCampaign_createdAt_idx" ON "EmailCampaign"("createdAt");

ALTER TABLE "EmailCampaign" ADD CONSTRAINT "EmailCampaign_sentById_fkey" FOREIGN KEY ("sentById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
