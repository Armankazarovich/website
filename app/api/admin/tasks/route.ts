export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function getSession() {
  const session = await auth();
  const role = session?.user?.role;
  const id = session?.user?.id;
  if (!session || !["ADMIN", "MANAGER", "ACCOUNTANT", "WAREHOUSE", "SELLER", "COURIER"].includes(role as string)) return null;
  return { role, id };
}

// GET /api/admin/tasks — list all tasks
export async function GET(req: Request) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const assigneeId = searchParams.get("assigneeId");
  const orderId = searchParams.get("orderId");

  const tasks = await prisma.task.findMany({
    where: {
      ...(status ? { status: status as any } : {}),
      ...(assigneeId ? { assigneeId } : {}),
      ...(orderId ? { orderId } : {}),
    },
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      createdBy: { select: { id: true, name: true } },
      order: { select: { id: true, orderNumber: true, guestName: true, guestPhone: true } },
      comments: {
        include: { user: { select: { id: true, name: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: [{ status: "asc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
  });

  // Also get all staff for assignee dropdown
  const staff = await prisma.user.findMany({
    where: { role: { in: ["ADMIN", "MANAGER", "ACCOUNTANT", "WAREHOUSE", "SELLER", "COURIER"] } },
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

  const task = await prisma.task.create({
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
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      createdBy: { select: { id: true, name: true } },
      order: { select: { id: true, orderNumber: true, guestName: true } },
      comments: true,
    },
  });

  return NextResponse.json(task);
}
