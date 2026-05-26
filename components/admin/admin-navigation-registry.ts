import type { ElementType } from "react";
import type { TranslationKey } from "@/lib/admin-i18n";
import { GLOBAL_MEDIA_ROLES } from "@/lib/media-permissions";
import { ArayIcon } from "@/components/shared/aray-orb";
import {
  BarChart2,
  Bell,
  BookOpen,
  BriefcaseBusiness,
  CheckSquare,
  CirclePlay,
  FileCheck,
  FileDown,
  Globe,
  Heart,
  HeartPulse,
  History,
  Images,
  LayoutDashboard,
  Mail,
  Megaphone,
  MessageCircle,
  Monitor,
  Network,
  Package,
  Palette,
  Plus,
  Receipt,
  Settings,
  ShoppingBag,
  Stamp,
  Star,
  Tag,
  Target,
  Truck,
  UserCircle,
  Users,
  Wallet,
  Warehouse,
  Wrench,
} from "lucide-react";

export type AdminNavigationSurface =
  | "desktopRail"
  | "mobileDock"
  | "mobileMenu"
  | "headerSearch"
  | "searchPanel"
  | "accountDrawer"
  | "aray"
  | "direct";

export type AdminRouteKind =
  | "primary"
  | "detail"
  | "utility"
  | "experimental"
  | "external";

export type NavItem = {
  href: string;
  label: string;
  labelKey?: TranslationKey;
  badge?: string;
  icon: ElementType;
  exact?: boolean;
  roles: string[];
  group: string;
  groupKey?: TranslationKey;
  section?: string;
  moduleId?: string;
  routeKind?: AdminRouteKind;
  surfaces?: AdminNavigationSurface[];
  mobilePriority?: number;
  searchPriority?: number;
};

export type AdminRouteClassification = {
  href: string;
  label: string;
  kind: AdminRouteKind;
  group: string;
  roles: string[];
  moduleId?: string;
  parentHref?: string;
  reason?: string;
  surfaces: AdminNavigationSurface[];
};

export const SA = "SUPER_ADMIN";
export const ALL_STAFF = [SA, "ADMIN", "MANAGER", "COURIER", "ACCOUNTANT", "WAREHOUSE", "SELLER"];
export const ALL_ROLES = [...ALL_STAFF, "USER"];

export const ADMIN_NAV_PRIMARY_SURFACES: AdminNavigationSurface[] = [
  "desktopRail",
  "mobileMenu",
  "headerSearch",
  "searchPanel",
  "accountDrawer",
  "aray",
];

export const ADMIN_NAV_MOBILE_DOCK_SURFACES: AdminNavigationSurface[] = [
  "mobileDock",
  "mobileMenu",
  "headerSearch",
  "searchPanel",
  "aray",
];

export const GROUP_LABELS: Record<string, string> = {
  main: "Рабочий стол",
  personal: "Мой кабинет",
  sales: "Продажи",
  products: "Магазин",
  marketing: "Маркетинг",
  finance: "Финансы",
  settings: "Настройки",
  help: "Помощь",
};

export const GROUP_LABEL_KEYS: Partial<Record<string, TranslationKey>> = {
  marketing: "marketing",
  finance: "finance",
  help: "help",
};

export function getAdminGroupLabel(group: string, t?: (key: TranslationKey) => string): string {
  const labelKey = GROUP_LABEL_KEYS[group];
  if (labelKey && t) return t(labelKey);
  return GROUP_LABELS[group] || group;
}

