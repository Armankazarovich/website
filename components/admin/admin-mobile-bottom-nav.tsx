"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, ShoppingBag, Package, MoreHorizontal,
  Truck, CheckSquare, Warehouse, Wallet, Target, UserCircle,
} from "lucide-react";
import { ArayOrb } from "@/components/shared/aray-orb";

// ── Нижние табы по роли: 2 слева от Арая + 1 справа + Ещё ──────────────────
// Стандарт: 4 таба + центральный элемент (как Instagram/Telegram 2026)
const ROLE_TABS: Record<string, { href: string; label: string; icon: React.ElementType; exact?: boolean }[]> = {
  owner: [
    { href: "/admin",          label: "Главная", icon: LayoutDashboard, exact: true },
    { href: "/admin/orders",   label: "Заказы",  icon: ShoppingBag },
    { href: "/admin/crm",      label: "CRM",     icon: Target },
  ],
  manager: [
    { href: "/admin",          label: "Главная", icon: LayoutDashboard, exact: true },
    { href: "/admin/orders",   label: "Заказы",  icon: ShoppingBag },
    { href: "/admin/crm",      label: "CRM",     icon: Target },
  ],
  courier: [
    { href: "/admin",          label: "Главная", icon: LayoutDashboard, exact: true },
    { href: "/admin/orders",   label: "Заказы",  icon: ShoppingBag },
    { href: "/admin/delivery", label: "Маршрут", icon: Truck },
  ],
  warehouse: [
    { href: "/admin",           label: "Главная", icon: LayoutDashboard, exact: true },
    { href: "/admin/products",  label: "Товары",  icon: Package },
    { href: "/admin/inventory", label: "Склад",   icon: Warehouse },
  ],
  accountant: [
    { href: "/admin",          label: "Главная",  icon: LayoutDashboard, exact: true },
    { href: "/admin/orders",   label: "Заказы",   icon: ShoppingBag },
    { href: "/admin/finance",  label: "Финансы",  icon: Wallet },
  ],
  seller: [
    { href: "/admin",          label: "Главная", icon: LayoutDashboard, exact: true },
    { href: "/admin/orders",   label: "Заказы",  icon: ShoppingBag },
    { href: "/admin/products", label: "Товары",  icon: Package },
  ],
  user: [
    { href: "/cabinet",  label: "Главная",  icon: LayoutDashboard, exact: true },
    { href: "/catalog",  label: "Каталог",  icon: Package },
    { href: "/cabinet/profile", label: "Профиль", icon: UserCircle },
  ],
};

function getRoleGroup(role: string): string {
  if (["SUPER_ADMIN", "ADMIN"].includes(role)) return "owner";
  if (role === "USER") return "user";
  return role.toLowerCase();
}

// ── Основной компонент ────────────────────────────────────────────────────────
interface Props {
  role: string;
  onMenuOpen: () => void;
  menuOpen: boolean;
  newOrdersCount?: number;
  onArayOpen?: () => void;
  arayListening?: boolean;
  arayHasNew?: boolean;
  onSettingsOpen?: () => void;
}

