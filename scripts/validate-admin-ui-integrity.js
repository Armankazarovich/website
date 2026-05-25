/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const failures = [];

const textExtensions = new Set([".ts", ".tsx", ".js", ".jsx", ".css"]);
const scanRoots = ["app/admin", "components/admin"];

const legacyManualPopupFiles = new Set([
  "app/admin/aray/costs/costs-client.tsx",
  "app/admin/crm/automation/automation-client.tsx",
  "app/admin/crm/crm-client.tsx",
  "app/admin/media/media-client.tsx",
  "app/admin/orders/new/page.tsx",
  "app/admin/posts/page.tsx",
  "app/admin/products/products-client.tsx",
  "app/admin/reviews/reviews-client.tsx",
  "app/admin/services/page.tsx",
  "app/admin/tasks/tasks-client.tsx",
  "app/admin/watermark/recovery/page.tsx",
  "components/admin/admin-ambient-sound.tsx",
  "components/admin/admin-day-planner.tsx",
  "components/admin/admin-edit-button.tsx",
  "components/admin/admin-menu-popup.tsx",
  "components/admin/admin-mobile-bottom-nav.tsx",
  "components/admin/admin-mobile-settings.tsx",
  "components/admin/admin-nature-bg.tsx",
  "components/admin/admin-page-help.tsx",
  "components/admin/admin-search.tsx",
  "components/admin/admin-tour.tsx",
  "components/admin/admin-video-bg.tsx",
  "components/admin/aray-settings-popup.tsx",
  "components/admin/neural-bg.tsx",
  "components/admin/photo-editor.tsx",
  "components/admin/photo-search.tsx",
]);

const legacyNativeDialogFiles = new Set([
  "app/admin/aray/costs/costs-client.tsx",
  "app/admin/posts/page.tsx",
  "app/admin/products/audit/audit-client.tsx",
  "app/admin/products/[id]/page.tsx",
  "app/admin/services/page.tsx",
  "components/admin/photo-search.tsx",
]);

const legacyEmojiFiles = new Set([
  "app/admin/crm/crm-client.tsx",
  "app/admin/email/page.tsx",
  "app/admin/help/page.tsx",
  "app/admin/images/fix/page.tsx",
  "app/admin/media/media-client.tsx",
  "app/admin/products/[id]/page.tsx",
  "app/admin/reviews/reviews-client.tsx",
  "app/admin/watermark/recovery/page.tsx",
  "components/admin/admin-ambient-sound.tsx",
  "components/admin/admin-dashboard-widgets.tsx",
  "components/admin/admin-day-planner.tsx",
  "components/admin/admin-mobile-bottom-nav.tsx",
  "components/admin/admin-mobile-settings.tsx",
  "components/admin/admin-nature-bg.tsx",
  "components/admin/admin-page-help.tsx",
  "components/admin/admin-video-bg.tsx",
  "components/admin/neural-bg.tsx",
  "components/admin/photo-editor.tsx",
  "components/admin/photo-search.tsx",
  "components/admin/quick-price-edit.tsx",
]);

const visibleEmojiPattern = /[\u{1f300}-\u{1faff}\u{2600}-\u{27bf}\ufe0f]/u;
const manualPopupPattern = /\bfixed\s+inset-0\b|\barayglass-popup\b|\bbg-black\/(?:40|50|60|70|80)\b/;
const nativeDialogPattern = /(^|[^\w.])(?:window\.)?(?:alert|confirm|prompt)\s*\(/;
const arayFillerFiles = [
  "app/admin/page.tsx",
  "components/admin/admin-aray.tsx",
  "components/admin/admin-mobile-bottom-nav.tsx",
  "components/admin/admin-navigation-model.ts",
  "components/admin/use-admin-smart-search.tsx",
  "components/store/account-drawer.tsx",
  "components/store/aray-widget.tsx",
];
const arayFillerPatterns = [
  [/\bARAY_NEXT_STEP\b|__aray_next_step__/u, "internal ARAY next-step sentinel must not return"],
  [/ARAY\s+следующий\s+шаг/u, "generic visible 'ARAY следующий шаг' card is forbidden"],
  [/\/admin\/aray\?intent=[^"']*next-step/u, "generic ARAY next-step intent links are forbidden"],
  [/Что\s+срочно\?/u, "generic ARAY chip 'Что срочно?' is forbidden"],
  [/Оживить\s+продажи/u, "generic ARAY chip 'Оживить продажи' is forbidden"],
  [/Проверить\s+риски/u, "generic ARAY chip 'Проверить риски' is forbidden"],
];
const overShadowFiles = [
  "app/globals.css",
  "components/store/aray-dock.tsx",
  "components/store/aray-widget.tsx",
];
const forbiddenShadowSnippets = [
  "0 20px 48px hsl(20 30% 6% / 0.16)",
  "0 18px 54px hsl(20 30% 8% / 0.12)",
  "0 0 28px hsl(var(--primary) / 0.08)",
  "0 10px 30px hsl(var(--foreground) / 0.08)",
  "0 14px 32px rgba(15,23,42,0.10)",
  "0 -12px 36px rgba(15,23,42,0.14)",
];

function normalize(filePath) {
  return filePath.replace(/\\/g, "/");
}

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), "utf8");
}

