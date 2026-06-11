import type { TerminalProfileKey } from "@/lib/terminal-profiles";

export type StoreConstructorBusinessType = TerminalProfileKey;

export type StoreConstructorStatus = "ready" | "guarded" | "owner-input";

export type StoreConstructorLaunchStep = {
  id: string;
  title: string;
  status: StoreConstructorStatus;
  dataObjects: string[];
  routes: string[];
  requiredOwnerInputs: string[];
};

export type StoreConstructorBlueprint = {
  key: StoreConstructorBusinessType;
  title: string;
  terminalProfile: TerminalProfileKey;
  storeKind: string;
  defaultSections: string[];
  catalogSeed: {
    categories: string[];
    sampleProducts: string[];
    requiredFields: string[];
  };
  checkoutModes: string[];
  arayChannels: string[];
  ownerInputs: string[];
};

export type StoreConstructorOnboardingStep = {
  id: string;
  title: string;
  status: StoreConstructorStatus;
  ownerInputs: string[];
  systemOutput: string[];
  routes: string[];
};

export type StoreConstructorDomainStep = {
  id: string;
  title: string;
  status: StoreConstructorStatus;
  ownerAction: string;
  systemAction: string;
  verification: string;
};

export type StoreConstructorQuestionnaireGroup = {
  id: string;
  title: string;
  fields: string[];
};

export type StoreConstructorImportColumn = {
  key: string;
  label: string;
  required: boolean;
  example: string;
};

export const STORE_CONSTRUCTOR_BLUEPRINT_VERSION = "2026-05-26.one-click-store";

export const STORE_CONSTRUCTOR_BUSINESS_TYPES = [
  "lumber",
  "construction",
  "restaurant",
  "retail",
  "services",
  "beauty",
  "universal",
] as const satisfies readonly StoreConstructorBusinessType[];

export const ONE_CLICK_STORE_REQUIRED_MODULES = [
  "constructor.store-builder",
  "core.design-system",
  "core.popup-system",
  "core.motion-system",
  "core.app-identity",
  "core.module-control-center",
  "core.connector-vault",
  "core.notifications",
  "core.aray-voice",
  "business.role-os",
  "business.orders",
  "business.aray-messenger",
  "business.terminal",
  "finance.wallet-ledger",
] as const;

export const ONE_CLICK_STORE_REQUIRED_ROUTES = [
  "/",
  "/catalog",
  "/cart",
  "/checkout",
  "/compare",
  "/wishlist",
  "/stories",
  "/aray-production",
  "/aray-production/preview",
  "/admin",
  "/admin/site",
  "/admin/site/constructor",
  "/admin/business/settings",
  "/admin/products",
  "/admin/orders",
  "/admin/orders/new",
  "/admin/terminals",
  "/admin/aray/modules",
  "/api/pwa/manifest",
  "/api/pwa/site-icon",
  "/api/admin/site-constructor/blueprints",
  "/api/admin/site-constructor/sites",
  "/api/site-constructor/applications",
] as const;

export const ONE_CLICK_STORE_REQUIRED_CAPABILITIES = [
  "one-click-store-constructor",
  "product-comparison",
  "delivery-pickup",
  "service-integrations",
  "reviews-reputation",
] as const;

export const ONE_CLICK_STORE_REQUIRED_DATA_OBJECTS = [
  "Tenant",
  "StoreNetwork",
  "SiteSettings",
  "Category",
  "Product",
  "ProductVariant",
  "DeliveryRate",
  "Order",
  "Lead",
  "ReferralAttribution",
  "Task",
  "TerminalConnector",
  "ArayModuleState",
  "Story",
] as const;

export const ONE_CLICK_STORE_PUBLIC_SURFACES = [
  "home",
  "catalog",
  "product",
  "cart",
  "checkout",
  "compare",
  "wishlist",
  "stories",
  "referral-landing",
  "live-preview",
  "aray-widget",
  "pwa-install",
] as const;

export const ONE_CLICK_STORE_QUALITY_GATES = [
  "npm run constructor:check",
  "npm run modules:check",
  "npm run architecture:levels",
  "npm run release:check",
  "npm run pwa:check",
  "npm run browser:cart:check",
  "npm run browser:mobile:check",
  "npm run browser:stories:check",
  "node scripts/deploy-preflight.js --allow-dirty",
] as const;

