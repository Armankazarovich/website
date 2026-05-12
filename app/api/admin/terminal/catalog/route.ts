export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPublicProductsFilter, getPublicVariantsFilter } from "@/lib/product-seo";
import { requireTerminalStaff } from "@/lib/terminal-auth";

const HIDDEN_CATEGORY_SORT_ORDER = 999;

export async function GET() {
  const access = await requireTerminalStaff();
  if (!access.authorized) return access.response;

  const products = await prisma.product.findMany({
    where: {
      ...getPublicProductsFilter(),
      category: {
        showInMenu: true,
        sortOrder: { lt: HIDDEN_CATEGORY_SORT_ORDER },
      },
    },
    include: {
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
          showInMenu: true,
          sortOrder: true,
        },
      },
      variants: {
        where: getPublicVariantsFilter(),
        orderBy: [
          { sortOrder: "asc" },
          { pricePerCube: "asc" },
          { pricePerPiece: "asc" },
        ],
      },
    },
    orderBy: [
      { category: { sortOrder: "asc" } },
      { name: "asc" },
    ],
  });

  return NextResponse.json(products.filter((product) => product.variants.length > 0));
}
