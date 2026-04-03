"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, LogOut, Sun, Moon, Bell } from "lucide-react";

// ── Звук нового заказа (Web Audio API, без файлов) ───────────────────────────
function playOrderChime() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    // Нота 1 — высокая
    const o1 = ctx.createOscillator(); const g1 = ctx.createGain();
    o1.connect(g1); g1.connect(ctx.destination);
    o1.type = "sine"; o1.frequency.value = 1046;
    g1.gain.setValueAtTime(0.25, ctx.currentTime);
    g1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    o1.start(ctx.currentTime); o1.stop(ctx.currentTime + 0.4);
    // Нота 2 — низкая (через 0.15с)
    const o2 = ctx.createOscillator(); const g2 = ctx.createGain();
    o2.connect(g2); g2.connect(ctx.destination);
    o2.type = "sine"; o2.frequency.value = 784;
    g2.gain.setValueAtTime(0, ctx.currentTime + 0.15);
    g2.gain.setValueAtTime(0.20, ctx.currentTime + 0.15);
    g2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    o2.start(ctx.currentTime + 0.15); o2.stop(ctx.currentTime + 0.6);
  } catch {}
}

// ── Живой колокольчик с бейджем уведомлений ──────────────────────────────────
function AdminNotificationBell({ mobile = false }: { mobile?: boolean }) {
  const [count, setCount] = useState(0);
  const prevOrderCount = useRef<number | null>(null);

  useEffect(() => {
    async function fetchCount() {
      try {
        const res = await fetch("/api/admin/notifications/count");
        if (res.ok) {
          const data = await res.json();
          const newOrders = data.newOrders ?? 0;
          const total = data.total ?? 0;
          // Звук только при увеличении числа новых заказов
          if (prevOrderCount.current !== null && newOrders > prevOrderCount.current) {
            playOrderChime();
          }
          prevOrderCount.current = newOrders;
          setCount(total);
        }
      } catch {}
    }
    fetchCount();
    const interval = setInterval(fetchCount, 30000); // каждые 30с
    return () => clearInterval(interval);
  }, []);

  if (mobile) {
    return (
      <button className="p-2 rounded-xl hover:bg-white/10 transition-colors opacity-60 shrink-0 aray-icon-spin relative">
        <Bell className="w-[18px] h-[18px]" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full text-[9px] font-bold text-white flex items-center justify-center px-1"
            style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary)/0.7))" }}>
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>
    );
  }

  return (
    <button className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-muted/80 transition-colors relative aray-icon-spin">
      <Bell className="w-4 h-4 text-muted-foreground" />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full text-[9px] font-bold text-white flex items-center justify-center px-1"
          style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary)/0.7))" }}>
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  );
}
import { AdminSearch } from "@/components/admin/admin-search";
import { AdminNatureBg } from "@/components/admin/admin-nature-bg";
import { AdminFontPicker } from "@/components/admin/admin-font-picker";
import { AdminLangPicker } from "@/components/admin/admin-lang-picker";
import { useTheme } from "next-themes";
import { AdminNav } from "@/components/admin/admin-nav";
import { AdminMobileBottomNav } from "@/components/admin/admin-mobile-bottom-nav";
import { AdminPwaInstall } from "@/components/admin/admin-pwa-install";
import { AdminPushPrompt } from "@/components/admin/admin-push-prompt";
import { usePalette, PALETTES } from "@/components/palette-provider";
import { ArayWidget } from "@/components/store/aray-widget";
import { AdminLangProvider } from "@/lib/admin-lang-context";
import { AdminDayPlanner } from "@/components/admin/admin-day-planner";
import { AdminAmbientSound } from "@/components/admin/admin-ambient-sound";

interface AdminShellProps {
  role: string;
  email: string | null | undefined;
  children: React.ReactNode;
}

// Заголовки страниц по пути
const PAGE_TITLES: Record<string, string> = {
  "/admin": "Дашборд",
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
  // Точное совпадение или по началу пути (от длинного к короткому)
  const sorted = Object.entries(PAGE_TITLES).sort((a, b) => b[0].length - a[0].length);
  for (const [path, title] of sorted) {
    if (pathname === path || (path !== "/admin" && pathname.startsWith(path))) {
      return title;
    }
  }
  return "Панель управления";
}

