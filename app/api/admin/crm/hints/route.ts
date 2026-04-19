/**
 * CRM Hints — контекстные подсказки по ролям
 * GET  ?role=ADMIN&section=orders — подсказки для роли/раздела
 * POST — создать/обновить подсказку
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const authResult = await requireStaff();
  if (!authResult.authorized) return authResult.response;

  const { searchParams } = new URL(req.url);
  const role = searchParams.get("role");
  const section = searchParams.get("section");

  try {
    const where: any = { active: true };
    if (role) where.role = { in: [role, "ALL"] };
    if (section) where.section = section;

    const hints = await prisma.crmHint.findMany({
      where,
      orderBy: [{ priority: "desc" }, { section: "asc" }],
    });

    return NextResponse.json({ hints });
  } catch {
    return NextResponse.json({ hints: [] });
  }
}

export async function POST(req: Request) {
  const { requireAdmin } = await import("@/lib/auth-helpers");
  const authResult = await requireAdmin();
  if (!authResult.authorized) return authResult.response;

  try {
    const body = await req.json();
    const { id, role, section, title, text, icon, priority, active } = body;

    if (id) {
      // Обновить
      const hint = await prisma.crmHint.update({
        where: { id },
        data: { role, section, title, text, icon, priority, active },
      });
      return NextResponse.json({ ok: true, hint });
    }

    // Создать
    if (!role || !section || !title || !text) {
      return NextResponse.json({ error: "Все поля обязательны" }, { status: 400 });
    }

    const hint = await prisma.crmHint.create({
      data: { role, section, title, text, icon, priority: priority || 0 },
    });
    return NextResponse.json({ ok: true, hint });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
