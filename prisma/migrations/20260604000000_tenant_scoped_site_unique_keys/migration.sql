-- Make cloned ARAY sites independent from each other.
-- Slugs and settings keys may repeat across sites, but not inside one site.

DROP INDEX IF EXISTS "Category_slug_key";
DROP INDEX IF EXISTS "Product_slug_key";
DROP INDEX IF EXISTS "SiteSettings_key_key";

ALTER TABLE "SiteSettings" ALTER COLUMN "id" DROP DEFAULT;

CREATE UNIQUE INDEX IF NOT EXISTS "Category_tenantId_slug_key" ON "Category"("tenantId", "slug");
CREATE UNIQUE INDEX IF NOT EXISTS "Product_tenantId_slug_key" ON "Product"("tenantId", "slug");
CREATE UNIQUE INDEX IF NOT EXISTS "SiteSettings_tenantId_key_key" ON "SiteSettings"("tenantId", "key");
