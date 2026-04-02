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

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || "" });

function generateSessionId(): string {
  return `aray_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

const enc = new TextEncoder();
const sse = (data: object) => enc.encode(`data: ${JSON.stringify(data)}\n\n`);
const sseDone = () => enc.encode("data: [DONE]\n\n");

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return sseError("ANTHROPIC_API_KEY не настроен на сервере.");
  }

  const body = await req.json();
  const { messages, context } = body;

  if (!messages?.length) {
    return sseError("Нет сообщений");
  }

  // ── Auth ───────────────────────────────────────────────────────────────────
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;
  const sessionRole = (session?.user as any)?.role as string | undefined;
  const sessionName = (session?.user as any)?.name as string | undefined;

  const cookieStore = await cookies();
  let sessionId = cookieStore.get("aray_sid")?.value;
  const isNewSession = !sessionId && !userId;
  if (!sessionId) sessionId = generateSessionId();

  // ── Memory ─────────────────────────────────────────────────────────────────
  let memory = null;
  try {
    memory = await getOrCreateMemory(userId, userId ? null : sessionId);
  } catch {}
  const memoryContext = formatMemoryForPrompt(memory);

  // ── Role ───────────────────────────────────────────────────────────────────
  let arayRole: ArayRole = "customer";
  if (["SUPER_ADMIN", "ADMIN"].includes(sessionRole || "")) arayRole = "admin";
  else if (["MANAGER", "COURIER", "ACCOUNTANT", "WAREHOUSE", "SELLER"].includes(sessionRole || "")) arayRole = "staff";

  // ── Settings ───────────────────────────────────────────────────────────────
  const siteSettings = await getSiteSettings();
  const siteName = getSetting(siteSettings, "site_name") || "ПилоРус";
  const phone = getSetting(siteSettings, "phone") || "";
  const address = getSetting(siteSettings, "address") || "";
  const businessType = getSetting(siteSettings, "business_type") || "lumber";

  // ── Project from memory ────────────────────────────────────────────────────
  const memoryFacts = memory?.facts as Record<string, string | number | boolean> | null;
  const savedProject = memoryFacts?.проект
    ? String(memoryFacts.проект)
    : memoryFacts?.project
    ? String(memoryFacts.project)
    : undefined;

  // ── System prompt ──────────────────────────────────────────────────────────
  const systemPrompt =
    buildAraySystemPrompt(
      { siteName, businessType, phone, address },
      { role: arayRole, name: sessionName, staffRole: sessionRole },
      { page: context?.page, productName: context?.productName, cartTotal: context?.cartTotal, project: savedProject }
    ) + memoryContext;

  // ── Format messages ────────────────────────────────────────────────────────
  type ChatMessage = { role: "user" | "assistant"; content: string };
  const rawMessages: ChatMessage[] = messages
    .slice(-20)
    .map((m: { role: string; content: string }) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));
  const firstUserIdx = rawMessages.findIndex(m => m.role === "user");
  const formattedMessages: ChatMessage[] = firstUserIdx >= 0 ? rawMessages.slice(firstUserIdx) : rawMessages;

  // ── SSE headers ────────────────────────────────────────────────────────────
  const headers: Record<string, string> = {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    "X-Accel-Buffering": "no",
    Connection: "keep-alive",
  };
  if (isNewSession && sessionId) {
    headers["Set-Cookie"] =
      `aray_sid=${sessionId}; Max-Age=${30 * 24 * 60 * 60}; HttpOnly; SameSite=Lax; Path=/`;
  }

  // ── Stream ─────────────────────────────────────────────────────────────────
  const stream = new ReadableStream({
    async start(ctrl) {
      let fullText = "";

      const send = (data: object) => ctrl.enqueue(sse(data));

      try {
        // First pass — streaming
        const st = anthropic.messages.stream({
          model: "claude-3-5-haiku-20241022",
          max_tokens: 1500,
          system: systemPrompt,
          messages: formattedMessages,
          tools: ARAY_TOOLS as any,
        });

        for await (const ev of st) {
          if (ev.type === "content_block_delta" && ev.delta.type === "text_delta") {
            fullText += ev.delta.text;
            send({ type: "text", text: ev.delta.text });
          }
        }

        const final = await st.finalMessage();

        // Tool calls — execute then stream follow-up
        if (final.stop_reason === "tool_use") {
          const toolBlocks = final.content.filter(b => b.type === "tool_use");
          const toolResultMsgs: { type: "tool_result"; tool_use_id: string; content: string }[] = [];

          for (const block of toolBlocks) {
            if (block.type !== "tool_use") continue;
            send({ type: "tool_start", name: block.name });
            const result = await handleTool(block.name, block.input as Record<string, unknown>);
            toolResultMsgs.push({
              type: "tool_result",
              tool_use_id: block.id,
              content: JSON.stringify(result),
            });
          }

          const st2 = anthropic.messages.stream({
            model: "claude-3-5-haiku-20241022",
            max_tokens: 1500,
            system: systemPrompt,
            messages: [
              ...formattedMessages,
              { role: "assistant" as const, content: final.content },
              { role: "user" as const, content: toolResultMsgs as any },
            ],
          });

          for await (const ev of st2) {
            if (ev.type === "content_block_delta" && ev.delta.type === "text_delta") {
              fullText += ev.delta.text;
              send({ type: "text", text: ev.delta.text });
            }
          }
        }

        // Done
        ctrl.enqueue(sseDone());

        // Background memory update
        if (memory) {
          Promise.all([
            extractAndUpdateMemory(
              memory.id,
              memory.facts as Record<string, string | number | boolean>,
              [...formattedMessages, { role: "assistant", content: fullText }],
              anthropic
            ),
            userId ? updateCustomerLevel(memory.id, userId) : Promise.resolve(),
          ]).catch(() => {});
        }
      } catch (err: any) {
        let msg = "Арай временно недоступен. Попробуй через минуту.";
        if (err?.message?.includes("credit balance is too low")) {
          msg = "На счёте Anthropic закончились кредиты. Пополни баланс на console.anthropic.com 💳";
        } else if (err?.status === 401 || err?.message?.includes("401")) {
          msg = "Неверный API ключ Anthropic.";
        } else if (err?.status === 529 || err?.message?.includes("overloaded")) {
          msg = "Anthropic перегружен, попробуй через минуту 🙏";
        }
        send({ type: "error", error: msg });
        ctrl.enqueue(sseDone());
      }

      ctrl.close();
    },
  });

  return new Response(stream, { headers });
}

function sseError(msg: string) {
  const body = `data: ${JSON.stringify({ type: "error", error: msg })}\ndata: [DONE]\n\n`;
  return new Response(body, {
    headers: { "Content-Type": "text/event-stream" },
  });
}

// ─── Tool handler (same as regular route) ─────────────────────────────────────

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
  } catch {
    return { error: "Ошибка инструмента" };
  }
  return { error: "Неизвестный инструмент" };
}