export const ONE_CLICK_STORE_ONBOARDING_STEPS: StoreConstructorOnboardingStep[] = [
  {
    id: "questionnaire",
    title: "Анкета магазина",
    status: "owner-input",
    ownerInputs: ["название", "город", "телефон", "логотип", "цвет", "график", "адрес склада"],
    systemOutput: ["Tenant", "SiteSettings", "PWA identity"],
    routes: ["/admin/site", "/admin/business/settings"],
  },
  {
    id: "business-profile",
    title: "Профиль бизнеса",
    status: "ready",
    ownerInputs: ["сфера бизнеса", "ассортимент", "город", "условия продаж"],
    systemOutput: ["TerminalProfile", "checkout modes", "admin labels"],
    routes: ["/admin/site/constructor", "/admin/orders/new"],
  },
  {
    id: "catalog-import",
    title: "Импорт товаров файлом",
    status: "owner-input",
    ownerInputs: ["xlsx/csv прайс", "категории", "цены", "остатки", "фото или ссылки на фото"],
    systemOutput: ["Category", "Product", "ProductVariant"],
    routes: ["/admin/import", "/admin/products"],
  },
  {
    id: "delivery-and-payment",
    title: "Доставка и оплата",
    status: "owner-input",
    ownerInputs: ["зоны доставки", "минимальный заказ", "самовывоз", "способ оплаты"],
    systemOutput: ["DeliveryRate", "Order rules", "terminal defaults"],
    routes: ["/admin/delivery", "/admin/orders/new"],
  },
  {
    id: "domain",
    title: "Домен и SSL",
    status: "guarded",
    ownerInputs: ["домен", "доступ к DNS", "решение: основной домен или поддомен"],
    systemOutput: ["Tenant.domain", "TENANT_DOMAIN_MAP", "HTTPS"],
    routes: ["/admin/site", "/admin/site/constructor"],
  },
  {
    id: "launch-check",
    title: "Проверка и запуск",
    status: "guarded",
    ownerInputs: ["финальное подтверждение", "тестовый заказ", "проверка телефона и уведомлений"],
    systemOutput: ["quality gates", "PWA check", "order smoke test"],
    routes: ["/catalog", "/cart", "/checkout", "/admin/orders"],
  },
];

export const ONE_CLICK_STORE_DOMAIN_STEPS: StoreConstructorDomainStep[] = [
  {
    id: "save-domain",
    title: "Закрепить домен за магазином",
    status: "guarded",
    ownerAction: "Дать домен магазина, например stroi-example.ru",
    systemAction: "Сохранить домен в Tenant.domain и связать его со slug магазина",
    verification: "Один домен ведёт только на один активный магазин",
  },
  {
    id: "dns",
    title: "Направить DNS",
    status: "owner-input",
    ownerAction: "Поставить A/CNAME записи у регистратора домена",
    systemAction: "Принять домен на хостинге проекта",
    verification: "Apex и www открывают один и тот же магазин",
  },
  {
    id: "tenant-map",
    title: "Включить маршрутизацию магазина",
    status: "guarded",
    ownerAction: "Подтвердить slug магазина",
    systemAction: "Добавить домен в TENANT_DOMAIN_MAP или tenant lookup",
    verification: "Host превращается в правильный x-tenant-id",
  },
  {
    id: "ssl",
    title: "Выпустить HTTPS",
    status: "guarded",
    ownerAction: "Дождаться применения DNS",
    systemAction: "Выпустить SSL и проверить PWA manifest/icons на новом домене",
    verification: "https://домен открывается без предупреждений",
  },
  {
    id: "smoke",
    title: "Проверить боевой путь",
    status: "guarded",
    ownerAction: "Подтвердить тестовый заказ",
    systemAction: "Проверить каталог, корзину, checkout, админку и уведомления",
    verification: "Заказ появился в админке нужного магазина",
  },
];

