"use client";

import { useState, useRef, useEffect } from "react";
import ReactDOM from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
// Sheet removed — all panels use portals now
import { AdminMobileBottomNav } from "@/components/admin/admin-mobile-bottom-nav";
import { AccessGuard } from "@/components/admin/access-guard";
import { LazyNeuralBg, LazyCursorGlow, LazyAdminVideoBg, LazyAdminAray, LazyAdminPageHelp, LazyAdminTour } from "@/components/admin/lazy-components";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Menu, X, LogOut, Sun, Moon, Bell, Settings, ShoppingBag,
  ArrowRight, ALargeSmall, Monitor, Zap, Palette, Film,
  Star, UserPlus, ChevronDown, LayoutDashboard, Target,
  Package, Truck, Warehouse, CheckSquare, BarChart2, Wallet,
  UserCircle, Tag, FileDown, Images, BookOpen, Wrench,
  Megaphone, TrendingUp, Mail, Globe, Stamp, Users,
  HeartPulse, HelpCircle, ExternalLink,
} from "lucide-react";

// ── Ключи localStorage ────────────────────────────────────────────────────────
const LS_CLASSIC = "aray-classic-mode";
const LS_BG_MODE = "aray-bg-mode"; // "classic" | "video"
export const LS_FONT    = "aray-font-size";

type BgMode = "classic" | "video";

export function useClassicMode() {
  const [bgMode, setBgMode] = useState<BgMode>("classic");
  const [isLight, setIsLight] = useState(false);
  useEffect(() => {
    // Миграция: если старый LS_CLASSIC = "1" → bgMode = "classic"
    const legacyClassic = localStorage.getItem(LS_CLASSIC) === "1";
    const stored = localStorage.getItem(LS_BG_MODE) as BgMode | null;
    if (stored && ["classic", "video"].includes(stored)) {
      setBgMode(stored);
    } else if (legacyClassic) {
      setBgMode("classic");
      localStorage.setItem(LS_BG_MODE, "classic");
    } else {
      setBgMode("classic");
    }
    // Detect light theme — force classic styles when light so dark rgba() never shows
    const checkLight = () => {
      const html = document.documentElement;
      setIsLight(html.classList.contains("light") || html.getAttribute("data-theme") === "light" || (!html.classList.contains("dark") && window.matchMedia("(prefers-color-scheme: light)").matches));
    };
    checkLight();
    const obs = new MutationObserver(checkLight);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-theme"] });
    const handler = () => {
      const m = localStorage.getItem(LS_BG_MODE) as BgMode | null;
      if (m) setBgMode(m);
    };
    window.addEventListener("aray-classic-change", handler);
    return () => { window.removeEventListener("aray-classic-change", handler); obs.disconnect(); };
  }, []);
  const setBg = (mode: BgMode) => {
    localStorage.setItem(LS_BG_MODE, mode);
    // Совместимость со старым ключом
    localStorage.setItem(LS_CLASSIC, mode === "classic" ? "1" : "0");
    window.dispatchEvent(new Event("aray-classic-change"));
  };
  const toggle = () => setBg(bgMode === "classic" ? "video" : "classic");
  const classic = isLight || bgMode === "classic";
  return { classic, rawClassic: bgMode === "classic", bgMode: isLight ? "classic" as BgMode : bgMode, setBg, toggle };
}

// ── Звук нового заказа (Web Audio API, без файлов) ───────────────────────────
export function playOrderChime() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const o1 = ctx.createOscillator(); const g1 = ctx.createGain();
    o1.connect(g1); g1.connect(ctx.destination);
    o1.type = "sine"; o1.frequency.value = 1046;
    g1.gain.setValueAtTime(0.25, ctx.currentTime);
    g1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    o1.start(ctx.currentTime); o1.stop(ctx.currentTime + 0.4);
    const o2 = ctx.createOscillator(); const g2 = ctx.createGain();
    o2.connect(g2); g2.connect(ctx.destination);
    o2.type = "sine"; o2.frequency.value = 784;
    g2.gain.setValueAtTime(0, ctx.currentTime + 0.15);
    g2.gain.setValueAtTime(0.20, ctx.currentTime + 0.15);
    g2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    o2.start(ctx.currentTime + 0.15); o2.stop(ctx.currentTime + 0.6);
  } catch {}
}

// Language picker moved to /cabinet/profile
import { useAdminLang } from "@/lib/admin-lang-context";
import { useTheme } from "next-themes";
import { AdminNav } from "@/components/admin/admin-nav";
import { AdminPwaInstall } from "@/components/admin/admin-pwa-install";
import { AdminPushPrompt } from "@/components/admin/admin-push-prompt";
import { usePalette, PALETTES } from "@/components/palette-provider";
import { AdminLangProvider } from "@/lib/admin-lang-context";
import { AdminSidebarWeather } from "@/components/admin/admin-dashboard-widgets";
import { TourTriggerButton } from "@/components/admin/admin-tour";
import { ArayControlCenter } from "@/components/admin/aray-control-center";
import { MobileFontControl, AdminMobileActionPill, ArayTranslationCheck } from "@/components/admin/admin-mobile-settings";

