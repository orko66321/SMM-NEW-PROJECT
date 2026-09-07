-- Logo & Icon settings, admin-editable from the Site Settings page and
-- consumed by the frontend (components/Logo.tsx, components/BrandAssets.tsx).
-- Every image column holds a base64 data URI stored directly in the row
-- (same no-writable-disk convention as Banner.image) rather than a file path.
-- siteColor is a #rrggbb hex string. Every column is nullable so existing
-- rows are untouched and the frontend keeps its built-in defaults until an
-- admin fills them in.
-- (No semicolons anywhere in these comments so splitStatements stays happy.)

ALTER TABLE "SiteSettings" ADD COLUMN "mainLogo" TEXT;

ALTER TABLE "SiteSettings" ADD COLUMN "walletLogo" TEXT;

ALTER TABLE "SiteSettings" ADD COLUMN "autoPayLogo" TEXT;

ALTER TABLE "SiteSettings" ADD COLUMN "icon512" TEXT;

ALTER TABLE "SiteSettings" ADD COLUMN "icon192" TEXT;

ALTER TABLE "SiteSettings" ADD COLUMN "icon512Alt" TEXT;

ALTER TABLE "SiteSettings" ADD COLUMN "siteColor" TEXT;
