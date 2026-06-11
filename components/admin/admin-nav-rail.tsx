"use client";

/**
 * AdminNavRail — узкий вертикальный рельс админки 64px шириной с hover-popup.
 *
 * Сессия 39 (28.04.2026), Заход 2 — переезд админки на единую дизайн-систему
 * магазина. Старый широкий sidebar 240px убран, навигация компактная как в
 * Notion/Linear/VS Code: одна иконка на группу, при hover выезжает popup со
 * всеми пунктами группы.
 *
 * Видение Армана (28.04.2026): «иконки красивые при наведении открывает меню
 * как попап». Этот же компонент позже переедет на магазин (после стабилизации
 * админки) — там вместо админ-разделов будут категории магазина (Каталог,
 * Доставка, Акции, Контакты).
 *
 * Архитектура:
 * - Использует allNavItems из admin-nav.tsx (общий источник правды)
 * - Группирует по `group` field, иконка группы из GROUP_ICONS
 * - Если в группе 1 пункт — иконка работает как Link напрямую (popup не нужен)
 * - Hover delay 150ms для перехода между иконкой и popup
 * - На мобилке скрыт (hidden lg:flex) — там работает MobileMenuBottomSheet
 *
 * Стиль: calm UI магазина — bg-card, border-border, rounded-2xl, без
 * arayglass-glow/shimmer. Палитра-aware через text-primary.
 */

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, ShoppingBag, Package, BookOpen,
  Megaphone, Settings, HelpCircle, UserCircle, ChevronRight,
  ChevronLeft, ExternalLink, Wallet,
} from "lucide-react";
import { useAdminLang } from "@/lib/admin-lang-context";
import { type NavItem } from "@/components/admin/admin-navigation-registry";
import {
  buildAdminNavigationGroups,
  getAdminNavigationSubtitle,
  isAdminNavItemMatch,
} from "@/components/admin/admin-navigation-model";
import {
  ADMIN_NAV_GROUP_DESCRIPTIONS,
  buildAdminNavSections,
} from "@/components/admin/admin-nav-structure";
import { UI_LAYERS } from "@/lib/ui-layers";
import { AdminWeatherChip } from "@/components/admin/admin-weather";
import { ArayIcon, ArayOrb } from "@/components/shared/aray-orb";
import { requestArayOpen } from "@/components/store/aray-events";

// ── Иконка для каждой группы (главная иконка раздела) ──
const GROUP_ICONS: Record<string, React.ElementType> = {
  main: LayoutDashboard,
  personal: UserCircle,
  sales: ShoppingBag,
  aray: ArayIcon,
  products: Package,
  content: BookOpen,
  marketing: Megaphone,
  finance: Wallet,
  arayCms: ArayIcon,
  settings: Settings,
  help: HelpCircle,
};

// ── Подсказки для каждого раздела (subtitle в popup рельса) ──
// Дублирует PAGE_TITLES из admin-shell.tsx — держим локально,
// чтобы избежать circular import. Если ключа нет — subtitle не показывается.
const SUBTITLE_BY_HREF: Record<string, string> = {
  "/admin": "Рабочий стол и сводка дня",
  "/admin/orders": "Активные и архив",
  "/admin/orders/new": "Касса и заказы",
  "/admin/crm": "Лиды и сделки",
  "/admin/crm/automation": "Тоннели и правила",
  "/admin/tasks": "Команда",
  "/admin/delivery": "Маршруты и тарифы",
  "/admin/delivery/rates": "Тарифы доставки",
  "/admin/products": "Каталог товаров",
  "/admin/categories": "Дерево разделов",
  "/admin/inventory": "Остатки и движение",
  "/admin/import": "CSV, Excel",
  "/admin/media": "Фото и документы",
  "/admin/business/settings": "Сайт, витрина, SEO",
  "/admin/promotions": "Скидки и предложения",
  "/admin/reviews": "Модерация",
  "/admin/email": "Email и push",
  "/admin/promotion": "SEO и реклама",
  "/admin/finance": "Доходы и расходы",
  "/admin/clients": "База покупателей",
  "/admin/health": "Состояние системы",
  "/admin/site": "Настройки магазина",
  "/admin/settings": "Параметры",
  "/admin/terminals": "Оплата, устройства и рабочие места",
  "/admin/terminals/training": "Сценарии запуска",
  "/admin/appearance": "Темы и палитры",
  "/admin/analytics": "Графики и отчёты",
  "/admin/watermark": "Защита фото",
  "/admin/staff": "Сотрудники",
  "/admin/notifications": "Push рассылка",
  "/admin/help": "База знаний",
  "/admin/aray": "ARAY AI",
  "/admin/aray/agents": "Отделы и качество",
  "/admin/aray/costs": "Токены и подписки",
  "/admin/posts": "Блог и новости",
  "/admin/services": "Сервисы",
  "/admin/stories": "Видео, live и отзывы",
};

