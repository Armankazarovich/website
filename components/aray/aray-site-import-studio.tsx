"use client";

import { FormEvent, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  FileText,
  Globe2,
  ImageIcon,
  Layers3,
  Loader2,
  MessageCircle,
  Package,
  Receipt,
  ScanSearch,
  Sparkles,
  Store,
} from "lucide-react";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { Button } from "@/components/ui/button";

type SiteScan = {
  finalUrl: string;
  domain: string;
  title: string;
  description: string;
  businessType: string;
  confidence: "ready" | "needs-brief";
  contacts: {
    phones: string[];
    emails: string[];
  };
  products: string[];
  categories: string[];
  promotions: string[];
  images: Array<{ src: string; alt: string }>;
  signals: string[];
  warnings: string[];
  nextSteps: string[];
};

type ImportedSite = {
  tenantId: string;
  name: string;
  status: string;
  domain: string;
  previewHref: string;
  adminHref: string;
};

type MultisiteClone = {
  site: {
    tenantId: string;
    name: string;
    status: string;
    domain: string;
    requestedDomain: string;
    previewHref: string;
    adminHref: string;
  };
  report: {
    counts: Record<string, number>;
    warnings: string[];
  };
};

const businessTypeLabel: Record<string, string> = {
  lumber: "пиломатериалы",
  construction: "стройка",
  restaurant: "еда",
  retail: "магазин",
  services: "услуги",
  beauty: "красота",
  universal: "универсальный сайт",
};

const launchStartMethods = [
  {
    title: "Скан сайта",
    text: "Есть домен или старый сайт. ARAY соберет товары, услуги, контакты и первый бриф.",
    tag: "быстро",
    href: "#aray-site-import",
    icon: Globe2,
  },
  {
    title: "QUIZ с Араем",
    text: "Сайта нет. ARAY задаст вопросы и соберет бриф.",
    tag: "без сайта",
    href: "/admin/aray/briefs",
    icon: MessageCircle,
  },
  {
    title: "Заявка из CRM",
    text: "Клиент уже написал. Берем заявку и запускаем путь.",
    tag: "из лида",
    href: "/admin/crm",
    icon: Receipt,
  },
  {
    title: "Новый сайт",
    text: "ARAY создает отдельный сайт: страницы, заявки, CRM, PWA, админку и настройки под сферу клиента.",
    tag: "полная система",
    href: "#aray-site-factory",
    icon: FileText,
  },
];

const launchPathSteps = ["Бриф", "Сборка", "Проверка", "Домен"];

const cloneCountLabels: Record<string, string> = {
  categories: "Категории",
  products: "Товары",
  siteSettings: "Настройки",
  promotions: "Акции",
  deliveryRates: "Доставка",
  services: "Услуги",
  posts: "Материалы",
  businessRoles: "Роли",
  notificationRolePreferences: "Уведомления",
  notificationRoleSchedules: "Графики",
  notificationAudiencePreferences: "Аудитории",
  arayModuleStates: "Модули ARAY",
  terminalConnectors: "Терминал",
  workflows: "Автоматизации",
  documentTemplates: "Документы",
  reportSchedules: "Отчеты",
  crmHints: "CRM",
  stories: "Блоки сайта",
  storyRelations: "Связки блоков",
};

const launchHowItWorks = [
  {
    title: "1. Вход",
    text: "Даем домен, заявку CRM, QUIZ или короткий бриф. Этого достаточно, чтобы начать.",
  },
  {
    title: "2. Сборка",
    text: "ARAY создает отдельный сайт с каталогом, заявками, CRM, PWA, ролями и уведомлениями.",
  },
  {
    title: "3. Проверка",
    text: "Открываем сайт и админку, правим материалы, потом подтверждаем домен и запуск.",
  },
];

const launchOutputItems = [
  "Сайт",
  "Админка",
  "Каталог",
  "Корзина",
  "Заявки",
  "CRM",
  "PWA",
  "Уведомления",
  "Аналитика",
  "Домен после проверки",
];

const createdSiteNextSteps = [
  "Заполнить недостающие контакты, прайс, фото и тексты",
  "Открыть сайт и проверить главную, каталог, заявку и мобильный вид",
  "После подтверждения подключить домен и перевести сайт в запуск",
];

