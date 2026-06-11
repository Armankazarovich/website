export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { applyTerminalAutoconfig, buildTerminalAutoconfig } from "@/lib/terminal-autoconfig";
import {
  ALWAYS_ON_TERMINAL_CAPABILITIES,
  TERMINAL_CAPABILITIES,
  parseTerminalCapabilityKeys,
  type TerminalCapabilityKey,
} from "@/lib/terminal-capabilities";
import { prisma } from "@/lib/prisma";
import { upsertSiteSetting } from "@/lib/tenant-settings";
import { TERMINAL_ADMIN_ROLES, requireTerminalStaff } from "@/lib/terminal-auth";
import { resolveTerminalProfile } from "@/lib/terminal-profiles";
import { enqueueTerminalSyncJob } from "@/lib/terminal-sync";
import { getCurrentTenantId } from "@/lib/tenant-context";
import { parseJsonRecord, requireWriteConfirmation } from "@/lib/admin-content-guard";

function canAdmin(role?: string) {
  return Boolean(role && TERMINAL_ADMIN_ROLES.includes(role));
}

function normalizeModules(value: unknown): TerminalCapabilityKey[] {
  if (Array.isArray(value)) {
    return value.filter((key): key is TerminalCapabilityKey => typeof key === "string" && key in TERMINAL_CAPABILITIES);
  }
  return parseTerminalCapabilityKeys(typeof value === "string" ? value : "");
}

export async function GET() {
  const auth = await requireTerminalStaff();
  if (!auth.authorized) return auth.response;
  const tenantId = getCurrentTenantId();

  const config = await buildTerminalAutoconfig(tenantId);
  const settings = await prisma.siteSettings.findMany({
    where: { tenantId, key: { in: ["terminal_enabled_modules", "terminal_profile", "business_type"] } },
    select: { key: true, value: true },
  });
  const map = Object.fromEntries(settings.map((row) => [row.key, row.value]));
  const enabledModules = parseTerminalCapabilityKeys(map.terminal_enabled_modules);

  return NextResponse.json({
    profile: config.profile,
    detected: config.detected,
    enabledModules: enabledModules.length ? enabledModules : config.enabledModules,
    capabilities: Object.values(TERMINAL_CAPABILITIES),
    safeActions: ["read_context", "prepare_steps"],
    confirmationActions: ["apply_autoconfig", "set_modules"],
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireTerminalStaff();
  if (!auth.authorized) return auth.response;

  const body = await parseJsonRecord(req);
  const action = String(body.action || "read_context");
  const tenantId = getCurrentTenantId();

  if (action === "read_context" || action === "prepare_steps") {
    const config = await buildTerminalAutoconfig(tenantId);
    return NextResponse.json({
      ok: true,
      action,
      config,
      message: "Арай может показать план настройки. Применение модулей требует подтверждения администратора.",
    });
  }

  if (!canAdmin(auth.session.user.role)) {
    return NextResponse.json({ error: "Для применения настроек нужен администратор" }, { status: 403 });
  }

  const confirmationError = requireWriteConfirmation(body);
  if (confirmationError) return confirmationError;

  if (action === "apply_autoconfig") {
    const config = await applyTerminalAutoconfig(tenantId);
    return NextResponse.json({
      ok: true,
      action,
      config,
      message: "Автонастройка терминала применена: профиль, модули, рабочая точка, коннекторы и индекс обновлены.",
    });
  }

  if (action === "set_modules") {
    const profile = resolveTerminalProfile(body.profile);
    const modules = normalizeModules(body.modules);
    const enabledModules = Array.from(new Set([...ALWAYS_ON_TERMINAL_CAPABILITIES, ...modules]));

    await Promise.all([
      upsertSiteSetting("terminal_profile", profile.key, tenantId),
      upsertSiteSetting("business_type", profile.key, tenantId),
      upsertSiteSetting("terminal_enabled_modules", JSON.stringify(enabledModules), tenantId),
    ]);

    await enqueueTerminalSyncJob({
      tenantId,
      channel: "ai",
      event: "aray.terminal.modules_applied",
      entityType: "terminal",
      priority: 2,
      payload: {
        profile: profile.key,
        modules: enabledModules,
        requestedBy: auth.session.user.id,
        source: "aray",
      },
      idempotencyKey: `aray:terminal:modules:${Date.now()}`,
    });

    return NextResponse.json({
      ok: true,
      action,
      profile,
      enabledModules,
      message: "Модули терминала применены. Лишние функции скрыты, включённые появятся в кассе.",
    });
  }

  return NextResponse.json({ error: "Неизвестное действие Арая" }, { status: 400 });
}
