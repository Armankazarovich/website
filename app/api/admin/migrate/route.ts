import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: string[] = [];

  try {
    // Add new Role enum values
    await prisma.$executeRaw`ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'MANAGER'`;
    results.push("✅ Role.MANAGER added");
  } catch (e: any) { results.push(`⚠️ Role.MANAGER: ${e.message}`); }

  try {
    await prisma.$executeRaw`ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'COURIER'`;
    results.push("✅ Role.COURIER added");
  } catch (e: any) { results.push(`⚠️ Role.COURIER: ${e.message}`); }

  try {
    await prisma.$executeRaw`ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'ACCOUNTANT'`;
    results.push("✅ Role.ACCOUNTANT added");
  } catch (e: any) { results.push(`⚠️ Role.ACCOUNTANT: ${e.message}`); }

  try {
    await prisma.$executeRaw`ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'WAREHOUSE'`;
    results.push("✅ Role.WAREHOUSE added");
  } catch (e: any) { results.push(`⚠️ Role.WAREHOUSE: ${e.message}`); }

  try {
    await prisma.$executeRaw`ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'SELLER'`;
    results.push("✅ Role.SELLER added");
  } catch (e: any) { results.push(`⚠️ Role.SELLER: ${e.message}`); }

  try {
    await prisma.$executeRaw`ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'IN_DELIVERY'`;
    results.push("✅ OrderStatus.IN_DELIVERY added");
  } catch (e: any) { results.push(`⚠️ OrderStatus.IN_DELIVERY: ${e.message}`); }

  try {
    await prisma.$executeRaw`ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'READY_PICKUP'`;
    results.push("✅ OrderStatus.READY_PICKUP added");
  } catch (e: any) { results.push(`⚠️ OrderStatus.READY_PICKUP: ${e.message}`); }

  try {
    await prisma.$executeRaw`
      DO $$ BEGIN
        CREATE TYPE "StaffStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `;
    results.push("✅ StaffStatus enum created");
  } catch (e: any) { results.push(`⚠️ StaffStatus enum: ${e.message}`); }

  try {
    await prisma.$executeRaw`
      ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "staffStatus" "StaffStatus"
    `;
    results.push("✅ User.staffStatus column added");
  } catch (e: any) { results.push(`⚠️ User.staffStatus: ${e.message}`); }

  try {
    await prisma.$executeRaw`
      ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "customRole" TEXT
    `;
    results.push("✅ User.customRole column added");
  } catch (e: any) { results.push(`⚠️ User.customRole: ${e.message}`); }

  // Fix promotions text — remove specific percentages
  try {
    const promotions = await prisma.promotion.findMany();
    const volumePromo = promotions.find(
      (p) => p.title.toLowerCase().includes("объём") || p.title.toLowerCase().includes("объем") || p.title.toLowerCase().includes("скидк")
    );
    if (volumePromo) {
      await prisma.promotion.update({
        where: { id: volumePromo.id },
        data: {
          title: "Скидки при большом объёме",
          description: "Чем больше объём заказа — тем выгоднее цена. Скидки на крупные партии обсуждаются индивидуально с менеджером. Звоните нам — рассчитаем лучшее предложение для вашего проекта.",
          discount: null,
        },
      });
      results.push("✅ Volume promo text fixed (removed specific %)");
    } else {
      results.push("ℹ️ Volume promo not found — skipped");
    }
  } catch (e: any) { results.push(`⚠️ Promo fix: ${e.message}`); }

  try {
    const updated = await prisma.$executeRaw`
      UPDATE "Promotion"
      SET description = 'При заказе пиломатериалов от 10 м³ доставка по Москве и Московской области полностью бесплатна. Используем собственный транспорт.',
          discount = NULL
      WHERE title ILIKE '%доставк%' OR description ILIKE '%экономи%'
    `;
    results.push(`✅ Delivery promo text fixed via SQL (rows: ${updated})`);
  } catch (e: any) { results.push(`⚠️ Delivery promo fix: ${e.message}`); }

  return NextResponse.json({ ok: true, results });
}
