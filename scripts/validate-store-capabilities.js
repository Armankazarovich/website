/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const file = path.join(root, "lib", "store-capability-registry.ts");

function fail(message) {
  console.error(`[Store Capabilities] ${message}`);
  process.exit(1);
}

if (!fs.existsSync(file)) fail("Missing lib/store-capability-registry.ts");

const source = fs.readFileSync(file, "utf8");

const required = [
  "product-comparison",
  "arc-loyalty",
  "wholesale-b2b",
  "collections-bundles",
  "online-payments",
  "invoices-documents",
  "delivery-pickup",
  "service-integrations",
  "one-click-store-constructor",
  "smart-business-map",
  "reviews-reputation",
];

for (const id of required) {
  if (!source.includes(`id: "${id}"`)) fail(`Missing store capability: ${id}`);
}

for (const route of [
  "/admin/products",
  "/admin/orders",
  "/admin/clients",
  "/admin/finance",
  "/admin/delivery",
  "/admin/aray/connectors",
  "/admin/site/constructor",
  "/admin/reviews",
]) {
  if (!source.includes(route)) fail(`Missing admin route in store capability registry: ${route}`);
}

for (const highRisk of ["arc-loyalty", "online-payments", "invoices-documents", "service-integrations", "one-click-store-constructor"]) {
  const pattern = new RegExp(`id:\\s*"${highRisk}"[\\s\\S]*?risk:\\s*"high"`);
  if (!pattern.test(source)) fail(`Capability ${highRisk} must stay high-risk until legal/security review`);
}

if (source.toLowerCase().includes("coin")) {
  fail("Store capability registry must use ARC balance language, not coin wording");
}

console.log(`[Store Capabilities] passed: ${required.length} capabilities`);
