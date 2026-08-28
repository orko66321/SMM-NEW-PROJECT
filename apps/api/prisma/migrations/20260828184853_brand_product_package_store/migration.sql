-- CreateEnum
CREATE TYPE "ProductDesignTemplate" AS ENUM ('SMALL_STRIP', 'STANDARD_GRID', 'FEATURED_LARGE');

-- CreateEnum
CREATE TYPE "PackageDesignTemplate" AS ENUM ('RADIO_LIST', 'BOXED_GRID');

-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('TOPUP', 'VOUCHER', 'SMM', 'SUBSCRIPTION');

-- CreateEnum
CREATE TYPE "AccessType" AS ENUM ('ALL', 'VIP', 'RESELLER');

-- CreateEnum
CREATE TYPE "StockCodeStatus" AS ENUM ('AVAILABLE', 'CONSUMED', 'REVOKED');

-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_serviceId_fkey";

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "packageId" TEXT,
ALTER COLUMN "serviceId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isVip" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Brand" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 0,
    "productDesign" "ProductDesignTemplate" NOT NULL DEFAULT 'STANDARD_GRID',
    "logo" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "userInputFieldName" TEXT NOT NULL DEFAULT 'Link',
    "orderInstructionsLink" TEXT,
    "salePrice" DECIMAL(18,4) NOT NULL,
    "buyPrice" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "productType" "ProductType" NOT NULL,
    "accessType" "AccessType" NOT NULL DEFAULT 'ALL',
    "logo" TEXT,
    "secondaryType" TEXT,
    "level" INTEGER NOT NULL DEFAULT 0,
    "isAuto" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "productNote" TEXT,
    "slug" TEXT NOT NULL,
    "gameCheaterType" TEXT,
    "hasOrderTimeLimit" BOOLEAN NOT NULL DEFAULT false,
    "maxOrdersPerWindow" INTEGER,
    "orderWindowHours" INTEGER,
    "checkUniquePlayerId" BOOLEAN NOT NULL DEFAULT false,
    "isQuantityMinusOnOrder" BOOLEAN NOT NULL DEFAULT false,
    "isQuantityShowUser" BOOLEAN NOT NULL DEFAULT false,
    "isPremiumProduct" BOOLEAN NOT NULL DEFAULT false,
    "minAmountForPremium" DECIMAL(18,4),
    "removeCharacters" TEXT,
    "redeemLink" TEXT,
    "isResellerProduct" BOOLEAN NOT NULL DEFAULT false,
    "isMysteryBox" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "packageDesign" "PackageDesignTemplate" NOT NULL DEFAULT 'RADIO_LIST',
    "serviceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Package" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "salePrice" DECIMAL(18,4) NOT NULL,
    "buyPrice" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "commonPriceUsd" DECIMAL(18,4) NOT NULL,
    "extraFee" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 0,
    "isAuto" BOOLEAN NOT NULL DEFAULT false,
    "isManual" BOOLEAN NOT NULL DEFAULT false,
    "server" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Package_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockPool" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockPool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackageStockPool" (
    "packageId" TEXT NOT NULL,
    "poolId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PackageStockPool_pkey" PRIMARY KEY ("packageId","poolId")
);

-- CreateTable
CREATE TABLE "StockCode" (
    "id" TEXT NOT NULL,
    "poolId" TEXT NOT NULL,
    "codeCiphertext" TEXT NOT NULL,
    "status" "StockCodeStatus" NOT NULL DEFAULT 'AVAILABLE',
    "orderId" TEXT,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Brand_level_idx" ON "Brand"("level");

-- CreateIndex
CREATE INDEX "Brand_isActive_idx" ON "Brand"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");

-- CreateIndex
CREATE INDEX "Product_brandId_level_idx" ON "Product"("brandId", "level");

-- CreateIndex
CREATE INDEX "Product_isActive_idx" ON "Product"("isActive");

-- CreateIndex
CREATE INDEX "Product_serviceId_idx" ON "Product"("serviceId");

-- CreateIndex
CREATE INDEX "Package_productId_level_idx" ON "Package"("productId", "level");

-- CreateIndex
CREATE UNIQUE INDEX "StockPool_name_key" ON "StockPool"("name");

-- CreateIndex
CREATE INDEX "PackageStockPool_poolId_idx" ON "PackageStockPool"("poolId");

-- CreateIndex
CREATE UNIQUE INDEX "StockCode_orderId_key" ON "StockCode"("orderId");

-- CreateIndex
CREATE INDEX "StockCode_poolId_status_idx" ON "StockCode"("poolId", "status");

-- CreateIndex
CREATE INDEX "Order_packageId_idx" ON "Order"("packageId");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Package" ADD CONSTRAINT "Package_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackageStockPool" ADD CONSTRAINT "PackageStockPool_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "Package"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackageStockPool" ADD CONSTRAINT "PackageStockPool_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "StockPool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockCode" ADD CONSTRAINT "StockCode_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "StockPool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockCode" ADD CONSTRAINT "StockCode_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "Package"("id") ON DELETE SET NULL ON UPDATE CASCADE;
