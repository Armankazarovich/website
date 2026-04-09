"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard, ShoppingBag, Package, Users, MoreHorizontal,
  Truck, CheckSquare, Warehouse, Wallet, Target, X,
  Tag, Images, Megaphone, Star, Mail, TrendingUp,
  BarChart2, Globe, Settings, Palette, Stamp, Bell,
  HelpCircle, FileDown, HeartPulse, LogOut, UserCircle,
} from "lucide-react";

// ── Нижние 4 таба по роли ────────────────────────────────────────────────────
const ROLE_TABS: Record<string, { href: string; label: string; icon: React.ElementType; exact?: boolean }[]> = {
  owner: [
    { href: "/admin",          label: "Дашборд", icon: LayoutDashboard, exact: true },
    { href: "/admin/orders",   label: "Заказы",  icon: ShoppingBag },
    { href: "/admin/products", label: "Товары",  icon: Package },
    { href: "/admin/crm",      label: "CRM",     icon: Target },
  ],
  manager: [
    { href: "/admin",          label: "Дашборд", icon: LayoutDashboard, exact: true },
    { href: "/admin/orders",   label: "Заказы",  icon: ShoppingBag },
    { href: "/admin/tasks",    label: "Задачи",  icon: CheckSquare },
    { href: "/admin/crm",      label: "CRM",     icon: Target },
  ],
  courier: [
    { href: "/admin",          label: "Дашборд", icon: LayoutDashboard, exact: true },
    { href: "/admin/orders",   label: "Заказы",  icon: ShoppingBag },
    { href: "/admin/delivery", label: "Маршрут", icon: Truck },
  ],
  warehouse: [
    { href: "/admin",           label: "Дашборд", icon: LayoutDashboard, exact: true },
    { href: "/admin/products",  label: "Товары",  icon: Package },
    { href: "/admin/inventory", label: "Склад",   icon: Warehouse },
  ],
  accountant: [
    { href: "/admin",          label: "Дашборд",  icon: LayoutDashboard, exact: true },
    { href: "/admin/orders",   label: "Заказы",   icon: ShoppingBag },
    { href: "/admin/finance",  label: "Финансы",  icon: Wallet },
  ],
  seller: [
    { href: "/admin",          label: "Дашборд", icon: LayoutDashboard, exact: true },
    { href: "/admin/orders",   label: "Заказы",  icon: ShoppingBag },
    { href: "/admin/products", label: "Товары",  icon: Package },
  ],
};

// ── Все разделы для попапа "Меню" ────────────────────────────────────────────
type MenuSection = { label: string; items: { href: string; label: string; icon: React.ElementType; roles: string[] }[] };

const MENU_SECTIONS: MenuSection[] = [
  {
    label: "Продажи",
    items: [
      { href: "/admin/orders",   label: "Заказы",    icon: ShoppingBag, roles: ["owner","manager","courier","accountant","warehouse","seller"] },
      { href: "/admin/crm",      label: "CRM — Лиды", icon: Target,     roles: ["owner","manager","seller"] },
      { href: "/admin/tasks",    label: "Задачи",     icon: CheckSquare, roles: ["owner","manager","courier","accountant","warehouse","seller"] },
      { href: "/admin/delivery", label: "Доставка",   icon: Truck,       roles: ["owner","manager","courier"] },
    ],
  },
  {
    label: "Товары",
    items: [
      { href: "/admin/products",   label: "Каталог",        icon: Package,   roles: ["owner","manager","warehouse","seller"] },
      { href: "/admin/categories", label: "Категории",       icon: Tag,       roles: ["owner"] },
      { href: "/admin/inventory",  label: "Склад / Остатки", icon: Warehouse, roles: ["owner","manager","warehouse"] },
      { href: "/admin/import",     label: "Импорт / Экспорт",icon: FileDown,  roles: ["owner","manager","warehouse"] },
      { href: "/admin/media",      label: "Медиабиблиотека", icon: Images,    roles: ["owner","manager"] },
    ],
  },
  {
    label: "Маркетинг",
    items: [
      { href: "/admin/promotions", label: "Акции",         icon: Megaphone,  roles: ["owner","manager"] },
      { href: "/admin/reviews",    label: "Отзывы",         icon: Star,       roles: ["owner","manager"] },
      { href: "/admin/email",      label: "Email рассылка", icon: Mail,       roles: ["owner"] },
      { href: "/admin/promotion",  label: "Продвижение",    icon: TrendingUp, roles: ["owner","manager"] },
    ],
  },
  {
    label: "Финансы и клиенты",
    items: [
      { href: "/admin/finance",  label: "Финансы",  icon: Wallet,      roles: ["owner","accountant"] },
      { href: "/admin/clients",  label: "Клиенты",  icon: UserCircle,  roles: ["owner","manager"] },
      { href: "/admin/analytics",label: "Аналитика",icon: BarChart2,   roles: ["owner","accountant"] },
    ],
  },
  {
    label: "Настройки",
    items: [
      { href: "/admin/health",        label: "Здоровье системы", icon: HeartPulse, roles: ["owner"] },
      { href: "/admin/site",          label: "Сайт",              icon: Globe,     roles: ["owner"] },
      { href: "/admin/settings",      label: "Настройки",         icon: Settings,  roles: ["owner"] },
      { href: "/admin/appearance",    label: "Оформление",        icon: Palette,   roles: ["owner"] },
      { href: "/admin/watermark",     label: "Водяной знак",      icon: Stamp,     roles: ["owner"] },
      { href: "/admin/staff",         label: "Команда",           icon: Users,     roles: ["owner"] },
      { href: "/admin/notifications", label: "Уведомления",       icon: Bell,      roles: ["owner"] },
      { href: "/admin/help",          label: "Помощь",            icon: HelpCircle,roles: ["owner","manager","courier","accountant","warehouse","seller"] },
    ],
  },
];

