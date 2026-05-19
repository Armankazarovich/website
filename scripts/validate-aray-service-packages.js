/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const file = path.join(root, "lib", "aray-service-packages.ts");

function fail(message) {
  console.error(`[ARAY Service Packages] ${message}`);
  process.exit(1);
}

if (!fs.existsSync(file)) fail("Missing lib/aray-service-packages.ts");

const source = fs.readFileSync(file, "utf8");

if (!source.includes("ARC_RUB_RATE = 50")) {
  fail("ARC launch rate must stay explicit: 1 ARC = 50 RUB");
}

for (const code of ["start", "growth", "pro", "partner", "enterprise"]) {
  if (!source.includes(`code: "${code}"`)) {
    fail(`Missing service package: ${code}`);
  }
}

for (const forbidden of ["coin", "token", "investment", "guaranteed income"]) {
  if (source.toLowerCase().includes(forbidden)) {
    fail(`Avoid risky public ARC wording in service package registry: ${forbidden}`);
  }
}

const monthlyArcValues = [...source.matchAll(/monthlyArc:\s*(\d+)/g)].map((match) => Number(match[1]));
if (monthlyArcValues.length < 5) fail("Expected monthlyArc values for all service packages");

const paidValues = monthlyArcValues.filter((value) => value > 0);
for (let i = 1; i < paidValues.length; i += 1) {
  if (paidValues[i] <= paidValues[i - 1]) {
    fail("Paid service package ARC prices must grow by level");
  }
}

if (!source.includes("arcToRub") || !source.includes("getPackageForTenantPlan")) {
  fail("Service packages must expose ARC conversion and tenant-plan mapping helpers");
}

console.log(`[ARAY Service Packages] passed: ${monthlyArcValues.length} packages, 1 ARC = 50 RUB`);

