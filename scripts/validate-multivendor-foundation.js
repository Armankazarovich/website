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
  "Supplier admin APIs exist",
  exists("app/api/admin/suppliers/route.ts") &&
    exists("app/api/admin/suppliers/[id]/route.ts") &&
    exists("app/api/admin/supplier-offers/route.ts"),
  "Admin API must expose suppliers and offer upserts.",
);

const suppliersPage = read("app/admin/suppliers/page.tsx");
check(
  "Supplier admin page supports create supplier and offer",
  includesAll(suppliersPage, ["createSupplierAction", "createOfferAction", "Поставщики и предложения", "tenantId_supplierId_variantId"]),
  "/admin/suppliers must be a usable first layer, not a placeholder.",
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

const failed = checks.filter((item) => !item.ok);
if (failed.length) {
  console.error("[ARAY] Multivendor foundation failed:");
  for (const item of failed) console.error(` - ${item.name}: ${item.detail}`);
  process.exit(1);
}

console.log(`[ARAY] Multivendor foundation passed (${checks.length} gates)`);
