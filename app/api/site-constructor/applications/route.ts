export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function cleanString(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim().slice(0, 700) : fallback;
}

export async function POST(req: Request) {
  const body = asRecord(await req.json().catch(() => null));
  const storeName = cleanString(body.storeName, "Новый магазин");
  const contactName = cleanString(body.contactName, storeName);
  const phone = cleanString(body.phone);
  const email = cleanString(body.email);
  const managerName = cleanString(body.managerName);
  const referralCode = cleanString(body.referralCode);

  if (!storeName || (!phone && !email)) {
    return NextResponse.json({
      ok: false,
      error: "Нужны название магазина и телефон или email",
    }, { status: 400 });
  }

  const lines = [
    `Заявка ARAY Production на запуск сайта: ${storeName}`,
    `Тип: ${cleanString(body.businessType, "construction")}`,
    `Город: ${cleanString(body.city) || "не указан"}`,
    `Домен: ${cleanString(body.domain) || "не указан"}`,
    `Сеть: ${cleanString(body.networkName) || cleanString(body.networkId) || "один магазин"}`,
    `Код точки: ${cleanString(body.siteCode) || cleanString(body.tenantId) || "не указан"}`,
    `Прайс: ${cleanString(body.priceFileName) || "не загружен"}`,
    `Доставка: ${cleanString(body.delivery) || "не указана"}`,
    `Оплата: ${cleanString(body.payment) || "не указана"}`,
    `Менеджер/реферал: ${managerName || "не указан"}`,
    `Реферальный код: ${referralCode || "не указан"}`,
    `Вознаграждение: ${cleanString(body.rewardPlan, "referral-percent")}`,
    `Источник: ${cleanString(body.referralSource, "PiloRus")}`,
    `Комментарий: ${cleanString(body.notes) || "нет"}`,
  ];

  const lead = await prisma.lead.create({
    data: {
      tenantId: "pilorus",
      name: contactName,
      phone: phone || null,
      email: email || null,
      company: storeName,
      source: "REFERRAL",
      comment: lines.join("\n"),
      tags: [
        "aray-production",
        "store-constructor",
        cleanString(body.businessType, "construction"),
        cleanString(body.networkMode, "single"),
        referralCode ? `ref:${referralCode}` : "ref:none",
      ],
    },
  });

  return NextResponse.json({
    ok: true,
    leadId: lead.id,
  });
}
