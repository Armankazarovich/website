export type MultisiteSiteId = "pilorus" | "zaidr";

export type MultisiteSiteProfile = {
  id: MultisiteSiteId;
  tenantId: string;
  sourceTenantId: string;
  name: string;
  title: string;
  tagline: string;
  description: string;
  domain: string;
  basePath: string;
  publicUrl?: string;
  adminUrl?: string;
  deploymentMode: "shared-aray" | "external-server";
  logoUrl: string;
  markUrl?: string;
  accentColor: string;
  city: string;
  region: string;
  phoneDisplay: string;
  phoneHref: string;
  email: string;
  address: string;
  workingHours: string;
  delivery: string;
  payment: string;
  catalogSource: string;
  status: "template" | "clone-live";
};

export const MULTISITE_SITE_PROFILES = {
  pilorus: {
    id: "pilorus",
    tenantId: "pilorus",
    sourceTenantId: "pilorus",
    name: "Основной сайт",
    title: "Основной сайт",
    tagline: "Каталог, заявки, CRM и Арай в одной системе",
    description:
      "База ARAY: каталог, корзина, заявки, PWA, CRM, роли, админка и помощник Арай.",
    domain: "pilo-rus.ru",
    basePath: "",
    publicUrl: "https://pilo-rus.ru",
    adminUrl: "/admin",
    deploymentMode: "shared-aray",
    logoUrl: "/logo.png",
    markUrl: "/icons/icon-192.png",
    accentColor: "hsl(var(--primary))",
    city: "Воронеж",
    region: "Воронежская область",
    phoneDisplay: "+7 900 000-00-00",
    phoneHref: "+79000000000",
    email: "info@pilo-rus.ru",
    address: "Воронеж",
    workingHours: "Ежедневно",
    delivery: "Доставка по городу и области, самовывоз со склада.",
    payment: "Наличные, перевод, счет для юрлиц.",
    catalogSource: "Каталог ARAY CMS",
    status: "template",
  },
  zaidr: {
    id: "zaidr",
    tenantId: "zaidr",
    sourceTenantId: "pilorus",
    name: "Зейдр",
    title: "Зейдр стройматериалы",
    tagline: "Стройматериалы и расходники в Воронеже",
    description:
      "Магазин стройматериалов на механике ARAY CMS: каталог, заявка, CRM, Арай и подготовка к домену.",
    domain: "zaidr.ru",
    basePath: "/zaidr",
    publicUrl: "https://zaidr.ru",
    adminUrl: "https://zaidr.ru/admin",
    deploymentMode: "external-server",
    logoUrl: "/images/zaidr/zaidr-logo.png",
    markUrl: "/images/zaidr/zaidr-mark.png",
    accentColor: "hsl(var(--primary))",
    city: "Воронеж",
    region: "Воронежская область",
    phoneDisplay: "+7 926 979-36-50",
    phoneHref: "+79269793650",
    email: "info@zaidr.ru",
    address: "Воронеж, склад и самовывоз по согласованию",
    workingHours: "Пн-Сб, по согласованию",
    delivery:
      "Доставка по городу и области, самовывоз со склада, расчет машины под объем заказа.",
    payment:
      "Наличные, перевод, счет для юрлиц, постоплата для постоянных клиентов после согласования.",
    catalogSource: "Прайсы РИЧ и брендбук Зейдр",
    status: "clone-live",
  },
} as const satisfies Record<MultisiteSiteId, MultisiteSiteProfile>;

export function isArayManagedSiteProfile(profile: MultisiteSiteProfile) {
  return profile.id === "pilorus" || profile.deploymentMode === "shared-aray";
}

export function getArayManagedSiteProfiles() {
  return Object.values(MULTISITE_SITE_PROFILES).filter(isArayManagedSiteProfile);
}

export function getMultisiteProfile(id: MultisiteSiteId) {
  return MULTISITE_SITE_PROFILES[id];
}

export function getMultisitePath(profile: MultisiteSiteProfile, path = "/") {
  const basePath = profile.basePath;

  if (!basePath) {
    return path;
  }

  if (path === "/" || path === "") {
    return basePath;
  }

  if (path.startsWith("#")) {
    return `${basePath}${path}`;
  }

  if (path.startsWith("/#")) {
    return `${basePath}${path.slice(1)}`;
  }

  return `${basePath}${path.startsWith("/") ? path : `/${path}`}`;
}

export function getMultisitePublicHref(profile: MultisiteSiteProfile) {
  return profile.publicUrl || getMultisitePath(profile, "/");
}

export function getMultisiteAdminHref(profile: MultisiteSiteProfile) {
  return profile.adminUrl || "/admin";
}

export function getMultisiteDomainMapHint() {
  return (Object.values(MULTISITE_SITE_PROFILES) as MultisiteSiteProfile[])
    .filter((profile) => profile.status !== "template" && profile.deploymentMode === "shared-aray")
    .map((profile) => `${profile.tenantId}=${profile.domain}`)
    .join(";");
}
