import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { InventoryClient } from "./inventory-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Склад / Остатки" };

export default async function InventoryPage() {
  const session = await auth();
  if (!session) redirect("/admin/login");

  const variants = await prisma.productVariant.findMany({
    select: {
      id: true,
      size: true,
      pricePerCube: true,
      pricePerPiece: true,
      inStock: true,
      stockQty: true,
      lowStockThreshold: true,
      product: {
        select: { id: true, name: true, slug: true, saleUnit: true, category: { select: { name: true } } },
      },
    },
    orderBy: [
      { product: { name: "asc" } },
      { size: "asc" },
    ],
  });

  return <InventoryClient variants={variants} />;
}
