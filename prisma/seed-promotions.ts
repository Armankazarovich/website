import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Adding promotions...");

  await prisma.promotion.createMany({
    data: [
      {
        title: "Скидки при большом объёме — до 30%",
        description:
          "От 5 м³ — скидка 5%, от 15 м³ — скидка 15%, от 30 м³ — скидка 30%. Чем больше объём заказа, тем выгоднее цена. Скидка применяется автоматически — уточните у менеджера.",
        discount: 30,
        active: true,
      },
      {
        title: "Бесплатная доставка от 10 м³",
        description:
          "При заказе пиломатериалов от 10 м³ доставка по Москве и Московской области полностью бесплатна. Используем собственный транспорт. Экономия до 8 000 ₽.",
        discount: null,
        active: true,
      },
    ],
  });

  console.log("✅ 2 promotions added successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
