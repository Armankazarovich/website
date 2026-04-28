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

import { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, ShoppingBag, Sparkles, Package, BookOpen,
  Megaphone, Settings, HelpCircle, UserCircle, ChevronRight,
  ExternalLink,
} from "lucide-react";
import { useAdminLang } from "@/lib/admin-lang-context";
import {
  allNavItems, GROUP_LABELS, type NavItem,
} from "@/components/admin/admin-nav";

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
}

export function AdminNavRail({ role, avatarUrl, userName, email }: Props) {
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

  const initial =
    (userName?.charAt(0) || email?.charAt(0) || "A").toUpperCase();

  return (
    <aside
      className="hidden lg:flex fixed left-0 top-0 h-screen w-16 z-30 flex-col items-center py-3 gap-1 bg-card border-r border-border"
      onMouseLeave={scheduleClose}
    >
      {/* ── Профиль (avatar) — hover popup с email + ссылка ── */}
      <div
        className="relative shrink-0 mb-2"
        onMouseEnter={() => { clearCloseTimer(); setHoverProfile(true); setHoverGroup(null); }}
      >
        <Link
          href="/cabinet/profile"
          className="block w-10 h-10 rounded-2xl overflow-hidden ring-1 ring-border hover:ring-primary/40 transition-all"
          aria-label="Профиль"
        >
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt=""
              width={40}
              height={40}
              className="w-full h-full object-cover"
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center text-sm font-semibold"
              style={{
                background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary)/0.6))",
                color: "hsl(var(--primary-foreground))",
              }}
            >
              {initial}
            </div>
          )}
        </Link>

        {hoverProfile && (
          <ProfilePopup
            userName={userName}
            email={email}
            onMouseEnter={clearCloseTimer}
            onMouseLeave={scheduleClose}
          />
        )}
      </div>

      {/* ── Тонкий разделитель ── */}
      <div className="w-8 h-px bg-border mb-1" />

      {/* ── Группы навигации ── */}
      <nav className="flex flex-col items-center gap-1 flex-1 min-h-0">
        {groups.map((g) => {
          const isActive = activeGroupKey === g.key;
          const isOpen = hoverGroup === g.key;
          const single = g.items.length === 1;
          const Icon = g.icon;

          const button = (
            <button
              type="button"
              className={`relative w-11 h-11 rounded-2xl flex items-center justify-center transition-all
                ${isActive
                  ? "bg-primary/12 text-primary ring-1 ring-primary/30"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"}`}
              aria-label={g.label}
              title={single ? g.label : undefined}
            >
              <Icon className="w-[18px] h-[18px]" strokeWidth={1.75} />
              {isActive && (
                <span className="absolute -left-0.5 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full bg-primary" />
              )}
            </button>
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
              {single ? (
                <Link
                  href={g.items[0].href}
                  aria-label={g.label}
                  className="block"
                >
                  {button}
                </Link>
              ) : (
                button
              )}

              {isOpen && !single && (
                <GroupPopup
                  group={g}
                  pathname={pathname}
                  t={t}
                  onMouseEnter={clearCloseTimer}
                  onMouseLeave={scheduleClose}
                />
              )}
            </div>
          );
        })}
      </nav>

      {/* ── Низ: ссылка на сайт ── */}
      <div className="shrink-0 pt-2">
        <Link
          href="/"
          className="w-11 h-11 rounded-2xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all"
          aria-label="На сайт"
          title="На сайт"
        >
          <ExternalLink className="w-[18px] h-[18px]" strokeWidth={1.75} />
        </Link>
      </div>
    </aside>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Hover popup с пунктами группы — выезжает справа от рельса
// ─────────────────────────────────────────────────────────────────────────────

function GroupPopup({
  group, pathname, t, onMouseEnter, onMouseLeave,
}: {
  group: Group;
  pathname: string;
  t: (key: any) => string;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  return (
    <div
      className="absolute left-full top-0 ml-2 w-64 bg-card border border-border rounded-2xl shadow-xl py-2 z-40 animate-in fade-in slide-in-from-left-1 duration-150"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="px-4 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.12em]">
        {group.label}
      </div>
      <div className="px-1">
        {group.items.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          const ItemIcon = item.icon;
          const label = item.labelKey ? t(item.labelKey) : item.label;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors
                ${isActive
                  ? "bg-primary/10 text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"}`}
            >
              <ItemIcon
                className={`w-4 h-4 shrink-0 ${isActive ? "text-primary" : ""}`}
                strokeWidth={1.75}
              />
              <span className="flex-1 truncate">{label}</span>
              {isActive && <ChevronRight className="w-3.5 h-3.5 text-primary shrink-0" />}
            </Link>
          );
        })}
      </div>
    </div>
  );
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
