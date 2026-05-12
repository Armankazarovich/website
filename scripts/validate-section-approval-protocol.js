/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), "utf8");
}

const failures = [];

function assert(condition, message) {
  if (!condition) failures.push(message);
}

const packageJson = JSON.parse(read("package.json"));
const qualityGate = read("scripts/aray-quality-gate.js");
const continuePrompt = read("docs/ARAY_CONTINUE_PROMPT.md");
const startHere = read("docs/ARAY_ADMIN_START_HERE.md");
const protocol = read("docs/SECTION_CHANGE_PROTOCOL.md");
const snapshotScriptExists = fs.existsSync(path.join(root, "scripts", "aray-section-snapshot.js"));
const logExists = fs.existsSync(path.join(root, "docs", "recovery", "SECTION_CHANGE_LOG.md"));

assert(snapshotScriptExists, "section snapshot script must exist");
assert(logExists, "section change log must exist");
assert(packageJson.scripts["section:snapshot"] === "node scripts/aray-section-snapshot.js", "package.json must expose section:snapshot");
assert(
  packageJson.scripts["section-approval:check"] === "node scripts/validate-section-approval-protocol.js",
  "package.json must expose section-approval:check",
);
assert(qualityGate.includes("validate-section-approval-protocol.js"), "quality gate must run section approval protocol guard");
assert(continuePrompt.includes("SECTION_CHANGE_PROTOCOL.md"), "continue prompt must point to section change protocol");
assert(startHere.includes("SECTION_CHANGE_PROTOCOL.md"), "admin start doc must point to section change protocol");
assert(protocol.includes("Before changing a section"), "protocol must define before-change snapshot rule");
assert(protocol.includes("After changing a section"), "protocol must define after-change approval rule");
assert(protocol.includes("APPROVED"), "protocol must define approval states");

if (failures.length > 0) {
  console.error("\n[ARAY Section Approval Protocol] failed:");
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log("[ARAY Section Approval Protocol] passed");
