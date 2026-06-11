export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { extractProductType, getDefaultProductTypes } from "@/lib/product-types";
import { getCurrentTenantId } from "@/lib/tenant-context";
import {
  applyProductTypeSettings,
  getProductTypeSettings,
  saveProductTypeSettings,
} from "@/lib/product-type-settings";

const PRODUCT_TYPE_ROLES = ["SUPER_ADMIN", "ADMIN", "MANAGER"];

async function checkAccess() {
  const session = await auth();
  const role = session?.user?.role as string | undefined;
  return Boolean(session && role && PRODUCT_TYPE_ROLES.includes(role));
}

export async function GET() {
  if (!(await checkAccess())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const tenantId = getCurrentTenantId();

  const [settings, products] = await Promise.all([
    getProductTypeSettings(),
    prisma.product.findMany({
      where: { tenantId },
      select: {
        name: true,
        active: true,
        category: { select: { name: true, slug: true } },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  const countByKeyword = new Map<string, number>();
  const examplesByKeyword = new Map<string, string[]>();
  for (const product of products) {
    const type = extractProductType(product.name);
    if (!type) continue;
    countByKeyword.set(type.keyword, (countByKeyword.get(type.keyword) ?? 0) + 1);
    const examples = examplesByKeyword.get(type.keyword) ?? [];
    if (examples.length < 4) examples.push(product.name);
    examplesByKeyword.set(type.keyword, examples);
  }

  const items = applyProductTypeSettings(getDefaultProductTypes(), settings, {
    includeInactive: true,
  }).map((type) => ({
    ...type,
    count: countByKeyword.get(type.keyword) ?? 0,
    examples: examplesByKeyword.get(type.keyword) ?? [],
  }));

  return NextResponse.json({ items });
}

export async function PATCH(req: Request) {
  if (!(await checkAccess())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { items?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }

  if (!Array.isArray(body.items)) {
    return NextResponse.json({ error: "Нужен список типов товара" }, { status: 400 });
  }

  const settings = await saveProductTypeSettings(body.items as Parameters<typeof saveProductTypeSettings>[0]);
  const items = applyProductTypeSettings(getDefaultProductTypes(), settings, {
    includeInactive: true,
  });

  return NextResponse.json({ ok: true, items });
}
