export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { requireArayModuleAccess } from "@/lib/aray-module-auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";

type SiteStatus = "draft" | "published";

type ConstructorSettings = {
  createdBy: "aray-production";
  status: SiteStatus;
  referralSource: string;
  networkMode: "single" | "network";
  networkId: string;
  networkName: string;
  siteCode: string;
  businessType: string;
  city: string;
  contactName: string;
  phone: string;
  email: string;
  warehouse: string;
  workHours: string;
  delivery: string;
  payment: string;
  logoName: string;
  priceFileName: string;
  priceFileSize: number;
  managerName: string;
  referralCode: string;
  rewardPlan: string;
  notes: string;
  updatedById: string;
  updatedAt: string;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function cleanString(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim().slice(0, 500) : fallback;
}

function cleanStatus(value: unknown): SiteStatus {
  return value === "draft" ? "draft" : "published";
}

function cleanDomain(value: unknown) {
  const domain = cleanString(value).toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "");
  if (!domain) return null;
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(domain)) return null;
  return domain;
}

function makeSlug(body: Record<string, unknown>) {
  const fromTenant = cleanString(body.tenantId);
  const fromCode = cleanString(body.siteCode);
  const fromDomain = cleanString(body.domain).replace(/\..*$/, "");
  const fromName = cleanString(body.storeName, "store");
  const slug = slugify(fromTenant || fromCode || fromDomain || fromName).slice(0, 40);
  return /^[a-z0-9-]{2,40}$/.test(slug) ? slug : `site-${Date.now().toString(36)}`;
}

function readConstructorSettings(settings: unknown): ConstructorSettings | null {
  const root = asRecord(settings);
  const constructor = asRecord(root.storeConstructor);
  if (constructor.createdBy !== "aray-production") return null;
  return constructor as ConstructorSettings;
}

function mapTenantToSite(tenant: {
  id: string;
  slug: string;
  name: string;
  domain: string | null;
  primaryColor: string | null;
  logoUrl: string | null;
  active: boolean;
  settings: unknown;
  createdAt: Date;
  updatedAt: Date;
}) {
  const constructor = readConstructorSettings(tenant.settings);
  if (!constructor) return null;

  return {
    id: tenant.id,
    tenantId: tenant.slug,
    networkId: constructor.networkId || "single",
    createdAt: tenant.createdAt.toISOString(),
    referralSource: constructor.referralSource || "PiloRus",
    status: constructor.status || "draft",
    networkMode: constructor.networkMode || "single",
    networkName: constructor.networkName || "",
    storeName: tenant.name,
    siteCode: constructor.siteCode || tenant.slug,
    businessType: constructor.businessType || "construction",
    city: constructor.city || "",
    domain: tenant.domain || "",
    contactName: constructor.contactName || "",
    phone: constructor.phone || "",
    email: constructor.email || "",
    warehouse: constructor.warehouse || "",
    workHours: constructor.workHours || "",
    delivery: constructor.delivery || "",
    payment: constructor.payment || "",
    accentColor: tenant.primaryColor || "hsl(var(--primary))",
    logoName: constructor.logoName || "",
    priceFileName: constructor.priceFileName || "",
    priceFileSize: constructor.priceFileSize || 0,
    managerName: constructor.managerName || "",
    referralCode: constructor.referralCode || "",
    rewardPlan: constructor.rewardPlan || "",
    notes: constructor.notes || "",
  };
}

async function ensureAccess() {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth;

  const moduleAccess = await requireArayModuleAccess({
    moduleId: "constructor.store-builder",
    role: auth.role,
  });
  if (!moduleAccess.authorized) return moduleAccess;

  return auth;
}

export async function GET() {
  const auth = await ensureAccess();
  if (!auth.authorized) return auth.response;

  const tenants = await prisma.tenant.findMany({
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  return NextResponse.json({
    ok: true,
    sites: tenants.map(mapTenantToSite).filter(Boolean),
  });
}

export async function POST(req: Request) {
  const auth = await ensureAccess();
  if (!auth.authorized) return auth.response;

  let body: Record<string, unknown>;
  try {
    body = asRecord(await req.json());
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  if (body.confirm !== true) {
    return NextResponse.json({ ok: false, error: "Confirmation required" }, { status: 400 });
  }
  const slug = makeSlug(body);
  const storeName = cleanString(body.storeName, "Новый магазин").slice(0, 120);
  const domain = cleanDomain(body.domain);
  const status = cleanStatus(body.status);
  const settingsRoot = asRecord((await prisma.tenant.findUnique({ where: { slug }, select: { settings: true } }))?.settings);

  if (domain) {
    const domainOwner = await prisma.tenant.findUnique({
      where: { domain },
      select: { slug: true },
    });
    if (domainOwner && domainOwner.slug !== slug) {
      return NextResponse.json({ ok: false, error: "Этот домен уже закреплен за другим сайтом" }, { status: 409 });
    }
  }

  const networkMode = body.networkMode === "network" ? "network" : "single";
  const networkSlug = slugify(cleanString(body.networkName) || slug).slice(0, 40) || slug;
  const constructorSettings: ConstructorSettings = {
    createdBy: "aray-production",
    status,
    referralSource: cleanString(body.referralSource, "PiloRus"),
    networkMode,
    networkId: networkMode === "network" ? `network-${networkSlug}` : "single",
    networkName: cleanString(body.networkName),
    siteCode: cleanString(body.siteCode, slug) || slug,
    businessType: cleanString(body.businessType, "construction"),
    city: cleanString(body.city),
    contactName: cleanString(body.contactName),
    phone: cleanString(body.phone),
    email: cleanString(body.email),
    warehouse: cleanString(body.warehouse),
    workHours: cleanString(body.workHours),
    delivery: cleanString(body.delivery),
    payment: cleanString(body.payment),
    logoName: cleanString(body.logoName),
    priceFileName: cleanString(body.priceFileName),
    priceFileSize: typeof body.priceFileSize === "number" ? body.priceFileSize : 0,
    managerName: cleanString(body.managerName),
    referralCode: cleanString(body.referralCode),
    rewardPlan: cleanString(body.rewardPlan, "referral-percent"),
    notes: cleanString(body.notes),
    updatedById: auth.userId,
    updatedAt: new Date().toISOString(),
  };

  const tenant = await prisma.tenant.upsert({
    where: { slug },
    create: {
      slug,
      name: storeName,
      domain,
      primaryColor: cleanString(body.accentColor, "hsl(var(--primary))"),
      active: status === "published",
      plan: "free",
      settings: {
        ...settingsRoot,
        storeConstructor: constructorSettings,
      },
    },
    update: {
      name: storeName,
      domain,
      primaryColor: cleanString(body.accentColor, "hsl(var(--primary))"),
      active: status === "published",
      settings: {
        ...settingsRoot,
        storeConstructor: constructorSettings,
      },
    },
  });

  return NextResponse.json({
    ok: true,
    site: mapTenantToSite(tenant),
  });
}
