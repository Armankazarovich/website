export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { applyTerminalAutoconfig, buildTerminalAutoconfig } from "@/lib/terminal-autoconfig";
import { requireTerminalAdmin, requireTerminalStaff } from "@/lib/terminal-auth";

export async function GET() {
  const auth = await requireTerminalStaff();
  if (!auth.authorized) return auth.response;

  const config = await buildTerminalAutoconfig();
  return NextResponse.json(config);
}

export async function POST() {
  const auth = await requireTerminalAdmin();
  if (!auth.authorized) return auth.response;

  const config = await applyTerminalAutoconfig();
  return NextResponse.json({ ok: true, config });
}