// ══════════════════════════════════════════════════════════════════════════════
// ✦ Liquid Glass Mobile Menu — Bottom Sheet (iOS 26 стиль)
// ══════════════════════════════════════════════════════════════════════════════

// Все nav-пункты встроены прямо в bottom sheet (не через AdminNav)
// для полного контроля над UX: quick actions + glass-секции

type MobileNavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  exact?: boolean;
  roles: string[];
  group: string;
  groupLabel?: string;
};

const SA = "SUPER_ADMIN";
const ALL_STAFF_R = [SA, "ADMIN", "MANAGER", "COURIER", "ACCOUNTANT", "WAREHOUSE", "SELLER"];

const MOBILE_NAV: MobileNavItem[] = [
  // ── Продажи ──
  { href: "/admin/orders",    label: "Заказы",     icon: ShoppingBag, roles: ALL_STAFF_R, group: "sales", groupLabel: "Продажи" },
  { href: "/admin/crm",      label: "ARAY CRM",    icon: Target,      roles: [SA, "ADMIN", "MANAGER", "SELLER"], group: "sales" },
  { href: "/admin/analytics", label: "Аналитика",   icon: BarChart2,   roles: [SA, "ADMIN", "ACCOUNTANT"], group: "sales" },
  { href: "/admin/finance",   label: "Финансы",     icon: Wallet,      roles: [SA, "ADMIN", "ACCOUNTANT"], group: "sales" },
  { href: "/admin/clients",   label: "Клиенты",     icon: UserCircle,  roles: [SA, "ADMIN", "MANAGER"], group: "sales" },
  { href: "/admin/tasks",     label: "Задачи",      icon: CheckSquare, roles: ALL_STAFF_R, group: "sales" },
  { href: "/admin/delivery",  label: "Доставка",    icon: Truck,       roles: [SA, "ADMIN", "MANAGER", "COURIER"], group: "sales" },

  // ── Товары ──
  { href: "/admin/products",   label: "Каталог",        icon: Package,   roles: [SA, "ADMIN", "MANAGER", "WAREHOUSE", "SELLER"], group: "products", groupLabel: "Товары" },
  { href: "/catalog",          label: "Каталог",        icon: Package,   roles: ["USER"], group: "products", groupLabel: "Магазин" },
  { href: "/admin/categories", label: "Категории",      icon: Tag,       roles: [SA, "ADMIN"], group: "products" },
  { href: "/admin/inventory",  label: "Склад",          icon: Warehouse, roles: [SA, "ADMIN", "MANAGER", "WAREHOUSE"], group: "products" },
  { href: "/admin/import",     label: "Импорт",         icon: FileDown,  roles: [SA, "ADMIN", "MANAGER", "WAREHOUSE"], group: "products" },
  { href: "/admin/media",      label: "Медиа",          icon: Images,    roles: [SA, "ADMIN", "MANAGER"], group: "products" },

  // ── Контент ──
  { href: "/admin/posts",    label: "Статьи",  icon: BookOpen, roles: [SA, "ADMIN", "MANAGER"], group: "content", groupLabel: "Контент" },
  { href: "/admin/services", label: "Услуги",  icon: Wrench,   roles: [SA, "ADMIN", "MANAGER"], group: "content" },

  // ── Маркетинг ──
  { href: "/admin/promotions", label: "Акции",      icon: Megaphone,  roles: [SA, "ADMIN", "MANAGER"], group: "marketing", groupLabel: "Маркетинг" },
  { href: "/admin/reviews",    label: "Отзывы",     icon: Star,       roles: [SA, "ADMIN", "MANAGER"], group: "marketing" },
  { href: "/admin/email",      label: "Рассылка",   icon: Mail,       roles: [SA, "ADMIN"], group: "marketing" },
  { href: "/admin/promotion",  label: "Продвижение", icon: TrendingUp, roles: [SA, "ADMIN", "MANAGER"], group: "marketing" },

  // ── Настройки ──
  { href: "/admin/site",           label: "Сайт",       icon: Globe,      roles: [SA, "ADMIN"], group: "settings", groupLabel: "Настройки" },
  { href: "/admin/settings",       label: "Настройки",  icon: Settings,   roles: [SA, "ADMIN"], group: "settings" },
  { href: "/admin/appearance",     label: "Оформление", icon: Palette,    roles: [SA, "ADMIN"], group: "settings" },
  { href: "/admin/staff",          label: "Команда",    icon: Users,      roles: [SA, "ADMIN"], group: "settings" },
  { href: "/admin/notifications",  label: "Уведомления", icon: Bell,      roles: [SA, "ADMIN"], group: "settings" },
  { href: "/admin/health",         label: "Система",    icon: HeartPulse, roles: [SA, "ADMIN"], group: "settings" },
  // USER settings
  { href: "/cabinet/notifications", label: "Уведомления", icon: Bell,    roles: ["USER"], group: "settings", groupLabel: "Настройки" },
  { href: "/cabinet/appearance",    label: "Оформление",  icon: Palette, roles: ["USER"], group: "settings" },

  // ── Помощь ──
  { href: "/admin/help", label: "Помощь", icon: HelpCircle, roles: [...ALL_STAFF_R, "USER"], group: "help", groupLabel: "Помощь" },
];

