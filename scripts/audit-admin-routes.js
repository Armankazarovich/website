const fs = require("fs");
const path = require("path");

const root = process.cwd();
const appRoot = path.join(root, "app");
const sources = [
  path.join(root, "components", "admin", "admin-nav.tsx"),
  path.join(root, "components", "admin", "admin-shell.tsx"),
  path.join(root, "components", "admin", "admin-menu-popup.tsx"),
  path.join(root, "components", "admin", "admin-search.tsx"),
  path.join(root, "components", "admin", "dashboard-actions.tsx"),
  path.join(root, "components", "store", "account-drawer.tsx"),
];

function read(file) {
  try {
    return fs.readFileSync(file, "utf8");
  } catch {
    return "";
  }
}

function normalizeHref(href) {
  if (!href.startsWith("/admin")) return null;
  if (href.includes("${") || href.includes("`")) return null;
  const clean = href.split("?")[0].split("#")[0];
  return clean.replace(/\/$/, "") || "/admin";
}

function routeExists(route) {
  if (route === "/admin") return fs.existsSync(path.join(appRoot, "admin", "page.tsx"));
  const parts = route.split("/").filter(Boolean);
  const concretePath = path.join(appRoot, ...parts, "page.tsx");
  if (fs.existsSync(concretePath)) return true;

  const dynamicParts = [...parts];
  for (let i = dynamicParts.length - 1; i >= 0; i -= 1) {
    if (dynamicParts[i] && !dynamicParts[i].startsWith("[") && i > 0) {
      const candidate = [...dynamicParts];
      candidate[i] = "[id]";
      if (fs.existsSync(path.join(appRoot, ...candidate, "page.tsx"))) return true;
    }
  }

  return false;
}

const routeRefs = new Map();

for (const file of sources) {
  const text = read(file);
  if (!text) continue;
  const matches = text.matchAll(/["'`]((?:\/admin)[^"'`\s<>)]+)/g);
  for (const match of matches) {
    const href = normalizeHref(match[1]);
    if (!href) continue;
    if (!routeRefs.has(href)) routeRefs.set(href, new Set());
    routeRefs.get(href).add(path.relative(root, file).replace(/\\/g, "/"));
  }
}

const rows = [...routeRefs.entries()]
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([href, files]) => ({
    href,
    exists: routeExists(href),
    files: [...files].sort(),
  }));

const missing = rows.filter((row) => !row.exists);
const report = {
  checkedAt: new Date().toISOString(),
  total: rows.length,
  missing: missing.length,
  routes: rows,
};

const outDir = path.join(root, "docs", "audits");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(
  path.join(outDir, "admin-routes-audit.json"),
  JSON.stringify(report, null, 2),
  "utf8"
);

if (missing.length > 0) {
  console.log("Missing admin routes:");
  for (const row of missing) {
    console.log(`- ${row.href} (${row.files.join(", ")})`);
  }
  process.exitCode = 1;
} else {
  console.log(`Admin routes OK (${rows.length} checked).`);
}
