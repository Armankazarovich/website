/* eslint-disable no-console */
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

const uiRoots = ["app/", "components/", "lib/"];
const checkedExtensions = new Set([".css", ".js", ".jsx", ".mjs", ".ts", ".tsx"]);
const skipPathParts = new Set([".next", "node_modules", "backups"]);
const skipFilePatterns = [/^dev-server.*\.log$/];
const allowComment = "design-system-allow";

const rules = [
  {
    name: "Use design tokens instead of gray utility colors",
    pattern: /\b(?:bg|text|border)-gray-\d{2,3}\b/,
  },
  {
    name: "Use tokens instead of hardcoded white/black utility colors",
    pattern: /\b(?:bg|text|border)-(?:white|black)\b/,
  },
  {
    name: "Use CSS variables instead of hex colors",
    pattern: /#[0-9a-fA-F]{3,8}\b/,
  },
  {
    name: "Use CSS variables instead of rgb()/rgba()",
    pattern: /\b(?:rgb|rgba)\s*\(/,
  },
  {
    name: "Use approved radius tokens: rounded-xl, rounded-2xl, rounded-full",
    pattern: /\brounded(?:-[trblxy])?-(?:sm|md|lg)\b/,
  },
  {
    name: "Avoid permanent small/medium/large shadows",
    pattern: /\bshadow-(?:sm|md|lg)\b/,
  },
  {
    name: "Avoid backdrop blur on persistent UI",
    pattern: /\bbackdrop-blur(?:-[a-z0-9]+)?\b/,
  },
  {
    name: "Avoid gradient backgrounds in UI",
    pattern: /\bbg-gradient-to-[a-z]+\b/,
  },
  {
    name: "Use soft selected states instead of filled primary toggles",
    pattern: /\?\s*["'`][^"'`]*(?:\bbg-primary\b[^"'`]*\btext-primary-foreground\b|\btext-primary-foreground\b[^"'`]*\bbg-primary\b)/,
  },
  {
    name: "Use admin-alert classes instead of harsh destructive alert fills",
    pattern: /(?=.*(?<![:\w-])bg-destructive\/(?:10|8)\b)(?=.*\btext-destructive\b)(?=.*\bpx-(?:3|4)\b)(?=.*\bpy-(?:2|3)\b)/,
  },
  {
    name: "Do not use deprecated ARAYGLASS glow/shimmer",
    pattern: /\barayglass-(?:glow|shimmer)\b/,
  },
];

function isUiFile(file) {
  const normalized = file.replace(/\\/g, "/");
  if (!uiRoots.some((prefix) => normalized.startsWith(prefix))) return false;
  if (!checkedExtensions.has(path.extname(normalized))) return false;
  if (normalized.split("/").some((part) => skipPathParts.has(part))) return false;
  if (skipFilePatterns.some((pattern) => pattern.test(path.basename(normalized)))) return false;
  return true;
}

function runGit(args) {
  try {
    return execFileSync("git", args, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch {
    return "";
  }
}

function collectDiffFindings(diffText, findings) {
  let currentFile = null;
  let newLine = 0;

  for (const line of diffText.split(/\r?\n/)) {
    const fileMatch = line.match(/^\+\+\+ b\/(.+)$/);
    if (fileMatch) {
      currentFile = fileMatch[1];
      continue;
    }

    const hunkMatch = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (hunkMatch) {
      newLine = Number(hunkMatch[1]);
      continue;
    }

    if (!currentFile || !isUiFile(currentFile)) continue;
    if (line.startsWith("+++") || line.startsWith("---")) continue;

    if (line.startsWith("+")) {
      const content = line.slice(1);
      scanLine(currentFile, newLine, content, findings);
      newLine += 1;
      continue;
    }

    if (!line.startsWith("-")) newLine += 1;
  }
}

function collectUntrackedFindings(findings) {
  const output = runGit(["ls-files", "--others", "--exclude-standard"]);
  for (const file of output.split(/\r?\n/).filter(Boolean)) {
    if (!isUiFile(file)) continue;
    const absolute = path.join(root, file);
    if (!fs.existsSync(absolute)) continue;
    const text = fs.readFileSync(absolute, "utf8");
    text.split(/\r?\n/).forEach((line, index) => {
      scanLine(file, index + 1, line, findings);
    });
  }
}

function scanLine(file, lineNumber, line, findings) {
  if (!line.trim() || line.includes(allowComment)) return;
  for (const rule of rules) {
    if (rule.pattern.test(line)) {
      findings.push({
        file,
        line: lineNumber,
        rule: rule.name,
        sample: line.trim().slice(0, 160),
      });
    }
  }
}

function main() {
  const findings = [];
  collectDiffFindings(runGit(["diff", "--unified=0", "--no-ext-diff", "--"]), findings);
  collectDiffFindings(runGit(["diff", "--cached", "--unified=0", "--no-ext-diff", "--"]), findings);
  collectUntrackedFindings(findings);

  if (findings.length > 0) {
    console.error("\n[ARAY] Design system guard failed:");
    for (const finding of findings) {
      console.error(` - ${finding.file}:${finding.line} ${finding.rule}`);
      console.error(`   ${finding.sample}`);
    }
    console.error("\n[ARAY] Use existing DESIGN_SYSTEM.md patterns, or document and approve a new pattern first.");
    process.exit(1);
  }

  console.log("[ARAY] Design system guard passed");
}

main();
