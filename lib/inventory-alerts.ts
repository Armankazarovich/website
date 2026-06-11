import "server-only";

import type { Prisma } from "@prisma/client";

type InventoryAlertDb = Pick<
  Prisma.TransactionClient,
  "notificationCenterEvent" | "productVariant" | "task" | "taskRelation"
>;

type SyncLowStockAlertsInput = {
  tenantId: string;
  variantIds: string[];
  source: string;
  userId?: string | null;
};

export type LowStockAlertSyncResult = {
  checked: number;
  created: number;
  updated: number;
  resolved: number;
  failed: boolean;
};

const LOW_STOCK_TAG = "inventory:low-stock";
const INVENTORY_TAG = "inventory";

function uniqueStrings(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function variantTag(variantId: string) {
  return `variant:${variantId}`;
}

function compactText(parts: Array<string | null | undefined>) {
  return parts.map((part) => part?.trim()).filter(Boolean).join(" ");
}

function productHref(productId: string) {
  return `/admin/products/${productId}`;
}

function inventoryHref() {
  return "/admin/inventory?status=low";
}

function alertPriority(stockQty: number) {
  return stockQty <= 0 ? "URGENT" as const : "HIGH" as const;
}

function alertDueDate(stockQty: number) {
  const due = new Date();
  if (stockQty > 0) due.setDate(due.getDate() + 1);
  due.setHours(12, 0, 0, 0);
  return due;
}

function taskTitle(variant: LowStockVariant) {
  return compactText(["Пополнить склад:", variant.product.name, variant.size]);
}

function taskDescription(variant: LowStockVariant, source: string) {
  const stockQty = Number(variant.stockQty ?? 0);
  const threshold = Number(variant.lowStockThreshold ?? 0);
  return [
    `Остаток ${stockQty} шт., порог ${threshold} шт.`,
    `Товар: ${compactText([variant.product.name, variant.size])}.`,
    `Источник: ${source}.`,
  ].join("\n");
}

function relationMetadata(variant: LowStockVariant, source: string): Prisma.InputJsonValue {
  return {
    alert: "low_stock",
    source,
    variantId: variant.id,
    productId: variant.product.id,
    productName: variant.product.name,
    size: variant.size,
    stockQty: variant.stockQty,
    lowStockThreshold: variant.lowStockThreshold,
  };
}

type LowStockVariant = {
  id: string;
  size: string;
  stockQty: number | null;
  lowStockThreshold: number | null;
  product: {
    id: string;
    name: string;
  };
};

async function findOpenLowStockTask(db: InventoryAlertDb, tenantId: string, variantId: string) {
  return db.task.findFirst({
    where: {
      tenantId,
      status: { not: "DONE" },
      tags: { hasEvery: [LOW_STOCK_TAG, variantTag(variantId)] },
    },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      description: true,
      priority: true,
      tags: true,
    },
  });
}

async function upsertProductRelation(
  db: InventoryAlertDb,
  taskId: string,
  tenantId: string,
  variant: LowStockVariant,
  source: string,
) {
  const label = compactText([variant.product.name, variant.size]);
  await db.taskRelation.upsert({
    where: {
      taskId_entityType_entityId: {
        taskId,
        entityType: "PRODUCT",
        entityId: variant.product.id,
      },
    },
    update: {
      tenantId,
      label,
      href: productHref(variant.product.id),
      metadata: relationMetadata(variant, source),
    },
    create: {
      tenantId,
      taskId,
      entityType: "PRODUCT",
      entityId: variant.product.id,
      label,
      href: productHref(variant.product.id),
      metadata: relationMetadata(variant, source),
    },
  });
}

