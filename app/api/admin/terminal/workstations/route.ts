export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTerminalAdmin, requireTerminalStaff } from "@/lib/terminal-auth";
import { resolveTerminalProfile } from "@/lib/terminal-profiles";
import { getCurrentTenantId } from "@/lib/tenant-context";
import { parseJsonRecord, requireWriteConfirmation } from "@/lib/admin-content-guard";

export async function GET() {
  const auth = await requireTerminalStaff();
  if (!auth.authorized) return auth.response;
  const tenantId = getCurrentTenantId();

  const workstations = await prisma.terminalWorkstation.findMany({
    where: { tenantId },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: {
      shifts: {
        where: { tenantId, status: "OPEN" },
        orderBy: { openedAt: "desc" },
        take: 1,
      },
    },
  });

  return NextResponse.json({ workstations });
}

export async function POST(req: NextRequest) {
  const auth = await requireTerminalAdmin();
  if (!auth.authorized) return auth.response;
  const tenantId = getCurrentTenantId();

  const body = await parseJsonRecord(req);
  const confirmationError = requireWriteConfirmation(body);
  if (confirmationError) return confirmationError;

  const name = String(body.name || "").trim();
  if (!name) return NextResponse.json({ error: "Укажите название рабочего места" }, { status: 400 });

  const profile = resolveTerminalProfile(body.profile).key;
  const workstation = await prisma.terminalWorkstation.create({
    data: {
      tenantId,
      name,
      type: String(body.type || "MOBILE").trim() || "MOBILE",
      profile,
      deviceLabel: body.deviceLabel ? String(body.deviceLabel).trim() : null,
      printerMode: body.printerMode ? String(body.printerMode).trim() : null,
      scannerMode: body.scannerMode ? String(body.scannerMode).trim() : null,
      paymentMode: body.paymentMode ? String(body.paymentMode).trim() : null,
      settings: body.settings && typeof body.settings === "object" ? body.settings : {},
    },
  });

  return NextResponse.json({ workstation }, { status: 201 });
}
