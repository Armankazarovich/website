export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentTenantId } from "@/lib/tenant-context";

const INVENTORY_ROLES = ["SUPER_ADMIN", "ADMIN", "MANAGER", "WAREHOUSE"];
const INVENTORY_EVENTS = ["inventory.order.apply", "inventory.order.release"];

type MovementItem = {
  variantId: string;
  productName: string;
  variantSize: string;
  unitType: "CUBE" | "PIECE";
  quantity: number;
  stockUnits: number;
  before: number;
  after: number;
};

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asNumber(value: unknown, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeItem(value: unknown): MovementItem | null {
  const item = asObject(value);
  if (!item) return null;

  const variantId = typeof item.variantId === "string" ? item.variantId : "";
  const stockUnits = Math.ceil(asNumber(item.stockUnits));
  if (!variantId || stockUnits <= 0) return null;

  return {
    variantId,
    productName: typeof item.productName === "string" ? item.productName : "Товар",
    variantSize: typeof item.variantSize === "string" ? item.variantSize : "",
    unitType: item.unitType === "CUBE" ? "CUBE" : "PIECE",
    quantity: asNumber(item.quantity),
    stockUnits,
    before: asNumber(item.before),
    after: asNumber(item.after),
  };
}

export async function GET(req: NextRequest) {
  const session = await auth();
  const role = session?.user?.role as string | undefined;
  if (!session || !role || !INVENTORY_ROLES.includes(role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = getCurrentTenantId();
  const { searchParams } = new URL(req.url);
  const rawLimit = Number(searchParams.get("limit") || 12);
  const limit = Math.max(1, Math.min(Number.isFinite(rawLimit) ? rawLimit : 12, 50));

  const jobs = await prisma.terminalSyncJob.findMany({
    where: {
      tenantId,
      channel: "inventory",
      event: { in: INVENTORY_EVENTS },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      event: true,
      entityId: true,
      createdAt: true,
      payload: true,
    },
  });

  const movements = jobs.map((job) => {
    const payload = asObject(job.payload);
    const items = Array.isArray(payload?.deductions)
      ? payload.deductions.map(normalizeItem).filter((item): item is MovementItem => Boolean(item))
      : [];
    const orderNumber = asNumber(payload?.orderNumber, 0);

    return {
      id: job.id,
      action: job.event === "inventory.order.release" ? "release" : "apply",
      orderId: typeof payload?.orderId === "string" ? payload.orderId : job.entityId,
      orderNumber: orderNumber > 0 ? orderNumber : null,
      source: typeof payload?.source === "string" ? payload.source : null,
      createdAt: job.createdAt.toISOString(),
      totalStockUnits: items.reduce((sum, item) => sum + item.stockUnits, 0),
      items,
    };
  });

  return NextResponse.json({ ok: true, movements });
}
