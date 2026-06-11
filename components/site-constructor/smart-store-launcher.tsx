"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  CheckCircle2,
  ClipboardList,
  Copy,
  Eye,
  FileUp,
  ImageIcon,
  Network,
  Palette,
  Plus,
  Rocket,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Store,
  UploadCloud,
  UserPlus,
} from "lucide-react";
import { requestArayPrompt } from "@/components/store/aray-events";
import { slugify } from "@/lib/slug";
import { cn } from "@/lib/utils";
import type {
  StoreConstructorBlueprint,
  StoreConstructorBusinessType,
  StoreConstructorImportColumn,
  StoreConstructorQuestionnaireGroup,
} from "@/lib/store-constructor-blueprints";

type SmartStoreLauncherProps = {
  blueprints: StoreConstructorBlueprint[];
  questionnaire: StoreConstructorQuestionnaireGroup[];
  importColumns: StoreConstructorImportColumn[];
  referralSource?: string;
  mode?: "admin" | "public";
};

type NetworkMode = "single" | "network";
type WizardStep = "brief" | "assets" | "style" | "launch";

type SmartStoreForm = {
  networkMode: NetworkMode;
  networkName: string;
  storeName: string;
  siteCode: string;
  businessType: StoreConstructorBusinessType;
  city: string;
  domain: string;
  contactName: string;
  phone: string;
  email: string;
  warehouse: string;
  workHours: string;
  delivery: string;
  payment: string;
  accentColor: string;
  logoName: string;
  priceFileName: string;
  priceFileSize: number;
  managerName: string;
  referralCode: string;
  rewardPlan: string;
  notes: string;
};

type PublishedSite = SmartStoreForm & {
  id: string;
  tenantId: string;
  networkId: string;
  createdAt: string;
  referralSource: string;
  status: "draft" | "published";
};

type StoredLauncherState = {
  form?: Partial<SmartStoreForm>;
  brief?: string;
  sites?: PublishedSite[];
  previewReady?: boolean;
};

const STORAGE_KEY = "store-constructor-smart-application-v1";

function makeId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function simpleSlug(value: string, fallback = "store") {
  const clean = value
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/\..*$/, "");
  return slugify(clean).slice(0, 40) || fallback;
}

function isDomain(value: string) {
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(value.trim());
}

