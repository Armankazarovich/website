/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

const files = {
  registry: "components/admin/admin-navigation-registry.ts",
  nav: "components/admin/admin-nav.tsx",
  model: "components/admin/admin-navigation-model.ts",
  structure: "components/admin/admin-nav-structure.ts",
  search: "components/admin/use-admin-smart-search.tsx",
  rail: "components/admin/admin-nav-rail.tsx",
  mobile: "components/admin/admin-mobile-bottom-nav.tsx",
  account: "components/store/account-drawer.tsx",
  shell: "components/admin/admin-shell.tsx",
  arayWidget: "components/store/aray-widget.tsx",
  arayEvents: "components/store/aray-events.ts",
  dock: "components/store/aray-dock.tsx",
  moduleRegistry: "lib/aray-module-registry.ts",
};

const guardedFiles = {
  search: "smart search must use the unified navigation/search context",
  rail: "desktop rail must use the unified navigation groups/subtitles",
  mobile: "mobile dock must use the unified navigation groups",
  account: "account drawer quick actions must use the unified navigation context",
  shell: "page header metadata must come from the unified navigation model",
};

const requiredModelExports = [
  "ADMIN_NAVIGATION_META",
  "getAdminNavigationPageMeta",
  "getAdminNavigationSearchContext",
  "buildAdminNavigationGroups",
  "getAdminNavigationMobileCapsule",
  "getAdminNavigationAutomationLaw",
];

const requiredRegistryExports = [
  "allNavItems",
  "ADMIN_ROUTE_CLASSIFICATIONS",
  "getAdminRouteClassification",
  "ArayIcon",
];

const allowedStorePrefixes = [
  "/catalog",
  "/cart",
  "/checkout",
  "/product",
  "/track",
  "/wishlist",
];

const utilityRouteParents = new Map([
  ["/admin/aray/agents", "/admin/aray"],
  ["/admin/aray/costs", "/admin/aray"],
  ["/admin/aray-lab", "/admin/aray"],
  ["/admin/delivery/rates", "/admin/delivery"],
  ["/admin/images/fix", "/admin/media"],
  ["/admin/orders/trash", "/admin/orders"],
  ["/admin/products/import-prices", "/admin/products"],
  ["/admin/products/table", "/admin/products"],
  ["/admin/watermark/recovery", "/admin/watermark"],
  ["/admin/workflows", "/admin/crm"],
]);

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), "utf8");
}

function exists(relPath) {
  return fs.existsSync(path.join(root, relPath));
}

function fail(message) {
  console.error(`[ARAY Navigation Model] ${message}`);
  process.exit(1);
}

function normalizeHref(href) {
  const clean = href.split("#")[0].split("?")[0].replace(/\/$/, "");
  return clean || "/";
}

function unique(values) {
  return Array.from(new Set(values));
}

function extractBracketedArray(source, exportName) {
  const startMatch = new RegExp(`(?:export\\s+const|const)\\s+${exportName}\\b[^=]*=\\s*\\[`).exec(source);
  if (!startMatch) return "";

  let depth = 0;
  let inString = null;
  let escaped = false;
  const start = startMatch.index + startMatch[0].lastIndexOf("[");

  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === inString) {
        inString = null;
      }
      continue;
    }

    if (char === "\"" || char === "'" || char === "`") {
      inString = char;
      continue;
    }
    if (char === "[") depth += 1;
    if (char === "]") {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }

  return "";
}

function extractAssignedObject(source, exportName) {
  const startMatch = new RegExp(`(?:export\\s+const|const)\\s+${exportName}\\b[^=]*=\\s*\\{`).exec(source);
  if (!startMatch) return "";

  let depth = 0;
  let inString = null;
  let escaped = false;
  const start = startMatch.index + startMatch[0].lastIndexOf("{");

  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === inString) {
        inString = null;
      }
      continue;
    }

    if (char === "\"" || char === "'" || char === "`") {
      inString = char;
      continue;
    }
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }

  return "";
}

