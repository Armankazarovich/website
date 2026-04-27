"use client";

/**
 * AraySettingsPopup + AraySettingsTrigger
 *
 * Первый эталон левых попапов админки (видение из visions/aray-pinned-rail.md).
 * Шестерёнка в шапке → попап выезжает слева на 30% ширины (на мобилке fullscreen).
 * Главная не закрывается — сжимается. Арай в pinned-rail остаётся справа.
 *
 * Содержит 3 вкладки:
 *  - Тарифы: 3 уровня (Старт/Профи/Бизнес), текущий выделен. Пока заглушка для
 *    будущей монетизации Арая на платформе aray.online — для Стройматериалов и
 *    других тенантов.
 *  - Расходы: реальные цифры из ArayTokenLog за сегодня/месяц + токены.
 *  - Модели: используемые AI-модели с описанием зачем нужна каждая.
 *
 * Закрытие: Escape, клик по backdrop, кнопка X.
 *
 * Сессия 38 (27.04.2026), Заход A полировки Дома Арая.
 */

import { useEffect, useState } from "react";
import {
  Settings, X, Wallet, Cpu, Sparkles, Check, Volume2,
} from "lucide-react";

export type AraySettingsData = {
  todayCostRub: number;
  monthCostRub: number;
  todayInputTokens: number;
  todayOutputTokens: number;
  todayCallsCount: number;
  activeSubs: number;
  currentPlan: "start" | "pro" | "business";
};

type Tab = "plans" | "costs" | "models";

const TABS: { id: Tab; label: string }[] = [
  { id: "plans", label: "Тарифы" },
  { id: "costs", label: "Расходы" },
  { id: "models", label: "Модели" },
];

function formatRub(v: number): string {
  if (!Number.isFinite(v)) return "0 ₽";
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(v);
}

function formatNum(v: number): string {
  return new Intl.NumberFormat("ru-RU").format(v);
}

// ─── Trigger (шестерёнка в шапке) ─────────────────────────────────────────

export function AraySettingsTrigger({ data }: { data: AraySettingsData }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener("aray:settings:open", onOpen);
    return () => window.removeEventListener("aray:settings:open", onOpen);
  }, []);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        type="button"
        className="w-9 h-9 rounded-xl border border-border hover:border-primary/40 hover:bg-muted/40 flex items-center justify-center transition-colors text-muted-foreground hover:text-foreground"
        aria-label="Настройки Арая"
        title="Настройки Арая"
      >
        <Settings className="w-4 h-4" />
      </button>
      {open && <AraySettingsPopup data={data} onClose={() => setOpen(false)} />}
    </>
  );
}

// ─── Popup (slide-in слева) ───────────────────────────────────────────────

