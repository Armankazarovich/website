/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const failures = [];

function read(rel) {
  const file = path.join(root, rel);
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

function fail(message) {
  failures.push(message);
}

function assertStaticOpenGraph() {
  const dynamicOg = path.join(root, "app", "opengraph-image.tsx");
  if (!fs.existsSync(dynamicOg)) return;

  const source = fs.readFileSync(dynamicOg, "utf8");
  if (/next\/og|ImageResponse/.test(source)) {
    fail("app/opengraph-image.tsx: use a static app/opengraph-image.png instead of next/og; dynamic OG image crashes in dev from Cyrillic workspace paths and slows local startup");
  }
}

function assertLastActiveThrottle() {
  const source = read("app/admin/layout.tsx");
  if (!source) return;

  const writesLastActive = /lastActiveAt\s*:\s*new Date\(\)/.test(source);
  if (writesLastActive && !/LAST_ACTIVE_UPDATE_INTERVAL_MS/.test(source)) {
    fail("app/admin/layout.tsx: lastActiveAt writes must be throttled; updating it on every admin render adds avoidable database load");
  }
}

function assertProductApiSerializesDecimals() {
  const source = read("app/api/admin/products/route.ts");
  if (!source) return;

  if (!/serializeProduct/.test(source)) {
    fail("app/api/admin/products/route.ts: serialize Prisma Decimal fields before returning products to the client");
    return;
  }

  if (/NextResponse\.json\(\s*products\s*\)/.test(source)) {
    fail("app/api/admin/products/route.ts: GET returns raw products; return products.map(serializeProduct)");
  }

  if (/NextResponse\.json\(\s*product\s*,\s*\{\s*status:\s*201\s*\}\s*\)/.test(source)) {
    fail("app/api/admin/products/route.ts: POST returns a raw product; return serializeProduct(product)");
  }
}

assertStaticOpenGraph();
assertLastActiveThrottle();
assertProductApiSerializesDecimals();

if (failures.length > 0) {
  console.error("\n[ARAY Admin Performance] failed:");
  for (const message of failures) console.error(` - ${message}`);
  process.exit(1);
}

console.log("[ARAY Admin Performance] passed");
