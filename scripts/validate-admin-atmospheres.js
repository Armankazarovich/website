/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const atmosphereFile = path.join(root, "lib", "admin-atmospheres.ts");
const publicPrefix = "/images/admin-atmosphere/";
const maxImageBytes = 260 * 1024;
const requiredCount = 9;
const minSliderCount = 6;

function fail(message) {
  console.error(`[ARAY] Admin atmosphere validation failed: ${message}`);
  process.exit(1);
}

function unique(items) {
  return Array.from(new Set(items));
}

if (!fs.existsSync(atmosphereFile)) {
  fail("lib/admin-atmospheres.ts is missing");
}

const source = fs.readFileSync(atmosphereFile, "utf8");
const sources = unique(
  Array.from(source.matchAll(/src:\s*"([^"]+)"/g)).map((match) => match[1]),
);

if (sources.length !== requiredCount) {
  fail(`expected ${requiredCount} atmosphere images, found ${sources.length}`);
}

for (const src of sources) {
  if (!src.startsWith(publicPrefix)) {
    fail(`${src} must live under ${publicPrefix}`);
  }
  if (!src.endsWith(".webp")) {
    fail(`${src} must be a compressed .webp asset`);
  }
  const file = path.join(root, "public", ...src.slice(1).split("/"));
  if (!fs.existsSync(file)) {
    fail(`${src} does not exist in public`);
  }
  const size = fs.statSync(file).size;
  if (size > maxImageBytes) {
    fail(`${src} is ${Math.round(size / 1024)} KB; keep admin backgrounds under 260 KB`);
  }
}

const sliderBlock = source.match(/ADMIN_ATMOSPHERE_PHOTOS[\s\S]*?;/)?.[0] || "";
if (!sliderBlock.includes("night-focus")) {
  console.log("[ARAY] Admin atmosphere slider uses the full clean photo set");
} else {
  console.log("[ARAY] Admin atmosphere slider excludes night-focus for cleaner light mode");
}

if (sources.length < minSliderCount) {
  fail(`slider needs at least ${minSliderCount} clean atmosphere options`);
}

console.log(`[ARAY] Admin atmosphere assets passed: ${sources.length} webp files`);
