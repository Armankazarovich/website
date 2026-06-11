export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAdmin, requireSuperAdmin } from "@/lib/auth-helpers";
import { requireArayModuleAccess } from "@/lib/aray-module-auth";
import { getArayModuleRegistrySummary } from "@/lib/aray-module-registry";
import {
  getArayModuleControlItemsForRole,
  setArayModuleEnabled,
  setArayModulePolicy,
} from "@/lib/aray-module-state";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;
  const moduleAccess = await requireArayModuleAccess({ moduleId: "core.module-control-center", role: auth.role });
  if (!moduleAccess.authorized) return moduleAccess.response;

  return NextResponse.json({
    ok: true,
    summary: getArayModuleRegistrySummary(),
    modules: await getArayModuleControlItemsForRole({ role: auth.role }),
    note: "Module Control Center works from registry + ArayModuleState in DB. Toggles check role, plan, dependencies and connectors.",
  });
}

export async function PATCH(req: Request) {
  const auth = await requireSuperAdmin();
  if (!auth.authorized) return auth.response;
  const moduleAccess = await requireArayModuleAccess({ moduleId: "core.module-control-center", role: auth.role });
  if (!moduleAccess.authorized) return moduleAccess.response;

  const body = await req.json().catch(() => null);
  const action = typeof body?.action === "string" ? body.action : "toggle";
  const moduleId = typeof body?.moduleId === "string" ? body.moduleId : "";

  if (!moduleId) {
    return NextResponse.json({ ok: false, error: "moduleId is required" }, { status: 400 });
  }

  if (body?.confirm !== true) {
    return NextResponse.json({ ok: false, error: "confirmation is required" }, { status: 400 });
  }

  if (action === "policy") {
    const result = await setArayModulePolicy({
      moduleId,
      role: auth.role,
      userId: auth.userId,
      allowedRoles: body?.allowedRoles,
      subscriptionPlan: body?.subscriptionPlan,
      requiredConnectorTypes: body?.requiredConnectorTypes,
    });

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
    }

    return NextResponse.json({
      ok: true,
      summary: getArayModuleRegistrySummary(),
      modules: result.modules,
    });
  }

  const enabled = typeof body?.enabled === "boolean" ? body.enabled : null;
  if (enabled === null) {
    return NextResponse.json({ ok: false, error: "enabled is required" }, { status: 400 });
  }

  const result = await setArayModuleEnabled({
    moduleId,
    enabled,
    role: auth.role,
    userId: auth.userId,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    ok: true,
    summary: getArayModuleRegistrySummary(),
    modules: result.modules,
  });
}
