const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const SEARCH_ROOTS = ["app", "components"];

const SUSPICIOUS_PATTERNS = [
  /fixed\s+inset-0/,
  /fixed\s+inset\b/,
  /fixed\s+bottom\b/,
  /fixed\s+[^\n"']*bottom/,
  /role=["']dialog["']/,
  /aria-modal=/,
];

const STANDARD_PATTERNS = {
  AdminModal: /<AdminModal\b/g,
  PopupPortal: /<PopupPortal\b/g,
  SidePanel: /<SidePanel\b/g,
  DialogPortal: /DialogPrimitive\.Portal|DialogPortal|SheetPortal/g,
  MobilePopupSheet: /admin-mobile-popup-sheet/g,
};

const SAFE_MARKERS = [
  "createPortal(",
  "<PopupPortal",
  "DialogPrimitive.Portal",
  "DialogPortal",
  "SheetPortal",
  "<AdminModal",
  "<SidePanel",
  "admin-mobile-popup-sheet",
];

const REVIEWED_MANUAL_OVERLAYS = new Set([
  "app/admin/media/media-client.tsx",
  "app/admin/posts/page.tsx",
  "app/admin/products/products-client.tsx",
  "app/admin/services/page.tsx",
  "app/cabinet/media/page.tsx",
  "app/cabinet/profile/page.tsx",
  "components/admin/admin-ambient-sound.tsx",
  "components/admin/admin-menu-popup.tsx",
  "components/admin/admin-mobile-bottom-nav.tsx",
  "components/admin/admin-mobile-settings.tsx",
  "components/admin/admin-nature-bg.tsx",
  "components/admin/admin-search.tsx",
  "components/admin/admin-tour.tsx",
  "components/admin/admin-video-bg.tsx",
  "components/admin/neural-bg.tsx",
  "components/admin/photo-editor.tsx",
  "components/admin/photo-search.tsx",
  "components/layout/header.tsx",
  "components/store/aray-chat-host.tsx",
  "components/store/aray-chat-panel.tsx",
  "components/store/aray-widget.tsx",
  "components/store/voice-mode-overlay.tsx",
]);

function normalize(filePath) {
  return filePath.split(path.sep).join("/");
}

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const filePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(filePath, files);
    } else if (entry.isFile() && /\.(tsx|ts|jsx|js)$/.test(filePath)) {
      files.push(filePath);
    }
  }

  return files;
}

function countMatches(source, pattern) {
  return Array.from(source.matchAll(pattern)).length;
}

const files = SEARCH_ROOTS.flatMap((dir) => walk(path.join(ROOT, dir)));
const standard = Object.fromEntries(
  Object.keys(STANDARD_PATTERNS).map((key) => [key, { count: 0, files: new Map() }]),
);
const manual = [];
const reviewed = [];
const needsTriage = [];

for (const absolutePath of files) {
  const relativePath = normalize(path.relative(ROOT, absolutePath));
  const source = fs.readFileSync(absolutePath, "utf8");

  for (const [label, pattern] of Object.entries(STANDARD_PATTERNS)) {
    const count = countMatches(source, pattern);
    if (count > 0) {
      standard[label].count += count;
      standard[label].files.set(relativePath, count);
    }
  }

  const hasSuspiciousLayer = SUSPICIOUS_PATTERNS.some((pattern) => pattern.test(source));
  if (!hasSuspiciousLayer) continue;

  const hasStandardLayer = SAFE_MARKERS.some((marker) => source.includes(marker));
  const bucket = {
    file: relativePath,
    standard: hasStandardLayer,
    reviewed: REVIEWED_MANUAL_OVERLAYS.has(relativePath),
  };
  manual.push(bucket);
  if (!hasStandardLayer && bucket.reviewed) reviewed.push(bucket);
  if (!hasStandardLayer && !bucket.reviewed) needsTriage.push(bucket);
}

console.log("[popup-report] Standard popup system");
for (const [label, info] of Object.entries(standard)) {
  console.log(`  ${label}: ${info.count} uses in ${info.files.size} files`);
}

const standardFiles = new Set();
for (const info of Object.values(standard)) {
  for (const filePath of info.files.keys()) standardFiles.add(filePath);
}

console.log("");
console.log(`[popup-report] Standardized files: ${standardFiles.size}`);
console.log(`[popup-report] Files with fixed/dialog layers: ${manual.length}`);
console.log(`[popup-report] Reviewed manual files: ${reviewed.length}`);
console.log(`[popup-report] Needs triage files: ${needsTriage.length}`);

if (reviewed.length > 0) {
  console.log("");
  console.log("[popup-report] Reviewed manual layers to migrate when touched:");
  for (const item of reviewed) console.log(`  - ${item.file}`);
}

if (needsTriage.length > 0) {
  console.log("");
  console.log("[popup-report] Needs review or migration:");
  for (const item of needsTriage) console.log(`  - ${item.file}`);
}
