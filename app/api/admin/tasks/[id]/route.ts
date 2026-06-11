export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentTenantId } from "@/lib/tenant-context";
import {
  buildOrderTaskRelation,
  mergeTaskRelations,
  normalizeTaskRelations,
} from "@/lib/task-relations";

async function getSession() {
  const session = await auth();
  const role = session?.user?.role;
  const id = session?.user?.id;
  if (!session || !["SUPER_ADMIN", "ADMIN", "MANAGER", "ACCOUNTANT", "WAREHOUSE", "SELLER", "COURIER"].includes(role as string)) return null;
  return { role, id };
}

const taskInclude = {
  assignee: { select: { id: true, name: true, email: true } },
  createdBy: { select: { id: true, name: true } },
  order: { select: { id: true, orderNumber: true, guestName: true } },
  relations: { orderBy: { createdAt: "asc" as const } },
  comments: {
    include: { user: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" as const },
  },
};

const TASK_STATUSES = new Set(["BACKLOG", "TODO", "IN_PROGRESS", "REVIEW", "DONE"]);
const TASK_PRIORITIES = new Set(["LOW", "MEDIUM", "HIGH", "URGENT"]);

function normalizeOptionalText(value: unknown) {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text || null;
}

function normalizeRequiredText(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function normalizeSortOrder(value: unknown) {
  const order = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(order)) return null;
  return Math.trunc(order);
}

function normalizeTags(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean)
    .slice(0, 12);
}

function parseOptionalDate(value: unknown) {
  const text = normalizeOptionalText(value);
  if (!text) return { date: null };
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(text)
    ? new Date(`${text}T12:00:00.000Z`)
    : new Date(text);
  if (Number.isNaN(parsed.getTime())) return { date: null, error: "Некорректная дата задачи" };
  return { date: parsed };
}

// PATCH — update task (status, fields, add comment)
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = getCurrentTenantId();

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Некорректные данные задачи" }, { status: 400 });
  }
  const { action } = body;

  const existing = await prisma.task.findFirst({
    where: { id: params.id, tenantId },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Задача не найдена" }, { status: 404 });

  // ── Add comment ──
  if (action === "comment") {
    const { text } = body;
    if (!text?.trim()) return NextResponse.json({ error: "Текст пустой" }, { status: 400 });
    const comment = await prisma.taskComment.create({
      data: { taskId: existing.id, userId: s.id, text: text.trim() },
      include: { user: { select: { id: true, name: true } } },
    });
    return NextResponse.json(comment);
  }

  // ── Move (update status + sortOrder) ──
  const updateData: Record<string, any> = {};
  if (body.status !== undefined) {
    if (!TASK_STATUSES.has(String(body.status))) {
      return NextResponse.json({ error: "Некорректный статус задачи" }, { status: 400 });
    }
    updateData.status = body.status;
    if (body.status === "DONE") updateData.completedAt = new Date();
    else updateData.completedAt = null;
  }
  if (body.sortOrder !== undefined) {
    const sortOrder = normalizeSortOrder(body.sortOrder);
    if (sortOrder === null) {
      return NextResponse.json({ error: "Некорректный порядок задачи" }, { status: 400 });
    }
    updateData.sortOrder = sortOrder;
  }
  if (body.title !== undefined) {
    const title = normalizeRequiredText(body.title);
    if (!title) {
      return NextResponse.json({ error: "Название задачи обязательно" }, { status: 400 });
    }
    updateData.title = title;
  }
  if (body.description !== undefined) updateData.description = normalizeOptionalText(body.description);
  if (body.priority !== undefined) {
    if (!TASK_PRIORITIES.has(String(body.priority))) {
      return NextResponse.json({ error: "Некорректный приоритет задачи" }, { status: 400 });
    }
    updateData.priority = body.priority;
  }
  if (body.assigneeId !== undefined) {
    const assigneeId = normalizeOptionalText(body.assigneeId);
    if (assigneeId) {
      const assignee = await prisma.user.findFirst({
        where: {
          id: assigneeId,
          tenantId,
          role: { in: ["SUPER_ADMIN", "ADMIN", "MANAGER", "ACCOUNTANT", "WAREHOUSE", "SELLER", "COURIER"] as any },
        },
        select: { id: true },
      });
      if (!assignee) return NextResponse.json({ error: "Исполнитель не найден" }, { status: 400 });
    }
    updateData.assigneeId = assigneeId;
  }
  if (body.orderId !== undefined) {
    const orderId = normalizeOptionalText(body.orderId);
    if (orderId) {
      const order = await prisma.order.findFirst({
        where: { id: orderId, tenantId, deletedAt: null },
        select: { id: true },
      });
      if (!order) return NextResponse.json({ error: "Заказ не найден" }, { status: 400 });
    }
    updateData.orderId = orderId;
  }
  if (body.dueDate !== undefined) {
    const due = parseOptionalDate(body.dueDate);
    if (due.error) return NextResponse.json({ error: due.error }, { status: 400 });
    updateData.dueDate = due.date;
  }
  if (body.tags !== undefined) updateData.tags = normalizeTags(body.tags);

  const shouldReplaceRelations = body.relations !== undefined;
  if (shouldReplaceRelations) {
    const orderRelation = buildOrderTaskRelation(body.orderId, body.orderLabel);
    const relations = mergeTaskRelations([
      ...normalizeTaskRelations(body.relations),
      ...(orderRelation ? [orderRelation] : []),
    ]);
    const orderIdFromRelations = relations.find((relation) => relation.entityType === "ORDER")?.entityId ?? null;
    if (body.orderId === undefined) updateData.orderId = orderIdFromRelations;
    if (orderIdFromRelations) {
      const order = await prisma.order.findFirst({
        where: { id: orderIdFromRelations, tenantId, deletedAt: null },
        select: { id: true },
      });
      if (!order) return NextResponse.json({ error: "Заказ не найден" }, { status: 400 });
    }

    const task = await prisma.$transaction(async (tx) => {
      await tx.taskRelation.deleteMany({ where: { taskId: existing.id, tenantId } });
      const updated = await tx.task.update({
        where: { id: existing.id },
        data: updateData,
      });
      if (relations.length > 0) {
        await tx.taskRelation.createMany({
          data: relations.map((relation) => ({
            tenantId,
            taskId: updated.id,
            entityType: relation.entityType,
            entityId: relation.entityId,
            label: relation.label,
            href: relation.href,
            metadata: (relation.metadata || {}) as any,
          })),
        });
      }
      return tx.task.findUniqueOrThrow({
        where: { id: updated.id },
        include: taskInclude,
      });
    });

    return NextResponse.json(task);
  }

  const task = await prisma.task.update({
    where: { id: existing.id },
    data: updateData,
    include: taskInclude,
  });

  return NextResponse.json(task);
}

// DELETE — delete task
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const s = await getSession();
  if (!s || (s.role !== "SUPER_ADMIN" && s.role !== "ADMIN")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = getCurrentTenantId();

  const existing = await prisma.task.findFirst({
    where: { id: params.id, tenantId },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Задача не найдена" }, { status: 404 });

  await prisma.task.delete({ where: { id: existing.id } });
  return NextResponse.json({ ok: true });
}
