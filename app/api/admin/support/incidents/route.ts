export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendPushToStaff } from "@/lib/push";
import { enqueueTerminalSyncJob } from "@/lib/terminal-sync";

const STAFF_ROLES = ["SUPER_ADMIN", "ADMIN", "MANAGER", "COURIER", "ACCOUNTANT", "WAREHOUSE", "SELLER"];
const ADMIN_ROLES = ["SUPER_ADMIN", "ADMIN"];

function normalizeSeverity(value: unknown) {
  const severity = String(value || "medium").toLowerCase();
  return ["low", "medium", "high", "critical"].includes(severity) ? severity : "medium";
}

function makeIncidentCode() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `ARAY-${date}-${rand}`;
}

export async function GET() {
  const session = await auth();
  if (!session || !ADMIN_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const incidents = await prisma.supportIncident.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { createdBy: { select: { id: true, name: true, email: true, role: true } } },
  });

  return NextResponse.json({
    incidents: incidents.map((incident) => ({
      ...incident,
      createdAt: incident.createdAt.toISOString(),
      updatedAt: incident.updatedAt.toISOString(),
      resolvedAt: incident.resolvedAt?.toISOString() || null,
    })),
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || !STAFF_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const title = String(body.title || "Нужна помощь по терминалу").trim();
  const message = String(body.message || "").trim();
  if (!message) {
    return NextResponse.json({ error: "Опишите проблему" }, { status: 400 });
  }

  const incident = await prisma.supportIncident.create({
    data: {
      code: makeIncidentCode(),
      title: title.slice(0, 160),
      category: String(body.category || "terminal").slice(0, 40),
      severity: normalizeSeverity(body.severity),
      source: String(body.source || "aray").slice(0, 40),
      page: body.page ? String(body.page).slice(0, 300) : null,
      orderId: body.orderId ? String(body.orderId).slice(0, 80) : null,
      device: body.device ? String(body.device).slice(0, 160) : null,
      message,
      diagnostics: body.diagnostics && typeof body.diagnostics === "object" ? body.diagnostics : {},
      createdById: session.user.id,
    },
  });

  sendPushToStaff({
    title: `Инцидент ${incident.code}`,
    body: `${incident.title} · ${incident.severity}`,
    url: "/admin/terminals",
    icon: "/icons/icon-192x192.png",
  }).catch(console.error);

  enqueueTerminalSyncJob({
    channel: "support",
    event: "support.incident.created",
    entityType: "incident",
    entityId: incident.id,
    priority: incident.severity === "critical" ? 1 : 3,
    payload: {
      code: incident.code,
      title: incident.title,
      category: incident.category,
      severity: incident.severity,
      page: incident.page,
      orderId: incident.orderId,
      device: incident.device,
    },
    idempotencyKey: `support:incident:${incident.id}`,
  }).catch(console.error);

  return NextResponse.json({ incident }, { status: 201 });
}