export const ONE_CLICK_STORE_QUESTIONNAIRE: StoreConstructorQuestionnaireGroup[] = [
  {
    id: "business",
    title: "Бизнес",
    fields: ["название магазина", "тип бизнеса", "город", "домен", "короткое описание"],
  },
  {
    id: "brand",
    title: "Бренд",
    fields: ["логотип", "основной цвет", "название для PWA", "обложка главной"],
  },
  {
    id: "contacts",
    title: "Контакты",
    fields: ["телефон", "email", "адрес склада", "график работы", "мессенджеры если готовы"],
  },
  {
    id: "catalog",
    title: "Каталог",
    fields: ["файл товаров", "категории", "единицы измерения", "остатки", "фото или ссылки"],
  },
  {
    id: "delivery",
    title: "Доставка",
    fields: ["зоны доставки", "самовывоз", "минимальный заказ", "условия разгрузки", "оплата"],
  },
  {
    id: "launch",
    title: "Запуск",
    fields: ["ответственный менеджер", "тестовый заказ", "домен", "финальное подтверждение"],
  },
  {
    id: "sales",
    title: "Продажи и рефералы",
    fields: ["менеджер", "реферальный код", "источник клиента", "план вознаграждения", "статус оплаты"],
  },
];

export const ONE_CLICK_STORE_IMPORT_COLUMNS: StoreConstructorImportColumn[] = [
  { key: "sku", label: "Артикул", required: true, example: "CEM-M500-50" },
  { key: "name", label: "Название", required: true, example: "Цемент М500 50 кг" },
  { key: "category", label: "Категория", required: true, example: "Сухие смеси" },
  { key: "price", label: "Цена", required: true, example: "420" },
  { key: "unit", label: "Ед. изм.", required: true, example: "мешок" },
  { key: "stock", label: "Остаток", required: true, example: "180" },
  { key: "brand", label: "Бренд", required: false, example: "Евроцемент" },
  { key: "weight", label: "Вес", required: false, example: "50 кг" },
  { key: "volume", label: "Объём", required: false, example: "0.04 м³" },
  { key: "imageUrl", label: "Фото", required: false, example: "https://..." },
];

export const ONE_CLICK_STORE_LAUNCH_STEPS: StoreConstructorLaunchStep[] = [
  {
    id: "tenant",
    title: "Tenant, network, domain and baseline settings",
    status: "guarded",
    dataObjects: ["StoreNetwork", "Tenant", "SiteSettings", "ArayModuleState"],
    routes: ["/admin/site", "/admin/business/settings"],
    requiredOwnerInputs: ["network name", "store name", "site code", "domain", "city", "contacts"],
  },
  {
    id: "identity",
    title: "Brand, PWA and public shell",
    status: "ready",
    dataObjects: ["SiteSettings"],
    routes: ["/", "/api/pwa/manifest", "/api/pwa/site-icon"],
    requiredOwnerInputs: ["logo", "brand color", "short name"],
  },
  {
    id: "catalog",
    title: "Catalog, stock and product cards",
    status: "ready",
    dataObjects: ["Category", "Product", "ProductVariant"],
    routes: ["/catalog", "/admin/products"],
    requiredOwnerInputs: ["categories", "prices", "photos", "availability"],
  },
  {
    id: "sales",
    title: "Cart, checkout, orders and terminal",
    status: "ready",
    dataObjects: ["Order", "DeliveryRate", "TerminalConnector"],
    routes: ["/cart", "/checkout", "/admin/orders", "/admin/orders/new"],
    requiredOwnerInputs: ["delivery rules", "payment mode", "operator role"],
  },
  {
    id: "aray-workspace",
    title: "ARAY helper, CRM and tasks",
    status: "guarded",
    dataObjects: ["Lead", "Task", "ArayModuleState"],
    routes: ["/admin/aray/modules", "/admin/crm", "/admin/tasks"],
    requiredOwnerInputs: ["reply tone", "manager handoff", "task rules"],
  },
  {
    id: "content",
    title: "Media, stories and launch content",
    status: "ready",
    dataObjects: ["Story", "SiteSettings"],
    routes: ["/stories", "/admin/stories", "/admin/media"],
    requiredOwnerInputs: ["covers", "story set", "SEO texts"],
  },
  {
    id: "preflight",
    title: "Quality, mobile browser and deploy preflight",
    status: "guarded",
    dataObjects: [],
    routes: ["/admin/site/constructor"],
    requiredOwnerInputs: ["final launch approval"],
  },
];

