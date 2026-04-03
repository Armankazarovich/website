export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DEFAULT_SETTINGS } from "@/lib/site-settings";

async function checkAdmin() {
  const session = await auth();
  return session && (session.user as any).role === "ADMIN";
}

export async function GET() {
  if (!(await checkAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const row = await prisma.siteSettings.findUnique({ where: { key: "palettes_enabled" } });
  const value = row?.value ?? DEFAULT_SETTINGS.palettes_enabled;
  return NextResponse.json({ palettes_enabled: value });
}

export async function PATCH(req: Request) {
  if (!(await checkAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();

  const updates: Record<string, string> = {};

  // Palettes
  if (typeof body.palettes_enabled === "string") {
    const ids = body.palettes_enabled.split(",").map((s: string) => s.trim()).filter(Boolean);
    if (!ids.includes("timber")) ids.unshift("timber");
    updates.palettes_enabled = ids.join(",");
  }

  // Photo aspect ratio
  const VALID_RATIOS = ["1/1", "4/5", "3/4", "4/3"];
  if (typeof body.photo_aspect_ratio === "string" && VALID_RATIOS.includes(body.photo_aspect_ratio)) {
    updates.photo_aspect_ratio = body.photo_aspect_ratio;
  }

  // Card style
  const VALID_STYLES = ["classic", "showcase", "vivid", "minimal", "magazine"];
  if (typeof body.card_style === "string" && VALID_STYLES.includes(body.card_style)) {
    updates.card_style = body.card_style;
  }

  // Default palette
  const allPaletteIds = ["timber","forest","ocean","midnight","slate","crimson","wildberries","ozon","yandex","aliexpress","amazon","avito","sber"];
  if (typeof body.default_palette === "string" && allPaletteIds.includes(body.default_palette)) {
    updates.default_palette = body.default_palette;
  }

  // Aray assistant toggle
  if (typeof body.aray_enabled === "string" && ["true", "false"].includes(body.aray_enabled)) {
    updates.aray_enabled = body.aray_enabled;
  }

  // Save all updated keys
  await Promise.all(
    Object.entries(updates).map(([key, value]) =>
      prisma.siteSettings.upsert({
        where: { key },
        create: { id: key, key, value },
        update: { value },
      })
    )
  );

  return NextResponse.json({ ok: true, ...updates });
}
