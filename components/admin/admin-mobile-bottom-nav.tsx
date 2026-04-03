"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, ShoppingBag, Package, Users, MoreHorizontal,
  Truck, CheckSquare, Warehouse, Wallet, Target,
} from "lucide-react";

type Tab = {
  href?: string;
  label: string;
  icon: React.ElementType;
  exact?: boolean;
  action?: "menu";
  badge?: number;
};

const ROLE_TABS: Record<string, Tab[]> = {
  owner: [
    { href: "/admin",          label: "Дашборд",  icon: LayoutDashboard, exact: true },
    { href: "/admin/orders",   label: "Заказы",   icon: ShoppingBag },
    { href: "/admin/products", label: "Товары",   icon: Package },
    { href: "/admin/clients",  label: "Клиенты",  icon: Users },
    { label: "Меню",           icon: MoreHorizontal, action: "menu" },
  ],
  manager: [
    { href: "/admin",          label: "Дашборд",  icon: LayoutDashboard, exact: true },
    { href: "/admin/orders",   label: "Заказы",   icon: ShoppingBag },
    { href: "/admin/tasks",    label: "Задачи",   icon: CheckSquare },
    { href: "/admin/crm",      label: "CRM",      icon: Target },
    { label: "Меню",           icon: MoreHorizontal, action: "menu" },
  ],
  courier: [
    { href: "/admin",          label: "Дашборд",  icon: LayoutDashboard, exact: true },
    { href: "/admin/orders",   label: "Заказы",   icon: ShoppingBag },
    { href: "/admin/delivery", label: "Маршрут",  icon: Truck },
    { label: "Меню",           icon: MoreHorizontal, action: "menu" },
  ],
  warehouse: [
    { href: "/admin",           label: "Дашборд", icon: LayoutDashboard, exact: true },
    { href: "/admin/products",  label: "Товары",  icon: Package },
    { href: "/admin/inventory", label: "Склад",   icon: Warehouse },
    { label: "Меню",            icon: MoreHorizontal, action: "menu" },
  ],
  accountant: [
    { href: "/admin",          label: "Дашборд",  icon: LayoutDashboard, exact: true },
    { href: "/admin/orders",   label: "Заказы",   icon: ShoppingBag },
    { href: "/admin/finance",  label: "Финансы",  icon: Wallet },
    { label: "Меню",           icon: MoreHorizontal, action: "menu" },
  ],
  seller: [
    { href: "/admin",          label: "Дашборд",  icon: LayoutDashboard, exact: true },
    { href: "/admin/orders",   label: "Заказы",   icon: ShoppingBag },
    { href: "/admin/products", label: "Товары",   icon: Package },
    { label: "Меню",           icon: MoreHorizontal, action: "menu" },
  ],
};

function getRoleGroup(role: string): string {
  if (["SUPER_ADMIN", "ADMIN"].includes(role)) return "owner";
  return role.toLowerCase();
}

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
    <nav
      className="lg:hidden fixed z-40"
      style={{
        bottom: "max(12px, env(safe-area-inset-bottom, 12px))",
        left: 12,
        right: 12,
      }}
    >
      {/* Floating glass dock */}
      <div
        className="flex items-stretch rounded-[26px] overflow-hidden"
        style={{
          background: "rgba(5, 8, 20, 0.60)",
          backdropFilter: "blur(32px) saturate(200%) brightness(0.85)",
          WebkitBackdropFilter: "blur(32px) saturate(200%) brightness(0.85)",
          border: "1px solid rgba(255,255,255,0.13)",
          boxShadow:
            "0 12px 40px rgba(0,0,0,0.50), 0 1px 0 rgba(255,255,255,0.08) inset, 0 -1px 0 rgba(255,255,255,0.04) inset",
        }}
      >
        {tabs.map((tab, i) => {
          const isMenuTab = tab.action === "menu";
          const isActive = isMenuTab
            ? menuOpen
            : tab.href
              ? tab.exact
                ? pathname === tab.href
                : pathname.startsWith(tab.href)
              : false;

          const badgeCount = tab.href === "/admin/orders" ? newOrdersCount : 0;

          const content = (
            <div
              className="flex-1 flex flex-col items-center justify-center py-3 px-2 min-w-0 relative transition-all duration-200 active:scale-90 select-none"
              style={{ WebkitTapHighlightColor: "transparent" }}
            >
              {/* Active pill glow */}
              {isActive && (
                <div
                  className="absolute inset-x-1.5 inset-y-1.5 rounded-[18px]"
                  style={{
                    background: "hsl(var(--primary) / 0.20)",
                    boxShadow: "0 0 16px hsl(var(--primary) / 0.30)",
                  }}
                />
              )}

              {/* Icon */}
              <div className="relative z-10">
                <tab.icon
                  className="w-[22px] h-[22px] transition-all duration-200"
                  style={{
                    color: isActive ? "hsl(var(--primary))" : "rgba(255,255,255,0.58)",
                    filter: isActive ? "drop-shadow(0 0 6px hsl(var(--primary) / 0.6))" : "none",
                  }}
                />
                {badgeCount > 0 && (
                  <span
                    className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-0.5 rounded-full text-[9px] font-bold text-white flex items-center justify-center leading-none"
                    style={{
                      background: "linear-gradient(135deg, #ef4444, #dc2626)",
                      boxShadow: "0 2px 6px rgba(239,68,68,0.5)",
                    }}
                  >
                    {badgeCount > 9 ? "9+" : badgeCount}
                  </span>
                )}
              </div>

              {/* Label */}
              <span
                className="text-[9px] font-bold leading-none mt-1.5 z-10 transition-all duration-200"
                style={{
                  color: isActive ? "hsl(var(--primary))" : "rgba(255,255,255,0.42)",
                  letterSpacing: "0.02em",
                }}
              >
                {tab.label}
              </span>
            </div>
          );

          if (isMenuTab) {
            return (
              <button
                key={i}
                onClick={onMenuOpen}
                className="flex-1 focus:outline-none"
                style={{ WebkitTapHighlightColor: "transparent" }}
              >
                {content}
              </button>
            );
          }

          return (
            <Link
              key={i}
              href={tab.href!}
              className="flex-1"
              style={{ WebkitTapHighlightColor: "transparent" }}
            >
              {content}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
