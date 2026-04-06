import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { Tag } from "lucide-react";
import { PartnershipPromoCard } from "@/components/store/partnership-promo-card";
import { BackButton } from "@/components/ui/back-button";
import { AdminEditButton } from "@/components/admin/admin-edit-button";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Акции и скидки",
  description: "Актуальные акции и скидки на пиломатериалы от ПилоРус",
};

/* ── Стили карточек — каждая уникальная ──────────────────────────────── */
const CARD_THEMES = [
  {
    // Изумрудно-лесной: скидки → экономия → природа
    gradient: "from-emerald-950 via-emerald-900 to-teal-800",
    accent: "#10b981",        // emerald-500
    circle1: "bg-emerald-400/10",
    circle2: "bg-teal-300/8",
    badgeBg: "bg-emerald-500/20 border border-emerald-400/30",
    badgeText: "text-emerald-300",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
        <path d="M2 17l10 5 10-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M2 12l10 5 10-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    label: "Выгода",
  },
  {
    // Глубокий синий: доставка → небо → скорость
    gradient: "from-slate-900 via-blue-950 to-indigo-900",
    accent: "#60a5fa",        // blue-400
    circle1: "bg-blue-400/10",
    circle2: "bg-indigo-300/8",
    badgeBg: "bg-blue-500/20 border border-blue-400/30",
    badgeText: "text-blue-300",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M1 4h13v13H1V4z" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
        <path d="M14 9h4.5L22 13v4h-8V9z" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
        <circle cx="5" cy="19" r="2" stroke="white" strokeWidth="1.5"/>
        <circle cx="18" cy="19" r="2" stroke="white" strokeWidth="1.5"/>
      </svg>
    ),
    label: "Доставка",
  },
  {
    // Тёплый бургунди: эксклюзив → VIP → огонь
    gradient: "from-rose-950 via-rose-900 to-amber-900",
    accent: "#fb923c",        // orange-400
    circle1: "bg-rose-400/10",
    circle2: "bg-amber-300/8",
    badgeBg: "bg-rose-500/20 border border-rose-400/30",
    badgeText: "text-rose-300",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
      </svg>
    ),
    label: "Спецпредложение",
  },
  {
    // Фиолетовый: премиум → качество → сертификат
    gradient: "from-violet-950 via-purple-900 to-slate-900",
    accent: "#a78bfa",        // violet-400
    circle1: "bg-violet-400/10",
    circle2: "bg-purple-300/8",
    badgeBg: "bg-violet-500/20 border border-violet-400/30",
    badgeText: "text-violet-300",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L3.5 6.5V12C3.5 16.7 7.3 21.1 12 22.5C16.7 21.1 20.5 16.7 20.5 12V6.5L12 2Z" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
        <path d="M8.5 12l2.5 2.5 4.5-4.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    label: "Гарантия",
  },
];

export default async function PromotionsPage() {
  const promotions = await prisma.promotion.findMany({
    where: { active: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="container py-12">
      <div className="flex items-center gap-3 mb-3">
        <BackButton href="/" label="Главная" className="mb-0 shrink-0" />
        <h1 className="font-display font-bold text-4xl">Акции и скидки</h1>
      </div>
      <p className="text-muted-foreground text-lg mb-10">Выгодные предложения от производителя</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Partnership promo card — always first */}
        <PartnershipPromoCard />

        {promotions.map((promo, i) => {
          const theme = CARD_THEMES[i % CARD_THEMES.length];
          return (
            <div
              key={promo.id}
              className={`group relative rounded-2xl overflow-hidden bg-gradient-to-br ${theme.gradient} text-white p-6 flex flex-col min-h-[260px]`}
            >
              <AdminEditButton href="/admin/promotions" mode="overlay" label="Изменить акцию" />
              {/* Декоративные круги */}
              <div className={`absolute top-0 right-0 w-44 h-44 rounded-full ${theme.circle1} -translate-y-1/2 translate-x-1/2 pointer-events-none`} />
              <div className={`absolute bottom-0 left-0 w-28 h-28 rounded-full ${theme.circle2} translate-y-1/2 -translate-x-1/2 pointer-events-none`} />
              {/* Мерцающий блик */}
              <div className="absolute top-1/2 left-1/2 w-64 h-64 rounded-full bg-white/[0.02] -translate-x-1/2 -translate-y-1/2 pointer-events-none" />

              {/* Бейдж */}
              <div className="flex items-center gap-2 mb-4 relative z-10">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: theme.accent + "33", border: `1px solid ${theme.accent}55` }}
                >
                  {theme.icon}
                </div>
                <span className={`text-xs font-semibold uppercase tracking-widest ${theme.badgeText}`}>
                  {theme.label}
                </span>
              </div>

              {/* Контент */}
              <div className="relative z-10 flex-1 flex flex-col">
                <h3 className="font-display font-bold text-xl mb-2 leading-tight">
                  {promo.title}
                </h3>
                <p className="text-white/70 text-sm leading-relaxed flex-1">
                  {promo.description}
                </p>

                {promo.validUntil && (
                  <p className="text-xs text-white/40 mt-4 pt-4 border-t border-white/10">
                    Акция действует до {new Date(promo.validUntil).toLocaleDateString("ru-RU")}
                  </p>
                )}
              </div>
            </div>
          );
        })}

        {promotions.length === 0 && (
          <div className="md:col-span-1 lg:col-span-2 text-center py-16 text-muted-foreground rounded-2xl border border-border bg-muted/30 flex flex-col items-center justify-center">
            <Tag className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="text-base font-medium">Актуальных акций пока нет</p>
            <p className="text-sm mt-1">Следите за обновлениями</p>
          </div>
        )}
      </div>
    </div>
  );
}
