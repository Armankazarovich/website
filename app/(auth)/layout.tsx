import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { MobileBottomNav } from "@/components/store/mobile-bottom-nav";
import { ScrollToTop } from "@/components/ui/scroll-to-top";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/site-settings";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const [categories, siteSettings] = await Promise.all([
    prisma.category.findMany({
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { products: { where: { active: true } } } } },
    }),
    getSiteSettings(),
  ]);

  return (
    <div className="flex min-h-screen flex-col">
      <Header categories={categories} />
      <main className="flex-1 pb-16 lg:pb-0">{children}</main>
      <Footer settings={siteSettings} />
      <MobileBottomNav arayEnabled={false} />
      <ScrollToTop />
    </div>
  );
}
