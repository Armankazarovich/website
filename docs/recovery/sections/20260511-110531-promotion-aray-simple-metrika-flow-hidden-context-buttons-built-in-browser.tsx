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
  UploadCloud,
  Eye,
} from "lucide-react";
import { AdminModal } from "@/components/admin/admin-modal";
import { useToast } from "@/components/ui/use-toast";

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

type AdsChannel = {
  name: string;
  status: string;
  description: string;
  icon: React.ElementType;
};

type DirectGeneratorMode = "category" | "product";

type DirectGenerationSettings = {
  grouping: DirectGeneratorMode;
  campaignKind: "text" | "product" | "media";
  placement: "search" | "network" | "both";
  feedSource: "catalog" | "yml" | "market";
  feedOnlyInStock: boolean;
  feedOnlyWithPrice: boolean;
  feedCategoryFilter: string;
  selectedCategoriesText: string;
  selectedProductsText: string;
  recommendationMode: boolean;
  minPrice: number;
  maxPrice: number;
  maxGroups: number;
  maxKeywordsPerGroup: number;
  maxAdsPerGroup: number;
  includeImages: boolean;
  dailyBudget: number;
  schedule: "business_hours" | "all_day" | "manual";
  timeFrom: string;
  timeTo: string;
  weekdays: string;
  audienceMode: "search" | "retargeting" | "mixed";
  promoText: string;
  quickLinksText: string;
  excludedKeywordsText: string;
  region: string;
};

type DirectCampaign = {
  id: string | number;
  name: string;
  state?: string | null;
  status?: string | null;
};

type DirectStatus = {
  configured: boolean;
  connected: boolean;
  mode?: "oauth-token" | "oauth-app" | "missing";
  campaignsCount: number;
  campaigns: DirectCampaign[];
  error?: string | null;
};

type DirectDraftAd = {
  title1: string;
  title2: string;
  text: string;
  href: string;
  imageUrls?: string[];
};

type DirectDraftGroupProduct = {
  id: string;
  name: string;
  slug?: string | null;
  category: string;
  price: number | null;
};

type DirectDraftGroup = {
  name: string;
  category: string;
  productsCount: number;
  products?: DirectDraftGroupProduct[];
  keywords: string[];
  ads: DirectDraftAd[];
  imageUrls: string[];
  quickLinks: Array<{ title: string; href: string; description?: string }>;
};

type DirectSelectionCategory = {
  name: string;
  slug?: string | null;
  productsCount: number;
};

type DirectSelectionProduct = {
  id: string;
  name: string;
  slug?: string | null;
  category: string;
  categorySlug?: string | null;
  price: number | null;
  inStock: boolean;
};

type DirectDraft = {
  campaignName: string;
  region: string;
  strategy: string;
  dailyBudgetHint: string;
  campaignKind: string;
  placement: string;
  feed: string;
  promoText: string;
  audience: string;
  schedule: string;
  productsCount: number;
  generation: DirectGenerationSettings;
  groups: DirectDraftGroup[];
  negativeWords: string[];
  checklist: string[];
};

type DirectMetrikaGoals = {
  order?: string;
  lead?: string;
  phone?: string;
  messenger?: string;
  cart?: string;
  checkout?: string;
  engaged?: string;
};

type MetrikaStatus = {
  configured: boolean;
  connected: boolean;
  mode: "oauth-token" | "oauth-app" | "env-token" | "missing";
  selectedCounterId: number | null;
  counters: Array<{
    id: number;
    name: string;
    site: string;
    goalsCount: number;
  }>;
  storedGoals: DirectMetrikaGoals;
  error: string | null;
};

type DirectDraftResponse = {
  ok: boolean;
  mode: string;
  direct: DirectStatus;
  draft: DirectDraft;
  publicBaseUrl?: string;
  publicBaseUrlReady?: boolean;
  metrikaCounterIds?: number[];
  metrikaGoals?: DirectMetrikaGoals;
  businessProfileId?: number | null;
  selection?: {
    categories: DirectSelectionCategory[];
    products: DirectSelectionProduct[];
  };
  safety: string;
};

type DirectExportResult = {
  campaignId: number;
  campaignName: string;
  directUrl: string;
  groupsCreated: number;
  adsCreated: number;
  keywordsCreated: number;
  sitelinksCreated: number;
  mode: string;
  safety: string;
};

type DirectExportResponse = {
  ok: boolean;
  mode: string;
  export: DirectExportResult;
  error?: string;
};

type CopyKey =
  | "direct-structure"
  | "negative"
  | "aray"
  | "aray-edit"
  | `group-${number}`;
type DirectPreviewMode = "groups" | "ads" | "keywords" | "negative";

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

const ADS_CHANNELS: AdsChannel[] = [
  {
    name: "Яндекс Директ",
    status: "API",
    description: "РК, группы, объявления и ключи из текущего каталога.",
    icon: Search,
  },
  {
    name: "VK Ads / таргет",
    status: "Готовим",
    description: "Аудитории, офферы, UTM и тексты без фейковой выгрузки.",
    icon: Users,
  },
  {
    name: "Google Ads",
    status: "План",
    description: "Структура и чек-лист, подключение после ключей клиента.",
    icon: Globe,
  },
];

const OFFER_PRESETS = [
  "Доставка сегодня",
  "В наличии на складе",
  "Подбор под задачу",
  "Опт и розница",
  "Честные цены с сайта",
];

const QUICK_LINK_PRESETS = [
  {
    label: "База",
    value:
      "Каталог|/catalog|Все товары и категории\nДоставка|/delivery|Сроки, зоны и стоимость\nКонтакты|/contacts|Телефон, адрес и мессенджеры\nАкции|/promotions|Выгодные предложения",
  },
  {
    label: "Продажи",
    value:
      "Каталог|/catalog|Посмотреть ассортимент\nДоставка|/delivery|Быстро по Москве и МО\nОплата|/payment|Условия оплаты и счета\nКонтакты|/contacts|Связаться с менеджером",
  },
  {
    label: "Доверие",
    value:
      "О компании|/about|Склад, команда и условия\nДоставка|/delivery|Сроки и зоны доставки\nКонтакты|/contacts|Телефон и мессенджеры\nКаталог|/catalog|Актуальные цены",
  },
];

const METRIKA_GOAL_FIELDS = [
  {
    key: "order",
    label: "Заказ",
    hint: "Главная цель: успешное оформление заказа.",
  },
  {
    key: "lead",
    label: "Заявка",
    hint: "Форма, быстрый заказ или заявка менеджеру.",
  },
  {
    key: "phone",
    label: "Телефон",
    hint: "Клик по номеру телефона на сайте.",
  },
  {
    key: "messenger",
    label: "Мессенджер",
    hint: "WhatsApp, Telegram или другой канал связи.",
  },
  {
    key: "cart",
    label: "Корзина",
    hint: "Добавление товара в корзину.",
  },
  {
    key: "checkout",
    label: "Checkout",
    hint: "Переход к оформлению заказа.",
  },
  {
    key: "engaged",
    label: "Вовлеченная сессия",
    hint: "Микроцель для обучения до первых заявок.",
  },
] satisfies Array<{ key: keyof DirectMetrikaGoals; label: string; hint: string }>;

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
    group.imageUrls.length
      ? `Фото:\n${group.imageUrls.map((url) => `- ${url}`).join("\n")}`
      : "",
    `Ключи:\n${group.keywords.map((keyword) => `- ${keyword}`).join("\n")}`,
    `Быстрые ссылки:\n${group.quickLinks.map((link) => `- ${link.title}: ${link.href}${link.description ? ` — ${link.description}` : ""}`).join("\n")}`,
    ads,
  ]
    .filter(Boolean)
    .join("\n\n");
}

function formatDraftText(draft?: DirectDraft) {
  if (!draft) return "";

  return [
    `Кампания: ${draft.campaignName}`,
    `Регион: ${draft.region}`,
    `Стратегия: ${draft.strategy}`,
    `Тип кампании: ${draft.campaignKind}`,
    `Площадка: ${draft.placement}`,
    `Фид: ${draft.feed}`,
    `Аудитория: ${draft.audience}`,
    draft.promoText ? `Промо: ${draft.promoText}` : "",
    `График: ${draft.schedule}`,
    `Бюджет: ${draft.dailyBudgetHint}`,
    `Товаров в черновике: ${draft.productsCount}`,
    "",
    draft.groups.map(formatGroupText).join("\n\n---\n\n"),
    "",
    `Минус-слова:\n${draft.negativeWords.join(", ")}`,
    "",
    `Проверка перед запуском:\n${draft.checklist.map((item) => `- ${item}`).join("\n")}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function buildArayPrompt(draft?: DirectDraft) {
  const base = [
    "ARAY, проверь продвижение текущего бизнеса перед запуском рекламы.",
    "Запуск денег только после подтверждения владельца.",
    "Проверь каталог, цены, наличие, регионы, минус-слова, объявления, UTM, посадочные страницы и цели Метрики.",
  ];

  if (!draft) return base.join("\n");

  return [
    ...base,
    `Кампания: ${draft.campaignName}`,
    `Регион: ${draft.region}`,
    `Тип кампании: ${draft.campaignKind}`,
    `Площадка: ${draft.placement}`,
    `Фид: ${draft.feed}`,
    `Аудитория: ${draft.audience}`,
    `График: ${draft.schedule}`,
    `Групп: ${draft.groups.length}`,
    `Товаров: ${draft.productsCount}`,
  ].join("\n");
}

function buildArayEditPrompt(
  draft: DirectDraft | undefined,
  request: string,
  excludedKeywords: string,
) {
  const task =
    request.trim() ||
    "Проверь группы, объявления и ключи. Предложи точечные правки без запуска бюджета.";
  return [
    "ARAY, внеси точечную правку в рекламный черновик.",
    "Не запускай бюджет и не меняй безопасные настройки без подтверждения владельца.",
    draft ? `Кампания: ${draft.campaignName}` : "",
    draft
      ? `Групп: ${draft.groups.length}, товаров: ${draft.productsCount}`
      : "",
    excludedKeywords.trim()
      ? `Фразы, которые директолог хочет исключить:\n${excludedKeywords.trim()}`
      : "",
    `Задача:\n${task}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function clampControlNumber(
  value: string,
  min: number,
  max: number,
  fallback: number,
) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(parsed)));
}

