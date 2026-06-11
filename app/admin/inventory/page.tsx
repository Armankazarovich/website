import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentTenantId } from "@/lib/tenant-context";
import { InventoryClient } from "./inventory-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Склад / Остатки" };

const INVENTORY_ROLES = new Set(["SUPER_ADMIN", "ADMIN", "MANAGER", "WAREHOUSE"]);

export default async function InventoryPage() {
  const session = await auth();
  if (!session) redirect("/login");
  const role = session.user?.role as string | undefined;
  if (!role || !INVENTORY_ROLES.has(role)) redirect("/admin");
  const tenantId = getCurrentTenantId();

  const variants = await prisma.productVariant.findMany({
    where: { product: { tenantId } },
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

  const clientVariants = variants.map((variant) => ({
    ...variant,
    pricePerCube: variant.pricePerCube === null ? null : Number(variant.pricePerCube),
    pricePerPiece: variant.pricePerPiece === null ? null : Number(variant.pricePerPiece),
    stockQty: variant.stockQty === null ? null : Number(variant.stockQty),
    lowStockThreshold: variant.lowStockThreshold ?? 0,
  }));

  return <InventoryClient variants={clientVariants} />;
}
