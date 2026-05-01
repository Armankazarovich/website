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

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Search, Sparkles, ChevronLeft, RefreshCw, MoreVertical, Trash2,
  LayoutDashboard, ShoppingBag, Plus, Target, Zap, CheckSquare,
  Truck, Package, Tag, Warehouse, FileDown, FileCheck, Images, Megaphone,
  Star, Mail, TrendingUp, Wallet, UserCircle, HeartPulse, Globe,
  Settings, Palette, BarChart2, Stamp, Stethoscope, Users, Bell, HelpCircle,
  Receipt, FlaskConical, BookOpen, Wrench, Heart, History,
  Network, Sun, Moon,
} from "lucide-react";
import { motion } from "framer-motion";
import { useTheme } from "next-themes";
import { AdminMobileBottomNav } from "@/components/admin/admin-mobile-bottom-nav";
import { AccessGuard } from "@/components/admin/access-guard";
import { LazyAdminAray } from "@/components/admin/lazy-components";
import { AppHeader } from "@/components/layout/app-header";
import { AdminSearchPanel } from "@/components/admin/admin-search-panel";
import { AdminNavRail } from "@/components/admin/admin-nav-rail";
import { ArayControlCenter } from "@/components/admin/aray-control-center";
import { AdminWeatherChip } from "@/components/admin/admin-weather";
import { AdminAtmosphere, type AdminBgMode } from "@/components/admin/admin-atmosphere";
import { AdminPageActionsProvider, useAdminPageActionsState, type AdminAction } from "@/components/admin/admin-page-actions";
import { useAdminLang, AdminLangProvider } from "@/lib/admin-lang-context";
import { useAccountDrawer } from "@/store/account-drawer";
import { UI_LAYERS } from "@/lib/ui-layers";

// ── Ключи localStorage (сохраняются для других компонентов) ──
const LS_CLASSIC = "aray-classic-mode";
const LS_BG_MODE = "aray-bg-mode";
const LS_BG_MODE_MIGRATION = "aray-bg-clean-default-v2";
export const LS_FONT = "aray-font-size";

type BgMode = AdminBgMode | "classic";

/**
 * useClassicMode — экспортируется для других компонентов (aray-control-center,
 * admin-mobile-settings). В новом AdminShell не используется напрямую — фон
 * теперь чистый bg-background.
 */
