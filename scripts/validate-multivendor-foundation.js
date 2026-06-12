/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const checks = [];

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), "utf8");
}

function exists(relPath) {
  return fs.existsSync(path.join(root, relPath));
}

function includesAll(source, values) {
  return values.every((value) => source.includes(value));
}

function check(name, ok, detail) {
  checks.push({ name, ok: Boolean(ok), detail });
}

const schema = read("prisma/schema.prisma");
check(
  "Supplier models exist",
  includesAll(schema, ["model Supplier", "model SupplierOffer", "enum SupplierStatus", "enum SupplierTrustLevel"]),
  "Prisma must keep suppliers and supplier offers as first-class data.",
);
check(
  "Supplier offers attach to product variants",
  /supplierOffers\s+SupplierOffer\[\]/.test(schema) && /variant\s+ProductVariant\s+@relation/.test(schema),
  "Offers must sit on existing product variants so catalog SEO and cart remain stable.",
);
check(
  "Supplier offer uniqueness protects duplicate rows",
  schema.includes("@@unique([tenantId, supplierId, variantId])"),
  "One supplier should have one active price row per product variant.",
);
check(
  "Supplier storefront profile fields exist",
  includesAll(schema, [
    "sourceUrl   String?",
    "logoUrl     String?",
    "publicDescription String?",
    "specialization String?",
    "deliverySummary String?",
    "storefrontEnabled Boolean",
    "featuredSeller Boolean",
    "marketplaceRank Int",
  ]),
  "Vendor Core needs seller source URL, logo, storefront copy, publication flag and marketplace ordering.",
);

check(
  "Supplier admin APIs exist",
  exists("app/api/admin/suppliers/route.ts") &&
    exists("app/api/admin/suppliers/[id]/route.ts") &&
    exists("app/api/admin/supplier-offers/route.ts"),
  "Admin API must expose suppliers and offer upserts.",
);

const suppliersPage = read("app/admin/suppliers/page.tsx");
check(
  "Supplier admin page supports create supplier and offer",
  includesAll(suppliersPage, ["createSupplierAction", "createOfferAction", "Продавцы и предложения", "tenantId_supplierId_variantId", "Сайт для скана", "Включить публичную витрину"]),
  "/admin/suppliers must manage sellers, storefronts, scan sources and offers.",
);

check(
  "Public vendor storefront routes exist",
  exists("app/(store)/vendors/page.tsx") &&
    exists("app/(store)/vendors/[slug]/page.tsx") &&
    includesAll(read("app/(store)/vendors/page.tsx"), ["Продавцы ПилоРус", "supplierStorefrontHref"]) &&
    includesAll(read("app/(store)/vendors/[slug]/page.tsx"), [
      "getSupplier",
      "Товары и цены продавца",
      "Поиск по товарам продавца",
      "Категории продавца",
      "StoreMetric",
      "vendorHref",
    ]),
  "Public seller pages must exist before vendor PWA and scan layers are added.",
);

check(
  "Marketplace home exists",
  exists("app/(store)/marketplace/page.tsx") &&
    includesAll(read("app/(store)/marketplace/page.tsx"), [
      "ПилоРус Биржа пиломатериалов",
      "Без дублей товара",
      "Preview перед импортом",
      "Предложения продавцов",
      "supplierStorefrontHref",
    ]),
  "/marketplace must explain the buyer-facing exchange: sellers, offers, categories and no duplicate products.",
);

check(
  "Vendor feed preview exists without applying changes",
    exists("scripts/preview-vendor-yml-feed.js") &&
    exists("app/api/admin/suppliers/feed-preview/route.ts") &&
    exists("app/admin/suppliers/supplier-feed-preview-client.tsx") &&
    includesAll(read("app/api/admin/suppliers/feed-preview/route.ts"), ["FEED_PREVIEW_ROLES", "APPLY_VENDOR_FEED_PREVIEW", "matchCounts", "unmatchedCategories", "highRows", "highRowsLimit"]) &&
    includesAll(read("app/admin/suppliers/supplier-feed-preview-client.tsx"), [
      "Preview feed продавца",
      "Уверенные совпадения",
      "Категории без пары",
      "Применить выбранные",
      "highSearch",
      "visibleHighLimit",
      "Выбрать видимые",
      "Снять выбор",
    ]),
  "Seller feed scan must show preview first and require explicit confirmation before selected high-confidence rows become supplier offers.",
);

const dataMigrate = read("prisma/data-migrate.ts");
check(
  "PiloRus and candidate sellers are seeded",
  includesAll(dataMigrate, ["slug: \"pilorus\"", "slug: \"derevotrade\"", "slug: \"pilmos\"", "slug: \"derevo-lider\"", "slug: \"faneragroup\""]),
  "Deploy data migration must remember PiloRus seller N1 and the first candidate sellers.",
);
check(
  "Seller offers and review drafts are seeded safely",
  includesAll(dataMigrate, [
    "sellerPricePolicy20260612",
    "PiloRus marketplace offers synced",
    "marketing-draft",
    "approved: false",
  ]),
  "Current PiloRus products must become seller offers without duplicates, and marketing review drafts must stay unpublished.",
);

const marketplaceLaw = read("docs/PILORUS_MARKETPLACE_LAW_2026-06-12.md");
check(
  "Marketplace law protects one catalog item with many seller offers",
  includesAll(marketplaceLaw, ["Один товар в каталоге, много предложений продавцов", "preview/matching", "Vendor Self-Service Import"]),
  "Vendor imports must match existing catalog products before creating new product candidates.",
);

const navRegistry = read("components/admin/admin-navigation-registry.ts");
const navModel = read("components/admin/admin-navigation-model.ts");
const permissions = read("lib/permissions.ts");
check(
  "Suppliers are wired into admin navigation",
  includesAll(navRegistry, ["/admin/suppliers", "Поставщики"]) &&
    includesAll(navModel, ["/admin/suppliers", "мультивендор"]) &&
    includesAll(permissions, ["suppliers", "\"/admin/suppliers\""]),
  "Navigation, page metadata and role access must agree on the supplier section.",
);

const productActions = read("app/admin/products/products-actions.tsx");
check(
  "Catalog actions link to suppliers",
  includesAll(productActions, ["suppliers", "/admin/suppliers", "Handshake"]),
  "Managers should reach suppliers directly from the catalog core.",
);

const publicHeader = read("components/layout/header.tsx");
check(
  "Public navigation links to marketplace",
  includesAll(publicHeader, ["href: \"/marketplace\"", "Биржа", "Биржа продавцов"]),
  "Buyers should see the marketplace entry from desktop, tablet and mobile navigation.",
);

const failed = checks.filter((item) => !item.ok);
if (failed.length) {
  console.error("[ARAY] Multivendor foundation failed:");
  for (const item of failed) console.error(` - ${item.name}: ${item.detail}`);
  process.exit(1);
}

console.log(`[ARAY] Multivendor foundation passed (${checks.length} gates)`);
