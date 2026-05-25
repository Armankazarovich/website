export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  buildArayContentDraft,
  type ArayContentKind,
  type ArayContentTone,
  type ArayContentVariant,
} from "@/lib/aray-content-core";

const CONTENT_ROLES = ["SUPER_ADMIN", "ADMIN", "MANAGER", "SELLER", "MARKETER"];
const CONTENT_KINDS: ArayContentKind[] = ["product", "service", "promotion", "story", "page", "ad"];
const CONTENT_TONES: ArayContentTone[] = ["steady", "premium", "friendly", "technical", "local"];

function cleanText(value: unknown, limit = 600) {
  if (typeof value !== "string" && typeof value !== "number") return "";
  return String(value).replace(/\s+/g, " ").trim().slice(0, limit);
}

function cleanKind(value: unknown): ArayContentKind {
  return CONTENT_KINDS.includes(value as ArayContentKind) ? (value as ArayContentKind) : "page";
}

function cleanTone(value: unknown): ArayContentTone {
  return CONTENT_TONES.includes(value as ArayContentTone) ? (value as ArayContentTone) : "steady";
}

function cleanStringArray(value: unknown, limit = 6) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => cleanText(item, 80))
    .filter(Boolean)
    .slice(0, limit);
}

function cleanVariants(value: unknown): ArayContentVariant[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 40).map((item) => {
    if (!item || typeof item !== "object") return {};
    const row = item as Record<string, unknown>;
    return {
      size: cleanText(row.size, 80),
      pricePerCube: cleanText(row.pricePerCube, 40),
      pricePerPiece: cleanText(row.pricePerPiece, 40),
      inStock: typeof row.inStock === "boolean" ? row.inStock : null,
    };
  });
}

export async function POST(request: Request) {
  const session = await auth();
  const role = session?.user?.role as string | undefined;
  if (!session || !role || !CONTENT_ROLES.includes(role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const draft = buildArayContentDraft({
    kind: cleanKind(body.kind),
    title: cleanText(body.title, 160),
    description: cleanText(body.description, 1200),
    category: cleanText(body.category, 120),
    price: cleanText(body.price, 80),
    unit: cleanText(body.unit, 80),
    city: cleanText(body.city, 80),
    region: cleanText(body.region, 120),
    businessType: cleanText(body.businessType, 80),
    tone: cleanTone(body.tone),
    variants: cleanVariants(body.variants),
    benefits: cleanStringArray(body.benefits),
  });

  return NextResponse.json({ ok: true, draft });
}
