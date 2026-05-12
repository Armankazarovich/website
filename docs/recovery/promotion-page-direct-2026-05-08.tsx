"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ElementType, ReactNode } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  BarChart2,
  Bot,
  Check,
  CheckCircle2,
  Clipboard,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Globe,
  Loader2,
  MapPin,
  Megaphone,
  RefreshCw,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Target,
} from "lucide-react";

type ProductVariant = {
  pricePerCube?: number | null;
  pricePerPiece?: number | null;
  inStock?: boolean | null;
  size?: string | null;
};

type Product = {
  id: string;
  name: string;
  slug?: string | null;
  description?: string | null;
  active?: boolean | null;
  category?: { name?: string | null; slug?: string | null } | null;
  variants?: ProductVariant[];
};

type SiteSettings = Record<string, string | undefined>;

type DirectCampaign = {
  id: string;
  name: string;
  state?: string | null;
  status?: string | null;
  type?: string | null;
  startDate?: string | null;
};

type DirectStatus = {
  configured: boolean;
  connected: boolean;
  campaignsCount: number;
  campaigns: DirectCampaign[];
  error?: string | null;
  mode?: string;
  checkedAt?: string;
};

type DirectDraftAd = {
  title1: string;
  title2: string;
  text: string;
  href: string;
};

type DirectDraftGroup = {
  name: string;
  category: string;
  productsCount: number;
  keywords: string[];
  ads: DirectDraftAd[];
  quickLinks: Array<{ title: string; href: string }>;
};

type DirectDraft = {
  campaignName: string;
  region: string;
  strategy: string;
  dailyBudgetHint: string;
  productsCount: number;
  groups: DirectDraftGroup[];
  negativeWords: string[];
  checklist: string[];
  generatedAt: string;
};

type DirectDraftResponse = {
  ok: boolean;
  mode: string;
  direct: DirectStatus;
  draft: DirectDraft;
  safety: string;
};

type Stats = {
  products: number;
  activeProducts: number;
  pricedProducts: number;
  stockedProducts: number;
  categories: number;
  emailConfigured: boolean;
};

type CopyKey =
  | "direct-all"
  | "negative"
  | "aray"
  | "steps"
  | `group-${number}`
  | `product-${string}`;

type PromotionChannel = {
  title: string;
  text: string;
  href: string;
  actionLabel: string;
  icon: ElementType;
  status: string;
  external?: boolean;
};

const DIRECT_URL = "https://direct.yandex.ru";

const NEGATIVE_WORDS_FALLBACK = [
  "бесплатно",
  "бу",
  "б/у",
  "своими руками",
  "чертеж",
  "скачать",
  "вакансия",
  "работа",
  "резюме",
  "форум",
  "отзывы сотрудников",
];

const PROMOTION_STEPS = [
  "Проверить каталог: активные товары, цены, наличие, категории.",
  "Собрать структуру Direct: кампания, группы, ключи, объявления, быстрые ссылки.",
  "Проверить минус-слова и регионы.",
  "Открыть Yandex Direct и запускать только после подтверждения владельца.",
  "После запуска смотреть заявки, звонки, расходы и отключать слабые группы.",
];

const FREE_CHANNELS: PromotionChannel[] = [
  {
    title: "YML для Яндекса",
    text: "Готовый фид каталога для Маркета, Вебмастера и проверок товарных страниц.",
    href: "/api/yml",
    actionLabel: "Открыть YML",
    icon: FileText,
    status: "работает",
  },
  {
    title: "Avito XML",
    text: "Файл выгрузки объявлений. Его можно отдать в Авито или партнерский кабинет.",
    href: "/api/avito.xml",
    actionLabel: "Скачать XML",
    icon: Download,
    status: "работает",
  },
  {
    title: "Карты и справочники",
    text: "Точки на Яндекс Картах, 2ГИС и Google помогают ловить локальный спрос.",
    href: "https://yandex.ru/sprav/companies",
    actionLabel: "Открыть справочник",
    icon: MapPin,
    status: "ручной шаг",
    external: true,
  },
];

