export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function checkAdmin() {
  const session = await auth();
  const role = session?.user?.role;
  return session && ["ADMIN", "MANAGER"].includes(role);
}

const DEFAULT_WORKFLOWS = [
  {
    name: "📞 Новый заказ — позвонить клиенту",
    description: "При каждом новом заказе создаётся задача менеджеру — позвонить в течение 4 часов",
    trigger: "order_created",
    conditions: {},
    actions: [{
      type: "create_task",
      title: "Позвонить клиенту — Заказ #{{orderNumber}}",
      description: "Клиент: {{guestName}}\nТелефон: {{guestPhone}}\nСумма: {{totalAmount}} ₽\n\nПозвонить, уточнить детали заказа, подтвердить наличие.",
      priority: "HIGH",
      status: "TODO",
      assigneeRole: "MANAGER",
      dueDateHours: 4,
      tags: ["звонок", "новый заказ"],
    }],
  },
  {
    name: "🔥 Крупный заказ — СРОЧНАЯ обработка",
    description: "Заказ от 30 000 ₽ — менеджер обрабатывает в приоритете за 2 часа",
    trigger: "order_created",
    conditions: {},
    actions: [{
      type: "create_task",
      title: "🔥 КРУПНЫЙ ЗАКАЗ #{{orderNumber}} — {{guestName}}",
      description: "ПРИОРИТЕТ! Сумма: {{totalAmount}} ₽\nТелефон: {{guestPhone}}\n\nПозвонить немедленно, предложить скидку при оплате счётом, согласовать доставку.",
      priority: "URGENT",
      status: "TODO",
      assigneeRole: "MANAGER",
      dueDateHours: 2,
      tags: ["VIP", "срочно", "крупный заказ"],
    }],
  },
  {
    name: "🏗️ Заказ принят — собрать на складе",
    description: "Когда статус меняется на 'В обработке' — складчик получает задачу на сборку",
    trigger: "order_status_changed",
    conditions: { status: "PROCESSING" },
    actions: [{
      type: "create_task",
      title: "Собрать заказ #{{orderNumber}} для {{guestName}}",
      description: "Адрес доставки: {{deliveryAddress}}\n\nПодготовить пиломатериалы к отгрузке, проверить количество и размеры.",
      priority: "HIGH",
      status: "TODO",
      assigneeRole: "WAREHOUSE",
      dueDateHours: 24,
      tags: ["склад", "сборка"],
    }],
  },
  {
    name: "🚚 Заказ собран — передать курьеру",
    description: "Когда заказ готов к отгрузке — курьер получает задачу на доставку",
    trigger: "order_status_changed",
    conditions: { status: "READY" },
    actions: [{
      type: "create_task",
      title: "Доставить заказ #{{orderNumber}} — {{guestName}}",
      description: "Телефон клиента: {{guestPhone}}\nАдрес: {{deliveryAddress}}\n\nСогласовать время доставки, привезти и получить подпись.",
      priority: "HIGH",
      status: "TODO",
      assigneeRole: "COURIER",
      dueDateHours: 48,
      tags: ["доставка", "курьер"],
    }],
  },
  {
    name: "📄 Оплата счётом — выставить бухгалтеру",
    description: "Заказ с оплатой 'по счёту' — бухгалтер выставляет счёт организации",
    trigger: "order_created",
    conditions: { paymentMethod: "invoice" },
    actions: [{
      type: "create_task",
      title: "Выставить счёт — Заказ #{{orderNumber}}",
      description: "Организация: уточнить у менеджера\nСумма: {{totalAmount}} ₽\nКлиент: {{guestName}}, {{guestPhone}}\n\nВыставить счёт, отправить на email клиента.",
      priority: "MEDIUM",
      status: "TODO",
      assigneeRole: "ACCOUNTANT",
      dueDateHours: 8,
      tags: ["счёт", "бухгалтер", "юрлицо"],
    }],
  },
  {
    name: "⭐ Заказ выполнен — попросить отзыв",
    description: "Когда заказ закрыт — менеджер звонит и просит оставить отзыв",
    trigger: "order_status_changed",
    conditions: { status: "DELIVERED" },
    actions: [{
      type: "create_task",
      title: "Попросить отзыв — Заказ #{{orderNumber}}",
      description: "Клиент: {{guestName}}\nТелефон: {{guestPhone}}\n\nПозвонить, узнать доволен ли, попросить оставить отзыв на Яндекс Картах или сайте.",
      priority: "LOW",
      status: "BACKLOG",
      assigneeRole: "MANAGER",
      dueDateHours: 72,
      tags: ["отзыв", "лояльность"],
    }],
  },
];

export async function POST() {
  if (!(await checkAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Create all default workflows
  const created = await Promise.all(
    DEFAULT_WORKFLOWS.map(wf =>
      prisma.workflow.create({
        data: {
          name: wf.name,
          description: wf.description,
          trigger: wf.trigger,
          conditions: wf.conditions,
          actions: wf.actions,
          active: true,
        },
      })
    )
  );

  return NextResponse.json({ ok: true, created: created.length });
}
