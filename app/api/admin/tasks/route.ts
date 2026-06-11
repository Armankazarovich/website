export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentTenantId } from "@/lib/tenant-context";
import {
  buildOrderTaskRelation,
  mergeTaskRelations,
  normalizeTaskRelations,
  normalizeTaskRelationType,
} from "@/lib/task-relations";

const STAFF_ROLES = ["SUPER_ADMIN", "ADMIN", "MANAGER", "ACCOUNTANT", "WAREHOUSE", "SELLER", "COURIER"] as const;
const TASK_STATUSES = new Set(["BACKLOG", "TODO", "IN_PROGRESS", "REVIEW", "DONE"]);
const TASK_PRIORITIES = new Set(["LOW", "MEDIUM", "HIGH", "URGENT"]);

async function getSession() {
  const session = await auth();
  const role = session?.user?.role;
  const id = session?.user?.id;
  if (!session || !STAFF_ROLES.includes(role as any)) return null;
  return { role, id };
}

const taskInclude = {
  assignee: { select: { id: true, name: true, email: true } },
  createdBy: { select: { id: true, name: true } },
  order: { select: { id: true, orderNumber: true, guestName: true, guestPhone: true } },
  relations: { orderBy: { createdAt: "asc" as const } },
  comments: {
    include: { user: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" as const },
  },
};

function normalizeEnumValue(value: unknown, allowed: Set<string>, fallback: string) {
  const candidate = typeof value === "string" ? value.trim().toUpperCase() : "";
  return allowed.has(candidate) ? candidate : fallback;
}

function isEnumValue(value: unknown, allowed: Set<string>) {
  const candidate = typeof value === "string" ? value.trim().toUpperCase() : "";
  return allowed.has(candidate);
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeOptionalText(value: unknown) {
  const text = normalizeText(value);
  return text || null;
}

function normalizeTags(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => normalizeText(item))
    .filter(Boolean)
    .slice(0, 12);
}

function parseOptionalDate(value: unknown): { date: Date | null; error?: string } {
  const text = normalizeText(value);
  if (!text) return { date: null };
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(text)
    ? new Date(`${text}T12:00:00.000Z`)
    : new Date(text);
  if (Number.isNaN(parsed.getTime())) return { date: null, error: "Некорректная дата задачи" };
  return { date: parsed };
}

export async function GET(req: Request) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = getCurrentTenantId();

  const { searchParams } = new URL(req.url);
  const rawStatus = searchParams.get("status");
  const status = normalizeText(rawStatus).toUpperCase();
  const assigneeId = searchParams.get("assigneeId");
  const orderId = searchParams.get("orderId");
  const entityType = normalizeTaskRelationType(searchParams.get("entityType"));
  const entityId = searchParams.get("entityId")?.trim();

  if (rawStatus && !isEnumValue(rawStatus, TASK_STATUSES)) {
    return NextResponse.json({ error: "Некорректный статус задачи" }, { status: 400 });
  }

  const tasks = await prisma.task.findMany({
    where: {
      tenantId,
      ...(status ? { status: status as any } : {}),
      ...(assigneeId ? { assigneeId } : {}),
      ...(entityType && entityId
        ? {
            OR: [
              { relations: { some: { entityType, entityId } } },
              ...(entityType === "ORDER" ? [{ orderId: entityId }] : []),
            ],
          }
        : orderId
          ? { orderId }
          : {}),
    },
    include: taskInclude,
    orderBy: [{ status: "asc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
  });

  const staff = await prisma.user.findMany({
    where: { tenantId, role: { in: [...STAFF_ROLES] as any } },
    select: { id: true, name: true, email: true, role: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ tasks, staff });
}

export async function POST(req: Request) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = getCurrentTenantId();

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректные данные задачи" }, { status: 400 });
  }

  const title = normalizeText(body.title);
  const description = normalizeOptionalText(body.description);
  const status = normalizeEnumValue(body.status, TASK_STATUSES, "TODO");
  const priority = normalizeEnumValue(body.priority, TASK_PRIORITIES, "MEDIUM");
  const assigneeId = normalizeOptionalText(body.assigneeId);
  const orderId = normalizeOptionalText(body.orderId);
  const tags = normalizeTags(body.tags);
  const due = parseOptionalDate(body.dueDate);

  if (!title) return NextResponse.json({ error: "Название задачи обязательно" }, { status: 400 });
  if (due.error) return NextResponse.json({ error: due.error }, { status: 400 });

  if (assigneeId) {
    const assignee = await prisma.user.findFirst({
      where: { id: assigneeId, tenantId, role: { in: [...STAFF_ROLES] as any } },
      select: { id: true },
    });
    if (!assignee) return NextResponse.json({ error: "Исполнитель не найден" }, { status: 400 });
  }

  if (orderId) {
    const order = await prisma.order.findFirst({
      where: { id: orderId, tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!order) return NextResponse.json({ error: "Заказ не найден" }, { status: 400 });
  }

  const orderRelation = buildOrderTaskRelation(
    orderId,
    body.orderLabel || (orderId ? "Заказ" : null),
  );
  const relations = mergeTaskRelations([
    ...normalizeTaskRelations(body.relations),
    ...(orderRelation ? [orderRelation] : []),
  ]);

  const task = await prisma.$transaction(async (tx) => {
    const created = await tx.task.create({
      data: {
        tenantId,
        title,
        description,
        status: status as any,
        priority: priority as any,
        assigneeId,
        createdById: s.id,
        orderId,
        dueDate: due.date,
        tags,
      },
    });

    if (relations.length > 0) {
      await tx.taskRelation.createMany({
        data: relations.map((relation) => ({
          tenantId,
          taskId: created.id,
          entityType: relation.entityType,
          entityId: relation.entityId,
          label: relation.label,
          href: relation.href,
          metadata: (relation.metadata || {}) as any,
        })),
      });
    }

    return tx.task.findUniqueOrThrow({
      where: { id: created.id },
      include: taskInclude,
    });
  });

  return NextResponse.json(task);
}
