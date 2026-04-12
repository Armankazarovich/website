export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function checkAuth() {
  const session = await auth();
  const role = session?.user?.role;
  return role === "ADMIN" || role === "ACCOUNTANT" || role === "MANAGER";
}

// POST /api/admin/finance/expenses — create expense
export async function POST(req: Request) {
  if (!(await checkAuth())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { amount, category, description, date } = await req.json();
  if (!amount || !category) {
    return NextResponse.json({ error: "amount and category required" }, { status: 400 });
  }

  const expense = await prisma.expense.create({
    data: {
      amount,
      category,
      description: description || null,
      date: date ? new Date(date) : new Date(),
    },
  });

  return NextResponse.json(expense);
}

// DELETE /api/admin/finance/expenses?id=xxx
export async function DELETE(req: Request) {
  if (!(await checkAuth())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await prisma.expense.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

// PATCH /api/admin/finance/expenses?id=xxx — update
export async function PATCH(req: Request) {
  if (!(await checkAuth())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { amount, category, description, date } = await req.json();

  const expense = await prisma.expense.update({
    where: { id },
    data: {
      ...(amount !== undefined && { amount }),
      ...(category !== undefined && { category }),
      ...(description !== undefined && { description }),
      ...(date !== undefined && { date: new Date(date) }),
    },
  });

  return NextResponse.json(expense);
}
