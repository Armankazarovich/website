export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const STAFF_ROLES = ["SUPER_ADMIN", "ADMIN", "MANAGER", "COURIER", "ACCOUNTANT", "WAREHOUSE", "SELLER"];

async function getSession() {
  const session = await auth();
  const role = session?.user?.role;
  const id = session?.user?.id;
  if (!session || !STAFF_ROLES.includes(role as string)) return null;
  return { role, id };
}

// GET /api/admin/crm/leads/[id]/activities
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const activities = await prisma.leadActivity.findMany({
    where: { leadId: params.id },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(activities);
}

// POST /api/admin/crm/leads/[id]/activities — добавить активность
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { type, text, scheduledFor } = body;

  if (!text?.trim()) return NextResponse.json({ error: "Текст обязателен" }, { status: 400 });

  const activity = await prisma.leadActivity.create({
    data: {
      leadId: params.id,
      type: type || "NOTE",
      text: text.trim(),
      scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
      userId: s.id,
    },
    include: { user: { select: { id: true, name: true } } },
  });

  return NextResponse.json(activity, { status: 201 });
}
