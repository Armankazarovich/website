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

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, ShoppingBag, Sparkles, Package, BookOpen,
  Megaphone, Settings, HelpCircle, UserCircle, ChevronRight,
  ExternalLink, ChevronLeft,
} from "lucide-react";
import { useAdminLang } from "@/lib/admin-lang-context";
import {
  allNavItems, GROUP_LABELS, type NavItem,
} from "@/components/admin/admin-nav";
import { UI_LAYERS } from "@/lib/ui-layers";

// ── Иконка для каждой группы (главная иконка раздела) ──
const GROUP_ICONS: Record<string, React.ElementType> = {
  main: LayoutDashboard,
  personal: UserCircle,
  sales: ShoppingBag,
  aray: Sparkles,
  products: Package,
  content: BookOpen,
  marketing: Megaphone,
  settings: Settings,
  help: HelpCircle,
};

// ── Подсказки для каждого раздела (subtitle в popup рельса) ──
// Дублирует PAGE_TITLES из admin-shell.tsx — держим локально,
// чтобы избежать circular import. Если ключа нет — subtitle не показывается.
const SUBTITLE_BY_HREF: Record<string, string> = {
  "/admin": "Сводка магазина",
  "/admin/orders": "Активные и архив",
  "/admin/orders/new": "По телефону",
  "/admin/crm": "Лиды и сделки",
  "/admin/crm/automation": "Тоннели",
  "/admin/tasks": "Команда",
  "/admin/delivery": "Маршруты и тарифы",
  "/admin/delivery/rates": "Тарифы доставки",
  "/admin/products": "Товары магазина",
  "/admin/categories": "Дерево разделов",
  "/admin/inventory": "Остатки и движение",
  "/admin/import": "CSV, Excel",
  "/admin/media": "Фото и документы",
  "/admin/promotions": "Скидки и предложения",
  "/admin/reviews": "Модерация",
  "/admin/email": "Кампании",
  "/admin/promotion": "SEO и реклама",
  "/admin/finance": "Доходы и расходы",
  "/admin/clients": "База покупателей",
  "/admin/health": "Состояние системы",
  "/admin/site": "Настройки магазина",
  "/admin/settings": "Параметры",
  "/admin/appearance": "Темы и палитры",
  "/admin/analytics": "Графики и отчёты",
  "/admin/watermark": "Защита фото",
  "/admin/staff": "Сотрудники",
  "/admin/notifications": "Push рассылка",
  "/admin/help": "Гайды",
  "/admin/aray": "Главная Арая",
  "/admin/aray/costs": "Токены и подписки",
  "/admin/aray-lab": "Эксперименты",
  "/admin/posts": "Блог и новости",
  "/admin/services": "Сервисы",
};

// Порядок групп в рельсе (сверху вниз)
const GROUP_ORDER = [
  "main", "personal", "sales", "aray", "products",
  "content", "marketing", "settings", "help",
];

type Group = {
  key: string;
  label: string;
  icon: React.ElementType;
  items: NavItem[];
};

interface Props {
  role: string;
  avatarUrl?: string | null;
  userName?: string | null;
  email?: string | null;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
}

