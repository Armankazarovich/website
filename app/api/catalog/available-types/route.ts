export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPublicProductsFilter } from "@/lib/product-seo";
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
        ...getPublicProductsFilter(),
        category: category
          ? { slug: category, showInMenu: true }
          : { showInMenu: true },
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