function splitSelectionText(value: string) {
  return value
    .split(/[\n,;]+/g)
    .map((item) => item.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function normalizeSelectionValue(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function formatProductPrice(value: number | null) {
  return value ? `от ${value.toLocaleString("ru-RU")} ₽` : "цена не указана";
}

function generatorModeLabel(mode: DirectGeneratorMode) {
  return mode === "product" ? "по товарам" : "по категориям";
}

function audienceModeLabel(mode: DirectGenerationSettings["audienceMode"]) {
  if (mode === "mixed") return "Поиск + ретаргетинг";
  if (mode === "retargeting") return "Ретаргетинг";
  return "Поиск";
}

function campaignKindLabel(kind: DirectGenerationSettings["campaignKind"]) {
  if (kind === "product") return "Товарная";
  if (kind === "media") return "Медийная";
  return "Текстово-граф.";
}

function placementLabel(placement: DirectGenerationSettings["placement"]) {
  if (placement === "network") return "Сети";
  if (placement === "both") return "Поиск + сети";
  return "Поиск";
}

function feedSourceLabel(source: DirectGenerationSettings["feedSource"]) {
  if (source === "yml") return "YML";
  if (source === "market") return "Маркет";
  return "Каталог";
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
      {copied ? (
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
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
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            {card.description}
          </p>
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
      <div
        className={`w-12 h-12 rounded-2xl ${color} flex items-center justify-center shrink-0`}
      >
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
          <div className="text-xs font-medium text-muted-foreground">
            {task.day}
          </div>
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
          <p className="text-sm text-muted-foreground leading-relaxed mt-3">
            {task.tip}
          </p>
        </div>
      )}
    </div>
  );
}

function AdvertisingModule() {
  const { toast } = useToast();
  const [draft, setDraft] = useState<DirectDraftResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copyKey, setCopyKey] = useState<CopyKey | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportResult, setExportResult] = useState<DirectExportResult | null>(
    null,
  );
  const [exportError, setExportError] = useState<string | null>(null);
  const [generatorMode, setGeneratorMode] =
    useState<DirectGeneratorMode>("category");
  const [campaignKind, setCampaignKind] =
    useState<DirectGenerationSettings["campaignKind"]>("text");
  const [placement, setPlacement] =
    useState<DirectGenerationSettings["placement"]>("search");
  const [feedSource, setFeedSource] =
    useState<DirectGenerationSettings["feedSource"]>("catalog");
  const [feedOnlyInStock, setFeedOnlyInStock] = useState(true);
  const [feedOnlyWithPrice, setFeedOnlyWithPrice] = useState(true);
  const [feedCategoryFilter, setFeedCategoryFilter] = useState("");
  const [selectedCategoriesText, setSelectedCategoriesText] = useState("");
  const [selectedProductsText, setSelectedProductsText] = useState("");
  const [recommendationMode, setRecommendationMode] = useState(true);
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(0);
  const [maxGroups, setMaxGroups] = useState(8);
  const [maxAds, setMaxAds] = useState(2);
  const [maxKeywords, setMaxKeywords] = useState(12);
  const [includeImages, setIncludeImages] = useState(true);
  const [dailyBudget, setDailyBudget] = useState(700);
  const [schedule, setSchedule] =
    useState<DirectGenerationSettings["schedule"]>("business_hours");
  const [timeFrom, setTimeFrom] = useState("09:00");
  const [timeTo, setTimeTo] = useState("19:00");
  const [weekdays, setWeekdays] = useState("Пн-Пт");
  const [audienceMode, setAudienceMode] =
    useState<DirectGenerationSettings["audienceMode"]>("search");
  const [promoText, setPromoText] = useState("");
  const [quickLinksText, setQuickLinksText] = useState(
    "Каталог|/catalog|Все товары и категории\nДоставка|/delivery|Сроки, зоны и стоимость\nКонтакты|/contacts|Телефон, адрес и мессенджеры\nАкции|/promotions|Выгодные предложения",
  );
  const [excludedKeywordsText, setExcludedKeywordsText] = useState("");
  const [arayEditRequest, setArayEditRequest] = useState("");
  const [wizardOpen, setWizardOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [selectionOpen, setSelectionOpen] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [previewOpen, setPreviewOpen] = useState<DirectPreviewMode | null>(
    null,
  );
  const [directProOpen, setDirectProOpen] = useState(false);
  const [readinessOpen, setReadinessOpen] = useState(false);
  const [readinessAdvancedOpen, setReadinessAdvancedOpen] = useState(false);
  const [readinessSaving, setReadinessSaving] = useState(false);
  const [setupCounterId, setSetupCounterId] = useState("");
  const [setupBusinessProfileId, setSetupBusinessProfileId] = useState("");
  const [setupGoals, setSetupGoals] = useState<DirectMetrikaGoals>({});
  const [metrikaStatus, setMetrikaStatus] = useState<MetrikaStatus | null>(null);
  const [metrikaLoading, setMetrikaLoading] = useState(false);
  const [metrikaGoalsCreating, setMetrikaGoalsCreating] = useState(false);
  const [exportAds, setExportAds] = useState(true);
  const [exportKeywords, setExportKeywords] = useState(true);
  const [exportSitelinks, setExportSitelinks] = useState(true);
  const [ownerConfirmed, setOwnerConfirmed] = useState(false);

  const generatorOptions = () => ({
    grouping: generatorMode,
    campaignKind,
    placement,
    feedSource,
    feedOnlyInStock,
    feedOnlyWithPrice,
    feedCategoryFilter,
    selectedCategoriesText,
    selectedProductsText,
    recommendationMode,
    minPrice,
    maxPrice,
    maxGroups:
      generatorMode === "product"
        ? Math.min(
            40,
            Math.max(
              1,
              selectedProductsText
                ? splitSelectionText(selectedProductsText).length
                : productOptions.length || maxGroups,
            ),
          )
        : maxGroups,
    maxAdsPerGroup: maxAds,
    maxKeywordsPerGroup: maxKeywords,
    includeImages,
    dailyBudget,
    schedule,
    timeFrom,
    timeTo,
    weekdays,
    audienceMode,
    promoText,
    quickLinksText,
    excludedKeywordsText,
  });

  const draftUrl = () => {
    const params = new URLSearchParams();
    const options = generatorOptions();
    params.set("grouping", options.grouping);
    params.set("campaignKind", options.campaignKind);
    params.set("placement", options.placement);
    params.set("feedSource", options.feedSource);
    params.set("feedOnlyInStock", options.feedOnlyInStock ? "1" : "0");
    params.set("feedOnlyWithPrice", options.feedOnlyWithPrice ? "1" : "0");
    params.set("feedCategoryFilter", options.feedCategoryFilter);
    params.set("selectedCategoriesText", options.selectedCategoriesText);
    params.set("selectedProductsText", options.selectedProductsText);
    params.set("recommendationMode", options.recommendationMode ? "1" : "0");
    params.set("minPrice", String(options.minPrice));
    params.set("maxPrice", String(options.maxPrice));
    params.set("maxGroups", String(options.maxGroups));
    params.set("maxAdsPerGroup", String(options.maxAdsPerGroup));
    params.set("maxKeywordsPerGroup", String(options.maxKeywordsPerGroup));
    params.set("includeImages", options.includeImages ? "1" : "0");
    params.set("dailyBudget", String(options.dailyBudget));
    params.set("schedule", options.schedule);
    params.set("timeFrom", options.timeFrom);
    params.set("timeTo", options.timeTo);
    params.set("weekdays", options.weekdays);
    params.set("audienceMode", options.audienceMode);
    params.set("promoText", options.promoText);
    params.set("quickLinksText", options.quickLinksText);
    params.set("excludedKeywordsText", options.excludedKeywordsText);
    return `/api/admin/direct/draft?${params.toString()}`;
  };

  const loadDraft = async ({
    preserveExportResult = false,
  }: { preserveExportResult?: boolean } = {}) => {
    setLoading(true);
    setError(null);
    if (!preserveExportResult) setExportResult(null);
    try {
      const response = await fetch(draftUrl(), { cache: "no-store" });
      const payload = (await response.json()) as
        | DirectDraftResponse
        | { error?: string };
      if (!response.ok || !("ok" in payload) || !payload.ok) {
        throw new Error("Не удалось собрать рекламный черновик");
      }
      setDraft(payload);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Не удалось проверить рекламу",
      );
    } finally {
      setLoading(false);
    }
  };

  const loadMetrikaStatus = async () => {
    setMetrikaLoading(true);
    try {
      const response = await fetch("/api/admin/metrika/status", {
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Не удалось проверить Метрику");
      const payload = (await response.json()) as MetrikaStatus;
      setMetrikaStatus(payload);
      if (!setupCounterId && payload.selectedCounterId) {
        setSetupCounterId(String(payload.selectedCounterId));
      }
      if (payload.storedGoals && Object.keys(payload.storedGoals).length) {
        setSetupGoals((current) => ({ ...payload.storedGoals, ...current }));
      }
    } catch {
      setMetrikaStatus(null);
    } finally {
      setMetrikaLoading(false);
    }
  };

  useEffect(() => {
    loadDraft();
    loadMetrikaStatus();
  }, []);

  useEffect(() => {
    if (!draft) return;
    setSetupCounterId((draft.metrikaCounterIds?.[0] || "").toString());
    setSetupBusinessProfileId((draft.businessProfileId || "").toString());
    setSetupGoals(draft.metrikaGoals || {});
  }, [
    draft?.businessProfileId,
    draft?.metrikaCounterIds?.join(","),
    JSON.stringify(draft?.metrikaGoals || {}),
  ]);

  const copyText = async (key: CopyKey, text: string) => {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopyKey(key);
    window.setTimeout(() => setCopyKey(null), 1600);
  };

  const updateSetupGoal = (key: keyof DirectMetrikaGoals, value: string) => {
    setSetupGoals((current) => ({
      ...current,
      [key]: value.replace(/[^\d]/g, ""),
    }));
  };

  const saveReadinessSetup = async () => {
    const normalizedCounterId = setupCounterId.replace(/[^\d]/g, "");
    setReadinessSaving(true);
    try {
      const response = await fetch("/api/admin/direct/readiness", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metrikaCounterId: normalizedCounterId,
          businessProfileId: setupBusinessProfileId,
          goals: setupGoals,
        }),
      });
      if (!response.ok) {
        throw new Error("Не удалось сохранить настройки готовности");
      }
      toast({
        title: "ARAY сохранил готовность продвижения",
        description:
          "Счетчик, цели и организация обновлены. Пересобираю проверку Direct.",
      });
      setSetupCounterId(normalizedCounterId);
      await Promise.all([
        loadDraft({ preserveExportResult: true }),
        loadMetrikaStatus(),
      ]);
      return true;
    } catch (err) {
      toast({
        title: "Настройки не сохранены",
        description:
          err instanceof Error ? err.message : "Проверьте соединение и попробуйте еще раз.",
        variant: "destructive",
      });
      return false;
    } finally {
      setReadinessSaving(false);
    }
  };

  const createArayMetrikaGoals = async () => {
    const counterId = setupCounterId || metrikaStatus?.selectedCounterId || "";
    setMetrikaGoalsCreating(true);
    try {
      const response = await fetch("/api/admin/metrika/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ counterId }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        counterId?: number;
        counterName?: string;
        goals?: DirectMetrikaGoals;
        created?: string[];
        reused?: string[];
        error?: string;
      };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || "Не удалось создать цели Метрики");
      }
      if (payload.counterId) setSetupCounterId(String(payload.counterId));
      if (payload.goals) setSetupGoals(payload.goals);
      toast({
        title: "ARAY настроил цели Метрики",
        description: `Создано: ${payload.created?.length || 0}, найдено готовых: ${
          payload.reused?.length || 0
        }.`,
      });
      await Promise.all([
        loadDraft({ preserveExportResult: true }),
        loadMetrikaStatus(),
      ]);
    } catch (err) {
      toast({
        title: "Цели не созданы",
        description:
          err instanceof Error
            ? err.message
            : "Проверьте OAuth Метрики и номер счетчика.",
        variant: "destructive",
      });
    } finally {
      setMetrikaGoalsCreating(false);
    }
  };

  const askArayAboutMetrika = () => {
    const text = [
      "ARAY, помоги настроить Метрику для Direct как другу: коротко и по одному шагу.",
      `Сейчас: счетчик ${setupCounterId || metrikaLabel}; готовность ${readyCriticalCount}/${criticalReadiness.length}.`,
      "Если счетчик не сохранен: попроси открыть список счетчиков, найти сайт и вставить только цифры в поле на этой странице.",
      "Если OAuth Метрики подключен: предложи создать цели ARAY автоматически. Если OAuth нет: веди вручную к списку целей.",
      "Нужны цели: заказ или заявка, плюс телефон, мессенджер, корзина, checkout или вовлеченная сессия.",
      "В поля ID вставляются только цифры цели из Метрики, не название и не ссылка.",
      "Не пиши длинную справку. Дай один шаг и спроси: получилось?",
      "Пароль Яндекса не проси, бюджет не включай.",
    ].join("\n");

    window.dispatchEvent(new CustomEvent("aray:prompt", { detail: { text } }));
    toast({
      title: "ARAY подключился к настройке",
      description: "Я отправил в чат контекст по Метрике, целям и безопасному запуску.",
    });
  };

  const openMetrikaNavigator = () => {
    askArayAboutMetrika();
    window.open("https://metrika.yandex.ru/list", "_blank", "noopener,noreferrer");
  };

  const askArayAboutSeoIndexing = () => {
    const text = [
      "Помоги проверить SEO и индексацию сайта ПилоРус простыми шагами.",
      `Товаров в каталоге: ${draft?.draft.productsCount ?? "нет данных"}.`,
      "Проверь план: sitemap.xml, robots.txt, Яндекс Вебмастер, Google Search Console, Метрика, автоописания товаров, страницы категорий.",
      "Объясни, что Google Indexing API нельзя использовать для обычного каталога товаров, там нужен sitemap/Search Console.",
      "Дай спокойный список действий без выдуманных SEO-результатов.",
    ].join("\n");

    window.dispatchEvent(new CustomEvent("aray:prompt", { detail: { text } }));
  };

  const exportToDirect = async () => {
    setExporting(true);
    setExportError(null);
    setExportResult(null);
    try {
      const response = await fetch("/api/admin/direct/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirm: ownerConfirmed,
          options: generatorOptions(),
          parts: {
            ads: exportAds,
            keywords: exportKeywords,
            sitelinks: exportSitelinks,
          },
        }),
      });
      const payload = (await response.json()) as
        | DirectExportResponse
        | { error?: string };
      if (!response.ok || !("ok" in payload) || !payload.ok) {
        throw new Error(
          payload.error || "Не удалось выгрузить кампанию в Direct",
        );
      }
      const result = payload.export;
      if (
        (exportAds && result.adsCreated <= 0) ||
        (exportKeywords && result.keywordsCreated <= 0)
      ) {
        throw new Error(
          "Direct создал кампанию, но не вернул объявления или ключевые фразы. Проверьте ответ API перед повторной выгрузкой.",
        );
      }
      setExportResult(result);
      toast({
        title: "Черновик создан в Direct",
        description: `${result.groupsCreated} групп, ${result.adsCreated} объявлений, ${result.keywordsCreated} ключей. Нажмите "Открыть кампанию в Direct" в блоке результата.`,
        duration: 7000,
      });
      void loadDraft({ preserveExportResult: true });
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Не удалось выгрузить кампанию в Direct";
      setExportError(message);
      toast({
        title: "Direct не завершил выгрузку",
        description: message,
        variant: "destructive",
        duration: 9000,
      });
    } finally {
      setExporting(false);
    }
  };

  const startArayBuild = async () => {
    setWizardOpen(true);
    await loadDraft();
  };

  const directReady = draft?.direct.connected;
  const firstCampaign = draft?.direct.campaigns?.[0];
  const groups = draft?.draft.groups ?? [];
  const adsCount = groups.reduce((sum, group) => sum + group.ads.length, 0);
  const keywordCount = groups.reduce(
    (sum, group) => sum + group.keywords.length,
    0,
  );
  const imageCount = groups.reduce(
    (sum, group) => sum + (group.imageUrls?.length ?? 0),
    0,
  );
  const categoryOptions: DirectSelectionCategory[] = draft?.selection
    ?.categories?.length
    ? draft.selection.categories
    : Array.from(
        groups
          .reduce((map, group) => {
            const current = map.get(group.category) || {
              name: group.category,
              slug: null,
              productsCount: 0,
            };
            current.productsCount += group.productsCount;
            map.set(group.category, current);
            return map;
          }, new Map<string, DirectSelectionCategory>())
          .values(),
      );
  const productOptions: DirectSelectionProduct[] = draft?.selection?.products
    ?.length
    ? draft.selection.products
    : Array.from(
        groups
          .flatMap((group) =>
            (group.products || []).map((product) => ({
              id: product.id,
              name: product.name,
              slug: product.slug || null,
              category: product.category || group.category,
              categorySlug: null,
              price: product.price,
              inStock: true,
            })),
          )
          .reduce(
            (map, product) => map.set(product.id, product),
            new Map<string, DirectSelectionProduct>(),
          )
          .values(),
      );
  const selectedCategorySet = new Set(
    splitSelectionText(selectedCategoriesText).map(normalizeSelectionValue),
  );
  const selectedProductSet = new Set(
    splitSelectionText(selectedProductsText).map(normalizeSelectionValue),
  );
  const effectiveCategorySet = selectedCategorySet.size
    ? selectedCategorySet
    : new Set(
        categoryOptions.map((category) =>
          normalizeSelectionValue(category.name),
        ),
      );
  const effectiveProductSet = selectedProductSet.size
    ? selectedProductSet
    : new Set(
        productOptions.map((product) => normalizeSelectionValue(product.id)),
      );
  const selectedCategoryCount = categoryOptions.filter((category) =>
    effectiveCategorySet.has(normalizeSelectionValue(category.name)),
  ).length;
  const selectedProductCount = productOptions.filter((product) =>
    effectiveProductSet.has(normalizeSelectionValue(product.id)),
  ).length;
  const productGroupTarget =
    generatorMode === "product"
      ? Math.min(
          40,
          Math.max(
            1,
            selectedProductCount || productOptions.length || maxGroups,
          ),
        )
      : groups.length;
  const predictedGroupCount =
    generatorMode === "product"
      ? productGroupTarget
      : Math.min(
          maxGroups,
          Math.max(
            1,
            selectedCategoryCount || categoryOptions.length || groups.length,
          ),
        );
  const predictedAdsCount = predictedGroupCount * (exportAds ? maxAds : 0);
  const predictedKeywordCount =
    predictedGroupCount * (exportKeywords ? maxKeywords : 0);
  const excludedKeywordCount = splitSelectionText(excludedKeywordsText).length;
  const filteredProductOptions = productOptions
    .filter((product) => {
      const search = normalizeSelectionValue(productSearch);
      if (!search) return true;
      return [product.name, product.category, product.slug || ""].some(
        (value) => normalizeSelectionValue(value).includes(search),
      );
    })
    .slice(0, 80);
  const publicBaseUrl = draft?.publicBaseUrl;
  const publicBaseUrlReady = draft?.publicBaseUrlReady !== false;
  const publicBaseUrlLabel = publicBaseUrl || "домен бизнеса";
  const metrikaCounterIds = draft?.metrikaCounterIds ?? [];
  const metrikaGoals = draft?.metrikaGoals ?? {};
  const businessProfileId = draft?.businessProfileId ?? null;
  const coreGoalReady = Boolean(metrikaGoals.order || metrikaGoals.lead);
  const microGoalReady = Boolean(
    metrikaGoals.phone ||
      metrikaGoals.messenger ||
      metrikaGoals.cart ||
      metrikaGoals.checkout ||
      metrikaGoals.engaged,
  );
  const goalsReady = coreGoalReady && microGoalReady;
  const metrikaLabel = metrikaCounterIds.length
    ? `счетчик #${metrikaCounterIds.join(", #")}`
    : "счетчик не указан";
  const metrikaConnected = Boolean(metrikaStatus?.connected);
  const metrikaCounterOptions = metrikaStatus?.counters ?? [];
  const metrikaStatusText = metrikaLoading
    ? "проверяю Метрику"
    : metrikaConnected
      ? `подключена, счетчиков: ${metrikaCounterOptions.length}`
      : metrikaStatus?.configured
        ? "можно подключить через Яндекс OAuth"
        : "нужно настроить OAuth-приложение Метрики";
  const setupCounterIdDigits = setupCounterId.replace(/[^\d]/g, "");
  const counterReadyInForm = Boolean(setupCounterIdDigits);
  const counterReadyInDraft = metrikaCounterIds.length > 0;
  const counterStatusText = counterReadyInDraft
    ? `${metrikaLabel}, тег рендерится на сайте`
    : counterReadyInForm
      ? `счетчик ${setupCounterIdDigits} введен, нажмите сохранить`
      : "нужно указать номер счетчика";
  const launchReadinessItems = [
    {
      label: "Direct OAuth",
      text: directReady ? "кабинет отвечает" : "нужно войти через Яндекс",
      ok: directReady,
      critical: true,
    },
    {
      label: "Публичный домен",
      text: publicBaseUrlReady ? publicBaseUrlLabel : "localhost не выгружаем",
      ok: publicBaseUrlReady,
      critical: true,
    },
    {
      label: "Метрика на сайте",
      text: counterStatusText,
      ok: counterReadyInDraft,
      critical: true,
    },
    {
      label: "Цели Метрики",
      text: goalsReady
        ? "есть главная цель и микроцель"
        : "нужна заявка/заказ плюс телефон, мессенджер или checkout",
      ok: goalsReady,
      critical: true,
    },
    {
      label: "Мониторинг сайта",
      text: counterReadyInDraft
        ? "Direct включит мониторинг при выгрузке"
        : "станет доступен после счетчика",
      ok: counterReadyInDraft,
      critical: true,
    },
    {
      label: "Автотаргетинг",
      text: "строгий режим: только целевые запросы без брендов",
      ok: true,
      critical: true,
    },
    {
      label: "Организация",
      text: businessProfileId
        ? `Яндекс Бизнес #${businessProfileId}`
        : "можно добавить для контактов и карт",
      ok: Boolean(businessProfileId),
      critical: false,
    },
  ];
  const criticalReadiness = launchReadinessItems.filter((item) => item.critical);
  const readyCriticalCount = criticalReadiness.filter((item) => item.ok).length;
  const promotionReadyForLaunch =
    readyCriticalCount === criticalReadiness.length && Boolean(groups.length);
  const analyticsFlowSteps = [
    ["1", "Direct", "показы, клики, расходы и статусы из реального кабинета"],
    ["2", "UTM", "каждая ссылка помечает кампанию, группу и объявление"],
    [
      "3",
      "Метрика",
      metrikaCounterIds.length
        ? `${metrikaLabel}: визиты, цели и поведение`
        : "добавим счетчик и цели для конверсий",
    ],
    ["4", "Заказы", "оформленные заказы сохраняют источник в админке"],
  ];
  const checklist = draft?.draft.checklist ?? [
    "Проверить регион и доставку.",
    "Проверить цены и наличие в каталоге.",
    "Проверить минус-слова.",
    "Проверить цели Метрики.",
    "Запускать бюджет только после подтверждения владельца.",
  ];
  const exportDisabled =
    loading ||
    exporting ||
    !directReady ||
    !publicBaseUrlReady ||
    !ownerConfirmed ||
    !groups.length;
  const directStatusLabel = directReady
    ? "Direct подключен"
    : draft?.direct.mode === "oauth-app"
      ? "Нужно войти через Яндекс"
      : draft?.direct.mode === "oauth-token"
        ? "Проверьте кабинет Direct"
        : "Нужен OAuth Direct";
  const directHelpText = directReady
    ? "ARAY получил доступ к Direct API и может выгрузить подготовленный черновик."
    : draft?.direct.mode === "oauth-app"
      ? "Если кабинета Direct еще нет, сначала откройте Direct и создайте кабинет, потом вернитесь и войдите здесь."
      : draft?.direct.mode === "oauth-token"
        ? draft.direct.error ||
          "Яндекс принял вход, но кабинет Direct не ответил. Часто нужно создать или активировать кабинет."
        : "Нужно добавить OAuth-приложение Яндекса, чтобы клиенты могли входить без передачи пароля.";
  const exportPartControls = [
    {
      label: "Кампания и группы",
      checked: true,
      disabled: true,
      onChange: undefined,
    },
    {
      label: "Объявления",
      checked: exportAds,
      disabled: false,
      onChange: setExportAds,
    },
    {
      label: "Ключевые фразы",
      checked: exportKeywords,
      disabled: false,
      onChange: setExportKeywords,
    },
    {
      label: "Быстрые ссылки",
      checked: exportSitelinks,
      disabled: false,
      onChange: setExportSitelinks,
    },
  ];
  const ownerFlowSteps = [
    ["1", "Проверить сайт", "фид, цены, наличие, ссылки"],
    ["2", "Собрать РК", "группы, объявления, ключи"],
    ["3", "Войти в Direct", "через Яндекс OAuth, без пароля"],
    ["4", "Выгрузить", "черновик без автозапуска денег"],
  ];
  const arayBudgetGuards = [
    "не запускает бюджет без подтверждения владельца",
    "не смешивает поиск, сети и медийку без проверки",
    "не берет товары без цены или наличия по умолчанию",
    "не показывает выдуманные клики, расходы и заявки",
  ];
  const addExcludedKeyword = (keyword: string) => {
    const clean = keyword.replace(/\s+/g, " ").trim();
    if (!clean) return;
    const next = Array.from(
      new Set([...splitSelectionText(excludedKeywordsText), clean]),
    );
    setExcludedKeywordsText(next.join("\n"));
  };
  const setDirectGroupingMode = (mode: DirectGeneratorMode) => {
    setGeneratorMode(mode);
    if (mode === "product") {
      setMaxGroups(
        Math.min(
          40,
          Math.max(
            1,
            selectedProductCount || productOptions.length || maxGroups,
          ),
        ),
      );
    }
  };
  const toggleCategorySelection = (name: string) => {
    const allNames = categoryOptions.map((category) => category.name);
    const next = new Set(effectiveCategorySet);
    const key = normalizeSelectionValue(name);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    if (!next.size) return;
    setSelectedCategoriesText(
      allNames
        .filter((item) => next.has(normalizeSelectionValue(item)))
        .join(", "),
    );
  };
  const toggleProductSelection = (id: string) => {
    const next = new Set(effectiveProductSet);
    const key = normalizeSelectionValue(id);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    if (!next.size) return;
    setSelectedProductsText(
      productOptions
        .filter((product) => next.has(normalizeSelectionValue(product.id)))
        .map((product) => product.id)
        .join(", "),
    );
    if (generatorMode === "product") {
      setMaxGroups(Math.min(40, Math.max(1, next.size)));
    }
  };
  const resetSelection = () => {
    setSelectedCategoriesText("");
    setSelectedProductsText("");
    setProductSearch("");
    window.setTimeout(() => void loadDraft(), 0);
  };
  const applySelection = async () => {
    await loadDraft();
    setSelectionOpen(false);
  };

  return (
    <section>
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-muted-foreground" />
            Рекламный помощник ARAY
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Один спокойный маршрут: собрать черновик из каталога, проверить и
            выгрузить в Direct без запуска бюджета.
          </p>
        </div>
      </div>

      <div className="hidden mb-3 grid gap-3 md:grid-cols-3">
        {ADS_CHANNELS.map((channel) => (
          <div
            key={channel.name}
            className="rounded-2xl border border-border bg-card p-4"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <channel.icon className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-sm font-semibold">{channel.name}</div>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {channel.status}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {channel.description}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {!wizardOpen ? (
        <div className="mb-3 overflow-hidden rounded-2xl border border-border bg-card">
          <div className="grid gap-0 xl:grid-cols-[minmax(0,1.25fr)_minmax(22rem,0.75fr)]">
            <div className="p-4 md:p-5">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
                <Bot className="h-4 w-4 text-primary" />
                ARAY Ads
              </div>
              <h3 className="mt-2 max-w-2xl text-xl font-semibold leading-tight md:text-2xl">
                Безопасная реклама из текущего каталога
              </h3>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
                Сначала ARAY проверяет сайт, фид, цены, наличие и посадочные
                страницы. Потом собирает черновик Direct, объясняет риски и
                выгружает только после подтверждения.
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={startArayBuild}
                  disabled={loading}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Zap className="h-4 w-4" />
                  )}
                  Собрать РК с ARAY
                </button>
                <a
                  href="/api/yml"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold hover:bg-primary/[0.08]"
                >
                  <ExternalLink className="h-4 w-4" />
                  Открыть YML фид
                </a>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-2 min-[520px]:grid-cols-2 xl:grid-cols-4">
                {ownerFlowSteps.map(([num, title, text]) => (
                  <div
                    key={num}
                    className="rounded-xl border border-border bg-background/60 p-3"
                  >
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-primary">
                      Шаг {num}
                    </div>
                    <div className="mt-1 text-sm font-semibold">{title}</div>
                    <div className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {text}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-border bg-background/50 p-4 md:p-5 xl:border-l xl:border-t-0">
              <div className="text-sm font-semibold">Что ARAY делает сам</div>
              <div className="mt-3 space-y-2">
                {[
                  "берет весь каталог без ручного выбора товаров",
                  "отсекает позиции без цены и наличия",
                  "собирает группы, объявления, ключи и быстрые ссылки",
                  "не запускает бюджет без подтверждения владельца",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex gap-2 text-xs leading-relaxed text-muted-foreground"
                  >
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-xl border border-border bg-card p-3">
                <div className="text-xs font-semibold text-muted-foreground">
                  Direct подключение
                </div>
                <div className="mt-1 text-sm font-semibold">
                  {directStatusLabel}
                </div>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Вход идет через Яндекс. Пароль не просим и не храним.
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {directHelpText}
                </p>
                <div className="mt-3 rounded-lg border border-border bg-background/60 p-2.5">
                  <div className="text-[11px] font-semibold uppercase text-muted-foreground">
                    Сайт для Direct
                  </div>
                  <div className="mt-1 truncate text-xs font-semibold text-foreground">
                    {publicBaseUrlLabel}
                  </div>
                  {!publicBaseUrlReady ? (
                    <p className="mt-1 text-[11px] leading-relaxed text-amber-600">
                      Для выгрузки нужен публичный домен бизнеса. localhost в
                      Direct не отправляем.
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {wizardOpen ? (
        <div className="mb-3 rounded-2xl border border-border bg-card p-4 md:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-base font-semibold">
                <Target className="h-4 w-4 text-primary" />
                Мастер запуска Direct
              </div>
              <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
                На первом экране только главное. Тонкие настройки спрятаны ниже,
                чтобы не мешали владельцу.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void loadDraft()}
                disabled={loading}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-semibold hover:bg-primary/[0.08] disabled:opacity-60"
              >
                {loading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                Пересобрать
              </button>
              {!directReady ? (
                <a
                  href="/api/admin/direct/oauth/start"
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Войти в Direct
                </a>
              ) : null}
            </div>
          </div>

          <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1.1fr)_minmax(22rem,0.9fr)]">
            <div className="rounded-2xl border border-primary/30 bg-primary/[0.06] p-4 md:p-5">
              <div className="text-xs font-semibold uppercase tracking-wide text-primary">
                Что делать сейчас
              </div>
              <h3 className="mt-1 text-xl font-semibold leading-tight">
                Проверить пакет и выгрузить черновик
              </h3>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
                ARAY уже собрал структуру из каталога. Посмотри цифры, подтверди
                безопасную выгрузку и отправь в Direct. Бюджет не включится сам.
              </p>

              <div className="mt-4 grid grid-cols-1 gap-3 min-[520px]:grid-cols-2 xl:grid-cols-4">
                {[
                  {
                    label: "Группы",
                    value: predictedGroupCount,
                    mode: "groups" as const,
                  },
                  {
                    label: "Объявления",
                    value: predictedAdsCount,
                    mode: "ads" as const,
                  },
                  {
                    label: "Ключи",
                    value: predictedKeywordCount,
                    mode: "keywords" as const,
                  },
                  {
                    label: "Минус-слова",
                    value: draft?.draft.negativeWords.length ?? 0,
                    mode: "negative" as const,
                  },
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => setPreviewOpen(item.mode)}
                    className="rounded-xl border border-border bg-card p-3 text-left transition-colors hover:border-primary/50 hover:bg-primary/[0.06]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-2xl font-bold font-display">
                          {item.value}
                        </div>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          {item.label}
                        </div>
                      </div>
                      <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  </button>
                ))}
              </div>

              <div className="mt-4 min-w-0 overflow-hidden rounded-xl border border-border bg-card p-3">
                <div className="flex min-w-0 flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold">Состав выгрузки</div>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      По умолчанию ARAY берет весь подходящий каталог. Можно
                      оставить только нужные категории или товары.
                    </p>
                    <div className="mt-2 flex max-w-full flex-wrap gap-1.5 text-[11px] text-muted-foreground">
                      <span className="max-w-full rounded-full bg-muted px-2 py-1">
                        {selectedCategoryCount} категорий
                      </span>
                      <span className="max-w-full rounded-full bg-muted px-2 py-1">
                        {selectedProductCount} товаров
                      </span>
                      <span className="max-w-full rounded-full bg-muted px-2 py-1">
                        {generatorMode === "product"
                          ? `${productGroupTarget} товарных групп`
                          : "группы по категориям"}
                      </span>
                      <span className="max-w-full rounded-full bg-muted px-2 py-1">
                        запросы видны до выгрузки
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectionOpen((value) => !value)}
                    className="inline-flex min-h-10 w-full shrink-0 items-center justify-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-semibold hover:bg-primary/[0.08] md:w-auto"
                  >
                    {selectionOpen ? (
                      <ChevronUp className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5" />
                    )}
                    Настроить состав
                  </button>
                </div>
              </div>

              {selectionOpen ? (
                <div className="mt-3 min-w-0 overflow-hidden rounded-xl border border-border bg-card p-3">
                  <div className="mb-3 grid grid-cols-1 gap-2 min-[520px]:grid-cols-2 xl:grid-cols-4">
                    {[
                      ["Останется товаров", selectedProductCount],
                      ["Будет групп", predictedGroupCount],
                      ["Будет объявл.", predictedAdsCount],
                      ["Будет ключей", predictedKeywordCount],
                    ].map(([label, value]) => (
                      <div
                        key={label}
                        className="rounded-xl border border-border bg-background/60 p-3"
                      >
                        <div className="text-xl font-bold font-display">
                          {value}
                        </div>
                        <div className="mt-0.5 text-[11px] text-muted-foreground">
                          {label}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mb-3 grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                    <button
                      type="button"
                      onClick={() => setDirectGroupingMode("category")}
                      className={`rounded-xl border p-3 text-left transition-colors ${
                        generatorMode === "category"
                          ? "border-primary/60 bg-primary/10"
                          : "border-border bg-background/60 hover:bg-primary/[0.06]"
                      }`}
                    >
                      <div className="text-sm font-semibold">По категориям</div>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        Спокойный старт: 4-8 групп, 1-2 сильных объявления на
                        группу.
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDirectGroupingMode("product")}
                      className={`rounded-xl border p-3 text-left transition-colors ${
                        generatorMode === "product"
                          ? "border-primary/60 bg-primary/10"
                          : "border-border bg-background/60 hover:bg-primary/[0.06]"
                      }`}
                    >
                      <div className="text-sm font-semibold">По товарам</div>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        Точный запуск: выбранные товары становятся группами и
                        объявлениями.
                      </p>
                    </button>
                  </div>
                  <div className="grid min-w-0 gap-3 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
                    <div className="min-w-0 rounded-xl border border-border bg-background/60 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Категории
                        </div>
                        <button
                          type="button"
                          onClick={resetSelection}
                          className="text-xs font-semibold text-primary hover:underline"
                        >
                          Сбросить
                        </button>
                      </div>
                      <div className="mt-3 max-h-56 space-y-2 overflow-auto pr-1 sm:max-h-64">
                        {categoryOptions.map((category) => {
                          const checked = effectiveCategorySet.has(
                            normalizeSelectionValue(category.name),
                          );
                          const group = groups.find(
                            (item) =>
                              normalizeSelectionValue(item.category) ===
                              normalizeSelectionValue(category.name),
                          );
                          return (
                            <label
                              key={category.name}
                              className="flex min-w-0 cursor-pointer items-start gap-2 rounded-lg border border-border bg-card p-2 text-xs hover:bg-primary/[0.06]"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() =>
                                  toggleCategorySelection(category.name)
                                }
                                className="mt-0.5 h-4 w-4 rounded border-border accent-primary"
                              />
                              <span className="min-w-0 flex-1">
                                <span className="block truncate font-semibold text-foreground">
                                  {category.name}
                                </span>
                                <span className="text-muted-foreground">
                                  {category.productsCount} товаров
                                </span>
                                {group?.keywords?.length ? (
                                  <span className="mt-1 block truncate text-muted-foreground">
                                    {group.keywords.slice(0, 3).join(", ")}
                                  </span>
                                ) : null}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    <div className="min-w-0 rounded-xl border border-border bg-background/60 p-3">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Товары
                        </div>
                        <label className="relative block w-full sm:w-72">
                          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                          <input
                            value={productSearch}
                            onChange={(event) =>
                              setProductSearch(event.target.value)
                            }
                            placeholder="Найти товар"
                            className="h-9 w-full rounded-xl border border-border bg-card pl-9 pr-3 text-xs outline-none focus:border-primary"
                          />
                        </label>
                      </div>
                      <div className="mt-3 max-h-64 space-y-2 overflow-auto pr-1 sm:max-h-72">
                        {filteredProductOptions.length ? (
                          filteredProductOptions.map((product) => {
                            const checked = effectiveProductSet.has(
                              normalizeSelectionValue(product.id),
                            );
                            return (
                              <label
                                key={product.id}
                                className="flex min-w-0 cursor-pointer items-start gap-2 rounded-lg border border-border bg-card p-2.5 text-xs hover:bg-primary/[0.06] sm:p-2"
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() =>
                                    toggleProductSelection(product.id)
                                  }
                                  className="mt-0.5 h-4 w-4 rounded border-border accent-primary"
                                />
                                <span className="min-w-0 flex-1">
                                  <span className="block break-words font-semibold text-foreground">
                                    {product.name}
                                  </span>
                                  <span className="mt-0.5 block break-words text-muted-foreground">
                                    {product.category} ·{" "}
                                    {formatProductPrice(product.price)} ·{" "}
                                    {product.inStock
                                      ? "в наличии"
                                      : "нет наличия"}
                                  </span>
                                </span>
                              </label>
                            );
                          })
                        ) : (
                          <div className="rounded-lg border border-border bg-card p-3 text-xs text-muted-foreground">
                            Товары не найдены. Очисти поиск или пересобери
                            пакет.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 rounded-xl border border-border bg-background/60 p-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Запросы, которые пойдут в Direct
                    </div>
                    <div className="mt-2 grid gap-2 md:grid-cols-2">
                      {groups.slice(0, 6).map((group) => (
                        <div
                          key={group.name}
                          className="rounded-lg border border-border bg-card p-2 text-xs"
                        >
                          <div className="font-semibold text-foreground">
                            {group.name}
                          </div>
                          <div className="mt-1 flex max-w-full flex-wrap gap-1.5">
                            {group.keywords.slice(0, 5).map((keyword) => (
                              <span
                                key={keyword}
                                className="max-w-full break-words rounded-full bg-muted px-2 py-0.5 text-muted-foreground"
                              >
                                {keyword}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-3 flex flex-col gap-2 min-[420px]:flex-row min-[420px]:flex-wrap">
                    <button
                      type="button"
                      onClick={applySelection}
                      disabled={loading}
                      className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 min-[420px]:w-auto"
                    >
                      {loading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      )}
                      Применить состав
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectionOpen(false)}
                      className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-semibold hover:bg-primary/[0.08] min-[420px]:w-auto"
                    >
                      Закрыть
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="mt-4 rounded-xl border border-border bg-card p-3">
                <label className="flex items-start gap-3 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={ownerConfirmed}
                    onChange={(event) =>
                      setOwnerConfirmed(event.target.checked)
                    }
                    className="mt-0.5 h-4 w-4 rounded border-border accent-primary"
                  />
                  <span>
                    <span className="block font-semibold text-foreground">
                      Подтверждаю безопасную выгрузку
                    </span>
                    Создать черновик в моем кабинете Direct. Бюджет и показы не
                    запускать автоматически.
                  </span>
                </label>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void loadDraft()}
                  disabled={loading}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold hover:bg-primary/[0.08] disabled:opacity-60"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Проверить заново
                </button>
                {!directReady ? (
                  <a
                    href="/api/admin/direct/oauth/start"
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Войти в Direct
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={exportToDirect}
                    disabled={exportDisabled}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                  >
                    {exporting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <UploadCloud className="h-4 w-4" />
                    )}
                    Выгрузить в Direct
                  </button>
                )}
              </div>

              <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)]">
                <div className="rounded-xl border border-border bg-card p-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Что будет создано
                  </div>
                  <div className="mt-3 grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
                    {[
                      [
                        "Кампания",
                        draft?.draft.campaignName || "Direct черновик",
                      ],
                      [
                        "Режим",
                        generatorMode === "product"
                          ? "товарные группы"
                          : "группы категорий",
                      ],
                      ["Фид", draft?.draft.feed || "каталог сайта"],
                      ["Сайт", publicBaseUrlLabel],
                    ].map(([label, value]) => (
                      <div
                        key={label}
                        className="rounded-lg border border-border bg-background/60 p-2"
                      >
                        <div className="text-[11px] text-muted-foreground">
                          {label}
                        </div>
                        <div className="mt-0.5 line-clamp-2 text-xs font-semibold text-foreground">
                          {value}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 grid grid-cols-1 gap-2 min-[420px]:grid-cols-3">
                    <button
                      type="button"
                      onClick={() => setPreviewOpen("groups")}
                      className="min-h-9 rounded-lg border border-border px-2 text-xs font-semibold hover:bg-primary/[0.08]"
                    >
                      Группы
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewOpen("ads")}
                      className="min-h-9 rounded-lg border border-border px-2 text-xs font-semibold hover:bg-primary/[0.08]"
                    >
                      Объявления
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewOpen("keywords")}
                      className="min-h-9 rounded-lg border border-border px-2 text-xs font-semibold hover:bg-primary/[0.08]"
                    >
                      Ключи
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-card p-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Пример объявления
                  </div>
                  {groups[0]?.ads[0] ? (
                    <div className="mt-3 rounded-lg border border-border bg-background/60 p-3 text-xs leading-relaxed">
                      <div className="font-semibold text-foreground">
                        {groups[0].ads[0].title1}
                      </div>
                      <div className="text-primary">
                        {groups[0].ads[0].title2}
                      </div>
                      <div className="mt-1 text-muted-foreground">
                        {groups[0].ads[0].text}
                      </div>
                      <div className="mt-2 break-all text-[11px] text-muted-foreground">
                        {groups[0].ads[0].href}
                      </div>
                    </div>
                  ) : (
                    <p className="mt-3 text-xs text-muted-foreground">
                      После проверки ARAY покажет пример объявления из каталога.
                    </p>
                  )}
                </div>

                <div className="rounded-xl border border-border bg-card p-3 lg:col-span-2">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Маршрут после выгрузки
                    </div>
                    <a
                      href="/admin/analytics"
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      Аналитика
                    </a>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-4">
                    {[
                      [
                        "1",
                        "Черновик",
                        "ARAY создаст РК, группы, объявления и UTM.",
                      ],
                      [
                        "2",
                        "Проверка",
                        "В Direct проверяем ссылки, ставки, тексты и бюджет.",
                      ],
                      [
                        "3",
                        "Запуск",
                        "Показы включаются вручную только после подтверждения.",
                      ],
                      [
                        "4",
                        "Результат",
                        "Клики из Direct, визиты из Метрики, заказы из CRM.",
                      ],
                    ].map(([step, title, text]) => (
                      <div
                        key={step}
                        className="rounded-lg border border-border bg-background/60 p-2.5"
                      >
                        <div className="flex items-center gap-2">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                            {step}
                          </span>
                          <span className="text-xs font-semibold text-foreground">
                            {title}
                          </span>
                        </div>
                        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                          {text}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-background/60 p-4">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <div>
                  <div className="text-sm font-semibold">
                    Безопасность перед запуском
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    ARAY не просит пароль Яндекса. Вход идет через окно Яндекса,
                    а выгрузка создает только подготовленную структуру.
                  </p>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                {arayBudgetGuards.map((guard) => (
                  <div
                    key={guard}
                    className="flex gap-2 text-xs leading-relaxed text-muted-foreground"
                  >
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                    <span>{guard}</span>
                  </div>
                ))}
              </div>
              <div className="mt-5 rounded-xl border border-border bg-card p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Готовность продвижения
                    </div>
                    <div className="mt-1 text-sm font-semibold">
                      {promotionReadyForLaunch
                        ? "Можно проверять и запускать вручную"
                        : `Готово ${readyCriticalCount}/${criticalReadiness.length}`}
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                      promotionReadyForLaunch
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                        : "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                    }`}
                  >
                    {promotionReadyForLaunch ? "готово" : "донастроить"}
                  </span>
                </div>
                <div className="mt-3 space-y-2">
                  {launchReadinessItems.map((item) => (
                    <div
                      key={item.label}
                      className="flex gap-2 text-xs leading-relaxed text-muted-foreground"
                    >
                      <CheckCircle2
                        className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${
                          item.ok ? "text-emerald-600" : "text-amber-600"
                        }`}
                      />
                      <span>
                        <span className="font-semibold text-foreground">
                          {item.label}:
                        </span>{" "}
                        {item.text}
                      </span>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setReadinessOpen(true)}
                  className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-semibold hover:bg-primary/[0.08]"
                >
                  <BarChart2 className="h-3.5 w-3.5" />
                  Настроить с ARAY
                </button>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <div className="rounded-xl border border-border bg-card p-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Режим выгрузки
                  </div>
                  <div className="mt-2 grid grid-cols-2 rounded-xl border border-border bg-background/60 p-1">
                    {(["category", "product"] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setDirectGroupingMode(mode)}
                        className={`min-h-9 rounded-lg px-2 text-xs font-semibold transition-colors ${
                          generatorMode === mode
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:bg-primary/[0.08]"
                        }`}
                      >
                        {mode === "category" ? "Категории" : "Товары"}
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    {generatorMode === "product"
                      ? `Будет до ${productGroupTarget} товарных групп. Отключай лишние товары галочками слева.`
                      : "ARAY соберет компактные группы по категориям: это безопаснее для первого запуска."}
                  </p>
                </div>

                <div className="rounded-xl border border-border bg-card p-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Прогноз выгрузки
                  </div>
                  <div className="mt-3 grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
                    {[
                      ["Товары", selectedProductCount],
                      ["Группы", predictedGroupCount],
                      ["Объявления", predictedAdsCount],
                      ["Ключи", predictedKeywordCount],
                    ].map(([label, value]) => (
                      <div
                        key={label}
                        className="rounded-lg border border-border bg-background/60 p-2"
                      >
                        <div className="text-lg font-bold font-display text-foreground">
                          {value}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {label}
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    {generatorMode === "product"
                      ? "В товарном режиме выбранные товары становятся отдельными группами. Снял галочку — прогноз сразу меняется."
                      : "В режиме категорий ARAY собирает компактные группы и не дробит весь каталог без необходимости."}
                  </p>
                  {excludedKeywordCount ? (
                    <p className="mt-2 text-xs font-medium text-primary">
                      {excludedKeywordCount} фраз уже добавлены в исключения.
                    </p>
                  ) : null}
                </div>

                <div className="rounded-xl border border-border bg-card p-3 sm:col-span-2 xl:col-span-1">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Что проверять
                  </div>
                  <div className="mt-2 grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
                    {(
                      [
                        ["Группы", "groups"],
                        ["Объявления", "ads"],
                        ["Ключи", "keywords"],
                        ["Минус-слова", "negative"],
                      ] satisfies Array<[string, DirectPreviewMode]>
                    ).map(([label, mode]) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => setPreviewOpen(mode)}
                        className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-border px-2 text-xs font-semibold hover:bg-primary/[0.08]"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-card p-3 sm:col-span-2 xl:col-span-1">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    FAQ перед запуском
                  </div>
                  <div className="mt-3 divide-y divide-border rounded-xl border border-border bg-background/60">
                    <details className="group p-3">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold">
                        Если у клиента еще нет Direct
                        <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
                      </summary>
                      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                        Сначала клиент открывает Direct и создает кабинет
                        Яндекса. Потом возвращается в ARAY, нажимает вход через
                        Яндекс, и ARAY получает OAuth-доступ без пароля.
                      </p>
                      <a
                        href="https://direct.yandex.ru"
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex min-h-9 items-center justify-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-semibold hover:bg-primary/[0.08]"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Открыть Direct
                      </a>
                    </details>
                    <details className="group p-3">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold">
                        Что будет после выгрузки
                        <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
                      </summary>
                      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                        В Direct появится черновик кампании: группы, объявления,
                        ключи, быстрые ссылки и UTM. Бюджет и показы не
                        включаются автоматически, запуск только после проверки в
                        кабинете.
                      </p>
                    </details>
                    <details className="group p-3">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold">
                        Где смотреть результат и аналитику
                        <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
                      </summary>
                      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                        После запуска ARAY связывает Direct, UTM, Метрику и
                        заказы. Расходы и клики берем из Direct, визиты и цели
                        из Метрики, заявки и продажи из админки.
                      </p>
                      <a
                        href="/admin/analytics"
                        className="mt-2 inline-flex text-xs font-semibold text-primary hover:underline"
                      >
                        Открыть аналитику
                      </a>
                    </details>
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-card p-3 sm:col-span-2 xl:col-span-1">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Direct Pro
                    </div>
                    <button
                      type="button"
                      onClick={() => setDirectProOpen(true)}
                      className="text-[11px] font-semibold text-primary hover:underline"
                    >
                      все настройки
                    </button>
                  </div>
                  <div className="mt-3 grid gap-2">
                    <div className="grid grid-cols-3 rounded-xl border border-border bg-background/60 p-1">
                      {(["search", "network", "both"] as const).map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => setPlacement(item)}
                          className={`min-h-9 rounded-lg px-2 text-xs font-semibold transition-colors ${
                            placement === item
                              ? "bg-primary text-primary-foreground"
                              : "text-muted-foreground hover:bg-primary/[0.08]"
                          }`}
                        >
                          {placementLabel(item)}
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-3 rounded-xl border border-border bg-background/60 p-1">
                      {(["search", "mixed", "retargeting"] as const).map(
                        (mode) => (
                          <button
                            key={mode}
                            type="button"
                            onClick={() => setAudienceMode(mode)}
                            className={`min-h-9 rounded-lg px-2 text-xs font-semibold transition-colors ${
                              audienceMode === mode
                                ? "bg-primary text-primary-foreground"
                                : "text-muted-foreground hover:bg-primary/[0.08]"
                            }`}
                          >
                            {mode === "search"
                              ? "Поиск"
                              : mode === "mixed"
                                ? "Микс"
                                : "Ретарг."}
                          </button>
                        ),
                      )}
                    </div>
                    <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
                      <label className="block">
                        <span className="text-[11px] text-muted-foreground">
                          Бюджет, ₽/день
                        </span>
                        <input
                          type="number"
                          min={300}
                          max={100000}
                          step={100}
                          value={dailyBudget}
                          onChange={(event) =>
                            setDailyBudget(
                              clampControlNumber(
                                event.target.value,
                                300,
                                100000,
                                700,
                              ),
                            )
                          }
                          className="mt-1 h-9 w-full rounded-xl border border-border bg-background/60 px-3 text-sm font-semibold outline-none focus:border-primary"
                        />
                      </label>
                      <label className="block">
                        <span className="text-[11px] text-muted-foreground">
                          Группы
                        </span>
                        <input
                          type="number"
                          min={1}
                          max={40}
                          value={maxGroups}
                          onChange={(event) =>
                            setMaxGroups(
                              clampControlNumber(event.target.value, 1, 40, 8),
                            )
                          }
                          className="mt-1 h-9 w-full rounded-xl border border-border bg-background/60 px-3 text-sm font-semibold outline-none focus:border-primary"
                        />
                      </label>
                      <label className="block">
                        <span className="text-[11px] text-muted-foreground">
                          Ключи
                        </span>
                        <input
                          type="number"
                          min={3}
                          max={30}
                          value={maxKeywords}
                          onChange={(event) =>
                            setMaxKeywords(
                              clampControlNumber(event.target.value, 3, 30, 12),
                            )
                          }
                          className="mt-1 h-9 w-full rounded-xl border border-border bg-background/60 px-3 text-sm font-semibold outline-none focus:border-primary"
                        />
                      </label>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
                      <button
                        type="button"
                        onClick={() =>
                          setSchedule(
                            schedule === "business_hours"
                              ? "all_day"
                              : "business_hours",
                          )
                        }
                        className="min-h-10 rounded-xl border border-border px-3 text-xs font-semibold hover:bg-primary/[0.08]"
                      >
                        {schedule === "all_day" ? "24/7" : "Рабочее"}
                      </button>
                      <label className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border px-3 text-xs font-semibold">
                        <input
                          type="checkbox"
                          checked={includeImages}
                          onChange={(event) =>
                            setIncludeImages(event.target.checked)
                          }
                          className="h-4 w-4 rounded border-border accent-primary"
                        />
                        Фото
                      </label>
                      <button
                        type="button"
                        onClick={() => void loadDraft()}
                        disabled={loading}
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-border px-3 text-xs font-semibold hover:bg-primary/[0.08] disabled:opacity-60"
                      >
                        {loading ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="h-3.5 w-3.5" />
                        )}
                        Обновить
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setDirectProOpen(true)}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold hover:bg-primary/[0.08]"
            >
              <Target className="h-3.5 w-3.5" />
              Расширенные настройки Direct
            </button>
            <button
              type="button"
              onClick={() => setSelectionOpen((value) => !value)}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold hover:bg-primary/[0.08]"
            >
              <ShoppingBag className="h-3.5 w-3.5" />
              Состав выгрузки
            </button>
          </div>

          <details className="hidden mt-3 rounded-2xl border border-border bg-background/60 p-3">
            <summary className="cursor-pointer text-xs font-semibold text-muted-foreground">
              Настройки пакета, можно не трогать
            </summary>
            <div className="mt-4 grid gap-3 xl:grid-cols-4">
              <div className="rounded-2xl border border-border bg-background/60 p-3">
                <div className="text-xs font-semibold text-muted-foreground">
                  1. Цель и бюджет
                </div>
                <div className="mt-3 grid grid-cols-3 rounded-xl border border-border bg-card p-1">
                  {(["text", "product", "media"] as const).map((kind) => (
                    <button
                      key={kind}
                      type="button"
                      onClick={() => setCampaignKind(kind)}
                      className={`min-h-9 rounded-lg px-2 text-xs font-semibold transition-colors ${
                        campaignKind === kind
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-primary/[0.08]"
                      }`}
                    >
                      {campaignKindLabel(kind)}
                    </button>
                  ))}
                </div>
                <div className="mt-2 grid grid-cols-3 rounded-xl border border-border bg-card p-1">
                  {(["search", "network", "both"] as const).map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setPlacement(item)}
                      className={`min-h-9 rounded-lg px-2 text-xs font-semibold transition-colors ${
                        placement === item
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-primary/[0.08]"
                      }`}
                    >
                      {placementLabel(item)}
                    </button>
                  ))}
                </div>
                <label className="mt-3 block">
                  <span className="text-xs text-muted-foreground">
                    Бюджет теста, ₽/день
                  </span>
                  <input
                    type="number"
                    min={300}
                    max={100000}
                    step={100}
                    value={dailyBudget}
                    onChange={(event) =>
                      setDailyBudget(
                        clampControlNumber(
                          event.target.value,
                          300,
                          100000,
                          700,
                        ),
                      )
                    }
                    className="mt-1 h-9 w-full rounded-xl border border-border bg-card px-3 text-sm font-semibold outline-none focus:border-primary"
                  />
                </label>
              </div>

              <div className="rounded-2xl border border-border bg-background/60 p-3">
                <div className="text-xs font-semibold text-muted-foreground">
                  2. Фид сайта
                </div>
                <div className="mt-3 rounded-xl border border-border bg-card p-3">
                  <div className="text-sm font-semibold">
                    Авто: весь каталог
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    ARAY сам разобьет товары по категориям и соберет группы.
                    Ручной выбор товара или категории не нужен.
                  </p>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {[
                    feedOnlyInStock ? "только в наличии" : "включая под заказ",
                    feedOnlyWithPrice ? "только с ценой" : "без фильтра цены",
                    generatorMode === "product"
                      ? "группы по товарам"
                      : "группы по категориям",
                  ].map((item) => (
                    <span
                      key={item}
                      className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-background/60 p-3">
                <div className="text-xs font-semibold text-muted-foreground">
                  3. Объявления ARAY
                </div>
                <label className="mt-3 block">
                  <span className="text-xs text-muted-foreground">
                    Промо или оффер
                  </span>
                  <input
                    value={promoText}
                    onChange={(event) => setPromoText(event.target.value)}
                    placeholder="например: доставка сегодня"
                    maxLength={48}
                    className="mt-1 h-9 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary"
                  />
                </label>
                <label className="mt-3 block">
                  <span className="text-xs text-muted-foreground">
                    Быстрые ссылки
                  </span>
                  <textarea
                    value={quickLinksText}
                    onChange={(event) => setQuickLinksText(event.target.value)}
                    rows={4}
                    placeholder="Название|/page|Описание"
                    className="mt-1 min-h-24 w-full resize-none rounded-xl border border-border bg-card px-3 py-2 text-xs outline-none focus:border-primary"
                  />
                </label>
              </div>

              <div className="rounded-2xl border border-border bg-background/60 p-3">
                <div className="text-xs font-semibold text-muted-foreground">
                  4. Безопасная выгрузка
                </div>
                <div className="mt-3 space-y-2">
                  {exportPartControls.map((control) => (
                    <label
                      key={control.label}
                      className="flex items-center gap-2 text-xs text-muted-foreground"
                    >
                      <input
                        type="checkbox"
                        checked={control.checked}
                        disabled={control.disabled}
                        onChange={(event) => {
                          control.onChange?.(event.target.checked);
                        }}
                        className="h-4 w-4 rounded border-border accent-primary disabled:opacity-60"
                      />
                      {control.label}
                    </label>
                  ))}
                </div>
                <label className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={ownerConfirmed}
                    onChange={(event) =>
                      setOwnerConfirmed(event.target.checked)
                    }
                    className="mt-0.5 h-4 w-4 rounded border-border accent-primary"
                  />
                  Подтверждаю выгрузку черновика в мой кабинет Direct. Бюджет не
                  запускать автоматически.
                </label>
              </div>
            </div>
          </details>

          <details className="hidden mt-3 rounded-2xl border border-border bg-background/60 p-3">
            <summary className="cursor-pointer text-xs font-semibold text-muted-foreground">
              Direct Pro: ручные настройки директолога
            </summary>
            <div className="mt-3 grid gap-3 md:grid-cols-4">
              <div className="rounded-xl border border-border bg-card p-3 md:col-span-4">
                <div className="text-xs font-semibold text-muted-foreground">
                  Ручной выбор каталога
                </div>
                <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(13rem,0.6fr)_minmax(0,1fr)_minmax(12rem,0.6fr)]">
                  <div className="grid grid-cols-2 rounded-xl border border-border bg-background/60 p-1">
                    <button
                      type="button"
                      onClick={() => setDirectGroupingMode("category")}
                      className={`min-h-9 rounded-lg px-3 text-xs font-semibold transition-colors ${
                        generatorMode === "category"
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-primary/[0.08]"
                      }`}
                    >
                      Категории
                    </button>
                    <button
                      type="button"
                      onClick={() => setDirectGroupingMode("product")}
                      className={`min-h-9 rounded-lg px-3 text-xs font-semibold transition-colors ${
                        generatorMode === "product"
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-primary/[0.08]"
                      }`}
                    >
                      Товары
                    </button>
                  </div>
                  <label className="block">
                    <span className="text-xs text-muted-foreground">
                      Ограничить категории
                    </span>
                    <input
                      value={selectedCategoriesText}
                      onChange={(event) =>
                        setSelectedCategoriesText(event.target.value)
                      }
                      placeholder="пусто = весь каталог"
                      className="mt-1 h-9 w-full rounded-xl border border-border bg-background/60 px-3 text-sm outline-none focus:border-primary"
                    />
                  </label>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                    <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={feedOnlyInStock}
                        onChange={(event) =>
                          setFeedOnlyInStock(event.target.checked)
                        }
                        className="h-4 w-4 rounded border-border accent-primary"
                      />
                      Только в наличии
                    </label>
                    <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={feedOnlyWithPrice}
                        onChange={(event) =>
                          setFeedOnlyWithPrice(event.target.checked)
                        }
                        className="h-4 w-4 rounded border-border accent-primary"
                      />
                      Только с ценой
                    </label>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 rounded-xl border border-border bg-card p-1 md:col-span-2">
                {(["search", "mixed", "retargeting"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setAudienceMode(mode)}
                    className={`min-h-9 rounded-lg px-2 text-xs font-semibold transition-colors ${
                      audienceMode === mode
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-primary/[0.08]"
                    }`}
                  >
                    {mode === "search"
                      ? "Поиск"
                      : mode === "mixed"
                        ? "Микс"
                        : "Ретарг."}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-3 rounded-xl border border-border bg-card p-1 md:col-span-2">
                {(["business_hours", "all_day", "manual"] as const).map(
                  (item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setSchedule(item)}
                      className={`min-h-9 rounded-lg px-2 text-xs font-semibold transition-colors ${
                        schedule === item
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-primary/[0.08]"
                      }`}
                    >
                      {item === "business_hours"
                        ? "Рабочее"
                        : item === "all_day"
                          ? "24/7"
                          : "Ручной"}
                    </button>
                  ),
                )}
              </div>
              <label className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <input
                  type="checkbox"
                  checked={includeImages}
                  onChange={(event) => setIncludeImages(event.target.checked)}
                  className="h-4 w-4 rounded border-border accent-primary"
                />
                Фото в черновик
              </label>
              <label className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <input
                  type="checkbox"
                  checked={recommendationMode}
                  onChange={(event) =>
                    setRecommendationMode(event.target.checked)
                  }
                  className="h-4 w-4 rounded border-border accent-primary"
                />
                Рекомендации ARAY
              </label>
              <label className="block">
                <span className="text-xs text-muted-foreground">Группы</span>
                <input
                  type="number"
                  min={1}
                  max={40}
                  value={maxGroups}
                  onChange={(event) =>
                    setMaxGroups(
                      clampControlNumber(event.target.value, 1, 40, 8),
                    )
                  }
                  className="mt-1 h-9 w-full rounded-xl border border-border bg-card px-2 text-sm font-semibold outline-none focus:border-primary"
                />
              </label>
              <label className="block">
                <span className="text-xs text-muted-foreground">
                  Ключи на группу
                </span>
                <input
                  type="number"
                  min={3}
                  max={30}
                  value={maxKeywords}
                  onChange={(event) =>
                    setMaxKeywords(
                      clampControlNumber(event.target.value, 3, 30, 12),
                    )
                  }
                  className="mt-1 h-9 w-full rounded-xl border border-border bg-card px-2 text-sm font-semibold outline-none focus:border-primary"
                />
              </label>
            </div>
          </details>

          <div className="hidden mt-4 grid gap-3 lg:grid-cols-[minmax(0,1.1fr)_minmax(22rem,0.9fr)]">
            <div className="rounded-2xl border border-border bg-background/60 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="text-sm font-semibold">Готовый пакет РК</div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {draft?.draft.campaignName || "Черновик кампании"} ·{" "}
                    {directStatusLabel}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void loadDraft()}
                    disabled={loading}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-semibold hover:bg-primary/[0.08] disabled:opacity-60"
                  >
                    {loading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3.5 w-3.5" />
                    )}
                    Проверить
                  </button>
                  {directReady ? (
                    <button
                      type="button"
                      onClick={exportToDirect}
                      disabled={exportDisabled}
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                    >
                      {exporting ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <UploadCloud className="h-3.5 w-3.5" />
                      )}
                      Выгрузить в Direct
                    </button>
                  ) : (
                    <a
                      href="/api/admin/direct/oauth/start"
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Войти в Direct
                    </a>
                  )}
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-4">
                <div>
                  <div className="text-2xl font-bold font-display">
                    {groups.length}
                  </div>
                  <div className="text-xs text-muted-foreground">групп</div>
                </div>
                <div>
                  <div className="text-2xl font-bold font-display">
                    {exportAds ? adsCount : 0}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    объявлений
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold font-display">
                    {exportKeywords ? keywordCount : 0}
                  </div>
                  <div className="text-xs text-muted-foreground">ключей</div>
                </div>
                <div>
                  <div className="text-2xl font-bold font-display">
                    {draft?.draft.negativeWords.length ?? 0}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    минус-слов
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-2 text-xs text-muted-foreground md:grid-cols-2">
                <div className="rounded-xl border border-border bg-card p-3">
                  <div className="font-semibold text-foreground">Фид</div>
                  <p className="mt-1">
                    Чтобы реклама брала актуальные товары, цены, наличие и
                    ссылки с сайта.
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-card p-3">
                  <div className="font-semibold text-foreground">
                    Черновик Direct
                  </div>
                  <p className="mt-1">
                    Чтобы сначала проверить структуру, а не запускать деньги
                    вслепую.
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-card p-3">
                  <div className="font-semibold text-foreground">
                    Direct Pro
                  </div>
                  <p className="mt-1">
                    Чтобы директолог мог тонко настроить аудитории, график,
                    группы и ключи.
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-card p-3">
                  <div className="font-semibold text-foreground">Аналитика</div>
                  <p className="mt-1">
                    Чтобы после запуска видеть реальные расходы, клики и заявки,
                    без выдуманных цифр.
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-2 text-xs text-muted-foreground md:grid-cols-2">
                <div>
                  <span className="font-medium text-foreground">Фид:</span>{" "}
                  {draft?.draft.feed || "Каталог сайта"}
                </div>
                <div>
                  <span className="font-medium text-foreground">Сайт:</span>{" "}
                  {publicBaseUrlLabel}
                </div>
                <div>
                  <span className="font-medium text-foreground">Площадка:</span>{" "}
                  {draft?.draft.placement || placementLabel(placement)}
                </div>
                <div>
                  <span className="font-medium text-foreground">
                    Аудитория:
                  </span>{" "}
                  {draft?.draft.audience || audienceModeLabel(audienceMode)}
                </div>
                <div>
                  <span className="font-medium text-foreground">График:</span>{" "}
                  {draft?.draft.schedule || "После проверки"}
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-border bg-card p-3">
                <div className="text-xs font-semibold text-foreground">
                  Как считается результат
                </div>
                <div className="mt-2 grid gap-2 text-xs text-muted-foreground md:grid-cols-4">
                  {analyticsFlowSteps.map(([step, title, text]) => (
                    <div
                      key={step}
                      className="rounded-lg border border-border bg-background/60 p-2.5"
                    >
                      <div className="flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                          {step}
                        </span>
                        <span className="font-semibold text-foreground">
                          {title}
                        </span>
                      </div>
                      <p className="mt-1 leading-relaxed">{text}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {metrikaCounterIds.length
                    ? "ARAY передает счетчик Метрики в Direct, ставит UTM на посадочные страницы и не выдумывает конверсии: сначала реальные визиты и цели, потом реальные заказы из CRM."
                    : "UTM и заказы уже готовы к связке; для визитов, целей и поведения нужно указать счетчик Метрики в настройках сайта."}
                </p>
                <a
                  href="/admin/analytics"
                  className="mt-3 inline-flex min-h-9 items-center justify-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-semibold text-foreground hover:bg-primary/[0.08] transition-colors"
                >
                  <BarChart2 className="h-3.5 w-3.5" />
                  Открыть аналитику
                </a>
              </div>

              {!publicBaseUrlReady ? (
                <p className="mt-3 text-xs font-medium text-amber-600">
                  Нужен публичный домен сайта для Direct. На сервере это будет
                  домен бизнеса, локальный localhost не выгружаем.
                </p>
              ) : null}
              {error ? (
                <p className="mt-3 text-xs font-medium text-amber-600">
                  {error}
                </p>
              ) : null}
              {exportError ? (
                <p className="mt-3 text-xs font-medium text-amber-600">
                  {exportError}
                </p>
              ) : null}
              {exportResult ? (
                <div className="mt-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Черновик создан в Direct
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        РК #{exportResult.campaignId}:{" "}
                        {exportResult.groupsCreated} групп,{" "}
                        {exportResult.adsCreated} объявлений,{" "}
                        {exportResult.keywordsCreated} ключей,{" "}
                        {exportResult.sitelinksCreated} наборов быстрых ссылок.
                        Показы не запущены.
                      </p>
                    </div>
                    <a
                      href={exportResult.directUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-emerald-600/30 bg-emerald-600 px-3 text-xs font-semibold text-white transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                    >
                      Открыть кампанию в Direct
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="rounded-2xl border border-border bg-background/60 p-4">
              <div className="text-sm font-semibold">
                Проверка перед выгрузкой
              </div>
              <div className="mt-3 space-y-2">
                {checklist.slice(0, 7).map((item) => (
                  <div
                    key={item}
                    className="flex gap-2 text-xs leading-relaxed text-muted-foreground"
                  >
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 border-t border-border pt-3">
                <div className="text-xs font-semibold text-foreground">
                  История и аналитика
                </div>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Сейчас видим {draft?.direct.campaignsCount ?? 0} кампаний в
                  подключенном Direct. Расходы, клики и показы подтянем только
                  из реальных отчетов Direct, без выдуманных цифр.
                </p>
                {exportResult ? (
                  <a
                    href={exportResult.directUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary"
                  >
                    Открыть созданную РК <ExternalLink className="h-3 w-3" />
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {false ? (
        <div className="mb-3 rounded-2xl border border-border bg-card p-4 md:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Bot className="h-4 w-4 text-primary" />
                Мастер рекламной кампании
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {campaignKindLabel(campaignKind)} · {placementLabel(placement)}{" "}
                · {generatorModeLabel(generatorMode)} ·{" "}
                {dailyBudget.toLocaleString("ru-RU")} ₽/день
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadDraft()}
              disabled={loading}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-semibold hover:bg-primary/[0.08] disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              Пересобрать
            </button>
          </div>

          <div className="mt-4 grid gap-3 xl:grid-cols-4">
            <div className="rounded-2xl border border-border bg-background/60 p-3">
              <div className="text-xs font-semibold text-muted-foreground">
                1. Кампания
              </div>
              <div className="mt-3 grid grid-cols-3 rounded-xl border border-border bg-card p-1">
                {(["text", "product", "media"] as const).map((kind) => (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => setCampaignKind(kind)}
                    className={`min-h-9 rounded-lg px-2 text-xs font-semibold transition-colors ${
                      campaignKind === kind
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-primary/[0.08]"
                    }`}
                  >
                    {campaignKindLabel(kind)}
                  </button>
                ))}
              </div>
              <div className="mt-2 grid grid-cols-3 rounded-xl border border-border bg-card p-1">
                {(["search", "network", "both"] as const).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setPlacement(item)}
                    className={`min-h-9 rounded-lg px-2 text-xs font-semibold transition-colors ${
                      placement === item
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-primary/[0.08]"
                    }`}
                  >
                    {placementLabel(item)}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-background/60 p-3">
              <div className="text-xs font-semibold text-muted-foreground">
                2. Категории и фид
              </div>
              <div className="mt-3 grid grid-cols-2 rounded-xl border border-border bg-card p-1">
                <button
                  type="button"
                  onClick={() => setDirectGroupingMode("category")}
                  className={`min-h-9 rounded-lg px-3 text-xs font-semibold transition-colors ${
                    generatorMode === "category"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-primary/[0.08]"
                  }`}
                >
                  Категории
                </button>
                <button
                  type="button"
                  onClick={() => setDirectGroupingMode("product")}
                  className={`min-h-9 rounded-lg px-3 text-xs font-semibold transition-colors ${
                    generatorMode === "product"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-primary/[0.08]"
                  }`}
                >
                  Товары
                </button>
              </div>
              <label className="mt-3 block">
                <span className="text-xs text-muted-foreground">
                  Категории для генерации
                </span>
                <input
                  value={selectedCategoriesText}
                  onChange={(event) =>
                    setSelectedCategoriesText(event.target.value)
                  }
                  placeholder="например: лиственница, фанера"
                  className="mt-1 h-9 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary"
                />
              </label>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <label className="block">
                  <span className="text-xs text-muted-foreground">Группы</span>
                  <input
                    type="number"
                    min={1}
                    max={40}
                    value={maxGroups}
                    onChange={(event) =>
                      setMaxGroups(
                        clampControlNumber(event.target.value, 1, 40, 8),
                      )
                    }
                    className="mt-1 h-9 w-full rounded-xl border border-border bg-card px-2 text-sm font-semibold outline-none focus:border-primary"
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-muted-foreground">Объявл.</span>
                  <input
                    type="number"
                    min={1}
                    max={3}
                    value={maxAds}
                    onChange={(event) =>
                      setMaxAds(clampControlNumber(event.target.value, 1, 3, 2))
                    }
                    className="mt-1 h-9 w-full rounded-xl border border-border bg-card px-2 text-sm font-semibold outline-none focus:border-primary"
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-muted-foreground">Ключи</span>
                  <input
                    type="number"
                    min={3}
                    max={30}
                    value={maxKeywords}
                    onChange={(event) =>
                      setMaxKeywords(
                        clampControlNumber(event.target.value, 3, 30, 12),
                      )
                    }
                    className="mt-1 h-9 w-full rounded-xl border border-border bg-card px-2 text-sm font-semibold outline-none focus:border-primary"
                  />
                </label>
              </div>
              <details className="mt-3">
                <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
                  Фид и фильтры: {feedSourceLabel(feedSource)}
                </summary>
                <div className="mt-3 space-y-3">
                  <div className="grid grid-cols-3 rounded-xl border border-border bg-card p-1">
                    {(["catalog", "yml", "market"] as const).map((source) => (
                      <button
                        key={source}
                        type="button"
                        onClick={() => setFeedSource(source)}
                        className={`min-h-9 rounded-lg px-2 text-xs font-semibold transition-colors ${
                          feedSource === source
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:bg-primary/[0.08]"
                        }`}
                      >
                        {feedSourceLabel(source)}
                      </button>
                    ))}
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={feedOnlyInStock}
                        onChange={(event) =>
                          setFeedOnlyInStock(event.target.checked)
                        }
                        className="h-4 w-4 rounded border-border accent-primary"
                      />
                      Только в наличии
                    </label>
                    <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={feedOnlyWithPrice}
                        onChange={(event) =>
                          setFeedOnlyWithPrice(event.target.checked)
                        }
                        className="h-4 w-4 rounded border-border accent-primary"
                      />
                      Только с ценой
                    </label>
                  </div>
                  <label className="block">
                    <span className="text-xs text-muted-foreground">
                      Категория содержит
                    </span>
                    <input
                      value={feedCategoryFilter}
                      onChange={(event) =>
                        setFeedCategoryFilter(event.target.value)
                      }
                      placeholder="например: лиственница"
                      className="mt-1 h-9 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary"
                    />
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="block">
                      <span className="text-xs text-muted-foreground">
                        Цена от
                      </span>
                      <input
                        type="number"
                        min={0}
                        value={minPrice}
                        onChange={(event) =>
                          setMinPrice(
                            clampControlNumber(
                              event.target.value,
                              0,
                              100000000,
                              0,
                            ),
                          )
                        }
                        className="mt-1 h-9 w-full rounded-xl border border-border bg-card px-2 text-sm outline-none focus:border-primary"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs text-muted-foreground">
                        Цена до
                      </span>
                      <input
                        type="number"
                        min={0}
                        value={maxPrice}
                        onChange={(event) =>
                          setMaxPrice(
                            clampControlNumber(
                              event.target.value,
                              0,
                              100000000,
                              0,
                            ),
                          )
                        }
                        className="mt-1 h-9 w-full rounded-xl border border-border bg-card px-2 text-sm outline-none focus:border-primary"
                      />
                    </label>
                  </div>
                </div>
              </details>
            </div>

            <div className="rounded-2xl border border-border bg-background/60 p-3">
              <div className="text-xs font-semibold text-muted-foreground">
                3. Объявления
              </div>
              <label className="mt-3 block">
                <span className="text-xs text-muted-foreground">Оффер</span>
                <input
                  value={promoText}
                  onChange={(event) => setPromoText(event.target.value)}
                  placeholder="Например: доставка сегодня"
                  maxLength={48}
                  className="mt-1 h-9 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary"
                />
              </label>
              <label className="mt-3 block">
                <span className="text-xs text-muted-foreground">
                  Быстрые ссылки
                </span>
                <textarea
                  value={quickLinksText}
                  onChange={(event) => setQuickLinksText(event.target.value)}
                  rows={4}
                  placeholder="Название|/page|Описание"
                  className="mt-1 min-h-24 w-full resize-none rounded-xl border border-border bg-card px-3 py-2 text-xs outline-none focus:border-primary"
                />
              </label>
            </div>

            <div className="rounded-2xl border border-border bg-background/60 p-3">
              <div className="text-xs font-semibold text-muted-foreground">
                4. Показы
              </div>
              <label className="mb-3 inline-flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <input
                  type="checkbox"
                  checked={recommendationMode}
                  onChange={(event) =>
                    setRecommendationMode(event.target.checked)
                  }
                  className="h-4 w-4 rounded border-border accent-primary"
                />
                Рекомендации ARAY
              </label>
              <div className="mt-3 grid grid-cols-3 rounded-xl border border-border bg-card p-1">
                {(["search", "mixed", "retargeting"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setAudienceMode(mode)}
                    className={`min-h-9 rounded-lg px-2 text-xs font-semibold transition-colors ${
                      audienceMode === mode
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-primary/[0.08]"
                    }`}
                  >
                    {mode === "search"
                      ? "Поиск"
                      : mode === "mixed"
                        ? "Микс"
                        : "Ретарг."}
                  </button>
                ))}
              </div>
              <label className="mt-3 block">
                <span className="text-xs text-muted-foreground">Бюджет</span>
                <input
                  type="number"
                  min={300}
                  max={100000}
                  step={100}
                  value={dailyBudget}
                  onChange={(event) =>
                    setDailyBudget(
                      clampControlNumber(event.target.value, 300, 100000, 700),
                    )
                  }
                  className="mt-1 h-9 w-full rounded-xl border border-border bg-card px-3 text-sm font-semibold outline-none focus:border-primary"
                />
              </label>
              <div className="mt-3 grid grid-cols-3 rounded-xl border border-border bg-card p-1">
                {(["business_hours", "all_day", "manual"] as const).map(
                  (item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setSchedule(item)}
                      className={`min-h-9 rounded-lg px-2 text-xs font-semibold transition-colors ${
                        schedule === item
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-primary/[0.08]"
                      }`}
                    >
                      {item === "business_hours"
                        ? "Рабочее"
                        : item === "all_day"
                          ? "24/7"
                          : "Ручной"}
                    </button>
                  ),
                )}
              </div>
            </div>
          </div>

          <div className="mt-3 rounded-2xl border border-border bg-background/60 p-3">
            <button
              type="button"
              onClick={() => setAdvancedOpen((value) => !value)}
              className="flex w-full items-center justify-between text-left text-xs font-semibold text-muted-foreground"
            >
              Тонкие настройки директолога
              {advancedOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
            {advancedOpen ? (
              <div className="mt-3 grid gap-3 sm:grid-cols-4">
                <label className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={includeImages}
                    onChange={(event) => setIncludeImages(event.target.checked)}
                    className="h-4 w-4 rounded border-border accent-primary"
                  />
                  Фото товаров
                </label>
                {schedule === "manual" ? (
                  <>
                    <label className="block">
                      <span className="text-xs text-muted-foreground">Дни</span>
                      <input
                        value={weekdays}
                        onChange={(event) => setWeekdays(event.target.value)}
                        className="mt-1 h-9 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs text-muted-foreground">С</span>
                      <input
                        type="time"
                        value={timeFrom}
                        onChange={(event) => setTimeFrom(event.target.value)}
                        className="mt-1 h-9 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs text-muted-foreground">До</span>
                      <input
                        type="time"
                        value={timeTo}
                        onChange={(event) => setTimeTo(event.target.value)}
                        className="mt-1 h-9 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary"
                      />
                    </label>
                  </>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="hidden rounded-2xl border border-border bg-card p-4 md:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
              <Target className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold">
                  {draft?.draft.campaignName || "Каталог | Поиск | Реклама"}
                </h3>
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
                {draft?.draft.region || "Регион доставки"} · запуск денег только
                после подтверждения владельца.
              </p>
              {firstCampaign ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Найдена кампания:{" "}
                  <span className="font-medium text-foreground">
                    {firstCampaign.name}
                  </span>
                </p>
              ) : null}
              {error ? (
                <p className="mt-2 text-xs font-medium text-amber-600">
                  {error}
                </p>
              ) : null}
              {exportError ? (
                <p className="mt-2 text-xs font-medium text-amber-600">
                  {exportError}
                </p>
              ) : null}
              {exportResult ? (
                <p className="mt-2 text-xs font-medium text-emerald-600">
                  В Direct создана РК #{exportResult.campaignId}:{" "}
                  {exportResult.groupsCreated} групп, {exportResult.adsCreated}{" "}
                  объявлений, {exportResult.keywordsCreated} ключей. Показы не
                  запущены.
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <CopyButton
              copied={copyKey === "direct-structure"}
              onClick={() =>
                copyText("direct-structure", formatDraftText(draft?.draft))
              }
            >
              Структура
            </CopyButton>
            <CopyButton
              copied={copyKey === "negative"}
              onClick={() =>
                copyText(
                  "negative",
                  (draft?.draft.negativeWords ?? []).join("\n"),
                )
              }
            >
              Минус-слова
            </CopyButton>
            <CopyButton
              copied={copyKey === "aray"}
              onClick={() => copyText("aray", buildArayPrompt(draft?.draft))}
            >
              ARAY
            </CopyButton>
            <button
              type="button"
              onClick={exportToDirect}
              disabled={loading || exporting || !directReady || !groups.length}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              {exporting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <UploadCloud className="h-3.5 w-3.5" />
              )}
              Выгрузить РК
            </button>
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
                Регион:{" "}
                <span className="font-medium text-foreground">
                  {draft?.draft.region || "не загружен"}
                </span>
              </p>
              <p>
                Бюджет:{" "}
                <span className="font-medium text-foreground">
                  {draft?.draft.dailyBudgetHint || "после проверки"}
                </span>
              </p>
              <p>
                Стратегия:{" "}
                <span className="font-medium text-foreground">
                  {draft?.draft.strategy || "ручной запуск"}
                </span>
              </p>
              <p>
                Вид:{" "}
                <span className="font-medium text-foreground">
                  {draft?.draft.campaignKind || "текстово-графическая"}
                </span>
              </p>
              <p>
                Площадка:{" "}
                <span className="font-medium text-foreground">
                  {draft?.draft.placement || "поиск"}
                </span>
              </p>
              <p>
                Фид:{" "}
                <span className="font-medium text-foreground">
                  {draft?.draft.feed || "каталог сайта"}
                </span>
              </p>
              <p>
                Аудитория:{" "}
                <span className="font-medium text-foreground">
                  {draft?.draft.audience || "поиск"}
                </span>
              </p>
              {draft?.draft.promoText ? (
                <p>
                  Промо:{" "}
                  <span className="font-medium text-foreground">
                    {draft.draft.promoText}
                  </span>
                </p>
              ) : null}
              <p>
                График:{" "}
                <span className="font-medium text-foreground">
                  {draft?.draft.schedule || "после проверки"}
                </span>
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Search className="h-4 w-4 text-primary" />
              Группы и ключи
            </div>
            <div className="mt-3 grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 sm:grid-cols-4 md:grid-cols-2 xl:grid-cols-4">
              <div>
                <div className="text-xl font-bold font-display">
                  {groups.length}
                </div>
                <div className="text-xs text-muted-foreground">групп</div>
              </div>
              <div>
                <div className="text-xl font-bold font-display">{adsCount}</div>
                <div className="text-xs text-muted-foreground">объявл.</div>
              </div>
              <div>
                <div className="text-xl font-bold font-display">
                  {keywordCount}
                </div>
                <div className="text-xs text-muted-foreground">ключей</div>
              </div>
              <div>
                <div className="text-xl font-bold font-display">
                  {imageCount}
                </div>
                <div className="text-xs text-muted-foreground">фото</div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Bot className="h-4 w-4 text-primary" />
              ARAY помогает
            </div>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              Проверит структуру, объяснит риск, подготовит текст менеджеру и не
              запускает деньги без владельца.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 xl:grid-cols-[minmax(0,1.45fr)_minmax(22rem,0.75fr)]">
          <div className="space-y-3">
            <div className="rounded-2xl border border-border bg-background/60 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <BarChart2 className="h-4 w-4 text-primary" />
                Direct центр данных
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <div className="rounded-xl border border-border bg-card p-3">
                  <div className="text-lg font-bold font-display">
                    {draft?.direct.campaignsCount ?? 0}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    РК в Direct
                  </div>
                </div>
                <div className="rounded-xl border border-border bg-card p-3">
                  <div className="text-lg font-bold font-display">
                    нет данных
                  </div>
                  <div className="text-xs text-muted-foreground">
                    расходы / клики
                  </div>
                </div>
                <div className="rounded-xl border border-border bg-card p-3">
                  <div className="text-lg font-bold font-display">
                    {directReady ? "подключен" : "OAuth"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    кабинет клиента
                  </div>
                </div>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                После OAuth-подключения подтянем реальные кампании, статусы,
                расходы, показы, клики и рекомендации. До этого ARAY показывает
                только черновики и не выдумывает метрики.
              </p>
            </div>

            {loading ? (
              <div className="rounded-2xl border border-border bg-background/60 p-4 text-sm text-muted-foreground">
                Собираю группы объявлений из каталога...
              </div>
            ) : groups.length ? (
              groups.slice(0, 4).map((group, index) => (
                <div
                  key={`${group.name}-${index}`}
                  className="rounded-2xl border border-border bg-background/60 p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Группа {index + 1}
                      </div>
                      <h4 className="mt-1 font-semibold">{group.name}</h4>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {group.productsCount} товаров · {group.keywords.length}{" "}
                        ключей
                      </p>
                    </div>
                    <CopyButton
                      copied={copyKey === `group-${index}`}
                      onClick={() =>
                        copyText(`group-${index}`, formatGroupText(group))
                      }
                    >
                      Копировать
                    </CopyButton>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {group.keywords.slice(0, 7).map((keyword) => (
                      <span
                        key={keyword}
                        className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>

                  {group.imageUrls?.length ? (
                    <div className="mt-3 flex gap-2 overflow-hidden">
                      {group.imageUrls.slice(0, 4).map((url) => (
                        <img
                          key={url}
                          src={url}
                          alt="Фото товара"
                          className="h-14 w-14 rounded-xl border border-border object-cover"
                          loading="lazy"
                        />
                      ))}
                    </div>
                  ) : null}

                  {group.ads[0] ? (
                    <div className="mt-3 rounded-xl border border-border bg-card p-3 text-xs leading-relaxed">
                      <div className="font-semibold">{group.ads[0].title1}</div>
                      <div className="text-primary">{group.ads[0].title2}</div>
                      <div className="mt-1 text-muted-foreground">
                        {group.ads[0].text}
                      </div>
                    </div>
                  ) : null}
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-border bg-background/60 p-4 text-sm text-muted-foreground">
                Добавьте активные товары с ценами, и ARAY соберет группы
                объявлений.
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
                  <div
                    key={item}
                    className="flex gap-2 text-xs leading-relaxed text-muted-foreground"
                  >
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

      <AdminModal
        open={readinessOpen}
        onClose={() => setReadinessOpen(false)}
        title="ARAY: Метрика и готовность запуска"
        subtitle="Финальная проверка перед ручным запуском Direct. ARAY хранит ID, объясняет шаги и не включает бюджет."
        size="xl"
        modal={false}
        overlayClassName="admin-modal-overlay-aray-safe"
        className="admin-modal-aray-sidecar"
        bodyClassName="p-3 sm:p-4"
        footer={
          <>
            <button
              type="button"
              onClick={() => setReadinessOpen(false)}
              className="min-h-11 rounded-xl border border-border bg-background px-4 text-sm font-semibold hover:bg-primary/[0.08]"
            >
              Закрыть
            </button>
            <button
              type="button"
              onClick={saveReadinessSetup}
              disabled={readinessSaving}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              {readinessSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Сохранить готовность
            </button>
          </>
        }
      >
        <>
          <div className="rounded-2xl border border-primary/30 bg-primary/[0.07] p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
                  <Bot className="h-4 w-4" />
                  Простой режим
                </div>
                <h3 className="mt-2 text-xl font-semibold leading-tight">
                  ARAY доведет Метрику до запуска
                </h3>
                <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
                  Для владельца здесь всего три действия: подключить счетчик,
                  создать цели и сохранить готовность. Технические ID можно
                  открыть ниже, если они уже есть в Метрике.
                </p>
              </div>
              <div className="shrink-0 rounded-xl border border-border bg-card p-3 text-sm">
                <div className="text-xs text-muted-foreground">
                  Обязательная готовность
                </div>
                <div className="mt-1 text-2xl font-bold font-display">
                  {readyCriticalCount}/{criticalReadiness.length}
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  Метрика: {metrikaStatusText}
                </div>
              </div>
            </div>
            <div className="mt-4 grid gap-2 md:grid-cols-3">
              {[
                [
                  "1",
                  "Подключить счетчик",
                  metrikaCounterIds.length
                    ? `${metrikaLabel} найден`
                    : "вставить номер счетчика Метрики",
                ],
                [
                  "2",
                  "Создать цели",
                  goalsReady
                    ? "главная цель и микроцель есть"
                    : "заказ/заявка плюс телефон или checkout",
                ],
                [
                  "3",
                  "Проверить запуск",
                  promotionReadyForLaunch
                    ? "можно проверять в Direct"
                    : "ARAY покажет, чего не хватает",
                ],
              ].map(([step, title, text]) => (
                <div
                  key={step}
                  className="rounded-xl border border-border bg-card p-3"
                >
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {step}
                    </span>
                    <span className="text-sm font-semibold">{title}</span>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    {text}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-4 border-t border-border/70 pt-4">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-end">
                <label className="min-w-0 flex-1 text-xs font-semibold text-muted-foreground">
                  Номер счетчика Метрики
                  <input
                    value={setupCounterId}
                    onChange={(event) =>
                      setSetupCounterId(event.target.value.replace(/[^\d]/g, ""))
                    }
                    placeholder="например: 108430589"
                    inputMode="numeric"
                    className="mt-1 h-11 w-full rounded-xl border border-border bg-card px-3 text-sm font-semibold text-foreground outline-none focus:border-primary"
                  />
                </label>
                <div className="grid gap-2 sm:grid-cols-2 xl:flex xl:shrink-0">
                  <button
                    type="button"
                    onClick={saveReadinessSetup}
                    disabled={!counterReadyInForm || readinessSaving}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                  >
                    {readinessSaving ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    )}
                    Сохранить счетчик
                  </button>
                  <button
                    type="button"
                    onClick={loadMetrikaStatus}
                    disabled={metrikaLoading}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-semibold hover:bg-primary/[0.08] disabled:opacity-60"
                  >
                    {metrikaLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3.5 w-3.5" />
                    )}
                    Проверить
                  </button>
                </div>
              </div>
              {metrikaCounterOptions.length ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {metrikaCounterOptions.slice(0, 4).map((counter) => (
                    <button
                      key={counter.id}
                      type="button"
                      onClick={() => setSetupCounterId(String(counter.id))}
                      className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                        setupCounterId === String(counter.id)
                          ? "border-primary/50 bg-primary/[0.12] text-foreground"
                          : "border-border bg-card text-muted-foreground hover:bg-primary/[0.08]"
                      }`}
                    >
                      {counter.name} · #{counter.id}
                    </button>
                  ))}
                </div>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                <span className="rounded-full bg-card px-2.5 py-1">
                  ARAY сохранит ID
                </span>
                <span className="rounded-full bg-card px-2.5 py-1">
                  добавит мониторинг в Direct
                </span>
                <span className="rounded-full bg-card px-2.5 py-1">
                  цели создаст после OAuth
                </span>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={askArayAboutMetrika}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                Попросить ARAY помочь
              </button>
              <button
                type="button"
                onClick={openMetrikaNavigator}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-semibold hover:bg-primary/[0.08]"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Открыть Метрику с ARAY
              </button>
              {metrikaConnected ? (
                <button
                  type="button"
                  onClick={createArayMetrikaGoals}
                  disabled={metrikaGoalsCreating}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-semibold hover:bg-primary/[0.08] disabled:opacity-60"
                >
                  {metrikaGoalsCreating ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Target className="h-3.5 w-3.5" />
                  )}
                  Создать цели ARAY
                </button>
              ) : metrikaStatus?.configured ? (
                <a
                  href="/api/admin/metrika/oauth/start"
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-semibold hover:bg-primary/[0.08]"
                >
                  <Target className="h-3.5 w-3.5" />
                  Подключить Метрику
                </a>
              ) : (
                <button
                  type="button"
                  disabled
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-semibold text-muted-foreground opacity-70"
                  title="Сначала добавьте YANDEX_METRIKA_CLIENT_ID и YANDEX_METRIKA_CLIENT_SECRET"
                >
                  <Target className="h-3.5 w-3.5" />
                  OAuth Метрики не настроен
                </button>
              )}
              <button
                type="button"
                onClick={() => setReadinessAdvancedOpen((value) => !value)}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-semibold hover:bg-primary/[0.08]"
              >
                {readinessAdvancedOpen ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
                {readinessAdvancedOpen ? "Скрыть ID" : "Показать ID и цели"}
              </button>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              После OAuth Метрики ARAY сам найдет счетчик, создаст нужные цели и
              сохранит их ID. Без OAuth доступен ручной режим: номер счетчика и ID
              целей можно вставить ниже.
            </p>
          </div>

          {!readinessAdvancedOpen ? (
            <div className="mt-3 rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">
                    Статус перед запуском
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {promotionReadyForLaunch
                      ? "Обязательные пункты готовы. Запуск все равно включается вручную в Direct."
                      : "ARAY показывает, чего не хватает до уверенного запуска."}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                    promotionReadyForLaunch
                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                      : "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                  }`}
                >
                  {promotionReadyForLaunch ? "готово" : "проверить"}
                </span>
              </div>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {launchReadinessItems.map((item) => (
                  <div
                    key={item.label}
                    className="flex gap-2 text-xs leading-relaxed text-muted-foreground"
                  >
                    <CheckCircle2
                      className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${
                        item.ok ? "text-emerald-600" : "text-amber-600"
                      }`}
                    />
                    <span>
                      <span className="font-semibold text-foreground">
                        {item.label}:
                      </span>{" "}
                      {item.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {readinessAdvancedOpen ? (
        <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <div className="space-y-3">
            <div className="rounded-2xl border border-border bg-background/60 p-4">
              <div className="flex items-start gap-3">
                <BarChart2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div>
                  <div className="text-sm font-semibold">
                    1. Счетчик Метрики
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    Если номер счетчика сохранен, тег уже выводится на сайте через
                    общий layout, а Direct при выгрузке получает counter ID и
                    мониторинг сайта.
                  </p>
                </div>
              </div>
              <label className="mt-3 block text-xs font-semibold text-muted-foreground">
                Номер счетчика
                <input
                  value={setupCounterId}
                  onChange={(event) =>
                    setSetupCounterId(event.target.value.replace(/[^\d]/g, ""))
                  }
                  placeholder="например: 98765432"
                  className="mt-1 h-11 w-full rounded-xl border border-border bg-card px-3 text-sm font-semibold text-foreground outline-none focus:border-primary"
                />
              </label>
              {metrikaCounterOptions.length ? (
                <div className="mt-2 grid gap-2">
                  {metrikaCounterOptions.slice(0, 3).map((counter) => (
                    <button
                      key={counter.id}
                      type="button"
                      onClick={() => setSetupCounterId(String(counter.id))}
                      className={`rounded-xl border px-3 py-2 text-left text-xs transition-colors ${
                        setupCounterId === String(counter.id)
                          ? "border-primary/40 bg-primary/[0.1]"
                          : "border-border bg-card hover:bg-primary/[0.08]"
                      }`}
                    >
                      <span className="block font-semibold text-foreground">
                        {counter.name}
                      </span>
                      <span className="mt-0.5 block text-muted-foreground">
                        #{counter.id}
                        {counter.site ? ` · ${counter.site}` : ""}
                        {counter.goalsCount
                          ? ` · целей: ${counter.goalsCount}`
                          : ""}
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2">
                {metrikaStatus?.configured ? (
                  <a
                    href="/api/admin/metrika/oauth/start"
                    className="inline-flex min-h-9 items-center justify-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-semibold hover:bg-primary/[0.08]"
                  >
                    <Target className="h-3.5 w-3.5" />
                    Подключить OAuth
                  </a>
                ) : null}
                <a
                  href="https://metrika.yandex.ru/list"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-9 items-center justify-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-semibold hover:bg-primary/[0.08]"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Открыть Метрику
                </a>
                <a
                  href="/admin/site?tab=analytics"
                  className="inline-flex min-h-9 items-center justify-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-semibold hover:bg-primary/[0.08]"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Настройки сайта
                </a>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-background/60 p-4">
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div>
                  <div className="text-sm font-semibold">
                    2. Организация Яндекс Бизнес
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    Не обязательна для первого запуска, но помогает добавить
                    контакты и организацию в объявлениях, если профиль подтвержден.
                  </p>
                </div>
              </div>
              <label className="mt-3 block text-xs font-semibold text-muted-foreground">
                ID организации
                <input
                  value={setupBusinessProfileId}
                  onChange={(event) =>
                    setSetupBusinessProfileId(
                      event.target.value.replace(/[^\d]/g, ""),
                    )
                  }
                  placeholder="оставьте пустым, если профиля нет"
                  className="mt-1 h-11 w-full rounded-xl border border-border bg-card px-3 text-sm font-semibold text-foreground outline-none focus:border-primary"
                />
              </label>
            </div>

            <div className="rounded-2xl border border-border bg-background/60 p-4">
              <div className="text-sm font-semibold">Как ARAY ведет владельца</div>
              <div className="mt-3 space-y-2">
                {[
                  "открывает Метрику и Direct только через официальные окна Яндекса",
                  "не просит и не хранит пароль Яндекса",
                  "сохраняет только ID счетчика, целей и организации",
                  "после сохранения пересобирает готовность продвижения",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex gap-2 text-xs leading-relaxed text-muted-foreground"
                  >
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="rounded-2xl border border-border bg-background/60 p-4">
              <div className="flex items-start gap-3">
                <Target className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div>
                  <div className="text-sm font-semibold">3. Цели Метрики</div>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    Для статуса “готово” нужна главная цель: заказ или заявка, и
                    одна микроцель: телефон, мессенджер, корзина, checkout или
                    вовлеченная сессия.
                  </p>
                </div>
              </div>
              <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/[0.08] p-3 text-xs leading-relaxed">
                <div className="font-semibold text-foreground">
                  Что сюда вставлять
                </div>
                <p className="mt-1 text-muted-foreground">
                  Открой Метрику → Цели. У каждой цели есть числовой ID. В ARAY
                  вставляется только этот номер, без названия цели и без ссылки.
                  Если цели еще нет, поле можно оставить пустым.
                </p>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {METRIKA_GOAL_FIELDS.map((field) => (
                  <label
                    key={field.key}
                    className="rounded-xl border border-border bg-card p-3 text-xs"
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-foreground">
                        {field.label}
                      </span>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                        {field.key === "order" || field.key === "lead"
                          ? "главная"
                          : "микроцель"}
                      </span>
                    </span>
                    <span className="mt-1 block leading-relaxed text-muted-foreground">
                      {field.hint}
                    </span>
                    <input
                      value={setupGoals[field.key] ?? ""}
                      onChange={(event) =>
                        updateSetupGoal(field.key, event.target.value)
                      }
                      placeholder="например: 123456789"
                      className="mt-2 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm font-semibold text-foreground outline-none focus:border-primary"
                    />
                    <span className="mt-1 block text-[11px] text-muted-foreground">
                      Только цифры ID цели из Метрики.
                    </span>
                  </label>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={createArayMetrikaGoals}
                  disabled={!metrikaConnected || metrikaGoalsCreating}
                  className="inline-flex min-h-9 items-center justify-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-semibold hover:bg-primary/[0.08] disabled:opacity-60"
                >
                  {metrikaGoalsCreating ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Target className="h-3.5 w-3.5" />
                  )}
                  Создать нужные цели
                </button>
                <a
                  href="https://metrika.yandex.ru/goals"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-9 items-center justify-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-semibold hover:bg-primary/[0.08]"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Открыть цели Метрики
                </a>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">
                    Статус перед запуском
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {readyCriticalCount}/{criticalReadiness.length} обязательных
                    пунктов готовы.
                  </p>
                </div>
                <span
                  className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                    promotionReadyForLaunch
                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                      : "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                  }`}
                >
                  {promotionReadyForLaunch ? "готово" : "проверить"}
                </span>
              </div>
              <div className="mt-3 space-y-2">
                {launchReadinessItems.map((item) => (
                  <div
                    key={item.label}
                    className="flex gap-2 text-xs leading-relaxed text-muted-foreground"
                  >
                    <CheckCircle2
                      className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${
                        item.ok ? "text-emerald-600" : "text-amber-600"
                      }`}
                    />
                    <span>
                      <span className="font-semibold text-foreground">
                        {item.label}:
                      </span>{" "}
                      {item.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
          ) : null}
        </>
      </AdminModal>

      <AdminModal
        open={directProOpen}
        onClose={() => setDirectProOpen(false)}
        title="Direct Pro"
        subtitle="Расширенные настройки директолога в одном окне. Если не уверены, оставьте рекомендации ARAY."
        size="xl"
        modal={false}
        overlayClassName="admin-modal-overlay-aray-safe"
        className="admin-modal-aray-sidecar"
        bodyClassName="p-3 sm:p-4"
        footer={
          <>
            <button
              type="button"
              onClick={() => setDirectProOpen(false)}
              className="min-h-11 rounded-xl border border-border bg-background px-4 text-sm font-semibold hover:bg-primary/[0.08]"
            >
              Закрыть
            </button>
            <button
              type="button"
              onClick={async () => {
                await loadDraft();
                setDirectProOpen(false);
              }}
              disabled={loading}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Применить и пересобрать
            </button>
          </>
        }
      >
        <div className="grid gap-3 lg:grid-cols-2">
          <aside className="hidden rounded-2xl border border-border bg-background/60 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Bot className="h-4 w-4 text-primary" />
              ARAY рядом
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Напиши, что поправить в объявлениях, группах или ключах. Команда
              останется здесь, пока открыт попап.
            </p>
            <textarea
              value={arayEditRequest}
              onChange={(event) => setArayEditRequest(event.target.value)}
              rows={6}
              placeholder="Например: сделай акцент на лиственницу, убери дешевые запросы, добавь доставку по МО"
              className="mt-3 min-h-32 w-full resize-none rounded-xl border border-border bg-card px-3 py-2 text-xs outline-none focus:border-primary"
            />
            <button
              type="button"
              onClick={() =>
                copyText(
                  "aray-edit",
                  buildArayEditPrompt(
                    draft?.draft,
                    arayEditRequest,
                    excludedKeywordsText,
                  ),
                )
              }
              className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-semibold hover:bg-primary/[0.08]"
            >
              <Clipboard className="h-3.5 w-3.5" />
              {copyKey === "aray-edit"
                ? "Команда скопирована"
                : "Спросить ARAY"}
            </button>
            <div className="mt-4 rounded-xl border border-border bg-card p-3">
              <div className="text-xs font-semibold text-foreground">
                Что можно менять
              </div>
              <div className="mt-2 space-y-1.5 text-xs leading-relaxed text-muted-foreground">
                <p>• офферы и быстрые ссылки</p>
                <p>• лишние ключи и минус-фразы</p>
                <p>• режим: категории или товары</p>
                <p>• аудиторию, график и бюджет</p>
              </div>
            </div>
          </aside>
          <div className="contents">
            <div className="rounded-2xl border border-border bg-background/60 p-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                1. Кампания
              </div>
              <div className="mt-3 grid grid-cols-3 rounded-xl border border-border bg-card p-1">
                {(["text", "product", "media"] as const).map((kind) => (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => setCampaignKind(kind)}
                    className={`min-h-10 rounded-lg px-2 text-xs font-semibold transition-colors ${
                      campaignKind === kind
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-primary/[0.08]"
                    }`}
                  >
                    {campaignKindLabel(kind)}
                  </button>
                ))}
              </div>
              <div className="mt-2 grid grid-cols-3 rounded-xl border border-border bg-card p-1">
                {(["search", "network", "both"] as const).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setPlacement(item)}
                    className={`min-h-10 rounded-lg px-2 text-xs font-semibold transition-colors ${
                      placement === item
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-primary/[0.08]"
                    }`}
                  >
                    {placementLabel(item)}
                  </button>
                ))}
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-4">
                <label className="block sm:col-span-2">
                  <span className="text-xs text-muted-foreground">
                    Бюджет, ₽/день
                  </span>
                  <input
                    type="number"
                    min={300}
                    max={100000}
                    step={100}
                    value={dailyBudget}
                    onChange={(event) =>
                      setDailyBudget(
                        clampControlNumber(
                          event.target.value,
                          300,
                          100000,
                          700,
                        ),
                      )
                    }
                    className="mt-1 h-10 w-full rounded-xl border border-border bg-card px-3 text-sm font-semibold outline-none focus:border-primary"
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-muted-foreground">Группы</span>
                  <input
                    type="number"
                    min={1}
                    max={40}
                    value={maxGroups}
                    onChange={(event) =>
                      setMaxGroups(
                        clampControlNumber(event.target.value, 1, 40, 8),
                      )
                    }
                    className="mt-1 h-10 w-full rounded-xl border border-border bg-card px-3 text-sm font-semibold outline-none focus:border-primary"
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-muted-foreground">Ключи</span>
                  <input
                    type="number"
                    min={3}
                    max={30}
                    value={maxKeywords}
                    onChange={(event) =>
                      setMaxKeywords(
                        clampControlNumber(event.target.value, 3, 30, 12),
                      )
                    }
                    className="mt-1 h-10 w-full rounded-xl border border-border bg-card px-3 text-sm font-semibold outline-none focus:border-primary"
                  />
                </label>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-background/60 p-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                2. Фид и состав
              </div>
              <div className="mt-3 grid grid-cols-2 rounded-xl border border-border bg-card p-1">
                <button
                  type="button"
                  onClick={() => setDirectGroupingMode("category")}
                  className={`min-h-10 rounded-lg px-3 text-xs font-semibold transition-colors ${
                    generatorMode === "category"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-primary/[0.08]"
                  }`}
                >
                  Категории
                </button>
                <button
                  type="button"
                  onClick={() => setDirectGroupingMode("product")}
                  className={`min-h-10 rounded-lg px-3 text-xs font-semibold transition-colors ${
                    generatorMode === "product"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-primary/[0.08]"
                  }`}
                >
                  Товары
                </button>
              </div>
              <div className="mt-2 grid grid-cols-3 rounded-xl border border-border bg-card p-1">
                {(["catalog", "yml", "market"] as const).map((source) => (
                  <button
                    key={source}
                    type="button"
                    onClick={() => setFeedSource(source)}
                    className={`min-h-10 rounded-lg px-2 text-xs font-semibold transition-colors ${
                      feedSource === source
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-primary/[0.08]"
                    }`}
                  >
                    {feedSourceLabel(source)}
                  </button>
                ))}
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <label className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border bg-card px-3 text-xs font-semibold">
                  <input
                    type="checkbox"
                    checked={feedOnlyInStock}
                    onChange={(event) =>
                      setFeedOnlyInStock(event.target.checked)
                    }
                    className="h-4 w-4 rounded border-border accent-primary"
                  />
                  Только в наличии
                </label>
                <label className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border bg-card px-3 text-xs font-semibold">
                  <input
                    type="checkbox"
                    checked={feedOnlyWithPrice}
                    onChange={(event) =>
                      setFeedOnlyWithPrice(event.target.checked)
                    }
                    className="h-4 w-4 rounded border-border accent-primary"
                  />
                  Только с ценой
                </label>
              </div>
              <label className="mt-3 block">
                <span className="text-xs text-muted-foreground">
                  Категория содержит
                </span>
                <input
                  value={feedCategoryFilter}
                  onChange={(event) =>
                    setFeedCategoryFilter(event.target.value)
                  }
                  placeholder="например: лиственница"
                  className="mt-1 h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary"
                />
              </label>
            </div>

            <div className="rounded-2xl border border-border bg-background/60 p-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                3. Объявления
              </div>
              <label className="mt-3 block">
                <span className="text-xs text-muted-foreground">
                  Промо или оффер
                </span>
                <input
                  value={promoText}
                  onChange={(event) => setPromoText(event.target.value)}
                  placeholder="например: доставка сегодня"
                  maxLength={48}
                  className="mt-1 h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary"
                />
              </label>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {OFFER_PRESETS.map((offer) => (
                  <button
                    key={offer}
                    type="button"
                    onClick={() => setPromoText(offer)}
                    className="rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-semibold text-muted-foreground hover:bg-primary/[0.08] hover:text-foreground"
                  >
                    {offer}
                  </button>
                ))}
              </div>
              <label className="mt-3 block">
                <span className="text-xs text-muted-foreground">
                  Быстрые ссылки
                </span>
                <textarea
                  value={quickLinksText}
                  onChange={(event) => setQuickLinksText(event.target.value)}
                  rows={5}
                  placeholder="Название|/page|Описание"
                  className="mt-1 min-h-32 w-full resize-none rounded-xl border border-border bg-card px-3 py-2 text-xs outline-none focus:border-primary"
                />
              </label>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                {QUICK_LINK_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setQuickLinksText(preset.value)}
                    className="min-h-9 rounded-xl border border-border bg-card px-3 text-xs font-semibold hover:bg-primary/[0.08]"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <label className="mt-3 block">
                <span className="text-xs text-muted-foreground">
                  Исключить фразы
                </span>
                <textarea
                  value={excludedKeywordsText}
                  onChange={(event) =>
                    setExcludedKeywordsText(event.target.value)
                  }
                  rows={3}
                  placeholder="например: бу, бесплатно, своими руками"
                  className="mt-1 min-h-20 w-full resize-none rounded-xl border border-border bg-card px-3 py-2 text-xs outline-none focus:border-primary"
                />
              </label>
            </div>

            <div className="rounded-2xl border border-border bg-background/60 p-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                4. Показы и график
              </div>
              <div className="mt-3 grid grid-cols-3 rounded-xl border border-border bg-card p-1">
                {(["search", "mixed", "retargeting"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setAudienceMode(mode)}
                    className={`min-h-10 rounded-lg px-2 text-xs font-semibold transition-colors ${
                      audienceMode === mode
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-primary/[0.08]"
                    }`}
                  >
                    {mode === "search"
                      ? "Поиск"
                      : mode === "mixed"
                        ? "Микс"
                        : "Ретарг."}
                  </button>
                ))}
              </div>
              <div className="mt-3 grid gap-2">
                {[
                  [
                    "Поиск",
                    "Горячие запросы по товарам и категориям. Самый безопасный старт.",
                  ],
                  [
                    "Микс",
                    "Поиск плюс аккуратные аудитории после проверки Метрики.",
                  ],
                  [
                    "Ретаргетинг",
                    "Возврат посетителей сайта. Нужны цели и аудитории Метрики.",
                  ],
                ].map(([title, text]) => (
                  <div
                    key={title}
                    className="rounded-xl border border-border bg-card p-2.5"
                  >
                    <div className="text-xs font-semibold text-foreground">
                      {title}
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                      {text}
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-2 grid grid-cols-3 rounded-xl border border-border bg-card p-1">
                {(["business_hours", "all_day", "manual"] as const).map(
                  (mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setSchedule(mode)}
                      className={`min-h-10 rounded-lg px-2 text-xs font-semibold transition-colors ${
                        schedule === mode
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-primary/[0.08]"
                      }`}
                    >
                      {mode === "business_hours"
                        ? "Рабочее"
                        : mode === "all_day"
                          ? "24/7"
                          : "Ручной"}
                    </button>
                  ),
                )}
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <label className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border bg-card px-3 text-xs font-semibold">
                  <input
                    type="checkbox"
                    checked={includeImages}
                    onChange={(event) => setIncludeImages(event.target.checked)}
                    className="h-4 w-4 rounded border-border accent-primary"
                  />
                  Фото в черновик
                </label>
                <label className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border bg-card px-3 text-xs font-semibold">
                  <input
                    type="checkbox"
                    checked={recommendationMode}
                    onChange={(event) =>
                      setRecommendationMode(event.target.checked)
                    }
                    className="h-4 w-4 rounded border-border accent-primary"
                  />
                  Рекомендации ARAY
                </label>
              </div>
              {schedule === "manual" ? (
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  <input
                    value={weekdays}
                    onChange={(event) => setWeekdays(event.target.value)}
                    className="h-10 rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary"
                  />
                  <input
                    type="time"
                    value={timeFrom}
                    onChange={(event) => setTimeFrom(event.target.value)}
                    className="h-10 rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary"
                  />
                  <input
                    type="time"
                    value={timeTo}
                    onChange={(event) => setTimeTo(event.target.value)}
                    className="h-10 rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary"
                  />
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </AdminModal>

      <AdminModal
        open={Boolean(previewOpen)}
        onClose={() => setPreviewOpen(null)}
        title={
          previewOpen === "groups"
            ? "Группы в Direct"
            : previewOpen === "ads"
              ? "Объявления"
              : previewOpen === "keywords"
                ? "Ключевые фразы"
                : "Минус-слова"
        }
        subtitle="Это предпросмотр черновика. В Direct уйдет только выбранный состав, бюджет сам не запускается."
        size="xl"
        modal={false}
        overlayClassName="admin-modal-overlay-aray-safe"
        className="admin-modal-aray-sidecar"
        bodyClassName="p-3 sm:p-4"
      >
        <div className="min-w-0">
          <aside className="hidden rounded-2xl border border-border bg-background/60 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Bot className="h-4 w-4 text-primary" />
              ARAY рядом
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Можно попросить ARAY точечно поправить этот предпросмотр: усилить
              оффер, убрать фразы, изменить акцент.
            </p>
            <textarea
              value={arayEditRequest}
              onChange={(event) => setArayEditRequest(event.target.value)}
              rows={5}
              placeholder="Например: оставь только лиственницу и убери запросы про б/у"
              className="mt-3 min-h-28 w-full resize-none rounded-xl border border-border bg-card px-3 py-2 text-xs outline-none focus:border-primary"
            />
            <button
              type="button"
              onClick={() =>
                copyText(
                  "aray-edit",
                  buildArayEditPrompt(
                    draft?.draft,
                    arayEditRequest,
                    excludedKeywordsText,
                  ),
                )
              }
              className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-semibold hover:bg-primary/[0.08]"
            >
              <Clipboard className="h-3.5 w-3.5" />
              {copyKey === "aray-edit" ? "Команда готова" : "Спросить ARAY"}
            </button>
            <button
              type="button"
              onClick={() => void loadDraft()}
              disabled={loading}
              className="mt-2 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              Применить правки
            </button>
            <div className="mt-4 rounded-xl border border-border bg-card p-3 text-xs leading-relaxed text-muted-foreground">
              <span className="font-semibold text-foreground">
                {excludedKeywordCount}
              </span>{" "}
              фраз в исключениях.
            </div>
          </aside>

          <div className="min-w-0">
            {previewOpen === "groups" ? (
              <div className="grid gap-3 md:grid-cols-2">
                {groups.map((group, index) => (
                  <div
                    key={`${group.name}-${index}`}
                    className="rounded-xl border border-border bg-background/60 p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Группа {index + 1}
                        </div>
                        <div className="mt-1 font-semibold">{group.name}</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {group.productsCount} товаров · {group.ads.length}{" "}
                          объявл. · {group.keywords.length} ключей
                        </div>
                      </div>
                      <CopyButton
                        copied={copyKey === `group-${index}`}
                        onClick={() =>
                          copyText(`group-${index}`, formatGroupText(group))
                        }
                      >
                        Копировать
                      </CopyButton>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {group.keywords.slice(0, 8).map((keyword) => (
                        <span
                          key={keyword}
                          className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground"
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {previewOpen === "ads" ? (
              <div className="space-y-3">
                {groups.map((group, groupIndex) => (
                  <div
                    key={`${group.name}-ads-${groupIndex}`}
                    className="rounded-xl border border-border bg-background/60 p-3"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="text-xs font-semibold text-muted-foreground">
                          {group.name}
                        </div>
                        {generatorMode === "product" && group.products?.[0] ? (
                          <div className="mt-1 text-xs text-muted-foreground">
                            {group.products[0].category} ·{" "}
                            {formatProductPrice(group.products[0].price)}
                          </div>
                        ) : (
                          <div className="mt-1 text-xs text-muted-foreground">
                            {group.productsCount} товаров в группе
                          </div>
                        )}
                      </div>
                      <span className="w-fit rounded-full bg-muted px-2 py-1 text-[11px] text-muted-foreground">
                        {group.ads.length} объявл. · {group.keywords.length}{" "}
                        ключей
                      </span>
                    </div>
                    {generatorMode === "product" ? (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {group.keywords.slice(0, 6).map((keyword) => (
                          <span
                            key={keyword}
                            className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground"
                          >
                            {keyword}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    <div className="mt-3 grid gap-2 md:grid-cols-2">
                      {group.ads.map((ad, adIndex) => (
                        <div
                          key={`${ad.title1}-${adIndex}`}
                          className="rounded-xl border border-border bg-card p-3 text-xs leading-relaxed"
                        >
                          <div className="font-semibold text-foreground">
                            {ad.title1}
                          </div>
                          <div className="text-primary">{ad.title2}</div>
                          <div className="mt-1 text-muted-foreground">
                            {ad.text}
                          </div>
                          <div className="mt-2 break-all text-[11px] text-muted-foreground">
                            {ad.href}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {previewOpen === "keywords" ? (
              <div className="grid gap-3 md:grid-cols-2">
                {groups.map((group, index) => (
                  <div
                    key={`${group.name}-keywords-${index}`}
                    className="rounded-xl border border-border bg-background/60 p-3"
                  >
                    <div className="font-semibold">{group.name}</div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {group.keywords.map((keyword) => (
                        <button
                          key={keyword}
                          type="button"
                          onClick={() => addExcludedKeyword(keyword)}
                          className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground hover:bg-primary/10 hover:text-foreground"
                          title="Добавить в исключения"
                        >
                          {keyword}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {previewOpen === "negative" ? (
              <div className="rounded-xl border border-border bg-background/60 p-3">
                <div className="flex flex-wrap gap-1.5">
                  {(draft?.draft.negativeWords ?? []).map((word) => (
                    <span
                      key={word}
                      className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground"
                    >
                      {word}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </AdminModal>
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
        setPingResult(
          data.results.map((r: any) => `${r.engine}: ${r.status}`).join(" · "),
        );
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

  const askAraySeoNavigator = () => {
    const text = [
      "Давай проверим SEO и индексацию сайта коротко, как помощник рядом.",
      `Сейчас в каталоге ${productCount} товаров. Метрика: ${
        settings.yandex_metrika_id ? `счетчик ${settings.yandex_metrika_id}` : "не указана"
      }.`,
      "Веди по одному шагу: открыть sitemap, проверить robots, открыть Яндекс Вебмастер, открыть Google Search Console, отправить sitemap и посмотреть ошибки.",
      "Объясни честно: ARAY помогает подготовить сайт и отправить sitemap, но не обещает мгновенную индексацию.",
      "Ответь без длинной справки: первый шаг, куда нажать, что увидеть, что вставить если попросят.",
    ].join("\n");

    window.dispatchEvent(new CustomEvent("aray:prompt", { detail: { text } }));
  };

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-primary/25 bg-primary/[0.06] p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Search className="h-4 w-4 text-primary" />
              ARAY: индексация без каши
            </div>
            <p className="mt-2 max-w-3xl text-xs leading-relaxed text-muted-foreground">
              Для владельца это три простых проверки: sitemap доступен,
              поисковики видят сайт, Метрика показывает реальные визиты. ARAY
              ведет по официальным кабинетам и не обещает мгновенный результат.
            </p>
          </div>
          <button
            type="button"
            onClick={askAraySeoNavigator}
            className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Вести по шагам
          </button>
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-4">
          {[
            ["1", "Sitemap", "открыть /sitemap.xml"],
            ["2", "Яндекс", "проверить в Вебмастере"],
            ["3", "Google", "проверить Search Console"],
            ["4", "Метрика", "смотреть реальные визиты"],
          ].map(([step, title, text]) => (
            <div
              key={step}
              className="rounded-xl border border-border bg-card p-3 text-xs"
            >
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {step}
                </span>
                <span className="font-semibold text-foreground">{title}</span>
              </div>
              <p className="mt-2 text-muted-foreground">{text}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <a
            href="/sitemap.xml"
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-9 items-center justify-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-semibold hover:bg-primary/[0.08]"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Открыть sitemap
          </a>
          <a
            href="https://webmaster.yandex.ru/sites/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-9 items-center justify-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-semibold hover:bg-primary/[0.08]"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Яндекс Вебмастер
          </a>
          <a
            href="https://search.google.com/search-console"
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-9 items-center justify-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-semibold hover:bg-primary/[0.08]"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Google Search Console
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {/* Sitemap */}
        <div className="bg-card border border-border rounded-2xl p-4 space-y-2">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-emerald-500" />
          <span className="text-sm font-semibold">Sitemap</span>
          <span className="ml-auto text-xs text-emerald-600 font-medium bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">
            Доступен
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          /sitemap.xml готов к индексации
        </p>
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
          Отправить sitemap
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
          {productCount} товаров в каталоге. Автозаполнение добавит описания
          тем, у кого их нет.
        </p>
        {autoMetaResult && (
          <p className="text-xs text-emerald-600 font-medium">
            {autoMetaResult}
          </p>
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
    <div className="admin-page-frame admin-page-frame-fluid space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-primary" />
          </div>
          <h1 className="font-display font-bold text-2xl">
            Продвижение и трафик
          </h1>
        </div>
        <p className="text-muted-foreground text-sm ml-12">
          Всё что нужно чтобы клиенты вас нашли
        </p>
      </div>

      {/* Section 1: Реклама */}
      <AdvertisingModule />

      {/* Section 2: Что готово к продвижению */}
      <section>
        <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
          <Zap className="w-4 h-4 text-muted-foreground" />
          Что уже готово
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

      {/* Section 3: Бесплатные площадки */}
      <section>
        <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
          <ShoppingBag className="w-4 h-4 text-muted-foreground" />
          Площадки и фиды
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5 gap-3">
          {MARKETPLACES.map((card) => (
            <MarketplaceCardItem key={card.name} card={card} />
          ))}
        </div>
      </section>

      {/* Section 4: Недельный план */}
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

      {/* Section 5: SEO состояние */}
      <section>
        <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
          <Globe className="w-4 h-4 text-muted-foreground" />
          SEO и индексация
        </h2>
        <SeoHealthSection productCount={stats.productCount} />
      </section>
    </div>
  );
}
