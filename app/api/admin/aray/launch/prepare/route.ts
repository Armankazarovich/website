export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireManager } from "@/lib/auth-helpers";
import { requireArayModuleAccess } from "@/lib/aray-module-auth";
import {
  ARAY_CLIENT_REQUEST_TAG,
  ARAY_LAUNCH_TASK_TAG,
  buildArayLaunchActivityText,
  buildArayLaunchTaskSpecs,
  buildArayLeadBriefDraft,
} from "@/lib/aray-crm-automation";
import { prisma } from "@/lib/prisma";
import { getCurrentTenantId } from "@/lib/tenant-context";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function cleanString(value: unknown, maxLength = 160) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export async function POST(req: Request) {
  const auth = await requireManager();
  if (!auth.authorized) return auth.response;

  const moduleAccess = await requireArayModuleAccess({
    moduleId: "constructor.store-builder",
    role: auth.role,
  });
  if (!moduleAccess.authorized) return moduleAccess.response;

  const tenantId = getCurrentTenantId();
  const body = asRecord(await req.json().catch(() => null));
  const leadId = cleanString(body.leadId, 128);

  if (body.confirm !== true) {
    return NextResponse.json({ ok: false, error: "Подтвердите подготовку запуска" }, { status: 400 });
  }

  if (!leadId) {
    return NextResponse.json({ ok: false, error: "Не передана заявка" }, { status: 400 });
  }

  const lead = await prisma.lead.findFirst({
    where: {
      tenantId,
      id: leadId,
      deletedAt: null,
      tags: { has: ARAY_CLIENT_REQUEST_TAG },
    },
    select: {
      id: true,
      name: true,
      phone: true,
      company: true,
      comment: true,
      stage: true,
      tags: true,
    },
  });

  if (!lead) {
    return NextResponse.json({ ok: false, error: "ARAY-заявка не найдена" }, { status: 404 });
  }

  const draft = buildArayLeadBriefDraft(lead);
  const taskSpecs = buildArayLaunchTaskSpecs(draft);
  const result = await prisma.$transaction(async (tx) => {
    const existingTasks = await tx.task.findMany({
      where: {
        tenantId,
        tags: { has: ARAY_LAUNCH_TASK_TAG },
        relations: {
          some: {
            tenantId,
            entityType: "LEAD",
            entityId: lead.id,
          },
        },
      },
      select: {
        id: true,
        title: true,
        status: true,
        tags: true,
      },
    });

    const existingStepTags = new Set(
      existingTasks.flatMap((task) => task.tags.filter((tag) => tag.startsWith("ARAY_STEP:"))),
    );

    const createdTasks = [];
    for (const spec of taskSpecs) {
      const stepTag = `ARAY_STEP:${spec.id}`;
      if (existingStepTags.has(stepTag)) continue;

      const task = await tx.task.create({
        data: {
          tenantId,
          title: spec.title,
          description: spec.description,
          status: spec.status as any,
          priority: spec.priority as any,
          createdById: auth.userId,
          tags: ["ARAY", ARAY_LAUNCH_TASK_TAG, stepTag],
          relations: {
            create: {
              tenantId,
              entityType: "LEAD",
              entityId: lead.id,
              label: draft.company || draft.clientName,
              href: `/admin/aray/briefs?leadId=${lead.id}`,
              metadata: {
                source: "aray-launch-prepare",
                partner: draft.partner,
                service: draft.service,
              },
            },
          },
        },
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
        },
      });
      createdTasks.push(task);
    }

    if (createdTasks.length > 0) {
      await tx.leadActivity.create({
        data: {
          leadId: lead.id,
          type: "SYSTEM",
          text: buildArayLaunchActivityText(draft),
          userId: auth.userId,
        },
      });

      await tx.lead.update({
        where: { id: lead.id },
        data: {
          tags: {
            set: Array.from(new Set([...lead.tags, "ARAY Launch", "Бриф подготовлен"])),
          },
        },
      });
    }

    return {
      existingTasks,
      createdTasks,
    };
  });

  return NextResponse.json({
    ok: true,
    leadId: lead.id,
    createdCount: result.createdTasks.length,
    existingCount: result.existingTasks.length,
    tasks: [...result.existingTasks, ...result.createdTasks],
  });
}
