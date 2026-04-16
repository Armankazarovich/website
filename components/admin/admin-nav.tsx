"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { useAdminLang } from "@/lib/admin-lang-context";
import type { TranslationKey } from "@/lib/admin-i18n";
import { ChevronDown } from "lucide-react";
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Tag,
  Star,
  Settings,
  Megaphone,
  Globe,
  HelpCircle,
  Users,
  Bell,
  Truck,
  UserCircle,
  Palette,
  Stamp,
  Warehouse,
  FileDown,
  Images,
  BarChart2,
  Mail,
  HeartPulse,
  TrendingUp,
  Wallet,
  CheckSquare,
  Zap,
  Target,
  BookOpen,
  Wrench,
  Heart,
  History,
  UserPlus,
} from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  labelKey?: TranslationKey;
  icon: React.ElementType;
  exact?: boolean;
  roles: string[];
  group: string;
  groupKey?: TranslationKey;
};

const SA = "SUPER_ADMIN";
const ALL_STAFF = [SA, "ADMIN", "MANAGER", "COURIER", "ACCOUNTANT", "WAREHOUSE", "SELLER"];
const ALL_ROLES = [...ALL_STAFF, "USER"];

const allNavItems: NavItem[] = [
  // ═══════════════════════════════════════════════════════════════
  // ОБЩИЕ РАЗДЕЛЫ — видны ВСЕМ пользователям (от USER до SUPER_ADMIN)
  // ═══════════════════════════════════════════════════════════════

  // ── Главная ──
  { href: "/admin", label: "Дашборд", labelKey: "dashboard", icon: LayoutDashboard, exact: true, roles: ALL_STAFF, group: "main" },
  { href: "/cabinet", label: "Главная", icon: LayoutDashboard, exact: true, roles: ["USER"], group: "main" },

  // ── Мой кабинет — УБРАН из сайдбара (профиль в шапке, оформление в ARAY Control) ──
  // Страницы /cabinet/* остаются доступными по прямой ссылке

  // ═══════════════════════════════════════════════════════════════
  // РАБОЧИЕ РАЗДЕЛЫ — по ролям сотрудников
  // ═══════════════════════════════════════════════════════════════

  // ── Продажи ──
  { href: "/admin/orders",    label: "Заказы",        labelKey: "orders",    icon: ShoppingBag, roles: ALL_STAFF, group: "sales", groupKey: "sales" },
  { href: "/admin/crm",      label: "CRM — Лиды",    labelKey: "crm",       icon: Target,      roles: [SA, "ADMIN", "MANAGER", "SELLER"], group: "sales" },
  { href: "/admin/analytics", label: "Аналитика",     labelKey: "analytics", icon: BarChart2,   roles: [SA, "ADMIN", "ACCOUNTANT"], group: "sales" },
  { href: "/admin/finance",   label: "Финансы",       labelKey: "finance",   icon: Wallet,      roles: [SA, "ADMIN", "ACCOUNTANT"], group: "sales" },
  { href: "/admin/clients",   label: "Клиенты",       labelKey: "clients",   icon: UserCircle,  roles: [SA, "ADMIN", "MANAGER"], group: "sales" },
  { href: "/admin/tasks",     label: "Задачи",        labelKey: "tasks",     icon: CheckSquare, roles: ALL_STAFF, group: "sales" },
  { href: "/admin/delivery",  label: "Доставка",      labelKey: "delivery",  icon: Truck,       roles: [SA, "ADMIN", "MANAGER", "COURIER"], group: "sales" },

  // ── Товары ──
  { href: "/admin/products",   label: "Каталог товаров",  labelKey: "catalog",       icon: Package,   roles: [SA, "ADMIN", "MANAGER", "WAREHOUSE", "SELLER"], group: "products", groupKey: "products" },
  { href: "/catalog",          label: "Каталог",          icon: Package,             roles: ["USER"], group: "products", groupKey: "products" },
  { href: "/admin/categories", label: "Категории",        labelKey: "categories",    icon: Tag,       roles: [SA, "ADMIN"], group: "products" },
  { href: "/admin/inventory",  label: "Склад / Остатки",  labelKey: "inventory",     icon: Warehouse, roles: [SA, "ADMIN", "MANAGER", "WAREHOUSE"], group: "products" },
  { href: "/admin/import",     label: "Импорт / Экспорт", labelKey: "import_export", icon: FileDown,  roles: [SA, "ADMIN", "MANAGER", "WAREHOUSE"], group: "products" },
  { href: "/admin/media",      label: "Медиабиблиотека",  labelKey: "media",         icon: Images,    roles: [SA, "ADMIN", "MANAGER"], group: "products" },

  // ── Контент ──
  { href: "/admin/posts",    label: "Статьи / Новости", icon: BookOpen, roles: [SA, "ADMIN", "MANAGER"], group: "content", groupKey: undefined },
  { href: "/admin/services", label: "Услуги",           icon: Wrench,   roles: [SA, "ADMIN", "MANAGER"], group: "content" },

  // ── Маркетинг ──
  { href: "/admin/promotions", label: "Акции",          labelKey: "promotions", icon: Megaphone,  roles: [SA, "ADMIN", "MANAGER"], group: "marketing", groupKey: "marketing" },
  { href: "/admin/reviews",    label: "Отзывы",         labelKey: "reviews",    icon: Star,       roles: [SA, "ADMIN", "MANAGER"], group: "marketing" },
  { href: "/admin/email",      label: "Email рассылка", labelKey: "email",      icon: Mail,       roles: [SA, "ADMIN"], group: "marketing" },
  { href: "/admin/promotion",  label: "Продвижение",    labelKey: "promotion",  icon: TrendingUp, roles: [SA, "ADMIN", "MANAGER"], group: "marketing" },

  // ── Настройки (система) ──
  { href: "/admin/site",           label: "Сайт",              labelKey: "site_settings", icon: Globe,      roles: [SA, "ADMIN"], group: "settings", groupKey: "settings" },
  { href: "/admin/settings",       label: "Настройки",         labelKey: "settings",      icon: Settings,   roles: [SA, "ADMIN"], group: "settings" },
  { href: "/admin/appearance",     label: "Оформление",        labelKey: "appearance",    icon: Palette,    roles: [SA, "ADMIN"], group: "settings" },
  { href: "/admin/watermark",      label: "Водяной знак",      labelKey: "watermark",     icon: Stamp,      roles: [SA, "ADMIN"], group: "settings" },
  { href: "/admin/staff",          label: "Команда",           labelKey: "staff",         icon: Users,      roles: [SA, "ADMIN"], group: "settings" },
  { href: "/admin/notifications",  label: "Уведомления",       labelKey: "notifications", icon: Bell,       roles: [SA, "ADMIN"], group: "settings" },
  { href: "/admin/health",         label: "Здоровье системы",  labelKey: "health",        icon: HeartPulse, roles: [SA, "ADMIN"], group: "settings" },

  // ── Настройки (персональные — для всех) ──
  { href: "/cabinet/notifications", label: "Уведомления",  icon: Bell,     roles: ["USER"], group: "settings", groupKey: "settings" },
  { href: "/cabinet/appearance",    label: "Оформление",   icon: Palette,  roles: ["USER"], group: "settings" },

  // ── Помощь ──
  { href: "/admin/help", label: "Помощь", labelKey: "help", icon: HelpCircle, roles: ALL_ROLES, group: "help" },
];

