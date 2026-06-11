export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { existsSync } from "fs";
import { join } from "path";
import { getCurrentTenantId } from "@/lib/tenant-context";

async function checkAdmin() {
  const session = await auth();
  const role = session?.user?.role;
  return role === "SUPER_ADMIN" || role === "ADMIN";
}

const PRODUCT_IMAGE_EXTENSIONS = ["webp", "jpg", "jpeg", "png", "gif"] as const;

function findExactProductImage(slug: string): string | null {
  const dir = join(process.cwd(), "public", "images", "products");
  if (!existsSync(dir)) return null;

  for (const ext of PRODUCT_IMAGE_EXTENSIONS) {
    const filename = `${slug}.${ext}`;
    if (existsSync(join(dir, filename))) return `/images/products/${filename}`;
  }

  return null;
}

function originalCandidatesForWatermarkedImage(imageUrl: string): string[] {
  const slashIndex = imageUrl.lastIndexOf("/");
  const dir = slashIndex >= 0 ? imageUrl.slice(0, slashIndex + 1) : "";
  const filename = slashIndex >= 0 ? imageUrl.slice(slashIndex + 1) : imageUrl;
  if (!filename.startsWith("wm-")) return [];

  const originalBase = filename
    .replace(/^wm-/, "")
    .replace(/-[a-f0-9]{10}\.webp$/i, "");

  if (!originalBase) return [];
  return PRODUCT_IMAGE_EXTENSIONS.map((ext) => `${dir}${originalBase}.${ext}`);
}

function hasOriginalForWatermarkedImage(imageUrl: string, imageSet: Set<string>) {
  return originalCandidatesForWatermarkedImage(imageUrl).some((candidate) => imageSet.has(candidate));
}

// ── GET: diagnose all product images ─────────────────────────────────────────
export async function GET() {
  if (!(await checkAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = getCurrentTenantId();

  const products = await prisma.product.findMany({
    where: { tenantId },
    select: { id: true, name: true, slug: true, images: true },
    orderBy: { name: "asc" },
  });

  const publicDir = join(process.cwd(), "public");

  const report = products.map((p) => {
    const seen = new Set<string>();
    const duplicates: string[] = [];
    const broken: string[] = [];
    const ok: string[] = [];

    const imageSet = new Set(p.images);
    const wmDuplicates = p.images.filter((img) => hasOriginalForWatermarkedImage(img, imageSet));

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

    const suggestedImage = p.images.length === 0 ? findExactProductImage(p.slug) : null;

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
      suggestedImage,
      wmDuplicates,
      wmDuplicatesCount: wmDuplicates.length,
      hasWmDuplicates: wmDuplicates.length > 0,
    };
  });

  const summary = {
    totalProducts: products.length,
    withDuplicates: report.filter((r) => r.hasDuplicates).length,
    withBroken: report.filter((r) => r.hasBroken).length,
    withNoImages: report.filter((r) => r.total === 0).length,
    withRestorableNoImages: report.filter((r) => r.total === 0 && r.suggestedImage).length,
    withWmDuplicates: report.filter((r) => r.hasWmDuplicates).length,
    totalDuplicateEntries: report.reduce((s, r) => s + r.duplicatesCount, 0),
    totalBrokenRefs: report.reduce((s, r) => s + r.brokenCount, 0),
    totalWmDuplicateRefs: report.reduce((s, r) => s + r.wmDuplicatesCount, 0),
  };

  return NextResponse.json({ summary, products: report });
}

// ── POST: fix actions ─────────────────────────────────────────────────────────
export async function POST(req: Request) {
  if (!(await checkAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = getCurrentTenantId();

  const body = await req.json();
  const { action, productId } = body;

  // ── Remove duplicates from all products (or single product) ──
  if (action === "deduplicate") {
    const where = productId ? { id: productId, tenantId } : { tenantId };
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
      where: { tenantId },
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

  // ── Fill missing product images by exact slug filename ──
  if (action === "fill_missing_by_slug") {
    const products = await prisma.product.findMany({
      where: { tenantId },
      select: { id: true, slug: true, images: true },
    });

    let fixed = 0;
    for (const product of products) {
      if (product.images.length > 0) continue;
      const image = findExactProductImage(product.slug);
      if (!image) continue;
      await prisma.product.update({
        where: { id: product.id },
        data: { images: [image] },
      });
      fixed++;
    }

    return NextResponse.json({ ok: true, fixed, totalRemoved: 0 });
  }

  // ── Remove wm- watermark duplicates (keep originals, remove wm- versions) ──
  if (action === "remove_wm_duplicates") {
    const products = await prisma.product.findMany({
      where: { tenantId },
      select: { id: true, images: true },
    });

    let fixed = 0;
    let totalRemoved = 0;

    for (const p of products) {
      const imageSet = new Set(p.images);
      const newImages = p.images.filter((img) => !hasOriginalForWatermarkedImage(img, imageSet));

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
