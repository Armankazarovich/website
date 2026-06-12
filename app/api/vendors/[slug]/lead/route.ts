export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentTenantId } from "@/lib/tenant-context";
import { normalizePhone } from "@/lib/phone";
import { rateLimit } from "@/lib/rate-limit";
import { recordNotificationCenterEvent } from "@/lib/notification-center";

const vendorLeadLimiter = rateLimit("vendor-lead", 6, 60 * 60 * 1000);

function cleanString(value: unknown, max = 500) {
  if (typeof value !== "string") return "";
  return value
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function cleanEmail(value: unknown) {
  const email = cleanString(value, 160).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}

function getClientKey(req: NextRequest, slug: string) {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || req.headers.get("x-real-ip") || "anon";
  return `${slug}:${ip}`;
}

export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const tenantId = getCurrentTenantId();
    const slug = cleanString(params.slug, 120).toLowerCase();
    if (!slug) return NextResponse.json({ error: "Продавец не найден" }, { status: 404 });

    if (!vendorLeadLimiter.check(getClientKey(req, slug))) {
      return NextResponse.json(
        { error: "Слишком много заявок. Попробуйте позже или позвоните продавцу." },
        { status: 429 },
      );
    }

    const body = await req.json().catch(() => ({}));
    const honey = cleanString((body as Record<string, unknown>).website, 120);
    if (honey) return NextResponse.json({ ok: true });

    const supplier = await prisma.supplier.findFirst({
      where: {
        tenantId,
        slug,
        active: true,
        status: "ACTIVE",
        storefrontEnabled: true,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        phone: true,
        email: true,
        featuredSeller: true,
      },
    });

    if (!supplier) return NextResponse.json({ error: "Продавец не найден" }, { status: 404 });

    const name = cleanString((body as Record<string, unknown>).name, 120);
    const phoneRaw = cleanString((body as Record<string, unknown>).phone, 40);
    const phone = normalizePhone(phoneRaw);
    const email = cleanEmail((body as Record<string, unknown>).email);
    const volume = cleanString((body as Record<string, unknown>).volume, 220);
    const deliveryAddress = cleanString((body as Record<string, unknown>).deliveryAddress, 240);
    const message = cleanString((body as Record<string, unknown>).message, 1000);
    const legalConsent = (body as Record<string, unknown>).legalConsent === true;

    if (name.length < 2) return NextResponse.json({ error: "Укажите имя" }, { status: 400 });
    if (!phone) return NextResponse.json({ error: "Укажите корректный телефон" }, { status: 400 });
    if (!legalConsent) {
      return NextResponse.json(
        { error: "Подтвердите согласие на обработку персональных данных" },
        { status: 400 },
      );
    }

    const count = await prisma.lead.count({ where: { tenantId, stage: "NEW", deletedAt: null } });
    const comment = [
      `Продавец: ${supplier.name}`,
      `Витрина: /vendors/${supplier.slug}`,
      volume ? `Объем или задача: ${volume}` : null,
      deliveryAddress ? `Адрес доставки: ${deliveryAddress}` : null,
      message ? `Комментарий: ${message}` : null,
    ].filter(Boolean).join("\n");

    const lead = await prisma.lead.create({
      data: {
        tenantId,
        name,
        phone,
        email: email || null,
        company: `Витрина: ${supplier.name}`,
        source: "WEBSITE",
        stage: "NEW",
        comment,
        tags: [
          "Витрина продавца",
          `seller:${supplier.slug}`,
          `supplier-id:${supplier.id}`,
          supplier.featuredSeller ? "ПилоРус №1" : "Продавец",
        ],
        sortOrder: count,
      },
    });

    await prisma.leadActivity.create({
      data: {
        leadId: lead.id,
        type: "SYSTEM",
        text: `Заявка с витрины продавца ${supplier.name}. Покупатель оставил телефон и запрос на подбор.`,
      },
    });

    await recordNotificationCenterEvent({
      tenantId,
      direction: "SYSTEM",
      channel: "SYSTEM",
      status: "SENT",
      source: "SYSTEM",
      title: "Новая заявка продавцу",
      body: `${name} → ${supplier.name}${volume ? ` · ${volume}` : ""}`,
      url: `/admin/crm?leadId=${lead.id}`,
      recipientRole: "STAFF",
      entityType: "LEAD",
      entityId: lead.id,
      entityLabel: `${name} — ${supplier.name}`,
      entityHref: `/admin/crm?leadId=${lead.id}`,
      metadata: {
        eventKey: "new_lead",
        source: "vendor_storefront",
        supplierId: supplier.id,
        supplierSlug: supplier.slug,
      },
      sentAt: new Date(),
    }).catch((error) => {
      console.error("[vendor-lead] notification event failed", error);
    });

    import("@/lib/workflow-engine").then(({ runWorkflows }) => {
      runWorkflows("lead_created", {
        tenantId,
        leadId: lead.id,
        name: lead.name,
        phone: lead.phone || "",
        email: lead.email || "",
        company: lead.company || "",
        source: lead.source,
        stage: lead.stage,
        value: null,
        assigneeId: null,
        supplierId: supplier.id,
        supplierSlug: supplier.slug,
      }).catch(console.error);
    }).catch(() => {});

    revalidatePath("/admin/crm");
    revalidatePath(`/vendors/${supplier.slug}`);

    return NextResponse.json({ ok: true, leadId: lead.id }, { status: 201 });
  } catch (error) {
    console.error("[vendor-lead] failed", error);
    return NextResponse.json({ error: "Не удалось отправить заявку" }, { status: 500 });
  }
}
