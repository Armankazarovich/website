"use client";

import type { ElementType } from "react";
import { Plus, Sparkles } from "lucide-react";
import { ArayIcon } from "@/components/shared/aray-orb";
import {
  ALL_STAFF,
  allNavItems,
  getAdminGroupLabel,
  type NavItem,
} from "@/components/admin/admin-navigation-registry";
import {
  ADMIN_NAV_GROUP_DESCRIPTIONS,
  ADMIN_NAV_GROUP_ORDER,
  buildAdminNavSections,
  type AdminNavSection,
} from "@/components/admin/admin-nav-structure";

type AdminNavigationTranslate = (key: NonNullable<NavItem["labelKey"]>) => string;
type DisabledModuleIds = readonly string[];

export type AdminNavigationPageMeta = {
  title: string;
  subtitle?: string;
  icon: ElementType | "aray";
};

export type AdminNavigationQuickDescriptor = {
  href: string;
  title: string;
  subtitle: string;
  icon: ElementType;
  roles?: string[];
  moduleId?: string;
};

export type AdminNavigationMobileDockItem = {
  href: string;
  label: string;
  compactLabel: string;
  icon: ElementType;
  exact?: boolean;
};

export type AdminNavigationMobileCapsule = {
  label: string;
  subtitle: string;
  groupLabel: string;
  items: AdminNavigationMobileDockItem[];
  quick: AdminNavigationQuickDescriptor[];
};

export type AdminNavigationSearchContext = {
  match: string;
  label: string;
  placeholder: string;
  nextStep: string;
  quick: AdminNavigationQuickDescriptor[];
  hints: string[];
};

export type AdminNavigationGroup = {
  key: string;
  label: string;
  description?: string;
  icon: ElementType;
  items: NavItem[];
  sections: AdminNavSection[];
};

type AdminNavigationRouteMeta = {
  title?: string;
  subtitle?: string;
  icon?: ElementType | "aray";
  searchHint?: string;
  keywords?: string[];
  quickTitle?: string;
  quickSubtitle?: string;
  placeholder?: string;
  nextStep?: string;
  quickHrefs?: string[];
  mobilePriority?: number;
};

const ADMIN_ROLES = ["SUPER_ADMIN", "ADMIN"];
const SALES_ROLES = ["SUPER_ADMIN", "ADMIN", "MANAGER", "SELLER"];
const CATALOG_ROLES = ["SUPER_ADMIN", "ADMIN", "MANAGER", "WAREHOUSE", "SELLER"];