function formatFileSize(size: number) {
  if (!size) return "";
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} КБ`;
  return `${(size / 1024 / 1024).toFixed(1)} МБ`;
}

function createInitialForm(blueprints: StoreConstructorBlueprint[]): SmartStoreForm {
  const preferred = blueprints.find((blueprint) => blueprint.key === "construction") ?? blueprints[0];

  return {
    networkMode: "single",
    networkName: "",
    storeName: "Магазин стройматериалов",
    siteCode: "main",
    businessType: preferred?.key ?? "construction",
    city: "Воронеж",
    domain: "",
    contactName: "",
    phone: "",
    email: "",
    warehouse: "",
    workHours: "Пн-Сб 9:00-18:00",
    delivery: "Доставка по городу и области, самовывоз со склада",
    payment: "Наличные, перевод, счет для юрлиц",
    accentColor: "hsl(var(--primary))",
    logoName: "",
    priceFileName: "",
    priceFileSize: 0,
    managerName: "",
    referralCode: "",
    rewardPlan: "Процент после оплаты клиента",
    notes: "Запуск ARAY CMS: каталог, корзина, заявки, админка и помощник Арай.",
  };
}

function buildPreviewHref(form: SmartStoreForm, referralSource: string, tenantId: string, networkId: string) {
  const params = new URLSearchParams({
    tenantId,
    networkId,
    businessType: form.businessType,
    name: form.storeName,
    city: form.city,
    domain: form.domain || `${tenantId}.aray-cms.local`,
    referralSource,
  });
  return `/aray-production/preview?${params.toString()}`;
}

export function SmartStoreLauncher({
  blueprints,
  questionnaire,
  importColumns,
  referralSource = "ARAY CMS",
  mode = "admin",
}: SmartStoreLauncherProps) {
  const initialForm = useMemo(() => createInitialForm(blueprints), [blueprints]);
  const [form, setForm] = useState<SmartStoreForm>(initialForm);
  const [sites, setSites] = useState<PublishedSite[]>([]);
  const [previewReady, setPreviewReady] = useState(false);
  const [logoPreview, setLogoPreview] = useState("");
  const [publicOrigin, setPublicOrigin] = useState("https://aray-cms.local");
  const [activeSiteId, setActiveSiteId] = useState("");
  const [requestedTenantId, setRequestedTenantId] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [notice, setNotice] = useState("");
  const [assistantNotice, setAssistantNotice] = useState("Арай рядом. Идем спокойно: сначала бизнес, потом файлы, потом вид, потом запуск.");
  const [activeStep, setActiveStep] = useState<WizardStep>("brief");
  const [guideMode, setGuideMode] = useState(true);
  const [oneBrief, setOneBrief] = useState(
    "Нужен магазин стройматериалов в Воронеже, домен client-site.ru. Нужны заявки, корзина, доставка, PWA-приложение, CRM и админка ARAY CMS.",
  );

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved) as StoredLauncherState;
      setForm({ ...initialForm, ...parsed.form });
      if (parsed.brief) setOneBrief(parsed.brief);
      setSites(Array.isArray(parsed.sites) ? parsed.sites.slice(0, 20) : []);
      setPreviewReady(Boolean(parsed.previewReady));
    } catch {}
  }, [initialForm]);

  useEffect(() => {
    setPublicOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tenant = params.get("tenant") || params.get("tenantId") || params.get("site");
    if (tenant) setRequestedTenantId(tenant);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref") || params.get("partner") || params.get("referral");
    const manager = params.get("manager") || params.get("managerName");
    if (!ref && !manager) return;

    setForm((current) => ({
      ...current,
      managerName: current.managerName || manager || "",
      referralCode: current.referralCode || (ref ? simpleSlug(ref, "") : ""),
    }));
    setAssistantNotice("Арай увидел реферальную ссылку. Заявка, сайт и CRM будут привязаны к этому менеджеру.");
  }, []);

  useEffect(() => {
    if (mode !== "admin") return;
    let cancelled = false;

    async function loadServerSites() {
      try {
        const response = await fetch("/api/admin/site-constructor/sites", { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json();
        if (!cancelled && Array.isArray(data?.sites)) {
          setSites(data.sites.slice(0, 20));
        }
      } catch {}
    }

    void loadServerSites();
    return () => {
      cancelled = true;
    };
  }, [mode]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ form, brief: oneBrief, sites, previewReady }));
    } catch {}
  }, [form, oneBrief, sites, previewReady]);

  useEffect(() => {
    return () => {
      if (logoPreview.startsWith("blob:")) URL.revokeObjectURL(logoPreview);
    };
  }, [logoPreview]);

  const selectedBlueprint = blueprints.find((blueprint) => blueprint.key === form.businessType) ?? blueprints[0];
  const requiredColumns = importColumns.filter((column) => column.required);
  const domainReady = isDomain(form.domain);
  const contactReady = Boolean(form.phone.trim() || form.email.trim());
  const siteSlug = simpleSlug(form.siteCode || form.domain || form.storeName, "store");
  const networkSlug = simpleSlug(form.networkName || form.siteCode || form.storeName, "network");
  const tenantId = siteSlug;
  const networkId = form.networkMode === "network" ? `network-${networkSlug}` : "single";
  const previewHref = buildPreviewHref(form, referralSource, tenantId, networkId);
  const priceLabel = form.priceFileName
    ? `${form.priceFileName}${form.priceFileSize ? `, ${formatFileSize(form.priceFileSize)}` : ""}`
    : "Прайс пока не загружен";
  const partnerCode = simpleSlug(form.referralCode || form.managerName || "partner", "partner");
  const referralParams = new URLSearchParams({ ref: partnerCode });
  if (form.managerName.trim()) referralParams.set("manager", form.managerName.trim());
  const referralLink = `${publicOrigin}/aray-production?${referralParams.toString()}`;
  const referralPipeline = ["Клиент по ссылке", "Бриф в CRM", "Сайт собран", "Оплата", "Выплата"];
  const isolationRows = [
    { label: "Сайт", value: tenantId, detail: "отдельные товары, заказы и настройки" },
    { label: "Сеть", value: networkId, detail: "общий бренд, если точек несколько" },
    { label: "Реферал", value: form.referralCode || "не указан", detail: "чей клиент и кому выплата" },
  ];

  const readinessItems = [
    { id: "business", label: "Бизнес", ready: Boolean(form.storeName.trim() && form.city.trim()) },
    { id: "contact", label: "Контакт", ready: contactReady },
    { id: "catalog", label: "Прайс", ready: Boolean(form.priceFileName) },
    { id: "domain", label: "Домен", ready: domainReady },
    { id: "tenant", label: "База сайта", ready: Boolean(tenantId && networkId) },
  ];
  const readyCount = readinessItems.filter((item) => item.ready).length;
  const progress = Math.round((readyCount / readinessItems.length) * 100);
  const missingReadinessLabels = readinessItems.filter((item) => !item.ready).map((item) => item.label);

  const wizardSteps: { id: WizardStep; label: string; title: string; description: string; ready: boolean }[] = [
    {
      id: "brief",
      label: "1",
      title: "Бизнес",
      description: "Название, ниша, город и домен.",
      ready: Boolean(form.storeName.trim() && form.city.trim()),
    },
    {
      id: "assets",
      label: "2",
      title: "Файлы",
      description: "Контакт, логотип и прайс.",
      ready: contactReady || Boolean(form.priceFileName || form.logoName),
    },
    {
      id: "style",
      label: "3",
      title: "Вид",
      description: "Подача, цвет, доставка и оплата.",
      ready: Boolean(form.delivery.trim() && form.payment.trim()),
    },
    {
      id: "launch",
      label: "4",
      title: "Запуск",
      description: "Проверка, сохранение и публикация.",
      ready: previewReady,
    },
  ];
  const currentStepIndex = wizardSteps.findIndex((step) => step.id === activeStep);
  const currentStep = wizardSteps[currentStepIndex] ?? wizardSteps[0];
  const guideText = {
    brief: "Сейчас нажми и заполни: название сайта, тип бизнеса, город и домен. Остальное пока не трогай.",
    assets: "Теперь добавь телефон клиента, логотип и прайс. Если прайса нет, можно идти дальше и собрать черновик.",
    style: "Здесь Арай помогает: нажми «Собрать стройматериалы», потом при желании «Красивее» или «Уникальный вид».",
    launch: "Финал: нажми «Собрать сайт». Кнопка открытия сайта появится только после сборки.",
  }[activeStep];
  const arayOperatorStatus = missingReadinessLabels.length > 0
    ? `Я вижу, что еще нужно: ${missingReadinessLabels.join(", ")}. Давай по шагам, без суеты.`
    : "Данных достаточно. Можно собрать сайт и показать клиенту будущий магазин.";
  const arayBriefQuestions = [
    !contactReady ? "Куда отправлять заявки: телефон, WhatsApp или email?" : "",
    !domainReady ? "Какой домен подключаем или оставляем временный адрес?" : "",
    !form.priceFileName ? "Есть прайс xlsx/csv или пока собрать демо-каталог?" : "",
  ].filter(Boolean);
  const arayAiCrew = [
    { role: "Маркетолог", task: "разбирает нишу, оффер и кому продаем" },
    { role: "Дизайнер", task: "подбирает стиль по правилам ARAY CMS" },
    { role: "Технарь", task: "включает модули, PWA, домен и админку" },
    { role: "CRM-оператор", task: "готовит заявки, задачи, роли и менеджеров" },
  ];

  function updateForm<K extends keyof SmartStoreForm>(key: K, value: SmartStoreForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setPreviewReady(false);
  }

  function goNext() {
    const next = wizardSteps[Math.min(currentStepIndex + 1, wizardSteps.length - 1)];
    if (next) setActiveStep(next.id);
  }

  function goBack() {
    const previous = wizardSteps[Math.max(currentStepIndex - 1, 0)];
    if (previous) setActiveStep(previous.id);
  }

  function handleLogoFile(file?: File) {
    if (logoPreview.startsWith("blob:")) URL.revokeObjectURL(logoPreview);
    if (!file) {
      updateForm("logoName", "");
      setLogoPreview("");
      return;
    }
    updateForm("logoName", file.name);
    setLogoPreview(URL.createObjectURL(file));
  }

  function handlePriceFile(file?: File) {
    setForm((current) => ({
      ...current,
      priceFileName: file?.name ?? "",
      priceFileSize: file?.size ?? 0,
    }));
    setPreviewReady(false);
  }

  function parseDomainFromBrief(value: string) {
    return value.match(/\b[a-z0-9][a-z0-9-]*(?:\.[a-z0-9][a-z0-9-]*)+\b/i)?.[0] ?? "";
  }

  function parseCityFromBrief(value: string) {
    const normalized = value.toLowerCase();
    if (normalized.includes("воронеж")) return "Воронеж";
    if (normalized.includes("москв")) return "Москва";
    if (normalized.includes("санкт-петербург") || normalized.includes("спб")) return "Санкт-Петербург";
    if (normalized.includes("краснодар")) return "Краснодар";
    if (normalized.includes("ростов")) return "Ростов-на-Дону";
    return "";
  }

  function pickBusinessTypeFromBrief(value: string): StoreConstructorBusinessType {
    const normalized = value.toLowerCase();
    const preferred = normalized.includes("пиломат") || normalized.includes("лес") || normalized.includes("доск")
      ? "lumber"
      : normalized.includes("услуг") || normalized.includes("сервис")
        ? "services"
        : normalized.includes("ресторан") || normalized.includes("доставк")
          ? "restaurant"
          : normalized.includes("красот") || normalized.includes("салон")
            ? "beauty"
            : normalized.includes("магазин") || normalized.includes("строй") || normalized.includes("материал")
              ? "construction"
              : "retail";
    return blueprints.some((blueprint) => blueprint.key === preferred)
      ? preferred
      : "universal";
  }

  function getBriefDefaults(type: StoreConstructorBusinessType) {
    if (type === "lumber") {
      return {
        storeName: "Магазин пиломатериалов",
        accentColor: "color-mix(in srgb, hsl(var(--primary)), hsl(var(--background)) 35%)",
        delivery: "Доставка пиломатериалов по городу и области, самовывоз со склада, расчет машины под объем заказа.",
        payment: "Наличные, перевод, счет для юрлиц, поэтапная оплата для крупных поставок.",
      };
    }
    if (type === "services") {
      return {
        storeName: "Сервисная компания",
        accentColor: "hsl(var(--accent))",
        delivery: "Заявки принимаются онлайн, менеджер уточняет адрес, сроки и формат выезда.",
        payment: "Наличные, перевод, счет для юрлиц, оплата после подтверждения заявки.",
      };
    }
    if (type === "restaurant") {
      return {
        storeName: "Доставка еды",
        accentColor: "hsl(var(--destructive))",
        delivery: "Доставка по городу, самовывоз, быстрый заказ через корзину и повторные покупки.",
        payment: "Наличные, перевод, онлайн-оплата после подключения платежного модуля.",
      };
    }
    if (type === "beauty") {
      return {
        storeName: "Салон услуг",
        accentColor: "hsl(var(--secondary))",
        delivery: "Онлайн-запись, консультации, напоминания клиентам и быстрые заявки.",
        payment: "Наличные, перевод, предоплата по согласованию.",
      };
    }
    return {
      storeName: "Магазин стройматериалов",
      accentColor: "hsl(var(--primary))",
      delivery: "Доставка по городу и области, самовывоз со склада, расчет машины под объем заказа.",
      payment: "Наличные, перевод, счет для юрлиц, поэтапная оплата для крупных поставок.",
    };
  }

  function applyBriefPreset(kind: "construction" | "lumber" | "services" | "network") {
    const presetBrief = {
      construction: "Нужен магазин стройматериалов в Воронеже, домен client-site.ru. Нужны каталог, заявки, корзина, доставка, PWA-приложение, CRM и админка ARAY CMS.",
      lumber: "Нужен магазин пиломатериалов: доска, брус, доставка, заявки, корзина, PWA-приложение, CRM и админка для менеджеров.",
      services: "Нужен сайт услуг с заявками, записью, CRM, ролями, PWA-приложением и помощником Арай для менеджеров.",
      network: "Нужна сеть магазинов: общий бренд, несколько точек, у каждого сайта своя база, роли, заказы, CRM и отдельная админка.",
    }[kind];
    setOneBrief(presetBrief);
    setForm((current) => ({
      ...current,
      networkMode: kind === "network" ? "network" : current.networkMode,
      networkName: kind === "network" ? current.networkName || "Сеть магазинов" : current.networkName,
      businessType: kind === "lumber" ? "lumber" : kind === "services" ? "services" : "construction",
    }));
    setPreviewReady(false);
    setAssistantNotice("Арай понял направление. Теперь можно нажать одну кнопку и собрать черновик.");
  }

  function applyArayBriefBuild() {
    const businessType = pickBusinessTypeFromBrief(oneBrief);
    const defaults = getBriefDefaults(businessType);
    const domainFromBrief = parseDomainFromBrief(oneBrief);
    const cityFromBrief = parseCityFromBrief(oneBrief);
    const networkFromBrief = /сеть|филиал|несколько точек|много точек/i.test(oneBrief);

    setForm((current) => {
      const domain = domainFromBrief || current.domain;
      const city = cityFromBrief || current.city || "Воронеж";
      const storeName = current.storeName.trim() || defaults.storeName;
      return {
        ...current,
        networkMode: networkFromBrief ? "network" : current.networkMode,
        networkName: networkFromBrief ? current.networkName || storeName : current.networkName,
        storeName,
        businessType,
        city,
        domain,
        siteCode: current.siteCode || simpleSlug(domain || storeName, "store"),
        accentColor: current.accentColor || defaults.accentColor,
        delivery: current.delivery.trim() ? current.delivery : defaults.delivery,
        payment: current.payment.trim() ? current.payment : defaults.payment,
        notes: [
          oneBrief.trim(),
          "Арай берет шаблон ARAY CMS: витрина, каталог, корзина, заявки, роли, CRM, PWA и админка собираются как единая система.",
          "Публикация, домен, оплата и рекламный запуск остаются только после подтверждения человека.",
        ].filter(Boolean).join("\n\n"),
      };
    });
    setPreviewReady(true);
    setActiveStep("launch");
    setAssistantNotice("Арай взял бриф как маркетолог, выбрал шаблон, модули, стиль и собрал готовый черновик. Осталось проверить и показать клиенту.");
  }

  function buildPreview() {
    setPreviewReady(true);
    setActiveStep("launch");
    setAssistantNotice("Готово. Я собрал сайт как отдельный проект, теперь можно открыть и показать клиенту.");
  }

  function openLivePreview() {
    buildPreview();
    window.open(previewHref, "_blank", "noopener,noreferrer");
  }

  function buildArayOperatorContext(action: string) {
    return [
      "Раздел: ARAY Production, мастер запуска магазина.",
      `Действие: ${action}.`,
      `Бриф клиента: ${oneBrief || "не указан"}.`,
      "AI-режим: Арай может использовать GPT/нейросети как помощников, но работает через проверенные модули, шаблоны и подтверждение человека.",
      `Название: ${form.storeName || "не указано"}.`,
      `Ниша: ${selectedBlueprint?.title ?? form.businessType}.`,
      `Город: ${form.city || "не указан"}.`,
      `Домен: ${form.domain || "будет предложен системой"}.`,
      `Менеджер: ${form.managerName || "не указан"}.`,
      `Реферальный код: ${form.referralCode || "не указан"}.`,
      `Реферальная ссылка: ${referralLink}.`,
      `Правило выплаты: ${form.rewardPlan}.`,
      `Изоляция: tenantId=${tenantId}, networkId=${networkId}. Несколько бизнесов не смешиваются: у каждого свои товары, заказы, роли, настройки и CRM-история.`,
      `Прайс: ${form.priceFileName || "не загружен"}.`,
      "Отвечай как спокойный оператор запуска: коротко, по шагам, простыми словами.",
      "Публикация, счет, реклама и домен только после подтверждения человека.",
    ].join("\n");
  }

  function askArayOperator(action: string, displayText: string) {
    requestArayPrompt({
      text: displayText,
      displayText,
      context: buildArayOperatorContext(action),
      actions: [
        {
          type: "navigate",
          url: "#smart-application",
          label: "Открыть мастер",
          icon: "clipboard",
        },
        {
          type: "navigate",
          url: previewHref,
          label: "Открыть сайт",
          icon: "eye",
        },
      ],
    });
    setAssistantNotice("Я передал Араю контекст магазина. Он будет вести запуск по шагам.");
  }

  async function copyReferralLink() {
    try {
      await navigator.clipboard.writeText(referralLink);
      setNotice("Реферальная ссылка скопирована. Клиент по ней попадет в заявку, а код сохранится в CRM.");
      setAssistantNotice("Ссылка готова: менеджер может отправить ее клиенту, а Арай сохранит источник заявки.");
    } catch {
      setNotice("Не удалось скопировать ссылку автоматически. Ее можно выделить и отправить менеджеру вручную.");
    }
  }

  function applyArayConstructionPreset() {
    setForm((current) => {
      const name = current.storeName.trim() || "Магазин стройматериалов";
      const city = current.city.trim() || "Воронеж";
      return {
        ...current,
        businessType: "construction" as StoreConstructorBusinessType,
        storeName: name,
        city,
        siteCode: current.siteCode || simpleSlug(name, "construction"),
        accentColor: "hsl(var(--primary))",
        delivery: "Доставка по городу и области, самовывоз со склада, расчет машины под объем заказа.",
        payment: "Наличные, перевод, счет для юрлиц, поэтапная оплата для крупных поставок.",
        notes: `${name} в ${city}: каталог стройматериалов, быстрые заявки, корзина, расчет доставки, админка и помощник Арай для менеджеров.`,
      };
    });
    setAssistantNotice("Арай подготовил основу магазина стройматериалов: ниша, подача, доставка, оплата и цвет собраны.");
    setActiveStep("style");
  }

  function applyArayPremiumCopy() {
    setForm((current) => {
      const name = current.storeName.trim() || "Магазин стройматериалов";
      const city = current.city.trim() || "вашем городе";
      return {
        ...current,
        notes: `${name}: современный магазин для частных клиентов, прорабов и организаций. Каталог, заявки, корзина, PWA-приложение и админка работают как единая система. Арай помогает менеджерам быстрее отвечать, вести клиентов и готовить запуск.`,
        delivery: current.delivery.trim() || `Доставка по ${city} и области, самовывоз со склада, отдельный расчет для крупных заказов.`,
        payment: current.payment.trim() || "Наличные, перевод, счет для юрлиц, закрывающие документы по запросу.",
      };
    });
    setAssistantNotice("Арай переписал подачу: сайт звучит дороже, понятнее и ближе к продаже.");
    setActiveStep("style");
  }

  function applyArayUniqueDesign() {
    const palette = [
      "hsl(var(--primary))",
      "hsl(var(--accent))",
      "hsl(var(--secondary))",
      "hsl(var(--destructive))",
      "color-mix(in srgb, hsl(var(--primary)), hsl(var(--background)) 40%)",
    ];
    setForm((current) => {
      const currentIndex = palette.indexOf(current.accentColor);
      const nextColor = palette[(currentIndex + 1 + palette.length) % palette.length] ?? "hsl(var(--accent))";
      const name = current.storeName.trim() || "Магазин";
      return {
        ...current,
        accentColor: nextColor,
        notes: `${current.notes}\n\nВизуальный режим ARAY: уникальная подача для "${name}", сильный первый экран, понятные категории, доверие, доставка и быстрый запрос цены.`,
      };
    });
    setAssistantNotice("Арай переключил визуальный характер: новый цвет, более уникальная подача и готовность к проверке.");
    setActiveStep("style");
  }

  async function submitPublicApplication(status: PublishedSite["status"]) {
    await fetch("/api/site-constructor/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        tenantId,
        networkId,
        status,
        referralSource,
      }),
    });
  }

  async function saveSiteToServer(status: PublishedSite["status"]) {
    const response = await fetch("/api/admin/site-constructor/sites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        tenantId,
        networkId,
        status,
        referralSource,
        confirm: true,
      }),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.site) {
      throw new Error(data?.error || "Не удалось сохранить сайт");
    }
    return data.site as PublishedSite;
  }

  async function publishSite(status: PublishedSite["status"] = "published") {
    if (mode === "public" && !contactReady) {
      setNotice("Добавь телефон или email, чтобы мы могли связаться по запуску.");
      setActiveStep("assets");
      return;
    }
    if (mode === "admin") {
      const confirmed = window.confirm(
        status === "published"
          ? "Опубликовать этот сайт и открыть его как активный проект?"
          : "Сохранить этот сайт в Мои сайты как черновик?",
      );
      if (!confirmed) return;
    }

    setSyncing(true);
    setNotice("");
    const site: PublishedSite = {
      ...form,
      id: makeId(),
      tenantId,
      networkId,
      createdAt: new Date().toISOString(),
      referralSource,
      status,
    };

    try {
      if (mode === "admin") {
        const serverSite = await saveSiteToServer(status);
        setSites((current) => [serverSite, ...current.filter((item) => item.tenantId !== serverSite.tenantId)].slice(0, 20));
        setActiveSiteId(serverSite.id);
        setNotice(status === "published" ? "Сайт сохранен и опубликован." : "Черновик сайта сохранен.");
      } else {
        await submitPublicApplication(status);
        setSites((current) => [site, ...current].slice(0, 20));
        setActiveSiteId(site.id);
        setNotice("Заявка отправлена. Мы увидим ее в CRM и доведем до запуска.");
      }
    } catch (error) {
      if (mode === "admin") {
        setNotice(error instanceof Error ? error.message : "Не удалось сохранить сайт.");
      } else {
        setSites((current) => [site, ...current].slice(0, 20));
        setActiveSiteId(site.id);
        setNotice(error instanceof Error ? `${error.message}. Черновик сохранен на этом устройстве.` : "Черновик сохранен на этом устройстве.");
      }
    } finally {
      setPreviewReady(true);
      setActiveStep("launch");
      setSyncing(false);
    }
  }

  function loadSite(site: PublishedSite) {
    setForm({
      networkMode: site.networkMode,
      networkName: site.networkName,
      storeName: site.storeName,
      siteCode: site.siteCode,
      businessType: site.businessType,
      city: site.city,
      domain: site.domain,
      contactName: site.contactName,
      phone: site.phone,
      email: site.email,
      warehouse: site.warehouse,
      workHours: site.workHours,
      delivery: site.delivery,
      payment: site.payment,
      accentColor: site.accentColor,
      logoName: site.logoName,
      priceFileName: site.priceFileName,
      priceFileSize: site.priceFileSize,
      managerName: site.managerName,
      referralCode: site.referralCode,
      rewardPlan: site.rewardPlan,
      notes: site.notes,
    });
    setLogoPreview("");
    setPreviewReady(true);
    setActiveSiteId(site.id);
    setActiveStep("launch");
  }

  useEffect(() => {
    if (!requestedTenantId) return;
    const site = sites.find((item) =>
      item.tenantId === requestedTenantId || item.siteCode === requestedTenantId,
    );
    if (!site || activeSiteId === site.id) return;
    loadSite(site);
    setNotice("Черновик открыт из ARAY Builder.");
  }, [requestedTenantId, sites, activeSiteId]);

  function resetDraft() {
    setForm(initialForm);
    setPreviewReady(false);
    setLogoPreview("");
    setActiveSiteId("");
    setNotice("");
    setAssistantNotice("Начали новый черновик. Я рядом: сначала заполним бизнес.");
    setActiveStep("brief");
  }

  return (
    <section
      className={cn("grid gap-5", mode === "public" ? "mt-8" : "mt-6")}
      data-store-constructor-launch-control
      data-store-constructor-smart-form
      data-store-constructor-multisite
      id="smart-application"
    >
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]" data-store-constructor-easy-brief>
        <div className="rounded-xl border border-primary/35 bg-card ">
          <div className="border-b border-border p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary/80">
              ARAY берет бриф сам
            </p>
            <div className="mt-2 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-2xl font-semibold text-foreground">
                  <Bot className="h-6 w-6 text-primary" />
                  Скажи двумя словами, Арай соберет сайт
                </h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                  Он работает как маркетолог и AI-оператор: понимает нишу, подключает GPT/нейросети как помощников, выбирает шаблон, модули, стиль, роли, CRM, PWA и показывает готовый черновик. Если чего-то не хватает, задает только короткие вопросы.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs font-semibold text-primary">
                <span className="rounded-xl border border-primary/30 bg-primary/10 px-2.5 py-1">ARAY CMS</span>
                <span className="rounded-xl border border-primary/30 bg-primary/10 px-2.5 py-1">GPT/AI</span>
                <span className="rounded-xl border border-primary/30 bg-primary/10 px-2.5 py-1">CRM и роли</span>
                <span className="rounded-xl border border-primary/30 bg-primary/10 px-2.5 py-1">PWA</span>
              </div>
            </div>
          </div>

          <div className="grid gap-4 p-4">
            <label className="grid gap-2 text-sm font-medium text-foreground">
              Бриф для Арая
              <textarea
                value={oneBrief}
                onChange={(event) => {
                  setOneBrief(event.target.value);
                  setPreviewReady(false);
                }}
                rows={5}
                placeholder="Например: нужен магазин стройматериалов в Воронеже, домен client-site.ru, загрузим прайс, нужны заявки, доставка, корзина, CRM и приложение."
                className="min-h-32 resize-y rounded-xl border border-border bg-background px-3 py-3 text-sm leading-6 outline-none transition-colors focus:border-primary"
              />
            </label>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => applyBriefPreset("construction")}
                className="inline-flex min-h-10 items-center justify-center rounded-xl border border-border bg-background px-3 text-sm font-semibold text-foreground transition-colors hover:border-primary/45 hover:text-primary"
              >
                Стройматериалы
              </button>
              <button
                type="button"
                onClick={() => applyBriefPreset("lumber")}
                className="inline-flex min-h-10 items-center justify-center rounded-xl border border-border bg-background px-3 text-sm font-semibold text-foreground transition-colors hover:border-primary/45 hover:text-primary"
              >
                Пиломатериалы
              </button>
              <button
                type="button"
                onClick={() => applyBriefPreset("services")}
                className="inline-flex min-h-10 items-center justify-center rounded-xl border border-border bg-background px-3 text-sm font-semibold text-foreground transition-colors hover:border-primary/45 hover:text-primary"
              >
                Услуги
              </button>
              <button
                type="button"
                onClick={() => applyBriefPreset("network")}
                className="inline-flex min-h-10 items-center justify-center rounded-xl border border-border bg-background px-3 text-sm font-semibold text-foreground transition-colors hover:border-primary/45 hover:text-primary"
              >
                Сеть магазинов
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-1.5 text-sm font-medium text-foreground">
                Телефон или email для заявок
                <input
                  value={form.phone || form.email}
                  onChange={(event) => updateForm("phone", event.target.value)}
                  placeholder="+7 900 000-00-00"
                  className="min-h-11 rounded-xl border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary"
                />
              </label>
              <label className="grid gap-1.5 text-sm font-medium text-foreground">
                Домен
                <input
                  value={form.domain}
                  onChange={(event) => updateForm("domain", event.target.value)}
                  placeholder="client-site.ru"
                  className="min-h-11 rounded-xl border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary"
                />
              </label>
            </div>

            <div className="grid gap-3 rounded-xl border border-border bg-background/60 p-3" data-store-constructor-referral-sales>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <UserPlus className="h-4 w-4 text-primary" />
                    Рефералка и менеджер
                  </h3>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Менеджер отправляет ссылку клиенту. Заявка, сайт, оплата и выплата идут по одному коду, поэтому клиент не потеряется.
                  </p>
                </div>
                <span className="rounded-xl border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                  выплата после оплаты
                </span>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <label className="grid gap-1.5 text-sm font-medium text-foreground">
                  Менеджер
                  <input
                    value={form.managerName}
                    onChange={(event) => updateForm("managerName", event.target.value)}
                    placeholder="Имя партнера"
                    className="min-h-11 rounded-xl border border-border bg-card px-3 text-sm outline-none transition-colors focus:border-primary"
                  />
                </label>
                <label className="grid gap-1.5 text-sm font-medium text-foreground">
                  Код
                  <input
                    value={form.referralCode}
                    onChange={(event) => updateForm("referralCode", simpleSlug(event.target.value, ""))}
                    placeholder="ivanov-01"
                    className="min-h-11 rounded-xl border border-border bg-card px-3 text-sm outline-none transition-colors focus:border-primary"
                  />
                </label>
                <label className="grid gap-1.5 text-sm font-medium text-foreground">
                  Правило
                  <select
                    value={form.rewardPlan}
                    onChange={(event) => updateForm("rewardPlan", event.target.value)}
                    className="min-h-11 rounded-xl border border-border bg-card px-3 text-sm outline-none transition-colors focus:border-primary"
                  >
                    <option value="Процент после оплаты клиента">Процент после оплаты</option>
                    <option value="Фикс за запуск сайта">Фикс за запуск</option>
                    <option value="Процент + сопровождение">Процент + сопровождение</option>
                  </select>
                </label>
              </div>

              <div className="grid gap-2 rounded-xl border border-border bg-card p-3 lg:grid-cols-[minmax(0,1fr)_auto]">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Ссылка менеджера</p>
                  <p className="mt-1 break-all text-sm font-semibold text-foreground">{referralLink}</p>
                </div>
                <button
                  type="button"
                  onClick={copyReferralLink}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-border px-3 text-sm font-semibold text-foreground transition-colors hover:border-primary/45 hover:text-primary"
                >
                  <Copy className="h-4 w-4" />
                  Скопировать
                </button>
              </div>

              <div className="grid gap-2 sm:grid-cols-5">
                {referralPipeline.map((step, index) => (
                  <div key={step} className="rounded-xl border border-border bg-card px-2.5 py-2 text-xs font-semibold text-foreground">
                    <span className="text-primary">{index + 1}.</span> {step}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="flex min-h-24 cursor-pointer flex-col justify-center rounded-xl border border-dashed border-border bg-background/55 px-4 transition-colors hover:border-primary/45">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="sr-only"
                  onChange={(event) => handleLogoFile(event.target.files?.[0])}
                />
                <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <ImageIcon className="h-4 w-4 text-primary" />
                  {form.logoName || "Добавить логотип"}
                </span>
                <span className="mt-1 text-xs text-muted-foreground">Можно позже, Арай соберет и без него.</span>
              </label>

              <label className="flex min-h-24 cursor-pointer flex-col justify-center rounded-xl border border-dashed border-border bg-background/55 px-4 transition-colors hover:border-primary/45">
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="sr-only"
                  onChange={(event) => handlePriceFile(event.target.files?.[0])}
                />
                <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <FileUp className="h-4 w-4 text-primary" />
                  {priceLabel}
                </span>
                <span className="mt-1 text-xs text-muted-foreground">Прайс превратится в каталог.</span>
              </label>
            </div>

            <div className="grid gap-3 rounded-xl border border-primary/25 bg-primary/5 p-3 md:grid-cols-[minmax(0,1fr)_auto]">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Что Арай делает внутри</h3>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className="rounded-xl border border-border bg-background px-2 py-1">понимает бизнес</span>
                  <span className="rounded-xl border border-border bg-background px-2 py-1">включает GPT/нейросети</span>
                  <span className="rounded-xl border border-border bg-background px-2 py-1">берет модули ARAY CMS</span>
                  <span className="rounded-xl border border-border bg-background px-2 py-1">готовит админку</span>
                  <span className="rounded-xl border border-border bg-background px-2 py-1">создает CRM-задачи</span>
                </div>
              </div>
              <button
                type="button"
                onClick={applyArayBriefBuild}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <Sparkles className="h-4 w-4" />
                Собрать превью
              </button>
            </div>

            <div className="rounded-xl border border-border bg-background p-4" data-store-constructor-preview>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
                    <Store className="h-4 w-4 text-primary" />
                    {previewReady ? "Черновик готов" : "Арай ждет бриф"}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {previewReady
                      ? "Можно открыть живое превью, сохранить его в «Мои сайты» или опубликовать после проверки."
                      : "Нажми «Собрать превью», и Арай соберет магазин из шаблона, модулей и данных брифа."}
                  </p>
                </div>
                <span className={cn(
                  "inline-flex rounded-xl border px-2.5 py-1 text-xs font-semibold",
                  previewReady
                    ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                    : "border-amber-500/35 bg-amber-500/10 text-amber-700 dark:text-amber-300",
                )}>
                  {previewReady ? "готов к показу" : "еще не собран"}
                </span>
              </div>
              <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                <p><span className="font-semibold text-foreground">Сайт:</span> {form.storeName}</p>
                <p><span className="font-semibold text-foreground">Домен:</span> {form.domain || `${siteSlug}.aray-cms.local`}</p>
                <p><span className="font-semibold text-foreground">Город:</span> {form.city || "не указан"}</p>
                <p><span className="font-semibold text-foreground">Источник:</span> {referralSource}</p>
              </div>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                {previewReady ? (
                  <button
                    type="button"
                    onClick={openLivePreview}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 text-sm font-semibold text-foreground transition-colors hover:border-primary/45 hover:text-primary"
                  >
                    <Eye className="h-4 w-4" />
                    Открыть живое превью
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => void publishSite("draft")}
                  disabled={syncing}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 text-sm font-semibold text-foreground transition-colors hover:border-primary/45 hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Plus className="h-4 w-4" />
                  Сохранить в Мои сайты
                </button>
                <button
                  type="button"
                  onClick={() => void publishSite("published")}
                  disabled={syncing}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-foreground transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Rocket className="h-4 w-4" />
                  Опубликовать
                </button>
              </div>
            </div>

            <div className="grid gap-3 rounded-xl border border-border bg-background/60 p-3" data-store-constructor-ai-crew>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary/80">
                  AI-команда Арая
                </p>
                <h3 className="mt-1 text-sm font-semibold text-foreground">
                  Нейросети работают внутри, а человек подтверждает запуск
                </h3>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {arayAiCrew.map((member) => (
                  <div key={member.role} className="rounded-xl border border-border bg-card px-3 py-2">
                    <p className="text-sm font-semibold text-foreground">{member.role}</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{member.task}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <aside className="grid content-start gap-4">
          <div
            className="rounded-xl border border-primary/25 bg-primary/5 p-4 "
            data-store-constructor-aray-operator
            data-store-constructor-ai-business-os
            data-store-constructor-aray-guide
          >
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-background text-primary">
                <Bot className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary/80">
                  ARAY оператор
                </p>
                <h3 className="mt-1 text-base font-semibold text-foreground">
                  Ведет запуск вместо тебя
                </h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {arayOperatorStatus}
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-primary/25 bg-background px-3 py-2 text-sm font-semibold leading-6 text-primary">
              {assistantNotice}
            </div>

            <div className="mt-4 grid gap-2">
              <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Арай уточнит
              </h4>
              {arayBriefQuestions.length > 0 ? (
                arayBriefQuestions.map((question) => (
                  <div key={question} className="rounded-xl border border-border bg-background px-3 py-2 text-sm leading-5 text-foreground">
                    {question}
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-sm font-semibold leading-5 text-emerald-700 dark:text-emerald-300">
                  Данных хватает, можно показывать клиенту.
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => askArayOperator("разобрать бриф и предложить запуск", "Арай, разберись с брифом и скажи, что еще нужно для запуска")}
              className="mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-border bg-background px-3 text-sm font-semibold text-foreground transition-colors hover:border-primary/45 hover:text-primary"
            >
              <Rocket className="h-4 w-4" />
              Спросить Арая
            </button>
          </div>

          <div className="rounded-xl border border-border bg-card p-4" data-store-constructor-tenant-isolation>
            <h3 className="text-sm font-semibold text-foreground">Бизнесы не путаются</h3>
            <div className="mt-3 grid gap-2 text-sm">
              {isolationRows.map((row) => (
                <div key={row.label} className="rounded-xl border border-border bg-background px-3 py-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{row.label}</p>
                  <p className="mt-1 break-words font-semibold text-foreground">{row.value}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{row.detail}</p>
                </div>
              ))}
              <p className="rounded-xl border border-primary/25 bg-primary/10 px-3 py-2 text-sm font-semibold leading-5 text-primary">
                Один владелец может иметь несколько бизнесов. Арай всегда смотрит на выбранный сайт и не смешивает каталоги, клиентов, роли и выплаты.
              </p>
            </div>
          </div>
        </aside>
      </div>

      <details className="rounded-xl border border-border bg-card p-4 ">
        <summary className="cursor-pointer text-sm font-semibold text-foreground">
          Настроить вручную
        </summary>
        <div className="mt-4 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className={cn(
          "rounded-xl border bg-card  transition-shadow",
          guideMode ? "border-primary/40 ring-2 ring-primary/15" : "border-border",
        )}>
          <div className="border-b border-border p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary/80">
                  ARAY запускает по шагам
                </p>
                <h2 className="mt-2 flex items-center gap-2 text-xl font-semibold text-foreground">
                  <ClipboardList className="h-5 w-5 text-primary" />
                  Мастер магазина
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                  Здесь не нужно управлять всем сразу. Заполняем четыре понятных шага, а сайт открываем только когда он собран как отдельный проект.
                </p>
              </div>
              <div className="flex min-w-[150px] items-center gap-2 rounded-xl border border-border bg-background px-3 py-2">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
                </div>
                <span className="text-sm font-bold text-primary">{progress}%</span>
              </div>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-4">
              {wizardSteps.map((step) => (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => setActiveStep(step.id)}
                  className={cn(
                    "flex min-h-16 items-center gap-3 rounded-xl border px-3 text-left transition-colors",
                    activeStep === step.id
                      ? "border-primary/45 bg-primary/10 text-primary"
                      : "border-border bg-background text-foreground hover:border-primary/35",
                  )}
                >
                  <span className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border text-sm font-bold",
                    step.ready ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-500" : "border-border bg-card text-muted-foreground",
                  )}>
                    {step.ready ? <CheckCircle2 className="h-4 w-4" /> : step.label}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">{step.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">{step.description}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-foreground">{currentStep.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{currentStep.description}</p>
              </div>
              <span className="rounded-xl border border-border bg-background px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                шаг {currentStepIndex + 1} из {wizardSteps.length}
              </span>
            </div>

            {guideMode ? (
              <div
                className="mb-4 rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-sm font-semibold leading-6 text-primary"
                data-store-constructor-aray-guide
              >
                {guideText}
              </div>
            ) : null}

            {activeStep === "brief" ? (
              <div className="grid gap-3 md:grid-cols-2">
                <label className="grid gap-1.5 text-sm font-medium text-foreground">
                  Название сайта
                  <input
                    value={form.storeName}
                    onChange={(event) => updateForm("storeName", event.target.value)}
                    placeholder="Новый магазин стройматериалов"
                    className="min-h-11 rounded-xl border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary"
                  />
                </label>
                <label className="grid gap-1.5 text-sm font-medium text-foreground">
                  Тип бизнеса
                  <select
                    value={form.businessType}
                    onChange={(event) => updateForm("businessType", event.target.value as StoreConstructorBusinessType)}
                    className="min-h-11 rounded-xl border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary"
                  >
                    {blueprints.map((blueprint) => (
                      <option key={blueprint.key} value={blueprint.key}>
                        {blueprint.title}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1.5 text-sm font-medium text-foreground">
                  Город
                  <input
                    value={form.city}
                    onChange={(event) => updateForm("city", event.target.value)}
                    placeholder="Воронеж"
                    className="min-h-11 rounded-xl border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary"
                  />
                </label>
                <label className="grid gap-1.5 text-sm font-medium text-foreground">
                  Домен
                  <input
                    value={form.domain}
                    onChange={(event) => updateForm("domain", event.target.value)}
                    placeholder="client-site.ru"
                    className="min-h-11 rounded-xl border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary"
                  />
                </label>
                <label className="grid gap-1.5 text-sm font-medium text-foreground">
                  Режим
                  <select
                    value={form.networkMode}
                    onChange={(event) => updateForm("networkMode", event.target.value as NetworkMode)}
                    className="min-h-11 rounded-xl border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary"
                  >
                    <option value="single">Один магазин</option>
                    <option value="network">Сеть магазинов</option>
                  </select>
                </label>
                <label className="grid gap-1.5 text-sm font-medium text-foreground">
                  Название сети
                  <input
                    value={form.networkName}
                    onChange={(event) => updateForm("networkName", event.target.value)}
                    placeholder="Если точек несколько"
                    className="min-h-11 rounded-xl border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary"
                  />
                </label>
              </div>
            ) : null}

            {activeStep === "assets" ? (
              <div className="grid gap-3">
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="grid gap-1.5 text-sm font-medium text-foreground">
                    Контактное лицо
                    <input
                      value={form.contactName}
                      onChange={(event) => updateForm("contactName", event.target.value)}
                      placeholder="Имя клиента"
                      className="min-h-11 rounded-xl border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary"
                    />
                  </label>
                  <label className="grid gap-1.5 text-sm font-medium text-foreground">
                    Телефон или email
                    <input
                      value={form.phone || form.email}
                      onChange={(event) => updateForm("phone", event.target.value)}
                      placeholder="+7 900 000-00-00"
                      className="min-h-11 rounded-xl border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary"
                    />
                  </label>
                  <label className="grid gap-1.5 text-sm font-medium text-foreground">
                    Склад или адрес
                    <input
                      value={form.warehouse}
                      onChange={(event) => updateForm("warehouse", event.target.value)}
                      placeholder="Склад, офис, самовывоз"
                      className="min-h-11 rounded-xl border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary"
                    />
                  </label>
                  <label className="grid gap-1.5 text-sm font-medium text-foreground">
                    График
                    <input
                      value={form.workHours}
                      onChange={(event) => updateForm("workHours", event.target.value)}
                      placeholder="Пн-Сб 9:00-18:00"
                      className="min-h-11 rounded-xl border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary"
                    />
                  </label>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border bg-background/55 px-4 text-center transition-colors hover:border-primary/45">
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      className="sr-only"
                      onChange={(event) => handleLogoFile(event.target.files?.[0])}
                    />
                    {logoPreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={logoPreview} alt="" className="h-10 w-10 rounded-xl object-cover" />
                    ) : (
                      <ImageIcon className="h-5 w-5 text-primary" />
                    )}
                    <span className="mt-2 text-sm font-semibold text-foreground">
                      {form.logoName || "Загрузить логотип"}
                    </span>
                    <span className="mt-1 text-xs text-muted-foreground">png, jpg, webp, svg</span>
                  </label>

                  <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border bg-background/55 px-4 text-center transition-colors hover:border-primary/45">
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      className="sr-only"
                      onChange={(event) => handlePriceFile(event.target.files?.[0])}
                    />
                    <FileUp className="h-5 w-5 text-primary" />
                    <span className="mt-2 text-sm font-semibold text-foreground">
                      {priceLabel}
                    </span>
                    <span className="mt-1 text-xs text-muted-foreground">xlsx, xls, csv</span>
                  </label>
                </div>
              </div>
            ) : null}

            {activeStep === "style" ? (
              <div className="grid gap-3">
                <div className="grid gap-3 md:grid-cols-[220px_minmax(0,1fr)]">
                  <label className="grid gap-1.5 text-sm font-medium text-foreground">
                    Цвет сайта
                    <span className="flex min-h-11 items-center gap-2 rounded-xl border border-border bg-background px-3">
                      <Palette className="h-4 w-4 text-primary" />
                      <input
                        type="color"
                        value={form.accentColor}
                        onChange={(event) => updateForm("accentColor", event.target.value)}
                        className="h-8 w-12 cursor-pointer border-0 bg-transparent p-0"
                        aria-label="Цвет сайта"
                      />
                      <span className="text-sm text-muted-foreground">{form.accentColor}</span>
                    </span>
                  </label>
                  <div className="grid gap-2 sm:grid-cols-3">
                    <button
                      type="button"
                      onClick={applyArayConstructionPreset}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                    >
                      <Sparkles className="h-4 w-4" />
                      Собрать стройматериалы
                    </button>
                    <button
                      type="button"
                      onClick={applyArayPremiumCopy}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-background px-3 text-sm font-semibold text-foreground transition-colors hover:border-primary/45 hover:text-primary"
                    >
                      Красивее
                    </button>
                    <button
                      type="button"
                      onClick={applyArayUniqueDesign}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-background px-3 text-sm font-semibold text-foreground transition-colors hover:border-primary/45 hover:text-primary"
                    >
                      Уникальный вид
                    </button>
                  </div>
                </div>
                <div className="grid gap-3 lg:grid-cols-2">
                  <label className="grid gap-1.5 text-sm font-medium text-foreground">
                    Доставка
                    <textarea
                      value={form.delivery}
                      onChange={(event) => updateForm("delivery", event.target.value)}
                      rows={3}
                      className="resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary"
                    />
                  </label>
                  <label className="grid gap-1.5 text-sm font-medium text-foreground">
                    Оплата
                    <textarea
                      value={form.payment}
                      onChange={(event) => updateForm("payment", event.target.value)}
                      rows={3}
                      className="resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary"
                    />
                  </label>
                </div>
                <label className="grid gap-1.5 text-sm font-medium text-foreground">
                  Что Арай должен подчеркнуть на сайте
                  <textarea
                    value={form.notes}
                    onChange={(event) => updateForm("notes", event.target.value)}
                    rows={4}
                    className="resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary"
                  />
                </label>
              </div>
            ) : null}

            {activeStep === "launch" ? (
              <div className="grid gap-4">
                <div className="grid gap-3 md:grid-cols-3" data-store-constructor-referral-sales>
                  <label className="grid gap-1.5 text-sm font-medium text-foreground">
                    Менеджер
                    <input
                      value={form.managerName}
                      onChange={(event) => updateForm("managerName", event.target.value)}
                      placeholder="Кто ведет клиента"
                      className="min-h-11 rounded-xl border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary"
                    />
                  </label>
                  <label className="grid gap-1.5 text-sm font-medium text-foreground">
                    Реферальный код
                    <input
                      value={form.referralCode}
                      onChange={(event) => updateForm("referralCode", simpleSlug(event.target.value, ""))}
                      placeholder="ivanov-01"
                      className="min-h-11 rounded-xl border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary"
                    />
                  </label>
                  <label className="grid gap-1.5 text-sm font-medium text-foreground">
                    Вознаграждение
                    <select
                      value={form.rewardPlan}
                      onChange={(event) => updateForm("rewardPlan", event.target.value)}
                      className="min-h-11 rounded-xl border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary"
                    >
                      <option value="Процент после оплаты клиента">Процент после оплаты</option>
                      <option value="Фикс за запуск сайта">Фикс за запуск</option>
                      <option value="Процент + сопровождение">Процент + сопровождение</option>
                    </select>
                  </label>
                </div>

                <div className="rounded-xl border border-border bg-background p-4" data-store-constructor-preview>
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <h4 className="flex items-center gap-2 text-base font-semibold text-foreground">
                        <Store className="h-4 w-4 text-primary" />
                        {previewReady ? "Сайт готов к проверке" : "Сайт пока не собран"}
                      </h4>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {previewReady
                          ? "Теперь это отдельный сайт будущего магазина. Его можно открыть и спокойно показать клиенту."
                          : "Я не показываю фальшивый макет. Сначала нажми «Собрать превью», и только потом откроем будущий сайт."}
                      </p>
                    </div>
                    <span className={cn(
                      "inline-flex rounded-xl border px-2.5 py-1 text-xs font-semibold",
                      previewReady
                        ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                        : "border-amber-500/35 bg-amber-500/10 text-amber-700 dark:text-amber-300",
                    )}>
                      {previewReady ? "собрано" : "черновик"}
                    </span>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                    <p><span className="font-semibold text-foreground">Сайт:</span> {form.storeName}</p>
                    <p><span className="font-semibold text-foreground">Домен:</span> {form.domain || `${siteSlug}.aray-cms.local`}</p>
                    <p><span className="font-semibold text-foreground">Город:</span> {form.city || "не указан"}</p>
                    <p><span className="font-semibold text-foreground">Прайс:</span> {priceLabel}</p>
                  </div>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={buildPreview}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    <Sparkles className="h-4 w-4" />
                    Собрать превью
                  </button>
                  {previewReady ? (
                    <button
                      type="button"
                      onClick={openLivePreview}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 text-sm font-semibold text-foreground transition-colors hover:border-primary/45 hover:text-primary"
                    >
                      <Eye className="h-4 w-4" />
                      Открыть живое превью
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => void publishSite("draft")}
                    disabled={syncing}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 text-sm font-semibold text-foreground transition-colors hover:border-primary/45 hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Plus className="h-4 w-4" />
                    Добавить сайт
                  </button>
                  <button
                    type="button"
                    onClick={() => void publishSite("published")}
                    disabled={syncing}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-foreground transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Rocket className="h-4 w-4" />
                    Опубликовать
                  </button>
                </div>
              </div>
            ) : null}

            <div className="mt-5 flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={resetDraft}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-border px-3 text-sm font-semibold text-muted-foreground transition-colors hover:border-primary/45 hover:text-primary"
              >
                <RotateCcw className="h-4 w-4" />
                Новый черновик
              </button>
              <div className="flex gap-2">
                {currentStepIndex > 0 ? (
                  <button
                    type="button"
                    onClick={goBack}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-border px-3 text-sm font-semibold text-foreground transition-colors hover:border-primary/45 hover:text-primary"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Назад
                  </button>
                ) : null}
                {currentStepIndex < wizardSteps.length - 1 ? (
                  <button
                    type="button"
                    onClick={goNext}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-primary px-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    Дальше
                    <ArrowRight className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <aside className="grid content-start gap-4">
          <div
            className="rounded-xl border border-primary/25 bg-primary/5 p-4 "
            data-store-constructor-aray-operator
            data-store-constructor-ai-business-os
          >
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-background text-primary">
                <Bot className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary/80">
                  ARAY рядом
                </p>
                <h3 className="mt-1 text-base font-semibold text-foreground">
                  Веду запуск
                </h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {arayOperatorStatus}
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-primary/25 bg-background px-3 py-2 text-sm font-semibold leading-6 text-primary">
              {assistantNotice}
            </div>

            <div className="mt-4 grid gap-2">
              {wizardSteps.map((step) => (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => setActiveStep(step.id)}
                  className={cn(
                    "flex items-start gap-2 rounded-xl px-3 py-2 text-left transition-colors",
                    activeStep === step.id ? "bg-background text-primary" : "bg-background/60 text-foreground hover:bg-background",
                  )}
                >
                  <CheckCircle2 className={cn("mt-0.5 h-4 w-4 shrink-0", step.ready ? "text-emerald-500" : "text-muted-foreground")} />
                  <span>
                    <span className="block text-sm font-semibold">{step.title}</span>
                    <span className="block text-xs leading-5 text-muted-foreground">{step.description}</span>
                  </span>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => askArayOperator("план запуска магазина", "Арай, веди запуск этого магазина по шагам")}
              className="mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-border bg-background px-3 text-sm font-semibold text-foreground transition-colors hover:border-primary/45 hover:text-primary"
            >
              <Rocket className="h-4 w-4" />
              Спросить Арая
            </button>
            <button
              type="button"
              onClick={() => {
                setGuideMode((current) => !current);
                setAssistantNotice(guideMode
                  ? "Подсветку убрал. Я все равно рядом и могу подсказать следующий шаг."
                  : "Включил подсветку. Теперь показываю, куда смотреть и что нажать.");
              }}
              className={cn(
                "mt-2 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold transition-colors",
                guideMode
                  ? "border border-primary/45 bg-primary/10 text-primary hover:bg-primary/15"
                  : "border border-border bg-background text-foreground hover:border-primary/45 hover:text-primary",
              )}
            >
              <Sparkles className="h-4 w-4" />
              {guideMode ? "Арай показывает" : "Показать куда нажать"}
            </button>
          </div>

          <details className="rounded-xl border border-border bg-card p-4" data-store-constructor-tenant-isolation>
            <summary className="cursor-pointer text-sm font-semibold text-foreground">
              Технически все разделено
            </summary>
            <div className="mt-3 grid gap-2 text-sm">
              <div className="rounded-xl border border-border bg-background px-3 py-2">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Сайт</p>
                <p className="mt-1 break-words font-semibold text-foreground">{tenantId}</p>
              </div>
              <div className="rounded-xl border border-border bg-background px-3 py-2">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Сеть</p>
                <p className="mt-1 break-words font-semibold text-foreground">{networkId}</p>
              </div>
              <div className="rounded-xl border border-primary/25 bg-primary/10 px-3 py-2 text-primary">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <ShieldCheck className="h-4 w-4" />
                  Товары, заказы и настройки будут жить отдельно по tenantId.
                </p>
              </div>
            </div>
          </details>
        </aside>
        </div>
      </details>

      {notice ? (
        <div className="rounded-xl border border-primary/25 bg-primary/10 px-3 py-2 text-sm font-semibold text-primary">
          {notice}
        </div>
      ) : null}

      <section className="rounded-xl border border-border bg-card p-4 " data-store-constructor-my-sites>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <Network className="h-5 w-5 text-primary" />
              Мои сайты
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Здесь появляются магазины после сохранения. У каждого сайта свой tenantId и своя админка.
            </p>
          </div>
          <button
            type="button"
            onClick={resetDraft}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-border px-3 text-sm font-semibold text-foreground transition-colors hover:border-primary/45 hover:text-primary"
          >
            <Plus className="h-4 w-4" />
            Новый сайт
          </button>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {sites.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-background/55 p-4 text-sm leading-6 text-muted-foreground">
              Сохрани черновик или опубликуй сайт, и он появится здесь.
            </div>
          ) : (
            sites.map((site) => {
              const sitePreviewHref = buildPreviewHref(site, site.referralSource, site.tenantId, site.networkId);
              return (
                <article
                  key={site.id}
                  className={cn(
                    "rounded-xl border bg-background p-3 transition-colors",
                    activeSiteId === site.id ? "border-primary/45" : "border-border",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold text-foreground">{site.storeName}</h3>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {site.domain || `${simpleSlug(site.storeName)}.aray.local`} · {site.city || "город не указан"}
                      </p>
                    </div>
                    <span className={cn(
                      "shrink-0 rounded-xl border px-2 py-1 text-[11px] font-semibold",
                      site.status === "published"
                        ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                        : "border-amber-500/35 bg-amber-500/10 text-amber-700 dark:text-amber-300",
                    )}>
                      {site.status === "published" ? "опубликован" : "черновик"}
                    </span>
                  </div>
                  <div className="mt-3 grid gap-1 text-xs text-muted-foreground">
                    <p className="truncate">код сайта: {site.tenantId}</p>
                    <p className="truncate">система: ARAY CMS</p>
                    <p className="truncate">{site.priceFileName || "без прайса"} · {new Date(site.createdAt).toLocaleString("ru-RU")}</p>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => loadSite(site)}
                      className="inline-flex min-h-9 items-center justify-center rounded-xl border border-border text-xs font-semibold text-foreground transition-colors hover:border-primary/45 hover:text-primary"
                    >
                      Править
                    </button>
                    <Link
                      href={sitePreviewHref}
                      target="_blank"
                      className="inline-flex min-h-9 items-center justify-center rounded-xl border border-border text-xs font-semibold text-foreground transition-colors hover:border-primary/45 hover:text-primary"
                    >
                      Сайт
                    </Link>
                    <Link
                      href={`/admin/site/constructor?tenant=${encodeURIComponent(site.tenantId)}`}
                      className="inline-flex min-h-9 items-center justify-center rounded-xl border border-border text-xs font-semibold text-foreground transition-colors hover:border-primary/45 hover:text-primary"
                    >
                      Админка
                    </Link>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section>

      <details className="rounded-xl border border-border bg-card p-4">
        <summary className="cursor-pointer text-sm font-semibold text-foreground">
          Какие поля Арай использует при сборке
        </summary>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-border bg-background p-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <UploadCloud className="h-4 w-4 text-primary" />
              Прайс и поля
            </h3>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {requiredColumns.slice(0, 8).map((column) => (
                <span key={column.key} className="rounded-xl border border-primary/30 bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary">
                  {column.label}
                </span>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-border bg-background p-3">
            <h3 className="text-sm font-semibold text-foreground">Анкета</h3>
            <div className="mt-2 grid gap-2 text-xs leading-5 text-muted-foreground">
              {questionnaire.slice(0, 3).map((group) => (
                <p key={group.id}>
                  <span className="font-semibold text-foreground">{group.title}:</span> {group.fields.slice(0, 4).join(", ")}
                </p>
              ))}
            </div>
          </div>
        </div>
      </details>
    </section>
  );
}
