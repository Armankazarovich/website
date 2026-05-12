/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

const files = {
  navRegistry: "components/admin/admin-navigation-registry.ts",
  navModel: "components/admin/admin-navigation-model.ts",
  moduleRegistry: "lib/aray-module-registry.ts",
};

const moduleIdPattern = "[a-z]+[a-z0-9-]*\\.[a-z0-9]+(?:-[a-z0-9]+)*";

const requiredContracts = [
  {
    moduleId: "core.aray-voice",
    routes: ["/admin/aray", "/admin/aray/agents", "/admin/aray/costs", "/admin/aray-lab"],
  },
  {
    moduleId: "core.connector-vault",
    routes: ["/admin/aray/connectors"],
  },
  {
    moduleId: "core.module-control-center",
    routes: ["/admin/aray/modules"],
  },
  {
    moduleId: "business.terminal",
    routes: ["/admin/orders/new", "/admin/terminals", "/admin/terminals/training"],
  },
  {
    moduleId: "business.orders",
    routes: ["/admin/orders", "/admin/orders/[id]", "/admin/orders/trash"],
  },
  {
    moduleId: "business.role-os",
    routes: ["/admin/business/settings"],
  },
  {
    moduleId: "finance.wallet-ledger",
    routes: ["/admin/finance", "/api/admin/finance", "/api/admin/finance/expenses"],
  },
  {
    moduleId: "core.notifications",
    routes: [
      "/admin/notifications",
      "/api/admin/notifications/count",
      "/api/admin/notifications/telegram-setup",
    ],
  },
];

const errors = [];
const notes = [];

function fail(message) {
  errors.push(message);
}

function read(relPath) {
  const fullPath = path.join(root, relPath);
  if (!fs.existsSync(fullPath)) {
    fail(`${relPath} is missing`);
    return "";
  }
  return fs.readFileSync(fullPath, "utf8");
}

function exists(...segments) {
  return fs.existsSync(path.join(root, ...segments));
}

function normalizeRoute(route) {
  const clean = route.split("#")[0].split("?")[0].replace(/\/$/, "");
  return clean || "/";
}

function unique(values) {
  return Array.from(new Set(values));
}

function extractBalanced(source, start, openChar, closeChar) {
  let depth = 0;
  let inString = null;
  let escaped = false;

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

    if (char === openChar) depth += 1;
    if (char === closeChar) {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }

  return "";
}

function extractAssignedBlock(source, exportName, openChar, closeChar) {
  const startMatch = new RegExp(
    `(?:export\\s+const|const)\\s+${exportName}\\b[^=]*=\\s*\\${openChar}`,
  ).exec(source);

  if (!startMatch) return "";

  const start = startMatch.index + startMatch[0].lastIndexOf(openChar);
  return extractBalanced(source, start, openChar, closeChar);
}

function extractAssignedArray(source, exportName) {
  return extractAssignedBlock(source, exportName, "[", "]");
}

function extractAssignedObject(source, exportName) {
  return extractAssignedBlock(source, exportName, "{", "}");
}

function splitTopLevelObjects(source) {
  const objects = [];
  let depth = 0;
  let start = -1;
  let inString = null;
  let escaped = false;

  for (let index = 0; index < source.length; index += 1) {
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

    if (char === "{") {
      if (depth === 0) start = index;
      depth += 1;
      continue;
    }

    if (char === "}") {
      depth -= 1;
      if (depth === 0 && start !== -1) {
        objects.push(source.slice(start, index + 1));
        start = -1;
      }
    }
  }

  return objects;
}

function extractPropertyArray(source, propertyName) {
  const propertyMatch = new RegExp(`\\b${propertyName}\\s*:\\s*\\[`).exec(source);
  if (!propertyMatch) return [];

  const start = propertyMatch.index + propertyMatch[0].lastIndexOf("[");
  const arrayBlock = extractBalanced(source, start, "[", "]");
  return unique([...arrayBlock.matchAll(/["']([^"']+)["']/g)].map((match) => match[1]));
}

function extractModuleIds(source) {
  return unique(
    [...source.matchAll(new RegExp(`\\bmoduleId\\s*:\\s*["'](${moduleIdPattern})["']`, "g"))]
      .map((match) => match[1]),
  );
}

