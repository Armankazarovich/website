export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const STAFF_ROLES = ["SUPER_ADMIN", "ADMIN", "MANAGER", "COURIER", "ACCOUNTANT", "WAREHOUSE", "SELLER"];

async function getSession() {
  const session = await auth();
  const role = session?.user?.role;
  const id = session?.user?.id;
  if (!session || !STAFF_ROLES.includes(role)) return null;
  return { role, id };
}

// GET /api/admin/crm/leads — список лидов, сгруппированных по этапам (для Kanban)
export async function GET(req: NextRequest) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const stage = searchParams.get("stage");
  const search = searchParams.get("search") || "";
  const assigneeId = searchParams.get("assigneeId");

  const where: any = {
    deletedAt: null,
    ...(stage ? { stage: stage as any } : {}),
    ...(assigneeId ? { assigneeId } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { phone: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { company: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const leads = await prisma.lead.findMany({
    where,
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      activities: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      _count: { select: { activities: true } },
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });

  // Статистика по этапам
  const stageStats = await prisma.lead.groupBy({
    by: ["stage"],
    where: { deletedAt: null },
    _count: true,
    _sum: { value: true },
  });

  // Список сотрудников для назначения
  const staff = await prisma.user.findMany({
    where: {
      role: { in: ["SUPER_ADMIN", "ADMIN", "MANAGER", "SELLER"] },
      staffStatus: "ACTIVE",
    },
    select: { id: true, name: true, email: true, role: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ leads, stageStats, staff });
}

// POST /api/admin/crm/leads — создать лид
export async function POST(req: NextRequest) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, phone, email, company, source, stage, value, comment, assigneeId, tags } = body;

  if (!name?.trim()) return NextResponse.json({ error: "Имя обязательно" }, { status: 400 });

  // Считаем кол-во лидов в этом этапе для sortOrder
  const count = await prisma.lead.count({ where: { stage: stage || "NEW", deletedAt: null } });

  const lead = await prisma.lead.create({
    data: {
      name: name.trim(),
      phone: phone?.trim() || null,
      email: email?.trim() || null,
      company: company?.trim() || null,
      source: source || "OTHER",
      stage: stage || "NEW",
      value: value ? parseFloat(value) : null,
      comment: comment?.trim() || null,
      assigneeId: assigneeId || null,
      tags: tags || [],
      sortOrder: count,
    },
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      _count: { select: { activities: true } },
    },
  });

  // Добавить системное событие "Лид создан"
  await prisma.leadActivity.create({
    data: {
      leadId: lead.id,
      type: "SYSTEM",
      text: `Лид создан`,
      userId: s.id,
    },
  });

  return NextResponse.json(lead, { status: 201 });
}
