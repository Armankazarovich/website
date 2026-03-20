import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🔍 Fixing all promotions...");

  const promotions = await prisma.promotion.findMany();
  console.log(`Found ${promotions.length} promotions:`);
  promotions.forEach((p) => console.log(`  - [${p.id}] ${p.title}`));

  // Fix "volume discount" promotion — remove specific percentages
  const volumePromo = promotions.find(
    (p) =>
      p.title.toLowerCase().includes("объём") ||
      p.title.toLowerCase().includes("объем") ||
      p.title.toLowerCase().includes("скидк")
  );

  if (volumePromo) {
    await prisma.promotion.update({
      where: { id: volumePromo.id },
      data: {
        title: "Скидки при большом объёме",
        description:
          "Чем больше объём заказа — тем выгоднее цена. Скидки на крупные партии обсуждаются индивидуально с менеджером. Звоните нам — рассчитаем лучшее предложение для вашего проекта.",
        discount: null,
      },
    });
    console.log(`✅ Updated volume promo`);
  }

  // Fix "free delivery" promotion — remove specific savings amount
  const deliveryPromo = promotions.find(
    (p) =>
      p.title.toLowerCase().includes("доставк") ||
      p.description?.toLowerCase().includes("8 000") ||
      p.description?.toLowerCase().includes("8000")
  );

  if (deliveryPromo) {
    await prisma.promotion.update({
      where: { id: deliveryPromo.id },
      data: {
        title: "Бесплатная доставка от 10 м³",
        description:
          "При заказе пиломатериалов от 10 м³ доставка по Москве и Московской области полностью бесплатна. Используем собственный транспорт.",
        discount: null,
      },
    });
    console.log(`✅ Updated delivery promo — removed specific savings amount`);
  }

  console.log("✅ Done!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
