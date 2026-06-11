export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireManager } from "@/lib/auth-helpers";
import { requireArayModuleAccess } from "@/lib/aray-module-auth";
import {
  buildArayImportedSiteSlug,
  scanAraySourceSite,
  type AraySourceSiteScan,
} from "@/lib/aray-site-import";
import { createArayMultisiteClone } from "@/lib/aray-multisite-clone";
import { getCurrentTenantId } from "@/lib/tenant-context";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function cleanString(value: unknown, maxLength = 240) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function buildImportNotes(scan: AraySourceSiteScan) {
  return [
    `Источник: ${scan.finalUrl}`,
    `Сфера: ${scan.businessType}`,
    scan.description ? `Описание: ${scan.description}` : "",
    scan.products.length ? `Товары/услуги: ${scan.products.slice(0, 8).join(", ")}` : "",
    scan.categories.length ? `Категории: ${scan.categories.slice(0, 8).join(", ")}` : "",
    scan.promotions.length ? `Акции: ${scan.promotions.slice(0, 8).join(", ")}` : "",
    scan.contacts.phones.length ? `Телефоны: ${scan.contacts.phones.join(", ")}` : "",
    scan.contacts.emails.length ? `Почта: ${scan.contacts.emails.join(", ")}` : "",
    scan.warnings.length ? `Уточнить: ${scan.warnings.join("; ")}` : "",
  ].filter(Boolean).join("\n");
}

async function createDraftFromScan(scan: AraySourceSiteScan, userId: string, sourceTenantId: string) {
  const slug = buildArayImportedSiteSlug(scan);
  const name = scan.title || scan.domain;
  const brief = [
    "Скан ARAY CMS: бриф для нового сайта.",
    `Источник: ${scan.finalUrl}`,
    buildImportNotes(scan),
    "Важно: домен источника не подключать автоматически. Домен, оплаты и публикация только после подтверждения.",
  ].filter(Boolean).join("\n\n");

  const clone = await createArayMultisiteClone({
    siteName: name,
    targetSlug: slug,
    sourceTenantId,
    businessType: scan.businessType,
    brief,
    seedCatalog: {
      categories: scan.categories,
      products: scan.products,
      images: scan.images.map((image) => image.src),
    },
    contactName: name,
    phone: scan.contacts.phones[0] || "",
    email: scan.contacts.emails[0] || "",
    userId,
  });

  return {
    id: clone.site.id,
    tenantId: clone.site.tenantId,
    slug: clone.site.slug,
    name: clone.site.name,
    status: clone.site.status,
    domain: clone.site.domain,
    previewHref: clone.site.previewHref,
    adminHref: clone.site.adminHref,
    report: clone.report,
  };
}

export async function POST(req: Request) {
  const auth = await requireManager();
  if (!auth.authorized) return auth.response;

  const moduleAccess = await requireArayModuleAccess({
    moduleId: "constructor.store-builder",
    role: auth.role,
  });
  if (!moduleAccess.authorized) return moduleAccess.response;

  const body = asRecord(await req.json().catch(() => null));
  const sourceTenantId = getCurrentTenantId();
  const url = cleanString(body.url, 500);
  const createDraft = body.createDraft === true;

  if (createDraft && body.confirm !== true) {
    return NextResponse.json({ ok: false, error: "Подтвердите создание черновика сайта" }, { status: 400 });
  }

  if (!url) {
    return NextResponse.json({ ok: false, error: "Введите домен или ссылку сайта" }, { status: 400 });
  }

  try {
    const scan = await scanAraySourceSite(url);
    const site = createDraft ? await createDraftFromScan(scan, auth.userId, sourceTenantId) : null;
    return NextResponse.json({ ok: true, scan, site });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Не удалось просканировать сайт",
    }, { status: 400 });
  }
}
