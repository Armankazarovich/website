export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || "" });

// ── Контекст бизнеса — реальные данные ──────────────────────────────────────
async function getBusinessContext() {
  const now = new Date();
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - 7);

  const [ordersToday, ordersWeek, pendingOrders, topProducts, totalRevenue] = await Promise.all([
    prisma.order.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.order.count({ where: { createdAt: { gte: weekStart } } }),
    prisma.order.count({ where: { status: { in: ["NEW", "CONFIRMED"] } } }),
    prisma.orderItem.groupBy({
      by: ["variantId"],
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 3,
    }),
    prisma.order.aggregate({
      where: { status: { notIn: ["CANCELLED"] }, createdAt: { gte: weekStart } },
      _sum: { totalAmount: true },
    }),
  ]);

  // Названия топ-товаров (через вариант → продукт)
  const topProductNames = await Promise.all(
    topProducts.map(async (tp) => {
      const v = await prisma.productVariant.findUnique({ where: { id: tp.variantId }, select: { product: { select: { name: true } } } });
      return v?.product?.name || "Товар";
    })
  );

  return {
    ordersToday,
    ordersWeek,
    pendingOrders,
    revenueWeek: Number(totalRevenue._sum.totalAmount || 0),
    topProducts: topProductNames,
  };
}

// ── Системный промпт для сотрудника ─────────────────────────────────────────
function buildAdminSystemPrompt(ctx: Awaited<ReturnType<typeof getBusinessContext>>, role: string, staffName: string) {
  return `Ты — ARAY, умный бизнес-ассистент для команды ПилоРус. Ты помогаешь сотрудникам работать в CRM, разбираться с заказами и улучшать показатели.

ТЫ — НЕ КЛИЕНТСКИЙ АССИСТЕНТ. Ты работаешь ВНУТРИ команды.

━━━ ТЕКУЩИЕ ДАННЫЕ БИЗНЕСА ━━━
• Заказов сегодня: ${ctx.ordersToday}
• Заказов за неделю: ${ctx.ordersWeek}
• Ждут обработки: ${ctx.pendingOrders}
• Выручка за неделю: ${ctx.revenueWeek.toLocaleString("ru-RU")} ₽
• Топ товары: ${ctx.topProducts.join(", ") || "нет данных"}

━━━ СОТРУДНИК ━━━
Имя: ${staffName}
Роль: ${role}

━━━ КАК ТЫ РАБОТАЕШЬ ━━━

Ты — как умный коллега-наставник. Дружелюбный, по делу, без воды.
Помогаешь с:
— Работой в CRM (как создать заказ, найти клиента, изменить статус)
— Вопросами по товарам (артикулы, размеры, наличие)
— Анализом продаж и подсказками
— Мотивацией и антистрессом 😄

Если сотрудник устал или стрессует — поддержи добрым словом.
Можешь пошутить (в меру, по-доброму).
Используй эмодзи редко, только где уместно.

━━━ СТИЛЬ ━━━
Короткие ответы (2-3 предложения). По существу.
Никаких стен текста. Если нужно объяснить — пунктами.
Говоришь на русском. Обращаешься по имени если знаешь.

Ты — ARAY. Умный, добрый, по делу. Коллега, которому можно доверять.`;
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const role = session?.user?.role as string;
    const staffName = session?.user?.name as string || "Сотрудник";

    if (!session || !role || role === "USER") {
      return NextResponse.json({ error: "Нет доступа" }, { status: 401 });
    }

    const { messages } = await req.json();
    if (!messages?.length) return NextResponse.json({ error: "Нет сообщений" }, { status: 400 });

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: "ИИ не настроен" }, { status: 503 });
    }

    const ctx = await getBusinessContext().catch(() => ({
      ordersToday: 0, ordersWeek: 0, pendingOrders: 0, revenueWeek: 0, topProducts: [],
    }));

    const systemPrompt = buildAdminSystemPrompt(ctx, role, staffName);

    const response = await anthropic.messages.create({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 400,
      system: systemPrompt,
      messages: messages.slice(-12).map((m: any) => ({
        role: m.role,
        content: m.content,
      })),
    });

    const text = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as any).text)
      .join("");

    return NextResponse.json({ message: text });
  } catch (e: any) {
    console.error("[AdminAray]", e);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
