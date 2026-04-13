"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, ShoppingBag, Package, MoreHorizontal,
  Truck, CheckSquare, Warehouse, Wallet, Target,
} from "lucide-react";

// ── Нижние табы по роли (по 2 слева и по 1-2 справа от шара) ────────────────
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
  onArayOpen?: () => void;
  arayListening?: boolean;
  arayHasNew?: boolean;
}

export function AdminMobileBottomNav({
  role, onMenuOpen, menuOpen, newOrdersCount = 0,
  onArayOpen, arayListening, arayHasNew,
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
          <div className="relative flex items-center justify-center" style={{ width: 64 }}>
            {/* Сфера Арая, выступает сверху */}
            <button
              onClick={onArayOpen}
              className="absolute flex items-center justify-center focus:outline-none"
              style={{
                width: 52,
                height: 52,
                borderRadius: "50%",
                top: -14,
                background: "radial-gradient(circle at 35% 35%, hsl(var(--primary)), hsl(var(--primary)/0.7))",
                boxShadow: `0 4px 20px hsl(var(--primary)/0.4), 0 0 0 3px var(--admin-dock-bg), inset 0 1px 2px rgba(255,255,255,0.25)`,
                WebkitTapHighlightColor: "transparent",
              }}
            >
              {/* Пульс */}
              <span
                className="absolute inset-0 rounded-full animate-ping"
                style={{
                  background: "hsl(var(--primary)/0.25)",
                  animationDuration: arayListening ? "0.8s" : "3s",
                }}
              />
              {/* Лого/иконка Арая */}
              <svg viewBox="0 0 24 24" className="w-6 h-6 relative z-10" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" fill="white" fillOpacity="0.3" />
                <path d="M12 2v2m0 16v2M2 12h2m16 0h2" />
                <path d="m4.93 4.93 1.41 1.41m11.32 11.32 1.41 1.41M4.93 19.07l1.41-1.41m11.32-11.32 1.41-1.41" opacity="0.5" />
              </svg>
              {/* Badge для непрочитанных */}
              {arayHasNew && (
                <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full"
                  style={{ background: "#ef4444", boxShadow: "0 0 6px rgba(239,68,68,0.7)", border: "2px solid var(--admin-dock-bg)" }} />
              )}
            </button>
            {/* Подпись */}
            <span className="absolute text-[9px] font-bold tracking-wider uppercase z-10"
              style={{
                bottom: 5,
                color: "var(--admin-dock-text)",
                opacity: 0.7,
              }}>
              Арай
            </span>
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
            <div className="flex flex-col items-center justify-center py-3 px-1.5 min-w-0 relative transition-all duration-200 active:scale-90 select-none">
              {menuOpen && (
                <div className="absolute inset-x-1 inset-y-1 rounded-[18px]"
                  style={{ background: "hsl(var(--primary) / 0.20)", boxShadow: "0 0 16px hsl(var(--primary) / 0.30)" }} />
              )}
              <MoreHorizontal
                className="w-[20px] h-[20px] z-10 transition-all duration-200"
                style={{ color: menuOpen ? "var(--admin-dock-text-active)" : "var(--admin-dock-text)" }}
              />
              <span className="text-[9px] font-semibold leading-none mt-1.5 z-10"
                style={{ color: menuOpen ? "var(--admin-dock-text-active)" : "var(--admin-dock-text)" }}>
                Ещё
              </span>
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
        {isActive && (
          <div className="absolute inset-x-1 inset-y-1 rounded-[18px]"
            style={{ background: "hsl(var(--primary) / 0.20)", boxShadow: "0 0 16px hsl(var(--primary) / 0.30)" }} />
        )}
        <div className="relative z-10">
          <tab.icon
            className="w-[20px] h-[20px] transition-all duration-200"
            style={{
              color: isActive ? "var(--admin-dock-text-active)" : "var(--admin-dock-text)",
              filter: isActive ? "drop-shadow(0 0 6px hsl(var(--primary) / 0.6))" : "none",
            }}
          />
          {badge > 0 && (
            <span className="absolute -top-1.5 -right-2 min-w-[14px] h-3.5 px-0.5 rounded-full text-[9px] font-bold text-white flex items-center justify-center leading-none"
              style={{ background: "linear-gradient(135deg, #ef4444, #dc2626)", boxShadow: "0 2px 6px rgba(239,68,68,0.5)" }}>
              {badge > 9 ? "9+" : badge}
            </span>
          )}
        </div>
        <span className="text-[9px] font-semibold leading-none mt-1.5 z-10 transition-all duration-200"
          style={{ color: isActive ? "var(--admin-dock-text-active)" : "var(--admin-dock-text)", letterSpacing: "0.01em" }}>
          {tab.label}
        </span>
      </div>
    </Link>
  );
}
