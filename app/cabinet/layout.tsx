import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { MobileBottomNav } from "@/components/store/mobile-bottom-nav";
import { ScrollToTop } from "@/components/ui/scroll-to-top";
import { CabinetSidebar } from "@/components/cabinet/cabinet-sidebar";
import { getSiteSettings } from "@/lib/site-settings";

export default async function CabinetLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [categories, siteSettings, user] = await Promise.all([
    prisma.category.findMany({
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { products: { where: { active: true } } } } },
    }),
    getSiteSettings(),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true, phone: true, createdAt: true },
    }),
  ]);

  return (
    <div className="flex min-h-screen flex-col">
      <Header categories={categories} />
      <main className="flex-1 pb-16 lg:pb-0">
        <div className="container py-6 lg:py-10">
          <div className="flex flex-col lg:flex-row gap-6">
            <CabinetSidebar user={user} />
            <div className="flex-1 min-w-0">{children}</div>
          </div>
        </div>
      </main>
      <Footer settings={siteSettings} />
      <MobileBottomNav />
      <ScrollToTop />
    </div>
  );
}
