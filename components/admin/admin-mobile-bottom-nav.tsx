"use client";

/**
 * AdminMobileBottomNav — единое нижнее меню админки (calm UI, идентично store/MobileBottomNav).
 *
 * Структура (5 пунктов): Главная · Заказы · АРАЙ (центр, приподнят 52px) · Новое (колокольчик) · Аккаунт
 * Стиль: DESIGN_SYSTEM.md — bg-card border-t border-border, без backdrop-blur 32px, без arayglass.
 *
 * Пункты слева адаптируются под роль (warehouse → Товары вместо Заказы и т.д.)
 *
 * Арай в центре:
 *  - Tap                → onArayOpen() (открывает fullscreen чат)
 *  - Long-press 400ms   → "aray:voice" (push-to-talk)
 *
 * Колокольчик: открывает popup с уведомлениями (новые заказы, отзывы, заявки сотрудников).
 * Аккаунт: открывает MobileMenuBottomSheet из admin-shell с навигацией.
 *
 * Скрывается когда клавиатура открыта или открыт меню drawer.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, ShoppingBag, Package, Bell,
  UserCircle, Star, UserPlus, ChevronRight, X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { ArayOrb } from "@/components/shared/aray-orb";
import { playOrderChime } from "@/components/admin/admin-shell";
import { useAccountDrawer } from "@/store/account-drawer";

function haptic(pattern: number | number[] = 6) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try { navigator.vibrate(pattern); } catch {}
  }
}

// ── Левые табы по роли (2 пункта слева от Арая) ──────────────────────────────
const ROLE_TABS: Record<string, { href: string; label: string; icon: LucideIcon; exact?: boolean }[]> = {
  owner: [
    { href: "/admin",         label: "Главная", icon: LayoutDashboard, exact: true },
    { href: "/admin/orders",  label: "Заказы",  icon: ShoppingBag },
  ],
  manager: [
    { href: "/admin",         label: "Главная", icon: LayoutDashboard, exact: true },
    { href: "/admin/orders",  label: "Заказы",  icon: ShoppingBag },
  ],
  courier: [
    { href: "/admin",         label: "Главная", icon: LayoutDashboard, exact: true },
    { href: "/admin/orders",  label: "Заказы",  icon: ShoppingBag },
  ],
  warehouse: [
    { href: "/admin",          label: "Главная", icon: LayoutDashboard, exact: true },
    { href: "/admin/products", label: "Товары",  icon: Package },
  ],
  accountant: [
    { href: "/admin",         label: "Главная", icon: LayoutDashboard, exact: true },
    { href: "/admin/orders",  label: "Заказы",  icon: ShoppingBag },
  ],
  seller: [
    { href: "/admin",         label: "Главная", icon: LayoutDashboard, exact: true },
    { href: "/admin/orders",  label: "Заказы",  icon: ShoppingBag },
  ],
  user: [
    { href: "/cabinet", label: "Главная", icon: LayoutDashboard, exact: true },
    { href: "/catalog", label: "Каталог", icon: Package },
  ],
};

function getRoleGroup(role: string): string {
  if (["SUPER_ADMIN", "ADMIN"].includes(role)) return "owner";
  if (role === "USER") return "user";
  return role.toLowerCase();
}

// ── Универсальный NavItem (как в store mobile-bottom-nav) ─────────────────────
interface NavItemProps {
  icon: LucideIcon;
  label: string;
  isActive: boolean;
  badge?: number;
  onClick?: () => void;
  href?: string;
}

function NavItem({ icon: Icon, label, isActive, badge, onClick, href }: NavItemProps) {
  const content = (
    <motion.div
      whileTap={{ scale: 0.92 }}
      transition={{ type: "spring", stiffness: 500, damping: 18 }}
      className={`relative flex flex-col items-center gap-0.5 min-w-[52px] px-2 py-1.5 ${
        isActive ? "text-primary" : "text-muted-foreground"
      }`}
      style={{ WebkitTapHighlightColor: "transparent" }}
    >
      <div className="relative">
        <Icon
          className="w-[22px] h-[22px]"
          strokeWidth={isActive ? 2.2 : 1.75}
        />
        {badge !== undefined && badge > 0 && (
          <span className="absolute -top-1.5 -right-2 bg-primary text-primary-foreground text-[10px] min-w-[18px] h-[18px] px-1 rounded-full inline-flex items-center justify-center font-semibold leading-none">
            {badge > 9 ? "9+" : badge}
          </span>
        )}
      </div>
      <span className={`text-[10px] leading-none ${isActive ? "font-semibold" : "font-medium"}`}>
        {label}
      </span>
    </motion.div>
  );

  const tapHandler = () => { haptic(); onClick?.(); };

  if (href) {
    return <Link href={href} onClick={tapHandler} aria-label={label}>{content}</Link>;
  }
  return (
    <button onClick={tapHandler} aria-label={label} type="button">
      {content}
    </button>
  );
}

// ── Основной компонент ────────────────────────────────────────────────────────
interface Props {
  role: string;
  /** @deprecated теперь используется единый AccountDrawer через useAccountDrawer().toggle() */
  onMenuOpen?: () => void;
  /** @deprecated теперь menuOpen приходит из useAccountDrawer().open */
  menuOpen?: boolean;
  newOrdersCount?: number;
  onArayOpen?: () => void;
  arayListening?: boolean;
  arayHasNew?: boolean;
}

