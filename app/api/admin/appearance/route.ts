export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DEFAULT_SETTINGS } from "@/lib/site-settings";

async function checkAdmin() {
  const session = await auth();
  return session && (session.user as any).role === "ADMIN";
}

export async function GET() {
  if (!(await checkAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const row = await prisma.siteSettings.findUnique({ where: { key: "palettes_enabled" } });
  const value = row?.value ?? DEFAULT_SETTINGS.palettes_enabled;
  return NextResponse.json({ palettes_enabled: value });
}

export async function PATCH(req: Request) {
  if (!(await checkAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { palettes_enabled } = await req.json();
  if (typeof palettes_enabled !== "string") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  // Always ensure timber is included
  const ids = palettes_enabled.split(",").map((s) => s.trim()).filter(Boolean);
  if (!ids.includes("timber")) ids.unshift("timber");
  const value = ids.join(",");
  await prisma.siteSettings.upsert({
    where: { key: "palettes_enabled" },
    create: { key: "palettes_enabled", value },
    update: { value },
  });
  return NextResponse.json({ ok: true, palettes_enabled: value });
}
