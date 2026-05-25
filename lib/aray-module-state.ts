import "server-only";

import { prisma } from "@/lib/prisma";
import { DEFAULT_TENANT_ID, getCurrentTenantId } from "@/lib/tenant-context";
import {
  ARAY_CORE_MODULE_IDS,
  arayModuleRegistry,
  getArayModuleHealth,
  getArayModuleMissingDependencies,
  getArayModulePassport,
  type ArayModuleBillingPlan,
  type ArayModuleConnectorState,
  type ArayModuleControlItem,
  type ArayModulePassport,
  type ArayModuleRoleState,
  type ArayModuleSubscriptionState,
} from "@/lib/aray-module-registry";

const ROLE_POLICIES: Record<string, string[]> = {
  "core.design-system": ["SUPER_ADMIN", "ADMIN"],
  "core.popup-system": ["SUPER_ADMIN", "ADMIN"],
  "core.motion-system": ["SUPER_ADMIN", "ADMIN"],
  "core.app-identity": ["SUPER_ADMIN", "ADMIN"],
  "core.module-control-center": ["SUPER_ADMIN", "ADMIN"],
  "core.connector-vault": ["SUPER_ADMIN", "ADMIN"],
  "core.notifications": ["SUPER_ADMIN", "ADMIN", "MANAGER", "COURIER", "ACCOUNTANT", "WAREHOUSE", "SELLER"],
  "core.aray-voice": ["SUPER_ADMIN", "ADMIN", "MANAGER", "SELLER"],
  "business.orders": ["SUPER_ADMIN", "ADMIN", "MANAGER", "COURIER", "ACCOUNTANT", "WAREHOUSE", "SELLER"],
  "business.director-cabinet": ["SUPER_ADMIN", "ADMIN", "MANAGER", "COURIER", "ACCOUNTANT", "WAREHOUSE", "SELLER"],
  "business.role-os": ["SUPER_ADMIN", "ADMIN", "MANAGER"],
  "business.aray-messenger": ["SUPER_ADMIN", "ADMIN", "MANAGER", "COURIER", "ACCOUNTANT", "WAREHOUSE", "SELLER"],
  "business.terminal": ["SUPER_ADMIN", "ADMIN", "MANAGER", "COURIER", "ACCOUNTANT", "WAREHOUSE", "SELLER"],
  "finance.wallet-ledger": ["SUPER_ADMIN", "ADMIN", "ACCOUNTANT"],
  "marketplace.marketplace": ["SUPER_ADMIN", "ADMIN", "MANAGER", "SELLER"],
};

const CONNECTOR_REQUIREMENTS: Record<string, string[]> = {
  "core.notifications": ["notifications"],
  "business.orders": ["orders", "notifications"],
  "business.director-cabinet": ["orders", "notifications"],
  "business.role-os": ["notifications"],
  "business.aray-messenger": ["notifications", "ai"],
  "business.terminal": ["orders", "catalog", "search", "notifications", "ai"],
  "finance.wallet-ledger": ["orders", "notifications"],
  "marketplace.marketplace": ["catalog", "search"],
};

const AVAILABLE_CONNECTOR_STATUSES = new Set(["ACTIVE", "VENDOR_READY", "INTERNAL"]);
const PAID_TENANT_PLANS = new Set(["pro", "enterprise"]);
const BILLING_PLANS = new Set<ArayModuleBillingPlan>(["free", "paid", "usage", "enterprise"]);
const ROLE_OPTIONS = new Set([
  "SUPER_ADMIN",
  "ADMIN",
  "MANAGER",
  "SELLER",
  "WAREHOUSE",
  "ACCOUNTANT",
  "COURIER",
  "USER",
]);
const CONNECTOR_TYPE_OPTIONS = new Set(["orders", "catalog", "search", "notifications", "ai"]);
const BUILT_IN_CONNECTORS = ["orders", "catalog", "search", "notifications", "ai"].map((type) => ({
  type,
  provider: "pilorus",
  status: "INTERNAL",
  trustLevel: "INTERNAL",
}));

type PersistedModuleState = {
  enabled: boolean;
  locked: boolean;
  rolePolicy: unknown;
  subscriptionPlan: string | null;
  connectorPolicy: unknown;
  reason: string | null;
  updatedAt: Date;
  updatedById: string | null;
};

