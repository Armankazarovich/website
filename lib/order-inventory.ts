import { Prisma, UnitType } from "@prisma/client";
import { revalidatePath, revalidateTag } from "next/cache";
import { syncLowStockAlerts } from "@/lib/inventory-alerts";

type InventoryTx = Prisma.TransactionClient;

type OrderInventoryItem = {
  variantId: string;
  productName?: string | null;
  variantSize?: string | null;
  unitType: UnitType | string;
  quantity: unknown;
};

type OrderInventoryInput = {
  id: string;
  tenantId?: string | null;
  orderNumber?: number | null;
  status?: string | null;
  items: OrderInventoryItem[];
};

type InventorySyncOptions = {
  tenantId: string;
  source: string;
  userId?: string | null;
};

type Deduction = {
  variantId: string;
  productName: string;
  variantSize: string;
  unitType: "CUBE" | "PIECE" | "SQUARE";
  quantity: number;
  stockUnits: number;
  before: number;
  after: number;
};

const APPLY_EVENT = "inventory.order.apply";
const RELEASE_EVENT = "inventory.order.release";
const LEDGER_PREFIX = "inventory:order";

export class OrderInventoryError extends Error {
  status: number;
  details: unknown;

  constructor(message: string, status = 409, details?: unknown) {
    super(message);
    this.name = "OrderInventoryError";
    this.status = status;
    this.details = details;
  }
}

export function isOrderInventoryError(error: unknown): error is OrderInventoryError {
  return error instanceof OrderInventoryError;
}

function ledgerPrefix(orderId: string, action: "apply" | "release") {
  return `${LEDGER_PREFIX}:${orderId}:${action}:`;
}

function ledgerKey(orderId: string, action: "apply" | "release", cycle: number) {
  return `${ledgerPrefix(orderId, action)}${cycle}`;
}

async function getLedgerCounts(tx: InventoryTx, tenantId: string, orderId: string) {
  const [applies, releases] = await Promise.all([
    tx.terminalSyncJob.count({
      where: { tenantId, idempotencyKey: { startsWith: ledgerPrefix(orderId, "apply") } },
    }),
    tx.terminalSyncJob.count({
      where: { tenantId, idempotencyKey: { startsWith: ledgerPrefix(orderId, "release") } },
    }),
  ]);

  return { applies, releases, applied: applies > releases };
}

function toQuantity(value: unknown) {
  const quantity = Number(value);
  return Number.isFinite(quantity) && quantity > 0 ? quantity : 0;
}

function toUnitType(value: unknown): "CUBE" | "PIECE" | "SQUARE" | null {
  return value === "CUBE" || value === "PIECE" || value === "SQUARE" ? value : null;
}

function stockUnitsForItem(item: OrderInventoryItem, piecesPerCube: number | null) {
  const unitType = toUnitType(item.unitType);
  const quantity = toQuantity(item.quantity);
  if (!unitType || quantity <= 0) return 0;

  const multiplier =
    unitType === "CUBE" && Number.isFinite(Number(piecesPerCube)) && Number(piecesPerCube) > 0
      ? Number(piecesPerCube)
      : 1;

  return Math.max(1, Math.ceil(quantity * multiplier - 0.000001));
}

function mergeDeductions(deductions: Deduction[]) {
  const byVariant = new Map<string, Deduction>();
  for (const deduction of deductions) {
    const current = byVariant.get(deduction.variantId);
    if (!current) {
      byVariant.set(deduction.variantId, deduction);
      continue;
    }
    current.quantity += deduction.quantity;
    current.stockUnits += deduction.stockUnits;
  }
  return [...byVariant.values()];
}

async function createLedgerEvent(
  tx: InventoryTx,
  input: {
    tenantId: string;
    order: OrderInventoryInput;
    action: "apply" | "release";
    cycle: number;
    source: string;
    deductions: Deduction[];
    userId?: string | null;
  },
) {
  const now = new Date();

  return tx.terminalSyncJob.create({
    data: {
      tenantId: input.tenantId,
      channel: "inventory",
      event: input.action === "apply" ? APPLY_EVENT : RELEASE_EVENT,
      entityType: "order",
      entityId: input.order.id,
      status: "PROCESSED",
      direction: "INTERNAL",
      priority: 1,
      attempts: 1,
      maxAttempts: 1,
      idempotencyKey: ledgerKey(input.order.id, input.action, input.cycle),
      payload: {
        orderId: input.order.id,
        orderNumber: input.order.orderNumber ?? null,
        action: input.action,
        source: input.source,
        userId: input.userId ?? null,
        deductions: input.deductions,
      } satisfies Prisma.InputJsonValue,
      result: { ok: true, deductions: input.deductions.length } satisfies Prisma.InputJsonValue,
      processedAt: now,
    },
  });
}

