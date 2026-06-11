export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import { getCurrentTenantId } from "@/lib/tenant-context";

const PRODUCTS_ROLES = ["SUPER_ADMIN", "ADMIN", "MANAGER", "WAREHOUSE", "SELLER"];
const CATEGORY_WRITE_ROLES = ["SUPER_ADMIN", "ADMIN", "MANAGER"];

async function checkCategoryRead() {
  const session = await auth();
  const role = session?.user?.role as string | undefined;
  return session && role && PRODUCTS_ROLES.includes(role);
}

async function checkCategoryWrite() {
  const session = await auth();
  const role = session?.user?.role as string | undefined;
  return session && role && CATEGORY_WRITE_ROLES.includes(role);
}

async function makeUniqueCategorySlug(baseValue: string, tenantId: string) {
  const base = slugify(baseValue) || "category";
  let candidate = base;
  let suffix = 1;

  while (await prisma.category.findUnique({ where: { tenantId_slug: { tenantId, slug: candidate } }, select: { id: true } })) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

export async function GET() {
  if (!(await checkCategoryRead())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = getCurrentTenantId();
  const categories = await prisma.category.findMany({
    where: { tenantId },
    include: {
      parent: { select: { id: true, name: true, slug: true } },
      children: {
        select: { id: true, name: true, slug: true, sortOrder: true, showInMenu: true, showInFooter: true },
        orderBy: { sortOrder: "asc" },
      },
      _count: { select: { products: true, children: true } },
    },
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json(categories);
}

export async function POST(req: Request) {
  if (!(await checkCategoryWrite())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = getCurrentTenantId();
  const { name, slug, image, sortOrder, parentId, seoTitle, seoDescription, showInMenu, showInFooter } = await req.json();
  const cleanName = typeof name === "string" ? name.trim() : "";
  if (!cleanName || cleanName.length > 120) {
    return NextResponse.json({ error: "Название должно быть от 1 до 120 символов" }, { status: 400 });
  }

  if (parentId) {
    const parent = await prisma.category.findFirst({ where: { id: String(parentId), tenantId }, select: { id: true } });
    if (!parent) return NextResponse.json({ error: "Родительская категория не найдена" }, { status: 400 });
  }

  const finalSlug = await makeUniqueCategorySlug(String(slug || cleanName), tenantId);
  const category = await prisma.category.create({
    data: {
      tenantId,
      name: cleanName,
      slug: finalSlug,
      image: image || null,
      sortOrder: sortOrder ?? 0,
      parentId: parentId || null,
      seoTitle: seoTitle || null,
      seoDescription: seoDescription || null,
      showInMenu: showInMenu !== false,
      showInFooter: showInFooter !== false,
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
}
