-- Announcement / popup modal, admin-editable from the Site Settings page and
-- shown once per browser session by the frontend (components/AnnouncementModal.tsx).
-- modalEnabled defaults to false and every other column is nullable, so
-- existing rows are untouched and nothing renders until an admin turns it on.
-- (No semicolons anywhere in these comments so splitStatements stays happy.)

ALTER TABLE "SiteSettings" ADD COLUMN "modalEnabled" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "SiteSettings" ADD COLUMN "modalBannerImage" TEXT;

ALTER TABLE "SiteSettings" ADD COLUMN "modalText" TEXT;

ALTER TABLE "SiteSettings" ADD COLUMN "modalButtonText" TEXT;

ALTER TABLE "SiteSettings" ADD COLUMN "modalButtonLink" TEXT;