export function AdminMobileBottomNav({
  role, onMenuOpen, menuOpen, newOrdersCount = 0,
  onArayOpen, arayListening, arayHasNew, onSettingsOpen,
}: Props) {
  const pathname = usePathname();
  const group = getRoleGroup(role);
  const tabs = ROLE_TABS[group] ?? ROLE_TABS.owner;
  const [kbOpen, setKbOpen] = useState(false);

  // Скрываем нав когда клавиатура открыта
  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) return;
    const vv = window.visualViewport;
    const onResize = () => {
      const diff = window.innerHeight - vv.height;
      setKbOpen(diff > 100);
    };
    vv.addEventListener("resize", onResize);
    return () => vv.removeEventListener("resize", onResize);
  }, []);

  // Разделяем табы: 2 слева от шара, остальные справа
  const leftTabs = tabs.slice(0, 2);
  const rightTabs = tabs.slice(2);

  return (
    <>
      {/* Bottom dock — hides when Sheet drawer is open */}
      <nav
        className="lg:hidden fixed z-50 transition-all duration-300"
        style={{
          bottom: (menuOpen || kbOpen) ? "-120px" : "max(8px, env(safe-area-inset-bottom, 8px))",
          left: 8,
          right: 8,
          opacity: (menuOpen || kbOpen) ? 0 : 1,
          pointerEvents: (menuOpen || kbOpen) ? "none" : "auto",
        }}
      >
        <div
          className="flex items-stretch rounded-[28px] overflow-visible relative"
          style={{
            background: "var(--admin-dock-bg)",
            backdropFilter: "var(--admin-popup-blur)",
            WebkitBackdropFilter: "var(--admin-popup-blur)",
            border: `1px solid var(--admin-dock-border)`,
            boxShadow: "var(--admin-popup-shadow)",
          }}
        >
          {/* ── Левые табы ── */}
          {leftTabs.map((tab, i) => (
            <DockTab key={i} tab={tab} pathname={pathname} badge={tab.href === "/admin/orders" ? newOrdersCount : 0} />
          ))}

          {/* ── Центральный слот — Арай ── */}
          <div className="relative flex flex-col items-center justify-center" style={{ width: 72, minWidth: 72 }}>
            <button
              onClick={onArayOpen}
              className="absolute flex flex-col items-center justify-center focus:outline-none transition-transform duration-150 active:scale-[0.88]"
              style={{ top: -14, WebkitTapHighlightColor: "transparent" }}
            >
              <ArayOrb size={52} id="adm" pulse={arayListening ? "listening" : "idle"} badge={arayHasNew} />
              <span className="text-[9px] font-semibold mt-0.5 tracking-wide"
                style={{ color: "hsl(var(--muted-foreground))" }}>Арай</span>
            </button>
          </div>

          {/* ── Правые табы ── */}
          {rightTabs.map((tab, i) => (
            <DockTab key={`r${i}`} tab={tab} pathname={pathname} badge={tab.href === "/admin/orders" ? newOrdersCount : 0} />
          ))}

          {/* Кнопка Меню → открывает боковой drawer */}
          <button
            onClick={onMenuOpen}
            className="flex-1 focus:outline-none"
            style={{ WebkitTapHighlightColor: "transparent" }}
          >
            <div className="flex flex-col items-center justify-center py-3 px-1.5 min-w-0 relative transition-all duration-300 active:scale-90 select-none">
              <MoreHorizontal
                className="transition-all duration-300"
                style={{
                  width: menuOpen ? 22 : 20,
                  height: menuOpen ? 22 : 20,
                  color: menuOpen ? "hsl(var(--primary))" : "var(--admin-dock-text)",
                }}
              />
              <span className="text-[9px] font-semibold leading-none mt-1.5 transition-all duration-300"
                style={{ color: menuOpen ? "hsl(var(--primary))" : "var(--admin-dock-text)" }}>
                Ещё
              </span>
              {menuOpen && (
                <span className="absolute -bottom-0.5 w-1 h-1 rounded-full" style={{ background: "hsl(var(--primary))" }} />
              )}
            </div>
          </button>
        </div>
      </nav>
    </>
  );
}

// ── Компонент таба ──────────────────────────────────────────────────────────
function DockTab({ tab, pathname, badge = 0 }: {
  tab: { href: string; label: string; icon: React.ElementType; exact?: boolean };
  pathname: string;
  badge?: number;
}) {
  const isActive = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
  return (
    <Link href={tab.href} className="flex-1" style={{ WebkitTapHighlightColor: "transparent" }}>
      <div
        className="flex flex-col items-center justify-center py-3 px-1.5 min-w-0 relative transition-all duration-200 active:scale-90 select-none"
        style={{ WebkitTapHighlightColor: "transparent" }}
      >
        <div className="relative">
          <tab.icon
            className="transition-all duration-300"
            style={{
              width: isActive ? 22 : 20,
              height: isActive ? 22 : 20,
              color: isActive ? "hsl(var(--primary))" : "var(--admin-dock-text)",
            }}
          />
          {badge > 0 && (
            <span className="absolute -top-1 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold text-white flex items-center justify-center leading-none bg-destructive shadow-sm shadow-destructive/50">
              {badge > 9 ? "9+" : badge}
            </span>
          )}
        </div>
        <span className="text-[9px] font-semibold leading-none mt-1.5 transition-all duration-300"
          style={{
            color: isActive ? "hsl(var(--primary))" : "var(--admin-dock-text)",
            letterSpacing: "0.01em",
          }}>
          {tab.label}
        </span>
        {/* Точка-индикатор под активным табом */}
        {isActive && (
          <span className="absolute -bottom-0.5 w-1 h-1 rounded-full" style={{ background: "hsl(var(--primary))" }} />
        )}
      </div>
    </Link>
  );
}