function getProductPrice(product: Product): number | null {
  const variants = product.variants ?? [];
  const prices = variants
    .flatMap((variant) => [variant.pricePerCube, variant.pricePerPiece])
    .filter((price): price is number => typeof price === "number" && Number.isFinite(price) && price > 0);

  return prices.length ? Math.min(...prices) : null;
}

function priceText(product: Product): string {
  const price = getProductPrice(product);

  return price ? `от ${Math.round(price).toLocaleString("ru-RU")} ₽` : "цену уточнить";
}

function productPath(product: Product): string {
  const slug = product.slug || product.id;

  return `/catalog/${encodeURIComponent(slug)}`;
}

function buildUtmUrl(path: string, source: "direct" | "telegram" | "manual" = "direct"): string {
  const medium = source === "direct" ? "cpc" : "organic";
  const campaign = source === "direct" ? "pilorus_search_catalog" : `pilorus_${source}`;

  return `${path}?utm_source=${source}&utm_medium=${medium}&utm_campaign=${campaign}`;
}

function productAdText(product: Product): string {
  const category = product.category?.name || "пиломатериалы";
  const price = priceText(product);
  const stock = (product.variants ?? []).some((variant) => variant.inStock) ? "в наличии" : "под заказ";

  return `${product.name}. ${category}. ${price}, ${stock}. Заявка через каталог ПилоРус.`;
}

function formatGroupText(group: DirectDraftGroup): string {
  const ads = group.ads
    .map((ad, index) => {
      return [
        `Объявление ${index + 1}`,
        `Заголовок 1: ${ad.title1}`,
        `Заголовок 2: ${ad.title2}`,
        `Текст: ${ad.text}`,
        `Ссылка: ${ad.href}`,
      ].join("\n");
    })
    .join("\n\n");

  return [
    `Группа: ${group.name}`,
    `Категория: ${group.category}`,
    `Товаров: ${group.productsCount}`,
    `Ключи:\n${group.keywords.map((keyword) => `- ${keyword}`).join("\n")}`,
    `Быстрые ссылки:\n${group.quickLinks.map((link) => `- ${link.title}: ${link.href}`).join("\n")}`,
    ads,
  ].join("\n\n");
}

function formatDraftText(draft?: DirectDraft): string {
  if (!draft) return "";

  return [
    `Кампания: ${draft.campaignName}`,
    `Регион: ${draft.region}`,
    `Стратегия: ${draft.strategy}`,
    `Бюджет: ${draft.dailyBudgetHint}`,
    `Товаров: ${draft.productsCount}`,
    "",
    draft.groups.map(formatGroupText).join("\n\n---\n\n"),
    "",
    `Минус-слова:\n${draft.negativeWords.join(", ")}`,
    "",
    `Проверка перед запуском:\n${draft.checklist.map((item) => `- ${item}`).join("\n")}`,
  ].join("\n");
}

function buildArayPrompt(draft?: DirectDraft): string {
  const base = [
    "ARAY, проверь продвижение ПилоРус перед запуском.",
    "Правило: не запускать платную рекламу без подтверждения владельца.",
    "Проверить: каталог, цены, наличие, регионы, минус-слова, посадочные страницы, цели Метрики.",
  ];

  if (!draft) return base.join("\n");

  return [
    ...base,
    `Кампания: ${draft.campaignName}`,
    `Групп: ${draft.groups.length}, товаров: ${draft.productsCount}`,
    `Первые группы: ${draft.groups.slice(0, 5).map((group) => group.name).join(", ")}`,
  ].join("\n");
}

function getDirectLabel(status?: DirectStatus): { text: string; tone: "good" | "warn" | "bad" | "muted" } {
  if (!status) return { text: "проверяем", tone: "muted" };
  if (status.connected) return { text: `Direct готов · ${status.campaignsCount}`, tone: "good" };
  if (status.configured) return { text: "доступ требует проверки", tone: "warn" };

  return { text: "нужен токен Direct", tone: "bad" };
}

