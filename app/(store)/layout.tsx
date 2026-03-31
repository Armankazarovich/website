import React from "react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { MobileBottomNav } from "@/components/store/mobile-bottom-nav";
import { CookieConsent } from "@/components/store/cookie-consent";
import { ScrollToTop } from "@/components/ui/scroll-to-top";
import { ContactWidget } from "@/components/store/contact-widget";
import { PwaInstall } from "@/components/store/pwa-install";
import { AccountDrawer } from "@/components/store/account-drawer";
import { FiltersDrawer } from "@/components/store/filters-drawer";
import { SearchDrawer } from "@/components/store/search-drawer";
import { CartDrawer } from "@/components/store/cart-drawer";
import { prisma } from "@/lib/prisma";
import { getSiteSettings, getSetting, getPhones } from "@/lib/site-settings";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const [categories, footerCategories, siteSettings] = await Promise.all([
    prisma.category.findMany({
      where: { showInMenu: true },
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

  return (
    <div className="flex min-h-screen flex-col" style={{ "--photo-aspect": photoAspect } as React.CSSProperties}>
      <Header categories={categories} phones={getPhones(siteSettings)} />
      <main className="flex-1 pb-16 lg:pb-0">{children}</main>
      <Footer settings={siteSettings} categories={footerCategories} />
      <MobileBottomNav />
      <CookieConsent />
      <PwaInstall />
      <AccountDrawer />
      <FiltersDrawer />
      <SearchDrawer />
      <CartDrawer />
      <ScrollToTop />
      <ContactWidget
        phone={getSetting(siteSettings, "phone")}
        phoneLink={getSetting(siteSettings, "phone_link")}
        email={getSetting(siteSettings, "widget_show_email") === "true" ? getSetting(siteSettings, "email") : undefined}
        whatsapp={getSetting(siteSettings, "social_whatsapp")}
        telegram={getSetting(siteSettings, "social_telegram") || undefined}
        vk={getSetting(siteSettings, "social_vk") || undefined}
        widgetEnabled={getSetting(siteSettings, "widget_enabled") !== "false"}
        widgetPosition={(getSetting(siteSettings, "widget_position") as "left" | "right") || "right"}
        widgetLabel={getSetting(siteSettings, "widget_label") || "Связаться"}
      />
    </div>
  );
}
