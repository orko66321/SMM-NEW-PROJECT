-- CreateTable
CREATE TABLE "site_notices" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "titleBn" TEXT,
    "titleEn" TEXT,
    "bodyBn" TEXT,
    "bodyEn" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_notices_pkey" PRIMARY KEY ("id")
);
