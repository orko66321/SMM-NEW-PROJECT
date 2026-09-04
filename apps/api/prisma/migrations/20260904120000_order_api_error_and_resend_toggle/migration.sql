-- Admin-only raw provider error text for a failed order submission, plus a
-- kill-switch for the admin Orders resend button. Plain ADD COLUMNs, both
-- nullable / defaulted so existing rows are untouched.
-- (No punctuation in these comments that splitStatements could trip on.)

ALTER TABLE "Order" ADD COLUMN "apiErrorResponse" TEXT;

ALTER TABLE "SiteSettings" ADD COLUMN "resendOrderButtonEnabled" BOOLEAN NOT NULL DEFAULT true;
