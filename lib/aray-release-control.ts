import {
  getArayManagedSiteProfiles,
  getMultisiteAdminHref,
  getMultisitePublicHref,
  type MultisiteSiteProfile,
} from "@/lib/multisite-sites";

export const ARAY_CORE_RELEASE_VERSION = "aray-core-2026.06.04-cms-release-layer";

export type ArayReleaseGateStatus = "passed" | "ready" | "manual-confirm" | "next";
export type ArayDeploymentTargetStatus = "synced" | "preview" | "needs-channel" | "planned";

export type ArayReleaseGate = {
  id: string;
  title: string;
  text: string;
  status: ArayReleaseGateStatus;
  owner: "ARAY" | "Команда" | "Подтверждение";
};

export type ArayDeploymentTarget = {
  id: string;
  name: string;
  domain: string;
  tenantId: string;
  sourceTenantId: string;
  mode: MultisiteSiteProfile["deploymentMode"] | "future-server";
  status: ArayDeploymentTargetStatus;
  currentVersion: string;
  nextAction: string;
  publicHref: string;
  adminHref: string;
};

export type ArayOperatorBoundary = {
  title: string;
  text: string;
  level: "self" | "confirm" | "blocked";
};

export const ARAY_RELEASE_GATES: ArayReleaseGate[] = [
  {
    id: "tenant-context",
    title: "Активный сайт",
    text: "Выбранный проект передается на сервер как tenant-контекст, чтобы заказы, CRM, клиенты и финансы не смешивались.",
    status: "passed",
    owner: "ARAY",
  },
  {
    id: "core-package",
    title: "Пакет ядра",
    text: "ARAY собирает изменения в один выпуск: интерфейс, конструктор, CRM-логику, PWA, проверки и подсказки.",
    status: "ready",
    owner: "ARAY",
  },
  {
    id: "quality-gates",
    title: "Проверки перед выпуском",
    text: "Перед показом и деплоем проходят типы, навигация, release-check и smoke по живым маршрутам.",
    status: "passed",
    owner: "ARAY",
  },
  {
    id: "external-server-channel",
    title: "Канал новых сайтов",
    text: "Для следующего магазина нужен чистый путь: скан, черновик, превью, отдельный tenant, доменная карта, бэкап и smoke-проверка перед боевым запуском.",
    status: "next",
    owner: "Команда",
  },
  {
    id: "domain-tenant-map",
    title: "Доменная карта",
    text: "Каждый боевой домен должен открывать свой tenant: pilo-rus.ru -> pilorus, следующий домен клиента -> свой новый tenant.",
    status: "next",
    owner: "Команда",
  },
  {
    id: "human-launch-confirmation",
    title: "Боевой запуск",
    text: "Домен, платежи, удаление данных и публикация в продакшен идут только после явного подтверждения владельца.",
    status: "manual-confirm",
    owner: "Подтверждение",
  },
];

export const ARAY_NEW_SITE_RELEASE_STEPS = [
  {
    title: "Профиль бизнеса",
    text: "ARAY получает домен, нишу, город, контакты, стиль, источник каталога и ответственного партнера.",
  },
  {
    title: "Tenant и данные",
    text: "Создается отдельный tenant: товары, клиенты, заявки, CRM, финансы, роли и аналитика живут отдельно.",
  },
  {
    title: "Превью",
    text: "Сайт открывается как черновик, чтобы мы проверили каталог, формы, мобильный вид, PWA и тексты.",
  },
  {
    title: "Админка",
    text: "Проект получает свой рабочий вход вида domain.ru/admin или временный адрес до подключения домена.",
  },
  {
    title: "Релиз ядра",
    text: "После проверки ядро ARAY раскатывается на нужную установку без смешивания данных с другими сайтами.",
  },
  {
    title: "Финальный запуск",
    text: "Домен, уведомления, аналитика, оплату и партнерские доступы включаем только после подтверждения.",
  },
];

