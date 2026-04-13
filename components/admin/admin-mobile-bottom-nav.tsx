"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, ShoppingBag, Package, MoreHorizontal,
  Truck, CheckSquare, Warehouse, Wallet, Target,
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

function getRoleGroup(role: string): string {
  if (["SUPER_ADMIN", "ADMIN"].includes(role)) return "owner";
  return role.toLowerCase();
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
      {/* Bottom dock — hides when Sheet drawer is open */}
      <nav
        className="lg:hidden fixed z-50 transition-all duration-300"
        style={{
          bottom: menuOpen ? "-100px" : "max(12px, env(safe-area-inset-bottom, 12px))",
          left: 12,
          right: 12,
          opacity: menuOpen ? 0 : 1,
          pointerEvents: menuOpen ? "none" : "auto",
        }}
      >
        <div
          className="flex items-stretch rounded-[26px] overflow-hidden"
          style={{
            background: "var(--admin-dock-bg)",
            backdropFilter: "var(--admin-popup-blur)",
            WebkitBackdropFilter: "var(--admin-popup-blur)",
            border: `1px solid var(--admin-dock-border)`,
            boxShadow: "var(--admin-popup-shadow)",
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
                        color: isActive ? "var(--admin-dock-text-active)" : "var(--admin-dock-text)",
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
                    style={{ color: isActive ? "var(--admin-dock-text-active)" : "var(--admin-dock-text)", letterSpacing: "0.02em" }}>
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
                style={{ color: menuOpen ? "var(--admin-dock-text-active)" : "var(--admin-dock-text)" }}
              />
              <span className="text-[10px] font-semibold leading-none mt-1.5 z-10"
                style={{ color: menuOpen ? "var(--admin-dock-text-active)" : "var(--admin-dock-text)" }}>
                Меню
              </span>
            </div>
          </button>
        </div>
      </nav>
    </>
  );
}
