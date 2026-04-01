/**
 * Workflow Engine — автоматически выполняет действия по триггерам
 * Используется в /api/orders (order_created) и других местах
 */

import { prisma } from "@/lib/prisma";

export type WorkflowTrigger =
  | "order_created"
  | "order_status_changed"
  | "task_overdue"
  | "manual";

export async function runWorkflows(trigger: WorkflowTrigger, payload: Record<string, any>) {
  let workflows;
  try {
    workflows = await prisma.workflow.findMany({
      where: { active: true, trigger },
    });
  } catch {
    return; // Таблица ещё не создана — ничего страшного
  }

  for (const wf of workflows) {
    try {
      // Check conditions
      const conditions = wf.conditions as Record<string, any>;
      if (!matchConditions(conditions, payload)) continue;

      // Execute actions
      const actions = wf.actions as Array<{ type: string; [k: string]: any }>;
      for (const action of actions) {
        await executeAction(action, payload);
      }

      // Log success
      await prisma.workflowLog.create({
        data: {
          workflowId: wf.id,
          trigger,
          payload,
          result: "ok",
        },
      });
    } catch (err: any) {
      await prisma.workflowLog.create({
        data: {
          workflowId: wf.id,
          trigger,
          payload,
          result: "error",
          error: err.message,
        },
      }).catch(() => {});
    }
  }
}

function matchConditions(conditions: Record<string, any>, payload: Record<string, any>): boolean {
  for (const [key, value] of Object.entries(conditions)) {
    if (payload[key] !== value) return false;
  }
  return true;
}

async function executeAction(action: { type: string; [k: string]: any }, payload: Record<string, any>) {
  switch (action.type) {

    // Создать задачу
    case "create_task": {
      // Resolve template variables like {{orderNumber}}, {{guestName}}
      const title = resolveTemplate(action.title || "Новая задача", payload);
      const description = action.description ? resolveTemplate(action.description, payload) : null;

      // Find assignee: by role or specific id
      let assigneeId = action.assigneeId || null;
      if (!assigneeId && action.assigneeRole) {
        const user = await prisma.user.findFirst({
          where: { role: action.assigneeRole, staffStatus: "ACTIVE" },
        });
        assigneeId = user?.id || null;
      }

      await prisma.task.create({
        data: {
          title,
          description,
          status: action.status || "TODO",
          priority: action.priority || "HIGH",
          assigneeId,
          orderId: payload.orderId || null,
          dueDate: action.dueDateHours
            ? new Date(Date.now() + action.dueDateHours * 3600000)
            : null,
          tags: action.tags || [],
        },
      });
      break;
    }

    default:
      break;
  }
}

function resolveTemplate(template: string, vars: Record<string, any>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(vars[key] ?? ""));
}
