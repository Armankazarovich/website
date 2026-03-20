import { google } from "googleapis";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";

const getSheets = () => {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  return google.sheets({ version: "v4", auth });
};

interface SheetRow {
  slug: string;
  name: string;
  category: string;
  categorySlug: string;
  size: string;
  pricePerCube: number | null;
  pricePerPiece: number | null;
  piecesPerCube: number | null;
  inStock: boolean;
  description: string;
  saleUnit: "CUBE" | "PIECE" | "BOTH";
}

export async function syncFromGoogleSheets(): Promise<{
  synced: number;
  errors: string[];
}> {
  const sheets = getSheets();
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID;

  if (!spreadsheetId) throw new Error("GOOGLE_SHEETS_ID not set");

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "Sheet1!A2:L1000", // skip header row
  });

  const rows = response.data.values || [];
  const errors: string[] = [];
  let synced = 0;

  for (const row of rows) {
    try {
      const [
        slug,
        name,
        categoryName,
        categorySlug,
        size,
        pricePerCubeStr,
        pricePerPieceStr,
        piecesPerCubeStr,
        inStockStr,
        description,
        saleUnitStr,
      ] = row;

      if (!name || !size) continue;

      const productSlug = slug || slugify(name);
      const catSlug = categorySlug || slugify(categoryName || "general");

      // Upsert category
      const category = await prisma.category.upsert({
        where: { slug: catSlug },
        update: { name: categoryName || catSlug },
        create: { name: categoryName || catSlug, slug: catSlug },
      });

      // Upsert product
      const saleUnit = (["CUBE", "PIECE", "BOTH"].includes(saleUnitStr?.toUpperCase())
        ? saleUnitStr.toUpperCase()
        : "BOTH") as "CUBE" | "PIECE" | "BOTH";

      const product = await prisma.product.upsert({
        where: { slug: productSlug },
        update: {
          name,
          description: description || null,
          categoryId: category.id,
          saleUnit,
        },
        create: {
          slug: productSlug,
          name,
          description: description || null,
          categoryId: category.id,
          images: [],
          saleUnit,
        },
      });

      // Upsert variant
      const pricePerCube = pricePerCubeStr ? parseFloat(pricePerCubeStr) : null;
      const pricePerPiece = pricePerPieceStr ? parseFloat(pricePerPieceStr) : null;
      const piecesPerCube = piecesPerCubeStr ? parseInt(piecesPerCubeStr) : null;
      const inStock = inStockStr?.toLowerCase() !== "false" && inStockStr !== "0";

      // Find existing variant by product+size
      const existingVariant = await prisma.productVariant.findFirst({
        where: { productId: product.id, size },
      });

      if (existingVariant) {
        await prisma.productVariant.update({
          where: { id: existingVariant.id },
          data: { pricePerCube, pricePerPiece, piecesPerCube, inStock },
        });
      } else {
        await prisma.productVariant.create({
          data: {
            productId: product.id,
            size,
            pricePerCube,
            pricePerPiece,
            piecesPerCube,
            inStock,
          },
        });
      }

      synced++;
    } catch (err) {
      errors.push(`Row error: ${err}`);
    }
  }

  return { synced, errors };
}
