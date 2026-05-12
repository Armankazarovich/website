"use client";

/**
 * AdminMobileBottomNav — единое нижнее меню админки (calm UI, идентично store/MobileBottomNav).
 *
 * Структура (5 пунктов): Рабочий стол · Терминал/Бизнес · АРАЙ (центр, приподнят 52px) · Новое/Аккаунт · Меню
 * Стиль: DESIGN_SYSTEM.md — стеклянный dock с blur/saturate, мягкий primary-свет, без отдельного ARAY input dock на мобилке.
 *
 * Пункты слева адаптируются под роль (warehouse → Товары вместо Заказы и т.д.)
 *
 * ARAY в центре:
 *  - Tap        → onArayOpen() (открывает единый чат)
 *  - Long-press → aray:voice (открывает единый чат сразу в голосовом режиме)
 *
 * Колокольчик: открывает popup с уведомлениями (новые заказы, отзывы, заявки сотрудников).
 * Меню: открывает карту админки с группами по функциям.
 *
 * Скрывается когда клавиатура открыта или открыт меню drawer.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Bell,
  Search,
  AlertTriangle,
  ClipboardList,
  UserCircle,
  Star,
  UserPlus,
  ChevronRight,
  X,
  BookOpen,
  Megaphone,
  Settings,
  HelpCircle,
  Wallet,
} from "lucide-react";
import { motion } from "framer-motion";
import { ArayIcon, ArayOrb } from "@/components/shared/aray-orb";
import { playOrderChime } from "@/components/admin/admin-shell";
import { useAccountDrawer } from "@/store/account-drawer";
import { useAdminLang } from "@/lib/admin-lang-context";
import {
  buildAdminNavigationGroups,
  getAdminNavigationMobileCapsule,
  isAdminNavItemMatch,
  type AdminNavigationGroup,
} from "@/components/admin/admin-navigation-model";
import { buildAdminNavSections } from "@/components/admin/admin-nav-structure";

function haptic(pattern: number | number[] = 6) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {}
  }
}

const MOBILE_GROUP_ICONS: Record<string, React.ElementType> = {
  main: LayoutDashboard,
  sales: ShoppingBag,
  products: Package,
  aray: ArayIcon,
  content: BookOpen,
  marketing: Megaphone,
  finance: Wallet,
  settings: Settings,
  help: HelpCircle,
  personal: UserCircle,
};

function pluralizeRu(n: number, forms: [string, string, string]): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20))
    return forms[1];
  return forms[2];
}

const NOTIF_ITEM_META: Record<NotifItemKind, { icon: React.ElementType; className: string }> = {
  new_order: { icon: ShoppingBag, className: "text-primary" },
  pending_review: { icon: Star, className: "text-amber-500" },
  pending_staff: { icon: UserPlus, className: "text-primary" },
  notification_issue: { icon: AlertTriangle, className: "text-destructive" },
  task_assigned: { icon: ClipboardList, className: "text-muted-foreground" },
};

function formatNotifDate(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ── Универсальный NavItem (как в store mobile-bottom-nav) ─────────────────────
interface NavItemProps {
  icon: React.ElementType;
  label: string;
  isActive: boolean;
  badge?: number;
  onClick?: () => void;
  href?: string;
}

function NavItem({
  icon: Icon,
  label,
  isActive,
  badge,
  onClick,
  href,
}: NavItemProps) {
  const content = (
    <motion.div
      whileTap={{ scale: 0.92 }}
      transition={{ type: "spring", stiffness: 500, damping: 18 }}
      className={`admin-mobile-nav-item relative flex flex-col items-center gap-0.5 min-w-[52px] px-2 py-1.5 ${
        isActive ? "is-active " : ""
      }${isActive ? "text-primary" : "text-muted-foreground"}`}
      style={{ WebkitTapHighlightColor: "transparent" }}
    >
      <div
        className={`admin-mobile-nav-icon relative ${isActive ? "is-active" : ""}`}
      >
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
      <span
        className={`admin-mobile-nav-label text-[10px] leading-none ${isActive ? "font-semibold" : "font-medium"}`}
      >
        {label}
      </span>
    </motion.div>
  );

  const tapHandler = () => {
    haptic();
    onClick?.();
  };

  if (href) {
    return (
      <Link href={href} onClick={tapHandler} aria-label={label}>
        {content}
      </Link>
    );
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
  onArayOpen?: (mode?: "open" | "voice") => void;
  onSearchOpen?: () => void;
  arayListening?: boolean;
  arayHasNew?: boolean;
  disabledModuleIds?: string[];
}

type NotifItemKind =
  | "new_order"
  | "pending_review"
  | "pending_staff"
  | "notification_issue"
  | "task_assigned";

interface NotifItem {
  id: string;
  kind: NotifItemKind;
  title: string;
  body: string;
  href: string;
  createdAt: string;
  tone: "primary" | "warning" | "danger" | "muted";
}

export function AdminMobileBottomNav({
  role,
  disabledModuleIds,
  newOrdersCount = 0,
  onArayOpen,
  onSearchOpen,
  arayListening,
}: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useAdminLang();
  const isClient = role === "USER";
  const [kbOpen, setKbOpen] = useState(false);
  const [mobileDockEnabled, setMobileDockEnabled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedGroupKey, setSelectedGroupKey] = useState<string | null>(null);
  const [globalOverlayOpen, setGlobalOverlayOpen] = useState(false);

  // Единый AccountDrawer (тот же что в магазине)
  const { open: accountOpen, toggle: toggleAccount } = useAccountDrawer();

  // Long-press на Арая (tap = чат, long-press = голос)
  const arayLongPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const arayLongPressFiredRef = useRef(false);
  const araySuppressClickRef = useRef(false);
  const [arayVoiceActive, setArayVoiceActive] = useState(false);

  // Notification state
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const [notifItems, setNotifItems] = useState<NotifItem[]>([]);
  const [loadingNotif, setLoadingNotif] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef<number | null>(null);
  const notificationsEnabled = !isClient && !disabledModuleIds?.includes("core.notifications");
  const arayEnabled = !disabledModuleIds?.includes("core.aray-voice");
  const orders: Array<{ id: string; orderNumber: number; customerName?: string; customerPhone?: string; totalAmount?: number }> = [];
  const reviews: Array<{ id: string; name?: string; rating?: number; text?: string }> = [];
  const pendingStaff: Array<{ id: string; name?: string; email?: string }> = [];

  const navGroups = useMemo<AdminNavigationGroup[]>(
    () => buildAdminNavigationGroups(role, t, MOBILE_GROUP_ICONS, disabledModuleIds),
    [disabledModuleIds, role, t],
  );
  const activeNavItem = useMemo(() => {
    return (
      navGroups
        .flatMap((navGroup) => navGroup.items)
        .filter((item) => isAdminNavItemMatch(item, pathname))
        .sort((a, b) => b.href.length - a.href.length)[0] || null
    );
  }, [navGroups, pathname]);
  const mobileCapsule = useMemo(
    () => getAdminNavigationMobileCapsule({ pathname, role, t, disabledModuleIds }),
    [disabledModuleIds, pathname, role, t],
  );
  const isHrefActive = useCallback(
    (href: string) =>
      pathname === href || (href !== "/admin" && pathname.startsWith(`${href}/`)),
    [pathname],
  );

  const totalNavItems = navGroups.reduce(
    (sum, navGroup) => sum + navGroup.items.length,
    0,
  );

  const activeNavGroup = useMemo(
    () =>
      navGroups.find((navGroup) =>
        navGroup.items.some((item) => item.href === activeNavItem?.href),
      ) || navGroups[0] || null,
    [activeNavItem?.href, navGroups],
  );

  const selectedNavGroup = useMemo(
    () =>
      navGroups.find((navGroup) => navGroup.key === selectedGroupKey) ||
      activeNavGroup,
    [activeNavGroup, navGroups, selectedGroupKey],
  );

  const selectedGroupSections = useMemo(
    () =>
      selectedNavGroup
        ? buildAdminNavSections(selectedNavGroup.key, selectedNavGroup.items)
        : [],
    [selectedNavGroup],
  );

  useEffect(() => {
    if (!menuOpen) return;
    setSelectedGroupKey(activeNavGroup?.key ?? navGroups[0]?.key ?? null);
  }, [activeNavGroup?.key, menuOpen, navGroups]);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const syncOverlayState = () => {
      setGlobalOverlayOpen(document.body.dataset.adminOverlayOpen === "true");
    };

    syncOverlayState();
    const observer = new MutationObserver(syncOverlayState);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["data-admin-overlay-open"],
    });

    return () => observer.disconnect();
  }, []);

  // Скрываем при открытой клавиатуре
  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) return;
    const vv = window.visualViewport;
    const onResize = () => setKbOpen(window.innerHeight - vv.height > 100);
    vv.addEventListener("resize", onResize);
    return () => vv.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const query = window.matchMedia("(max-width: 1023px)");
    const sync = () => setMobileDockEnabled(query.matches);
    sync();
    if (query.addEventListener) {
      query.addEventListener("change", sync);
      return () => query.removeEventListener("change", sync);
    }
    query.addListener(sync);
    return () => query.removeListener(sync);
  }, []);

  // Polling уведомлений (60s — для экономии батареи; chime при увеличении)
  useEffect(() => {
    if (!notificationsEnabled) {
      setNotifOpen(false);
      setNotifCount(0);
      setNotifItems([]);
      prevCountRef.current = null;
      return;
    }
    if (isClient || !mobileDockEnabled) return;
    let cancelled = false;
    const fetchCount = async () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      try {
        const res = await fetch("/api/admin/notifications/count");
        if (res.ok) {
          const d = await res.json();
          const newOrders = d.newOrders ?? 0;
          if (prevCountRef.current !== null && newOrders > prevCountRef.current)
            playOrderChime();
          prevCountRef.current = newOrders;
          if (!cancelled) setNotifCount(d.total ?? 0);
        }
      } catch {}
    };
    fetchCount();
    const t = setInterval(fetchCount, 60000);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") fetchCount();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      cancelled = true;
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [isClient, mobileDockEnabled, notificationsEnabled]);

  // Закрыть popup при клике снаружи
  useEffect(() => {
    if (!notifOpen) return;
    const close = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node))
        setNotifOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [notifOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent) => {
      const target = e.target as Element | null;
      if (target?.closest("[data-admin-mobile-dock]")) return;
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        setMenuOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menuOpen]);

  // Закрытие popup на Escape
  useEffect(() => {
    if (!notifOpen && !menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setNotifOpen(false);
        setMenuOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [notifOpen, menuOpen]);

  // Уведомления не должны зависать поверх нового маршрута, аккаунта или клавиатуры.
  useEffect(() => {
    setNotifOpen(false);
    setMenuOpen(false);
  }, [pathname, accountOpen, kbOpen]);

  const openNotifications = useCallback(async () => {
    if (!notificationsEnabled) {
      setNotifOpen(false);
      return;
    }
    setNotifOpen(true);
    setLoadingNotif(true);
    try {
      const res = await fetch("/api/admin/notifications/feed?take=8", {
        cache: "no-store",
      });
      const data = await res.json().catch(() => null);
      setNotifItems(Array.isArray(data?.items) ? data.items : []);
      if (typeof data?.total === "number") setNotifCount(data.total);
    } catch {
      setNotifItems([]);
    } finally {
      setLoadingNotif(false);
    }
  }, [notificationsEnabled]);

  const sheetOpen = notifOpen || menuOpen;
  const CapsuleIcon = activeNavItem?.icon || activeNavGroup?.icon || ArayIcon;

  useEffect(() => {
    if (!sheetOpen || typeof document === "undefined") return;

    const { body, documentElement } = document;
    const previousBodyOverflow = body.style.overflow;
    const previousDocumentOverscroll = documentElement.style.overscrollBehaviorY;
    const previousMobileSheetOpen = body.dataset.arayMobileSheetOpen;

    body.style.overflow = "hidden";
    body.dataset.arayMobileSheetOpen = "true";
    documentElement.style.overscrollBehaviorY = "none";

    return () => {
      body.style.overflow = previousBodyOverflow;
      if (previousMobileSheetOpen === undefined) {
        delete body.dataset.arayMobileSheetOpen;
      } else {
        body.dataset.arayMobileSheetOpen = previousMobileSheetOpen;
      }
      documentElement.style.overscrollBehaviorY = previousDocumentOverscroll;
    };
  }, [sheetOpen]);

  // Cleanup
  useEffect(
    () => () => {
      if (arayLongPressRef.current) clearTimeout(arayLongPressRef.current);
    },
    [],
  );

  useEffect(() => {
    if (arayEnabled) return;
    if (arayLongPressRef.current) {
      clearTimeout(arayLongPressRef.current);
      arayLongPressRef.current = null;
    }
    arayLongPressFiredRef.current = false;
    araySuppressClickRef.current = false;
    setArayVoiceActive(false);
  }, [arayEnabled]);

  return (
    <>
      {sheetOpen && (
        <button
          type="button"
          className="fixed inset-0 z-[55] bg-background/60 backdrop-blur-md lg:hidden"
          aria-label="Р—Р°РєСЂС‹С‚СЊ РјРµРЅСЋ"
          onClick={() => {
            setNotifOpen(false);
            setMenuOpen(false);
          }}
        />
      )}

      {/* ── Notification popup (calm UI) ── */}
      {notifOpen && (
        <div
          ref={notifRef}
          className="admin-popup-liquid admin-mobile-sheet lg:hidden z-[60] overflow-hidden border animate-in slide-in-from-bottom-4 fade-in duration-200"
          style={{
            bottom: "max(8px, env(safe-area-inset-bottom, 8px))",
            left: "max(8px, env(safe-area-inset-left, 8px))",
            right: "max(8px, env(safe-area-inset-right, 8px))",
            maxHeight: "min(76vh, 620px)",
          }}
          role="dialog"
          aria-label="Уведомления"
        >
          <div className="flex justify-center pt-2">
            <span className="admin-mobile-sheet-handle" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary" strokeWidth={2} />
              <span className="text-sm font-semibold text-foreground">
                Уведомления
              </span>
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
          <div
            className="admin-mobile-sheet-body overflow-y-auto"
            style={{ maxHeight: "calc(min(76vh, 620px) - 104px)" }}
          >
            {loadingNotif ? (
              <div className="flex justify-center py-8">
                <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              </div>
            ) : notifItems.length === 0 ? (
              <div className="text-center py-10">
                <Bell
                  className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50"
                  strokeWidth={1.5}
                />
                <p className="text-xs text-muted-foreground">
                  Нет новых уведомлений
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {notifItems.map((item) => {
                  const meta = NOTIF_ITEM_META[item.kind] ?? NOTIF_ITEM_META.task_assigned;
                  const Icon = meta.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        router.push(item.href);
                        setNotifOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors text-left active:scale-[0.98]"
                    >
                      <Icon
                        className={`w-6 h-6 shrink-0 ${meta.className}`}
                        strokeWidth={1.75}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {item.title}
                        </p>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {item.body}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span className="text-[10px] text-muted-foreground">
                          {formatNotifDate(item.createdAt)}
                        </span>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </button>
                  );
                })}
                {orders.map((o) => (
                  <button
                    key={`o-${o.id}`}
                    onClick={() => {
                      router.push("/admin/orders");
                      setNotifOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors text-left active:scale-[0.98]"
                  >
                    <ShoppingBag
                      className="w-6 h-6 text-primary shrink-0"
                      strokeWidth={1.75}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        #{o.orderNumber} ·{" "}
                        {o.customerName || o.customerPhone || "Клиент"}
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
                    onClick={() => {
                      router.push("/admin/reviews");
                      setNotifOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors text-left active:scale-[0.98]"
                  >
                    <Star
                      className="w-6 h-6 text-amber-500 shrink-0"
                      strokeWidth={1.75}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {r.name || "Отзыв"}{" "}
                        {r.rating ? `· ${"★".repeat(r.rating)}` : ""}
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
                    onClick={() => {
                      router.push("/admin/staff");
                      setNotifOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors text-left active:scale-[0.98]"
                  >
                    <UserPlus
                      className="w-6 h-6 text-primary shrink-0"
                      strokeWidth={1.75}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {s.name || s.email || "Заявка"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Ожидает одобрения
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {(orders.length > 0 ||
            reviews.length > 0 ||
            pendingStaff.length > 0) && (
            <div className="grid gap-2 px-3 py-2 border-t border-border">
              {orders.length > 0 && (
                <button
                  onClick={() => {
                    router.push("/admin/orders?status=NEW");
                    setNotifOpen(false);
                  }}
                  className="min-h-[40px] w-full text-center text-xs font-semibold text-primary rounded-xl hover:bg-primary/5 transition-colors"
                >
                  Все новые заказы →
                </button>
              )}
              {reviews.length > 0 && (
                <button
                  onClick={() => {
                    router.push("/admin/reviews");
                    setNotifOpen(false);
                  }}
                  className="min-h-[40px] w-full text-center text-xs font-semibold text-primary rounded-xl hover:bg-primary/5 transition-colors"
                >
                  Отзывы на модерации →
                </button>
              )}
              {pendingStaff.length > 0 && (
                <button
                  onClick={() => {
                    router.push("/admin/staff");
                    setNotifOpen(false);
                  }}
                  className="min-h-[40px] w-full text-center text-xs font-semibold text-primary rounded-xl hover:bg-primary/5 transition-colors"
                >
                  Заявки сотрудников →
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Mobile navigation map ── */}
      {menuOpen && (
        <div
          ref={menuRef}
          className="admin-popup-liquid admin-mobile-sheet lg:hidden z-[60] flex flex-col overflow-hidden border animate-in slide-in-from-bottom-4 fade-in duration-200"
          style={{
            bottom: "max(8px, env(safe-area-inset-bottom, 8px))",
            left: "max(8px, env(safe-area-inset-left, 8px))",
            right: "max(8px, env(safe-area-inset-right, 8px))",
            maxHeight: "min(80vh, 680px)",
          }}
          onContextMenu={(event) => event.preventDefault()}
          role="dialog"
          aria-label="Меню админки"
        >
          <div className="flex justify-center pt-2">
            <span className="admin-mobile-sheet-handle" />
          </div>

          <div className="admin-nav-panel-head flex shrink-0 items-center justify-between gap-3 px-4 py-3 border-b border-border">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground leading-tight">
                Меню админки
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground leading-tight">
                Навигация · {totalNavItems}{" "}
                {pluralizeRu(totalNavItems, ["раздел", "раздела", "разделов"])}{" "}
                · {navGroups.length}{" "}
                {pluralizeRu(navGroups.length, ["группа", "группы", "групп"])}
              </p>
            </div>
            <button
              onClick={() => setMenuOpen(false)}
              className="admin-nav-panel-close"
              aria-label="Закрыть"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="admin-mobile-sheet-body flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-4 space-y-4">
            <section className="admin-mobile-menu-capsule rounded-2xl border border-primary/20 bg-primary/[0.06] p-3">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary">
                  <CapsuleIcon className="h-5 w-5" strokeWidth={1.85} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold leading-tight text-foreground">
                      {mobileCapsule.label}
                    </p>
                    <span className="shrink-0 rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold leading-none text-primary">
                      {mobileCapsule.groupLabel}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                    {mobileCapsule.subtitle}
                  </p>
                </div>
              </div>
              {mobileCapsule.quick.length > 0 && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {mobileCapsule.quick.slice(0, 4).map((item) => {
                    const QuickIcon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMenuOpen(false)}
                        className="flex min-h-10 items-center gap-2 rounded-xl border border-border bg-background/55 px-3 text-xs font-semibold text-foreground transition-colors hover:border-primary/30 hover:bg-primary/[0.08]"
                      >
                        <QuickIcon className="h-4 w-4 shrink-0 text-primary" strokeWidth={1.85} />
                        <span className="min-w-0 truncate">{item.title}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </section>

            <div className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-2">
              {navGroups.map((navGroup) => {
                const GroupIcon = navGroup.icon;
                const active = navGroup.key === selectedNavGroup?.key;
                const hasCurrent = navGroup.key === activeNavGroup?.key;
                return (
                  <button
                    key={navGroup.key}
                    type="button"
                    onClick={() => setSelectedGroupKey(navGroup.key)}
                    className={`flex min-h-11 shrink-0 snap-start items-center gap-2 rounded-xl border px-3 text-sm font-semibold transition-colors ${
                      active
                        ? "border-primary/35 bg-primary/10 text-primary"
                        : "border-border bg-card text-muted-foreground hover:bg-muted/45 hover:text-foreground"
                    }`}
                  >
                    <GroupIcon className="h-4 w-4" strokeWidth={1.85} />
                    <span>{navGroup.label}</span>
                    {hasCurrent && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                  </button>
                );
              })}
            </div>

            {selectedNavGroup && (
              <section>
                <div className="mb-2 flex items-end justify-between gap-3 px-1">
                  <div className="min-w-0">
                    <p className="admin-drawer-section-title text-[11px] font-medium uppercase tracking-wider text-primary/80">
                      {selectedNavGroup.label}
                    </p>
                    {selectedNavGroup.description && (
                      <p className="mt-0.5 truncate text-[11px] leading-tight text-muted-foreground">
                        {selectedNavGroup.description}
                      </p>
                    )}
                  </div>
                  <span className="min-w-[24px] rounded-full border border-border bg-card px-2 py-1 text-center text-[10px] font-semibold leading-none text-muted-foreground">
                    {selectedNavGroup.items.length}
                  </span>
                </div>

                <div className="admin-drawer-group space-y-3 rounded-2xl border border-border bg-background/45 p-2">
                  {selectedGroupSections.map((section) => (
                    <div key={section.label} className="space-y-1">
                      {selectedGroupSections.length > 1 && (
                        <p className="px-2 pt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/75">
                          {section.label}
                        </p>
                      )}
                      {section.items.map((item) => {
                        const active = item.href === activeNavItem?.href;
                        const ItemIcon = item.icon;
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setMenuOpen(false)}
                            className={`admin-drawer-row flex min-h-[3.25rem] items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors active:scale-[0.99] ${
                              active
                                ? "bg-primary/10 text-primary ring-1 ring-primary/15"
                                : "text-foreground hover:bg-muted/45 active:bg-muted/60"
                            }`}
                            style={{ WebkitTapHighlightColor: "transparent" }}
                          >
                            <span
                              className={`admin-drawer-row-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${
                                active
                                  ? "bg-primary/10 text-primary"
                                  : "bg-muted/60 text-muted-foreground"
                              }`}
                            >
                              <ItemIcon className="h-5 w-5" strokeWidth={1.85} />
                            </span>
                            <span className="flex min-w-0 flex-1 items-center gap-2">
                              <span className="min-w-0 truncate text-sm font-medium leading-tight">
                                {item.labelKey ? t(item.labelKey) : item.label}
                              </span>
                              {item.badge && (
                                <span className="shrink-0 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold leading-none text-primary">
                                  {item.badge}
                                </span>
                              )}
                            </span>
                            <ChevronRight
                              className={`h-4 w-4 shrink-0 ${
                                active
                                  ? "text-primary/70"
                                  : "text-muted-foreground/45"
                              }`}
                            />
                          </Link>
                        );
                      })}
                    </div>
                  ))}

                </div>
              </section>
            )}
          </div>
        </div>
      )}

      {/* ── Bottom dock (calm UI + Liquid Glass, идентично магазину) ── */}
      <nav
        data-admin-mobile-dock
        className="admin-mobile-dock z-50 lg:hidden transition-[bottom,opacity,width] duration-300"
        style={{
          bottom:
            accountOpen || kbOpen || menuOpen || notifOpen || globalOverlayOpen
              ? "calc(-140px - env(safe-area-inset-bottom, 0px))"
              : "0px",
          opacity: accountOpen || kbOpen || menuOpen || notifOpen || globalOverlayOpen ? 0 : 1,
          pointerEvents: accountOpen || kbOpen || menuOpen || notifOpen || globalOverlayOpen ? "none" : "auto",
        }}
        aria-label="Нижняя навигация админки"
        onContextMenu={(event) => event.preventDefault()}
      >
        <div className="admin-mobile-dock-inner">
          {/* Левые табы (по роли) */}
          <div className="flex flex-1 items-end justify-around">
            <NavItem
              icon={LayoutDashboard}
              label="Стол"
              href="/admin"
              isActive={pathname === "/admin"}
            />
            <NavItem
              icon={Search}
              label="Поиск"
              onClick={() => {
                setNotifOpen(false);
                setMenuOpen(false);
                onSearchOpen?.();
              }}
              isActive={false}
            />
          </div>

          {/* Центр: ARAY */}
          <div
            className="admin-mobile-dock-center flex flex-col items-center"
          >
            <button
              type="button"
              disabled={!arayEnabled}
              aria-label={arayEnabled ? "ARAY — открыть чат" : "ARAY недоступен для роли или модуля"}
              title={arayEnabled ? "ARAY" : "ARAY недоступен для роли или модуля"}
              onPointerDown={() => {
                if (!arayEnabled) return;
                arayLongPressFiredRef.current = false;
                if (arayLongPressRef.current) {
                  clearTimeout(arayLongPressRef.current);
                }
                arayLongPressRef.current = setTimeout(() => {
                  arayLongPressFiredRef.current = true;
                  setArayVoiceActive(true);
                  haptic([12, 40, 12]);
                  onArayOpen?.("voice");
                }, 400);
              }}
              onPointerUp={() => {
                if (!arayEnabled) return;
                if (arayLongPressRef.current) {
                  clearTimeout(arayLongPressRef.current);
                  arayLongPressRef.current = null;
                }
                if (arayLongPressFiredRef.current) {
                  araySuppressClickRef.current = true;
                  arayLongPressFiredRef.current = false;
                  setArayVoiceActive(false);
                  return;
                }
              }}
              onPointerCancel={() => {
                if (!arayEnabled) return;
                if (arayLongPressRef.current) {
                  clearTimeout(arayLongPressRef.current);
                  arayLongPressRef.current = null;
                }
                if (arayLongPressFiredRef.current) araySuppressClickRef.current = true;
                arayLongPressFiredRef.current = false;
                setArayVoiceActive(false);
              }}
              onClick={() => {
                if (!arayEnabled) return;
                if (araySuppressClickRef.current) {
                  araySuppressClickRef.current = false;
                  return;
                }
                haptic(8);
                onArayOpen?.("open");
              }}
              onContextMenu={(e) => e.preventDefault()}
              className={`flex flex-col items-center transition-transform duration-150 focus:outline-none ${
                arayEnabled ? "active:scale-[0.92]" : "cursor-not-allowed opacity-55"
              }`}
              style={{
                WebkitTapHighlightColor: "transparent",
                touchAction: "manipulation",
              }}
            >
              <ArayOrb
                size={52}
                id="adm-nav"
                className="admin-mobile-aray-orb"
                intensity="normal"
                pulse={
                  arayVoiceActive
                    ? "listening"
                    : arayListening && arayEnabled
                      ? "listening"
                      : "idle"
                }
                badgeCount={notificationsEnabled && notifCount > 0 ? notifCount : undefined}
              />
              <span
                className={`text-[10px] font-semibold mt-0.5 tracking-wide ${
                  arayVoiceActive ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {arayVoiceActive ? "Слушаю..." : "Арай"}
              </span>
            </button>
          </div>

          {/* Правые: Новое/Аккаунт + карта разделов */}
          <div className="flex flex-1 items-end justify-around">
            <NavItem
              icon={ShoppingBag}
              label="Заказы"
              href="/admin/orders"
              isActive={isHrefActive("/admin/orders")}
              badge={newOrdersCount}
            />
            <NavItem
              icon={UserCircle}
              label="Кабинет"
              onClick={() => {
                setNotifOpen(false);
                setMenuOpen(false);
                toggleAccount();
              }}
              isActive={accountOpen}
            />
          </div>
        </div>
      </nav>
    </>
  );
}