// Quick actions по роли — самые частые переходы
function getQuickActions(role: string) {
  const isAdmin = ["SUPER_ADMIN", "ADMIN"].includes(role);
  const isManager = role === "MANAGER";
  if (isAdmin) return [
    { href: "/admin",          label: "Дашборд",  icon: LayoutDashboard, color: "hsl(var(--primary))" },
    { href: "/admin/orders",   label: "Заказы",    icon: ShoppingBag,     color: "#f59e0b" },
    { href: "/admin/crm",     label: "ARAY CRM",   icon: Target,          color: "#8b5cf6" },
    { href: "/admin/products", label: "Товары",     icon: Package,         color: "#10b981" },
    { href: "/admin/analytics", label: "Аналитика", icon: BarChart2,       color: "#3b82f6" },
    { href: "/admin/staff",    label: "Команда",    icon: Users,           color: "#ec4899" },
  ];
  if (isManager) return [
    { href: "/admin",          label: "Дашборд",  icon: LayoutDashboard, color: "hsl(var(--primary))" },
    { href: "/admin/orders",   label: "Заказы",    icon: ShoppingBag,     color: "#f59e0b" },
    { href: "/admin/crm",     label: "ARAY CRM",   icon: Target,          color: "#8b5cf6" },
    { href: "/admin/delivery", label: "Доставка",   icon: Truck,           color: "#06b6d4" },
  ];
  if (role === "COURIER") return [
    { href: "/admin",          label: "Дашборд",  icon: LayoutDashboard, color: "hsl(var(--primary))" },
    { href: "/admin/orders",   label: "Заказы",    icon: ShoppingBag,     color: "#f59e0b" },
    { href: "/admin/delivery", label: "Маршрут",    icon: Truck,           color: "#06b6d4" },
  ];
  if (role === "WAREHOUSE") return [
    { href: "/admin",           label: "Дашборд",  icon: LayoutDashboard, color: "hsl(var(--primary))" },
    { href: "/admin/products",  label: "Товары",    icon: Package,         color: "#10b981" },
    { href: "/admin/inventory", label: "Склад",     icon: Warehouse,       color: "#f59e0b" },
  ];
  if (role === "USER") return [
    { href: "/cabinet",  label: "Главная",  icon: LayoutDashboard, color: "hsl(var(--primary))" },
    { href: "/catalog",  label: "Каталог",  icon: Package,         color: "#10b981" },
    { href: "/cabinet/profile", label: "Профиль", icon: UserCircle, color: "#8b5cf6" },
  ];
  // Default for SELLER, ACCOUNTANT
  return [
    { href: "/admin",        label: "Дашборд",  icon: LayoutDashboard, color: "hsl(var(--primary))" },
    { href: "/admin/orders", label: "Заказы",    icon: ShoppingBag,     color: "#f59e0b" },
    { href: "/admin/tasks",  label: "Задачи",    icon: CheckSquare,     color: "#8b5cf6" },
  ];
}

