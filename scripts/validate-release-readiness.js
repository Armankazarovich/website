/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const reportDir = path.join(root, "tmp");
const reportPath = path.join(reportDir, "release-readiness-report.md");

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), "utf8");
}

function exists(relPath) {
  return fs.existsSync(path.join(root, relPath));
}

function includesAll(text, tokens) {
  return tokens.every((token) => text.includes(token));
}

function allExist(files) {
  return files.every((file) => exists(file));
}

const checks = [];

function check(name, ok, detail) {
  checks.push({ name, ok: Boolean(ok), detail });
}

const packageJson = JSON.parse(read("package.json"));
check(
  "Release scripts are wired",
  Boolean(packageJson.scripts?.["release:check"]) &&
    read("scripts/aray-quality-gate.js").includes("validate-release-readiness.js"),
  "release:check must exist and the main quality gate must run release readiness.",
);
check(
  "Architecture and cart guards are wired",
  Boolean(packageJson.scripts?.["architecture:levels"]) &&
    Boolean(packageJson.scripts?.["cart:check"]) &&
    read("scripts/aray-quality-gate.js").includes("validate-system-architecture-levels.js") &&
    read("scripts/aray-quality-gate.js").includes("validate-cart-checkout-flow.js"),
  "The main quality gate must run architecture levels and cart/checkout protection.",
);
check(
  "Browser cart guard is wired into deploy",
  Boolean(packageJson.scripts?.["browser:cart:check"]) &&
    exists("scripts/validate-browser-cart-flow.js") &&
    read("scripts/deploy-preflight.js").includes("browser:cart:check") &&
    includesAll(read("scripts/validate-browser-cart-flow.js"), ["data-product-seller-panel", "data-product-channel"]),
  "Deploy must include a real browser add-to-cart/cart-page/product-page scenario, not only API checks.",
);
check(
  "Text encoding guard is wired",
  Boolean(packageJson.scripts?.["text:check"]) &&
    exists("scripts/validate-text-encoding-guard.js") &&
    read("scripts/aray-quality-gate.js").includes("validate-text-encoding-guard.js"),
  "Release quality must block corrupted Russian text before it reaches users.",
);
check(
  "Deploy runs preflight before push",
  Boolean(packageJson.scripts?.deploy?.includes("deploy-preflight.js")) &&
    exists("scripts/deploy-preflight.js") &&
    packageJson.scripts.deploy.includes("../scripts/deploy.js"),
  "Deploy must run local quality before pushing to production.",
);

const queuePath = "docs/ARAY_RELEASE_FIX_QUEUE_2026-05-25.md";
const queue = exists(queuePath) ? read(queuePath) : "";
check(
  "Release queue exists",
  Boolean(queue),
  "A project-level queue keeps user-reported bugs from being lost.",
);
check(
  "Release queue covers P0 user pain",
  includesAll(queue, [
    "PWA PiloRus mobile",
    "Cart add animation",
    "ARAY Messenger",
    "AR Phone",
    "Video gateway",
    "Tasks / lost queue",
  ]),
  "Queue must track PWA, cart, ARAY messenger, phone, video, and lost tasks.",
);

const protectedPath = "docs/ARAY_PROTECTED_SURFACES_2026-05-25.md";
const protectedSurfaces = exists(protectedPath) ? read(protectedPath) : "";
check(
  "Protected ready surfaces are documented",
  includesAll(protectedSurfaces, [
    "PWA identity and install",
    "Store header and mobile shell",
    "ARAY Messenger",
    "Media and stories",
    "Site builder and multi-site constructor",
    "Release/deploy gates",
  ]),
  "Working modules need a protected list so unrelated fixes do not break them.",
);

const sitePwaIcon = read("lib/site-pwa-icon.ts");
check(
  "PWA site icon uses clean PNG source",
  sitePwaIcon.includes('const DEFAULT_SITE_LOGO = "/icons/icon-512x512.png"') &&
    sitePwaIcon.includes('if (logoUrl === "/logo.png") return DEFAULT_SITE_LOGO') &&
    sitePwaIcon.includes("PILORUS_PWA_APPS") &&
    !sitePwaIcon.includes("background: { r: 82"),
  "PiloRus PWA icon should be the prepared PNG, not a generated colored tile.",
);

const storePwaInstall = read("components/store/pwa-install.tsx");
check(
  "Store PWA install keeps simple brand launcher",
  includesAll(storePwaInstall, [
    "STORE_PWA_INSTALL_BRAND_LOCK",
    "data-store-pwa-launcher",
    "openInstallPanel",
    "h-14 w-14",
    "rounded-full",
  ]) && !storePwaInstall.includes('hidden sm:inline">Приложение'),
  "The public PWA install entry should remain a compact logo button, not a heavy text badge.",
);