function isCoreModule(moduleId: string) {
  return (ARAY_CORE_MODULE_IDS as readonly string[]).includes(moduleId);
}

function defaultModuleEnabled(module: ArayModulePassport) {
  return module.status === "ready" || module.status === "beta";
}

function readPolicyStringArray(policy: unknown, key: string, fallback: string[]) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) return fallback;
  const value = (policy as Record<string, unknown>)[key];
  if (!Array.isArray(value)) return fallback;
  const items = value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  return items.length > 0 ? Array.from(new Set(items)) : fallback;
}

function getAllowedRoles(module: ArayModulePassport, state?: PersistedModuleState | null) {
  return readPolicyStringArray(state?.rolePolicy, "allowedRoles", ROLE_POLICIES[module.id] || ["SUPER_ADMIN", "ADMIN"]);
}

function getConnectorRequirements(module: ArayModulePassport, state?: PersistedModuleState | null) {
  return readPolicyStringArray(state?.connectorPolicy, "requiredTypes", CONNECTOR_REQUIREMENTS[module.id] || []);
}

function getSubscriptionPlan(module: ArayModulePassport, state?: PersistedModuleState | null): ArayModuleBillingPlan {
  const plan = state?.subscriptionPlan;
  return plan && BILLING_PLANS.has(plan as ArayModuleBillingPlan)
    ? (plan as ArayModuleBillingPlan)
    : module.billing.plan;
}

function normalizePolicyRoles(roles: unknown, fallback: string[]) {
  const items = Array.isArray(roles) ? roles : fallback;
  const normalized = items.filter((item): item is string => typeof item === "string" && ROLE_OPTIONS.has(item));
  return Array.from(new Set(["SUPER_ADMIN", ...normalized]));
}

function normalizeConnectorTypes(types: unknown, fallback: string[]) {
  const items = Array.isArray(types) ? types : fallback;
  return Array.from(
    new Set(
      items.filter((item): item is string => typeof item === "string" && CONNECTOR_TYPE_OPTIONS.has(item)),
    ),
  );
}

function normalizeBillingPlan(plan: unknown, fallback: ArayModuleBillingPlan): ArayModuleBillingPlan {
  return typeof plan === "string" && BILLING_PLANS.has(plan as ArayModuleBillingPlan)
    ? (plan as ArayModuleBillingPlan)
    : fallback;
}

function buildRoleState(module: ArayModulePassport, currentRole: string, state?: PersistedModuleState | null): ArayModuleRoleState {
  const allowedRoles = getAllowedRoles(module, state);
  const canView = currentRole === "SUPER_ADMIN" || allowedRoles.includes(currentRole);
  const canManage = currentRole === "SUPER_ADMIN";

  return {
    currentRole,
    allowedRoles,
    canView,
    canManage,
  };
}

function buildSubscriptionState(plan: ArayModuleBillingPlan, tenantPlan: string): ArayModuleSubscriptionState {
  if (plan === "free") {
    return {
      plan,
      tenantPlan,
      status: "available",
      label: "Входит в базу",
    };
  }

  if (plan === "enterprise") {
    return {
      plan,
      tenantPlan,
      status: tenantPlan === "enterprise" ? "available" : "enterprise-only",
      label: tenantPlan === "enterprise" ? "Корпоративный тариф активен" : "Нужен Enterprise",
    };
  }

  const available = PAID_TENANT_PLANS.has(tenantPlan);
  return {
    plan,
    tenantPlan,
    status: available ? "available" : "needs-plan",
    label: available ? "Доступен по тарифу" : "Нужен платный тариф",
  };
}

async function buildConnectorStates(tenantId: string) {
  const connectors = await prisma.terminalConnector.findMany({
    where: { tenantId },
    select: {
      type: true,
      provider: true,
      status: true,
      trustLevel: true,
    },
  }).catch(() => []);

  return tenantId === DEFAULT_TENANT_ID ? [...BUILT_IN_CONNECTORS, ...connectors] : connectors;
}

