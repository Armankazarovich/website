export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireArayModuleAccess } from "@/lib/aray-module-auth";
import { canAccess } from "@/lib/permissions";
import { getCurrentTenantId } from "@/lib/tenant-context";
import {
  canBusinessRoleAccessAction,
  canBusinessRoleAccessSection,
  getUserBusinessRoleAccess,
} from "@/lib/business-role-access";
import {
  createRoleSeedFromBlueprint,
  getDynamicRoleBlueprint,
  getDynamicRoleBlueprints,
  normalizeBusinessBaseRole,
  normalizeBusinessRoleKey,
  normalizeBusinessRoleScope,
  type BusinessBaseRole,
} from "@/lib/dynamic-role-os";
import {
  NOTIFICATION_EVENT_DEFINITIONS,
  normalizeNotificationEventKey,
} from "@/lib/notification-settings";

const EDIT_ROLES = new Set(["SUPER_ADMIN", "ADMIN"]);
const PLATFORM_BASE_ROLES = new Set(["SUPER_ADMIN", "ADMIN"]);
const PLATFORM_PERMISSION_ACTIONS = new Set(["roles.manage", "business.manage"]);
const CHANNELS = new Set(["PUSH", "TELEGRAM", "EMAIL", "SMS", "SYSTEM", "ARAY"]);
const DEFAULT_NOTIFICATION_CHANNELS = ["SYSTEM", "ARAY"];

type NotificationSeed = {
  events: string[];
  channels: string[];
};

function canEdit(role: string | null | undefined) {
  return EDIT_ROLES.has(role || "");
}

function isPlatformAdmin(role: string | null | undefined) {
  return EDIT_ROLES.has(role || "");
}

