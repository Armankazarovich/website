/**
 * CRM Workflows (Роботы + Тоннели) — CRUD API
 * GET  — список всех workflows + статистика
 * POST — создать новый workflow или применить пресет
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireManager } from "@/lib/auth-helpers";
import { LUMBER_PRESET_WORKFLOWS } from "@/lib/workflow-engine";
import { cleanWorkflowDisplayText, sanitizeWorkflowForDisplay } from "@/lib/workflow-text";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const authResult = await requireManager();
  if (!authResult.authorized) return authResult.response;

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category"); // "robot" | "tunnel" | "report"
  const includeStats = searchParams.get("stats") === "true";
  const includePresets = searchParams.get("presets") === "true";

  try {
    const where: any = {};
    if (category) where.category = category;

    const workflows = await prisma.workflow.findMany({
      where,
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      include: includeStats
        ? {
            _count: { select: { logs: true } },
          }
        : undefined,
    });

    let totalLogs = 0;
    let errorLogs = 0;
    if (includeStats) {
      [totalLogs, errorLogs] = await Promise.all([
        prisma.workflowLog.count({
          where: { createdAt: { gte: new Date(Date.now() - 86400000) } },
        }),
        prisma.workflowLog.count({
          where: {
            createdAt: { gte: new Date(Date.now() - 86400000) },
            result: "error",
          },
        }),
      ]);
    }

    const safeWorkflows = workflows.map(sanitizeWorkflowForDisplay);

    return NextResponse.json({
      workflows: safeWorkflows,
      stats: {
        total: workflows.length,
        active: workflows.filter((w) => w.active).length,
        logsToday: totalLogs,
        errorsToday: errorLogs,
      },
      ...(includePresets ? { presets: LUMBER_PRESET_WORKFLOWS.map(sanitizeWorkflowForDisplay) } : {}),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const authResult = await requireManager();
  if (!authResult.authorized) return authResult.response;

  try {
    const body = await req.json();

    // Применить пресет (массив workflow)
    if (body.applyPreset) {
      const presets = LUMBER_PRESET_WORKFLOWS;
      const created = [];
      for (const preset of presets) {
        // Проверяем дубликат по имени
        const safeName = cleanWorkflowDisplayText(preset.name);
        const existing = await prisma.workflow.findFirst({ where: { name: safeName } });
        if (existing) continue;

        const wf = await prisma.workflow.create({
          data: {
            name: safeName,
            description: cleanWorkflowDisplayText(preset.description),
            trigger: preset.trigger,
            category: preset.category,
            conditions: preset.conditions,
            actions: preset.actions,
            active: true,
          },
        });
        created.push(wf);
      }
      return NextResponse.json({ ok: true, created: created.length });
    }

    // Создать один workflow
    const { name, description, trigger, conditions, actions, category, delayMinutes, nicheTag } = body;

    const safeName = cleanWorkflowDisplayText(name);

    if (!safeName || !trigger) {
      return NextResponse.json({ error: "Название и триггер обязательны" }, { status: 400 });
    }

    const wf = await prisma.workflow.create({
      data: {
        name: safeName,
        description: cleanWorkflowDisplayText(description) || null,
        trigger,
        conditions: conditions || {},
        actions: actions || [],
        category: category || "robot",
        delayMinutes: delayMinutes || null,
        nicheTag: nicheTag || null,
      },
    });

    return NextResponse.json({ ok: true, workflow: wf });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