function buildConnectorState(
  module: ArayModulePassport,
  connectors: Awaited<ReturnType<typeof buildConnectorStates>>,
  state?: PersistedModuleState | null,
): ArayModuleConnectorState {
  const requiredTypes = getConnectorRequirements(module, state);
  if (requiredTypes.length === 0) {
    return {
      status: "not-required",
      requiredTypes: [],
      activeTypes: [],
      missingTypes: [],
    };
  }

  const activeTypes = Array.from(
    new Set(
      connectors
        .filter((connector) => requiredTypes.includes(connector.type))
        .filter((connector) => AVAILABLE_CONNECTOR_STATUSES.has(connector.status) || AVAILABLE_CONNECTOR_STATUSES.has(connector.trustLevel))
        .map((connector) => connector.type),
    ),
  );
  const missingTypes = requiredTypes.filter((type) => !activeTypes.includes(type));

  return {
    status: missingTypes.length === 0 ? "ready" : "missing",
    requiredTypes,
    activeTypes,
    missingTypes,
  };
}

function activationBlockers({
  module,
  missingDependencies,
  subscription,
  connectors,
}: {
  module: ArayModulePassport;
  missingDependencies: string[];
  subscription: ArayModuleSubscriptionState;
  connectors: ArayModuleConnectorState;
}) {
  const blockers: string[] = [];
  if (module.status === "draft") blockers.push("Модуль в черновике: не выводим как рабочий раздел");
  if (module.status === "disabled") blockers.push("Модуль отключен в паспорте");
  if (missingDependencies.length > 0) blockers.push(`Нет зависимостей: ${missingDependencies.join(", ")}`);
  if (subscription.status !== "available") blockers.push(subscription.label);
  if (connectors.status === "missing") blockers.push(`Нет подключений: ${connectors.missingTypes.join(", ")}`);
  return blockers;
}

export async function ensureArayModuleStates(tenantId = getCurrentTenantId()) {
  const existing = await prisma.arayModuleState.findMany({
    where: { tenantId },
    select: { moduleId: true },
  });
  const existingIds = new Set(existing.map((state) => state.moduleId));
  const missingModules = arayModuleRegistry.filter((moduleItem) => !existingIds.has(moduleItem.id));

  for (const moduleItem of missingModules) {
    const passport = moduleItem as ArayModulePassport;
    try {
      await prisma.arayModuleState.upsert({
        where: {
          tenantId_moduleId: {
            tenantId,
            moduleId: passport.id,
          },
        },
        update: {},
        create: {
          tenantId,
          moduleId: passport.id,
          enabled: defaultModuleEnabled(passport),
          locked: isCoreModule(passport.id),
          rolePolicy: { allowedRoles: getAllowedRoles(passport) },
          subscriptionPlan: passport.billing.plan,
          connectorPolicy: { requiredTypes: getConnectorRequirements(passport) },
        },
      });
    } catch (error: any) {
      if (error?.code !== "P2002") throw error;
    }
  }
}

