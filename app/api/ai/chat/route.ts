export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSiteSettings, getSetting } from "@/lib/site-settings";
import { buildAraySystemPrompt, ArayRole, ARAY_TOOLS, getToolsForRole, calculateProjectMaterials } from "@/lib/aray-agent";
import {
  getOrCreateMemory,
  formatMemoryForPrompt,
  extractAndUpdateMemory,
  updateCustomerLevel,
} from "@/lib/aray-memory";
import { classifyQuery, getModelConfig, getBrevityInstruction, estimateCost } from "@/lib/aray-router";

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
    const userId = session?.user?.id;
    const sessionRole = session?.user?.role;
    const sessionName = session?.user?.name ?? undefined;

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
    // ── Сообщения ────────────────────────────────────────────────────────────
    type ChatMessage = { role: "user" | "assistant"; content: string };
    const rawMessages: ChatMessage[] = messages.slice(-20).map((m: any) => ({
      role: m.role as "user" | "assistant", content: m.content,
    }));
    const firstUserIdx = rawMessages.findIndex(m => m.role === "user");
    const formattedMessages: ChatMessage[] = firstUserIdx >= 0 ? rawMessages.slice(firstUserIdx) : rawMessages;

    // ── Умная маршрутизация модели ──────────────────────────────────────────
    const lastUserMessage = formattedMessages.filter(m => m.role === "user").pop()?.content || "";
    const hasTools = arayRole !== "customer" || !!context?.productName;
    const tier = classifyQuery(lastUserMessage, { role: arayRole, hasTools, messageCount: formattedMessages.length });
    const modelConfig = getModelConfig(tier);
    const systemPrompt = basePrompt + memoryContext + getBrevityInstruction(tier);

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
        // Инструменты отфильтрованы по роли пользователя
        const roleTools = getToolsForRole(arayRole, sessionRole || undefined);

        const firstStream = anthropic.messages.stream({
          model: modelConfig.model,
          max_tokens: modelConfig.maxTokens,
          system: systemPrompt,
          messages: formattedMessages,
          tools: roleTools as any,
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
              content: JSON.stringify(await handleTool(block.name, block.input, userId || undefined)),
            }))
          );

          const followStream = anthropic.messages.stream({
            model: modelConfig.model,
            max_tokens: modelConfig.maxTokens,
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

        // ── Логирование токенов в фоне ──────────────────────────────────────
        const inputTokensEst = Math.ceil(systemPrompt.length / 4) + formattedMessages.reduce((s, m) => s + Math.ceil(m.content.length / 4), 0);
        const outputTokensEst = Math.ceil(fullText.length / 4);
        const costEst = estimateCost(tier, inputTokensEst, outputTokensEst);
        (prisma as any).arayTokenLog?.create({
          data: {
            userId: userId || null,
            sessionId: sessionId || null,
            model: modelConfig.model,
            tier,
            inputTokens: inputTokensEst,
            outputTokens: outputTokensEst,
            costUsd: costEst,
            feature: "chat",
          },
        }).catch((err: unknown) => console.error("[ArayTokenLog]", err));

        // Мета-данные в конце
        await writer.write(encoder.encode(
          `\n__ARAY_META__${JSON.stringify({ role: arayRole, model: tier, memoryId: memory?.id })}`
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

async function handleTool(name: string, input: Record<string, unknown>, userId?: string): Promise<unknown> {
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
        id: p.id,
        название: p.name,
        категория: p.category.name,
        slug: p.slug,
        варианты: p.variants.map(v => ({
          variantId: v.id,
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
        where: { role: { not: "USER" as any } },
        select: { id: true, name: true, email: true, role: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      });
      const ROLE_LABELS: Record<string, string> = {
        SUPER_ADMIN: "Владелец", ADMIN: "Администратор", MANAGER: "Менеджер",
        COURIER: "Курьер", ACCOUNTANT: "Бухгалтер", WAREHOUSE: "Кладовщик", SELLER: "Продавец",
      };
      return {
        staff: staff.map(s => ({
          id: s.id,
          name: s.name || "—",
          role: ROLE_LABELS[s.role] || s.role,
          email: s.email,
          since: s.createdAt.toLocaleDateString("ru-RU"),
        })),
        total: staff.length,
      };
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ─── ЗАДАЧИ ─────────────────────────────────────────────────────────
    // ═══════════════════════════════════════════════════════════════════════

    if (name === "create_task") {
      const title = String(input.title || "").trim();
      if (!title) return { error: "Название задачи обязательно" };

      const task = await prisma.task.create({
        data: {
          title,
          description: input.description ? String(input.description) : null,
          priority: (input.priority as any) || "MEDIUM",
          status: "TODO",
          assigneeId: input.assigneeId ? String(input.assigneeId) : null,
          createdById: userId || null,
          dueDate: input.dueDate ? new Date(String(input.dueDate)) : null,
          tags: Array.isArray(input.tags) ? input.tags.map(String) : [],
        },
        include: {
          assignee: { select: { name: true } },
        },
      });

      return {
        success: true,
        taskId: task.id,
        title: task.title,
        assignee: task.assignee?.name || "Без исполнителя",
        priority: task.priority,
        status: task.status,
        dueDate: task.dueDate?.toLocaleDateString("ru-RU") || null,
        message: `Задача "${task.title}" создана${task.assignee ? ` → ${task.assignee.name}` : ""}`,
        action: "__ARAY_NAVIGATE:/admin/tasks__",
      };
    }

    if (name === "get_tasks_list") {
      const limit = Number(input.limit) || 15;
      const where: any = {};
      if (input.status) where.status = String(input.status);
      if (input.assigneeId) where.assigneeId = String(input.assigneeId);

      const tasks = await prisma.task.findMany({
        where,
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
        take: limit,
        include: {
          assignee: { select: { name: true } },
          createdBy: { select: { name: true } },
        },
      });

      const PRIORITY_LABELS: Record<string, string> = { LOW: "Низкий", MEDIUM: "Средний", HIGH: "Высокий", URGENT: "🔥 Срочный" };
      const STATUS_LABELS: Record<string, string> = { BACKLOG: "Бэклог", TODO: "К выполнению", IN_PROGRESS: "В работе", REVIEW: "На проверке", DONE: "Готово" };

      return {
        tasks: tasks.map(t => ({
          id: t.id,
          название: t.title,
          описание: t.description,
          статус: STATUS_LABELS[t.status] || t.status,
          приоритет: PRIORITY_LABELS[t.priority] || t.priority,
          исполнитель: t.assignee?.name || "—",
          создал: t.createdBy?.name || "—",
          срок: t.dueDate?.toLocaleDateString("ru-RU") || null,
          создана: t.createdAt.toLocaleDateString("ru-RU"),
          теги: t.tags,
        })),
        total: tasks.length,
      };
    }

    if (name === "update_task") {
      const taskId = String(input.taskId);
      const task = await prisma.task.findUnique({ where: { id: taskId } });
      if (!task) return { error: "Задача не найдена" };

      const data: any = {};
      if (input.status) data.status = String(input.status);
      if (input.priority) data.priority = String(input.priority);
      if (input.assigneeId) data.assigneeId = String(input.assigneeId);
      if (input.title) data.title = String(input.title);
      if (input.dueDate) data.dueDate = new Date(String(input.dueDate));
      if (input.status === "DONE") data.completedAt = new Date();

      const updated = await prisma.task.update({
        where: { id: taskId },
        data,
        include: { assignee: { select: { name: true } } },
      });

      return {
        success: true,
        taskId: updated.id,
        title: updated.title,
        status: updated.status,
        assignee: updated.assignee?.name || "—",
        message: `Задача "${updated.title}" обновлена`,
      };
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ─── ТОВАРЫ: ЦЕНА И АКТИВНОСТЬ ─────────────────────────────────────
    // ═══════════════════════════════════════════════════════════════════════

    if (name === "update_product_price") {
      const variantId = String(input.variantId);
      const variant = await prisma.productVariant.findUnique({
        where: { id: variantId },
        include: { product: { select: { name: true } } },
      });
      if (!variant) return { error: "Вариант товара не найден" };

      const data: any = {};
      if (input.pricePerCube !== undefined) data.pricePerCube = Number(input.pricePerCube);
      if (input.pricePerPiece !== undefined) data.pricePerPiece = Number(input.pricePerPiece);
      if (input.inStock !== undefined) data.inStock = Boolean(input.inStock);

      await prisma.productVariant.update({ where: { id: variantId }, data });

      return {
        success: true,
        product: variant.product.name,
        size: variant.size,
        newPricePerCube: data.pricePerCube ?? (variant.pricePerCube ? Number(variant.pricePerCube) : null),
        newPricePerPiece: data.pricePerPiece ?? (variant.pricePerPiece ? Number(variant.pricePerPiece) : null),
        inStock: data.inStock ?? variant.inStock,
        message: `Цена "${variant.product.name}" (${variant.size}) обновлена ✅`,
      };
    }

    if (name === "toggle_product_active") {
      const productId = String(input.productId);
      const active = Boolean(input.active);
      const product = await prisma.product.findUnique({ where: { id: productId } });
      if (!product) return { error: "Товар не найден" };

      await prisma.product.update({ where: { id: productId }, data: { active } });

      return {
        success: true,
        product: product.name,
        active,
        message: active ? `"${product.name}" теперь виден на сайте ✅` : `"${product.name}" скрыт с сайта`,
      };
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ─── PUSH-УВЕДОМЛЕНИЯ ──────────────────────────────────────────────
    // ═══════════════════════════════════════════════════════════════════════

    if (name === "send_push_notification") {
      const title = String(input.title || "").trim();
      const body = String(input.body || "").trim();
      if (!title || !body) return { error: "Заголовок и текст обязательны" };

      const segment = String(input.segment || "all");
      const url = input.url ? String(input.url) : "/";

      // Получаем подписки по сегменту
      let where: any = {};
      if (segment === "registered") where.userId = { not: null };
      else if (segment === "guests") where.userId = null;

      const subs = await prisma.pushSubscription.findMany({ where });

      let sent = 0;
      let errors = 0;

      // Динамический импорт web-push
      const webpush = await import("web-push");
      webpush.setVapidDetails(
        "mailto:info@pilo-rus.ru",
        process.env.VAPID_PUBLIC_KEY || "",
        process.env.VAPID_PRIVATE_KEY || ""
      );

      const payload = JSON.stringify({ title, body, url, icon: "/icons/icon-192.png" });

      await Promise.allSettled(
        subs.map(async (sub) => {
          try {
            await webpush.sendNotification(
              { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
              payload
            );
            sent++;
          } catch (err: any) {
            errors++;
            // Удаляем мёртвые подписки
            if (err?.statusCode === 410 || err?.statusCode === 404) {
              await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
            }
          }
        })
      );

      return {
        success: true,
        sent,
        errors,
        segment,
        message: `Push отправлен: ${sent} получателей${errors > 0 ? `, ${errors} ошибок` : ""} ✅`,
      };
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ─── CRM: ЛИДЫ ────────────────────────────────────────────────────
    // ═══════════════════════════════════════════════════════════════════════

    if (name === "create_lead") {
      const leadName = String(input.name || "").trim();
      if (!leadName) return { error: "Имя клиента обязательно" };

      const lead = await prisma.lead.create({
        data: {
          name: leadName,
          phone: input.phone ? String(input.phone) : null,
          email: input.email ? String(input.email) : null,
          company: input.company ? String(input.company) : null,
          comment: input.comment ? String(input.comment) : null,
          source: (input.source as any) || "PHONE",
          value: input.value ? Number(input.value) : null,
          stage: "NEW",
          assigneeId: userId || null,
        },
      });

      return {
        success: true,
        leadId: lead.id,
        name: lead.name,
        phone: lead.phone,
        message: `Лид "${lead.name}" создан в CRM ✅`,
        action: "__ARAY_NAVIGATE:/admin/crm__",
      };
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ─── НАВИГАЦИЯ ─────────────────────────────────────────────────────
    // ═══════════════════════════════════════════════════════════════════════

    if (name === "admin_navigate") {
      const path = String(input.path || "/admin");
      return {
        success: true,
        path,
        action: `__ARAY_NAVIGATE:${path}__`,
        message: `Открываю ${path}`,
      };
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ─── КЛИЕНТСКИЕ ДЕЙСТВИЯ (add_to_cart, navigate_page) ──────────────
    // ═══════════════════════════════════════════════════════════════════════

    if (name === "add_to_cart") {
      const variantId = String(input.variantId);
      const quantity = Number(input.quantity) || 1;
      const unit = String(input.unit || "piece");

      // Проверяем что вариант существует
      const variant = await prisma.productVariant.findUnique({
        where: { id: variantId },
        include: { product: { select: { name: true, slug: true } } },
      });
      if (!variant) return { error: "Товар не найден" };
      if (!variant.inStock) return { error: `"${variant.product.name}" (${variant.size}) нет в наличии` };

      const price = unit === "cube" && variant.pricePerCube
        ? Number(variant.pricePerCube) * quantity
        : variant.pricePerPiece
        ? Number(variant.pricePerPiece) * quantity
        : 0;

      return {
        success: true,
        action: `__ARAY_ADD_CART:${JSON.stringify({ variantId, quantity, unit })}__`,
        product: variant.product.name,
        size: variant.size,
        quantity,
        unit: unit === "cube" ? "м³" : "шт",
        totalPrice: price,
        message: `${variant.product.name} (${variant.size}) × ${quantity} ${unit === "cube" ? "м³" : "шт"} добавлен в корзину 🛒`,
      };
    }

    if (name === "navigate_page") {
      const url = String(input.url || "/");
      const title = input.title ? String(input.title) : undefined;

      // Внешний URL → показать в iframe/новом окне
      if (url.startsWith("http")) {
        return {
          success: true,
          action: `__ARAY_SHOW_URL:${url}:${title || url}__`,
          message: `Открываю: ${title || url}`,
        };
      }

      // Внутренняя навигация
      return {
        success: true,
        action: `__ARAY_NAVIGATE:${url}__`,
        message: `Открываю ${title || url}`,
      };
    }

  } catch (err) {
    console.error(`[Tool ${name}]`, err);
    return { error: "Ошибка инструмента" };
  }
  return { error: "Неизвестный инструмент" };
}