export const allNavItems: NavItem[] = [
  { href: "/admin", label: "Рабочий стол", labelKey: "dashboard", icon: LayoutDashboard, exact: true, roles: ALL_STAFF, group: "main", section: "overview", mobilePriority: 1, surfaces: ADMIN_NAV_MOBILE_DOCK_SURFACES },
  { href: "/admin/director", label: "Роли и разделы", icon: BriefcaseBusiness, roles: ALL_STAFF, group: "main", section: "director", moduleId: "business.director-cabinet", searchPriority: 5 },
  { href: "/cabinet", label: "Главная", icon: LayoutDashboard, exact: true, roles: ["USER"], group: "main", section: "overview", mobilePriority: 1 },

  { href: "/cabinet/orders", label: "Мои заказы", icon: ShoppingBag, roles: ["USER"], group: "personal", section: "orders", mobilePriority: 20 },
  { href: "/cabinet/profile", label: "Профиль", icon: UserCircle, roles: ["USER"], group: "personal", section: "profile", mobilePriority: 40 },
  { href: "/cabinet/reviews", label: "Мои отзывы", icon: Star, roles: ["USER"], group: "personal", section: "reviews" },
  { href: "/cabinet/media", label: "Медиа", icon: Images, roles: ["USER"], group: "personal", section: "media" },
  { href: "/cabinet/subscriptions", label: "Подписки", icon: Heart, roles: ["USER"], group: "personal", section: "subscriptions" },
  { href: "/cabinet/history", label: "История", icon: History, roles: ["USER"], group: "personal", section: "history" },

  { href: "/admin/orders/new", label: "Терминал", badge: "Бета", icon: Receipt, roles: ALL_STAFF, group: "sales", groupKey: "sales", section: "terminal", moduleId: "business.terminal", mobilePriority: 10, surfaces: ADMIN_NAV_MOBILE_DOCK_SURFACES },
  { href: "/admin/orders", label: "Заказы", labelKey: "orders", icon: ShoppingBag, roles: ALL_STAFF, group: "sales", section: "orders", moduleId: "business.orders", mobilePriority: 20 },
  { href: "/admin/messenger", label: "Мессенджер", icon: MessageCircle, roles: ALL_STAFF, group: "sales", section: "messenger", moduleId: "business.aray-messenger", surfaces: ["direct", "aray"] },
  { href: "/admin/delivery", label: "Доставка", labelKey: "delivery", icon: Truck, roles: [SA, "ADMIN", "MANAGER", "COURIER"], group: "sales", section: "delivery", mobilePriority: 30 },
  { href: "/admin/clients", label: "Клиенты", labelKey: "clients", icon: UserCircle, roles: [SA, "ADMIN", "MANAGER"], group: "sales", section: "clients" },
  { href: "/admin/crm", label: "CRM / Лиды", labelKey: "crm", icon: Target, roles: [SA, "ADMIN", "MANAGER", "SELLER"], group: "sales", section: "crm" },
  { href: "/admin/workflows", label: "Сценарии продаж", icon: Network, roles: [SA, "ADMIN", "MANAGER"], group: "sales", section: "crm" },
  { href: "/admin/tasks", label: "Задачи", labelKey: "tasks", icon: CheckSquare, roles: ALL_STAFF, group: "sales", section: "tasks" },

  { href: "/admin/aray", label: "ARAY", icon: ArayIcon, roles: [SA, "ADMIN", "MANAGER"], group: "settings", section: "aray", moduleId: "core.aray-voice" },

  { href: "/admin/products", label: "Каталог", labelKey: "catalog", icon: Package, roles: [SA, "ADMIN", "MANAGER", "WAREHOUSE", "SELLER"], group: "products", groupKey: "products", section: "catalog", mobilePriority: 30 },
  { href: "/admin/products/new", label: "Новый товар", icon: Plus, roles: [SA, "ADMIN", "MANAGER", "WAREHOUSE", "SELLER"], group: "products", section: "catalog-create" },
  { href: "/admin/products/audit", label: "Аудит каталога", icon: FileCheck, roles: [SA, "ADMIN", "MANAGER"], group: "products", section: "catalog-audit" },
  { href: "/catalog", label: "Каталог", icon: Package, roles: ["USER"], group: "products", groupKey: "products", section: "store-catalog", mobilePriority: 10 },
  { href: "/admin/categories", label: "Категории", labelKey: "categories", icon: Tag, roles: [SA, "ADMIN", "MANAGER"], group: "products", section: "categories" },
  { href: "/admin/product-types", label: "Типы товаров", icon: Tag, roles: [SA, "ADMIN", "MANAGER"], group: "products", section: "product-types" },
  { href: "/admin/inventory", label: "Склад / остатки", labelKey: "inventory", icon: Warehouse, roles: [SA, "ADMIN", "MANAGER", "WAREHOUSE"], group: "products", section: "inventory" },
  { href: "/admin/media", label: "Медиа", labelKey: "media", icon: Images, roles: [...GLOBAL_MEDIA_ROLES], group: "products", section: "media" },
  { href: "/admin/watermark", label: "Водяной знак", labelKey: "watermark", icon: Stamp, roles: [SA, "ADMIN"], group: "products", section: "media-protection" },
  { href: "/admin/import", label: "Импорт", labelKey: "import_export", icon: FileDown, roles: [SA, "ADMIN", "MANAGER", "WAREHOUSE"], group: "products", section: "import" },
  { href: "/admin/business/settings", label: "Роли и бизнес", icon: Settings, roles: [SA, "ADMIN", "MANAGER"], group: "settings", section: "business-settings", moduleId: "business.role-os" },
  { href: "/admin/site", label: "Сайт", labelKey: "site_settings", icon: Globe, roles: [SA, "ADMIN"], group: "settings", section: "site" },
  { href: "/admin/site/constructor", label: "Конструктор магазина", icon: Globe, roles: [SA, "ADMIN"], group: "settings", section: "site", moduleId: "constructor.store-builder" },
  { href: "/admin/appearance", label: "Оформление", labelKey: "appearance", icon: Palette, roles: [SA, "ADMIN"], group: "settings", section: "appearance" },

  { href: "/admin/promotion", label: "Реклама / Direct", labelKey: "promotion", icon: BarChart2, roles: [SA, "ADMIN", "MANAGER"], group: "marketing", groupKey: "marketing", section: "promotion" },
  { href: "/admin/promotions", label: "Акции", labelKey: "promotions", icon: Megaphone, roles: [SA, "ADMIN", "MANAGER"], group: "marketing", section: "promotions" },
  { href: "/admin/reviews", label: "Отзывы", labelKey: "reviews", icon: Star, roles: [SA, "ADMIN", "MANAGER"], group: "marketing", section: "reviews" },
  { href: "/admin/email", label: "Рассылки", labelKey: "email", icon: Mail, roles: [SA, "ADMIN"], group: "marketing", section: "email" },
  { href: "/admin/notifications", label: "Уведомления", labelKey: "notifications", icon: Bell, roles: [SA, "ADMIN"], group: "marketing", section: "notifications", moduleId: "core.notifications" },
  { href: "/admin/analytics", label: "Аналитика", labelKey: "analytics", icon: BarChart2, roles: [SA, "ADMIN", "ACCOUNTANT"], group: "marketing", section: "analytics" },
  { href: "/admin/posts", label: "Статьи / Новости", icon: BookOpen, roles: [SA, "ADMIN", "MANAGER"], group: "marketing", section: "content" },
  { href: "/admin/services", label: "Услуги", icon: Wrench, roles: [SA, "ADMIN", "MANAGER"], group: "marketing", section: "content" },
  { href: "/admin/stories", label: "Сторис", icon: CirclePlay, roles: [SA, "ADMIN", "MANAGER", "SELLER"], group: "marketing", section: "content" },

  { href: "/admin/finance", label: "Финансы", labelKey: "finance", icon: Wallet, roles: [SA, "ADMIN", "ACCOUNTANT"], group: "finance", groupKey: "finance", section: "finance", moduleId: "finance.wallet-ledger" },

  { href: "/admin/settings", label: "Настройки", labelKey: "settings", icon: Settings, roles: [SA, "ADMIN"], group: "settings", groupKey: "settings", section: "system" },
  { href: "/admin/terminals", label: "Настройки терминала", icon: Monitor, roles: [SA, "ADMIN"], group: "settings", section: "terminals", moduleId: "business.terminal" },
  { href: "/admin/staff", label: "Команда", labelKey: "staff", icon: Users, roles: [SA, "ADMIN"], group: "settings", section: "team" },
  { href: "/admin/health", label: "Здоровье системы", labelKey: "health", icon: HeartPulse, roles: [SA, "ADMIN"], group: "settings", section: "health" },

  { href: "/cabinet/notifications", label: "Уведомления", icon: Bell, roles: ["USER"], group: "settings", groupKey: "settings", section: "user-notifications" },
  { href: "/cabinet/appearance", label: "Оформление", icon: Palette, roles: ["USER"], group: "settings", section: "user-appearance" },

  { href: "/admin/help", label: "База знаний", labelKey: "help", icon: BookOpen, roles: ALL_ROLES, group: "help", section: "knowledge" },
  { href: "/admin/terminals/training", label: "Обучение терминала", icon: BookOpen, roles: ALL_STAFF, group: "help", section: "terminal-training", moduleId: "business.terminal" },
];

