export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readdir, stat } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

async function checkAdmin() {
  const session = await auth();
  return session && (session.user as any).role === "ADMIN";
}

// ─── Smart slug-based matching ────────────────────────────────────────────────
// Score how well a filename matches a product slug
// e.g. slug="blok-khaus-listvennitsa", file="blok-khaus-listvennitsa.webp" → high score
function matchScore(filename: string, slug: string): number {
  const name = filename.toLowerCase().replace(/\.[^.]+$/, "").replace(/[-_]/g, " ");
  const parts = slug.toLowerCase().replace(/[-_]/g, " ").split(" ").filter((p) => p.length > 2);
  let score = 0;
  for (const part of parts) {
    if (name.includes(part)) score++;
  }
  // Bonus for exact prefix match
  if (name.startsWith(slug.replace(/-/g, " ").toLowerCase().slice(0, 10))) score += 3;
  return score;
}

// ─── GET: list products + orphaned originals ──────────────────────────────────
export async function GET() {
  if (!(await checkAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const products = await prisma.product.findMany({
    select: { id: true, name: true, slug: true, images: true },
    orderBy: { name: "asc" },
  });

  const referenced = new Set(products.flatMap((p) => p.images));

  const dir = join(process.cwd(), "public", "images", "products");
  let allFiles: { name: string; mtime: number }[] = [];
  if (existsSync(dir)) {
    const files = await readdir(dir);
    allFiles = await Promise.all(
      files.map(async (f) => {
        try {
          const s = await stat(join(dir, f));
          return { name: f, mtime: s.mtimeMs };
        } catch {
          return { name: f, mtime: 0 };
        }
      })
    );
    allFiles.sort((a, b) => a.mtime - b.mtime);
  }

  const orphanedOriginals = allFiles
    .filter(({ name }) => !referenced.has(`/images/products/${name}`) && !name.startsWith("wm-"))
    .map(({ name }) => `/images/products/${name}`);

  const orphanedWm = allFiles
    .filter(({ name }) => !referenced.has(`/images/products/${name}`) && name.startsWith("wm-"))
    .map(({ name }) => `/images/products/${name}`);

  const needsRestore = products.filter((p) =>
    p.images.some((img) => (img.split("/").pop() ?? "").startsWith("wm-"))
  );

  return NextResponse.json({ orphanedOriginals, orphanedWm, needsRestore, totalProducts: products.length });
}

// ─── POST: actions ────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  if (!(await checkAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { action } = body;

  // ── Manual assign ──
  if (action === "assign") {
    const { productId, images } = body;
    if (!productId || !Array.isArray(images))
      return NextResponse.json({ error: "productId and images required" }, { status: 400 });
    await prisma.product.update({ where: { id: productId }, data: { images } });
    return NextResponse.json({ ok: true });
  }

  // ── Manual batch assign ──
  if (action === "auto_restore") {
    const { assignments } = body as { assignments: { productId: string; images: string[] }[] };
    if (!Array.isArray(assignments))
      return NextResponse.json({ error: "assignments required" }, { status: 400 });
    let restored = 0;
    for (const { productId, images } of assignments) {
      await prisma.product.update({ where: { id: productId }, data: { images } });
      restored++;
    }
    return NextResponse.json({ ok: true, restored });
  }

  // ── SMART AUTO-MATCH: match originals to products by slug/filename similarity ──
  if (action === "smart_auto_restore") {
    const products = await prisma.product.findMany({
      select: { id: true, name: true, slug: true, images: true },
    });

    const referenced = new Set(products.flatMap((p) => p.images));
    const dir = join(process.cwd(), "public", "images", "products");

    if (!existsSync(dir)) return NextResponse.json({ error: "Папка с изображениями не найдена" }, { status: 500 });

    const allFiles = await readdir(dir);
    const originals = allFiles.filter(
      (f) => !f.startsWith("wm-") && !referenced.has(`/images/products/${f}`)
    );

    // Products that need restoring
    const needsRestore = products.filter((p) =>
      p.images.some((img) => (img.split("/").pop() ?? "").startsWith("wm-"))
    );

    const matched: { productId: string; productName: string; images: string[] }[] = [];
    const unmatched: { productId: string; productName: string }[] = [];
    const usedFiles = new Set<string>();

    for (const product of needsRestore) {
      // Score each original file against this product's slug
      const scored = originals
        .filter((f) => !usedFiles.has(f))
        .map((f) => ({ file: f, score: matchScore(f, product.slug) }))
        .filter((s) => s.score > 0)
        .sort((a, b) => b.score - a.score);

      if (scored.length > 0) {
        // Take the best match(es) — usually 1 file per product, but could be more
        // Heuristic: take all files with score >= best_score * 0.7
        const best = scored[0].score;
        const chosen = scored.filter((s) => s.score >= best * 0.7).map((s) => s.file);

        // Mark as used (so they don't match another product)
        chosen.forEach((f) => usedFiles.add(f));
        matched.push({
          productId: product.id,
          productName: product.name,
          images: chosen.map((f) => `/images/products/${f}`),
        });
      } else {
        unmatched.push({ productId: product.id, productName: product.name });
      }
    }

    // Dry run — just return the plan
    if (body.dryRun) {
      return NextResponse.json({ matched, unmatched, ok: true });
    }

    // Apply matches
    let restored = 0;
    for (const { productId, images } of matched) {
      await prisma.product.update({ where: { id: productId }, data: { images } });
      restored++;
    }

    return NextResponse.json({ ok: true, restored, unmatched, matched });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
