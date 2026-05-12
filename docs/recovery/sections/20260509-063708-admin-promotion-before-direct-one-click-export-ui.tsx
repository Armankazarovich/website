"use client";

import { useState, useEffect } from "react";
import {
  TrendingUp,
  Download,
  ExternalLink,
  CheckCircle2,
  Clipboard,
  Clock,
  Copy,
  Calendar,
  BarChart2,
  Bot,
  Users,
  Package,
  Zap,
  MapPin,
  Globe,
  ShoppingBag,
  Loader2,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Camera,
  MessageSquare,
  Megaphone,
  Search,
  ShieldCheck,
  Target,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type MarketplaceCard = {
  name: string;
  description: string;
  status: "ready" | "setup" | "soon";
  colorClass: string;
  letter: string;
  action: string;
  actionLabel: string;
  download?: boolean;
  external?: boolean;
};

type WeeklyTask = {
  day: string;
  icon: React.ElementType;
  title: string;
  tip: string;
};

type Stats = {
  productCount: number;
  emailCount: number;
};

type DirectCampaign = {
  id: string;
  name: string;
  state?: string | null;
  status?: string | null;
};

type DirectStatus = {
  configured: boolean;
  connected: boolean;
  campaignsCount: number;
  campaigns: DirectCampaign[];
  error?: string | null;
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
};

type DirectDraftResponse = {
  ok: boolean;
  mode: string;
  direct: DirectStatus;
  draft: DirectDraft;
  safety: string;
};

type CopyKey = "direct-structure" | "negative" | "aray" | `group-${number}`;

// ─── Constants ────────────────────────────────────────────────────────────────

const MARKETPLACES: MarketplaceCard[] = [
  {
    name: "Яндекс Маркет",
    description: "YML фид готов, подключите магазин",
    status: "ready",
    colorClass: "bg-orange-500",
    letter: "Я",
    action: "/api/yml",
    actionLabel: "Открыть фид",
    external: true,
  },
  {
    name: "Авито",
    description: "Объявления обновляются автоматически из каталога",
    status: "ready",
    colorClass: "bg-blue-600",
    letter: "A",
    action: "/api/admin/export/avito",
    actionLabel: "Скачать XML",
    download: true,
  },
  {
    name: "Яндекс Карты",
    description: "Добавьте компанию — клиенты ищут рядом с собой",
    status: "setup",
    colorClass: "bg-red-500",
    letter: "К",
    action: "https://business.yandex.ru",
    actionLabel: "Открыть",
    external: true,
  },
  {
    name: "Google Мой Бизнес",
    description: "Появитесь на Google Картах",
    status: "setup",
    colorClass: "bg-gradient-to-br from-blue-500 via-green-500 to-yellow-500",
    letter: "G",
    action: "https://business.google.com",
    actionLabel: "Открыть",
    external: true,
  },
  {
    name: "2GIS",
    description: "Региональная карта — важна для Москвы и МО",
    status: "setup",
    colorClass: "bg-emerald-600",
    letter: "2",
    action: "https://2gis.ru/firm-registration",
    actionLabel: "Открыть",
    external: true,
  },
];

const WEEKLY_TASKS: WeeklyTask[] = [
  {
    day: "Понедельник",
    icon: Camera,
    title: "Добавить 1-2 новых фото товаров",
    tip: "Живые фото с реальных объектов привлекают больше внимания. Сделайте снимок свежей партии пиломатериала прямо на складе — клиенты ценят честность. Загружайте через Медиабиблиотеку, затем добавляйте к карточке товара.",
  },
  {
    day: "Среда",
    icon: MessageSquare,
    title: "Ответить на отзывы в Яндекс Картах",
    tip: "Регулярные ответы на отзывы (особенно отрицательные) показывают алгоритму, что бизнес живой. Откройте Яндекс Бизнес → Отзывы. Отвечайте вежливо, упоминайте название компании — это помогает SEO.",
  },
  {
    day: "Пятница",
    icon: Megaphone,
    title: "Отправить акцию подписчикам (push/email)",
    tip: "Пятница — лучший день для B2C-рассылок. Создайте короткое сообщение с конкретной скидкой или акцией. Используйте раздел Email рассылка для выбора аудитории. Push-уведомления отправляйте через раздел Уведомления.",
  },
  {
    day: "Каждый день",
    icon: CheckCircle2,
    title: "Обработать все заказы до конца дня",
    tip: "Быстрая обработка заказов напрямую влияет на рейтинг в Яндекс Маркет. Цель — статус «В обработке» не дольше 4 часов. Перейдите в Заказы → отсортируйте по дате создания.",
  },
  {
    day: "Раз в месяц",
    icon: RefreshCw,
    title: "Обновить цены + отправить в Яндекс Маркет",
    tip: "Актуальные цены в YML-фиде улучшают конверсию и снижают отказы. Обновите цены через Каталог товаров → Быстрое редактирование. YML автоматически обновляется при каждом запросе.",
  },
  {
    day: "Раз в месяц",
    icon: BarChart2,
    title: "Проверить Яндекс Метрику — что ищут на сайте",
    tip: "В Яндекс Метрике откройте Отчёты → Поведение → Внутренний поиск. Какие слова вводят? Это подсказки для новых товаров и SEO-текстов. Также проверьте Вебвизор для популярных страниц.",
  },
];

function formatGroupText(group: DirectDraftGroup) {
  const ads = group.ads
    .map((ad, index) =>
      [
        `Объявление ${index + 1}`,
        `Заголовок 1: ${ad.title1}`,
        `Заголовок 2: ${ad.title2}`,
        `Текст: ${ad.text}`,
        `Ссылка: ${ad.href}`,
      ].join("\n"),
    )
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

function formatDraftText(draft?: DirectDraft) {
  if (!draft) return "";

  return [
    `Кампания: ${draft.campaignName}`,
    `Регион: ${draft.region}`,
    `Стратегия: ${draft.strategy}`,
    `Бюджет: ${draft.dailyBudgetHint}`,
    `Товаров в черновике: ${draft.productsCount}`,
    "",
    draft.groups.map(formatGroupText).join("\n\n---\n\n"),
    "",
    `Минус-слова:\n${draft.negativeWords.join(", ")}`,
    "",
    `Проверка перед запуском:\n${draft.checklist.map((item) => `- ${item}`).join("\n")}`,
  ].join("\n");
}

function buildArayPrompt(draft?: DirectDraft) {
  const base = [
    "ARAY, проверь продвижение ПилоРус перед запуском рекламы.",
    "Запуск денег только после подтверждения владельца.",
    "Проверь каталог, цены, наличие, регионы, минус-слова, объявления, UTM, посадочные страницы и цели Метрики.",
  ];

  if (!draft) return base.join("\n");

  return [
    ...base,
    `Кампания: ${draft.campaignName}`,
    `Регион: ${draft.region}`,
    `Групп: ${draft.groups.length}`,
    `Товаров: ${draft.productsCount}`,
  ].join("\n");
}

function CopyButton({
  copied,
  onClick,
  children,
}: {
  copied: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-semibold hover:bg-primary/[0.08] transition-colors"
    >
      {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
      {children}
    </button>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: "ready" | "setup" | "soon" }) {
  if (status === "ready")
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
        <CheckCircle2 className="w-3 h-3" /> Готово
      </span>
    );
  if (status === "setup")
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
        <Clock className="w-3 h-3" /> Настроить
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
      <Zap className="w-3 h-3" /> Скоро
    </span>
  );
}

function MarketplaceCardItem({ card }: { card: MarketplaceCard }) {
  const handleAction = () => {
    if (card.download) {
      const a = document.createElement("a");
      a.href = card.action;
      a.download = "";
      a.click();
    } else if (card.external) {
      window.open(card.action, "_blank", "noopener,noreferrer");
    } else {
      window.open(card.action, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-4 flex flex-col gap-3 hover:border-primary/30 transition-colors">
      <div className="flex items-start gap-3">
        <div
          className={`w-10 h-10 rounded-xl ${card.colorClass} flex items-center justify-center text-white font-bold text-lg shrink-0`}
        >
          {card.letter}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm">{card.name}</span>
            <StatusBadge status={card.status} />
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{card.description}</p>
        </div>
      </div>
      <button
        onClick={handleAction}
        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border border-border hover:bg-primary/[0.08] transition-colors"
      >
        {card.download ? (
          <Download className="w-3.5 h-3.5" />
        ) : (
          <ExternalLink className="w-3.5 h-3.5" />
        )}
        {card.actionLabel}
      </button>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  color: string;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-2xl ${color} flex items-center justify-center shrink-0`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div>
        <div className="text-2xl font-bold font-display">{value}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
      </div>
    </div>
  );
}

function WeeklyTaskCard({ task }: { task: WeeklyTask }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <button
        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-primary/[0.06] transition-colors text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <task.icon className="w-5 h-5 text-muted-foreground shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-muted-foreground">{task.day}</div>
          <div className="text-sm font-semibold leading-snug">{task.title}</div>
        </div>
        {open ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
        )}
      </button>
      {open && (
        <div className="px-4 pb-4 pt-0 border-t border-border">
          <p className="text-sm text-muted-foreground leading-relaxed mt-3">{task.tip}</p>
        </div>
      )}
    </div>
  );
}

function AdvertisingModule() {
  const [draft, setDraft] = useState<DirectDraftResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copyKey, setCopyKey] = useState<CopyKey | null>(null);

  const loadDraft = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/direct/draft", { cache: "no-store" });
      const payload = (await response.json()) as DirectDraftResponse | { error?: string };
      if (!response.ok || !("ok" in payload) || !payload.ok) {
        throw new Error("Не удалось собрать рекламный черновик");
      }
      setDraft(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось проверить рекламу");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDraft();
  }, []);

  const copyText = async (key: CopyKey, text: string) => {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopyKey(key);
    window.setTimeout(() => setCopyKey(null), 1600);
  };

  const directReady = draft?.direct.connected;
  const firstCampaign = draft?.direct.campaigns?.[0];
  const groups = draft?.draft.groups ?? [];
  const checklist = draft?.draft.checklist ?? [
    "Проверить регион и доставку.",
    "Проверить цены и наличие в каталоге.",
    "Проверить минус-слова.",
    "Проверить цели Метрики.",
    "Запускать бюджет только после подтверждения владельца.",
  ];

  return (
    <section>
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-muted-foreground" />
            Реклама и Яндекс Директ
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Черновик кампании из каталога: структура, объявления, минус-слова и шаги запуска.
          </p>
        </div>
        <button
          type="button"
          onClick={loadDraft}
          disabled={loading}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Обновить черновик
        </button>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 md:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
              <Target className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold">{draft?.draft.campaignName || "ПилоРус | Поиск | Каталог"}</h3>
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                  Черновик
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    directReady
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {directReady ? "Direct подключен" : "Direct вручную"}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {draft?.draft.region || "Москва и Московская область"} · запуск только после твоего подтверждения.
              </p>
              {firstCampaign ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Найдена кампания: <span className="font-medium text-foreground">{firstCampaign.name}</span>
                </p>
              ) : null}
              {error ? <p className="mt-2 text-xs font-medium text-amber-600">{error}</p> : null}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <CopyButton copied={copyKey === "direct-structure"} onClick={() => copyText("direct-structure", formatDraftText(draft?.draft))}>
              Структура
            </CopyButton>
            <CopyButton copied={copyKey === "negative"} onClick={() => copyText("negative", (draft?.draft.negativeWords ?? []).join("\n"))}>
              Минус-слова
            </CopyButton>
            <CopyButton copied={copyKey === "aray"} onClick={() => copyText("aray", buildArayPrompt(draft?.draft))}>
              ARAY
            </CopyButton>
            <a
              href="https://direct.yandex.ru"
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-semibold hover:bg-primary/[0.08] transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Открыть Direct
            </a>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3 xl:grid-cols-[1.1fr_0.8fr_1.1fr]">
          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Target className="h-4 w-4 text-primary" />
              Настройки запуска
            </div>
            <div className="mt-3 space-y-2 text-xs text-muted-foreground">
              <p>
                Регион: <span className="font-medium text-foreground">{draft?.draft.region || "не загружен"}</span>
              </p>
              <p>
                Бюджет: <span className="font-medium text-foreground">{draft?.draft.dailyBudgetHint || "после проверки"}</span>
              </p>
              <p>
                Стратегия: <span className="font-medium text-foreground">{draft?.draft.strategy || "ручной запуск"}</span>
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Search className="h-4 w-4 text-primary" />
              Группы и ключи
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div>
                <div className="text-2xl font-bold font-display">{groups.length}</div>
                <div className="text-xs text-muted-foreground">групп</div>
              </div>
              <div>
                <div className="text-2xl font-bold font-display">{draft?.draft.productsCount ?? statsSafeNumber(groups.length)}</div>
                <div className="text-xs text-muted-foreground">товаров</div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Bot className="h-4 w-4 text-primary" />
              ARAY помогает
            </div>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              Проверит структуру, объяснит риск, подготовит текст менеджеру и не запускает деньги без владельца.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 xl:grid-cols-[minmax(0,1.45fr)_minmax(22rem,0.75fr)]">
          <div className="space-y-3">
            {loading ? (
              <div className="rounded-2xl border border-border bg-background/60 p-4 text-sm text-muted-foreground">
                Собираю группы объявлений из каталога...
              </div>
            ) : groups.length ? (
              groups.slice(0, 4).map((group, index) => (
                <div key={`${group.name}-${index}`} className="rounded-2xl border border-border bg-background/60 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Группа {index + 1}</div>
                      <h4 className="mt-1 font-semibold">{group.name}</h4>
                      <p className="mt-1 text-xs text-muted-foreground">{group.productsCount} товаров · {group.keywords.length} ключей</p>
                    </div>
                    <CopyButton copied={copyKey === `group-${index}`} onClick={() => copyText(`group-${index}`, formatGroupText(group))}>
                      Копировать
                    </CopyButton>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {group.keywords.slice(0, 7).map((keyword) => (
                      <span key={keyword} className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">
                        {keyword}
                      </span>
                    ))}
                  </div>

                  {group.ads[0] ? (
                    <div className="mt-3 rounded-xl border border-border bg-card p-3 text-xs leading-relaxed">
                      <div className="font-semibold">{group.ads[0].title1}</div>
                      <div className="text-primary">{group.ads[0].title2}</div>
                      <div className="mt-1 text-muted-foreground">{group.ads[0].text}</div>
                    </div>
                  ) : null}
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-border bg-background/60 p-4 text-sm text-muted-foreground">
                Добавьте активные товары с ценами, и ARAY соберет группы объявлений.
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="rounded-2xl border border-border bg-background/60 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                Проверка перед запуском
              </div>
              <div className="mt-3 space-y-2">
                {checklist.map((item) => (
                  <div key={item} className="flex gap-2 text-xs leading-relaxed text-muted-foreground">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-background/60 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Clipboard className="h-4 w-4 text-primary" />
                Команда для ARAY
              </div>
              <p className="mt-3 whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
                {buildArayPrompt(draft?.draft)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function statsSafeNumber(value: number) {
  return Number.isFinite(value) ? value : 0;
}

// ─── SEO Health Mini Section ──────────────────────────────────────────────────

function SeoHealthSection({ productCount }: { productCount: number }) {
  const [pinging, setPinging] = useState(false);
  const [pingResult, setPingResult] = useState<string | null>(null);
  const [autoMetaLoading, setAutoMetaLoading] = useState(false);
  const [autoMetaResult, setAutoMetaResult] = useState<string | null>(null);
  const [settings, setSettings] = useState<{ yandex_metrika_id?: string }>({});

  useEffect(() => {
    fetch("/api/admin/site-settings")
      .then((r) => r.json())
      .then((d) => setSettings(d || {}))
      .catch(() => {});
  }, []);

  const pingSitemap = async () => {
    setPinging(true);
    setPingResult(null);
    try {
      const res = await fetch("/api/admin/seo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ping_sitemap" }),
      });
      const data = await res.json();
      if (data.results) {
        setPingResult(data.results.map((r: any) => `${r.engine}: ${r.status}`).join(" · "));
      }
    } catch {
      setPingResult("Ошибка соединения");
    }
    setPinging(false);
  };

  const autoMeta = async () => {
    setAutoMetaLoading(true);
    setAutoMetaResult(null);
    try {
      const res = await fetch("/api/admin/seo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "auto_meta" }),
      });
      const data = await res.json();
      if (data.updated !== undefined) {
        setAutoMetaResult(`Обновлено описаний: ${data.updated}`);
      }
    } catch {
      setAutoMetaResult("Ошибка соединения");
    }
    setAutoMetaLoading(false);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {/* Sitemap */}
      <div className="bg-card border border-border rounded-2xl p-4 space-y-2">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-emerald-500" />
          <span className="text-sm font-semibold">Sitemap</span>
          <span className="ml-auto text-xs text-emerald-600 font-medium bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">
            Доступен
          </span>
        </div>
        <p className="text-xs text-muted-foreground">/sitemap.xml готов к индексации</p>
        {pingResult && (
          <p className="text-xs text-emerald-600 font-medium">{pingResult}</p>
        )}
        <button
          onClick={pingSitemap}
          disabled={pinging}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border border-border hover:bg-primary/[0.08] transition-colors disabled:opacity-50"
        >
          {pinging ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <RefreshCw className="w-3 h-3" />
          )}
          Отправить в поисковики
        </button>
      </div>

      {/* Яндекс Метрика */}
      <div className="bg-card border border-border rounded-2xl p-4 space-y-2">
        <div className="flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-orange-500" />
          <span className="text-sm font-semibold">Яндекс Метрика</span>
          {settings.yandex_metrika_id ? (
            <span className="ml-auto text-xs text-emerald-600 font-medium bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">
              Подключена
            </span>
          ) : (
            <span className="ml-auto text-xs text-amber-600 font-medium bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 rounded-full">
              Не настроена
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {settings.yandex_metrika_id
            ? `Счётчик #${settings.yandex_metrika_id} активен`
            : "Настройте счётчик в разделе Аналитика"}
        </p>
        <a
          href="/admin/analytics"
          className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border border-border hover:bg-primary/[0.08] transition-colors"
        >
          <ExternalLink className="w-3 h-3" />
          Открыть настройки
        </a>
      </div>

      {/* Описания товаров */}
      <div className="bg-card border border-border rounded-2xl p-4 space-y-2">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">Описания товаров</span>
        </div>
        <p className="text-xs text-muted-foreground">
          {productCount} товаров в каталоге. Автозаполнение добавит описания тем, у кого их нет.
        </p>
        {autoMetaResult && (
          <p className="text-xs text-emerald-600 font-medium">{autoMetaResult}</p>
        )}
        <button
          onClick={autoMeta}
          disabled={autoMetaLoading}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border border-border hover:bg-primary/[0.08] transition-colors disabled:opacity-50"
        >
          {autoMetaLoading ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Zap className="w-3 h-3" />
          )}
          Заполнить авто
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PromotionPage() {
  const [stats, setStats] = useState<Stats>({ productCount: 0, emailCount: 0 });
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const [productsRes, emailRes] = await Promise.allSettled([
          fetch("/api/admin/products"),
          fetch("/api/admin/email"),
        ]);

        let productCount = 0;
        let emailCount = 0;

        if (productsRes.status === "fulfilled" && productsRes.value.ok) {
          const data = await productsRes.value.json();
          productCount = Array.isArray(data) ? data.length : 0;
        }

        if (emailRes.status === "fulfilled" && emailRes.value.ok) {
          const data = await emailRes.value.json();
          emailCount = data?.total ?? 0;
        }

        setStats({ productCount, emailCount });
      } catch {
        // Use defaults if fetch fails
      }
      setStatsLoading(false);
    }
    loadStats();
  }, []);

  return (
    <div className="admin-page-frame admin-page-frame-fluid space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-primary" />
          </div>
          <h1 className="font-display font-bold text-2xl">Продвижение и трафик</h1>
        </div>
        <p className="text-muted-foreground text-sm ml-12">
          Всё что нужно чтобы клиенты вас нашли
        </p>
      </div>

      {/* Section 1: Бесплатные площадки */}
      <section>
        <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
          <ShoppingBag className="w-4 h-4 text-muted-foreground" />
          Бесплатные площадки
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5 gap-3">
          {MARKETPLACES.map((card) => (
            <MarketplaceCardItem key={card.name} card={card} />
          ))}
        </div>
      </section>

      {/* Section 2: Что работает прямо сейчас */}
      <section>
        <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
          <Zap className="w-4 h-4 text-muted-foreground" />
          Что работает прямо сейчас
        </h2>
        {statsLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
            <Loader2 className="w-4 h-4 animate-spin" /> Загружаем данные...
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            <StatCard
              icon={Package}
              label="Товаров в каталоге"
              value={stats.productCount}
              color="bg-primary"
            />
            <StatCard
              icon={ShoppingBag}
              label="Товаров на Яндекс Маркет"
              value={stats.productCount}
              color="bg-orange-500"
            />
            <StatCard
              icon={Users}
              label="Email подписчиков"
              value={stats.emailCount}
              color="bg-violet-500"
            />
          </div>
        )}
      </section>

      {/* Section 3: Реклама */}
      <AdvertisingModule />

      {/* Section 3: Недельный план */}
      <section>
        <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          Недельный план продвижения
        </h2>
        <p className="text-xs text-muted-foreground mb-3">
          Нажмите на задачу, чтобы увидеть подробный совет
        </p>
        <div className="space-y-2">
          {WEEKLY_TASKS.map((task) => (
            <WeeklyTaskCard key={task.title} task={task} />
          ))}
        </div>
      </section>

      {/* Section 4: SEO состояние */}
      <section>
        <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
          <Globe className="w-4 h-4 text-muted-foreground" />
          SEO состояние
        </h2>
        <SeoHealthSection productCount={stats.productCount} />
      </section>
    </div>
  );
}
