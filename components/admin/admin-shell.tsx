"use client";

import { useState, useRef, useEffect } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Menu, X, LogOut, Sun, Moon, Bell, Settings, ShoppingBag,
  ArrowRight, ALargeSmall, Monitor,
} from "lucide-react";

// ── Классический режим (без фото-фона) ───────────────────────────────────────
const LS_CLASSIC = "aray-classic-mode";

function useClassicMode() {
  const [classic, setClassic] = useState(false);
  useEffect(() => {
    setClassic(localStorage.getItem(LS_CLASSIC) === "1");
    const handler = () => setClassic(localStorage.getItem(LS_CLASSIC) === "1");
    window.addEventListener("aray-classic-change", handler);
    return () => window.removeEventListener("aray-classic-change", handler);
  }, []);
  const toggle = () => {
    const next = !(localStorage.getItem(LS_CLASSIC) === "1");
    localStorage.setItem(LS_CLASSIC, next ? "1" : "0");
    window.dispatchEvent(new Event("aray-classic-change"));
  };
  return { classic, toggle };
}

// ── Звук нового заказа (Web Audio API, без файлов) ───────────────────────────
function playOrderChime() {
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
        <div className="absolute top-full right-0 mt-2 z-[70] w-80 rounded-2xl overflow-hidden animate-in slide-in-from-top-2 fade-in duration-200"
          style={{
            background: "rgba(10,14,30,0.96)",
            backdropFilter: "blur(32px) saturate(200%)",
            WebkitBackdropFilter: "blur(32px) saturate(200%)",
            border: "1px solid rgba(255,255,255,0.10)",
            boxShadow: "0 24px 64px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.03) inset",
          }}>

          {/* Panel header */}
          <div className="px-4 py-3 flex items-center justify-between"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #f59e0b33, #f59e0b11)" }}>
                <Bell className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <p className="text-sm font-semibold text-white">Уведомления</p>
            </div>
            <div className="flex items-center gap-2">
              {count > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                  style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary)/0.7))" }}>
                  {count} новых
                </span>
              )}
              <button onClick={() => setOpen(false)} className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors">
                <X className="w-3.5 h-3.5 text-white/40" />
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
                  style={{ background: "rgba(255,255,255,0.05)" }}>
                  <Bell className="w-6 h-6 text-white/15" />
                </div>
                <p className="text-sm font-medium text-white/40">Нет новых уведомлений</p>
                <p className="text-[11px] text-white/20 mt-1">Все заказы обработаны</p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {orders.slice(0, 5).map((order: any) => (
                  <button key={order.id}
                    onClick={() => { router.push(`/admin/orders/${order.id}`); setOpen(false); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-white/[0.07] transition-colors group">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: "linear-gradient(135deg, hsl(var(--primary)/0.25), hsl(var(--primary)/0.08))" }}>
                      <ShoppingBag className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white/85">
                        Заказ #{order.orderNumber}
                      </p>
                      <p className="text-[11px] text-white/40 truncate">
                        {order.clientName || "Клиент"}
                        {order.totalAmount ? ` · ${Number(order.totalAmount).toLocaleString("ru-RU")} ₽` : ""}
                      </p>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-white/20 group-hover:text-primary/60 transition-colors shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <button
              onClick={() => { router.push("/admin/orders?status=NEW"); setOpen(false); }}
              className="w-full text-center text-xs font-semibold py-1.5 rounded-xl transition-colors hover:bg-white/[0.07]"
              style={{ color: "hsl(var(--primary))" }}>
              Все новые заказы →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

import { AdminDesktopSearch, AdminSearch } from "@/components/admin/admin-search";
import { AdminNatureBg } from "@/components/admin/admin-nature-bg";
import { AdminLangPicker, AdminLangPickerInline } from "@/components/admin/admin-lang-picker";
import { useTheme } from "next-themes";
import { AdminNav } from "@/components/admin/admin-nav";
import { AdminMobileBottomNav } from "@/components/admin/admin-mobile-bottom-nav";
import { AdminPwaInstall } from "@/components/admin/admin-pwa-install";
import { AdminPushPrompt } from "@/components/admin/admin-push-prompt";
import { usePalette, PALETTES } from "@/components/palette-provider";
import { ArayWidget } from "@/components/store/aray-widget";
import { AdminLangProvider } from "@/lib/admin-lang-context";

// ── Десктопная панель настроек (тот же стиль что и мобильная) ───────────────
function AdminDesktopSettings() {
  const [open, setOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const { palette, setPalette } = usePalette();
  const { classic, toggle: toggleClassic } = useClassicMode();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        title="Настройки отображения"
        className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all group ${open ? "bg-white/15" : "hover:bg-white/10"}`}
      >
        <Settings className={`w-4 h-4 text-white/65 transition-transform duration-300 ${open ? "rotate-45" : "group-hover:rotate-45"}`} />
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-2 z-[70] w-72 rounded-2xl overflow-hidden animate-in slide-in-from-top-2 fade-in duration-150"
          style={{
            background: "rgba(10,14,30,0.97)",
            backdropFilter: "blur(32px) saturate(200%)",
            WebkitBackdropFilter: "blur(32px) saturate(200%)",
            border: "1px solid rgba(255,255,255,0.10)",
            boxShadow: "0 24px 64px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.03) inset",
          }}>

          {/* Заголовок панели */}
          <div className="px-4 py-3 flex items-center gap-2.5"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="w-7 h-7 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, hsl(var(--primary)/0.3), hsl(var(--primary)/0.08))" }}>
              <Settings className="w-3.5 h-3.5 text-primary" />
            </div>
            <p className="text-sm font-semibold text-white/85">Настройки</p>
          </div>

          {/* Контент */}
          <div className="p-4 space-y-5 max-h-[72vh] overflow-y-auto">

            {/* Язык */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/35 mb-2.5">Язык / Language</p>
              <AdminLangPickerInline />
            </div>

            {/* Шрифт */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/35 mb-2.5">Размер шрифта</p>
              <MobileFontControl />
            </div>

            {/* Тема */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/35 mb-2.5">Тема оформления</p>
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl transition-all hover:bg-white/[0.06]"
                style={{ background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(255,255,255,0.08)" }}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, rgba(167,139,250,0.3), rgba(167,139,250,0.08))" }}>
                  {theme === "dark"
                    ? <Sun className="w-4 h-4 text-violet-400" />
                    : <Moon className="w-4 h-4 text-violet-400" />}
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-white/80">{theme === "dark" ? "Тёмная тема" : "Светлая тема"}</p>
                  <p className="text-[11px] text-white/30">Нажми для переключения</p>
                </div>
                <div className="relative w-10 h-[22px] rounded-full flex-shrink-0"
                  style={{ background: theme === "dark" ? "hsl(var(--primary)/0.45)" : "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <div className="absolute top-[3px] w-4 h-4 rounded-full transition-all duration-200"
                    style={{ background: theme === "dark" ? "hsl(var(--primary))" : "rgba(255,255,255,0.5)", left: theme === "dark" ? "calc(100% - 19px)" : "3px" }} />
                </div>
              </button>
            </div>

            {/* Фон панели */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/35 mb-2.5">Оформление</p>
              <button
                onClick={toggleClassic}
                className="w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl transition-all hover:bg-white/[0.06]"
                style={{ background: "rgba(255,255,255,0.05)", border: `1.5px solid ${classic ? "hsl(var(--primary)/0.6)" : "rgba(255,255,255,0.08)"}` }}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: classic ? "hsl(var(--primary)/0.25)" : "rgba(100,120,180,0.15)" }}>
                  <Monitor className={`w-4 h-4 ${classic ? "text-primary" : "text-blue-300"}`} />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-white/80">{classic ? "Классический" : "С фото-фоном"}</p>
                  <p className="text-[11px] text-white/30">{classic ? "Чистый фон, удобно для всех" : "Красивые природные фото"}</p>
                </div>
                <div className="relative w-10 h-[22px] rounded-full flex-shrink-0"
                  style={{ background: classic ? "hsl(var(--primary)/0.45)" : "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <div className="absolute top-[3px] w-4 h-4 rounded-full transition-all duration-200"
                    style={{ background: classic ? "hsl(var(--primary))" : "rgba(255,255,255,0.4)", left: classic ? "calc(100% - 19px)" : "3px" }} />
                </div>
              </button>
            </div>

            {/* Палитра */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/35 mb-2.5">Цветовая палитра</p>
              <div className="grid grid-cols-4 gap-1.5">
                {PALETTES.map((p) => (
                  <button key={p.id} onClick={() => setPalette(p.id)} title={p.name}
                    className="flex flex-col items-center gap-1.5 py-2.5 rounded-2xl transition-all"
                    style={
                      palette === p.id
                        ? { border: "2px solid rgba(255,255,255,0.85)", background: "rgba(255,255,255,0.10)" }
                        : { border: "1.5px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.04)" }
                    }>
                    <div className="w-6 h-6 rounded-lg"
                      style={{ background: `linear-gradient(135deg, ${p.sidebar} 50%, ${p.accent} 50%)` }} />
                    <span className="text-[9px] font-medium text-white/40 truncate w-full text-center px-0.5">{p.name}</span>
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

interface AdminShellProps {
  role: string;
  email: string | null | undefined;
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
};

function usePageTitle() {
  const pathname = usePathname();
  const sorted = Object.entries(PAGE_TITLES).sort((a, b) => b[0].length - a[0].length);
  for (const [path, title] of sorted) {
    if (pathname === path || (path !== "/admin" && pathname.startsWith(path))) return title;
  }
  return "Панель управления";
}

// ── Mobile font size inline control ──────────────────────────────────────────
const FONT_SIZES = [
  { id: "xs", label: "Мини",    px: "12px",   scale: "0.857" },
  { id: "sm", label: "Компакт", px: "13px",   scale: "0.929" },
  { id: "md", label: "Обычный", px: "14px",   scale: "1" },
  { id: "lg", label: "Крупнее", px: "15.5px", scale: "1.107" },
  { id: "xl", label: "Макс",    px: "17px",   scale: "1.214" },
];
const LS_FONT = "aray-font-size";

function MobileFontControl() {
  const [active, setActive] = useState("md");
  useEffect(() => {
    const saved = localStorage.getItem(LS_FONT);
    if (saved) setActive(saved);
  }, []);

  function pick(id: string) {
    const s = FONT_SIZES.find(f => f.id === id)!;
    setActive(id);
    localStorage.setItem(LS_FONT, id);
    document.documentElement.style.setProperty("font-size", s.px);
    document.documentElement.style.setProperty("--aray-font-scale", s.scale);
  }

  return (
    <div className="flex items-end justify-between gap-1.5">
      {FONT_SIZES.map(s => (
        <button key={s.id} onClick={() => pick(s.id)}
          className="flex flex-col items-center gap-1 flex-1 py-2 rounded-2xl transition-all"
          style={
            active === s.id
              ? { background: "hsl(var(--primary)/0.2)", border: "1.5px solid hsl(var(--primary)/0.5)" }
              : { background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(255,255,255,0.08)" }
          }>
          <span style={{ fontSize: s.px, lineHeight: 1, fontWeight: 800 }}
            className={active === s.id ? "text-primary" : "text-white/50"}>A</span>
          <span className="text-[9px] font-medium text-white/40 leading-none">{s.label.slice(0, 4)}</span>
        </button>
      ))}
    </div>
  );
}

function AdminShellInner({ role, email, children }: AdminShellProps) {
  const [open, setOpen] = useState(false);
  const [mobileSettingsOpen, setMobileSettingsOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const { palette, setPalette } = usePalette();
  const { classic, toggle: toggleClassic } = useClassicMode();
  const pageTitle = usePageTitle();

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
    <div className={`flex min-h-screen relative ${classic ? "aray-classic-mode" : "aray-admin-bg aray-nature-mode"}`}
      style={classic ? undefined : { backgroundColor: "rgb(8, 12, 30)" }}>
      <AdminNatureBg enabled={!classic} />

      {/* ─── Desktop sidebar ──────────────────────────────────── */}
      <aside className="hidden lg:flex w-60 shrink-0 aray-sidebar text-white flex-col fixed top-0 left-0 h-screen z-30">
        <div className="px-5 py-5 border-b border-white/10 shrink-0">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary)/0.6))", boxShadow: "0 0 12px hsl(var(--primary)/0.5)" }}>
              <span className="text-white font-bold text-xs">П</span>
            </div>
            <div>
              <p className="font-display font-bold text-base text-white leading-none">ПилоРус</p>
              <p className="text-[10px] text-white/45 mt-0.5 leading-none">Панель управления</p>
            </div>
          </Link>
        </div>

        <AdminNav role={role} />
        <AdminPushPrompt />

        <div className="shrink-0 border-t border-white/10 p-3 space-y-1">
          <AdminPwaInstall />
          <div className="px-3 py-2">
            <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-white/55 mb-2">Тема</p>
            <div className="flex items-center gap-1 flex-wrap">
              {PALETTES.map((p) => (
                <button key={p.id} onClick={() => setPalette(p.id)} title={p.name}
                  className={`w-5 h-5 rounded-md transition-all ${palette === p.id ? "ring-2 ring-white ring-offset-1 ring-offset-transparent scale-110" : "opacity-50 hover:opacity-90 hover:scale-105"}`}
                  style={{ background: `linear-gradient(135deg, ${p.sidebar} 50%, ${p.accent} 50%)` }} />
              ))}
              <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                title={theme === "dark" ? "Светлая тема" : "Тёмная тема"}
                className="w-5 h-5 rounded-md bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all opacity-60 hover:opacity-100">
                {theme === "dark" ? <Sun className="w-3 h-3" /> : <Moon className="w-3 h-3" />}
              </button>
            </div>
          </div>
          <div className="px-3 py-1 text-[11px] text-white/58 truncate">{email}</div>
          <Link href="/"
            className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-white/65 hover:text-white hover:bg-white/[0.08] transition-colors">
            <LogOut className="w-4 h-4" />
            На сайт
          </Link>
        </div>
      </aside>

      {/* ─── Mobile header ────────────────────────────────────── */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center gap-1.5 px-2 h-14 aray-sidebar text-white"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(16px)" }}>
        <button onClick={() => setOpen(true)}
          className="p-2 rounded-xl hover:bg-white/10 transition-colors shrink-0"
          aria-label="Меню">
          <Menu className="w-5 h-5" />
        </button>
        <Link href="/admin" className="flex-1 min-w-0 px-1">
          <span className="font-display font-bold text-base leading-none">ПилоРус</span>
          <span className="text-[10px] text-white/45 ml-1.5">{pageTitle}</span>
        </Link>
        {/* Мобильный поиск */}
        <AdminSearch />
        {/* Колокол */}
        <AdminNotificationBell mobile={true} />
        {/* Настройки */}
        <button onClick={() => setMobileSettingsOpen(true)}
          className="p-2 rounded-xl hover:bg-white/10 transition-colors shrink-0">
          <Settings className="w-[18px] h-[18px] text-white/55" />
        </button>
      </header>

      {/* ─── Desktop top bar ──────────────────────────────────── */}
      <div className="hidden lg:flex fixed top-0 left-60 right-0 h-14 z-20 items-center px-5 gap-3 aray-topbar">

        {/* Акцент-полоска + заголовок — только если есть заголовок */}
        {pageTitle && (
          <>
            <div className="w-0.5 h-6 rounded-full shrink-0"
              style={{ background: "linear-gradient(180deg, hsl(var(--primary)), hsl(var(--primary)/0.3))" }} />
            <h1 className="text-lg font-bold tracking-tight leading-none shrink-0">{pageTitle}</h1>
          </>
        )}

        {/* Inline поиск — занимает свободное место */}
        <div className="flex-1 flex items-center">
          <AdminDesktopSearch />
        </div>

        {/* Уведомления */}
        <AdminNotificationBell />

        {/* Настройки (язык, шрифт, тема, палитра) */}
        <AdminDesktopSettings />

        {/* Разделитель + Аватар */}
        <div className="flex items-center gap-2.5 pl-3 border-l border-border/50 shrink-0">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-[11px] font-bold shrink-0 aray-neon-sm"
            style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary)/0.7))" }}>
            {email ? email[0].toUpperCase() : "A"}
          </div>
          <div className="hidden xl:block">
            <p className="text-[11px] font-semibold leading-none truncate max-w-[130px]">{email}</p>
            <p className="text-[10px] leading-none mt-0.5 capitalize" style={{ opacity: 0.55 }}>{role?.toLowerCase()}</p>
          </div>
        </div>
      </div>

      {/* ─── Mobile sidebar drawer (левый) ───────────────────── */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="lg:hidden w-72 aray-sidebar text-white flex flex-col"
          style={{ boxShadow: "4px 0 32px rgba(0,0,0,0.4)" }}
          aria-describedby={undefined}>
          <div style={{ height: "env(safe-area-inset-top, 0px)", flexShrink: 0 }} />
          <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between shrink-0">
            <div>
              <p className="font-display font-bold text-xl text-white">ПилоРус</p>
              <p className="text-[11px] text-white/45 mt-0.5">Панель управления</p>
            </div>
            <button onClick={() => setOpen(false)}
              className="p-2 rounded-xl hover:bg-white/10 transition-colors active:scale-90"
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
                    className={`w-6 h-6 rounded-lg transition-all ${palette === p.id ? "ring-2 ring-white ring-offset-1 ring-offset-transparent scale-110" : "opacity-50 hover:opacity-90 hover:scale-105"}`}
                    style={{ background: `linear-gradient(135deg, ${p.sidebar} 50%, ${p.accent} 50%)` }} />
                ))}
                <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className="w-6 h-6 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all">
                  {theme === "dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
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
          style={{ boxShadow: "-4px 0 32px rgba(0,0,0,0.4)" }}
          aria-describedby={undefined}>
          <div style={{ height: "env(safe-area-inset-top, 0px)", flexShrink: 0 }} />

          {/* Header */}
          <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-xl flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, hsl(var(--primary)/0.3), hsl(var(--primary)/0.1))" }}>
                <Settings className="w-3.5 h-3.5 text-primary" />
              </div>
              <p className="font-display font-bold text-lg text-white">Настройки</p>
            </div>
            <button onClick={() => setMobileSettingsOpen(false)}
              className="p-2 rounded-xl hover:bg-white/10 transition-colors active:scale-90"
              style={{ WebkitTapHighlightColor: "transparent" }}>
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Settings content */}
          <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-6">

            {/* Язык */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/40 mb-3">
                Язык / Language
              </p>
              <AdminLangPickerInline />
            </div>

            {/* Размер шрифта */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <ALargeSmall className="w-3.5 h-3.5 text-cyan-400" />
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">
                  Размер шрифта
                </p>
              </div>
              <MobileFontControl />
            </div>

            {/* Тема */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/40 mb-3">
                Тема
              </p>
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all"
                style={{ background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(255,255,255,0.09)" }}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, rgba(167,139,250,0.3), rgba(167,139,250,0.08))" }}>
                  {theme === "dark"
                    ? <Sun className="w-4 h-4 text-violet-400" />
                    : <Moon className="w-4 h-4 text-violet-400" />}
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold text-white/85">
                    {theme === "dark" ? "Тёмная тема" : "Светлая тема"}
                  </p>
                  <p className="text-[11px] text-white/35">
                    Нажми чтобы переключить
                  </p>
                </div>
                <div className="w-10 h-5.5 rounded-full relative"
                  style={{
                    background: theme === "dark"
                      ? "hsl(var(--primary)/0.4)"
                      : "rgba(255,255,255,0.15)",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}>
                  <div className="absolute top-0.5 w-4 h-4 rounded-full transition-all duration-200"
                    style={{
                      background: theme === "dark" ? "hsl(var(--primary))" : "rgba(255,255,255,0.5)",
                      left: theme === "dark" ? "calc(100% - 18px)" : "2px",
                    }} />
                </div>
              </button>
            </div>

            {/* Классический режим */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/40 mb-3">Оформление</p>
              <button
                onClick={toggleClassic}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all"
                style={{ background: "rgba(255,255,255,0.06)", border: `1.5px solid ${classic ? "hsl(var(--primary)/0.6)" : "rgba(255,255,255,0.09)"}` }}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: classic ? "hsl(var(--primary)/0.25)" : "rgba(100,120,180,0.15)" }}>
                  <Monitor className={`w-4 h-4 ${classic ? "text-primary" : "text-blue-300"}`} />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold text-white/85">{classic ? "Классический" : "С фото-фоном"}</p>
                  <p className="text-[11px] text-white/35">{classic ? "Чистый фон" : "Природные фото"}</p>
                </div>
                <div className="relative w-10 h-[22px] rounded-full flex-shrink-0"
                  style={{ background: classic ? "hsl(var(--primary)/0.45)" : "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <div className="absolute top-[3px] w-4 h-4 rounded-full transition-all duration-200"
                    style={{ background: classic ? "hsl(var(--primary))" : "rgba(255,255,255,0.4)", left: classic ? "calc(100% - 19px)" : "3px" }} />
                </div>
              </button>
            </div>

            {/* Палитра */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/40 mb-3">
                Цветовая палитра
              </p>
              <div className="grid grid-cols-4 gap-2">
                {PALETTES.map((p) => (
                  <button key={p.id} onClick={() => setPalette(p.id)} title={p.name}
                    className="flex flex-col items-center gap-1.5 py-2.5 rounded-2xl transition-all"
                    style={
                      palette === p.id
                        ? { border: "2px solid white", background: "rgba(255,255,255,0.1)" }
                        : { border: "1.5px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)" }
                    }>
                    <div className="w-6 h-6 rounded-lg"
                      style={{ background: `linear-gradient(135deg, ${p.sidebar} 50%, ${p.accent} 50%)` }} />
                    <span className="text-[9px] font-medium text-white/45 leading-none truncate w-full text-center px-1">
                      {p.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* На сайт */}
            <Link href="/"
              className="flex items-center gap-3 px-4 py-3 rounded-2xl transition-colors hover:bg-white/[0.07]"
              style={{ background: "rgba(255,255,255,0.04)", border: "1.5px solid rgba(255,255,255,0.07)" }}
              onClick={() => setMobileSettingsOpen(false)}>
              <LogOut className="w-4 h-4 text-white/45" />
              <span className="text-sm text-white/60">Перейти на сайт</span>
            </Link>

            <div style={{ height: "env(safe-area-inset-bottom, 0px)" }} />

          </div>
        </SheetContent>
      </Sheet>

      {/* ─── Mobile bottom tab bar ────────────────────────────── */}
      <AdminMobileBottomNav role={role} onMenuOpen={() => setOpen(true)} menuOpen={open} />

      {/* ─── Main content ─────────────────────────────────────── */}
      <main className="flex-1 min-w-0 overflow-auto lg:ml-60 relative z-[5]">
        <div className="pt-14 lg:pb-0" style={{ paddingBottom: "calc(96px + max(12px, env(safe-area-inset-bottom, 12px)))" }}>
          <div className="p-4 lg:p-6">{children}</div>
        </div>
      </main>

      <ArayWidget page="admin" enabled={true} />
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
