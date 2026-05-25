/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const reportDir = path.join(root, "tmp");
const reportPath = path.join(reportDir, "system-architecture-levels-report.md");

function filePath(relPath) {
  return path.join(root, relPath);
}

function exists(relPath) {
  return fs.existsSync(filePath(relPath));
}

function read(relPath) {
  return fs.readFileSync(filePath(relPath), "utf8");
}

function includesAll(relPath, tokens) {
  if (!exists(relPath)) return false;
  const text = read(relPath);
  return tokens.every((token) => text.includes(token));
}

function packageScript(name) {
  if (!exists("package.json")) return false;
  const packageJson = JSON.parse(read("package.json"));
  return Boolean(packageJson.scripts?.[name]);
}

const levels = [
  {
    name: "L0 Memory, queue, and protected modules",
    goal: "User-reported pain and working modules must not disappear between chats or deploys.",
    checks: [
      {
        name: "Release fix queue exists",
        ok: exists("docs/ARAY_RELEASE_FIX_QUEUE_2026-05-25.md"),
        detail: "A single queue keeps urgent issues visible.",
      },
      {
        name: "Queue covers critical buyer and ARAY flows",
        ok: includesAll("docs/ARAY_RELEASE_FIX_QUEUE_2026-05-25.md", [
          "PWA PiloRus mobile",
          "Cart add animation",
          "ARAY Messenger",
          "Video gateway",
          "Stories",
          "Checkout",
        ]),
        detail: "Queue must include PWA, cart, messenger, video, stories, and checkout.",
      },
      {
        name: "Protected surface list exists",
        ok: exists("docs/ARAY_PROTECTED_SURFACES_2026-05-25.md"),
        detail: "Ready modules need a no-random-redesign protection list.",
      },
      {
        name: "Protected surface list covers site builder and deploy gates",
        ok: includesAll("docs/ARAY_PROTECTED_SURFACES_2026-05-25.md", [
          "Site builder and multi-site constructor",
          "Release/deploy gates",
          "Cart and checkout",
        ]),
        detail: "Site creation, cart, and deploy must be explicitly protected.",
      },
    ],
  },
  {
    name: "L1 Source contracts",
    goal: "Shared rules must live in shared helpers, not in separate page guesses.",
    checks: [
      {
        name: "Public product availability helper exists",
        ok: includesAll("lib/product-seo.ts", [
          "getPublicProductsFilter",
          "getPublicVariantsFilter",
          "getPublicVariantUnitFilter",
        ]),
        detail: "Catalog, calculator, cart, and orders need one availability law.",
      },
      {
        name: "Calculator uses the public availability law",
        ok: includesAll("app/api/calculator/products/route.ts", [
          "getPublicVariantsFilter",
          "images: { isEmpty: false }",
        ]),
        detail: "Calculator products must be purchasable in checkout.",
      },
      {
        name: "Cart loader uses the public availability law",
        ok: includesAll("app/api/cart/load/route.ts", [
          "getPublicVariantsFilter",
          "getPurchasableQuantityLimit",
        ]),
        detail: "Local cart storage is only a draft; DB reload is the truth.",
      },
      {
        name: "Order API revalidates server total",
        ok: includesAll("app/api/orders/route.ts", [
          "serverTotal",
          "Math.abs(serverTotal - totalAmount)",
          "status: 409",
        ]),
        detail: "Checkout cannot trust client prices.",
      },
    ],
  },
  {
    name: "L2 Buyer revenue flow",
    goal: "A customer can find a product, add it, see it in cart, and reach checkout.",
    checks: [
      {
        name: "Buyer pages exist",
        ok: [
          "app/(store)/catalog/page.tsx",
          "app/(store)/product/[slug]/page.tsx",
          "app/(store)/cart/page.tsx",
          "app/(store)/checkout/page.tsx",
          "app/(store)/calculator/page.tsx",
        ].every(exists),
        detail: "Catalog, product, calculator, cart, and checkout are the core sales path.",
      },
      {
        name: "Cart store protects in-memory state",
        ok: includesAll("store/cart.ts", [
          "currentItems.length > 0",
          "writeCartItemsToStorage(currentItems)",
          "hasHydrated: true",
        ]),
        detail: "Checkout must not empty a cart that was just filled from calculator.",
      },
      {
        name: "Add-to-cart surfaces share animation and store",
        ok: [
          "components/store/product-card.tsx",
          "components/store/variant-selector.tsx",
          "components/store/variant-cards.tsx",
        ].every((relPath) => includesAll(relPath, ["flyToCart", "addItem"])),
        detail: "One add-to-cart behavior should work across catalog and product pages.",
      },
      {
        name: "Cart flow guard is wired",
        ok: packageScript("cart:check") &&
          includesAll("scripts/aray-quality-gate.js", ["validate-cart-checkout-flow.js"]),
        detail: "The cart contract must run in the main quality gate.",
      },
    ],
  },
  {
    name: "L3 Mobile and PWA",
    goal: "Installed app identity, mobile header, and launch behavior stay simple and stable.",
    checks: [
      {
        name: "PWA icon uses clean PNG",
        ok: includesAll("lib/site-pwa-icon.ts", [
          'DEFAULT_SITE_LOGO = "/icons/icon-512x512.png"',
          'if (logoUrl === "/logo.png") return DEFAULT_SITE_LOGO',
        ]),
        detail: "PiloRus app icon must not become a generated colored tile.",
      },
      {
        name: "PWA install launcher remains simple",
        ok: includesAll("components/store/pwa-install.tsx", [
          "STORE_PWA_INSTALL_BRAND_LOCK",
          "data-store-pwa-launcher",
          "h-14 w-14",
        ]),
        detail: "The public install button stays a clean logo launcher.",
      },
      {
        name: "Mobile header shows brand name",
        ok: includesAll("components/layout/header.tsx", [
          "flex min-w-0 flex-col",
          "sm:text-lg",
        ]),
        detail: "Mobile PiloRus must show icon and name, not only an icon.",
      },
      {
        name: "PWA routes exist",
        ok: [
          "app/api/pwa/manifest/route.ts",
          "app/api/pwa/site-icon/route.ts",
          "app/api/pwa/icon/route.ts",
        ].every(exists),
        detail: "Manifest and icons must be routable before release.",
      },
    ],
  },
  {
    name: "L4 ARAY work center",
    goal: "Messenger, AR Phone, tasks, video, CRM, and search stay connected instead of becoming separate toys.",
    checks: [
      {
        name: "ARAY messenger action center exists",
        ok: includesAll("components/store/aray-embedded-messenger.tsx", [
          "MessengerActionTile",
          "createTask",
          "prepareVideoCall",
          "AR Phone",
        ]),
        detail: "Messenger must keep chat, tasks, AR Phone, and video in one workspace.",
      },
      {
        name: "ARAY widget routes phone and video",
        ok: includesAll("components/store/aray-widget.tsx", [
          "handleArayPhoneDial",
          "__aray_dial__",
          "openOwnArayVideoRoom",
        ]),
        detail: "Internal number and video launch must stay wired.",
      },
      {
        name: "Admin search floats above ARAY",
        ok: includesAll("components/admin/admin-header-search.tsx", [
          "createPortal",
          "z-[240]",
        ]),
        detail: "Search suggestions should not hide under ARAY.",
      },
      {
        name: "Core ARAY/admin routes exist",
        ok: [
          "app/admin/crm/page.tsx",
          "app/admin/messenger/page.tsx",
          "app/admin/tasks/tasks-client.tsx",
          "app/api/admin/messenger/aray-phone/resolve/route.ts",
          "app/api/admin/tasks/route.ts",
        ].every(exists),
        detail: "CRM, messenger, tasks, and internal phone API are required.",
      },
    ],
  },
  {
    name: "L5 Content, media, and stories",
    goal: "Media library, stories, content tools, and public stories stay usable across desktop and mobile.",
    checks: [
      {
        name: "Stories and media routes exist",
        ok: [
          "app/(store)/stories/page.tsx",
          "app/admin/stories/page.tsx",
          "app/admin/media/media-client.tsx",
          "app/api/admin/stories/route.ts",
          "app/api/stories/route.ts",
        ].every(exists),
        detail: "Story creation and public story display need both admin and public routes.",
      },
      {
        name: "Media picker can reset folder filter",
        ok: includesAll("app/admin/media/media-client.tsx", [
          'useState<string>("all")',
          "preferredFolderDiff",
          'setFolder("all")',
        ]),
        detail: "A story filter must not trap the media library in an empty state.",
      },
      {
        name: "Story guard is wired",
        ok: packageScript("stories:check") &&
          includesAll("scripts/aray-quality-gate.js", ["validate-store-stories.js"]),
        detail: "Stories need a permanent quality guard.",
      },
      {
        name: "Content tools guard is wired",
        ok: packageScript("content:check") &&
          includesAll("scripts/aray-quality-gate.js", ["validate-content-tools.js"]),
        detail: "Content automation must stay checked before release.",
      },
    ],
  },
  {
    name: "L6 Release and deploy shields",
    goal: "A deploy cannot happen without the checks that protect known revenue and architecture flows.",
    checks: [
      {
        name: "Release readiness guard is wired",
        ok: packageScript("release:check") &&
          includesAll("scripts/aray-quality-gate.js", ["validate-release-readiness.js"]),
        detail: "Known launch blockers must run in quality.",
      },
      {
        name: "Architecture levels guard is wired",
        ok: packageScript("architecture:levels") &&
          includesAll("scripts/aray-quality-gate.js", ["validate-system-architecture-levels.js"]),
        detail: "This level-based guard must be part of the main quality gate.",
      },
      {
        name: "Deploy preflight is wired",
        ok: exists("scripts/deploy-preflight.js") &&
          includesAll("package.json", ["deploy-preflight.js", "quality:full"]),
        detail: "Deploy should run local quality before push.",
      },
      {
        name: "Live release smoke exists",
        ok: packageScript("release:smoke") &&
          exists("scripts/validate-release-smoke.js"),
        detail: "Local/prod HTTP smoke checks must be available for final release.",
      },
    ],
  },
];

