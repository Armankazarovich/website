export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { requireArayModuleAccess } from "@/lib/aray-module-auth";
import { getArayConnectorBundles, getArayProviderStatuses, getArayProviderSummary } from "@/lib/aray-provider-matrix";
import { getArayModuleControlItemsForRole } from "@/lib/aray-module-state";
import { getCurrentTenantId } from "@/lib/tenant-context";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;
  const moduleAccess = await requireArayModuleAccess({ moduleId: "core.connector-vault", role: auth.role });
  if (!moduleAccess.authorized) return moduleAccess.response;

  const providers = getArayProviderStatuses();
  const tenantId = getCurrentTenantId();
  const [modules, dbConnectors] = await Promise.all([
    getArayModuleControlItemsForRole({ role: auth.role, tenantId }),
    prisma.terminalConnector.findMany({
      where: { tenantId },
      orderBy: [{ status: "asc" }, { type: "asc" }, { provider: "asc" }],
      select: {
        id: true,
        name: true,
        type: true,
        provider: true,
        status: true,
        trustLevel: true,
        direction: true,
        mode: true,
        capabilities: true,
        updatedAt: true,
      },
    }).catch(() => []),
  ]);

  return NextResponse.json({
    ok: true,
    summary: getArayProviderSummary(providers),
    providers,
    bundles: getArayConnectorBundles(providers),
    moduleConnectors: modules
      .filter((module) => module.connectors.status !== "not-required")
      .map((module) => ({
        moduleId: module.id,
        moduleName: module.name,
        status: module.connectors.status,
        requiredTypes: module.connectors.requiredTypes,
        activeTypes: module.connectors.activeTypes,
        missingTypes: module.connectors.missingTypes,
        effectiveEnabled: module.effectiveEnabled,
      })),
    dbConnectors,
    note: "Секреты не возвращаются. Показываем только названия ключей и статус заполнения.",
  });
}
