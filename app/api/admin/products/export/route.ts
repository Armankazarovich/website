export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function checkAuth() {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;
  return session && ["SUPER_ADMIN", "ADMIN", "MANAGER", "WAREHOUSE"].includes(role || "");
}

export async function GET(req: NextRequest) {
  if (!(await checkAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const format = req.nextUrl.searchParams.get("format") || "xlsx";

  const products = await prisma.product.findMany({
    include: {
      category: true,
      variants: { orderBy: { size: "asc" } },
    },
    orderBy: { name: "asc" },
  });

  // Build rows — one row per variant
  const rows: string[][] = [];
  for (const product of products) {
    for (const v of product.variants) {
      rows.push([
        v.id,
        product.slug,
        product.category.name,
        product.name,
        v.size,
        v.pricePerCube != null ? String(v.pricePerCube) : "",
        v.pricePerPiece != null ? String(v.pricePerPiece) : "",
        v.piecesPerCube != null ? String(v.piecesPerCube) : "",
        v.inStock ? "1" : "0",
        product.saleUnit,
        product.active ? "1" : "0",
      ]);
    }
  }

  const headers = ["id", "slug", "Категория", "Товар", "Размер", "Цена м³", "Цена шт", "Шт/м³", "В наличии", "Ед.изм.", "Активен"];

  if (format === "csv") {
    const csvRows = [headers, ...rows].map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
    );
    const csvContent = csvRows.join("\n");
    const date = new Date().toISOString().split("T")[0];
    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="pilorus-tovary-${date}.csv"`,
      },
    });
  }

  // XLSX format — build minimal xlsx manually (no external lib needed)
  try {
    // Try to use exceljs if available
    const ExcelJS = await import("exceljs").catch(() => null);

    if (ExcelJS) {
      const workbook = new ExcelJS.default.Workbook();
      const sheet = workbook.addWorksheet("Товары");

      // Header row with styling
      const headerRow = sheet.addRow(headers);
      headerRow.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFF00" } };
        cell.font = { bold: true };
        cell.border = { bottom: { style: "thin" } };
      });

      // Data rows
      for (const row of rows) {
        sheet.addRow(row);
      }

      // Auto-fit columns
      sheet.columns.forEach((col) => {
        let maxLen = 10;
        col.eachCell?.((cell) => {
          const len = String(cell.value || "").length;
          if (len > maxLen) maxLen = len;
        });
        col.width = Math.min(maxLen + 2, 40);
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const date = new Date().toISOString().split("T")[0];
      return new NextResponse(buffer as ArrayBuffer, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="pilorus-tovary-${date}.xlsx"`,
        },
      });
    }
  } catch {
    // Fall through to CSV if exceljs not available
  }

  // Fallback — return CSV with xlsx filename hint
  const csvRows = [headers, ...rows].map((row) =>
    row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
  );
  const csvContent = "\uFEFF" + csvRows.join("\n"); // BOM for Excel
  const date = new Date().toISOString().split("T")[0];
  return new NextResponse(csvContent, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="pilorus-tovary-${date}.csv"`,
    },
  });
}
