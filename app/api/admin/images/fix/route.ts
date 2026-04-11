export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { existsSync } from "fs";
import { join } from "path";

async function checkAdmin() {
  const session = await auth();
  return session && session.user.role === "ADMIN";
}

// ── GET: diagnose all product images ─────────────────────────────────────────
export async function GET() {
  if (!(await checkAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const products = await prisma.product.findMany({
    select: { id: true, name: true, slug: true, images: true },
    orderBy: { name: "asc" },
  });

  const publicDir = join(process.cwd(), "public");

  const report = products.map((p) => {
    const seen = new Set<string>();
    const duplicates: string[] = [];
    const broken: string[] = [];
    const ok: string[] = [];

    for (const img of p.images) {
      // Check duplicate
      if (seen.has(img)) {
        duplicates.push(img);
        continue;
      }
      seen.add(img);

      // Check file exists on disk (only for local /images/ paths)
      if (img.startsWith("/images/") || img.startsWith("/uploads/")) {
        const filePath = join(publicDir, img);
        if (!existsSync(filePath)) {
          broken.push(img);
        } else {
          ok.push(img);
        }
      } else {
        // External URL — assume ok
        ok.push(img);
      }
    }

    const uniqueImages = p.images.filter((img, idx, arr) => arr.indexOf(img) === idx);

    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      total: p.images.length,
      unique: uniqueImages.length,
      duplicatesCount: duplicates.length,
      brokenCount: broken.length,
      okCount: ok.length,
      hasDuplicates: duplicates.length > 0,
      hasBroken: broken.length > 0,
      duplicates,
      broken,
    };
  });

  const summary = {
    totalProducts: products.length,
    withDuplicates: report.filter((r) => r.hasDuplicates).length,
    withBroken: report.filter((r) => r.hasBroken).length,
    withNoImages: report.filter((r) => r.total === 0).length,
    totalDuplicateEntries: report.reduce((s, r) => s + r.duplicatesCount, 0),
    totalBrokenRefs: report.reduce((s, r) => s + r.brokenCount, 0),
  };

  return NextResponse.json({ summary, products: report });
}

// ── POST: fix actions ─────────────────────────────────────────────────────────
export async function POST(req: Request) {
  if (!(await checkAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { action, productId } = body;

  // ── Remove duplicates from all products (or single product) ──
  if (action === "deduplicate") {
    const where = productId ? { id: productId } : {};
    const products = await prisma.product.findMany({
      where,
      select: { id: true, images: true },
    });

    let fixed = 0;
    let totalRemoved = 0;

    for (const p of products) {
      const unique = p.images.filter((img, idx, arr) => arr.indexOf(img) === idx);
      if (unique.length < p.images.length) {
        totalRemoved += p.images.length - unique.length;
        await prisma.product.update({
          where: { id: p.id },
          data: { images: unique },
        });
        fixed++;
      }
    }

    return NextResponse.json({ ok: true, fixed, totalRemoved });
  }

  // ── Remove broken image references from all products ──
  if (action === "remove_broken") {
    const publicDir = join(process.cwd(), "public");
    const products = await prisma.product.findMany({
      select: { id: true, images: true },
    });

    let fixed = 0;
    let totalRemoved = 0;

    for (const p of products) {
      const valid = p.images.filter((img) => {
        if (!img.startsWith("/images/") && !img.startsWith("/uploads/")) return true; // external
        return existsSync(join(publicDir, img));
      });

      if (valid.length < p.images.length) {
        totalRemoved += p.images.length - valid.length;
        await prisma.product.update({
          where: { id: p.id },
          data: { images: valid },
        });
        fixed++;
      }
    }

    return NextResponse.json({ ok: true, fixed, totalRemoved });
  }

  // ── Remove wm- watermark duplicates (keep originals, remove wm- versions) ──
  if (action === "remove_wm_duplicates") {
    const products = await prisma.product.findMany({
      select: { id: true, images: true },
    });

    let fixed = 0;
    let totalRemoved = 0;

    for (const p of products) {
      // Keep only non-wm images. If all are wm, keep all (user hasn't restored)
      const hasOriginals = p.images.some((img) => !img.includes("/wm-"));
      let newImages: string[];

      if (hasOriginals) {
        // Remove wm- versions if originals also exist (true duplicates)
        newImages = p.images.filter((img) => !img.includes("/wm-"));
      } else {
        // All are wm, keep them — just deduplicate
        newImages = p.images.filter((img, idx, arr) => arr.indexOf(img) === idx);
      }

      if (newImages.length < p.images.length) {
        totalRemoved += p.images.length - newImages.length;
        await prisma.product.update({
          where: { id: p.id },
          data: { images: newImages },
        });
        fixed++;
      }
    }

    return NextResponse.json({ ok: true, fixed, totalRemoved });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
