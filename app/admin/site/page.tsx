"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Save, Check, Loader2, Phone, MapPin, Clock, Building2, Globe,
  MessageCircle, Mail, Send, Info, BarChart2, Search, ExternalLink,
  Zap, Rss, Radio, TrendingUp, Link2, Settings, Megaphone,
  LayoutPanelLeft, CheckCircle2, AlertCircle,
} from "lucide-react";

type Settings = Record<string, string>;

/* ── Toggle switch ─────────────────────────────────────────────────── */
function Toggle({ value, onChange, color = "bg-primary" }: {
  value: boolean; onChange: (v: boolean) => void; color?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`relative w-11 h-6 rounded-full transition-colors ${value ? color : "bg-muted"}`}
    >
      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${value ? "left-[22px]" : "left-0.5"}`} />
    </button>
  );
}

/* ── Section header ────────────────────────────────────────────────── */
function SectionHeader({ icon: Icon, title, desc }: { icon: React.ElementType; title: string; desc?: string }) {
  return (
    <div className="flex items-center gap-3 pb-4 border-b border-border mb-2">
      <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <h2 className="font-display font-semibold text-base">{title}</h2>
        {desc && <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>}
      </div>
    </div>
  );
}

/* ── Sub-header ────────────────────────────────────────────────────── */
function SubHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <h3 className="font-medium text-sm flex items-center gap-2 text-foreground">
      <Icon className="w-4 h-4 text-primary shrink-0" />
      {title}
    </h3>
  );
}

/* ── Card wrapper ──────────────────────────────────────────────────── */
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`p-4 bg-card border border-border rounded-2xl space-y-3 ${className}`}>
      {children}
    </div>
  );
}

/* ── Divider ───────────────────────────────────────────────────────── */
function Divider() { return <hr className="border-border" />; }

export default function AdminSitePage() {
  const [settings, setSettings] = useState<Settings>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<"contacts" | "company" | "seo" | "analytics" | "promo" | "widget" | "footer">("contacts");
  const [pinging, setPinging] = useState(false);
  const [pingResults, setPingResults] = useState<{ name: string; status: string; ms: number }[] | null>(null);

  const handlePing = async () => {
    setPinging(true); setPingResults(null);
    try {
      const res = await fetch("/api/admin/ping", { method: "POST" });
      const data = await res.json();
      setPingResults(data.results ?? []);
    } catch {
      setPingResults([{ name: "Ошибка соединения", status: "error", ms: 0 }]);
    }
    setPinging(false);
  };

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

  const Field = ({ label, settingKey, placeholder, type = "text", rows, hint }: {
    label: string; settingKey: string; placeholder?: string; type?: string; rows?: number; hint?: string;
  }) => (
    <div>
      {label && <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">{label}</label>}
      {rows ? (
        <textarea value={settings[settingKey] ?? ""} onChange={e => set(settingKey, e.target.value)}
          rows={rows} placeholder={placeholder}
          className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
      ) : (
        <input type={type} value={settings[settingKey] ?? ""} onChange={e => set(settingKey, e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
      )}
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </div>
  );

  const tabs: { id: typeof activeTab; label: string; icon: React.ElementType }[] = [
    { id: "contacts",  label: "Контакты",    icon: Phone },
    { id: "company",   label: "Компания",    icon: Building2 },
    { id: "seo",       label: "SEO",         icon: Search },
    { id: "analytics", label: "Аналитика",   icon: BarChart2 },
    { id: "promo",     label: "Продвижение", icon: Megaphone },
    { id: "widget",    label: "Виджет",      icon: LayoutPanelLeft },
    { id: "footer",    label: "Футер",       icon: Settings },
  ];

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl">Настройки сайта</h1>
          <p className="text-sm text-muted-foreground mt-1">Контакты, SEO, мессенджеры, продвижение — всё в одном месте</p>
        </div>
        <Button onClick={handleSave} disabled={saving || saved} className="min-w-[140px]">
          {saved   ? <><Check className="w-4 h-4 mr-2" /> Сохранено!</> :
           saving  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Сохранение...</> :
                     <><Save className="w-4 h-4 mr-2" /> Сохранить</>}
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted/50 p-1 rounded-xl flex-wrap">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}>
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── CONTACTS ─────────────────────────────────────────────────── */}
      {activeTab === "contacts" && (
        <div className="bg-card rounded-2xl border border-border p-6 space-y-5">
          <SectionHeader icon={Phone} title="Контактная информация" desc="Телефоны, адрес, часы — отображаются по всему сайту" />

          <div className="grid grid-cols-2 gap-4">
            <Field label="Телефон 1 (отображаемый)" settingKey="phone" placeholder="8-985-970-71-33" />
            <Field label="Телефон 1 (для tel: ссылки)" settingKey="phone_link" placeholder="+79859707133" />
            <Field label="Телефон 2 (отображаемый)" settingKey="phone2" placeholder="пусто или новый номер" />
            <Field label="Телефон 2 (для tel: ссылки)" settingKey="phone2_link" placeholder="+7XXXXXXXXXX" />
            <Field label="Телефон 3 (отображаемый)" settingKey="phone3" placeholder="8-977-606-80-20" />
            <Field label="Телефон 3 (для tel: ссылки)" settingKey="phone3_link" placeholder="+79776068020" />
            <Field label="Email" settingKey="email" placeholder="info@pilo-rus.ru" type="email" />
            <Field label="Минимальный заказ" settingKey="min_order" placeholder="1 м³" />
          </div>

          <Divider />
          <SubHeader icon={MapPin} title="Адрес и карта" />
          <div className="grid grid-cols-2 gap-4">
            <Field label="Адрес (текст)" settingKey="address" placeholder="Химки, ул. Заводская 2А, стр.28" />
            <Field label="Ссылка на Яндекс.Карты" settingKey="address_map" placeholder="https://yandex.ru/maps/..." />
            <Field label="Город компании (для SEO)" settingKey="company_city" placeholder="Химки"
              hint="Используется в автоописаниях товаров: «от производителя в Химках»" />
            <Field label="Регион доставки (для SEO)" settingKey="delivery_region" placeholder="Москва и Московская область"
              hint="Используется в автоописаниях: «Доставка по Москве и МО»" />
          </div>

          <Divider />
          <SubHeader icon={Clock} title="Режим работы" />
          <Field label="Часы работы" settingKey="working_hours" placeholder="Пн–Пт: 09:00–18:00, Сб: 09:00–15:00" />

          <Divider />
          <SubHeader icon={MessageCircle} title="Страница «Контакты» — дополнительный текст" />
          <Field label="Описание под заголовком" settingKey="contacts_description" rows={3}
            placeholder="Мы работаем с физическими и юридическими лицами..." />
        </div>
      )}

      {/* ── COMPANY ──────────────────────────────────────────────────── */}
      {activeTab === "company" && (
        <div className="bg-card rounded-2xl border border-border p-6 space-y-5">
          <SectionHeader icon={Building2} title="Информация о компании" desc="Реквизиты, тексты страниц О нас и Доставка" />

          <div className="grid grid-cols-2 gap-4">
            <Field label="Название компании" settingKey="company_name" placeholder="ООО ПИТИ (ПилоРус)" />
            <Field label="ИНН" settingKey="inn" placeholder="7735711780" />
            <Field label="ОГРН" settingKey="ogrn" placeholder="1157746520813" />
          </div>

          <Divider />
          <SubHeader icon={Info} title="Текст страницы «О производстве»" />
          <Field label="" settingKey="about_text" rows={5}
            placeholder="Производим и продаём пиломатериалы высокого качества с 2015 года..." />

          <Divider />
          <SubHeader icon={Info} title="Текст страницы «Доставка»" />
          <Field label="" settingKey="delivery_text" rows={4}
            placeholder="Доставляем по Москве и МО собственным транспортом за 1–3 рабочих дня..." />
        </div>
      )}

      {/* ── SEO ──────────────────────────────────────────────────────── */}
      {activeTab === "seo" && (
        <div className="bg-card rounded-2xl border border-border p-6 space-y-5">
          <SectionHeader icon={Search} title="SEO — поисковая оптимизация"
            desc="Meta-теги главной страницы. Страницы товаров/категорий генерируют SEO автоматически." />

          <Field label="Meta Title (заголовок в Google)"
            settingKey="seo_title" placeholder="ПилоРус — пиломатериалы от производителя в Химках"
            hint={`Рекомендуется 50–60 символов. Текущая длина: ${(settings["seo_title"] || "").length}`} />

          <Field label="Meta Description (описание в Google)"
            settingKey="seo_description" rows={3}
            placeholder="Производство и продажа пиломатериалов в Химках..."
            hint={`Рекомендуется 150–160 символов. Текущая длина: ${(settings["seo_description"] || "").length}`} />

          <Divider />
          <SubHeader icon={CheckCircle2} title="Верификация в вебмастерах" />
          <p className="text-xs text-muted-foreground">Получите код → вставьте сюда → сохраните → сайт подтверждён.</p>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded bg-amber-500 flex items-center justify-center text-white text-[9px] font-bold">Я</span>
                  Яндекс Вебмастер
                </label>
                <a href="https://webmaster.yandex.ru" target="_blank" rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline flex items-center gap-1">
                  Открыть <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <input value={settings["yandex_verification"] ?? ""} onChange={e => set("yandex_verification", e.target.value)}
                placeholder="yandex_12ab34cd56ef78gh"
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              <p className="text-xs text-muted-foreground">Вебмастер → Добавить сайт → HTML-тег → content="..."</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded bg-blue-500 flex items-center justify-center text-white text-[9px] font-bold">G</span>
                  Google Search Console
                </label>
                <a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline flex items-center gap-1">
                  Открыть <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <input value={settings["google_verification"] ?? ""} onChange={e => set("google_verification", e.target.value)}
                placeholder="google1234567890abcdef"
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              <p className="text-xs text-muted-foreground">Search Console → Добавить ресурс → HTML-тег → content="..."</p>
            </div>
          </div>
        </div>
      )}

      {/* ── ANALYTICS ────────────────────────────────────────────────── */}
      {activeTab === "analytics" && (
        <div className="bg-card rounded-2xl border border-border p-6 space-y-5">
          <SectionHeader icon={BarChart2} title="Аналитика и счётчики"
            desc="Подключите счётчики посещаемости — данные о клиентах и конверсиях" />

          {/* Яндекс Метрика */}
          <Card>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-amber-500 flex items-center justify-center text-white text-xs font-bold shrink-0">Я</span>
                <div>
                  <p className="text-sm font-semibold">Яндекс Метрика</p>
                  <p className="text-xs text-muted-foreground">Подробная аналитика для российских сайтов</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {settings["yandex_metrika_id"] && (
                  <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Подключена
                  </span>
                )}
                <a href="https://metrika.yandex.ru" target="_blank" rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline flex items-center gap-1">
                  Открыть <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
            <input value={settings["yandex_metrika_id"] ?? ""} onChange={e => set("yandex_metrika_id", e.target.value)}
              placeholder="Номер счётчика, например: 98765432"
              className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            <p className="text-xs text-muted-foreground -mt-1">Яндекс Метрика → Настройки → Номер счётчика</p>
          </Card>

          {/* Google Analytics */}
          <Card>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-blue-500 flex items-center justify-center text-white text-xs font-bold shrink-0">G</span>
                <div>
                  <p className="text-sm font-semibold">Google Analytics 4</p>
                  <p className="text-xs text-muted-foreground">Международная аналитика, интеграция с Google Ads</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {settings["google_analytics_id"] && (
                  <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Подключён
                  </span>
                )}
                <a href="https://analytics.google.com" target="_blank" rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline flex items-center gap-1">
                  Открыть <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
            <input value={settings["google_analytics_id"] ?? ""} onChange={e => set("google_analytics_id", e.target.value)}
              placeholder="Measurement ID, например: G-XXXXXXXXXX"
              className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            <p className="text-xs text-muted-foreground -mt-1">GA4 → Admin → Data Streams → Web → Measurement ID</p>
          </Card>

          <Divider />
          <SubHeader icon={Zap} title="Быстрая индексация" />
          <p className="text-xs text-muted-foreground">
            Отправляет sitemap сразу в Google, Яндекс и Bing — сервер делает это напрямую без CORS ограничений браузера.
          </p>

          <div className="grid grid-cols-2 gap-3 p-3 bg-muted/30 rounded-xl border border-border text-xs">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Globe className="w-3.5 h-3.5 shrink-0 text-primary" />
              <span className="font-mono">pilo-rus.ru/sitemap.xml</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Rss className="w-3.5 h-3.5 shrink-0 text-primary" />
              <span className="font-mono">pilo-rus.ru/rss.xml</span>
            </div>
          </div>

          <button onClick={handlePing} disabled={pinging}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-all">
            {pinging
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Пингуем 5 источников...</>
              : <><Radio className="w-4 h-4" /> Отправить в Google + Яндекс + Bing + RSS</>}
          </button>

          {pingResults && (
            <div className="space-y-1.5">
              {pingResults.map((r) => (
                <div key={r.name} className="flex items-center justify-between px-3 py-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/40 rounded-xl">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">{r.name}</span>
                  </div>
                  <span className="text-[10px] text-emerald-600/70 font-mono">{r.ms}ms</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── PROMO ────────────────────────────────────────────────────── */}
      {activeTab === "promo" && (
        <div className="space-y-4">

          {/* Section title */}
          <div className="bg-card rounded-2xl border border-border p-5">
            <SectionHeader icon={Megaphone} title="Продвижение сайта"
              desc="Каталоги, карты, площадки объявлений и кнопки заказа в мессенджерах — всё для привлечения клиентов" />

            {/* Tip */}
            <div className="flex items-start gap-3 p-3.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-xl text-xs text-amber-800 dark:text-amber-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
              <p><strong>Главный совет:</strong> Яндекс Бизнес + Google Бизнес дают больше клиентов чем всё остальное вместе. Регистрация бесплатная, эффект через 2–4 недели.</p>
            </div>
          </div>

          {/* ── RSS feed ─────────────────────────────────────────────── */}
          <Card>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-orange-500/15 flex items-center justify-center shrink-0">
                <Rss className="w-5 h-5 text-orange-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">RSS-фид статей</p>
                <p className="text-xs text-muted-foreground">Яндекс.Новости и агрегаторы автоматически подхватывают новые статьи</p>
              </div>
              <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 px-2.5 py-1 rounded-full font-medium flex items-center gap-1 shrink-0">
                <CheckCircle2 className="w-3 h-3" /> Работает
              </span>
            </div>
            <div className="flex gap-2">
              <a href="https://pilo-rus.ru/rss.xml" target="_blank" rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-border text-xs font-medium hover:bg-primary/10 hover:text-primary transition-colors">
                <ExternalLink className="w-3.5 h-3.5" /> Открыть RSS
              </a>
              <a href="https://news.yandex.ru/addmedia.html" target="_blank" rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-border text-xs font-medium hover:bg-primary/10 hover:text-primary transition-colors">
                <ExternalLink className="w-3.5 h-3.5" /> Подать в Яндекс.Новости
              </a>
            </div>
          </Card>

          {/* ── Maps & business directories ──────────────────────────── */}
          <Card>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold">Карты и каталоги компаний</p>
                <p className="text-xs text-muted-foreground">Мощнейшие бесплатные источники трафика</p>
              </div>
            </div>
            <div className="space-y-2">
              {[
                { name: "Яндекс Бизнес", desc: "Карточка в картах + поиске Яндекса", href: "https://business.yandex.ru", priority: "Приоритет 1", color: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400" },
                { name: "Google Бизнес-профиль", desc: "Google Maps + поиск Google", href: "https://business.google.com", priority: "Приоритет 2", color: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400" },
                { name: "2ГИС", desc: "Популярный в регионах РФ", href: "https://2gis.ru/firms", priority: "Важно", color: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400" },
                { name: "Авито — Компании", desc: "Тысячи просмотров бесплатно", href: "https://www.avito.ru/profile/profile", priority: "Хорошо", color: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" },
              ].map((item) => (
                <a key={item.name} href={item.href} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 rounded-xl border border-border hover:border-primary/30 hover:bg-primary/5 transition-all group">
                  <div>
                    <p className="text-sm font-medium group-hover:text-primary transition-colors">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${item.color}`}>{item.priority}</span>
                    <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                </a>
              ))}
            </div>
          </Card>

          {/* ── Classifieds ──────────────────────────────────────────── */}
          <Card>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-9 h-9 rounded-xl bg-green-500/15 flex items-center justify-center shrink-0">
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm font-semibold">Площадки объявлений</p>
                <p className="text-xs text-muted-foreground">Разместите товары — получите трафик из поиска</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                ["Авито", "https://www.avito.ru"],
                ["Яндекс.Объявления", "https://o.yandex.ru"],
                ["Юла", "https://youla.ru"],
                ["OLX", "https://www.olx.ru"],
              ].map(([name, href]) => (
                <a key={name} href={href} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-between p-2.5 rounded-xl border border-border hover:border-primary/30 hover:bg-primary/5 transition-all text-sm font-medium">
                  {name} <ExternalLink className="w-3 h-3 text-muted-foreground" />
                </a>
              ))}
            </div>
          </Card>

          {/* ── Industry catalogs ─────────────────────────────────────── */}
          <Card>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Link2 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold">Отраслевые каталоги строительства</p>
                <p className="text-xs text-muted-foreground">Ссылочная масса и целевой трафик</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                ["Stroimaterialy.ru", "https://www.stroimaterialy.ru"],
                ["СтройПортал", "https://www.stroyportal.ru"],
                ["Строй-Справка", "https://www.stroy-spravka.ru"],
                ["TIU.ru строительство", "https://tiu.ru/construction.html"],
              ].map(([name, href]) => (
                <a key={name} href={href} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-between p-2.5 rounded-xl border border-border hover:border-primary/30 hover:bg-primary/5 transition-all text-xs font-medium">
                  {name} <ExternalLink className="w-3 h-3 text-muted-foreground" />
                </a>
              ))}
            </div>
          </Card>

          {/* ── Messengers (order buttons) ────────────────────────────── */}
          <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
            <SectionHeader icon={MessageCircle} title="Кнопки заказа — мессенджеры"
              desc="Кнопки появляются на странице товара и услуг. Включите нужные и настройте номер." />

            {/* WhatsApp */}
            <Card>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#25D366]/15 flex items-center justify-center shrink-0">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="#25D366">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-sm">WhatsApp</p>
                    <p className="text-xs text-muted-foreground">Кнопка «Заказать через WhatsApp» на странице товара</p>
                  </div>
                </div>
                <Toggle
                  value={settings["whatsapp_enabled"] === "true"}
                  onChange={v => set("whatsapp_enabled", v ? "true" : "false")}
                  color="bg-[#25D366]"
                />
              </div>
              {settings["whatsapp_enabled"] === "true" && (
                <div className="space-y-3 pt-3 border-t border-border">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1 block">Номер телефона</label>
                      <input value={settings["whatsapp_number"] ?? "+79859707133"} onChange={e => set("whatsapp_number", e.target.value)}
                        placeholder="+79859707133"
                        className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                      <p className="text-xs text-muted-foreground mt-1">Формат: +79XXXXXXXXX</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1 block">Текст сообщения</label>
                      <input value={settings["whatsapp_message"] ?? "Здравствуйте! Хочу сделать заказ."} onChange={e => set("whatsapp_message", e.target.value)}
                        placeholder="Здравствуйте! Хочу сделать заказ."
                        className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                    </div>
                  </div>
                  <div className="p-2.5 bg-[#25D366]/5 border border-[#25D366]/20 rounded-xl text-xs text-muted-foreground">
                    Ссылка: <span className="text-foreground font-mono">wa.me/{(settings["whatsapp_number"] ?? "+79859707133").replace(/\D/g, "")}</span>
                  </div>
                </div>
              )}
            </Card>

            {/* Telegram */}
            <Card>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#2AABEE]/15 flex items-center justify-center shrink-0">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="#2AABEE">
                      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.941z"/>
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Telegram</p>
                    <p className="text-xs text-muted-foreground">Кнопка «Написать в Telegram» на странице товара</p>
                  </div>
                </div>
                <Toggle
                  value={settings["telegram_enabled"] === "true"}
                  onChange={v => set("telegram_enabled", v ? "true" : "false")}
                  color="bg-[#2AABEE]"
                />
              </div>
              {settings["telegram_enabled"] === "true" && (
                <div className="space-y-3 pt-3 border-t border-border">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1 block">Username или ссылка</label>
                      <input value={settings["telegram_username"] ?? ""} onChange={e => set("telegram_username", e.target.value)}
                        placeholder="@pilorus или t.me/pilorus"
                        className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                      <p className="text-xs text-muted-foreground mt-1">Например: @pilorus_orders_bot</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1 block">Текст сообщения</label>
                      <input value={settings["telegram_message"] ?? "Здравствуйте! Хочу сделать заказ."} onChange={e => set("telegram_message", e.target.value)}
                        placeholder="Здравствуйте! Хочу сделать заказ."
                        className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                    </div>
                  </div>
                </div>
              )}
            </Card>

            <div className="flex items-center gap-2 p-3 bg-muted/40 rounded-xl text-xs text-muted-foreground">
              <Info className="w-3.5 h-3.5 shrink-0" />
              Не забудьте нажать <strong className="text-foreground mx-1">Сохранить</strong> в верхнем углу после изменений
            </div>
          </div>
        </div>
      )}

      {/* ── WIDGET ───────────────────────────────────────────────────── */}
      {activeTab === "widget" && (
        <div className="bg-card rounded-2xl border border-border p-6 space-y-5">
          <SectionHeader icon={LayoutPanelLeft} title="Виджет связи"
            desc="Плавающая кнопка в углу сайта с контактами. Заполненные каналы появляются автоматически." />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">Виджет</label>
              <div className="flex gap-2">
                {[{ v: "true", l: "Включён" }, { v: "false", l: "Выключен" }].map(opt => (
                  <button key={opt.v} type="button" onClick={() => set("widget_enabled", opt.v)}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${
                      (settings["widget_enabled"] ?? "true") === opt.v
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border hover:bg-primary/[0.08] text-muted-foreground"
                    }`}>{opt.l}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">Позиция</label>
              <div className="flex gap-2">
                {[{ v: "right", l: "Справа" }, { v: "left", l: "Слева" }].map(opt => (
                  <button key={opt.v} type="button" onClick={() => set("widget_position", opt.v)}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${
                      (settings["widget_position"] ?? "right") === opt.v
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border hover:bg-primary/[0.08] text-muted-foreground"
                    }`}>{opt.l}</button>
                ))}
              </div>
            </div>
          </div>

          <Field label="Текст кнопки" settingKey="widget_label" placeholder="Связаться" />

          <Divider />
          <SubHeader icon={MessageCircle} title="Каналы связи в виджете" />
          <p className="text-xs text-muted-foreground -mt-3">Заполненные поля автоматически появляются в виджете</p>

          <div className="flex items-center gap-3 p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
            <Phone className="w-5 h-5 text-emerald-600 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium">Телефон</p>
              <p className="text-xs text-muted-foreground">{settings["phone"] || "Настройте в разделе «Контакты»"}</p>
            </div>
            <span className="text-xs bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full shrink-0">Всегда активен</span>
          </div>

          {[
            { key: "social_whatsapp", label: "WhatsApp", placeholder: "+79859707133", color: "text-[#25D366]", Icon: () => (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            )},
            { key: "social_telegram", label: "Telegram", placeholder: "@piloruswood или https://t.me/...", color: "text-[#2AABEE]", Icon: () => (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#2AABEE"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.941z"/></svg>
            )},
            { key: "social_vk", label: "ВКонтакте", placeholder: "https://vk.com/piloruswood", color: "text-[#0077FF]", Icon: () => (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#0077FF"><path d="M15.684 0H8.316C1.592 0 0 1.592 0 8.316v7.368C0 22.408 1.592 24 8.316 24h7.368C22.408 24 24 22.408 24 15.684V8.316C24 1.592 22.408 0 15.684 0zm3.692 17.123h-1.744c-.66 0-.862-.525-2.049-1.714-1.033-1-1.49-.135-1.49.796v1.569c0 .33-.108.534-.954.534-1.41 0-2.98-.852-4.08-2.44-1.658-2.328-2.107-4.079-2.107-4.079-.17-.446.27-.516.27-.516h1.745c.392 0 .527.255.661.649 0 0 .712 2.069 1.709 2.844.553.423.713.237.713-.158V9.986c-.053-.832-.392-.956-.392-.956h-.955c-.263 0-.37-.211-.17-.396 0 0 .815-.902 1.916-.902H14.5c.185 0 .37.185.37.502v3.293c0 .17.092.317.264.317.422 0 1.254-1.032 1.823-2.22.16-.302.291-.647.291-.647.127-.396.344-.502.58-.502h1.745c.527 0 .63.264.527.664-.344 1.608-3.533 5.5-3.533 5.5z"/></svg>
            )},
          ].map(({ key, label, placeholder, Icon }) => (
            <div key={key} className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl">
              <Icon />
              <div className="flex-1">
                <p className="text-sm font-medium">{label}</p>
                <input value={settings[key] ?? ""} onChange={e => set(key, e.target.value)}
                  placeholder={placeholder}
                  className="mt-1 w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
            </div>
          ))}

          <div className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl">
            <Mail className="w-5 h-5 text-muted-foreground shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium">Email в виджете</p>
              <p className="text-xs text-muted-foreground">{settings["email"] || "Настройте в разделе «Контакты»"}</p>
            </div>
            <button type="button"
              onClick={() => set("widget_show_email", settings["widget_show_email"] === "true" ? "false" : "true")}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors shrink-0 ${
                settings["widget_show_email"] === "true"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:bg-primary/[0.08]"
              }`}>{settings["widget_show_email"] === "true" ? "Показывается" : "Скрыт"}</button>
          </div>

          {/* Preview */}
          <div className="p-4 bg-muted/30 rounded-xl border border-border">
            <p className="text-xs font-medium text-muted-foreground mb-2.5 uppercase tracking-wide">Активные каналы (предпросмотр)</p>
            <div className="flex flex-wrap gap-2">
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 text-white rounded-xl text-xs font-medium"><Phone className="w-3 h-3" /> Телефон</span>
              {settings["social_whatsapp"] && <span className="flex items-center gap-1.5 px-3 py-1.5 bg-[#25D366] text-white rounded-xl text-xs font-medium"><MessageCircle className="w-3 h-3" /> WhatsApp</span>}
              {settings["social_telegram"] && <span className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2AABEE] text-white rounded-xl text-xs font-medium"><Send className="w-3 h-3" /> Telegram</span>}
              {settings["social_vk"] && <span className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0077FF] text-white rounded-xl text-xs font-medium"><Globe className="w-3 h-3" /> ВКонтакте</span>}
              {settings["widget_show_email"] === "true" && <span className="flex items-center gap-1.5 px-3 py-1.5 bg-muted border border-border rounded-xl text-xs font-medium"><Mail className="w-3 h-3" /> Email</span>}
            </div>
          </div>
        </div>
      )}

      {/* ── FOOTER ───────────────────────────────────────────────────── */}
      {activeTab === "footer" && (
        <div className="bg-card rounded-2xl border border-border p-6 space-y-5">
          <SectionHeader icon={Settings} title="Футер (нижняя часть сайта)" desc="Copyright строка в подвале" />
          <Field label="Строка Copyright" settingKey="footer_copyright" placeholder={`© ${new Date().getFullYear()} ПилоРус. Все права защищены.`} />
          <div className="flex items-start gap-2 p-4 bg-muted/30 rounded-xl border border-border text-sm text-muted-foreground">
            <Info className="w-4 h-4 mt-0.5 shrink-0 opacity-60" />
            <span>Остальные данные в футере (телефон, адрес, часы) берутся из раздела <strong className="text-foreground">«Контакты»</strong> и обновляются автоматически.</span>
          </div>
        </div>
      )}

      {/* Bottom save */}
      <div className="flex justify-end pb-6">
        <Button onClick={handleSave} disabled={saving || saved} size="lg">
          {saved   ? <><Check className="w-4 h-4 mr-2" /> Сохранено!</> :
           saving  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Сохранение...</> :
                     <><Save className="w-4 h-4 mr-2" /> Сохранить изменения</>}
        </Button>
      </div>
    </div>
  );
}