export const STORE_CONSTRUCTOR_BLUEPRINTS: Record<
  StoreConstructorBusinessType,
  StoreConstructorBlueprint
> = {
  lumber: {
    key: "lumber",
    title: "ARAY интернет-магазин",
    terminalProfile: "lumber",
    storeKind: "materials catalog with sizes, stock and delivery",
    defaultSections: ["hero", "popular-products", "calculator", "delivery", "stories", "reviews"],
    catalogSeed: {
      categories: ["Boards", "Plywood", "Timber", "Finishing materials"],
      sampleProducts: ["Planed board", "Plywood sheet", "Dry timber", "Floor board"],
      requiredFields: ["sku", "unit", "price", "stock", "length", "width", "thickness", "photos"],
    },
    checkoutModes: ["cart", "delivery", "pickup", "manager-confirmation"],
    arayChannels: ["site-chat", "phone", "email", "telegram", "whatsapp"],
    ownerInputs: ["warehouse address", "delivery region", "minimum order", "sawing terms"],
  },
  restaurant: {
    key: "restaurant",
    title: "Restaurant and delivery store",
    terminalProfile: "restaurant",
    storeKind: "menu, delivery windows and pickup",
    defaultSections: ["hero", "menu", "combos", "delivery", "reviews", "stories"],
    catalogSeed: {
      categories: ["Menu", "Combos", "Drinks", "Specials"],
      sampleProducts: ["Lunch combo", "Family set", "Dessert", "Drink"],
      requiredFields: ["sku", "price", "photos", "ingredients", "availability", "preparationTime"],
    },
    checkoutModes: ["cart", "delivery-time", "pickup", "manager-confirmation"],
    arayChannels: ["site-chat", "phone", "email"],
    ownerInputs: ["kitchen hours", "delivery radius", "stop-list rules", "pickup address"],
  },
  retail: {
    key: "retail",
    title: "Retail ecommerce store",
    terminalProfile: "retail",
    storeKind: "classic product catalog with variants and promotions",
    defaultSections: ["hero", "categories", "hits", "promotions", "reviews", "stories"],
    catalogSeed: {
      categories: ["New", "Hits", "Sale", "Collections"],
      sampleProducts: ["Popular item", "Bundle", "Gift item", "Accessory"],
      requiredFields: ["sku", "price", "stock", "variant", "photos", "brand"],
    },
    checkoutModes: ["cart", "delivery", "pickup", "online-payment-ready"],
    arayChannels: ["site-chat", "email", "telegram", "whatsapp"],
    ownerInputs: ["brand palette", "delivery rules", "returns text", "promo calendar"],
  },
  services: {
    key: "services",
    title: "Services and booking store",
    terminalProfile: "services",
    storeKind: "service catalog with requests, quotes and tasks",
    defaultSections: ["hero", "services", "cases", "quote-form", "reviews", "stories"],
    catalogSeed: {
      categories: ["Consulting", "Installation", "Maintenance", "Urgent request"],
      sampleProducts: ["Basic service", "Project estimate", "Maintenance visit", "Priority support"],
      requiredFields: ["sku", "priceFrom", "duration", "photos", "serviceArea"],
    },
    checkoutModes: ["request", "quote", "manager-confirmation", "task-handoff"],
    arayChannels: ["site-chat", "phone", "email"],
    ownerInputs: ["service area", "working hours", "quote rules", "manager schedule"],
  },
  beauty: {
    key: "beauty",
    title: "Beauty and appointments store",
    terminalProfile: "beauty",
    storeKind: "services, appointments and product sales",
    defaultSections: ["hero", "services", "masters", "products", "reviews", "stories"],
    catalogSeed: {
      categories: ["Services", "Masters", "Cosmetics", "Gift cards"],
      sampleProducts: ["Haircut", "Coloring", "Care product", "Gift certificate"],
      requiredFields: ["sku", "price", "duration", "photos", "master", "availability"],
    },
    checkoutModes: ["booking-request", "cart", "manager-confirmation"],
    arayChannels: ["site-chat", "email", "phone"],
    ownerInputs: ["master list", "booking rules", "salon address", "working hours"],
  },
  construction: {
    key: "construction",
    title: "Магазин стройматериалов",
    terminalProfile: "construction",
    storeKind: "строительные материалы, сметы, склад и доставка на объект",
    defaultSections: ["hero", "categories", "popular-products", "estimate", "delivery", "stories"],
    catalogSeed: {
      categories: ["Сухие смеси", "Кирпич и блоки", "Пиломатериалы", "Кровля", "Утеплитель", "Инструменты"],
      sampleProducts: ["Цемент М500", "Газоблок", "Обрезная доска", "Профнастил", "Минеральная вата"],
      requiredFields: ["sku", "unit", "price", "stock", "weight", "volume", "brand", "photos"],
    },
    checkoutModes: ["cart", "estimate", "delivery", "pickup", "manager-confirmation"],
    arayChannels: ["site-chat", "phone", "email", "telegram", "whatsapp"],
    ownerInputs: ["catalog and price list", "warehouses and stock", "delivery zones", "minimum order"],
  },
  universal: {
    key: "universal",
    title: "Universal launch store",
    terminalProfile: "universal",
    storeKind: "safe default shop for any business",
    defaultSections: ["hero", "catalog", "benefits", "contacts", "reviews", "stories"],
    catalogSeed: {
      categories: ["Catalog", "Popular", "Services", "Offers"],
      sampleProducts: ["Main product", "Popular option", "Service package", "Special offer"],
      requiredFields: ["sku", "price", "photos", "availability", "description"],
    },
    checkoutModes: ["cart", "request", "manager-confirmation"],
    arayChannels: ["site-chat", "email", "phone"],
    ownerInputs: ["business type", "contacts", "catalog structure", "launch region"],
  },
};

