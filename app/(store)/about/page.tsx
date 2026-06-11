import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle, Factory, Award, Users, Leaf, PhoneCall } from "lucide-react";
import { BackButton } from "@/components/ui/back-button";
import { getSiteSettings, getSetting, getPhones } from "@/lib/site-settings";

export const metadata: Metadata = {
  title: "О производстве — ООО «ДЕРЕВОЛИДЕР», Химки",
  description: "ООО «ДЕРЕВОЛИДЕР» (ПилоРус) — производитель пиломатериалов в Химках. Склад, ГОСТ, напрямую без посредников.",
  keywords: ["ООО ДЕРЕВОЛИДЕР", "производство пиломатериалов Химки", "о компании пилорус", "пиломатериалы производитель Подмосковье"],
  openGraph: {
    title: "О производстве ПилоРус — ООО «ДЕРЕВОЛИДЕР», Химки МО",
    description: "Производитель пиломатериалов с 2013 года. Склад 2000 м², ГОСТ, без посредников.",
    url: "https://pilo-rus.ru/about",
    type: "website",
  },
  alternates: { canonical: "https://pilo-rus.ru/about" },
};

export default async function AboutPage() {
  const siteSettings = await getSiteSettings();
  const phones = getPhones(siteSettings);
  const email = getSetting(siteSettings, "email");
  const address = getSetting(siteSettings, "address");
  const companyName = getSetting(siteSettings, "company_name");
  const legalFullName = getSetting(siteSettings, "legal_full_name") || companyName;
  const inn = getSetting(siteSettings, "inn");
  const ogrn = getSetting(siteSettings, "ogrn");
  const kpp = getSetting(siteSettings, "kpp");
  const settlementAccount = getSetting(siteSettings, "settlement_account");
  const bankName = getSetting(siteSettings, "bank_name");
  const correspondentAccount = getSetting(siteSettings, "correspondent_account");
  const bik = getSetting(siteSettings, "bik");
  const okpo = getSetting(siteSettings, "okpo");
  const aboutPageSchema = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    "name": "О производстве ПилоРус",
    "url": "https://pilo-rus.ru/about",
    "mainEntity": {
      "@type": "Organization",
      "name": "ПилоРус",
      "legalName": legalFullName,
      "email": email,
      "telephone": phones.map((phone) => phone.display),
      "taxID": inn,
      "address": {
        "@type": "PostalAddress",
        "streetAddress": address,
        "addressLocality": "Химки",
        "addressRegion": "Московская область",
        "addressCountry": "RU",
      },
      "description": "Производитель пиломатериалов в Химках. Склад 2000 м², ГОСТ, доставка по Москве и Московской области.",
    },
  };

  return (
    <div className="container py-8 sm:py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutPageSchema) }}
      />
      <div className="flex items-start gap-3 mb-4">
        <BackButton href="/" label="Главная" className="mt-1 mb-0 shrink-0" />
        <h1 className="font-display text-3xl font-bold leading-tight sm:text-4xl">О производстве</h1>
      </div>
      <p className="mb-8 max-w-2xl text-base leading-relaxed text-muted-foreground sm:mb-10 sm:text-lg">
        {companyName} — производитель пиломатериалов в Подмосковье. Работаем напрямую
        с потребителями уже более 10 лет.
      </p>

      {/* Company facts */}
      <div className="mb-10 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 sm:mb-12">
        {[
          { value: "2000 м²", label: "Площадь склада" },
          { value: "10+", label: "Лет на рынке" },
          { value: "500+", label: "Клиентов" },
          { value: "100%", label: "ГОСТ" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-border bg-card p-4 text-center sm:p-6">
            <p className="mb-1 font-display text-3xl font-bold text-primary sm:mb-2 sm:text-4xl">{stat.value}</p>
            <p className="text-xs text-muted-foreground sm:text-sm">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Main content */}
      <div className="mb-10 grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-10 sm:mb-12">
        <div className="space-y-6">
          <div>
            <h2 className="mb-3 font-display text-xl font-bold sm:mb-4 sm:text-2xl">Наша история</h2>
            <div className="space-y-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
              <p>
                {companyName} работает на рынке пиломатериалов более 10 лет. За это время
                мы выстроили надёжные отношения с клиентами — строительными компаниями,
                частными застройщиками и розничными покупателями.
              </p>
              <p>
                Наше производство расположено в г. Химки Московской области на площади
                2000 м². Мы оснащены современным оборудованием для производства широкого
                ассортимента пиломатериалов: доски обрезной, бруса, вагонки, блок-хауса и погонажа.
              </p>
              <p>
                Работаем напрямую с конечным потребителем — без посредников. Это позволяет
                нам предлагать честные цены и гибкие условия сотрудничества.
              </p>
            </div>
          </div>

          <div>
            <h2 className="mb-3 font-display text-xl font-bold sm:mb-4 sm:text-2xl">Наши преимущества</h2>
            <ul className="space-y-3">
              {[
                "Производство полного цикла на собственных мощностях",
                "Строгий контроль качества на каждом этапе",
                "Сертифицированная продукция по ГОСТ",
                "Антисептирование материала по запросу",
                "Возможность изготовления по индивидуальным размерам",
                "Официальные документы: накладная, счёт-фактура",
                "Собственный транспорт для доставки",
                "Работа с юридическими лицами (НДС)",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm">
                  <CheckCircle className="w-4 h-4 text-brand-green mt-0.5 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="space-y-4">
          {[
            {
              icon: Factory,
              title: "Производственная база",
              desc: "Складской комплекс площадью 2000 м² в г. Химки. Собственные пилорамы и деревообрабатывающие станки.",
              color: "text-brand-orange",
              bg: "bg-brand-orange/10",
            },
            {
              icon: Award,
              title: "Качество и сертификация",
              desc: "Вся продукция изготавливается по ГОСТ. Мы несём ответственность за качество каждой партии.",
              color: "text-blue-600",
              bg: "bg-blue-100",
            },
            {
              icon: Leaf,
              title: "Экологичность",
              desc: "Используем древесину из легальных источников. Все отходы производства перерабатываются.",
              color: "text-brand-green",
              bg: "bg-brand-green/10",
            },
            {
              icon: Users,
              title: "Команда",
              desc: "Опытная команда специалистов с более чем 10-летним стажем в деревообработке.",
              color: "text-purple-600",
              bg: "bg-purple-100",
            },
          ].map((block) => (
            <div key={block.title} className="flex gap-3 rounded-2xl border border-border bg-card p-4 sm:gap-4 sm:p-5">
              <div className="store-icon-tile h-10 w-10 shrink-0 rounded-xl sm:h-12 sm:w-12">
                <block.icon className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div>
                <h3 className="mb-1 text-sm font-semibold sm:text-base">{block.title}</h3>
                <p className="text-sm text-muted-foreground">{block.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="store-landing-band mb-8 rounded-2xl border p-5 sm:mb-10 sm:p-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[0.9fr_1.4fr] lg:gap-8">
          <div>
            <h2 className="mb-3 font-display text-xl font-bold sm:text-2xl">Как держим качество</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Для покупателя важно не просто купить доску, а получить понятную партию: порода, сорт, размеры, документы и срок отгрузки должны совпасть с заказом.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {[
              { icon: Factory, title: "Своя база", text: "Материал проходит через склад и производство в Химках." },
              { icon: Award, title: "ГОСТ и сорт", text: "Сверяем сортность, размеры и состояние перед продажей." },
              { icon: Leaf, title: "Понятная древесина", text: "Работаем с легальными поставками и известными породами." },
              { icon: Users, title: "Менеджер рядом", text: "Помогаем подобрать замену, если нужен другой размер." },
            ].map((step) => (
              <div key={step.title} className="flex gap-3">
                <div className="store-icon-tile w-10 h-10 rounded-xl shrink-0">
                  <step.icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold leading-tight">{step.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{step.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Rekvizity */}
      <div className="store-landing-band mb-8 rounded-2xl border p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <h2 className="font-display text-xl font-bold sm:text-2xl">Нужна партия под объект?</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Отправьте размеры и объем: подберем материал, проверим наличие, посчитаем доставку и документы.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:min-w-[360px]">
            <Link
              href="/calculator"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
            >
              Рассчитать заказ
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/contacts"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border bg-background/50 px-4 text-sm font-semibold transition hover:border-primary/50 hover:text-primary"
            >
              <PhoneCall className="h-4 w-4" />
              Связаться
            </Link>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-muted/30 p-5 sm:p-6">
        <h2 className="font-display font-semibold text-xl mb-4">Реквизиты</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div className="space-y-2 text-muted-foreground">
            <p><strong className="text-foreground">Полное название:</strong> {legalFullName}</p>
            <p><strong className="text-foreground">Краткое название:</strong> {companyName}</p>
            <p><strong className="text-foreground">ОГРН:</strong> {ogrn}</p>
            <p><strong className="text-foreground">ИНН:</strong> {inn}</p>
            <p><strong className="text-foreground">КПП:</strong> {kpp}</p>
            <p><strong className="text-foreground">ОКПО:</strong> {okpo}</p>
          </div>
          <div className="space-y-2 text-muted-foreground">
            <p><strong className="text-foreground">Юридический адрес:</strong> {address}</p>
            <p><strong className="text-foreground">Расчетный счет:</strong> {settlementAccount}</p>
            <p><strong className="text-foreground">Банк:</strong> {bankName}</p>
            <p><strong className="text-foreground">Корр. счет:</strong> {correspondentAccount}</p>
            <p><strong className="text-foreground">БИК:</strong> {bik}</p>
            <p><strong className="text-foreground">Email:</strong> {email}</p>
            <p><strong className="text-foreground">Телефон:</strong>{" "}
              {phones.map((p, i) => (
                <span key={p.tel}>
                  <a href={`tel:${p.tel}`} className="hover:underline">{p.display}</a>
                  {i < phones.length - 1 && " · "}
                </span>
              ))}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
