-- CreateEnum
CREATE TYPE "PaymentGatewayMode" AS ENUM ('SANDBOX', 'LIVE');

-- AlterTable
ALTER TABLE "Deposit" ADD COLUMN     "gatewayProvider" TEXT,
ADD COLUMN     "gatewayRef" TEXT;

-- AlterTable
ALTER TABLE "Service" ADD COLUMN     "autoSubmit" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "backupProviderId" TEXT;

-- CreateTable
CREATE TABLE "ProviderSyncLog" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProviderSyncLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentGatewayConfig" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "mode" "PaymentGatewayMode" NOT NULL DEFAULT 'SANDBOX',
    "credentialsCiphertext" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentGatewayConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProviderSyncLog_providerId_createdAt_idx" ON "ProviderSyncLog"("providerId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentGatewayConfig_provider_key" ON "PaymentGatewayConfig"("provider");

-- CreateIndex
CREATE UNIQUE INDEX "Deposit_gatewayRef_key" ON "Deposit"("gatewayRef");

-- AddForeignKey
ALTER TABLE "ProviderSyncLog" ADD CONSTRAINT "ProviderSyncLog_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_backupProviderId_fkey" FOREIGN KEY ("backupProviderId") REFERENCES "Provider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

