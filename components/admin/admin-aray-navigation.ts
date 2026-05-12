"use client";

import {
  ADMIN_ROUTE_CLASSIFICATIONS,
  allNavItems,
  getAdminGroupLabel,
  type AdminRouteClassification,
  type NavItem,
} from "@/components/admin/admin-navigation-registry";
import type { AdminAction } from "@/components/admin/admin-page-actions";

export type AdminArayPageLink = {
  href: string;
  label: string;
  group: string;
  groupLabel: string;
  active: boolean;
};

export type AdminArayQuickAction = {
  id: string;
  label: string;
  prompt: string;
  href?: string;
  kind: "prompt" | "navigate" | "page-action";
};

export type AdminArayNavigationContext = {
  currentPage: AdminArayPageLink | null;
  nearbyPages: AdminArayPageLink[];
  availablePages: AdminArayPageLink[];
  quickActions: AdminArayQuickAction[];
};

type QuickTemplate = {
  label: string;
  prompt: string;
};

const ARAY_PROMPT_ACTION_LIMIT = 3;
const ARAY_PAGE_ACTION_LIMIT = 3;
const ARAY_QUICK_ACTION_LIMIT = 6;
const ARAY_NEARBY_PAGE_LIMIT = 3;

const PAGE_QUICK_ACTIONS: Record<string, QuickTemplate[]> = {
  "/admin": [
    { label: "Заказы сегодня", prompt: "Проверь рабочий стол, заказы и очередь. Если данных нет, скажи честно и предложи одно действие." },
    { label: "Каталог готов?", prompt: "Проверь готовность каталога: цены, остатки, фото и что мешает продажам." },
    { label: "Деньги и риски", prompt: "Проверь выручку, расходы, склад и назови один главный риск с понятным действием." },
  ],
  "/admin/orders": [
    { label: "Новые заказы", prompt: "Покажи новые заказы и что по ним нужно сделать в первую очередь." },
    { label: "Риски заказов", prompt: "Проверь заказы и найди задержки, отмены или зависшие статусы." },
    { label: "Попросить отзыв", prompt: "Найди завершенные заказы и подготовь короткое сообщение клиенту с просьбой оставить отзыв." },
  ],
  "/admin/orders/new": [
    { label: "Проверить корзину", prompt: "Проверь текущий терминал: корзину, клиента, оплату и что мешает оформить заказ." },
    { label: "Помоги продать", prompt: "Подскажи, как быстро довести этот заказ до оформления и что уточнить у клиента." },
    { label: "Касса и оплата", prompt: "Проверь режим терминала, смену кассы, корзину, оплату и подскажи следующий лучший шаг." },
  ],
  "/admin/products": [
    { label: "Пробелы каталога", prompt: "Проверь каталог: что без цены, без остатка, без фото или может мешать продажам." },
    { label: "Топ для витрины", prompt: "Найди товары, которые стоит поднять в витрине или продвинуть сегодня." },
    { label: "Проверить цены", prompt: "Проверь цены и найди позиции, где нужна ручная проверка." },
  ],
  "/admin/inventory": [
    { label: "Что заканчивается?", prompt: "Проверь склад и назови позиции, которые заканчиваются или выглядят рискованно." },
    { label: "Сверить остатки", prompt: "Проверь остатки и найди несоответствия, которые могут сорвать заказ." },
    { label: "План пополнения", prompt: "Собери короткий план пополнения склада по самым важным позициям." },
  ],
  "/admin/clients": [
    { label: "Кого вернуть?", prompt: "Найди клиентов, которых можно вернуть коротким предложением сегодня." },
    { label: "Горячие клиенты", prompt: "Покажи клиентов с высоким шансом покупки и предложи следующее действие." },
    { label: "Попросить отзыв", prompt: "Подготовь короткое сообщение клиенту с просьбой оставить отзыв после успешной покупки." },
  ],
  "/admin/crm": [
    { label: "Горячие лиды", prompt: "Проверь CRM и покажи лиды, где нужно действовать сейчас." },
    { label: "Зависшие сделки", prompt: "Найди зависшие лиды или сделки и предложи следующий шаг." },
    { label: "План менеджеру", prompt: "Собери короткий план менеджеру по CRM на сегодня." },
  ],
  "/admin/crm/automation": [
    { label: "Проверить роботов", prompt: "Проверь CRM-автоматизации: какие роботы активны, где есть риск и что включить первым." },
    { label: "Ошибки за 24ч", prompt: "Проверь логи CRM-автоматизаций за сутки и назови ошибки или отсутствие данных честно." },
    { label: "Следующий робот", prompt: "Предложи один полезный робот для ПилоРус: триггер, действие и зачем он нужен." },
  ],
  "/admin/tasks": [
    { label: "Срочные задачи", prompt: "Проверь задачи и покажи срочные, просроченные и самые важные." },
    { label: "Кому помочь?", prompt: "Посмотри задачи команды и подскажи, кому сейчас нужна помощь." },
    { label: "План команды", prompt: "Собери короткий план команды на день по задачам." },
  ],
  "/admin/delivery": [
    { label: "Риски доставки", prompt: "Проверь доставки и покажи задержки, рисковые маршруты и что сделать." },
    { label: "Что в пути?", prompt: "Покажи активные доставки и их текущий статус." },
    { label: "План курьеру", prompt: "Собери короткий план по доставкам на сегодня." },
  ],
  "/admin/analytics": [
    { label: "Что растет?", prompt: "Проверь аналитику и скажи, что растет, что падает и почему это важно." },
    { label: "Точки роста", prompt: "Найди 3 точки роста по продажам, товарам и клиентам." },
    { label: "Короткий отчет", prompt: "Собери короткий отчет по аналитике: вывод, риск, действие." },
  ],
  "/admin/promotion": [
    { label: "Проверить акции", prompt: "Проверь страницу продвижения: активные акции, истекшие условия, баннеры и что сейчас мешает продажам." },
    { label: "Черновик Direct", prompt: "Открой мастер Direct на этой странице, проверь черновик кампаний и скажи, что готово без запуска бюджета." },
    { label: "Цели и Метрика", prompt: "Проверь готовность Метрики и целей для рекламы. Внешний кабинет открывай вкладкой только если он действительно нужен." },
    { label: "SEO и sitemap", prompt: "Проверь SEO и индексацию: sitemap, robots, посадочные страницы и что мешает рекламе." },
    { label: "Спрос", prompt: "Оцени спрос и сезонность по категориям. Если API не подключен, честно скажи это и дай ручной шаг." },
    { label: "Следующий шаг", prompt: "По текущему разделу продвижения дай лучший следующий шаг для продаж сегодня." },
  ],
  "/admin/promotions": [
    { label: "Проверить акции", prompt: "Проверь акции на этой странице: активные, истекшие, без баннера, без условий и что нужно исправить первым." },
    { label: "Истекшие", prompt: "Найди истекшие акции и предложи, что продлить, скрыть или заменить." },
    { label: "Без баннера", prompt: "Проверь акции без нормального баннера или изображения и подскажи, что загрузить." },
    { label: "Под Direct", prompt: "Выбери акции, которые лучше всего подходят для Direct, и подготовь короткий рекламный угол." },
    { label: "Текст акции", prompt: "Улучши текст текущих акций: коротко, понятно, без лишнего шума, чтобы человеку хотелось заказать." },
    { label: "Следующий шаг", prompt: "Скажи лучший следующий шаг по акциям прямо сейчас: что даст быстрый эффект." },
  ],
  "/admin/reviews": [
    { label: "Найти отзывы", prompt: "Проверь отзывы на этой странице: сколько опубликовано, что требует ответа и где есть риск для репутации." },
    { label: "Ответить красиво", prompt: "Подготовь дружелюбный профессиональный ответ на выбранный отзыв. Без шаблонного текста." },
    { label: "Плохие отзывы", prompt: "Найди негативные или спорные отзывы и предложи спокойный план ответа." },
    { label: "Попросить отзыв", prompt: "Подготовь короткое сообщение клиенту с просьбой оставить отзыв после успешного заказа." },
    { label: "Внешние площадки", prompt: "Проверь, какие внешние площадки отзывов стоит открыть вкладкой и что там нужно сверить." },
    { label: "Идея улучшения", prompt: "По отзывам дай один вывод для улучшения сервиса или каталога." },
  ],
  "/admin/finance": [
    { label: "Деньги сегодня", prompt: "Проверь финансы за сегодня: выручка, расходы, средний чек, риск." },
    { label: "Сравнить период", prompt: "Сравни финансы с прошлой неделей и назови главное отличие." },
    { label: "Где просадка?", prompt: "Найди возможную просадку по деньгам и предложи действие." },
  ],
  "/admin/email": [
    { label: "Идея рассылки", prompt: "Предложи короткую рассылку клиентам под текущую ситуацию бизнеса." },
    { label: "Кому отправить?", prompt: "Подскажи сегмент клиентов для рассылки и почему именно им." },
    { label: "Проверить текст", prompt: "Помоги сделать текст рассылки коротким, живым и продающим." },
  ],
  "/admin/notifications": [
    { label: "Push-идея", prompt: "Предложи короткий push, который можно отправить клиентам сегодня." },
    { label: "Кому push?", prompt: "Подскажи, какой сегмент клиентов лучше выбрать для push-уведомления." },
    { label: "Проверить тон", prompt: "Сделай push спокойным, деловым и продающим без лишнего шума." },
  ],
  "/admin/settings": [
    { label: "Проверить систему", prompt: "Проверь настройки и назови, что может мешать стабильной работе." },
    { label: "Голос ARAY", prompt: "Помоги настроить голос, микрофон, устройство по умолчанию, режим тишины и график работы ARAY." },
    { label: "Роли и доступы", prompt: "Проверь роли, доступы и синхронизацию пользователей, сотрудников, клиентов и биржи." },
  ],
  "/admin/aray": [
    { label: "Голос и микрофон", prompt: "Помоги настроить голос ARAY: микрофон, устройство, график включения, режим тишины и напоминания." },
    { label: "Быстрые действия", prompt: "Проверь быстрые действия ARAY на текущих страницах и предложи, что сделать умнее." },
    { label: "Агенты", prompt: "Проверь агентов ARAY, качество ответов, скорость и что можно автоматизировать." },
  ],
  "/admin/aray/costs": [
    { label: "Где экономить?", prompt: "Проверь расходы ARAY и предложи, какие действия можно делать локально без лишнего AI-вызова." },
    { label: "Лимиты", prompt: "Проверь лимиты и подскажи безопасные настройки бюджета ARAY." },
    { label: "Автоматизация", prompt: "Предложи, какие сценарии ARAY стоит автоматизировать первыми." },
  ],
};

