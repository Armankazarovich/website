/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const registryPath = path.join(root, "lib", "public-edit-targets.ts");
const productPagePath = path.join(root, "app", "(store)", "product", "[slug]", "page.tsx");
const productCardPath = path.join(root, "components", "store", "product-card.tsx");

function fail(message) {
  console.error(`[Public Edit Targets] ${message}`);
  process.exit(1);
}

function read(file) {
  if (!fs.existsSync(file)) fail(`Missing file: ${path.relative(root, file)}`);
  return fs.readFileSync(file, "utf8");
}

const registry = read(registryPath);

const requiredTargets = [
  "home.hero",
  "home.promotions",
  "catalog.filters",
  "catalog.product-card",
  "product.detail",
  "product.related",
  "product.reviews",
  "product.calculator",
  "cart.summary",
  "checkout.flow",
  "content.news",
  "content.services",
  "business.contacts",
  "business.delivery",
  "marketing.promotions",
];

for (const target of requiredTargets) {
  if (!registry.includes(`"${target}"`)) {
    fail(`Missing target "${target}" in lib/public-edit-targets.ts`);
  }
}

const requiredAdminRoutes = [
  "/admin/site",
  "/admin/products",
  "/admin/appearance",
  "/admin/reviews",
  "/admin/posts",
  "/admin/services",
  "/admin/delivery",
  "/admin/promotions",
];

for (const route of requiredAdminRoutes) {
  if (!registry.includes(route)) {
    fail(`Missing admin route "${route}" in public edit registry`);
  }
}

const productPage = read(productPagePath);
if (!productPage.includes("getProductEditTarget") || !productPage.includes("getPublicEditTarget")) {
  fail("Product page must use the public edit target registry");
}

const productCard = read(productCardPath);
if (!productCard.includes("getProductEditTarget")) {
  fail("Product cards must use the public edit target registry");
}

console.log(`[Public Edit Targets] passed: ${requiredTargets.length} targets`);

