import type { Metadata } from "next";
import { Phone, Mail, MapPin, Clock } from "lucide-react";
import { ContactForm } from "@/components/store/contact-form";
import { BackButton } from "@/components/ui/back-button";

export const metadata: Metadata = {
  title: "Контакты — адрес, телефоны, как проехать | ПилоРус",
  description: "Контакты ПилоРус: телефоны 8-985-970-71-33, 8-999-662-26-02. Адрес: Химки, Заводская 2А стр.28. Режим работы: пн-пт 8:00–19:00, сб 9:00–17:00.",
  keywords: ["пилорус контакты", "адрес склада химки", "пиломатериалы химки телефон", "купить доски химки адрес"],
  openGraph: {
    title: "Контакты ПилоРус — Химки, Заводская 2А стр.28",
    description: "Телефоны, адрес склада, режим работы. Самовывоз и доставка по Москве и МО.",
    url: "https://pilo-rus.ru/contacts",
    type: "website",
  },
  alternates: { canonical: "https://pilo-rus.ru/contacts" },
};

export default function ContactsPage() {
  return (
    <div className="container py-12">
      <div className="flex items-start gap-3 mb-3">
        <BackButton href="/" label="Главная" className="mt-1 mb-0 shrink-0" />
        <h1 className="font-display font-bold text-4xl">Контакты</h1>
      </div>
      <p className="text-muted-foreground text-lg mb-10">Мы всегда рады помочь вам с выбором</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Contact cards */}
        <div className="space-y-5">
          {[
            {
              icon: Phone,
              title: "Телефоны",
              items: [
                { label: "8-985-970-71-33", href: "tel:+79859707133" },
                { label: "8-999-662-26-02", href: "tel:+79996622602" },
              ],
              color: "text-brand-orange",
              bg: "bg-brand-orange/10",
            },
            {
              icon: Mail,
              title: "Email",
              items: [{ label: "info@pilo-rus.ru", href: "mailto:info@pilo-rus.ru" }],
              color: "text-blue-600",
              bg: "bg-blue-100",
            },
            {
              icon: MapPin,
              title: "Адрес",
              items: [{ label: "Московская обл., г. Химки, ул. Заводская 2А, стр.28", href: "#map" }],
              color: "text-brand-green",
              bg: "bg-brand-green/10",
            },
            {
              icon: Clock,
              title: "Режим работы",
              items: [{ label: "Пн–Сб: 09:00–20:00, Вс: 09:00–18:00", href: null }],
              color: "text-purple-600",
              bg: "bg-purple-100",
            },
          ].map((block) => (
            <div key={block.title} className="flex gap-4 p-5 bg-card rounded-2xl border border-border">
              <div className={`w-12 h-12 ${block.bg} rounded-xl flex items-center justify-center shrink-0`}>
                <block.icon className={`w-6 h-6 ${block.color}`} />
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
              <p>ООО «ПИТИ»</p>
              <p>ИНН: 5047121641</p>
              <p>КПП: 504701001</p>
              <p>ОГРН: 1235000042474</p>
            </div>
          </div>
        </div>

        {/* Quick request form */}
        <ContactForm />
      </div>
    </div>
  );
}