export async function getArayModuleControlItemsForRole({
  role,
  tenantId = getCurrentTenantId(),
}: {
  role: string;
  tenantId?: string;
}): Promise<ArayModuleControlItem[]> {
  await ensureArayModuleStates(tenantId);

  const [states, tenant, connectors] = await Promise.all([
    prisma.arayModuleState.findMany({ where: { tenantId } }),
    prisma.tenant.findUnique({ where: { slug: tenantId }, select: { plan: true, active: true } }).catch(() => null),
    buildConnectorStates(tenantId),
  ]);

  const stateByModule = new Map(states.map((state) => [state.moduleId, state as PersistedModuleState]));
  const tenantPlan = tenant?.active === false ? "inactive" : tenant?.plan || "free";

  const baseItems = arayModuleRegistry.map((module) => {
    const passport = module as ArayModulePassport;
    const persisted = stateByModule.get(passport.id);
    const requestedEnabled = persisted?.enabled ?? defaultModuleEnabled(passport);
    const locked = persisted?.locked ?? isCoreModule(passport.id);
    const missingDependencies = getArayModuleMissingDependencies(passport);
    const roleState = buildRoleState(passport, role, persisted);
    const subscription = buildSubscriptionState(getSubscriptionPlan(passport, persisted), tenantPlan);
    const connectorsState = buildConnectorState(passport, connectors, persisted);
    const ownBlockers = activationBlockers({
      module: passport,
      missingDependencies,
      subscription,
      connectors: connectorsState,
    });
    const roleBlockers: string[] = [];
    if (!roleState.canManage) roleBlockers.push("Только SUPER_ADMIN может менять модуль");
    if (locked) roleBlockers.push("Ядро защищено от отключения");

    return {
      passport,
      missingDependencies,
      requestedEnabled,
      locked,
      ownBlockers,
      roleBlockers,
      role: roleState,
      subscription,
      connectors: connectorsState,
      stateUpdatedAt: persisted?.updatedAt?.toISOString() ?? null,
      stateUpdatedById: persisted?.updatedById ?? null,
    };
  });

  const baseById = new Map(baseItems.map((item) => [item.passport.id, item]));
  const resolved = new Map<string, { effectiveEnabled: boolean; dependencyBlockers: string[] }>();
  const resolving = new Set<string>();

  const resolveEffective = (moduleId: string): { effectiveEnabled: boolean; dependencyBlockers: string[] } => {
    const cached = resolved.get(moduleId);
    if (cached) return cached;

    const item = baseById.get(moduleId);
    if (!item) {
      const missing = { effectiveEnabled: false, dependencyBlockers: [`Зависимость не найдена: ${moduleId}`] };
      resolved.set(moduleId, missing);
      return missing;
    }

    if (resolving.has(moduleId)) {
      const cycle = { effectiveEnabled: false, dependencyBlockers: [`Цикл зависимостей: ${moduleId}`] };
      resolved.set(moduleId, cycle);
      return cycle;
    }

    resolving.add(moduleId);
    const dependencyBlockers = item.passport.dependencies.flatMap((dependencyId) => {
      const dependency = resolveEffective(dependencyId);
      return dependency.effectiveEnabled ? [] : [`Зависимость выключена: ${dependencyId}`];
    });
    resolving.delete(moduleId);

    const effectiveEnabled =
      item.requestedEnabled &&
      item.ownBlockers.length === 0 &&
      dependencyBlockers.length === 0;

    const result = { effectiveEnabled, dependencyBlockers };
    resolved.set(moduleId, result);
    return result;
  };

  return baseItems.map((item) => {
    const resolvedItem = resolveEffective(item.passport.id);
    const enableBlockers = [...item.ownBlockers, ...resolvedItem.dependencyBlockers];
    const canToggle = item.role.canManage && !item.locked && (item.requestedEnabled || enableBlockers.length === 0);

    return {
      ...item.passport,
      health: getArayModuleHealth(item.passport),
      missingDependencies: item.missingDependencies,
      enabledByDefault: defaultModuleEnabled(item.passport),
      canToggle,
      requestedEnabled: item.requestedEnabled,
      effectiveEnabled: resolvedItem.effectiveEnabled,
      locked: item.locked,
      toggleBlockedReasons: [...item.roleBlockers, ...enableBlockers],
      role: item.role,
      subscription: item.subscription,
      connectors: item.connectors,
      stateUpdatedAt: item.stateUpdatedAt,
      stateUpdatedById: item.stateUpdatedById,
    };
  });
}