export function AdminNavRail({ role, avatarUrl, userName, email, expanded, onExpandedChange }: Props) {
  const pathname = usePathname();
  const { t } = useAdminLang();
  const [hoverGroup, setHoverGroup] = useState<string | null>(null);
  const [hoverProfile, setHoverProfile] = useState(false);
  const closeTimer = useRef<number | null>(null);

  // ── Фильтрация по роли + группировка ──
  const groups = useMemo<Group[]>(() => {
    const visible = allNavItems.filter(i => !i.roles || i.roles.includes(role));
    const map = new Map<string, NavItem[]>();
    for (const item of visible) {
      const arr = map.get(item.group) || [];
      arr.push(item);
      map.set(item.group, arr);
    }
    const result: Group[] = [];
    for (const key of GROUP_ORDER) {
      const items = map.get(key);
      if (!items || items.length === 0) continue;
      result.push({
        key,
        label: GROUP_LABELS[key] || key,
        icon: GROUP_ICONS[key] || LayoutDashboard,
        items,
      });
    }
    return result;
  }, [role]);

  // ── Какая группа активна (содержит pathname) ──
  const activeGroupKey = useMemo(() => {
    for (const g of groups) {
      const hit = g.items.find(i =>
        i.exact ? pathname === i.href : pathname.startsWith(i.href)
      );
      if (hit) return g.key;
    }
    return null;
  }, [groups, pathname]);

  // ── Hover delay (150мс) для плавного перехода иконка → popup ──
  function clearCloseTimer() {
    if (closeTimer.current) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }
  function scheduleClose() {
    clearCloseTimer();
    closeTimer.current = window.setTimeout(() => {
      setHoverGroup(null);
      setHoverProfile(false);
    }, 150);
  }
  useEffect(() => () => clearCloseTimer(), []);

  // ── Закрыть popup при смене страницы ──
  useEffect(() => {
    setHoverGroup(null);
    setHoverProfile(false);
  }, [pathname]);

  return (
    <aside
      className={`hidden lg:flex fixed left-0 ${expanded ? "w-64" : "w-16"} ${UI_LAYERS.navRail} flex-col ${
        expanded ? "items-stretch" : "items-center"
      } py-3 gap-1 bg-card border-r border-border transition-[width] duration-200`}
      style={{ top: 64, height: "calc(100vh - 64px)" }}
      onMouseLeave={scheduleClose}
    >
      {/* ── Collapse / expand control ── */}
      <div className={`shrink-0 flex items-center ${expanded ? "justify-between px-3 pb-2" : "justify-center pb-2"}`}>
        {expanded && (
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground leading-tight truncate">Панель управления</p>
            <p className="text-[11px] text-muted-foreground leading-tight truncate">ПилоРус</p>
          </div>
        )}
        <button
          type="button"
          onClick={() => {
            setHoverGroup(null);
            setHoverProfile(false);
            onExpandedChange(!expanded);
          }}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors shrink-0"
          aria-label={expanded ? "Свернуть меню" : "Развернуть меню"}
          title={expanded ? "Свернуть меню" : "Развернуть меню"}
        >
          <ChevronLeft
            className={`w-[18px] h-[18px] transition-transform duration-200 ${expanded ? "" : "rotate-180"}`}
            strokeWidth={1.75}
          />
        </button>
      </div>

      {/* ── Группы навигации ── */}
      <nav className={`flex flex-col ${expanded ? "items-stretch px-2 overflow-y-auto" : "items-center"} gap-1 flex-1 min-h-0`}>
        {groups.map((g, index) => {
          const isActive = activeGroupKey === g.key;
          const isOpen = hoverGroup === g.key;
          const primaryHref = g.items[0].href;
          const Icon = g.icon;

          if (expanded) {
            return (
              <ExpandedGroup
                key={g.key}
                group={g}
                pathname={pathname}
                t={t}
              />
            );
          }

          const railIcon = (
            <div
              className={`relative w-11 h-11 rounded-2xl flex items-center justify-center transition-all
                ${isActive
                  ? "bg-primary/12 text-primary ring-1 ring-primary/30"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"}`}
            >
              <Icon className="w-[18px] h-[18px]" strokeWidth={1.75} />
              {isActive && (
                <span className="absolute -left-0.5 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full bg-primary" />
              )}
            </div>
          );

          return (
            <div
              key={g.key}
              className="relative"
              onMouseEnter={() => {
                clearCloseTimer();
                setHoverGroup(g.key);
                setHoverProfile(false);
              }}
            >
                <Link
                  href={primaryHref}
                  aria-label={g.label}
                  title={g.label}
                  className="block"
                  onClick={() => setHoverGroup(null)}
                >
                  {railIcon}
                </Link>

              {isOpen && g.items.length > 1 && (
                <GroupPopup
                  group={g}
                  pathname={pathname}
                  t={t}
                  align={index >= groups.length - 3 ? "bottom" : "top"}
                  onMouseEnter={clearCloseTimer}
                  onMouseLeave={scheduleClose}
                />
              )}
            </div>
          );
        })}
      </nav>

      {/* ── Низ: ссылка на сайт ── */}
      <div className={`shrink-0 pt-2 ${expanded ? "px-2" : ""}`}>
        <Link
          href="/"
          className={`rounded-2xl flex items-center ${
            expanded ? "w-full h-11 px-3 gap-3" : "w-11 h-11 justify-center"
          } text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all`}
          aria-label="На сайт"
          title="На сайт"
        >
          <ExternalLink className="w-[18px] h-[18px]" strokeWidth={1.75} />
          {expanded && <span className="text-sm font-medium">На сайт</span>}
        </Link>
      </div>
    </aside>
  );
}