function isVisibleForRole(item: NavItem, role?: string): boolean {
  return !item.roles || !role || item.roles.includes(role);
}

function isModuleVisible(item: NavItem, disabledModuleIds?: string[]): boolean {
  return !item.moduleId || !disabledModuleIds?.includes(item.moduleId);
}

function isRouteVisibleForRole(route: AdminRouteClassification, role?: string): boolean {
  return !route.roles || !role || route.roles.includes(role);
}

function isRouteModuleVisible(route: AdminRouteClassification, disabledModuleIds?: string[]): boolean {
  return !route.moduleId || !disabledModuleIds?.includes(route.moduleId);
}

function isRouteNavigableByAray(route: AdminRouteClassification): boolean {
  const isWorkspaceRoute = route.href.startsWith("/admin") || route.href.startsWith("/cabinet");
  return isWorkspaceRoute && route.surfaces.includes("aray") && !route.href.includes("[");
}

function isNavItemMatch(item: NavItem, pathname: string): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function isRouteLinkMatch(route: AdminRouteClassification, pathname: string): boolean {
  return pathname === route.href || pathname.startsWith(`${route.href}/`);
}

function getActiveItem(items: NavItem[], pathname: string): NavItem | null {
  return items
    .filter((item) => isNavItemMatch(item, pathname))
    .sort((a, b) => b.href.length - a.href.length)[0] || null;
}

