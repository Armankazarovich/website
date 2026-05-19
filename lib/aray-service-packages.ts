export const ARC_RUB_RATE = 50;

export type ArayServicePackageCode =
  | "start"
  | "growth"
  | "pro"
  | "partner"
  | "enterprise";

export type ArayServicePackage = {
  code: ArayServicePackageCode;
  title: string;
  statusLabel: string;
  monthlyArc: number;
  includedModules: string[];
  supportScope: string[];
  unlocks: string[];
  renewal: "manual" | "auto";
  audience: string;
};

export const ARAY_SERVICE_PACKAGES: ArayServicePackage[] = [
  {
    code: "start",
    title: "Start",
    statusLabel: "Zapusk",
    monthlyArc: 600,
    includedModules: ["storefront", "crm-basic", "analytics-basic", "notifications"],
    supportScope: ["site-care", "catalog-care", "basic-aray-help"],
    unlocks: ["public-site", "orders", "basic-reports"],
    renewal: "manual",
    audience: "Small business that needs a clean site, orders and basic control.",
  },
  {
    code: "growth",
    title: "Growth",
    statusLabel: "Rost",
    monthlyArc: 1800,
    includedModules: ["storefront", "crm", "direct-draft", "metrika", "tasks", "notifications"],
    supportScope: ["marketing-care", "monthly-checklist", "conversion-review"],
    unlocks: ["direct-readiness", "utm-control", "crm-workflows", "weekly-reports"],
    renewal: "auto",
    audience: "Business that already sells and wants marketing, CRM and reports together.",
  },
  {
    code: "pro",
    title: "Pro",
    statusLabel: "Professional",
    monthlyArc: 4200,
    includedModules: ["storefront", "crm", "erp-light", "finance", "integrations", "ai-automation"],
    supportScope: ["priority-care", "automation-care", "integration-care"],
    unlocks: ["advanced-analytics", "service-balance", "smart-workflows", "module-control"],
    renewal: "auto",
    audience: "Growing company that needs automation, finance, integrations and priority support.",
  },
  {
    code: "partner",
    title: "Partner",
    statusLabel: "Partner",
    monthlyArc: 6000,
    includedModules: ["partner-crm", "client-sites", "billing-ledger", "direct-draft", "reports"],
    supportScope: ["partner-office", "client-launch-care", "sales-materials"],
    unlocks: ["partner-projects", "client-pipeline", "reward-ledger", "white-label-handoff"],
    renewal: "auto",
    audience: "Partner who sells and supports client projects through ARAY.",
  },
  {
    code: "enterprise",
    title: "Enterprise",
    statusLabel: "Individual",
    monthlyArc: 0,
    includedModules: ["custom-sla", "custom-integrations", "advanced-roles", "audit"],
    supportScope: ["custom-sla", "security-review", "architecture-support"],
    unlocks: ["custom-contract", "dedicated-flows", "advanced-permissions"],
    renewal: "manual",
    audience: "Large business or partner network with custom contract and SLA.",
  },
];

export function arcToRub(arc: number) {
  return arc * ARC_RUB_RATE;
}

export function getArayServicePackage(code: ArayServicePackageCode) {
  return ARAY_SERVICE_PACKAGES.find((item) => item.code === code);
}

export function getDefaultServicePackage() {
  return ARAY_SERVICE_PACKAGES[0];
}

export function getPackageForTenantPlan(plan?: string | null) {
  if (!plan || plan === "free") return getDefaultServicePackage();
  if (plan === "pro") return getArayServicePackage("pro") ?? getDefaultServicePackage();
  if (plan === "enterprise") return getArayServicePackage("enterprise") ?? getDefaultServicePackage();
  return ARAY_SERVICE_PACKAGES.find((item) => item.code === plan) ?? getDefaultServicePackage();
}

