export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSiteSettings, getSetting } from "@/lib/site-settings";
import { buildAraySystemPrompt, ArayRole, ARAY_TOOLS } from "@/lib/aray-agent";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
});

export async function POST(req: NextRequest) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY не настроен. Добавьте ключ в настройках сервера." },
        { status: 503 }
      );
    }

    const body = await req.json();
    const { messages, context } = body;

    if (!messages?.length) {
      return NextResponse.json({ error: "Нет сообщений" }, { status: 400 });
    }

    // Определяем роль пользователя
    const session = await auth();
    const sessionRole = (session?.user as any)?.role;
    const sessionName = (session?.user as any)?.name;

    let arayRole: ArayRole = "customer";
    if (["SUPER_ADMIN", "ADMIN"].includes(sessionRole)) arayRole = "admin";
    else if (["MANAGER", "COURIER", "ACCOUNTANT", "WAREHOUSE", "SELLER"].includes(sessionRole)) arayRole = "staff";

    // Читаем настройки сайта для контекста
    const siteSettings = await getSiteSettings();
    const siteName = getSetting(siteSettings, "site_name") || "ПилоРус";
    const phone = getSetting(siteSettings, "phone") || "";
    const address = getSetting(siteSettings, "address") || "";
    const businessType = getSetting(siteSettings, "business_type") || "lumber";

    // Строим системный промпт под роль и контекст
    const systemPrompt = buildAraySystemPrompt(
      { siteName, businessType, phone, address },
      { role: arayRole, name: sessionName, staffRole: sessionRole },
      { page: context?.page, productName: context?.productName, cartTotal: context?.cartTotal }
    );

    // Форматируем историю сообщений
    const formattedMessages = messages.map((m: { role: string; content: string }) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    // Вызов Claude API с инструментами
    const response = await anthropic.messages.create({
      model: "claude-3-5-haiku-20241022", // Быстрый и дешёвый для чата
      max_tokens: 1024,
      system: systemPrompt,
      messages: formattedMessages,
      tools: ARAY_TOOLS as any,
    });

    // Обрабатываем tool calls
    let finalText = "";
    const toolResults: any[] = [];

    for (const block of response.content) {
      if (block.type === "text") {
        finalText += block.text;
      } else if (block.type === "tool_use") {
        const result = await handleTool(block.name, block.input as any);
        toolResults.push({ tool: block.name, result });
        // Если был инструмент — делаем второй вызов с результатом
      }
    }

    // Если были инструменты — продолжаем диалог
    if (toolResults.length > 0 && !finalText) {
      const toolUseBlocks = response.content.filter(b => b.type === "tool_use");
      const toolResultMessages = toolUseBlocks.map((block: any, i: number) => ({
        type: "tool_result" as const,
        tool_use_id: block.id,
        content: JSON.stringify(toolResults[i]?.result || {}),
      }));

      const followUp = await anthropic.messages.create({
        model: "claude-3-5-haiku-20241022",
        max_tokens: 1024,
        system: systemPrompt,
        messages: [
          ...formattedMessages,
          { role: "assistant", content: response.content },
          { role: "user", content: toolResultMessages },
        ],
      });

      for (const block of followUp.content) {
        if (block.type === "text") finalText += block.text;
      }
    }

    return NextResponse.json({
      message: finalText || "Я здесь, чем могу помочь?",
      role: arayRole,
    });
  } catch (err: any) {
    console.error("Aray API error:", err);

    if (err?.status === 401) {
      return NextResponse.json({ error: "Неверный ANTHROPIC_API_KEY" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Арай временно недоступен. Попробуйте через минуту." },
      { status: 500 }
    );
  }
}

// Обработчик инструментов
async function handleTool(name: string, input: any): Promise<any> {
  try {
    if (name === "search_products") {
      const products = await prisma.product.findMany({
        where: {
          active: true,
          OR: [
            { name: { contains: input.query, mode: "insensitive" } },
            { description: { contains: input.query, mode: "insensitive" } },
          ],
        },
        include: {
          variants: { where: { inStock: true }, take: 3 },
          category: { select: { name: true } },
        },
        take: 5,
      });

      return products.map(p => ({
        name: p.name,
        category: p.category.name,
        variants: p.variants.map(v => ({
          size: v.size,
          pricePerCube: v.pricePerCube ? Number(v.pricePerCube) : null,
          pricePerPiece: v.pricePerPiece ? Number(v.pricePerPiece) : null,
          inStock: v.inStock,
        })),
      }));
    }

    if (name === "calculate_volume") {
      const { length, width, height, count = 1 } = input;
      const volumePerPiece = length * width * height;
      const totalVolume = volumePerPiece * count;
      return {
        volumePerPiece: Math.round(volumePerPiece * 1000) / 1000,
        totalVolume: Math.round(totalVolume * 1000) / 1000,
        formula: `${length}м × ${width}м × ${height}м × ${count}шт = ${totalVolume.toFixed(3)} м³`,
      };
    }

    if (name === "get_order_status") {
      const order = await prisma.order.findFirst({
        where: { orderNumber: input.orderNumber, deletedAt: null },
        select: {
          orderNumber: true,
          status: true,
          guestName: true,
          totalAmount: true,
          createdAt: true,
        },
      });

      if (!order) return { error: "Заказ не найден" };

      const statusLabels: Record<string, string> = {
        NEW: "Новый", CONFIRMED: "Подтверждён", PROCESSING: "В обработке",
        SHIPPED: "Отгружен", IN_DELIVERY: "Доставляется",
        READY_PICKUP: "Готов к выдаче", DELIVERED: "Доставлен",
        COMPLETED: "Завершён", CANCELLED: "Отменён",
      };

      return {
        orderNumber: order.orderNumber,
        status: statusLabels[order.status] || order.status,
        guestName: order.guestName,
        totalAmount: Number(order.totalAmount),
        createdAt: order.createdAt,
      };
    }
  } catch (err) {
    console.error(`Tool ${name} error:`, err);
    return { error: "Ошибка при выполнении действия" };
  }

  return { error: "Неизвестный инструмент" };
}
