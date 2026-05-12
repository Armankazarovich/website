/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const failures = [];

const textExtensions = new Set([".ts", ".tsx", ".js", ".jsx"]);
const scanRoots = ["app/admin"];

const legacyKanbanViewportFiles = new Set([
  "app/admin/crm/crm-client.tsx",
  "app/admin/tasks/tasks-client.tsx",
]);

const legacyFixedDockFiles = new Set([
  "app/admin/inventory/inventory-client.tsx",
  "app/admin/media/media-client.tsx",
  "app/admin/orders/new/page.tsx",
]);

const legacyVisibleTechnicalTerms = new Set([
  "app/admin/aray-lab/aray-lab-client.tsx",
  "app/admin/business/settings/page.tsx",
  "app/admin/clients/clients-list.tsx",
  "app/admin/crm/automation/automation-client.tsx",
  "app/admin/crm/crm-client.tsx",
  "app/admin/delivery/rates/page.tsx",
  "app/admin/email/page.tsx",
  "app/admin/finance/page.tsx",
  "app/admin/health/page.tsx",
  "app/admin/help/page.tsx",
  "app/admin/import/import-client.tsx",
  "app/admin/inventory/inventory-client.tsx",
  "app/admin/orders/new/page.tsx",
  "app/admin/promotion/page.tsx",
  "app/admin/settings/page.tsx",
  "app/admin/site/page.tsx",
  "app/admin/staff/page.tsx",
  "app/admin/terminals/page.tsx",
  "app/admin/terminals/terminal-profile-settings.tsx",
]);

const visibleTechnicalTerms = [
  { term: "Beta", pattern: /\bBeta\b/ },
  { term: "roadmap", pattern: /\broadmap\b/i },
  { term: "API", pattern: /\bAPI\b/ },
  { term: "desktop", pattern: /\bdesktop\b/i },
  { term: "Email", pattern: /\bEmail\b/ },
];

function normalize(filePath) {
  return filePath.replace(/\\/g, "/");
}

function fail(message) {
  failures.push(message);
}

function walk(dirRel, files = []) {
  const dir = path.join(root, dirRel);
  if (!fs.existsSync(dir)) return files;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(path.relative(root, fullPath), files);
      continue;
    }
    if (!entry.isFile()) continue;
    if (!textExtensions.has(path.extname(entry.name).toLowerCase())) continue;
    files.push(fullPath);
  }

  return files;
}

function lineOf(source, index) {
  return source.slice(0, index).split(/\r?\n/).length;
}

function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

