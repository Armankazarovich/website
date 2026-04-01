export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function getSession() {
  const session = await auth();
  const role = (session?.user as any)?.role;
  const id = (session?.user as any)?.id;
  if (!session || !["ADMIN", "MANAGER", "ACCOUNTANT", "WAREHOUSE", "SELLER", "COURIER"].includes(role)) return null;
  return { role, id };
}

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
  if (body.dueDate !== undefined) updateData.dueDate = body.dueDate ? new Date(body.dueDate) : null;
  if (body.tags !== undefined) updateData.tags = body.tags;

  const task = await prisma.task.update({
    where: { id: params.id },
    data: updateData,
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      createdBy: { select: { id: true, name: true } },
      order: { select: { id: true, orderNumber: true, guestName: true } },
      comments: {
        include: { user: { select: { id: true, name: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  return NextResponse.json(task);
}

// DELETE — delete task
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const s = await getSession();
  if (!s || s.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.task.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