const primaryRouteClassifications = Object.fromEntries(
  allNavItems.map((item) => [
    item.href,
    {
      href: item.href,
      label: item.label,
      kind: item.href.startsWith("/admin") || item.href.startsWith("/cabinet") ? "primary" : "external",
      group: item.group,
      roles: item.roles,
      moduleId: item.moduleId,
      parentHref: undefined,
      reason: item.href.startsWith("/admin") || item.href.startsWith("/cabinet") ? "direct navigation item" : "store/public route used from shared search",
      surfaces: item.surfaces || ADMIN_NAV_PRIMARY_SURFACES,
    },
  ]),
) as Record<string, AdminRouteClassification>;

export const ADMIN_ROUTE_CLASSIFICATIONS: Record<string, AdminRouteClassification> = {
  ...primaryRouteClassifications,
  "/admin/crm/automation": {
    href: "/admin/crm/automation",
    label: "Автоматизация CRM",
    kind: "utility",
    group: "sales",
    roles: [SA, "ADMIN", "MANAGER"],
    parentHref: "/admin/crm",
    reason: "opened from CRM settings, not a separate menu item",
    surfaces: ["direct", "searchPanel", "aray"],
  },
  "/admin/aray/agents": {
    href: "/admin/aray/agents",
    label: "Агенты ARAY",
    kind: "utility",
    group: "settings",
    roles: [SA, "ADMIN"],
    moduleId: "core.aray-voice",
    parentHref: "/admin/aray",
    reason: "opened from ARAY settings, not a separate menu item",
    surfaces: ["direct", "searchPanel", "aray"],
  },
  "/admin/aray/costs": {
    href: "/admin/aray/costs",
    label: "Лимиты ARAY",
    kind: "utility",
    group: "settings",
    roles: [SA, "ADMIN"],
    moduleId: "core.aray-voice",
    parentHref: "/admin/aray",
    reason: "opened from ARAY settings, not a separate menu item",
    surfaces: ["direct", "searchPanel", "aray"],
  },
  "/admin/aray/connectors": {
    href: "/admin/aray/connectors",
    label: "Подключения ARAY",
    kind: "utility",
    group: "settings",
    roles: [SA, "ADMIN"],
    moduleId: "core.connector-vault",
    parentHref: "/admin/aray",
    reason: "super-admin connector matrix for keys, OAuth, permissions and provider readiness",
    surfaces: ["direct", "searchPanel", "aray"],
  },
  "/admin/aray/modules": {
    href: "/admin/aray/modules",
    label: "Модули ARAY",
    kind: "utility",
    group: "settings",
    roles: [SA, "ADMIN"],
    moduleId: "core.module-control-center",
    parentHref: "/admin/aray",
    reason: "module control center for passports, dependencies, permissions and ARAY skills",
    surfaces: ["direct", "searchPanel", "aray"],
  },
  "/api/admin/site-constructor/blueprints": {
    href: "/api/admin/site-constructor/blueprints",
    label: "Store constructor blueprints API",
    kind: "utility",
    group: "settings",
    roles: [SA, "ADMIN"],
    moduleId: "constructor.store-builder",
    parentHref: "/admin/site/constructor",
    reason: "blueprint contract for one-click store creation",
    surfaces: ["direct", "aray"],
  },
  "/admin/orders/[id]": {
    href: "/admin/orders/[id]",
    label: "Карточка заказа",
    kind: "detail",
    group: "sales",
    roles: ALL_STAFF,
    moduleId: "business.orders",
    parentHref: "/admin/orders",
    reason: "opened from orders/search, not a top-level menu item",
    surfaces: ["direct", "searchPanel", "aray"],
  },
  "/admin/orders/trash": {
    href: "/admin/orders/trash",
    label: "Корзина заказов",
    kind: "utility",
    group: "sales",
    roles: [SA, "ADMIN", "MANAGER"],
    moduleId: "business.orders",
    parentHref: "/admin/orders",
    reason: "maintenance view inside orders",
    surfaces: ["direct", "searchPanel", "aray"],
  },
  "/admin/delivery/rates": {
    href: "/admin/delivery/rates",
    label: "Тарифы доставки",
    kind: "utility",
    group: "sales",
    roles: [SA, "ADMIN", "MANAGER"],
    parentHref: "/admin/delivery",
    reason: "delivery settings opened from delivery section",
    surfaces: ["direct", "searchPanel", "aray"],
  },
  "/admin/exchange": {
    href: "/admin/exchange",
    label: "Площадка поставщиков",
    kind: "utility",
    group: "sales",
    roles: ALL_STAFF,
    moduleId: "business.terminal",
    parentHref: "/admin/orders/new",
    reason: "temporarily parked supplier marketplace; direct hits redirect to the terminal",
    surfaces: ["direct"],
  },
  "/admin/products/[id]": {
    href: "/admin/products/[id]",
    label: "Карточка товара",
    kind: "detail",
    group: "products",
    roles: [SA, "ADMIN", "MANAGER", "WAREHOUSE", "SELLER"],
    parentHref: "/admin/products",
    reason: "opened from catalog/search",
    surfaces: ["direct", "searchPanel", "aray"],
  },
  "/admin/products/import-prices": {
    href: "/admin/products/import-prices",
    label: "Импорт цен",
    kind: "utility",
    group: "products",
    roles: [SA, "ADMIN", "MANAGER", "WAREHOUSE"],
    parentHref: "/admin/import",
    reason: "catalog import utility",
    surfaces: ["direct", "searchPanel", "aray"],
  },
  "/admin/images/fix": {
    href: "/admin/images/fix",
    label: "Ремонт изображений",
    kind: "utility",
    group: "products",
    roles: [SA, "ADMIN"],
    parentHref: "/admin/media",
    reason: "media maintenance utility",
    surfaces: ["direct", "searchPanel", "aray"],
  },
  "/admin/watermark/recovery": {
    href: "/admin/watermark/recovery",
    label: "Восстановление водяного знака",
    kind: "utility",
    group: "products",
    roles: [SA, "ADMIN"],
    parentHref: "/admin/watermark",
    reason: "watermark recovery utility",
    surfaces: ["direct", "searchPanel", "aray"],
  },
  "/admin/aray-lab": {
    href: "/admin/aray-lab",
    label: "ARAY Lab",
    kind: "experimental",
    group: "settings",
    roles: [SA, "ADMIN"],
    moduleId: "core.aray-voice",
    parentHref: "/admin/aray",
    reason: "experimental lab, hidden until product-ready",
    surfaces: ["direct"],
  },
  "/cabinet/orders/[id]": {
    href: "/cabinet/orders/[id]",
    label: "Заказ клиента",
    kind: "detail",
    group: "personal",
    roles: ["USER", ...ALL_STAFF],
    parentHref: "/cabinet/orders",
    reason: "opened from cabinet orders",
    surfaces: ["direct", "searchPanel", "aray"],
  },
};