function getText(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function normalizeChannels(value: unknown, fallback: string[] = DEFAULT_NOTIFICATION_CHANNELS) {
  const source = Array.isArray(value) ? value : fallback;
  const channels = source.filter((item): item is string => typeof item === "string" && CHANNELS.has(item));
  return channels.length ? Array.from(new Set(channels)) : [...fallback];
}

function normalizeEvents(value: unknown, fallback: string[] = []) {
  const source = Array.isArray(value) ? value : fallback;
  const events = source.reduce<string[]>((items, item) => {
    const eventKey = normalizeNotificationEventKey(item);
    if (eventKey) items.push(eventKey);
    return items;
  }, []);
  return events.length ? Array.from(new Set(events)) : [...fallback];
}

function normalizeNotificationSeed(value: unknown, fallback?: NotificationSeed): NotificationSeed {
  const source = value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
  return {
    events: normalizeEvents(source.events, fallback?.events ?? []),
    channels: normalizeChannels(source.channels, fallback?.channels ?? DEFAULT_NOTIFICATION_CHANNELS),
  };
}

function serializeJsonObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

function getPermissionActions(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const actions = (value as Record<string, unknown>).actions;
  return Array.isArray(actions)
    ? actions.filter((item): item is string => typeof item === "string")
    : [];
}

function validateRoleMutationPrivilege({
  viewerRole,
  baseRole,
  permissions,
}: {
  viewerRole: string | null | undefined;
  baseRole: string | null | undefined;
  permissions?: unknown;
}) {
  if (isPlatformAdmin(viewerRole)) return null;
  if (baseRole && PLATFORM_BASE_ROLES.has(baseRole)) {
    return "Только платформенный администратор может выдавать ADMIN/SUPER_ADMIN";
  }
  const elevatedAction = getPermissionActions(permissions).find((action) => PLATFORM_PERMISSION_ACTIONS.has(action));
  if (elevatedAction) {
    return `Только платформенный администратор может выдавать право ${elevatedAction}`;
  }
  return null;
}

function serializeBusinessRole(role: any) {
  return {
    id: role.id,
    tenantId: role.tenantId,
    roleKey: role.roleKey,
    label: role.label,
    description: role.description,
    baseRole: role.baseRole,
    scope: role.scope,
    roleKind: role.roleKind,
    permissions: serializeJsonObject(role.permissions),
    notificationSeed: normalizeNotificationSeed(role.notificationSeed),
    isSystem: role.isSystem,
    isActive: role.isActive,
    memberCount: role._count?.members ?? role.members?.length ?? 0,
    preferenceCount: role._count?.notificationPreferences ?? role.notificationPreferences?.length ?? 0,
    members: (role.members ?? []).map((member: any) => ({
      id: member.id,
      userId: member.userId,
      status: member.status,
      isPrimary: Boolean(member.isPrimary),
      name: member.user?.name ?? null,
      email: member.user?.email ?? null,
      role: member.user?.role ?? null,
    })),
    notificationPreferences: (role.notificationPreferences ?? []).map((preference: any) => ({
      id: preference.id,
      audienceKey: preference.audienceKey,
      audienceLabel: preference.audienceLabel,
      eventKey: preference.eventKey,
      enabled: preference.enabled,
      channels: normalizeChannels(preference.channels),
      quietHoursEnabled: preference.quietHoursEnabled,
      quietStart: preference.quietStart,
      quietEnd: preference.quietEnd,
      weekendsMuted: preference.weekendsMuted,
    })),
    createdAt: role.createdAt?.toISOString?.() ?? role.createdAt,
    updatedAt: role.updatedAt?.toISOString?.() ?? role.updatedAt,
  };
}

async function requireViewer() {
  const session = await auth();
  const role = session?.user?.role;
  const tenantId = getCurrentTenantId();
  const userId = session?.user?.id as string | undefined;
  const businessAccess = userId ? await getUserBusinessRoleAccess(userId, tenantId) : null;
  const allowed =
    Boolean(session) &&
    (canAccess(role, "business_settings") ||
      canAccess(role, "notifications") ||
      canAccess(role, "staff") ||
      (businessAccess
        ? canBusinessRoleAccessSection(businessAccess, "business_settings") ||
          canBusinessRoleAccessSection(businessAccess, "notifications") ||
          canBusinessRoleAccessSection(businessAccess, "staff")
        : false));

  if (!allowed) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 403 }),
    };
  }

  const moduleAccess = await requireArayModuleAccess({
    moduleId: "business.role-os",
    role: role as string,
  });
  if (!moduleAccess.authorized) {
    return {
      ok: false as const,
      response: moduleAccess.response,
    };
  }

  return {
    ok: true as const,
    session,
    role: role as string,
    tenantId,
    editable: canEdit(role) || (businessAccess ? canBusinessRoleAccessAction(businessAccess, "roles.manage") : false),
  };
}

async function findRoleOrResponse(tenantId: string, roleId: unknown) {
  const id = getText(roleId);
  if (!id) {
    return {
      role: null,
      response: NextResponse.json({ error: "Не указана роль" }, { status: 400 }),
    };
  }

  const role = await prisma.businessRole.findFirst({
    where: { id, tenantId },
  });

  if (!role) {
    return {
      role: null,
      response: NextResponse.json({ error: "Роль не найдена" }, { status: 404 }),
    };
  }

  return { role, response: null };
}

