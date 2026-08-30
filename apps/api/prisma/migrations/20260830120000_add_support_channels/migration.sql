-- CreateEnum
CREATE TYPE "SupportChannelType" AS ENUM ('WHATSAPP', 'TELEGRAM', 'MESSENGER', 'CUSTOM', 'TICKET');

-- CreateTable
CREATE TABLE "SupportChannel" (
    "type" "SupportChannelType" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "value" TEXT,
    "label" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportChannel_pkey" PRIMARY KEY ("type")
);

-- Seed the known channel types so the admin panel shows the full list, and
-- carry the existing single floating-WhatsApp-button config over into the
-- new system (SiteSettings.whatsappEnabled / whatsappNumber are no longer
-- read after this migration, but the columns are left in place).
INSERT INTO "SupportChannel" ("type", "enabled", "value", "label", "sortOrder", "updatedAt")
VALUES
    ('WHATSAPP',  false, NULL, NULL, 0, now()),
    ('TELEGRAM',  false, NULL, NULL, 1, now()),
    ('MESSENGER', false, NULL, NULL, 2, now()),
    ('CUSTOM',    false, NULL, NULL, 3, now()),
    ('TICKET',    false, NULL, NULL, 4, now())
ON CONFLICT ("type") DO NOTHING;

UPDATE "SupportChannel" sc
SET "enabled" = s."whatsappEnabled",
    "value"   = s."whatsappNumber",
    "updatedAt" = now()
FROM "SiteSettings" s
WHERE sc."type" = 'WHATSAPP'
  AND s."id" = 'default'
  AND s."whatsappNumber" IS NOT NULL;