export const ADMIN_NAVIGATION_META: Record<string, AdminNavigationRouteMeta> = {
  "/admin": {
    title: "Рабочий стол",
    subtitle: "Сводка, заказы и запуск",
    searchHint: "Сводка и показатели",
    keywords: ["арай", "aray", "рабочий стол", "сводка", "показатели"],
    placeholder: "Найти заказ, клиента, товар или раздел...",
    nextStep: "Проверить рабочий стол по реальным сигналам",
    quickHrefs: ["/admin/orders", "/admin/products", "/admin/promotion", "/admin/orders/new", "/admin/stories", "/admin/director"],
  },
  "/admin/director": {
    title: "Роли и разделы",
    subtitle: "Пульт системы и автоматизации",
    searchHint: "Роли, разделы и приоритеты",
    keywords: ["директор", "кабинет", "роли", "разделы", "сотрудники", "зарплаты", "графики", "автоматизация", "отчеты"],
    placeholder: "Роль, раздел, сотрудник, график, отчет или риск...",
    nextStep: "Показать карту разделов и приоритеты по роли",
    quickTitle: "Роли и разделы",
    quickSubtitle: "Пульт системы",
    quickHrefs: ["/admin/director", "/admin/finance", "/admin/staff", "/admin/crm", "/admin/tasks", "/admin/aray/modules"],
  },
  "/admin/orders/new": {
    title: "Терминал",
    subtitle: "Касса и заказы · Бета",
    searchHint: "Терминал и новый заказ",
    keywords: ["терминал", "касса", "новый заказ", "продажа"],
    placeholder: "Клиент, телефон, товар, доставка или раздел...",
    nextStep: "Проверить заказ и найти недостающие данные",
    quickTitle: "Новый заказ",
    quickSubtitle: "Открыть терминал",
    quickHrefs: ["/admin/crm", "/admin/orders", "/admin/clients", "/admin/products", "/admin/delivery"],
    mobilePriority: 10,
  },
  "/admin/orders": {
    title: "Заказы",
    subtitle: "Активные и архив",
    searchHint: "Очередь и история",
    keywords: ["заказ", "заказы", "очередь", "история", "доставка"],
    placeholder: "Номер заказа, телефон, клиент, адрес или статус...",
    nextStep: "Найти заказ и подсказать действие",
    quickHrefs: ["/admin/orders/new", "/admin/crm", "/admin/clients", "/admin/delivery", "/admin/tasks"],
    mobilePriority: 20,
  },
  "/admin/messenger": {
    title: "Мессенджер",
    subtitle: "Чаты, CRM и Арай",
    searchHint: "Переписки и помощь Арая",
    keywords: ["мессенджер", "чат", "сообщения", "переписка", "арай", "aray", "клиент", "crm"],
    placeholder: "Клиент, сообщение, задача, CRM или действие Арая...",
    nextStep: "Открыть диалог и подготовить понятный ответ",
    quickTitle: "Мессенджер",
    quickSubtitle: "Чаты и Арай",
    quickHrefs: ["/admin/messenger", "/admin/crm", "/admin/tasks", "/admin/clients", "/admin/orders"],
    mobilePriority: 25,
  },
  "/admin/clients": {
    title: "Клиенты",
    subtitle: "База покупателей",
    searchHint: "База покупателей",
    keywords: ["клиент", "клиенты", "телефон", "email", "crm"],
    placeholder: "Имя, телефон, email, заказ или CRM...",
    nextStep: "Найти клиента и предложить действие",
    quickHrefs: ["/admin/orders/new", "/admin/orders", "/admin/crm", "/admin/tasks"],
  },
  "/admin/crm": {
    title: "ARAY CRM",
    subtitle: "Лиды и сделки",
    searchHint: "Лиды и сделки",
    keywords: ["crm", "лид", "сделка", "клиент"],
    placeholder: "Лид, клиент, телефон, задача или автоматизация...",
    nextStep: "Найти слабое место в продажах",
    quickHrefs: ["/admin/clients", "/admin/tasks", "/admin/crm/automation", "/admin/orders"],
  },
  "/admin/crm/automation": {
    title: "CRM Автоматизация",
    subtitle: "Роботы, тоннели и правила",
    searchHint: "Тоннели и правила",
    keywords: ["crm", "автоматизация", "робот", "воронка"],
  },
  "/admin/workflows": {
    title: "Сценарии",
    subtitle: "Рабочие процессы",
    searchHint: "Процессы и автоматизация",
    keywords: ["workflow", "сценарии", "процессы", "автоматизация"],
  },
  "/admin/tasks": {
    title: "Задачи",
    subtitle: "Команда",
    searchHint: "Команда",
    keywords: ["задачи", "команда", "контроль"],
  },
  "/admin/delivery": {
    title: "Доставка",
    subtitle: "Маршруты и тарифы",
    searchHint: "Маршруты и статусы",
    keywords: ["доставка", "маршрут", "курьер", "тариф"],
  },
  "/admin/products": {
    title: "Каталог",
    subtitle: "Товары магазина",
    searchHint: "Каталог и карточки",
    keywords: ["каталог", "товар", "товары", "склад", "категория"],
    placeholder: "Товар, категория, slug, склад или импорт...",
    nextStep: "Проверить готовность товара",
    quickHrefs: ["/admin/products/new", "/admin/categories", "/admin/product-types", "/admin/inventory", "/admin/import", "/admin/media"],
    mobilePriority: 30,
  },
  "/admin/products/new": {
    title: "Новый товар",
    subtitle: "Создать карточку",
    searchHint: "Создать карточку товара",
    keywords: ["новый товар", "создать товар", "карточка"],
    quickTitle: "Новый товар",
    quickSubtitle: "Создать карточку",
  },
  "/admin/products/audit": {
    title: "Аудит каталога",
    subtitle: "Проверка карточек и готовности",
    searchHint: "Проверка карточек",
    keywords: ["аудит каталога", "проверка карточек", "готовность товара"],
  },
  "/admin/categories": {
    title: "Категории",
    subtitle: "Дерево разделов",
    searchHint: "Дерево каталога",
    keywords: ["категории", "разделы", "каталог"],
  },
  "/admin/product-types": {
    title: "Типы товаров",
    subtitle: "Фильтры, описания и SEO",
    searchHint: "Типы товаров и SEO каталога",
    keywords: ["типы товаров", "фильтры", "seo", "описания", "индексация", "каталог"],
    placeholder: "Тип товара, SEO, описание, фильтр или категория...",
    nextStep: "Проверить фильтры каталога, видимость и SEO для посадочных страниц",
    quickHrefs: ["/admin/products", "/admin/categories", "/admin/products/audit", "/admin/promotion"],
  },
  "/admin/inventory": {
    title: "Склад",
    subtitle: "Остатки и движение",
    searchHint: "Остатки и движение",
    keywords: ["склад", "остатки", "инвентарь"],
  },
  "/admin/import": {
    title: "Импорт / Экспорт",
    subtitle: "CSV, Excel",
    searchHint: "CSV и Excel",
    keywords: ["импорт", "экспорт", "csv", "excel"],
  },
  "/admin/media": {
    title: "Медиабиблиотека",
    subtitle: "Фото и документы",
    searchHint: "Фото и документы",
    keywords: ["медиа", "фото", "документы", "изображения"],
  },
  "/admin/watermark": {
    title: "Водяной знак",
    subtitle: "Защита фото",
    searchHint: "Защита фото",
    keywords: ["водяной знак", "фото", "защита"],
  },
  "/admin/images/fix": {
    title: "Ремонт изображений",
    subtitle: "Техническая утилита медиа",
    searchHint: "Починка фото",
    keywords: ["изображения", "фото", "ремонт", "медиа"],
  },
  "/admin/business/settings": {
    title: "Настройки бизнеса",
    subtitle: "Сайт, каталог и продажи",
    searchHint: "Сайт, витрина, SEO",
    keywords: ["бизнес", "настройки бизнеса", "сайт", "витрина", "seo"],
  },
  "/admin/site": {
    title: "Сайт",
    subtitle: "Настройки магазина",
    searchHint: "Витрина и страницы",
    keywords: ["сайт", "страницы", "витрина"],
  },
  "/admin/appearance": {
    title: "Оформление",
    subtitle: "Темы и палитры",
    searchHint: "Тема и палитра",
    keywords: ["оформление", "тема", "палитра", "дизайн"],
    placeholder: "Тема, палитра, витрина, сайт или визуальная настройка...",
    nextStep: "Проверить визуальную систему и найти конкретный риск",
    quickHrefs: ["/admin/appearance", "/admin/site", "/admin/business/settings", "/admin/products"],
  },
  "/admin/promotion": {
    title: "Продвижение",
    subtitle: "SEO и реклама",
    searchHint: "SEO и реклама",
    keywords: ["продвижение", "seo", "реклама"],
  },
  "/admin/promotions": {
    title: "Акции",
    subtitle: "Скидки и предложения",
    searchHint: "Скидки и предложения",
    keywords: ["акции", "скидки", "предложения"],
    quickHrefs: ["/admin/promotion", "/admin/email", "/admin/reviews", "/admin/analytics"],
  },
  "/admin/reviews": {
    title: "Отзывы",
    subtitle: "Модерация",
    searchHint: "Модерация",
    keywords: ["отзывы", "модерация", "клиенты"],
  },
  "/admin/email": {
    title: "Рассылки",
    subtitle: "Email и push",
    searchHint: "Email и push",
    keywords: ["рассылка", "email", "push"],
  },
  "/admin/notifications": {
    title: "Уведомления",
    subtitle: "Push рассылка",
    searchHint: "Push рассылка",
    keywords: ["уведомления", "push", "рассылка"],
  },
  "/admin/analytics": {
    title: "Аналитика",
    subtitle: "Графики и отчеты",
    searchHint: "Продажи и динамика",
    keywords: ["аналитика", "график", "отчет", "продажи"],
  },
  "/admin/finance": {
    title: "Финансы",
    subtitle: "Доходы и расходы",
    searchHint: "Финансы, отчеты, будущий ARC",
    keywords: ["финансы", "деньги", "расход", "доход"],
    placeholder: "Заказ, сумма, расход, аналитика или отчет...",
    nextStep: "Проверить финансовый риск",
    quickHrefs: ["/admin/finance", "/admin/orders", "/admin/analytics"],
  },
  "/admin/settings": {
    title: "Настройки",
    subtitle: "Бизнес, сайт, ARAY и система",
    searchHint: "Центр настроек",
    keywords: ["настройки", "aray", "арай", "сайт", "система", "команда", "терминал", "доставка", "кэш"],
    placeholder: "Настройка, ARAY, команда, терминал, сайт или помощь...",
    nextStep: "Открыть нужный раздел настроек",
    quickHrefs: ["/admin/settings", "/admin/aray", "/admin/business/settings", "/admin/site", "/admin/appearance", "/admin/terminals", "/admin/staff", "/admin/health"],
  },
  "/admin/terminals": {
    title: "Настройки терминала",
    subtitle: "Оплата, устройства и рабочие места",
    searchHint: "Оплата, устройства и рабочие места",
    keywords: ["терминал", "оплата", "касса", "устройство"],
  },
  "/admin/terminals/training": {
    title: "Обучение терминала",
    subtitle: "Сценарии запуска",
    searchHint: "Сценарии запуска",
    keywords: ["обучение терминала", "терминал", "сценарии"],
  },
  "/admin/staff": {
    title: "Команда",
    subtitle: "Сотрудники",
    searchHint: "Сотрудники",
    keywords: ["команда", "сотрудники", "роли", "доступ"],
  },
  "/admin/health": {
    title: "Здоровье системы",
    subtitle: "Состояние системы",
    searchHint: "Состояние системы",
    keywords: ["здоровье", "система", "ошибки"],
  },
  "/admin/help": {
    title: "Помощь",
    subtitle: "Гайды",
    searchHint: "База знаний",
    keywords: ["помощь", "гайд", "база знаний"],
  },
  "/admin/aray": {
    title: "ARAY",
    subtitle: "Помощник, модули, голос, агенты и лимиты",
    icon: "aray",
    searchHint: "Помощник, модули, голос, агенты и лимиты",
    keywords: ["арай", "aray", "ai", "модули", "modules", "агенты", "помощник", "голос", "лимиты", "подключения", "коннекторы"],
    placeholder: "Помощник, модуль, подключение, лимит, голос или раздел...",
    nextStep: "Открыть нужное действие ARAY",
    quickHrefs: ["/admin/aray", "/admin/aray/modules", "/admin/aray/connectors", "/admin/aray/agents", "/admin/aray/costs"],
  },
  "/admin/aray/modules": {
    title: "Модули ARAY",
    subtitle: "Паспорта, зависимости и quality",
    icon: "aray",
    searchHint: "Паспорта, зависимости и quality",
    keywords: ["модули", "module", "modules", "паспорт", "registry", "зависимости", "quality"],
  },
  "/admin/aray/connectors": {
    title: "Подключения ARAY",
    subtitle: "Коннекторы, ключи и зависимости",
    icon: "aray",
    searchHint: "Коннекторы, ключи и зависимости",
    keywords: ["подключения", "коннекторы", "connectors", "ключи", "env", "интеграции"],
  },
  "/admin/aray/agents": {
    title: "Агенты ARAY",
    subtitle: "Роли, отделы и качество",
    searchHint: "Роли, отделы и качество",
    keywords: ["агенты", "качество", "отделы"],
  },
  "/admin/aray/costs": {
    title: "Лимиты ARAY",
    subtitle: "Токены, подписки и расходы",
    icon: "aray",
    searchHint: "Токены, подписки и расходы",
    keywords: ["aray", "бюджет", "расходы", "токены", "лимиты"],
  },
  "/admin/aray-lab": {
    title: "ARAY Lab",
    subtitle: "Эксперименты",
    icon: "aray",
    searchHint: "Лаборатория ARAY",
    keywords: ["aray lab", "лаборатория", "эксперимент"],
  },
  "/admin/posts": {
    title: "Статьи",
    subtitle: "Блог и новости",
    searchHint: "Блог и новости",
    keywords: ["статьи", "блог", "новости"],
  },
  "/admin/services": {
    title: "Услуги",
    subtitle: "Сервисы",
    searchHint: "Сервисы",
    keywords: ["услуги", "сервисы"],
  },
  "/admin/stories": {
    title: "Сторис",
    subtitle: "Видео, live и онлайн-продавец",
    searchHint: "Видео-сторис, обзоры и отзывы",
    keywords: ["сторис", "stories", "видео", "live", "онлайн продавец", "отзывы", "обзор товара"],
    placeholder: "Сторис, товар, услуга, отзыв, видео или live...",
    nextStep: "Найти нужный обзор и проверить, где он показывается",
    quickHrefs: ["/admin/services", "/admin/products", "/admin/reviews", "/admin/promotions"],
  },
  "/cabinet": {
    title: "Главная",
    subtitle: "Личный кабинет",
    searchHint: "Сводка кабинета",
    keywords: ["кабинет", "главная"],
    placeholder: "Заказ, товар, профиль или помощь...",
    nextStep: "Помочь быстрее найти нужное",
    quickHrefs: ["/cabinet", "/cabinet/orders", "/catalog", "/cabinet/profile"],
  },
  "/cabinet/orders": {
    title: "Мои заказы",
    subtitle: "Активные и история",
    searchHint: "Активные и история",
    keywords: ["мои заказы", "заказы", "история"],
  },
  "/cabinet/profile": {
    title: "Профиль",
    subtitle: "Имя, аватар, тема",
    searchHint: "Имя, аватар, тема",
    keywords: ["профиль", "имя", "аватар"],
  },
  "/catalog": {
    title: "Каталог",
    subtitle: "Товары магазина",
    searchHint: "Товары магазина",
    keywords: ["каталог", "товары", "магазин"],
  },
};

