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

// GET — list products with wm- images + orphaned original files on disk
export async function GET() {
  if (!(await checkAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const products = await prisma.product.findMany({
    select: { id: true, name: true, slug: true, images: true },
    orderBy: { name: "asc" },
  });

  // All image URLs currently referenced in DB
  const referenced = new Set(products.flatMap((p) => p.images));

  // Scan public/images/products directory
  const dir = join(process.cwd(), "public", "images", "products");
  let allFiles: string[] = [];
  if (existsSync(dir)) {
    const files = await readdir(dir);
    // Get files with their creation time for sorting
    const withStats = await Promise.all(
      files.map(async (f) => {
        try {
          const s = await stat(join(dir, f));
          return { name: f, mtime: s.mtimeMs };
        } catch {
          return { name: f, mtime: 0 };
        }
      })
    );
    // Sort oldest first (originals were uploaded before watermarks)
    allFiles = withStats.sort((a, b) => a.mtime - b.mtime).map((f) => f.name);
  }

  // Orphaned originals = files on disk NOT in DB AND NOT starting with "wm-"
  // Files starting with "wm-" are watermarked versions (even if orphaned = 1st round wm)
  const orphanedOriginals = allFiles
    .filter((f) => {
      const url = `/images/products/${f}`;
      return !referenced.has(url) && !f.startsWith("wm-");
    })
    .map((f) => `/images/products/${f}`);

  // Also include wm- orphans (1st-round watermarks) separately, just in case
  const orphanedWm = allFiles
    .filter((f) => {
      const url = `/images/products/${f}`;
      return !referenced.has(url) && f.startsWith("wm-");
    })
    .map((f) => `/images/products/${f}`);

  // Products that have any wm- images
  const needsRestore = products.filter((p) =>
    p.images.some((img) => {
      const filename = img.split("/").pop() ?? "";
      return filename.startsWith("wm-");
    })
  );

  return NextResponse.json({
    orphanedOriginals,
    orphanedWm,
    needsRestore,
    totalProducts: products.length,
  });
}

// POST — assign images back to a product
export async function POST(req: Request) {
  if (!(await checkAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { action } = body;

  // Assign specific images to a product
  if (action === "assign") {
    const { productId, images } = body;
    if (!productId || !Array.isArray(images))
      return NextResponse.json({ error: "productId and images required" }, { status: 400 });

    await prisma.product.update({ where: { id: productId }, data: { images } });
    return NextResponse.json({ ok: true });
  }

  // Auto-restore: try to match by count (1 product = 1 original file group)
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

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
