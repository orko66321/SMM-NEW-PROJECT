-- SMS notifications (uronto SMS) — admin-editable from the Site Settings
-- page. smsApiKeyCiphertext is encrypted at rest like smtpPassCiphertext;
-- every event defaults to off and every template defaults to null (the
-- service layer falls back to a built-in default string), so existing rows
-- need no backfill and nothing sends until an admin turns it on.

ALTER TABLE "SiteSettings" ADD COLUMN     "smsAddFundEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "smsAddFundTemplate" TEXT,
ADD COLUMN     "smsApiKeyCiphertext" TEXT,
ADD COLUMN     "smsEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "smsOrderConfirmationEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "smsOrderConfirmationTemplate" TEXT,
ADD COLUMN     "smsWelcomeEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "smsWelcomeTemplate" TEXT;
