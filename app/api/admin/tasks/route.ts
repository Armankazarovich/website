export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  buildOrderTaskRelation,
  mergeTaskRelations,
  normalizeTaskRelations,
  normalizeTaskRelationType,
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
  order: { select: { id: true, orderNumber: true, guestName: true, guestPhone: true } },
  relations: { orderBy: { createdAt: "asc" as const } },
  comments: {
    include: { user: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" as const },
  },
};

// GET /api/admin/tasks — list all tasks
export async function GET(req: Request) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const assigneeId = searchParams.get("assigneeId");
  const orderId = searchParams.get("orderId");
  const entityType = normalizeTaskRelationType(searchParams.get("entityType"));
  const entityId = searchParams.get("entityId")?.trim();

  const tasks = await prisma.task.findMany({
    where: {
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

  // Also get all staff for assignee dropdown
  const staff = await prisma.user.findMany({
    where: { role: { in: ["SUPER_ADMIN", "ADMIN", "MANAGER", "ACCOUNTANT", "WAREHOUSE", "SELLER", "COURIER"] } },
    select: { id: true, name: true, email: true, role: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ tasks, staff });
}

// POST /api/admin/tasks — create task
export async function POST(req: Request) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { title, description, status, priority, assigneeId, orderId, dueDate, tags } = body;

  if (!title?.trim()) return NextResponse.json({ error: "Название обязательно" }, { status: 400 });

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
        title: title.trim(),
        description: description?.trim() || null,
        status: status || "TODO",
        priority: priority || "MEDIUM",
        assigneeId: assigneeId || null,
        createdById: s.id,
        orderId: orderId || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        tags: tags || [],
      },
    });

    if (relations.length > 0) {
      await tx.taskRelation.createMany({
        data: relations.map((relation) => ({
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
