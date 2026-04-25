// Кабинет = тот же дизайн что магазин (pilo-rus.ru / /catalog) + auth-guard.
// Ничего из AdminShell. Сотрудники в /admin/* остаются на AdminShell — там их рабочее место.
export const revalidate = 60;

import type { Metadata } from "next";
import React from "react";
import dynamic from "next/dynamic";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { getSiteSettings, getSetting, getPhones } from "@/lib/site-settings";
import { StoreSettingsProvider } from "@/lib/store-settings-context";
import { getAvailableTypes } from "@/lib/product-types";
import { getPublicProductsFilter } from "@/lib/product-seo";

export const metadata: Metadata = {
  title: {
    default: "Личный кабинет | ПилоРус",
    template: "%s | ПилоРус",
  },
};

// Извлекает уникальные сечения из variant sizes для мега-меню (та же функция что в store/layout)
function extractUniqueCrossSections(sizes: string[]): string[] {
  const set = new Set<string>();
  for (const size of sizes) {
    const m3 = size.match(/^(\d+)\s*[×xXхХ]\s*(\d+)\s*[×xXхХ]\s*\d+/);
    if (m3) { set.add(`${m3[1]}×${m3[2]}`); continue; }
    const m2 = size.match(/^(\d+)\s*[×xXхХ]\s*(\d+)$/);
    if (m2 && parseInt(m2[1]) > 5 && parseInt(m2[2]) > 5) { set.add(`${m2[1]}×${m2[2]}`); }
  }
  return Array.from(set).sort((a, b) => {
    const [a1, a2] = a.split("×").map(Number);
    const [b1, b2] = b.split("×").map(Number);
    return a1 - b1 || a2 - b2;
  });
}

// Те же lazy-компоненты что в store/layout — единая система дизайна
const ArayChatHost = dynamic(() => import("@/components/store/aray-chat-host").then(m => ({ default: m.ArayChatHost })), { ssr: false });
const ArayDock = dynamic(() => import("@/components/store/aray-dock").then(m => ({ default: m.ArayDock })), { ssr: false });
const MobileBottomNav = dynamic(() => import("@/components/store/mobile-bottom-nav").then(m => ({ default: m.MobileBottomNav })), { ssr: false });
const VoiceModeOverlay = dynamic(() => import("@/components/store/voice-mode-overlay").then(m => ({ default: m.VoiceModeOverlay })), { ssr: false });
const SideIconRail = dynamic(() => import("@/components/store/side-icon-rail").then(m => ({ default: m.SideIconRail })), { ssr: false });
const AccountDrawer = dynamic(() => import("@/components/store/account-drawer").then(m => ({ default: m.AccountDrawer })), { ssr: false });
const FiltersDrawer = dynamic(() => import("@/components/store/filters-drawer").then(m => ({ default: m.FiltersDrawer })), { ssr: false });
const SearchDrawer = dynamic(() => import("@/components/store/search-drawer").then(m => ({ default: m.SearchDrawer })), { ssr: false });
const CartDrawer = dynamic(() => import("@/components/store/cart-drawer").then(m => ({ default: m.CartDrawer })), { ssr: false });
const ScrollToTop = dynamic(() => import("@/components/ui/scroll-to-top").then(m => ({ default: m.ScrollToTop })), { ssr: false });
const CabinetSlideTransition = dynamic(() => import("@/components/cabinet/slide-transition").then(m => ({ default: m.CabinetSlideTransition })), { ssr: false });

export default async function CabinetLayout({ children }: { children: React.ReactNode }) {
  // Auth-guard: только залогиненные
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // Те же данные что в store/layout — Header нужен такой же
  const [categories, footerCategories, siteSettings, allProductNames, allVariantSizes] = await Promise.all([
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
    prisma.product.findMany({
      where: { ...getPublicProductsFilter(), category: { showInMenu: true } },
      select: { name: true },
    }),
    prisma.productVariant.findMany({
      where: {
        product: { ...getPublicProductsFilter(), category: { showInMenu: true } },
        inStock: true,
        OR: [
          { pricePerCube: { not: null, gt: 0 } },
          { pricePerPiece: { not: null, gt: 0 } },
        ],
      },
      select: { size: true },
      distinct: ["size"],
    }),
  ]);

  const megaMenuTypes = getAvailableTypes(allProductNames.map((p) => p.name));
  const megaMenuSizes = extractUniqueCrossSections(allVariantSizes.map((v) => v.size));

  const photoAspect = getSetting(siteSettings, "photo_aspect_ratio") || "1/1";
  const cardStyle = getSetting(siteSettings, "card_style") || "classic";
  const arayEnabled = getSetting(siteSettings, "aray_enabled") !== "false";

  return (
    <StoreSettingsProvider cardStyle={cardStyle} photoAspect={photoAspect}>
      <div className="flex min-h-screen flex-col" style={{ "--photo-aspect": photoAspect } as React.CSSProperties}>
        <Header
          categories={categories}
          phones={getPhones(siteSettings)}
          workingHours={getSetting(siteSettings, "working_hours") || undefined}
          dynamicTypes={megaMenuTypes}
          dynamicSizes={megaMenuSizes}
        />

        <main
          className="flex-1"
          style={{ paddingBottom: "calc(72px + env(safe-area-inset-bottom, 0px))" }}
        >
          <div className="container py-6">
            <CabinetSlideTransition>{children}</CabinetSlideTransition>
          </div>
        </main>

        <Footer settings={siteSettings} categories={footerCategories} />

        {/* Та же навигация что в магазине — никаких различий */}
        <MobileBottomNav arayEnabled={arayEnabled} />
        <SideIconRail />
        <ArayDock enabled={arayEnabled} />
        <AccountDrawer />
        <FiltersDrawer />
        <SearchDrawer />
        <CartDrawer />
        <ScrollToTop />
        {arayEnabled && <ArayChatHost />}
        {arayEnabled && <VoiceModeOverlay />}
      </div>
    </StoreSettingsProvider>
  );
}
