export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const STAFF_ROLES = ["SUPER_ADMIN", "ADMIN", "MANAGER"];

const DEFAULT_PRESETS = [
  {
    name: "Новый заказ → задача менеджеру",
    description: "Автоматически создаёт задачу при новом заказе",
    trigger: "order_created",
    category: "robot",
    conditions: {},
    actions: [{ type: "create_task", taskTitle: "Обработать заказ #{orderNumber}", assignRole: "MANAGER" }],
  },
  {
    name: "Заказ > 50 000 ₽ → уведомление",
    description: "Push и email при крупном заказе",
    trigger: "order_created",
    category: "robot",
    conditions: { field: "totalAmount", operator: "gte", value: 50000 },
    actions: [
      { type: "send_push", title: "Крупный заказ!", body: "Заказ на сумму {totalAmount} ₽" },
      { type: "send_email", subject: "Крупный заказ #{orderNumber}", to: "admin" },
    ],
  },
  {
    name: "Отменённый заказ → Telegram",
    description: "Уведомление в Telegram при отмене",
    trigger: "order_status_changed",
    category: "robot",
    conditions: { field: "status", operator: "eq", value: "CANCELLED" },
    actions: [{ type: "send_telegram", message: "Заказ #{orderNumber} отменён" }],
  },
];

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || !STAFF_ROLES.includes(session.user.role as string)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const withStats = searchParams.get("stats") === "true";

    const workflows = await (prisma as any).workflow.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        logs: { take: 5, orderBy: { createdAt: "desc" } },
        _count: { select: { logs: true } },
      },
    });

    if (withStats) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const [logsToday, errorsToday] = await Promise.all([
        (prisma as any).workflowLog.count({ where: { createdAt: { gte: today } } }),
        (prisma as any).workflowLog.count({ where: { createdAt: { gte: today }, result: "error" } }),
      ]);
      return NextResponse.json({
        workflows,
        stats: {
          total: workflows.length,
          active: workflows.filter((w: any) => w.active).length,
          logsToday,
          errorsToday,
        },
      });
    }
    return NextResponse.json({ workflows });
  } catch (err: any) {
    if (err.code === "P2021" || err.message?.includes("does not exist")) {
      return NextResponse.json({ workflows: [], stats: { total: 0, active: 0, logsToday: 0, errorsToday: 0 } });
    }
    console.error("Workflows GET error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || !STAFF_ROLES.includes(session.user.role as string)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await req.json();

    // Apply presets
    if (body.applyPreset) {
      const created = [];
      for (const preset of DEFAULT_PRESETS) {
        const existing = await (prisma as any).workflow.findFirst({ where: { name: preset.name } });
        if (!existing) {
          const wf = await (prisma as any).workflow.create({ data: { ...preset, active: true } });
          created.push(wf);
        }
      }
      return NextResponse.json({ ok: true, created: created.length });
    }

    // Create new workflow
    const { name, description, trigger, category, actions, conditions } = body;
    if (!name || !trigger) {
      return NextResponse.json({ error: "Name and trigger required" }, { status: 400 });
    }

    const workflow = await (prisma as any).workflow.create({
      data: {
        name,
        description: description || null,
        trigger,
        category: category || "robot",
        actions: actions || [],
        conditions: conditions || {},
        active: true,
      },
    });

    return NextResponse.json({ ok: true, workflow });
  } catch (err) {
    console.error("Workflows POST error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