async function seedAudiencePreferences(role: {
  id: string;
  tenantId: string;
  roleKey: string;
  label: string;
  notificationSeed: unknown;
}) {
  const seed = normalizeNotificationSeed(role.notificationSeed, {
    events: NOTIFICATION_EVENT_DEFINITIONS.map((event) => event.key),
    channels: DEFAULT_NOTIFICATION_CHANNELS,
  });

  const eventKeys = seed.events.length
    ? seed.events
    : NOTIFICATION_EVENT_DEFINITIONS.map((event) => event.key);

  await Promise.all(
    eventKeys.map((eventKey) =>
      prisma.notificationAudiencePreference.upsert({
        where: {
          tenantId_audienceKey_eventKey: {
            tenantId: role.tenantId,
            audienceKey: role.roleKey,
            eventKey,
          },
        },
        create: {
          tenantId: role.tenantId,
          audienceKey: role.roleKey,
          audienceLabel: role.label,
          businessRoleId: role.id,
          eventKey,
          enabled: true,
          channels: seed.channels as Prisma.InputJsonValue,
          quietHoursEnabled: false,
          metadata: { source: "dynamic-role-os" },
        },
        update: {
          audienceLabel: role.label,
          businessRoleId: role.id,
          channels: seed.channels as Prisma.InputJsonValue,
          metadata: { source: "dynamic-role-os", refreshedAt: new Date().toISOString() },
        },
      }),
    ),
  );

  await prisma.notificationAudiencePreference.updateMany({
    where: {
      tenantId: role.tenantId,
      audienceKey: role.roleKey,
      businessRoleId: role.id,
      eventKey: { notIn: eventKeys },
    },
    data: {
      enabled: false,
      metadata: { source: "dynamic-role-os", mutedBySeedAt: new Date().toISOString() },
    },
  });

  return eventKeys.length;
}

