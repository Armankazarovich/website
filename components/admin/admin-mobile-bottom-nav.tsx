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
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 aray-sidebar"
      style={{
        borderTop: "1px solid rgba(255,255,255,0.08)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
      }}
    >
      <div className="flex items-stretch">
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
            <div className="flex-1 flex flex-col items-center justify-center py-2 min-w-0 transition-all duration-200 active:scale-90">
              {/* Pill-highlight на активной вкладке — iOS стиль */}
              <div
                className="relative flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-2xl transition-all duration-200"
                style={isActive ? {
                  background: "hsl(var(--primary) / 0.18)",
                  boxShadow: "0 0 12px hsl(var(--primary) / 0.25)",
                } : {}}
              >
                <div className="relative">
                  <tab.icon
                    className="w-[22px] h-[22px] transition-all duration-200"
                    style={{ color: isActive ? "hsl(var(--primary))" : "rgba(255,255,255,0.65)" }}
                  />
                  {badgeCount > 0 && (
                    <span className="absolute -top-1.5 -right-2 min-w-[16px] h-[16px] px-0.5 rounded-full bg-red-500 text-[9px] font-bold text-white flex items-center justify-center leading-none shadow-sm">
                      {badgeCount > 9 ? "9+" : badgeCount}
                    </span>
                  )}
                </div>
                <span
                  className="text-[9px] font-bold leading-none truncate max-w-full transition-all duration-200"
                  style={{ color: isActive ? "hsl(var(--primary))" : "rgba(255,255,255,0.55)" }}
                >
                  {tab.label}
                </span>
              </div>
            </div>
          );

          if (isMenuTab) {
            return (
              <button key={i} onClick={onMenuOpen} className="flex-1 focus:outline-none">
                {content}
              </button>
            );
          }

          return (
            <Link key={i} href={tab.href!} className="flex-1">
              {content}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