export function AraySiteImportStudio() {
  const searchParams = useSearchParams();
  const [url, setUrl] = useState("");
  const [scan, setScan] = useState<SiteScan | null>(null);
  const [site, setSite] = useState<ImportedSite | null>(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"scan" | "draft">("scan");
  const [error, setError] = useState("");
  const [cloneName, setCloneName] = useState("");
  const [cloneDomain, setCloneDomain] = useState("");
  const [cloneBrief, setCloneBrief] = useState("");
  const [cloneLoading, setCloneLoading] = useState(false);
  const [cloneError, setCloneError] = useState("");
  const [cloneResult, setCloneResult] = useState<MultisiteClone | null>(null);
  const [confirmDraftOpen, setConfirmDraftOpen] = useState(false);
  const [confirmCloneOpen, setConfirmCloneOpen] = useState(false);

  useEffect(() => {
    const domainFromChat = (searchParams.get("domain") || searchParams.get("url") || "").trim();
    if (!domainFromChat) return;
    setUrl((current) => current.trim() === domainFromChat ? current : domainFromChat);
    setCloneDomain((current) => current.trim() ? current : domainFromChat);
  }, [searchParams]);

  async function runImport(createDraft: boolean) {
    setConfirmDraftOpen(false);
    setLoading(true);
    setMode(createDraft ? "draft" : "scan");
    setError("");
    setSite(null);

    try {
      const response = await fetch("/api/admin/aray/launch/site-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, createDraft, confirm: createDraft }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Не удалось просканировать сайт");
      }

      setScan(data.scan as SiteScan);
      setSite(data.site as ImportedSite | null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось просканировать сайт");
    } finally {
      setLoading(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!url.trim() || loading) return;
    void runImport(false);
  }

  function submitClone(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (cloneLoading) return;

    const hasInput = cloneName.trim() || cloneDomain.trim() || cloneBrief.trim();
    if (!hasInput) {
      setCloneError("Напишите название сайта, домен или короткий Brief");
      return;
    }

    setCloneError("");
    setConfirmCloneOpen(true);
  }

  async function createClone() {
    setConfirmCloneOpen(false);
    setCloneLoading(true);
    setCloneError("");
    setCloneResult(null);

    try {
      const response = await fetch("/api/admin/aray/launch/multisite-clone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteName: cloneName,
          domain: cloneDomain,
          brief: cloneBrief,
          confirm: true,
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Не удалось создать сайт на базе ARAY");
      }

      const result = data as MultisiteClone & { ok: true };
      setCloneResult(result);

      try {
        localStorage.setItem("aray-active-site", result.site.tenantId);
        document.cookie = `aray-active-site=${encodeURIComponent(result.site.tenantId)}; Max-Age=31536000; Path=/; SameSite=Lax`;
        window.dispatchEvent(new CustomEvent("aray:active-site-change", {
          detail: {
            tenantId: result.site.tenantId,
            title: result.site.name,
            domain: result.site.domain,
          },
        }));
      } catch {}
    } catch (err) {
      setCloneError(err instanceof Error ? err.message : "Не удалось создать сайт на базе ARAY");
    } finally {
      setCloneLoading(false);
    }
  }

  return (
    <section id="aray-site-import" className="scroll-mt-24 rounded-2xl border border-primary/25 bg-card p-5 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            Создать новый сайт
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Один спокойный запуск: домен, QUIZ, заявка CRM или короткий Brief. ARAY соберет бриф, сайт, CRM, PWA и проверку без лишних экранов.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {launchPathSteps.map((step, index) => (
              <span key={step} className="inline-flex min-h-8 items-center gap-2 rounded-full border border-border bg-background px-3 text-xs font-semibold text-foreground">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[11px] text-primary">
                  {index + 1}
                </span>
                {step}
              </span>
            ))}
          </div>
        </div>
        {scan ? (
          <span className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${
            scan.confidence === "ready"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : "border-amber-500/30 bg-amber-500/10 text-amber-300"
          }`}>
            <CheckCircle2 className="h-3.5 w-3.5" />
            {scan.confidence === "ready" ? "можно собирать" : "нужно уточнить"}
          </span>
        ) : null}
      </div>

      <div className="mt-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Как начать проект
        </p>
        <div className="mt-2 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          {launchStartMethods.map((method) => {
            const Icon = method.icon;
            return (
              <a
                key={method.title}
                href={method.href}
                className="group rounded-xl border border-border bg-background px-3 py-3 transition-colors hover:border-primary/35 hover:bg-primary/[0.035]"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-primary">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="rounded-full border border-border bg-card px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                    {method.tag}
                  </span>
                </div>
                <p className="mt-3 text-sm font-semibold text-foreground">{method.title}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{method.text}</p>
              </a>
            );
          })}
        </div>
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
        <div className="rounded-2xl border border-border bg-background p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
            Как это работает
          </p>
          <div className="mt-3 grid gap-2 md:grid-cols-3">
            {launchHowItWorks.map((item) => (
              <div key={item.title} className="rounded-xl border border-border bg-card px-3 py-3">
                <p className="text-sm font-semibold text-foreground">{item.title}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-primary/20 bg-primary/[0.035] p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
            Что получится
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {launchOutputItems.map((item) => (
              <span key={item} className="inline-flex min-h-8 items-center rounded-full border border-border bg-background px-3 text-xs font-semibold text-foreground">
                {item}
              </span>
            ))}
          </div>
          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            Оплаты, домен, удаление данных и боевой запуск остаются только через подтверждение.
          </p>
        </div>
      </div>

      <form
        id="aray-site-factory"
        onSubmit={submitClone}
        className="mt-5 scroll-mt-24 rounded-2xl border border-primary/25 bg-primary/[0.035] p-4"
      >
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              <Layers3 className="h-4 w-4" />
              Запуск ARAY CMS
            </p>
            <h3 className="mt-2 text-lg font-semibold text-foreground">
              Новый сайт в ARAY CMS
            </h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              ARAY создает отдельный проект: каталог, заявки, CRM, PWA, роли, уведомления и админку. Brief меняет сферу, товары, тексты, стиль и домен. Данные клиента стартуют чисто и не смешиваются с другими сайтами.
            </p>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/30 bg-background px-3 py-1 text-xs font-semibold text-primary">
            <Store className="h-3.5 w-3.5" />
            отдельный сайт
          </span>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,0.8fr)]">
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Название проекта
            </span>
            <input
              value={cloneName}
              onChange={(event) => setCloneName(event.target.value)}
              placeholder="Например: Магазин стройматериалов клиента"
              className="mt-1 min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-semibold text-foreground outline-none transition focus:border-primary/50"
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Домен, если уже есть
            </span>
            <input
              value={cloneDomain}
              onChange={(event) => setCloneDomain(event.target.value)}
              placeholder="client-domain.ru"
              className="mt-1 min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-semibold text-foreground outline-none transition focus:border-primary/50"
            />
          </label>
        </div>

        <label className="mt-3 block">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Brief для сайта
          </span>
          <textarea
            value={cloneBrief}
            onChange={(event) => setCloneBrief(event.target.value)}
            placeholder="Например: нужен магазин стройматериалов в Минске, товары из прайса клиента, стиль строгий, заявки в CRM, PWA и отдельная админка."
            rows={4}
            className="mt-1 w-full resize-none rounded-xl border border-border bg-background px-3 py-3 text-sm leading-6 text-foreground outline-none transition focus:border-primary/50"
          />
        </label>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs leading-5 text-muted-foreground">
            Личные клиенты, оплаты и история других сайтов не копируются. Новый сайт стартует чистым, но с рабочей системой.
          </div>
          <Button type="submit" disabled={cloneLoading} className="min-h-11 shrink-0">
            {cloneLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Создать сайт в ARAY
          </Button>
        </div>
        <ConfirmDialog
          open={confirmCloneOpen}
          onClose={() => setConfirmCloneOpen(false)}
          onConfirm={() => void createClone()}
          title="Создать новый сайт?"
          description="ARAY создаст отдельный сайт на базе текущего проекта и оставит его на проверке."
          confirmLabel="Создать сайт"
          variant="warning"
          loading={cloneLoading}
        />

        {cloneError ? (
          <div className="admin-alert admin-alert-danger mt-4 flex gap-3 px-3 py-3 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{cloneError}</span>
          </div>
        ) : null}

        {cloneResult ? (
          <div className="mt-4 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="flex items-center gap-2 text-sm font-semibold text-emerald-300">
                  <CheckCircle2 className="h-4 w-4" />
                  Сайт создан: {cloneResult.site.name}
                </p>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  Рабочий адрес: <span className="font-semibold text-foreground">{cloneResult.site.domain}</span> · сайт на проверке
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <a
                  href={cloneResult.site.adminHref}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-primary px-3 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90"
                >
                  Админка
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
                <a
                  href={cloneResult.site.previewHref}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-border bg-background px-3 text-xs font-semibold text-foreground transition hover:border-primary/40"
                >
                  Открыть сайт
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {Object.entries(cloneResult.report.counts)
                .filter(([, value]) => value > 0)
                .slice(0, 10)
                .map(([key, value]) => {
                  const label = cloneCountLabels[key] || "Раздел";
                  return (
                    <span key={key} className="rounded-full border border-emerald-500/25 bg-background px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                      {label}: {value}
                    </span>
                  );
                })}
            </div>
            <div className="mt-4 grid gap-2 md:grid-cols-3">
              {createdSiteNextSteps.map((step, index) => (
                <div key={step} className="flex gap-3 rounded-xl border border-emerald-500/20 bg-background px-3 py-3 text-xs leading-5 text-muted-foreground">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-xs font-semibold text-emerald-300">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </form>

      <form onSubmit={submit} className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto]">
        <label className="block">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Домен клиента
          </span>
          <input
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="example.ru"
            className="mt-1 min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-semibold text-foreground outline-none transition focus:border-primary/50"
          />
        </label>
        <Button type="submit" className="self-end" disabled={loading || !url.trim()}>
          {loading && mode === "scan" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanSearch className="h-4 w-4" />}
          Сканировать
        </Button>
        <Button
          type="button"
          variant="outline"
          className="self-end bg-background/80"
          disabled={loading || !url.trim()}
          onClick={() => setConfirmDraftOpen(true)}
        >
          {loading && mode === "draft" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Собрать сайт по скану
        </Button>
      </form>
      <ConfirmDialog
        open={confirmDraftOpen}
        onClose={() => setConfirmDraftOpen(false)}
        onConfirm={() => void runImport(true)}
        title="Создать сайт по скану?"
        description="ARAY просканирует источник и создаст отдельный черновик сайта для проверки."
        confirmLabel="Создать черновик"
        variant="warning"
        loading={loading}
      />

      {error ? (
        <div className="admin-alert admin-alert-danger mt-4 flex gap-3 px-3 py-3 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      {scan ? (
        <div className="mt-5 grid gap-3 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                  {scan.domain}
                </p>
                <h3 className="mt-1 text-base font-semibold text-foreground">{scan.title}</h3>
                {scan.description ? (
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{scan.description}</p>
                ) : null}
              </div>
              <a
                href={scan.finalUrl}
                target="_blank"
                className="inline-flex min-h-9 shrink-0 items-center justify-center gap-2 rounded-xl border border-border bg-background px-3 text-xs font-semibold text-foreground transition hover:border-primary/40 hover:text-primary"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Источник
              </a>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-border bg-background px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">сфера</p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {businessTypeLabel[scan.businessType] || scan.businessType}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-background px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">товары/услуги</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{scan.products.length + scan.categories.length}</p>
              </div>
              <div className="rounded-xl border border-border bg-background px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">акции</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{scan.promotions.length}</p>
              </div>
              <div className="rounded-xl border border-border bg-background px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">фото</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{scan.images.length}</p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-border bg-background p-3">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  <Package className="h-3.5 w-3.5 text-primary" />
                  найдено
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {[...scan.categories, ...scan.products, ...scan.promotions].slice(0, 14).map((item) => (
                    <span key={item} className="rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
                      {item}
                    </span>
                  ))}
                  {scan.categories.length + scan.products.length + scan.promotions.length === 0 ? (
                    <span className="text-xs leading-5 text-muted-foreground">уточним через бриф</span>
                  ) : null}
                </div>
              </div>

              <div className="rounded-xl border border-border bg-background p-3">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  <ImageIcon className="h-3.5 w-3.5 text-primary" />
                  материалы
                </div>
                <div className="mt-3 grid gap-2">
                  {scan.signals.slice(0, 5).map((signal) => (
                    <div key={signal} className="flex gap-2 text-xs leading-5 text-muted-foreground">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                      <span>{signal}</span>
                    </div>
                  ))}
                  {scan.signals.length === 0 ? (
                    <p className="text-xs leading-5 text-muted-foreground">материалы подтвердим вручную</p>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4">
            <h3 className="text-sm font-semibold text-foreground">Следующие шаги ARAY</h3>
            <div className="mt-3 grid gap-2">
              {scan.nextSteps.map((step, index) => (
                <div key={step} className="flex gap-3 rounded-xl border border-border bg-background px-3 py-3 text-xs leading-5 text-muted-foreground">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-xs font-semibold text-primary">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </div>
              ))}
            </div>

            {scan.warnings.length > 0 ? (
              <div className="mt-3 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-300">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Что уточнить
                </div>
                <div className="mt-2 grid gap-1.5">
                  {scan.warnings.map((warning) => (
                    <p key={warning} className="text-xs leading-5 text-muted-foreground">{warning}</p>
                  ))}
                </div>
              </div>
            ) : null}

            {site ? (
              <div className="mt-3 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-3">
                <p className="text-xs font-semibold text-emerald-300">Сайт создан для проверки</p>
                <p className="mt-1 break-words text-xs text-muted-foreground">{site.domain}</p>
                <div className="mt-3 grid gap-2">
                  <a
                    href={site.previewHref}
                    target="_blank"
                    className="inline-flex min-h-9 items-center justify-center gap-2 rounded-xl border border-emerald-500/25 bg-background px-3 text-xs font-semibold text-foreground transition hover:border-primary/40 hover:text-primary"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Открыть сайт
                  </a>
                  <a
                    href={site.adminHref}
                    className="inline-flex min-h-9 items-center justify-center gap-2 rounded-xl border border-emerald-500/25 bg-background px-3 text-xs font-semibold text-foreground transition hover:border-primary/40 hover:text-primary"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Админка сайта
                  </a>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
