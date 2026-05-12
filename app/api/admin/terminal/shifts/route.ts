export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTerminalStaff } from "@/lib/terminal-auth";

export async function GET() {
  const auth = await requireTerminalStaff();
  if (!auth.authorized) return auth.response;

  const [openShifts, recentShifts] = await Promise.all([
    prisma.cashShift.findMany({
      where: { status: "OPEN" },
      orderBy: { openedAt: "desc" },
      include: { workstation: true },
      take: 20,
    }),
    prisma.cashShift.findMany({
      where: { status: "CLOSED" },
      orderBy: { closedAt: "desc" },
      include: { workstation: true },
      take: 20,
    }),
  ]);

  return NextResponse.json({ openShifts, recentShifts });
}

export async function POST(req: NextRequest) {
  const auth = await requireTerminalStaff();
  if (!auth.authorized) return auth.response;

  const body = await req.json().catch(() => ({}));
  const action = String(body.action || "open");

  if (action === "close") {
    const shiftId = String(body.shiftId || "");
    if (!shiftId) return NextResponse.json({ error: "Не указана смена" }, { status: 400 });

    const shift = await prisma.cashShift.findUnique({ where: { id: shiftId } });
    if (!shift || shift.status !== "OPEN") {
      return NextResponse.json({ error: "Открытая смена не найдена" }, { status: 404 });
    }

    const actualCash = Number(body.actualCash ?? 0);
    if (!Number.isFinite(actualCash) || actualCash < 0) {
      return NextResponse.json({ error: "Некорректная сумма наличных" }, { status: 400 });
    }

    const expectedCash = Number(shift.openingCash) + Number(shift.expectedCash);
    const closed = await prisma.cashShift.update({
      where: { id: shiftId },
      data: {
        status: "CLOSED",
        closedById: auth.session.user.id,
        actualCash,
        cashDelta: actualCash - expectedCash,
        closedAt: new Date(),
        notes: body.notes ? String(body.notes).trim() : shift.notes,
      },
    });

    await prisma.shiftOperation.create({
      data: {
        shiftId,
        type: "CLOSE",
        amount: actualCash,
        actorId: auth.session.user.id,
        note: body.notes ? String(body.notes).trim() : null,
      },
    });

    return NextResponse.json({ shift: closed });
  }

  const openingCash = Number(body.openingCash ?? 0);
  if (!Number.isFinite(openingCash) || openingCash < 0) {
    return NextResponse.json({ error: "Некорректная стартовая сумма" }, { status: 400 });
  }

  const workstationId = body.workstationId ? String(body.workstationId) : null;
  const existingOpenShift = await prisma.cashShift.findFirst({
    where: workstationId
      ? { status: "OPEN", workstationId }
      : { status: "OPEN", workstationId: null, openedById: auth.session.user.id },
    orderBy: { openedAt: "desc" },
    include: { workstation: true },
  });

  if (existingOpenShift) {
    return NextResponse.json({
      shift: existingOpenShift,
      message: "Смена уже открыта. Продолжайте работать в ней.",
    });
  }

  const open = await prisma.cashShift.create({
    data: {
      workstationId,
      openedById: auth.session.user.id,
      openingCash,
      notes: body.notes ? String(body.notes).trim() : null,
    },
  });

  await prisma.shiftOperation.create({
    data: {
      shiftId: open.id,
      type: "OPEN",
      amount: openingCash,
      actorId: auth.session.user.id,
      note: body.notes ? String(body.notes).trim() : null,
    },
  });

  return NextResponse.json({ shift: open }, { status: 201 });
}