const pwaContext = read("lib/pwa-install-context.ts");
check(
  "PWA icon cache version is bumped",
  /PWA_SITE_ICON_VERSION\s*=\s*"site-brand-20260525"/.test(pwaContext),
  "Mobile PWA should request the fresh icon version after logo changes.",
);

const pwaSplash = read("components/layout/pwa-launch-splash.tsx");
check(
  "PWA splash appears once per app session",
  includesAll(pwaSplash, ["SPLASH_SESSION_KEY", "sessionStorage.getItem", "sessionStorage.setItem", "}, []);"]),
  "Splash should be tied to one session key and not reappear on every route transition.",
);

check(
  "PWA API routes exist",
  allExist(["app/api/pwa/manifest/route.ts", "app/api/pwa/site-icon/route.ts", "app/api/pwa/icon/route.ts"]),
  "Manifest, PiloRus site icon, and ARAY icon endpoints must exist.",
);

const cartFly = read("lib/cart-fly.ts");
check(
  "Cart fly animation has resilient target lookup",
  includesAll(cartFly, ["querySelectorAll(targetSelector)", "new DOMRect(", "targetIcon?.animate", "sanitizeImageUrl"]),
  "Add-to-cart animation should find visible cart targets and still animate with a fallback.",
);

const mobileNav = read("components/store/mobile-bottom-nav.tsx");
const sideRail = read("components/store/side-icon-rail.tsx");
const header = read("components/layout/header.tsx");
check(
  "Cart icon targets exist across store shells",
  mobileNav.includes("data-cart-icon") && sideRail.includes("cartTarget") && header.includes("data-cart-icon"),
  "Mobile bottom nav, tablet side rail, and desktop header must expose a cart animation target.",
);

check(
  "Mobile store header shows PiloRus name",
  includesAll(header, ["flex min-w-0 flex-col", "sm:text-lg"]),
  "Mobile header must show the PiloRus brand name next to the icon.",
);
check(
  "Store add-to-cart surfaces use shared animation",
  includesAll(read("components/store/product-card.tsx"), ["flyToCart", "addItem", "data-add-to-cart"]) &&
    includesAll(read("components/store/variant-selector.tsx"), ["flyToCart", "addItem"]) &&
    includesAll(read("components/store/variant-cards.tsx"), ["flyToCart", "addItem"]),
  "Catalog cards, product variant selector, and variant cards must share add-to-cart animation wiring.",
);
check(
  "Cart, calculator, and checkout share one contract",
  includesAll(read("store/cart.ts"), ["if (value == null) return null", "getInitialCartItems", "currentItems.length > 0", "writeCartItemsToStorage(currentItems)"]) &&
    includesAll(read("app/api/calculator/products/route.ts"), ["getPublicVariantsFilter", "images: { isEmpty: false }"]) &&
    includesAll(read("app/api/cart/load/route.ts"), ["getPublicVariantsFilter", "getPurchasableQuantityLimit"]) &&
    includesAll(read("app/(store)/checkout/page.tsx"), ["hydrateCart", "hasHydrated", "shouldRedirectToCart"]) &&
    includesAll(read("app/(store)/cart/page.tsx"), ["data-cart-item", "data-cart-empty-state", "data-cart-checkout-link"]),
  "Calculator items must survive cart hydration and remain accepted by checkout/order validation.",
);
check(
  "Core public store routes exist",
  allExist([
    "app/(store)/catalog/page.tsx",
    "app/(store)/cart/page.tsx",
    "app/(store)/checkout/page.tsx",
    "app/(store)/stories/page.tsx",
    "app/(store)/services/page.tsx",
    "app/(store)/wishlist/page.tsx",
    "app/(store)/compare/page.tsx",
    "app/(store)/contacts/page.tsx",
  ]),
  "Main buyer flows must have route files before release.",
);

const productPage = read("app/(store)/product/[slug]/page.tsx");
const productActions = read("components/store/product-page-actions.tsx");
const contactRoute = read("app/api/contact/route.ts");
check(
  "Product page has smart seller controls",
  includesAll(productPage, ["ProductSellerPanel", "ProductSmartSummary", "ProductShareButton", "productSku", "smartTags"]) &&
    includesAll(productActions, ["ProductShareButton", "ProductSellerPanel", "ProductSmartSummary", "CHANNELS", "Telegram", "WhatsApp", "Zangi", "Почта", "data-product-seller-panel"]) &&
    includesAll(contactRoute, ["source === \"PRODUCT\"", "productTitle", "productSku", "Укажите телефон, email или вопрос"]),
  "Product pages need share, SKU, smart tags, CRM lead capture, and a first omnichannel ARAY entry.",
);