function extractHrefEntries(source) {
  return [...source.matchAll(/\bhref:\s*["']([^"']+)["']/g)].map((match) => match[1]);
}

function extractRegistryEntries(registrySource) {
  const registryNav = extractBracketedArray(registrySource, "allNavItems");
  const entries = new Map();

  for (const line of registryNav.split(/\r?\n/)) {
    const hrefMatch = /\bhref:\s*["']([^"']+)["']/.exec(line);
    if (!hrefMatch) continue;
    const groupMatch = /\bgroup:\s*["']([^"']+)["']/.exec(line);
    const sectionMatch = /\bsection:\s*["']([^"']+)["']/.exec(line);
    entries.set(normalizeHref(hrefMatch[1]), {
      group: groupMatch?.[1] || "",
      section: sectionMatch?.[1] || "",
      line: line.trim(),
    });
  }

  return entries;
}

function extractStringArrayValues(source, exportName) {
  return unique([...extractBracketedArray(source, exportName).matchAll(/["']([^"']+)["']/g)]
    .map((match) => match[1]));
}

function extractObjectKeys(source, exportName) {
  return unique([...extractAssignedObject(source, exportName).matchAll(/^\s*([A-Za-z0-9_-]+):/gm)]
    .map((match) => match[1]));
}

function extractModuleIds(source) {
  return unique([...source.matchAll(/\b(?:id|moduleId):\s*["']([a-z]+[a-z0-9-]*\.[a-z0-9]+(?:-[a-z0-9]+)*)["']/g)]
    .map((match) => match[1]));
}

function extractStructureGroups(structureSource) {
  const structureObject = extractAssignedObject(structureSource, "ADMIN_NAV_SECTIONS");
  const hrefGroups = new Map();
  let activeGroup = null;

  for (const line of structureObject.split(/\r?\n/)) {
    const groupMatch = /^\s{2}([A-Za-z0-9_-]+):\s*\[/.exec(line);
    if (groupMatch) {
      activeGroup = groupMatch[1];
      continue;
    }
    if (activeGroup && /^\s{2}\],?/.test(line)) {
      activeGroup = null;
      continue;
    }
    if (!activeGroup) continue;

    for (const match of line.matchAll(/["'](\/(?:admin|cabinet|catalog)[^"']*)["']/g)) {
      const href = normalizeHref(match[1]);
      const groups = hrefGroups.get(href) || [];
      groups.push(activeGroup);
      hrefGroups.set(href, groups);
    }
  }

  return hrefGroups;
}

function extractRawNavHrefs(registrySource, navSource, modelSource) {
  const registryNav = extractBracketedArray(registrySource, "allNavItems");
  if (registryNav) return extractHrefEntries(registryNav).map(normalizeHref);

  const navRegistry = extractBracketedArray(navSource, "allNavItems");
  if (navRegistry) return extractHrefEntries(navRegistry).map(normalizeHref);

  const modelRegistry =
    extractBracketedArray(modelSource, "allNavItems") ||
    extractBracketedArray(modelSource, "ADMIN_NAVIGATION_REGISTRY") ||
    extractBracketedArray(modelSource, "ADMIN_NAV_ITEMS");

  if (modelRegistry) return extractHrefEntries(modelRegistry).map(normalizeHref);

  return extractHrefEntries(`${navSource}\n${modelSource}`).map(normalizeHref);
}

function extractNavHrefs(registrySource, navSource, modelSource) {
  return unique(extractRawNavHrefs(registrySource, navSource, modelSource));
}

function extractMetaRoutes(modelSource) {
  return unique([...modelSource.matchAll(/["'](\/(?:admin|cabinet|catalog)[^"']*)["']\s*:/g)]
    .map((match) => normalizeHref(match[1])));
}

function extractClassificationRoutes(registrySource) {
  return unique([...registrySource.matchAll(/["'](\/(?:admin|cabinet)[^"']*)["']\s*:/g)]
    .map((match) => normalizeHref(match[1])));
}

function assertArayIdentity(registrySource, searchSource, modelSource, arayWidgetSource) {
  if (!registrySource.includes("ArayIcon")) {
    fail("admin-navigation-registry.ts must import/use ArayIcon for ARAY identity");
  }

  const arayRegistryLines = registrySource
    .split(/\r?\n/)
    .filter((line) => line.includes("/admin/aray") || line.includes("ARAY AI") || line.includes("Настройки ARAY"));
  const brokenRegistryLines = arayRegistryLines.filter((line) =>
    /\bicon:\s*(Sparkles|Receipt|Network|Wallet|Settings|Users)\b/.test(line),
  );

  if (brokenRegistryLines.length > 0) {
    fail(`ARAY navigation entries must use ArayIcon/ArayOrb, not random lucide icons: ${brokenRegistryLines.join(" | ")}`);
  }

  const araySearchLines = searchSource
    .split(/\r?\n/)
    .filter((line) => line.includes("ARAY") && line.includes("icon:"));
  const brokenSearchLines = araySearchLines.filter((line) =>
    /\bicon:\s*(Sparkles|Receipt|Network|Wallet|Settings|Users)\b/.test(line),
  );

  if (brokenSearchLines.length > 0) {
    fail(`ARAY search/quick actions must use ArayIcon/ArayOrb or a text-only ARAY badge: ${brokenSearchLines.join(" | ")}`);
  }

  if (!modelSource.includes("arayIdentityRule")) {
    fail("admin-navigation-model.ts automation law must document the ARAY identity rule");
  }

  if (!arayWidgetSource.includes('import { ArayIcon, ArayOrb } from "@/components/shared/aray-orb"')) {
    fail("ArayWidget must use the shared ArayIcon/ArayOrb identity from components/shared/aray-orb");
  }

  if (/\bfunction\s+ArayIcon\b/.test(arayWidgetSource)) {
    fail("ArayWidget must not define a local ArayIcon duplicate; use the shared ARAY identity component");
  }
}

function assertArayEventContract(modelSource) {
  if (!exists(files.arayEvents)) {
    fail("components/store/aray-events.ts is missing; ARAY open/voice/prompt actions must use one shared event helper");
  }

  const arayEventsSource = read(files.arayEvents);
  for (const exportName of ["requestArayOpen", "requestArayClose", "requestArayPrompt"]) {
    if (!arayEventsSource.includes(exportName)) {
      fail(`aray-events.ts must export ${exportName}`);
    }
  }

  for (const fileKey of ["dock", "rail", "shell"]) {
    const source = read(files[fileKey]);
    if (!source.includes("aray-events")) {
      fail(`${files[fileKey]} must use components/store/aray-events for ARAY open/voice/prompt wiring`);
    }
  }

  if (!modelSource.includes("arayEventRule")) {
    fail("admin-navigation-model.ts automation law must document the shared ARAY event rule");
  }
}

function assertNavigationOsPlacement(registrySource, structureSource, modelSource, accountSource) {
  const expectedGroups = new Map([
    ["/admin", "main"],
    ["/admin/orders/new", "sales"],
    ["/admin/orders", "sales"],
    ["/admin/delivery", "sales"],
    ["/admin/clients", "sales"],
    ["/admin/crm", "sales"],
    ["/admin/workflows", "sales"],
    ["/admin/tasks", "sales"],
    ["/admin/products", "products"],
    ["/admin/products/new", "products"],
    ["/admin/products/audit", "products"],
    ["/admin/categories", "products"],
    ["/admin/inventory", "products"],
    ["/admin/media", "products"],
    ["/admin/watermark", "products"],
    ["/admin/import", "products"],
    ["/admin/promotion", "marketing"],
    ["/admin/promotions", "marketing"],
    ["/admin/reviews", "marketing"],
    ["/admin/email", "marketing"],
    ["/admin/notifications", "marketing"],
    ["/admin/analytics", "marketing"],
    ["/admin/posts", "marketing"],
    ["/admin/services", "marketing"],
    ["/admin/stories", "marketing"],
    ["/admin/finance", "finance"],
    ["/admin/aray", "arayCms"],
    ["/admin/settings", "settings"],
    ["/admin/business/settings", "settings"],
    ["/admin/site", "settings"],
    ["/admin/appearance", "settings"],
    ["/admin/terminals", "settings"],
    ["/admin/staff", "settings"],
    ["/admin/health", "settings"],
    ["/admin/help", "help"],
    ["/admin/terminals/training", "help"],
  ]);

  const registryEntries = extractRegistryEntries(registrySource);
  const structureGroups = extractStructureGroups(structureSource);

  for (const [href, expectedGroup] of expectedGroups.entries()) {
    const entry = registryEntries.get(href);
    if (!entry) {
      fail(`${href} must exist in allNavItems so navigation, search and drawer share one source`);
    }
    if (entry.group !== expectedGroup) {
      fail(`${href} must belong to group "${expectedGroup}", got "${entry.group}"`);
    }

    const sectionGroups = structureGroups.get(href) || [];
    const wrongSectionGroups = sectionGroups.filter((group) => group !== expectedGroup);
    if (wrongSectionGroups.length > 0) {
      fail(`${href} appears in wrong ADMIN_NAV_SECTIONS group(s): ${unique(wrongSectionGroups).join(", ")}`);
    }
  }

  const groupOrder = extractStringArrayValues(structureSource, "ADMIN_NAV_GROUP_ORDER");
  const labelGroups = extractObjectKeys(registrySource, "GROUP_LABELS");
  const registryGroups = unique([...registryEntries.values()].map((entry) => entry.group).filter(Boolean));
  const structureGroupKeys = extractObjectKeys(structureSource, "ADMIN_NAV_SECTIONS");

  for (const group of unique([...registryGroups, ...structureGroupKeys])) {
    if (!groupOrder.includes(group)) {
      fail(`navigation group "${group}" is used but missing from ADMIN_NAV_GROUP_ORDER`);
    }
    if (!labelGroups.includes(group)) {
      fail(`navigation group "${group}" is used but missing from GROUP_LABELS`);
    }
  }

  const forbiddenQuickRules = [
    [/export const GROUP_LABEL_KEYS[\s\S]*\bsales:\s*["']sales["'][\s\S]*?};/s, "Sales group label must stay 'Продажи', not the old translated 'Продажи и терминал'"],
    [/export const GROUP_LABEL_KEYS[\s\S]*\bproducts:\s*["']products["'][\s\S]*?};/s, "Products group label must stay 'Магазин', not a generic catalog translation"],
    [/aray:\s*\[[^\]]*["']\/admin\/settings["']/s, "ARAY quick links must not send users to generic settings"],
    [/finance:\s*\[[^\]]*["']\/admin\/aray\/costs["']/s, "Finance quick links must not own ARAY budget settings"],
    [/DEFAULT_ADMIN_QUICK_HREFS\s*=\s*\[[^\]]*["']\/admin\/business\/settings["']/s, "Default quick links must not hide business settings outside Settings"],
  ];

  for (const [pattern, message] of forbiddenQuickRules) {
    if (pattern.test(modelSource)) fail(message);
  }

  const forbiddenAccountLists = [
    "arayItems",
    "salesOperationItems",
    "businessItems",
    "marketingItems",
    "financeItems",
    "staffSystemItems",
  ];

  for (const name of forbiddenAccountLists) {
    if (new RegExp(`\\bconst\\s+${name}\\b`).test(accountSource)) {
      fail(`account drawer must not define manual staff navigation list "${name}"; use buildAdminNavigationGroups()`);
    }
  }
}

function assertNavigationConsumerAutomation(mobileSource, railSource, accountSource) {
  if (!mobileSource.includes("buildAdminNavigationGroups")) {
    fail("admin mobile menu must build groups from the unified navigation registry/model");
  }
  if (!mobileSource.includes("getAdminNavigationMobileCapsule")) {
    fail("admin mobile dock tabs and capsule must come from getAdminNavigationMobileCapsule()");
  }
  if (!mobileSource.includes("buildAdminNavSections")) {
    fail("admin mobile menu must use admin-nav-structure sections, not a local manual layout");
  }
  if (!mobileSource.includes("admin-mobile-menu-capsule")) {
    fail("admin mobile menu must render the generated context capsule for current section quick actions");
  }
  if (/\bselectedGroupItems\b|\bhiddenSelectedItemsCount\b/.test(mobileSource)) {
    fail("admin mobile menu must render the full generated section tree; do not cap/hide group items manually");
  }
  if (!railSource.includes("buildAdminNavSections")) {
    fail("desktop rail popup must use admin-nav-structure sections");
  }
  if (!accountSource.includes("buildAdminNavigationGroups")) {
    fail("account drawer staff navigation must use buildAdminNavigationGroups()");
  }
}

function assertModuleNavigationContracts(registrySource, modelSource, mobileSource, moduleRegistrySource) {
  const knownModuleIds = new Set(extractModuleIds(moduleRegistrySource));
  const usedModuleIds = unique([
    ...extractModuleIds(registrySource),
    ...extractModuleIds(modelSource),
  ]);

  for (const moduleId of usedModuleIds) {
    if (!knownModuleIds.has(moduleId)) {
      fail(`navigation references missing ARAY module passport: ${moduleId}`);
    }
  }

  const requiredModuleContracts = [
    "core.module-control-center",
    "core.connector-vault",
    "core.aray-voice",
    "business.orders",
    "business.role-os",
    "business.terminal",
    "core.notifications",
    "constructor.store-builder",
  ];

  for (const moduleId of requiredModuleContracts) {
    if (!usedModuleIds.includes(moduleId)) {
      fail(`navigation/module automation must reference ${moduleId}`);
    }
  }

  if (!modelSource.includes("MOBILE_DOCK_LABELS") || !modelSource.includes('"Модули"')) {
    fail("admin-navigation-model.ts must define compact mobile dock labels for long ARAY/module actions");
  }

  if (!modelSource.includes("mobileCapsuleRule")) {
    fail("admin-navigation-model.ts automation law must document the mobile capsule rule");
  }

  if (!registrySource.includes('moduleId: "core.connector-vault"') || !registrySource.includes('roles: [SA, "ADMIN"]')) {
    fail("/admin/aray/connectors classification must be ADMIN+ and owned by core.connector-vault");
  }

  if (!mobileSource.includes("compactLabel")) {
    fail("admin mobile dock must render compact labels from the navigation capsule");
  }
}

function routeToPageRel(route) {
  if (route === "/admin") return "app/admin/page.tsx";
  if (route === "/cabinet") return "app/cabinet/page.tsx";
  return `app${route}/page.tsx`.replace(/\//g, path.sep);
}

function pageRelToRoute(relPath) {
  return relPath
    .replace(/\\/g, "/")
    .replace(/^app/, "")
    .replace(/\/page\.tsx$/, "") || "/";
}

function listPages(dirRel) {
  const dir = path.join(root, dirRel);
  if (!fs.existsSync(dir)) return [];

  const pages = [];
  const walk = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && entry.name === "page.tsx") {
        pages.push(path.relative(root, fullPath));
      }
    }
  };

  walk(dir);
  return pages.sort();
}

function isExternalHref(href) {
  return /^(https?:|mailto:|tel:|#)/.test(href);
}

function isStoreHref(href) {
  return allowedStorePrefixes.some((prefix) => href === prefix || href.startsWith(`${prefix}/`));
}

function findCoveringParent(route, classifiedRoutes) {
  const configuredParent = utilityRouteParents.get(route);
  if (configuredParent && classifiedRoutes.has(configuredParent)) return configuredParent;

  const parts = route.split("/").filter(Boolean);
  const isDynamicDetail = parts.some((part) => /^\[.+\]$/.test(part));
  if (!isDynamicDetail) return null;

  for (let length = parts.length - 1; length >= 1; length -= 1) {
    const parent = `/${parts.slice(0, length).join("/")}`;
    if (classifiedRoutes.has(parent)) return parent;
  }

  return null;
}

function assertGuardedFile(fileKey, reason) {
  const relPath = files[fileKey];
  if (!exists(relPath)) {
    fail(`${relPath} is missing (${reason})`);
  }

  const source = read(relPath);
  if (!source.includes("admin-navigation-model")) {
    fail(`${relPath} must use components/admin/admin-navigation-model (${reason})`);
  }
}

const registrySource = read(files.registry);
const navSource = read(files.nav);
const modelSource = read(files.model);
const structureSource = read(files.structure);
const searchSource = read(files.search);
const accountSource = read(files.account);
const mobileSource = read(files.mobile);
const railSource = read(files.rail);
const arayWidgetSource = read(files.arayWidget);
const moduleRegistrySource = read(files.moduleRegistry);
const rawNavHrefs = extractRawNavHrefs(registrySource, navSource, modelSource);
const navHrefs = extractNavHrefs(registrySource, navSource, modelSource);
const metaRoutes = extractMetaRoutes(modelSource);
const classificationRoutes = extractClassificationRoutes(registrySource);
const classifiedRoutes = new Set([...navHrefs, ...metaRoutes, ...classificationRoutes]);
const duplicateHrefs = rawNavHrefs.filter((href, index) => rawNavHrefs.indexOf(href) !== index);

if (navHrefs.length < 10) {
  fail("navigation registry did not expose enough href entries; allNavItems/admin registry may be broken.");
}

if (duplicateHrefs.length > 0) {
  fail(`duplicate navigation hrefs: ${unique(duplicateHrefs).join(", ")}`);
}

for (const exportName of requiredModelExports) {
  if (!modelSource.includes(exportName)) {
    fail(`admin-navigation-model.ts must export ${exportName}`);
  }
}

for (const exportName of requiredRegistryExports) {
  if (!registrySource.includes(exportName)) {
    fail(`admin-navigation-registry.ts must export/include ${exportName}`);
  }
}

assertArayIdentity(registrySource, searchSource, modelSource, arayWidgetSource);
assertArayEventContract(modelSource);
assertNavigationOsPlacement(registrySource, structureSource, modelSource, accountSource);
assertNavigationConsumerAutomation(mobileSource, railSource, accountSource);
assertModuleNavigationContracts(registrySource, modelSource, mobileSource, moduleRegistrySource);

if (!structureSource.includes("ADMIN_NAV_GROUP_ORDER") || !structureSource.includes("buildAdminNavSections")) {
  fail("admin-nav-structure.ts must expose the navigation group registry and section builder");
}

const missingNavPages = navHrefs
  .filter((href) => !isExternalHref(href))
  .filter((href) => href.startsWith("/admin") || href.startsWith("/cabinet") || !isStoreHref(href))
  .filter((href) => !exists(routeToPageRel(href)));

if (missingNavPages.length > 0) {
  fail(`direct navigation hrefs without page or explicit store/external allowance: ${missingNavPages.join(", ")}`);
}

const adminAndCabinetPages = [
  ...listPages("app/admin"),
  ...listPages("app/cabinet"),
].map(pageRelToRoute);

const unclassifiedPages = adminAndCabinetPages.filter((route) => {
  if (classifiedRoutes.has(route)) return false;
  return !findCoveringParent(route, classifiedRoutes);
});

if (unclassifiedPages.length > 0) {
  fail(`app/admin and app/cabinet pages without navigation meta/classification or parent detail/utility coverage: ${unclassifiedPages.join(", ")}`);
}

for (const [fileKey, reason] of Object.entries(guardedFiles)) {
  assertGuardedFile(fileKey, reason);
}

console.log(
  `[ARAY Navigation Model] passed: ${navHrefs.length} navigation hrefs, ${metaRoutes.length} meta routes, ${classificationRoutes.length} classified routes, ${adminAndCabinetPages.length} app pages, ${Object.keys(guardedFiles).length} guarded files`,
);
