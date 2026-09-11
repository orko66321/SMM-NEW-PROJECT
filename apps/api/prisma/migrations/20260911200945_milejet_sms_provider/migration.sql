-- Adds a second SMS gateway (MiLeJet) alongside uronto SMS -- lib/sms.ts
-- dispatches on smsProvider, same multi-provider shape as lib/mailer.ts.
-- Defaults to URONTO so an existing admin's saved uronto config keeps
-- working with no action needed.

CREATE TYPE "SmsProvider" AS ENUM ('URONTO', 'MILEJET');

ALTER TABLE "SiteSettings" ADD COLUMN     "smsProvider" "SmsProvider" NOT NULL DEFAULT 'URONTO',
ADD COLUMN     "smsMilejetApiKeyCiphertext" TEXT,
ADD COLUMN     "smsMilejetSecretKeyCiphertext" TEXT,
ADD COLUMN     "smsMilejetSenderId" TEXT,
ADD COLUMN     "smsMilejetApiUrl" TEXT;
