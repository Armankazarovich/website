export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  createSheetTemplate,
  syncToSheet,
  syncFromSheet,
  getAppsScriptCode,
} from "@/lib/google-sheets";

async function checkAdmin() {
  const session = await auth();
  return session && session.user.role === "ADMIN";
}

// ── GET: current settings ──────────────────────────────────────────────────
export async function GET() {
  if (!(await checkAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await prisma.siteSettings.findMany({
    where: { key: { in: ["google_sheet_id", "google_sheet_url", "google_sheet_synced_at", "google_service_account"] } },
  });
  const result: Record<string, string> = {};
  for (const r of rows) {
    // Don't expose the full credentials — just whether it's set
    if (r.key === "google_service_account") {
      result.google_service_account_set = "true";
      try {
        const creds = JSON.parse(r.value);
        result.google_service_account_email = creds.client_email ?? "";
      } catch {}
    } else {
      result[r.key] = r.value;
    }
  }
  return NextResponse.json(result);
}

// ── POST: actions ─────────────────────────────────────────────────────────
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { action } = body;

  // Webhook from Google Apps Script — no admin check needed, but validate spreadsheetId
  if (action === "webhook_sync") {
    const { spreadsheetId } = body;
    if (!spreadsheetId) return NextResponse.json({ error: "spreadsheetId required" }, { status: 400 });

    // Verify spreadsheetId matches configured one
    const row = await prisma.siteSettings.findUnique({ where: { key: "google_sheet_id" } });
    if (!row || row.value !== spreadsheetId) {
      return NextResponse.json({ error: "Unknown sheet" }, { status: 403 });
    }

    try {
      const result = await syncFromSheet(spreadsheetId);
      await prisma.siteSettings.upsert({
        where: { key: "google_sheet_synced_at" },
        create: { id: "google_sheet_synced_at", key: "google_sheet_synced_at", value: new Date().toISOString() },
        update: { value: new Date().toISOString() },
      });
      return NextResponse.json({ ok: true, ...result });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  // All other actions require admin
  if (!(await checkAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // ── Save service account credentials ──
  if (action === "save_credentials") {
    const { credentials } = body;
    if (!credentials) return NextResponse.json({ error: "credentials required" }, { status: 400 });
    try {
      JSON.parse(credentials); // validate JSON
    } catch {
      return NextResponse.json({ error: "Неверный JSON" }, { status: 400 });
    }
    await prisma.siteSettings.upsert({
      where: { key: "google_service_account" },
      create: { id: "google_service_account", key: "google_service_account", value: credentials },
      update: { value: credentials },
    });
    return NextResponse.json({ ok: true });
  }

  // ── Save sheet ID ──
  if (action === "save_sheet_id") {
    const { sheetId, sheetUrl } = body;
    if (!sheetId) return NextResponse.json({ error: "sheetId required" }, { status: 400 });
    await Promise.all([
      prisma.siteSettings.upsert({
        where: { key: "google_sheet_id" },
        create: { id: "google_sheet_id", key: "google_sheet_id", value: sheetId },
        update: { value: sheetId },
      }),
      prisma.siteSettings.upsert({
        where: { key: "google_sheet_url" },
        create: { id: "google_sheet_url", key: "google_sheet_url", value: sheetUrl ?? "" },
        update: { value: sheetUrl ?? "" },
      }),
    ]);
    return NextResponse.json({ ok: true });
  }

  // ── Create template ──
  if (action === "create_template") {
    try {
      const result = await createSheetTemplate("ПилоРус — Товары");
      // Auto-save the sheet ID
      await Promise.all([
        prisma.siteSettings.upsert({
          where: { key: "google_sheet_id" },
          create: { id: "google_sheet_id", key: "google_sheet_id", value: result.id },
          update: { value: result.id },
        }),
        prisma.siteSettings.upsert({
          where: { key: "google_sheet_url" },
          create: { id: "google_sheet_url", key: "google_sheet_url", value: result.url },
          update: { value: result.url },
        }),
      ]);
      return NextResponse.json({ ok: true, ...result });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  // ── Sync DB → Sheet ──
  if (action === "sync_to_sheet") {
    const row = await prisma.siteSettings.findUnique({ where: { key: "google_sheet_id" } });
    if (!row?.value) return NextResponse.json({ error: "Google таблица не настроена" }, { status: 400 });
    try {
      const result = await syncToSheet(row.value);
      await prisma.siteSettings.upsert({
        where: { key: "google_sheet_synced_at" },
        create: { id: "google_sheet_synced_at", key: "google_sheet_synced_at", value: new Date().toISOString() },
        update: { value: new Date().toISOString() },
      });
      return NextResponse.json({ ok: true, ...result });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  // ── Sync Sheet → DB ──
  if (action === "sync_from_sheet") {
    const row = await prisma.siteSettings.findUnique({ where: { key: "google_sheet_id" } });
    if (!row?.value) return NextResponse.json({ error: "Google таблица не настроена" }, { status: 400 });
    try {
      const result = await syncFromSheet(row.value);
      await prisma.siteSettings.upsert({
        where: { key: "google_sheet_synced_at" },
        create: { id: "google_sheet_synced_at", key: "google_sheet_synced_at", value: new Date().toISOString() },
        update: { value: new Date().toISOString() },
      });
      return NextResponse.json({ ok: true, ...result });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  // ── Get Apps Script code ──
  if (action === "get_apps_script") {
    const host = req.headers.get("host") ?? "your-site.com";
    const proto = req.headers.get("x-forwarded-proto") ?? "https";
    const webhookUrl = `${proto}://${host}/api/admin/google-sheets`;
    return NextResponse.json({ code: getAppsScriptCode(webhookUrl) });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