function fail(message) {
  failures.push(message);
}

function assert(condition, message) {
  if (!condition) fail(message);
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

function assertCapsuleBaseline() {
  const railSource = read("components/admin/admin-nav-rail.tsx");
  const cssSource = read("app/globals.css");

  assert(!/\bcompactPanel\b|\bis-compact\b/.test(railSource), "desktop navigation capsule must not use compact/small mode");
  assert(!/\.admin-nav-panel\.is-compact\b/.test(cssSource), "desktop navigation capsule height must stay stable; remove .admin-nav-panel.is-compact");

  const orbBlock = cssSource.match(/\.admin-rail-orb-button\s*{([\s\S]*?)}/);
  assert(Boolean(orbBlock), "missing .admin-rail-orb-button CSS baseline");
  if (orbBlock) {
    assert(/width:\s*2\.5rem;/.test(orbBlock[1]), "ARAY rail orb button width must stay 2.5rem");
    assert(/height:\s*2\.5rem;/.test(orbBlock[1]), "ARAY rail orb button height must stay 2.5rem");
  }

  assert(
    !/admin-rail-orb-button:hover[\s\S]{0,260}transform:\s*scale\(/.test(cssSource),
    "ARAY rail orb hover must not scale the capsule/orb size",
  );
  assert(
    !railSource.includes("admin-rail-aray-cue") && !cssSource.includes("admin-rail-aray-cue"),
    "ARAY rail orb must stay visually clean; do not add tiny text badges or extra cue chips over the orb",
  );

  assert(
    !/\.admin-nav-panel-item::(?:before|after)\b/.test(cssSource),
    "navigation popup rows must stay quiet; do not add neon pseudo-element hover to .admin-nav-panel-item",
  );
  assert(
    !/admin-nav-panel-item[\s\S]{0,420}adminNeonBorderSpin/.test(cssSource),
    "navigation popup rows must not use animated neon border hover",
  );
}

function assertSettingsHubBaseline() {
  const settingsSource = read("app/admin/settings/page.tsx");
  const groupsBlock = settingsSource.match(/const groups = \[([\s\S]*?)\n\s*];/);
  assert(Boolean(groupsBlock), "settings page must keep an explicit settings hub grouping");
  if (!groupsBlock) return;

  const forbiddenIds = [
    "catalog",
    "promos",
    "reviews",
    "newsletter",
    "analytics",
    "advertising",
    "finance",
  ];

  for (const id of forbiddenIds) {
    assert(!new RegExp(`["']${id}["']`).test(groupsBlock[1]), `settings hub main groups must not duplicate "${id}" module`);
  }
}

function assertWorkflowsBaseline() {
  const workflowsSource = read("app/admin/workflows/page.tsx");
  const seedSource = read("app/api/admin/workflows/seed/route.ts");

  assert(workflowsSource.includes("AdminModal"), "/admin/workflows create dialog must use AdminModal");
  assert(!manualPopupPattern.test(workflowsSource), "/admin/workflows must not use manual fixed/backdrop popup classes");
  assert(!/\buseClassicMode\b|\bpopupStyle\b/.test(workflowsSource), "/admin/workflows must not use legacy popup style switches");
  assert(!visibleEmojiPattern.test(workflowsSource), "/admin/workflows must not render emoji; use lucide icons");
  assert(seedSource.includes("cleanWorkflowText"), "workflow seed must sanitize preset names/actions before writing visible data");
}

function assertNoGenericArayFillers() {
  for (const relPath of arayFillerFiles) {
    const source = read(relPath);
    for (const [pattern, message] of arayFillerPatterns) {
      assert(!pattern.test(source), `${relPath}: ${message}`);
    }
  }
}

function assertBalancedShadows() {
  for (const relPath of overShadowFiles) {
    const source = read(relPath);
    for (const snippet of forbiddenShadowSnippets) {
      assert(!source.includes(snippet), `${relPath}: over-strong light shadow returned; keep navigation/ARAY depth quiet and balanced`);
    }
  }
}

function assertSafeBuildAutomation() {
  const packageJson = JSON.parse(read("package.json"));
  const scripts = packageJson.scripts || {};
  const safeBuildSource = read("scripts/next-build-safe.js");

  assert(
    scripts.build === "node scripts/next-build-safe.js --command build:raw",
    "npm run build must use next-build-safe.js to release Windows Prisma DLL locks before local builds",
  );
  assert(
    scripts["build:ci"] === "node scripts/next-build-safe.js --command build:ci:raw",
    "npm run build:ci must use next-build-safe.js to release Windows Prisma DLL locks before CI/local builds",
  );
  assert(Boolean(scripts["build:raw"]), "package.json must keep build:raw as the non-recursive full build command");
  assert(Boolean(scripts["build:ci:raw"]), "package.json must keep build:ci:raw as the non-recursive CI build command");
  assert(
    safeBuildSource.includes("Stop-Process -Id") && safeBuildSource.includes("next\\\\dist\\\\bin\\\\next"),
    "next-build-safe.js must keep the local Next process stopper for Prisma DLL lock prevention",
  );
}

function assertArayPopupStandard() {
  const modalSource = read("components/admin/admin-modal.tsx");
  const sidePanelSource = read("components/store/side-panel.tsx");
  const mobileDockSource = read("components/admin/admin-mobile-bottom-nav.tsx");
  const storeDockSource = read("components/store/mobile-bottom-nav.tsx");
  const overlayGuardSource = read("lib/use-admin-overlay-guard.ts");
  const cssSource = read("app/globals.css");

  assert(
    modalSource.includes("admin-modal-panel admin-popup-liquid"),
    "AdminModal must inherit the ARAY popup visual standard",
  );
  assert(
    sidePanelSource.includes('panelClassName ?? "admin-popup-liquid bg-card border-border shadow-2xl"'),
    "SidePanel default must stay on the ARAY popup/sheet standard",
  );
  assert(
    cssSource.includes(".admin-mobile-sheet-handle") && cssSource.includes("@keyframes adminPopupSlideFromBottom"),
    "mobile bottom sheets must keep the ARAY popup handle and bottom-slide animation",
  );
  assert(
    modalSource.includes("useAdminOverlayGuard(open)") &&
      sidePanelSource.includes("useAdminOverlayGuard(open)") &&
      overlayGuardSource.includes("dataset.adminOverlayOpen"),
    "AdminModal and SidePanel must use the shared overlay guard so mobile dock/PWA launchers do not cover popup actions",
  );
  assert(
    mobileDockSource.includes('attributeFilter: ["data-admin-overlay-open"]') &&
      storeDockSource.includes('attributeFilter: ["data-admin-overlay-open"]') &&
      cssSource.includes('body[data-admin-overlay-open="true"] [data-admin-mobile-dock]') &&
      cssSource.includes('body[data-admin-overlay-open="true"] [data-store-mobile-dock]'),
    "mobile docks must disappear under active popups instead of covering dialog actions",
  );
}

function assertMotionSystemBaseline() {
  const cssSource = read("app/globals.css");
  const routeTransitionSource = read("components/layout/route-transition.tsx");
  const routeMotionSource = read("lib/route-motion.ts");
  const moduleLawSource = read("docs/aray-module-system-law-2026-05-07.md");
  const pageTransitionBlock = cssSource.match(/@keyframes routeContentEnter\s*{([\s\S]*?)\n}\s*\n@keyframes adminPageContentEnter/);

  assert(
    moduleLawSource.includes("Core Module: Motion System / Page Flow"),
    "Motion System must stay documented as a core module",
  );
  assert(
    cssSource.includes(".route-transition-shell") &&
      routeTransitionSource.includes("RouteTransition") &&
      routeMotionSource.includes("RouteMotionSurface") &&
      Boolean(pageTransitionBlock) &&
      pageTransitionBlock[1].includes("translate3d(") &&
      !pageTransitionBlock[1].includes("translateX("),
    "admin page transition must use the shared route transition flow, not one-off horizontal motion",
  );
  assert(
    cssSource.includes("@media (prefers-reduced-motion: no-preference)") &&
      cssSource.includes('data-route-transition="enter"'),
    "admin page motion must stay gated behind prefers-reduced-motion",
  );
}

function assertAppIdentityBaseline() {
  const syncSource = read("components/pwa-manifest-sync.tsx");
  const contextSource = read("lib/pwa-install-context.ts");
  const installSource = read("components/admin/admin-pwa-install.tsx");
  const railSource = read("components/admin/admin-nav-rail.tsx");
  const iconSource = read("lib/aray-pwa-icon.ts");
  const siteIconSource = read("lib/site-pwa-icon.ts");
  const manifestRouteSource = read("app/api/pwa/manifest/route.ts");
  const adminLayoutSource = read("app/admin/layout.tsx");
  const adminManifestSource = read("public/admin-manifest.json");
  const swSource = read("public/sw.js");
  const moduleLawSource = read("docs/aray-module-system-law-2026-05-07.md");

  assert(
    moduleLawSource.includes("Core Module: App Identity / PWA System"),
    "App Identity / PWA System must stay documented as a core module",
  );
  assert(
      syncSource.includes("buildDocumentTitle") &&
      syncSource.includes("syncIconLinks") &&
      syncSource.includes("dataset.arayAppContext") &&
      syncSource.includes("getPwaIconSrc(context, 192)"),
    "PwaManifestSync must keep module-aware title, manifest and icon synchronization",
  );
  assert(
    contextSource.includes("createArayModuleContext") &&
      contextSource.includes('"aray-analytics"') &&
      contextSource.includes('"aray-appearance"') &&
      contextSource.includes('"aray-marketing"') &&
      contextSource.includes('startsWithAny(safePathname, ["/admin/analytics"])'),
    "PWA install contexts must stay module-aware instead of only using one generic admin app",
  );
  assert(
    moduleLawSource.includes("Smart install law") &&
      installSource.includes("PwaIconPreview") &&
      installSource.includes("Меню браузера → Установить приложение") &&
      installSource.includes("Понятно") &&
      installSource.includes('searchParams.get("install")') &&
      installSource.includes("localStorage") &&
      installSource.includes("setOpen(false);") &&
      !installSource.includes("!isDismissed") &&
      !railSource.includes("admin-rail-pwa-button") &&
      !railSource.includes("pwa-rail"),
    "PWA install must stay opt-in as a quiet compact banner, not an auto-open rail/capsule install control",
  );
  assert(
    iconSource.includes("aray-production-logo.png"),
    "ARAY PWA icon endpoint must use the ARAY Production logo source",
  );
  assert(
    contextSource.includes("getPwaIconSrc") &&
      contextSource.includes('context.iconKind === "aray"') &&
      contextSource.includes('/api/pwa/icon?s=') &&
      contextSource.includes('/api/pwa/site-icon?') &&
      contextSource.includes("PWA_SITE_ICON_VERSION") &&
      contextSource.includes('"pilorus-site"') &&
      contextSource.includes('"pilorus-catalog"'),
    "PWA icon resolution must keep ARAY Production icons for admin/modules and dynamic client logo icons for storefront contexts",
  );
  assert(
    manifestRouteSource.includes("getPwaIconSrc(context, size)") &&
      manifestRouteSource.includes("ARAY_ICON_SIZES") &&
      manifestRouteSource.includes("SITE_ICON_SIZES") &&
      siteIconSource.includes("createSitePwaIconResponse") &&
      siteIconSource.includes("getSiteSettings") &&
      siteIconSource.includes("tenant") &&
      siteIconSource.includes("DEFAULT_SITE_LOGO") &&
      adminLayoutSource.includes('/api/pwa/icon?s=192&v=aray-production-20260508') &&
      adminManifestSource.includes('"name": "ARAY Production"') &&
      adminManifestSource.includes('"/api/pwa/icon?s=512&v=aray-production-20260508"') &&
      !adminManifestSource.includes("Pilo"),
    "Admin identity must stay on ARAY icons while storefront PWA icons are generated from the client logo layer",
  );
  assert(
    swSource.includes("'/api/pwa/icon?s=192&v=aray-production-20260508'") &&
      swSource.includes("'/api/pwa/icon?s=72&v=aray-production-20260508'"),
    "push notification icons must use the shared ARAY PWA icon endpoint",
  );
}

function assertNoNewLegacyUi() {
  const files = scanRoots.flatMap((dir) => walk(dir));

  for (const file of files) {
    const rel = normalize(path.relative(root, file));
    const source = fs.readFileSync(file, "utf8");

    if (manualPopupPattern.test(source) && !legacyManualPopupFiles.has(rel)) {
      fail(`${rel}: new admin popup must use AdminModal/SidePanel/ConfirmDialog, not manual fixed/backdrop classes`);
    }

    if (nativeDialogPattern.test(source) && !legacyNativeDialogFiles.has(rel)) {
      fail(`${rel}: native alert/confirm/prompt is not allowed in admin UI`);
    }

    if (visibleEmojiPattern.test(source) && !legacyEmojiFiles.has(rel)) {
      fail(`${rel}: visible emoji is not allowed in new admin UI; use lucide icons or text badges`);
    }
  }
}

assertCapsuleBaseline();
assertSettingsHubBaseline();
assertWorkflowsBaseline();
assertNoGenericArayFillers();
assertBalancedShadows();
assertSafeBuildAutomation();
assertArayPopupStandard();
assertMotionSystemBaseline();
assertAppIdentityBaseline();
assertNoNewLegacyUi();

if (failures.length > 0) {
  console.error("\n[ARAY Admin UI Integrity] failed:");
  for (const message of failures) console.error(` - ${message}`);
  process.exit(1);
}

console.log("[ARAY Admin UI Integrity] passed");
