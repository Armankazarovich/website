/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const ts = require("typescript");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const registryPath = path.join(root, "lib", "aray-module-registry.ts");

const allowedCategories = new Set([
  "core",
  "business",
  "marketplace",
  "constructor",
  "analytics",
  "marketing",
  "finance",
  "connector",
]);

const allowedStatuses = new Set(["draft", "beta", "ready", "disabled"]);
const allowedPlans = new Set(["free", "paid", "usage", "enterprise"]);

const requiredIds = [
  "core.design-system",
  "core.module-control-center",
  "core.connector-vault",
  "core.popup-system",
  "core.motion-system",
  "core.app-identity",
  "business.terminal",
  "business.orders",
  "business.role-os",
  "finance.wallet-ledger",
  "marketplace.marketplace",
  "constructor.store-builder",
  "core.aray-voice",
  "core.notifications",
];

const requiredFiles = [
  "lib/aray-module-registry.ts",
  "components/admin/module-control-center.tsx",
  "app/admin/aray/modules/page.tsx",
  "app/api/admin/aray/modules/route.ts",
  "docs/aray-module-system-law-2026-05-07.md",
  "lib/store-constructor-blueprints.ts",
  "app/admin/site/constructor/page.tsx",
  "app/api/admin/site-constructor/blueprints/route.ts",
];

function fail(message) {
  console.error(`[ARAY Modules] ${message}`);
  process.exitCode = 1;
}

function assertArray(value, label) {
  if (!Array.isArray(value)) {
    fail(`${label} must be an array`);
    return [];
  }
  return value;
}

function assertStringArray(value, label) {
  const items = assertArray(value, label);
  for (const item of items) {
    if (!item || typeof item !== "string") {
      fail(`${label} must contain only non-empty strings`);
    }
  }
  return items;
}

function loadRegistry() {
  if (!fs.existsSync(registryPath)) {
    throw new Error("lib/aray-module-registry.ts is missing");
  }

  const source = fs.readFileSync(registryPath, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2019,
    },
    fileName: registryPath,
  }).outputText;

  const module = { exports: {} };
  const context = {
    exports: module.exports,
    module,
    require,
    console,
  };
  vm.runInNewContext(output, context, { filename: registryPath });
  return module.exports.arayModuleRegistry;
}

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), "utf8");
}

function assertIncludes(source, values, label) {
  const missing = values.filter((value) => !source.includes(value));
  if (missing.length) {
    fail(`${label} missing: ${missing.join(", ")}`);
  }
}

function validateModule(module, ids) {
  const label = module && module.id ? module.id : "module";

  if (!module || typeof module !== "object") {
    fail("registry item must be an object");
    return;
  }

  if (!module.id || typeof module.id !== "string") {
    fail(`${label} has missing id`);
  } else if (!/^[a-z]+[a-z0-9-]*\.[a-z0-9]+(?:-[a-z0-9]+)*$/.test(module.id)) {
    fail(`${label} has invalid id format`);
  }

  if (!module.name || typeof module.name !== "string") {
    fail(`${label} has missing name`);
  }

  if (!allowedCategories.has(module.category)) {
    fail(`${label} has invalid category: ${module.category}`);
  }

  if (!allowedStatuses.has(module.status)) {
    fail(`${label} has invalid status: ${module.status}`);
  }

  for (const field of [
    "routes",
    "navItems",
    "permissions",
    "dependencies",
    "settings",
    "events",
    "dataSources",
    "quality",
  ]) {
    assertStringArray(module[field], `${label}.${field}`);
  }

  if (!module.billing || typeof module.billing !== "object") {
    fail(`${label}.billing is missing`);
  } else {
    if (!allowedPlans.has(module.billing.plan)) {
      fail(`${label}.billing.plan is invalid: ${module.billing.plan}`);
    }
    if (module.billing.metering !== undefined) {
      assertStringArray(module.billing.metering, `${label}.billing.metering`);
    }
  }

  if (!module.aray || typeof module.aray !== "object") {
    fail(`${label}.aray is missing`);
  } else {
    assertStringArray(module.aray.skills, `${label}.aray.skills`);
    assertStringArray(module.aray.quickActions, `${label}.aray.quickActions`);
    assertStringArray(module.aray.confirmations, `${label}.aray.confirmations`);
  }

  for (const permission of module.permissions || []) {
    if (!/^[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*)+$/.test(permission)) {
      fail(`${label} has invalid permission: ${permission}`);
    }
  }

  for (const route of module.routes || []) {
    if (!route.startsWith("/")) {
      fail(`${label} route must start with /: ${route}`);
    }
  }

  for (const dependencyId of module.dependencies || []) {
    if (!ids.has(dependencyId)) {
      fail(`${label} references missing dependency: ${dependencyId}`);
    }
  }
}

function validate() {
  console.log("\n[ARAY] Module registry validation");

  for (const relPath of requiredFiles) {
    if (!fs.existsSync(path.join(root, relPath))) {
      fail(`${relPath} is missing`);
    }
  }

  const registry = loadRegistry();

  if (!Array.isArray(registry) || registry.length === 0) {
    fail("arayModuleRegistry must be a non-empty array");
    process.exit(1);
  }

  const ids = new Set();
  for (const module of registry) {
    if (ids.has(module.id)) fail(`duplicate module id: ${module.id}`);
    ids.add(module.id);
  }

  for (const requiredId of requiredIds) {
    if (!ids.has(requiredId)) fail(`required first passport is missing: ${requiredId}`);
  }

  for (const module of registry) {
    validateModule(module, ids);
  }

  assertIncludes(
    read("components/admin/module-control-center.tsx"),
    ["ModuleControlCenter", "AdminModal", "FilterPill", "безопасная карта"],
    "components/admin/module-control-center.tsx",
  );

  assertIncludes(
    read("app/admin/aray/modules/page.tsx"),
    ["ModuleControlCenter", "getArayModuleControlItems", "ADMIN_ROLES"],
    "app/admin/aray/modules/page.tsx",
  );

  assertIncludes(
    read("app/api/admin/aray/modules/route.ts"),
    ["requireAdmin", "getArayModuleControlItems", "getArayModuleRegistrySummary"],
    "app/api/admin/aray/modules/route.ts",
  );

  assertIncludes(
    read("components/admin/admin-navigation-registry.ts"),
    ["/admin/aray/modules", "module control center"],
    "components/admin/admin-navigation-registry.ts",
  );

  assertIncludes(
    read("components/admin/admin-navigation-model.ts"),
    ["/admin/aray/modules", "Модули ARAY", "Паспорта, зависимости"],
    "components/admin/admin-navigation-model.ts",
  );

  assertIncludes(
    read("docs/aray-module-system-law-2026-05-07.md"),
    ["Light / Clear / Working Module Law", "легкий", "понятный", "рабочий", "no fake data"],
    "docs/aray-module-system-law-2026-05-07.md",
  );

  if (process.exitCode) process.exit(process.exitCode);

  const ready = registry.filter((module) => module.status === "ready").length;
  const beta = registry.filter((module) => module.status === "beta").length;
  const draft = registry.filter((module) => module.status === "draft").length;

  console.log(
    `[ARAY Modules] passed: ${registry.length} passports (${ready} ready, ${beta} beta, ${draft} draft)`,
  );
}

validate();