const GROUP_QUICK_HREFS: Record<string, string[]> = {
  main: ["/admin", "/admin/orders", "/admin/products", "/admin/promotion", "/admin/stories", "/admin/director"],
  sales: ["/admin/orders", "/admin/orders/new", "/admin/messenger", "/admin/crm", "/admin/clients", "/admin/delivery", "/admin/tasks"],
  products: ["/admin/products", "/admin/products/new", "/admin/products/audit", "/admin/inventory", "/admin/media", "/admin/import"],
  marketing: ["/admin/promotion", "/admin/stories", "/admin/reviews", "/admin/promotions", "/admin/posts", "/admin/services", "/admin/analytics"],
  finance: ["/admin/finance", "/admin/orders", "/admin/analytics"],
  settings: ["/admin/business/settings", "/admin/staff", "/admin/site", "/admin/appearance", "/admin/aray", "/admin/settings", "/admin/health"],
  help: ["/admin/help", "/admin/terminals/training"],
  personal: ["/cabinet", "/cabinet/orders", "/cabinet/profile", "/catalog"],
};

const DEFAULT_ADMIN_QUICK_HREFS = ["/admin", "/admin/orders", "/admin/products", "/admin/promotion", "/admin/orders/new", "/admin/director"];
const DEFAULT_USER_QUICK_HREFS = ["/cabinet", "/cabinet/orders", "/catalog", "/cabinet/profile"];

