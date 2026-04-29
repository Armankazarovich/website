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

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Search, Sparkles, ChevronLeft, RefreshCw, MoreVertical,
  LayoutDashboard, ShoppingBag, Plus, Target, Zap, CheckSquare,
  Truck, Package, Tag, Warehouse, FileDown, Images, Megaphone,
  Star, Mail, TrendingUp, Wallet, UserCircle, HeartPulse, Globe,
  Settings, Palette, BarChart2, Stamp, Users, Bell, HelpCircle,
  Receipt, FlaskConical, BookOpen, Wrench, Heart, History,
  Sun, Moon,
} from "lucide-react";
import { motion } from "framer-motion";
import { useTheme } from "next-themes";
import { AdminMobileBottomNav } from "@/components/admin/admin-mobile-bottom-nav";
import { AccessGuard } from "@/components/admin/access-guard";
import { LazyAdminAray } from "@/components/admin/lazy-components";
import { AppHeader } from "@/components/layout/app-header";
import { AdminSearchPanel } from "@/components/admin/admin-search-panel";
import { AdminNavRail } from "@/components/admin/admin-nav-rail";
import { AdminPageActionsProvider, useAdminPageActionsState, type AdminAction } from "@/components/admin/admin-page-actions";
import { useAdminLang, AdminLangProvider } from "@/lib/admin-lang-context";
import { usePalette, PALETTES } from "@/components/palette-provider";
import { useAccountDrawer } from "@/store/account-drawer";
import { UI_LAYERS } from "@/lib/ui-layers";

// ── Ключи localStorage (сохраняются для других компонентов) ──
const LS_CLASSIC = "aray-classic-mode";
const LS_BG_MODE = "aray-bg-mode";
export const LS_FONT = "aray-font-size";
const LS_ADMIN_NAV_EXPANDED = "admin-nav-expanded";

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

function AdminShellInner({ role, email, userName, children }: AdminShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [searchOpen, setSearchOpen] = useState(false);
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const { palette } = usePalette();
  const { toggle: toggleAccount } = useAccountDrawer();
  const pageMeta = usePageMeta();
  const { onRefresh, actions } = useAdminPageActionsState();
  const showBack = !ROOT_ROUTES.has(pathname);
  const [navExpanded, setNavExpanded] = useState(true);
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
  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem(LS_ADMIN_NAV_EXPANDED);
    if (saved !== null) setNavExpanded(saved === "1");
  }, []);
  const setNavExpandedPersisted = (next: boolean) => {
    setNavExpanded(next);
    localStorage.setItem(LS_ADMIN_NAV_EXPANDED, next ? "1" : "0");
  };

  // ── Аватар пользователя ──
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/cabinet/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.avatarUrl) setAvatarUrl(d.avatarUrl); })
      .catch(() => {});
  }, []);

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

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* ─── Стеклянный sticky хедер ──────────────────── */}
      <AppHeader
        containerClassName={`max-w-none px-3 sm:px-5 lg:pr-8 ${navExpanded ? "lg:pl-72" : "lg:pl-20"}`}
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
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary/15 transition-colors">
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
                <p className="font-display font-bold text-base lg:text-lg leading-none text-foreground truncate tracking-wide">
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

            {/* Переключатель темы (только когда mounted — избегаем SSR mismatch) */}
            {mounted && (
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                type="button"
                aria-label={theme === "dark" ? "Светлая тема" : "Тёмная тема"}
                title={theme === "dark" ? "Светлая тема" : "Тёмная тема"}
                className="hidden sm:flex w-10 h-10 rounded-xl items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors shrink-0"
              >
                {theme === "dark" ? (
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
            {actions.length > 0 && (
              <div className="hidden md:flex items-center gap-1.5 ml-1.5 pl-1.5 border-l border-border/60">
                <HeaderActions
                  actions={actions}
                  menuOpen={actionsMenuOpen}
                  setMenuOpen={setActionsMenuOpen}
                />
              </div>
            )}
            {actions.length > 0 && (
              <div className="md:hidden flex items-center gap-1.5">
                <HeaderActions
                  actions={actions}
                  menuOpen={actionsMenuOpen}
                  setMenuOpen={setActionsMenuOpen}
                />
              </div>
            )}
          </div>
        }
      />

      {/* ─── Узкий рельс слева (lg+ только) ───────────── */}
      <AdminNavRail
        role={role}
        avatarUrl={avatarUrl}
        userName={userName}
        email={email}
        expanded={navExpanded}
        onExpandedChange={setNavExpandedPersisted}
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
        className={`flex-1 min-w-0 max-w-full overflow-x-clip relative ${UI_LAYERS.content} px-3 sm:px-5 lg:px-8 py-5 lg:py-7 transition-[margin] duration-200 ${
          navExpanded ? "lg:ml-64" : "lg:ml-16"
        }`}
        style={{ paddingBottom: "max(calc(88px + env(safe-area-inset-bottom, 16px)), 88px)" }}
      >
        <AccessGuard role={role}>{children}</AccessGuard>
      </main>

      {/* ─── Mobile bottom nav (с Арай-орбом) ─────────── */}
      <AdminMobileBottomNav
        role={role}
        onArayOpen={() => window.dispatchEvent(new Event("aray:open"))}
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
      <LazyAdminAray
        placement="left"
        staffName={userName || (email && !email.startsWith("info") ? email.split("@")[0] : null) || "Коллега"}
        userRole={role}
      />
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

  const primary = actions.find((a) => a.variant === "primary" && !a.hideOnMobile);
  const mobileOthers = actions.filter((a) => !a.hideOnMobile && a !== primary);

  return (
    <>
      {/* Desktop md+: все кнопки в ряд */}
      <div className="hidden md:flex items-center gap-2">
        {actions.map((a) => {
          const Icon = a.icon;
          const isPrimary = a.variant === "primary";
          return (
            <button
              key={a.id}
              type="button"
              onClick={a.onClick}
              disabled={a.disabled}
              aria-label={a.label}
              title={a.label}
              className={
                isPrimary
                  ? "inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  : "inline-flex items-center gap-2 h-10 px-3.5 rounded-xl border border-border text-foreground hover:bg-muted/60 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              }
            >
              <Icon className="w-[18px] h-[18px] shrink-0" strokeWidth={isPrimary ? 2 : 1.75} />
              <span className="hidden lg:inline">{a.label}</span>
            </button>
          );
        })}
      </div>

      {/* Mobile <md: primary видна, остальные в overflow */}
      <div className="md:hidden flex items-center gap-1.5">
        {primary && (
          <button
            type="button"
            onClick={primary.onClick}
            disabled={primary.disabled}
            aria-label={primary.label}
            title={primary.label}
            className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50 shrink-0"
          >
            <primary.icon className="w-[18px] h-[18px]" strokeWidth={2} />
          </button>
        )}
        {mobileOthers.length > 0 && (
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
              <div className="absolute right-0 top-full mt-2 w-56 bg-card border border-border rounded-2xl shadow-2xl py-1 z-50">
                {mobileOthers.map((a) => {
                  const Icon = a.icon;
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => { setMenuOpen(false); a.onClick(); }}
                      disabled={a.disabled}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-accent transition-colors text-left disabled:opacity-50"
                    >
                      <Icon className="w-4 h-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
                      <span className="flex-1 truncate">{a.label}</span>
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
