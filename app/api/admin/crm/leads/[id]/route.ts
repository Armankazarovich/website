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

// GET /api/admin/crm/leads/[id]
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const lead = await prisma.lead.findUnique({
    where: { id: params.id, deletedAt: null },
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      activities: {
        include: {
          user: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(lead);
}

// PATCH /api/admin/crm/leads/[id]
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, phone, email, company, source, stage, value, comment, assigneeId, tags, sortOrder } = body;

  // Если смена этапа — записать активность
  if (stage !== undefined) {
    const current = await prisma.lead.findUnique({ where: { id: params.id }, select: { stage: true } });
    if (current && current.stage !== stage) {
      const stageLabels: Record<string, string> = {
        NEW: "Новый лид", CONTACTED: "Связались", QUALIFIED: "Квалифицирован",
        MEETING: "Встреча/замер", PROPOSAL: "КП отправлено", NEGOTIATION: "Переговоры",
        WON: "Успех", LOST: "Отказ",
      };
      await prisma.leadActivity.create({
        data: {
          leadId: params.id,
          type: "STAGE_CHANGE",
          text: `Этап изменён: ${stageLabels[current.stage] || current.stage} → ${stageLabels[stage] || stage}`,
          userId: s.id,
        },
      });
    }
  }

  const updateData: any = {};
  if (name !== undefined) updateData.name = name;
  if (phone !== undefined) updateData.phone = phone || null;
  if (email !== undefined) updateData.email = email || null;
  if (company !== undefined) updateData.company = company || null;
  if (source !== undefined) updateData.source = source;
  if (stage !== undefined) updateData.stage = stage;
  if (value !== undefined) updateData.value = value ? parseFloat(value) : null;
  if (comment !== undefined) updateData.comment = comment || null;
  if (assigneeId !== undefined) updateData.assigneeId = assigneeId || null;
  if (tags !== undefined) updateData.tags = tags;
  if (sortOrder !== undefined) updateData.sortOrder = sortOrder;

  const lead = await prisma.lead.update({
    where: { id: params.id },
    data: updateData,
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      activities: {
        include: { user: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
      },
      _count: { select: { activities: true } },
    },
  });

  return NextResponse.json(lead);
}

// DELETE /api/admin/crm/leads/[id] — soft delete
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.lead.update({
    where: { id: params.id },
    data: { deletedAt: new Date() },
  });

  return NextResponse.json({ success: true });
}