function AraySettingsPopup({
  data,
  onClose,
}: {
  data: AraySettingsData;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>("plans");
  const [mounted, setMounted] = useState(false);

  // Заводим анимацию: на mount ставим mounted=true чтобы CSS перевёл из -100% в 0%.
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Escape для закрытия
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Блокируем скролл body пока попап открыт
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[60]"
      role="dialog"
      aria-modal="true"
      aria-label="Настройки Арая"
    >
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-200 ${
          mounted ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />

      {/* Popup panel — slide from left */}
      <aside
        className={`absolute top-0 left-0 h-full bg-card border-r border-border shadow-2xl flex flex-col transition-transform duration-250 ease-out`}
        style={{
          width: "min(420px, 90vw)",
          transform: mounted ? "translateX(0)" : "translateX(-100%)",
          transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border shrink-0">
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Settings className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-foreground leading-tight">
              Настройки Арая
            </h2>
            <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
              Тарифы · расходы · модели
            </p>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shrink-0"
            aria-label="Закрыть настройки"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 px-5 pt-3 border-b border-border shrink-0">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              type="button"
              className={`px-3 py-2 text-xs font-medium rounded-t-lg transition-colors border-b-2 -mb-px ${
                tab === t.id
                  ? "text-primary border-primary"
                  : "text-muted-foreground border-transparent hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {tab === "plans" && <PlansTab data={data} />}
          {tab === "costs" && <CostsTab data={data} />}
          {tab === "models" && <ModelsTab />}
        </div>
      </aside>
    </div>
  );
}

// ─── Tab content ──────────────────────────────────────────────────────────

function PlansTab({ data }: { data: AraySettingsData }) {
  return (
    <div className="space-y-3">
      <p className="text-[11px] text-muted-foreground leading-relaxed mb-2">
        Тарифы как у мировых AI-сервисов. Внутри ПилоРуса Арай пока бесплатный
        — это плейсхолдер для будущей платформы (Стройматериалы и aray.online).
      </p>

      <PlanCard
        name="Старт"
        price="бесплатно"
        priceSub=""
        features={[
          "Чат текстом",
          "100 запросов в день",
          "Базовые ответы",
        ]}
        current={data.currentPlan === "start"}
      />
      <PlanCard
        name="Профи"
        price="2 990 ₽"
        priceSub="в месяц"
        features={[
          "Голос ElevenLabs",
          "Безлимит запросов",
          "Поиск по магазину",
          "Сводки и отчёты дня",
          "Sonnet 4.6 + Opus 4.6",
        ]}
        current={data.currentPlan === "pro"}
        accent
      />
      <PlanCard
        name="Бизнес"
        price="9 900 ₽"
        priceSub="в месяц"
        features={[
          "Всё из Профи",
          "Команда до 10 человек",
          "Видео и генерация фото",
          "API для интеграций",
          "Приоритет поддержки",
        ]}
        current={data.currentPlan === "business"}
      />
    </div>
  );
}

function PlanCard({
  name,
  price,
  priceSub,
  features,
  current,
  accent,
}: {
  name: string;
  price: string;
  priceSub: string;
  features: string[];
  current?: boolean;
  accent?: boolean;
}) {
  const border = current
    ? "border-primary"
    : accent
      ? "border-primary/40"
      : "border-border";
  const bg = current ? "bg-primary/5" : "bg-card";

  return (
    <div className={`rounded-2xl border ${border} ${bg} p-4`}>
      <div className="flex items-baseline justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">{name}</span>
          {current && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-primary text-primary-foreground">
              текущий
            </span>
          )}
        </div>
        <div className="text-right">
          <div className="text-sm font-semibold text-foreground tabular-nums">
            {price}
          </div>
          {priceSub && (
            <div className="text-[10px] text-muted-foreground">{priceSub}</div>
          )}
        </div>
      </div>
      <ul className="space-y-1.5">
        {features.map((f) => (
          <li
            key={f}
            className="flex items-start gap-2 text-[12px] text-muted-foreground"
          >
            <Check className="w-3 h-3 text-primary shrink-0 mt-0.5" />
            <span className="leading-snug">{f}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CostsTab({ data }: { data: AraySettingsData }) {
  return (
    <div className="space-y-3">
      <p className="text-[11px] text-muted-foreground leading-relaxed mb-2">
        Сколько Арай тратит на API. Чем чаще общаешься — тем больше токенов
        уходит. Это нормально, бюджет под контролем.
      </p>

      <div className="bg-muted/30 border border-border rounded-2xl p-4">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">
          Расход сегодня
        </div>
        <div className="text-2xl font-bold text-foreground tabular-nums">
          {formatRub(data.todayCostRub)}
        </div>
        {(data.todayInputTokens > 0 || data.todayOutputTokens > 0) && (
          <div className="text-[11px] text-muted-foreground mt-2">
            {formatNum(data.todayInputTokens)} вход
            <span className="opacity-50 mx-1">·</span>
            {formatNum(data.todayOutputTokens)} ответ
          </div>
        )}
        <div className="text-[11px] text-muted-foreground mt-1">
          Вызовов API: {data.todayCallsCount}
        </div>
      </div>

      <div className="bg-muted/30 border border-border rounded-2xl p-4">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">
          Расход за месяц
        </div>
        <div className="text-2xl font-bold text-foreground tabular-nums">
          {formatRub(data.monthCostRub)}
        </div>
        <div className="text-[11px] text-muted-foreground mt-2">
          Активных подписок: {data.activeSubs}
        </div>
      </div>

      <a
        href="/admin/aray/costs"
        className="block bg-card border border-border rounded-2xl p-4 hover:border-primary/40 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Wallet className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-foreground">
              Подробный дашборд расходов
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              Графики, прогноз на месяц, разбивка по моделям
            </div>
          </div>
        </div>
      </a>
    </div>
  );
}

function ModelsTab() {
  return (
    <div className="space-y-3">
      <p className="text-[11px] text-muted-foreground leading-relaxed mb-2">
        Какие модели работают внутри Арая и зачем каждая нужна. Маршрутизация
        автоматическая — Sonnet для повседневного, Opus для сложного анализа.
      </p>

      <ModelCard
        icon={Sparkles}
        name="Claude Sonnet 4.6"
        provider="Anthropic"
        purpose="Повседневный чат, поиск, сводки. 90% запросов идёт сюда."
      />
      <ModelCard
        icon={Cpu}
        name="Claude Opus 4.6"
        provider="Anthropic"
        purpose="Сложный анализ, многошаговые задачи. Подключается автоматически."
      />
      <ModelCard
        icon={Volume2}
        name="ElevenLabs · Multilingual v2"
        provider="ElevenLabs"
        purpose="Голос Арая — натуральная речь с эмоциями. Голосовой режим."
      />
    </div>
  );
}

function ModelCard({
  icon: Icon,
  name,
  provider,
  purpose,
}: {
  icon: React.ElementType;
  name: string;
  provider: string;
  purpose: string;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-foreground">{name}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground font-medium">
              {provider}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
            {purpose}
          </p>
        </div>
      </div>
    </div>
  );
}
