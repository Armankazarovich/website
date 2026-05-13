export type PwaIconKind = "aray" | "site";

export type PwaShortcut = {
  name: string;
  shortName: string;
  description: string;
  url: string;
};

export type PwaInstallContext = {
  id: string;
  name: string;
  shortName: string;
  description: string;
  installTitle: string;
  installDescription: string;
  installCta: string;
  installedTitle: string;
  startUrl: string;
  scope: string;
  themeColor: string;
  backgroundColor: string;
  iconKind: PwaIconKind;
  shortcuts?: PwaShortcut[];
};

const ARAY_THEME = "hsl(201 70% 11%)";
const ARAY_BACKGROUND = "hsl(210 54% 6%)";
const ARAY_MARKET_THEME = "hsl(200 79% 11%)";
const ARAY_CRM_THEME = "hsl(43 60% 10%)";
const ARAY_CATALOG_THEME = "hsl(211 51% 13%)";
const PILORUS_THEME = "hsl(20 33% 5%)";

type ArayModuleContextInput = {
  id: string;
  name?: string;
  shortName: string;
  description: string;
  installName?: string;
  installDescription?: string;
  installCta?: string;
  installedTitle?: string;
  startUrl: string;
  themeColor?: string;
  shortcuts?: PwaShortcut[];
};

function createArayModuleContext(input: ArayModuleContextInput): PwaInstallContext {
  const installName = input.installName ?? input.shortName;

  return {
    id: input.id,
    name: input.name ?? `ARAY Production · ${input.shortName}`,
    shortName: input.shortName,
    description: input.description,
    installTitle: `Установить ${installName}`,
    installDescription:
      input.installDescription ??
      `Открывает модуль «${input.shortName}» отдельным приложением ARAY с правильным стартом, названием и иконкой.`,
    installCta: input.installCta ?? `Установить ${installName}`,
    installedTitle: input.installedTitle ?? `${input.shortName} установлено`,
    startUrl: input.startUrl,
    scope: "/admin",
    themeColor: input.themeColor ?? ARAY_THEME,
    backgroundColor: ARAY_BACKGROUND,
    iconKind: "aray",
    shortcuts: input.shortcuts,
  };
}

