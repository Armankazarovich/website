import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🔍 Searching for volume discount promotion...");

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
    console.log(`✅ Updated: "${volumePromo.title}" → "Скидки при большом объёме"`);
  } else {
    console.log("⚠️  Volume discount promotion not found. Showing all:");
    promotions.forEach((p) =>
      console.log(`  title: "${p.title}" | desc: "${p.description?.slice(0, 60)}..."`)
    );
  }

  console.log("✅ Done!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
