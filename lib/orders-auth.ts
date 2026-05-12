import "server-only";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requireArayModuleAccess } from "@/lib/aray-module-auth";

export const ORDERS_STAFF_ROLES = ["SUPER_ADMIN", "ADMIN", "MANAGER", "COURIER", "ACCOUNTANT", "WAREHOUSE", "SELLER"];
export const ORDERS_ADMIN_ROLES = ["SUPER_ADMIN", "ADMIN"];
export const ORDERS_MODULE_ID = "business.orders";

export async function requireOrdersStaff() {
  const session = await auth();
  const role = session?.user?.role;
  if (!session || !role || !ORDERS_STAFF_ROLES.includes(role)) {
    return { authorized: false as const, response: NextResponse.json({ error: "Unauthorized" }, { status: 403 }) };
  }

  const moduleAccess = await requireArayModuleAccess({ moduleId: ORDERS_MODULE_ID, role });
  if (!moduleAccess.authorized) return moduleAccess;

  return { authorized: true as const, session };
}

export async function requireOrdersAdmin() {
  const session = await auth();
  const role = session?.user?.role;
  if (!session || !role || !ORDERS_ADMIN_ROLES.includes(role)) {
    return { authorized: false as const, response: NextResponse.json({ error: "Unauthorized" }, { status: 403 }) };
  }

  const moduleAccess = await requireArayModuleAccess({ moduleId: ORDERS_MODULE_ID, role });
  if (!moduleAccess.authorized) return moduleAccess;

  return { authorized: true as const, session };
}
