/*
  Warnings:

  - You are about to drop the column `message` on the `Notice` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Notice" DROP COLUMN "message",
ADD COLUMN     "messageBn" TEXT,
ADD COLUMN     "messageEn" TEXT;
