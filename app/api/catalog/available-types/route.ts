export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPublicProductsFilter } from "@/lib/product-seo";
import { DEFAULT_TENANT_ID } from "@/lib/tenant-context";
import {
  getManagedProductTypes,
  getProductTypeSettings,
} from "@/lib/product-type-settings";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");

  const [settings, products] = await Promise.all([
    getProductTypeSettings(),
    prisma.product.findMany({
      where: {
        tenantId: DEFAULT_TENANT_ID,
        ...getPublicProductsFilter(),
        category: category
          ? { tenantId: DEFAULT_TENANT_ID, slug: category, showInMenu: true }
          : { tenantId: DEFAULT_TENANT_ID, showInMenu: true },
      },
      select: { name: true },
    }),
  ]);

  const types = getManagedProductTypes(
    products.map((product) => product.name),
    settings,
  );

  return NextResponse.json({ types });
}