// Группы которые будут collapsible (аккордеон)
const COLLAPSIBLE_GROUPS = new Set(["settings", "marketing", "personal"]);

// Названия групп для USER (без labelKey)
const GROUP_LABELS: Record<string, string> = {
  personal: "Мой кабинет",
  sales: "Покупки",
  products: "Магазин",
  settings: "Настройки",
};

export function AdminNav({ role, onNavigate }: { role?: string; onNavigate?: () => void }) {
  const pathname = usePathname();
  const [pendingCount, setPendingCount] = useState(0);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set(["settings"]));
  const { t } = useAdminLang();

  // Раскрыть группу если активная страница в ней
  useEffect(() => {
    const visItems = allNavItems.filter(i => !i.roles || i.roles.includes(role || ""));
    const activeItem = visItems.find(i => i.exact ? pathname === i.href : pathname.startsWith(i.href));
    if (activeItem && COLLAPSIBLE_GROUPS.has(activeItem.group)) {
      setCollapsed(prev => { const s = new Set(prev); s.delete(activeItem.group); return s; });
    }
  }, [pathname, role]);

  // Fetch pending staff count
  useEffect(() => {
    if (!role || !["SUPER_ADMIN", "ADMIN"].includes(role)) return;
    fetch("/api/admin/staff")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!data) return;
        const members: { staffStatus?: string }[] = data.members || data;
        setPendingCount(members.filter((m) => m.staffStatus === "PENDING").length);
      })
      .catch(() => {});
  }, [role]);

  const visibleItems = allNavItems.filter(i => !i.roles || i.roles.includes(role || ""));

  // Группировка
  const groups: { group: string; groupKey?: TranslationKey; items: NavItem[] }[] = [];
  for (const item of visibleItems) {
    let g = groups.find(g => g.group === item.group);
    if (!g) { g = { group: item.group, groupKey: item.groupKey, items: [] }; groups.push(g); }
    g.items.push(item);
  }

  const toggleGroup = (group: string) => {
    setCollapsed(prev => {
      const s = new Set(prev);
      s.has(group) ? s.delete(group) : s.add(group);
      return s;
    });
  };

  return (
    <nav className="flex-1 p-3 overflow-y-auto">
      {groups.map((g, gi) => {
        const isCollapsible = COLLAPSIBLE_GROUPS.has(g.group);
        const isCollapsed = isCollapsible && collapsed.has(g.group);
        const groupLabel = g.groupKey ? t(g.groupKey) : (GROUP_LABELS[g.group] || "");
        const hasActiveItem = g.items.some(i => i.exact ? pathname === i.href : pathname.startsWith(i.href));

        return (
          <div key={g.group}>
            {/* Group header — separator + label */}
            {g.group !== "main" && groupLabel && (
              <div
                className={`px-3 pt-4 pb-1.5 ${isCollapsible ? "cursor-pointer select-none group/gh" : ""}`}
                onClick={isCollapsible ? () => toggleGroup(g.group) : undefined}
              >
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] font-bold uppercase tracking-[0.18em] whitespace-nowrap transition-colors ${
                    hasActiveItem ? "text-primary/70" : "text-white/35 group-hover/gh:text-white/55"
                  }`}>
                    {groupLabel}
                  </span>
                  <div className="flex-1 aray-nav-divider" />
                  {isCollapsible && (
                    <ChevronDown className={`w-3 h-3 text-white/25 group-hover/gh:text-white/50 transition-all duration-200 ${isCollapsed ? "" : "rotate-180"}`} />
                  )}
                </div>
                {/* Превью пунктов когда свёрнуто */}
                {isCollapsible && isCollapsed && (
                  <p className="text-[10px] text-white/28 mt-1 leading-relaxed truncate">
                    {g.items.slice(0, 4).map(i => i.labelKey ? t(i.labelKey) : i.label).join(" · ")}
                    {g.items.length > 4 && ` +${g.items.length - 4}`}
                  </p>
                )}
              </div>
            )}

            {/* Nav items */}
            <div className={`overflow-hidden transition-all duration-250 ${
              isCollapsed ? "max-h-0 opacity-0 pointer-events-none" : "max-h-[1000px] opacity-100"
            }`}>
              {g.items.map((item) => {
                const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={`relative flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 group mb-0.5 overflow-hidden aray-icon-spin ${
                      isActive ? "aray-nav-active text-white" : "text-white/60 hover:text-white aray-nav-hover"
                    }`}
                  >
                    <item.icon className={`w-4 h-4 shrink-0 transition-colors duration-200 ${
                      isActive ? "text-primary" : "text-white/45 group-hover:text-primary/80"
                    }`} />
                    <span className="flex-1">{item.labelKey ? t(item.labelKey) : item.label}</span>
                    {item.href === "/admin/staff" && pendingCount > 0 && (
                      <span className="min-w-[20px] h-[20px] px-1 rounded-full bg-amber-400 text-[10px] font-bold text-amber-950 flex items-center justify-center leading-none">
                        {pendingCount > 9 ? "9+" : pendingCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </nav>
  );
}
