import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function checkAdmin() {
  const session = await auth();
  return session && (session.user as any).role === "ADMIN";
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  if (!(await checkAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const product = await prisma.product.findUnique({
    where: { id: params.id },
    include: { category: true, variants: { orderBy: { size: "asc" } } },
  });
  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(product);
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  if (!(await checkAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { name, slug, description, categoryId, images, saleUnit, active, featured, variants } = body;

  // Update product
  await prisma.product.update({
    where: { id: params.id },
    data: {
      ...(name !== undefined && { name }),
      ...(slug !== undefined && { slug }),
      ...(description !== undefined && { description }),
      ...(categoryId !== undefined && { categoryId }),
      ...(images !== undefined && { images }),
      ...(saleUnit !== undefined && { saleUnit }),
      ...(active !== undefined && { active }),
      ...(featured !== undefined && { featured }),
    },
  });

  // Update variants if provided
  if (variants !== undefined) {
    const existingVariants = await prisma.productVariant.findMany({
      where: { productId: params.id },
      select: { id: true },
    });
    const existingIds = new Set(existingVariants.map((v: { id: string }) => v.id));
    const incomingIds = new Set(variants.filter((v: any) => v.id).map((v: any) => v.id));

    // Delete removed variants
    for (const id of Array.from(existingIds)) {
      if (!incomingIds.has(id)) {
        await prisma.productVariant.delete({ where: { id } }).catch(() => {});
      }
    }

    // Upsert each variant
    for (const v of variants) {
      if (v.id && existingIds.has(v.id)) {
        await prisma.productVariant.update({
          where: { id: v.id },
          data: {
            size: v.size,
            pricePerCube: v.pricePerCube ? Number(v.pricePerCube) : null,
            pricePerPiece: v.pricePerPiece ? Number(v.pricePerPiece) : null,
            piecesPerCube: v.piecesPerCube ? Number(v.piecesPerCube) : null,
            inStock: v.inStock ?? true,
          },
        });
      } else {
        await prisma.productVariant.create({
          data: {
            productId: params.id,
            size: v.size,
            pricePerCube: v.pricePerCube ? Number(v.pricePerCube) : null,
            pricePerPiece: v.pricePerPiece ? Number(v.pricePerPiece) : null,
            piecesPerCube: v.piecesPerCube ? Number(v.piecesPerCube) : null,
            inStock: v.inStock ?? true,
          },
        });
      }
    }
  }

  const updated = await prisma.product.findUnique({
    where: { id: params.id },
    include: { category: true, variants: { orderBy: { size: "asc" } } },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  if (!(await checkAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await prisma.product.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
