"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ElementType } from "react";
import { usePathname } from "next/navigation";
import {
  BarChart2,
  BookOpen,
  CheckSquare,
  FileDown,
  Globe,
  Hash,
  Images,
  Mail,
  Megaphone,
  Monitor,
  Package,
  Palette,
  Plus,
  Receipt,
  Search,
  Settings,
  ShoppingBag,
  Star,
  Tag,
  Truck,
  UserCircle,
  Users,
  Warehouse,
  Zap,
} from "lucide-react";
import { ArayIcon } from "@/components/shared/aray-orb";
import { allNavItems, getAdminGroupLabel, type NavItem } from "@/components/admin/admin-navigation-registry";
import { ADMIN_NAV_GROUP_ORDER } from "@/components/admin/admin-nav-structure";
import {
  getAdminNavigationKeywords,
  getAdminNavigationSearchContext,
  getAdminNavigationSearchHint,
} from "@/components/admin/admin-navigation-model";
import { useAdminLang } from "@/lib/admin-lang-context";
import { formatPrice, ORDER_STATUS_LABELS } from "@/lib/utils";

type SearchIcon = ElementType;
type AdminTranslate = (key: NonNullable<NavItem["labelKey"]>) => string;
type AdminSearchKind = "section" | "order" | "product" | "client" | "action";

type AdminSearchOrder = {
  id: string;
  orderNumber: number;
  clientName: string;
  totalAmount: string;
  status: string;
  score?: number;
};

type AdminSearchProduct = {
  id: string;
  name: string;
  category: string | null;
  score?: number;
};

type AdminSearchClient = {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  score?: number;
};

type AdminSearchData = {
  orders: AdminSearchOrder[];
  products: AdminSearchProduct[];
  clients: AdminSearchClient[];
};

export type AdminSmartSearchResult = {
  key: string;
  kind: AdminSearchKind;
  href: string;
  title: string;
  subtitle?: string;
  meta?: string;
  score: number;
  icon: SearchIcon;
};

export type AdminSmartSearchQuickItem = {
  key: string;
  href: string;
  title: string;
  subtitle: string;
  icon: SearchIcon;
};

type QuickDescriptor = {
  href: string;
  title: string;
  subtitle: string;
  icon: SearchIcon;
  roles?: string[];
};

type SearchContext = {
  match: string;
  label: string;
  placeholder: string;
  nextStep: string;
  quick: QuickDescriptor[];
  hints: string[];
};

type UseAdminSmartSearchOptions = {
  role: string;
  open: boolean;
  debounceMs?: number;
  limit?: number;
  disabledModuleIds?: string[];
};

const STAFF_ROLES = ["SUPER_ADMIN", "ADMIN", "MANAGER", "COURIER", "ACCOUNTANT", "WAREHOUSE", "SELLER"];
const ADMIN_ROLES = ["SUPER_ADMIN", "ADMIN"];
const SALES_ROLES = ["SUPER_ADMIN", "ADMIN", "MANAGER", "SELLER"];
const CATALOG_ROLES = ["SUPER_ADMIN", "ADMIN", "MANAGER", "WAREHOUSE", "SELLER"];

const GLOBAL_HINTS_BY_HREF: Record<string, string> = {
  "/admin": "Сводка и показатели",
  "/admin/aray": "Чат, агенты и действия",
  "/admin/orders/new": "Терминал и новый заказ",
  "/admin/orders": "Очередь и история",
  "/admin/clients": "База покупателей",
  "/admin/products": "Каталог и карточки",
  "/admin/business/settings": "Сайт, витрина, SEO",
  "/cabinet": "Сводка кабинета",
  "/cabinet/orders": "Активные и история",
  "/catalog": "Товары магазина",
  "/cabinet/profile": "Имя, аватар, тема",
};

