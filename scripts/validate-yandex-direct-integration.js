const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

const checks = [
  {
    file: "app/api/admin/direct/export/route.ts",
    label: "explicit owner confirmation before export",
    patterns: ["confirmed: body?.confirm === true", "ARAY не отправляет рекламу"],
  },
  {
    file: "app/api/admin/direct/export/route.ts",
    label: "public domain guard before Direct export",
    patterns: ["resolveDirectPublicBaseUrl", "Для выгрузки в Direct нужен публичный домен"],
  },
  {
    file: "app/api/admin/direct/draft/route.ts",
    label: "draft exposes Direct region readiness",
    patterns: ["directRegionIds", "resolveRegionIds"],
  },
  {
    file: "lib/yandex-direct-export.ts",
    label: "campaign is suspended after creation",
    patterns: ["safeSuspendCampaign", "campaigns", "suspend"],
  },
  {
    file: "lib/yandex-direct-export.ts",
    label: "manual bid and callouts are exported",
    patterns: ["options?.searchBid", "adextensions", "AdExtensionIds", "calloutsCreated"],
  },
  {
    file: "lib/yandex-direct.ts",
    label: "agency client login can be configured",
    patterns: ["YANDEX_DIRECT_CLIENT_LOGIN", "Client-Login"],
  },
  {
    file: "app/admin/promotion/page.tsx",
    label: "UI shows readiness, active campaigns, bid and post-export checklist",
    patterns: [
      "activeDirectCampaigns",
      "directRegionReady",
      "searchBid",
      "Черновик создан в Direct",
      "Запускать только после целей Метрики",
    ],
  },
  {
    file: ".env.example",
    label: "deploy env documents Direct keys",
    patterns: [
      "YANDEX_DIRECT_CLIENT_ID",
      "YANDEX_DIRECT_CLIENT_SECRET",
      "YANDEX_DIRECT_REDIRECT_URI",
      "YANDEX_DIRECT_CLIENT_LOGIN",
    ],
  },
  {
    file: "lib/site-settings.ts",
    label: "PiloRus Direct has public domain and exact launch region defaults",
    patterns: [
      "yandex_direct_public_url: \"https://pilo-rus.ru\"",
      "yandex_direct_region_ids: \"1\"",
      "direct_region_ids: \"1\"",
    ],
  },
  {
    file: "prisma/data-migrate.ts",
    label: "production data migration forces Direct public URL and region",
    patterns: [
      "upsertSetting(\"yandex_direct_public_url\", \"https://pilo-rus.ru\")",
      "upsertSetting(\"yandex_direct_region_ids\", \"1\")",
      "upsertTenantLaunchSettings",
    ],
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
  console.error("Yandex Direct integration check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Yandex Direct integration check passed: ${checks.length} gates.`);