async function getApplyDeductions(tx: InventoryTx, tenantId: string, orderId: string, cycle: number) {
  const job = await tx.terminalSyncJob.findFirst({
    where: {
      tenantId,
      idempotencyKey: ledgerKey(orderId, "apply", cycle),
    },
    select: { payload: true },
  });

  const payload = job?.payload;
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return [];
  const deductions = (payload as { deductions?: unknown }).deductions;
  if (!Array.isArray(deductions)) return [];

  return deductions
    .map((deduction) => {
      if (!deduction || typeof deduction !== "object" || Array.isArray(deduction)) return null;
      const item = deduction as Record<string, unknown>;
      const variantId = typeof item.variantId === "string" ? item.variantId : "";
      const stockUnits = Number(item.stockUnits);
      if (!variantId || !Number.isFinite(stockUnits) || stockUnits <= 0) return null;
      return {
        variantId,
        stockUnits: Math.ceil(stockUnits),
        productName: typeof item.productName === "string" ? item.productName : "",
        variantSize: typeof item.variantSize === "string" ? item.variantSize : "",
        unitType: toUnitType(item.unitType) ?? "PIECE",
        quantity: toQuantity(item.quantity),
        before: Number(item.before) || 0,
        after: Number(item.after) || 0,
      } satisfies Deduction;
    })
    .filter((deduction): deduction is Deduction => Boolean(deduction));
}

function revalidateInventoryViews() {
  revalidateTag("store-shell-data");
  revalidatePath("/catalog");
  revalidatePath("/admin/inventory");
  revalidatePath("/admin/products");
  revalidatePath("/admin/orders");
  revalidatePath("/admin/crm");
  revalidatePath("/admin/tasks");
  revalidatePath("/admin/notifications");
}

export async function isOrderInventoryApplied(tx: InventoryTx, order: OrderInventoryInput, options: InventorySyncOptions) {
  const counts = await getLedgerCounts(tx, options.tenantId, order.id);
  return counts.applied;
}

export async function applyOrderInventory(
  tx: InventoryTx,
  order: OrderInventoryInput,
  options: InventorySyncOptions,
) {
  const counts = await getLedgerCounts(tx, options.tenantId, order.id);
  if (counts.applied) {
    return { ok: true, skipped: "already_applied" as const, deductions: [] as Deduction[] };
  }

  const cycle = counts.releases + 1;
  const variantIds = [...new Set(order.items.map((item) => item.variantId).filter(Boolean))];
  if (variantIds.length === 0) {
    await createLedgerEvent(tx, { ...options, order, action: "apply", cycle, deductions: [] });
    return { ok: true, deductions: [] };
  }

  const variants = await tx.productVariant.findMany({
    where: { id: { in: variantIds }, product: { tenantId: options.tenantId } },
    select: {
      id: true,
      stockQty: true,
      piecesPerCube: true,
      product: { select: { name: true } },
      size: true,
    },
  });
  const variantMap = new Map(variants.map((variant) => [variant.id, variant]));
  const missingVariant = variantIds.find((variantId) => !variantMap.has(variantId));
  if (missingVariant) {
    throw new OrderInventoryError("Товар из заказа не найден в текущем магазине.", 409, { variantId: missingVariant });
  }

  const rawDeductions: Deduction[] = [];
  for (const item of order.items) {
    const variant = variantMap.get(item.variantId);
    if (!variant || variant.stockQty === null) continue;

    const stockUnits = stockUnitsForItem(item, variant.piecesPerCube);
    if (stockUnits <= 0) continue;

    rawDeductions.push({
      variantId: variant.id,
      productName: item.productName || variant.product.name,
      variantSize: item.variantSize || variant.size,
      unitType: toUnitType(item.unitType) ?? "PIECE",
      quantity: toQuantity(item.quantity),
      stockUnits,
      before: Number(variant.stockQty),
      after: Math.max(0, Number(variant.stockQty) - stockUnits),
    });
  }

  const deductions = mergeDeductions(rawDeductions);
  for (const deduction of deductions) {
    const result = await tx.productVariant.updateMany({
      where: {
        id: deduction.variantId,
        product: { tenantId: options.tenantId },
        stockQty: { gte: deduction.stockUnits },
      },
      data: {
        stockQty: { decrement: deduction.stockUnits },
      },
    });

    if (result.count === 0) {
      const current = await tx.productVariant.findFirst({
        where: { id: deduction.variantId, product: { tenantId: options.tenantId } },
        select: { stockQty: true, product: { select: { name: true } }, size: true },
      });
      throw new OrderInventoryError(
        `Недостаточно остатка: ${current?.product.name || deduction.productName} ${current?.size || deduction.variantSize}. Нужно ${deduction.stockUnits} шт., доступно ${current?.stockQty ?? 0} шт.`,
        409,
        {
          variantId: deduction.variantId,
          required: deduction.stockUnits,
          available: current?.stockQty ?? 0,
        },
      );
    }
  }

  if (deductions.length > 0) {
    const updated = await tx.productVariant.findMany({
      where: { id: { in: deductions.map((deduction) => deduction.variantId) }, product: { tenantId: options.tenantId } },
      select: { id: true, stockQty: true },
    });
    const updatedMap = new Map(updated.map((variant) => [variant.id, Number(variant.stockQty ?? 0)]));
    for (const deduction of deductions) {
      deduction.after = updatedMap.get(deduction.variantId) ?? deduction.after;
    }

    await tx.productVariant.updateMany({
      where: {
        id: { in: deductions.map((deduction) => deduction.variantId) },
        product: { tenantId: options.tenantId },
        stockQty: { lte: 0 },
      },
      data: { inStock: false },
    });

    await syncLowStockAlerts(tx, {
      tenantId: options.tenantId,
      variantIds: deductions.map((deduction) => deduction.variantId),
      source: options.source,
      userId: options.userId,
    });
  }

  await createLedgerEvent(tx, { ...options, order, action: "apply", cycle, deductions });
  revalidateInventoryViews();

  return { ok: true, deductions };
}

