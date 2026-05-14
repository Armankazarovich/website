const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const SEARCH_ROOTS = ["app", "components"];

const SUSPICIOUS_PATTERNS = [
  /fixed\s+inset-0/,
  /fixed\s+inset\b/,
  /role=["']dialog["']/,
  /aria-modal=/,
];

const SAFE_MARKERS = [
  "createPortal(",
  "<PopupPortal",
  "DialogPrimitive.Portal",
  "DialogPortal",
  "SheetPortal",
  "<AdminModal",
  "<SidePanel",
];

// Reviewed manual fixed layers. Most are page chrome, visual backgrounds,
// legacy full-screen assistants, or screens that need a separate refactor.
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
    } else if (entry.isFile() && filePath.endsWith(".tsx")) {
      files.push(filePath);
    }
  }

  return files;
}

const candidates = SEARCH_ROOTS.flatMap((dir) => walk(path.join(ROOT, dir)));
const manualReviewed = [];
const unapproved = [];

for (const absolutePath of candidates) {
  const relativePath = normalize(path.relative(ROOT, absolutePath));
  const source = fs.readFileSync(absolutePath, "utf8");
  const hasSuspiciousLayer = SUSPICIOUS_PATTERNS.some((pattern) => pattern.test(source));
  if (!hasSuspiciousLayer) continue;

  const hasPortalLayer = SAFE_MARKERS.some((marker) => source.includes(marker));
  if (hasPortalLayer) continue;

  if (REVIEWED_MANUAL_OVERLAYS.has(relativePath)) {
    manualReviewed.push(relativePath);
  } else {
    unapproved.push(relativePath);
  }
}

if (manualReviewed.length > 0) {
  console.log(`[popup-check] reviewed manual fixed layers: ${manualReviewed.length}`);
  for (const filePath of manualReviewed) console.log(`  - ${filePath}`);
}

if (unapproved.length > 0) {
  console.error("[popup-check] New fixed/dialog layers must use PopupPortal/AdminModal/SidePanel or be reviewed:");
  for (const filePath of unapproved) console.error(`  - ${filePath}`);
  process.exit(1);
}

console.log("[popup-check] OK: no new unapproved fixed/dialog layers.");
