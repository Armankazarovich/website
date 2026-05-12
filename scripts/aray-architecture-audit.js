/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), "utf8");
}

function exists(relPath) {
  return fs.existsSync(path.join(root, relPath));
}

const checks = [];

function check(label, ok, details = "") {
  checks.push({ label, ok: Boolean(ok), details });
}

function includesAll(source, values) {
  return values.every((value) => source.includes(value));
}

const productBrainPath = "docs/ARAY_PRODUCT_BRAIN_INDEX_2026-05-07.md";
const startPath = "docs/ARAY_ADMIN_START_HERE.md";
const liveChecklistPath = "docs/aray-admin-live-checklist-2026-05-02.md";
const providerMatrixPath = "lib/aray-provider-matrix.ts";
const pwaContextPath = "lib/pwa-install-context.ts";
const dockPath = "components/store/aray-dock.tsx";
const adminPwaPath = "components/admin/admin-pwa-install.tsx";
const deferredToolsPath = "components/admin/admin-deferred-client-tools.tsx";
const envExamplePath = ".env.example";
const packagePath = "package.json";
const qualityGatePath = "scripts/aray-quality-gate.js";

check("Product Brain file exists", exists(productBrainPath), productBrainPath);
check("Start doc points to Product Brain", exists(startPath) && read(startPath).includes(productBrainPath), startPath);
check(
  "Product Brain records ARAY Knowledge OS, media pipeline and PWA install law",
  exists(productBrainPath) &&
    includesAll(read(productBrainPath), [
      "ARAY Knowledge OS",
      "Документы и медиа ARAY",
      "Установка приложений в один клик",
      "Биржа-витрина",
    ]),
  productBrainPath,
);
check(
  "Live checklist has current architecture block",
  exists(liveChecklistPath) && read(liveChecklistPath).includes("ARAY Knowledge OS / One-Click Automation"),
  liveChecklistPath,
);

if (exists(providerMatrixPath)) {
  const providerMatrix = read(providerMatrixPath);
  check(
    "Provider matrix covers knowledge, documents and federated search",
    includesAll(providerMatrix, [
      "aray-knowledge-os",
      "document-media-intelligence",
      "federated-internet-search",
    ]),
    providerMatrixPath,
  );
  check(
    "Provider matrix includes safe internet memory rule",
    providerMatrix.includes("Интернет-ответы не становятся памятью автоматически"),
    providerMatrixPath,
  );
} else {
  check("Provider matrix exists", false, providerMatrixPath);
}

if (exists(pwaContextPath)) {
  const pwaContext = read(pwaContextPath);
  check(
    "PWA contexts cover main role apps",
    includesAll(pwaContext, [
      '"aray-workspace"',
      '"aray-market"',
      '"aray-terminal"',
      '"aray-orders"',
      '"aray-crm"',
      '"aray-catalog"',
      '"pilorus-site"',
    ]),
    pwaContextPath,
  );
  check("PWA context resolver handles market mode", pwaContext.includes('params.get("mode") === "market"'), pwaContextPath);
} else {
  check("PWA install context exists", false, pwaContextPath);
}

if (exists(adminPwaPath)) {
  const adminPwa = read(adminPwaPath);
  check(
    "Admin PWA banner detects device and uses page context",
    includesAll(adminPwa, ["detectPwaPlatform", "resolvePwaInstallContext", "getManualInstallHint", "writePreferredPwaStart", "localStorage"]),
    adminPwaPath,
  );
} else {
  check("Admin PWA banner exists", false, adminPwaPath);
}

if (exists(deferredToolsPath)) {
  const deferredTools = read(deferredToolsPath);
  check(
    "Admin PWA banner is mounted globally",
    deferredTools.includes("<AdminPwaInstallBridge />") && deferredTools.includes("<AdminPwaInstall />"),
    deferredToolsPath,
  );
} else {
  check("Admin deferred client tools exists", false, deferredToolsPath);
}

if (exists(dockPath)) {
  const dock = read(dockPath);
  check("Sticky ARAY dock is clean of install panel", !dock.includes('DockPanel') && !dock.includes('toggleDockPanel'), dockPath);
  check("Sticky ARAY dock keeps chat/voice only", includesAll(dock, ["requestArayPrompt", "requestArayOpen", "startRecording"]), dockPath);
} else {
  check("ARAY dock exists", false, dockPath);
}

if (exists(envExamplePath)) {
  const envExample = read(envExamplePath);
  check(
    "Env example has ARAY knowledge/search/media placeholders",
    includesAll(envExample, [
      "ARAY_KNOWLEDGE_SYNC_ENABLED",
      "ARAY_DOCUMENT_EXTRACTOR_ENABLED",
      "GOOGLE_CUSTOM_SEARCH_API_KEY",
      "YANDEX_SEARCH_API_TOKEN",
    ]),
    envExamplePath,
  );
} else {
  check("Env example exists", false, envExamplePath);
}

if (exists(packagePath)) {
  const packageJson = read(packagePath);
  check("Package has architecture check script", packageJson.includes('"architecture:check"'), packagePath);
  check("Package has quality gate script", packageJson.includes('"quality"'), packagePath);
} else {
  check("Package exists", false, packagePath);
}

if (exists(qualityGatePath)) {
  const qualityGate = read(qualityGatePath);
  check("Quality gate runs architecture guard", qualityGate.includes("aray-architecture-audit.js"), qualityGatePath);
} else {
  check("Quality gate exists", false, qualityGatePath);
}

const failed = checks.filter((item) => !item.ok);
console.log("\n[ARAY Architecture] Product brain / automation audit");
for (const item of checks) {
  console.log(`${item.ok ? "OK" : "FAIL"} ${item.label}${item.details ? ` — ${item.details}` : ""}`);
}

if (failed.length) {
  console.error(`\n[ARAY Architecture] ${failed.length} blocker(s). Fix before launch.`);
  process.exit(1);
}

console.log(`\n[ARAY Architecture] Passed ${checks.length} checks`);
