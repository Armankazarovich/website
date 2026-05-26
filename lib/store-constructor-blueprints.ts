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

export const STORE_CONSTRUCTOR_BLUEPRINT_VERSION = "2026-05-26.one-click-store";

export const STORE_CONSTRUCTOR_BUSINESS_TYPES = [
  "lumber",
  "restaurant",
  "retail",
  "services",
  "beauty",
  "construction",
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
  "/admin",
  "/admin/site",
  "/admin/site/constructor",
  "/admin/business/settings",
  "/admin/products",
  "/admin/orders",
  "/admin/messenger",
  "/admin/orders/new",
  "/admin/terminals",
  "/admin/aray/modules",
  "/api/pwa/manifest",
  "/api/pwa/site-icon",
  "/api/admin/site-constructor/blueprints",
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
  "SiteSettings",
  "Category",
  "Product",
  "ProductVariant",
  "DeliveryRate",
  "Order",
  "Lead",
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

export const ONE_CLICK_STORE_LAUNCH_STEPS: StoreConstructorLaunchStep[] = [
  {
    id: "tenant",
    title: "Tenant, domain and baseline settings",
    status: "guarded",
    dataObjects: ["Tenant", "SiteSettings", "ArayModuleState"],
    routes: ["/admin/site", "/admin/business/settings"],
    requiredOwnerInputs: ["store name", "domain", "city", "contacts"],
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
    title: "ARAY widget, messenger, CRM and tasks",
    status: "guarded",
    dataObjects: ["Lead", "Task", "ArayModuleState"],
    routes: ["/admin/messenger", "/admin/aray/modules"],
    requiredOwnerInputs: ["reply tone", "channel permissions", "manager handoff"],
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
    title: "PiloRus-style lumber store",
    terminalProfile: "lumber",
    storeKind: "materials catalog with sizes, stock and delivery",
    defaultSections: ["hero", "popular-products", "calculator", "delivery", "stories", "reviews"],
    catalogSeed: {
      categories: ["Boards", "Plywood", "Timber", "Finishing materials"],
      sampleProducts: ["Planed board", "Plywood sheet", "Dry timber", "Floor board"],
      requiredFields: ["sku", "unit", "price", "stock", "length", "width", "thickness", "photos"],
    },
    checkoutModes: ["cart", "delivery", "pickup", "manager-confirmation"],
    arayChannels: ["site-chat", "ar-phone", "messenger", "email", "telegram", "whatsapp"],
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
    arayChannels: ["site-chat", "phone", "messenger", "email"],
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
    arayChannels: ["site-chat", "messenger", "email", "telegram", "whatsapp"],
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
    arayChannels: ["site-chat", "ar-phone", "messenger", "email", "video"],
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
    arayChannels: ["site-chat", "messenger", "email", "phone"],
    ownerInputs: ["master list", "booking rules", "salon address", "working hours"],
  },
  construction: {
    key: "construction",
    title: "Construction and project supply store",
    terminalProfile: "construction",
    storeKind: "project materials, estimates and object delivery",
    defaultSections: ["hero", "object-kits", "materials", "estimate", "delivery", "stories"],
    catalogSeed: {
      categories: ["Object kits", "Materials", "Tools", "Services"],
      sampleProducts: ["Project kit", "Bulk material", "Tool rental", "Delivery service"],
      requiredFields: ["sku", "unit", "price", "stock", "objectUse", "photos"],
    },
    checkoutModes: ["cart", "estimate", "delivery", "manager-confirmation"],
    arayChannels: ["site-chat", "ar-phone", "messenger", "email", "video"],
    ownerInputs: ["delivery zones", "estimate template", "warehouse", "project stages"],
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
    arayChannels: ["site-chat", "messenger", "email", "phone"],
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
      evidence: ["widget", "messenger", "AR Phone", "tasks", "email channels"],
    },
    {
      id: "deploy",
      title: "Deploy preflight",
      status: "guarded" as const,
      evidence: ["quality:full", "browser cart", "browser mobile", "browser stories"],
    },
  ];
}
