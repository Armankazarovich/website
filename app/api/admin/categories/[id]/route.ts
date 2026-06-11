export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import { getCurrentTenantId } from "@/lib/tenant-context";

const CATEGORY_WRITE_ROLES = ["SUPER_ADMIN", "ADMIN", "MANAGER"];

async function checkCategoryWrite() {
  const session = await auth();
  const role = session?.user?.role as string | undefined;
  return session && role && CATEGORY_WRITE_ROLES.includes(role);
}

async function checkAdmin() {
  const session = await auth();
  const role = session?.user?.role as string | undefined;
  return session && (role === "ADMIN" || role === "SUPER_ADMIN");
}

async function makeUniqueCategorySlug(baseValue: string, currentCategoryId: string, tenantId: string) {
  const base = slugify(baseValue) || "category";
  let candidate = base;
  let suffix = 1;

  while (true) {
    const existing = await prisma.category.findUnique({
      where: { tenantId_slug: { tenantId, slug: candidate } },
      select: { id: true },
    });
    if (!existing || existing.id === currentCategoryId) return candidate;
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
}

// Detect cycle: check if candidateParent is in children tree of category
async function wouldCreateCycle(categoryId: string, candidateParentId: string, tenantId: string): Promise<boolean> {
  if (candidateParentId === categoryId) return true;
  // Walk up from candidate; if we reach categoryId, cycle
  let current: string | null = candidateParentId;
  const visited = new Set<string>();
  while (current) {
    if (current === categoryId) return true;
    if (visited.has(current)) return true; // already has cycle
    visited.add(current);
    const parent: { parentId: string | null } | null = await prisma.category.findFirst({
      where: { id: current, tenantId },
      select: { parentId: true },
    });
    current = parent?.parentId ?? null;
  }
  return false;
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  if (!(await checkCategoryWrite()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = getCurrentTenantId();

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }

  // Validate name length
  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (!name || name.length > 120) {
      return NextResponse.json(
        { error: "Название должно быть от 1 до 120 символов" },
        { status: 400 }
      );
    }
  }

  const currentCategory = await prisma.category.findFirst({
    where: { id: params.id, tenantId },
    select: { id: true, name: true, slug: true },
  });
  if (!currentCategory) {
    return NextResponse.json({ error: "Категория не найдена" }, { status: 404 });
  }
  const categoryId = currentCategory.id;

  // Cycle prevention — if setting parentId, ensure no loop
  if (body.parentId) {
    const parent = await prisma.category.findFirst({
      where: { id: String(body.parentId), tenantId },
      select: { id: true },
    });
    if (!parent) {
      return NextResponse.json({ error: "Родительская категория не найдена" }, { status: 400 });
    }
    const cycle = await wouldCreateCycle(categoryId, String(body.parentId), tenantId);
    if (cycle) {
      return NextResponse.json(
        { error: "Нельзя сделать эту категорию дочерней её потомка — получится цикл" },
        { status: 400 }
      );
    }
  }

  const nextSlug =
    body.slug !== undefined
      ? await makeUniqueCategorySlug(String(body.slug || body.name || currentCategory.name), categoryId, tenantId)
      : undefined;

  try {
    const category = await prisma.category.update({
      where: { id: categoryId },
      data: {
        ...(body.name !== undefined && { name: String(body.name).trim() }),
        ...(nextSlug !== undefined && { slug: nextSlug }),
        ...(body.image !== undefined && { image: body.image as string | null }),
        ...(body.sortOrder !== undefined && { sortOrder: Number(body.sortOrder) }),
        ...(body.parentId !== undefined && { parentId: body.parentId ? String(body.parentId) : null }),
        ...(body.seoTitle !== undefined && { seoTitle: (body.seoTitle as string) || null }),
        ...(body.seoDescription !== undefined && { seoDescription: (body.seoDescription as string) || null }),
        ...(body.showInMenu !== undefined && { showInMenu: !!body.showInMenu }),
        ...(body.showInFooter !== undefined && { showInFooter: !!body.showInFooter }),
      },
      include: {
        parent: { select: { id: true, name: true, slug: true } },
        children: {
          select: { id: true, name: true, slug: true, sortOrder: true, showInMenu: true, showInFooter: true },
          orderBy: { sortOrder: "asc" },
        },
        _count: { select: { products: true, children: true } },
      },
    });
    revalidateTag("store-shell-data");
    revalidatePath("/catalog");
    revalidatePath("/sitemap.xml");
    return NextResponse.json(category);
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code === "P2002") {
      return NextResponse.json(
        { error: "Такой slug уже существует" },
        { status: 409 }
      );
    }
    const msg = err instanceof Error ? err.message : "Ошибка обновления";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  if (!(await checkAdmin()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = getCurrentTenantId();

  // Check for products and children BEFORE delete
  const category = await prisma.category.findFirst({
    where: { id: params.id, tenantId },
    include: {
      _count: { select: { products: true, children: true } },
    },
  });

  if (!category) {
    return NextResponse.json({ error: "Категория не найдена" }, { status: 404 });
  }

  if (category._count.products > 0) {
    return NextResponse.json(
      {
        error: `В этой категории ${category._count.products} товаров. Перенесите их в другую категорию перед удалением.`,
      },
      { status: 400 }
    );
  }

  if (category._count.children > 0) {
    return NextResponse.json(
      {
        error: `У категории есть ${category._count.children} подкатегорий. Удалите или перенесите их сначала.`,
      },
      { status: 400 }
    );
  }

  try {
    await prisma.category.delete({ where: { id: category.id } });
    revalidateTag("store-shell-data");
    revalidatePath("/catalog");
    revalidatePath("/sitemap.xml");
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code === "P2003") {
      return NextResponse.json(
        { error: "Нельзя удалить: категория используется в других связях" },
        { status: 400 }
      );
    }
    const msg = err instanceof Error ? err.message : "Ошибка удаления";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
