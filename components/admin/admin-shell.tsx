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
  Settings, Palette, BarChart2, Stamp, Users, Bell, BellRing, HelpCircle,
  Receipt, FlaskConical, BookOpen, Wrench, Heart, History,
} from "lucide-react";
import { useTheme } from "next-themes";
import { AdminMobileBottomNav } from "@/components/admin/admin-mobile-bottom-nav";
import { AccessGuard } from "@/components/admin/access-guard";
import { LazyAdminAray } from "@/components/admin/lazy-components";
import { AppHeader } from "@/components/layout/app-header";
import { AdminSearchPanel } from "@/components/admin/admin-search-panel";
import { AdminHeaderSearch } from "@/components/admin/admin-header-search";
import { AdminNavRail } from "@/components/admin/admin-nav-rail";
import { ArayPinnedRail } from "@/components/admin/aray-pinned-rail";
import { AdminPageActionsProvider, useAdminPageActionsState, type AdminAction } from "@/components/admin/admin-page-actions";
import { useAdminLang, AdminLangProvider } from "@/lib/admin-lang-context";
import { usePalette, PALETTES } from "@/components/palette-provider";
import { ArayControlCenter } from "@/components/admin/aray-control-center";
import { useAccountDrawer } from "@/store/account-drawer";

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

type PageIcon = React.ElementType | "aray";
type PageMeta = { title: string; subtitle?: string; icon: PageIcon };

const PAGE_TITLES: Record<string, PageMeta> = {
  "/admin":                  { title: "Дашборд",         subtitle: "Сводка магазина",     icon: LayoutDashboard },
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
  const { theme } = useTheme();
  const { palette } = usePalette();
  const { toggle: toggleAccount } = useAccountDrawer();
  const pageMeta = usePageMeta();
  const { onRefresh, actions } = useAdminPageActionsState();
  const showBack = !ROOT_ROUTES.has(pathname);

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
        leftSlot={
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Кнопка «Назад» — глобальная, скрыта на корневых маршрутах */}
            {showBack && (
              <button
                onClick={() => router.back()}
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

            <Link href={role === "USER" ? "/cabinet" : "/admin"} className="flex items-center gap-3 group min-w-0">
              {pageMeta.icon === "aray" ? (
                <img
                  src="/images/aray/face-mob.png"
                  alt="ARAY AI"
                  className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl object-cover shrink-0 ring-1 ring-primary/30"
                />
              ) : (
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
                  {/* @ts-ignore — HeaderIcon может быть "aray" или ElementType, проверка выше */}
                  <HeaderIcon className="w-5 h-5" strokeWidth={1.75} />
                </div>
              )}
              <div className="flex flex-col gap-0 min-w-0">
                <p className="font-display font-bold text-base lg:text-lg leading-none text-foreground truncate tracking-wide">
                  {pageMeta.title}
                </p>
                {pageMeta.subtitle && (
                  <p className="hidden sm:block text-[11px] text-muted-foreground leading-none mt-1 truncate">
                    {pageMeta.subtitle}
                  </p>
                )}
              </div>
            </Link>
          </div>
        }
        centerSlot={
          <AdminHeaderSearch
            role={role}
            onOpenFullSearch={() => setSearchOpen(true)}
          />
        }
        rightSlot={
          actions.length > 0 ? (
            <HeaderActions
              actions={actions}
              menuOpen={actionsMenuOpen}
              setMenuOpen={setActionsMenuOpen}
            />
          ) : undefined
        }
      />

      {/* ─── Узкий рельс слева (lg+ только) ───────────── */}
      <AdminNavRail
        role={role}
        avatarUrl={avatarUrl}
        userName={userName}
        email={email}
      />

      {/* ─── Контент ──────────────────────────────────── */}
      {/* Сессия 40 hotfix: контент резиновый, Арай прикреплён fixed справа.
         lg:ml-16 — оступ под рельс 64px слева.
         lg:mr-72 / xl:mr-[24rem] / 2xl:mr-[28rem] — оступ под Арай-колонку справа.
         (на мобилке/планшете Арай скрыт → mr-0). */}
      <main className="flex-1 min-w-0 relative z-[5] lg:ml-16 lg:mr-72 xl:mr-[24rem] 2xl:mr-[28rem]">
        <div
          className="w-full px-3 sm:px-5 lg:px-8 py-5 lg:py-7"
          style={{ paddingBottom: "max(calc(88px + env(safe-area-inset-bottom, 16px)), 88px)" }}
        >
          <AccessGuard role={role}>{children}</AccessGuard>
        </div>
      </main>

      {/* ─── ARAY PINNED RAIL — fixed справа на ВСЕЙ админке ─── */}
      {/* Видение Армана (28.04.2026): Арай прикреплён справа на каждой
         странице — для удобства касанием на сенсорных мониторах/телевизорах.
         Скрыт на мобилке/планшете (<lg) — там работает AdminMobileBottomNav. */}
      <aside
        className="hidden lg:block fixed right-0 z-30"
        style={{ top: 64, height: "calc(100vh - 64px)" }}
        aria-label="Помощник Арай"
      >
        <ArayPinnedRail
          page={pathname}
          contextLabel={pageMeta.title}
          quickActions={[
            { href: "/admin/orders/new", label: "Новый заказ", icon: Plus },
            { href: "/admin/orders?status=NEW", label: "Новые заказы", icon: BellRing },
            { href: "/admin/finance", label: "Финансы", icon: Wallet },
            { href: "/admin/aray", label: "Дом Арая", icon: Sparkles },
          ]}
          inputHint="Спроси Арая по этой странице"
        />
      </aside>

      {/* ─── Mobile bottom nav (с Арай-орбом) ─────────── */}
      <AdminMobileBottomNav
        role={role}
        onArayOpen={() => window.dispatchEvent(new Event("aray:open"))}
      />

      {/* ─── ARAY Control sticky right ───────────────── */}
      <div className="fixed right-0 top-1/2 -translate-y-1/2 z-40">
        <ArayControlCenter userRole={role} position="right" />
      </div>

      {/* ─── Поиск-панель слева (по кнопке Search или ⌘K) ── */}
      <AdminSearchPanel
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
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
              <div className="absolute right-0 top-full mt-2 w-56 bg-card border border-border rounded-2xl shadow-2xl py-1 z-50">
                {others.filter(a => !a.hideOnMobile).map((a) => {
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
