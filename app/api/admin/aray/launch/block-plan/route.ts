export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireManager } from "@/lib/auth-helpers";
import { requireArayModuleAccess } from "@/lib/aray-module-auth";
import { ARAY_CLIENT_REQUEST_TAG } from "@/lib/aray-crm-automation";
import { ARAY_BUILDER_BLOCKS, getArayLaunchBlockPlan } from "@/lib/aray-block-builder";
import { buildArayLeadBriefDraft } from "@/lib/aray-crm-automation";
import { prisma } from "@/lib/prisma";
import { getCurrentTenantId } from "@/lib/tenant-context";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function cleanString(value: unknown, maxLength = 160) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function cleanBlockIds(value: unknown) {
  if (!Array.isArray(value)) return [];
  const allowed = new Set(ARAY_BUILDER_BLOCKS.map((block) => block.id));
  const seen = new Set<string>();

  return value
    .map((item) => cleanString(item, 80))
    .filter((id) => {
      if (!id || !allowed.has(id) || seen.has(id)) return false;
      seen.add(id);
      return true;
    })
    .slice(0, 12);
}

function cleanBlockDrafts(value: unknown, allowedIds: string[]) {
  if (!Array.isArray(value)) return {};
  const allowed = new Set(allowedIds);
  const drafts: Record<string, { title: string; text: string; action: string }> = {};

  for (const item of value) {
    const source = asRecord(item);
    const id = cleanString(source.id, 80);
    if (!allowed.has(id)) continue;

    drafts[id] = {
      title: cleanString(source.title, 180),
      text: cleanString(source.text, 900),
      action: cleanString(source.action, 80),
    };
  }

  return drafts;
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
  const selectedBlockIds = cleanBlockIds(body.selectedBlockIds);
  const blockDrafts = cleanBlockDrafts(body.blockDrafts, selectedBlockIds);

  if (body.confirm !== true) {
    return NextResponse.json({ ok: false, error: "Подтвердите сохранение плана блоков" }, { status: 400 });
  }

  if (!leadId) {
    return NextResponse.json({ ok: false, error: "Не передана заявка" }, { status: 400 });
  }

  if (selectedBlockIds.length === 0) {
    return NextResponse.json({ ok: false, error: "Выберите хотя бы один блок" }, { status: 400 });
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
  const plan = getArayLaunchBlockPlan(draft);
  const selectedBlocks = plan.blocks
    .filter((block) => selectedBlockIds.includes(block.id))
    .map((block) => {
      const approvedDraft = blockDrafts[block.id];
      return {
        ...block,
        draft: approvedDraft
          ? {
              title: approvedDraft.title || block.draft.title,
              text: approvedDraft.text || block.draft.text,
              action: approvedDraft.action || block.draft.action,
            }
          : block.draft,
      };
    });
  const approvedBlocks = selectedBlocks.map((block) => ({
    id: block.id,
    title: block.title,
    draft: block.draft,
  }));
  const client = draft.company || draft.clientName;
  const activityText = [
    "ARAY: план сайта из блоков зафиксирован.",
    `Клиент: ${client}.`,
    `Эталон: ${plan.benchmark}.`,
    `Готовность: ${plan.confidence === "ready" ? "можно собирать" : "нужно доспросить"}.`,
    "Выбранные блоки:",
    ...selectedBlocks.map((block, index) => [
      `${index + 1}. ${block.title} — ${block.reason}`,
      `   Черновик: ${block.draft.title}`,
      `   Текст: ${block.draft.text}`,
      `   Действие: ${block.draft.action}`,
    ].join("\n")),
    plan.ownerInputs.length ? `Доспросить: ${plan.ownerInputs.slice(0, 6).join("; ")}.` : "Критичных вопросов для старта нет.",
    "Следующий шаг: пройти блоки по очереди, подтвердить смысл и подготовить тексты/медиа.",
  ].join("\n");

  const result = await prisma.$transaction(async (tx) => {
    const activity = await tx.leadActivity.create({
      data: {
        leadId: lead.id,
        type: "SYSTEM",
        text: activityText,
        userId: auth.userId,
      },
      select: {
        id: true,
        createdAt: true,
      },
    });

    const existingTask = await tx.task.findFirst({
      where: {
        tenantId,
        tags: { has: "ARAY_BLOCK_PLAN" },
        relations: {
          some: {
            tenantId,
            entityType: "LEAD",
            entityId: lead.id,
          },
        },
      },
      select: { id: true },
    });

    const task = existingTask
      ? await tx.task.update({
          where: { id: existingTask.id },
          data: {
            title: `ARAY: пройти выбранные блоки — ${client}`,
            description: activityText,
            status: "TODO",
            tags: ["ARAY", "ARAY_LAUNCH", "ARAY_BLOCK_PLAN", ...selectedBlocks.map((block) => `BLOCK:${block.id}`)],
          },
          select: { id: true, title: true },
        })
      : await tx.task.create({
          data: {
            tenantId,
            title: `ARAY: пройти выбранные блоки — ${client}`,
            description: activityText,
            status: "TODO",
            priority: "HIGH",
            createdById: auth.userId,
            tags: ["ARAY", "ARAY_LAUNCH", "ARAY_BLOCK_PLAN", ...selectedBlocks.map((block) => `BLOCK:${block.id}`)],
            relations: {
              create: {
                tenantId,
                entityType: "LEAD",
                entityId: lead.id,
                label: client,
                href: `/admin/aray/builder?leadId=${lead.id}`,
                metadata: {
                  source: "aray-block-plan",
                  benchmark: plan.benchmark,
                  selectedBlockIds,
                  approvedBlocks,
                },
              },
            },
          },
          select: { id: true, title: true },
        });

    await tx.taskRelation.upsert({
      where: {
        taskId_entityType_entityId: {
          taskId: task.id,
          entityType: "LEAD",
          entityId: lead.id,
        },
      },
      update: {
        tenantId,
        label: client,
        href: `/admin/aray/builder?leadId=${lead.id}`,
        metadata: {
          source: "aray-block-plan",
          benchmark: plan.benchmark,
          selectedBlockIds,
          approvedBlocks,
        },
      },
      create: {
        tenantId,
        taskId: task.id,
        entityType: "LEAD",
        entityId: lead.id,
        label: client,
        href: `/admin/aray/builder?leadId=${lead.id}`,
        metadata: {
          source: "aray-block-plan",
          benchmark: plan.benchmark,
          selectedBlockIds,
          approvedBlocks,
        },
      },
    });

    await tx.lead.update({
      where: { id: lead.id },
      data: {
        tags: {
          set: Array.from(new Set([...lead.tags, "ARAY Block Plan", "Блоки выбраны"])),
        },
      },
    });

    return { activity, task };
  });

  return NextResponse.json({
    ok: true,
    leadId: lead.id,
    selectedCount: selectedBlocks.length,
    activityId: result.activity.id,
    task: result.task,
  });
}
