const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

const checks = [
  {
    file: "app/api/admin/finance/route.ts",
    label: "API keeps order revenue single-counted",
    patterns: [
      "const orderTotal = (order: { totalAmount: unknown }) =>",
      "moneyValue(order.totalAmount)",
      "revenueIncludesDelivery: true",
    ],
    forbidden: [
      "Number(order.totalAmount) + Number(order.deliveryCost)",
      "moneyValue(order.totalAmount) + moneyValue(order.deliveryCost)",
      "totalAmount + deliveryCost",
    ],
  },
  {
    file: "app/api/admin/finance/route.ts",
    label: "API returns deploy-ready finance intelligence",
    patterns: [
      "comparison: {",
      "cashflow: {",
      "readiness,",
      "recommendations,",
      "dataQuality: {",
      "expensesByDay,",
    ],
  },
  {
    file: "app/api/admin/finance/route.ts",
    label: "API connects marketing spend and traffic into finance",
    patterns: [
      "getYandexDirectSpendSummary",
      "getYandexMetrikaTrafficSummary",
      "directSpend",
      "manualAdsRoas",
    ],
  },
  {
    file: "app/api/admin/finance/expenses/route.ts",
    label: "Expense endpoint validates clean human data",
    patterns: [
      "parseExpenseDate",
      "normalizeExpensePayload",
      "Number.isFinite(numericAmount)",
      "payload.date !== undefined",
    ],
  },
  {
    file: "app/admin/finance/page.tsx",
    label: "UI exposes finance readiness, safe cash and recommendations",
    patterns: [
      "FinanceReadinessPanel",
      "data.readiness.score",
      "data.cashflow.safeToSpend",
      "data.recommendations",
      "formatDelta",
    ],
  },
  {
    file: "app/admin/finance/page.tsx",
    label: "UI separates delivery, products and expense movement",
    patterns: [
      "data.productRevenue",
      "data.deliveryRevenue",
      "expenses={data.expensesByDay}",
      "completedOrdersCount",
      "breakEvenDaily",
    ],
  },
  {
    file: "package.json",
    label: "package has finance validation script",
    patterns: ["finance:check", "validate-finance-integration.js"],
  },
];

const failures = [];

for (const check of checks) {
  const text = read(check.file);
  const missing = check.patterns.filter((pattern) => !text.includes(pattern));
  if (missing.length) {
    failures.push(`${check.file}: ${check.label}; missing ${missing.join(", ")}`);
  }

  const forbidden = (check.forbidden || []).filter((pattern) =>
    text.includes(pattern),
  );
  if (forbidden.length) {
    failures.push(
      `${check.file}: ${check.label}; forbidden ${forbidden.join(", ")}`,
    );
  }
}

if (failures.length) {
  console.error("Finance integration check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Finance integration check passed: ${checks.length} gates.`);
