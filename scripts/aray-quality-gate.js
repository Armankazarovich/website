/* eslint-disable no-console */
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const full = process.argv.includes("--full");

const skipDirs = new Set([
  ".git",
  ".next",
  "node_modules",
  "backups",
  "coverage",
  "out",
  "build",
]);

const skipFiles = new Set([
  ".env",
  ".env.local",
  ".env.development.local",
  ".env.test.local",
  ".env.production.local",
  "package-lock.json",
]);

const textExtensions = new Set([
  ".css",
  ".html",
  ".js",
  ".json",
  ".md",
  ".mjs",
  ".ts",
  ".tsx",
  ".txt",
  ".yml",
  ".yaml",
]);

const secretPatterns = [
  {
    name: "ElevenLabs API key",
    pattern: /sk_[A-Za-z0-9]{32,}/g,
  },
  {
    name: "Private key block",
    pattern: /-----BEGIN (RSA |EC |OPENSSH |)PRIVATE KEY-----/g,
  },
  {
    name: "Hardcoded SMTP password",
    pattern: /SMTP_PASSWORD\s*=\s*["'](?!(?:your-|example|change-me|YOUR_))[^"']{8,}["']/g,
  },
  {
    name: "Hardcoded auth secret",
    pattern: /NEXTAUTH_SECRET\s*=\s*["'](?!(?:your-|example|change-me|generate|GENERATE|YOUR_))[^"']{16,}["']/g,
  },
];

function run(label, command, args) {
  console.log(`\n[ARAY] ${label}`);
  const executable = process.platform === "win32" && ["npm", "npx"].includes(command)
    ? "cmd.exe"
    : command;
  const finalArgs = process.platform === "win32" && ["npm", "npx"].includes(command)
    ? ["/d", "/s", "/c", command, ...args]
    : args;
  const result = spawnSync(executable, finalArgs, {
    cwd: root,
    stdio: "inherit",
    shell: false,
  });
  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skipDirs.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, files);
      continue;
    }
    if (!entry.isFile()) continue;
    if (skipFiles.has(entry.name)) continue;
    if (!textExtensions.has(path.extname(entry.name).toLowerCase())) continue;
    files.push(fullPath);
  }
  return files;
}

function scanSecrets() {
  console.log("\n[ARAY] Secret scan");
  const findings = [];
  for (const file of walk(root)) {
    const rel = path.relative(root, file);
    const text = fs.readFileSync(file, "utf8");
    for (const { name, pattern } of secretPatterns) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(text))) {
        const line = text.slice(0, match.index).split(/\r?\n/).length;
        findings.push(`${rel}:${line} ${name}`);
      }
    }
  }

  if (findings.length > 0) {
    console.error("\n[ARAY] Secret scan failed:");
    for (const finding of findings) console.error(` - ${finding}`);
    process.exit(1);
  }
  console.log("[ARAY] Secret scan passed");
}

run("Diff whitespace check", "git", ["diff", "--check"]);
run("Design system guard", "node", ["scripts/validate-design-system.js"]);
run("Agent registry validation", "node", ["scripts/validate-aray-agent-registry.js"]);
run("Architecture automation guard", "node", ["scripts/aray-architecture-audit.js"]);
run("Section approval protocol guard", "node", ["scripts/validate-section-approval-protocol.js"]);
run("Public edit target registry guard", "node", ["scripts/validate-public-edit-targets.js"]);
run("ARAY service package guard", "node", ["scripts/validate-aray-service-packages.js"]);
run("Module registry validation", "node", ["scripts/validate-aray-modules.js"]);
run("Module navigation foundation check", "node", ["scripts/validate-aray-module-navigation-contract.js"]);
run("Dynamic role OS guard", "node", ["scripts/validate-dynamic-role-os.js"]);
run("Admin navigation model validation", "node", ["scripts/validate-admin-navigation-model.js"]);
run("Admin UI integrity guard", "node", ["scripts/validate-admin-ui-integrity.js"]);
run("Admin responsive guard", "node", ["scripts/validate-admin-responsive.js"]);
run("Admin performance guard", "node", ["scripts/validate-admin-performance.js"]);
run("TypeScript check", "npx", ["tsc", "--noEmit"]);
scanSecrets();

if (full) {
  run("Production build", "npm", ["run", "build:ci"]);
}

console.log("\n[ARAY] Quality gate passed");
