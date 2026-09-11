-- Admin Panel -> SMS Campaigns (bulk broadcast) -- see the SmsCampaign
-- model comment in schema.prisma for the recipients/processedCount design.

CREATE TYPE "SmsCampaignTargetGroup" AS ENUM ('ALL', 'VIP', 'RESELLER', 'CUSTOM');

CREATE TYPE "SmsCampaignStatus" AS ENUM ('PENDING', 'SENDING', 'COMPLETED', 'FAILED');

CREATE TABLE "SmsCampaign" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "targetGroup" "SmsCampaignTargetGroup" NOT NULL,
    "recipients" TEXT[],
    "recipientCount" INTEGER NOT NULL,
    "smsUnitsPerRecipient" INTEGER NOT NULL,
    "totalSmsUnits" INTEGER NOT NULL,
    "processedCount" INTEGER NOT NULL DEFAULT 0,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "status" "SmsCampaignStatus" NOT NULL DEFAULT 'PENDING',
    "sentById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "SmsCampaign_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SmsCampaign_status_idx" ON "SmsCampaign"("status");

CREATE INDEX "SmsCampaign_createdAt_idx" ON "SmsCampaign"("createdAt");

ALTER TABLE "SmsCampaign" ADD CONSTRAINT "SmsCampaign_sentById_fkey" FOREIGN KEY ("sentById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
