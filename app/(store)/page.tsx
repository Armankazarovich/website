import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { getSiteSettings, getSetting } from "@/lib/site-settings";

// Кэш 60 сек — быстрее чем force-dynamic, но данные актуальны
export const revalidate = 60;
import { formatPrice } from "@/lib/utils";
import { ProductCard } from "@/components/store/product-card";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle, Phone, Star, MapPin } from "lucide-react";
import { PartnershipPromoCard } from "@/components/store/partnership-promo-card";
import { CategoryCard } from "@/components/store/category-card";
import { SubscribeSection } from "@/components/store/subscribe-section";
import { HomeReviewPopup } from "@/components/store/home-review-popup";

const AVATAR_COLORS = [
  "bg-brand-orange",
  "bg-brand-green",
  "bg-sky-500",
  "bg-violet-500",
  "bg-rose-500",
  "bg-amber-500",
];
function getAvatarColor(name: string) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

/* ── Кастомные SVG-иконки ─────────────────── */
function IconProducer({ className }: { className?: string }) {
  return (
    <svg className={className} width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2 21h20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M4 21V11L8 7V11L12 7V11L16 7V11L20 7V21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <rect x="6.5" y="15" width="3" height="6" rx="0.5" stroke="currentColor" strokeWidth="1.5"/>
      <rect x="14.5" y="15" width="3" height="6" rx="0.5" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M11 18h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function IconTruck({ className }: { className?: string }) {
  return (
    <svg className={className} width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M1 4h13v13H1V4z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M14 9h4.5L22 13v4h-8V9z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      <circle cx="5" cy="19" r="2" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="18" cy="19" r="2" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M7 19h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M4 9H1M5 7H1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
}

function IconCertificate({ className }: { className?: string }) {
  return (
    <svg className={className} width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 4h16v11H4V4z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M9 20l3-2 3 2v-5l-3-2-3 2v5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M7 8h10M7 11h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="17" cy="11" r="1.5" stroke="currentColor" strokeWidth="1"/>
    </svg>
  );
}

function IconWarehouse({ className }: { className?: string }) {
  return (
    <svg className={className} width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2 22V9L12 3L22 9V22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M2 22h20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M9 22v-7h6v7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M6 11h2M16 11h2M6 14h2M16 14h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function IconClock({ className }: { className?: string }) {
  return (
    <svg className={className} width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M12 6.5v5.5l3.5 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M12 2.5v1M12 20.5v1M2.5 12h1M20.5 12h1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
}

function IconShield({ className }: { className?: string }) {
  return (
    <svg className={className} width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2L3.5 6.5V12C3.5 16.7 7.3 21.1 12 22.5C16.7 21.1 20.5 16.7 20.5 12V6.5L12 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M8.5 12l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export const metadata: Metadata = {
  title: "Пиломатериалы от производителя в Химках — ПилоРус | Доска, брус, вагонка",
  description: "Купить пиломатериалы оптом и в розницу от производителя ООО ПИТИ в Химках. Доска обрезная, брус, вагонка, блок-хаус. Доставка по Москве и МО за 1-3 дня. ☎ 8-985-970-71-33",
  keywords: "пиломатериалы от производителя, купить доску в Химках, брус Москва, вагонка блок-хаус, доска обрезная цена, пиломатериалы Подмосковье",
  openGraph: {
    title: "ПилоРус — Пиломатериалы от производителя в Химках",
    description: "Доска, брус, вагонка, блок-хаус напрямую с завода. Доставка 1-3 дня.",
    url: "https://pilo-rus.ru",
    siteName: "ПилоРус",
    locale: "ru_RU",
    type: "website",
    images: [{ url: "https://pilo-rus.ru/images/production/sklad-3.jpg", width: 1200, height: 630, alt: "ПилоРус — производство пиломатериалов" }],
  },
  alternates: { canonical: "https://pilo-rus.ru" },
};

async function getData() {
  const [categories, featuredProducts, promotions, reviews, settings] = await Promise.all([
    prisma.category.findMany({
      where: { showInMenu: true },
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { products: true } } },
      take: 6,
    }),
    prisma.product.findMany({
      where: { active: true, featured: true },
      include: {
        category: true,
        variants: { where: { inStock: true }, orderBy: { pricePerCube: "asc" } },
      },
      take: 8,
    }),
    prisma.promotion.findMany({
      where: { active: true },
      orderBy: { createdAt: "asc" },
      take: 3,
    }),
    prisma.review.findMany({
      where: { approved: true },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    getSiteSettings(),
  ]);
  return { categories, featuredProducts, promotions, reviews, settings };
}

function getAdvantages(workingHours: string) {
  return [
    {
      Icon: IconProducer,
      title: "Производитель без посредников",
      description: "Покупаете напрямую с завода по ценам производства. Никаких наценок перекупщиков.",
      color: "text-brand-orange",
      bg: "bg-brand-orange/10 dark:bg-brand-orange/15",
    },
    {
      Icon: IconTruck,
      title: "Доставка 1-3 дня",
      description: "Быстрая доставка по Москве и Московской области собственным транспортом.",
      color: "text-brand-green",
      bg: "bg-brand-green/10 dark:bg-brand-green/15",
    },
    {
      Icon: IconCertificate,
      title: "ГОСТ и качество",
      description: "Вся продукция соответствует ГОСТ. Производство оснащено современным оборудованием.",
      color: "text-sky-500",
      bg: "bg-sky-500/10 dark:bg-sky-500/15",
    },
    {
      Icon: IconWarehouse,
      title: "2000 м² склад",
      description: "Большой склад на территории 2000 м². Всегда в наличии широкий ассортимент.",
      color: "text-violet-500",
      bg: "bg-violet-500/10 dark:bg-violet-500/15",
    },
    {
      Icon: IconClock,
      title: "Режим работы",
      description: `${workingHours}. Всегда готовы помочь с выбором.`,
      color: "text-brand-orange",
      bg: "bg-brand-orange/10 dark:bg-brand-orange/15",
    },
    {
      Icon: IconShield,
      title: "Гарантия на продукцию",
      description: "Даём гарантию на все виды пиломатериалов. Работаем официально по договору.",
      color: "text-brand-green",
      bg: "bg-brand-green/10 dark:bg-brand-green/15",
    },
  ];
}

function getTickerItems(workingHours: string) {
  return [
    "2 000 м² склада",
    "500+ довольных клиентов",
    "10+ лет опыта",
    "Доставка 1–3 дня",
    "Сертифицировано ГОСТ",
    "Производитель напрямую",
    workingHours,
    "Химки, Московская область",
  ];
}

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Где купить пиломатериалы в Москве и Московской области?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "ПилоРус (ООО ПИТИ) — производитель пиломатериалов в г. Химки, Московская область. Адрес склада: ул. Заводская 2А, стр.28. Доставка по всей Москве и МО за 1-3 дня. Телефон: 8-985-970-71-33."
      }
    },
    {
      "@type": "Question",
      "name": "Какова минимальная сумма заказа на доставку пиломатериалов?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Минимальная сумма заказа для доставки по Москве и МО от 5 000 рублей. Самовывоз со склада в Химках без ограничений по сумме."
      }
    },
    {
      "@type": "Question",
      "name": "Как рассчитать количество и стоимость досок?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Воспользуйтесь бесплатным калькулятором пиломатериалов на сайте pilo-rus.ru/calculator. Укажите размеры и нужное количество — система автоматически рассчитает кубатуру и стоимость."
      }
    },
    {
      "@type": "Question",
      "name": "Работаете ли вы с юридическими лицами?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Да, ООО ПИТИ (ПилоРус) работает с юридическими лицами и ИП. Выставляем счета, заключаем договора, предоставляем полный пакет документов. Оплата по безналичному расчёту."
      }
    },
    {
      "@type": "Question",
      "name": "Есть ли пиломатериалы в наличии на складе в Химках?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Да, склад площадью 2000 м² в Химках постоянно в наличии. Доска обрезная хвойная, брус строительный, вагонка, блок-хаус, евровагонка и другие виды пиломатериалов. Проверить наличие можно в каталоге на сайте."
      }
    }
  ]
};

