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
 *  - LazyAdminArayAssistant (единый PiloRus voice-first ARAY: dock + panel)
 */

import { useState, useEffect, useLayoutEffect, useMemo, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Search,
  ChevronLeft,
  ChevronDown,
  Check,
  RefreshCw,
  MoreVertical,
  Trash2,
  Plus,
  BarChart2,
  FileCheck,
  Stethoscope,
  Store,
  ExternalLink,
  Sun,
  Moon,
  Palette,
} from "lucide-react";
import { useTheme } from "next-themes";
import { AdminMobileBottomNav } from "@/components/admin/admin-mobile-bottom-nav";
import { AccessGuard } from "@/components/admin/access-guard";
import { LazyAdminArayAssistant } from "@/components/admin/lazy-components";
import { AppHeader } from "@/components/layout/app-header";
import { RouteTransition } from "@/components/layout/route-transition";
import { AdminHeaderSearch } from "@/components/admin/admin-header-search";
import { AdminNotificationBell } from "@/components/admin/admin-notification-bell";
import { AdminNavRail } from "@/components/admin/admin-nav-rail";
import { ArayControlCenter } from "@/components/admin/aray-control-center";
import { AdminWeatherChip } from "@/components/admin/admin-weather";
import { ArayOrb } from "@/components/shared/aray-orb";
import { AdminPageActionsProvider, useAdminPageActionsState, type AdminAction } from "@/components/admin/admin-page-actions";
import { buildAdminArayNavigation } from "@/components/admin/admin-aray-navigation";
import { getAdminNavigationPageMeta } from "@/components/admin/admin-navigation-model";
import { requestArayOpen as dispatchArayOpen, type ArayOpenMode } from "@/components/store/aray-events";
import { useAdminLang, AdminLangProvider } from "@/lib/admin-lang-context";
import {
  getArayManagedSiteProfiles,
  getMultisiteAdminHref,
  getMultisitePublicHref,
} from "@/lib/multisite-sites";
import { useAdminOverlayRecovery } from "@/lib/use-admin-overlay-guard";
import { useAccountDrawer } from "@/store/account-drawer";
import { UI_LAYERS } from "@/lib/ui-layers";

// ── Ключи localStorage (сохраняются для других компонентов) ──
const LS_CLASSIC = "aray-classic-mode";
const LS_BG_MODE = "aray-bg-mode";
const LS_BG_MODE_MIGRATION = "aray-bg-clean-default-v2";
const LS_ACTIVE_SITE = "aray-active-site";
export const LS_FONT = "aray-font-size";

const LazyAdminSearchPanel = dynamic(
  () => import("@/components/admin/admin-search-panel").then((m) => ({ default: m.AdminSearchPanel })),
  { loading: () => null, ssr: false },
);

type AdminBgMode = "clean";
type BgMode = AdminBgMode | "classic";

/**
 * useClassicMode — экспортируется для других компонентов (aray-control-center,
 * admin-mobile-settings). В новом AdminShell не используется напрямую — фон
 * теперь чистый bg-background.
 */
