// Кэш категорий/настроек на 60 секунд (ISR вместо force-dynamic)
export const revalidate = 60;

import React from "react";
import dynamic from "next/dynamic";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { RouteTransition } from "@/components/layout/route-transition";
import { StoreSettingsProvider } from "@/lib/store-settings-context";
import { getStoreShellData } from "@/lib/store-shell-data";
import { getPublicStoreStories } from "@/lib/store-stories";
import { DEFAULT_TENANT_ID } from "@/lib/tenant-context";

// ── Lazy-load тяжёлых клиентских компонентов (не блокируют первую отрисовку) ──
const ArayGlobalAssistant = dynamic(
  () =>
    import("@/components/store/aray-global-assistant").then((m) => ({
      default: m.ArayGlobalAssistant,
    })),
  { ssr: false },
);
const SideIconRail = dynamic(
  () =>
    import("@/components/store/side-icon-rail").then((m) => ({
      default: m.SideIconRail,
    })),
  { ssr: false },
);
const MobileBottomNav = dynamic(
  () =>
    import("@/components/store/mobile-bottom-nav").then((m) => ({
      default: m.MobileBottomNav,
    })),
  { ssr: false },
);
const CompareDock = dynamic(
  () =>
    import("@/components/store/compare-dock").then((m) => ({
      default: m.CompareDock,
    })),
  { ssr: false },
);
const StoriesWidget = dynamic(
  () =>
    import("@/components/store/stories-widget").then((m) => ({
      default: m.StoriesWidget,
    })),
  { ssr: false },
);
const AccountDrawerMount = dynamic(
  () =>
    import("@/components/store/account-drawer-mount").then((m) => ({
      default: m.AccountDrawerMount,
    })),
  { ssr: false },
);
const FiltersDrawer = dynamic(
  () =>
    import("@/components/store/filters-drawer").then((m) => ({
      default: m.FiltersDrawer,
    })),
  { ssr: false },
);
const SearchDrawer = dynamic(
  () =>
    import("@/components/store/search-drawer").then((m) => ({
      default: m.SearchDrawer,
    })),
  { ssr: false },
);
const CartDrawer = dynamic(
  () =>
    import("@/components/store/cart-drawer").then((m) => ({
      default: m.CartDrawer,
    })),
  { ssr: false },
);
const CookieConsent = dynamic(
  () =>
    import("@/components/store/cookie-consent").then((m) => ({
      default: m.CookieConsent,
    })),
  { ssr: false },
);
const PwaInstall = dynamic(
  () =>
    import("@/components/store/pwa-install").then((m) => ({
      default: m.PwaInstall,
    })),
  { ssr: false },
);
const ScrollToTop = dynamic(
  () =>
    import("@/components/ui/scroll-to-top").then((m) => ({
      default: m.ScrollToTop,
    })),
  { ssr: false },
);

export default async function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const {
    categories,
    footerCategories,
    siteSettings,
    phones,
    workingHours,
    megaMenuTypes,
    megaMenuSizes,
    photoAspect,
    cardStyle,
    arayEnabled,
  } = await getStoreShellData(DEFAULT_TENANT_ID);
  const stories = await getPublicStoreStories({ take: 18, tenantId: DEFAULT_TENANT_ID });

  return (
    <StoreSettingsProvider cardStyle={cardStyle} photoAspect={photoAspect}>
      <div
        className="flex min-h-screen flex-col"
        style={{ "--photo-aspect": photoAspect } as React.CSSProperties}
      >
        {/* Хедер — критичный для LCP, рендерим сразу */}
        <Header
          categories={categories}
          phones={phones}
          workingHours={workingHours}
          dynamicTypes={megaMenuTypes}
          dynamicSizes={megaMenuSizes}
        />
        <main className="store-shell-main flex-1 pb-[calc(5.75rem+env(safe-area-inset-bottom,0px))] sm:pb-0">
          <RouteTransition surface="store">{children}</RouteTransition>
        </main>
        <Footer settings={siteSettings} categories={footerCategories} />

        {/* Навигация для разных размеров экрана:
          - MobileBottomNav (<640px) — нижнее меню с Араем в центре
          - SideIconRail (640-1023px) — колонка иконок справа
          - ArayGlobalAssistant (≥1024px dock + panel) — один ARAY UI для всех зон
          - Header мега-меню (≥1024px) — в шапке */}
        <MobileBottomNav arayEnabled={arayEnabled} />
        <CompareDock />
        <StoriesWidget initialStories={stories} />
        <SideIconRail />
        <ArayGlobalAssistant enabled={arayEnabled} />

        {/* Всё остальное — lazy (не блокирует первую отрисовку) */}
        <CookieConsent />
        <PwaInstall />
        <AccountDrawerMount />
        <FiltersDrawer />
        <SearchDrawer />
        <CartDrawer />
        <ScrollToTop />
      </div>
    </StoreSettingsProvider>
  );
}
