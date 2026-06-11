export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DEFAULT_SETTINGS } from "@/lib/site-settings";
import { isPaletteId } from "@/lib/palettes";
import { getSiteSetting, upsertSiteSetting } from "@/lib/tenant-settings";

async function checkAdmin() {
  const session = await auth();
  const role = session?.user?.role;
  return role === "SUPER_ADMIN" || role === "ADMIN";
}

export async function GET() {
  if (!(await checkAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const row = await getSiteSetting("palettes_enabled");
  const value = row?.value ?? DEFAULT_SETTINGS.palettes_enabled;
  return NextResponse.json({ palettes_enabled: value });
}

export async function PATCH(req: Request) {
  if (!(await checkAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let body: Record<string, unknown>;
  try {
    const parsed = await req.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (body.confirm !== true) {
    return NextResponse.json({ error: "Confirmation required" }, { status: 400 });
  }

  const updates: Record<string, string> = {};

  // Palettes
  if (typeof body.palettes_enabled === "string") {
    const ids = body.palettes_enabled.split(",").map((s: string) => s.trim()).filter(isPaletteId);
    if (!ids.includes("sber")) ids.unshift("sber");
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
  if (typeof body.default_palette === "string" && isPaletteId(body.default_palette)) {
    updates.default_palette = body.default_palette;
  }

  // Aray assistant toggle
  if (typeof body.aray_enabled === "string" && ["true", "false"].includes(body.aray_enabled)) {
    updates.aray_enabled = body.aray_enabled;
  }

  // Product page settings
  const boolKeys = [
    "product_page_show_reviews",
    "product_page_show_related",
    "product_page_show_calculator",
    "product_page_show_breadcrumbs",
    "checkout_allow_pickup",
    "checkout_allow_delivery",
    "checkout_show_promo",
    "checkout_allow_guest",
    "checkout_require_comment",
  ];
  for (const key of boolKeys) {
    if (typeof body[key] === "string" && ["true", "false"].includes(body[key])) {
      updates[key] = body[key];
    }
  }

  if ("checkout_allow_pickup" in updates || "checkout_allow_delivery" in updates) {
    const [pickupRow, deliveryRow] = await Promise.all([
      getSiteSetting("checkout_allow_pickup"),
      getSiteSetting("checkout_allow_delivery"),
    ]);
    const nextPickup = updates.checkout_allow_pickup ?? pickupRow?.value ?? "true";
    const nextDelivery = updates.checkout_allow_delivery ?? deliveryRow?.value ?? "true";
    if (nextPickup === "false" && nextDelivery === "false") {
      return NextResponse.json({ error: "At least one checkout fulfillment method is required" }, { status: 400 });
    }
  }

  // Save all updated keys
  await Promise.all(
    Object.entries(updates).map(([key, value]) =>
      upsertSiteSetting(key, value)
    )
  );

  revalidateTag("store-shell-data");
  revalidatePath("/", "layout");
  revalidatePath("/catalog");
  revalidatePath("/compare");
  revalidatePath("/wishlist");

  return NextResponse.json({ ok: true, ...updates });
}
