export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-helpers";
import { requireArayModuleAccess } from "@/lib/aray-module-auth";
import { prisma } from "@/lib/prisma";
import { getCurrentTenantId } from "@/lib/tenant-context";

async function requireFinanceAccess() {
  const auth = await requireRole("SUPER_ADMIN", "ADMIN", "ACCOUNTANT");
  if (!auth.authorized) return auth.response;

  const moduleAccess = await requireArayModuleAccess({
    moduleId: "finance.wallet-ledger",
    role: auth.role,
  });
  if (!moduleAccess.authorized) return moduleAccess.response;

  return null;
}

function parseExpenseDate(value: unknown) {
  if (!value) return new Date();
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeExpensePayload(payload: {
  amount?: unknown;
  category?: unknown;
  description?: unknown;
  date?: unknown;
}) {
  const numericAmount =
    payload.amount !== undefined ? Number(payload.amount) : undefined;
  const category =
    typeof payload.category === "string" ? payload.category.trim() : "";
  const description =
    typeof payload.description === "string" ? payload.description.trim() : "";
  const date = parseExpenseDate(payload.date);

  return { numericAmount, category, description, date };
}

// POST /api/admin/finance/expenses — create expense
export async function POST(req: Request) {
  const denied = await requireFinanceAccess();
  if (denied) return denied;

  const payload = await req.json();
  const { numericAmount, category, description, date } =
    normalizeExpensePayload(payload);
  if (
    typeof numericAmount !== "number" ||
    !Number.isFinite(numericAmount) ||
    numericAmount <= 0 ||
    !category
  ) {
    return NextResponse.json(
      { error: "Укажите положительную сумму и категорию расхода" },
      { status: 400 },
    );
  }
  if (!date) {
    return NextResponse.json({ error: "Некорректная дата расхода" }, { status: 400 });
  }

  const tenantId = getCurrentTenantId();
  const expense = await prisma.expense.create({
    data: {
      tenantId,
      amount: numericAmount,
      category,
      description: description || null,
      date,
    },
  });

  return NextResponse.json(expense);
}

// DELETE /api/admin/finance/expenses?id=xxx
export async function DELETE(req: Request) {
  const denied = await requireFinanceAccess();
  if (denied) return denied;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const tenantId = getCurrentTenantId();
  const result = await prisma.expense.deleteMany({ where: { id, tenantId } });
  if (result.count === 0) return NextResponse.json({ error: "Expense not found" }, { status: 404 });

  return NextResponse.json({ ok: true });
}

// PATCH /api/admin/finance/expenses?id=xxx — update
export async function PATCH(req: Request) {
  const denied = await requireFinanceAccess();
  if (denied) return denied;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const payload = await req.json();
  const { numericAmount, category, description, date } =
    normalizeExpensePayload(payload);
  if (numericAmount !== undefined && (!Number.isFinite(numericAmount) || numericAmount <= 0)) {
    return NextResponse.json({ error: "Сумма расхода должна быть положительной" }, { status: 400 });
  }
  if (payload.category !== undefined && !category) {
    return NextResponse.json({ error: "Укажите категорию расхода" }, { status: 400 });
  }
  if (payload.date !== undefined && !date) {
    return NextResponse.json({ error: "Некорректная дата расхода" }, { status: 400 });
  }

  const tenantId = getCurrentTenantId();
  const result = await prisma.expense.updateMany({
    where: { id, tenantId },
    data: {
      ...(numericAmount !== undefined && { amount: numericAmount }),
      ...(payload.category !== undefined && { category }),
      ...(payload.description !== undefined && { description }),
      ...(payload.date !== undefined && date && { date }),
    },
  });
  if (result.count === 0) return NextResponse.json({ error: "Expense not found" }, { status: 404 });

  const expense = await prisma.expense.findFirst({ where: { id, tenantId } });

  return NextResponse.json(expense);
}
