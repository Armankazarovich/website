"use client";

import { useState, useEffect } from "react";
import {
  TrendingUp,
  Download,
  ExternalLink,
  CheckCircle2,
  Clock,
  Calendar,
  BarChart2,
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
        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border border-border hover:bg-muted transition-colors"
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
        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/40 transition-colors text-left"
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
            ✓ доступен
          </span>
        </div>
        <p className="text-xs text-muted-foreground">/sitemap.xml готов к индексации</p>
        {pingResult && (
          <p className="text-xs text-emerald-600 font-medium">{pingResult}</p>
        )}
        <button
          onClick={pingSitemap}
          disabled={pinging}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border border-border hover:bg-muted transition-colors disabled:opacity-50"
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
              ✓ подключена
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
          className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border border-border hover:bg-muted transition-colors"
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
          className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border border-border hover:bg-muted transition-colors disabled:opacity-50"
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
    <div className="space-y-8 max-w-5xl">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