const USER_QUICK: QuickDescriptor[] = [
  { href: "/cabinet", title: "Главная", subtitle: "Сводка кабинета", icon: ShoppingBag, roles: ["USER"] },
  { href: "/cabinet/orders", title: "Мои заказы", subtitle: "Активные и история", icon: Receipt, roles: ["USER"] },
  { href: "/catalog", title: "Каталог", subtitle: "Товары магазина", icon: Package, roles: ["USER"] },
  { href: "/cabinet/profile", title: "Профиль", subtitle: "Имя, аватар, тема", icon: UserCircle, roles: ["USER"] },
];

const DEFAULT_ADMIN_QUICK: QuickDescriptor[] = [
  { href: "/admin/orders/new", title: "Терминал", subtitle: "Создать заказ", icon: Receipt, roles: STAFF_ROLES },
  { href: "/admin/orders", title: "Заказы", subtitle: "Очередь и история", icon: ShoppingBag, roles: STAFF_ROLES },
  { href: "/admin/products", title: "Каталог", subtitle: "Товары и карточки", icon: Package, roles: CATALOG_ROLES },
  { href: "/admin/analytics", title: "Аналитика", subtitle: "Продажи и динамика", icon: BarChart2, roles: ["SUPER_ADMIN", "ADMIN", "ACCOUNTANT"] },
  { href: "/admin/business/settings", title: "Настройки бизнеса", subtitle: "Сайт, витрина, SEO", icon: Settings, roles: SALES_ROLES },
];