function getItemLabel(item: NavItem, t?: (key: any) => string): string {
  return item.labelKey && t ? t(item.labelKey) : item.label;
}

function toPageLink(item: NavItem, pathname: string, t?: (key: any) => string): AdminArayPageLink {
  return {
    href: item.href,
    label: getItemLabel(item, t),
    group: item.group,
    groupLabel: getAdminGroupLabel(item.group, t),
    active: isNavItemMatch(item, pathname),
  };
}

function toRoutePageLink(route: AdminRouteClassification, pathname: string, t?: (key: any) => string): AdminArayPageLink {
  return {
    href: route.href,
    label: route.label,
    group: route.group,
    groupLabel: getAdminGroupLabel(route.group, t),
    active: isRouteLinkMatch(route, pathname),
  };
}

function uniqueByHref(pages: AdminArayPageLink[]): AdminArayPageLink[] {
  const seen = new Set<string>();
  return pages.filter((page) => {
    if (seen.has(page.href)) return false;
    seen.add(page.href);
    return true;
  });
}

function matchQuickActions(pathname: string): QuickTemplate[] | null {
  if (PAGE_QUICK_ACTIONS[pathname]) return PAGE_QUICK_ACTIONS[pathname];
  const match = Object.keys(PAGE_QUICK_ACTIONS)
    .filter((key) => key !== "/admin" && pathname.startsWith(key))
    .sort((a, b) => b.length - a.length)[0];
  return match ? PAGE_QUICK_ACTIONS[match] : null;
}

