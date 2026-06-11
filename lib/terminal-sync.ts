import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentTenantId } from "@/lib/tenant-context";

export const TERMINAL_INTEGRATION_BLUEPRINTS = [
  {
    name: "Заказы сайта и терминала",
    type: "orders",
    provider: "internal_orders",
    status: "ACTIVE",
    trustLevel: "INTERNAL",
    direction: "BIDIRECTIONAL",
    mode: "AUTO",
    capabilities: ["order.created", "order.updated", "order.status_changed"],
  },
  {
    name: "CRM и клиенты",
    type: "crm",
    provider: "internal_crm",
    status: "ACTIVE",
    trustLevel: "INTERNAL",
    direction: "BIDIRECTIONAL",
    mode: "AUTO",
    capabilities: ["lead.sync", "customer.lookup", "repeat_order"],
  },
  {
    name: "Товары, услуги и меню",
    type: "catalog",
    provider: "internal_catalog",
    status: "ACTIVE",
    trustLevel: "INTERNAL",
    direction: "INBOUND",
    mode: "AUTO",
    capabilities: ["product.index", "price.index", "variant.index"],
  },
  {
    name: "Поисковый индекс терминала",
    type: "search",
    provider: "terminal_search",
    status: "ACTIVE",
    trustLevel: "INTERNAL",
    direction: "INBOUND",
    mode: "AUTO",
    capabilities: ["fast_search", "barcode_lookup", "aray_context"],
  },
  {
    name: "Push-уведомления",
    type: "notifications",
    provider: "web_push",
    status: "ACTIVE",
    trustLevel: "INTERNAL",
    direction: "OUTBOUND",
    mode: "AUTO",
    capabilities: ["staff_alerts", "client_status", "qr_requested"],
  },
  {
    name: "Telegram для команды",
    type: "notifications",
    provider: "telegram_staff",
    status: "ACTIVE",
    trustLevel: "INTERNAL",
    direction: "OUTBOUND",
    mode: "AUTO",
    capabilities: ["order_alerts", "status_updates", "incident_alerts"],
  },
  {
    name: "QR и платёжная ссылка",
    type: "payments",
    provider: "payment_qr_provider",
    status: "NEEDS_PROVIDER",
    trustLevel: "PLANNED",
    direction: "BIDIRECTIONAL",
    mode: "WEBHOOK",
    capabilities: ["qr.create", "payment.link", "payment.webhook", "refund.request"],
  },
  {
    name: "Эквайринг карты",
    type: "payments",
    provider: "card_acquiring",
    status: "NEEDS_PROVIDER",
    trustLevel: "PLANNED",
    direction: "BIDIRECTIONAL",
    mode: "WEBHOOK",
    capabilities: ["card.payment", "preauth", "refund", "reconciliation"],
  },
  {
    name: "Фискализация и ОФД",
    type: "fiscal",
    provider: "fiscal_provider",
    status: "NEEDS_PROVIDER",
    trustLevel: "PLANNED",
    direction: "BIDIRECTIONAL",
    mode: "WEBHOOK",
    capabilities: ["receipt.register", "receipt.status", "receipt.cancel"],
  },
  {
    name: "Принтеры и локальный коннектор",
    type: "printing",
    provider: "printer_connector",
    status: "NEEDS_CONNECTOR",
    trustLevel: "PLANNED",
    direction: "OUTBOUND",
    mode: "CONNECTOR",
    capabilities: ["receipt.print", "kitchen.print", "production.print", "retry"],
  },
  {
    name: "USB-HID сканеры",
    type: "scanning",
    provider: "usb_hid",
    status: "VENDOR_READY",
    trustLevel: "VENDOR_READY",
    direction: "INBOUND",
    mode: "BROWSER_INPUT",
    capabilities: ["barcode.input", "qr.input", "inventory.scan"],
  },
  {
    name: "Склад и остатки",
    type: "inventory",
    provider: "internal_stock",
    status: "ACTIVE",
    trustLevel: "INTERNAL",
    direction: "BIDIRECTIONAL",
    mode: "AUTO",
    capabilities: ["stock.reserve", "stock.release", "low_stock_alert"],
  },
  {
    name: "Доставка и самовывоз",
    type: "delivery",
    provider: "delivery_provider",
    status: "PLANNED",
    trustLevel: "PLANNED",
    direction: "BIDIRECTIONAL",
    mode: "API",
    capabilities: ["delivery.rate", "pickup.slot", "courier.task"],
  },
  {
    name: "Бухгалтерия и экспорт",
    type: "accounting",
    provider: "accounting_export",
    status: "PLANNED",
    trustLevel: "PLANNED",
    direction: "OUTBOUND",
    mode: "EXPORT",
    capabilities: ["invoice.export", "shift.report", "payment.reconcile"],
  },
  {
    name: "Арай-оператор",
    type: "ai",
    provider: "aray_operator",
    status: "ACTIVE",
    trustLevel: "INTERNAL",
    direction: "BIDIRECTIONAL",
    mode: "CONFIRMATION_REQUIRED",
    capabilities: ["diagnostics", "setup_wizard", "incident.create", "action.prepare"],
  },
] as const;

