import { google } from "googleapis";
import { prisma } from "@/lib/prisma";

// ─── Transliteration ────────────────────────────────────────────────────────
const TMAP: Record<string, string> = {
  а:"a",б:"b",в:"v",г:"g",д:"d",е:"e",ё:"yo",ж:"zh",з:"z",
  и:"i",й:"j",к:"k",л:"l",м:"m",н:"n",о:"o",п:"p",р:"r",
  с:"s",т:"t",у:"u",ф:"f",х:"kh",ц:"ts",ч:"ch",ш:"sh",
  щ:"shch",ъ:"",ы:"y",ь:"",э:"e",ю:"yu",я:"ya",
};

export function transliterate(str: string): string {
  return str
    .toLowerCase()
    .split("")
    .map((c) => TMAP[c] ?? c)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

// ─── Auth helper ────────────────────────────────────────────────────────────
export async function getSheetsClient() {
  const row = await prisma.siteSettings.findUnique({ where: { key: "google_service_account" } });
  if (!row?.value) throw new Error("Ключ сервисного аккаунта Google не настроен");
  const creds = JSON.parse(row.value);
  const auth = new google.auth.GoogleAuth({
    credentials: creds,
    scopes: [
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/drive",
    ],
  });
  return {
    sheets: google.sheets({ version: "v4", auth }),
    drive: google.drive({ version: "v3", auth }),
    serviceEmail: creds.client_email as string,
  };
}

// ─── Sheet columns ───────────────────────────────────────────────────────────
export const SHEET_HEADERS = [
  "Название товара",   // A
  "Slug (авто)",       // B  ← auto, locked
  "Категория",         // C
  "Размер",            // D
  "Цена м³",           // E
  "Цена шт",           // F
  "Шт/м³",             // G
  "Остаток",           // H
  "В наличии",         // I  TRUE/FALSE
  "Ед.продажи",        // J  CUBE/PIECE/BOTH
  "Активен",           // K  TRUE/FALSE
];

const EXAMPLE_ROWS = [
  ["Доска обрезная",   "doska-obreznaya",   "Доска", "25×150×6000",  "8000", "600", "13", "50",  "TRUE", "BOTH",  "TRUE"],
  ["Доска обрезная",   "doska-obreznaya",   "Доска", "40×150×6000",  "9500", "730", "11",  "30", "TRUE", "BOTH",  "TRUE"],
  ["Брус строительный","brus-stroitelnyj",  "Брус",  "100×100×6000","12000",  "",   "8",  "20", "TRUE", "CUBE",  "TRUE"],
  ["Вагонка",          "vagonka",           "Вагонка","14×90×3000",   "7500", "68", "11",  "",  "TRUE", "BOTH",  "TRUE"],
];

// ─── Create template ─────────────────────────────────────────────────────────
export async function createSheetTemplate(title = "ПилоРус — Товары"): Promise<{ url: string; id: string; email: string }> {
  const { sheets, drive, serviceEmail } = await getSheetsClient();

  const createRes = await sheets.spreadsheets.create({
    requestBody: {
      properties: { title },
      sheets: [{ properties: { title: "Товары", sheetId: 0 } }],
    },
  });
  const id = createRes.data.spreadsheetId!;

  // Write headers + examples
  await sheets.spreadsheets.values.update({
    spreadsheetId: id,
    range: "Товары!A1",
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [SHEET_HEADERS, ...EXAMPLE_ROWS] },
  });

  // Format: freeze row 1, bold yellow header, grey slug column
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: id,
    requestBody: {
      requests: [
        // Freeze header row
        {
          updateSheetProperties: {
            properties: { sheetId: 0, gridProperties: { frozenRowCount: 1 } },
            fields: "gridProperties.frozenRowCount",
          },
        },
        // Yellow bold header
        {
          repeatCell: {
            range: { sheetId: 0, startRowIndex: 0, endRowIndex: 1 },
            cell: {
              userEnteredFormat: {
                textFormat: { bold: true },
                backgroundColor: { red: 1, green: 0.92, blue: 0.23 },
              },
            },
            fields: "userEnteredFormat(textFormat,backgroundColor)",
          },
        },
        // Grey slug column (B) — visually signals "auto"
        {
          repeatCell: {
            range: { sheetId: 0, startRowIndex: 1, startColumnIndex: 1, endColumnIndex: 2 },
            cell: {
              userEnteredFormat: { backgroundColor: { red: 0.88, green: 0.88, blue: 0.88 } },
            },
            fields: "userEnteredFormat.backgroundColor",
          },
        },
        // Auto-resize all columns
        {
          autoResizeDimensions: {
            dimensions: { sheetId: 0, dimension: "COLUMNS", startIndex: 0, endIndex: 11 },
          },
        },
      ],
    },
  });

  // Share: anyone with the link can edit
  await drive.permissions.create({
    fileId: id,
    requestBody: { role: "writer", type: "anyone" },
  });

  return { url: `https://docs.google.com/spreadsheets/d/${id}`, id, email: serviceEmail };
}

