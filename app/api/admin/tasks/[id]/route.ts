export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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

// PATCH — update task (status, fields, add comment)
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { action } = body;

  // ── Add comment ──
  if (action === "comment") {
    const { text } = body;
    if (!text?.trim()) return NextResponse.json({ error: "Текст пустой" }, { status: 400 });
    const comment = await prisma.taskComment.create({
      data: { taskId: params.id, userId: s.id, text: text.trim() },
      include: { user: { select: { id: true, name: true } } },
    });
    return NextResponse.json(comment);
  }

  // ── Move (update status + sortOrder) ──
  const updateData: Record<string, any> = {};
  if (body.status !== undefined) {
    updateData.status = body.status;
    if (body.status === "DONE") updateData.completedAt = new Date();
    else updateData.completedAt = null;
  }
  if (body.sortOrder !== undefined) updateData.sortOrder = body.sortOrder;
  if (body.title !== undefined) updateData.title = body.title;
  if (body.description !== undefined) updateData.description = body.description;
  if (body.priority !== undefined) updateData.priority = body.priority;
  if (body.assigneeId !== undefined) updateData.assigneeId = body.assigneeId || null;
  if (body.orderId !== undefined) updateData.orderId = body.orderId || null;
  if (body.dueDate !== undefined) updateData.dueDate = body.dueDate ? new Date(body.dueDate) : null;
  if (body.tags !== undefined) updateData.tags = body.tags;

  const shouldReplaceRelations = body.relations !== undefined;
  if (shouldReplaceRelations) {
    const orderRelation = buildOrderTaskRelation(body.orderId, body.orderLabel);
    const relations = mergeTaskRelations([
      ...normalizeTaskRelations(body.relations),
      ...(orderRelation ? [orderRelation] : []),
    ]);
    const orderIdFromRelations = relations.find((relation) => relation.entityType === "ORDER")?.entityId ?? null;
    if (body.orderId === undefined) updateData.orderId = orderIdFromRelations;

    const task = await prisma.$transaction(async (tx) => {
      await tx.taskRelation.deleteMany({ where: { taskId: params.id } });
      const updated = await tx.task.update({
        where: { id: params.id },
        data: updateData,
      });
      if (relations.length > 0) {
        await tx.taskRelation.createMany({
          data: relations.map((relation) => ({
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
    where: { id: params.id },
    data: updateData,
    include: taskInclude,
  });

  return NextResponse.json(task);
}

// DELETE — delete task
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const s = await getSession();
  if (!s || (s.role !== "SUPER_ADMIN" && s.role !== "ADMIN")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.task.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