export default async function HomePage() {
  const { categories, featuredProducts, promotions, reviews, settings } = await getData();
  const workingHours = getSetting(settings, "working_hours") || "Пн–Сб: 09:00–20:00, Вс: 09:00–18:00";
  const phoneLink = getSetting(settings, "phone_link") || "+79859707133";
  const phoneDisplay = getSetting(settings, "phone") || "8-985-970-71-33";
  const advantages = getAdvantages(workingHours);
  const TICKER_ITEMS = getTickerItems(workingHours);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      {/* ===== HERO ===== */}
      <section className="relative min-h-[92vh] lg:min-h-screen flex items-center overflow-hidden bg-brand-dark">

        {/* Background image — slow Ken Burns zoom */}
        <div className="absolute inset-0 overflow-hidden">
          <Image
            src="/images/production/hero-main.jpg"
            alt="Лесопилка ПилоРус — производство пиломатериалов"
            fill
            className="object-cover object-center hero-zoom"
            priority
            sizes="100vw"
          />
        </div>

        {/* Layered overlays — ~65% darkening для читабельности */}
        <div className="absolute inset-0 bg-black/65" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />

        {/* Content */}
        <div className="container relative z-10 pt-28 pb-20 lg:pt-32 lg:pb-24">
          <div className="max-w-2xl xl:max-w-[700px]">

            {/* Badge — glassmorphism */}
            <div className="inline-flex items-center gap-2 mb-6 sm:mb-8 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full backdrop-blur-xl bg-white/[0.07] border border-white/[0.18] shadow-xl text-xs sm:text-sm text-white/90">
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-brand-orange shrink-0 animate-pulse" />
              <span className="font-medium whitespace-nowrap">Производитель пиломатериалов</span>
              <span className="w-px h-3.5 bg-white/20 shrink-0" />
              <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-brand-orange/80 shrink-0" />
              {/* Короткий текст на мобиле, полный на десктопе */}
              <span className="text-white/65 whitespace-nowrap">
                <span className="sm:hidden">Химки, МО</span>
                <span className="hidden sm:inline">Химки, Московская область</span>
              </span>
            </div>

            {/* H1 */}
            <h1 className="font-display font-bold text-[2.75rem] sm:text-6xl lg:text-[4.25rem] xl:text-[4.75rem] text-white leading-[1.05] tracking-tight mb-6">
              Пиломатериалы
              <br />
              <span className="text-brand-orange">от производителя</span>
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-xl text-white/70 mb-10 leading-relaxed">
              Доска, брус, вагонка, блок-хаус — напрямую с завода.{" "}
              Доставка по Москве и&nbsp;МО за&nbsp;1–3&nbsp;дня.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 mb-8">
              {/* Кнопка 1 — основная, оранжевая */}
              <Link
                href="/catalog"
                className="inline-flex items-center justify-center gap-2 h-14 px-8 rounded-xl bg-brand-orange hover:bg-brand-orange/90 active:scale-95 text-white text-base sm:text-lg font-semibold shadow-2xl shadow-brand-orange/40 transition-all duration-200"
              >
                Смотреть каталог
                <ArrowRight className="w-5 h-5" />
              </Link>

              {/* Кнопка 2 — звонок, glassmorphism */}
              <a
                href={`tel:${phoneLink}`}
                className="inline-flex items-center justify-center gap-2 h-14 px-8 rounded-xl bg-white/10 hover:bg-white/18 active:scale-95 border border-white/25 hover:border-white/45 text-white text-base sm:text-lg font-semibold backdrop-blur-md transition-all duration-200 shadow-lg"
              >
                <Phone className="w-5 h-5 shrink-0 text-brand-orange" />
                Позвонить нам
              </a>
            </div>

            {/* Quick category shortcuts */}
            <div className="pt-5 border-t border-white/10">
              <p className="text-[10px] text-white/30 uppercase tracking-widest mb-3">Быстрый переход</p>
              <div className="flex flex-wrap gap-2">
                {([
                  { label: "Сосна и Ель", href: "/catalog?category=sosna-el", icon: (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M12 2L6 10h4l-4 7h6v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><path d="M12 2l6 8h-4l4 7h-6v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  )},
                  { label: "Лиственница", href: "/catalog?category=listvennitsa", icon: (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M12 3l-5 7h3l-3 6h5v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><path d="M12 3l5 7h-3l3 6h-5v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  )},
                  { label: "Фанера, ДСП, МДФ", href: "/catalog?category=fanera", icon: (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M3 8h18M3 16h18M8 3v18M16 3v18" stroke="currentColor" strokeWidth="1" strokeOpacity="0.5"/></svg>
                  )},
                  { label: "Липа и Осина", href: "/catalog?category=lipa-osina", icon: (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M12 22V12M12 12C12 12 7 10 7 6c0-2.5 2-4 5-4s5 1.5 5 4c0 4-5 6-5 6z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  )},
                ] as { label: string; href: string; icon: React.ReactNode }[]).map((cat) => (
                  <Link
                    key={cat.label}
                    href={cat.href}
                    className="group inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.07] border border-white/[0.15] text-white/65 text-xs font-medium hover:bg-white/[0.15] hover:border-white/[0.35] hover:text-white backdrop-blur-xl transition-all duration-200 shadow-md hover:shadow-lg"
                  >
                    <span className="opacity-70 group-hover:opacity-100 transition-opacity">{cat.icon}</span>
                    {cat.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Stats row */}
            <div className="flex flex-wrap gap-x-8 gap-y-4 mt-10">
              {[
                { value: "2000 м²", label: "Площадь склада" },
                { value: "1–3 дня", label: "Срок доставки" },
                { value: "10+ лет", label: "На рынке" },
                { value: "500+", label: "Клиентов" },
              ].map((stat) => (
                <div key={stat.label}>
                  <p className="font-display font-bold text-3xl text-brand-orange leading-none">{stat.value}</p>
                  <p className="text-xs text-white/50 mt-1.5 tracking-wide uppercase">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 animate-bounce">
          <div className="w-5 h-9 border-2 border-white/25 rounded-full flex items-start justify-center pt-1.5">
            <div className="w-1 h-2.5 bg-white/45 rounded-full" />
          </div>
        </div>
      </section>

      {/* ===== SOCIAL PROOF TICKER ===== */}
      <div className="bg-brand-orange overflow-hidden py-3 select-none">
        <div className="flex animate-marquee whitespace-nowrap">
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
            <span
              key={i}
              className="text-white font-semibold text-sm inline-flex items-center gap-3 px-6"
            >
              <span className="w-1.5 h-1.5 bg-white/50 rounded-full shrink-0" />
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* ===== ADVANTAGES ===== */}
      <section className="py-20 bg-muted/30">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="font-display font-bold text-3xl sm:text-4xl mb-4">
              Почему выбирают <span className="text-primary">ПилоРус</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Работаем напрямую с конечным покупателем — никаких посредников, справедливые цены завода
            </p>
          </div>

          {/* Stats banner */}
          <div className="grid grid-cols-2 lg:grid-cols-4 mb-10 bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
            {[
              { value: "2 000", suffix: " м²", label: "Площадь склада" },
              { value: "500+", suffix: "", label: "Довольных клиентов" },
              { value: "10+", suffix: " лет", label: "На рынке" },
              { value: "1–3", suffix: " дня", label: "Срок доставки" },
            ].map((stat, i) => (
              <div
                key={stat.label}
                className={`text-center p-6 ${i < 3 ? "border-r border-border" : ""} ${i < 2 ? "border-b border-border lg:border-b-0" : ""}`}
              >
                <p className="font-display font-bold text-3xl sm:text-4xl text-primary leading-none">
                  {stat.value}
                  <span className="text-xl sm:text-2xl text-muted-foreground">{stat.suffix}</span>
                </p>
                <p className="text-muted-foreground text-xs sm:text-sm mt-2">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Advantage cards — horizontal layout */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {advantages.map((adv) => (
              <div
                key={adv.title}
                className="flex gap-4 p-5 bg-card rounded-2xl border border-border hover:shadow-md hover:border-primary/30 transition-all group"
              >
                <div className={`w-12 h-12 rounded-xl ${adv.bg} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}>
                  <adv.Icon className={`w-6 h-6 ${adv.color}`} />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-base mb-1">{adv.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{adv.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CATEGORIES ===== */}
      {categories.length > 0 && (
        <section className="py-16">
          <div className="container">
            <div className="text-center mb-10">
              <h2 className="font-display font-bold text-3xl sm:text-4xl mb-3">Каталог продукции</h2>
              <p className="text-muted-foreground">Широкий ассортимент пиломатериалов напрямую с производства</p>
            </div>

            {/* Bento-сетка: мобиль 2x2, десктоп — hero+side+wide */}
            <div className="grid grid-cols-2 lg:grid-cols-3 lg:grid-rows-[240px_240px_160px] gap-3 sm:gap-4 mb-8">
              {/* Hero — большая карточка, слева */}
              {categories[0] && (
                <div className="h-44 sm:h-56 lg:col-span-2 lg:row-span-2 lg:h-full">
                  <CategoryCard slug={categories[0].slug} name={categories[0].name} image={categories[0].image} productCount={categories[0]._count.products} className="h-full" />
                </div>
              )}
              {/* Side top */}
              {categories[1] && (
                <div className="h-44 sm:h-56 lg:h-full">
                  <CategoryCard slug={categories[1].slug} name={categories[1].name} image={categories[1].image} productCount={categories[1]._count.products} className="h-full" />
                </div>
              )}
              {/* Side bottom — скрыта на мобиле, видна на десктопе */}
              {categories[2] && (
                <div className="hidden lg:block lg:h-full">
                  <CategoryCard slug={categories[2].slug} name={categories[2].name} image={categories[2].image} productCount={categories[2]._count.products} className="h-full" />
                </div>
              )}
              {/* Wide banner — нижняя строка (мобиль: на всю ширину вместо скрытой) */}
              {categories[2] && (
                <div className="col-span-2 h-36 sm:h-44 lg:hidden">
                  <CategoryCard slug={categories[2].slug} name={categories[2].name} image={categories[2].image} productCount={categories[2]._count.products} className="h-full" />
                </div>
              )}
              {categories[3] && (
                <div className="col-span-2 h-36 sm:h-44 lg:col-span-3 lg:h-full">
                  <CategoryCard slug={categories[3].slug} name={categories[3].name} image={categories[3].image} productCount={categories[3]._count.products} className="h-full" />
                </div>
              )}
            </div>

            <div className="text-center">
              <Button size="lg" asChild>
                <Link href="/catalog">
                  Весь каталог
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* ===== PROMOTIONS ===== */}
      <section className="py-16 bg-muted/30">
        <div className="container">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="font-display font-bold text-3xl">Акции и скидки</h2>
              <p className="text-muted-foreground mt-1 text-sm">Выгодные предложения для наших клиентов</p>
            </div>
            <Link href="/promotions" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Все акции <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Partnership card — always shown */}
            <PartnershipPromoCard />

            {promotions.map((promo, i) => {
              /* ── Тема карточки ── */
              const themes = [
                {
                  gradient: "from-emerald-950 via-emerald-900 to-teal-800",
                  accent: "#10b981",
                  circle1: "bg-emerald-400/10",
                  circle2: "bg-teal-300/8",
                  badgeText: "text-emerald-300",
                  label: "Выгода",
                  /* Анимированные SVG-слои: каждый слой всплывает по очереди */
                  icon: (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path className="[animation:promoLayer1_2.4s_ease-in-out_infinite]" d="M12 2L2 7l10 5 10-5-10-5z" stroke="white" strokeWidth="1.5" strokeLinejoin="round" style={{transformOrigin:"12px 7px"}}/>
                      <path className="[animation:promoLayer2_2.4s_ease-in-out_0.3s_infinite]" d="M2 12l10 5 10-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{transformOrigin:"12px 14.5px"}}/>
                      <path className="[animation:promoLayer3_2.4s_ease-in-out_0.6s_infinite]" d="M2 17l10 5 10-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{transformOrigin:"12px 19.5px"}}/>
                    </svg>
                  ),
                },
                {
                  gradient: "from-slate-900 via-blue-950 to-indigo-900",
                  accent: "#60a5fa",
                  circle1: "bg-blue-400/10",
                  circle2: "bg-indigo-300/8",
                  badgeText: "text-blue-300",
                  label: "Доставка",
                  /* Анимированный грузовик: колёса крутятся */
                  icon: (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path d="M1 4h13v13H1V4z" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
                      <path d="M14 9h4.5L22 13v4h-8V9z" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
                      <circle cx="5" cy="19" r="2" stroke="white" strokeWidth="1.5"
                        className="[animation:promoSpin_1.8s_linear_infinite]"
                        style={{transformOrigin:"5px 19px"}}/>
                      <circle cx="18" cy="19" r="2" stroke="white" strokeWidth="1.5"
                        className="[animation:promoSpin_1.8s_linear_infinite]"
                        style={{transformOrigin:"18px 19px"}}/>
                      <circle cx="5" cy="19" r="0.6" fill="white"
                        className="[animation:promoSpin_1.8s_linear_infinite]"
                        style={{transformOrigin:"5px 19px"}}/>
                      <circle cx="18" cy="19" r="0.6" fill="white"
                        className="[animation:promoSpin_1.8s_linear_infinite]"
                        style={{transformOrigin:"18px 19px"}}/>
                    </svg>
                  ),
                },
              ];
              const theme = themes[i % themes.length];

              return (
                <div
                  key={promo.id}
                  className={`relative rounded-2xl overflow-hidden bg-gradient-to-br ${theme.gradient} text-white p-6 flex flex-col min-h-[260px]`}
                >
                  {/* Декоративные круги */}
                  <div className={`absolute top-0 right-0 w-44 h-44 rounded-full ${theme.circle1} -translate-y-1/2 translate-x-1/2 pointer-events-none`} />
                  <div className={`absolute bottom-0 left-0 w-28 h-28 rounded-full ${theme.circle2} translate-y-1/2 -translate-x-1/2 pointer-events-none`} />

                  {/* Бейдж с анимированной иконкой */}
                  <div className="flex items-center gap-2 mb-4 relative z-10">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: theme.accent + "25", border: `1px solid ${theme.accent}40` }}
                    >
                      {theme.icon}
                    </div>
                    <span className={`text-xs font-semibold uppercase tracking-widest ${theme.badgeText}`}>
                      {theme.label}
                    </span>
                  </div>

                  {/* Контент */}
                  <div className="relative z-10 flex-1 flex flex-col">
                    <h3 className="font-display font-bold text-xl mb-2 leading-tight">{promo.title}</h3>
                    <p className="text-white/70 text-sm leading-relaxed flex-1">{promo.description}</p>
                    {promo.validUntil && (
                      <p className="text-xs text-white/40 mt-4 pt-3 border-t border-white/10">
                        Акция до {new Date(promo.validUntil).toLocaleDateString("ru-RU")}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== FEATURED PRODUCTS ===== */}
      {featuredProducts.length > 0 && (
        <section className="py-16">
          <div className="container">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="font-display font-bold text-3xl">Хиты продаж</h2>
                <p className="text-muted-foreground mt-1">Самые популярные позиции</p>
              </div>
              <Button variant="outline" asChild>
                <Link href="/catalog">
                  Весь каталог <ArrowRight className="ml-1 w-4 h-4" />
                </Link>
              </Button>
            </div>
            {/* Mobile: horizontal scroll-snap; sm+: grid */}
            <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-3 -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:overflow-visible sm:snap-none">
              {featuredProducts.map((product) => (
                <div key={product.id} className="snap-start shrink-0 w-[72vw] sm:w-auto sm:shrink">
                  <ProductCard
                    id={product.id}
                    slug={product.slug}
                    name={product.name}
                    category={product.category.name}
                    images={product.images}
                    saleUnit={product.saleUnit}
                    variants={product.variants.map((v) => ({
                      id: v.id,
                      size: v.size,
                      pricePerCube: v.pricePerCube ? Number(v.pricePerCube) : null,
                      pricePerPiece: v.pricePerPiece ? Number(v.pricePerPiece) : null,
                      piecesPerCube: v.piecesPerCube,
                      inStock: v.inStock,
                    }))}
                    featured
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ===== HOW IT WORKS ===== */}
      <section className="py-16 bg-gradient-to-br from-brand-orange/5 via-transparent to-brand-brown/5">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="font-display font-bold text-3xl sm:text-4xl mb-3">Как сделать заказ</h2>
            <p className="text-muted-foreground text-lg">Просто и быстро — 4 шага до доставки</p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 relative">
            {/* Dashed connector line — desktop only */}
            <div className="hidden lg:block absolute top-8 left-[calc(12.5%+2rem)] right-[calc(12.5%+2rem)] h-px border-t-2 border-dashed border-border z-0" />

            {[
              { num: "01", emoji: "🔍", title: "Выбрать товар", desc: "В каталоге или по телефону — поможем подобрать нужный материал и рассчитать объём" },
              { num: "02", emoji: "📋", title: "Оформить заявку", desc: "Онлайн через сайт или звонком. Менеджер уточнит детали в течение 15 минут" },
              { num: "03", emoji: "💳", title: "Оплатить", desc: "Наличные, перевод на карту или безнал по счёту с НДС для ИП и ООО" },
              { num: "04", emoji: "🚛", title: "Получить доставку", desc: "1–3 рабочих дня по Москве и МО собственным транспортом с погрузкой" },
            ].map((step) => (
              <div key={step.num} className="relative z-10 text-center">
                <div className="w-16 h-16 rounded-2xl bg-card border-2 border-border mx-auto mb-4 flex items-center justify-center text-2xl shadow-sm">
                  {step.emoji}
                </div>
                <span className="text-xs font-bold text-primary uppercase tracking-widest block mb-2">
                  {step.num}
                </span>
                <h3 className="font-display font-semibold text-base mb-2">{step.title}</h3>
                <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Button size="lg" asChild>
              <Link href="/catalog">
                Перейти в каталог
                <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ===== CALCULATOR CTA ===== */}
      <section className="bg-primary/5 border-y border-primary/10">
        <div className="container mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/15 flex items-center justify-center shrink-0">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-primary" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="3" strokeLinejoin="round"/>
                <path d="M7 7h4M7 12h10M7 17h7" strokeLinecap="round"/>
                <path d="M15 7h2" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-display font-bold">Калькулятор пиломатериалов</h2>
              <p className="text-muted-foreground text-sm mt-0.5">
                Рассчитайте точное количество и стоимость за 30 секунд
              </p>
            </div>
          </div>
          <Link
            href="/calculator"
            className="shrink-0 inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-colors shadow-sm"
          >
            Открыть калькулятор
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* ===== ABOUT PRODUCTION ===== */}
      <section className="py-20 relative overflow-hidden text-white">
        <div className="absolute inset-0">
          <Image
            src="/images/production/hero-about.jpg"
            alt="Производство пиломатериалов ПилоРус"
            fill
            className="object-cover object-center"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-black/85" />
        </div>
        <div className="container relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="font-display font-bold text-4xl mb-6">
                О нашем производстве
              </h2>
              <div className="space-y-4 text-white/80 leading-relaxed">
                <p>
                  ООО «ПИТИ» — производитель пиломатериалов, расположенный в Химках
                  на территории 2000 м². Мы работаем напрямую с потребителями,
                  предлагая честные цены без посреднических наценок.
                </p>
                <p>
                  Наша продукция: доска обрезная, брус строительный, вагонка, блок-хаус,
                  погонаж и другие виды пиломатериалов. Вся продукция проходит
                  контроль качества по ГОСТ.
                </p>
                <p>
                  Доставляем по Москве и Московской области собственным транспортом
                  в течение 1-3 рабочих дней.
                </p>
              </div>
              <div className="flex flex-wrap gap-4 mt-8">
                {[
                  { icon: CheckCircle, text: "Официальное ООО, работаем по договору" },
                  { icon: CheckCircle, text: "Сертифицированная продукция ГОСТ" },
                  { icon: CheckCircle, text: "Собственный парк техники" },
                  { icon: CheckCircle, text: "Антисептирование по запросу" },
                ].map((item) => (
                  <div key={item.text} className="flex items-center gap-2 text-sm text-white/90">
                    <item.icon className="w-4 h-4 text-brand-orange shrink-0" />
                    {item.text}
                  </div>
                ))}
              </div>
              <div className="mt-8">
                <Button className="bg-brand-orange hover:bg-brand-orange/90 text-white" size="lg" asChild>
                  <Link href="/about">Подробнее о производстве</Link>
                </Button>
              </div>
            </div>
            {/* Stat cards — glassmorphism на тёмном фоне */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { value: "2 000", unit: "м²", label: "Площадь склада", icon: (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M2 22V9L12 3L22 9V22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M2 22h20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    <path d="M9 22v-7h6v7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )},
                { value: "500+", unit: "", label: "Довольных клиентов", icon: (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <circle cx="9" cy="7" r="3" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    <path d="M16 11c1.7 0 3 1.3 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    <path d="M19 20c0-2.2-1.3-4.1-3-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    <circle cx="16" cy="8" r="2" stroke="currentColor" strokeWidth="1.5"/>
                  </svg>
                )},
                { value: "10+", unit: " лет", label: "На рынке", icon: (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )},
                { value: "1–3", unit: " дня", label: "Срок доставки", icon: (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M1 4h13v13H1V4z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                    <path d="M14 9h4.5L22 13v4h-8V9z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                    <circle cx="5" cy="19" r="2" stroke="currentColor" strokeWidth="1.5"/>
                    <circle cx="18" cy="19" r="2" stroke="currentColor" strokeWidth="1.5"/>
                  </svg>
                )},
              ].map((stat) => (
                <div key={stat.label} className="rounded-2xl bg-white/[0.06] border border-white/[0.12] backdrop-blur-sm p-5 flex flex-col gap-3 hover:bg-white/[0.1] transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-brand-orange/20 border border-brand-orange/30 flex items-center justify-center text-brand-orange shrink-0">
                    {stat.icon}
                  </div>
                  <div>
                    <p className="font-display font-bold text-3xl text-white leading-none">
                      {stat.value}<span className="text-xl text-brand-orange">{stat.unit}</span>
                    </p>
                    <p className="text-white/50 text-xs mt-1.5 leading-tight">{stat.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== DELIVERY INFO ===== */}
      <section className="py-16 bg-muted/30">
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-start">

            {/* Left: hero callout */}
            <div>
              <h2 className="font-display font-bold text-3xl sm:text-4xl lg:text-5xl mb-5 leading-tight">
                Доставка по Москве и МО
              </h2>
              <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
                Собственный парк техники — доставляем за 1–3 рабочих дня.
                Погрузка включена в стоимость.
              </p>
              <div className="bg-brand-orange/8 border border-brand-orange/25 rounded-2xl p-5 mb-6">
                <p className="text-sm text-muted-foreground mb-1.5">Узнать стоимость доставки:</p>
                <a
                  href={`tel:${phoneLink}`}
                  className="font-display font-bold text-2xl sm:text-3xl text-brand-orange hover:underline block"
                >
                  {phoneDisplay}
                </a>
              </div>
              <Button variant="outline" size="lg" asChild>
                <Link href="/delivery">
                  Подробнее о доставке
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </Button>
            </div>

            {/* Right: 3 compact feature blocks */}
            <div className="space-y-4">
              {[
                {
                  svg: <IconTruck className="w-6 h-6 text-brand-orange" />,
                  bg: "bg-brand-orange/10 dark:bg-brand-orange/15",
                  title: "Быстрая доставка",
                  items: ["Москва и МО — 1-3 рабочих дня", "Собственный транспорт, погрузка включена", `Работаем ${workingHours}`],
                },
                {
                  svg: <IconWarehouse className="w-6 h-6 text-brand-green" />,
                  bg: "bg-brand-green/10 dark:bg-brand-green/15",
                  title: "Самовывоз со склада",
                  items: ["Химки, Заводская 2А, стр.28", `Режим: ${workingHours}`, "Помощь погрузчика, предзаказ по телефону"],
                },
                {
                  svg: (
                    <svg className="w-6 h-6 text-sky-500" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                      <path d="M2 10h20" stroke="currentColor" strokeWidth="1.5"/>
                      <path d="M6 15h4M14 15h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  ),
                  bg: "bg-sky-500/10 dark:bg-sky-500/15",
                  title: "Удобная оплата",
                  items: ["Наличными или переводом на карту", "Безналичный расчёт для ИП/ООО с НДС", "Счёт и полный пакет документов"],
                },
              ].map((block) => (
                <div key={block.title} className="flex gap-4 p-5 bg-card rounded-2xl border border-border hover:shadow-md transition-all">
                  <div className={`w-11 h-11 rounded-xl ${block.bg} flex items-center justify-center shrink-0`}>
                    {block.svg}
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-base mb-2">{block.title}</h3>
                    <ul className="space-y-1">
                      {block.items.map((item) => (
                        <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <CheckCircle className="w-3.5 h-3.5 text-brand-green mt-0.5 shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== REVIEWS ===== */}
      {reviews.length > 0 && (
        <section className="py-16">
          <div className="container">
            {/* Rating header */}
            <div className="flex flex-col sm:flex-row items-center gap-5 sm:gap-8 mb-10">
              {(() => {
                const avg = reviews.length > 0
                  ? reviews.reduce((sum: number, r: any) => sum + (r.rating || 5), 0) / reviews.length
                  : 5;
                const rounded = Math.round(avg * 10) / 10;
                return (
                  <div className="text-center shrink-0">
                    <p className="font-display font-bold text-6xl sm:text-7xl text-primary leading-none">{rounded}</p>
                    <div className="flex gap-0.5 justify-center mt-2">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`w-5 h-5 ${i < Math.round(avg) ? "fill-yellow-400 text-yellow-400" : "fill-muted text-muted"}`} />
                      ))}
                    </div>
                    <p className="text-muted-foreground text-xs mt-1.5">средняя оценка</p>
                  </div>
                );
              })()}
              <div className="w-px h-16 bg-border hidden sm:block" />
              <div className="text-center sm:text-left flex-1">
                <h2 className="font-display font-bold text-3xl sm:text-4xl">Отзывы покупателей</h2>
                <p className="text-muted-foreground mt-1">{reviews.length}+ реальных отзывов от наших клиентов</p>
              </div>
              <div className="shrink-0">
                <HomeReviewPopup />
              </div>
            </div>

            {/* Mobile: horizontal scroll-snap; Desktop: grid */}
            <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4 -mx-4 px-4 md:mx-0 md:px-0 md:grid md:grid-cols-2 lg:grid-cols-3 md:overflow-visible md:snap-none">
              {reviews.map((review) => (
                <div
                  key={review.id}
                  className="bg-card rounded-2xl p-5 border border-border snap-start w-[85vw] sm:w-[70vw] md:w-auto md:min-w-0 shrink-0 md:shrink flex flex-col overflow-hidden"
                >
                  <div className="flex items-center gap-1 mb-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${i < review.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`}
                      />
                    ))}
                  </div>
                  <p className="text-sm leading-relaxed mb-4 text-muted-foreground flex-1 line-clamp-5 md:line-clamp-none">
                    &ldquo;{review.text}&rdquo;
                  </p>
                  <div className="flex items-center gap-3 mt-auto">
                    <div className={`w-9 h-9 rounded-full ${getAvatarColor(review.name)} flex items-center justify-center text-white font-bold text-sm shrink-0`}>
                      {review.name.charAt(0).toUpperCase()}
                    </div>
                    <p className="font-medium text-sm">{review.name}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ===== SUBSCRIBE ===== */}
      <SubscribeSection />

      {/* ===== CTA ===== */}
      <section className="py-24 relative overflow-hidden text-white">
        <div className="absolute inset-0">
          <Image
            src="/images/production/hero-cta.jpg"
            alt="Производство ПилоРус"
            fill
            className="object-cover object-center"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-black/18" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-black/55 to-black/70" />
        </div>
        <div className="container text-center relative z-10">
          <h2 className="font-display font-bold text-3xl sm:text-5xl mb-4 drop-shadow-lg">
            Готовы сделать заказ?
          </h2>
          <p className="text-white/80 text-lg mb-10 max-w-xl mx-auto">
            Позвоните нам или оформите заявку онлайн. Ответим в течение 15 минут
          </p>
          {/* Glass badges */}
          <div className="flex flex-wrap justify-center gap-3 mb-10">
            {[
              { icon: "✓", text: "Более 500 клиентов" },
              { icon: "🚛", text: "Доставка 1–3 дня" },
              { icon: "🏭", text: "10+ лет работы" },
              { icon: "📋", text: "Работаем по договору" },
            ].map((item) => (
              <div
                key={item.text}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-md text-sm font-medium"
              >
                <span>{item.icon}</span>
                {item.text}
              </div>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {/* Кнопка 1 — оранжевая */}
            <Link
              href="/catalog"
              className="inline-flex items-center justify-center gap-2 h-14 px-10 rounded-xl bg-brand-orange hover:bg-brand-orange/90 active:scale-95 text-white text-lg font-semibold shadow-2xl shadow-brand-orange/40 transition-all duration-200"
            >
              Выбрать товары
              <ArrowRight className="w-5 h-5" />
            </Link>
            {/* Кнопка 2 — glassmorphism */}
            <a
              href={`tel:${phoneLink}`}
              className="inline-flex items-center justify-center gap-2 h-14 px-10 rounded-xl bg-white/10 hover:bg-white/18 active:scale-95 border border-white/25 hover:border-white/45 text-white text-lg font-semibold backdrop-blur-md transition-all duration-200 shadow-lg"
            >
              <Phone className="w-5 h-5 shrink-0 text-brand-orange" />
              {phoneDisplay}
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
