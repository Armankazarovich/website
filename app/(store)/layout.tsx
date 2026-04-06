export const dynamic = "force-dynamic";

import React from "react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { MobileBottomNav } from "@/components/store/mobile-bottom-nav";
import { CookieConsent } from "@/components/store/cookie-consent";
import { ScrollToTop } from "@/components/ui/scroll-to-top";
import { ArayWidget } from "@/components/store/aray-widget";
import { PwaInstall } from "@/components/store/pwa-install";
import { AccountDrawer } from "@/components/store/account-drawer";
import { FiltersDrawer } from "@/components/store/filters-drawer";
import { SearchDrawer } from "@/components/store/search-drawer";
import { CartDrawer } from "@/components/store/cart-drawer";
import { PageTransition } from "@/components/layout/page-transition";
import { prisma } from "@/lib/prisma";
import { getSiteSettings, getSetting, getPhones } from "@/lib/site-settings";
import { StoreSettingsProvider } from "@/lib/store-settings-context";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const [categories, footerCategories, siteSettings] = await Promise.all([
    prisma.category.findMany({
      where: { showInMenu: true, products: { some: { active: true } } },
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { products: { where: { active: true } } } } },
    }),
    prisma.category.findMany({
      where: { showInFooter: true, parentId: null },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, slug: true },
    }),
    getSiteSettings(),
  ]);

  const photoAspect = getSetting(siteSettings, "photo_aspect_ratio") || "1/1";
  const cardStyle = getSetting(siteSettings, "card_style") || "classic";
  const arayEnabled = getSetting(siteSettings, "aray_enabled") !== "false";

  return (
    <StoreSettingsProvider cardStyle={cardStyle} photoAspect={photoAspect}>
    <div className="flex min-h-screen flex-col" style={{ "--photo-aspect": photoAspect } as React.CSSProperties}>
      {/* Хедер на всех устройствах */}
      <Header categories={categories} phones={getPhones(siteSettings)} workingHours={getSetting(siteSettings, "working_hours") || undefined} />
      <main className="flex-1 pb-20 lg:pb-0">{children}</main>
      <Footer settings={siteSettings} categories={footerCategories} />

      <MobileBottomNav arayEnabled={arayEnabled} />
      <CookieConsent />
      <PwaInstall />
      <AccountDrawer />
      <FiltersDrawer />
      <SearchDrawer />
      <CartDrawer />
      <ScrollToTop />
      <ArayWidget
        enabled={getSetting(siteSettings, "aray_enabled") !== "false"}
      />
    </div>
    </StoreSettingsProvider>
  );
}
