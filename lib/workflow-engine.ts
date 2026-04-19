/**
 * Workflow Engine v2 — CRM Автоматизация
 * Роботы, тоннели, уведомления, документы
 *
 * Триггеры:
 *   order_created, order_status_changed, task_overdue, task_completed,
 *   lead_created, lead_stage_changed, lead_assigned, lead_inactive,
 *   document_generated, manual, timer
 *
 * Действия:
 *   create_task, send_telegram, send_email, send_push,
 *   update_lead_stage, update_order_status, assign_lead,
 *   create_notification, generate_document, webhook
 */

import { prisma } from "@/lib/prisma";

export type WorkflowTrigger =
  | "order_created"
  | "order_status_changed"
  | "task_overdue"
  | "task_completed"
  | "lead_created"
  | "lead_stage_changed"
  | "lead_assigned"
  | "lead_inactive"
  | "document_generated"
  | "manual"
  | "timer";

export type ActionType =
  | "create_task"
  | "send_telegram"
  | "send_email"
  | "send_push"
  | "update_lead_stage"
  | "update_order_status"
  | "assign_lead"
  | "create_notification"
  | "generate_document"
  | "webhook";

export interface WorkflowAction {
  type: ActionType;
  [key: string]: any;
}

export async function runWorkflows(trigger: WorkflowTrigger, payload: Record<string, any>) {
  let workflows;
  try {
    workflows = await prisma.workflow.findMany({
      where: { active: true, trigger },
    });
  } catch {
    return; // Таблица ещё не создана — ничего страшного
  }

  const results: Array<{ workflowId: string; name: string; result: string; error?: string }> = [];

  for (const wf of workflows) {
    try {
      // Check conditions
      const conditions = wf.conditions as Record<string, any>;
      if (!matchConditions(conditions, payload)) continue;

      // Delay support (for tunnel automations)
      if (wf.delayMinutes && wf.delayMinutes > 0) {
        // В будущем: создать scheduled job. Пока — пропускаем delayed workflows
        // TODO: интеграция с cron/scheduler
        await prisma.workflowLog.create({
          data: {
            workflowId: wf.id,
            trigger,
            payload,
            result: "delayed",
            error: `Отложено на ${wf.delayMinutes} мин`,
          },
        });
        continue;
      }

      // Execute actions
      const actions = wf.actions as WorkflowAction[];
      for (const action of actions) {
        await executeAction(action, payload);
      }

      // Update execution stats
      await prisma.workflow.update({
        where: { id: wf.id },
        data: {
          executionCount: { increment: 1 },
          lastExecutedAt: new Date(),
        },
      });

      // Log success
      await prisma.workflowLog.create({
        data: {
          workflowId: wf.id,
          trigger,
          payload,
          result: "ok",
        },
      });

      results.push({ workflowId: wf.id, name: wf.name, result: "ok" });
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
      results.push({ workflowId: wf.id, name: wf.name, result: "error", error: err.message });
    }
  }

  return results;
}

// ─── Condition Matching ──────────────────────────────────────────────────────

function matchConditions(conditions: Record<string, any>, payload: Record<string, any>): boolean {
  if (!conditions || Object.keys(conditions).length === 0) return true;

  for (const [key, expectedValue] of Object.entries(conditions)) {
    const payloadValue = payload[key];

    // Support comparison operators: { $gt: 30000 }, { $in: ["NEW", "CONFIRMED"] }
    if (typeof expectedValue === "object" && expectedValue !== null && !Array.isArray(expectedValue)) {
      for (const [op, opValue] of Object.entries(expectedValue)) {
        if (op === "$gt" && !(payloadValue > (opValue as number))) return false;
        if (op === "$gte" && !(payloadValue >= (opValue as number))) return false;
        if (op === "$lt" && !(payloadValue < (opValue as number))) return false;
        if (op === "$lte" && !(payloadValue <= (opValue as number))) return false;
        if (op === "$eq" && payloadValue !== opValue) return false;
        if (op === "$ne" && payloadValue === opValue) return false;
        if (op === "$in" && Array.isArray(opValue) && !(opValue as any[]).includes(payloadValue)) return false;
        if (op === "$nin" && Array.isArray(opValue) && (opValue as any[]).includes(payloadValue)) return false;
        if (op === "$exists" && (opValue ? !payloadValue : !!payloadValue)) return false;
        if (op === "$regex" && typeof opValue === "string" && !new RegExp(opValue, "i").test(String(payloadValue ?? ""))) return false;
      }
    } else {
      // Simple equality check
      if (payloadValue !== expectedValue) return false;
    }
  }
  return true;
}

