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
  "Supplier data foundation is preserved",
  includesAll(schema, ["model Supplier", "model SupplierOffer", "enum SupplierStatus", "@@unique([tenantId, supplierId, variantId])"]),
  "Supplier and offer data stay in the system as a future reserve.",
);

check(
  "Supplier admin APIs remain available by direct access",
  exists("app/admin/suppliers/page.tsx") &&
    exists("app/api/admin/suppliers/route.ts") &&
    exists("app/api/admin/suppliers/[id]/route.ts") &&
    exists("app/api/admin/supplier-offers/route.ts"),
  "Future supplier work needs the existing admin page and APIs to stay intact.",
);

const navRegistry = read("components/admin/admin-navigation-registry.ts");
check(
  "Supplier section is hidden from normal admin navigation",
  navRegistry.includes('href: "/admin/suppliers"') &&
    navRegistry.includes('label: "Поставщики"') &&
    navRegistry.includes('surfaces: ["direct"]'),
  "PiloRus client launch should not expose marketplace/supplier workflow in daily navigation.",
);

const productActions = read("app/admin/products/products-actions.tsx");
check(
  "Catalog quick actions do not push marketplace work",
  !productActions.includes("/admin/suppliers") && !productActions.includes("Handshake"),
  "Catalog Core should focus on products, prices, stock, media, SEO and import.",
);

const publicHeader = read("components/layout/header.tsx");
check(
  "Public navigation hides marketplace entry",
  !publicHeader.includes('href="/marketplace"') &&
    !publicHeader.includes('href: "/marketplace"') &&
    !publicHeader.includes("Биржа продавцов") &&
    !publicHeader.includes("Сотрудничество"),
  "PiloRus public header should look like one client shop, not a marketplace launch.",
);

for (const routePath of ["app/(store)/marketplace/page.tsx", "app/(store)/vendors/page.tsx", "app/(store)/vendors/[slug]/page.tsx"]) {
  const source = read(routePath);
  check(
    `${routePath} redirects to catalog`,
    includesAll(source, ['redirect("/catalog")', "index: false", 'canonical: "https://pilo-rus.ru/catalog"']),
    "Hidden marketplace routes should be noindex and send buyers to the catalog.",
  );
}

check(
  "Seller scan/feed tools stay parked for future work",
  exists("app/api/admin/suppliers/site-scan-preview/route.ts") &&
    exists("app/admin/suppliers/supplier-site-scan-preview-client.tsx") &&
    exists("scripts/preview-vendor-yml-feed.js") &&
    exists("app/api/admin/suppliers/feed-preview/route.ts") &&
    exists("app/admin/suppliers/supplier-feed-preview-client.tsx"),
  "The future marketplace reserve should not be deleted, only hidden from PiloRus launch.",
);

const marketplaceLaw = read("docs/PILORUS_MARKETPLACE_LAW_2026-06-12.md");
check(
  "Marketplace law records the PiloRus client-site pivot",
  includesAll(marketplaceLaw, ["PiloRus client launch mode", "marketplace hidden", "single client site first"]),
  "The project law must prevent us from drifting back into marketplace work before PiloRus is launched.",
);

const releaseReadiness = read("scripts/validate-release-readiness.js");
check(
  "Release readiness knows supplier foundation is hidden reserve",
  releaseReadiness.includes("hidden reserve after the client-site pivot"),
  "Release guard wording should match the current launch strategy.",
);

const failed = checks.filter((item) => !item.ok);
if (failed.length) {
  console.error("[ARAY] Multivendor reserve guard failed:");
  for (const item of failed) console.error(` - ${item.name}: ${item.detail}`);
  process.exit(1);
}

console.log(`[ARAY] Multivendor reserve guard passed (${checks.length} gates)`);
