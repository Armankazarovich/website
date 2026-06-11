export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getCurrentTenantId } from "@/lib/tenant-context";
import { syncLowStockAlerts } from "@/lib/inventory-alerts";
import { revalidatePath, revalidateTag } from "next/cache";

const INVENTORY_ROLES = ["SUPER_ADMIN", "ADMIN", "MANAGER", "WAREHOUSE"];
const THRESHOLD_ROLES = ["SUPER_ADMIN", "ADMIN", "MANAGER"];
const MAX_ROWS = 2000;

type Access = {
  allowed: boolean;
  canEditThreshold: boolean;
  userId?: string;
  role?: string;
};

function parseDelimited(text: string) {
  const cleanText = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const firstLine = cleanText.split("\n").find((line) => line.trim()) || "";
  const delimiter = firstLine.includes(";") ? ";" : firstLine.includes("\t") ? "\t" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuote = false;

  for (let i = 0; i < cleanText.length; i += 1) {
    const char = cleanText[i];
    if (char === '"') {
      if (inQuote && cleanText[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else {
        inQuote = !inQuote;
      }
    } else if (char === delimiter && !inQuote) {
      row.push(cell);
      cell = "";
    } else if (char === "\n" && !inQuote) {
      row.push(cell);
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  row.push(cell);
  if (row.some((value) => value.trim())) rows.push(row);
  return rows;
}

function normalizeHeader(value: string) {
  return value
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/\s+/g, "")
    .replace(/[^\p{L}\p{N}_-]/gu, "");
}

function findIndex(headers: string[], keys: string[]) {
  return headers.findIndex((header) => keys.some((key) => header === key || header.includes(key)));
}

function parseOptionalInt(raw: string, label: string, rowNumber: number) {
  const trimmed = raw.trim();
  if (trimmed === "") return { value: null as number | null };
  const normalized = trimmed.replace(/\s+/g, "").replace(",", ".").replace(/[^\d.-]/g, "");
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0 || !Number.isInteger(parsed)) {
    return { error: `Строка ${rowNumber}: ${label} должен быть целым числом от 0` };
  }
  if (parsed > 100000) {
    return { error: `Строка ${rowNumber}: ${label} не должен превышать 100000` };
  }
  return { value: parsed };
}

function parseStockStatus(raw: string) {
  const value = raw.trim().toLowerCase();
  if (!value) return null;
  if (["1", "true", "yes", "да", "вналичии"].includes(value.replace(/\s+/g, ""))) return true;
  if (["0", "false", "no", "нет", "нетвналичии"].includes(value.replace(/\s+/g, ""))) return false;
  if (value.includes("нет")) return false;
  if (value.includes("налич")) return true;
  return null;
}

async function checkAccess(): Promise<Access> {
  const session = await auth();
  const role = session?.user?.role as string | undefined;
  return {
    allowed: !!(session && role && INVENTORY_ROLES.includes(role)),
    canEditThreshold: !!(role && THRESHOLD_ROLES.includes(role)),
    userId: (session?.user as { id?: string } | undefined)?.id,
    role,
  };
}

export async function POST(req: NextRequest) {
  const access = await checkAccess();
  if (!access.allowed) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const tenantId = getCurrentTenantId();

  const contentType = req.headers.get("content-type") || "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json({ ok: false, error: "Expected multipart/form-data" }, { status: 400 });
  }

  const formData = await req.formData();
  const preview = formData.get("preview") === "1";
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ ok: false, error: "Файл не загружен" }, { status: 400 });
  const filename = file.name.toLowerCase();
  if (!filename.endsWith(".csv") && !filename.endsWith(".txt")) {
    return NextResponse.json({ ok: false, error: "Загрузите CSV или TXT файл" }, { status: 400 });
  }

  const rows = parseDelimited(await file.text());
  if (rows.length < 2) {
    return NextResponse.json({ ok: false, error: "В файле нет строк для импорта" }, { status: 400 });
  }
  if (rows.length - 1 > MAX_ROWS) {
    return NextResponse.json({ ok: false, error: `Максимум ${MAX_ROWS} строк за один импорт` }, { status: 400 });
  }

  const headers = rows[0].map(normalizeHeader);
  const idIndex = findIndex(headers, ["id", "variantid", "variant_id"]);
  const productIndex = findIndex(headers, ["товар", "product", "name"]);
  const sizeIndex = findIndex(headers, ["размер", "size"]);
  const stockIndex = findIndex(headers, ["остаток", "stockqty", "stock", "qty", "количество"]);
  const statusIndex = findIndex(headers, ["статус", "status", "instock"]);
  const thresholdIndex = findIndex(headers, ["порог", "lowstockthreshold", "threshold"]);

  if (idIndex === -1 && (productIndex === -1 || sizeIndex === -1)) {
    return NextResponse.json(
      { ok: false, error: "Нужна колонка id или пара колонок Товар + Размер" },
      { status: 400 },
    );
  }
  if (stockIndex === -1 && statusIndex === -1 && thresholdIndex === -1) {
    return NextResponse.json(
      { ok: false, error: "Нужна колонка Остаток, Статус или Порог" },
      { status: 400 },
    );
  }
  if (thresholdIndex !== -1 && !access.canEditThreshold) {
    return NextResponse.json(
      { ok: false, error: "Импорт порогов доступен только администратору или менеджеру" },
      { status: 403 },
    );
  }

  const dataRows = rows.slice(1);
  const ids = dataRows
    .map((row) => (idIndex >= 0 ? row[idIndex]?.trim() : ""))
    .filter(Boolean);
  const existingById = new Map(
    (ids.length
      ? await prisma.productVariant.findMany({
          where: { id: { in: ids }, product: { tenantId } },
          select: { id: true },
        })
      : []
    ).map((variant) => [variant.id, variant.id]),
  );

  const errors: string[] = [];
  const updates: Array<{ id: string; data: { stockQty?: number | null; inStock?: boolean; lowStockThreshold?: number } }> = [];

  for (const [index, row] of dataRows.entries()) {
    const rowNumber = index + 2;
    let variantId = idIndex >= 0 ? row[idIndex]?.trim() : "";

    if (variantId && !existingById.has(variantId)) {
      errors.push(`Строка ${rowNumber}: вариант с id ${variantId} не найден`);
      continue;
    }

    if (!variantId && productIndex >= 0 && sizeIndex >= 0) {
      const productName = row[productIndex]?.trim();
      const size = row[sizeIndex]?.trim();
      if (productName && size) {
        const variant = await prisma.productVariant.findFirst({
          where: {
            size,
            product: {
              tenantId,
              name: { equals: productName, mode: "insensitive" },
            },
          },
          select: { id: true },
        });
        variantId = variant?.id || "";
      }
    }

    if (!variantId) {
      errors.push(`Строка ${rowNumber}: не удалось определить вариант`);
      continue;
    }

    const data: { stockQty?: number | null; inStock?: boolean; lowStockThreshold?: number } = {};

    if (stockIndex >= 0) {
      const parsedStock = parseOptionalInt(row[stockIndex] ?? "", "Остаток", rowNumber);
      if ("error" in parsedStock) {
        errors.push(parsedStock.error ?? `Строка ${rowNumber}: некорректный остаток`);
        continue;
      }
      data.stockQty = parsedStock.value;
      if (parsedStock.value !== null) data.inStock = parsedStock.value > 0;
    } else if (statusIndex >= 0) {
      const status = parseStockStatus(row[statusIndex] ?? "");
      if (status !== null) data.inStock = status;
    }

    if (thresholdIndex >= 0) {
      const parsedThreshold = parseOptionalInt(row[thresholdIndex] ?? "", "Порог", rowNumber);
      if ("error" in parsedThreshold) {
        errors.push(parsedThreshold.error ?? `Строка ${rowNumber}: некорректный порог`);
        continue;
      }
      data.lowStockThreshold = parsedThreshold.value ?? 0;
    }

    if (Object.keys(data).length === 0) {
      errors.push(`Строка ${rowNumber}: нет значений для обновления`);
      continue;
    }
    updates.push({ id: variantId, data });
  }

  if (errors.length > 0) {
    return NextResponse.json({ ok: false, preview, errors, error: errors[0] }, { status: 400 });
  }
  if (updates.length === 0) {
    return NextResponse.json({ ok: false, error: "Нет строк для обновления" }, { status: 400 });
  }

  if (preview) {
    return NextResponse.json({
      ok: true,
      preview: true,
      updated: updates.length,
      rows: updates.length,
      errors: [],
    });
  }

  await prisma.$transaction(
    updates.map((update) =>
      prisma.productVariant.update({
        where: { id: update.id },
        data: update.data,
      }),
    ),
  );

  const updatedVariants = await prisma.productVariant.findMany({
    where: { id: { in: updates.map((update) => update.id) }, product: { tenantId } },
    select: {
      id: true,
      inStock: true,
      stockQty: true,
      lowStockThreshold: true,
      pricePerCube: true,
      pricePerPiece: true,
    },
  });
  const alertSync = await syncLowStockAlerts(prisma, {
    tenantId,
    variantIds: updatedVariants.map((variant) => variant.id),
    source: "admin.inventory.import",
    userId: access.userId,
  });

  revalidateTag("store-shell-data");
  revalidatePath("/catalog");
  revalidatePath("/admin/products");
  revalidatePath("/admin/inventory");
  revalidatePath("/admin/tasks");
  revalidatePath("/admin/notifications");

  if (access.userId) {
    await prisma.activityLog.create({
      data: {
        userId: access.userId,
        action: "INVENTORY_IMPORT",
        meta: {
          rows: updates.length,
          filename: file.name,
          role: access.role,
        },
      },
    }).catch(() => null);
  }

  return NextResponse.json({
    ok: true,
    updated: updatedVariants.length,
    rows: updates.length,
    lowStockAlerts: alertSync,
    variants: updatedVariants.map((variant) => ({
      ...variant,
      pricePerCube: variant.pricePerCube === null ? null : Number(variant.pricePerCube),
      pricePerPiece: variant.pricePerPiece === null ? null : Number(variant.pricePerPiece),
    })),
  });
}
