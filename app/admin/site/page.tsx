"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Save, Check, Loader2, Phone, MapPin, Clock, Building2, Globe, MessageCircle, Mail, Send, Info } from "lucide-react";

type Settings = Record<string, string>;

export default function AdminSitePage() {
  const [settings, setSettings] = useState<Settings>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<"contacts" | "company" | "seo" | "footer" | "widget">("contacts");

  useEffect(() => {
    fetch("/api/admin/site-settings").then(r => r.json()).then(data => {
      setSettings(data);
      setLoading(false);
    });
  }, []);

  const set = (key: string, value: string) => setSettings(prev => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    await fetch("/api/admin/site-settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const Field = ({ label, settingKey, placeholder, type = "text", rows }: {
    label: string; settingKey: string; placeholder?: string; type?: string; rows?: number;
  }) => (
    <div>
      <label className="block text-sm font-medium mb-1.5">{label}</label>
      {rows ? (
        <textarea
          value={settings[settingKey] ?? ""}
          onChange={e => set(settingKey, e.target.value)}
          rows={rows}
          placeholder={placeholder}
          className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
        />
      ) : (
        <input
          type={type}
          value={settings[settingKey] ?? ""}
          onChange={e => set(settingKey, e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      )}
    </div>
  );

  const tabs = [
    { id: "contacts", label: "Контакты" },
    { id: "company", label: "Компания" },
    { id: "seo", label: "SEO" },
    { id: "footer", label: "Футер" },
    { id: "widget", label: "Виджет" },
  ] as const;

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl">Настройки сайта</h1>
          <p className="text-sm text-muted-foreground mt-1">Контакты, текст страниц, SEO — всё в одном месте</p>
        </div>
        <Button onClick={handleSave} disabled={saving || saved} className="min-w-[130px]">
          {saved ? <><Check className="w-4 h-4 mr-2" /> Сохранено!</> :
           saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Сохранение...</> :
           <><Save className="w-4 h-4 mr-2" /> Сохранить</>}
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted/50 p-1 rounded-xl w-fit flex-wrap">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-card rounded-2xl border border-border p-6 space-y-5">
        {activeTab === "contacts" && (
          <>
            <h2 className="font-semibold flex items-center gap-2"><Phone className="w-4 h-4 text-primary" /> Контактная информация</h2>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Телефон (отображаемый)" settingKey="phone" placeholder="8-985-970-71-33" />
              <Field label="Телефон (для ссылки tel:)" settingKey="phone_link" placeholder="+79859707133" />
              <Field label="Email" settingKey="email" placeholder="info@pilo-rus.ru" type="email" />
              <Field label="Минимальный заказ" settingKey="min_order" placeholder="1 м³" />
            </div>
            <hr className="border-border" />
            <h3 className="font-medium flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" /> Адрес и карта</h3>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Адрес" settingKey="address" placeholder="Химки, ул. Заводская 2А, стр.28" />
              <Field label="Ссылка на Яндекс.Карты" settingKey="address_map" placeholder="https://yandex.ru/maps/..." />
            </div>
            <hr className="border-border" />
            <h3 className="font-medium flex items-center gap-2"><Clock className="w-4 h-4 text-primary" /> Режим работы</h3>
            <Field label="Часы работы" settingKey="working_hours" placeholder="Пн–Пт: 09:00–18:00, Сб: 09:00–15:00" />
            <hr className="border-border" />
            <h3 className="font-medium flex items-center gap-2"><MessageCircle className="w-4 h-4 text-primary" /> Соцсети и мессенджеры</h3>
            <div className="grid grid-cols-2 gap-4">
              <Field label="WhatsApp (номер)" settingKey="social_whatsapp" placeholder="+79859707133" />
              <Field label="Telegram (username)" settingKey="social_telegram" placeholder="@piloruswood" />
              <Field label="ВКонтакте (URL)" settingKey="social_vk" placeholder="https://vk.com/piloruswood" />
            </div>
            <hr className="border-border" />
            <h3 className="font-medium">Текст страницы «Контакты»</h3>
            <Field label="Описание под заголовком" settingKey="contacts_description" rows={3} placeholder="Мы работаем с физическими и юридическими лицами..." />
          </>
        )}

        {activeTab === "company" && (
          <>
            <h2 className="font-semibold flex items-center gap-2"><Building2 className="w-4 h-4 text-primary" /> Информация о компании</h2>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Название компании" settingKey="company_name" placeholder="ООО ПИТИ (ПилоРус)" />
              <Field label="ИНН" settingKey="inn" placeholder="7735711780" />
              <Field label="ОГРН" settingKey="ogrn" placeholder="1157746520813" />
            </div>
            <hr className="border-border" />
            <h3 className="font-medium">Текст «О нас»</h3>
            <Field label="Основной текст (страница О производстве)" settingKey="about_text" rows={5} placeholder="Производим и продаём пиломатериалы..." />
            <hr className="border-border" />
            <h3 className="font-medium">Текст «Доставка»</h3>
            <Field label="Описание доставки (страница Доставка)" settingKey="delivery_text" rows={4} placeholder="Доставляем по Москве и МО..." />
          </>
        )}

        {activeTab === "seo" && (
          <>
            <h2 className="font-semibold flex items-center gap-2"><Globe className="w-4 h-4 text-primary" /> SEO настройки</h2>
            <p className="text-sm text-muted-foreground">Эти данные используются для главной страницы. Страницы товаров и категорий генерируют SEO автоматически.</p>
            <Field label="Meta Title (заголовок в Google)" settingKey="seo_title" placeholder="ПилоРус — пиломатериалы от производителя в Химках" />
            <p className="text-xs text-muted-foreground -mt-3">Рекомендуется 50–60 символов. Текущая длина: {(settings["seo_title"] || "").length}</p>
            <Field label="Meta Description (описание в Google)" settingKey="seo_description" rows={3} placeholder="Производство и продажа пиломатериалов в Химках..." />
            <p className="text-xs text-muted-foreground -mt-3">Рекомендуется 150–160 символов. Текущая длина: {(settings["seo_description"] || "").length}</p>
          </>
        )}

        {activeTab === "footer" && (
          <>
            <h2 className="font-semibold">Футер (нижняя часть сайта)</h2>
            <Field label="Строка Copyright" settingKey="footer_copyright" placeholder="© 2024 ПилоРус. Все права защищены." />
            <div className="p-4 bg-muted/30 rounded-xl border border-border text-sm text-muted-foreground">
              <Info className="w-3.5 h-3.5 inline mr-1 opacity-60" /> Остальные данные в футере (телефон, адрес, часы) берутся из раздела <strong>«Контакты»</strong> выше и обновляются автоматически.
            </div>
          </>
        )}

        {activeTab === "widget" && (
          <>
            <h2 className="font-semibold flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-primary" /> Виджет связи
            </h2>
            <p className="text-sm text-muted-foreground -mt-2">
              Плавающая кнопка в углу сайта. Добавляйте каналы — они появятся автоматически.
            </p>

            {/* Enable/disable + position */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Виджет</label>
                <div className="flex gap-2">
                  {[{ v: "true", l: "Включён" }, { v: "false", l: "Выключен" }].map(opt => (
                    <button key={opt.v} type="button"
                      onClick={() => set("widget_enabled", opt.v)}
                      className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${
                        (settings["widget_enabled"] ?? "true") === opt.v
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border hover:bg-muted text-muted-foreground"
                      }`}
                    >{opt.l}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Позиция</label>
                <div className="flex gap-2">
                  {[{ v: "right", l: "Справа" }, { v: "left", l: "Слева" }].map(opt => (
                    <button key={opt.v} type="button"
                      onClick={() => set("widget_position", opt.v)}
                      className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${
                        (settings["widget_position"] ?? "right") === opt.v
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border hover:bg-muted text-muted-foreground"
                      }`}
                    >{opt.l}</button>
                  ))}
                </div>
              </div>
            </div>

            <Field label="Текст кнопки" settingKey="widget_label" placeholder="Связаться" />

            <hr className="border-border" />
            <h3 className="font-medium">Каналы связи</h3>
            <p className="text-xs text-muted-foreground -mt-3">Заполненные поля автоматически появляются в виджете</p>

            {/* Phone — берётся из контактов, просто показываем */}
            <div className="flex items-center gap-3 p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
              <Phone className="w-5 h-5 text-emerald-600" />
              <div className="flex-1">
                <p className="text-sm font-medium">Телефон</p>
                <p className="text-xs text-muted-foreground">
                  {settings["phone"] || "Настройте в разделе «Контакты»"}
                </p>
              </div>
              <span className="text-xs bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full">Всегда активен</span>
            </div>

            {/* WhatsApp */}
            <div className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl">
              <MessageCircle className="w-5 h-5 text-[#25D366]" />
              <div className="flex-1">
                <p className="text-sm font-medium">WhatsApp</p>
                <input
                  value={settings["social_whatsapp"] ?? ""}
                  onChange={e => set("social_whatsapp", e.target.value)}
                  placeholder="+79859707133"
                  className="mt-1 w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>

            {/* Telegram */}
            <div className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl">
              <Send className="w-5 h-5 text-[#2AABEE]" />
              <div className="flex-1">
                <p className="text-sm font-medium">Telegram</p>
                <input
                  value={settings["social_telegram"] ?? ""}
                  onChange={e => set("social_telegram", e.target.value)}
                  placeholder="@piloruswood или https://t.me/..."
                  className="mt-1 w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>

            {/* VK */}
            <div className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl">
              <Globe className="w-5 h-5 text-[#0077FF]" />
              <div className="flex-1">
                <p className="text-sm font-medium">ВКонтакте</p>
                <input
                  value={settings["social_vk"] ?? ""}
                  onChange={e => set("social_vk", e.target.value)}
                  placeholder="https://vk.com/piloruswood"
                  className="mt-1 w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>

            {/* Email toggle */}
            <div className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl">
              <Mail className="w-5 h-5 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm font-medium">Email в виджете</p>
                <p className="text-xs text-muted-foreground">{settings["email"] || "Настройте в разделе «Контакты»"}</p>
              </div>
              <button type="button"
                onClick={() => set("widget_show_email", settings["widget_show_email"] === "true" ? "false" : "true")}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                  settings["widget_show_email"] === "true"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                {settings["widget_show_email"] === "true" ? "Показывать" : "Скрыт"}
              </button>
            </div>

            {/* Preview */}
            <div className="p-4 bg-muted/30 rounded-xl border border-border">
              <p className="text-xs font-medium text-muted-foreground mb-3">ПРЕДПРОСМОТР активных каналов:</p>
              <div className="flex flex-wrap gap-2">
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 text-white rounded-xl text-xs font-medium"><Phone className="w-3 h-3" /> Телефон</span>
                {settings["social_whatsapp"] && <span className="flex items-center gap-1.5 px-3 py-1.5 bg-[#25D366] text-white rounded-xl text-xs font-medium"><MessageCircle className="w-3 h-3" /> WhatsApp</span>}
                {settings["social_telegram"] && <span className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2AABEE] text-white rounded-xl text-xs font-medium"><Send className="w-3 h-3" /> Telegram</span>}
                {settings["social_vk"] && <span className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0077FF] text-white rounded-xl text-xs font-medium"><Globe className="w-3 h-3" /> ВКонтакте</span>}
                {settings["widget_show_email"] === "true" && <span className="flex items-center gap-1.5 px-3 py-1.5 bg-muted border border-border rounded-xl text-xs font-medium"><Mail className="w-3 h-3" /> Email</span>}
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                <Info className="w-3.5 h-3.5 inline mr-1 opacity-60" /> В будущем сюда легко добавить Viber, Instagram, онлайн-чат — просто добавить новую строку
              </p>
            </div>
          </>
        )}
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving || saved} size="lg">
          {saved ? <><Check className="w-4 h-4 mr-2" /> Сохранено!</> :
           saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Сохранение...</> :
           <><Save className="w-4 h-4 mr-2" /> Сохранить изменения</>}
        </Button>
      </div>
    </div>
  );
}