type SyncJobInput = {
  tenantId?: string;
  channel: string;
  event: string;
  entityType: string;
  entityId?: string | null;
  direction?: string;
  priority?: number;
  payload?: Record<string, unknown>;
  connectorId?: string | null;
  idempotencyKey?: string | null;
};

type IndexInput = {
  tenantId?: string;
  entityType: string;
  entityId: string;
  title: string;
  subtitle?: string | null;
  profile?: string | null;
  keywords: unknown[];
  barcode?: string | null;
  phoneTail?: string | null;
  payload?: Record<string, unknown>;
  sourceUpdatedAt?: Date | null;
};

function normalizeKeywords(parts: Array<unknown>) {
  return parts
    .flatMap((part) => String(part ?? "").toLowerCase().split(/\s+/))
    .map((part) => part.replace(/[^\p{L}\p{N}@+._-]+/gu, ""))
    .filter(Boolean)
    .join(" ");
}

function phoneTail(value?: string | null) {
  const digits = String(value ?? "").replace(/\D/g, "");
  return digits ? digits.slice(-10) : null;
}

export async function ensureTerminalDefaultConnectors(tenantId = getCurrentTenantId()) {
  const connectors = await Promise.all(
    TERMINAL_INTEGRATION_BLUEPRINTS.map((connector) =>
      prisma.terminalConnector.upsert({
        where: {
          tenantId_type_provider: {
            tenantId,
            type: connector.type,
            provider: connector.provider,
          },
        },
        update: {
          name: connector.name,
          status: connector.status,
          trustLevel: connector.trustLevel,
          direction: connector.direction,
          mode: connector.mode,
          capabilities: [...connector.capabilities],
        },
        create: {
          tenantId,
          name: connector.name,
          type: connector.type,
          provider: connector.provider,
          status: connector.status,
          trustLevel: connector.trustLevel,
          direction: connector.direction,
          mode: connector.mode,
          capabilities: [...connector.capabilities],
        },
      })
    )
  );

  return connectors;
}

export async function enqueueTerminalSyncJob(input: SyncJobInput) {
  const payload = (input.payload ?? {}) as Prisma.InputJsonObject;
  const tenantId = input.tenantId ?? getCurrentTenantId();
  const data = {
    tenantId,
    connectorId: input.connectorId ?? null,
    channel: input.channel,
    event: input.event,
    entityType: input.entityType,
    entityId: input.entityId ?? null,
    direction: input.direction ?? "OUTBOUND",
    priority: input.priority ?? 5,
    payload,
    idempotencyKey: input.idempotencyKey ?? null,
  };

  if (input.idempotencyKey) {
    return prisma.terminalSyncJob.upsert({
      where: { idempotencyKey: input.idempotencyKey },
      update: {
        status: "QUEUED",
        attempts: 0,
        lastError: null,
        payload: data.payload,
        scheduledAt: new Date(),
      },
      create: data,
    });
  }

  return prisma.terminalSyncJob.create({ data });
}

export async function upsertTerminalSearchIndex(input: IndexInput) {
  const keywords = normalizeKeywords([input.title, input.subtitle, input.profile, ...input.keywords]);
  const payload = (input.payload ?? {}) as Prisma.InputJsonObject;
  const tenantId = input.tenantId ?? getCurrentTenantId();
  return prisma.terminalSearchIndex.upsert({
    where: {
      tenantId_entityType_entityId: {
        tenantId,
        entityType: input.entityType,
        entityId: input.entityId,
      },
    },
    update: {
      profile: input.profile ?? null,
      title: input.title,
      subtitle: input.subtitle ?? null,
      keywords,
      barcode: input.barcode ?? null,
      phoneTail: input.phoneTail ?? null,
      payload,
      sourceUpdatedAt: input.sourceUpdatedAt ?? null,
      indexedAt: new Date(),
      stale: false,
    },
    create: {
      tenantId,
      entityType: input.entityType,
      entityId: input.entityId,
      profile: input.profile ?? null,
      title: input.title,
      subtitle: input.subtitle ?? null,
      keywords,
      barcode: input.barcode ?? null,
      phoneTail: input.phoneTail ?? null,
      payload,
      sourceUpdatedAt: input.sourceUpdatedAt ?? null,
    },
  });
}

export async function indexTerminalOrder(order: {
  tenantId?: string | null;
  id: string;
  orderNumber: number;
  guestName?: string | null;
  guestPhone?: string | null;
  guestEmail?: string | null;
  deliveryAddress?: string | null;
  fulfillmentDetail?: string | null;
  terminalProfile?: string | null;
  status?: string | null;
  paymentStatus?: string | null;
  totalAmount?: unknown;
  updatedAt?: Date | null;
}) {
  const tenantId = order.tenantId ?? getCurrentTenantId();
  return upsertTerminalSearchIndex({
    tenantId,
    entityType: "order",
    entityId: order.id,
    profile: order.terminalProfile ?? null,
    title: `Заказ #${order.orderNumber}`,
    subtitle: order.guestName || order.fulfillmentDetail || order.deliveryAddress || null,
    phoneTail: phoneTail(order.guestPhone),
    keywords: [
      order.orderNumber,
      order.guestName,
      order.guestPhone,
      order.guestEmail,
      order.deliveryAddress,
      order.fulfillmentDetail,
      order.status,
      order.paymentStatus,
    ],
    payload: {
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      totalAmount: Number(order.totalAmount || 0),
    },
    sourceUpdatedAt: order.updatedAt ?? null,
  });
}

