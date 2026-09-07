-- SEO / social meta tags, admin-editable from the Site Settings page and
-- rendered into every page head by the frontend (components/SeoHead.tsx).
-- Every column is nullable so existing rows are untouched and the frontend
-- falls back to its built-in defaults until an admin fills them in.
-- (No semicolons anywhere in these comments so splitStatements stays happy.)

ALTER TABLE "SiteSettings" ADD COLUMN "metaTitle" TEXT;

ALTER TABLE "SiteSettings" ADD COLUMN "metaDescription" TEXT;

ALTER TABLE "SiteSettings" ADD COLUMN "metaKeywords" TEXT;

ALTER TABLE "SiteSettings" ADD COLUMN "ogImageUrl" TEXT;
