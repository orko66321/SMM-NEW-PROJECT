-- OrderIntent now backs the Store checkout wallet-fallback flow too, not
-- just New Order. A brand-new enum type (never ALTER TYPE ... ADD VALUE —
-- applyMigrations.ts runs the whole file in one transaction) plus the
-- polymorphic columns a PACKAGE intent needs.

CREATE TYPE "OrderIntentKind" AS ENUM ('SERVICE', 'PACKAGE');

ALTER TABLE "OrderIntent" ADD COLUMN "kind" "OrderIntentKind" NOT NULL DEFAULT 'SERVICE';

ALTER TABLE "OrderIntent" ADD COLUMN "packageId" TEXT;

-- serviceId is now nullable (a PACKAGE intent has no Service); its FK
-- switches to SET NULL to match the now-optional Prisma relation.
ALTER TABLE "OrderIntent" DROP CONSTRAINT "OrderIntent_serviceId_fkey";

ALTER TABLE "OrderIntent" ALTER COLUMN "serviceId" DROP NOT NULL;

ALTER TABLE "OrderIntent" ADD CONSTRAINT "OrderIntent_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "OrderIntent" ADD CONSTRAINT "OrderIntent_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "Package"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "OrderIntent_packageId_idx" ON "OrderIntent"("packageId");
