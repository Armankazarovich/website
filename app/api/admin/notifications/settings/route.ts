export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requireArayModuleAccess } from "@/lib/aray-module-auth";
import { prisma } from "@/lib/prisma";
import {
  canBusinessRoleAccessAction,
  canAccessWithBusinessRoles,
  getUserBusinessRoleAccess,
} from "@/lib/business-role-access";
import { getCurrentTenantId } from "@/lib/tenant-context";
import {
  getNotificationSettingsMatrix,
  normalizeNotificationEventKey,
  normalizeStaffNotificationRole,
  NOTIFICATION_TENANT_ID,
  toNotificationChannelsJson,
} from "@/lib/notification-settings";

function canEdit(role: string | null | undefined) {
  return role === "SUPER_ADMIN" || role === "ADMIN";
}

function isTime(value: unknown) {
  return typeof value === "string" && /^\d{2}:\d{2}$/.test(value);
}

async function settingsResponse(role: string, editable = canEdit(role)) {
  const matrix = await getNotificationSettingsMatrix();
  return NextResponse.json({
    ...matrix,
    canEdit: editable,
  });
}

export async function GET() {
  const session = await auth();
  const role = session?.user?.role;
  const tenantId = getCurrentTenantId();
  const userId = session?.user?.id as string | undefined;
  const allowed = session
    ? await canAccessWithBusinessRoles({ userId, role, section: "notifications", tenantId })
    : false;

  if (!session || !allowed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  if (!role) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const moduleAccess = await requireArayModuleAccess({ moduleId: "core.notifications", role });
  if (!moduleAccess.authorized) return moduleAccess.response;

  const businessAccess = userId ? await getUserBusinessRoleAccess(userId, tenantId) : null;
  const editable =
    canEdit(role) ||
    (businessAccess
      ? canBusinessRoleAccessAction(businessAccess, "notifications.manage") ||
        canBusinessRoleAccessAction(businessAccess, "roles.manage")
      : false);

  return settingsResponse(role, editable);
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  const currentRole = session?.user?.role;
  const tenantId = getCurrentTenantId();
  const userId = session?.user?.id as string | undefined;
  const businessAccess = userId ? await getUserBusinessRoleAccess(userId, tenantId) : null;
  const editable =
    canEdit(currentRole) ||
    (businessAccess
      ? canBusinessRoleAccessAction(businessAccess, "notifications.manage") ||
        canBusinessRoleAccessAction(businessAccess, "roles.manage")
      : false);

  if (!session || !currentRole || !editable) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const moduleAccess = await requireArayModuleAccess({ moduleId: "core.notifications", role: currentRole });
  if (!moduleAccess.authorized) return moduleAccess.response;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const role = normalizeStaffNotificationRole(body.role);
  if (!role) {
    return NextResponse.json({ error: "Некорректная роль" }, { status: 400 });
  }

  if (body.type === "policy") {
    const eventKey = normalizeNotificationEventKey(body.eventKey);
    if (!eventKey) {
      return NextResponse.json({ error: "Некорректное событие" }, { status: 400 });
    }

    await prisma.notificationRolePreference.upsert({
      where: {
        tenantId_role_eventKey: {
          tenantId: NOTIFICATION_TENANT_ID,
          role,
          eventKey,
        },
      },
      create: {
        tenantId: NOTIFICATION_TENANT_ID,
        role,
        eventKey,
        enabled: Boolean(body.enabled),
        channels: toNotificationChannelsJson(body.channels),
        quietHoursEnabled: Boolean(body.quietHoursEnabled),
      },
      update: {
        enabled: Boolean(body.enabled),
        channels: toNotificationChannelsJson(body.channels),
        quietHoursEnabled: Boolean(body.quietHoursEnabled),
      },
    });

    return settingsResponse(currentRole, editable);
  }

  if (body.type === "schedule") {
    const quietStart = isTime(body.quietStart) ? body.quietStart : "21:00";
    const quietEnd = isTime(body.quietEnd) ? body.quietEnd : "09:00";

    await prisma.notificationRoleSchedule.upsert({
      where: {
        tenantId_role: {
          tenantId: NOTIFICATION_TENANT_ID,
          role,
        },
      },
      create: {
        tenantId: NOTIFICATION_TENANT_ID,
        role,
        quietHoursEnabled: Boolean(body.quietHoursEnabled),
        quietStart,
        quietEnd,
        weekendsMuted: Boolean(body.weekendsMuted),
      },
      update: {
        quietHoursEnabled: Boolean(body.quietHoursEnabled),
        quietStart,
        quietEnd,
        weekendsMuted: Boolean(body.weekendsMuted),
      },
    });

    return settingsResponse(currentRole, editable);
  }

  return NextResponse.json({ error: "Неизвестный тип настройки" }, { status: 400 });
}
