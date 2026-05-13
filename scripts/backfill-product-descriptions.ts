import { PrismaClient } from "@prisma/client";
import { makeShortProductDescription, normalizeProductText } from "../lib/product-descriptions";
import { generateProductDescription } from "../lib/product-seo";

const prisma = new PrismaClient();

function needsShortDescription(value?: string | null) {
  const text = normalizeProductText(value);
  return !text || text.length < 55 || text.length > 155;
}

function needsFullDescription(value?: string | null) {
  const text = normalizeProductText(value);
  return !text || text.length < 180;
}

async function main() {
  const settingsRows = await prisma.siteSettings.findMany();
  const settings = Object.fromEntries(settingsRows.map((row) => [row.key, row.value]));

  const products = await prisma.product.findMany({
    include: {
      category: { select: { name: true } },
      variants: {
        select: {
          size: true,
          pricePerCube: true,
          pricePerPiece: true,
          inStock: true,
        },
      },
    },
  });

  let updated = 0;
  let shortUpdated = 0;
  let fullUpdated = 0;

  for (const product of products) {
    const data: { shortDescription?: string; description?: string } = {};
    const fullBefore = normalizeProductText(product.description);

    let fullDescription = fullBefore;
    if (needsFullDescription(fullBefore)) {
      fullDescription = generateProductDescription(
        {
          name: product.name,
          description: fullBefore,
          category: product.category,
          variants: product.variants.map((variant) => ({
            size: variant.size,
            pricePerCube: variant.pricePerCube ? Number(variant.pricePerCube) : null,
            pricePerPiece: variant.pricePerPiece ? Number(variant.pricePerPiece) : null,
            inStock: variant.inStock,
          })),
        },
        settings
      );
      data.description = fullDescription;
      fullUpdated += 1;
    }

    if (needsShortDescription(product.shortDescription)) {
      data.shortDescription = makeShortProductDescription(fullDescription, product.name);
      shortUpdated += 1;
    }

    if (Object.keys(data).length > 0) {
      await prisma.product.update({
        where: { id: product.id },
        data,
      });
      updated += 1;
    }
  }

  console.log(
    JSON.stringify(
      {
        scanned: products.length,
        updated,
        shortUpdated,
        fullUpdated,
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