const SEARCH_CONTEXTS: SearchContext[] = [
  {
    match: "/admin/aray",
    label: "ARAY",
    placeholder: "Помощник, голос, агент, лимит или раздел...",
    nextStep: "Открыть нужное действие ARAY",
    quick: [
      { href: "/admin/aray", title: "ARAY", subtitle: "Чат, голос и действия", icon: ArayIcon, roles: SALES_ROLES },
      { href: "/admin/aray/modules", title: "Модули ARAY", subtitle: "Паспорта и зависимости", icon: ArayIcon, roles: ADMIN_ROLES },
      { href: "/admin/aray/agents", title: "Агенты ARAY", subtitle: "Роли, отделы и качество", icon: ArayIcon, roles: ADMIN_ROLES },
      { href: "/admin/aray/costs", title: "Лимиты ARAY", subtitle: "Токены, подписки и расходы", icon: ArayIcon, roles: ADMIN_ROLES },
      { href: "/admin/help", title: "База знаний", subtitle: "Подсказки и правила", icon: BookOpen, roles: STAFF_ROLES },
      { href: "/admin/settings", title: "Настройки", subtitle: "Бизнес, сайт и система", icon: Settings, roles: ADMIN_ROLES },
    ],
    hints: ["модули", "агенты", "качество", "бюджет", "лимиты"],
  },
  {
    match: "/admin/appearance",
    label: "Оформление",
    placeholder: "Тема, палитра, витрина, сайт или визуальная настройка...",
    nextStep: "Проверить визуальную систему и найти конкретный риск",
    quick: [
      { href: "/admin/appearance", title: "Оформление", subtitle: "Тема и палитра", icon: Palette, roles: ADMIN_ROLES },
      { href: "/admin/site", title: "Сайт", subtitle: "Витрина и страницы", icon: Globe, roles: ADMIN_ROLES },
      { href: "/admin/business/settings", title: "Бизнес", subtitle: "Настройки витрины", icon: Settings, roles: SALES_ROLES },
      { href: "/admin/products", title: "Каталог", subtitle: "Карточки и медиа", icon: Package, roles: CATALOG_ROLES },
    ],
    hints: ["тема", "палитра", "витрина", "сайт"],
  },
  {
    match: "/admin/orders/new",
    label: "Терминал",
    placeholder: "Клиент, телефон, товар, доставка или раздел...",
    nextStep: "Проверить заказ и найти недостающие данные",
    quick: [
      { href: "/admin/orders", title: "Заказы", subtitle: "Вернуться к очереди", icon: ShoppingBag, roles: STAFF_ROLES },
      { href: "/admin/clients", title: "Клиенты", subtitle: "Найти покупателя", icon: UserCircle, roles: SALES_ROLES },
      { href: "/admin/products", title: "Каталог", subtitle: "Подобрать товар", icon: Package, roles: CATALOG_ROLES },
      { href: "/admin/delivery", title: "Доставка", subtitle: "Маршруты и статусы", icon: Truck, roles: ["SUPER_ADMIN", "ADMIN", "MANAGER", "COURIER"] },
    ],
    hints: ["телефон клиента", "доставка", "каталог", "клиент"],
  },
  {
    match: "/admin/orders",
    label: "Заказы",
    placeholder: "Номер заказа, телефон, клиент, адрес или статус...",
    nextStep: "Найти заказ и подсказать действие",
    quick: [
      { href: "/admin/orders/new", title: "Новый заказ", subtitle: "Открыть терминал", icon: Plus, roles: STAFF_ROLES },
      { href: "/admin/clients", title: "Клиенты", subtitle: "История покупателя", icon: UserCircle, roles: SALES_ROLES },
      { href: "/admin/delivery", title: "Доставка", subtitle: "Маршруты и статусы", icon: Truck, roles: ["SUPER_ADMIN", "ADMIN", "MANAGER", "COURIER"] },
      { href: "/admin/tasks", title: "Задачи", subtitle: "Контроль команды", icon: CheckSquare, roles: STAFF_ROLES },
    ],
    hints: ["#1", "телефон", "клиент", "доставка"],
  },
  {
    match: "/admin/products",
    label: "Каталог",
    placeholder: "Товар, категория, slug, склад или импорт...",
    nextStep: "Проверить готовность товара",
    quick: [
      { href: "/admin/products/new", title: "Новый товар", subtitle: "Создать карточку", icon: Plus, roles: CATALOG_ROLES },
      { href: "/admin/categories", title: "Категории", subtitle: "Дерево каталога", icon: Tag, roles: ADMIN_ROLES },
      { href: "/admin/inventory", title: "Склад", subtitle: "Остатки и движение", icon: Warehouse, roles: ["SUPER_ADMIN", "ADMIN", "MANAGER", "WAREHOUSE"] },
      { href: "/admin/import", title: "Импорт", subtitle: "CSV и Excel", icon: FileDown, roles: ["SUPER_ADMIN", "ADMIN", "MANAGER", "WAREHOUSE"] },
      { href: "/admin/media", title: "Медиа", subtitle: "Фото и документы", icon: Images, roles: CATALOG_ROLES },
    ],
    hints: ["доска", "брус", "склад", "категория"],
  },
  {
    match: "/admin/clients",
    label: "Клиенты",
    placeholder: "Имя, телефон, email, заказ или CRM...",
    nextStep: "Найти клиента и предложить действие",
    quick: [
      { href: "/admin/orders/new", title: "Новый заказ", subtitle: "Для клиента", icon: Receipt, roles: STAFF_ROLES },
      { href: "/admin/orders", title: "Заказы", subtitle: "История покупок", icon: ShoppingBag, roles: STAFF_ROLES },
      { href: "/admin/crm", title: "CRM / Лиды", subtitle: "Сделки и воронка", icon: Users, roles: SALES_ROLES },
      { href: "/admin/tasks", title: "Задачи", subtitle: "Напоминания", icon: CheckSquare, roles: STAFF_ROLES },
    ],
    hints: ["телефон", "email", "клиент", "заказ"],
  },
  {
    match: "/admin/crm",
    label: "CRM",
    placeholder: "Лид, клиент, телефон, задача или автоматизация...",
    nextStep: "Найти слабое место в продажах",
    quick: [
      { href: "/admin/clients", title: "Клиенты", subtitle: "База покупателей", icon: UserCircle, roles: SALES_ROLES },
      { href: "/admin/tasks", title: "Задачи", subtitle: "Контроль сделок", icon: CheckSquare, roles: STAFF_ROLES },
      { href: "/admin/crm/automation", title: "CRM автоматизация", subtitle: "Роботы и правила", icon: Zap, roles: SALES_ROLES },
      { href: "/admin/orders", title: "Заказы", subtitle: "Продажи", icon: ShoppingBag, roles: STAFF_ROLES },
    ],
    hints: ["лид", "телефон", "задача", "клиент"],
  },
  {
    match: "/admin/promotions",
    label: "Акции",
    placeholder: "Акция, рассылка, отзыв, SEO или аналитика...",
    nextStep: "Подсказать рост продаж",
    quick: [
      { href: "/admin/promotion", title: "Продвижение", subtitle: "SEO и реклама", icon: Megaphone, roles: SALES_ROLES },
      { href: "/admin/email", title: "Рассылки", subtitle: "Email и push", icon: Mail, roles: ADMIN_ROLES },
      { href: "/admin/reviews", title: "Отзывы", subtitle: "Модерация", icon: Star, roles: SALES_ROLES },
      { href: "/admin/analytics", title: "Аналитика", subtitle: "Эффект кампаний", icon: BarChart2, roles: ["SUPER_ADMIN", "ADMIN", "ACCOUNTANT"] },
    ],
    hints: ["акция", "рассылка", "отзыв", "seo"],
  },
  {
    match: "/admin/settings",
    label: "Настройки",
    placeholder: "Настройка, ARAY, команда, терминал, сайт или помощь...",
    nextStep: "Открыть нужный раздел настроек",
    quick: [
      { href: "/admin/aray", title: "ARAY", subtitle: "Помощник, голос и лимиты", icon: ArayIcon, roles: SALES_ROLES },
      { href: "/admin/business/settings", title: "Бизнес", subtitle: "Сайт и продажи", icon: Settings, roles: SALES_ROLES },
      { href: "/admin/terminals", title: "Терминалы", subtitle: "Устройства и касса", icon: Monitor, roles: ADMIN_ROLES },
      { href: "/admin/staff", title: "Команда", subtitle: "Сотрудники", icon: Users, roles: ADMIN_ROLES },
      { href: "/admin/site", title: "Сайт", subtitle: "Витрина", icon: Globe, roles: ADMIN_ROLES },
    ],
    hints: ["арай", "терминал", "команда", "сайт", "уведомления"],
  },
  {
    match: "/admin/finance",
    label: "Финансы",
    placeholder: "Заказ, сумма, расход, аналитика или отчет...",
    nextStep: "Проверить финансовый риск",
    quick: [
      { href: "/admin/orders", title: "Заказы", subtitle: "Продажи", icon: ShoppingBag, roles: STAFF_ROLES },
      { href: "/admin/analytics", title: "Аналитика", subtitle: "Выручка", icon: BarChart2, roles: ["SUPER_ADMIN", "ADMIN", "ACCOUNTANT"] },
      { href: "/admin/aray/costs", title: "Лимиты ARAY", subtitle: "Расходы помощника", icon: ArayIcon, roles: ADMIN_ROLES },
    ],
    hints: ["заказ", "сумма", "аналитика", "расход"],
  },
  {
    match: "/admin",
    label: "Рабочий стол",
    placeholder: "Найти заказ, клиента, товар или раздел...",
    nextStep: "Проверить рабочий стол по реальным сигналам",
    quick: DEFAULT_ADMIN_QUICK,
    hints: ["арай", "терминал", "новый заказ", "каталог"],
  },
  {
    match: "/cabinet",
    label: "Кабинет",
    placeholder: "Заказ, товар, профиль или помощь...",
    nextStep: "Помочь клиенту быстрее найти нужное",
    quick: USER_QUICK,
    hints: ["мои заказы", "каталог", "профиль", "медиа"],
  },
];

