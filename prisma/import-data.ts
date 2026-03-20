import { PrismaClient } from "@prisma/client";
import fs from "fs";

const prisma = new PrismaClient();

async function main() {
  const raw = fs.readFileSync("/home/armankmb/pilo-rus/app/pilorus_export.json", "utf-8");
  const data = JSON.parse(raw);

  console.log("🗑️  Clearing existing data...");
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.review.deleteMany();
  await prisma.promotion.deleteMany();

  console.log("📦 Importing categories...");
  for (const cat of data.categories) {
    await prisma.category.create({ data: cat });
  }

  console.log("📦 Importing products...");
  for (const product of data.products) {
    const { variants, ...productData } = product;
    await prisma.product.create({
      data: {
        ...productData,
        variants: {
          create: variants.map((v: any) => {
            const { productId, ...variantData } = v;
            return variantData;
          }),
        },
      },
    });
  }

  console.log("⭐ Importing reviews...");
  for (const review of data.reviews) {
    await prisma.review.create({ data: review });
  }

  console.log("🎁 Importing promotions...");
  for (const promo of data.promotions) {
    await prisma.promotion.create({ data: promo });
  }

  console.log("✅ Import complete!");
  console.log(`   Categories: ${data.categories.length}`);
  console.log(`   Products: ${data.products.length}`);
  console.log(`   Reviews: ${data.reviews.length}`);
  console.log(`   Promotions: ${data.promotions.length}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
