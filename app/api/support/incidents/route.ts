export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPushToStaff } from "@/lib/push";
import { getCurrentTenantId } from "@/lib/tenant-context";

function makeIncidentCode() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `SITE-${date}-${rand}`;
}

function cleanText(value: unknown, max: number) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

export async function POST(req: NextRequest) {
  const tenantId = getCurrentTenantId();
  const body = await req.json().catch(() => ({}));

  const message = cleanText(body.message, 1200);
  if (message.length < 5) {
    return NextResponse.json({ error: "Опишите, что не получилось" }, { status: 400 });
  }

  const contact = cleanText(body.contact, 160);
  const page = cleanText(body.page, 300);
  const device = cleanText(body.device, 180);

  const incident = await prisma.supportIncident.create({
    data: {
      tenantId,
      code: makeIncidentCode(),
      title: cleanText(body.title, 120) || "Сообщение об ошибке на сайте",
      category: "site",
      severity: "medium",
      source: "public-site",
      page: page || null,
      device: device || null,
      message: contact ? `${message}\n\nКонтакт: ${contact}` : message,
      diagnostics: {
        href: page || null,
        contact: contact || null,
        viewport: body.viewport || null,
        userAgent: body.userAgent ? cleanText(body.userAgent, 300) : null,
      },
    },
  });

  sendPushToStaff({
    title: `Ошибка на сайте ${incident.code}`,
    body: `${incident.title}: ${message.slice(0, 90)}`,
    url: "/admin/terminals",
    icon: "/icons/icon-192x192.png",
  }, {
    tenantId,
    source: "SYSTEM",
    recipientRole: "STAFF",
    entityType: "SUPPORT_INCIDENT",
    entityId: incident.id,
    entityLabel: incident.code,
    entityHref: "/admin/terminals",
    metadata: {
      eventKey: "support.incident.public",
      code: incident.code,
      page: page || null,
    },
  }).catch(console.error);

  return NextResponse.json({
    ok: true,
    code: incident.code,
  }, { status: 201 });
}