const GROUP_CONTEXT_MATCH: Record<string, string> = {
  sales: "/admin/orders",
  products: "/admin/products",
  marketing: "/admin/promotions",
  settings: "/admin/settings",
  finance: "/admin/finance",
  aray: "/admin/aray",
  help: "/admin/settings",
};

const EMPTY_DATA: AdminSearchData = { orders: [], products: [], clients: [] };

const QUERY_ALIASES: Record<string, string[]> = {
  "арай": ["aray", "aray ai", "ai"],
  "арей": ["aray", "aray ai", "ai"],
  "араи": ["aray", "aray ai", "ai"],
  "aray": ["арай", "арей", "ai"],
  "aray ai": ["арай", "арей", "ai"],
  "ai": ["aray", "aray ai", "арай"],
  "ии": ["ai", "aray", "арай"],
};

function normalize(value: string) {
  return value.toLowerCase().trim().replace(/\s+/g, " ");
}

function getQueryVariants(query: string) {
  const normalized = normalize(query);
  if (!normalized) return [];
  return Array.from(new Set([normalized, ...(QUERY_ALIASES[normalized] || [])]));
}

function stripQuery(href: string) {
  return href.split("?")[0];
}

function isContextMatch(pathname: string, match: string) {
  if (match === "/admin") return pathname === "/admin";
  if (match === "/cabinet") return pathname === "/cabinet" || pathname.startsWith("/cabinet/");
  return pathname === match || pathname.startsWith(`${match}/`);
}

