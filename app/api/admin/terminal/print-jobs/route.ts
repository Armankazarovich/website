export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTerminalStaff } from "@/lib/terminal-auth";
import { enqueueTerminalSyncJob } from "@/lib/terminal-sync";

export async function GET(req: NextRequest) {
  const auth = await requireTerminalStaff();
  if (!auth.authorized) return auth.response;

  const status = req.nextUrl.searchParams.get("status");
  const where = status ? { status } : {};
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

  const body = await req.json().catch(() => ({}));
  const title = String(body.title || "").trim();
  if (!title) return NextResponse.json({ error: "Укажите название печати" }, { status: 400 });

  const job = await prisma.printJob.create({
    data: {
      orderId: body.orderId ? String(body.orderId) : null,
      shiftId: body.shiftId ? String(body.shiftId) : null,
      workstationId: body.workstationId ? String(body.workstationId) : null,
      route: String(body.route || "receipt"),
      type: String(body.type || "RECEIPT"),
      status: String(body.status || "QUEUED"),
      title,
      payload: body.payload && typeof body.payload === "object" ? body.payload : {},
      createdById: auth.session.user.id,
    },
  });

  await enqueueTerminalSyncJob({
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
