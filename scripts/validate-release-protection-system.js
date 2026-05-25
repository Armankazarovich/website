/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const reportDir = path.join(root, "tmp");
const reportPath = path.join(reportDir, "release-protection-system-report.md");

function filePath(relPath) {
  return path.join(root, relPath);
}

function exists(relPath) {
  return fs.existsSync(filePath(relPath));
}

function read(relPath) {
  return fs.readFileSync(filePath(relPath), "utf8");
}

function includesAll(relPath, tokens) {
  if (!exists(relPath)) return false;
  const text = read(relPath);
  return tokens.every((token) => text.includes(token));
}

const packageJson = JSON.parse(read("package.json"));
const qualityGate = read("scripts/aray-quality-gate.js");
const deployPreflight = exists("scripts/deploy-preflight.js") ? read("scripts/deploy-preflight.js") : "";

const checks = [];

function check(name, ok, detail) {
  checks.push({ name, ok: Boolean(ok), detail });
}

check(
  "Main quality command exists",
  Boolean(packageJson.scripts?.quality && packageJson.scripts?.["quality:full"]),
  "Project needs normal and full quality gates.",
);

check(
  "Protection command exists",
  Boolean(packageJson.scripts?.["protection:check"]),
  "The protection system must be directly runnable.",
);

check(
  "Deploy cannot bypass local preflight",
  Boolean(packageJson.scripts?.deploy?.includes("deploy-preflight.js")) &&
    packageJson.scripts.deploy.includes("../scripts/deploy.js") &&
    !packageJson.scripts.deploy.includes("--allow-dirty"),
  "npm run deploy must run local preflight before the GitHub push.",
);

check(
  "Deploy preflight blocks uncommitted release drift",
  includesAll("scripts/deploy-preflight.js", [
    "git",
    "status",
    "--porcelain",
    "quality:full",
    "Blocked: there are uncommitted changes",
  ]),
  "Preflight should refuse to deploy a different commit than the tested worktree.",
);

check(
  "Safe build releases all local Next runtimes",
  includesAll("scripts/next-build-safe.js", [
    "next\\\\dist\\\\bin\\\\next",
    "next\\\\dist\\\\server\\\\lib\\\\start-server\\.js",
    "scripts\\\\next-dev-stable\\.js",
    "Stop-Process",
  ]),
  "Windows builds must stop dev/start Next processes before Prisma generate.",
);

check(
  "Architecture levels guard is in quality",
  qualityGate.includes("validate-system-architecture-levels.js") &&
    Boolean(packageJson.scripts?.["architecture:levels"]),
  "Architecture-level checks protect PWA, cart, ARAY, stories, and deploy layers.",
);

check(
  "Cart checkout guard is in quality",
  qualityGate.includes("validate-cart-checkout-flow.js") &&
    Boolean(packageJson.scripts?.["cart:check"]) &&
    Boolean(packageJson.scripts?.["cart:check:live"]),
  "Cart and checkout contract must run locally and have a live mode.",
);

check(
  "Release readiness guard is in quality",
  qualityGate.includes("validate-release-readiness.js") &&
    Boolean(packageJson.scripts?.["release:check"]),
  "Known launch blockers must be checked before release.",
);

check(
  "Live smoke guard exists",
  exists("scripts/validate-release-smoke.js") &&
    Boolean(packageJson.scripts?.["release:smoke"]) &&
    includesAll("scripts/validate-release-smoke.js", [
      "/api/pwa/site-icon",
      "/api/calculator/products",
      "/api/cart/load",
      "/checkout",
    ]),
  "HTTP smoke should cover PWA, calculator, cart loader, and checkout.",
);

check(
  "Full quality builds production",
  qualityGate.includes("if (full)") &&
    qualityGate.includes("Production build") &&
    qualityGate.includes("build:ci"),
  "quality:full must include a production build, not only static checks.",
);

check(
  "TypeScript and secret scan stay in quality",
  qualityGate.includes("TypeScript check") &&
    qualityGate.includes("scanSecrets()") &&
    qualityGate.includes("Secret scan"),
  "The gate should catch type errors and accidental secrets.",
);

check(
  "Protected surfaces and user queue are required",
  exists("docs/ARAY_PROTECTED_SURFACES_2026-05-25.md") &&
    exists("docs/ARAY_RELEASE_FIX_QUEUE_2026-05-25.md") &&
    includesAll("docs/ARAY_PROTECTED_SURFACES_2026-05-25.md", [
      "Cart and checkout",
      "PWA identity and install",
      "Release/deploy gates",
    ]),
  "User pain and ready modules must be visible to future edits.",
);

check(
  "Protection reports are written",
  [
    "scripts/validate-release-protection-system.js",
    "scripts/validate-system-architecture-levels.js",
    "scripts/validate-cart-checkout-flow.js",
    "scripts/validate-release-readiness.js",
    "scripts/validate-release-smoke.js",
  ].every((relPath) => includesAll(relPath, ["reportDir", "reportPath", "writeFileSync"])),
  "Every major guard should leave a report that can be inspected after a run.",
);

check(
  "Quality gate protects the protection gate",
  qualityGate.includes("validate-release-protection-system.js"),
  "The main quality command must run this meta-guard so the guard chain cannot silently disappear.",
);

const failed = checks.filter((item) => !item.ok);
fs.mkdirSync(reportDir, { recursive: true });
const report = [
  "# Release Protection System Report",
  "",
  `Generated: ${new Date().toISOString()}`,
  "",
  ...checks.map((item) => `- ${item.ok ? "[OK]" : "[FAIL]"} ${item.name}: ${item.detail}`),
  "",
  failed.length ? `Result: FAILED (${failed.length})` : "Result: PASSED",
  "",
].join("\n");
fs.writeFileSync(reportPath, report, "utf8");

if (failed.length) {
  console.error("[ARAY] Release protection system failed:");
  for (const item of failed) console.error(` - ${item.name}: ${item.detail}`);
  console.error(`[ARAY] Report: ${path.relative(root, reportPath)}`);
  process.exit(1);
}

console.log(`[ARAY] Release protection system passed (${checks.length} gates)`);
console.log(`[ARAY] Report: ${path.relative(root, reportPath)}`);
