export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/auth-helpers";
import { requireArayModuleAccess } from "@/lib/aray-module-auth";
import { getCurrentTenantId } from "@/lib/tenant-context";

const BILLING_TYPES = new Set(["monthly", "yearly", "prepaid", "on_demand"]);

function parseOptionalFiniteNumber(value: unknown, field: string) {
  if (value === undefined || value === null || value === "") return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) {
    throw new Error(`${field} должен быть положительным числом`);
  }
  return number;
}

function parseOptionalDate(value: unknown, field: string) {
  if (value === undefined || value === null || value === "") return null;
  const date = new Date(String(value));
  if (!Number.isFinite(date.getTime())) {
    throw new Error(`${field} должен быть корректной датой`);
  }
  return date;
}

function parseBillingDay(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  const day = Number(value);
  if (!Number.isInteger(day) || day < 1 || day > 31) {
    throw new Error("billingDay должен быть от 1 до 31");
  }
  return day;
}

function parseBillingType(value: unknown) {
  const billingType = value ? String(value) : "monthly";
  if (!BILLING_TYPES.has(billingType)) {
    throw new Error("Некорректный billingType");
  }
  return billingType;
}

function isValidationError(err: unknown) {
  return err instanceof Error && (err.message.includes("должен") || err.message.includes("Некоррект"));
}

function hasConfirmation(body: unknown) {
  return body && typeof body === "object" && !Array.isArray(body) && (body as Record<string, unknown>).confirm === true;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/aray/subscriptions — список всех подписок
// ─────────────────────────────────────────────────────────────────────────────
async function requireVoiceModule(role: string) {
  const moduleAccess = await requireArayModuleAccess({ moduleId: "core.aray-voice", role });
  if (!moduleAccess.authorized) return moduleAccess.response;
  return null;
}

export async function GET() {
  const auth = await requireSuperAdmin();
  if (!auth.authorized) return auth.response;
  const denied = await requireVoiceModule(auth.role);
  if (denied) return denied;
  const tenantId = getCurrentTenantId();

  try {
    const subs = await (prisma as any).apiSubscription.findMany({
      where: { tenantId },
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
  const auth = await requireSuperAdmin();
  if (!auth.authorized) return auth.response;
  const denied = await requireVoiceModule(auth.role);
  if (denied) return denied;
  const tenantId = getCurrentTenantId();

  try {
    const body = await req.json().catch(() => null);
    if (!hasConfirmation(body)) {
      return NextResponse.json({ ok: false, error: "Подтвердите изменение подписки" }, { status: 400 });
    }
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
        tenantId,
        provider: String(provider).trim().slice(0, 50),
        name: String(name).trim().slice(0, 200),
        costUsd: parseOptionalFiniteNumber(costUsd, "costUsd"),
        costRub: parseOptionalFiniteNumber(costRub, "costRub"),
        billingDay: parseBillingDay(billingDay),
        billingType: parseBillingType(billingType),
        active: active !== false,
        notes: notes ? String(notes).slice(0, 1000) : null,
        startedAt: parseOptionalDate(startedAt, "startedAt"),
        endsAt: parseOptionalDate(endsAt, "endsAt"),
      },
    });

    return NextResponse.json({ ok: true, subscription: sub });
  } catch (err: any) {
    if (isValidationError(err)) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 400 });
    }
    console.error("[POST subscriptions]", err?.message);
    return NextResponse.json({ ok: false, error: "Ошибка сервера" }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/admin/aray/subscriptions?id=XXX — обновить подписку
// ─────────────────────────────────────────────────────────────────────────────
export async function PATCH(req: NextRequest) {
  const auth = await requireSuperAdmin();
  if (!auth.authorized) return auth.response;
  const denied = await requireVoiceModule(auth.role);
  if (denied) return denied;
  const tenantId = getCurrentTenantId();

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) return NextResponse.json({ ok: false, error: "id обязателен" }, { status: 400 });

    const body = await req.json().catch(() => null);
    if (!hasConfirmation(body)) {
      return NextResponse.json({ ok: false, error: "Подтвердите изменение подписки" }, { status: 400 });
    }
    const data: Record<string, unknown> = {};

    if (body.provider != null)    data.provider = String(body.provider).trim().slice(0, 50);
    if (body.name != null)        data.name = String(body.name).trim().slice(0, 200);
    if (body.costUsd !== undefined) data.costUsd = parseOptionalFiniteNumber(body.costUsd, "costUsd");
    if (body.costRub !== undefined) data.costRub = parseOptionalFiniteNumber(body.costRub, "costRub");
    if (body.billingDay !== undefined) data.billingDay = parseBillingDay(body.billingDay);
    if (body.billingType != null) data.billingType = parseBillingType(body.billingType);
    if (Object.prototype.hasOwnProperty.call(body, "active")) data.active = Boolean(body.active);
    if (body.notes !== undefined) data.notes = body.notes ? String(body.notes).slice(0, 1000) : null;
    if (body.startedAt !== undefined) data.startedAt = parseOptionalDate(body.startedAt, "startedAt");
    if (body.endsAt !== undefined) data.endsAt = parseOptionalDate(body.endsAt, "endsAt");

    const sub = await (prisma as any).apiSubscription.updateMany({
      where: { id, tenantId },
      data,
    });

    if (sub.count === 0) {
      return NextResponse.json({ ok: false, error: "Подписка не найдена" }, { status: 404 });
    }

    const fresh = await (prisma as any).apiSubscription.findFirst({ where: { id, tenantId } });

    return NextResponse.json({ ok: true, subscription: fresh });
  } catch (err: any) {
    if (err?.code === "P2025") {
      return NextResponse.json({ ok: false, error: "Подписка не найдена" }, { status: 404 });
    }
    if (isValidationError(err)) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 400 });
    }
    console.error("[PATCH subscriptions]", err?.message);
    return NextResponse.json({ ok: false, error: "Ошибка сервера" }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/admin/aray/subscriptions?id=XXX — удалить подписку
// ─────────────────────────────────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const auth = await requireSuperAdmin();
  if (!auth.authorized) return auth.response;
  const denied = await requireVoiceModule(auth.role);
  if (denied) return denied;
  const tenantId = getCurrentTenantId();

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) return NextResponse.json({ ok: false, error: "id обязателен" }, { status: 400 });
    const body = await req.json().catch(() => null);
    if (!hasConfirmation(body)) {
      return NextResponse.json({ ok: false, error: "Подтвердите удаление подписки" }, { status: 400 });
    }

    const result = await (prisma as any).apiSubscription.deleteMany({ where: { id, tenantId } });
    if (result.count === 0) {
      return NextResponse.json({ ok: false, error: "Подписка не найдена" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    if (err?.code === "P2025") {
      return NextResponse.json({ ok: false, error: "Подписка не найдена" }, { status: 404 });
    }
    console.error("[DELETE subscriptions]", err?.message);
    return NextResponse.json({ ok: false, error: "Ошибка сервера" }, { status: 500 });
  }
}
