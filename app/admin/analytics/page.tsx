"use client";

import { useState, useEffect } from "react";
import {
  BarChart2, CheckCircle2, Copy, ExternalLink, Loader2,
  Search, Globe, ShoppingBag, Zap, Info, AlertCircle, Rocket
} from "lucide-react";

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-muted hover:bg-muted/80 transition-colors shrink-0">
      {copied ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
      {copied ? "Скопировано" : "Копировать"}
    </button>
  );
}

export default function AnalyticsPage() {
  const [settings, setSettings] = useState({
    yandex_metrika_id: "",
    yandex_verification: "",
    google_analytics_id: "",
    google_verification: "",
    site_url: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedOk, setSavedOk] = useState(false);
  const [error, setError] = useState("");
  const [seoLoading, setSeoLoading] = useState<string | null>(null);
  const [seoResult, setSeoResult] = useState<string | null>(null);

  const siteUrl = settings.site_url || "https://pilo-rus.ru";
  const ymlUrl = `${siteUrl}/api/yml`;

  useEffect(() => {
    fetch("/api/admin/site-settings")
      .then(r => r.json())
      .then(data => {
        setSettings(s => ({ ...s, ...data }));
        setLoading(false);
      });
  }, []);

  async function seoAction(action: string) {
    setSeoLoading(action); setSeoResult(null);
    try {
      const res = await fetch("/api/admin/seo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
      const data = await res.json();
      if (action === "ping_sitemap" && data.results) {
        setSeoResult(data.results.map((r: any) => `${r.engine}: ${r.status}`).join(" · "));
      } else if (data.updated !== undefined) {
        setSeoResult(`✓ Обновлено описаний: ${data.updated}`);
      }
    } catch { setSeoResult("Ошибка соединения"); }
    finally { setSeoLoading(null); }
  }

  async function save() {
    setSaving(true); setError(""); setSavedOk(false);
    try {
      const res = await fetch("/api/admin/site-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || "Ошибка");
      else { setSavedOk(true); setTimeout(() => setSavedOk(false), 3000); }
    } finally { setSaving(false); }
  }

  function Field({ label, value, onChange, placeholder, hint, type = "text" }: {
    label: string; value: string; onChange: (v: string) => void;
    placeholder: string; hint?: string; type?: string;
  }) {
    return (
      <div className="space-y-1.5">
        <label className="text-sm font-medium">{label}</label>
        <input type={type} value={value} onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
    );
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Аналитика и продвижение</h1>
        <p className="text-sm text-muted-foreground mt-1">Яндекс Метрика, Google Analytics, Яндекс Маркет</p>
      </div>

      {/* ── Яндекс Метрика ── */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-[#FF0000]" />
          <h2 className="font-semibold">Яндекс Метрика</h2>
          {settings.yandex_metrika_id && <span className="text-xs text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">✓ Активна</span>}
        </div>

        <Field
          label="ID счётчика"
          value={settings.yandex_metrika_id}
          onChange={v => setSettings(s => ({ ...s, yandex_metrika_id: v }))}
          placeholder="12345678"
          hint="Найдите в metrika.yandex.ru → Счётчики → Номер счётчика"
        />

        <div className="bg-muted/50 rounded-xl p-4 space-y-2 text-xs text-muted-foreground">
          <p className="font-medium text-foreground text-sm">Как подключить:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Зайдите на <a href="https://metrika.yandex.ru" target="_blank" className="text-primary underline">metrika.yandex.ru</a></li>
            <li>Создайте счётчик для сайта <strong>{siteUrl}</strong></li>
            <li>Скопируйте номер счётчика (8 цифр) и вставьте выше</li>
            <li>Нажмите «Сохранить» — счётчик заработает автоматически</li>
          </ol>
          <p className="text-emerald-700 dark:text-emerald-400">✓ Вебвизор, тепловые карты и электронная торговля включены автоматически</p>
        </div>
      </div>

      {/* ── Яндекс Вебмастер ── */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-[#FF6600]" />
          <h2 className="font-semibold">Яндекс Вебмастер</h2>
          {settings.yandex_verification && <span className="text-xs text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">✓ Подтверждён</span>}
        </div>

        <Field
          label="Код подтверждения"
          value={settings.yandex_verification}
          onChange={v => setSettings(s => ({ ...s, yandex_verification: v }))}
          placeholder="a1b2c3d4e5f6..."
          hint="webmaster.yandex.ru → ваш сайт → Подтверждение → Meta-тег → скопируйте только content=&quot;...&quot;"
        />

        <div className="bg-muted/50 rounded-xl p-4 space-y-2 text-xs text-muted-foreground">
          <ol className="list-decimal list-inside space-y-1">
            <li>Зайдите на <a href="https://webmaster.yandex.ru" target="_blank" className="text-primary underline">webmaster.yandex.ru</a></li>
            <li>Добавьте сайт <strong>{siteUrl}</strong></li>
            <li>Выберите способ подтверждения: <strong>HTML-мета тег</strong></li>
            <li>Скопируйте значение из <code>content="..."</code> и вставьте выше</li>
          </ol>
          <p>Карта сайта для Вебмастера: <span className="font-mono text-foreground">{siteUrl}/sitemap.xml</span> <CopyBtn text={`${siteUrl}/sitemap.xml`} /></p>
        </div>
      </div>

      {/* ── Google Search Console ── */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-[#4285F4]" />
          <h2 className="font-semibold">Google Search Console</h2>
          {settings.google_verification && <span className="text-xs text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">✓ Подтверждён</span>}
        </div>

        <Field
          label="Код подтверждения Google"
          value={settings.google_verification}
          onChange={v => setSettings(s => ({ ...s, google_verification: v }))}
          placeholder="abc123def456..."
          hint="search.google.com/search-console → добавить ресурс → HTML-тег → скопируйте content=&quot;...&quot;"
        />

        <Field
          label="Google Analytics 4 (ID потока)"
          value={settings.google_analytics_id}
          onChange={v => setSettings(s => ({ ...s, google_analytics_id: v }))}
          placeholder="G-XXXXXXXXXX"
          hint="analytics.google.com → Администратор → Потоки данных → ID измерения"
        />
      </div>

      {/* ── Яндекс Маркет ── */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-4 h-4 text-[#FFCC00]" />
          <h2 className="font-semibold">Яндекс Маркет / Товары</h2>
          <span className="text-xs text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">✓ Готов</span>
        </div>

        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            YML-фид генерируется автоматически из всех активных товаров. Обновляется при каждом обращении.
          </p>
          <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/50 font-mono text-sm">
            <span className="flex-1 truncate text-primary">{ymlUrl}</span>
            <CopyBtn text={ymlUrl} />
            <a href={ymlUrl} target="_blank" rel="noopener" className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted transition-colors">
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
          <div className="bg-muted/50 rounded-xl p-4 text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">Как разместить товары на Яндекс Маркете:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Зайдите в <a href="https://partner.market.yandex.ru" target="_blank" className="text-primary underline">partner.market.yandex.ru</a></li>
              <li>Создайте магазин, укажите сайт <strong>{siteUrl}</strong></li>
              <li>Прайс-лист → Способ передачи: URL → вставьте ссылку выше</li>
              <li>Яндекс сам скачает и обновит товары каждые несколько часов</li>
            </ol>
          </div>
        </div>
      </div>

      {/* ── Директ помощник ── */}
      <div className="bg-card border border-amber-500/30 rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-500" />
          <h2 className="font-semibold">Яндекс Директ</h2>
          <span className="text-xs text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full">Скоро</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Помощник по созданию рекламных кампаний — выбираете товары, указываете бюджет, получаете готовые объявления для вставки в Директ. В разработке.
        </p>
      </div>

      {/* ── Продвижение ── */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Rocket className="w-4 h-4 text-primary" />
          <h2 className="font-semibold">🚀 Продвижение — 1 клик</h2>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => seoAction("ping_sitemap")}
            disabled={seoLoading === "ping_sitemap"}
            className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-border bg-muted/50 hover:bg-muted text-sm font-medium transition-colors disabled:opacity-50"
          >
            {seoLoading === "ping_sitemap" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
            Отправить карту сайта в Яндекс и Google
          </button>

          <button
            onClick={() => seoAction("auto_meta")}
            disabled={seoLoading === "auto_meta"}
            className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-border bg-muted/50 hover:bg-muted text-sm font-medium transition-colors disabled:opacity-50"
          >
            {seoLoading === "auto_meta" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            Авто-описания для товаров
          </button>

          <a
            href={`${siteUrl}/sitemap.xml`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-border bg-muted/50 hover:bg-muted text-sm font-medium transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Открыть sitemap.xml
          </a>
        </div>

        {seoResult && (
          <p className="text-sm text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 rounded-xl px-4 py-2.5">
            {seoResult}
          </p>
        )}
      </div>

      {/* Save */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      <button onClick={save} disabled={saving}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 disabled:opacity-50 transition-colors">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : savedOk ? <CheckCircle2 className="w-4 h-4" /> : <BarChart2 className="w-4 h-4" />}
        {saving ? "Сохраняем..." : savedOk ? "Сохранено! Деплой через ~2 мин" : "Сохранить настройки"}
      </button>

      <div className="flex items-start gap-2 text-xs text-muted-foreground p-3 rounded-xl bg-muted/30">
        <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        После сохранения счётчик Метрики появится на сайте в течение 1-2 минут (после деплоя).
      </div>
    </div>
  );
}
