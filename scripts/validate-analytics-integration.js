const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

const checks = [
  {
    file: "app/api/admin/analytics/route.ts",
    label: "API supports deploy-ready period controls",
    patterns: ["RANGE_DAYS", "parseRangeDays", "previousFrom", "percentChange"],
  },
  {
    file: "app/api/admin/analytics/route.ts",
    label: "API returns marketing readiness and funnel",
    patterns: [
      "getStoredMetrikaGoals",
      "readinessItems",
      "readinessScore",
      "funnel",
      "clickToGoalRate",
    ],
  },
  {
    file: "app/api/admin/analytics/route.ts",
    label: "API reads live Direct and Metrika sources",
    patterns: ["getYandexDirectSpendSummary", "getYandexMetrikaTrafficSummary"],
  },
  {
    file: "app/admin/analytics/page.tsx",
    label: "UI exposes period switcher and comparison",
    patterns: [
      "RANGE_OPTIONS",
      "setRangeDays",
      "periodSubtitle",
      "formatDelta",
    ],
  },
  {
    file: "app/admin/analytics/page.tsx",
    label: "UI exposes readiness, funnel and Direct campaigns",
    patterns: [
      "data.readiness.score",
      "data.funnel.directClicks",
      "direct.campaigns",
      "sensitiveDataLimited",
    ],
  },
  {
    file: "package.json",
    label: "package has analytics validation script",
    patterns: ["analytics:check", "validate-analytics-integration.js"],
  },
];

const failures = [];

for (const check of checks) {
  const text = read(check.file);
  const missing = check.patterns.filter((pattern) => !text.includes(pattern));
  if (missing.length) {
    failures.push(`${check.file}: ${check.label}; missing ${missing.join(", ")}`);
  }
}

if (failures.length) {
  console.error("Analytics integration check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Analytics integration check passed: ${checks.length} gates.`);