function stripQuery(href: string) {
  return href.split("?")[0];
}

export function normalizeNavigationPath(pathname: string) {
  return stripQuery(pathname).replace(/\/$/, "") || "/";
}

function routePatternToRegExp(pattern: string) {
  const escaped = pattern
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\\\[.+?\\\]/g, "[^/]+");
  return new RegExp(`^${escaped}$`);
}

export function isAdminNavItemVisible(item: NavItem, role?: string) {
  return !item.roles || !role || item.roles.includes(role);
}

export function isAdminNavItemMatch(item: NavItem, pathname: string): boolean {
  const path = normalizeNavigationPath(pathname);
  if (item.exact) return path === item.href;
  return path === item.href || path.startsWith(`${item.href}/`);
}

export function getAdminRouteClassification(pathname: string): AdminRouteClassification | null {
  const path = normalizeNavigationPath(pathname);
  const exact = ADMIN_ROUTE_CLASSIFICATIONS[path];
  if (exact) return exact;

  const dynamic = Object.values(ADMIN_ROUTE_CLASSIFICATIONS)
    .filter((route) => route.href.includes("[") && routePatternToRegExp(route.href).test(path))
    .sort((a, b) => b.href.length - a.href.length)[0];

  if (dynamic) return dynamic;

  return (
    Object.values(ADMIN_ROUTE_CLASSIFICATIONS)
      .filter((route) => route.kind === "primary" && path.startsWith(`${route.href}/`))
      .sort((a, b) => b.href.length - a.href.length)[0] || null
  );
}
