import { PrismaClient } from "@prisma/client";
import fs from "fs";

const prisma = new PrismaClient();

async function main() {
  console.log("Exporting data...");

  const data = {
    categories: await prisma.category.findMany(),
    products: await prisma.product.findMany({ include: { variants: true } }),
    reviews: await prisma.review.findMany(),
    promotions: await prisma.promotion.findMany(),
    siteSettings: await prisma.siteSettings.findMany(),
  };

  fs.writeFileSync("C:/Users/StormPC/Desktop/pilorus_export.json", JSON.stringify(data, null, 2));

  console.log(`✅ Exported:`);
  console.log(`   Categories: ${data.categories.length}`);
  console.log(`   Products: ${data.products.length}`);
  console.log(`   Reviews: ${data.reviews.length}`);
  console.log(`   Promotions: ${data.promotions.length}`);
  console.log(`   SiteSettings: ${data.siteSettings.length}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
