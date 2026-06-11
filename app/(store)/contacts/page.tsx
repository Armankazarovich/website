import type { Metadata } from "next";
import { Phone, Mail, MapPin, Clock } from "lucide-react";
import { ContactForm } from "@/components/store/contact-form";
import { BackButton } from "@/components/ui/back-button";
import { getSiteSettings, getSetting, getPhones } from "@/lib/site-settings";

export const metadata: Metadata = {
  title: "Контакты — адрес, телефоны, как проехать",
  description: "Контакты ПилоРус: адрес склада г. Химки, Заводская 2А, стр.13. Режим работы, телефоны, самовывоз и доставка.",
  keywords: ["пилорус контакты", "адрес склада химки", "пиломатериалы химки телефон", "купить доски химки адрес"],
  openGraph: {
    title: "Контакты ПилоРус — Химки, Заводская 2А, стр.13",
    description: "Телефоны, адрес склада, режим работы. Самовывоз и доставка по Москве и МО.",
    url: "https://pilo-rus.ru/contacts",
    type: "website",
  },
  alternates: { canonical: "https://pilo-rus.ru/contacts" },
};

export default async function ContactsPage() {
  const settings = await getSiteSettings();
  const workingHours = getSetting(settings, "working_hours") || "Пн–Пт: 09:00–18:00, Сб: 09:00–15:00";
  const phones = getPhones(settings);
  const firstPhoneLink = phones[0]?.tel || getSetting(settings, "phone_link");
  const email = getSetting(settings, "email");
  const address = getSetting(settings, "address");
  const companyName = getSetting(settings, "company_name");
  const legalFullName = getSetting(settings, "legal_full_name") || companyName;
  const inn = getSetting(settings, "inn");
  const ogrn = getSetting(settings, "ogrn");
  const kpp = getSetting(settings, "kpp");
  const settlementAccount = getSetting(settings, "settlement_account");
  const bankName = getSetting(settings, "bank_name");
  const correspondentAccount = getSetting(settings, "correspondent_account");
  const bik = getSetting(settings, "bik");
  const okpo = getSetting(settings, "okpo");
  const okato = getSetting(settings, "okato");
  const oktmo = getSetting(settings, "oktmo");
  const requisites = [
    ["Полное наименование", legalFullName],
    ["Краткое наименование", companyName],
    ["ОГРН", ogrn],
    ["ИНН", inn],
    ["КПП", kpp],
    ["Расчетный счет", settlementAccount],
    ["Банк", bankName],
    ["Корреспондентский счет", correspondentAccount],
    ["БИК", bik],
    ["ОКПО", okpo],
    ["ОКАТО", okato],
    ["ОКТМО", oktmo],
  ]
    .map(([label, value]) => ({ label, value }))
    .filter((item): item is { label: string; value: string } => Boolean(item.value));
  const contactPageSchema = {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    "name": "Контакты ПилоРус",
    "url": "https://pilo-rus.ru/contacts",
    "mainEntity": {
      "@type": "LocalBusiness",
      "name": "ПилоРус",
      "legalName": legalFullName,
      "telephone": phones.map((phone) => phone.display),
      "email": email,
      "address": {
        "@type": "PostalAddress",
        "streetAddress": address,
        "addressLocality": "Химки",
        "addressRegion": "Московская область",
        "addressCountry": "RU",
      },
      "openingHours": workingHours,
    },
  };

  return (
    <div className="container py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(contactPageSchema) }}
      />
      <div className="flex items-start gap-3 mb-3">
        <BackButton href="/" label="Главная" className="mt-1 mb-0 shrink-0" />
        <h1 className="font-display font-bold text-4xl">Контакты</h1>
      </div>
      <p className="text-muted-foreground text-lg mb-10">Мы всегда рады помочь вам с выбором</p>

      <div className="store-landing-band rounded-2xl border p-6 mb-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            { icon: Phone, title: "Быстрый ответ", text: "Перезвоним и уточним задачу без долгой переписки." },
            { icon: MapPin, title: "Склад в Химках", text: "Можно забрать самовывозом после подтверждения заказа." },
            { icon: Clock, title: "Рабочий график", text: "Подскажем наличие, цену и ближайшую отгрузку." },
          ].map((item) => (
            <div key={item.title} className="flex gap-3">
              <div className="store-icon-tile w-10 h-10 rounded-xl shrink-0">
                <item.icon className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-semibold leading-tight">{item.title}</h2>
                <p className="text-sm text-muted-foreground mt-1">{item.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Contact cards */}
        <div className="space-y-5">
          {[
            {
              icon: Phone,
              title: "Телефоны",
              items: phones.map((p) => ({ label: p.display, href: `tel:${p.tel}` })),
              color: "text-brand-orange",
              bg: "bg-brand-orange/10",
            },
            {
              icon: Mail,
              title: "Email",
              items: [{ label: email, href: `mailto:${email}` }],
              color: "text-blue-600",
              bg: "bg-blue-100",
            },
            {
              icon: MapPin,
              title: "Адрес",
              items: [{ label: address, href: "#map" }],
              color: "text-brand-green",
              bg: "bg-brand-green/10",
            },
            {
              icon: Clock,
              title: "Режим работы",
              items: [{ label: workingHours, href: null }],
              color: "text-purple-600",
              bg: "bg-purple-100",
            },
          ].map((block) => (
            <div key={block.title} className="flex gap-4 p-5 bg-card rounded-2xl border border-border">
              <div className="store-icon-tile w-12 h-12 rounded-xl shrink-0">
                <block.icon className="w-6 h-6" />
              </div>
              <div>
                <p className="font-semibold mb-1">{block.title}</p>
                {block.items.map((item) =>
                  item.href ? (
                    <a
                      key={item.label}
                      href={item.href}
                      className="block text-primary hover:underline text-lg font-medium"
                    >
                      {item.label}
                    </a>
                  ) : (
                    <p key={item.label} className="text-muted-foreground">{item.label}</p>
                  )
                )}
              </div>
            </div>
          ))}

          {/* Legal */}
          <div className="p-5 bg-muted/30 rounded-2xl border border-border">
            <h3 className="font-semibold mb-2">Реквизиты компании</h3>
            <div className="space-y-1 text-sm text-muted-foreground">
              {requisites.map(({ label, value }) => (
                <p key={label}>
                  <span className="font-medium text-foreground">{label}:</span> {value}
                </p>
              ))}
            </div>
          </div>
        </div>

        {/* Quick request form */}
        <ContactForm phoneLink={firstPhoneLink} />
      </div>
    </div>
  );
}
