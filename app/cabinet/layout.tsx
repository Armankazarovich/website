// Cabinet uses the same public shell as the store, with an auth guard.
export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import React from "react";
import nextDynamic from "next/dynamic";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { RouteTransition } from "@/components/layout/route-transition";
import { StoreSettingsProvider } from "@/lib/store-settings-context";
import { getStoreShellData } from "@/lib/store-shell-data";

export const metadata: Metadata = {
  title: {
    default: "Личный кабинет | ПилоРус",
    template: "%s | ПилоРус",
  },
};

const ArayGlobalAssistant = nextDynamic(
  () =>
    import("@/components/store/aray-global-assistant").then((m) => ({
      default: m.ArayGlobalAssistant,
    })),
  { ssr: false },
);
const MobileBottomNav = nextDynamic(
  () =>
    import("@/components/store/mobile-bottom-nav").then((m) => ({
      default: m.MobileBottomNav,
    })),
  { ssr: false },
);
const SideIconRail = nextDynamic(
  () =>
    import("@/components/store/side-icon-rail").then((m) => ({
      default: m.SideIconRail,
    })),
  { ssr: false },
);
const AccountDrawerMount = nextDynamic(
  () =>
    import("@/components/store/account-drawer-mount").then((m) => ({
      default: m.AccountDrawerMount,
    })),
  { ssr: false },
);
const FiltersDrawer = nextDynamic(
  () =>
    import("@/components/store/filters-drawer").then((m) => ({
      default: m.FiltersDrawer,
    })),
  { ssr: false },
);
const SearchDrawer = nextDynamic(
  () =>
    import("@/components/store/search-drawer").then((m) => ({
      default: m.SearchDrawer,
    })),
  { ssr: false },
);
const CartDrawer = nextDynamic(
  () =>
    import("@/components/store/cart-drawer").then((m) => ({
      default: m.CartDrawer,
    })),
  { ssr: false },
);
const ScrollToTop = nextDynamic(
  () =>
    import("@/components/ui/scroll-to-top").then((m) => ({
      default: m.ScrollToTop,
    })),
  { ssr: false },
);

export default async function CabinetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

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
  } = await getStoreShellData();

  return (
    <StoreSettingsProvider cardStyle={cardStyle} photoAspect={photoAspect}>
      <div
        className="flex min-h-screen flex-col"
        style={{ "--photo-aspect": photoAspect } as React.CSSProperties}
      >
        <Header
          categories={categories}
          phones={phones}
          workingHours={workingHours}
          dynamicTypes={megaMenuTypes}
          dynamicSizes={megaMenuSizes}
        />

        <main className="store-shell-main flex-1 pb-[calc(5.75rem+env(safe-area-inset-bottom,0px))] sm:pb-0">
          <RouteTransition surface="cabinet" className="container py-6">
            {children}
          </RouteTransition>
        </main>

        <Footer settings={siteSettings} categories={footerCategories} />

        {/* Same store navigation, no separate cabinet shell. */}
        <MobileBottomNav arayEnabled={arayEnabled} />
        <SideIconRail />
        <ArayGlobalAssistant enabled={arayEnabled} />
        <AccountDrawerMount />
        <FiltersDrawer />
        <SearchDrawer />
        <CartDrawer />
        <ScrollToTop />
      </div>
    </StoreSettingsProvider>
  );
}