async function createLowStockNotification(
  db: InventoryAlertDb,
  tenantId: string,
  variant: LowStockVariant,
  taskId: string,
  source: string,
  userId?: string | null,
) {
  const stockQty = Number(variant.stockQty ?? 0);
  const threshold = Number(variant.lowStockThreshold ?? 0);
  const now = new Date();
  const label = compactText([variant.product.name, variant.size]);

  await db.notificationCenterEvent.create({
    data: {
      tenantId,
      direction: "SYSTEM",
      channel: "SYSTEM",
      status: "SENT",
      source: "AUTOMATION",
      sourceUserId: userId || null,
      title: "Низкий остаток на складе",
      body: `${label}: осталось ${stockQty} шт., порог ${threshold} шт.`,
      url: inventoryHref(),
      recipientRole: "WAREHOUSE",
      sentCount: 1,
      entityType: "PRODUCT",
      entityId: variant.product.id,
      entityLabel: label,
      entityHref: productHref(variant.product.id),
      metadata: {
        eventKey: "system_health",
        category: "inventory.low_stock",
        source,
        taskId,
        variantId: variant.id,
        productId: variant.product.id,
        stockQty,
        lowStockThreshold: threshold,
      } satisfies Prisma.InputJsonValue,
      sentAt: now,
    },
  });
}

async function syncVariantLowStockAlert(
  db: InventoryAlertDb,
  tenantId: string,
  variant: LowStockVariant,
  source: string,
  userId?: string | null,
) {
  const openTask = await findOpenLowStockTask(db, tenantId, variant.id);
  const stockQty = variant.stockQty;
  const threshold = Number(variant.lowStockThreshold ?? 0);
  const shouldAlert = stockQty !== null && threshold > 0 && stockQty <= threshold;

  if (!shouldAlert) {
    if (!openTask) return "none" as const;
    const resolvedStock = stockQty === null ? "не отслеживается" : `${stockQty} шт.`;
    await db.task.update({
      where: { id: openTask.id },
      data: {
        status: "DONE",
        completedAt: new Date(),
        description: compactText([
          openTask.description || "",
          `Закрыто автоматически: остаток восстановлен, сейчас ${resolvedStock}.`,
        ]),
      },
    });
    return "resolved" as const;
  }

  const priority = alertPriority(stockQty);
  const title = taskTitle(variant);
  const description = taskDescription(variant, source);

  if (openTask) {
    await db.task.update({
      where: { id: openTask.id },
      data: {
        title,
        description,
        priority,
        tags: uniqueStrings([...openTask.tags, INVENTORY_TAG, LOW_STOCK_TAG, variantTag(variant.id)]),
      },
    });
    await upsertProductRelation(db, openTask.id, tenantId, variant, source);
    return "updated" as const;
  }

  const task = await db.task.create({
    data: {
      tenantId,
      title,
      description,
      status: "TODO",
      priority,
      createdById: userId || null,
      dueDate: alertDueDate(stockQty),
      tags: [INVENTORY_TAG, LOW_STOCK_TAG, variantTag(variant.id)],
    },
    select: { id: true },
  });

  await upsertProductRelation(db, task.id, tenantId, variant, source);
  await createLowStockNotification(db, tenantId, variant, task.id, source, userId);
  return "created" as const;
}

export async function syncLowStockAlerts(
  db: InventoryAlertDb,
  input: SyncLowStockAlertsInput,
): Promise<LowStockAlertSyncResult> {
  const variantIds = uniqueStrings(input.variantIds);
  if (variantIds.length === 0) {
    return { checked: 0, created: 0, updated: 0, resolved: 0, failed: false };
  }

  try {
    const variants = await db.productVariant.findMany({
      where: { id: { in: variantIds }, product: { tenantId: input.tenantId } },
      select: {
        id: true,
        size: true,
        stockQty: true,
        lowStockThreshold: true,
        product: { select: { id: true, name: true } },
      },
    });

    const result: LowStockAlertSyncResult = {
      checked: variants.length,
      created: 0,
      updated: 0,
      resolved: 0,
      failed: false,
    };

    for (const variant of variants) {
      const action = await syncVariantLowStockAlert(
        db,
        input.tenantId,
        variant,
        input.source,
        input.userId,
      );
      if (action === "created") result.created += 1;
      if (action === "updated") result.updated += 1;
      if (action === "resolved") result.resolved += 1;
    }

    return result;
  } catch (error) {
    console.error("[inventory:low-stock-alerts] sync failed:", error);
    return { checked: 0, created: 0, updated: 0, resolved: 0, failed: true };
  }
}
