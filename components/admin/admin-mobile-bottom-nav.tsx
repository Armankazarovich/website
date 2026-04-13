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

          {/* ── Центральный слот — Арай (3D сфера, идентичная store) ── */}
          <div className="relative flex items-center justify-center" style={{ width: 72, minWidth: 72 }}>
            <button
              onClick={onArayOpen}
              className="absolute flex items-center justify-center focus:outline-none"
              style={{
                width: 52,
                height: 52,
                top: -14,
                WebkitTapHighlightColor: "transparent",
              }}
            >
              {/* Пульс-ореол */}
              <span
                className="absolute inset-0 rounded-full animate-ping"
                style={{
                  background: "rgba(232,112,10,0.25)",
                  animationDuration: arayListening ? "0.7s" : "3s",
                }}
              />
              {/* 3D SVG сфера — идентична store mobile-bottom-nav */}
              <svg
                width="52" height="52" viewBox="0 0 100 100"
                style={{
                  display: "block",
                  filter: "drop-shadow(0 3px 10px rgba(200,80,0,0.55)) drop-shadow(0 0 6px rgba(232,112,10,0.35))",
                }}
              >
                <defs>
                  <radialGradient id="adm-base" cx="34%" cy="28%" r="70%">
                    <stop offset="0%"   stopColor="#fffbe0"/>
                    <stop offset="10%"  stopColor="#ffca40"/>
                    <stop offset="28%"  stopColor="#f07800"/>
                    <stop offset="52%"  stopColor="#c05000"/>
                    <stop offset="75%"  stopColor="#6e1c00"/>
                    <stop offset="100%" stopColor="#160300"/>
                  </radialGradient>
                  <radialGradient id="adm-dark" cx="72%" cy="74%" r="52%">
                    <stop offset="0%"   stopColor="#050000" stopOpacity="0.82"/>
                    <stop offset="60%"  stopColor="#100200" stopOpacity="0.32"/>
                    <stop offset="100%" stopColor="#050000" stopOpacity="0"/>
                  </radialGradient>
                  <radialGradient id="adm-rim" cx="50%" cy="50%" r="50%">
                    <stop offset="76%"  stopColor="transparent" stopOpacity="0"/>
                    <stop offset="90%"  stopColor="#ff9500"  stopOpacity="0.45"/>
                    <stop offset="100%" stopColor="#ffcc00" stopOpacity="0.70"/>
                  </radialGradient>
                  <radialGradient id="adm-hl" cx="30%" cy="25%" r="34%">
                    <stop offset="0%"   stopColor="white" stopOpacity="0.85"/>
                    <stop offset="50%"  stopColor="white" stopOpacity="0.25"/>
                    <stop offset="100%" stopColor="white" stopOpacity="0"/>
                  </radialGradient>
                  <radialGradient id="adm-orbit-hl" cx="50%" cy="50%" r="50%">
                    <stop offset="0%"   stopColor="white" stopOpacity="0.55"/>
                    <stop offset="60%"  stopColor="white" stopOpacity="0.12"/>
                    <stop offset="100%" stopColor="white" stopOpacity="0"/>
                  </radialGradient>
                  <clipPath id="adm-clip">
                    <circle cx="50" cy="50" r="46"/>
                  </clipPath>
                </defs>
                {/* Базовый шар */}
                <circle cx="50" cy="50" r="46" fill="url(#adm-base)"/>
                <circle cx="50" cy="50" r="46" fill="url(#adm-dark)"/>
                <circle cx="50" cy="50" r="46" fill="url(#adm-rim)"/>
                {/* Вращающаяся группа */}
                <g clipPath="url(#adm-clip)">
                  <ellipse cx="50" cy="50" rx="28" ry="10" fill="url(#adm-orbit-hl)" opacity="0.55">
                    <animateTransform attributeName="transform" type="rotate" from="0 50 50" to="360 50 50" dur="9s" repeatCount="indefinite"/>
                  </ellipse>
                  <ellipse cx="72" cy="38" rx="5" ry="3" fill="white" opacity="0.28" transform="rotate(-20 72 38)">
                    <animateTransform attributeName="transform" type="rotate" from="0 50 50" to="360 50 50" dur="9s" repeatCount="indefinite" additive="sum"/>
                  </ellipse>
                </g>
                {/* Неподвижный главный блик */}
                <circle cx="50" cy="50" r="46" fill="url(#adm-hl)"/>
                <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(255,210,80,0.20)" strokeWidth="1"/>
                {/* Пульсирующий ореол ободка */}
                <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(255,160,30,0.30)" strokeWidth="2.5">
                  <animate attributeName="stroke-opacity" values="0.30;0.60;0.30" dur="3s" repeatCount="indefinite"/>
                </circle>
              </svg>
              {/* Badge для непрочитанных */}
              {arayHasNew && (
                <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full"
                  style={{ background: "#ef4444", boxShadow: "0 0 6px rgba(239,68,68,0.7)", border: "2px solid var(--admin-dock-bg)" }} />
              )}
            </button>
            {/* Подпись */}
            <span className="absolute text-[9px] font-bold tracking-wider uppercase z-10"
              style={{
                bottom: 5,
                color: "rgba(251,163,30,0.75)",
              }}>
              АРАЙ
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
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              