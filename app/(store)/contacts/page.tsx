import type { Metadata } from "next";
import { Phone, Mail, MapPin, Clock } from "lucide-react";

export const metadata: Metadata = {
  title: "Контакты",
  description: "Контакты ПилоРус: телефоны, адрес, режим работы. Московская обл., г. Химки, Заводская 2А, стр.28",
};

export default function ContactsPage() {
  return (
    <div className="container py-12">
      <h1 className="font-display font-bold text-4xl mb-3">Контакты</h1>
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
              items: [{ label: "Ежедневно: 09:00 – 18:00", href: null }],
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
              <p>ИНН: 504712164</p>
              <p>КПП: 504701001</p>
            </div>
          </div>
        </div>

        {/* Quick request form */}
        <div className="bg-card rounded-2xl border border-border p-6">
          <h2 className="font-display font-bold text-xl mb-4">Оставить заявку</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Отправьте нам сообщение — перезвоним в течение 15 минут
          </p>
          <form className="space-y-4" action="/api/orders" method="POST">
            <div>
              <label className="text-sm font-medium block mb-1">Ваше имя</label>
              <input
                type="text"
                placeholder="Иван Иванов"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Телефон *</label>
              <input
                type="tel"
                placeholder="+7 (999) 000-00-00"
                required
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Вопрос или пожелание</label>
              <textarea
                rows={4}
                placeholder="Что вас интересует?"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <a
              href="tel:+79859707133"
              className="block w-full bg-primary text-primary-foreground text-center py-3 rounded-xl font-semibold hover:bg-primary/90 transition-colors"
            >
              📞 Позвонить сейчас
            </a>
          </form>
        </div>
      </div>
    </div>
  );
}