export async function enqueueTerminalOrderLifecycle(order: {
  tenantId?: string | null;
  id: string;
  orderNumber: number;
  status?: string | null;
  paymentStatus?: string | null;
  paymentMethod?: string | null;
  terminalProfile?: string | null;
  guestName?: string | null;
  guestPhone?: string | null;
  totalAmount?: unknown;
}, event: "order.created" | "order.status_changed" | "order.updated") {
  const tenantId = order.tenantId ?? getCurrentTenantId();
  const basePayload = {
    orderId: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod,
    terminalProfile: order.terminalProfile,
    customerName: order.guestName,
    customerPhone: order.guestPhone,
    totalAmount: Number(order.totalAmount || 0),
  };

  await Promise.all([
    enqueueTerminalSyncJob({
      tenantId,
      channel: "search",
      event: "terminal.index.order",
      entityType: "order",
      entityId: order.id,
      direction: "INBOUND",
      priority: 2,
      payload: basePayload,
      idempotencyKey: `search:order:${order.id}:${event}`,
    }),
    enqueueTerminalSyncJob({
      tenantId,
      channel: "crm",
      event: "crm.order.sync",
      entityType: "order",
      entityId: order.id,
      priority: 3,
      payload: basePayload,
      idempotencyKey: `crm:order:${order.id}:${event}`,
    }),
    enqueueTerminalSyncJob({
      tenantId,
      channel: "notifications",
      event: `notifications.${event}`,
      entityType: "order",
      entityId: order.id,
      priority: 4,
      payload: basePayload,
      idempotencyKey: `notifications:order:${order.id}:${event}`,
    }),
  ]);

  if (order.paymentMethod === "QR / ссылка" || order.paymentStatus === "REQUESTED") {
    await Promise.all([
      enqueueTerminalSyncJob({
        tenantId,
        channel: "payments",
        event: "payment.qr.requested",
        entityType: "order",
        entityId: order.id,
        priority: 1,
        payload: basePayload,
        idempotencyKey: `payment:qr:${order.id}`,
      }),
      enqueueTerminalSyncJob({
        tenantId,
        channel: "notifications",
        event: "notifications.qr.requested",
        entityType: "order",
        entityId: order.id,
        priority: 2,
        payload: basePayload,
        idempotencyKey: `notifications:qr:${order.id}`,
      }),
    ]);
  }
}

export async function rebuildTerminalSearchIndex(limit = 200, tenantId = getCurrentTenantId()) {
  const [products, users, orders] = await Promise.all([
    prisma.product.findMany({
      where: { tenantId, active: true },
      include: { category: true, variants: true },
      orderBy: { updatedAt: "desc" },
      take: limit,
    }),
    prisma.user.findMany({
      where: { tenantId, role: "USER" },
      orderBy: { updatedAt: "desc" },
      take: limit,
    }),
    prisma.order.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { updatedAt: "desc" },
      take: limit,
    }),
  ]);

  for (const product of products) {
    await upsertTerminalSearchIndex({
      tenantId,
      entityType: "product",
      entityId: product.id,
      title: product.name,
      subtitle: product.category?.name ?? null,
      barcode: product.slug,
      keywords: [
        product.name,
        product.slug,
        product.category?.name,
        ...product.variants.flatMap((variant) => [variant.size, variant.pricePerCube, variant.pricePerPiece]),
      ],
      payload: {
        slug: product.slug,
        categoryId: product.categoryId,
        variants: product.variants.map((variant) => ({
          id: variant.id,
          size: variant.size,
          pricePerCube: Number(variant.pricePerCube || 0),
          pricePerPiece: Number(variant.pricePerPiece || 0),
          inStock: variant.inStock,
          stockQty: variant.stockQty,
        })),
      },
      sourceUpdatedAt: product.updatedAt,
    });
  }

  for (const user of users) {
    await upsertTerminalSearchIndex({
      tenantId,
      entityType: "customer",
      entityId: user.id,
      title: user.name || user.email || user.phone || "Клиент",
      subtitle: user.phone || user.email || null,
      phoneTail: phoneTail(user.phone),
      keywords: [user.name, user.email, user.phone, user.address],
      payload: {
        email: user.email,
        phone: user.phone,
        address: user.address,
      },
      sourceUpdatedAt: user.updatedAt,
    });
  }

  for (const order of orders) {
    await indexTerminalOrder(order);
  }

  return {
    products: products.length,
    customers: users.length,
    orders: orders.length,
  };
}