const rows = [];
for (const level of levels) {
  for (const item of level.checks) {
    rows.push({
      level: level.name,
      goal: level.goal,
      ...item,
    });
  }
}

const failed = rows.filter((item) => !item.ok);
fs.mkdirSync(reportDir, { recursive: true });
const report = [
  "# System Architecture Levels Report",
  "",
  `Generated: ${new Date().toISOString()}`,
  "",
  ...levels.flatMap((level) => [
    `## ${level.name}`,
    "",
    level.goal,
    "",
    ...level.checks.map((item) => `- ${item.ok ? "[OK]" : "[FAIL]"} ${item.name}: ${item.detail}`),
    "",
  ]),
  failed.length ? `Result: FAILED (${failed.length})` : "Result: PASSED",
  "",
].join("\n");
fs.writeFileSync(reportPath, report, "utf8");

if (failed.length) {
  console.error("[ARAY] System architecture levels failed:");
  for (const item of failed) {
    console.error(` - ${item.level}: ${item.name}: ${item.detail}`);
  }
  console.error(`[ARAY] Report: ${path.relative(root, reportPath)}`);
  process.exit(1);
}

console.log(`[ARAY] System architecture levels passed (${rows.length} gates)`);
console.log(`[ARAY] Report: ${path.relative(root, reportPath)}`);
