-- CreateEnum
CREATE TYPE "PostCategory" AS ENUM ('DOCUMENTATION', 'BLOG', 'UPDATE');

-- CreateEnum
CREATE TYPE "PostStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- AlterTable
ALTER TABLE "Service" ADD COLUMN     "nameBn" TEXT,
ADD COLUMN     "descriptionBn" TEXT;

-- CreateTable
CREATE TABLE "Post" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category" "PostCategory" NOT NULL DEFAULT 'BLOG',
    "status" "PostStatus" NOT NULL DEFAULT 'DRAFT',
    "coverImage" TEXT,
    "youtubeVideoId" TEXT,
    "pdfFile" TEXT,
    "pdfName" TEXT,
    "titleEn" TEXT,
    "titleBn" TEXT,
    "contentEn" TEXT,
    "contentBn" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Post_slug_key" ON "Post"("slug");

-- CreateIndex
CREATE INDEX "Post_status_category_idx" ON "Post"("status", "category");

-- CreateIndex
CREATE INDEX "Post_publishedAt_idx" ON "Post"("publishedAt");