const MOBILE_DOCK_LABELS: Record<string, string> = {
  "/admin": "Стол",
  "/admin/director": "Роли",
  "/admin/orders/new": "Касса",
  "/admin/orders": "Заказы",
  "/admin/messenger": "Чаты",
  "/admin/crm": "CRM",
  "/admin/products": "Товары",
  "/admin/products/new": "Новый",
  "/admin/aray": "ARAY",
  "/admin/aray/modules": "Модули",
  "/admin/aray/connectors": "Связи",
  "/admin/aray/agents": "Агенты",
  "/admin/aray/costs": "Лимиты",
  "/admin/analytics": "Отчеты",
  "/admin/finance": "Деньги",
  "/admin/business/settings": "Бизнес",
  "/admin/settings": "Система",
  "/admin/health": "Health",
  "/admin/terminals": "Терминал",
  "/admin/staff": "Команда",
  "/cabinet": "Домой",
  "/cabinet/orders": "Заказы",
  "/catalog": "Каталог",
  "/cabinet/profile": "Профиль",
};

const SPECIAL_QUICK: Record<string, AdminNavigationQuickDescriptor> = {
  "/admin/aray/modules": {
    href: "/admin/aray/modules",
    title: "Модули ARAY",
    subtitle: "Паспорта и зависимости",
    icon: ArayIcon,
    roles: ADMIN_ROLES,
    moduleId: "core.module-control-center",
  },
  "/admin/aray/connectors": {
    href: "/admin/aray/connectors",
    title: "Подключения ARAY",
    subtitle: "Коннекторы и ключи",
    icon: ArayIcon,
    roles: ADMIN_ROLES,
    moduleId: "core.connector-vault",
  },
  "/admin/aray/agents": {
    href: "/admin/aray/agents",
    title: "Агенты ARAY",
    subtitle: "Роли, отделы и качество",
    icon: ArayIcon,
    roles: ADMIN_ROLES,
    moduleId: "core.aray-voice",
  },
  "/admin/aray/costs": {
    href: "/admin/aray/costs",
    title: "Лимиты ARAY",
    subtitle: "Токены, подписки и расходы",
    icon: ArayIcon,
    roles: ADMIN_ROLES,
    moduleId: "core.aray-voice",
  },
  "/admin/products/new": {
    href: "/admin/products/new",
    title: "Новый товар",
    subtitle: "Создать карточку",
    icon: Plus,
    roles: CATALOG_ROLES,
  },
};

