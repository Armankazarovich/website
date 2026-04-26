export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/aray/subscriptions — список всех подписок
// ─────────────────────────────────────────────────────────────────────────────
export async function GET() {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  try {
    const subs = await (prisma as any).apiSubscription.findMany({
      orderBy: [{ active: "desc" }, { provider: "asc" }, { createdAt: "asc" }],
    });
    return NextResponse.json({
      ok: true,
      subscriptions: subs.map((s: any) => ({
        ...s,
        costUsd: s.costUsd ? Number(s.costUsd) : null,
        costRub: s.costRub ? Number(s.costRub) : null,
      })),
    });
  } catch (err: any) {
    console.error("[GET subscriptions]", err?.message);
    return NextResponse.json({ ok: false, error: "Ошибка сервера" }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admin/aray/subscriptions — создать подписку
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  try {
    const body = await req.json();
    const {
      provider, name, costUsd, costRub, billingDay, billingType, active, notes, startedAt, endsAt,
    } = body as Record<string, unknown>;

    if (!provider || typeof provider !== "string") {
      return NextResponse.json({ ok: false, error: "provider обязателен" }, { status: 400 });
    }
    if (!name || typeof name !== "string") {
      return NextResponse.json({ ok: false, error: "name обязателен" }, { status: 400 });
    }

    const sub = await (prisma as any).apiSubscription.create({
      data: {
        provider: String(provider).trim().slice(0, 50),
        name: String(name).trim().slice(0, 200),
        costUsd: costUsd != null ? Number(costUsd) : null,
        costRub: costRub != null ? Number(costRub) : null,
        billingDay: billingDay != null ? Math.max(1, Math.min(31, Number(billingDay))) : null,
        billingType: billingType ? String(billingType) : "monthly",
        active: active !== false,
        notes: notes ? String(notes).slice(0, 1000) : null,
        startedAt: startedAt ? new Date(String(startedAt)) : null,
        endsAt: endsAt ? new Date(String(endsAt)) : null,
      },
    });

    return NextResponse.json({ ok: true, subscription: sub });
  } catch (err: any) {
    console.error("[POST subscriptions]", err?.message);
    return NextResponse.json({ ok: false, error: "Ошибка сервера" }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/admin/aray/subscriptions?id=XXX — обновить подписку
// ─────────────────────────────────────────────────────────────────────────────
export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) return NextResponse.json({ ok: false, error: "id обязателен" }, { status: 400 });

    const body = await req.json();
    const data: Record<string, unknown> = {};

    if (body.provider != null)    data.provider = String(body.provider).trim().slice(0, 50);
    if (body.name != null)        data.name = String(body.name).trim().slice(0, 200);
    if (body.costUsd !== undefined) data.costUsd = body.costUsd != null ? Number(body.costUsd) : null;
    if (body.costRub !== undefined) data.costRub = body.costRub != null ? Number(body.costRub) : null;
    if (body.billingDay !== undefined) {
      data.billingDay = body.billingDay != null ? Math.max(1, Math.min(31, Number(body.billingDay))) : null;
    }
    if (body.billingType != null) data.billingType = String(body.billingType);
    if (body.active != null)      data.active = Boolean(body.active);
    if (body.notes !== undefined) data.notes = body.notes ? String(body.notes).slice(0, 1000) : null;
    if (body.startedAt !== undefined) data.startedAt = body.startedAt ? new Date(String(body.startedAt)) : null;
    if (body.endsAt !== undefined) data.endsAt = body.endsAt ? new Date(String(body.endsAt)) : null;

    const sub = await (prisma as any).apiSubscription.update({
      where: { id },
      data,
    });

    return NextResponse.json({ ok: true, subscription: sub });
  } catch (err: any) {
    if (err?.code === "P2025") {
      return NextResponse.json({ ok: false, error: "Подписка не найдена" }, { status: 404 });
    }
    console.error("[PATCH subscriptions]", err?.message);
    return NextResponse.json({ ok: false, error: "Ошибка сервера" }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/admin/aray/subscriptions?id=XXX — удалить подписку
// ─────────────────────────────────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) return NextResponse.json({ ok: false, error: "id обязателен" }, { status: 400 });

    await (prisma as any).apiSubscription.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    if (err?.code === "P2025") {
      return NextResponse.json({ ok: false, error: "Подписка не найдена" }, { status: 404 });
    }
    console.error("[DELETE subscriptions]", err?.message);
    return NextResponse.json({ ok: false, error: "Ошибка сервера" }, { status: 500 });
  }
}
