export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function cleanString(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim().slice(0, 1200) : fallback;
}

function cleanItems(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return null;
      const data = item as Record<string, unknown>;
      return {
        sku: cleanString(data.sku).slice(0, 80),
        name: cleanString(data.name).slice(0, 240),
        category: cleanString(data.category).slice(0, 160),
        price: typeof data.price === "number" ? data.price : Number(data.price) || 0,
      };
    })
    .filter((item): item is { sku: string; name: string; category: string; price: number } =>
      Boolean(item?.name),
    )
    .slice(0, 40);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const payload = body && typeof body === "object" && !Array.isArray(body)
    ? body as Record<string, unknown>
    : {};

  const name = cleanString(payload.name, "Клиент Зейдр");
  const phone = cleanString(payload.phone);
  const message = cleanString(payload.message);
  const items = cleanItems(payload.items);

  if (!phone && !message && items.length === 0) {
    return NextResponse.json(
      { ok: false, error: "Укажите телефон, вопрос или товары для заявки" },
      { status: 400 },
    );
  }

  const total = items.reduce((sum, item) => sum + item.price, 0);
  const itemLines = items.map((item, index) => (
    `${index + 1}. ${item.name}${item.sku ? `, арт. ${item.sku}` : ""} - ${item.price} руб.`
  ));

  const lead = await prisma.lead.create({
    data: {
      tenantId: "pilorus",
      name,
      phone: phone || null,
      company: "Зейдр стройматериалы",
      source: "WEBSITE",
      stage: "NEW",
      value: total > 0 ? total : null,
      comment: [
        "Заявка с сайта Зейдр.",
        message ? `Комментарий: ${message}` : null,
        items.length ? "Товары:" : null,
        ...itemLines,
      ].filter(Boolean).join("\n"),
      tags: ["zaidr", "construction", "rich", "aray-site"],
    },
  });

  await prisma.leadActivity.create({
    data: {
      leadId: lead.id,
      type: "SYSTEM",
      text: "Арай принял заявку Зейдр: клиент, товары и комментарий сохранены в CRM.",
    },
  });

  return NextResponse.json({ ok: true, leadId: lead.id });
}