function stripQuery(href: string) {
  return href.split("?")[0];
}

function normalizePath(pathname: string) {
  return stripQuery(pathname).replace(/\/$/, "") || "/";
}

function getGroupRank(group: string) {
  const index = ADMIN_NAV_GROUP_ORDER.indexOf(group);
  return index === -1 ? ADMIN_NAV_GROUP_ORDER.length : index;
}

function isModuleVisible(item: NavItem, disabledModuleIds?: DisabledModuleIds) {
  return !item.moduleId || !disabledModuleIds?.includes(item.moduleId);
}

export function isAdminNavItemVisible(item: NavItem, role?: string, disabledModuleIds?: DisabledModuleIds) {
  return (!item.roles || !role || item.roles.includes(role)) && isModuleVisible(item, disabledModuleIds);
}

function isQuickVisible(item: AdminNavigationQuickDescriptor, role?: string, disabledModuleIds?: DisabledModuleIds) {
  const roleVisible = !item.roles || !role || item.roles.includes(role);
  const moduleVisible = !item.moduleId || !disabledModuleIds?.includes(item.moduleId);
  return roleVisible && moduleVisible;
}

export function isAdminNavItemMatch(item: NavItem, pathname: string): boolean {
  const path = normalizePath(pathname);
  if (item.exact) return path === item.href;
  return path === item.href || path.startsWith(`${item.href}/`);
}

