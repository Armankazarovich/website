export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTerminalStaff } from "@/lib/terminal-auth";
import { enqueueTerminalSyncJob } from "@/lib/terminal-sync";
import { getCurrentTenantId } from "@/lib/tenant-context";
import { parseJsonRecord, requireWriteConfirmation } from "@/lib/admin-content-guard";

export async function GET(req: NextRequest) {
  const auth = await requireTerminalStaff();
  if (!auth.authorized) return auth.response;
  const tenantId = getCurrentTenantId();

  const status = req.nextUrl.searchParams.get("status");
  const where = status ? { tenantId, status } : { tenantId };
  const jobs = await prisma.printJob.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { workstation: true },
    take: 50,
  });

  return NextResponse.json({ jobs });
}

export async function POST(req: NextRequest) {
  const auth = await requireTerminalStaff();
  if (!auth.authorized) return auth.response;
  const tenantId = getCurrentTenantId();

  const body = await parseJsonRecord(req);
  const confirmationError = requireWriteConfirmation(body);
  if (confirmationError) return confirmationError;

  const title = String(body.title || "").trim();
  if (!title) return NextResponse.json({ error: "Укажите название печати" }, { status: 400 });
  const orderId = body.orderId ? String(body.orderId) : null;
  const shiftId = body.shiftId ? String(body.shiftId) : null;
  const workstationId = body.workstationId ? String(body.workstationId) : null;

  if (orderId) {
    const order = await prisma.order.findFirst({
      where: { id: orderId, tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!order) return NextResponse.json({ error: "Заказ не найден" }, { status: 400 });
  }
  if (shiftId) {
    const shift = await prisma.cashShift.findFirst({
      where: { id: shiftId, tenantId },
      select: { id: true },
    });
    if (!shift) return NextResponse.json({ error: "Смена не найдена" }, { status: 400 });
  }
  if (workstationId) {
    const workstation = await prisma.terminalWorkstation.findFirst({
      where: { id: workstationId, tenantId },
      select: { id: true },
    });
    if (!workstation) return NextResponse.json({ error: "Рабочее место не найдено" }, { status: 400 });
  }

  const job = await prisma.printJob.create({
    data: {
      tenantId,
      orderId,
      shiftId,
      workstationId,
      route: String(body.route || "receipt"),
      type: String(body.type || "RECEIPT"),
      status: String(body.status || "QUEUED"),
      title,
      payload: body.payload && typeof body.payload === "object" ? body.payload : {},
      createdById: auth.session.user.id,
    },
  });

  await enqueueTerminalSyncJob({
    tenantId,
    channel: "printing",
    event: "print.job.queued",
    entityType: job.orderId ? "order" : "terminal",
    entityId: job.orderId || job.id,
    priority: 2,
    payload: {
      printJobId: job.id,
      orderId: job.orderId,
      route: job.route,
      type: job.type,
      workstationId: job.workstationId,
    },
    idempotencyKey: `print:job:${job.id}`,
  }).catch(console.error);

  return NextResponse.json({ job }, { status: 201 });
}
