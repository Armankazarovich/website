export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentTenantId } from "@/lib/tenant-context";

const MESSENGER_ROLES = ["SUPER_ADMIN", "ADMIN", "MANAGER", "SELLER"] as const;
const DIRECTIONS = new Set(["manager", "client", "aray", "system"]);

async function getSession() {
  const session = await auth();
  const role = session?.user?.role;
  const id = session?.user?.id;
  if (!session || !MESSENGER_ROLES.includes(role as any)) return null;
  return { role, id };
}

function cleanText(value: unknown, maxLength = 1800) {
  if (typeof value !== "string") return "";
  return value
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, maxLength);
}

function directionPrefix(direction: string) {
  if (direction === "client") return "Клиент";
  if (direction === "aray") return "ARAY";
  if (direction === "system") return "Система";
  return "Менеджер";
}

function serializeActivity(activity: any) {
  return {
    id: activity.id,
    leadId: activity.leadId,
    type: activity.type,
    text: activity.text,
    createdAt: activity.createdAt.toISOString(),
    user: activity.user
      ? { id: activity.user.id, name: activity.user.name, email: activity.user.email }
      : null,
  };
}

function serializeThread(lead: any) {
  const activities = [...(lead.activities || [])]
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    .map(serializeActivity);
  const last = activities[activities.length - 1] || null;

  return {
    id: lead.id,
    name: lead.name,
    phone: lead.phone,
    email: lead.email,
    company: lead.company,
    source: lead.source,
    stage: lead.stage,
    value: lead.value ? lead.value.toString() : null,
    currency: lead.currency,
    comment: lead.comment,
    tags: lead.tags || [],
    createdAt: lead.createdAt.toISOString(),
    updatedAt: lead.updatedAt.toISOString(),
    assignee: lead.assignee
      ? { id: lead.assignee.id, name: lead.assignee.name, email: lead.assignee.email }
      : null,
    activities,
    activityCount: lead._count?.activities ?? activities.length,
    lastActivityText: last?.text || lead.comment || "",
    lastActivityAt: last?.createdAt || lead.updatedAt.toISOString(),
  };
}

const threadInclude = {
  assignee: { select: { id: true, name: true, email: true } },
  activities: {
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "desc" as const },
    take: 80,
  },
  _count: { select: { activities: true } },
};

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = getCurrentTenantId();

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректные данные сообщения" }, { status: 400 });
  }

  const text = cleanText(body.text);
  const rawDirection = cleanText(body.direction, 40).toLowerCase();
  const direction = DIRECTIONS.has(rawDirection) ? rawDirection : "manager";
  const prefix = directionPrefix(direction);

  if (!text) return NextResponse.json({ error: "Сообщение пустое" }, { status: 400 });

  const existing = await prisma.lead.findFirst({
    where: { id: params.id, tenantId, deletedAt: null },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Диалог не найден" }, { status: 404 });

  const thread = await prisma.$transaction(async (tx) => {
    await tx.leadActivity.create({
      data: {
        leadId: params.id,
        type: direction === "system" ? "SYSTEM" : "NOTE",
        text: `${prefix}: ${text}`,
        userId: s.id,
      },
    });

    await tx.lead.update({
      where: { id: params.id },
      data: { updatedAt: new Date() },
    });

    return tx.lead.findUniqueOrThrow({
      where: { id: params.id },
      include: threadInclude,
    });
  });

  const delivery = {
    channel: "crm",
    status: "saved",
    externalSent: false,
    message:
      direction === "manager"
        ? "Ответ сохранён в CRM. Внешний канал подключим через выбранного провайдера связи."
        : direction === "client"
          ? "Входящее сохранено в CRM-диалоге."
          : "Событие сохранено в CRM.",
  };

  return NextResponse.json({ thread: serializeThread(thread), delivery });
}
