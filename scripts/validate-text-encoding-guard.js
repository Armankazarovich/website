/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const reportDir = path.join(root, "tmp");
const reportPath = path.join(reportDir, "text-encoding-report.md");

const scanRoots = ["app", "components", "lib", "store"];
const textExtensions = new Set([".css", ".js", ".jsx", ".json", ".md", ".ts", ".tsx"]);
const skipDirs = new Set([".git", ".next", "node_modules", "tmp", "coverage", "backups", "out", "build"]);

const mojibakeTokens = [
  "\u0420\u0459", // Cyrillic K often shown as mojibake.
  "\u0420\u040f",
  "\u0420\u0405",
  "\u0420\u00b0",
  "\u0420\u00b5",
  "\u0420\u0451",
  "\u0420\u0491",
  "\u0420\u0455",
  "\u0420\u0458",
  "\u0421\u0403",
  "\u0421\u201a",
  "\u0421\u040a",
  "\u0421\u2018",
  "\u0412\u00b7",
  "\u0432\u0402",
  "\u00d0\u009f",
  "\u00d1\u0080",
];

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skipDirs.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, files);
      continue;
    }
    if (!entry.isFile()) continue;
    if (!textExtensions.has(path.extname(entry.name).toLowerCase())) continue;
    files.push(fullPath);
  }
  return files;
}

function lineNumber(text, index) {
  return text.slice(0, index).split(/\r?\n/).length;
}

function findTokenIssues(relPath, text) {
  const issues = [];

  if (text.startsWith('?"use client"') || text.startsWith("?'use client'")) {
    issues.push({
      file: relPath,
      line: 1,
      reason: "Question mark before use client directive",
    });
  }

  const replacementIndex = text.indexOf("\ufffd");
  if (replacementIndex !== -1) {
    issues.push({
      file: relPath,
      line: lineNumber(text, replacementIndex),
      reason: "Unicode replacement character",
    });
  }

  for (const token of mojibakeTokens) {
    const index = text.indexOf(token);
    if (index === -1) continue;
    issues.push({
      file: relPath,
      line: lineNumber(text, index),
      reason: `Mojibake token ${JSON.stringify(token)}`,
    });
  }

  return issues;
}

const files = scanRoots.flatMap((scanRoot) => walk(path.join(root, scanRoot)));
const issues = [];

for (const file of files) {
  const relPath = path.relative(root, file).replace(/\\/g, "/");
  const text = fs.readFileSync(file, "utf8");
  issues.push(...findTokenIssues(relPath, text));
}

fs.mkdirSync(reportDir, { recursive: true });
const report = [
  "# Text Encoding Guard Report",
  "",
  `Generated: ${new Date().toISOString()}`,
  "",
  ...issues.map((issue) => `- [FAIL] ${issue.file}:${issue.line} ${issue.reason}`),
  issues.length ? "" : "- [OK] No mojibake or replacement characters found in app surfaces.",
  "",
  issues.length ? `Result: FAILED (${issues.length})` : "Result: PASSED",
  "",
].join("\n");
fs.writeFileSync(reportPath, report, "utf8");

if (issues.length) {
  console.error("[ARAY] Text encoding guard failed:");
  for (const issue of issues) {
    console.error(` - ${issue.file}:${issue.line} ${issue.reason}`);
  }
  console.error(`[ARAY] Report: ${path.relative(root, reportPath)}`);
  process.exit(1);
}

console.log(`[ARAY] Text encoding guard passed (${files.length} files)`);
console.log(`[ARAY] Report: ${path.relative(root, reportPath)}`);
