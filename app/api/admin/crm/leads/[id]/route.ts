export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentTenantId } from "@/lib/tenant-context";

const CRM_ROLES = ["SUPER_ADMIN", "ADMIN", "MANAGER", "SELLER"];
const LEAD_STAGES = new Set(["NEW", "CONTACTED", "QUALIFIED", "MEETING", "PROPOSAL", "NEGOTIATION", "WON", "LOST", "DEFERRED", "RECURRING"]);
const LEAD_SOURCES = new Set(["WEBSITE", "TELEGRAM", "PHONE", "REFERRAL", "PARTNER", "OTHER"]);
const ASSIGNEE_ROLES = ["SUPER_ADMIN", "ADMIN", "MANAGER", "SELLER"];

async function getSession() {
  const session = await auth();
  const role = session?.user?.role;
  const id = session?.user?.id;
  if (!session || !CRM_ROLES.includes(role as string)) return null;
  return { role, id };
}

// GET /api/admin/crm/leads/[id]
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = getCurrentTenantId();

  const lead = await prisma.lead.findFirst({
    where: { id: params.id, tenantId, deletedAt: null },
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
  const tenantId = getCurrentTenantId();

  const body = await req.json();
  const { name, phone, email, company, source, stage, value, comment, assigneeId, tags, sortOrder } = body;
  if (name !== undefined && !name?.trim()) {
    return NextResponse.json({ error: "Имя обязательно" }, { status: 400 });
  }
  if (stage !== undefined && !LEAD_STAGES.has(stage)) {
    return NextResponse.json({ error: "Invalid lead stage" }, { status: 400 });
  }
  if (source !== undefined && !LEAD_SOURCES.has(source)) {
    return NextResponse.json({ error: "Invalid lead source" }, { status: 400 });
  }
  if (value !== undefined && value !== null && value !== "" && !Number.isFinite(Number(value))) {
    return NextResponse.json({ error: "Invalid lead value" }, { status: 400 });
  }
  if (sortOrder !== undefined && !Number.isInteger(Number(sortOrder))) {
    return NextResponse.json({ error: "Invalid sort order" }, { status: 400 });
  }
  if (assigneeId) {
    const assignee = await prisma.user.findFirst({
      where: {
        id: assigneeId,
        tenantId,
        role: { in: ASSIGNEE_ROLES as any },
        staffStatus: "ACTIVE",
      },
      select: { id: true },
    });
    if (!assignee) {
      return NextResponse.json({ error: "Invalid assignee" }, { status: 400 });
    }
  }
  const current = await prisma.lead.findFirst({
    where: { id: params.id, tenantId, deletedAt: null },
    select: { id: true, stage: true },
  });
  if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Если смена этапа — записать активность
  if (stage !== undefined) {
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
  if (name !== undefined) updateData.name = name.trim();
  if (phone !== undefined) updateData.phone = phone || null;
  if (email !== undefined) updateData.email = email || null;
  if (company !== undefined) updateData.company = company || null;
  if (source !== undefined) updateData.source = source;
  if (stage !== undefined) updateData.stage = stage;
  if (value !== undefined) updateData.value = value ? Number(value) : null;
  if (comment !== undefined) updateData.comment = comment || null;
  if (assigneeId !== undefined) updateData.assigneeId = assigneeId || null;
  if (tags !== undefined) updateData.tags = tags;
  if (sortOrder !== undefined) updateData.sortOrder = Number(sortOrder);

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

  if (stage !== undefined && current.stage !== stage) {
    import("@/lib/workflow-engine").then(({ runWorkflows }) => {
      runWorkflows("lead_stage_changed", {
        tenantId,
        leadId: lead.id,
        name: lead.name,
        phone: lead.phone || "",
        email: lead.email || "",
        company: lead.company || "",
        source: lead.source,
        stage: lead.stage,
        previousStage: current.stage,
        value: lead.value ? Number(lead.value) : null,
        assigneeId: lead.assigneeId || null,
        userId: s.id,
      }).catch(console.error);
    }).catch(() => {});
  }

  return NextResponse.json(lead);
}

// DELETE /api/admin/crm/leads/[id] — soft delete
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = getCurrentTenantId();

  const lead = await prisma.lead.findFirst({
    where: { id: params.id, tenantId, deletedAt: null },
    select: { id: true },
  });
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.lead.update({
    where: { id: lead.id },
    data: { deletedAt: new Date() },
  });

  return NextResponse.json({ success: true });
}
