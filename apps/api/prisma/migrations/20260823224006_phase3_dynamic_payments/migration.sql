-- CreateEnum
CREATE TYPE "PaymentMethodGatewayType" AS ENUM ('AUTOMATED', 'MANUAL');

-- CreateEnum
CREATE TYPE "PaymentMethodAccountType" AS ENUM ('PERSONAL', 'MERCHANT', 'AGENT');

-- CreateEnum
CREATE TYPE "PaymentMethodStatus" AS ENUM ('ACTIVE', 'DISABLED');

-- AlterEnum
ALTER TYPE "WalletTxType" ADD VALUE 'DEPOSIT_BONUS';

-- AlterTable
ALTER TABLE "Deposit" ADD COLUMN     "bonusAmount" DECIMAL(18,4) NOT NULL DEFAULT 0,
ADD COLUMN     "paymentMethodId" TEXT,
ADD COLUMN     "senderNumber" TEXT,
ADD COLUMN     "trxId" TEXT;

-- CreateTable
CREATE TABLE "PaymentMethod" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "gatewayType" "PaymentMethodGatewayType" NOT NULL,
    "accountType" "PaymentMethodAccountType" NOT NULL DEFAULT 'PERSONAL',
    "accountNumber" TEXT,
    "instructions" TEXT,
    "minAmount" DECIMAL(18,4) NOT NULL DEFAULT 0.2,
    "maxAmount" DECIMAL(18,4) NOT NULL DEFAULT 100000,
    "bonusPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "gatewayProvider" TEXT,
    "status" "PaymentMethodStatus" NOT NULL DEFAULT 'ACTIVE',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentMethod_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PaymentMethod_status_idx" ON "PaymentMethod"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Deposit_trxId_key" ON "Deposit"("trxId");

-- AddForeignKey
ALTER TABLE "Deposit" ADD CONSTRAINT "Deposit_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "PaymentMethod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

