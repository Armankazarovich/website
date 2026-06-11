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

// GET /api/admin/crm/leads — список лидов, сгруппированных по этапам (для Kanban)
export async function GET(req: NextRequest) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = getCurrentTenantId();

  const { searchParams } = new URL(req.url);
  const stage = searchParams.get("stage");
  const search = searchParams.get("search") || "";
  const assigneeId = searchParams.get("assigneeId");

  const where: any = {
    tenantId,
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
    where: { tenantId, deletedAt: null },
    _count: true,
    _sum: { value: true },
  });

  // Список сотрудников для назначения
  const staff = await prisma.user.findMany({
    where: {
      tenantId,
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
  const tenantId = getCurrentTenantId();

  const body = await req.json();
  const { name, phone, email, company, source, stage, value, comment, assigneeId, tags } = body;

  if (!name?.trim()) return NextResponse.json({ error: "Имя обязательно" }, { status: 400 });
  if (stage !== undefined && !LEAD_STAGES.has(stage)) {
    return NextResponse.json({ error: "Invalid lead stage" }, { status: 400 });
  }
  if (source !== undefined && !LEAD_SOURCES.has(source)) {
    return NextResponse.json({ error: "Invalid lead source" }, { status: 400 });
  }
  if (value !== undefined && value !== null && value !== "" && !Number.isFinite(Number(value))) {
    return NextResponse.json({ error: "Invalid lead value" }, { status: 400 });
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

  // Считаем кол-во лидов в этом этапе для sortOrder
  const normalizedStage = stage || "NEW";
  const count = await prisma.lead.count({ where: { tenantId, stage: normalizedStage, deletedAt: null } });

  const lead = await prisma.lead.create({
    data: {
      tenantId,
      name: name.trim(),
      phone: phone?.trim() || null,
      email: email?.trim() || null,
      company: company?.trim() || null,
      source: source || "OTHER",
      stage: normalizedStage,
      value: value ? Number(value) : null,
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

  import("@/lib/workflow-engine").then(({ runWorkflows }) => {
    runWorkflows("lead_created", {
      tenantId,
      leadId: lead.id,
      name: lead.name,
      phone: lead.phone || "",
      email: lead.email || "",
      company: lead.company || "",
      source: lead.source,
      stage: lead.stage,
      value: lead.value ? Number(lead.value) : null,
      assigneeId: lead.assigneeId || null,
      userId: s.id,
    }).catch(console.error);
  }).catch(() => {});

  return NextResponse.json(lead, { status: 201 });
}