export function useClassicMode() {
  const [bgMode, setBgMode] = useState<AdminBgMode>("clean");
  const [isLight, setIsLight] = useState(false);
  useEffect(() => {
    const legacyClassic = localStorage.getItem(LS_CLASSIC) === "1";
    let stored = localStorage.getItem(LS_BG_MODE);
    if (localStorage.getItem(LS_BG_MODE_MIGRATION) !== "1") {
      if (stored !== "clean") {
        stored = "clean";
        localStorage.setItem(LS_BG_MODE, "clean");
        localStorage.setItem(LS_CLASSIC, "1");
      }
      localStorage.setItem(LS_BG_MODE_MIGRATION, "1");
    }
    if (stored === "clean" || stored === "photo") {
      setBgMode(stored);
    } else if (stored === "video") {
      setBgMode("clean");
      localStorage.setItem(LS_BG_MODE, "clean");
    } else if (stored === "classic") {
      setBgMode("clean");
      localStorage.setItem(LS_BG_MODE, "clean");
    } else if (legacyClassic) {
      setBgMode("clean");
      localStorage.setItem(LS_BG_MODE, "clean");
    } else {
      setBgMode("clean");
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
      const m = localStorage.getItem(LS_BG_MODE);
      if (m === "clean" || m === "photo") setBgMode(m);
      if (m === "video") setBgMode("clean");
      if (m === "classic") setBgMode("clean");
    };
    window.addEventListener("aray-classic-change", handler);
    return () => { window.removeEventListener("aray-classic-change", handler); obs.disconnect(); };
  }, []);
  const setBg = (mode: BgMode) => {
    const normalized: AdminBgMode = mode === "classic" ? "clean" : mode;
    localStorage.setItem(LS_BG_MODE, normalized);
    localStorage.setItem(LS_CLASSIC, normalized === "clean" ? "1" : "0");
    window.dispatchEvent(new Event("aray-classic-change"));
  };
  const toggle = () => setBg(bgMode === "clean" ? "photo" : "clean");
  const classic = isLight || bgMode === "clean";
  return { classic, rawClassic: bgMode === "clean", bgMode, setBg, toggle };
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

type PageIcon = React.ElementType | "aray";
type PageMeta = { title: string; subtitle?: string; icon: PageIcon };

const PAGE_TITLES: Record<string, PageMeta> = {
  "/admin":                  { title: "Рабочий стол",    subtitle: "Сводка магазина",     icon: LayoutDashboard },
  "/admin/orders":           { title: "Заказы",          subtitle: "Активные и архив",    icon: ShoppingBag },
  "/admin/orders/new":       { title: "Новый заказ",     subtitle: "По телефону",         icon: Plus },
  "/admin/crm":              { title: "ARAY CRM",        subtitle: "Лиды и сделки",       icon: Target },
  "/admin/crm/automation":   { title: "Автоматизация",   subtitle: "Тоннели",             icon: Zap },
  "/admin/tasks":            { title: "Задачи",          subtitle: "Команда",             icon: CheckSquare },
  "/admin/delivery":         { title: "Доставка",        subtitle: "Маршруты и тарифы",   icon: Truck },
  "/admin/products":         { title: "Каталог товаров", subtitle: "Товары магазина",     icon: Package },
  "/admin/categories":       { title: "Категории",       subtitle: "Дерево разделов",     icon: Tag },
  "/admin/inventory":        { title: "Склад",           subtitle: "Остатки и движение",  icon: Warehouse },
  "/admin/import":           { title: "Импорт / Экспорт",subtitle: "CSV, Excel",          icon: FileDown },
  "/admin/media":            { title: "Медиабиблиотека", subtitle: "Фото и документы",    icon: Images },
  "/admin/promotions":       { title: "Акции",           subtitle: "Скидки и предложения",icon: Megaphone },
  "/admin/reviews":          { title: "Отзывы",          subtitle: "Модерация",           icon: Star },
  "/admin/email":            { title: "Email рассылка",  subtitle: "Кампании",            icon: Mail },
  "/admin/promotion":        { title: "Продвижение",     subtitle: "SEO и реклама",       icon: TrendingUp },
  "/admin/finance":          { title: "Финансы",         subtitle: "Доходы и расходы",    icon: Wallet },
  "/admin/clients":          { title: "Клиенты",         subtitle: "База покупателей",    icon: UserCircle },
  "/admin/health":           { title: "Здоровье",        subtitle: "Состояние системы",   icon: HeartPulse },
  "/admin/site":             { title: "Сайт",            subtitle: "Настройки магазина",  icon: Globe },
  "/admin/settings":         { title: "Настройки",       subtitle: "Параметры",           icon: Settings },
  "/admin/appearance":       { title: "Оформление",      subtitle: "Темы и палитры",      icon: Palette },
  "/admin/analytics":        { title: "Аналитика",       subtitle: "Графики и отчёты",    icon: BarChart2 },
  "/admin/watermark":        { title: "Водяной знак",    subtitle: "Защита фото",         icon: Stamp },
  "/admin/staff":            { title: "Команда",         subtitle: "Сотрудники",          icon: Users },
  "/admin/notifications":    { title: "Уведомления",     subtitle: "Push рассылка",       icon: Bell },
  "/admin/help":             { title: "Помощь",          subtitle: "Гайды",               icon: HelpCircle },
  "/admin/aray":             { title: "ARAY AI",         subtitle: "Главная",             icon: "aray" },
  "/admin/aray/agents":      { title: "Agent Control",   subtitle: "Отделы и качество",   icon: Network },
  "/admin/aray/costs":       { title: "Расходы Арая",    subtitle: "Токены и подписки",   icon: Receipt },
  "/admin/aray-lab":         { title: "Лаборатория",     subtitle: "Эксперименты",        icon: FlaskConical },
  "/admin/posts":            { title: "Статьи",          subtitle: "Блог и новости",      icon: BookOpen },
  "/admin/services":         { title: "Услуги",          subtitle: "Сервисы",             icon: Wrench },
  // Кабинет
  "/cabinet":                { title: "Главная",         subtitle: "Личный кабинет",      icon: LayoutDashboard },
  "/cabinet/orders":         { title: "Мои заказы",      subtitle: "Активные и история",  icon: ShoppingBag },
  "/cabinet/profile":        { title: "Профиль",         subtitle: "Имя, аватар, тема",   icon: UserCircle },
  "/cabinet/notifications":  { title: "Уведомления",     subtitle: "Push и email",        icon: Bell },
  "/cabinet/reviews":        { title: "Мои отзывы",      subtitle: "Что я писал",         icon: Star },
  "/cabinet/media":          { title: "Медиа",           subtitle: "Мои файлы",           icon: Images },
  "/cabinet/subscriptions":  { title: "Подписки",        subtitle: "Поставщики",          icon: Heart },
  "/cabinet/history":        { title: "История",         subtitle: "Действия",            icon: History },
  "/cabinet/appearance":     { title: "Оформление",      subtitle: "Темы и палитры",      icon: Palette },
};

function usePageMeta(): PageMeta {
  const pathname = usePathname();
  const sorted = Object.entries(PAGE_TITLES).sort((a, b) => b[0].length - a[0].length);
  for (const [path, meta] of sorted) {
    if (pathname === path || (path !== "/admin" && path !== "/cabinet" && pathname.startsWith(path))) {
      return meta;
    }
  }
  return { title: "Панель управления", icon: Sparkles };
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

// ── Маршруты на которых кнопка «Назад» не показывается ──
// Корневые домашние страницы — назад идти некуда
const ROOT_ROUTES = new Set([
  "/admin", "/cabinet", "/admin/aray",
]);

function scheduleIdleTask(callback: () => void, delay = 1500) {
  let cancelIdle: (() => void) | null = null;
  const timer = globalThis.setTimeout(() => {
    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      const idleId = (window as any).requestIdleCallback(callback, { timeout: 1000 });
      cancelIdle = () => (window as any).cancelIdleCallback?.(idleId);
      return;
    }

    callback();
  }, delay);

  return () => {
    globalThis.clearTimeout(timer);
    cancelIdle?.();
  };
}

function AdminShellInner({ role, email, userName, children }: AdminShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [searchOpen, setSearchOpen] = useState(false);
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false);
  const [arayMounted, setArayMounted] = useState(false);
  const [pendingArayOpen, setPendingArayOpen] = useState(false);
  const { theme, resolvedTheme, setTheme } = useTheme();
  const { bgMode } = useClassicMode();
  const { toggle: toggleAccount } = useAccountDrawer();
  const pageMeta = usePageMeta();
  const { onRefresh, actions } = useAdminPageActionsState();
  const fallbackActions = useMemo<AdminAction[]>(() => {
    if (pathname === "/admin") {
      return [
        {
          id: "dashboard-new-order",
          label: "Новый заказ",
          icon: Plus,
          variant: "primary",
          href: "/admin/orders/new",
          onClick: () => router.push("/admin/orders/new"),
        },
        {
          id: "dashboard-analytics",
          label: "Аналитика",
          icon: BarChart2,
          href: "/admin/analytics",
          onClick: () => router.push("/admin/analytics"),
        },
      ];
    }

    if (pathname === "/admin/orders") {
      return [
        {
          id: "orders-new",
          label: "Новый заказ",
          icon: Plus,
          variant: "primary",
          href: "/admin/orders/new",
          onClick: () => router.push("/admin/orders/new"),
        },
        {
          id: "orders-trash",
          label: "Корзина",
          icon: Trash2,
          href: "/admin/orders/trash",
          onClick: () => router.push("/admin/orders/trash"),
          hideOnMobile: true,
        },
      ];
    }

    if (pathname === "/admin/products") {
      return [
        {
          id: "products-new",
          label: "Новый товар",
          icon: Plus,
          variant: "primary",
          href: "/admin/products/new",
          onClick: () => router.push("/admin/products/new"),
        },
        {
          id: "products-audit",
          label: "Аудит",
          icon: Stethoscope,
          href: "/admin/products/audit",
          onClick: () => router.push("/admin/products/audit"),
          hideOnMobile: true,
        },
        {
          id: "products-import-prices",
          label: "Импорт цен",
          icon: FileCheck,
          href: "/admin/products/import-prices",
          onClick: () => router.push("/admin/products/import-prices"),
          hideOnMobile: true,
        },
      ];
    }

    return [];
  }, [pathname, router]);
  const headerActions = actions.length > 0 ? actions : fallbackActions;
  const showBack = !ROOT_ROUTES.has(pathname);
  const handleBack = () => {
    const segments = pathname.split("/").filter(Boolean);
    segments.pop();
    const fallback =
      segments.length > 0
        ? `/${segments.join("/")}`
        : role === "USER"
          ? "/cabinet"
          : "/admin";

    try {
      const ref = document.referrer ? new URL(document.referrer) : null;
      const sameOrigin = ref?.origin === window.location.origin;
      const fromWorkspace = !!ref && (ref.pathname.startsWith("/admin") || ref.pathname.startsWith("/cabinet"));
      if (sameOrigin && fromWorkspace && window.history.length > 1) {
        router.back();
        return;
      }
    } catch {}

    router.push(fallback);
  };

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;
    try {
      if (!localStorage.getItem("theme")) setTheme("dark");
    } catch {}
  }, [mounted, setTheme]);

  // ── Аватар пользователя ──
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    const cancel = scheduleIdleTask(() => {
      fetch("/api/cabinet/profile")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => { if (!cancelled && d?.avatarUrl) setAvatarUrl(d.avatarUrl); })
        .catch(() => {});
    }, 1800);
    return () => {
      cancelled = true;
      cancel();
    };
  }, []);

  useEffect(() => {
    return scheduleIdleTask(() => setArayMounted(true), 2200);
  }, []);

  useEffect(() => {
    const openAray = () => {
      setArayMounted(true);
      setPendingArayOpen(true);
    };
    window.addEventListener("aray:open", openAray);
    return () => window.removeEventListener("aray:open", openAray);
  }, []);

  useEffect(() => {
    if (!arayMounted || !pendingArayOpen) return;
    const timers = [180, 520, 1000].map((delay) =>
      window.setTimeout(() => window.dispatchEvent(new Event("aray:open")), delay)
    );
    const done = window.setTimeout(() => setPendingArayOpen(false), 1200);
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      window.clearTimeout(done);
    };
  }, [arayMounted, pendingArayOpen]);

  const requestArayOpen = () => {
    setArayMounted(true);
    setPendingArayOpen(true);
  };

  // ── Cmd/Ctrl + K — открывает поиск (как VS Code, Slack, Linear) ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const initial =
    (userName?.charAt(0) || email?.charAt(0) || "A").toUpperCase();
  const HeaderIcon = pageMeta.icon;
  const isDarkTheme = (resolvedTheme || theme) === "dark";

  return (
    <div className="admin-shell-root relative flex flex-col min-h-screen bg-background overflow-x-hidden">
      <AdminAtmosphere mode={bgMode} />
      {/* ─── Стеклянный sticky хедер ──────────────────── */}
      <AppHeader
        containerClassName="max-w-none px-3 sm:px-5 lg:pl-20 lg:pr-8"
        leftSlot={
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
            {/* Кнопка «Назад» — глобальная, скрыта на корневых маршрутах */}
            {showBack && (
              <button
                onClick={handleBack}
                type="button"
                aria-label="Назад"
                title="Назад"
                className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors shrink-0"
              >
                <ChevronLeft className="w-5 h-5" strokeWidth={2} />
              </button>
            )}

            {/* Кнопка «Обновить» — видна если страница зарегистрировала onRefresh */}
            {onRefresh && (
              <button
                onClick={() => onRefresh()}
                type="button"
                aria-label="Обновить"
                title="Обновить"
                className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors shrink-0"
              >
                <RefreshCw className="w-[18px] h-[18px]" strokeWidth={1.75} />
              </button>
            )}

            {/* Иконка раздела + заголовок с анимацией влёта при смене страницы.
               БЕЗ AnimatePresence/exit — это блокировало рендер если переход
               быстрее анимации. Только enter-анимация по key={pathname}. */}
            <Link href={role === "USER" ? "/cabinet" : "/admin"} className="flex items-center gap-2.5 sm:gap-3 group min-w-0 flex-1">
              <motion.div
                key={pathname}
                initial={{ opacity: 0, x: -8, scale: 0.85 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                transition={{ duration: 0.22, ease: [0.32, 0.72, 0.4, 1] }}
                className="shrink-0"
                data-header-icon
              >
                {pageMeta.icon === "aray" ? (
                  <img
                    src="/images/aray/face-mob.png"
                    alt="ARAY AI"
                    className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl object-cover ring-1 ring-primary/30"
                  />
                ) : (
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl aray-icon-tone flex items-center justify-center transition-colors">
                    {/* @ts-ignore — HeaderIcon может быть "aray" или ElementType, проверка выше */}
                    <HeaderIcon className="w-5 h-5" strokeWidth={1.75} />
                  </div>
                )}
              </motion.div>
              <motion.div
                key={pathname + "-text"}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22, ease: [0.32, 0.72, 0.4, 1] }}
                className="flex flex-col gap-0 min-w-0 flex-1"
              >
                <p className="font-display font-bold text-base lg:text-lg leading-none text-foreground truncate">
                  {pageMeta.title}
                </p>
                {pageMeta.subtitle && (
                  <p className="hidden sm:block text-[11px] text-muted-foreground leading-none mt-1 truncate">
                    {pageMeta.subtitle}
                  </p>
                )}
              </motion.div>
            </Link>
          </div>
        }
        centerSlot={undefined}
        rightSlot={
          <div className="flex items-center gap-1.5">
            {/* Поиск — компактная иконка → открывает side-panel слева */}
            <button
              onClick={() => setSearchOpen(true)}
              type="button"
              aria-label="Поиск (Ctrl+K)"
              title="Поиск (Ctrl+K)"
              className="w-10 h-10 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors shrink-0"
            >
              <Search className="w-[18px] h-[18px]" strokeWidth={1.75} />
            </button>

            <ArayControlCenter userRole={role} position="header" />

            {/* Переключатель темы (только когда mounted — избегаем SSR mismatch) */}
            {mounted && (
              <button
                onClick={() => setTheme(isDarkTheme ? "light" : "dark")}
                type="button"
                aria-label={isDarkTheme ? "Светлая тема" : "Тёмная тема"}
                title={isDarkTheme ? "Светлая тема" : "Тёмная тема"}
                className="hidden sm:flex w-10 h-10 rounded-xl items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors shrink-0"
              >
                {isDarkTheme ? (
                  <Sun className="w-[18px] h-[18px]" strokeWidth={1.75} />
                ) : (
                  <Moon className="w-[18px] h-[18px]" strokeWidth={1.75} />
                )}
              </button>
            )}

            {/* Аккаунт — открывает AccountDrawer */}
            <button
              onClick={toggleAccount}
              type="button"
              aria-label="Аккаунт"
              title={userName || email || "Аккаунт"}
              className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-muted/60 transition-colors shrink-0 overflow-hidden"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover ring-1 ring-primary/20" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">
                  {initial}
                </div>
              )}
            </button>

            {/* Page Actions (если страница их зарегистрировала) */}
            {headerActions.length > 0 && (
              <div className="flex items-center gap-1.5 md:ml-1.5 md:pl-1.5 md:border-l md:border-border/60">
                <HeaderActions
                  actions={headerActions}
                  menuOpen={actionsMenuOpen}
                  setMenuOpen={setActionsMenuOpen}
                />
              </div>
            )}
          </div>
        }
      />

      <div className="relative z-[5] lg:hidden px-3 pt-3 -mb-2">
        <AdminWeatherChip variant="mobile" />
      </div>

      {/* ─── Узкий рельс слева (lg+ только) ───────────── */}
      <AdminNavRail
        role={role}
        avatarUrl={avatarUrl}
        userName={userName}
        email={email}
      />

      {/* ─── Контент ──────────────────────────────────── */}
      {/* lg:ml-16 — отступ под рельс слева. Арай работает как обычный store widget,
         поэтому справа контент больше не резервирует fixed-колонку. */}
      {/* (Сессия 41, Заход B fix): убран motion.div с key={pathname}, который
         re-mounted при каждом переходе и потенциально конфликтовал с Next.js
         client-navigation (новая страница рендерится поверх старого размонтирующегося
         элемента → клики могли проваливаться в старый слой). Анимация при смене
         страницы остаётся в leftSlot хедера (иконка + заголовок влетают). */}
      <main
        className={`flex-1 min-w-0 relative ${UI_LAYERS.content} lg:ml-20 px-3 sm:px-5 lg:px-8 py-5 lg:py-7`}
        style={{ paddingBottom: "max(calc(88px + env(safe-area-inset-bottom, 16px)), 88px)" }}
      >
        <AccessGuard role={role}>{children}</AccessGuard>
      </main>

      {/* ─── Mobile bottom nav (с Арай-орбом) ─────────── */}
      <AdminMobileBottomNav
        role={role}
        onArayOpen={requestArayOpen}
      />

      {/* ─── Поиск-панель слева (по кнопке Search или ⌘K) ── */}
      <AdminSearchPanel
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        role={role}
      />

      {/* ─── Арай — тот же режим, что на сайте: обычный store widget без
            постоянной правой колонки. Открывается по aray:open и не забирает
            рабочее пространство админки. ── */}
      {arayMounted && (
        <LazyAdminAray
          placement="left"
          staffName={userName || (email && !email.startsWith("info") ? email.split("@")[0] : null) || "Коллега"}
          userRole={role}
        />
      )}
    </div>
  );
}