function AdminShellInner({ role, email, children }: AdminShellProps) {
  const [open, setOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const { palette, setPalette } = usePalette();
  const pageTitle = usePageTitle();

  // Swipe-to-open drawer
  const touchStartX = useRef(0);
  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
    const onTouchEnd = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - touchStartX.current;
      if (touchStartX.current < 32 && dx > 60) setOpen(true);   // edge swipe right → open
      if (open && dx < -60) setOpen(false);                      // swipe left → close
    };
    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => { document.removeEventListener("touchstart", onTouchStart); document.removeEventListener("touchend", onTouchEnd); };
  }, [open]);

  return (
    <div className="flex min-h-screen aray-admin-bg aray-nature-mode relative" style={{ backgroundColor: "rgb(8, 12, 30)" }}>
      {/* ─── Природный видео фон (z-0, за всем) ─────────────── */}
      <AdminNatureBg enabled={true} />

      {/* ─── Desktop sidebar ──────────────────────────────────── */}
      <aside className="hidden lg:flex w-60 shrink-0 aray-sidebar text-white flex-col fixed top-0 left-0 h-screen z-30">
        {/* Лого */}
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

        {/* Навигация */}
        <AdminNav role={role} />

        {/* Push prompt */}
        <AdminPushPrompt />

        {/* Низ — тема + выход */}
        <div className="shrink-0 border-t border-white/10 p-3 space-y-1">
          <AdminPwaInstall />

          {/* Палитра + тема */}
          <div className="px-3 py-2">
            <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-white/30 mb-2">Тема</p>
            <div className="flex items-center gap-1 flex-wrap">
              {PALETTES.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPalette(p.id)}
                  title={p.name}
                  className={`w-5 h-5 rounded-md transition-all ${
                    palette === p.id
                      ? "ring-2 ring-white ring-offset-1 ring-offset-transparent scale-110"
                      : "opacity-50 hover:opacity-90 hover:scale-105"
                  }`}
                  style={{ background: `linear-gradient(135deg, ${p.sidebar} 50%, ${p.accent} 50%)` }}
                />
              ))}
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                title={theme === "dark" ? "Светлая тема" : "Тёмная тема"}
                className="w-5 h-5 rounded-md bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all opacity-60 hover:opacity-100"
              >
                {theme === "dark" ? <Sun className="w-3 h-3" /> : <Moon className="w-3 h-3" />}
              </button>
            </div>
          </div>

          {/* Email */}
          <div className="px-3 py-1 text-[11px] text-white/35 truncate">{email}</div>

          {/* На сайт */}
          <Link
            href="/"
            className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-white/65 hover:text-white hover:bg-white/[0.08] transition-colors"
          >
            <LogOut className="w-4 h-4" />
            На сайт
          </Link>
        </div>
      </aside>

      {/* ─── Mobile header ────────────────────────────────────── */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center gap-2 px-3 h-14 aray-sidebar text-white"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(16px)" }}>
        <button
          onClick={() => setOpen(true)}
          className="p-2 rounded-xl hover:bg-white/10 transition-colors shrink-0 aray-icon-spin"
          aria-label="Меню"
        >
          <Menu className="w-5 h-5" />
        </button>
        <Link href="/admin" className="flex-1 min-w-0">
          <span className="font-display font-bold text-base leading-none">ПилоРус</span>
          <span className="text-[10px] text-white/50 ml-1.5">{pageTitle}</span>
        </Link>
        {/* Мобильный поиск */}
        <AdminSearch />
        <AdminNotificationBell mobile={true} />
      </header>

      {/* ─── Desktop top bar ──────────────────────────────────── */}
      <div className="hidden lg:flex fixed top-0 left-60 right-0 h-14 z-20 items-center px-5 gap-3 aray-topbar"
        style={{
          background: "linear-gradient(90deg, hsl(var(--primary)/0.06) 0%, transparent 40%), hsl(var(--background)/0.80)",
          backdropFilter: "blur(28px) saturate(200%)",
          WebkitBackdropFilter: "blur(28px) saturate(200%)",
          borderBottom: "1px solid hsl(var(--primary)/0.15)",
          boxShadow: "0 1px 0 hsl(var(--primary)/0.08)",
        }}>

        {/* Акцент-полоска слева */}
        <div className="w-0.5 h-5 rounded-full shrink-0" style={{ background: "linear-gradient(180deg, hsl(var(--primary)), hsl(var(--primary)/0.3))" }} />

        {/* Заголовок текущей страницы */}
        <h1 className="text-sm font-bold text-foreground flex-1 truncate tracking-tight">{pageTitle}</h1>

        {/* ── Правая группа иконок ── */}
        <div className="flex items-center gap-1">
          {/* Живой поиск */}
          <AdminSearch />
          {/* Язык */}
          <AdminLangPicker />
          {/* Размер шрифта */}
          <AdminFontPicker />
          {/* Планировщик дня */}
          <AdminDayPlanner />
          {/* Природные звуки */}
          <AdminAmbientSound />
          {/* Уведомления */}
          <AdminNotificationBell />
          {/* Тема */}
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-muted/80 transition-colors aray-icon-spin"
            title={theme === "dark" ? "Светлая тема" : "Тёмная тема"}
          >
            {theme === "dark" ? <Sun className="w-4 h-4 text-muted-foreground" /> : <Moon className="w-4 h-4 text-muted-foreground" />}
          </button>
        </div>

        {/* Аватар — отдельная группа с разделителем */}
        <div className="flex items-center gap-2.5 pl-3 border-l border-border/60">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-[11px] font-bold shrink-0 aray-neon-sm"
            style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary)/0.7))" }}>
            {email ? email[0].toUpperCase() : "A"}
          </div>
          <div className="hidden xl:block">
            <p className="text-[11px] font-semibold text-foreground leading-none truncate max-w-[130px]">{email}</p>
            <p className="text-[10px] text-muted-foreground leading-none mt-0.5 capitalize">{role?.toLowerCase()}</p>
          </div>
        </div>
      </div>

      {/* ─── Mobile drawer overlay ────────────────────────────── */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* ─── Mobile drawer ────────────────────────────────────── */}
      <div
        className={`lg:hidden fixed top-0 left-0 h-full w-72 z-50 aray-sidebar text-white flex flex-col transform transition-transform duration-300 ease-in-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ boxShadow: open ? "4px 0 32px rgba(0,0,0,0.4)" : "none" }}
      >
        {/* Шапка дравера */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between shrink-0">
          <div>
            <p className="font-display font-bold text-xl text-white">ПилоРус</p>
            <p className="text-[11px] text-white/45 mt-0.5">Панель управления</p>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="p-2 rounded-xl hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Навигация (скроллится) */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          <AdminNav role={role} onNavigate={() => setOpen(false)} />
        </div>

        <AdminPushPrompt />

        {/* Низ мобильного дравера */}
        <div className="shrink-0 border-t border-white/10 p-3 space-y-1">
          <AdminPwaInstall />
          <div className="px-3 py-2">
            <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-white/30 mb-2">Тема</p>
            <div className="flex items-center gap-1.5 flex-wrap">
              {PALETTES.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPalette(p.id)}
                  title={p.name}
                  className={`w-6 h-6 rounded-lg transition-all ${
                    palette === p.id
                      ? "ring-2 ring-white ring-offset-1 ring-offset-transparent scale-110"
                      : "opacity-50 hover:opacity-90 hover:scale-105"
                  }`}
                  style={{ background: `linear-gradient(135deg, ${p.sidebar} 50%, ${p.accent} 50%)` }}
                />
              ))}
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="w-6 h-6 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all"
              >
                {theme === "dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
          <div className="px-3 py-1 text-[11px] text-white/35 truncate">{email}</div>
          <Link
            href="/"
            className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-white/65 hover:text-white hover:bg-white/[0.08] transition-colors"
            onClick={() => setOpen(false)}
          >
            <LogOut className="w-4 h-4" />
            На сайт
          </Link>
        </div>
      </div>

      {/* ─── Mobile bottom tab bar ────────────────────────────── */}
      <AdminMobileBottomNav
        role={role}
        onMenuOpen={() => setOpen(true)}
        menuOpen={open}
      />

      {/* ─── Main content ─────────────────────────────────────── */}
      <main className="flex-1 min-w-0 overflow-auto lg:ml-60 relative z-[5]">
        {/* Отступ сверху под мобильный хедер + десктопный топбар; снизу под таббар */}
        <div className="pt-14 lg:pb-0 pb-16" style={{ paddingBottom: "calc(64px + env(safe-area-inset-bottom, 0px))" }}>
          <div className="p-4 lg:p-6">{children}</div>
        </div>
      </main>

      {/* ─── Оранжевый шар Арай (десктоп, снизу справа) ─────── */}
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
