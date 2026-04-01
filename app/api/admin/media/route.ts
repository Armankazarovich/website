export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readdir, stat, unlink } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

async function checkAdmin() {
  const session = await auth();
  const role = (session?.user as any)?.role;
  return session && ["ADMIN", "MANAGER"].includes(role);
}

const IMAGE_DIRS = ["products", "categories", "watermarks", "banners"];

// ── GET: list all media files ─────────────────────────────────────────────────
export async function GET() {
  if (!(await checkAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Load ALT map from SiteSettings
  const altRow = await prisma.siteSettings.findUnique({ where: { key: "media_alt_map" } });
  const altMap: Record<string, string> = altRow ? JSON.parse(altRow.value) : {};

  // Load all products to know which images are used where
  const products = await prisma.product.findMany({ select: { id: true, name: true, slug: true, images: true } });
  const categories = await prisma.category.findMany({ select: { id: true, name: true, slug: true, image: true } });

  // Build usage map: url → [{type, id, name, slug}]
  const usageMap: Record<string, { type: "product" | "category"; id: string; name: string; slug: string }[]> = {};
  for (const p of products) {
    for (const img of p.images) {
      if (!usageMap[img]) usageMap[img] = [];
      usageMap[img].push({ type: "product", id: p.id, name: p.name, slug: p.slug });
    }
  }
  for (const c of categories) {
    if (c.image) {
      if (!usageMap[c.image]) usageMap[c.image] = [];
      usageMap[c.image].push({ type: "category", id: c.id, name: c.name, slug: c.slug });
    }
  }

  // Scan directories
  const files: {
    url: string; folder: string; filename: string;
    size: number; mtime: number; alt: string;
    usedIn: { type: "product" | "category"; id: string; name: string; slug: string }[];
  }[] = [];

  for (const folder of IMAGE_DIRS) {
    const dir = join(process.cwd(), "public", "images", folder);
    if (!existsSync(dir)) continue;
    const entries = await readdir(dir);
    for (const filename of entries) {
      try {
        const s = await stat(join(dir, filename));
        if (!s.isFile()) continue;
        const url = `/images/${folder}/${filename}`;
        files.push({
          url, folder, filename,
          size: s.size,
          mtime: s.mtimeMs,
          alt: altMap[url] ?? "",
          usedIn: usageMap[url] ?? [],
        });
      } catch { /* skip */ }
    }
  }

  // Sort: newest first
  files.sort((a, b) => b.mtime - a.mtime);

  return NextResponse.json({ files, total: files.length });
}

// ── POST: save ALT or delete file ─────────────────────────────────────────────
export async function POST(req: Request) {
  if (!(await checkAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { action } = body;

  // ── Save ALT text for one or many images ──
  if (action === "save_alt") {
    const { url, alt } = body as { url: string; alt: string };
    if (!url) return NextResponse.json({ error: "url required" }, { status: 400 });

    const altRow = await prisma.siteSettings.findUnique({ where: { key: "media_alt_map" } });
    const altMap: Record<string, string> = altRow ? JSON.parse(altRow.value) : {};
    if (alt) altMap[url] = alt;
    else delete altMap[url];

    await prisma.siteSettings.upsert({
      where: { key: "media_alt_map" },
      create: { id: "media_alt_map", key: "media_alt_map", value: JSON.stringify(altMap) },
      update: { value: JSON.stringify(altMap) },
    });
    return NextResponse.json({ ok: true });
  }

  // ── Auto-generate ALT from product names ──
  if (action === "auto_generate_alt") {
    const products = await prisma.product.findMany({ select: { name: true, images: true } });
    const categories = await prisma.category.findMany({ select: { name: true, image: true } });

    const altRow = await prisma.siteSettings.findUnique({ where: { key: "media_alt_map" } });
    const altMap: Record<string, string> = altRow ? JSON.parse(altRow.value) : {};

    let count = 0;
    for (const p of products) {
      for (const img of p.images) {
        if (!altMap[img]) { // Don't overwrite manually set ALTs
          altMap[img] = p.name;
          count++;
        }
      }
    }
    for (const c of categories) {
      if (c.image && !altMap[c.image]) {
        altMap[c.image] = c.name;
        count++;
      }
    }

    await prisma.siteSettings.upsert({
      where: { key: "media_alt_map" },
      create: { id: "media_alt_map", key: "media_alt_map", value: JSON.stringify(altMap) },
      update: { value: JSON.stringify(altMap) },
    });
    return NextResponse.json({ ok: true, count });
  }

  // ── Delete file ──
  if (action === "delete") {
    const { url } = body as { url: string };
    if (!url || !url.startsWith("/images/")) return NextResponse.json({ error: "Invalid url" }, { status: 400 });

    // Check if used
    const products = await prisma.product.findMany({ select: { id: true, images: true } });
    const isUsed = products.some((p) => p.images.includes(url));
    if (isUsed) return NextResponse.json({ error: "Файл используется в товарах — сначала удалите его оттуда" }, { status: 400 });

    const filePath = join(process.cwd(), "public", url);
    if (existsSync(filePath)) await unlink(filePath);

    // Remove from ALT map
    const altRow = await prisma.siteSettings.findUnique({ where: { key: "media_alt_map" } });
    if (altRow) {
      const altMap: Record<string, string> = JSON.parse(altRow.value);
      delete altMap[url];
      await prisma.siteSettings.update({ where: { key: "media_alt_map" }, data: { value: JSON.stringify(altMap) } });
    }

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