export const PWA_INSTALL_CONTEXTS: Record<string, PwaInstallContext> = {
  "aray-workspace": {
    id: "aray-workspace",
    name: "ARAY Рабочий стол",
    shortName: "ARAY",
    description: "Главная панель бизнеса: заказы, задачи, склад и подсказки ARAY.",
    installTitle: "Установить рабочий стол",
    installDescription: "Бизнес открывается сразу с главной панели, без лишних вкладок.",
    installCta: "Установить панель",
    installedTitle: "Рабочий стол установлен",
    startUrl: "/admin",
    scope: "/admin",
    themeColor: ARAY_THEME,
    backgroundColor: ARAY_BACKGROUND,
    iconKind: "aray",
    shortcuts: [
      { name: "Заказы", shortName: "Заказы", description: "Активные заказы", url: "/admin/orders" },
      { name: "Каталог", shortName: "Каталог", description: "Товары и цены", url: "/admin/products" },
    ],
  },
  "aray-market": {
    id: "aray-market",
    name: "ARAY Терминал",
    shortName: "Терминал",
    description: "Касса, заказы, подбор позиций и оформление заказа.",
    installTitle: "Установить терминал",
    installDescription: "Открывается сразу рабочее место менеджера для заказа или кассы.",
    installCta: "Установить терминал",
    installedTitle: "Терминал установлен",
    startUrl: "/admin/orders/new",
    scope: "/admin",
    themeColor: ARAY_MARKET_THEME,
    backgroundColor: ARAY_BACKGROUND,
    iconKind: "aray",
    shortcuts: [
      { name: "Заказы", shortName: "Заказы", description: "Оформить заказ", url: "/admin/orders/new" },
      { name: "Новый заказ", shortName: "Заказ", description: "Оформить заказ", url: "/admin/orders/new" },
    ],
  },
  "aray-terminal": {
    id: "aray-terminal",
    name: "ARAY Терминал",
    shortName: "Терминал",
    description: "Касса, заказы и быстрый подбор позиций для менеджера.",
    installTitle: "Установить терминал",
    installDescription: "Открывает рабочее место менеджера сразу в режиме оформления.",
    installCta: "Установить терминал",
    installedTitle: "Терминал установлен",
    startUrl: "/admin/orders/new",
    scope: "/admin",
    themeColor: ARAY_MARKET_THEME,
    backgroundColor: ARAY_BACKGROUND,
    iconKind: "aray",
    shortcuts: [
      { name: "Терминал", shortName: "Терминал", description: "Оформить новый заказ", url: "/admin/orders/new" },
      { name: "Обучение", shortName: "Обучение", description: "Сценарии работы терминала", url: "/admin/terminals/training" },
    ],
  },
  "aray-orders": {
    id: "aray-orders",
    name: "ARAY Заказы",
    shortName: "Заказы",
    description: "Приём, обработка, доставка, архив и восстановление заказов.",
    installTitle: "Установить заказы",
    installDescription: "Открывает список заказов отдельным рабочим приложением.",
    installCta: "Установить заказы",
    installedTitle: "Заказы установлены",
    startUrl: "/admin/orders",
    scope: "/admin",
    themeColor: ARAY_THEME,
    backgroundColor: ARAY_BACKGROUND,
    iconKind: "aray",
  },
  "aray-crm": {
    id: "aray-crm",
    name: "ARAY CRM",
    shortName: "CRM",
    description: "Лиды, заявки, сделки, контакты и история клиента.",
    installTitle: "Установить CRM",
    installDescription: "Открывает лиды и клиентов отдельным рабочим приложением.",
    installCta: "Установить CRM",
    installedTitle: "CRM установлена",
    startUrl: "/admin/crm",
    scope: "/admin",
    themeColor: ARAY_CRM_THEME,
    backgroundColor: ARAY_BACKGROUND,
    iconKind: "aray",
  },
  "aray-catalog": {
    id: "aray-catalog",
    name: "ARAY Каталог",
    shortName: "Каталог",
    description: "Товары, цены, остатки, импорт и проверка готовности каталога.",
    installTitle: "Установить каталог",
    installDescription: "Открывает управление товарами, ценами и остатками.",
    installCta: "Установить каталог",
    installedTitle: "Каталог установлен",
    startUrl: "/admin/products",
    scope: "/admin",
    themeColor: ARAY_CATALOG_THEME,
    backgroundColor: ARAY_BACKGROUND,
    iconKind: "aray",
    shortcuts: [
      { name: "Товары", shortName: "Товары", description: "Список товаров", url: "/admin/products" },
      { name: "Аудит", shortName: "Аудит", description: "Проверка каталога", url: "/admin/products/audit" },
    ],
  },
  "aray-tasks": {
    id: "aray-tasks",
    name: "ARAY Задачи",
    shortName: "Задачи",
    description: "Командные задачи, сроки, исполнители и комментарии.",
    installTitle: "Установить задачи",
    installDescription: "Открывает доску задач команды отдельным приложением.",
    installCta: "Установить задачи",
    installedTitle: "Задачи установлены",
    startUrl: "/admin/tasks",
    scope: "/admin",
    themeColor: ARAY_THEME,
    backgroundColor: ARAY_BACKGROUND,
    iconKind: "aray",
  },
  "aray-settings": {
    id: "aray-settings",
    name: "ARAY Настройки",
    shortName: "Настройки",
    description: "Бизнес, сайт, команда, терминал, доставка и система.",
    installTitle: "Установить настройки",
    installDescription: "Открывает параметры бизнеса и сайта без поиска по меню.",
    installCta: "Установить настройки",
    installedTitle: "Настройки установлены",
    startUrl: "/admin/settings",
    scope: "/admin",
    themeColor: ARAY_THEME,
    backgroundColor: ARAY_BACKGROUND,
    iconKind: "aray",
  },
  "aray-notifications": {
    id: "aray-notifications",
    name: "ARAY Уведомления",
    shortName: "Уведомления",
    description: "Входящие события, почта, письма клиентов и системные сигналы.",
    installTitle: "Установить уведомления",
    installDescription: "Открывает центр входящих событий и писем.",
    installCta: "Установить входящие",
    installedTitle: "Уведомления установлены",
    startUrl: "/admin/notifications",
    scope: "/admin",
    themeColor: ARAY_THEME,
    backgroundColor: ARAY_BACKGROUND,
    iconKind: "aray",
  },
  "aray-assistant": createArayModuleContext({
    id: "aray-assistant",
    name: "ARAY Production",
    shortName: "ARAY",
    description: "Помощник, голос, агенты, лимиты, подключение провайдеров и рабочие сценарии.",
    installName: "ARAY",
    installedTitle: "ARAY установлен",
    startUrl: "/admin/aray",
    shortcuts: [
      { name: "Агенты", shortName: "Агенты", description: "Роли и качество ARAY", url: "/admin/aray/agents" },
      { name: "Лимиты", shortName: "Лимиты", description: "Токены, подписки и расходы", url: "/admin/aray/costs" },
    ],
  }),
  "aray-connectors": createArayModuleContext({
    id: "aray-connectors",
    shortName: "Коннекторы",
    description: "API-ключи, провайдеры, статусы подключений и безопасные проверки.",
    installName: "коннекторы",
    installedTitle: "Коннекторы установлены",
    startUrl: "/admin/aray/connectors",
    shortcuts: [
      { name: "ARAY", shortName: "ARAY", description: "Центр помощника", url: "/admin/aray" },
      { name: "Настройки", shortName: "Настройки", description: "Бизнес и система", url: "/admin/settings" },
    ],
  }),
  "aray-analytics": createArayModuleContext({
    id: "aray-analytics",
    shortName: "Аналитика",
    description: "Продажи, динамика, показатели, риски и будущая аналитика биржи.",
    installName: "аналитику",
    installedTitle: "Аналитика установлена",
    startUrl: "/admin/analytics",
    shortcuts: [
      { name: "Заказы", shortName: "Заказы", description: "Источник продаж", url: "/admin/orders" },
      { name: "Финансы", shortName: "Финансы", description: "Доходы и расходы", url: "/admin/finance" },
    ],
  }),
  "aray-finance": createArayModuleContext({
    id: "aray-finance",
    shortName: "Финансы",
    description: "Доходы, расходы, бюджет, риски и будущие ARCOIN-контуры.",
    installName: "финансы",
    installedTitle: "Финансы установлены",
    startUrl: "/admin/finance",
    shortcuts: [
      { name: "Аналитика", shortName: "Аналитика", description: "Показатели и графики", url: "/admin/analytics" },
      { name: "Заказы", shortName: "Заказы", description: "Выручка и статусы", url: "/admin/orders" },
    ],
  }),
  "aray-appearance": createArayModuleContext({
    id: "aray-appearance",
    shortName: "Оформление",
    description: "Темы админки, витрина, карточки товара и будущие фирменные стили сайтов.",
    installName: "оформление",
    installedTitle: "Оформление установлено",
    startUrl: "/admin/appearance",
    shortcuts: [
      { name: "Сайт", shortName: "Сайт", description: "Витрина и страницы", url: "/admin/site" },
      { name: "Каталог", shortName: "Каталог", description: "Карточки товара", url: "/admin/products" },
    ],
  }),
  "aray-marketing": createArayModuleContext({
    id: "aray-marketing",
    shortName: "Маркетинг",
    description: "SEO, реклама, акции, отзывы, спрос и будущий Yandex Direct Pro.",
    installName: "маркетинг",
    installedTitle: "Маркетинг установлен",
    startUrl: "/admin/promotion",
    shortcuts: [
      { name: "Акции", shortName: "Акции", description: "Скидки и предложения", url: "/admin/promotions" },
      { name: "Отзывы", shortName: "Отзывы", description: "Репутация и модерация", url: "/admin/reviews" },
    ],
  }),
  "aray-media": createArayModuleContext({
    id: "aray-media",
    shortName: "Медиа",
    description: "Фото, документы, изображения товаров, водяной знак и будущая генерация медиа.",
    installName: "медиа",
    installedTitle: "Медиа установлено",
    startUrl: "/admin/media",
    shortcuts: [
      { name: "Водяной знак", shortName: "Знак", description: "Защита фото", url: "/admin/watermark" },
      { name: "Каталог", shortName: "Каталог", description: "Товары и фото", url: "/admin/products" },
    ],
  }),
  "aray-delivery": createArayModuleContext({
    id: "aray-delivery",
    shortName: "Доставка",
    description: "Маршруты, тарифы, статусы, курьеры и контроль выполнения.",
    installName: "доставку",
    installedTitle: "Доставка установлена",
    startUrl: "/admin/delivery",
    shortcuts: [
      { name: "Тарифы", shortName: "Тарифы", description: "Расценки доставки", url: "/admin/delivery/rates" },
      { name: "Заказы", shortName: "Заказы", description: "Активные доставки", url: "/admin/orders" },
    ],
  }),
  "aray-team": createArayModuleContext({
    id: "aray-team",
    shortName: "Команда",
    description: "Сотрудники, умные роли, права, аудит действий и рабочие сценарии.",
    installName: "команду",
    installedTitle: "Команда установлена",
    startUrl: "/admin/staff",
    shortcuts: [
      { name: "Роли", shortName: "Роли", description: "Dynamic Role OS", url: "/admin/business/settings" },
      { name: "Задачи", shortName: "Задачи", description: "Командная работа", url: "/admin/tasks" },
    ],
  }),
  "aray-business": createArayModuleContext({
    id: "aray-business",
    shortName: "Бизнес",
    description: "Бизнес-профиль, роли, витрина, базовые настройки и будущие подписки модулей.",
    installName: "бизнес",
    installedTitle: "Бизнес установлен",
    startUrl: "/admin/business/settings",
    shortcuts: [
      { name: "Команда", shortName: "Команда", description: "Сотрудники и роли", url: "/admin/staff" },
      { name: "Сайт", shortName: "Сайт", description: "Витрина", url: "/admin/site" },
    ],
  }),
  "aray-help": createArayModuleContext({
    id: "aray-help",
    shortName: "Помощь",
    description: "Гайды, обучение, подсказки, сценарии терминала и база знаний.",
    installName: "помощь",
    installedTitle: "Помощь установлена",
    startUrl: "/admin/help",
    shortcuts: [
      { name: "Обучение", shortName: "Обучение", description: "Сценарии терминала", url: "/admin/terminals/training" },
      { name: "ARAY", shortName: "ARAY", description: "Помощник", url: "/admin/aray" },
    ],
  }),
  "pilorus-site": {
    id: "pilorus-site",
    name: "ПилоРус",
    shortName: "ПилоРус",
    description: "Пиломатериалы от производителя: каталог, доставка и оформление заказа.",
    installTitle: "Установить сайт",
    installDescription: "Покупатель открывает магазин сразу как приложение.",
    installCta: "Установить сайт",
    installedTitle: "Сайт установлен",
    startUrl: "/",
    scope: "/",
    themeColor: PILORUS_THEME,
    backgroundColor: PILORUS_THEME,
    iconKind: "site",
    shortcuts: [
      { name: "Каталог", shortName: "Каталог", description: "Пиломатериалы", url: "/catalog" },
      { name: "Корзина", shortName: "Корзина", description: "Оформление заказа", url: "/cart" },
    ],
  },
  "pilorus-catalog": {
    id: "pilorus-catalog",
    name: "Каталог ПилоРус",
    shortName: "Каталог",
    description: "Каталог пиломатериалов с ценами, размерами и быстрым заказом.",
    installTitle: "Установить каталог",
    installDescription: "Покупатель попадает сразу в каталог товаров.",
    installCta: "Установить каталог",
    installedTitle: "Каталог установлен",
    startUrl: "/catalog",
    scope: "/",
    themeColor: PILORUS_THEME,
    backgroundColor: PILORUS_THEME,
    iconKind: "site",
  },
};