export function isStoreConstructorBusinessType(value: unknown): value is StoreConstructorBusinessType {
  return STORE_CONSTRUCTOR_BUSINESS_TYPES.includes(value as StoreConstructorBusinessType);
}

export function getStoreConstructorBlueprint(value: unknown = "universal") {
  const key = isStoreConstructorBusinessType(value) ? value : "universal";
  return STORE_CONSTRUCTOR_BLUEPRINTS[key];
}

export function getOneClickStoreLaunchContract(value: unknown = "lumber") {
  const blueprint = getStoreConstructorBlueprint(value);
  return {
    version: STORE_CONSTRUCTOR_BLUEPRINT_VERSION,
    blueprint,
    requiredModules: [...ONE_CLICK_STORE_REQUIRED_MODULES],
    requiredRoutes: [...ONE_CLICK_STORE_REQUIRED_ROUTES],
    requiredCapabilities: [...ONE_CLICK_STORE_REQUIRED_CAPABILITIES],
    requiredDataObjects: [...ONE_CLICK_STORE_REQUIRED_DATA_OBJECTS],
    publicSurfaces: [...ONE_CLICK_STORE_PUBLIC_SURFACES],
    qualityGates: [...ONE_CLICK_STORE_QUALITY_GATES],
    launchSteps: [...ONE_CLICK_STORE_LAUNCH_STEPS],
    onboardingSteps: [...ONE_CLICK_STORE_ONBOARDING_STEPS],
    domainSteps: [...ONE_CLICK_STORE_DOMAIN_STEPS],
    questionnaire: [...ONE_CLICK_STORE_QUESTIONNAIRE],
    importColumns: [...ONE_CLICK_STORE_IMPORT_COLUMNS],
  };
}

export function getStoreConstructorReadinessMatrix() {
  return [
    {
      id: "contract",
      title: "One-click contract",
      status: "ready" as const,
      evidence: ["blueprints", "launch steps", "required routes", "quality gates"],
    },
    {
      id: "tenant",
      title: "Tenant-aware foundation",
      status: "guarded" as const,
      evidence: ["Tenant", "SiteSettings", "terminal profiles", "module states"],
    },
    {
      id: "buyer-flow",
      title: "Buyer flow",
      status: "ready" as const,
      evidence: ["catalog", "cart", "checkout", "compare", "wishlist", "PWA"],
    },
    {
      id: "aray-workspace",
      title: "ARAY workspace",
      status: "guarded" as const,
      evidence: ["widget", "CRM", "tasks", "email channels"],
    },
    {
      id: "deploy",
      title: "Deploy preflight",
      status: "guarded" as const,
      evidence: ["quality:full", "browser cart", "browser mobile", "browser stories"],
    },
  ];
}
