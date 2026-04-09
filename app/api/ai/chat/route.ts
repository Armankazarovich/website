export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
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
  ...(process.env.ANTHROPIC_BASE_URL ? { baseURL: process.env.ANTHROPIC_BASE_URL } : {}),
});

function generateSessionId(): string {
  return `aray_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export async function POST(req: NextRequest) {
  const encoder = new TextEncoder();

  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return new Response(
        encoder.encode("__ARAY_ERR__ANTHROPIC_API_KEY не настроен на сервере."),
        { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } }
      );
    }

    const body = await req.json();
    const { messages, context } = body;

    if (!messages?.length) {
      return new Response(encoder.encode("__ARAY_ERR__Нет сообщений"), {
        status: 400, headers: { "Content-Type": "text/plain; charset=utf-8" }
      });
    }

    // ── Идентификация ────────────────────────────────────────────────────────
    const session = await auth();
    const userId = (session?.user as any)?.id as string | undefined;
    const sessionRole = (session?.user as any)?.role as string | undefined;
    const sessionName = (session?.user as any)?.name as string | undefined;

    const cookieStore = await cookies();
    let sessionId = cookieStore.get("aray_sid")?.value;
    const isNewSession = !sessionId && !userId;
    if (!sessionId) sessionId = generateSessionId();

    // ── Память ───────────────────────────────────────────────────────────────
    let memory = null;
    try {
      memory = await getOrCreateMemory(userId, userId ? null : sessionId);
    } catch (memErr) {
      console.error("[Aray] Memory error:", memErr);
    }
    const memoryContext = formatMemoryForPrompt(memory);

    // ── Роль ─────────────────────────────────────────────────────────────────
    let arayRole: ArayRole = "customer";
    if (["SUPER_ADMIN", "ADMIN"].includes(sessionRole || "")) arayRole = "admin";
    else if (["MANAGER", "COURIER", "ACCOUNTANT", "WAREHOUSE", "SELLER"].includes(sessionRole || "")) arayRole = "staff";

    // ── Настройки сайта ──────────────────────────────────────────────────────
    const siteSettings = await getSiteSettings();
    const siteName = getSetting(siteSettings, "site_name") || "ПилоРус";
    const phone = getSetting(siteSettings, "phone") || "";
    const address = getSetting(siteSettings, "address") || "";
    const businessType = getSetting(siteSettings, "business_type") || "lumber";

    const memoryFacts = memory?.facts as Record<string, string | number | boolean> | null;
    const savedProject = memoryFacts?.проект ? String(memoryFacts.проект)
      : memoryFacts?.project ? String(memoryFacts.project) : undefined;

    const basePrompt = buildAraySystemPrompt(
      { siteName, businessType, phone, address },
      { role: arayRole, name: sessionName, staffRole: sessionRole },
      { page: context?.page, productName: context?.productName, cartTotal: context?.cartTotal, project: savedProject }
    );
    const systemPrompt = basePrompt + memoryContext;

    // ── Сообщения ────────────────────────────────────────────────────────────
    type ChatMessage = { role: "user" | "assistant"; content: string };
    const rawMessages: ChatMessage[] = messages.slice(-20).map((m: any) => ({
      role: m.role as "user" | "assistant", content: m.content,
    }));
    const firstUserIdx = rawMessages.findIndex(m => m.role === "user");
    const formattedMessages: ChatMessage[] = firstUserIdx >= 0 ? rawMessages.slice(firstUserIdx) : rawMessages;

    // ── Streaming response ───────────────────────────────────────────────────
    const responseHeaders = new Headers({ "Content-Type": "text/plain; charset=utf-8" });
    if (isNewSession && sessionId) {
      responseHeaders.set("Set-Cookie",
        `aray_sid=${sessionId}; Max-Age=${30 * 24 * 60 * 60}; HttpOnly; SameSite=Lax; Path=/`
      );
    }

    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();

    (async () => {
      let fullText = "";
      try {
        // ── Первый вызов (может вернуть tool_use) ────────────────────────────
        const firstStream = anthropic.messages.stream({
          model: "claude-sonnet-4-6",
          max_tokens: 800,
          system: systemPrompt,
          messages: formattedMessages,
          tools: ARAY_TOOLS as any,
        });

        for await (const event of firstStream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            fullText += event.delta.text;
            await writer.write(encoder.encode(event.delta.text));
          }
        }

        const firstMsg = await firstStream.finalMessage();
        const toolBlocks = firstMsg.content.filter((b: any) => b.type === "tool_use");

        // ── Обработка инструментов ───────────────────────────────────────────
        if (toolBlocks.length > 0) {
          const toolResults = await Promise.all(
            toolBlocks.map(async (block: any) => ({
              type: "tool_result" as const,
              tool_use_id: block.id,
              content: JSON.stringify(await handleTool(block.name, block.input)),
            }))
          );

          const followStream = anthropic.messages.stream({
            model: "claude-sonnet-4-6",
            max_tokens: 800,
            system: systemPrompt,
            messages: [
              ...formattedMessages,
              { role: "assistant", content: firstMsg.content },
              { role: "user", content: toolResults },
            ],
          });

          for await (const event of followStream) {
            if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
              fullText += event.delta.text;
              await writer.write(encoder.encode(event.delta.text));
            }
          }
        }

        // ── Обновление памяти в фоне ─────────────────────────────────────────
        if (memory && fullText) {
          const allMsgs = [...formattedMessages, { role: "assistant", content: fullText }];
          Promise.all([
            extractAndUpdateMemory(memory.id, memory.facts as any, allMsgs, anthropic),
            userId ? updateCustomerLevel(memory.id, userId) : Promise.resolve(),
          ]).catch(err => console.error("[ArayMemory]", err));
        }

        // Мета-данные в конце
        await writer.write(encoder.encode(
          `\n__ARAY_META__${JSON.stringify({ role: arayRole, memoryId: memory?.id })}`
        ));

      } catch (err: any) {
        console.error("[Aray stream error]", err?.message || err);
        let errMsg = "Арай временно недоступен. Попробуй через минуту 🙏";
        if (err?.status === 401) errMsg = "Ошибка API ключа Anthropic.";
        if (err?.message?.includes("credit")) errMsg = "На счёте Anthropic закончились кредиты 💳";
        if (err?.status === 529) errMsg = "Anthropic перегружен, подожди минуту 🙏";
        await writer.write(encoder.encode(`__ARAY_ERR__${errMsg}`));
      } finally {
        await writer.close();
      }
    })();

    return new Response(readable, { headers: responseHeaders });

  } catch (err: any) {
    console.error("[Aray POST error]", err?.message);
    return new Response(
      encoder.encode("__ARAY_ERR__Ошибка сервера. Попробуй через минуту."),
      { status: 500, headers: { "Content-Type": "text/plain; charset=utf-8" } }
    );
  }
}

// ─── Инструменты ─────────────────────────────────────────────────────────────

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
        name: p.name, slug: p.slug, category: p.category.name,
        variants: p.variants.map(v => ({
          id: v.id, size: v.size,
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
      return calculateProjectMaterials({
        project_type: String(input.project_type || "house"),
        length: input.length ? Number(input.length) : undefined,
        width: input.width ? Number(input.width) : undefined,
        floors: input.floors ? Number(input.floors) : undefined,
        fence_length: input.fence_length ? Number(input.fence_length) : undefined,
        construction_type: input.construction_type ? String(input.construction_type) : undefined,
      });
    }

    if (name === "get_order_status") {
      const orderNumber = Number(input.orderNumber);
      const order = await prisma.order.findFirst({
        where: { orderNumber, deletedAt: null },
        select: { orderNumber: true, status: true, guestName: true, totalAmount: true, createdAt: true },
      });
      if (!order) return { error: "Заказ не найден" };
      const statusLabels: Record<string, string> = {
        NEW: "Новый", CONFIRMED: "Подтверждён", PROCESSING: "В обработке",
        SHIPPED: "Отгружен", IN_DELIVERY: "Доставляется",
        READY_PICKUP: "Готов к выдаче", DELIVERED: "Доставлен",
        COMPLETED: "Завершён", CANCELLED: "Отменён",
      };
      return {
        orderNumber: order.orderNumber, status: statusLabels[order.status] || order.status,
        guestName: order.guestName, totalAmount: Number(order.totalAmount), createdAt: order.createdAt,
      };
    }
  } catch (err) {
    console.error(`[Tool ${name}]`, err);
    return { error: "Ошибка инструмента" };
  }
  return { error: "Неизвестный инструмент" };
}