interface NotifOrder { id: string; orderNumber: number; customerName?: string; customerPhone?: string; totalAmount?: number }
interface NotifReview { id: string; name?: string; rating?: number; text?: string }
interface NotifStaff { id: string; name?: string; email?: string }

export function AdminMobileBottomNav({
  role, newOrdersCount = 0,
  onArayOpen, arayListening,
}: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const group = getRoleGroup(role);
  const tabs = ROLE_TABS[group] ?? ROLE_TABS.owner;
  const isClient = role === "USER";
  const [kbOpen, setKbOpen] = useState(false);

  // Единый AccountDrawer (тот же что в магазине)
  const { open: accountOpen, toggle: toggleAccount } = useAccountDrawer();

  // Long-press на Арая (tap = чат, long-press = голос)
  const arayLongPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const arayLongPressFiredRef = useRef(false);
  const [arayVoiceActive, setArayVoiceActive] = useState(false);

  // Notification state
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const [orders, setOrders] = useState<NotifOrder[]>([]);
  const [reviews, setReviews] = useState<NotifReview[]>([]);
  const [pendingStaff, setPendingStaff] = useState<NotifStaff[]>([]);
  const [loadingNotif, setLoadingNotif] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef<number | null>(null);

  // Скрываем при открытой клавиатуре
  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) return;
    const vv = window.visualViewport;
    const onResize = () => setKbOpen(window.innerHeight - vv.height > 100);
    vv.addEventListener("resize", onResize);
    return () => vv.removeEventListener("resize", onResize);
  }, []);

  // Polling уведомлений (60s — для экономии батареи; chime при увеличении)
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

  // Закрыть popup при клике снаружи
  useEffect(() => {
    if (!notifOpen) return;
    const close = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [notifOpen]);

  // Закрытие popup на Escape
  useEffect(() => {
    if (!notifOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setNotifOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [notifOpen]);

  // Уведомления не должны зависать поверх нового маршрута, аккаунта или клавиатуры.
  useEffect(() => {
    setNotifOpen(false);
  }, [pathname, accountOpen, kbOpen]);

  const openNotifications = useCallback(async () => {
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
    } catch {}
    finally { setLoadingNotif(false); }
  }, []);

  const isActive = (path: string, exact?: boolean) =>
    exact ? pathname === path : pathname === path || pathname.startsWith(path);

  // Cleanup
  useEffect(() => () => {
    if (arayLongPressRef.current) clearTimeout(arayLongPressRef.current);
  }, []);

  return (
    <>
      {/* ── Notification popup (calm UI) ── */}
      {notifOpen && (
        <div
          ref={notifRef}
          className="lg:hidden fixed z-[60] bg-card border border-border rounded-2xl overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-200 shadow-2xl"
          style={{
            bottom: "calc(78px + env(safe-area-inset-bottom, 0px))",
            left: 12,
            right: 12,
            maxHeight: "60vh",
          }}
          role="dialog"
          aria-label="Уведомления"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary" strokeWidth={2} />
              <span className="text-sm font-semibold text-foreground">Уведомления</span>
              {notifCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-primary text-primary-foreground">
                  {notifCount}
                </span>
              )}
            </div>
            <button
              onClick={() => setNotifOpen(false)}
              className="w-8 h-8 rounded-full border border-border hover:bg-muted/40 flex items-center justify-center transition-colors"
              aria-label="Закрыть"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* Content */}
          <div className="overflow-y-auto" style={{ maxHeight: "calc(60vh - 100px)" }}>
            {loadingNotif ? (
              <div className="flex justify-center py-8">
                <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              </div>
            ) : orders.length === 0 && reviews.length === 0 && pendingStaff.length === 0 ? (
              <div className="text-center py-10">
                <Bell className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" strokeWidth={1.5} />
                <p className="text-xs text-muted-foreground">Нет новых уведомлений</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {orders.map((o) => (
                  <button
                    key={`o-${o.id}`}
                    onClick={() => { router.push("/admin/orders"); setNotifOpen(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors text-left active:scale-[0.98]"
                  >
                    <ShoppingBag className="w-6 h-6 text-primary shrink-0" strokeWidth={1.75} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        #{o.orderNumber} · {o.customerName || o.customerPhone || "Клиент"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {Number(o.totalAmount || 0).toLocaleString("ru-RU")} ₽
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  </button>
                ))}
                {reviews.map((r) => (
                  <button
                    key={`r-${r.id}`}
                    onClick={() => { router.push("/admin/reviews"); setNotifOpen(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors text-left active:scale-[0.98]"
                  >
                    <Star className="w-6 h-6 text-amber-500 shrink-0" strokeWidth={1.75} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {r.name || "Отзыв"} {r.rating ? `· ${"★".repeat(r.rating)}` : ""}
                      </p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {r.text?.slice(0, 50) || "Новый отзыв"}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  </button>
                ))}
                {pendingStaff.map((s) => (
                  <button
                    key={`s-${s.id}`}
                    onClick={() => { router.push("/admin/staff"); setNotifOpen(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors text-left active:scale-[0.98]"
                  >
                    <UserPlus className="w-6 h-6 text-primary shrink-0" strokeWidth={1.75} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {s.name || s.email || "Заявка"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">Ожидает одобрения</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {(orders.length > 0 || reviews.length > 0 || pendingStaff.length > 0) && (
            <div className="px-3 py-2 border-t border-border">
              <button
                onClick={() => { router.push("/admin/orders?status=NEW"); setNotifOpen(false); }}
                className="w-full text-center text-xs font-semibold text-primary py-2.5 rounded-xl hover:bg-primary/5 transition-colors"
              >
                Все новые заказы →
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Bottom dock (calm UI + Liquid Glass, идентично магазину) ── */}
      <nav
        className="fixed left-0 right-0 z-50 lg:hidden transition-all duration-300"
        style={{
          bottom: (accountOpen || kbOpen) ? "-120px" : "0",
          opacity: (accountOpen || kbOpen) ? 0 : 1,
          pointerEvents: (accountOpen || kbOpen) ? "none" : "auto",
          // Liquid Glass — единый стиль с Header магазина и MobileBottomNav
          background: "hsl(var(--background) / 0.85)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          borderTop: "1px solid hsl(var(--primary) / 0.12)",
          boxShadow: "0 -4px 20px hsl(var(--foreground) / 0.06)",
        }}
        aria-label="Нижняя навигация админки"
      >
        {/* Palette glow line — тонкая primary полоса сверху */}
        <div
          className="absolute inset-x-0 top-0 h-px pointer-events-none"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, hsl(var(--primary)/0.4) 30%, hsl(var(--primary)/0.6) 50%, hsl(var(--primary)/0.4) 70%, transparent 100%)",
          }}
        />

        <div
          className="flex items-end justify-around px-1 pt-1 relative"
          style={{ paddingBottom: "max(10px, env(safe-area-inset-bottom, 10px))" }}
        >
          {/* Левые табы (по роли) */}
          <div className="flex items-center justify-around flex-1 pt-1">
            {tabs.map((tab) => (
              <NavItem
                key={tab.href}
                icon={tab.icon}
                label={tab.label}
                href={tab.href}
                isActive={isActive(tab.href, tab.exact)}
                badge={tab.href === "/admin/orders" ? newOrdersCount : undefined}
              />
            ))}
          </div>

          {/* Центр: Арай (приподнят -18px) */}
          <div
            className="flex flex-col items-center"
            style={{ marginTop: "-18px", minWidth: "72px" }}
          >
            <button
              type="button"
              aria-label="Арай — нажми для чата, удерживай для голоса"
              onPointerDown={() => {
                arayLongPressFiredRef.current = false;
                if (arayLongPressRef.current) clearTimeout(arayLongPressRef.current);
                arayLongPressRef.current = setTimeout(() => {
                  arayLongPressFiredRef.current = true;
                  setArayVoiceActive(true);
                  haptic([12, 40, 12]);
                  try { window.dispatchEvent(new CustomEvent("aray:voice")); } catch {}
                }, 400);
              }}
              onPointerUp={() => {
                if (arayLongPressRef.current) {
                  clearTimeout(arayLongPressRef.current);
                  arayLongPressRef.current = null;
                }
                if (arayLongPressFiredRef.current) {
                  try { window.dispatchEvent(new CustomEvent("aray:voice:release")); } catch {}
                  setArayVoiceActive(false);
                  return;
                }
                haptic(8);
                onArayOpen?.();
              }}
              onPointerCancel={() => {
                if (arayLongPressRef.current) {
                  clearTimeout(arayLongPressRef.current);
                  arayLongPressRef.current = null;
                }
                arayLongPressFiredRef.current = false;
                setArayVoiceActive(false);
              }}
              onContextMenu={(e) => e.preventDefault()}
              className="flex flex-col items-center transition-transform duration-150 active:scale-[0.92] focus:outline-none"
              style={{ WebkitTapHighlightColor: "transparent", touchAction: "manipulation" }}
            >
              <ArayOrb
                size={52}
                id="adm-nav"
                pulse={arayVoiceActive ? "listening" : arayListening ? "listening" : "idle"}
                badgeCount={notifCount > 0 ? notifCount : undefined}
              />
              <span
                className={`text-[10px] font-semibold mt-0.5 tracking-wide ${
                  arayVoiceActive ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {arayVoiceActive ? "Слушаю…" : "Арай"}
              </span>
            </button>
          </div>

          {/* Правые: Новое (колокольчик) + Аккаунт (кроме клиента — клиент не видит колокольчик) */}
          <div className="flex items-center justify-around flex-1 pt-1">
            {!isClient && (
              <NavItem
                icon={Bell}
                label="Новое"
                onClick={() => (notifOpen ? setNotifOpen(false) : openNotifications())}
                isActive={notifOpen}
                badge={notifCount}
              />
            )}
            <NavItem
              icon={UserCircle}
              label="Аккаунт"
              onClick={toggleAccount}
              isActive={accountOpen}
            />
          </div>
        </div>
      </nav>
    </>
  );
}