export async function releaseOrderInventory(
  tx: InventoryTx,
  order: OrderInventoryInput,
  options: InventorySyncOptions,
) {
  const counts = await getLedgerCounts(tx, options.tenantId, order.id);
  if (!counts.applied) {
    return { ok: true, skipped: "not_applied" as const, deductions: [] as Deduction[] };
  }

  const cycle = counts.releases + 1;
  const deductions = await getApplyDeductions(tx, options.tenantId, order.id, cycle);

  if (deductions.length > 0) {
    const currentVariants = await tx.productVariant.findMany({
      where: {
        id: { in: deductions.map((deduction) => deduction.variantId) },
        product: { tenantId: options.tenantId },
      },
      select: { id: true, stockQty: true },
    });
    const currentById = new Map(currentVariants.map((variant) => [variant.id, variant.stockQty]));

    for (const deduction of deductions) {
      const before = currentById.get(deduction.variantId);
      if (typeof before === "number") {
        deduction.before = before;
        deduction.after = before + deduction.stockUnits;
      }
    }
  }

  for (const deduction of deductions) {
    await tx.productVariant.updateMany({
      where: {
        id: deduction.variantId,
        product: { tenantId: options.tenantId },
        stockQty: { not: null },
      },
      data: {
        stockQty: { increment: deduction.stockUnits },
        inStock: true,
      },
    });
  }

  if (deductions.length > 0) {
    await syncLowStockAlerts(tx, {
      tenantId: options.tenantId,
      variantIds: deductions.map((deduction) => deduction.variantId),
      source: options.source,
      userId: options.userId,
    });
  }

  await createLedgerEvent(tx, { ...options, order, action: "release", cycle, deductions });
  revalidateInventoryViews();

  return { ok: true, deductions };
}

export async function resyncOrderInventory(
  tx: InventoryTx,
  order: OrderInventoryInput,
  options: InventorySyncOptions,
) {
  const counts = await getLedgerCounts(tx, options.tenantId, order.id);
  if (counts.applied) {
    await releaseOrderInventory(tx, order, options);
  }
  if (order.status === "CANCELLED") {
    return { ok: true, skipped: "cancelled" as const, deductions: [] as Deduction[] };
  }
  return applyOrderInventory(tx, order, options);
}

export async function syncOrderInventoryForStatus(
  tx: InventoryTx,
  order: OrderInventoryInput,
  options: InventorySyncOptions,
) {
  if (order.status === "CANCELLED") {
    return releaseOrderInventory(tx, order, options);
  }
  return applyOrderInventory(tx, order, options);
}
