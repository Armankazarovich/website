"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, ShoppingBag, Package, Bell,
  Truck, CheckSquare, Warehouse, Wallet, Target, UserCircle,
  Star, UserPlus, ArrowRight, X,
} from "lucide-react";
import { ArayOrb } from "@/components/shared/aray-orb";
import { playOrderChime } from "@/components/admin/admin-shell";

// ── Нижние табы по роли: 2 слева от Арая ─────────────────────────────────────
const ROLE_TABS: Record<string, { href: string; label: string; icon: React.ElementType; exact?: boolean }[]> = {
  owner: [
    { href: "/admin",          label: "Главная", icon: LayoutDashboard, exact: true },
    { href: "/admin/orders",   label: "Заказы",  icon: ShoppingBag },
  ],
  manager: [
    { href: "/admin",          label: "Главная", icon: LayoutDashboard, exact: true },
    { href: "/admin/orders",   label: "Заказы",  icon: ShoppingBag },
  ],
  courier: [
    { href: "/admin",          label: "Главная", icon: LayoutDashboard, exact: true },
    { href: "/admin/orders",   label: "Заказы",  icon: ShoppingBag },
  ],
  warehouse: [
    { href: "/admin",           label: "Главная", icon: LayoutDashboard, exact: true },
    { href: "/admin/products",  label: "Товары",  icon: Package },
  ],
  accountant: [
    { href: "/admin",          label: "Главная",  icon: LayoutDashboard, exact: true },
    { href: "/admin/orders",   label: "Заказы",   icon: ShoppingBag },
  ],
  seller: [
    { href: "/admin",          label: "Главная", icon: LayoutDashboard, exact: true },
    { href: "/admin/orders",   label: "Заказы",  icon: ShoppingBag },
  ],
  user: [
    { href: "/cabinet",  label: "Главная",  icon: LayoutDashboard, exact: true },
    { href: "/catalog",  label: "Каталог",  icon: Package },
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
}

export function AdminMobileBottomNav({
  role, onMenuOpen, menuOpen, newOrdersCount = 0,
  onArayOpen, arayListening, arayHasNew,
}: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const group = getRoleGroup(role);
  const tabs = ROLE_TABS[group] ?? ROLE_TABS.owner;
  const isClient = role === "USER";
  const [kbOpen, setKbOpen] = useState(false);

  // Notification state
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const [orders, setOrders] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [pendingStaff, setPendingStaff] = useState<any[]>([]);
  const [loadingNotif, setLoadingNotif] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef<number | null>(null);

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

  // Single polling source for notifications (60s instead of 30s to save battery)
  useEffect(() => {
    if (isClient) return;
    const fetchCount = async () => {
      try {
        const res = await fetch("/api/admin/notifications/count");
        if (res.ok) {
          const d = await res.json();
          const newOrders = d.newOrders ?? 0;
          if (prevCountRef.current !== null && newOrders > prevCountRef.current) playOrderChime();
          prevCountRef.current = newOrders;
          setNotifCount(d.total ?? 0);
        }
      } catch {}
    };
    fetchCount();
    const t = setInterval(fetchCount, 60000);
    return () => clearInterval(t);
  }, [isClient]);

  // Close notif popup on outside click
  useEffect(() => {
    if (!notifOpen) return;
    const close = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [notifOpen]);

  const openNotifications = async () => {
    setNotifOpen(true);
    setLoadingNotif(true);
    try {
      const [ordersRes, reviewsRes, staffRes] = await Promise.all([
        fetch("/api/admin/orders?status=NEW&limit=5").then(r => r.ok ? r.json() : { orders: [] }).catch(() => ({ orders: [] })),
        fetch("/api/admin/reviews?pending=true&limit=5").then(r => r.ok ? r.json() : []).catch(() => []),
        fetch("/api/admin/staff?status=PENDING&limit=5").then(r => r.ok ? r.json() : []).catch(() => []),
      ]);
      setOrders(ordersRes.orders ?? []);
      setReviews(Array.isArray(reviewsRes) ? reviewsRes : reviewsRes.reviews ?? []);
      setPendingStaff(Array.isArray(staffRes) ? staffRes : staffRes.staff ?? []);
    } catch {} finally { setLoadingNotif(false); }
  };

  return (
    <>
      {/* ── Notification popup ── */}
      {notifOpen && (
        <div ref={notifRef}
          className="lg:hidden fixed z-[60] rounded-2xl overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-200"
          style={{
            bottom: 90,
            left: 12,
            right: 12,
            background: "var(--admin-dock-bg)",
            backdropFilter: "blur(50px) saturate(200%) brightness(1.05)",
            WebkitBackdropFilter: "blur(50px) saturate(200%) brightness(1.05)",
            border: "1px solid var(--admin-dock-border)",
            boxShadow: "0 -8px 32px rgba(0,0,0,0.25), 0 0 1px rgba(255,255,255,0.1)",
            maxHeight: "60vh",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid var(--admin-dock-border)" }}>
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary" />
              <span className="text-sm font-bold" style={{ color: "var(--admin-dock-text)" }}>Уведомления</span>
              {notifCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold text-white" style={{ background: "hsl(var(--primary))" }}>{notifCount}</span>
              )}
            </div>
            <button onClick={() => setNotifOpen(false)} className="p-1.5 rounded-lg transition-colors hover:bg-primary/10">
              <X className="w-4 h-4" style={{ color: "var(--admin-dock-text)" }} />
            </button>
          </div>

          {/* Content */}
          <div className="overflow-y-auto" style={{ maxHeight: "calc(60vh - 52px)" }}>
            {loadingNotif ? (
              <div className="flex justify-center py-8">
                <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              </div>
            ) : orders.length === 0 && reviews.length === 0 && pendingStaff.length === 0 ? (
              <div className="text-center py-8">
                <Bell className="w-7 h-7 mx-auto mb-2" style={{ color: "var(--admin-dock-text)", opacity: 0.3 }} />
                <p className="text-xs" style={{ color: "var(--admin-dock-text)", opacity: 0.5 }}>Нет новых уведомлений</p>
              </div>
            ) : (
              <div className="py-1">
                {orders.map((o: any) => (
                  <button key={`o-${o.id}`} onClick={() => { router.push("/admin/orders"); setNotifOpen(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3 transition-colors text-left active:scale-[0.98]"
                    style={{ WebkitTapHighlightColor: "transparent" }}>
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: "hsl(var(--primary)/0.14)", border: "1px solid hsl(var(--primary)/0.22)" }}>
                      <ShoppingBag className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold truncate" style={{ color: "var(--admin-dock-text)" }}>
                        #{o.orderNumber} · {o.customerName || o.customerPhone || "Клиент"}
                      </p>
                      <p className="text-[10px]" style={{ color: "var(--admin-dock-text)", opacity: 0.5 }}>
                        {Number(o.totalAmount || 0).toLocaleString("ru-RU")} ₽
                      </p>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--admin-dock-text)", opacity: 0.3 }} />
                  </button>
                ))}
                {reviews.map((r: any) => (
                  <button key={`r-${r.id}`} onClick={() => { router.push("/admin/reviews"); setNotifOpen(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3 transition-colors text-left active:scale-[0.98]"
                    style={{ WebkitTapHighlightColor: "transparent" }}>
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: "hsl(45 93% 47% / 0.14)", border: "1px solid hsl(45 93% 47% / 0.22)" }}>
                      <Star className="w-3.5 h-3.5" style={{ color: "hsl(45 93% 47%)" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold truncate" style={{ color: "var(--admin-dock-text)" }}>
                        {r.name || "Отзыв"} · {"★".repeat(r.rating || 5)}
                      </p>
                      <p className="text-[10px] truncate" style={{ color: "var(--admin-dock-text)", opacity: 0.5 }}>
                        {r.text?.slice(0, 50) || "Новый отзыв"}
                      </p>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--admin-dock-text)", opacity: 0.3 }} />
                  </button>
                ))}
                {pendingStaff.map((s: any) => (
                  <button key={`s-${s.id}`} onClick={() => { router.push("/admin/staff"); setNotifOpen(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3 transition-colors text-left active:scale-[0.98]"
                    style={{ WebkitTapHighlightColor: "transparent" }}>
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: "hsl(200 80% 50% / 0.14)", border: "1px solid hsl(200 80% 50% / 0.22)" }}>
                      <UserPlus className="w-3.5 h-3.5" style={{ color: "hsl(200 80% 50%)" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold truncate" style={{ color: "var(--admin-dock-text)" }}>
                        {s.name || s.email || "Заявка"}
                      </p>
                      <p className="text-[10px]" style={{ color: "var(--admin-dock-text)", opacity: 0.5 }}>Ожидает одобрения</p>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--admin-dock-text)", opacity: 0.3 }} />
                  </button>
                ))}
              </div>
            )}
            {/* Footer link */}
            <div className="px-3 py-2" style={{ borderTop: "1px solid var(--admin-dock-border)" }}>
              <button onClick={() => { router.push("/admin/orders?status=NEW"); setNotifOpen(false); }}
                className="w-full text-center text-[12px] font-semibold py-2.5 rounded-xl transition-colors active:scale-[0.97]"
                style={{ color: "hsl(var(--primary))" }}>
                Все новые заказы →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom dock */}
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
          {tabs.map((tab, i) => (
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
              <span className="text-[10px] font-semibold mt-0.5 tracking-wide"
                style={{ color: "hsl(var(--muted-foreground))" }}>Арай</span>
            </button>
          </div>

          {/* ── Колокольчик (staff only) ── */}
          {!isClient && (
            <button
              onClick={() => notifOpen ? setNotifOpen(false) : openNotifications()}
              className="flex-1 focus:outline-none"
              style={{ WebkitTapHighlightColor: "transparent" }}
            >
              <div className="flex flex-col items-center justify-center py-3 px-1.5 min-w-0 relative transition-all duration-200 active:scale-90 select-none">
                <div className="relative">
                  <Bell
                    className="transition-all duration-300"
                    style={{
                      width: notifOpen ? 22 : 20,
                      height: notifOpen ? 22 : 20,
                      color: notifOpen ? "hsl(var(--primary))" : notifCount > 0 ? "hsl(var(--primary))" : "var(--admin-dock-text)",
                    }}
                  />
                  {notifCount > 0 && (
                    <span className="absolute -top-1 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold text-white flex items-center justify-center leading-none bg-destructive shadow-sm shadow-destructive/50">
                      {notifCount > 9 ? "9+" : notifCount}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-semibold leading-none mt-1.5 transition-all duration-300"
                  style={{ color: notifOpen ? "hsl(var(--primary))" : "var(--admin-dock-text)" }}>
                  Новое
                </span>
                {notifOpen && (
                  <span className="absolute -bottom-0.5 w-4 h-1 rounded-full" style={{ background: "hsl(var(--primary))", opacity: 0.7 }} />
                )}
              </div>
            </button>
          )}

          {/* Кнопка Аккаунт → открывает bottom sheet */}
          <button
            onClick={onMenuOpen}
            className="flex-1 focus:outline-none"
            style={{ WebkitTapHighlightColor: "transparent" }}
          >
            <div className="flex flex-col items-center justify-center py-3 px-1.5 min-w-0 relative transition-all duration-300 active:scale-90 select-none">
              <UserCircle
                className="transition-all duration-300"
                style={{
                  width: menuOpen ? 22 : 20,
                  height: menuOpen ? 22 : 20,
                  color: menuOpen ? "hsl(var(--primary))" : "var(--admin-dock-text)",
                }}
              />
              <span className="text-[10px] font-semibold leading-none mt-1.5 transition-all duration-300"
                style={{ color: menuOpen ? "hsl(var(--primary))" : "var(--admin-dock-text)" }}>
                Аккаунт
              </span>
              {menuOpen && (
                <span className="absolute -bottom-0.5 w-4 h-1 rounded-full" style={{ background: "hsl(var(--primary))", opacity: 0.7 }} />
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
        <span className="text-[10px] font-semibold leading-none mt-1.5 transition-all duration-300"
          style={{
            color: isActive ? "hsl(var(--primary))" : "var(--admin-dock-text)",
            letterSpacing: "0.01em",
          }}>
          {tab.label}
        </span>
        {isActive && (
          <span className="absolute -bottom-0.5 w-4 h-1 rounded-full" style={{ background: "hsl(var(--primary))", opacity: 0.7 }} />
        )}
      </div>
    </Link>
  );
}