function getNavItemLabel(item: NavItem, t: AdminTranslate) {
  return item.labelKey ? t(item.labelKey) : item.label;
}

function isNavItemVisible(item: NavItem, role: string, disabledModuleIds?: string[]) {
  const roleVisible = !item.roles || item.roles.includes(role);
  const moduleVisible = !item.moduleId || !disabledModuleIds?.includes(item.moduleId);
  return roleVisible && moduleVisible;
}

function getGroupRank(group: string) {
  const index = ADMIN_NAV_GROUP_ORDER.indexOf(group);
  return index === -1 ? ADMIN_NAV_GROUP_ORDER.length : index;
}

function scoreText(value: string, query: string, exact: number, prefix: number, contains: number) {
  const normalizedValue = normalize(value);
  if (!normalizedValue) return 0;
  return getQueryVariants(query).reduce((bestScore, normalizedQuery) => {
    if (normalizedValue === normalizedQuery) return Math.max(bestScore, exact);
    if (normalizedValue.startsWith(normalizedQuery)) return Math.max(bestScore, prefix);
    if (normalizedValue.includes(normalizedQuery)) return Math.max(bestScore, contains);
    return bestScore;
  }, 0);
}

function isNumericSearch(query: string) {
  return /^#?\d+$/.test(query.trim());
}

function findActiveContext(pathname: string, role: string, activeGroup?: string) {
  const contexts = SEARCH_CONTEXTS
    .filter((context) => (role === "USER" ? context.match.startsWith("/cabinet") : context.match.startsWith("/admin")))
    .sort((a, b) => b.match.length - a.match.length);
  const direct = contexts.find((context) => isContextMatch(pathname, context.match));
  if (direct) return direct;
  const groupMatch = activeGroup ? GROUP_CONTEXT_MATCH[activeGroup] : null;
  const byGroup = groupMatch ? SEARCH_CONTEXTS.find((context) => context.match === groupMatch) : null;
  if (byGroup) return byGroup;
  return role === "USER" ? SEARCH_CONTEXTS[SEARCH_CONTEXTS.length - 1] : SEARCH_CONTEXTS[SEARCH_CONTEXTS.length - 2];
}

