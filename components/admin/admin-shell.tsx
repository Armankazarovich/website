"use client";

/**
 * AdminShell — единая оболочка админки и кабинета.
 *
 * Сессия 39 (28.04.2026): полный переезд на дизайн-систему магазина.
 * Удалено:
 *  - старый широкий sidebar 240px с aray-sidebar стилем
 *  - LazyNeuralBg, LazyAdminVideoBg, LazyCursorGlow (тёмный neural/видео фон)
 *  - классы aray-classic-mode / aray-nature-mode на body
 *  - MobileMenuBottomSheet (заменён единым AdminMenuPopup)
 *  - AdminPushPrompt, AdminSidebarWeather, AdminPwaInstall из sidebar
 *  - InlineSettingsPanel
 *
 * Добавлено:
 *  - AppHeader (стеклянный sticky из магазина) сверху на всех экранах
 *  - AdminMenuPopup (попап-меню в стиле магазинного search-modal)
 *  - Cmd/Ctrl+K — глобальный hotkey для открытия меню
 *
 * Сохранено:
 *  - useClassicMode / playOrderChime / LS_FONT экспорты (используются другими)
 *  - AdminMobileBottomNav (нижний dock на мобилке с Арай-орбом)
 *  - ArayControlCenter (sticky справа — пока не трогаем)
 *  - LazyAdminAray (плавающий Арай)
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu, Search, Sparkles, ExternalLink, ChevronRight,
} from "lucide-react";
import { useTheme } from "next-themes";
import { AdminMobileBottomNav } from "@/components/admin/admin-mobile-bottom-nav";
import { AccessGuard } from "@/components/admin/access-guard";
import { LazyAdminAray } from "@/components/admin/lazy-components";
import { AppHeader } from "@/components/layout/app-header";
import { AdminMenuPopup } from "@/components/admin/admin-menu-popup";
import { useAdminLang, AdminLangProvider } from "@/lib/admin-lang-context";
import { usePalette, PALETTES } from "@/components/palette-provider";
import { ArayControlCenter } from "@/components/admin/aray-control-center";

// ── Ключи localStorage (сохраняются для других компонентов) ──
const LS_CLASSIC = "aray-classic-mode";
const LS_BG_MODE = "aray-bg-mode";
export const LS_FONT = "aray-font-size";

type BgMode = "classic" | "video";

/**
 * useClassicMode — экспортируется для других компонентов (aray-control-center,
 * admin-mobile-settings). В новом AdminShell не используется напрямую — фон
 * теперь чистый bg-background.
 */