const DEFAULT_CONTEXT = PWA_INSTALL_CONTEXTS["pilorus-site"];
const DEFAULT_ADMIN_CONTEXT = PWA_INSTALL_CONTEXTS["aray-workspace"];

function normalizeSearch(search?: string | URLSearchParams | null) {
  if (!search) return "";
  if (typeof search !== "string") return search.toString();
  return search.startsWith("?") ? search.slice(1) : search;
}

function startsWithAny(pathname: string, prefixes: string[]) {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function resolvePwaInstallContext(
  pathname = "/",
  search?: string | URLSearchParams | null,
): PwaInstallContext {
  const safePathname = pathname || "/";
  const params = new URLSearchParams(normalizeSearch(search));

  if (params.get("mode") === "market" || startsWithAny(safePathname, ["/admin/exchange"])) {
    return PWA_INSTALL_CONTEXTS["aray-market"];
  }
  if (safePathname.startsWith("/admin/orders/new")) return PWA_INSTALL_CONTEXTS["aray-terminal"];
  if (startsWithAny(safePathname, ["/admin/terminals"])) return PWA_INSTALL_CONTEXTS["aray-terminal"];
  if (startsWithAny(safePathname, ["/admin/orders"])) return PWA_INSTALL_CONTEXTS["aray-orders"];
  if (startsWithAny(safePathname, ["/admin/aray/connectors"])) return PWA_INSTALL_CONTEXTS["aray-connectors"];
  if (startsWithAny(safePathname, ["/admin/aray", "/admin/aray-lab"])) return PWA_INSTALL_CONTEXTS["aray-assistant"];
  if (startsWithAny(safePathname, ["/admin/crm"])) return PWA_INSTALL_CONTEXTS["aray-crm"];
  if (startsWithAny(safePathname, ["/admin/products", "/admin/inventory", "/admin/import", "/admin/categories"])) {
    return PWA_INSTALL_CONTEXTS["aray-catalog"];
  }
  if (startsWithAny(safePathname, ["/admin/analytics"])) return PWA_INSTALL_CONTEXTS["aray-analytics"];
  if (startsWithAny(safePathname, ["/admin/finance"])) return PWA_INSTALL_CONTEXTS["aray-finance"];
  if (startsWithAny(safePathname, ["/admin/appearance"])) return PWA_INSTALL_CONTEXTS["aray-appearance"];
  if (startsWithAny(safePathname, ["/admin/promotion", "/admin/promotions", "/admin/reviews"])) {
    return PWA_INSTALL_CONTEXTS["aray-marketing"];
  }
  if (startsWithAny(safePathname, ["/admin/media", "/admin/images", "/admin/watermark"])) {
    return PWA_INSTALL_CONTEXTS["aray-media"];
  }
  if (startsWithAny(safePathname, ["/admin/delivery"])) return PWA_INSTALL_CONTEXTS["aray-delivery"];
  if (startsWithAny(safePathname, ["/admin/staff"])) return PWA_INSTALL_CONTEXTS["aray-team"];
  if (startsWithAny(safePathname, ["/admin/business"])) return PWA_INSTALL_CONTEXTS["aray-business"];
  if (startsWithAny(safePathname, ["/admin/tasks", "/admin/staff", "/admin/workflows"])) {
    return PWA_INSTALL_CONTEXTS["aray-tasks"];
  }
  if (startsWithAny(safePathname, ["/admin/settings", "/admin/site", "/admin/health"])) {
    return PWA_INSTALL_CONTEXTS["aray-settings"];
  }
  if (startsWithAny(safePathname, ["/admin/notifications", "/admin/email"])) {
    return PWA_INSTALL_CONTEXTS["aray-notifications"];
  }
  if (startsWithAny(safePathname, ["/admin/help"])) return PWA_INSTALL_CONTEXTS["aray-help"];
  if (safePathname.startsWith("/admin")) return DEFAULT_ADMIN_CONTEXT;
  if (startsWithAny(safePathname, ["/catalog", "/product", "/services", "/promotions"])) {
    return PWA_INSTALL_CONTEXTS["pilorus-catalog"];
  }

  return DEFAULT_CONTEXT;
}

export function resolvePwaInstallContextById(id?: string | null): PwaInstallContext {
  if (!id) return DEFAULT_CONTEXT;
  return PWA_INSTALL_CONTEXTS[id] ?? DEFAULT_CONTEXT;
}

export function getPwaIconSrc(context: PwaInstallContext, size = 192) {
  if (context.iconKind === "aray") return `/api/pwa/icon?s=${size}&v=aray-production-20260508`;
  return `/icons/icon-${size}x${size}.png`;
}

export function buildPwaManifestHref(context: PwaInstallContext) {
  const params = new URLSearchParams({ app: context.id });
  if (context.iconKind === "aray") params.set("v", "aray-production-20260508");
  return `/api/pwa/manifest?${params.toString()}`;
}