// ─── Action Execution ────────────────────────────────────────────────────────

async function executeAction(action: WorkflowAction, payload: Record<string, any>) {
  switch (action.type) {

    // ── Создать задачу ──
    case "create_task": {
      const title = resolveTemplate(action.title || "Новая задача", payload);
      const description = action.description ? resolveTemplate(action.description, payload) : null;

      let assigneeId = action.assigneeId || null;
      if (!assigneeId && action.assigneeRole) {
        const user = await prisma.user.findFirst({
          where: { role: action.assigneeRole, staffStatus: "ACTIVE" },
        });
        assigneeId = user?.id || null;
      }

      const sixtySecondsAgo = new Date(Date.now() - 60000);
      await prisma.$transaction(async (tx) => {
        const existing = await tx.task.findFirst({
          where: {
            orderId: payload.orderId || null,
            title,
            createdAt: { gte: sixtySecondsAgo },
          },
        });
        if (existing) return;

        await tx.task.create({
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
      });
      break;
    }

    // ── Отправить Telegram ──
    case "send_telegram": {
      const { sendTelegramMessage } = await import("@/lib/telegram");
      const text = resolveTemplate(action.text || "", payload);
      if (text) {
        await sendTelegramMessage(text);
      }
      break;
    }

    // ── Отправить Email ──
    case "send_email": {
      const { sendEmail } = await import("@/lib/email");
      const to = resolveTemplate(action.to || payload.guestEmail || payload.email || "", payload);
      const subject = resolveTemplate(action.subject || "Уведомление", payload);
      const html = resolveTemplate(action.html || action.text || "", payload);
      if (to && html) {
        await sendEmail({ to, subject, html });
      }
      break;
    }

    // ── Отправить Push ──
    case "send_push": {
      const { sendPushToStaff, sendPushToUser, sendPushToAll } = await import("@/lib/push");
      const title = resolveTemplate(action.title || "Уведомление", payload);
      const body = resolveTemplate(action.body || "", payload);
      const target = action.target || "staff"; // "staff" | "user" | "all"

      if (target === "staff") {
        await sendPushToStaff(title, body, action.url);
      } else if (target === "user" && payload.userId) {
        await sendPushToUser(payload.userId, title, body, action.url);
      } else if (target === "all") {
        await sendPushToAll(title, body, action.url);
      }
      break;
    }

    // ── Обновить стадию лида ──
    case "update_lead_stage": {
      const leadId = payload.leadId;
      if (!leadId) break;

      await prisma.lead.update({
        where: { id: leadId },
        data: { stage: action.stage },
      });

      // Создать activity запись
      await prisma.leadActivity.create({
        data: {
          leadId,
          type: "STAGE_CHANGE",
          text: `Автоматически переведён в "${action.stage}" роботом`,
        },
      });

      // Рекурсивный триггер — воронка может продвигать дальше
      await runWorkflows("lead_stage_changed", {
        ...payload,
        stage: action.stage,
        previousStage: payload.stage,
      });
      break;
    }

    // ── Обновить статус заказа ──
    case "update_order_status": {
      const orderId = payload.orderId;
      if (!orderId) break;

      await prisma.order.update({
        where: { id: orderId },
        data: { status: action.status },
      });

      // Рекурсивный триггер
      await runWorkflows("order_status_changed", {
        ...payload,
        status: action.status,
        previousStatus: payload.status,
      });
      break;
    }

    // ── Назначить лид на менеджера ──
    case "assign_lead": {
      const leadId = payload.leadId;
      if (!leadId) break;

      let assigneeId = action.assigneeId;

      // Автоназначение: найти менеджера с наименьшим кол-вом активных лидов
      if (!assigneeId && action.autoAssign) {
        const managers = await prisma.user.findMany({
          where: {
            role: { in: ["ADMIN", "MANAGER"] },
            staffStatus: "ACTIVE",
          },
          include: {
            assignedLeads: {
              where: { stage: { notIn: ["WON", "LOST"] }, deletedAt: null },
            },
          },
        });
        if (managers.length > 0) {
          // Round-robin: наименьшая загрузка
          managers.sort((a, b) => a.assignedLeads.length - b.assignedLeads.length);
          assigneeId = managers[0].id;
        }
      }

      if (assigneeId) {
        await prisma.lead.update({
          where: { id: leadId },
          data: { assigneeId },
        });

        await prisma.leadActivity.create({
          data: {
            leadId,
            type: "SYSTEM",
            text: `Автоматически назначен на менеджера`,
            userId: assigneeId,
          },
        });
      }
      break;
    }

    // ── Уведомление в системе (для панели управления) ──
    case "create_notification": {
      // Логируем как системное событие — используется панелью управления CRM
      console.log(`[CRM Notification] ${resolveTemplate(action.text || "", payload)}`);
      break;
    }

    // ── Генерация документа ──
    case "generate_document": {
      const templateId = action.templateId;
      if (!templateId) break;

      const template = await prisma.documentTemplate.findUnique({ where: { id: templateId } });
      if (!template || !template.active) break;

      const html = resolveTemplate(template.content, payload);
      const fileName = resolveTemplate(
        action.fileName || `${template.type}_{{orderNumber}}_${Date.now()}.pdf`,
        payload
      );

      // Сохраняем запись (PDF генерация — отдельный шаг)
      await prisma.generatedDocument.create({
        data: {
          templateId,
          orderId: payload.orderId || null,
          leadId: payload.leadId || null,
          fileName,
          fileUrl: `/uploads/documents/${fileName}`,
          data: payload,
          createdBy: payload.userId || null,
        },
      });
      break;
    }

    // ── Webhook (вызов внешнего API) ──
    case "webhook": {
      const url = action.url;
      if (!url) break;

      const body = action.body
        ? JSON.parse(resolveTemplate(JSON.stringify(action.body), payload))
        : payload;

      try {
        await fetch(url, {
          method: action.method || "POST",
          headers: {
            "Content-Type": "application/json",
            ...(action.headers || {}),
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(10000),
        });
      } catch (e: any) {
        console.error(`[Webhook] Failed: ${url}`, e.message);
      }
      break;
    }

    default:
      console.warn(`[Workflow] Unknown action type: ${action.type}`);
      break;
  }
}

// ─── Template Resolution ─────────────────────────────────────────────────────

function resolveTemplate(template: string, vars: Record<string, any>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const val = vars[key];
    if (val === null || val === undefined) return "";
    if (typeof val === "object") return JSON.stringify(val);
    return String(val);
  });
}

// ─── Утилиты для API ─────────────────────────────────────────────────────────

/** Получить статистику всех роботов */
export async function getWorkflowStats() {
  try {
    const [total, active, logs24h, errors24h] = await Promise.all([
      prisma.workflow.count(),
      prisma.workflow.count({ where: { active: true } }),
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
    return { total, active, logs24h, errors24h };
  } catch {
    return { total: 0, active: 0, logs24h: 0, errors24h: 0 };
  }
}

/** Получить последние логи */
export async function getRecentLogs(limit = 50) {
  try {
    return await prisma.workflowLog.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
      include: { workflow: { select: { name: true, trigger: true } } },
    });
  } catch {
    return [];
  }
}

// ─── Предустановленные роботы для пиломатериалов ─────────────────────────────

export const LUMBER_PRESET_WORKFLOWS = [
  {
    name: "Новый заказ → Задача менеджеру",
    description: "При создании заказа автоматически создаёт задачу для менеджера",
    trigger: "order_created",
    category: "robot",
    conditions: {},
    actions: [
      {
        type: "create_task",
        title: "Обработать заказ #{{orderNumber}}",
        description: "Клиент: {{guestName}}, Телефон: {{guestPhone}}, Сумма: {{totalAmount}}₽",
        assigneeRole: "MANAGER",
        priority: "HIGH",
        dueDateHours: 2,
        tags: ["заказ", "автоматизация"],
      },
    ],
  },
  {
    name: "Крупный заказ → Уведомление директору",
    description: "При заказе >50 000₽ отправляет Telegram директору",
    trigger: "order_created",
    category: "robot",
    conditions: { totalAmount: { $gt: 50000 } },
    actions: [
      {
        type: "send_telegram",
        text: "🔥 Крупный заказ #{{orderNumber}} на {{totalAmount}}₽! Клиент: {{guestName}}, {{guestPhone}}",
      },
      {
        type: "send_push",
        target: "staff",
        title: "Крупный заказ!",
        body: "#{{orderNumber}} — {{totalAmount}}₽",
        url: "/admin/orders",
      },
    ],
  },
  {
    name: "Заказ отгружен → Уведомление клиенту",
    description: "При отгрузке отправляет push клиенту",
    trigger: "order_status_changed",
    category: "robot",
    conditions: { status: "SHIPPED" },
    actions: [
      {
        type: "send_push",
        target: "user",
        title: "Ваш заказ отгружен!",
        body: "Заказ #{{orderNumber}} отгружен и готов к доставке",
        url: "/cabinet",
      },
    ],
  },
  {
    name: "Новый лид → Автоназначение",
    description: "Автоматически назначает нового лида на менеджера с наименьшей загрузкой",
    trigger: "lead_created",
    category: "robot",
    conditions: {},
    actions: [
      {
        type: "assign_lead",
        autoAssign: true,
      },
      {
        type: "create_task",
        title: "Связаться с лидом: {{name}}",
        description: "Телефон: {{phone}}, Email: {{email}}, Источник: {{source}}",
        assigneeRole: "MANAGER",
        priority: "HIGH",
        dueDateHours: 1,
        tags: ["лид", "первый контакт"],
      },
    ],
  },
  {
    name: "Лид → Встреча назначена → Подготовить КП",
    description: "Когда лид переходит в этап 'Встреча', создаёт задачу подготовить КП",
    trigger: "lead_stage_changed",
    category: "tunnel",
    conditions: { stage: "MEETING" },
    actions: [
      {
        type: "create_task",
        title: "Подготовить КП для {{name}}",
        description: "Лид перешёл в этап 'Встреча'. Подготовить коммерческое предложение.",
        assigneeRole: "MANAGER",
        priority: "HIGH",
        dueDateHours: 4,
        tags: ["КП", "воронка"],
      },
    ],
  },
  {
    name: "Лид выиграл → Создать заказ",
    description: "Когда лид помечен как WON, уведомить команду",
    trigger: "lead_stage_changed",
    category: "tunnel",
    conditions: { stage: "WON" },
    actions: [
      {
        type: "send_telegram",
        text: "🎉 Сделка закрыта! Лид «{{name}}» выиграл! Сумма: {{value}}₽",
      },
      {
        type: "send_push",
        target: "staff",
        title: "Сделка закрыта!",
        body: "{{name}} — {{value}}₽",
      },
    ],
  },
];