// ─── Sync DB → Sheet ──────────────────────────────────────────────────────────
export async function syncToSheet(spreadsheetId: string): Promise<{ rows: number }> {
  const { sheets } = await getSheetsClient();

  const products = await prisma.product.findMany({
    include: { category: true, variants: { orderBy: { size: "asc" } } },
    orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
  });

  const rows: string[][] = [];
  for (const p of products) {
    if (p.variants.length === 0) {
      rows.push([p.name, p.slug, p.category.name, "", "", "", "", "", "TRUE", p.saleUnit, p.active ? "TRUE" : "FALSE"]);
    } else {
      for (const v of p.variants) {
        rows.push([
          p.name,
          p.slug,
          p.category.name,
          v.size,
          v.pricePerCube?.toString() ?? "",
          v.pricePerPiece?.toString() ?? "",
          v.piecesPerCube?.toString() ?? "",
          v.stockQty?.toString() ?? "",
          v.inStock ? "TRUE" : "FALSE",
          p.saleUnit,
          p.active ? "TRUE" : "FALSE",
        ]);
      }
    }
  }

  // Clear old data, write new
  await sheets.spreadsheets.values.clear({ spreadsheetId, range: "Товары!A2:K50000" });
  if (rows.length > 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: "Товары!A2",
      valueInputOption: "USER_ENTERED",
      requestBody: { values: rows },
    });
  }

  return { rows: rows.length };
}

// ─── Sync Sheet → DB ──────────────────────────────────────────────────────────
export async function syncFromSheet(
  spreadsheetId: string
): Promise<{ updated: number; created: number; errors: string[] }> {
  const { sheets } = await getSheetsClient();

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "Товары!A2:K50000",
  });
  const rawRows = (res.data.values ?? []) as string[][];

  const errors: string[] = [];
  let updated = 0;
  let created = 0;

  // Group by slug (col B), auto-generate slug from col A if col B is empty
  type VariantRow = string[];
  const bySlug = new Map<
    string,
    { name: string; catName: string; saleUnit: string; active: boolean; variantRows: VariantRow[] }
  >();

  for (const row of rawRows) {
    const name = row[0]?.trim();
    if (!name) continue;

    const slug = row[1]?.trim() || transliterate(name);
    const catName = row[2]?.trim() ?? "";
    const saleUnit = ["CUBE", "PIECE", "BOTH"].includes(row[9]) ? row[9] : "BOTH";
    const active = row[10] !== "FALSE";

    if (!bySlug.has(slug)) {
      bySlug.set(slug, { name, catName, saleUnit, active, variantRows: [] });
    }
    const entry = bySlug.get(slug)!;
    // Update product-level fields from last row (in case name changed)
    entry.name = name;
    entry.catName = catName;
    entry.saleUnit = saleUnit;
    entry.active = active;
    if (row[3]?.trim()) entry.variantRows.push(row);
  }

  for (const [slug, data] of bySlug) {
    try {
      // Find or create category
      let category = await prisma.category.findFirst({
        where: { name: { equals: data.catName, mode: "insensitive" } },
      });
      if (!category && data.catName) {
        const catSlug = transliterate(data.catName);
        category = await prisma.category.upsert({
          where: { slug: catSlug },
          create: { slug: catSlug, name: data.catName },
          update: { name: data.catName },
        });
      }
      if (!category) {
        errors.push(`${slug}: категория «${data.catName}» не найдена`);
        continue;
      }

      // Upsert product
      let product = await prisma.product.findUnique({ where: { slug } });
      if (!product) {
        product = await prisma.product.create({
          data: {
            slug,
            name: data.name,
            categoryId: category.id,
            saleUnit: data.saleUnit as any,
            active: data.active,
          },
        });
        created++;
      } else {
        product = await prisma.product.update({
          where: { slug },
          data: {
            name: data.name,
            categoryId: category.id,
            saleUnit: data.saleUnit as any,
            active: data.active,
          },
        });
        updated++;
      }

      // Upsert variants
      for (const row of data.variantRows) {
        const size = row[3]?.trim();
        if (!size) continue;

        const pricePerCube = row[4] ? parseFloat(row[4]) : null;
        const pricePerPiece = row[5] ? parseFloat(row[5]) : null;
        const piecesPerCube = row[6] ? parseInt(row[6]) : null;
        const stockQty = row[7] ? parseInt(row[7]) : null;
        const inStock = row[8] !== "FALSE";

        const existing = await prisma.productVariant.findFirst({
          where: { productId: product.id, size },
        });

        const vData = {
          productId: product.id,
          size,
          pricePerCube: pricePerCube as any,
          pricePerPiece: pricePerPiece as any,
          piecesPerCube,
          stockQty,
          inStock,
        };

        if (existing) {
          await prisma.productVariant.update({ where: { id: existing.id }, data: vData });
        } else {
          await prisma.productVariant.create({ data: vData });
        }
      }
    } catch (err: any) {
      errors.push(`${slug}: ${err.message}`);
    }
  }

  return { updated, created, errors };
}

// ─── Apps Script code for real-time webhook ───────────────────────────────────
export function getAppsScriptCode(webhookUrl: string): string {
  return `// Google Apps Script — вставьте в Расширения → Apps Script
// Триггер: onEdit — Развернуть → Управление деплоями → Новый → Тип: Web App

function onEdit(e) {
  // Отправлять синхронизацию только если изменилась таблица "Товары"
  const sheet = e.source.getActiveSheet();
  if (sheet.getName() !== "Товары") return;

  // Подождать 2 секунды чтобы не спамить при вводе
  Utilities.sleep(2000);

  const id = e.source.getId();
  const url = "${webhookUrl}";

  try {
    UrlFetchApp.fetch(url, {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify({ action: "webhook_sync", spreadsheetId: id }),
      muteHttpExceptions: true,
    });
  } catch(err) {
    // ignore network errors
  }
}`;
}
