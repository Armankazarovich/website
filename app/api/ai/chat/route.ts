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

    // Загружаем параллельно: память, настройки, профиль клиента
    const [memory, siteSettings, userProfile] = await Promise.all([
      getOrCreateMemory(userId, userId ? null : sessionId).catch((e) => {
        console.error("[Aray] Memory error:", e); return null;
      }),
      getSiteSettings().catch(() => [] as unknown as Awaited<ReturnType<typeof getSiteSettings>>),
      userId ? prisma.user.findUnique({
        where: { id: userId },
        select: {
          name: true, phone: true, email: true, role: true, address: true,
          orders: {
            where: { deletedAt: null },
            orderBy: { createdAt: "desc" },
            take: 10,
            select: {
              orderNumber: true, status: true, totalAmount: true,
              deliveryCost: true, createdAt: true,
              items: { select: { productName: true, quantity: true, price: true } },
            },
          },
        },
      }).catch(() => null) : Promise.resolve(null),
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

    // Контекст навигации и действий (от трекера)
    let trackerContext = "";
    if (context?.zone) {
      trackerContext += `\n\n[Контекст сессии]\nТекущая зона: ${context.zone}`;
      if (context.navHistory?.length) trackerContext += `\nИстория переходов: ${context.navHistory.slice(-5).join(" → ")}`;
      if (context.actions?.length) {
        const recentActions = context.actions.slice(-5).map((a: any) =>
          `${a.type}${a.data?.productName ? ': ' + a.data.productName : ''}${a.data?.query ? ': ' + a.data.query : ''}`
        ).join(", ");
        trackerContext += `\nПоследние действия: ${recentActions}`;
      }
    }

    // Профиль клиента (имя, телефон, заказы)
    let profileContext = "";
    if (userProfile) {
      profileContext += `\n\n[Профиль пользователя]`;
      if (userProfile.name) profileContext += `\nИмя: ${userProfile.name}`;
      if (userProfile.phone) profileContext += `\nТелефон: ${userProfile.phone}`;
      if (userProfile.address) profileContext += `\nАдрес: ${userProfile.address}`;
      if (userProfile.orders?.length) {
        const totalSpent = userProfile.orders.reduce((s: number, o: typeof userProfile.orders[number]) => s + Number(o.totalAmount) + Number(o.deliveryCost), 0);
        profileContext += `\nВсего заказов: ${userProfile.orders.length}, потрачено: ${totalSpent.toLocaleString("ru")} ₽`;
        profileContext += `\nПоследние заказы:`;
        userProfile.orders.slice(0, 5).forEach((o: typeof userProfile.orders[number]) => {
          const items = o.items.map((i: typeof o.items[number]) => `${i.productName} x${i.quantity}`).join(", ");
          profileContext += `\n  #${o.orderNumber} — ${o.status} — ${Number(o.totalAmount).toLocaleString("ru")} ₽ — ${items}`;
        });
        profileContext += `\nОбращайся к пользователю по имени. Учитывай его историю покупок при рекомендациях.`;
      }
    }

    const systemPrompt = basePrompt + memoryContext + trackerContext + profileContext + getBrevityInstruction(tier);

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

    if (name === "navigate_page" || name === "show_page") {
      const url = String(input.url || "/");
      const title = input.title ? String(input.title) : undefined;
      // mode: "popup" — показать в попапе (по умолчанию для show_page и для просмотра)
      // mode: "redirect" — полный переход страницы (только если пользователь явно хочет перейти)
      const mode = input.mode === "redirect" ? "redirect" : (name === "show_page" ? "popup" : (input.mode || "popup"));

      // Всегда открываем в попапе (ArayBrowser) — и внутренние и внешние URL
      if (mode === "popup") {
        return {
          success: true,
          action: `__ARAY_POPUP:${JSON.stringify({ url, title: title || url })}__`,
          message: title ? `Показываю: ${title}` : `Показываю: ${url}`,
        };
      }

      // Полный переход (redirect) — только по явному запросу
      if (url.startsWith("http")) {
        return {
          success: true,
          action: `__ARAY_SHOW_URL:${url}:${title || url}__`,
          message: `Открываю: ${title || url}`,
        };
      }

      return {
        success: true,
        action: `__ARAY_NAVIGATE:${url}__`,
        message: `Перехожу на ${title || url}`,
      };
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ─── СОЗДАНИЕ ТОВАРА ───────────────────────────────────────────────
    // ═══════════════════════════════════════════════════════════════════════

    if (name === "create_product") {
      const productName = String(input.name || "").trim();
      if (!productName) return { error: "Название товара обязательно" };

      // Найти или создать категорию
      const catName = input.categoryName ? String(input.categoryName).trim() : "Без категории";
      let category = await prisma.category.findFirst({
        where: { name: { equals: catName, mode: "insensitive" } },
      });
      if (!category) {
        const slug = catName.toLowerCase().replace(/[^a-zа-яё0-9]/gi, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || `cat-${Date.now()}`;
        category = await prisma.category.create({
          data: { name: catName, slug },
        });
      }

      // Создать slug для товара
      const baseSlug = productName.toLowerCase().replace(/[^a-zа-яё0-9]/gi, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
      let slug = baseSlug || `product-${Date.now()}`;
      const existing = await prisma.product.findUnique({ where: { slug } });
      if (existing) slug = `${baseSlug}-${Date.now().toString(36)}`;

      // Создать товар
      const product = await prisma.product.create({
        data: {
          name: productName,
          slug,
          categoryId: category.id,
          description: input.description ? String(input.description) : null,
          saleUnit: (input.saleUnit as any) || "BOTH",
          featured: Boolean(input.featured),
          active: true,
        },
      });

      // Создать варианты
      const variants = Array.isArray(input.variants) ? input.variants as any[] : [];
      const createdVariants = [];
      for (const v of variants) {
        const variant = await prisma.productVariant.create({
          data: {
            productId: product.id,
            size: String(v.size || "стандарт"),
            pricePerCube: v.pricePerCube ? Number(v.pricePerCube) : null,
            pricePerPiece: v.pricePerPiece ? Number(v.pricePerPiece) : null,
            piecesPerCube: v.piecesPerCube ? Number(v.piecesPerCube) : null,
            stockQty: v.stockQty ? Number(v.stockQty) : null,
            inStock: true,
          },
        });
        createdVariants.push({ id: variant.id, size: variant.size });
      }

      // Если вариантов не передали — создать дефолтный
      if (createdVariants.length === 0) {
        const variant = await prisma.productVariant.create({
          data: { productId: product.id, size: "стандарт", inStock: true },
        });
        createdVariants.push({ id: variant.id, size: variant.size });
      }

      return {
        success: true,
        productId: product.id,
        name: product.name,
        slug: product.slug,
        category: category.name,
        variants: createdVariants,
        message: `Товар "${product.name}" создан в категории "${category.name}" (${createdVariants.length} вариант${createdVariants.length > 1 ? "ов" : ""}) ✅`,
        action: "__ARAY_NAVIGATE:/admin/products__",
      };
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ─── СОЗДАНИЕ КАТЕГОРИИ ────────────────────────────────────────────
    // ═══════════════════════════════════════════════════════════════════════

    if (name === "create_category") {
      const catName = String(input.name || "").trim();
      if (!catName) return { error: "Название категории обязательно" };

      const existing = await prisma.category.findFirst({
        where: { name: { equals: catName, mode: "insensitive" } },
      });
      if (existing) return { error: `Категория "${existing.name}" уже существует`, categoryId: existing.id };

      const slug = catName.toLowerCase().replace(/[^a-zа-яё0-9]/gi, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || `cat-${Date.now()}`;

      let parentId = null;
      if (input.parentName) {
        const parent = await prisma.category.findFirst({
          where: { name: { equals: String(input.parentName), mode: "insensitive" } },
        });
        if (parent) parentId = parent.id;
      }

      const category = await prisma.category.create({
        data: {
          name: catName,
          slug,
          parentId,
          showInMenu: input.showInMenu !== false,
          showInFooter: input.showInFooter !== false,
        },
      });

      return {
        success: true,
        categoryId: category.id,
        name: category.name,
        slug: category.slug,
        message: `Категория "${category.name}" создана ✅`,
      };
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ─── СКЛАД: ПРИХОД / РАСХОД / ИНВЕНТАРИЗАЦИЯ ───────────────────────
    // ═══════════════════════════════════════════════════════════════════════

    if (name === "update_stock") {
      const operation = String(input.operation || "add");
      const quantity = Number(input.quantity) || 0;
      if (quantity <= 0) return { error: "Количество должно быть больше 0" };

      let variantId = input.variantId ? String(input.variantId) : null;

      // Если нет variantId — ищем по тексту
      if (!variantId && input.productQuery) {
        const query = String(input.productQuery);
        const variant = await prisma.productVariant.findFirst({
          where: {
            product: {
              active: true,
              OR: [
                { name: { contains: query, mode: "insensitive" } },
                { variants: { some: { size: { contains: query, mode: "insensitive" } } } },
              ],
            },
          },
          include: { product: { select: { name: true } } },
          orderBy: { product: { name: "asc" } },
        });
        if (!variant) return { error: `Товар "${query}" не найден. Попробуй get_products_list для поиска.` };
        variantId = variant.id;
      }

      if (!variantId) return { error: "Укажи variantId или productQuery для поиска товара" };

      const variant = await prisma.productVariant.findUnique({
        where: { id: variantId },
        include: { product: { select: { name: true } } },
      });
      if (!variant) return { error: "Вариант не найден" };

      const currentQty = variant.stockQty || 0;
      let newQty = currentQty;

      // Конвертация кубов в штуки если нужно
      let actualPieces = quantity;
      if (input.unit === "cubes" && variant.piecesPerCube) {
        actualPieces = Math.round(quantity * variant.piecesPerCube);
      }

      if (operation === "add") newQty = currentQty + actualPieces;
      else if (operation === "subtract") newQty = Math.max(0, currentQty - actualPieces);
      else if (operation === "set") newQty = actualPieces;

      await prisma.productVariant.update({
        where: { id: variantId },
        data: { stockQty: newQty, inStock: newQty > 0 },
      });

      const opLabel = operation === "add" ? "Приход" : operation === "subtract" ? "Расход" : "Установлено";
      const unitLabel = input.unit === "cubes" ? "м³" : "шт";

      return {
        success: true,
        product: variant.product.name,
        size: variant.size,
        operation: opLabel,
        quantity: quantity,
        unit: unitLabel,
        previousQty: currentQty,
        newQty,
        reason: input.reason ? String(input.reason) : undefined,
        message: `${opLabel}: ${variant.product.name} (${variant.size}) — ${quantity} ${unitLabel}. Было: ${currentQty} → Стало: ${newQty} шт ✅`,
      };
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ─── ОСТАТКИ НА СКЛАДЕ ─────────────────────────────────────────────
    // ═══════════════════════════════════════════════════════════════════════

    if (name === "get_stock_summary") {
      const where: any = { product: { active: true } };
      if (input.query) {
        where.OR = [
          { product: { name: { contains: String(input.query), mode: "insensitive" } } },
          { size: { contains: String(input.query), mode: "insensitive" } },
        ];
        delete where.product;
        where.product = { active: true };
      }
      if (input.categoryName) {
        where.product = { ...where.product, category: { name: { contains: String(input.categoryName), mode: "insensitive" } } };
      }

      const variants = await prisma.productVariant.findMany({
        where,
        include: {
          product: { select: { name: true, category: { select: { name: true } } } },
        },
        orderBy: { product: { name: "asc" } },
        take: 30,
      });

      let items = variants.map(v => ({
        товар: v.product.name,
        размер: v.size,
        категория: v.product.category.name,
        остаток_шт: v.stockQty ?? 0,
        остаток_м3: v.piecesPerCube && v.stockQty ? Math.round((v.stockQty / v.piecesPerCube) * 100) / 100 : null,
        в_наличии: v.inStock,
        variantId: v.id,
      }));

      if (input.lowStockOnly) {
        items = items.filter(i => i.остаток_шт < 10);
      }

      const totalItems = items.length;
      const outOfStock = items.filter(i => !i.в_наличии).length;
      const lowStock = items.filter(i => i.остаток_шт > 0 && i.остаток_шт < 10).length;

      return {
        items,
        summary: { всего: totalItems, нет_в_наличии: outOfStock, мало_на_складе: lowStock },
        message: `Склад: ${totalItems} позиций, ${outOfStock} нет в наличии, ${lowStock} заканчиваются`,
      };
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ─── ИМПОРТ ПРАЙС-ЛИСТА ───────────────────────────────────────────
    // ═══════════════════════════════════════════════════════════════════════

    if (name === "import_price_list") {
      const text = String(input.text || "").trim();
      if (!text) return { error: "Текст прайс-листа пустой" };
      const dryRun = Boolean(input.dryRun);
      const defaultCategory = input.categoryName ? String(input.categoryName) : "Импорт";

      // Парсим строки: ищем паттерны "название — размер — цена"
      const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 3);
      const parsed: { name: string; size: string; price: number; unit: string }[] = [];

      for (const line of lines) {
        // Паттерн: "Доска 50x150x6000 - 9500 руб/м³"
        const priceMatch = line.match(/(\d[\d\s,.]*)\s*(?:руб|₽|р\.?)/i);
        const sizeMatch = line.match(/(\d{2,3})\s*[xх×]\s*(\d{2,3})(?:\s*[xх×]\s*(\d{3,5}))?/i);
        const cubePriceMatch = line.match(/(?:куб|м³|m3)/i);

        if (priceMatch) {
          const price = parseFloat(priceMatch[1].replace(/\s/g, "").replace(",", "."));
          const size = sizeMatch ? `${sizeMatch[1]}x${sizeMatch[2]}${sizeMatch[3] ? "x" + sizeMatch[3] : ""}` : "стандарт";
          const cleanName = line
            .replace(priceMatch[0], "")
            .replace(sizeMatch?.[0] || "", "")
            .replace(/[-—–:;,.|]+/g, " ")
            .replace(/\s{2,}/g, " ")
            .trim() || `Товар ${size}`;

          parsed.push({
            name: cleanName,
            size,
            price,
            unit: cubePriceMatch ? "cube" : "piece",
          });
        }
      }

      if (parsed.length === 0) {
        return { error: "Не удалось распознать товары. Попробуй формат: 'Доска 50x150x6000 9500 руб/м³'" };
      }

      if (dryRun) {
        return {
          dryRun: true,
          parsed,
          count: parsed.length,
          message: `Распознано ${parsed.length} товаров. Отправь ещё раз с dryRun=false чтобы создать.`,
        };
      }

      // Создаём товары
      let category = await prisma.category.findFirst({
        where: { name: { equals: defaultCategory, mode: "insensitive" } },
      });
      if (!category) {
        const slug = defaultCategory.toLowerCase().replace(/[^a-zа-яё0-9]/gi, "-").replace(/-+/g, "-") || `import-${Date.now()}`;
        category = await prisma.category.create({ data: { name: defaultCategory, slug } });
      }

      let created = 0;
      for (const item of parsed) {
        const slug = `${item.name}-${item.size}`.toLowerCase().replace(/[^a-zа-яё0-9]/gi, "-").replace(/-+/g, "-") + `-${Date.now().toString(36)}`;
        await prisma.product.create({
          data: {
            name: item.name,
            slug,
            categoryId: category.id,
            saleUnit: item.unit === "cube" ? "CUBE" : "BOTH",
            active: true,
            variants: {
              create: [{
                size: item.size,
                pricePerCube: item.unit === "cube" ? item.price : null,
                pricePerPiece: item.unit === "piece" ? item.price : null,
                inStock: true,
              }],
            },
          },
        });
        created++;
      }

      return {
        success: true,
        created,
        category: category.name,
        items: parsed.map(p => `${p.name} (${p.size}) — ${p.price} ₽/${p.unit === "cube" ? "м³" : "шт"}`),
        message: `Импортировано ${created} товаров в категорию "${category.name}" ✅`,
        action: "__ARAY_NAVIGATE:/admin/products__",
      };
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ─── ОТЧЁТЫ ────────────────────────────────────────────────────────
    // ═══════════════════════════════════════════════════════════════════════

    if (name === "generate_report") {
      const reportType = String(input.type || "sales");
      const period = String(input.period || "week");
      const format = String(input.format || "text");

      const now = new Date();
      const periodStart = new Date(now);
      if (period === "today") periodStart.setHours(0, 0, 0, 0);
      else if (period === "week") periodStart.setDate(now.getDate() - 7);
      else if (period === "month") periodStart.setMonth(now.getMonth() - 1);
      else if (period === "quarter") periodStart.setMonth(now.getMonth() - 3);
      else if (period === "year") periodStart.setFullYear(now.getFullYear() - 1);

      const PERIOD_LABELS: Record<string, string> = { today: "за сегодня", week: "за неделю", month: "за месяц", quarter: "за квартал", year: "за год" };

      let reportData: any = {};

      if (reportType === "sales" || reportType === "orders") {
        const orders = await prisma.order.findMany({
          where: { createdAt: { gte: periodStart }, deletedAt: null, status: { not: "CANCELLED" } },
          include: { items: { select: { productName: true, quantity: true, price: true } } },
          orderBy: { createdAt: "desc" },
        });
        const revenue = orders.reduce((s, o) => s + Number(o.totalAmount) + Number(o.deliveryCost), 0);
        const avgCheck = orders.length > 0 ? Math.round(revenue / orders.length) : 0;

        // Топ товаров
        const productMap = new Map<string, { qty: number; revenue: number }>();
        orders.forEach(o => o.items.forEach(i => {
          const key = i.productName;
          const prev = productMap.get(key) || { qty: 0, revenue: 0 };
          productMap.set(key, { qty: prev.qty + Number(i.quantity), revenue: prev.revenue + Number(i.price || 0) * Number(i.quantity) });
        }));
        const topProducts = [...productMap.entries()]
          .sort((a, b) => b[1].revenue - a[1].revenue)
          .slice(0, 5)
          .map(([name, data]) => ({ name, qty: data.qty, revenue: data.revenue }));

        reportData = {
          тип: "Продажи",
          период: PERIOD_LABELS[period],
          заказов: orders.length,
          выручка: revenue,
          средний_чек: avgCheck,
          топ_товаров: topProducts,
        };
      }

      if (reportType === "stock") {
        const variants = await prisma.productVariant.findMany({
          where: { product: { active: true } },
          include: { product: { select: { name: true, category: { select: { name: true } } } } },
          orderBy: { stockQty: "asc" },
          take: 30,
        });

        const outOfStock = variants.filter(v => !v.inStock || (v.stockQty !== null && v.stockQty <= 0));
        const lowStock = variants.filter(v => v.stockQty !== null && v.stockQty > 0 && v.stockQty < 10);

        reportData = {
          тип: "Склад",
          всего_позиций: variants.length,
          нет_в_наличии: outOfStock.map(v => `${v.product.name} (${v.size})`),
          заканчиваются: lowStock.map(v => `${v.product.name} (${v.size}) — ${v.stockQty} шт`),
        };
      }

      if (reportType === "clients") {
        const clients = await prisma.order.groupBy({
          by: ["guestPhone"],
          _count: { _all: true },
          _sum: { totalAmount: true },
          _max: { guestName: true },
          where: { deletedAt: null, createdAt: { gte: periodStart } },
          orderBy: { _sum: { totalAmount: "desc" } },
          take: 10,
        });

        reportData = {
          тип: "Клиенты",
          период: PERIOD_LABELS[period],
          топ_клиентов: clients.map(c => ({
            имя: c._max.guestName,
            телефон: c.guestPhone,
            заказов: c._count._all,
            сумма: Number(c._sum.totalAmount || 0),
          })),
        };
      }

      // Отправка на почту
      if (format === "email") {
        const email = input.email ? String(input.email) : undefined;
        if (!email) {
          // Найти email текущего пользователя
          if (userId) {
            const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
            if (user?.email) {
              const nodemailer = await import("nodemailer");
              const transport = nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: Number(process.env.SMTP_PORT) || 465,
                secure: true,
                auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
              });
              await transport.sendMail({
                from: process.env.SMTP_USER,
                to: user.email,
                subject: `Отчёт: ${reportData.тип} ${PERIOD_LABELS[period] || ""}`,
                text: JSON.stringify(reportData, null, 2),
                html: `<pre style="font-family:monospace;font-size:13px">${JSON.stringify(reportData, null, 2)}</pre>`,
              });
              return { ...reportData, emailSent: true, sentTo: user.email, message: `Отчёт отправлен на ${user.email} ✅` };
            }
          }
          return { ...reportData, emailSent: false, message: "Email не найден. Укажи email явно." };
        }
      }

      return { ...reportData, format: "text", message: "Отчёт готов" };
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ─── НАСТРОЙКИ САЙТА ───────────────────────────────────────────────
    // ═══════════════════════════════════════════════════════════════════════

    if (name === "manage_settings") {
      const action = String(input.action || "get");

      if (action === "get") {
        const key = input.key ? String(input.key) : undefined;
        if (key) {
          const setting = await prisma.siteSettings.findFirst({ where: { key } });
          return setting ? { key: setting.key, value: setting.value } : { error: `Настройка "${key}" не найдена` };
        }
        // Все настройки
        const all = await prisma.siteSettings.findMany();
        return {
          settings: all.map(s => ({ key: s.key, value: s.value })),
          count: all.length,
        };
      }

      if (action === "set") {
        const key = input.key ? String(input.key) : null;
        const value = input.value ? String(input.value) : null;
        if (!key || !value) return { error: "Укажи key и value" };

        // Безопасный upsert (try create, catch update)
        try {
          await prisma.siteSettings.create({ data: { id: key, key, value } });
        } catch {
          await prisma.siteSettings.update({ where: { key }, data: { value } });
        }

        return {
          success: true,
          key,
          value,
          message: `Настройка "${key}" = "${value}" сохранена ✅`,
        };
      }

      return { error: "action должен быть get или set" };
    }

  } catch (err) {
    console.error(`[Tool ${name}]`, err);
    return { error: "Ошибка инструмента" };
  }
  return { error: "Неизвестный инструмент" };
}