export function useClassicMode() {
  const [bgMode, setBgMode] = useState<BgMode>("classic");
  const [isLight, setIsLight] = useState(false);
  useEffect(() => {
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
    const checkLight = () => {
      const html = document.documentElement;
      setIsLight(
        html.classList.contains("light") ||
        html.getAttribute("data-theme") === "light" ||
        (!html.classList.contains("dark") && window.matchMedia("(prefers-color-scheme: light)").matches)
      );
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
    localStorage.setItem(LS_CLASSIC, mode === "classic" ? "1" : "0");
    window.dispatchEvent(new Event("aray-classic-change"));
  };
  const toggle = () => setBg(bgMode === "classic" ? "video" : "classic");
  const classic = isLight || bgMode === "classic";
  return { classic, rawClassic: bgMode === "classic", bgMode: isLight ? "classic" as BgMode : bgMode, setBg, toggle };
}

/**
 * playOrderChime — звук нового заказа через Web Audio API.
 * Используется в aray-control-center и других местах.
 */
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

// ──────────────────────────────────────────────────────────────────────────
// Названия страниц по путям (для шапки)
// ──────────────────────────────────────────────────────────────────────────

const PAGE_TITLES: Record<string, { title: string; subtitle?: string }> = {
  "/admin":                  { title: "Дашборд",         subtitle: "Сводка магазина" },
  "/admin/orders":           { title: "Заказы",          subtitle: "Активные и архив" },
  "/admin/orders/new":       { title: "Новый заказ",     subtitle: "По телефону" },
  "/admin/crm":              { title: "ARAY CRM",        subtitle: "Лиды и сделки" },
  "/admin/crm/automation":   { title: "Автоматизация",   subtitle: "Тоннели" },
  "/admin/tasks":            { title: "Задачи",          subtitle: "Команда" },
  "/admin/delivery":         { title: "Доставка",        subtitle: "Маршруты и тарифы" },
  "/admin/products":         { title: "Каталог товаров", subtitle: "Товары магазина" },
  "/admin/categories":       { title: "Категории",       subtitle: "Дерево разделов" },
  "/admin/inventory":        { title: "Склад",           subtitle: "Остатки и движение" },
  "/admin/import":           { title: "Импорт / Экспорт", subtitle: "CSV, Excel" },
  "/admin/media":            { title: "Медиабиблиотека", subtitle: "Фото и документы" },
  "/admin/promotions":       { title: "Акции",           subtitle: "Скидки и предложения" },
  "/admin/reviews":          { title: "Отзывы",          subtitle: "Модерация" },
  "/admin/email":            { title: "Email рассылка",  subtitle: "Кампании" },
  "/admin/promotion":        { title: "Продвижение",     subtitle: "SEO и реклама" },
  "/admin/finance":          { title: "Финансы",         subtitle: "Доходы и расходы" },
  "/admin/clients":          { title: "Клиенты",         subtitle: "База покупателей" },
  "/admin/health":           { title: "Здоровье",        subtitle: "Состояние системы" },
  "/admin/site":             { title: "Сайт",            subtitle: "Настройки магазина" },
  "/admin/settings":         { title: "Настройки",       subtitle: "Параметры" },
  "/admin/appearance":       { title: "Оформление",      subtitle: "Темы и палитры" },
  "/admin/analytics":        { title: "Аналитика",       subtitle: "Графики и отчёты" },
  "/admin/watermark":        { title: "Водяной знак",    subtitle: "Защита фото" },
  "/admin/staff":            { title: "Команда",         subtitle: "Сотрудники" },
  "/admin/notifications":    { title: "Уведомления",     subtitle: "Push рассылка" },
  "/admin/help":             { title: "Помощь",          subtitle: "Гайды" },
  "/admin/aray":             { title: "ARAY AI",         subtitle: "Главная" },
  "/admin/aray/costs":       { title: "Расходы Арая",    subtitle: "Токены и подписки" },
  "/admin/aray-lab":         { title: "Лаборатория",     subtitle: "Эксперименты" },
  "/admin/posts":            { title: "Статьи",          subtitle: "Блог и новости" },
  "/admin/services":         { title: "Услуги",          subtitle: "Дополнительные сервисы" },
  // Кабинет
  "/cabinet":                { title: "Главная",         subtitle: "Личный кабинет" },
  "/cabinet/orders":         { title: "Мои заказы",      subtitle: "Активные и история" },
  "/cabinet/profile":        { title: "Профиль",         subtitle: "Имя, аватар, тема" },
  "/cabinet/notifications":  { title: "Уведомления",     subtitle: "Push и email" },
  "/cabinet/reviews":        { title: "Мои отзывы",      subtitle: "Что я писал" },
  "/cabinet/media":          { title: "Медиа",           subtitle: "Мои файлы" },
  "/cabinet/subscriptions":  { title: "Подписки",        subtitle: "Поставщики" },
  "/cabinet/history":        { title: "История",         subtitle: "Действия" },
  "/cabinet/appearance":     { title: "Оформление",      subtitle: "Темы и палитры" },
};

function usePageMeta(): { title: string; subtitle?: string } {
  const pathname = usePathname();
  const sorted = Object.entries(PAGE_TITLES).sort((a, b) => b[0].length - a[0].length);
  for (const [path, meta] of sorted) {
    if (pathname === path || (path !== "/admin" && path !== "/cabinet" && pathname.startsWith(path))) {
      return meta;
    }
  }
  return { title: "Панель управления" };
}

// ──────────────────────────────────────────────────────────────────────────
// AdminShell
// ──────────────────────────────────────────────────────────────────────────

interface AdminShellProps {
  role: string;
  email: string | null | undefined;
  userName?: string | null;
  children: React.ReactNode;
}

function AdminShellInner({ role, email, userName, children }: AdminShellProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { theme } = useTheme();
  const { palette } = usePalette();
  const pageMeta = usePageMeta();

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // ── Аватар пользователя ──
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/cabinet/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.avatarUrl) setAvatarUrl(d.avatarUrl); })
      .catch(() => {});
  }, []);

  // ── Cmd/Ctrl + K — глобальный hotkey ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setMenuOpen((v) => !v);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const initial =
    (userName?.charAt(0) || email?.charAt(0) || "A").toUpperCase();

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* ─── Стеклянный sticky хедер ──────────────────── */}
      <AppHeader
        leftSlot={
          <Link href="/admin" className="flex items-center gap-2.5 group">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary)/0.55))",
                boxShadow: "0 4px 16px hsl(var(--primary)/0.3)",
              }}
            >
              <Sparkles className="w-4 h-4 text-primary-foreground" strokeWidth={2.25} />
            </div>
            <div className="flex flex-col gap-0 min-w-0">
              <p className="font-display font-bold text-sm leading-none text-foreground truncate">
                {pageMeta.title}
              </p>
              {pageMeta.subtitle && (
                <p className="hidden sm:block text-[10px] text-muted-foreground leading-none mt-1 truncate">
                  {pageMeta.subtitle}
                </p>
              )}
            </div>
          </Link>
        }
        centerSlot={
          <button
            onClick={() => setMenuOpen(true)}
            className="hidden md:flex items-center gap-2 max-w-md w-full px-4 h-9 rounded-xl bg-muted/50 border border-border hover:bg-accent hover:border-primary/30 transition-all text-left text-sm text-muted-foreground group"
            aria-label="Открыть меню и поиск"
          >
            <Search className="w-4 h-4 shrink-0 group-hover:text-primary transition-colors" strokeWidth={1.75} />
            <span className="flex-1 truncate">Поиск раздела, заказа, клиента…</span>
            <span className="hidden lg:inline-flex items-center gap-1 text-[10px] text-muted-foreground/70">
              <kbd className="px-1.5 py-0.5 rounded bg-background border border-border font-mono text-[10px]">⌘</kbd>
              <kbd className="px-1.5 py-0.5 rounded bg-background border border-border font-mono text-[10px]">K</kbd>
            </span>
          </button>
        }
        rightSlot={
          <>
            <button
              onClick={() => setMenuOpen(true)}
              className="md:hidden w-10 h-10 rounded-xl flex items-center justify-center hover:bg-accent transition-colors"
              aria-label="Открыть поиск"
              type="button"
            >
              <Search className="w-[18px] h-[18px] text-muted-foreground" strokeWidth={1.75} />
            </button>
            <button
              onClick={() => setMenuOpen(true)}
              className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-accent transition-colors"
              aria-label="Открыть меню"
              type="button"
            >
              <Menu className="w-[18px] h-[18px] text-muted-foreground" strokeWidth={1.75} />
            </button>
            <Link
              href="/cabinet/profile"
              className="w-10 h-10 rounded-xl overflow-hidden ring-1 ring-border hover:ring-primary/40 transition-all shrink-0"
              aria-label="Профиль"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center text-sm font-semibold text-primary-foreground"
                  style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary)/0.6))" }}
                >
                  {initial}
                </div>
              )}
            </Link>
          </>
        }
      />

      {/* ─── Контент ──────────────────────────────────── */}
      <main className="flex-1 min-w-0 relative z-[5]">
        <div
          className="px-3 sm:px-5 lg:px-8 py-4 lg:py-6"
          style={{ paddingBottom: "max(calc(88px + env(safe-area-inset-bottom, 16px)), 88px)" }}
        >
          <AccessGuard role={role}>{children}</AccessGuard>
        </div>
      </main>

      {/* ─── Mobile bottom nav (с Арай-орбом) ─────────── */}
      <AdminMobileBottomNav
        role={role}
        onArayOpen={() => window.dispatchEvent(new Event("aray:open"))}
      />

      {/* ─── ARAY Control sticky right ───────────────── */}
      <div className="fixed right-0 top-1/2 -translate-y-1/2 z-40">
        <ArayControlCenter userRole={role} position="right" />
      </div>

      {/* ─── Меню-попап (управляется menuOpen) ────────── */}
      <AdminMenuPopup
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        role={role}
      />

      {/* ─── Плавающий Арай ───────────────────────────── */}
      <LazyAdminAray
        staffName={userName || (email && !email.startsWith("info") ? email.split("@")[0] : null) || "Коллега"}
        userRole={role}
      />
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
