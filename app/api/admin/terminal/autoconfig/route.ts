export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { applyTerminalAutoconfig, buildTerminalAutoconfig } from "@/lib/terminal-autoconfig";
import { requireTerminalAdmin, requireTerminalStaff } from "@/lib/terminal-auth";
import { getCurrentTenantId } from "@/lib/tenant-context";
import { parseJsonRecord, requireWriteConfirmation } from "@/lib/admin-content-guard";

export async function GET() {
  const auth = await requireTerminalStaff();
  if (!auth.authorized) return auth.response;

  const config = await buildTerminalAutoconfig(getCurrentTenantId());
  return NextResponse.json(config);
}

export async function POST(req: Request) {
  const auth = await requireTerminalAdmin();
  if (!auth.authorized) return auth.response;
  const body = await parseJsonRecord(req);
  const confirmationError = requireWriteConfirmation(body);
  if (confirmationError) return confirmationError;

  const config = await applyTerminalAutoconfig(getCurrentTenantId());
  return NextResponse.json({ ok: true, config });
}