function StatusPill({ text, tone = "muted" }: { text: string; tone?: "good" | "warn" | "bad" | "muted" }) {
  const classes = {
    good: "border-emerald-400/35 bg-emerald-400/10 text-emerald-200",
    warn: "border-amber-400/35 bg-amber-400/10 text-amber-200",
    bad: "border-red-400/35 bg-red-400/10 text-red-200",
    muted: "border-white/12 bg-white/[0.03] text-slate-300",
  }[tone];

  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${classes}`}>{text}</span>;
}

function SectionTitle({
  icon: Icon,
  title,
  subtitle,
  action,
}: {
  icon: ElementType;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex items-start gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-amber-300/25 bg-amber-300/10 text-amber-200">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-xl font-semibold text-white">{title}</h2>
          {subtitle ? <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-400">{subtitle}</p> : null}
        </div>
      </div>
      {action}
    </div>
  );
}

function CopyButton({
  copied,
  onCopy,
  children,
  className = "",
}: {
  copied: boolean;
  onCopy: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onCopy}
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/[0.03] px-3 py-2 text-sm font-semibold text-slate-100 transition hover:border-amber-300/40 hover:bg-amber-300/10 ${className}`}
    >
      {copied ? <Check className="h-4 w-4 text-emerald-300" /> : <Copy className="h-4 w-4" />}
      {children}
    </button>
  );
}

function ReadinessCard({
  icon: Icon,
  title,
  value,
  text,
  tone,
}: {
  icon: ElementType;
  title: string;
  value: string;
  text: string;
  tone: "good" | "warn" | "bad" | "muted";
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-4">
      <div className="flex items-start justify-between gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-amber-300/20 bg-amber-300/10 text-amber-200">
          <Icon className="h-5 w-5" />
        </span>
        <StatusPill text={value} tone={tone} />
      </div>
      <h3 className="mt-4 text-base font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-400">{text}</p>
    </div>
  );
}

function ChannelCard({
  channel,
}: {
  channel: (typeof FREE_CHANNELS)[number];
}) {
  const Icon = channel.icon;

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-4">
      <div className="flex items-start justify-between gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-amber-300/20 bg-amber-300/10 text-amber-200">
          <Icon className="h-5 w-5" />
        </span>
        <StatusPill text={channel.status} tone={channel.status === "работает" ? "good" : "warn"} />
      </div>
      <h3 className="mt-4 text-base font-semibold text-white">{channel.title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-400">{channel.text}</p>
      <a
        href={channel.href}
        target={channel.external ? "_blank" : undefined}
        rel={channel.external ? "noreferrer" : undefined}
        className="mt-4 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/[0.03] px-3 py-2 text-sm font-semibold text-slate-100 transition hover:border-amber-300/40 hover:bg-amber-300/10"
      >
        {channel.actionLabel}
        {channel.external ? <ExternalLink className="h-4 w-4" /> : <Download className="h-4 w-4" />}
      </a>
    </div>
  );
}