function extractModuleRegistry(source) {
  const registryArray = extractAssignedArray(source, "arayModuleRegistry");
  if (!registryArray) {
    fail("lib/aray-module-registry.ts must export arayModuleRegistry as an array");
    return new Map();
  }

  const modules = new Map();
  for (const item of splitTopLevelObjects(registryArray)) {
    const id = /\bid\s*:\s*["']([^"']+)["']/.exec(item)?.[1];
    if (!id) {
      fail("arayModuleRegistry contains a passport without id");
      continue;
    }
    if (modules.has(id)) {
      fail(`duplicate ARAY module passport id: ${id}`);
      continue;
    }

    modules.set(id, {
      id,
      status: /\bstatus\s*:\s*["']([^"']+)["']/.exec(item)?.[1] || "unknown",
      routes: extractPropertyArray(item, "routes").map(normalizeRoute),
      dependencies: extractPropertyArray(item, "dependencies"),
    });
  }

  return modules;
}

function addRouteOwner(routeOwners, route, moduleId, origin) {
  const normalizedRoute = normalizeRoute(route);
  const existing = routeOwners.get(normalizedRoute);

  if (existing && existing.moduleId !== moduleId) {
    fail(
      `${normalizedRoute} has conflicting module owners: ${existing.moduleId} (${existing.origins.join(", ")}) and ${moduleId} (${origin})`,
    );
    return;
  }

  routeOwners.set(normalizedRoute, {
    moduleId,
    origins: unique([...(existing?.origins || []), origin]),
  });
}

function extractArrayRouteOwners(source, exportName, origin, routeOwners) {
  const arrayBlock = extractAssignedArray(source, exportName);
  for (const item of splitTopLevelObjects(arrayBlock)) {
    const href = /\bhref\s*:\s*["']([^"']+)["']/.exec(item)?.[1];
    const moduleId = new RegExp(`\\bmoduleId\\s*:\\s*["'](${moduleIdPattern})["']`).exec(item)?.[1];
    if (href && moduleId) addRouteOwner(routeOwners, href, moduleId, origin);
  }
}

function extractObjectRouteOwners(source, exportName, origin, routeOwners) {
  const objectBlock = extractAssignedObject(source, exportName);
  if (!objectBlock) return;

  const body = objectBlock.slice(1, -1);
  for (const item of splitTopLevelObjects(body)) {
    const href = /\bhref\s*:\s*["']([^"']+)["']/.exec(item)?.[1];
    const moduleId = new RegExp(`\\bmoduleId\\s*:\\s*["'](${moduleIdPattern})["']`).exec(item)?.[1];
    if (href && moduleId) addRouteOwner(routeOwners, href, moduleId, origin);
  }
}

function hasRecursiveRouteFile(dir) {
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return false;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isFile() && entry.name === "route.ts") return true;
    if (entry.isDirectory() && hasRecursiveRouteFile(fullPath)) return true;
  }

  return false;
}

function routeSegments(route) {
  return route.split("/").filter(Boolean);
}

function hasAdminRouteFile(route) {
  const dirSegments = ["app", ...routeSegments(route)];
  const dynamicRoute = routeSegments(route).some((segment) => /^\[.+\]$/.test(segment));

  if (dynamicRoute) {
    return exists(...dirSegments, "page.tsx");
  }

  return exists(...dirSegments, "page.tsx") || exists(...dirSegments, "layout.tsx");
}

function hasApiRouteFile(route) {
  if (route.endsWith("/*")) {
    const base = route.slice(0, -2);
    return hasRecursiveRouteFile(path.join(root, "app", ...routeSegments(base)));
  }

  return exists("app", ...routeSegments(route), "route.ts");
}

function routeHasRuntimeFile(route) {
  if (route.startsWith("/admin/") || route === "/admin") return hasAdminRouteFile(route);
  if (route.startsWith("/api/")) return hasApiRouteFile(route);
  return true;
}

