-- AlterEnum
ALTER TYPE "TicketStatus" ADD VALUE IF NOT EXISTS 'AI_PROCESSING';
ALTER TYPE "TicketStatus" ADD VALUE IF NOT EXISTS 'RESOLVED';
ALTER TYPE "TicketStatus" ADD VALUE IF NOT EXISTS 'ESCALATED';
ALTER TYPE "TicketStatus" ADD VALUE IF NOT EXISTS 'IN_PROGRESS';
ALTER TYPE "TicketStatus" ADD VALUE IF NOT EXISTS 'REPLIED';

-- AlterEnum
ALTER TYPE "TicketSender" ADD VALUE IF NOT EXISTS 'SYSTEM';

-- CreateEnum
CREATE TYPE "TicketActionKey" AS ENUM ('REFILL', 'CANCEL', 'SPEED_UP', 'RESTART', 'FAKE_COMPLETE', 'OTHER');

-- CreateEnum
CREATE TYPE "TicketOrderActionResult" AS ENUM ('SUCCESS', 'FAILED', 'NOT_ELIGIBLE', 'ESCALATED', 'PENDING');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "priority" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN "categoryId" TEXT,
ADD COLUMN "subcategoryId" TEXT,
ADD COLUMN "orderIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "TicketMessage" ALTER COLUMN "senderId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "TicketCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isAutomated" BOOLEAN NOT NULL DEFAULT false,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TicketCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketSubcategory" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "actionKey" "TicketActionKey" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TicketSubcategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketOrderAction" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "actionKey" "TicketActionKey" NOT NULL,
    "result" "TicketOrderActionResult" NOT NULL DEFAULT 'PENDING',
    "detail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketOrderAction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TicketSubcategory_categoryId_idx" ON "TicketSubcategory"("categoryId");

-- CreateIndex
CREATE INDEX "Ticket_categoryId_idx" ON "Ticket"("categoryId");

-- CreateIndex
CREATE INDEX "TicketOrderAction_ticketId_idx" ON "TicketOrderAction"("ticketId");

-- CreateIndex
CREATE INDEX "TicketOrderAction_orderId_idx" ON "TicketOrderAction"("orderId");

-- AddForeignKey
ALTER TABLE "TicketSubcategory" ADD CONSTRAINT "TicketSubcategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "TicketCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "TicketCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES "TicketSubcategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketOrderAction" ADD CONSTRAINT "TicketOrderAction_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketOrderAction" ADD CONSTRAINT "TicketOrderAction_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Seed the two built-in categories and the AI Support subcategories. The
-- cPanel host never runs db:seed, so this has to live in the migration.
-- Fixed ids + ON CONFLICT DO NOTHING keep it safe to re-run and stable to
-- reference from tests/seed.
INSERT INTO "TicketCategory" ("id", "name", "isAutomated", "enabled", "sortOrder") VALUES
  ('tcat_ai_support', 'AI Support', true, true, 0),
  ('tcat_human_support', 'Human Support', false, true, 1)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "TicketSubcategory" ("id", "categoryId", "name", "actionKey", "enabled", "sortOrder") VALUES
  ('tsub_refill', 'tcat_ai_support', 'Refill', 'REFILL', true, 0),
  ('tsub_cancel', 'tcat_ai_support', 'Cancel', 'CANCEL', true, 1),
  ('tsub_speed_up', 'tcat_ai_support', 'Speed up', 'SPEED_UP', true, 2),
  ('tsub_restart', 'tcat_ai_support', 'Restart', 'RESTART', true, 3),
  ('tsub_fake_complete', 'tcat_ai_support', 'Fake complete', 'FAKE_COMPLETE', true, 4),
  ('tsub_other', 'tcat_ai_support', 'Other', 'OTHER', true, 5)
ON CONFLICT ("id") DO NOTHING;
