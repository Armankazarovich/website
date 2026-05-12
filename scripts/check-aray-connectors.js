const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const ENV_FILES = [".env.local", ".env"].map((name) => path.join(ROOT, name));

const GROUPS = [
  {
    title: "ARAY core",
    help: "Главный ключ AI Studio и folder id.",
    required: ["YANDEX_API_KEY", "YANDEX_FOLDER_ID"],
    optional: [],
  },
  {
    title: "Главный мозг ARAY",
    help: "OpenAI/GPT как основной разум; Yandex остается пакетом для России, голоса, фото и спроса.",
    required: [],
    optional: ["OPENAI_API_KEY", "ARAY_PRIMARY_AI_PROVIDER", "ARAY_PRIMARY_AI_MODEL"],
  },
  {
    title: "Биржа: спрос и регионы",
    help: "Wordstat/Search API для спроса, тепловой карты и умных запросов.",
    required: ["YANDEX_SEARCH_API_TOKEN", "YANDEX_WORDSTAT_TOKEN"],
    optional: [],
  },
  {
    title: "Алиса и умный дом",
    help: "OAuth для подключения устройств, сценариев и управления домом.",
    required: [],
    optional: [
      "YANDEX_OAUTH_CLIENT_ID",
      "YANDEX_OAUTH_CLIENT_SECRET",
      "YANDEX_OAUTH_REDIRECT_URI",
      "YANDEX_OAUTH_TOKEN",
      "YANDEX_IOT_REDIRECT_URI",
      "YANDEX_IOT_SCOPES",
      "ARAY_DEVICE_SYNC_ENABLED",
      "ARAY_DEVICE_WEBHOOK_SECRET",
    ],
  },
  {
    title: "Яндекс Директ: свои рекламные кабинеты",
    help: "OAuth-приложение ARAY. Деньги списываются в кабинете подключенного бизнеса, запуск только после подтверждения.",
    required: [],
    optional: [
      "YANDEX_OAUTH_CLIENT_ID",
      "YANDEX_OAUTH_CLIENT_SECRET",
      "YANDEX_OAUTH_REDIRECT_URI",
      "YANDEX_OAUTH_TOKEN",
      "YANDEX_DIRECT_CLIENT_ID",
      "YANDEX_DIRECT_CLIENT_SECRET",
      "YANDEX_DIRECT_REDIRECT_URI",
      "YANDEX_DIRECT_API_URL",
    ],
  },
  {
    title: "Google спрос по миру",
    help: "Keyword Planner для стран, языков и глобальных ниш.",
    required: [],
    optional: [
      "GOOGLE_OAUTH_CLIENT_ID",
      "GOOGLE_OAUTH_CLIENT_SECRET",
      "GOOGLE_OAUTH_REDIRECT_URI",
      "GOOGLE_ADS_DEVELOPER_TOKEN",
      "GOOGLE_ADS_CUSTOMER_ID",
      "GOOGLE_ADS_CLIENT_ID",
      "GOOGLE_ADS_CLIENT_SECRET",
      "GOOGLE_ADS_REFRESH_TOKEN",
    ],
  },
  {
    title: "Вход через внешние аккаунты",
    help: "Пользовательский вход через Яндекс, Google и VK. Не путать с сервисными API ключами.",
    required: [],
    optional: [
      "GOOGLE_OAUTH_CLIENT_ID",
      "GOOGLE_OAUTH_CLIENT_SECRET",
      "GOOGLE_OAUTH_REDIRECT_URI",
      "GOOGLE_CLIENT_ID",
      "GOOGLE_CLIENT_SECRET",
      "YANDEX_LOGIN_CLIENT_ID",
      "YANDEX_LOGIN_CLIENT_SECRET",
      "VK_CLIENT_ID",
      "VK_CLIENT_SECRET",
    ],
  },
  {
    title: "Голос",
    help: "Голос ARAY, распознавание речи, SpeechKit и будущие настройки устройств/графика. Слушать только после разрешения.",
    required: [],
    optional: [
      "ARAY_VOICE_PROVIDER",
      "ARAY_STT_PROVIDER",
      "ARAY_VOICE_ID",
      "ARAY_VOICE_LANGUAGE",
      "ELEVENLABS_API_KEY",
      "TTS_PROXY_URL",
      "YANDEX_SPEECHKIT_API_KEY",
      "YANDEX_SPEECHKIT_FOLDER_ID",
    ],
  },
  {
    title: "Календарь и напоминания",
    help: "График ARAY, оплаты, дедлайны и quiet hours. Внешний календарь подключается только по OAuth пользователя или бизнеса.",
    required: [],
    optional: [
      "ARAY_SCHEDULER_TIMEZONE",
      "ARAY_REMINDER_WEBHOOK_SECRET",
      "GOOGLE_CALENDAR_CLIENT_ID",
      "GOOGLE_CALENDAR_CLIENT_SECRET",
      "GOOGLE_CALENDAR_REDIRECT_URI",
      "YANDEX_CALENDAR_CLIENT_ID",
      "YANDEX_CALENDAR_CLIENT_SECRET",
      "YANDEX_CALENDAR_REDIRECT_URI",
    ],
  },
  {
    title: "Мессенджеры и единый inbox",
    help: "P0: Telegram, VK, email. P1: WhatsApp Business, телефония и SMS. Все входящие должны стать обращениями/лидами/задачами ARAY.",
    required: [],
    optional: [
      "TELEGRAM_BOT_TOKEN",
      "TELEGRAM_WEBHOOK_SECRET",
      "VK_BOT_TOKEN",
      "VK_CONFIRMATION_TOKEN",
      "VK_SECRET_KEY",
      "IMAP_HOST",
      "IMAP_USER",
      "WHATSAPP_BUSINESS_TOKEN",
      "WHATSAPP_PHONE_NUMBER_ID",
      "WHATSAPP_VERIFY_TOKEN",
      "TELEPHONY_API_KEY",
      "SMS_API_KEY",
    ],
  },
  {
    title: "SEO и индексация",
    help: "Метрика, Вебмастер, Search Console, Analytics и бизнес-профили. ARAY готовит SEO в один клик, публикация критичных изменений подтверждается.",
    required: [],
    optional: [
      "YANDEX_METRIKA_TOKEN",
      "YANDEX_WEBMASTER_TOKEN",
      "YANDEX_BUSINESS_TOKEN",
      "YANDEX_WEBMASTER_CLIENT_ID",
      "YANDEX_WEBMASTER_CLIENT_SECRET",
      "YANDEX_WEBMASTER_REDIRECT_URI",
      "YANDEX_BUSINESS_CLIENT_ID",
      "YANDEX_BUSINESS_CLIENT_SECRET",
      "YANDEX_BUSINESS_REDIRECT_URI",
      "YANDEX_MAPS_API_KEY",
      "GOOGLE_ANALYTICS_PROPERTY_ID",
      "GOOGLE_SEARCH_CONSOLE_SITE_URL",
      "GOOGLE_BUSINESS_PROFILE_ACCOUNT_ID",
      "GOOGLE_SEARCH_CONSOLE_CLIENT_ID",
      "GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET",
      "GOOGLE_SEARCH_CONSOLE_REDIRECT_URI",
      "GOOGLE_BUSINESS_PROFILE_CLIENT_ID",
      "GOOGLE_BUSINESS_PROFILE_CLIENT_SECRET",
      "GOOGLE_BUSINESS_PROFILE_REDIRECT_URI",
      "GOOGLE_MAPS_API_KEY",
      "INDEXNOW_API_KEY",
      "INDEXNOW_KEY_LOCATION",
      "ARAY_SITEMAP_PING_ENABLED",
    ],
  },
  {
    title: "Бухгалтерия, налоги и ЭДО",
    help: "СБИС, Контур/Диадок/Эльба, 1С, банки и напоминания оплат. Юридически важные отправки только после подтверждения.",
    required: [],
    optional: [
      "ACCOUNTING_PROVIDER",
      "ACCOUNTING_API_URL",
      "ACCOUNTING_CLIENT_ID",
      "ACCOUNTING_CLIENT_SECRET",
      "ACCOUNTING_WEBHOOK_SECRET",
      "EDO_PROVIDER",
      "EDO_API_URL",
      "EDO_CLIENT_ID",
      "EDO_CLIENT_SECRET",
      "EDO_ORGANIZATION_ID",
      "EDO_WEBHOOK_SECRET",
      "TAX_PROVIDER",
      "TAX_API_URL",
      "TAX_CLIENT_ID",
      "TAX_CLIENT_SECRET",
      "TAXPAYER_INN",
      "TAXPAYER_KPP",
      "FISCAL_PROVIDER",
      "FISCAL_API_KEY",
      "FISCAL_WEBHOOK_SECRET",
      "SBIS_CLIENT_ID",
      "SBIS_CLIENT_SECRET",
      "KONTUR_CLIENT_ID",
      "KONTUR_CLIENT_SECRET",
      "DIADOC_API_KEY",
      "KONTUR_ELBA_CLIENT_ID",
      "KONTUR_ELBA_CLIENT_SECRET",
      "MOE_DELO_CLIENT_ID",
      "MOE_DELO_CLIENT_SECRET",
      "ONEC_API_URL",
      "ONEC_API_TOKEN",
      "BANK_API_CLIENT_ID",
      "BANK_API_CLIENT_SECRET",
    ],
  },
];

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, "utf8");
  const result = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const match = /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!match) continue;

    const [, key, rawValue] = match;
    let value = rawValue.trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }

  return result;
}

function isFilled(value) {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return !normalized.includes("your-") && normalized !== "..." && normalized !== "todo";
}

const env = Object.assign({}, ...ENV_FILES.map(parseEnvFile), process.env);
const presentFileNames = ENV_FILES.filter(fs.existsSync).map((file) => path.basename(file));
let hasMissingRequired = false;

console.log("[ARAY] Проверка подключений");
console.log(`Файлы: ${presentFileNames.length ? presentFileNames.join(", ") : "не найдены"}`);
console.log("");

for (const group of GROUPS) {
  console.log(group.title);
  console.log(`  ${group.help}`);

  for (const key of group.required) {
    const ok = isFilled(env[key]);
    hasMissingRequired = hasMissingRequired || !ok;
    console.log(`  ${ok ? "OK " : "MISS"} required ${key}`);
  }

  for (const key of group.optional) {
    const ok = isFilled(env[key]);
    console.log(`  ${ok ? "OK " : "TODO"} optional ${key}`);
  }

  console.log("");
}

if (hasMissingRequired) {
  console.log("[ARAY] Нужно добавить обязательные ключи. Значения секретов команда не показывает.");
  process.exitCode = 1;
} else {
  console.log("[ARAY] Базовые ключи на месте. Секреты не выводились.");
}