function getRoleGroup(role: string): string {
  if (["SUPER_ADMIN", "ADMIN"].includes(role)) return "owner";
  return role.toLowerCase();
}

// ── Попап меню ───────────────────────────────────────────────────────────────
function MenuPopup({ role, onClose }: { role: string; onClose: () => void }) {
  const pathname = usePathname();
  const group = getRoleGroup(role);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[55] bg-black/50"
        style={{ backdropFilter: "blur(4px)" }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="fixed left-3 right-3 z-[60] rounded-[28px] overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-300"
        style={{
          bottom: "calc(80px + max(12px, env(safe-area-inset-bottom, 12px)))",
          background: "rgba(10, 10, 12, 0.96)",
          backdropFilter: "blur(40px) saturate(200%)",
          WebkitBackdropFilter: "blur(40px) saturate(200%)",
          border: "1px solid rgba(255,255,255,0.13)",
          boxShadow: "0 -8px 48px rgba(0,0,0,0.6), 0 1px 0 rgba(255,255,255,0.08) inset",
          maxHeight: "72dvh",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/08">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/40">Навигация</p>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-xl bg-white/08 flex items-center justify-center active:scale-90 transition-transform"
            style={{ WebkitTapHighlightColor: "transparent" }}
          >
            <X className="w-3.5 h-3.5 text-white/60" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto overscroll-contain" style={{ maxHeight: "calc(72dvh - 56px)" }}>
          <div className="p-3 space-y-1">
            {MENU_SECTIONS.map((section) => {
              const visibleItems = section.items.filter(item => item.roles.includes(group));
              if (!visibleItems.length) return null;
              return (
                <div key={section.label}>
                  {/* Section label */}
                  <p className="text-[9px] font-bold uppercase tracking-[0.20em] text-white/30 px-3 pt-3 pb-1.5">
                    {section.label}
                  </p>
                  {/* Items grid */}
                  <div className="grid grid-cols-4 gap-1.5">
                    {visibleItems.map((item) => {
                      const isActive = item.href === "/admin"
                        ? pathname === item.href
                        : pathname.startsWith(item.href);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={onClose}
                          className="flex flex-col items-center gap-1.5 py-3 px-1 rounded-2xl transition-all active:scale-90 text-center"
                          style={{
                            background: isActive ? "hsl(var(--primary)/0.22)" : "rgba(255,255,255,0.05)",
                            border: isActive ? "1.5px solid hsl(var(--primary)/0.5)" : "1.5px solid rgba(255,255,255,0.07)",
                            WebkitTapHighlightColor: "transparent",
                          }}
                        >
                          <item.icon
                            className="w-[18px] h-[18px] transition-colors"
                            style={{ color: isActive ? "hsl(var(--primary))" : "rgba(255,255,255,0.55)" }}
                          />
                          <span
                            className="text-[9px] font-semibold leading-tight"
                            style={{ color: isActive ? "hsl(var(--primary))" : "rgba(255,255,255,0.55)" }}
                          >
                            {item.label}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* На сайт */}
            <div className="pt-2 pb-1">
              <Link
                href="/"
                onClick={onClose}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl transition-colors active:scale-95"
                style={{ background: "rgba(255,255,255,0.04)", border: "1.5px solid rgba(255,255,255,0.07)", WebkitTapHighlightColor: "transparent" }}
              >
                <LogOut className="w-4 h-4 text-white/40" />
                <span className="text-sm text-white/55">На сайт</span>
              </Link>
            </div>

            <div style={{ height: "env(safe-area-inset-bottom, 8px)" }} />
          </div>
        </div>
      </div>
    </>
  );
}

// ── Основной компонент ────────────────────────────────────────────────────────
interface Props {
  role: string;
  onMenuOpen: () => void;
  menuOpen: boolean;
  newOrdersCount?: number;
}

export function AdminMobileBottomNav({ role, onMenuOpen, menuOpen, newOrdersCount = 0 }: Props) {
  const pathname = usePathname();
  const group = getRoleGroup(role);
  const tabs = ROLE_TABS[group] ?? ROLE_TABS.owner;

  return (
    <>
      {/* Bottom dock */}
      <nav
        className="lg:hidden fixed z-50"
        style={{
          bottom: "max(12px, env(safe-area-inset-bottom, 12px))",
          left: 12,
          right: 12,
        }}
      >
        <div
          className="flex items-stretch rounded-[26px] overflow-hidden"
          style={{
            background: "rgba(10, 10, 12, 0.62)",
            backdropFilter: "blur(32px) saturate(200%) brightness(0.85)",
            WebkitBackdropFilter: "blur(32px) saturate(200%) brightness(0.85)",
            border: "1px solid rgba(255,255,255,0.13)",
            boxShadow: "0 12px 40px rgba(0,0,0,0.50), 0 1px 0 rgba(255,255,255,0.08) inset",
          }}
        >
          {/* Основные табы */}
          {tabs.map((tab, i) => {
            const isActive = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
            const badgeCount = tab.href === "/admin/orders" ? newOrdersCount : 0;
            return (
              <Link
                key={i}
                href={tab.href}
                className="flex-1"
                style={{ WebkitTapHighlightColor: "transparent" }}
              >
                <div
                  className="flex flex-col items-center justify-center py-3 px-2 min-w-0 relative transition-all duration-200 active:scale-90 select-none"
                  style={{ WebkitTapHighlightColor: "transparent" }}
                >
                  {isActive && (
                    <div className="absolute inset-x-1.5 inset-y-1.5 rounded-[18px]"
                      style={{ background: "hsl(var(--primary) / 0.20)", boxShadow: "0 0 16px hsl(var(--primary) / 0.30)" }} />
                  )}
                  <div className="relative z-10">
                    <tab.icon
                      className="w-[22px] h-[22px] transition-all duration-200"
                      style={{
                        color: isActive ? "hsl(var(--primary))" : "rgba(255,255,255,0.58)",
                        filter: isActive ? "drop-shadow(0 0 6px hsl(var(--primary) / 0.6))" : "none",
                      }}
                    />
                    {badgeCount > 0 && (
                      <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-0.5 rounded-full text-[10px] font-bold text-white flex items-center justify-center leading-none"
                        style={{ background: "linear-gradient(135deg, #ef4444, #dc2626)", boxShadow: "0 2px 6px rgba(239,68,68,0.5)" }}>
                        {badgeCount > 9 ? "9+" : badgeCount}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-semibold leading-none mt-1.5 z-10 transition-all duration-200"
                    style={{ color: isActive ? "hsl(var(--primary))" : "rgba(255,255,255,0.62)", letterSpacing: "0.02em" }}>
                    {tab.label}
                  </span>
                </div>
              </Link>
            );
          })}

          {/* Кнопка Меню → открывает боковой drawer */}
          <button
            onClick={onMenuOpen}
            className="flex-1 focus:outline-none"
            style={{ WebkitTapHighlightColor: "transparent" }}
          >
            <div className="flex flex-col items-center justify-center py-3 px-2 min-w-0 relative transition-all duration-200 active:scale-90 select-none">
              {menuOpen && (
                <div className="absolute inset-x-1.5 inset-y-1.5 rounded-[18px]"
                  style={{ background: "hsl(var(--primary) / 0.20)", boxShadow: "0 0 16px hsl(var(--primary) / 0.30)" }} />
              )}
              <MoreHorizontal
                className="w-[22px] h-[22px] z-10 transition-all duration-200"
                style={{ color: menuOpen ? "hsl(var(--primary))" : "rgba(255,255,255,0.58)" }}
              />
              <span className="text-[10px] font-semibold leading-none mt-1.5 z-10"
                style={{ color: menuOpen ? "hsl(var(--primary))" : "rgba(255,255,255,0.62)" }}>
                Меню
              </span>
            </div>
          </button>
        </div>
      </nav>
    </>
  );
}
