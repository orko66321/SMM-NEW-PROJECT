-- CreateEnum
CREATE TYPE "NoticeLevel" AS ENUM ('INFO', 'WARNING', 'SUCCESS', 'ERROR');

-- CreateEnum
CREATE TYPE "LiveChatProvider" AS ENUM ('NONE', 'TAWKTO', 'CRISP');

-- CreateEnum
CREATE TYPE "DisplayCurrency" AS ENUM ('USD', 'BDT');

-- DropIndex
DROP INDEX "User_apiKey_key";

-- AlterTable
ALTER TABLE "Deposit" ADD COLUMN     "couponId" TEXT;

-- AlterTable
ALTER TABLE "PaymentGatewayConfig" ADD COLUMN     "autoVerify" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "apiKey",
ADD COLUMN     "apiKeyCreatedAt" TIMESTAMP(3),
ADD COLUMN     "apiKeyHash" TEXT,
ADD COLUMN     "apiKeyPrefix" TEXT,
ADD COLUMN     "notifyEmail" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifyOrderUpdates" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifyPromotions" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "phone" TEXT;

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "siteName" TEXT NOT NULL DEFAULT 'SMM Panel',
    "whatsappEnabled" BOOLEAN NOT NULL DEFAULT false,
    "whatsappNumber" TEXT,
    "liveChatProvider" "LiveChatProvider" NOT NULL DEFAULT 'NONE',
    "liveChatWidgetId" TEXT,
    "usdToBdtRate" DECIMAL(10,4) NOT NULL DEFAULT 110,
    "defaultCurrency" "DisplayCurrency" NOT NULL DEFAULT 'USD',
    "smtpEnabled" BOOLEAN NOT NULL DEFAULT false,
    "smtpHost" TEXT,
    "smtpPort" INTEGER,
    "smtpUser" TEXT,
    "smtpPassCiphertext" TEXT,
    "smtpFromAddress" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notice" (
    "id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "level" "NoticeLevel" NOT NULL DEFAULT 'INFO',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- CreateIndex
CREATE INDEX "Notice_active_idx" ON "Notice"("active");

-- CreateIndex
CREATE UNIQUE INDEX "User_apiKeyHash_key" ON "User"("apiKeyHash");

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deposit" ADD CONSTRAINT "Deposit_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE SET NULL ON UPDATE CASCADE;

