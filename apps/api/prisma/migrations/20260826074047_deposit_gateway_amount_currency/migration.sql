-- AlterTable
ALTER TABLE "Deposit" ADD COLUMN     "gatewayAmount" DECIMAL(18,4),
ADD COLUMN     "gatewayCurrency" TEXT;
