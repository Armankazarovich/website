export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import type { NotificationChannel, NotificationStatus, Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { requireArayModuleAccess } from "@/lib/aray-module-auth";
import { canAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const STATUSES = new Set<NotificationStatus>([
  "DRAFT",
  "QUEUED",
  "SENT",
  "PARTIAL",
  "FAILED",
  "READ",
  "ARCHIVED",
]);

const CHANNELS = new Set<NotificationChannel>([
  "PUSH",
  "TELEGRAM",
  "EMAIL",
  "SMS",
  "SYSTEM",
  "ARAY",
]);

function parseTake(value: string | null) {
  const take = Number(value || 30);
  if (!Number.isFinite(take)) return 30;
  return Math.min(Math.max(Math.floor(take), 1), 80);
}

function toStatus(value: string | null) {
  return value && STATUSES.has(value as NotificationStatus)
    ? (value as NotificationStatus)
    : null;
}

function toChannel(value: string | null) {
  return value && CHANNELS.has(value as NotificationChannel)
    ? (value as NotificationChannel)
    : null;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || !canAccess(session.user.role, "notifications")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const moduleAccess = await requireArayModuleAccess({ moduleId: "core.notifications", role: session.user.role });
  if (!moduleAccess.authorized) return moduleAccess.response;

  const take = parseTake(req.nextUrl.searchParams.get("take"));
  const status = toStatus(req.nextUrl.searchParams.get("status"));
  const channel = toChannel(req.nextUrl.searchParams.get("channel"));

  const where: Prisma.NotificationCenterEventWhereInput = {
    tenantId: "pilorus",
    ...(status ? { status } : {}),
    ...(channel ? { channel } : {}),
  };

  const [events, total, queued, sent, partial, failed, inbound] = await Promise.all([
    prisma.notificationCenterEvent.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take,
    }),
    prisma.notificationCenterEvent.count({ where: { tenantId: "pilorus" } }),
    prisma.notificationCenterEvent.count({ where: { tenantId: "pilorus", status: "QUEUED" } }),
    prisma.notificationCenterEvent.count({ where: { tenantId: "pilorus", status: "SENT" } }),
    prisma.notificationCenterEvent.count({ where: { tenantId: "pilorus", status: "PARTIAL" } }),
    prisma.notificationCenterEvent.count({ where: { tenantId: "pilorus", status: "FAILED" } }),
    prisma.notificationCenterEvent.count({ where: { tenantId: "pilorus", direction: "INBOUND" } }),
  ]);

  return NextResponse.json({
    events,
    summary: {
      total,
      queued,
      sent,
      partial,
      failed,
      inbound,
    },
  });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session || !canAccess(session.user.role, "notifications")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const moduleAccess = await requireArayModuleAccess({ moduleId: "core.notifications", role: session.user.role });
  if (!moduleAccess.authorized) return moduleAccess.response;

  const body = await req.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id.trim() : "";
  const action = typeof body?.action === "string" ? body.action : "";

  if (!id || !["read", "unread", "archive", "delete"].includes(action)) {
    return NextResponse.json({ error: "Некорректное действие" }, { status: 400 });
  }

  if (action === "delete" && !["SUPER_ADMIN", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const existing = await prisma.notificationCenterEvent.findFirst({
    where: { id, tenantId: "pilorus" },
    select: { id: true, status: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Событие не найдено" }, { status: 404 });
  }

  const now = new Date();
  if (action === "delete") {
    await prisma.notificationCenterEvent.delete({ where: { id } });
    return NextResponse.json({ ok: true, deleted: true });
  }

  const event = await prisma.notificationCenterEvent.update({
    where: { id },
    data:
      action === "archive"
        ? { status: "ARCHIVED", readAt: now, archivedAt: now }
        : action === "read"
          ? { readAt: now }
          : { readAt: null },
  });

  return NextResponse.json({ ok: true, event });
}