async function getPayload(tenantId: string, editable: boolean) {
  const [roles, staffCandidates] = await Promise.all([
    prisma.businessRole.findMany({
      where: { tenantId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
        notificationPreferences: {
          orderBy: { eventKey: "asc" },
        },
        _count: {
          select: {
            members: true,
            notificationPreferences: true,
          },
        },
      },
      orderBy: [
        { isActive: "desc" },
        { roleKind: "asc" },
        { createdAt: "asc" },
      ],
    }),
    prisma.user.findMany({
      where: {
        tenantId,
        role: { not: "USER" },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        staffStatus: true,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  const savedKeys = new Set(roles.map((role) => role.roleKey));

  return {
    canEdit: editable,
    roles: roles.map(serializeBusinessRole),
    blueprints: getDynamicRoleBlueprints().map((blueprint) => ({
      ...blueprint,
      created: savedKeys.has(blueprint.key),
    })),
    staffCandidates,
    events: NOTIFICATION_EVENT_DEFINITIONS.map((event) => ({
      key: event.key,
      label: event.label,
      description: event.description,
    })),
  };
}

export async function GET() {
  const viewer = await requireViewer();
  if (!viewer.ok) return viewer.response;

  return NextResponse.json(await getPayload(viewer.tenantId, viewer.editable));
}

export async function POST(req: NextRequest) {
  const viewer = await requireViewer();
  if (!viewer.ok) return viewer.response;
  if (!viewer.editable) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const template = getDynamicRoleBlueprint((body as any).templateKey);
  const templateSeed = template ? createRoleSeedFromBlueprint(template) : null;
  const label = getText((body as any).label, templateSeed?.label ?? "");
  const roleKey = normalizeBusinessRoleKey((body as any).roleKey || templateSeed?.roleKey || label);

  if (!label || !roleKey) {
    return NextResponse.json({ error: "Укажите название и ключ роли" }, { status: 400 });
  }

  const baseRole = normalizeBusinessBaseRole((body as any).baseRole, templateSeed?.baseRole ?? "MANAGER");
  const scope = normalizeBusinessRoleScope((body as any).scope, templateSeed?.scope ?? "business");
  const roleKind = templateSeed?.roleKind ?? "custom";
  const description = getText((body as any).description, templateSeed?.description ?? "") || null;
  const permissions = (templateSeed?.permissions ?? {
    actions: [],
    baseRole,
    scope,
  }) as Prisma.InputJsonValue;
  const notificationSeed = normalizeNotificationSeed((body as any).notificationSeed, templateSeed?.notificationSeed);
  const privilegeError = validateRoleMutationPrivilege({
    viewerRole: viewer.role,
    baseRole,
    permissions,
  });
  if (privilegeError) {
    return NextResponse.json({ error: privilegeError }, { status: 403 });
  }

  try {
    const role = template
      ? await prisma.businessRole.upsert({
          where: {
            tenantId_roleKey: {
              tenantId: viewer.tenantId,
              roleKey,
            },
          },
          create: {
            tenantId: viewer.tenantId,
            roleKey,
            label,
            description,
            baseRole: baseRole as any,
            scope,
            roleKind,
            permissions,
            notificationSeed: notificationSeed as Prisma.InputJsonValue,
            isActive: true,
          },
          update: {
            label,
            description,
            baseRole: baseRole as any,
            scope,
            roleKind,
            permissions,
            notificationSeed: notificationSeed as Prisma.InputJsonValue,
            isActive: true,
          },
        })
      : await prisma.businessRole.create({
          data: {
            tenantId: viewer.tenantId,
            roleKey,
            label,
            description,
            baseRole: baseRole as any,
            scope,
            roleKind,
            permissions,
            notificationSeed: notificationSeed as Prisma.InputJsonValue,
            isActive: true,
          },
        });

    const preferenceCount = await seedAudiencePreferences(role);

    return NextResponse.json({
      ok: true,
      role: serializeBusinessRole({ ...role, members: [], notificationPreferences: [], _count: { members: 0, notificationPreferences: preferenceCount } }),
      preferenceCount,
      payload: await getPayload(viewer.tenantId, viewer.editable),
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Роль с таким ключом уже существует" }, { status: 409 });
    }
    throw error;
  }
}

export async function PATCH(req: NextRequest) {
  const viewer = await requireViewer();
  if (!viewer.ok) return viewer.response;
  if (!viewer.editable) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const action = getText((body as any).action, "update_role");
  const { role, response } = await findRoleOrResponse(viewer.tenantId, (body as any).roleId);
  if (!role) return response;

  if (action === "update_role") {
    const label = getText((body as any).label, role.label);
    if (!label) {
      return NextResponse.json({ error: "Название роли не может быть пустым" }, { status: 400 });
    }

    const notificationSeed = Object.prototype.hasOwnProperty.call(body, "notificationSeed")
      ? normalizeNotificationSeed((body as any).notificationSeed, normalizeNotificationSeed(role.notificationSeed))
      : normalizeNotificationSeed(role.notificationSeed);
    const nextBaseRole = normalizeBusinessBaseRole(
      (body as any).baseRole,
      role.baseRole ? (role.baseRole as BusinessBaseRole) : "MANAGER",
    );
    const privilegeError = validateRoleMutationPrivilege({
      viewerRole: viewer.role,
      baseRole: nextBaseRole,
      permissions: role.permissions,
    });
    if (privilegeError) {
      return NextResponse.json({ error: privilegeError }, { status: 403 });
    }

    const updatedRole = await prisma.businessRole.update({
      where: { id: role.id },
      data: {
        label,
        description: getText((body as any).description, role.description ?? "") || null,
        baseRole: nextBaseRole as any,
        scope: normalizeBusinessRoleScope((body as any).scope, role.scope as any),
        notificationSeed: notificationSeed as Prisma.InputJsonValue,
        isActive: typeof (body as any).isActive === "boolean" ? (body as any).isActive : role.isActive,
      },
    });

    if (Object.prototype.hasOwnProperty.call(body, "notificationSeed")) {
      await seedAudiencePreferences(updatedRole);
    }

    return NextResponse.json({ ok: true, payload: await getPayload(viewer.tenantId, viewer.editable) });
  }

  if (action === "sync_notifications") {
    const freshRole = await prisma.businessRole.findUniqueOrThrow({ where: { id: role.id } });
    const preferenceCount = await seedAudiencePreferences(freshRole);
    return NextResponse.json({
      ok: true,
      preferenceCount,
      payload: await getPayload(viewer.tenantId, viewer.editable),
    });
  }

  if (action === "save_preference") {
    const eventKey = normalizeNotificationEventKey((body as any).eventKey);
    if (!eventKey) {
      return NextResponse.json({ error: "Некорректное событие" }, { status: 400 });
    }

    await prisma.notificationAudiencePreference.upsert({
      where: {
        tenantId_audienceKey_eventKey: {
          tenantId: viewer.tenantId,
          audienceKey: role.roleKey,
          eventKey,
        },
      },
      create: {
        tenantId: viewer.tenantId,
        audienceKey: role.roleKey,
        audienceLabel: role.label,
        businessRoleId: role.id,
        eventKey,
        enabled: Boolean((body as any).enabled),
        channels: normalizeChannels((body as any).channels) as Prisma.InputJsonValue,
        quietHoursEnabled: Boolean((body as any).quietHoursEnabled),
        quietStart: getText((body as any).quietStart, "21:00"),
        quietEnd: getText((body as any).quietEnd, "09:00"),
        weekendsMuted: Boolean((body as any).weekendsMuted),
        metadata: { source: "dynamic-role-os-manual" },
      },
      update: {
        audienceLabel: role.label,
        businessRoleId: role.id,
        enabled: Boolean((body as any).enabled),
        channels: normalizeChannels((body as any).channels) as Prisma.InputJsonValue,
        quietHoursEnabled: Boolean((body as any).quietHoursEnabled),
        quietStart: getText((body as any).quietStart, "21:00"),
        quietEnd: getText((body as any).quietEnd, "09:00"),
        weekendsMuted: Boolean((body as any).weekendsMuted),
        metadata: { source: "dynamic-role-os-manual", updatedAt: new Date().toISOString() },
      },
    });

    return NextResponse.json({ ok: true, payload: await getPayload(viewer.tenantId, viewer.editable) });
  }

  if (action === "add_member") {
    const userId = getText((body as any).userId);
    const user = userId
      ? await prisma.user.findFirst({
          where: { id: userId, tenantId: viewer.tenantId },
          select: { id: true, staffStatus: true },
        })
      : null;

    if (!user) {
      return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
    }

    await prisma.businessRoleMember.upsert({
      where: {
        businessRoleId_userId: {
          businessRoleId: role.id,
          userId: user.id,
        },
      },
      create: {
        tenantId: viewer.tenantId,
        businessRoleId: role.id,
        userId: user.id,
        status: user.staffStatus,
        isPrimary: false,
        metadata: { source: "admin-business-role-os" },
      },
      update: {
        status: user.staffStatus,
        isPrimary: false,
        metadata: { source: "admin-business-role-os", refreshedAt: new Date().toISOString() },
      },
    });

    return NextResponse.json({ ok: true, payload: await getPayload(viewer.tenantId, viewer.editable) });
  }

  if (action === "remove_member") {
    const userId = getText((body as any).userId);
    await prisma.businessRoleMember.deleteMany({
      where: {
        tenantId: viewer.tenantId,
        businessRoleId: role.id,
        userId,
      },
    });

    return NextResponse.json({ ok: true, payload: await getPayload(viewer.tenantId, viewer.editable) });
  }

  return NextResponse.json({ error: "Неизвестное действие" }, { status: 400 });
}

export async function DELETE(req: NextRequest) {
  const viewer = await requireViewer();
  if (!viewer.ok) return viewer.response;
  if (!viewer.editable) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const { role, response } = await findRoleOrResponse(viewer.tenantId, url.searchParams.get("id"));
  if (!role) return response;

  if (role.isSystem) {
    return NextResponse.json({ error: "Системную роль нельзя удалить" }, { status: 400 });
  }

  const memberCount = await prisma.businessRoleMember.count({
    where: { tenantId: viewer.tenantId, businessRoleId: role.id },
  });

  if (memberCount > 0) {
    await prisma.businessRole.update({
      where: { id: role.id },
      data: { isActive: false },
    });
    return NextResponse.json({
      ok: true,
      archived: true,
      payload: await getPayload(viewer.tenantId, viewer.editable),
    });
  }

  await prisma.businessRole.delete({ where: { id: role.id } });
  return NextResponse.json({ ok: true, payload: await getPayload(viewer.tenantId, viewer.editable) });
}