export function getAdminNavItemLabel(item: NavItem, t?: AdminNavigationTranslate) {
  return item.labelKey && t ? t(item.labelKey) : item.label;
}

export function getVisibleAdminNavItems(role?: string, disabledModuleIds?: DisabledModuleIds) {
  return allNavItems
    .filter((item) => isAdminNavItemVisible(item, role, disabledModuleIds))
    .sort((a, b) => getGroupRank(a.group) - getGroupRank(b.group));
}

export function getActiveAdminNavItem(items: NavItem[], pathname: string): NavItem | null {
  return items
    .filter((item) => isAdminNavItemMatch(item, pathname))
    .sort((a, b) => b.href.length - a.href.length)[0] || null;
}

export function buildAdminNavigationGroups(
  role: string | undefined,
  t: AdminNavigationTranslate | undefined,
  iconsByGroup: Record<string, ElementType>,
  disabledModuleIds?: DisabledModuleIds,
): AdminNavigationGroup[] {
  const map = new Map<string, NavItem[]>();
  for (const item of getVisibleAdminNavItems(role, disabledModuleIds)) {
    const items = map.get(item.group) || [];
    items.push(item);
    map.set(item.group, items);
  }

  const groups: AdminNavigationGroup[] = [];
  for (const key of ADMIN_NAV_GROUP_ORDER) {
    const items = map.get(key);
    if (!items || items.length === 0) continue;
    groups.push({
      key,
      label: getAdminGroupLabel(key, t),
      description: ADMIN_NAV_GROUP_DESCRIPTIONS[key],
      icon: iconsByGroup[key] || items[0].icon,
      items,
      sections: buildAdminNavSections(key, items),
    });
  }

  return groups;
}

function findRouteMeta(pathname: string): [string, AdminNavigationRouteMeta] | null {
  const path = normalizePath(pathname);
  const exact = ADMIN_NAVIGATION_META[path];
  if (exact) return [path, exact];

  const key = Object.keys(ADMIN_NAVIGATION_META)
    .filter((route) => route !== "/admin" && route !== "/cabinet" && path.startsWith(`${route}/`))
    .sort((a, b) => b.length - a.length)[0];

  return key ? [key, ADMIN_NAVIGATION_META[key]] : null;
}

export function getAdminNavigationPageMeta(pathname: string, t?: AdminNavigationTranslate): AdminNavigationPageMeta {
  const visibleItem = allNavItems
    .filter((item) => isAdminNavItemMatch(item, pathname))
    .sort((a, b) => b.href.length - a.href.length)[0] || null;
  const routeMeta = findRouteMeta(pathname)?.[1];
  const title = routeMeta?.title || (visibleItem ? getAdminNavItemLabel(visibleItem, t) : "Панель управления");
  const subtitle = routeMeta?.subtitle || routeMeta?.searchHint || (visibleItem ? getAdminGroupLabel(visibleItem.group, t) : undefined);
  const icon = routeMeta?.icon || visibleItem?.icon || Sparkles;

  return { title, subtitle, icon };
}

export function getAdminNavigationSubtitle(href: string, t?: AdminNavigationTranslate) {
  const routeMeta = findRouteMeta(href)?.[1];
  if (routeMeta?.subtitle) return routeMeta.subtitle;
  if (routeMeta?.searchHint) return routeMeta.searchHint;
  const item = allNavItems.find((navItem) => navItem.href === stripQuery(href));
  return item ? getAdminGroupLabel(item.group, t) : undefined;
}

export function getAdminNavigationSearchHint(href: string, t?: AdminNavigationTranslate) {
  const routeMeta = findRouteMeta(href)?.[1];
  if (routeMeta?.searchHint) return routeMeta.searchHint;
  if (routeMeta?.subtitle) return routeMeta.subtitle;
  const item = allNavItems.find((navItem) => navItem.href === stripQuery(href));
  return item ? getAdminGroupLabel(item.group, t) : "";
}