const embeddedMessenger = read("components/store/aray-embedded-messenger.tsx");
check(
  "ARAY messenger has one action center",
  includesAll(embeddedMessenger, [
    "MessengerActionTile",
    "createTask",
    "prepareVideoCall",
    "openVideoMeeting",
    "AR Phone",
  ]),
  "Messenger must connect chat, ARAY, tasks, AR Phone, and video from one panel.",
);
check(
  "ARAY messenger protects long links",
  includesAll(embeddedMessenger, ["MessengerMessageText", "compactMessengerUrlLabel", "safeMessengerHref"]),
  "Long AI/search links must not break the chat bubble.",
);

const arayWidget = read("components/store/aray-widget.tsx");
check(
  "ARAY widget routes phone and video into workspace",
  includesAll(arayWidget, [
    "handleArayPhoneDial",
    "__aray_dial__",
    "openOwnArayVideoRoom",
    "SILENT_LIVE_ACTION_LABELS",
  ]),
  "Internal dialing, video, and quiet open events must stay wired.",
);
check(
  "Messenger and ARAY APIs exist",
  allExist([
    "app/api/admin/messenger/threads/route.ts",
    "app/api/admin/messenger/threads/[id]/route.ts",
    "app/api/admin/messenger/threads/[id]/messages/route.ts",
    "app/api/admin/messenger/aray-phone/resolve/route.ts",
    "app/api/admin/tasks/route.ts",
    "app/api/admin/tasks/[id]/route.ts",
  ]),
  "Messenger, AR Phone resolve, and tasks APIs are required for the unified work center.",
);
check(
  "ARAY omnichannel center is queued",
  includesAll(queue, [
    "ARAY omnichannel center",
    "Telegram, WhatsApp, Zangi",
    "email, mailings/newsletters",
    "find who",
    "save to CRM",
  ]),
  "ARAY must be treated as a channel synchronizer, not a separate isolated messenger.",
);

check(
  "Core admin work routes exist",
  allExist([
    "app/admin/page.tsx",
    "app/admin/crm/page.tsx",
    "app/admin/messenger/page.tsx",
    "app/admin/tasks/tasks-client.tsx",
    "app/admin/orders/page.tsx",
    "app/admin/products/page.tsx",
    "app/admin/media/media-client.tsx",
    "app/admin/stories/page.tsx",
    "app/admin/settings/page.tsx",
    "app/admin/health/page.tsx",
  ]),
  "Admin dashboard, CRM, messenger, tasks, orders, products, media, stories, settings, and health must exist.",
);

const headerSearch = read("components/admin/admin-header-search.tsx");
check(
  "Admin search dropdown renders above ARAY",
  includesAll(headerSearch, ["createPortal", "data-admin-header-search-open", "z-[240]"]),
  "Search results should not be hidden under the ARAY panel.",
);

const mediaClient = read("app/admin/media/media-client.tsx");
check(
  "Media picker does not trap stories filter",
  includesAll(mediaClient, ['const [folder, setFolder] = useState<string>("all")', "preferredFolderDiff", 'setFolder("all")']),
  "Story media picker should show usable media first and offer a reset when empty.",
);
check(
  "Stories and media APIs exist",
  allExist([
    "app/api/admin/media/route.ts",
    "app/api/admin/stories/route.ts",
    "app/api/admin/stories/[id]/route.ts",
    "app/api/stories/route.ts",
  ]),
  "Story publishing and media picker flows need their admin and public APIs.",
);

const crmClient = read("app/admin/crm/crm-client.tsx");
check(
  "Mobile CRM auto-selects a non-empty status",
  includesAll(crmClient, ["setMobileOrderStage", "firstStageWithOrders", "orders.some((order) => order.status === mobileOrderStage)"]),
  "Mobile CRM should not show an empty stage when orders exist elsewhere.",
);

const failed = checks.filter((item) => !item.ok);
fs.mkdirSync(reportDir, { recursive: true });
const report = [
  "# Release Readiness Report",
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
  console.error("[ARAY] Release readiness failed:");
  for (const item of failed) console.error(` - ${item.name}: ${item.detail}`);
  console.error(`[ARAY] Report: ${path.relative(root, reportPath)}`);
  process.exit(1);
}

console.log(`[ARAY] Release readiness passed (${checks.length} gates)`);
console.log(`[ARAY] Report: ${path.relative(root, reportPath)}`);
