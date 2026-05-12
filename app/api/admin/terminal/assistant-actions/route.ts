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
import { TERMINAL_ADMIN_ROLES, requireTerminalStaff } from "@/lib/terminal-auth";
import { resolveTerminalProfile } from "@/lib/terminal-profiles";
import { enqueueTerminalSyncJob } from "@/lib/terminal-sync";

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

  const config = await buildTerminalAutoconfig();
  const settings = await prisma.siteSettings.findMany({
    where: { key: { in: ["terminal_enabled_modules", "terminal_profile", "business_type"] } },
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

  const body = await req.json().catch(() => ({}));
  const action = String(body.action || "read_context");

  if (action === "read_context" || action === "prepare_steps") {
    const config = await buildTerminalAutoconfig();
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

  if (action === "apply_autoconfig") {
    const config = await applyTerminalAutoconfig();
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
      prisma.siteSettings.upsert({
        where: { key: "terminal_profile" },
        create: { id: "terminal_profile", key: "terminal_profile", value: profile.key },
        update: { value: profile.key },
      }),
      prisma.siteSettings.upsert({
        where: { key: "business_type" },
        create: { id: "business_type", key: "business_type", value: profile.key },
        update: { value: profile.key },
      }),
      prisma.siteSettings.upsert({
        where: { key: "terminal_enabled_modules" },
        create: { id: "terminal_enabled_modules", key: "terminal_enabled_modules", value: JSON.stringify(enabledModules) },
        update: { value: JSON.stringify(enabledModules) },
      }),
    ]);

    await enqueueTerminalSyncJob({
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