function fallbackQuickActions(page: AdminArayPageLink | null): QuickTemplate[] {
  const label = page?.label || "текущий раздел";
  return [
    { label: "Что важно?", prompt: `Посмотри раздел «${label}» и назови, что здесь важно прямо сейчас.` },
    { label: "3 действия", prompt: `Предложи 3 конкретных действия по разделу «${label}».` },
    { label: "Найти риск", prompt: `Проверь раздел «${label}» и найди главный риск или узкое место.` },
  ];
}

function uniqueQuickActions(actions: AdminArayQuickAction[]): AdminArayQuickAction[] {
  const seen = new Set<string>();
  return actions.filter((action) => {
    const key = `${action.kind}:${action.href || ""}:${action.label}:${action.prompt}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function buildAdminArayNavigation({
  pathname,
  role,
  actions,
  t,
  disabledModuleIds,
}: {
  pathname: string;
  role?: string;
  actions?: AdminAction[];
  t?: (key: any) => string;
  disabledModuleIds?: string[];
}): AdminArayNavigationContext {
  const visibleItems = allNavItems.filter((item) => isVisibleForRole(item, role) && isModuleVisible(item, disabledModuleIds));
  const activeItem = getActiveItem(visibleItems, pathname);
  const visibleUtilityRoutes = Object.values(ADMIN_ROUTE_CLASSIFICATIONS)
    .filter((route) =>
      isRouteNavigableByAray(route) &&
      isRouteVisibleForRole(route, role) &&
      isRouteModuleVisible(route, disabledModuleIds)
    )
    .map((route) => toRoutePageLink(route, pathname, t));
  const availablePages = uniqueByHref([
    ...visibleItems.map((item) => toPageLink(item, pathname, t)),
    ...visibleUtilityRoutes,
  ]);
  const currentPage = availablePages
    .filter((page) => page.active)
    .sort((a, b) => b.href.length - a.href.length)[0] || (activeItem ? toPageLink(activeItem, pathname, t) : null);
  const currentGroup = currentPage?.group || activeItem?.group || "main";
  const sameGroupPages = availablePages.filter((page) => page.group === currentGroup);
  const nearbyPages = uniqueByHref([
    ...(currentPage ? [currentPage] : []),
    ...sameGroupPages,
    ...availablePages.filter((page) => page.group === "main"),
  ]).slice(0, ARAY_NEARBY_PAGE_LIMIT);

  const matchedPromptActions = matchQuickActions(pathname);
  const promptTemplates = matchedPromptActions?.length ? matchedPromptActions : fallbackQuickActions(currentPage);
  const promptLimit = promptTemplates.length > ARAY_PROMPT_ACTION_LIMIT
    ? ARAY_QUICK_ACTION_LIMIT
    : ARAY_PROMPT_ACTION_LIMIT;
  const promptActions = promptTemplates
    .slice(0, promptLimit)
    .map<AdminArayQuickAction>((action, index) => ({
      id: `prompt-${pathname}-${index}`,
      label: action.label,
      prompt: action.prompt,
      kind: "prompt",
    }));

  const pageActions = (actions || [])
    .filter((action) => !action.disabled && action.href)
    .slice(0, ARAY_PAGE_ACTION_LIMIT)
    .map<AdminArayQuickAction>((action) => ({
      id: `page-action-${action.id}`,
      label: action.label,
      prompt: `Открой действие «${action.label}» в текущем разделе.`,
      href: action.href,
      kind: "page-action",
    }));

  const nearbyNavigationActions = nearbyPages
    .filter((page) => !page.active)
    .slice(0, ARAY_QUICK_ACTION_LIMIT)
    .map<AdminArayQuickAction>((page) => ({
      id: `nearby-${page.href}`,
      label: page.label,
      prompt: `Открой раздел «${page.label}» и продолжи работу там.`,
      href: page.href,
      kind: "navigate",
    }));

  return {
    currentPage,
    nearbyPages,
    availablePages,
    quickActions: uniqueQuickActions([
      ...promptActions,
      ...pageActions,
      ...nearbyNavigationActions,
    ]).slice(0, ARAY_QUICK_ACTION_LIMIT),
  };
}