export default function PromotionPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<SiteSettings>({});
  const [stats, setStats] = useState<Stats>({
    products: 0,
    activeProducts: 0,
    pricedProducts: 0,
    stockedProducts: 0,
    categories: 0,
    emailConfigured: false,
  });
  const [directDraft, setDirectDraft] = useState<DirectDraftResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [directLoading, setDirectLoading] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [copyKey, setCopyKey] = useState<CopyKey | null>(null);
  const [seoBusy, setSeoBusy] = useState<"sitemap" | "meta" | null>(null);
  const [seoMessage, setSeoMessage] = useState<string | null>(null);

  const activeProducts = useMemo(() => products.filter((product) => product.active !== false), [products]);
  const featuredProducts = useMemo(() => activeProducts.filter((product) => getProductPrice(product)).slice(0, 6), [activeProducts]);
  const directLabel = getDirectLabel(directDraft?.direct);
  const negativeWords = directDraft?.draft.negativeWords?.length ? directDraft.draft.negativeWords : NEGATIVE_WORDS_FALLBACK;
  const metrikaReady = Boolean(settings.yandex_metrika_id || settings.metrika_id || settings.YANDEX_METRIKA_ID);

  const copyText = useCallback(async (key: CopyKey, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopyKey(key);
    window.setTimeout(() => setCopyKey((current) => (current === key ? null : current)), 1800);
  }, []);

  const refreshDirectDraft = useCallback(async () => {
    setDirectLoading(true);
    try {
      const response = await fetch("/api/admin/direct/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });
      const payload = (await response.json()) as DirectDraftResponse | { error?: string };

      if (!response.ok || !("draft" in payload)) {
        const errorMessage = "error" in payload ? payload.error : undefined;
        throw new Error(errorMessage || "Не удалось собрать черновик Direct.");
      }

      setDirectDraft(payload);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Не удалось проверить Yandex Direct.");
    } finally {
      setDirectLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setPageError(null);
      try {
        const [productsResult, emailResult, settingsResult, directResult] = await Promise.allSettled([
          fetch("/api/admin/products", { cache: "no-store" }).then((response) => response.json() as Promise<Product[]>),
          fetch("/api/admin/email", { cache: "no-store" }).then((response) => response.json() as Promise<{ configured?: boolean }>),
          fetch("/api/admin/site-settings", { cache: "no-store" }).then((response) => response.json() as Promise<SiteSettings>),
          fetch("/api/admin/direct/draft", { cache: "no-store" }).then(
            (response) => response.json() as Promise<DirectDraftResponse>,
          ),
        ]);

        if (!mounted) return;

        const nextProducts = productsResult.status === "fulfilled" && Array.isArray(productsResult.value) ? productsResult.value : [];
        const nextSettings = settingsResult.status === "fulfilled" ? settingsResult.value || {} : {};
        const nextDirect = directResult.status === "fulfilled" && directResult.value?.ok ? directResult.value : null;

        setProducts(nextProducts);
        setSettings(nextSettings);
        setDirectDraft(nextDirect);
        setStats({
          products: nextProducts.length,
          activeProducts: nextProducts.filter((product) => product.active !== false).length,
          pricedProducts: nextProducts.filter((product) => Boolean(getProductPrice(product))).length,
          stockedProducts: nextProducts.filter((product) => (product.variants ?? []).some((variant) => variant.inStock)).length,
          categories: new Set(nextProducts.map((product) => product.category?.name).filter(Boolean)).size,
          emailConfigured: emailResult.status === "fulfilled" ? Boolean(emailResult.value?.configured) : false,
        });

        if (directResult.status === "rejected") {
          setPageError("Direct не проверился. Каталог и бесплатные каналы доступны.");
        }
      } catch (error) {
        if (mounted) {
          setPageError(error instanceof Error ? error.message : "Не удалось загрузить продвижение.");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, []);

  async function pingSitemap() {
    setSeoBusy("sitemap");
    setSeoMessage(null);
    try {
      const response = await fetch("/api/admin/seo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ping-sitemap" }),
      });
      const payload = await response.json();

      if (!response.ok) throw new Error(payload.error || "Не удалось отправить sitemap.");
      setSeoMessage(payload.message || "Sitemap отправлен на проверку.");
    } catch (error) {
      setSeoMessage(error instanceof Error ? error.message : "Не удалось отправить sitemap.");
    } finally {
      setSeoBusy(null);
    }
  }

  async function generateMeta() {
    setSeoBusy("meta");
    setSeoMessage(null);
    try {
      const response = await fetch("/api/admin/seo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "auto-meta" }),
      });
      const payload = await response.json();

      if (!response.ok) throw new Error(payload.error || "Не удалось обновить мета-описания.");
      setSeoMessage(payload.message || "Мета-описания обновлены.");
    } catch (error) {
      setSeoMessage(error instanceof Error ? error.message : "Не удалось обновить мета-описания.");
    } finally {
      setSeoBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.14),transparent_34%),linear-gradient(135deg,rgba(15,23,42,0.98),rgba(2,6,23,0.96))] p-5 shadow-2xl shadow-black/25 md:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-amber-200">
              <Megaphone className="h-4 w-4" />
              Продвижение
            </div>
            <h1 className="mt-4 text-3xl font-bold text-white md:text-4xl">Продажи из каталога, без лишней магии</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300 md:text-base">
              Берем реальные товары ПилоРус, собираем структуру Direct, проверяем фиды и показываем понятные шаги.
              Деньги на рекламу тратим только после подтверждения владельца.
            </p>
          </div>
          <div className="grid min-w-[260px] grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
              <p className="text-slate-400">Товаров</p>
              <p className="mt-2 text-2xl font-bold text-white">{stats.activeProducts}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
              <p className="text-slate-400">С ценой</p>
              <p className="mt-2 text-2xl font-bold text-white">{stats.pricedProducts}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
              <p className="text-slate-400">Категорий</p>
              <p className="mt-2 text-2xl font-bold text-white">{stats.categories}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
              <p className="text-slate-400">В наличии</p>
              <p className="mt-2 text-2xl font-bold text-white">{stats.stockedProducts}</p>
            </div>
          </div>
        </div>
      </section>

      {pageError ? (
        <div className="flex items-start gap-3 rounded-2xl border border-red-400/25 bg-red-500/10 p-4 text-sm text-red-100">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <p>{pageError}</p>
        </div>
      ) : null}

      <section className="space-y-4 rounded-3xl border border-white/10 bg-slate-950/70 p-5 md:p-6">
        <SectionTitle
          icon={Target}
          title="Yandex Direct"
          subtitle="Сейчас это безопасный черновик: ARAY собирает структуру, а запуск и бюджет подтверждает владелец."
          action={
            <button
              type="button"
              onClick={refreshDirectDraft}
              disabled={directLoading}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-amber-300 px-4 py-2 text-sm font-bold text-slate-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {directLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Собрать структуру
            </button>
          }
        />

        <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-4">
            <div className="flex items-start justify-between gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-300/20 bg-amber-300/10 text-amber-200">
                <Target className="h-5 w-5" />
              </span>
              <StatusPill text={directLabel.text} tone={directLabel.tone} />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-white">Доступ к Direct</h3>
            {directDraft?.direct.connected ? (
              <div className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
                <p>Токен Direct отвечает. Видим кампании аккаунта и можем готовить структуру без ручного копания.</p>
                {directDraft.direct.campaigns[0] ? (
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                    <p className="font-semibold text-white">{directDraft.direct.campaigns[0].name}</p>
                    <p className="text-slate-400">
                      {directDraft.direct.campaigns[0].state || "state неизвестен"} ·{" "}
                      {directDraft.direct.campaigns[0].status || "status неизвестен"}
                    </p>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
                <p>Для API нужен отдельный OAuth-токен Direct. Пока можно работать с фидами и черновиком из каталога.</p>
                {directDraft?.direct.error ? <p className="text-amber-200">{directDraft.direct.error}</p> : null}
              </div>
            )}
            <a
              href={DIRECT_URL}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/[0.03] px-3 py-2 text-sm font-semibold text-slate-100 transition hover:border-amber-300/40 hover:bg-amber-300/10"
            >
              Открыть Direct
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">{directDraft?.draft.campaignName || "ПилоРус | Поиск | Каталог"}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  {directDraft?.draft.region || "Россия"} · {directDraft?.draft.strategy || "ручной запуск после проверки"}
                </p>
              </div>
              <StatusPill text={directDraft?.mode === "draft-only" ? "черновик" : "проверка"} tone="warn" />
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                <p className="text-xs uppercase text-slate-500">Групп</p>
                <p className="mt-2 text-2xl font-bold text-white">{directDraft?.draft.groups.length ?? 0}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                <p className="text-xs uppercase text-slate-500">Товаров</p>
                <p className="mt-2 text-2xl font-bold text-white">{directDraft?.draft.productsCount ?? stats.activeProducts}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                <p className="text-xs uppercase text-slate-500">Бюджет</p>
                <p className="mt-2 text-base font-bold text-white">{directDraft?.draft.dailyBudgetHint || "после проверки"}</p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <CopyButton copied={copyKey === "direct-all"} onCopy={() => copyText("direct-all", formatDraftText(directDraft?.draft))}>
                Скопировать структуру
              </CopyButton>
              <CopyButton copied={copyKey === "negative"} onCopy={() => copyText("negative", negativeWords.join("\n"))}>
                Минус-слова
              </CopyButton>
              <CopyButton copied={copyKey === "steps"} onCopy={() => copyText("steps", PROMOTION_STEPS.join("\n"))}>
                План запуска
              </CopyButton>
            </div>

            {directDraft?.safety ? (
              <div className="mt-4 flex items-start gap-3 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-3 text-sm leading-6 text-amber-100">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
                <p>{directDraft.safety}</p>
              </div>
            ) : null}
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-white/10 bg-black/20 p-6 text-sm text-slate-300">Загружаю каталог и рекламную структуру...</div>
        ) : directDraft?.draft.groups.length ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {directDraft.draft.groups.slice(0, 8).map((group, index) => (
              <article key={group.name} className="rounded-2xl border border-white/10 bg-slate-950/55 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Группа {index + 1}</p>
                    <h3 className="mt-2 text-base font-semibold text-white">{group.name}</h3>
                    <p className="mt-1 text-sm text-slate-400">{group.productsCount} позиций</p>
                  </div>
                  <CopyButton copied={copyKey === `group-${index}`} onCopy={() => copyText(`group-${index}`, formatGroupText(group))}>
                    Копия
                  </CopyButton>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {group.keywords.slice(0, 8).map((keyword) => (
                    <span key={keyword} className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs text-slate-300">
                      {keyword}
                    </span>
                  ))}
                </div>
                {group.ads[0] ? (
                  <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-3 text-sm leading-6">
                    <p className="font-semibold text-white">{group.ads[0].title1}</p>
                    <p className="text-amber-100">{group.ads[0].title2}</p>
                    <p className="mt-1 text-slate-400">{group.ads[0].text}</p>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4 text-sm leading-6 text-amber-100">
            В каталоге пока мало данных для рекламной структуры. Проверь товары, цены и категории.
          </div>
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ReadinessCard
          icon={ShoppingBag}
          title="Каталог"
          value={`${stats.pricedProducts}/${stats.activeProducts || 0}`}
          tone={stats.activeProducts && stats.pricedProducts >= Math.ceil(stats.activeProducts * 0.7) ? "good" : "warn"}
          text="Для рекламы нужны активные товары с ценами и нормальными названиями. Без этого клики будут слабыми."
        />
        <ReadinessCard
          icon={BarChart2}
          title="Метрика"
          value={metrikaReady ? "ID есть" : "нужен ID"}
          tone={metrikaReady ? "good" : "warn"}
          text="В интерфейсе доступ может быть выдан, но для API нужен отдельный токен Метрики со scope. Цифры спроса не рисуем вручную."
        />
        <ReadinessCard
          icon={Search}
          title="SEO"
          value="фиды есть"
          tone="good"
          text="YML, sitemap и товарные страницы помогают поиску понимать каталог до платной рекламы."
        />
        <ReadinessCard
          icon={Bot}
          title="ARAY"
          value="помощник"
          tone="good"
          text="ARAY собирает структуру и чек-лист, но не запускает бюджет без команды владельца."
        />
      </section>

      <section className="space-y-4 rounded-3xl border border-white/10 bg-slate-950/70 p-5 md:p-6">
        <SectionTitle
          icon={Globe}
          title="Бесплатные каналы"
          subtitle="То, что уже можно использовать без рекламного бюджета: фиды, карты, справочники и ручные размещения."
        />
        <div className="grid gap-4 md:grid-cols-3">
          {FREE_CHANNELS.map((channel) => (
            <ChannelCard key={channel.title} channel={channel} />
          ))}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
        <div className="space-y-4 rounded-3xl border border-white/10 bg-slate-950/70 p-5 md:p-6">
          <SectionTitle icon={Sparkles} title="SEO и быстрые проверки" subtitle="Минимальный набор действий перед показом сайта клиенту и рекламой." />
          <div className="grid gap-3 md:grid-cols-2">
            <button
              type="button"
              onClick={pingSitemap}
              disabled={seoBusy === "sitemap"}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-slate-100 transition hover:border-amber-300/40 hover:bg-amber-300/10 disabled:opacity-60"
            >
              {seoBusy === "sitemap" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
              Отправить sitemap
            </button>
            <button
              type="button"
              onClick={generateMeta}
              disabled={seoBusy === "meta"}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-slate-100 transition hover:border-amber-300/40 hover:bg-amber-300/10 disabled:opacity-60"
            >
              {seoBusy === "meta" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              Заполнить пустые meta
            </button>
          </div>
          {seoMessage ? (
            <div className="rounded-2xl border border-emerald-400/25 bg-emerald-400/10 p-3 text-sm leading-6 text-emerald-100">{seoMessage}</div>
          ) : null}
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <h3 className="text-base font-semibold text-white">Проверка перед запуском</h3>
            <div className="mt-3 space-y-2">
              {PROMOTION_STEPS.map((step) => (
                <div key={step} className="flex items-start gap-2 text-sm leading-6 text-slate-300">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4 rounded-3xl border border-white/10 bg-slate-950/70 p-5 md:p-6">
          <SectionTitle icon={Clipboard} title="Готовые тексты" subtitle="Быстро скопировать для Direct, менеджера или ручного размещения." />
          <div className="space-y-3">
            {featuredProducts.slice(0, 4).map((product) => {
              const text = productAdText(product);

              return (
                <div key={product.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-white">{product.name}</h3>
                      <p className="mt-1 text-sm text-slate-400">{priceText(product)}</p>
                    </div>
                    <CopyButton copied={copyKey === `product-${product.id}`} onCopy={() => copyText(`product-${product.id}`, text)}>
                      Текст
                    </CopyButton>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-300">{text}</p>
                  <Link
                    href={buildUtmUrl(productPath(product), "manual")}
                    className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-amber-200 hover:text-amber-100"
                  >
                    Открыть товар
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </div>
              );
            })}
            {!featuredProducts.length ? (
              <div className="rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4 text-sm leading-6 text-amber-100">
                Добавь цены к товарам, и ARAY подготовит тексты для объявлений.
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-5 md:p-6">
          <SectionTitle icon={ShieldCheck} title="Минус-слова" subtitle="Базовая защита бюджета от мусорных запросов." />
          <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="flex flex-wrap gap-2">
              {negativeWords.map((word) => (
                <span key={word} className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs text-slate-300">
                  {word}
                </span>
              ))}
            </div>
            <CopyButton copied={copyKey === "negative"} onCopy={() => copyText("negative", negativeWords.join("\n"))} className="mt-4">
              Скопировать список
            </CopyButton>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-5 md:p-6">
          <SectionTitle icon={Bot} title="Команда для ARAY" subtitle="Короткий запрос, чтобы ассистент проверил запуск рекламы по правилам." />
          <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
            <pre className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-300">{buildArayPrompt(directDraft?.draft)}</pre>
            <CopyButton copied={copyKey === "aray"} onCopy={() => copyText("aray", buildArayPrompt(directDraft?.draft))} className="mt-4">
              Скопировать команду
            </CopyButton>
          </div>
        </div>
      </section>
    </div>
  );
}
