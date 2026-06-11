export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  ARAY_CLIENT_LEAD_TAGS,
  ARAY_MARKETING_MONTHLY_PRICE_RUB,
  buildArayClientActivityText,
  buildArayClientComment,
} from "@/lib/aray-crm-automation";
import { getCurrentTenantId } from "@/lib/tenant-context";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function clean(value: unknown, maxLength = 300): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export async function POST(request: Request) {
  try {
    const body = asRecord(await request.json().catch(() => null));
    const tenantId = getCurrentTenantId();

    const name = clean(body.name, 120);
    const phone = clean(body.phone, 80);
    const company = clean(body.company, 160);
    const city = clean(body.city, 120);
    const business = clean(body.business, 160);
    const service = clean(body.service, 160);
    const message = clean(body.message, 1200);
    const partner = clean(body.partner, 160) || "Yuva Studio";

    if (name.length < 2 || phone.replace(/\D/g, "").length < 10) {
      return NextResponse.json({ error: "Имя и телефон обязательны" }, { status: 400 });
    }

    const lead = await prisma.lead.create({
      data: {
        tenantId,
        name,
        phone,
        company: company || null,
        source: "WEBSITE",
        stage: "NEW",
        value: ARAY_MARKETING_MONTHLY_PRICE_RUB,
        currency: "RUB",
        comment: buildArayClientComment({ partner, city, business, service, message }),
        tags: ARAY_CLIENT_LEAD_TAGS,
        activities: {
          create: {
            type: "SYSTEM",
            text: buildArayClientActivityText(partner),
          },
        },
      },
      select: { id: true },
    });

    return NextResponse.json({ ok: true, id: lead.id });
  } catch (error) {
    console.error("ARAY marketing lead API error:", error);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
