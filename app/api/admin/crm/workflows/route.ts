/**
 * CRM Workflows (Роботы + Тоннели) — CRUD API
 * GET  — список всех workflows + статистика
 * POST — создать новый workflow или применить пресет
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireManager } from "@/lib/auth-helpers";
import { LUMBER_PRESET_WORKFLOWS } from "@/lib/workflow-engine";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const authResult = await requireManager();
  if (!authResult.authorized) return authResult.response;

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category"); // "robot" | "tunnel" | "report"
  const includeStats = searchParams.get("stats") === "true";

  try {
    const where: any = {};
    if (category) where.category = category;

    const workflows = await prisma.workflow.findMany({
      where,
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      include: includeStats
        ? {
            logs: {
              take: 5,
              orderBy: { createdAt: "desc" },
              select: { id: true, result: true, createdAt: true, error: true },
            },
            _count: { select: { logs: true } },
          }
        : undefined,
    });

    // Общая статистика
    const [totalLogs, errorLogs] = await Promise.all([
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

    return NextResponse.json({
      workflows,
      stats: {
        total: workflows.length,
        active: workflows.filter((w) => w.active).length,
        logsToday: totalLogs,
        errorsToday: errorLogs,
      },
      presets: LUMBER_PRESET_WORKFLOWS,
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
        const existing = await prisma.workflow.findFirst({ where: { name: preset.name } });
        if (existing) continue;

        const wf = await prisma.workflow.create({
          data: {
            name: preset.name,
            description: preset.description,
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

    if (!name || !trigger) {
      return NextResponse.json({ error: "Название и триггер обязательны" }, { status: 400 });
    }

    const wf = await prisma.workflow.create({
      data: {
        name,
        description: description || null,
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