export async function setArayModuleEnabled({
  moduleId,
  enabled,
  role,
  userId,
  tenantId = getCurrentTenantId(),
}: {
  moduleId: string;
  enabled: boolean;
  role: string;
  userId: string;
  tenantId?: string;
}) {
  const modulePassport = getArayModulePassport(moduleId);
  if (!modulePassport) {
    return { ok: false as const, status: 404, error: "Модуль не найден" };
  }

  const currentItems = await getArayModuleControlItemsForRole({ role, tenantId });
  const current = currentItems.find((item) => item.id === moduleId);
  if (!current) {
    return { ok: false as const, status: 404, error: "Модуль не найден" };
  }

  if (!current.role.canManage) {
    return { ok: false as const, status: 403, error: "Недостаточно прав для управления модулем" };
  }

  if (current.locked) {
    return { ok: false as const, status: 409, error: "Ядро нельзя отключить из панели модулей" };
  }

  if (enabled) {
    const activationReasons = current.toggleBlockedReasons;
    if (activationReasons.length > 0) {
      return { ok: false as const, status: 409, error: activationReasons.join("; ") };
    }
  }

  await prisma.arayModuleState.upsert({
    where: {
      tenantId_moduleId: {
        tenantId,
        moduleId,
      },
    },
    update: {
      enabled,
      reason: enabled ? null : "disabled-from-module-control-center",
      updatedById: userId,
    },
    create: {
      tenantId,
      moduleId,
      enabled,
      locked: isCoreModule(modulePassport.id),
      rolePolicy: { allowedRoles: getAllowedRoles(modulePassport) },
      subscriptionPlan: modulePassport.billing.plan,
      connectorPolicy: { requiredTypes: getConnectorRequirements(modulePassport) },
      reason: enabled ? null : "disabled-from-module-control-center",
      updatedById: userId,
    },
  });

  return {
    ok: true as const,
    modules: await getArayModuleControlItemsForRole({ role, tenantId }),
  };
}

export async function setArayModulePolicy({
  moduleId,
  role,
  userId,
  allowedRoles,
  subscriptionPlan,
  requiredConnectorTypes,
  tenantId = getCurrentTenantId(),
}: {
  moduleId: string;
  role: string;
  userId: string;
  allowedRoles?: unknown;
  subscriptionPlan?: unknown;
  requiredConnectorTypes?: unknown;
  tenantId?: string;
}) {
  const modulePassport = getArayModulePassport(moduleId);
  if (!modulePassport) {
    return { ok: false as const, status: 404, error: "Модуль не найден" };
  }

  if (role !== "SUPER_ADMIN") {
    return { ok: false as const, status: 403, error: "Только SUPER_ADMIN может менять политику модуля" };
  }

  const currentItems = await getArayModuleControlItemsForRole({ role, tenantId });
  const current = currentItems.find((item) => item.id === moduleId);
  if (!current) {
    return { ok: false as const, status: 404, error: "Модуль не найден" };
  }

  const normalizedRoles = normalizePolicyRoles(allowedRoles, current.role.allowedRoles);
  const normalizedPlan = normalizeBillingPlan(subscriptionPlan, current.subscription.plan);
  const normalizedConnectors = normalizeConnectorTypes(requiredConnectorTypes, current.connectors.requiredTypes);

  await prisma.arayModuleState.upsert({
    where: {
      tenantId_moduleId: {
        tenantId,
        moduleId,
      },
    },
    update: {
      rolePolicy: { allowedRoles: normalizedRoles },
      subscriptionPlan: normalizedPlan,
      connectorPolicy: { requiredTypes: normalizedConnectors },
      updatedById: userId,
      reason: "policy-updated-from-module-control-center",
    },
    create: {
      tenantId,
      moduleId,
      enabled: defaultModuleEnabled(modulePassport),
      locked: isCoreModule(modulePassport.id),
      rolePolicy: { allowedRoles: normalizedRoles },
      subscriptionPlan: normalizedPlan,
      connectorPolicy: { requiredTypes: normalizedConnectors },
      updatedById: userId,
      reason: "policy-created-from-module-control-center",
    },
  });

  return {
    ok: true as const,
    modules: await getArayModuleControlItemsForRole({ role, tenantId }),
  };
}

export async function getArayModuleAccess({
  moduleId,
  role,
  tenantId = getCurrentTenantId(),
}: {
  moduleId: string;
  role: string;
  tenantId?: string;
}) {
  const modules = await getArayModuleControlItemsForRole({ role, tenantId });
  const moduleAccess = modules.find((item) => item.id === moduleId) || null;

  if (!moduleAccess) {
    return {
      allowed: false,
      module: moduleAccess,
      reasons: ["module-not-registered"],
    };
  }

  const reasons: string[] = [];
  if (!moduleAccess.effectiveEnabled) {
    reasons.push(moduleAccess.requestedEnabled ? "module-not-ready" : "module-disabled");
  }
  if (!moduleAccess.role.canView) {
    reasons.push("role-not-allowed");
  }

  return {
    allowed: reasons.length === 0,
    module: moduleAccess,
    reasons: Array.from(new Set(reasons)),
  };
}