type Group = {
  key: string;
  label: string;
  icon: React.ElementType;
  items: NavItem[];
};

function isNavItemMatch(item: NavItem, pathname: string): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

interface Props {
  role: string;
  avatarUrl?: string | null;
  userName?: string | null;
  email?: string | null;
  disabledModuleIds?: string[];
}

export function AdminNavRail({ role, disabledModuleIds }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useAdminLang();
  const [pinnedGroup, setPinnedGroup] = useState<string | null>(null);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [arayWorkspaceOpen, setArayWorkspaceOpen] = useState(false);
  const hoverCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingHrefRef = useRef<string | null>(null);
  const shiftedGroup = pinnedGroup;

  // ── Фильтрация по роли + группировка ──
  const groups = useMemo<Group[]>(
    () => buildAdminNavigationGroups(role, t, GROUP_ICONS, disabledModuleIds, "desktopRail").map(({ key, label, icon, items }) => ({
      key,
      label,
      icon,
      items,
    })),
    [disabledModuleIds, role, t],
  );

  // ── Активный пункт: берём самый специфичный матч, чтобы вложенные маршруты
  // не подсвечивали родителя и дочерний пункт одновременно.
  const activeItem = useMemo(() => {
    return groups
      .flatMap((group) => group.items)
      .filter((item) => isAdminNavItemMatch(item, pathname))
      .sort((a, b) => b.href.length - a.href.length)[0] || null;
  }, [groups, pathname]);
  const activeGroupKey = activeItem?.group || null;

  useEffect(() => {
    pendingHrefRef.current = pendingHref;
  }, [pendingHref]);

  // Закрываем меню только после того, как целевая страница уже сменилась.
  useEffect(() => {
    if (!pendingHref) return;
    if (pathname === pendingHref || pathname.startsWith(`${pendingHref}/`)) {
      setPinnedGroup(null);
      setPendingHref(null);
    }
  }, [pathname, pendingHref]);

  const closePanels = useCallback(() => {
    if (hoverCloseTimerRef.current) {
      clearTimeout(hoverCloseTimerRef.current);
      hoverCloseTimerRef.current = null;
    }
    setPinnedGroup(null);
    setPendingHref(null);
  }, []);

  const clearHoverClose = useCallback(() => {
    if (hoverCloseTimerRef.current) {
      clearTimeout(hoverCloseTimerRef.current);
      hoverCloseTimerRef.current = null;
    }
  }, []);

  const scheduleHoverClose = useCallback(() => {
    if (pendingHrefRef.current) return;
    clearHoverClose();
    hoverCloseTimerRef.current = setTimeout(() => {
      if (pendingHrefRef.current) return;
      setPinnedGroup(null);
      hoverCloseTimerRef.current = null;
    }, 260);
  }, [clearHoverClose]);

  const handlePanelNavigate = useCallback((href: string) => {
    const nextPath = href.split("?")[0];
    if (pathname === nextPath) {
      closePanels();
      return;
    }
    setPendingHref(nextPath);
  }, [closePanels, pathname]);

  const handleWorkspaceNavigate = useCallback((href: string) => {
    handlePanelNavigate(href);
  }, [handlePanelNavigate]);

  const openArayWorkspace = useCallback(() => {
    closePanels();
    requestArayOpen("open");
  }, [closePanels]);

  const openGroupByHover = useCallback((group: Group) => {
    clearHoverClose();
    if (group.items.length <= 1) return;
    setPinnedGroup(group.key);
  }, [clearHoverClose]);

  useEffect(() => {
    return () => {
      if (hoverCloseTimerRef.current) clearTimeout(hoverCloseTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!shiftedGroup) {
      document.body.removeAttribute("data-admin-nav-capsule");
      delete document.body.dataset.adminNavCapsule;
      return;
    }

    document.body.setAttribute("data-admin-nav-capsule", shiftedGroup);
    document.body.dataset.adminNavCapsule = shiftedGroup;
    return () => {
      document.body.removeAttribute("data-admin-nav-capsule");
      delete document.body.dataset.adminNavCapsule;
    };
  }, [shiftedGroup]);

  useEffect(() => {
    const syncWorkspaceState = () => {
      setArayWorkspaceOpen(document.body.hasAttribute("data-aray-workspace"));
    };
    syncWorkspaceState();
    const observer = new MutationObserver(syncWorkspaceState);
    observer.observe(document.body, { attributes: true, attributeFilter: ["data-aray-workspace"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!pinnedGroup) return;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Element | null;
      if (target?.closest("[data-admin-nav-rail]")) return;
      closePanels();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closePanels();
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [closePanels, pinnedGroup]);

  return (
    <aside
      data-admin-nav-rail
      className={`admin-rail-liquid admin-rail-shell hidden lg:flex ${UI_LAYERS.navRail} flex-col items-center py-4 px-2.5 gap-2`}
      onMouseEnter={clearHoverClose}
      onMouseLeave={scheduleHoverClose}
    >
      <div className="shrink-0 pb-2">
        <button
          type="button"
          aria-label="Открыть ARAY"
          title="ARAY Production"
          className={`admin-rail-icon admin-rail-orb-button ${arayWorkspaceOpen ? "is-aray-active" : ""}`}
          onClick={openArayWorkspace}
        >
          <span className="admin-rail-orb-inner" aria-hidden="true">
            <ArayOrb size={37} pulse={arayWorkspaceOpen ? "thinking" : "idle"} intensity="normal" />
          </span>
        </button>
      </div>

      {/* ── Группы навигации ── */}
      <nav className="admin-rail-list flex flex-col items-center gap-2 flex-1 min-h-0">
        {groups.map((g) => {
          const isActive = activeGroupKey === g.key;
          const isOpen = pinnedGroup === g.key;
          const primaryHref = g.items[0].href;
          const Icon = g.icon;

          const railIcon = (
            <div className={`admin-rail-icon ${isActive ? "is-active" : ""} ${isOpen ? "is-open" : ""}`}>
              <Icon className="w-[18px] h-[18px]" strokeWidth={1.75} />
              {isActive && (
                <span className="absolute -left-2 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-full bg-primary" />
              )}
            </div>
          );

          return (
            <div
              key={g.key}
              className="relative"
              onMouseEnter={() => openGroupByHover(g)}
            >
              <button
                type="button"
                aria-label={g.label}
                aria-expanded={isOpen}
                title={g.label}
                className="block appearance-none border-0 bg-transparent p-0"
                onClick={() => {
                  if (g.items.length === 1) {
                    handlePanelNavigate(primaryHref);
                    router.push(primaryHref);
                    return;
                  }
                  const nextPinned = pinnedGroup === g.key ? null : g.key;
                  setPinnedGroup(nextPinned);
                }}
                aria-controls={isOpen ? `admin-nav-panel-${g.key}` : undefined}
              >
                {railIcon}
              </button>

              {isOpen && (
                <GroupPopup
                  group={g}
                  pathname={pathname}
                  t={t}
                  onClose={closePanels}
                  onNavigate={handleWorkspaceNavigate}
                  activeHref={activeItem?.href}
                />
              )}
            </div>
          );
        })}
      </nav>

      {/* ── Низ: ссылка на сайт ── */}
      <div className="shrink-0 pt-2 flex flex-col items-center gap-2">
        <AdminWeatherChip variant="rail" />
        <div
          className="relative"
        >
          <Link
            href="/"
            className="admin-rail-icon"
            aria-label="На сайт"
            title="На сайт"
            onClick={() => {
              closePanels();
            }}
          >
            <ExternalLink className="w-[18px] h-[18px]" strokeWidth={1.75} />
          </Link>
        </div>
      </div>
    </aside>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Hover popup с пунктами группы — выезжает справа от рельса
// ─────────────────────────────────────────────────────────────────────────────

function GroupPopup({
  group, pathname, t, onClose, onNavigate, activeHref,
}: {
  group: Group;
  pathname: string;
  t: (key: any) => string;
  onClose: () => void;
  onNavigate: (href: string) => void;
  activeHref?: string;
}) {
  const GroupIcon = group.icon;
  const description = ADMIN_NAV_GROUP_DESCRIPTIONS[group.key];
  const singleItem = group.items.length === 1 ? group.items[0] : null;
  const singleLabel = singleItem ? (singleItem.labelKey ? t(singleItem.labelKey) : singleItem.label) : null;
  const singleSubtitle = singleItem ? getAdminNavigationSubtitle(singleItem.href, t) : null;
  const sections = buildAdminNavSections(group.key, group.items);
  const showSectionLabels = sections.length > 1;

  return (
    <div
      id={`admin-nav-panel-${group.key}`}
      className={`admin-popup-liquid admin-nav-panel admin-nav-drawer border rounded-[24px] overflow-hidden flex flex-col ${
        singleItem ? "max-h-none" : ""
      }`}
    >
      {/* Шапка попапа: иконка группы + label */}
      <div className="admin-nav-panel-head flex items-center gap-3 px-4 py-4 border-b border-border/70 shrink-0">
        <div className="admin-nav-panel-head-icon w-10 h-10 rounded-2xl flex items-center justify-center shrink-0">
          <GroupIcon className="w-[18px] h-[18px]" strokeWidth={1.75} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-display font-semibold text-[15px] text-foreground leading-tight truncate">
            {group.label}
          </p>
          <p className="text-[11px] text-muted-foreground leading-tight mt-0.5 truncate">
            {group.items.length} {pluralizeRu(group.items.length, ["раздел", "раздела", "разделов"])}
            {description ? ` · ${description}` : ""}
          </p>
        </div>
        <button
          type="button"
          className="admin-nav-panel-close"
          aria-label="Закрыть меню"
          title="Свернуть меню"
          onClick={onClose}
        >
          <ChevronLeft className="w-4 h-4" strokeWidth={1.75} />
        </button>
      </div>

      {singleItem ? (
        <div className="p-3">
          <Link
            href={singleItem.href}
            className="admin-nav-panel-item group flex min-h-[4.25rem] items-center gap-3 rounded-2xl px-3 py-3 transition-all duration-150"
            onClick={() => onNavigate(singleItem.href)}
          >
            <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold leading-tight text-foreground">
                {singleLabel}
              </p>
              <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
                {singleSubtitle || description || "Открыть раздел"}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/45 transition-colors group-hover:text-primary" />
          </Link>
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-3">
          {sections.map((section) => (
            <div key={section.label} className="space-y-1">
              {showSectionLabels && (
                <p className="px-3 pt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/75">
                  {section.label}
                </p>
              )}
              {section.items.map((item) => {
                const isActive = item.exact
                  ? pathname === item.href
                  : activeHref === item.href;
                const label = item.labelKey ? t(item.labelKey) : item.label;
                const subtitle = getAdminNavigationSubtitle(item.href, t);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`admin-nav-panel-item group flex min-h-[3.25rem] items-center gap-3 px-3 py-2.5 rounded-2xl transition-all duration-150
                      ${isActive ? "is-active" : ""}`}
                    onClick={() => onNavigate(item.href)}
                  >
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full transition-colors ${
                        isActive ? "bg-primary" : "bg-muted-foreground/30 group-hover:bg-primary/55"
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`min-w-0 truncate text-sm leading-tight ${isActive ? "font-semibold" : "font-medium"}`}>
                          {label}
                        </p>
                        {item.badge && (
                          <span className="shrink-0 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold leading-none text-primary">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      {subtitle && (
                        <p className="text-[11px] text-muted-foreground leading-tight mt-0.5 truncate">
                          {subtitle}
                        </p>
                      )}
                    </div>
                    <ChevronRight
                      className={`w-4 h-4 shrink-0 transition-colors ${isActive ? "text-primary" : "text-muted-foreground/40"}`}
                    />
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Plural helper для русского склонения ("1 раздел / 2 раздела / 5 разделов")
function pluralizeRu(n: number, forms: [string, string, string]): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return forms[1];
  return forms[2];
}