// (Заход B, 28.04.2026) — getArayQuickActionsForPage helper удалён вместе с
// ArayPinnedRail. Контекстные quick-actions теперь живут внутри ChatHost
// (welcome screen + getQuickActions). Если на следующих сессиях понадобятся
// per-page умные промпты — сделать helper в lib/aray-quick-actions.ts и
// передать в ChatHost через prop, а не возвращать href-навигацию (Арман:
// "кнопка должна не открывать страницу, а отправлять умный промпт Араю").

export function AdminShell(props: AdminShellProps) {
  return (
    <AdminLangProvider>
      <AdminPageActionsProvider>
        <AdminShellInner {...props} />
      </AdminPageActionsProvider>
    </AdminLangProvider>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// HeaderActions — рендер action-кнопок страницы в правом слоте хедера.
// Адаптив:
//   - md+ : до 3 кнопок видны (primary как кнопка, ghost как иконки)
//   - <md : первая primary видна как кнопка, остальные в overflow menu (⋮)
// ──────────────────────────────────────────────────────────────────────────

function HeaderActions({
  actions, menuOpen, setMenuOpen,
}: {
  actions: AdminAction[];
  menuOpen: boolean;
  setMenuOpen: (v: boolean) => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Закрыть overflow menu по клику вне
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen, setMenuOpen]);

  const visibleOnMobile = actions.filter((a) => !a.hideOnMobile);
  const primary = actions.find((a) => a.variant === "primary");
  const others = actions.filter((a) => a !== primary);
  const actionClassName = (isPrimary: boolean) =>
    isPrimary
      ? "inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      : "inline-flex items-center gap-2 h-10 px-3.5 rounded-xl border border-border text-foreground hover:bg-muted/60 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <>
      {/* Desktop md+: все кнопки в ряд */}
      <div className="hidden md:flex items-center gap-2">
        {actions.map((a) => {
          const Icon = a.icon;
          const isPrimary = a.variant === "primary";
          const content = (
            <>
              <Icon className="w-[18px] h-[18px] shrink-0" strokeWidth={isPrimary ? 2 : 1.75} />
              <span className="hidden lg:inline">{a.label}</span>
            </>
          );
          if (a.href) {
            return (
              <Link
                key={a.id}
                href={a.disabled ? "#" : a.href}
                aria-disabled={a.disabled}
                tabIndex={a.disabled ? -1 : undefined}
                aria-label={a.label}
                title={a.label}
                className={actionClassName(isPrimary)}
                onClick={(event) => {
                  if (a.disabled) event.preventDefault();
                }}
              >
                {content}
              </Link>
            );
          }
          return (
            <button
              key={a.id}
              type="button"
              onClick={a.onClick}
              disabled={a.disabled}
              aria-label={a.label}
              title={a.label}
              className={actionClassName(isPrimary)}
            >
              {content}
            </button>
          );
        })}
      </div>

      {/* Mobile <md: primary видна, остальные в overflow */}
      <div className="md:hidden flex items-center gap-1.5">
        {primary && (() => {
          const PrimaryIcon = primary.icon;
          const primaryClassName = "w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50 shrink-0";
          if (primary.href) {
            return (
              <Link
                href={primary.disabled ? "#" : primary.href}
                aria-disabled={primary.disabled}
                tabIndex={primary.disabled ? -1 : undefined}
                aria-label={primary.label}
                title={primary.label}
                className={primaryClassName}
                onClick={(event) => {
                  if (primary.disabled) event.preventDefault();
                }}
              >
                <PrimaryIcon className="w-[18px] h-[18px]" strokeWidth={2} />
              </Link>
            );
          }
          return (
            <button
              type="button"
              onClick={primary.onClick}
              disabled={primary.disabled}
              aria-label={primary.label}
              title={primary.label}
              className={primaryClassName}
            >
              <PrimaryIcon className="w-[18px] h-[18px]" strokeWidth={2} />
            </button>
          );
        })()}
        {others.length > 0 && visibleOnMobile.length > (primary ? 1 : 0) && (
          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Ещё действия"
              className="w-10 h-10 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            >
              <MoreVertical className="w-[18px] h-[18px]" strokeWidth={1.75} />
            </button>
            {menuOpen && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-card border border-border rounded-2xl shadow-lg py-1 z-50">
                {others.filter(a => !a.hideOnMobile).map((a) => {
                  const Icon = a.icon;
                  const itemClassName = "w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-accent transition-colors text-left disabled:opacity-50";
                  const itemContent = (
                    <>
                      <Icon className="w-4 h-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
                      <span className="flex-1 truncate">{a.label}</span>
                    </>
                  );
                  if (a.href) {
                    return (
                      <Link
                        key={a.id}
                        href={a.disabled ? "#" : a.href}
                        aria-disabled={a.disabled}
                        tabIndex={a.disabled ? -1 : undefined}
                        className={itemClassName}
                        onClick={(event) => {
                          setMenuOpen(false);
                          if (a.disabled) event.preventDefault();
                        }}
                      >
                        {itemContent}
                      </Link>
                    );
                  }
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => { setMenuOpen(false); a.onClick?.(); }}
                      disabled={a.disabled}
                      className={itemClassName}
                    >
                      {itemContent}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
