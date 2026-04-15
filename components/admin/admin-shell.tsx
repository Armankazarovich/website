"use client";

import { useState, useRef, useEffect } from "react";
import ReactDOM from "react-dom";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { AdminMobileBottomNav } from "@/components/admin/admin-mobile-bottom-nav";
import { AccessGuard } from "@/components/admin/access-guard";
import { LazyNeuralBg, LazyCursorGlow, LazyAdminVideoBg, LazyAdminAray, LazyAdminPageHelp, LazyAdminTour } from "@/components/admin/lazy-components";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Menu, X, LogOut, Sun, Moon, Bell, Settings, ShoppingBag,
  ArrowRight, ALargeSmall, Monitor, Zap, Palette, Film,
  Star, UserPlus,
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

// ── Уведомления нового поколения ─────────────────────────────────────────────
function AdminNotificationBell({ mobile = false }: { mobile?: boolean }) {
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const prevOrderCount = useRef<number | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { classic } = useClassicMode();

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  useEffect(() => {
    async function fetchCount() {
      try {
        const res = await fetch("/api/admin/notifications/count");
        if (res.ok) {
          const data = await res.json();
          const newOrders = data.newOrders ?? 0;
          const total = data.total ?? 0;
          if (prevOrderCount.current !== null && newOrders > prevOrderCount.current) playOrderChime();
          prevOrderCount.current = newOrders;
          setCount(total);
        }
      } catch {}
    }
    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, []);

  async function handleOpen() {
    if (mobile) { router.push("/admin/orders?status=NEW"); return; }
    const next = !open;
    setOpen(next);
    if (next) {
      setLoadingOrders(true);
      try {
        const res = await fetch("/api/admin/orders?status=NEW&limit=5&page=1");
        if (res.ok) {
          const data = await res.json();
          setOrders(data.orders || (Array.isArray(data) ? data : []));
        }
      } catch {} finally { setLoadingOrders(false); }
    }
  }

  const badge = count > 0 && (
    <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full text-[9px] font-bold text-white flex items-center justify-center px-1"
      style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary)/0.7))" }}>
      {count > 99 ? "99+" : count}
    </span>
  );

  if (mobile) {
    return (
      <button onClick={handleOpen}
        className="p-2 rounded-xl hover:bg-white/10 transition-colors shrink-0 relative">
        <Bell className={`w-[18px] h-[18px] text-amber-400 ${count > 0 ? "animate-[bell-ring_2s_ease_infinite]" : ""}`} />
        {badge}
      </button>
    );
  }

  return (
    <div ref={panelRef} className="relative">
      <button onClick={handleOpen}
        className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-amber-500/15 transition-all group relative">
        <Bell className={`w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform ${count > 0 ? "animate-[bell-ring_2.5s_ease_infinite]" : ""}`} />
        <span className="absolute inset-0 rounded-xl group-hover:ring-2 ring-amber-400/20 transition-all" />
        {badge}
      </button>

      {open && (
        <div className="glass-popup absolute top-full right-0 mt-2 z-[70] w-80 rounded-2xl overflow-hidden animate-in slide-in-from-top-2 fade-in duration-200">

          {/* Panel header */}
          <div className="px-4 py-3 flex items-center justify-between border-b glass-popup-divider">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #f59e0b33, #f59e0b11)" }}>
                <Bell className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <p className="text-sm font-semibold text-foreground">Уведомления</p>
            </div>
            <div className="flex items-center gap-2">
              {count > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                  style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary)/0.7))" }}>
                  {count} новых
                </span>
              )}
              <button onClick={() => setOpen(false)} className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-primary/[0.04] transition-colors">
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* Orders list */}
          <div className="max-h-[280px] overflow-y-auto">
            {loadingOrders ? (
              <div className="flex items-center justify-center py-10">
                <div className="w-5 h-5 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-10 px-4">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
                  style={{ background: "hsl(var(--muted))" }}>
                  <Bell className="w-6 h-6 text-muted-foreground/30" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">Нет новых уведомлений</p>
                <p className="text-[11px] text-muted-foreground/60 mt-1">Все заказы обработаны</p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {orders.slice(0, 5).map((order: any) => (
                  <button key={order.id}
                    onClick={() => { router.push(`/admin/orders/${order.id}`); setOpen(false); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-primary/[0.04] transition-colors group">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: "linear-gradient(135deg, hsl(var(--primary)/0.25), hsl(var(--primary)/0.08))" }}>
                      <ShoppingBag className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">
                        Заказ #{order.orderNumber}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {order.clientName || "Клиент"}
                        {order.totalAmount ? ` · ${Number(order.totalAmount).toLocaleString("ru-RU")} ₽` : ""}
                      </p>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-primary/60 transition-colors shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t glass-popup-divider">
            <button
              onClick={() => { router.push("/admin/orders?status=NEW"); setOpen(false); }}
              className="w-full text-center text-xs font-semibold py-1.5 rounded-xl transition-colors hover:bg-primary/[0.04]"
              style={{ color: "hsl(var(--primary))" }}>
              Все новые заказы →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

import { AdminLangPicker, AdminLangPickerInline } from "@/components/admin/admin-lang-picker";
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
// ✦ ARAY Control Center — единая панель уведомлений + оформления
// ══════════════════════════════════════════════════════════════════════════════

interface AdminShellProps {
  role: string;
  email: string | null | undefined;
  userName?: string | null;
  avatarUrl?: string | null;
  children: React.ReactNode;
}

const PAGE_TITLES: Record<string, string> = {
  "/admin": "",
  "/admin/orders": "Заказы",
  "/admin/crm": "CRM — Лиды",
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

function AdminShellInner({ role, email, userName, avatarUrl, children }: AdminShellProps) {
  const [open, setOpen] = useState(false);
  const [mobileSettingsOpen, setMobileSettingsOpen] = useState(false);
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
  const safeTheme = mounted ? theme : "dark"; // default to dark for SSR

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

  // Свайп от левого края → открыть меню
  const touchStartX = useRef(0);
  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
    const onTouchEnd = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - touchStartX.current;
      if (!open && touchStartX.current < 32 && dx > 60) setOpen(true);
    };
    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchend", onTouchEnd);
    };
  }, [open]);

  return (
    <div className={`flex min-h-screen relative ${classic ? "aray-classic-mode bg-background" : "aray-admin-bg aray-nature-mode"}`}
      style={classic ? undefined : { backgroundColor: "rgb(6, 8, 18)" }}>
      {/* Google Translate скрытый контейнер — переводит страницу целиком */}
      <div id="google_translate_element" style={{ position: "absolute", top: -9999, left: -9999, opacity: 0, pointerEvents: "none" }} />
      {bgMode === "video" && <LazyAdminVideoBg enabled />}
      {bgMode === "classic" && <LazyNeuralBg enabled />}
      <LazyCursorGlow />

      {/* ─── Desktop sidebar ──────────────────────────────────── */}
      <aside className="hidden lg:flex w-60 shrink-0 aray-sidebar text-white flex-col fixed top-0 left-0 h-screen z-30"
        style={{ background: sidebarBg }}>
        <div className="px-5 py-5 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3 w-full">
            {/* Avatar or initials */}
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-10 h-10 rounded-xl object-cover shrink-0 border border-white/20" />
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
              <p className="text-[10px] text-white/45 mt-0.5 leading-none truncate">{email}</p>
            </div>
            {/* Settings gear → profile page */}
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

        {/* ── Подвал сайдбара: палитра + пользователь + контролы ── */}
        <div className="shrink-0 border-t border-white/10 p-3 space-y-2">
          <AdminPwaInstall />

          {/* ── User Card — профессиональная карточка пользователя ── */}
          <div className="glass-card rounded-2xl overflow-hidden">

            {/* Верх карточки — аватар + имя + роль */}
            <div className="flex items-center gap-3 px-3 py-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0 select-none"
                style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary)/0.55))", boxShadow: "0 4px 12px hsl(var(--primary)/0.35)" }}>
                {email ? email[0].toUpperCase() : "A"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-white/90 truncate leading-tight">
                  {email ? email.split("@")[0].split(".").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ") : "Admin"}
                </p>
                <p className="text-[10px] text-white/38 truncate leading-tight mt-0.5">{email}</p>
              </div>
              {role && (
                <span className="shrink-0 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide"
                  style={{ background: "hsl(var(--primary)/0.18)", color: "hsl(var(--primary))", border: "1px solid hsl(var(--primary)/0.28)" }}>
                  {role === "SUPER_ADMIN" ? "Владелец" : role === "ADMIN" ? "Адм" : role === "MANAGER" ? "Менеджер" : role === "COURIER" ? "Курьер" : role === "ACCOUNTANT" ? "Бухгалтер" : role === "WAREHOUSE" ? "Склад" : role === "SELLER" ? "Продавец" : role === "USER" ? "Клиент" : role}
                </span>
              )}
            </div>

            {/* Нижние кнопки — ARAY Control Center + На сайт */}
            <div className="flex items-center" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
              <ArayControlCenter userRole={role} />
              <Link href="/"
                className="flex items-center justify-center gap-1 px-3 py-2.5 text-[10px] text-white/35 hover:text-white/75 hover:bg-white/[0.06] transition-colors shrink-0"
                style={{ borderLeft: "1px solid rgba(255,255,255,0.06)" }}
                title="Перейти на сайт">
                <ShoppingBag className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </aside>

      {/* ─── Mobile header убран — заменён compact sticky search bar внутри main ── */}

      {/* ─── Direct overlays via Portal — renders to document.body to avoid stacking context issues ── */}
      {(open || mobileSettingsOpen) && typeof document !== "undefined" && ReactDOM.createPortal(
        <div
          className="lg:hidden fixed inset-0 bg-black/80 backdrop-blur-sm"
          style={{ zIndex: 69 }}
          onClick={() => { setOpen(false); setMobileSettingsOpen(false); }}
          aria-hidden="true"
        />,
        document.body
      )}

      {/* ─── Mobile sidebar drawer (левый) ───────────────────── */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="lg:hidden w-72 aray-sidebar text-white flex flex-col"
          style={{
            boxShadow: "4px 0 32px rgba(0,0,0,0.4)",
            background: sidebarBg,
            backdropFilter: "blur(24px) saturate(180%)",
            WebkitBackdropFilter: "blur(24px) saturate(180%)",
          }}
          aria-describedby={undefined}>
          <div style={{ height: "env(safe-area-inset-top, 0px)", flexShrink: 0 }} />
          <div className="px-4 py-4 border-b border-white/10 flex items-center gap-3 shrink-0">
            {/* Avatar */}
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-11 h-11 rounded-xl object-cover shrink-0 border border-white/20" />
            ) : (
              <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 text-white font-bold text-base"
                style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary)/0.5))" }}>
                {userName ? userName.charAt(0).toUpperCase() : email ? email.charAt(0).toUpperCase() : "A"}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-display font-bold text-base text-white leading-tight truncate">
                {userName || (email ? email.split("@")[0] : "Пользователь")}
              </p>
              <p className="text-[10px] text-white/40 mt-0.5 truncate">{email}</p>
            </div>
            <Link href="/cabinet/profile" onClick={() => setOpen(false)}
              className="p-2 rounded-xl hover:bg-white/10 transition-colors active:scale-90 shrink-0"
              title="Настройки профиля">
              <Settings className="w-4.5 h-4.5 text-white/50" />
            </Link>
            <button onClick={() => setOpen(false)}
              className="p-2 rounded-xl hover:bg-white/10 transition-colors active:scale-90 shrink-0"
              style={{ WebkitTapHighlightColor: "transparent" }}>
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto overscroll-contain">
            <AdminNav role={role} onNavigate={() => setOpen(false)} />
          </div>
          <AdminPushPrompt />
          <div className="shrink-0 border-t border-white/10 p-3 space-y-1">
            <AdminPwaInstall />
            <div className="px-3 py-2">
              <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-white/55 mb-2">Тема</p>
              <div className="flex items-center gap-1.5 flex-wrap">
                {PALETTES.map((p) => (
                  <button key={p.id} onClick={() => setPalette(p.id)} title={p.name}
                    className={`w-7 h-7 rounded-full shrink-0 transition-all ${palette === p.id ? "ring-2 ring-white ring-offset-1 ring-offset-transparent scale-110" : "opacity-50 hover:opacity-90 hover:scale-105"}`}
                    style={{ background: `linear-gradient(135deg, ${p.sidebar} 50%, ${p.accent} 50%)` }} />
                ))}
                <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className="w-7 h-7 rounded-full shrink-0 bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all">
                  {safeTheme === "dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
            <div className="px-3 py-1 text-[11px] text-white/58 truncate">{email}</div>
            <Link href="/"
              className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-white/65 hover:text-white hover:bg-white/[0.08] transition-colors"
              onClick={() => setOpen(false)}>
              <LogOut className="w-4 h-4" />
              На сайт
            </Link>
          </div>
        </SheetContent>
      </Sheet>

      {/* ─── Mobile settings panel (правый) ──────────────────── */}
      <Sheet open={mobileSettingsOpen} onOpenChange={setMobileSettingsOpen}>
        <SheetContent side="right" className="lg:hidden w-80 aray-sidebar text-white flex flex-col"
          style={{
            boxShadow: "-4px 0 32px rgba(0,0,0,0.4)",
            background: sidebarBg,
            backdropFilter: "blur(24px) saturate(180%)",
            WebkitBackdropFilter: "blur(24px) saturate(180%)",
          }}
          aria-describedby={undefined}>
          <div style={{ height: "env(safe-area-inset-top, 0px)", flexShrink: 0 }} />

          {/* Header */}
          <div className={`px-5 py-4 flex items-center justify-between shrink-0 ${classic ? "border-b border-border" : "border-b border-white/10"}`}>
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-xl flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, hsl(var(--primary)/0.3), hsl(var(--primary)/0.1))" }}>
                <Settings className="w-3.5 h-3.5 text-primary" />
              </div>
              <p className={`font-display font-bold text-lg ${classic ? "text-foreground" : "text-white"}`}>Настройки</p>
            </div>
            <button onClick={() => setMobileSettingsOpen(false)}
              className="p-2 rounded-xl hover:bg-white/10 transition-colors active:scale-90"
              style={{ WebkitTapHighlightColor: "transparent" }}>
              <X className={`w-5 h-5 ${classic ? "text-foreground" : "text-white"}`} />
            </button>
          </div>

          {/* Settings content — links only, no duplicate controls */}
          <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-3">

            {/* Оформление — ссылка на профиль */}
            <Link href="/cabinet/profile#appearance"
              className="glass-control w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all"
              onClick={() => setMobileSettingsOpen(false)}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "linear-gradient(135deg, hsl(var(--primary)/0.3), hsl(var(--primary)/0.08))" }}>
                <Palette className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 text-left">
                <p className={`text-sm font-semibold ${classic ? "text-foreground" : "text-white/90"}`}>Оформление</p>
                <p className={`text-[11px] ${classic ? "text-muted-foreground/50" : "text-white/40"}`}>Тема, палитра, фон, шрифт</p>
              </div>
              <ArrowRight className={`w-4 h-4 ${classic ? "text-muted-foreground/30" : "text-white/30"}`} />
            </Link>

            {/* Язык — быстрый переключатель оставляем */}
            <div className="glass-card rounded-2xl p-4">
              <p className={`text-[10px] font-bold uppercase tracking-[0.18em] mb-3 ${classic ? "text-muted-foreground/50" : "text-white/40"}`}>
                Язык / Language
              </p>
              <AdminLangPickerInline />
            </div>

            {/* На сайт */}
            <Link href="/"
              className="glass-control flex items-center gap-3 px-4 py-3 rounded-2xl transition-colors"
              onClick={() => setMobileSettingsOpen(false)}>
              <LogOut className={`w-4 h-4 ${classic ? "text-muted-foreground/40" : "text-white/45"}`} />
              <span className={`text-sm ${classic ? "text-muted-foreground/70" : "text-white/60"}`}>Перейти на сайт</span>
            </Link>

            <div style={{ height: "env(safe-area-inset-bottom, 0px)" }} />

          </div>
        </SheetContent>
      </Sheet>

      {/* ─── Mobile bottom nav ───────────────────────────────── */}
      <AdminMobileBottomNav
        role={role}
        onMenuOpen={() => setOpen(true)}
        menuOpen={open}
        onArayOpen={() => window.dispatchEvent(new Event("aray:open"))}
        onSettingsOpen={() => setMobileSettingsOpen(true)}
      />

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
