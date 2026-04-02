export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSiteSettings, getSetting } from "@/lib/site-settings";
import { buildAraySystemPrompt, ArayRole, ARAY_TOOLS, calculateProjectMaterials } from "@/lib/aray-agent";
import {
  getOrCreateMemory,
  formatMemoryForPrompt,
  extractAndUpdateMemory,
  updateCustomerLevel,
} from "@/lib/aray-memory";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
});

// Генерация sessionId для гостей
function generateSessionId(): string {
  return `aray_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export async function POST(req: NextRequest) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY не настроен на сервере." },
        { status: 503 }
      );
    }

    const body = await req.json();
    const { messages, context } = body;

    if (!messages?.length) {
      return NextResponse.json({ error: "Нет сообщений" }, { status: 400 });
    }

    // ── Идентификация пользователя ────────────────────────────────────────────
    const session = await auth();
    const userId = (session?.user as any)?.id as string | undefined;
    const sessionRole = (session?.user as any)?.role as string | undefined;
    const sessionName = (session?.user as any)?.name as string | undefined;

    // Получаем или создаём sessionId для гостей
    const cookieStore = await cookies();
    let sessionId = cookieStore.get("aray_sid")?.value;
    const isNewSession = !sessionId && !userId;
    if (!sessionId) sessionId = generateSessionId();

    // ── Память Арая (graceful — не ломаем чат при ошибке БД) ─────────────────
    let memory = null;
    try {
      memory = await getOrCreateMemory(userId, userId ? null : sessionId);
    } catch (memErr) {
      console.error("[Aray] Memory error (non-fatal):", memErr);
    }
    const memoryContext = formatMemoryForPrompt(memory);

    // ── Роль пользователя ─────────────────────────────────────────────────────
    let arayRole: ArayRole = "customer";
    if (["SUPER_ADMIN", "ADMIN"].includes(sessionRole || "")) arayRole = "admin";
    else if (["MANAGER", "COURIER", "ACCOUNTANT", "WAREHOUSE", "SELLER"].includes(sessionRole || "")) arayRole = "staff";

    // ── Настройки сайта ───────────────────────────────────────────────────────
    const siteSettings = await getSiteSettings();
    const siteName = getSetting(siteSettings, "site_name") || "ПилоРус";
    const phone = getSetting(siteSettings, "phone") || "";
    const address = getSetting(siteSettings, "address") || "";
    const businessType = getSetting(siteSettings, "business_type") || "lumber";

    // ── Проект из памяти — передаём Арaю контекст ────────────────────────────
    const memoryFacts = memory?.facts as Record<string, string | number | boolean> | null;
    const savedProject = memoryFacts?.проект
      ? String(memoryFacts.проект)
      : memoryFacts?.project
      ? String(memoryFacts.project)
      : undefined;

    // ── Системный промпт с памятью ────────────────────────────────────────────
    const basePrompt = buildAraySystemPrompt(
      { siteName, businessType, phone, address },
      { role: arayRole, name: sessionName, staffRole: sessionRole },
      {
        page: context?.page,
        productName: context?.productName,
        cartTotal: context?.cartTotal,
        project: savedProject,
      }
    );

    const systemPrompt = basePrompt + memoryContext;

    // ── Форматируем сообщения ─────────────────────────────────────────────────
    type ChatMessage = { role: "user" | "assistant"; content: string };

    const rawMessages: ChatMessage[] = messages
      .slice(-20) // Не больше 20 сообщений в контексте
      .map((m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

    // Anthropic требует: первое сообщение всегда user
    // Срезаем ведущие assistant-сообщения (локальные приветствия виджета)
    const firstUserIdx = rawMessages.findIndex(m => m.role === "user");
    const formattedMessages: ChatMessage[] = firstUserIdx >= 0 ? rawMessages.slice(firstUserIdx) : rawMessages;

    // ── Вызов Claude ──────────────────────────────────────────────────────────
    const response = await anthropic.messages.create({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 1024,
      system: systemPrompt,
      messages: formattedMessages,
      tools: ARAY_TOOLS as any,
    });

    // ── Обработка tool calls ──────────────────────────────────────────────────
    let finalText = "";
    const toolResults: { tool: string; result: unknown }[] = [];

    for (const block of response.content) {
      if (block.type === "text") {
        finalText += block.text;
      } else if (block.type === "tool_use") {
        const result = await handleTool(block.name, block.input as Record<string, unknown>);
        toolResults.push({ tool: block.name, result });
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

    // ── Сохраняем память асинхронно (не блокируем ответ) ─────────────────────
    if (memory) {
      const allMessages = [
        ...formattedMessages,
        { role: "assistant", content: finalText },
      ];

      // Фоновое обновление памяти — не ждём
      Promise.all([
        extractAndUpdateMemory(
          memory.id,
          memory.facts as Record<string, string | number | boolean>,
          allMessages,
          anthropic
        ),
        userId ? updateCustomerLevel(memory.id, userId) : Promise.resolve(),
      ]).catch(err => console.error("[ArayMemory] background update error:", err));
    }

    // ── Ответ с установкой cookie ─────────────────────────────────────────────
    const responseData = NextResponse.json({
      message: finalText || "Я здесь, чем могу помочь?",
      role: arayRole,
      memoryId: memory?.id,
      level: memory?.level,
    });

    // Устанавливаем sessionId cookie для гостей (30 дней)
    if (isNewSession && sessionId) {
      responseData.cookies.set("aray_sid", sessionId, {
        maxAge: 30 * 24 * 60 * 60,
        httpOnly: true,
        sameSite: "lax",
        path: "/",
      });
    }

    return responseData;

  } catch (err: any) {
    console.error("[Aray API error]", err?.message || err);

    if (err?.status === 401 || err?.message?.includes("401")) {
      return NextResponse.json({ error: "Неверный API ключ Anthropic. Проверь настройки." }, { status: 401 });
    }
    if (err?.status === 529 || err?.message?.includes("overloaded")) {
      return NextResponse.json({ error: "Anthropic перегружен, попробуй через минуту 🙏" }, { status: 503 });
    }
    if (err?.message?.includes("fetch") || err?.code === "ECONNREFUSED") {
      return NextResponse.json({ error: "Нет связи с Anthropic. Проверь интернет на сервере." }, { status: 503 });
    }

    const devMsg = process.env.NODE_ENV === "development" ? ` [${err?.message}]` : "";
    return NextResponse.json(
      { error: `Арай временно недоступен${devMsg}. Попробуй через минуту.` },
      { status: 500 }
    );
  }
}

// ─── Обработчик инструментов ──────────────────────────────────────────────────

async function handleTool(name: string, input: Record<string, unknown>): Promise<unknown> {
  try {
    if (name === "search_products") {
      const query = String(input.query || "");
      const products = await prisma.product.findMany({
        where: {
          active: true,
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { description: { contains: query, mode: "insensitive" } },
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
        slug: p.slug,
        category: p.category.name,
        variants: p.variants.map(v => ({
          id: v.id,
          size: v.size,
          pricePerCube: v.pricePerCube ? Number(v.pricePerCube) : null,
          pricePerPiece: v.pricePerPiece ? Number(v.pricePerPiece) : null,
          inStock: v.inStock,
        })),
      }));
    }

    if (name === "calculate_volume") {
      const length = Number(input.length) || 0;
      const width = Number(input.width) || 0;
      const height = Number(input.height) || 0;
      const count = Number(input.count) || 1;
      const totalVolume = length * width * height * count;
      return {
        totalVolume: Math.round(totalVolume * 1000) / 1000,
        formula: `${length}м × ${width}м × ${height}м × ${count}шт = ${totalVolume.toFixed(3)} м³`,
      };
    }

    if (name === "calculate_project_materials") {
      const result = calculateProjectMaterials({
        project_type: String(input.project_type || "house"),
        length: input.length ? Number(input.length) : undefined,
        width: input.width ? Number(input.width) : undefined,
        floors: input.floors ? Number(input.floors) : undefined,
        fence_length: input.fence_length ? Number(input.fence_length) : undefined,
        construction_type: input.construction_type ? String(input.construction_type) : undefined,
      });
      return result;
    }

    if (name === "get_order_status") {
      const orderNumber = Number(input.orderNumber);
      const order = await prisma.order.findFirst({
        where: { orderNumber, deletedAt: null },
        select: {
          orderNumber: true, status: true, guestName: true,
          totalAmount: true, createdAt: true,
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
    console.error(`[Tool ${name} error]`, err);
    return { error: "Ошибка инструмента" };
  }

  return { error: "Неизвестный инструмент" };
}
