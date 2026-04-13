// Кэш категорий/настроек на 60 секунд (ISR вместо force-dynamic)
export const revalidate = 60;

import React from "react";
import dynamic from "next/dynamic";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { MobileBottomNav } from "@/components/store/mobile-bottom-nav";
import { PageTransition } from "@/components/layout/page-transition";
import { prisma } from "@/lib/prisma";
import { getSiteSettings, getSetting, getPhones } from "@/lib/site-settings";
import { StoreSettingsProvider } from "@/lib/store-settings-context";

// ── Lazy-load тяжёлых клиентских компонентов (не блокируют первую отрисовку) ──
const ArayWidget = dynamic(() => import("@/components/store/aray-widget").then(m => ({ default: m.ArayWidget })), { ssr: false });
const AccountDrawer = dynamic(() => import("@/components/store/account-drawer").then(m => ({ default: m.AccountDrawer })), { ssr: false });
const FiltersDrawer = dynamic(() => import("@/components/store/filters-drawer").then(m => ({ default: m.FiltersDrawer })), { ssr: false });
const SearchDrawer = dynamic(() => import("@/components/store/search-drawer").then(m => ({ default: m.SearchDrawer })), { ssr: false });
const CartDrawer = dynamic(() => import("@/components/store/cart-drawer").then(m => ({ default: m.CartDrawer })), { ssr: false });
const CookieConsent = dynamic(() => import("@/components/store/cookie-consent").then(m => ({ default: m.CookieConsent })), { ssr: false });
const PwaInstall = dynamic(() => import("@/components/store/pwa-install").then(m => ({ default: m.PwaInstall })), { ssr: false });
const ScrollToTop = dynamic(() => import("@/components/ui/scroll-to-top").then(m => ({ default: m.ScrollToTop })), { ssr: false });

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
      {/* Хедер — критичный для LCP, рендерим сразу */}
      <Header categories={categories} phones={getPhones(siteSettings)} workingHours={getSetting(siteSettings, "working_hours") || undefined} />
      <main className="flex-1 pb-20 lg:pb-0">{children}</main>
      <Footer settings={siteSettings} categories={footerCategories} />

      {/* Нав — критичный для мобилки, рендерим сразу */}
      <MobileBottomNav arayEnabled={arayEnabled} />

      {/* Всё остальное — lazy (не блокирует первую отрисовку) */}
      <CookieConsent />
      <PwaInstall />
      <AccountDrawer />
      <FiltersDrawer />
      <SearchDrawer />
      <CartDrawer />
      <ScrollToTop />
      <ArayWidget enabled={arayEnabled} />
    </div>
    </StoreSettingsProvider>
  );
}
