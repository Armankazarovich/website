export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function checkAuth() {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;
  return session && ["SUPER_ADMIN", "ADMIN", "MANAGER", "WAREHOUSE"].includes(role || "");
}

// Parse CSV text → array of row objects keyed by header
function parseCSV(text: string): Record<string, string>[] {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter(Boolean);
  if (lines.length < 2) return [];

  const parseRow = (line: string): string[] => {
    const cells: string[] = [];
    let cur = "";
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
        else inQuote = !inQuote;
      } else if (ch === "," && !inQuote) {
        cells.push(cur); cur = "";
      } else {
        cur += ch;
      }
    }
    cells.push(cur);
    return cells;
  };

  const headers = parseRow(lines[0]);
  return lines.slice(1).map((line) => {
    const vals = parseRow(line);
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h.trim()] = (vals[i] || "").trim(); });
    return obj;
  });
}

export async function POST(req: NextRequest) {
  if (!(await checkAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contentType = req.headers.get("content-type") || "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

  const filename = file.name.toLowerCase();
  let rows: Record<string, string>[] = [];

  if (filename.endsWith(".csv")) {
    const text = await file.text();
    rows = parseCSV(text);
  } else if (filename.endsWith(".xlsx")) {
    try {
      const ExcelJS = await import("exceljs");
      const workbook = new ExcelJS.default.Workbook();
      const buffer = await file.arrayBuffer();
      await workbook.xlsx.load(buffer);
      const sheet = workbook.worksheets[0];
      if (!sheet) return NextResponse.json({ error: "Empty workbook" }, { status: 400 });

      const headers: string[] = [];
      sheet.getRow(1).eachCell((cell) => headers.push(String(cell.value || "").trim()));

      sheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        const obj: Record<string, string> = {};
        row.eachCell((cell, colNumber) => {
          const header = headers[colNumber - 1];
          if (header) obj[header] = String(cell.value ?? "").trim();
        });
        if (Object.values(obj).some(Boolean)) rows.push(obj);
      });
    } catch {
      return NextResponse.json({ error: "Не удалось прочитать XLSX. Убедитесь что файл не повреждён." }, { status: 400 });
    }
  } else {
    return NextResponse.json({ error: "Поддерживаются только .xlsx и .csv файлы" }, { status: 400 });
  }

  if (rows.length === 0) {
    return NextResponse.json({ error: "Файл пустой или не содержит данных" }, { status: 400 });
  }

  let updated = 0;
  let created = 0;
  const errors: string[] = [];

  for (const row of rows) {
    try {
      const variantId = row["id"]?.trim();
      const slug = row["slug"]?.trim();
      const size = row["Размер"]?.trim() || row["size"]?.trim();
      const categoryName = row["Категория"]?.trim() || row["category"]?.trim();
      const productName = row["Товар"]?.trim() || row["name"]?.trim();
      const pricePerCube = row["Цена м³"]?.trim() || row["pricePerCube"]?.trim();
      const pricePerPiece = row["Цена шт"]?.trim() || row["pricePerPiece"]?.trim();
      const piecesPerCube = row["Шт/м³"]?.trim() || row["piecesPerCube"]?.trim();
      const inStockRaw = row["В наличии"]?.trim() ?? row["inStock"]?.trim() ?? "1";
      const saleUnitRaw = (row["Ед.изм."]?.trim() || row["saleUnit"]?.trim() || "BOTH").toUpperCase();
      const saleUnit = ["CUBE", "PIECE", "BOTH"].includes(saleUnitRaw) ? saleUnitRaw as "CUBE" | "PIECE" | "BOTH" : "BOTH";
      const inStock = inStockRaw === "1" || inStockRaw.toLowerCase() === "true" || inStockRaw.toLowerCase() === "да";

      if (!size && !slug) { errors.push(`Строка без размера и slug — пропущена`); continue; }

      // Validate numeric fields
      const parsedPricePerCube = pricePerCube ? parseFloat(pricePerCube) : null;
      const parsedPricePerPiece = pricePerPiece ? parseFloat(pricePerPiece) : null;
      const parsedPiecesPerCube = piecesPerCube ? parseInt(piecesPerCube) : null;

      if (parsedPricePerCube !== null && (isNaN(parsedPricePerCube) || parsedPricePerCube < 0)) {
        errors.push(`Некорректная цена м³ "${pricePerCube}" для ${slug || size}`); continue;
      }
      if (parsedPricePerPiece !== null && (isNaN(parsedPricePerPiece) || parsedPricePerPiece < 0)) {
        errors.push(`Некорректная цена шт "${pricePerPiece}" для ${slug || size}`); continue;
      }
      if (parsedPiecesPerCube !== null && (isNaN(parsedPiecesPerCube) || parsedPiecesPerCube < 0)) {
        errors.push(`Некорректное кол-во шт/м³ "${piecesPerCube}" для ${slug || size}`); continue;
      }

      const variantData = {
        size: size || "—",
        pricePerCube: parsedPricePerCube,
        pricePerPiece: parsedPricePerPiece,
        piecesPerCube: parsedPiecesPerCube,
        inStock,
      };

      // Update by variant ID — most reliable
      if (variantId) {
        const existing = await prisma.productVariant.findUnique({ where: { id: variantId } });
        if (existing) {
          await prisma.productVariant.update({ where: { id: variantId }, data: variantData });
          updated++;
          continue;
        }
      }

      // Fallback: find by slug + size
      if (slug && size) {
        const product = await prisma.product.findUnique({
          where: { slug },
          include: { variants: true },
        });
        if (product) {
          const existingVariant = product.variants.find((v) => v.size === size);
          if (existingVariant) {
            await prisma.productVariant.update({ where: { id: existingVariant.id }, data: variantData });
            updated++;
          } else {
            // Create new variant for existing product
            await prisma.productVariant.create({ data: { productId: product.id, ...variantData } });
            created++;
          }
          // Update product saleUnit if provided
          if (saleUnit !== product.saleUnit) {
            await prisma.product.update({ where: { id: product.id }, data: { saleUnit } });
          }
          continue;
        }
      }

      // Create new product if all required fields present
      if (slug && productName && categoryName && size) {
        // Sanitize inputs: strip HTML tags, limit length
        const safeCategoryName = categoryName.replace(/<[^>]*>/g, "").trim().slice(0, 100);
        const safeProductName = productName.replace(/<[^>]*>/g, "").trim().slice(0, 200);
        const safeSlug = slug.replace(/[^a-zA-Zа-яА-ЯёЁ0-9_-]/g, "").slice(0, 100);
        if (!safeCategoryName || !safeProductName || !safeSlug) {
          errors.push(`Некорректные данные после очистки: slug="${slug}"`); continue;
        }

        let category = await prisma.category.findFirst({ where: { name: safeCategoryName } });
        if (!category) {
          category = await prisma.category.create({
            data: { name: safeCategoryName, slug: safeCategoryName.toLowerCase().replace(/[^a-zа-яёЁ0-9]+/g, "-").replace(/-+$/, "") },
          });
        }
        const newProduct = await prisma.product.create({
          data: {
            slug: safeSlug,
            name: safeProductName,
            categoryId: category.id,
            saleUnit,
            active: true,
          },
        });
        await prisma.productVariant.create({ data: { productId: newProduct.id, ...variantData } });
        created++;
        continue;
      }

      errors.push(`Не удалось обработать строку: slug="${slug}", size="${size}"`);
    } catch (e) {
      errors.push(`Ошибка в строке: ${String(e).slice(0, 100)}`);
    }
  }

  return NextResponse.json({ updated, created, errors });
}
