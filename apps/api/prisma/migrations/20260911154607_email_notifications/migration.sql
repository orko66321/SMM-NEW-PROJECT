-- Email notifications — admin-editable from the Site Settings page, sent via
-- the existing lib/mailer.ts transport. Every event defaults to off and
-- every subject/template defaults to null (the service layer falls back to
-- a built-in default), so existing rows need no backfill and nothing sends
-- until an admin turns it on.

ALTER TABLE "SiteSettings" ADD COLUMN     "emailAddFundFailedEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "emailAddFundFailedSubject" TEXT,
ADD COLUMN     "emailAddFundFailedTemplate" TEXT,
ADD COLUMN     "emailAddFundSuccessEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "emailAddFundSuccessSubject" TEXT,
ADD COLUMN     "emailAddFundSuccessTemplate" TEXT,
ADD COLUMN     "emailOrderFailedEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "emailOrderFailedSubject" TEXT,
ADD COLUMN     "emailOrderFailedTemplate" TEXT,
ADD COLUMN     "emailOrderSuccessEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "emailOrderSuccessSubject" TEXT,
ADD COLUMN     "emailOrderSuccessTemplate" TEXT,
ADD COLUMN     "emailWelcomeEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "emailWelcomeSubject" TEXT,
ADD COLUMN     "emailWelcomeTemplate" TEXT;
