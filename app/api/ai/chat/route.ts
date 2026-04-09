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

    // ── Параллельная загрузка: память + настройки сайта ─────────────────────
    let arayRole: ArayRole = "customer";
    if (["SUPER_ADMIN", "ADMIN"].includes(sessionRole || "")) arayRole = "admin";
    else if (["MANAGER", "COURIER", "ACCOUNTANT", "WAREHOUSE", "SELLER"].includes(sessionRole || "")) arayRole = "staff";

    const [memory, siteSettings] = await Promise.all([
      getOrCreateMemory(userId, userId ? null : sessionId).catch((e) => {
        console.error("[Aray] Memory error:", e); return null;
      }),
      getSiteSettings().catch(() => [] as unknown as Awaited<ReturnType<typeof getSiteSettings>>),
    ]);
    const memoryContext = formatMemoryForPrompt(memory);

    const siteName = getSetting(siteSettings as any, "site_name") || "ПилоРус";
    const phone = getSetting(siteSettings as any, "phone") || "";
    const address = getSetting(siteSettings as any, "address") || "";
    const businessType = getSetting(siteSettings as any, "business_type") || "lumber";

    const memoryFacts = memory?.facts as Record<string, string | number | boolean> | null;
    const savedProject = memoryFacts?.проект ? String(memoryFacts.проект)
      : memoryFacts?.project ? String(memoryFacts.project) : undefined;

    // Клиентский контекст (проект, корзина, товар) — только для клиентов, не для персонала
    const isAdminPage = context?.page?.includes("/admin");
    const basePrompt = buildAraySystemPrompt(
      { siteName, businessType, phone, address },
      { role: arayRole, name: sessionName, staffRole: sessionRole },
      isAdminPage
        ? { page: context?.page }
        : { page: context?.page, productName: context?.productName, cartTotal: context?.cartTotal, project: savedProject }
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
        // max_tokens=600 — только для решения "нужен инструмент?" → быстрее
        const firstStream = anthropic.messages.stream({
          model: "claude-sonnet-4-6",
          max_tokens: 600,
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
          // Сигнал клиенту: загружаю данные
          await writer.write(encoder.encode("__ARAY_TOOL__"));

          const toolResults = await Promise.all(
            toolBlocks.map(async (block: any) => ({
              type: "tool_result" as const,
              tool_use_id: block.id,
              content: JSON.stringify(await handleTool(block.name, block.input)),
            }))
          );

          const followStream = anthropic.messages.stream({
            model: "claude-sonnet-4-6",
            max_tokens: 1500,
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

    // ── НОВЫЕ АДМИНСКИЕ ИНСТРУМЕНТЫ ──────────────────────────────────────────

    if (name === "get_admin_dashboard") {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const [todayOrders, weekOrders, monthOrders, newOrders, allStatuses] = await Promise.all([
        prisma.order.findMany({
          where: { createdAt: { gte: todayStart }, deletedAt: null },
          select: { totalAmount: true, status: true },
        }),
        prisma.order.findMany({
          where: { createdAt: { gte: weekStart }, deletedAt: null },
          select: { totalAmount: true, status: true },
        }),
        prisma.order.findMany({
          where: { createdAt: { gte: monthStart }, deletedAt: null },
          select: { totalAmount: true },
        }),
        prisma.order.count({ where: { status: "NEW", deletedAt: null } }),
        prisma.order.groupBy({ by: ["status"], _count: { _all: true }, where: { deletedAt: null } }),
      ]);

      const sum = (orders: { totalAmount: any }[]) =>
        orders.reduce((s, o) => s + Number(o.totalAmount), 0);

      return {
        today: {
          count: todayOrders.length,
          revenue: sum(todayOrders),
          new: todayOrders.filter(o => o.status === "NEW").length,
        },
        week: { count: weekOrders.length, revenue: sum(weekOrders) },
        month: { count: monthOrders.length, revenue: sum(monthOrders) },
        awaitingApproval: newOrders,
        statusBreakdown: Object.fromEntries(allStatuses.map(s => [s.status, s._count._all])),
        generatedAt: new Date().toLocaleString("ru-RU"),
      };
    }

    if (name === "get_orders_list") {
      const limit = Number(input.limit) || 10;
      const statusFilter = input.status ? String(input.status) : undefined;
      const orders = await prisma.order.findMany({
        where: { deletedAt: null, ...(statusFilter ? { status: statusFilter as any } : {}) },
        orderBy: { createdAt: "desc" },
        take: limit,
        select: {
          orderNumber: true, status: true, guestName: true, guestPhone: true,
          totalAmount: true, createdAt: true, deliveryAddress: true,
          items: { select: { productName: true, quantity: true }, take: 2 },
        },
      });
      const statusLabels: Record<string, string> = {
        NEW: "Новый", CONFIRMED: "Подтверждён", PROCESSING: "В обработке",
        SHIPPED: "Отгружен", IN_DELIVERY: "Доставляется",
        READY_PICKUP: "Готов к выдаче", DELIVERED: "Доставлен",
        COMPLETED: "Завершён", CANCELLED: "Отменён",
      };
      return orders.map(o => ({
        номер: o.orderNumber,
        клиент: o.guestName,
        телефон: o.guestPhone,
        статус: statusLabels[o.status] || o.status,
        сумма: Number(o.totalAmount),
        дата: o.createdAt.toLocaleDateString("ru-RU"),
        адрес: o.deliveryAddress,
        товары: (o.items as { productName: string; quantity: any }[]).map(i => `${i.productName} ×${i.quantity}`).join(", "),
      }));
    }

    if (name === "get_clients_list") {
      const limit = Number(input.limit) || 10;
      const query = input.query ? String(input.query) : undefined;
      const clients = await prisma.order.groupBy({
        by: ["guestPhone"],
        _count: { _all: true },
        _sum: { totalAmount: true },
        _max: { guestName: true, createdAt: true },
        where: {
          deletedAt: null,
          ...(query ? {
            OR: [
              { guestName: { contains: query, mode: "insensitive" } },
              { guestPhone: { contains: query } },
            ],
          } : {}),
        },
        orderBy: { _count: { guestPhone: "desc" } },
        take: limit,
      });
      return clients.map(c => ({
        имя: c._max.guestName,
        телефон: c.guestPhone,
        заказов: c._count._all,
        сумма_всего: Number(c._sum.totalAmount || 0),
        последний_заказ: c._max.createdAt?.toLocaleDateString("ru-RU"),
      }));
    }

    if (name === "update_order_status") {
      const orderNumber = Number(input.orderNumber);
      const status = String(input.status);
      const order = await prisma.order.findFirst({ where: { orderNumber, deletedAt: null } });
      if (!order) return { error: "Заказ не найден" };
      await prisma.order.update({ where: { id: order.id }, data: { status: status as any } });
      return { success: true, orderNumber, newStatus: status, message: `Заказ #${orderNumber} → ${status}` };
    }

    if (name === "get_products_list") {
      const limit = Number(input.limit) || 15;
      const catFilter = input.category ? String(input.category) : undefined;
      const inStockOnly = Boolean(input.inStockOnly);
      const products = await prisma.product.findMany({
        where: {
          active: true,
          ...(catFilter ? { category: { name: { contains: catFilter, mode: "insensitive" } } } : {}),
          ...(inStockOnly ? { variants: { some: { inStock: true } } } : {}),
        },
        include: {
          category: { select: { name: true } },
          variants: { where: inStockOnly ? { inStock: true } : {}, take: 2 },
        },
        take: limit,
        orderBy: { createdAt: "desc" },
      });
      return products.map(p => ({
        название: p.name,
        категория: p.category.name,
        slug: p.slug,
        варианты: p.variants.map(v => ({
          размер: v.size,
          цена_куб: v.pricePerCube ? Number(v.pricePerCube) : null,
          цена_шт: v.pricePerPiece ? Number(v.pricePerPiece) : null,
          в_наличии: v.inStock,
        })),
      }));
    }

    if (name === "web_search") {
      const query = String(input.query || "");
      const braveKey = process.env.BRAVE_SEARCH_KEY;

      try {
        // Brave Search (если ключ есть)
        if (braveKey) {
          const res = await fetch(
            `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=6&lang=ru&country=ru`,
            { headers: { "X-Subscription-Token": braveKey, "Accept": "application/json" } }
          );
          if (res.ok) {
            const data = await res.json();
            return {
              query, source: "Brave Search",
              results: (data.web?.results || []).slice(0, 6).map((r: any) => ({
                title: r.title, snippet: r.description, url: r.url,
              })),
            };
          }
        }

        // DuckDuckGo — работает без ключа
        const [ddgRes, ddgAbstractRes] = await Promise.all([
          fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`),
          fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query + " site:ru")}&format=json&no_html=1`),
        ]);
        const ddg = await ddgRes.json();

        const results: any[] = [];

        if (ddg.AbstractText) {
          results.push({ title: ddg.Heading || query, snippet: ddg.AbstractText, url: ddg.AbstractURL });
        }

        (ddg.RelatedTopics || []).slice(0, 5).forEach((t: any) => {
          if (t.Text) results.push({ title: t.Text.slice(0, 80), snippet: t.Text, url: t.FirstURL });
        });

        return {
          query, source: "DuckDuckGo",
          results: results.slice(0, 6),
          note: results.length === 0 ? "Ничего не нашёл — попробуй другой запрос" : undefined,
        };

      } catch {
        return { query, error: "Поиск недоступен", note: "Попробуй чуть позже" };
      }
    }

    if (name === "get_staff_list") {
      const staff = await prisma.user.findMany({
        where: { role: { not: "CUSTOMER" } },
        select: { name: true, email: true, role: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      });
      const ROLE_LABELS: Record<string, string> = {
        SUPER_ADMIN: "Владелец", ADMIN: "Администратор", MANAGER: "Менеджер",
        COURIER: "Курьер", ACCOUNTANT: "Бухгалтер", WAREHOUSE: "Кладовщик", SELLER: "Продавец",
      };
      return {
        staff: staff.map(s => ({
          name: s.name || "—",
          role: ROLE_LABELS[s.role] || s.role,
          email: s.email,
          since: s.createdAt.toLocaleDateString("ru-RU"),
        })),
        total: staff.length,
      };
    }

  } catch (err) {
    console.error(`[Tool ${name}]`, err);
    return { error: "Ошибка инструмента" };
  }
  return { error: "Неизвестный инструмент" };
}