export function getAdminNavigationKeywords(href: string) {
  return findRouteMeta(href)?.[1].keywords || [];
}

function getQuickDescriptor(
  href: string,
  role: string,
  t?: AdminNavigationTranslate,
  disabledModuleIds?: DisabledModuleIds,
): AdminNavigationQuickDescriptor | null {
  const special = SPECIAL_QUICK[href];
  if (special) return isQuickVisible(special, role, disabledModuleIds) ? special : null;

  const hrefPath = stripQuery(href);
  const item = allNavItems.find((navItem) => navItem.href === hrefPath);
  const routeMeta = findRouteMeta(hrefPath)?.[1];
  if (!item) return null;
  if (!isAdminNavItemVisible(item, role, disabledModuleIds)) return null;

  return {
    href,
    title: routeMeta?.quickTitle || routeMeta?.title || getAdminNavItemLabel(item, t),
    subtitle: routeMeta?.quickSubtitle || routeMeta?.searchHint || routeMeta?.subtitle || getAdminGroupLabel(item.group, t),
    icon: item.icon,
    roles: item.roles,
    moduleId: item.moduleId,
  };
}

function uniqueQuick(items: AdminNavigationQuickDescriptor[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.href;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function compactDockLabel(href: string, label: string) {
  const path = stripQuery(href);
  const mapped = MOBILE_DOCK_LABELS[path];
  if (mapped) return mapped;
  return label
    .replace(/\s*ARAY\s*/gi, "")
    .replace(/\s*\/.*$/, "")
    .trim()
    .split(/\s+/)[0]
    .slice(0, 9) || label;
}

function buildQuickItems(
  hrefs: string[],
  role: string,
  t?: AdminNavigationTranslate,
  disabledModuleIds?: DisabledModuleIds,
) {
  return uniqueQuick(
    hrefs
      .map((href) => getQuickDescriptor(href, role, t, disabledModuleIds))
      .filter((item): item is AdminNavigationQuickDescriptor => Boolean(item)),
  );
}

function fallbackPlaceholder(role: string, activeGroup?: string) {
  if (role === "USER") return "Заказ, товар, профиль или помощь...";
  if (activeGroup === "products") return "Товар, категория, склад, импорт или раздел...";
  if (activeGroup === "sales") return "Заказ, клиент, телефон, доставка или раздел...";
  if (activeGroup === "settings") return "Настройка, команда, терминал, сайт или помощь...";
  return "Найти заказ, клиента, товар или раздел...";
}

function fallbackNextStep(label: string) {
  return `Проверить раздел «${label}» по реальным данным`;
}

export function getAdminNavigationSearchContext({
  pathname,
  role,
  t,
  disabledModuleIds,
}: {
  pathname: string;
  role: string;
  t?: AdminNavigationTranslate;
  disabledModuleIds?: DisabledModuleIds;
}): AdminNavigationSearchContext {
  const visibleItems = getVisibleAdminNavItems(role, disabledModuleIds);
  const activeItem = getActiveAdminNavItem(visibleItems, pathname);
  const routeMatch = findRouteMeta(pathname);
  const routeMeta = routeMatch?.[1];
  const pageMeta = getAdminNavigationPageMeta(pathname, t);
  const activeGroup = activeItem?.group;
  const label = pageMeta.title;
  const placeholder = routeMeta?.placeholder || fallbackPlaceholder(role, activeGroup);
  const nextStep = routeMeta?.nextStep || fallbackNextStep(label);
  const fallbackHrefs = role === "USER" ? DEFAULT_USER_QUICK_HREFS : DEFAULT_ADMIN_QUICK_HREFS;
  const groupHrefs = activeGroup ? GROUP_QUICK_HREFS[activeGroup] : null;
  const quickHrefs = routeMeta?.quickHrefs || groupHrefs || fallbackHrefs;
  const hints = Array.from(new Set([
    ...(routeMeta?.keywords || []),
    ...(activeItem ? [getAdminNavItemLabel(activeItem, t), getAdminGroupLabel(activeItem.group, t)] : []),
    ...(role === "USER" ? ["мои заказы", "каталог", "профиль"] : ["арай", "терминал", "заказ", "каталог"]),
  ])).filter(Boolean).slice(0, 5);

  return {
    match: routeMatch?.[0] || activeItem?.href || (role === "USER" ? "/cabinet" : "/admin"),
    label,
    placeholder,
    nextStep,
    quick: buildQuickItems(quickHrefs, role, t, disabledModuleIds),
    hints,
  };
}

export function getAdminNavigationRoleTabs(role: string, disabledModuleIds?: DisabledModuleIds) {
  const visibleItems = getVisibleAdminNavItems(role, disabledModuleIds);
  const byHref = new Map(visibleItems.map((item) => [item.href, item]));
  const roleKey = role === "USER" ? "user" : role.toLowerCase();
  const preferredByRole: Record<string, string[]> = {
    super_admin: ["/admin", "/admin/orders"],
    admin: ["/admin", "/admin/orders"],
    manager: ["/admin/orders/new", "/admin/crm"],
    seller: ["/admin/orders/new", "/admin/crm"],
    courier: ["/admin", "/admin/delivery"],
    warehouse: ["/admin", "/admin/products"],
    accountant: ["/admin", "/admin/finance"],
    user: ["/cabinet", "/catalog"],
  };

  const preferredTabs = (preferredByRole[roleKey] || preferredByRole.admin)
    .map((href) => byHref.get(href))
    .filter((item): item is NavItem => Boolean(item));

  const registryTabs = visibleItems
    .filter((item) => item.surfaces?.includes("mobileDock") || item.mobilePriority !== undefined)
    .sort((a, b) => (a.mobilePriority ?? 999) - (b.mobilePriority ?? 999));

  const seen = new Set<string>();
  return [
    ...preferredTabs,
    ...registryTabs,
  ].filter((item) => {
      if (seen.has(item.href)) return false;
      seen.add(item.href);
      return true;
    }).slice(0, 2);
}

export function getAdminNavigationMobileCapsule({
  pathname,
  role,
  t,
  disabledModuleIds,
}: {
  pathname: string;
  role: string;
  t?: AdminNavigationTranslate;
  disabledModuleIds?: DisabledModuleIds;
}): AdminNavigationMobileCapsule {
  const visibleItems = getVisibleAdminNavItems(role, disabledModuleIds);
  const activeItem = getActiveAdminNavItem(visibleItems, pathname);
  const context = getAdminNavigationSearchContext({ pathname, role, t, disabledModuleIds });
  const roleTabs = getAdminNavigationRoleTabs(role, disabledModuleIds);
  const candidates: AdminNavigationMobileDockItem[] = [];
  const currentRoute = getQuickDescriptor(context.match, role, t, disabledModuleIds);

  if (currentRoute) {
    candidates.push({
      href: currentRoute.href,
      label: currentRoute.title,
      compactLabel: compactDockLabel(currentRoute.href, currentRoute.title),
      icon: currentRoute.icon,
    });
  }

  if (activeItem) {
    const label = getAdminNavItemLabel(activeItem, t);
    candidates.push({
      href: activeItem.href,
      label,
      compactLabel: compactDockLabel(activeItem.href, label),
      icon: activeItem.icon,
      exact: activeItem.exact,
    });
  }

  for (const item of context.quick) {
    candidates.push({
      href: item.href,
      label: item.title,
      compactLabel: compactDockLabel(item.href, item.title),
      icon: item.icon,
    });
  }

  for (const item of roleTabs) {
    const label = getAdminNavItemLabel(item, t);
    candidates.push({
      href: item.href,
      label,
      compactLabel: compactDockLabel(item.href, label),
      icon: item.icon,
      exact: item.exact,
    });
  }

  const seen = new Set<string>();
  const items = candidates
    .filter((item) => {
      const key = stripQuery(item.href);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 2);

  const activeGroupLabel = activeItem ? getAdminGroupLabel(activeItem.group, t) : context.label;

  return {
    label: context.label,
    subtitle: context.nextStep,
    groupLabel: activeGroupLabel,
    items,
    quick: context.quick.slice(0, 4),
  };
}

export function getAdminNavigationAutomationLaw() {
  return {
    sourceOfTruth: "components/admin/admin-navigation-registry.ts",
    rule: "Add a route once through the navigation registry plus optional ADMIN_NAVIGATION_META; search, ARAY, desktop rail, mobile dock, account drawer and QA checks must derive from that model.",
    mobileCapsuleRule: "Mobile dock items and the mobile menu capsule must be generated by getAdminNavigationMobileCapsule() so roles, modules and short labels stay consistent.",
    arayIdentityRule: "Every ARAY navigation surface must use the shared ArayIcon/ArayOrb identity, never random lucide icons.",
    arayEventRule: "ARAY open, voice and prompt actions must go through components/store/aray-events.ts so lazy mount, pending prompts and navigation capsule cleanup stay consistent.",
    overlayRule: "When body[data-aray-workspace] is active, admin modals, side panels and popups must keep the ARAY workspace panel visible and avoid covering it.",
    gates: ["scripts/validate-admin-navigation-model.js", "npm run quality"],
    defaultRoles: ALL_STAFF,
  };
}