export function useClassicMode() {
  const bgMode: AdminBgMode = "clean";
  useEffect(() => {
    localStorage.setItem(LS_BG_MODE, "clean");
    localStorage.setItem(LS_CLASSIC, "1");
    localStorage.setItem(LS_BG_MODE_MIGRATION, "1");
    const handler = () => {
      localStorage.setItem(LS_BG_MODE, "clean");
      localStorage.setItem(LS_CLASSIC, "1");
    };
    window.addEventListener("aray-classic-change", handler);
    return () => window.removeEventListener("aray-classic-change", handler);
  }, []);
  const setBg = (_mode: BgMode) => {
    localStorage.setItem(LS_BG_MODE, "clean");
    localStorage.setItem(LS_CLASSIC, "1");
    window.dispatchEvent(new Event("aray-classic-change"));
  };
  const toggle = () => setBg("clean");
  const classic = true;
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

type PageIcon = React.ElementType | "aray";
type PageMeta = { title: string; subtitle?: string; icon: PageIcon };

function usePageMeta(): PageMeta {
  const pathname = usePathname();
  return getAdminNavigationPageMeta(pathname);
}

// ──────────────────────────────────────────────────────────────────────────
// AdminShell
// ──────────────────────────────────────────────────────────────────────────

interface AdminShellProps {
  role: string;
  email: string | null | undefined;
  userName?: string | null;
  disabledModuleIds?: string[];
  initialActiveSiteId?: string | null;
  canCreateAraySite?: boolean;
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

function isAdminActionVisibleForModules(action: AdminAction, disabledModuleIds: string[]) {
  const href = action.href || "";
  if (disabledModuleIds.includes("business.terminal") && (href.startsWith("/admin/orders/new") || href.startsWith("/admin/terminals"))) {
    return false;
  }
  if (disabledModuleIds.includes("core.notifications") && href.startsWith("/admin/notifications")) {
    return false;
  }
  return true;
}

function AdminShellInner({
  role,
  email,
  userName,
  disabledModuleIds = [],
  initialActiveSiteId,
  canCreateAraySite = false,
  children,
}: AdminShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [searchOpen, setSearchOpen] = useState(false);
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false);
  const [refreshingPage, setRefreshingPage] = useState(false);
  const [arayAssistantMounted, setArayAssistantMounted] = useState(false);
  const { theme, resolvedTheme, setTheme } = useTheme();
  const { t } = useAdminLang();
  useClassicMode();
  useAdminOverlayRecovery(pathname);
  const { toggle: toggleAccount } = useAccountDrawer();
  const pageMeta = usePageMeta();
  const { onRefresh, actions, headerMeta } = useAdminPageActionsState();
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
  const headerActions = (actions.length > 0 ? actions : fallbackActions).filter((action) =>
    isAdminActionVisibleForModules(action, disabledModuleIds),
  );
  const arayNavigation = useMemo(
    () => buildAdminArayNavigation({ pathname, role, actions: headerActions, t, disabledModuleIds }),
    [disabledModuleIds, pathname, role, headerActions, t]
  );

  useEffect(() => {
    const hrefs = Array.from(new Set(
      headerActions.map((action) => action.href).filter((href): href is string => Boolean(href && href !== pathname))
    )).slice(0, 3);
    if (hrefs.length === 0) return;

    const cancel = scheduleIdleTask(() => {
      hrefs.forEach((href) => {
        try { router.prefetch(href); } catch {}
      });
    }, 5000);

    return cancel;
  }, [headerActions, pathname, router]);

  const showBack = !ROOT_ROUTES.has(pathname);
  const handleSoftRefresh = async () => {
    if (refreshingPage) return;
    setRefreshingPage(true);
    try {
      window.dispatchEvent(new CustomEvent("aray:admin-refresh", { detail: { pathname } }));
      if (onRefresh) await Promise.resolve(onRefresh());
      router.refresh();
    } finally {
      window.setTimeout(() => setRefreshingPage(false), 700);
    }
  };
  const handleBack = () => {
    if (headerMeta?.backHref) {
      router.push(headerMeta.backHref);
      return;
    }

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
    }, 3500);
    return () => {
      cancelled = true;
      cancel();
    };
  }, []);

  useEffect(() => {
    const ensureArayMounted = () => setArayAssistantMounted(true);
    window.addEventListener("aray:ensure-mounted", ensureArayMounted);
    return () => window.removeEventListener("aray:ensure-mounted", ensureArayMounted);
  }, []);

  const requestArayOpen = useCallback((mode: ArayOpenMode = "open") => {
    setArayAssistantMounted(true);
    dispatchArayOpen(mode);
  }, []);

  // ── Cmd/Ctrl + K — открывает поиск (как VS Code, Slack, Linear) ──
  const initial =
    (userName?.charAt(0) || email?.charAt(0) || "A").toUpperCase();
  const effectiveTitle = headerMeta?.title || pageMeta.title;
  const effectiveSubtitle = headerMeta?.subtitle || pageMeta.subtitle;
  const HeaderIcon = pageMeta.icon;
  const isDarkTheme = (resolvedTheme || theme) === "dark";
  const isMessengerWorkspace = pathname === "/admin/messenger";
  const mainClassName = isMessengerWorkspace
    ? `admin-content-root flex-1 min-w-0 relative ${UI_LAYERS.content} overflow-hidden p-0`
    : `admin-content-root flex-1 min-w-0 relative ${UI_LAYERS.content} lg:ml-20 px-3 sm:px-5 lg:px-8 py-5 lg:py-7`;
  const mainStyle = isMessengerWorkspace
    ? { paddingBottom: 0 }
    : { paddingBottom: "max(calc(132px + env(safe-area-inset-bottom, 16px)), 132px)" };

  return (
    <div
      className="admin-shell-root relative flex flex-col min-h-screen bg-background overflow-x-clip"
      data-admin-route={isMessengerWorkspace ? "messenger" : undefined}
    >
      {/* ─── Стеклянный sticky хедер ──────────────────── */}
      {!isMessengerWorkspace && (
        <AppHeader
          containerClassName="max-w-none px-3 sm:px-5 lg:pl-20 lg:pr-4 xl:grid xl:grid-cols-[minmax(18rem,26rem)_minmax(24rem,1fr)_auto]"
          leftSlot={
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
            {/* Кнопка «Назад» — глобальная, скрыта на корневых маршрутах */}
            {showBack && (
              <button
                onClick={handleBack}
                type="button"
                aria-label={headerMeta?.backLabel ? `Назад: ${headerMeta.backLabel}` : "Назад"}
                title={headerMeta?.backLabel ? `Назад: ${headerMeta.backLabel}` : "Назад"}
                className={`admin-header-back-button flex h-10 items-center justify-center rounded-xl border border-border/70 bg-background/35 text-muted-foreground transition-colors hover:text-foreground shrink-0 ${
                  headerMeta?.backLabel ? "w-10 xl:w-auto xl:gap-2 xl:px-2 xl:pr-2.5" : "w-10"
                }`}
              >
                <ChevronLeft className="w-4 h-4" strokeWidth={2} />
                {headerMeta?.backLabel && (
                  <span className="hidden min-w-0 flex-col items-start leading-none xl:flex">
                    <span className="text-[9px] uppercase tracking-[0.16em] text-muted-foreground/80">назад</span>
                    <span className="mt-0.5 max-w-28 truncate text-xs font-semibold text-foreground">{headerMeta.backLabel}</span>
                  </span>
                )}
              </button>
            )}

            {/* Иконка раздела + заголовок. Без route-анимации: переходы должны ощущаться мгновенными. */}
            <Link href={role === "USER" ? "/cabinet" : "/admin"} className="flex items-center gap-2.5 sm:gap-3 group min-w-0 flex-1">
              <div
                className="shrink-0"
                data-header-icon
              >
                {headerMeta?.logoSrc === "aray" ? (
                  <ArayOrb size={44} pulse="idle" intensity="normal" />
                ) : headerMeta?.logoSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={headerMeta.logoSrc}
                    alt={headerMeta.logoAlt || effectiveTitle}
                    className="h-11 w-11 rounded-full object-cover"
                  />
                ) : pageMeta.icon === "aray" ? (
                  <ArayOrb size={44} pulse="idle" intensity="normal" />
                ) : (
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl aray-icon-tone flex items-center justify-center transition-colors">
                    {/* @ts-ignore — HeaderIcon может быть "aray" или ElementType, проверка выше */}
                    <HeaderIcon className="w-5 h-5" strokeWidth={1.75} />
                  </div>
                )}
              </div>
              <div
                className="flex flex-col gap-0 min-w-0 flex-1"
              >
                <p className="font-display font-bold text-base lg:text-lg leading-none text-foreground truncate">
                  {effectiveTitle}
                </p>
                {effectiveSubtitle && (
                  <p className="hidden sm:block text-[11px] text-muted-foreground leading-none mt-1 truncate">
                    {effectiveSubtitle}
                  </p>
                )}
                {headerMeta?.badge && (
                  <span className="mt-1 hidden w-fit rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary lg:inline-flex">
                    {headerMeta.badge}
                  </span>
                )}
              </div>
            </Link>
          </div>
          }
          centerSlot={
          <div className="hidden w-full min-w-0 items-center gap-3 md:flex">
            {headerMeta?.context && (
              <div className="hidden min-w-0 flex-[0.9] min-[1180px]:block">
                {headerMeta.context}
              </div>
            )}
            <div className="min-w-0 flex-[1.45]">
              <AdminHeaderSearch
                role={role}
                disabledModuleIds={disabledModuleIds}
                onCompactSearch={() => setSearchOpen(true)}
              />
            </div>
          </div>
          }
          rightSlot={
          <div className="flex items-center gap-1.5">
            {/* Поиск — компактная иконка → открывает side-panel слева */}
            <button
              onClick={() => setSearchOpen(true)}
              type="button"
              aria-label="Поиск (Ctrl+K)"
              title="Поиск (Ctrl+K)"
              className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground md:flex xl:hidden"
            >
              <Search className="w-[18px] h-[18px]" strokeWidth={1.75} />
            </button>

            <button
              onClick={handleSoftRefresh}
              disabled={refreshingPage}
              type="button"
              aria-label="Обновить данные"
              title="Обновить данные"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-primary/[0.08] hover:text-foreground disabled:opacity-60"
            >
              <RefreshCw
                className={`w-[18px] h-[18px] ${refreshingPage ? "animate-spin" : ""}`}
                strokeWidth={1.75}
              />
            </button>

            {mounted && (
              <button
                onClick={() => setTheme(isDarkTheme ? "light" : "dark")}
                type="button"
                aria-label={isDarkTheme ? "Светлая тема" : "Тёмная тема"}
                title={isDarkTheme ? "Светлая тема" : "Тёмная тема"}
                className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground sm:flex"
              >
                {isDarkTheme ? (
                  <Sun className="w-[18px] h-[18px]" strokeWidth={1.75} />
                ) : (
                  <Moon className="w-[18px] h-[18px]" strokeWidth={1.75} />
                )}
              </button>
            )}

            {role !== "USER" && !disabledModuleIds.includes("core.notifications") && (
              <div className="block">
                <AdminNotificationBell role={role} />
              </div>
            )}

            <div className="block">
              <ArayControlCenter userRole={role} position="header" />
            </div>

            <Link
              href="/admin/appearance"
              aria-label="Оформление"
              title="Оформление"
              className="hidden"
            >
              <Palette className="w-[18px] h-[18px]" strokeWidth={1.75} />
            </Link>

            {/* Аккаунт — открывает AccountDrawer */}
            <button
              onClick={toggleAccount}
              type="button"
              aria-label="Аккаунт"
              title={userName || email || "Аккаунт"}
              className="hidden h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl transition-colors hover:bg-muted/60 sm:flex"
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
      )}

      {!isMessengerWorkspace && (
        <div className="relative z-[5] lg:hidden px-3 pt-3 -mb-2">
          <AdminWeatherChip variant="mobile" />
        </div>
      )}

      {/* ─── Узкий рельс слева (lg+ только) ───────────── */}
      {!isMessengerWorkspace && (
        <AdminNavRail
          role={role}
          avatarUrl={avatarUrl}
          userName={userName}
          email={email}
          disabledModuleIds={disabledModuleIds}
        />
      )}

      {/* ─── Контент ──────────────────────────────────── */}
      {/* lg:ml-16 — отступ под рельс слева. Арай работает как обычный store widget,
         поэтому справа контент больше не резервирует fixed-колонку. */}
      {/* (Сессия 41, Заход B fix): убран motion.div с key={pathname}, который
         re-mounted при каждом переходе и потенциально конфликтовал с Next.js
         client-navigation (новая страница рендерится поверх старого размонтирующегося
         элемента → клики могли проваливаться в старый слой). Анимация при смене
         страницы остаётся в leftSlot хедера (иконка + заголовок влетают). */}
      <main
        className={mainClassName}
        style={mainStyle}
      >
        <RouteTransition surface="admin" className="admin-page-transition-shell">
          <AccessGuard role={role}>{children}</AccessGuard>
        </RouteTransition>
      </main>

      {/* ─── Mobile bottom nav (с Арай-орбом) ─────────── */}
      {!isMessengerWorkspace && (
        <AdminMobileBottomNav
          role={role}
          disabledModuleIds={disabledModuleIds}
          onArayOpen={requestArayOpen}
          onSearchOpen={() => setSearchOpen(true)}
        />
      )}

      {/* ─── Поиск-панель слева (по кнопке Search или ⌘K) ── */}
      {searchOpen && (
        <LazyAdminSearchPanel
          open={searchOpen}
          onClose={() => setSearchOpen(false)}
          role={role}
          disabledModuleIds={disabledModuleIds}
        />
      )}

      {/* ─── ARAY — единый PiloRus assistant surface: dock + voice-first panel. ── */}
      {arayAssistantMounted && !isMessengerWorkspace && (
        <LazyAdminArayAssistant
          enabled
          page={pathname}
          staffName={userName || (email && !email.startsWith("info") ? email.split("@")[0] : null) || "Коллега"}
          userRole={role}
          adminNavigation={arayNavigation}
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

type AdminSiteStatus = "template" | "clone-live" | "draft";

type AdminSiteOption = {
  id: string;
  tenantId: string;
  name: string;
  title: string;
  domain: string;
  status: AdminSiteStatus;
  deploymentMode: "shared-aray" | "external-server";
  catalogSource: string;
  publicHref: string;
  adminHref: string;
};

const STATIC_ADMIN_SITE_OPTIONS: AdminSiteOption[] = getArayManagedSiteProfiles().map((site) => ({
  id: site.id,
  tenantId: site.tenantId,
  name: site.name,
  title: site.title,
  domain: site.domain,
  status: site.status,
  deploymentMode: site.deploymentMode,
  catalogSource: site.catalogSource,
  publicHref: getMultisitePublicHref(site),
  adminHref: getMultisiteAdminHref(site),
}));

function isValidAdminSiteId(value: string | null | undefined) {
  return Boolean(value && /^[a-z0-9-]{2,40}$/.test(value));
}

function normalizeAdminSiteId(value: string | null | undefined): string {
  return isValidAdminSiteId(value) ? String(value) : "pilorus";
}

function readActiveSiteCookie() {
  if (typeof document === "undefined") return null;
  const prefix = `${LS_ACTIVE_SITE}=`;
  const match = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix));
  return match ? decodeURIComponent(match.slice(prefix.length)) : null;
}

function persistActiveSite(siteId: string) {
  try {
    localStorage.setItem(LS_ACTIVE_SITE, siteId);
  } catch {}
  try {
    document.cookie = `${LS_ACTIVE_SITE}=${encodeURIComponent(siteId)}; Max-Age=31536000; Path=/; SameSite=Lax`;
  } catch {}
}

function AdminSiteSwitcher({
  variant = "wide",
  initialSiteId,
  canCreateAraySite = false,
}: {
  variant?: "wide" | "compact";
  initialSiteId?: string | null;
  canCreateAraySite?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [siteOptions, setSiteOptions] = useState<AdminSiteOption[]>(STATIC_ADMIN_SITE_OPTIONS);
  const [activeSiteId, setActiveSiteId] = useState<string>(() => normalizeAdminSiteId(initialSiteId));
  const menuRef = useRef<HTMLDivElement>(null);
  const isCompact = variant === "compact";

  useLayoutEffect(() => {
    let storedSite: string | null = null;
    try {
      storedSite = localStorage.getItem(LS_ACTIVE_SITE);
    } catch {}
    const saved = normalizeAdminSiteId(storedSite || readActiveSiteCookie());
    setActiveSiteId(saved);
    persistActiveSite(saved);
  }, []);

  useEffect(() => {
    let alive = true;

    async function loadSites() {
      try {
        const response = await fetch("/api/admin/site-constructor/sites", { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json().catch(() => ({}));
        const dynamicSites = Array.isArray(data.sites) ? data.sites : [];
        const dynamicOptions: AdminSiteOption[] = dynamicSites
          .map((site: any) => {
            const tenantId = normalizeAdminSiteId(site?.tenantId);
            if (tenantId === "pilorus" && site?.tenantId !== "pilorus") return null;
            const name = String(site?.storeName || site?.name || tenantId).trim() || tenantId;
            const domain = String(site?.domain || `${tenantId}.pilo-rus.ru`).trim();
            return {
              id: tenantId,
              tenantId,
              name,
              title: name,
              domain,
              status: site?.status === "published" ? "clone-live" : "draft",
              deploymentMode: "shared-aray",
              catalogSource: String(site?.referralSource || "ARAY CMS").trim(),
              publicHref: domain ? `https://${domain}` : `https://${tenantId}.pilo-rus.ru`,
              adminHref: "/admin",
            } satisfies AdminSiteOption;
          })
          .filter(Boolean) as AdminSiteOption[];

        const merged = new Map<string, AdminSiteOption>();
        for (const site of STATIC_ADMIN_SITE_OPTIONS) merged.set(site.id, site);
        for (const site of dynamicOptions) merged.set(site.id, { ...merged.get(site.id), ...site });

        if (!alive) return;
        setSiteOptions(Array.from(merged.values()));
      } catch {}
    }

    void loadSites();
    window.addEventListener("aray:active-site-change", loadSites);
    return () => {
      alive = false;
      window.removeEventListener("aray:active-site-change", loadSites);
    };
  }, []);

  useEffect(() => {
    const onSiteChange = (event: Event) => {
      const detail = (event as CustomEvent<{ tenantId?: string }>).detail;
      setActiveSiteId(normalizeAdminSiteId(detail?.tenantId));
    };
    window.addEventListener("aray:active-site-change", onSiteChange);
    return () => window.removeEventListener("aray:active-site-change", onSiteChange);
  }, []);

  useEffect(() => {
    const onDocClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const activeSite = siteOptions.find((site) => site.id === activeSiteId)
    || siteOptions.find((site) => site.id === "pilorus")
    || STATIC_ADMIN_SITE_OPTIONS[0];
  const chooseSite = (nextSite: AdminSiteOption) => {
    setActiveSiteId(nextSite.id);
    setOpen(false);
    persistActiveSite(nextSite.id);
    try {
      window.dispatchEvent(new CustomEvent("aray:active-site-change", {
        detail: { tenantId: nextSite.tenantId, title: nextSite.title, domain: nextSite.domain },
      }));
    } catch {}
    router.refresh();
  };

  const siteStatus = activeSite.status === "template" ? "база ARAY" : activeSite.status === "draft" ? "черновик" : "сайт ARAY";
  const deploymentStatus = activeSite.deploymentMode === "external-server" ? "отдельная установка" : "под управлением ARAY";
  const activePublicHref = activeSite.publicHref;
  const activeAdminHref = activeSite.adminHref;

  return (
    <div
      ref={menuRef}
      className={
        isCompact
          ? "relative flex shrink-0 lg:hidden"
          : "relative hidden w-44 shrink-0 lg:block min-[1320px]:w-52"
      }
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        data-admin-site-switcher-trigger
        data-admin-site-switcher-variant={variant}
        className={
          isCompact
            ? "flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-background/60 text-primary transition-colors hover:border-primary/35 hover:bg-primary/[0.035]"
            : "flex h-10 w-full items-center gap-2 rounded-xl border border-border bg-background/60 px-3 text-left text-foreground transition-colors hover:border-primary/35 hover:bg-primary/[0.035]"
        }
        aria-label="Выбрать активный сайт"
        aria-expanded={open}
        title={`Активный сайт: ${activeSite.name}`}
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-primary">
          <Store className="h-3.5 w-3.5" />
        </span>
        {!isCompact && (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-semibold leading-tight">{activeSite.name}</span>
              <span className="block truncate text-[10px] leading-tight text-muted-foreground">{siteStatus}</span>
            </span>
            <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
          </>
        )}
      </button>

      {open && (
        <div
          className={`admin-popup-liquid absolute top-full z-50 mt-2 w-[22rem] max-w-[calc(100vw-1.5rem)] rounded-2xl border border-border p-2 ${
            isCompact ? "right-0" : "left-0"
          }`}
        >
          <div className="px-2 pb-2 pt-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
              ARAY Network
            </p>
            <p className="mt-1 text-[13px] leading-5 text-foreground/80">
              Здесь только сайты, созданные и управляемые через ARAY. Внешние проекты не переключают данные этой админки.
            </p>
          </div>
          <div className="grid gap-1.5">
            {siteOptions.map((site) => {
              const selected = site.id === activeSiteId;
              return (
                <button
                  key={site.id}
                  type="button"
                  onClick={() => chooseSite(site)}
                  data-admin-site-switcher-option={site.id}
                  className={`flex min-h-16 w-full items-start gap-3 rounded-xl border px-3 py-2 text-left transition-colors ${
                    selected
                      ? "border-primary/35 bg-primary/10"
                      : "border-border bg-background/70 hover:border-primary/30 hover:bg-primary/[0.035]"
                  }`}
                >
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-primary">
                    {selected ? <Check className="h-4 w-4" /> : <Store className="h-4 w-4" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">{site.name}</span>
                      <span className="rounded-full border border-border bg-card px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                        {site.status === "template" ? "эталон" : site.status === "draft" ? "черновик" : "сайт"}
                      </span>
                      <span className="rounded-full border border-border bg-card px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                        ARAY
                      </span>
                    </span>
                    <span className="mt-1 block truncate text-xs font-medium text-foreground/80">{site.domain}</span>
                    <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
                      {site.catalogSource} · данные этого сайта
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
          <div className="mt-2 rounded-xl border border-border/70 bg-background/70 px-3 py-2 text-xs leading-5 text-muted-foreground">
            Выбран сайт: <span className="font-semibold text-foreground">{activeSite.name}</span> · {deploymentStatus}
          </div>
          {canCreateAraySite ? (
            <Link
              href="/admin/aray/orders#aray-site-import"
              className="mt-2 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary px-3 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              onClick={() => setOpen(false)}
            >
              <Plus className="h-3.5 w-3.5" />
              Добавить сайт
            </Link>
          ) : null}
          <div className="mt-2 grid grid-cols-2 gap-2 border-t border-border/70 pt-2">
            <a
              href={activePublicHref}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-border bg-background px-3 text-xs font-semibold text-foreground transition-colors hover:border-primary/35"
              onClick={() => setOpen(false)}
            >
              Сайт
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <a
              href={activeAdminHref}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-primary px-3 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              onClick={() => setOpen(false)}
            >
              Админка
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      )}
    </div>
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
      ? "inline-flex min-h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
      : "inline-flex min-h-10 items-center gap-2 rounded-xl border border-border px-3.5 text-sm text-foreground transition-colors hover:bg-muted/60 disabled:cursor-not-allowed disabled:opacity-50";

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
          const primaryClassName = "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-50";
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
              className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
            >
              <MoreVertical className="w-[18px] h-[18px]" strokeWidth={1.75} />
            </button>
            {menuOpen && (
              <div className="admin-popup-liquid absolute right-0 top-full z-50 mt-2 w-56 rounded-2xl border border-border py-1">
                {others.filter(a => !a.hideOnMobile).map((a) => {
                  const Icon = a.icon;
                  const itemClassName = "flex min-h-11 w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-accent disabled:opacity-50";
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