function descriptorVisible(descriptor: QuickDescriptor, visibleSections: NavItem[], role: string) {
  if (descriptor.roles && !descriptor.roles.includes(role)) return false;
  const hrefPath = stripQuery(descriptor.href);
  const navItem = visibleSections.find((item) => item.href === hrefPath);
  if (navItem) return true;
  if (allNavItems.some((item) => item.href === hrefPath)) return false;
  if (hrefPath.startsWith("/admin")) return role !== "USER" && Boolean(descriptor.roles?.includes(role));
  if (hrefPath.startsWith("/cabinet") || hrefPath === "/catalog") return role === "USER";
  return false;
}

function uniqueQuickItems(items: QuickDescriptor[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.href;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function resultTypeBoost(kind: AdminSearchKind, pathname: string) {
  if (kind === "order" && pathname.startsWith("/admin/orders")) return 14;
  if (kind === "product" && (pathname.startsWith("/admin/products") || pathname.startsWith("/admin/inventory"))) return 14;
  if (kind === "client" && (pathname.startsWith("/admin/clients") || pathname.startsWith("/admin/crm"))) return 14;
  return 0;
}

function uniqueResults(results: AdminSmartSearchResult[]) {
  const seen = new Set<string>();
  return results.filter((result) => {
    const key = result.href;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function useAdminSmartSearch({
  role,
  open,
  debounceMs = 150,
  limit = 12,
  disabledModuleIds,
}: UseAdminSmartSearchOptions) {
  const pathname = usePathname();
  const { t } = useAdminLang();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const [data, setData] = useState<AdminSearchData>(EMPTY_DATA);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const visibleSections = useMemo(
    () =>
      allNavItems
        .filter((item) => isNavItemVisible(item, role, disabledModuleIds))
        .sort((a, b) => getGroupRank(a.group) - getGroupRank(b.group)),
    [disabledModuleIds, role],
  );

  const activeNavItem = useMemo(
    () =>
      visibleSections
        .filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
        .sort((a, b) => b.href.length - a.href.length)[0] || null,
    [pathname, visibleSections],
  );
  const activeContext = useMemo(
    () => getAdminNavigationSearchContext({ pathname, role, t, disabledModuleIds }),
    [disabledModuleIds, pathname, role, t],
  );

  const quickItems = useMemo<AdminSmartSearchQuickItem[]>(() => {
    const fallback = role === "USER" ? USER_QUICK : DEFAULT_ADMIN_QUICK;
    return uniqueQuickItems([...activeContext.quick, ...fallback])
      .filter((item) => descriptorVisible(item, visibleSections, role))
      .slice(0, 6)
      .map((item) => ({
        key: item.href,
        href: item.href,
        title: item.title,
        subtitle: item.subtitle,
        icon: item.icon,
      }));
  }, [activeContext, role, visibleSections]);

  const queryHints = useMemo(() => {
    const fallback = role === "USER" ? ["мои заказы", "каталог", "профиль"] : ["арай", "терминал", "заказ", "каталог"];
    return Array.from(new Set([...activeContext.hints, ...fallback])).slice(0, 5);
  }, [activeContext, role]);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setQuery("");
    setSelected(0);
    setData(EMPTY_DATA);
    setLoading(false);
    setError(null);
  }, []);

  const clearQuery = useCallback(() => {
    abortRef.current?.abort();
    setQuery("");
    setSelected(0);
    setData(EMPTY_DATA);
    setLoading(false);
    setError(null);
  }, []);

  useEffect(() => {
    const q = query.trim();
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setSelected(0);
    setError(null);
    abortRef.current?.abort();

    if (!open || !q || role === "USER") {
      setData(EMPTY_DATA);
      setLoading(false);
      return;
    }

    const shouldFetch = q.length >= 2 || isNumericSearch(q);
    if (!shouldFetch) {
      setData(EMPTY_DATA);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/admin/search?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("search failed");
        const json = (await response.json()) as Partial<AdminSearchData>;
        if (requestIdRef.current !== requestId) return;
        setData({
          orders: json.orders ?? [],
          products: json.products ?? [],
          clients: json.clients ?? [],
        });
      } catch (searchError) {
        if (controller.signal.aborted || requestIdRef.current !== requestId) return;
        setData(EMPTY_DATA);
        setError("Живые данные временно недоступны");
      } finally {
        if (!controller.signal.aborted && requestIdRef.current === requestId) {
          setLoading(false);
        }
      }
    }, debounceMs);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [debounceMs, open, query, role]);

  const results = useMemo<AdminSmartSearchResult[]>(() => {
    const q = query.trim();
    if (!q) return [];

    const quickResults = quickItems.reduce<AdminSmartSearchResult[]>((items, item) => {
      const score = Math.max(
        scoreText(item.title, q, 96, 78, 54),
        scoreText(item.subtitle, q, 72, 50, 30),
        scoreText(item.href, q, 58, 42, 24),
      );
      if (!score) return items;
      items.push({
        key: `quick-${item.href}`,
        kind: "action" as const,
        href: item.href,
        title: item.title,
        subtitle: item.subtitle,
        meta: "Быстро",
        score: score + 8,
        icon: item.icon,
      });
      return items;
    }, []);

    const sectionResults = visibleSections.reduce<AdminSmartSearchResult[]>((items, item) => {
        const label = getNavItemLabel(item, t);
        const group = getAdminGroupLabel(item.group, t);
        const hint = getAdminNavigationSearchHint(item.href, t) || GLOBAL_HINTS_BY_HREF[item.href] || "";
        const keywords = getAdminNavigationKeywords(item.href).join(" ");
        const score = Math.max(
          scoreText(label, q, 94, 76, 52),
          scoreText(group, q, 70, 48, 30),
          scoreText(hint, q, 68, 46, 28),
          scoreText(keywords, q, 66, 44, 26),
          scoreText(item.href, q, 56, 40, 22),
        );
        if (!score) return items;
        const contextBoost = activeNavItem?.group === item.group ? 10 : 0;
        items.push({
          key: `section-${item.href}`,
          kind: "section" as const,
          href: item.href,
          title: label,
          subtitle: group,
          meta: "Раздел",
          score: score + contextBoost,
          icon: item.icon as SearchIcon,
        });
        return items;
      }, []);

    const dynamicResults: AdminSmartSearchResult[] = [
      ...data.orders.map((order) => ({
        key: `order-${order.id}`,
        kind: "order" as const,
        href: `/admin/orders/${order.id}`,
        title: `Заказ #${order.orderNumber}`,
        subtitle: `${order.clientName} · ${formatPrice(order.totalAmount)}`,
        meta: ORDER_STATUS_LABELS[order.status] || order.status,
        score: (order.score ?? 60) + resultTypeBoost("order", pathname),
        icon: Hash,
      })),
      ...data.clients.map((client) => ({
        key: `client-${client.id}`,
        kind: "client" as const,
        href: `/admin/clients?client=${client.id}`,
        title: client.name || client.email,
        subtitle: [client.email, client.phone].filter(Boolean).join(" · "),
        meta: "Клиент",
        score: (client.score ?? 58) + resultTypeBoost("client", pathname),
        icon: UserCircle,
      })),
      ...data.products.map((product) => ({
        key: `product-${product.id}`,
        kind: "product" as const,
        href: `/admin/products/${product.id}`,
        title: product.name,
        subtitle: product.category || "Каталог",
        meta: "Товар",
        score: (product.score ?? 56) + resultTypeBoost("product", pathname),
        icon: Package,
      })),
    ];

    return uniqueResults([...quickResults, ...dynamicResults, ...sectionResults]
      .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title, "ru"))
    ).slice(0, limit);
  }, [activeContext, activeNavItem, data, limit, pathname, query, quickItems, role, t, visibleSections]);

  return {
    query,
    setQuery,
    selected,
    setSelected,
    results,
    quickItems,
    queryHints,
    loading,
    error,
    placeholder: activeContext.placeholder,
    activeContextLabel: activeContext.label,
    reset,
    clearQuery,
    searchIcon: Search,
  };
}