function MobileMenuBottomSheet({
  open, onClose, userName, email, role, avatarUrl, sheetDragStartY, isDark,
  palette, setPalette, theme: currentTheme, setTheme,
}: {
  open: boolean;
  onClose: () => void;
  userName?: string | null;
  email?: string | null;
  role: string;
  avatarUrl?: string | null;
  sheetDragStartY: React.MutableRefObject<number>;
  isDark: boolean;
  palette: string;
  setPalette: (id: string) => void;
  theme: string;
  setTheme: (t: string) => void;
}) {
  const pathname = usePathname();
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set(["settings", "help"]));
  // Search removed — was frustrating on mobile keyboards

  useEffect(() => { setPortalTarget(document.body); }, []);


  // ── Бейджи на разделах (загружаем при открытии) ──
  const [badges, setBadges] = useState<Record<string, number>>({});
  useEffect(() => {
    if (!open || role === "USER") return;
    let cancelled = false;
    (async () => {
      try {
        const [ordersRes, reviewsRes, staffRes] = await Promise.all([
          fetch("/api/admin/orders?status=NEW&limit=1").then(r => r.ok ? r.json() : null).catch(() => null),
          fetch("/api/admin/reviews?pending=true&limit=1").then(r => r.ok ? r.json() : null).catch(() => null),
          fetch("/api/admin/staff?status=PENDING&limit=1").then(r => r.ok ? r.json() : null).catch(() => null),
        ]);
        if (cancelled) return;
        const b: Record<string, number> = {};
        if (ordersRes?.total) b["/admin/orders"] = ordersRes.total;
        if (reviewsRes?.total) b["/admin/reviews"] = reviewsRes.total;
        if (staffRes?.total) b["/admin/staff"] = staffRes.total;
        setBadges(b);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [open, role]);

  // ── Недавние разделы (localStorage) ──
  const LS_RECENT = "aray-recent-sections";
  const [recent, setRecent] = useState<string[]>([]);
  useEffect(() => {
    try { setRecent(JSON.parse(localStorage.getItem(LS_RECENT) || "[]")); } catch { setRecent([]); }
  }, [open]);

  // Auto-expand group that has active page
  useEffect(() => {
    if (!open) return;
    const visItems = MOBILE_NAV.filter(i => i.roles.includes(role));
    const active = visItems.find(i => i.exact ? pathname === i.href : pathname.startsWith(i.href));
    if (active && collapsed.has(active.group)) {
      setCollapsed(prev => { const s = new Set(prev); s.delete(active.group); return s; });
    }
  }, [open, pathname, role]);

  if (!portalTarget) return null;

  const allQuickActions = getQuickActions(role);
  const visibleItems = MOBILE_NAV.filter(i => i.roles.includes(role));

  const quickActions = allQuickActions;
  const filteredItems = visibleItems;

  // Group items
  const groups: { key: string; label: string; items: MobileNavItem[] }[] = [];
  for (const item of filteredItems) {
    let g = groups.find(g => g.key === item.group);
    if (!g) { g = { key: item.group, label: item.groupLabel || "", items: [] }; groups.push(g); }
    g.items.push(item);
  }

  // Track navigation for "Recent"
  const trackRecent = (href: string) => {
    try {
      const prev = JSON.parse(localStorage.getItem(LS_RECENT) || "[]") as string[];
      const next = [href, ...prev.filter(h => h !== href)].slice(0, 4);
      localStorage.setItem(LS_RECENT, JSON.stringify(next));
    } catch {}
  };

  const toggleGroup = (key: string) => {
    setCollapsed(prev => {
      const s = new Set(prev);
      s.has(key) ? s.delete(key) : s.add(key);
      return s;
    });
  };

  // ── Liquid Glass палитра: тёмная / светлая ──
  // Ключевое: ПРОЗРАЧНОСТЬ + размытие = жидкое стекло
  const glass = isDark ? {
    // Dark glass — тёмное полупрозрачное стекло
    sheetBg: "linear-gradient(180deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.03) 4%, rgba(10,10,18,0.78) 18%)",
    sheetBorder: "1px solid rgba(255,255,255,0.18)",
    sheetSideBorder: "1px solid rgba(255,255,255,0.08)",
    sheetShadow: "0 -1px 0 rgba(255,255,255,0.12), 0 -16px 60px rgba(0,0,0,0.5)",
    handle: "bg-white/30",
    cardBg: "rgba(255,255,255,0.07)",
    cardBorder: "1px solid rgba(255,255,255,0.10)",
    cardActiveBg: "rgba(255,255,255,0.14)",
    cardActiveBorder: "1px solid rgba(255,255,255,0.22)",
    sectionBg: "rgba(255,255,255,0.04)",
    sectionBorder: "1px solid rgba(255,255,255,0.06)",
    sectionItemBorder: "1px solid rgba(255,255,255,0.04)",
    sectionItemActive: "rgba(255,255,255,0.08)",
    divider: "rgba(255,255,255,0.08)",
    textPrimary: "rgba(255,255,255,0.93)",
    textSecondary: "rgba(255,255,255,0.62)",
    textMuted: "rgba(255,255,255,0.35)",
    textIcon: "rgba(255,255,255,0.40)",
    textIconActive: "hsl(var(--primary))",
    insetHighlight: "inset 0 1px 0 rgba(255,255,255,0.08)",
    backdrop: "rgba(0,0,0,0.45)",
  } : {
    // Light glass — молочное полупрозрачное стекло с рефракцией
    sheetBg: "linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 4%, rgba(240,242,248,0.82) 18%)",
    sheetBorder: "1px solid rgba(255,255,255,0.6)",
    sheetSideBorder: "1px solid rgba(255,255,255,0.4)",
    sheetShadow: "0 -1px 0 rgba(255,255,255,0.9), 0 -16px 60px rgba(0,0,0,0.12)",
    handle: "bg-black/12",
    cardBg: "rgba(255,255,255,0.5)",
    cardBorder: "1px solid rgba(255,255,255,0.6)",
    cardActiveBg: "rgba(255,255,255,0.7)",
    cardActiveBorder: "1px solid rgba(0,0,0,0.08)",
    sectionBg: "rgba(255,255,255,0.4)",
    sectionBorder: "1px solid rgba(255,255,255,0.5)",
    sectionItemBorder: "1px solid rgba(0,0,0,0.04)",
    sectionItemActive: "rgba(255,255,255,0.6)",
    divider: "rgba(0,0,0,0.06)",
    textPrimary: "rgba(0,0,0,0.85)",
    textSecondary: "rgba(0,0,0,0.55)",
    textMuted: "rgba(0,0,0,0.30)",
    textIcon: "rgba(0,0,0,0.32)",
    textIconActive: "hsl(var(--primary))",
    insetHighlight: "inset 0 1px 0 rgba(255,255,255,0.8)",
    backdrop: "rgba(0,0,0,0.18)",
  };

  return ReactDOM.createPortal(
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="menu-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="lg:hidden fixed inset-0"
            style={{
              zIndex: 200,
              background: glass.backdrop,
              backdropFilter: "blur(12px) saturate(140%)",
              WebkitBackdropFilter: "blur(12px) saturate(140%)",
            }}
            onClick={onClose}
          />

          {/* ── Liquid Glass Bottom Sheet ── */}
          <motion.div
            key="menu-sheet"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 280 }}
            className="lg:hidden fixed bottom-0 left-0 right-0 flex flex-col"
            style={{
              zIndex: 201,
              maxHeight: "90dvh",
              borderRadius: "32px 32px 0 0",
              background: glass.sheetBg,
              backdropFilter: "blur(50px) saturate(180%) brightness(1.05)",
              WebkitBackdropFilter: "blur(50px) saturate(180%) brightness(1.05)",
              boxShadow: glass.sheetShadow,
              borderTop: glass.sheetBorder,
              borderLeft: glass.sheetSideBorder,
              borderRight: glass.sheetSideBorder,
            }}
          >
            {/* ── Drag handle ── */}
            <div
              className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing shrink-0"
              onTouchStart={(e) => { sheetDragStartY.current = e.touches[0].clientY; }}
              onTouchEnd={(e) => {
                const dy = e.changedTouches[0].clientY - sheetDragStartY.current;
                if (dy > 60) onClose();
              }}
            >
              <div className={`w-10 h-1 rounded-full ${glass.handle}`} />
            </div>

            {/* ── Профиль — glass card ── */}
            <div className="mx-4 mb-3 px-4 py-3 flex items-center gap-3 shrink-0 rounded-2xl"
              style={{
                background: glass.cardBg,
                border: glass.cardBorder,
              }}>
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="w-11 h-11 rounded-2xl shrink-0 object-cover" />
              ) : (
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 text-white font-bold text-base"
                  style={{
                    background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary)/0.6))",
                    boxShadow: "0 4px 20px hsl(var(--primary)/0.4), inset 0 1px 0 rgba(255,255,255,0.2)",
                  }}>
                  {userName ? userName.charAt(0).toUpperCase() : email ? email.charAt(0).toUpperCase() : "A"}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-display font-bold text-[15px] leading-tight truncate"
                  style={{ color: glass.textPrimary }}>
                  {userName || (email ? email.split("@")[0] : "Пользователь")}
                </p>
                <p className="text-[11px] mt-0.5 truncate" style={{ color: glass.textMuted }}>{email}</p>
              </div>
              <Link href="/cabinet/profile" onClick={onClose}
                className="w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-90 shrink-0"
                style={{
                  background: glass.cardBg,
                  border: glass.cardBorder,
                  WebkitTapHighlightColor: "transparent",
                }}>
                <Settings className="w-4.5 h-4.5" style={{ color: glass.textIcon }} />
              </Link>
            </div>

            {/* ── Скроллируемая область ── */}
            <div className="flex-1 overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: "touch" }}>

            {/* ── Недавние — последние 4 посещённых раздела ── */}
            {recent.length > 0 && (() => {
              // Resolve recent hrefs to nav items
              const allItems = [...allQuickActions, ...visibleItems];
              const recentItems = recent
                .map(href => allItems.find(i => i.href === href))
                .filter(Boolean) as (typeof allItems[number])[];
              if (recentItems.length === 0) return null;
              return (
                <div className="mx-4 mb-3 shrink-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] mb-2 px-1"
                    style={{ color: glass.textMuted }}>Недавние</p>
                  <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
                    {recentItems.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => { trackRecent(item.href); onClose(); }}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl shrink-0 transition-all active:scale-[0.95]"
                        style={{
                          background: glass.cardBg,
                          border: glass.cardBorder,
                          WebkitTapHighlightColor: "transparent",
                        }}>
                        <item.icon className="w-4 h-4 shrink-0" style={{ color: "color" in item ? (item as any).color : glass.textIcon }} />
                        <span className="text-[12px] font-medium whitespace-nowrap"
                          style={{ color: glass.textSecondary }}>{item.label}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* ── Quick Actions — glass grid (hidden during search) ── */}
            {<div className="mx-4 mb-3 shrink-0">
              <div className="grid grid-cols-3 gap-2">
                {quickActions.map((qa) => {
                  const isActive = qa.href === "/admin" || qa.href === "/cabinet"
                    ? pathname === qa.href
                    : pathname.startsWith(qa.href);
                  return (
                    <Link
                      key={qa.href}
                      href={qa.href}
                      onClick={() => { trackRecent(qa.href); onClose(); }}
                      className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl transition-all active:scale-[0.94] select-none"
                      style={{
                        background: isActive ? glass.cardActiveBg : glass.cardBg,
                        border: isActive ? glass.cardActiveBorder : glass.cardBorder,
                        boxShadow: isActive
                          ? `0 4px 16px ${qa.color}25, ${glass.insetHighlight}`
                          : glass.insetHighlight,
                        WebkitTapHighlightColor: "transparent",
                      }}
                    >
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{
                          background: `linear-gradient(135deg, ${qa.color}25, ${qa.color}08)`,
                          boxShadow: isActive ? `0 0 12px ${qa.color}30` : undefined,
                        }}>
                        <qa.icon className="w-5 h-5" style={{ color: qa.color }} />
                      </div>
                      <span className="text-[11px] font-semibold leading-none"
                        style={{ color: glass.textSecondary }}>{qa.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>}

            {/* ── Навигация — glass секции с аккордеоном ── */}
            <div className="px-4 pb-2">
              {groups.map((g) => {
                const isOpen = !collapsed.has(g.key);
                const hasActive = g.items.some(i => i.exact ? pathname === i.href : pathname.startsWith(i.href));

                return (
                  <div key={g.key} className="mb-2">
                    {/* Section header */}
                    {g.label && (
                      <button
                        onClick={() => toggleGroup(g.key)}
                        className="w-full flex items-center gap-2 px-3 py-2 select-none group/sec"
                        style={{ WebkitTapHighlightColor: "transparent" }}
                      >
                        <span className="text-[10px] font-bold uppercase tracking-[0.16em] transition-colors"
                          style={{ color: hasActive ? glass.textSecondary : glass.textMuted }}>
                          {g.label}
                        </span>
                        <div className="flex-1 h-px" style={{ background: `linear-gradient(90deg, ${glass.divider}, transparent)` }} />
                        <ChevronDown
                          className={`w-3 h-3 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                          style={{ color: glass.textMuted }}
                        />
                      </button>
                    )}

                    {/* Items — glass card */}
                    <AnimatePresence initial={false}>
                      {(isOpen || !g.label) && (
                        <motion.div
                          initial={g.label ? { height: 0, opacity: 0 } : false}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2, ease: "easeInOut" }}
                          className="overflow-hidden"
                        >
                          <div className="rounded-2xl overflow-hidden mb-1"
                            style={{
                              background: glass.sectionBg,
                              border: glass.sectionBorder,
                            }}>
                            {g.items.map((item, idx) => {
                              const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
                              return (
                                <Link
                                  key={item.href}
                                  href={item.href}
                                  onClick={() => { trackRecent(item.href); onClose(); }}
                                  className="flex items-center gap-3 px-4 py-3 transition-all active:scale-[0.98] select-none"
                                  style={{
                                    background: isActive ? glass.sectionItemActive : "transparent",
                                    borderTop: idx > 0 ? glass.sectionItemBorder : undefined,
                                    WebkitTapHighlightColor: "transparent",
                                  }}
                                >
                                  <item.icon
                                    className="w-[18px] h-[18px] shrink-0 transition-colors"
                                    style={{ color: isActive ? glass.textIconActive : glass.textIcon }}
                                  />
                                  <span className="text-[13px] font-medium flex-1 transition-colors"
                                    style={{ color: isActive ? glass.textPrimary : glass.textSecondary }}>
                                    {item.label}
                                  </span>
                                  {badges[item.href] > 0 && (
                                    <span className="min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                                      style={{ background: "hsl(var(--destructive, 0 84% 60%))" }}>
                                      {badges[item.href]}
                                    </span>
                                  )}
                                  {isActive && (
                                    <div className="w-1.5 h-1.5 rounded-full shrink-0"
                                      style={{ background: "hsl(var(--primary))", boxShadow: "0 0 6px hsl(var(--primary)/0.6)" }} />
                                  )}
                                </Link>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
            </div>{/* end scroll area */}

            {/* ── Футер ── */}
            <div className="shrink-0 px-4 pt-2 pb-2"
              style={{ borderTop: `1px solid ${glass.divider}` }}>
              <Link href="/"
                className="flex items-center justify-center gap-2 py-3 rounded-2xl transition-all active:scale-[0.97]"
                onClick={onClose}
                style={{
                  background: glass.cardBg,
                  border: glass.cardBorder,
                  WebkitTapHighlightColor: "transparent",
                }}>
                <ExternalLink className="w-4 h-4" style={{ color: glass.textMuted }} />
                <span className="text-[13px] font-medium" style={{ color: glass.textSecondary }}>На сайт</span>
              </Link>
            </div>

            {/* Safe area */}
            <div className="shrink-0" style={{ height: "env(safe-area-inset-bottom, 0px)" }} />
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    portalTarget
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ✦ ARAY Control Center — единая панель уведомлений + оформления
// ══════════════════════════════════════════════════════════════════════════════

interface AdminShellProps {
  role: string;
  email: string | null | undefined;
  userName?: string | null;
  children: React.ReactNode;
}

const PAGE_TITLES: Record<string, string> = {
  "/admin": "",
  "/admin/orders": "Заказы",
  "/admin/crm": "ARAY CRM",
  "/admin/tasks": "Задачи",
  "/admin/workflows": "Автоворкфлоу",
  "/admin/delivery": "Доставка",
  "/admin/products": "Каталог товаров",
  "/admin/categories": "Категории",
  "/admin/inventory": "Склад / Остатки",
  "/admin/import": "Импорт / Экспорт",
  "/admin/media": "Медиабиблиотека",
  "/admin/promotions": "Акции",
  "/admin/reviews": "Отзывы",
  "/admin/email": "Email рассылка",
  "/admin/promotion": "Продвижение",
  "/admin/finance": "Финансы",
  "/admin/clients": "Клиенты",
  "/admin/health": "Здоровье системы",
  "/admin/site": "Настройки сайта",
  "/admin/settings": "Настройки",
  "/admin/appearance": "Оформление",
  "/admin/analytics": "Аналитика",
  "/admin/watermark": "Водяной знак",
  "/admin/staff": "Команда",
  "/admin/notifications": "Уведомления",
  "/admin/help": "Помощь",
  // Кабинет (общий для всех)
  "/cabinet": "Главная",
  "/cabinet/profile": "Профиль",
  "/cabinet/notifications": "Уведомления",
  "/cabinet/reviews": "Мои отзывы",
  "/cabinet/media": "Медиабиблиотека",
  "/cabinet/subscriptions": "Подписки",
  "/cabinet/history": "История",
  "/cabinet/appearance": "Оформление",
};

function usePageTitle() {
  const pathname = usePathname();
  const sorted = Object.entries(PAGE_TITLES).sort((a, b) => b[0].length - a[0].length);
  for (const [path, title] of sorted) {
    if (pathname === path || (path !== "/admin" && pathname.startsWith(path))) return title;
  }
  return "Панель управления";
}

function AdminShellInner({ role, email, userName, children }: AdminShellProps) {
  const [open, setOpen] = useState(false);
  // Settings panel removed — ARAY Control sticky handles it
  const { theme, setTheme } = useTheme();
  const { palette, setPalette } = usePalette();
  const { classic, bgMode, setBg, toggle: toggleClassic } = useClassicMode();
  const { t } = useAdminLang();
  const pageTitle = usePageTitle();

  // ── Mounted guard: prevents hydration mismatch from useTheme() ──
  // useTheme() returns undefined on server, actual value on client.
  // Without this, theme-dependent text/icons cause React error #425/#418.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const safeTheme: string = (mounted ? theme : "dark") ?? "dark"; // default to dark for SSR

  // Цвет сайдбара напрямую из JS палитры — CSS variable может не работать в Sheet Portal
  const sidebarHex = PALETTES.find(p => p.id === palette)?.sidebar ?? "#5C3317";
  const sidebarBg = `linear-gradient(180deg, ${sidebarHex}, ${sidebarHex})`;

  // Синхронизируем aray-classic-mode на <body> для порталов (Sheet, Dialog)
  useEffect(() => {
    document.body.classList.toggle("aray-classic-mode", classic);
    document.body.classList.toggle("aray-nature-mode", !classic);
    return () => {
      document.body.classList.remove("aray-classic-mode", "aray-nature-mode");
    };
  }, [classic]);

  // Drag handle ref for bottom sheet swipe-to-close
  const sheetDragStartY = useRef(0);

  // ── Аватар пользователя — загружаем один раз ──
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/cabinet/profile").then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.avatarUrl) setAvatarUrl(d.avatarUrl); })
      .catch(() => {});
  }, []);

  return (
    <div className={`flex min-h-screen relative ${classic ? "aray-classic-mode bg-background" : "aray-admin-bg aray-nature-mode"}`}
      style={classic ? undefined : { backgroundColor: "rgb(6, 8, 18)" }}>
      {/* Google Translate скрытый контейнер — переводит страницу целиком */}
      <div id="google_translate_element" className="absolute -top-[9999px] -left-[9999px] opacity-0 pointer-events-none" />
      {bgMode === "video" && <LazyAdminVideoBg enabled />}
      {bgMode === "classic" && <LazyNeuralBg enabled />}
      <LazyCursorGlow />

      {/* ─── Desktop sidebar ──────────────────────────────────── */}
      <aside className="hidden lg:flex w-60 shrink-0 aray-sidebar text-white flex-col fixed top-0 left-0 h-screen z-30"
        style={{ background: sidebarBg }}>
        <div className="px-4 py-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-10 h-10 rounded-xl shrink-0 object-cover"
                onError={() => setAvatarUrl(null)} />
            ) : (
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white font-bold text-sm"
                style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary)/0.5))", boxShadow: "0 4px 12px hsl(var(--primary)/0.35)" }}>
                {userName ? userName.charAt(0).toUpperCase() : email ? email.charAt(0).toUpperCase() : "A"}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-display font-bold text-sm text-white leading-none truncate">
                {userName || (email ? email.split("@")[0] : "Пользователь")}
              </p>
              <p className="text-[10px] text-white/40 mt-0.5 leading-none truncate">{email}</p>
            </div>
            <Link href="/cabinet/profile" className="p-1.5 rounded-lg hover:bg-white/10 transition-colors shrink-0" title="Настройки профиля">
              <Settings className="w-4 h-4 text-white/50" />
            </Link>
          </div>
        </div>

        {/* Nav + weather scrollable, footer always pinned at bottom */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
          <AdminNav role={role} />
          <AdminPushPrompt />
          <AdminSidebarWeather />
        </div>

        {/* ── Подвал сайдбара: PWA + ссылка на сайт ── */}
        <div className="shrink-0 border-t border-white/10 p-3 space-y-1">
          <AdminPwaInstall />
          <Link href="/"
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] text-white/50 hover:text-white hover:bg-white/[0.06] transition-colors"
            title="Перейти на сайт">
            <ShoppingBag className="w-3.5 h-3.5" />
            На сайт
          </Link>
        </div>
      </aside>

      {/* ─── Mobile header убран — заменён compact sticky search bar внутри main ── */}

      {/* ─── Mobile menu — Bottom Sheet (portal) ────────────── */}
      <MobileMenuBottomSheet
        open={open}
        onClose={() => setOpen(false)}
        userName={userName}
        email={email}
        role={role}
        avatarUrl={avatarUrl}
        sheetDragStartY={sheetDragStartY}
        isDark={safeTheme === "dark"}
        palette={palette}
        setPalette={setPalette}
        theme={safeTheme}
        setTheme={setTheme}
      />

      {/* ─── Mobile bottom nav ───────────────────────────────── */}
      <AdminMobileBottomNav
        role={role}
        onMenuOpen={() => setOpen(true)}
        menuOpen={open}
        onArayOpen={() => window.dispatchEvent(new Event("aray:open"))}
      />

      {/* ─── ARAY CONTROL — липкая панель справа (desktop + mobile) ── */}
      <div className="fixed right-0 top-1/2 -translate-y-1/2 z-40">
        <ArayControlCenter userRole={role} position="right" />
      </div>

      {/* ─── Main content ─────────────────────────────────────── */}
      <main className="flex-1 min-w-0 overflow-auto lg:ml-60 relative z-[5]">

        {/* Mobile header убран — навигация через нижний dock + Арай */}

        {/* Desktop: хедер убран полностью — поиск через Арая снизу */}

        <div className="pt-0" style={{ paddingBottom: "max(calc(88px + env(safe-area-inset-bottom, 16px)), 88px)" }}>
          <div className="px-2.5 py-2 lg:p-6"><AccessGuard role={role}>{children}</AccessGuard></div>
        </div>
      </main>

      {/* ── Арай — фиксированная панель снизу на всех страницах ── */}
      {/* AdminPageHelp и AdminTour убраны — ARAY обучает и помогает вместо них */}
      <LazyAdminAray staffName={userName || (email && !email.startsWith("info") ? email.split("@")[0] : null) || "Коллега"} userRole={role} />
    </div>
  );
}

export function AdminShell(props: AdminShellProps) {
  return (
    <AdminLangProvider>
      <AdminShellInner {...props} />
    </AdminLangProvider>
  );
}