export const ARAY_DUPLICATE_SITE_STEPS = [
  {
    title: "Выбрать шаблон",
    text: "Партнер берет PiloRus или будущий проверенный сайт как основу: структура, блоки, CRM, PWA, роли и форма заявки.",
  },
  {
    title: "Дублировать механику",
    text: "ARAY копирует только рабочую механику сайта: страницы, блоки, настройки витрины, маршруты, модули и сценарии.",
  },
  {
    title: "Очистить приватное",
    text: "Заказы, клиенты, платежи, ключи, сессии, чужие уведомления и аналитика не переносятся в новый бизнес.",
  },
  {
    title: "Заменить бизнес",
    text: "ARAY вместе с партнером меняет нишу, товары, услуги, цены, фото, тексты, акции, бренд, город и контакты.",
  },
  {
    title: "Показать превью",
    text: "Партнер видит готовый черновик, правит блоки, проверяет мобильный вид, заявки, каталог, PWA и SEO.",
  },
  {
    title: "Запустить как отдельный сайт",
    text: "После подтверждения создается отдельная админка, подключается домен, уведомления, аналитика и доступы команды.",
  },
];

export const ARAY_OPERATOR_BOUNDARY: ArayOperatorBoundary[] = [
  {
    title: "ARAY делает сам",
    text: "Собирает черновик, готовит блоки, проверяет навигацию, читает статус, показывает превью и пишет понятный отчет.",
    level: "self",
  },
  {
    title: "ARAY просит подтвердить",
    text: "Создание tenant, подключение домена, боевой деплой, изменение ролей, отправка счета и действия с платежами.",
    level: "confirm",
  },
  {
    title: "ARAY не делает молча",
    text: "Удаление данных, смена платежного провайдера, перенос боевого домена и публикация на отдельный сервер без проверки.",
    level: "blocked",
  },
];

function targetStatus(profile: MultisiteSiteProfile): ArayDeploymentTargetStatus {
  if (profile.deploymentMode === "shared-aray") return "synced";
  if (profile.deploymentMode === "external-server") return "needs-channel";
  return "preview";
}

function targetVersion(profile: MultisiteSiteProfile) {
  if (profile.deploymentMode === "shared-aray") return ARAY_CORE_RELEASE_VERSION;
  return "зафиксировать после подключения канала";
}

function targetAction(profile: MultisiteSiteProfile) {
  if (profile.deploymentMode === "shared-aray") {
    return "держим как базу ARAY и прогоняем проверки перед каждым выпуском";
  }

  return `проверить доменную карту ${profile.domain} -> ${profile.tenantId}, затем подключить deploy-ключ, бэкап и smoke-проверку`;
}

export function getArayDeploymentTargets(): ArayDeploymentTarget[] {
  const liveTargets = getArayManagedSiteProfiles().map((profile) => ({
    id: profile.id,
    name: profile.title,
    domain: profile.domain,
    tenantId: profile.tenantId,
    sourceTenantId: profile.sourceTenantId,
    mode: profile.deploymentMode,
    status: targetStatus(profile),
    currentVersion: targetVersion(profile),
    nextAction: targetAction(profile),
    publicHref: getMultisitePublicHref(profile),
    adminHref: getMultisiteAdminHref(profile),
  }));

  return [
    ...liveTargets,
    {
      id: "next-client",
      name: "Следующий клиент",
      domain: "domain.ru",
      tenantId: "new-site",
      sourceTenantId: "pilorus",
      mode: "future-server",
      status: "planned",
      currentVersion: "после создания tenant",
      nextAction: "создать профиль, превью, админку и подключить домен после проверки",
      publicHref: "/admin/site/constructor",
      adminHref: "/admin/site/constructor",
    },
  ];
}

export function getArayReleaseControl() {
  const targets = getArayDeploymentTargets();
  const passedGates = ARAY_RELEASE_GATES.filter((gate) => gate.status === "passed").length;
  const manualGates = ARAY_RELEASE_GATES.filter((gate) => gate.status === "manual-confirm").length;
  const nextGates = ARAY_RELEASE_GATES.filter((gate) => gate.status === "next").length;

  return {
    version: ARAY_CORE_RELEASE_VERSION,
    channel: "ARAY CMS / управляемый выпуск",
    status: nextGates > 0 ? "готовим канал отдельных серверов" : "готово к выпуску",
    targets,
    gates: ARAY_RELEASE_GATES,
    newSiteSteps: ARAY_NEW_SITE_RELEASE_STEPS,
    duplicateSiteSteps: ARAY_DUPLICATE_SITE_STEPS,
    operatorBoundary: ARAY_OPERATOR_BOUNDARY,
    summary: {
      targets: targets.length,
      liveTargets: targets.filter((target) => target.status !== "planned").length,
      passedGates,
      manualGates,
      nextGates,
    },
  };
}
