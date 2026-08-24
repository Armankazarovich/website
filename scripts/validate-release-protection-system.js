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
const productionWorkflow = exists(".github/workflows/deploy.yml") ? read(".github/workflows/deploy.yml") : "";
const deployScopeModule = exists("scripts/detect-deploy-database-changes.js")
  ? require(filePath("scripts/detect-deploy-database-changes.js"))
  : null;

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
  "Code-only releases cannot mutate production database",
  Boolean(deployScopeModule?.hasDatabaseChanges) &&
    deployScopeModule.hasDatabaseChanges([
      "components/store/stories-widget.tsx",
      "scripts/validate-stories-preview-recovery.js",
    ]) === false &&
    deployScopeModule.hasDatabaseChanges(["prisma/schema.prisma"]) === true &&
    deployScopeModule.hasDatabaseChanges(["prisma/data-migrate.ts"]) === true &&
    deployScopeModule.hasDatabaseChanges(["prisma/migrations/20260824_safe/migration.sql"]) === true &&
    productionWorkflow.includes("db_changed") &&
    productionWorkflow.includes("Code-only release: database schema and data migrations are skipped"),
  "Stories-only deploys must skip every Prisma schema/data command; actual Prisma changes must still take the protected database path.",
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
  "Browser cart flow guard is wired before deploy",
  Boolean(packageJson.scripts?.["browser:cart:check"]) &&
    Boolean(packageJson.scripts?.["browser:cart:check:prod"]) &&
    deployPreflight.includes("browser:cart:check") &&
    includesAll("scripts/validate-browser-cart-flow.js", [
      "data-add-to-cart",
      "pilo-rus-cart",
      "data-cart-item",
      "data-cart-empty-state",
      "data-aray-dock",
      "hides bulky duplicate contact form",
      "Chrome DevTools",
    ]),
  "Deploy must include a real browser add-to-cart, cart-page, and clean product-page scenario with global ARAY available.",
);

check(
  "Browser mobile store guard is wired before deploy",
  Boolean(packageJson.scripts?.["browser:mobile:check"]) &&
    Boolean(packageJson.scripts?.["browser:mobile:check:prod"]) &&
    exists("scripts/validate-browser-store-mobile-flow.js") &&
    deployPreflight.includes("browser:mobile:check") &&
    includesAll("scripts/validate-browser-store-mobile-flow.js", [
      "Input.dispatchTouchEvent",
      "data-cart-qty-plus",
      "data-cart-qty-minus",
      "data-store-compare-action",
      "data-store-wishlist-action",
      "data-store-selection-dock",
    ]),
  "Deploy must include a real mobile touch check for cart quantity, compare, and wishlist.",
);

check(
  "Browser stories responsive guard is wired before deploy",
  Boolean(packageJson.scripts?.["browser:stories:check"]) &&
    Boolean(packageJson.scripts?.["browser:stories:check:prod"]) &&
    exists("scripts/validate-browser-stories-responsive.js") &&
    deployPreflight.includes("browser:stories:check") &&
    includesAll("scripts/validate-browser-stories-responsive.js", [
      "data-store-stories-card",
      "data-store-stories-side-tab",
      "data-store-stories-compact-trigger",
      "390",
      "900",
      "1366",
    ]),
  "Deploy must include a responsive browser check for the public stories widget.",
);

check(
  "Stories preview recovery guard is wired before deploy",
  Boolean(packageJson.scripts?.["browser:stories:recovery:check"]) &&
    deployPreflight.includes("browser:stories:recovery:check") &&
    exists("scripts/validate-stories-preview-recovery.js"),
  "The exact light-to-heavy video race and preview-error recovery scenario must run in every deployment preflight.",
);

check(
  "PWA icon guard is in quality",
  Boolean(packageJson.scripts?.["pwa:icons"]) &&
    Boolean(packageJson.scripts?.["pwa:check"]) &&
    exists("scripts/generate-pilorus-pwa-icons.js") &&
    exists("scripts/validate-pwa-icons.js") &&
    qualityGate.includes("validate-pwa-icons.js"),
  "PWA icons must be generated, validated, and protected by the main quality gate.",
);

check(
  "AR Phone external channel hub is protected",
  includesAll("components/store/aray-widget.tsx", [
    "data-aray-phone-integrations",
    "data-aray-phone-channel",
    "https://web.telegram.org/a/",
    "https://web.whatsapp.com/",
    "https://zangi.com/",
    "https://web.max.ru/",
    "https://vk.com/im",
    "integrationHighlights",
    "/admin/email",
    "/admin/notifications",
  ]),
  "AR Phone must keep the external channel launcher in release checks.",
);

check(
  "Admin messenger stays in embedded ARAY workspace",
  includesAll("app/admin/messenger/page.tsx", ["AdminMessengerHubClient"]) &&
    includesAll("app/admin/messenger/messenger-hub-client.tsx", [
      "ArayEmbeddedMessenger",
      "__aray_dial__",
      "initialLeadId",
      "aray:prompt",
    ]),
  "/admin/messenger must keep using the embedded ARAY Messenger workspace.",
);

check(
  "External messenger login fallback is protected",
  includesAll("lib/aray-navigation.ts", ["telegram.org", "whatsapp.com", "zangi.com", "max.ru", "vk.com"]) &&
    includesAll("lib/aray-navigation.ts", ["openArayExternalPopup", "popup=yes", "width=", "height="]) &&
    includesAll("components/store/aray-browser.tsx", ["openArayExternalPopup", "открывается в отдельном окне браузера"]),
  "Telegram, WhatsApp, Zangi, MAX, and VK should open as browser popup windows instead of broken iframe login pages.",
);

check(
  "Text encoding guard is in quality",
  Boolean(packageJson.scripts?.["text:check"]) &&
    qualityGate.includes("validate-text-encoding-guard.js") &&
    includesAll("scripts/validate-text-encoding-guard.js", [
      "Unicode replacement character",
      "Mojibake token",
      "Question mark before use client directive",
      "reportPath",
    ]),
  "Visible app surfaces must fail quality when Russian text is corrupted.",
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