function getStringLikeRanges(source) {
  const ranges = [];
  const stringPattern = /(["'`])((?:\\.|(?!\1)[\s\S])*?)\1/g;
  let match;
  while ((match = stringPattern.exec(source))) {
    const before = source.slice(Math.max(0, match.index - 80), match.index);
    const value = match[2];

    if (/from\s*$/.test(before)) continue;
    if (/import\s*(?:type\s*)?[\s\S]*?\s*$/.test(before)) continue;
    if (/fetch\(\s*$/.test(before)) continue;
    if (/href=\s*$/.test(before)) continue;
    if (/src=\s*$/.test(before)) continue;
    if (/className=\s*$/.test(before)) continue;
    if (/style=\s*$/.test(before)) continue;
    if (/data-[\w-]+=\s*$/.test(before)) continue;
    if (/\/api\/|@\/|\.tsx?$|\.jsx?$/.test(value)) continue;

    ranges.push({ index: match.index, value });
  }

  const textPattern = />\s*([^<{}`]+?)\s*</g;
  while ((match = textPattern.exec(source))) {
    const value = match[1].trim();
    if (value) ranges.push({ index: match.index, value });
  }

  return ranges;
}

function hasMobileAlternative(source) {
  return (
    /\b(?:sm|md|lg):hidden\b/.test(source) ||
    /\bhidden\s+(?:sm|md|lg):(?:block|flex|grid)\b/.test(source) ||
    /\b(?:sm|md|lg):grid-cols-\d\b/.test(source) ||
    /\boverflow-x-auto\b/.test(source)
  );
}

function hasDockPaddingContract(source) {
  return (
    /--admin-[\w-]*(?:dock|bottom|safe-area)[\w-]*/.test(source) ||
    /\bpb-\[var\(--admin-[^\]]+\)\]/.test(source) ||
    /paddingBottom\s*:\s*["'`]?var\(--admin-/.test(source) ||
    /bottom:\s*["'`]calc\([^"'`]*env\(safe-area-inset-bottom/.test(source)
  );
}

function assertAdminPageRootFrame(file, rel, source) {
  if (!rel.endsWith("/page.tsx") && rel !== "app/admin/page.tsx") return;

  const hasFrame = /\badmin-page-frame\b|\badmin-dashboard-standard\b/.test(source);
  const rootDivWithCenteredWidth = /return\s*\(\s*<div[^>]*className=(?:"[^"]*\b(?:max-w-|mx-auto)\b[^"]*"|`[^`]*\b(?:max-w-|mx-auto)\b[^`]*`|\{`[^`]*\b(?:max-w-|mx-auto)\b[^`]*`\})/s;

  if (!hasFrame && rootDivWithCenteredWidth.test(source)) {
    fail(`${rel}: admin page root uses max-w/mx-auto directly; use admin-page-frame (or an existing admin-dashboard-standard frame)`);
  }
}

function assertKanbanResponsiveContract(rel, source) {
  if (legacyKanbanViewportFiles.has(rel)) return;
  if (!/\bkanban\b/i.test(source)) return;

  const hasFixedViewportPattern = /\b(?:min-w-\[(?:[4-9]\d{2,}|\d{4,})px\]|min-w-max|w-screen|w-\[(?:[4-9]\d{2,}|\d{4,})px\]|100vw)\b/.test(source);
  if (hasFixedViewportPattern && !hasMobileAlternative(source)) {
    fail(`${rel}: kanban has fixed viewport/min-width sizing without an obvious mobile alternative`);
  }
}

function assertVisibleTechnicalTerms(rel, source) {
  if (legacyVisibleTechnicalTerms.has(rel)) return;

  const visibleRanges = getStringLikeRanges(stripComments(source));
  for (const { term, pattern } of visibleTechnicalTerms) {
    const hit = visibleRanges.find(({ value }) => pattern.test(value));
    if (hit) {
      fail(`${rel}:${lineOf(source, hit.index)} visible top-level admin text contains "${term}"; prefer operator-facing wording when avoidable`);
    }
  }
}

function assertFixedBottomDockPadding(rel, source) {
  if (legacyFixedDockFiles.has(rel)) return;

  const hasBottomDock = /\bfixed\b[^"'`{}]*(?:\bbottom-(?:0|[1-9]\d*)\b|\binset-x-0\b)[^"'`{}]*(?:\bz-(?:4|5|6|7|8|9)\d\b|\bz-\[(?:4|5|6|7|8|9)\d\]\b)/s.test(source);
  const hasFormSurface = /<(?:form|input|textarea|select)\b/.test(source);

  if (hasBottomDock && hasFormSurface && !hasDockPaddingContract(source)) {
    fail(`${rel}: fixed bottom high-z dock near forms needs an admin padding/safe-area contract so it cannot cover inputs`);
  }
}

function assertUnifiedAdminPopupSystem(rel, source) {
  if (!rel.startsWith("app/admin/")) return;
  if (/\barayglass-popup(?:-|")/.test(source)) {
    fail(`${rel}: raw arayglass popup classes are deprecated; use components/admin/admin-modal.tsx so admin popups stay unified and mobile-safe`);
  }
}

for (const file of scanRoots.flatMap((dir) => walk(dir))) {
  const rel = normalize(path.relative(root, file));
  const source = fs.readFileSync(file, "utf8");

  assertAdminPageRootFrame(file, rel, source);
  assertKanbanResponsiveContract(rel, source);
  assertVisibleTechnicalTerms(rel, source);
  assertFixedBottomDockPadding(rel, source);
  assertUnifiedAdminPopupSystem(rel, source);
}

if (failures.length > 0) {
  console.error("\n[ARAY Admin Responsive] failed:");
  for (const message of failures) console.error(` - ${message}`);
  process.exit(1);
}

console.log("[ARAY Admin Responsive] passed");
