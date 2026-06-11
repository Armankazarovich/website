import "server-only";

import { NextResponse } from "next/server";

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export async function parseJsonRecord(req: Request): Promise<Record<string, unknown>> {
  const body = await req.json().catch(() => ({}));
  return isRecord(body) ? body : {};
}

export function hasWriteConfirmation(body: Record<string, unknown>) {
  return body.confirm === true || body.confirmed === true;
}

export function requireWriteConfirmation(body: Record<string, unknown>) {
  if (hasWriteConfirmation(body)) return null;
  return NextResponse.json({ error: "Confirmation required" }, { status: 400 });
}

export function hasSearchConfirmation(req: Request) {
  return new URL(req.url).searchParams.get("confirm") === "true";
}

export function requireSearchConfirmation(req: Request) {
  if (hasSearchConfirmation(req)) return null;
  return NextResponse.json({ error: "Confirmation required" }, { status: 400 });
}

export function cleanText(value: unknown, max = 500, fallback = "") {
  const raw = typeof value === "string" || typeof value === "number" ? String(value) : "";
  const cleaned = raw.trim().replace(/\s+/g, " ").slice(0, max);
  return cleaned || fallback;
}

export function cleanLongText(value: unknown, max = 20000, fallback = "") {
  const raw = typeof value === "string" || typeof value === "number" ? String(value) : "";
  const cleaned = raw.trim().slice(0, max);
  return cleaned || fallback;
}

export function cleanNullableText(value: unknown, max = 500) {
  const cleaned = cleanText(value, max);
  return cleaned || null;
}

export function cleanNullableLongText(value: unknown, max = 20000) {
  const cleaned = cleanLongText(value, max);
  return cleaned || null;
}

export function cleanSlug(value: unknown, fallback = "draft") {
  const source = cleanText(value, 120, fallback).toLowerCase();
  const slug =
    source
      .replace(/[^a-z0-9а-яё-]+/gi, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 100) || fallback;
  return slug;
}

export function cleanBool(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

export function cleanInt(value: unknown, fallback = 0, min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.round(number)));
}

export function cleanNullableUrl(value: unknown, max = 500) {
  const cleaned = cleanLongText(value, max);
  if (!cleaned) return null;
  if (cleaned.startsWith("/") && !cleaned.startsWith("//") && !cleaned.includes("..")) return cleaned;
  if (/^https:\/\/[^\s]+$/i.test(cleaned)) return cleaned;
  return null;
}

export function sanitizeAdminHtml(value: unknown, max = 30000) {
  return cleanLongText(value, max)
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\s(href|src)\s*=\s*(['"])\s*javascript:[\s\S]*?\2/gi, "");
}