function ExpandedGroup({
  group, pathname, t,
}: {
  group: Group;
  pathname: string;
  t: (key: any) => string;
}) {
  const GroupIcon = group.icon;

  return (
    <div className="py-1.5">
      <div className="flex items-center gap-2 px-3 py-1.5">
        <GroupIcon className="w-3.5 h-3.5 text-muted-foreground/70" strokeWidth={1.75} />
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground truncate">
          {group.label}
        </p>
      </div>
      <div className="space-y-0.5">
        {group.items.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          const ItemIcon = item.icon;
          const label = item.labelKey ? t(item.labelKey) : item.label;
          const subtitle = SUBTITLE_BY_HREF[item.href];

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${
                isActive
                  ? "bg-primary/12 text-foreground ring-1 ring-primary/20"
                  : "text-foreground hover:bg-muted/60"
              }`}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                  isActive ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                }`}
              >
                <ItemIcon className="w-4 h-4" strokeWidth={1.75} />
              </div>
              <div className="min-w-0 flex-1">
                <p className={`text-sm leading-tight truncate ${isActive ? "font-semibold" : "font-medium"}`}>
                  {label}
                </p>
                {subtitle && (
                  <p className="text-[11px] text-muted-foreground leading-tight mt-0.5 truncate">
                    {subtitle}
                  </p>
                )}
              </div>
              {isActive && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Hover popup с пунктами группы — выезжает справа от рельса
// ─────────────────────────────────────────────────────────────────────────────

function GroupPopup({
  group, pathname, t, align, onMouseEnter, onMouseLeave,
}: {
  group: Group;
  pathname: string;
  t: (key: any) => string;
  align: "top" | "bottom";
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  const GroupIcon = group.icon;

  return (
    <div
      className={`absolute left-full ml-2 w-80 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden z-40 animate-in fade-in slide-in-from-left-2 duration-200 ${
        align === "bottom" ? "bottom-0" : "top-0"
      }`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Шапка попапа: иконка группы + label */}
      <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border bg-muted/30">
        <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <GroupIcon className="w-[18px] h-[18px]" strokeWidth={1.75} />
        </div>
        <div className="min-w-0">
          <p className="font-display font-semibold text-sm text-foreground leading-tight truncate">
            {group.label}
          </p>
          <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
            {group.items.length} {pluralizeRu(group.items.length, ["раздел", "раздела", "разделов"])}
          </p>
        </div>
      </div>

      {/* Список пунктов с разделителями */}
      <div className="divide-y divide-border max-h-[70vh] overflow-y-auto">
        {group.items.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          const ItemIcon = item.icon;
          const label = item.labelKey ? t(item.labelKey) : item.label;
          const subtitle = SUBTITLE_BY_HREF[item.href];
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onMouseLeave}
              className={`flex items-center gap-3 px-4 py-3 transition-colors
                ${isActive
                  ? "bg-primary/8 text-foreground"
                  : "text-foreground hover:bg-muted/50"}`}
            >
              <div
                data-fly-icon
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors
                  ${isActive
                    ? "bg-primary/15 text-primary"
                    : "bg-muted text-muted-foreground"}`}
              >
                <ItemIcon className="w-[18px] h-[18px]" strokeWidth={1.75} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm leading-tight truncate ${isActive ? "font-semibold" : "font-medium"}`}>
                  {label}
                </p>
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

function ProfilePopup({
  userName, email, onMouseEnter, onMouseLeave,
}: {
  userName?: string | null;
  email?: string | null;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  return (
    <div
      className="absolute left-full top-0 ml-2 w-60 bg-card border border-border rounded-2xl shadow-xl py-3 px-4 z-40 animate-in fade-in slide-in-from-left-1 duration-150"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <p className="text-sm font-semibold text-foreground leading-tight truncate">
        {userName || (email ? email.split("@")[0] : "Пользователь")}
      </p>
      {email && (
        <p className="text-xs text-muted-foreground mt-0.5 truncate">{email}</p>
      )}
      <Link
        href="/cabinet/profile"
        className="mt-3 inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
      >
        Открыть профиль
        <ChevronRight className="w-3 h-3" />
      </Link>
    </div>
  );
}
