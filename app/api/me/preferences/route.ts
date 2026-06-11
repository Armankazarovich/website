export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isPaletteId } from "@/lib/palettes";
import { ADMIN_LANGUAGES, type LangCode } from "@/lib/admin-i18n";
import { getSiteSetting, upsertSiteSetting } from "@/lib/tenant-settings";

const THEMES = new Set(["light", "dark", "system"]);
const LANG_CODES = new Set(ADMIN_LANGUAGES.map((lang) => lang.code));

type UserPreferences = {
  palette?: string;
  theme?: "light" | "dark" | "system";
  adminBgMode?: "clean";
  lang?: LangCode;
  updatedAt?: string;
};

function preferenceKey(userId: string) {
  return `user_ui_preferences_${userId}`;
}

function parsePreferences(value: string | null | undefined): UserPreferences {
  if (!value) return {};

  try {
    const raw = JSON.parse(value) as Record<string, unknown>;
    const preferences: UserPreferences = {};

    if (typeof raw.palette === "string" && isPaletteId(raw.palette)) {
      preferences.palette = raw.palette;
    }

    if (typeof raw.theme === "string" && THEMES.has(raw.theme)) {
      preferences.theme = raw.theme as UserPreferences["theme"];
    }

    preferences.adminBgMode = "clean";

    if (typeof raw.lang === "string" && LANG_CODES.has(raw.lang as LangCode)) {
      preferences.lang = raw.lang as LangCode;
    }

    if (typeof raw.updatedAt === "string") {
      preferences.updatedAt = raw.updatedAt;
    }

    return preferences;
  } catch {
    return {};
  }
}

function sanitizePreferences(body: Record<string, unknown>, existing: UserPreferences): UserPreferences {
  const next: UserPreferences = { ...existing };

  if (typeof body.palette === "string" && isPaletteId(body.palette)) {
    next.palette = body.palette;
  }

  if (typeof body.theme === "string" && THEMES.has(body.theme)) {
    next.theme = body.theme as UserPreferences["theme"];
  }

  next.adminBgMode = "clean";

  if (typeof body.lang === "string" && LANG_CODES.has(body.lang as LangCode)) {
    next.lang = body.lang as LangCode;
  }

  next.updatedAt = new Date().toISOString();
  return next;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ authenticated: false, preferences: {} });
  }

  const row = await getSiteSetting(preferenceKey(session.user.id)).catch(() => null);

  return NextResponse.json({
    authenticated: true,
    preferences: parsePreferences(row?.value),
  });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, authenticated: false, preferences: {} });
  }

  const body = await req.json().catch(() => ({}));
  const key = preferenceKey(session.user.id);
  const row = await getSiteSetting(key).catch(() => null);
  const preferences = sanitizePreferences(body, parsePreferences(row?.value));
  const value = JSON.stringify(preferences);

  await upsertSiteSetting(key, value);

  return NextResponse.json({ ok: true, authenticated: true, preferences });
}
