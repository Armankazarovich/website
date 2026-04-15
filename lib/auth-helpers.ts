import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

// ── Роли ──────────────────────────────────────────────────────────────────────

/** Все роли сотрудников (без USER) */
export const ALL_STAFF_ROLES = [
  "SUPER_ADMIN", "ADMIN", "MANAGER", "COURIER",
  "ACCOUNTANT", "WAREHOUSE", "SELLER",
] as const;

/** Роли с доступом к управлению (заказы, товары, CRM) */
export const MANAGEMENT_ROLES = ["SUPER_ADMIN", "ADMIN", "MANAGER"] as const;

/** Роли-администраторы (полный доступ) */
export const ADMIN_ROLES = ["SUPER_ADMIN", "ADMIN"] as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Получить сессию и роль. Возвращает null если не авторизован */
export async function getSessionRole() {
  const session = await auth();
  if (!session?.user) return null;
  return {
    session,
    role: session.user.role as string,
    userId: session.user.id as string,
    email: session.user.email,
  };
}

/** Проверяет что пользователь — ADMIN или SUPER_ADMIN */
export async function requireAdmin() {
  const data = await getSessionRole();
  if (!data || !ADMIN_ROLES.includes(data.role as any)) {
    return { authorized: false as const, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { authorized: true as const, ...data };
}

/** Проверяет что пользователь — менеджер+ (ADMIN, MANAGER, SUPER_ADMIN) */
export async function requireManager() {
  const data = await getSessionRole();
  if (!data || !MANAGEMENT_ROLES.includes(data.role as any)) {
    return { authorized: false as const, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { authorized: true as const, ...data };
}

/** Проверяет что пользователь — любой сотрудник */
export async function requireStaff() {
  const data = await getSessionRole();
  if (!data || !ALL_STAFF_ROLES.includes(data.role as any)) {
    return { authorized: false as const, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { authorized: true as const, ...data };
}

/** Проверяет что пользователь имеет одну из указанных ролей */
export async function requireRole(...roles: string[]) {
  const data = await getSessionRole();
  if (!data || !roles.includes(data.role)) {
    return { authorized: false as const, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { authorized: true as const, ...data };
}