function describeRouteExpectation(route) {
  if (route.startsWith("/api/")) {
    if (route.endsWith("/*")) return `route.ts below app${route.slice(0, -2)}/`;
    return `app${route}/route.ts`;
  }

  if (route.startsWith("/admin/") || route === "/admin") {
    if (routeSegments(route).some((segment) => /^\[.+\]$/.test(segment))) {
      return `app${route}/page.tsx`;
    }
    return `app${route}/page.tsx or app${route}/layout.tsx`;
  }

  return `runtime route for ${route}`;
}

function coversRoute(routes, route) {
  if (routes.includes(route)) return true;
  if (!route.startsWith("/api/")) return false;

  return routes.some((registeredRoute) => {
    if (!registeredRoute.endsWith("/*")) return false;
    const prefix = registeredRoute.slice(0, -1);
    const exactBase = registeredRoute.slice(0, -2);
    return route === exactBase || route.startsWith(prefix);
  });
}

function validate() {
  console.log("\n[ARAY] Module navigation foundation check");

  const navRegistrySource = read(files.navRegistry);
  const navModelSource = read(files.navModel);
  const moduleRegistrySource = read(files.moduleRegistry);
  const modules = extractModuleRegistry(moduleRegistrySource);
  const routeOwners = new Map();

  extractArrayRouteOwners(navRegistrySource, "allNavItems", files.navRegistry, routeOwners);
  extractObjectRouteOwners(navRegistrySource, "ADMIN_ROUTE_CLASSIFICATIONS", files.navRegistry, routeOwners);
  extractObjectRouteOwners(navModelSource, "SPECIAL_QUICK", files.navModel, routeOwners);

  const usedModuleIds = unique([
    ...extractModuleIds(navRegistrySource),
    ...extractModuleIds(navModelSource),
  ]);

  for (const moduleId of usedModuleIds) {
    if (!modules.has(moduleId)) {
      fail(`navigation references missing ARAY module passport: ${moduleId}`);
    }
  }

  for (const [route, owner] of routeOwners.entries()) {
    const module = modules.get(owner.moduleId);
    if (!module) continue;

    if (!coversRoute(module.routes, route)) {
      fail(
        `${owner.moduleId} owns ${route} in ${owner.origins.join(", ")}, but lib/aray-module-registry.ts routes does not cover it`,
      );
    }
  }

  for (const { moduleId, routes } of requiredContracts) {
    const module = modules.get(moduleId);
    if (!module) {
      fail(`required ARAY module passport is missing: ${moduleId}`);
      continue;
    }

    for (const route of routes.map(normalizeRoute)) {
      const enforceable =
        route.startsWith("/api/") ||
        routeOwners.has(route) ||
        (route.startsWith("/admin/") && hasAdminRouteFile(route));

      if (!enforceable) {
        notes.push(`${moduleId}: ${route}`);
        continue;
      }

      if (!coversRoute(module.routes, route)) {
        fail(`${moduleId}.routes must cover ${route}`);
      }
    }
  }

  for (const module of modules.values()) {
    for (const dependencyId of module.dependencies) {
      if (!modules.has(dependencyId)) {
        fail(`${module.id} references missing dependency: ${dependencyId}`);
      }
    }

    for (const route of module.routes) {
      if (module.status === "draft" && (route.startsWith("/admin") || route.startsWith("/cabinet"))) {
        fail(`${module.id} is draft but declares working UI route: ${route}`);
        continue;
      }

      if (!route.startsWith("/")) {
        fail(`${module.id}.routes contains non-absolute route: ${route}`);
        continue;
      }

      if (!routeHasRuntimeFile(route)) {
        fail(`${module.id}.routes includes ${route}, but ${describeRouteExpectation(route)} is missing`);
      }
    }
  }

  if (errors.length > 0) {
    console.error("\n[ARAY Module Navigation] failed:");
    for (const error of errors) console.error(` - ${error}`);
    process.exit(1);
  }

  if (notes.length > 0) {
    console.log(
      `[ARAY Module Navigation] skipped audit route(s) not declared in navigation/classifications and without app route: ${notes.join(", ")}`,
    );
  }

  console.log(
    `[ARAY Module Navigation] passed: ${modules.size} passports, ${usedModuleIds.length} navigation module ids, ${routeOwners.size} owned routes`,
  );
}

validate();
