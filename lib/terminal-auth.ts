import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requireArayModuleAccess } from "@/lib/aray-module-auth";

export const TERMINAL_STAFF_ROLES = ["SUPER_ADMIN", "ADMIN", "MANAGER", "COURIER", "ACCOUNTANT", "WAREHOUSE", "SELLER"];
export const TERMINAL_ADMIN_ROLES = ["SUPER_ADMIN", "ADMIN"];
export const TERMINAL_MODULE_ID = "business.terminal";

export async function requireTerminalStaff() {
  const session = await auth();
  const role = session?.user?.role;
  if (!session || !role || !TERMINAL_STAFF_ROLES.includes(role)) {
    return { authorized: false as const, response: NextResponse.json({ error: "Unauthorized" }, { status: 403 }) };
  }
  const moduleAccess = await requireArayModuleAccess({ moduleId: TERMINAL_MODULE_ID, role });
  if (!moduleAccess.authorized) return moduleAccess;
  return { authorized: true as const, session };
}

export async function requireTerminalAdmin() {
  const session = await auth();
  const role = session?.user?.role;
  if (!session || !role || !TERMINAL_ADMIN_ROLES.includes(role)) {
    return { authorized: false as const, response: NextResponse.json({ error: "Unauthorized" }, { status: 403 }) };
  }
  const moduleAccess = await requireArayModuleAccess({ moduleId: TERMINAL_MODULE_ID, role });
  if (!moduleAccess.authorized) return moduleAccess;
  return { authorized: true as const, session };
}
