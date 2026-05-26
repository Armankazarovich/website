/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

function filePath(relPath) {
  return path.join(root, relPath);
}

function exists(relPath) {
  return fs.existsSync(filePath(relPath));
}

function read(relPath) {
  return fs.readFileSync(filePath(relPath), "utf8");
}

function fail(message) {
  console.error(`[Store Constructor] ${message}`);
  process.exitCode = 1;
}

function includesAll(relPath, tokens) {
  if (!exists(relPath)) {
    fail(`${relPath} is missing`);
    return false;
  }

  const source = read(relPath);
  const missing = tokens.filter((token) => !source.includes(token));
  if (missing.length > 0) {
    fail(`${relPath} missing: ${missing.join(", ")}`);
    return false;
  }

  return true;
}

function packageScript(name) {
  if (!exists("package.json")) return false;
  const packageJson = JSON.parse(read("package.json"));
  return Boolean(packageJson.scripts?.[name]);
}

function assertFile(relPath) {
  if (!exists(relPath)) fail(`${relPath} is missing`);
}

console.log("\n[ARAY] Store constructor blueprint validation");

const requiredFiles = [
  "lib/store-constructor-blueprints.ts",
  "app/admin/site/constructor/page.tsx",
  "app/api/admin/site-constructor/blueprints/route.ts",
  "lib/aray-module-registry.ts",
  "lib/store-capability-registry.ts",
  "components/admin/admin-navigation-registry.ts",
  "components/admin/admin-navigation-model.ts",
  "app/admin/business/settings/page.tsx",
];

requiredFiles.forEach(assertFile);

includesAll("lib/store-constructor-blueprints.ts", [
  "STORE_CONSTRUCTOR_BLUEPRINT_VERSION",
  "2026-05-26.one-click-store",
  "STORE_CONSTRUCTOR_BUSINESS_TYPES",
  "lumber",
  "restaurant",
  "retail",
  "services",
  "beauty",
  "construction",
  "universal",
  "ONE_CLICK_STORE_REQUIRED_MODULES",
  "ONE_CLICK_STORE_REQUIRED_ROUTES",
  "ONE_CLICK_STORE_REQUIRED_CAPABILITIES",
  "ONE_CLICK_STORE_REQUIRED_DATA_OBJECTS",
  "ONE_CLICK_STORE_PUBLIC_SURFACES",
  "ONE_CLICK_STORE_QUALITY_GATES",
  "ONE_CLICK_STORE_LAUNCH_STEPS",
  "constructor.store-builder",
  "business.aray-messenger",
  "business.terminal",
  "core.app-identity",
  "getOneClickStoreLaunchContract",
  "getStoreConstructorReadinessMatrix",
]);

for (const route of [
  "/admin/site/constructor",
  "/api/admin/site-constructor/blueprints",
  "/api/pwa/manifest",
  "/api/pwa/site-icon",
  "/catalog",
  "/cart",
  "/checkout",
  "/compare",
  "/wishlist",
  "/stories",
]) {
  includesAll("lib/store-constructor-blueprints.ts", [route]);
}

const routeFiles = [
  "app/(store)/page.tsx",
  "app/(store)/catalog/page.tsx",
  "app/(store)/cart/page.tsx",
  "app/(store)/checkout/page.tsx",
  "app/(store)/compare/page.tsx",
  "app/(store)/wishlist/page.tsx",
  "app/(store)/stories/page.tsx",
  "app/admin/site/constructor/page.tsx",
  "app/admin/business/settings/page.tsx",
  "app/admin/products/page.tsx",
  "app/admin/orders/page.tsx",
  "app/admin/messenger/page.tsx",
  "app/admin/orders/new/page.tsx",
  "app/admin/terminals/page.tsx",
  "app/admin/aray/modules/page.tsx",
  "app/api/pwa/manifest/route.ts",
  "app/api/pwa/site-icon/route.ts",
  "app/api/admin/site-constructor/blueprints/route.ts",
];

routeFiles.forEach(assertFile);

includesAll("lib/aray-module-registry.ts", [
  'id: "constructor.store-builder"',
  'category: "constructor"',
  'status: "beta"',
  '"/admin/site/constructor"',
  '"/api/admin/site-constructor/blueprints"',
  '"core.app-identity"',
  '"business.orders"',
  '"business.aray-messenger"',
  '"business.terminal"',
  '"validate-store-constructor-blueprints"',
]);

includesAll("lib/store-capability-registry.ts", [
  'id: "one-click-store-constructor"',
  '"/admin/site/constructor"',
  '"store-constructor-blueprints"',
  'risk: "high"',
]);

includesAll("components/admin/admin-navigation-registry.ts", [
  'href: "/admin/site/constructor"',
  'moduleId: "constructor.store-builder"',
  '"/api/admin/site-constructor/blueprints"',
]);

includesAll("components/admin/admin-navigation-model.ts", [
  '"/admin/site/constructor"',
  "Конструктор магазина",
]);

includesAll("app/admin/business/settings/page.tsx", [
  'href: "/admin/site/constructor"',
  "Конструктор магазина",
]);

includesAll("app/admin/site/constructor/page.tsx", [
  "data-store-constructor-page",
  "data-one-click-store-contract",
  "data-store-constructor-blueprint-grid",
  "data-store-constructor-quality-gates",
  "getOneClickStoreLaunchContract",
]);

includesAll("app/api/admin/site-constructor/blueprints/route.ts", [
  'moduleId: "constructor.store-builder"',
  "getOneClickStoreLaunchContract",
  "getStoreConstructorReadinessMatrix",
]);

if (!packageScript("constructor:check")) fail("package.json must expose constructor:check");

includesAll("scripts/aray-quality-gate.js", ["validate-store-constructor-blueprints.js"]);
includesAll("scripts/validate-release-readiness.js", ["One-click store constructor contract"]);
includesAll("scripts/validate-system-architecture-levels.js", ["One-click store constructor guard"]);

if (process.exitCode) process.exit(process.exitCode);

console.log("[Store Constructor] passed: one-click store contract, route, module passport and guards are wired");
