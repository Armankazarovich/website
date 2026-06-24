import fs from "fs";
import path from "path";
import { PRICE_LIST_UNITS, type PriceListData, type PriceListRow } from "@/lib/price-list-data";
import { DEFAULT_SETTINGS } from "@/lib/site-settings";

const FONTS_DIR = path.join(process.cwd(), "public", "fonts");
const ROBOTO_REGULAR = fs.readFileSync(path.join(FONTS_DIR, "Roboto-Regular.woff"));
const ROBOTO_BOLD = fs.readFileSync(path.join(FONTS_DIR, "Roboto-Bold.woff"));

const COLORS = {
  ink: "#1f1711",
  muted: "#6f635b",
  line: "#ead8ca",
  softLine: "#eee4dc",
  brand: "#E8700A",
  brown: "#5C3317",
  paper: "#fffaf5",
  pale: "#fff1e6",
};

const COLUMNS = [
  { key: "product", label: "Товар", width: 224, align: "left" as const },
  { key: "size", label: "Размер", width: 118, align: "left" as const },
  { key: "grade", label: "Сорт", width: 74, align: "left" as const },
  { key: "cube", label: "Цена / м³", width: 92, align: "right" as const },
  { key: "square", label: "Цена / м²", width: 92, align: "right" as const },
  { key: "piece", label: "Цена / шт", width: 92, align: "right" as const },
  { key: "stock", label: "Склад", width: 62, align: "right" as const },
];

type PdfKitDocument = {
  page: { width: number; height: number };
  on: (event: string, cb: (chunk?: unknown) => void) => void;
  end: () => void;
  addPage: () => void;
  registerFont: (name: string, source: Buffer) => void;
  font: (name: string) => PdfKitDocument;
  fontSize: (size: number) => PdfKitDocument;
  fillColor: (color: string) => PdfKitDocument;
  strokeColor: (color: string) => PdfKitDocument;
  lineWidth: (width: number) => PdfKitDocument;
  rect: (x: number, y: number, width: number, height: number) => PdfKitDocument;
  roundedRect: (x: number, y: number, width: number, height: number, radius: number) => PdfKitDocument;
  fill: (color?: string) => PdfKitDocument;
  stroke: (color?: string) => PdfKitDocument;
  text: (text: string, x?: number, y?: number, options?: Record<string, unknown>) => PdfKitDocument;
  widthOfString: (text: string) => number;
  moveTo: (x: number, y: number) => PdfKitDocument;
  lineTo: (x: number, y: number) => PdfKitDocument;
  bufferedPageRange: () => { start: number; count: number };
  switchToPage: (page: number) => void;
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatRub(value: number | null) {
  if (!value) return "-";
  return `${Math.round(value).toLocaleString("ru-RU")} руб.`;
}

function priceFor(row: PriceListRow, unit: keyof typeof PRICE_LIST_UNITS) {
  return row.availableUnits.find((entry) => entry.unit === unit)?.price ?? null;
}

function trimText(value: string, max = 60) {
  const clean = value.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

function normalizePdfText(value: string) {
  return value
    .replace(/\u00a0/g, " ")
    .replace(/[–—]/g, "-")
    .replace(/₽/g, "руб.");
}

function isCyrillicPdfGlyph(char: string) {
  const code = char.codePointAt(0) ?? 0;
  return (code >= 0x0400 && code <= 0x052f) || code === 0x2116;
}

function fontForChar(char: string, bold: boolean) {
  if (isCyrillicPdfGlyph(char)) return bold ? "RobotoBold" : "Roboto";
  return bold ? "Helvetica-Bold" : "Helvetica";
}

function splitFontRuns(text: string, bold: boolean) {
  const runs: Array<{ font: string; text: string }> = [];
  for (const char of Array.from(text)) {
    const font = fontForChar(char, bold);
    const last = runs[runs.length - 1];
    if (last?.font === font) last.text += char;
    else runs.push({ font, text: char });
  }
  return runs;
}

function measurePdfText(doc: PdfKitDocument, text: string, size: number, bold: boolean) {
  let width = 0;
  for (const run of splitFontRuns(text, bold)) {
    doc.font(run.font).fontSize(size);
    width += doc.widthOfString(run.text);
  }
  return width;
}

function fitPdfText(doc: PdfKitDocument, rawText: string, width: number, size: number, bold: boolean) {
  const text = normalizePdfText(rawText);
  if (measurePdfText(doc, text, size, bold) <= width) return text;

  const ellipsis = "...";
  let fitted = "";
  for (const char of Array.from(text)) {
    const candidate = `${fitted}${char}${ellipsis}`;
    if (measurePdfText(doc, candidate, size, bold) > width) break;
    fitted += char;
  }
  return `${fitted.trimEnd()}${ellipsis}`;
}

function drawCell(
  doc: PdfKitDocument,
  text: string,
  x: number,
  y: number,
  width: number,
  options: { bold?: boolean; size?: number; color?: string; align?: "left" | "right" | "center" } = {},
) {
  const bold = Boolean(options.bold);
  const size = options.size ?? 8;
  const color = options.color ?? COLORS.ink;
  const fittedText = fitPdfText(doc, text, width, size, bold);
  const textWidth = measurePdfText(doc, fittedText, size, bold);
  const align = options.align ?? "left";
  let cursorX = x;
  if (align === "right") cursorX = x + Math.max(0, width - textWidth);
  if (align === "center") cursorX = x + Math.max(0, (width - textWidth) / 2);

  for (const run of splitFontRuns(fittedText, bold)) {
    doc.font(run.font).fontSize(size).fillColor(color).text(run.text, cursorX, y, { lineBreak: false });
    cursorX += doc.widthOfString(run.text);
  }
}

function drawHeader(doc: PdfKitDocument, data: PriceListData, pageIndex: number) {
  const margin = 24;
  const width = doc.page.width - margin * 2;
  const compact = pageIndex > 0;
  const headerHeight = compact ? 54 : 78;

  doc.fillColor(COLORS.ink);
  doc.font("RobotoBold").fontSize(compact ? 14 : 18).text("ПилоРус", margin, margin);
  doc.font("Roboto").fontSize(8).fillColor(COLORS.muted).text(
    `Пиломатериалы от производителя\nХимки, ул. Заводская 2А, стр.28\nТел.: ${DEFAULT_SETTINGS.phone} · pilo-rus.ru`,
    margin,
    margin + (compact ? 18 : 24),
    { lineGap: 1 },
  );

  doc.font("RobotoBold").fontSize(compact ? 16 : 20).fillColor(COLORS.brand).text(
    "ПРАЙС-ЛИСТ",
    margin,
    margin,
    { width, align: "right" },
  );
  doc.font("Roboto").fontSize(8).fillColor(COLORS.muted).text(
    `Сформирован: ${formatDate(data.generatedAt)}\nПозиций: ${data.totalRows.toLocaleString("ru-RU")} · товаров: ${data.totalProducts.toLocaleString("ru-RU")}`,
    margin,
    margin + 24,
    { width, align: "right", lineGap: 1 },
  );

  doc
    .moveTo(margin, margin + headerHeight - 8)
    .lineTo(margin + width, margin + headerHeight - 8)
    .lineWidth(1.6)
    .stroke(COLORS.brand);

  return margin + headerHeight;
}

function drawIntro(doc: PdfKitDocument, y: number) {
  const margin = 24;
  const width = doc.page.width - margin * 2;
  const pillY = y;
  const pills = [
    "Цены из живого каталога",
    "м³ / м² / шт без смешения единиц",
    "Для сметы, закупки и печати",
  ];
  let x = margin;
  for (const label of pills) {
    const pillWidth = label.length * 4.3 + 18;
    doc.roundedRect(x, pillY, pillWidth, 20, 5).fill(COLORS.pale).stroke(COLORS.line);
    drawCell(doc, label, x + 9, pillY + 6, pillWidth - 18, { bold: true, size: 7.5, color: COLORS.brown });
    x += pillWidth + 8;
  }

  doc.roundedRect(margin, pillY + 30, width, 30, 6).fill("#f7f1eb").stroke(COLORS.line);
  drawCell(
    doc,
    "Цены актуальны на момент формирования PDF. Наличие, доставка и итоговая стоимость заказа уточняются менеджером перед отгрузкой.",
    margin + 8,
    pillY + 39,
    width - 16,
    { size: 8, color: COLORS.muted },
  );

  return pillY + 70;
}

function drawCategoryHeader(doc: PdfKitDocument, y: number, name: string, count: number, continued = false) {
  const margin = 24;
  const width = doc.page.width - margin * 2;
  doc.roundedRect(margin, y, width, 24, 4).fill(COLORS.pale).stroke("#f0c9aa");
  drawCell(doc, `${name}${continued ? " · продолжение" : ""}`, margin + 8, y + 7, width - 120, {
    bold: true,
    size: 10,
    color: COLORS.brown,
  });
  drawCell(doc, `${count.toLocaleString("ru-RU")} поз.`, margin + width - 92, y + 7, 84, {
    bold: true,
    size: 8,
    color: COLORS.brand,
    align: "right",
  });
  return y + 30;
}

function drawTableHeader(doc: PdfKitDocument, y: number) {
  const margin = 24;
  let x = margin;
  doc.roundedRect(margin, y, doc.page.width - margin * 2, 22, 4).fill(COLORS.brown);
  for (const column of COLUMNS) {
    drawCell(doc, column.label, x + 6, y + 7, column.width - 12, {
      bold: true,
      size: 7.5,
      color: "#ffffff",
      align: column.align,
    });
    x += column.width;
  }
  return y + 22;
}

function drawRow(doc: PdfKitDocument, row: PriceListRow, y: number, index: number) {
  const margin = 24;
  const rowHeight = 25;
  const fullWidth = doc.page.width - margin * 2;
  if (index % 2 === 1) {
    doc.rect(margin, y, fullWidth, rowHeight).fill(COLORS.paper);
  }
  doc.moveTo(margin, y + rowHeight).lineTo(margin + fullWidth, y + rowHeight).lineWidth(0.5).stroke(COLORS.softLine);

  let x = margin;
  drawCell(doc, trimText(row.productName, 56), x + 6, y + 5, COLUMNS[0].width - 12, { bold: true, size: 7.7 });
  drawCell(doc, row.categoryName, x + 6, y + 15, COLUMNS[0].width - 12, { size: 6.4, color: COLORS.muted });
  x += COLUMNS[0].width;

  drawCell(doc, trimText(row.displaySize, 24), x + 6, y + 8, COLUMNS[1].width - 12, { size: 7.6 });
  x += COLUMNS[1].width;

  drawCell(doc, row.grade || "-", x + 6, y + 8, COLUMNS[2].width - 12, { size: 7.4, color: row.grade ? COLORS.ink : COLORS.muted });
  x += COLUMNS[2].width;

  drawCell(doc, formatRub(priceFor(row, "CUBE")), x + 6, y + 8, COLUMNS[3].width - 12, { size: 7.4, align: "right" });
  x += COLUMNS[3].width;

  drawCell(doc, formatRub(priceFor(row, "SQUARE")), x + 6, y + 8, COLUMNS[4].width - 12, { size: 7.4, align: "right" });
  x += COLUMNS[4].width;

  drawCell(doc, formatRub(priceFor(row, "PIECE")), x + 6, y + 8, COLUMNS[5].width - 12, { size: 7.4, align: "right" });
  x += COLUMNS[5].width;

  drawCell(doc, row.stockQty == null ? "есть" : row.stockQty.toLocaleString("ru-RU"), x + 6, y + 8, COLUMNS[6].width - 12, {
    size: 7.4,
    align: "right",
  });

  return y + rowHeight;
}

function drawFooters(doc: PdfKitDocument) {
  const margin = 24;
  const range = doc.bufferedPageRange();
  const total = range.count;
  for (let i = range.start; i < range.start + range.count; i += 1) {
    doc.switchToPage(i);
    const y = doc.page.height - 24;
    doc.moveTo(margin, y - 8).lineTo(doc.page.width - margin, y - 8).lineWidth(0.5).stroke(COLORS.line);
    drawCell(doc, `ПилоРус · pilo-rus.ru · ${DEFAULT_SETTINGS.phone}`, margin, y, 320, {
      size: 6.6,
      color: "#8a7c70",
    });
    drawCell(doc, `Страница ${i + 1} из ${total}`, doc.page.width - margin - 120, y, 120, {
      size: 6.6,
      color: "#8a7c70",
      align: "right",
    });
  }
}

export async function generatePriceListPdf(data: PriceListData): Promise<Buffer> {
  const { default: PDFDocument } = await import("@react-pdf/pdfkit");
  const doc = new PDFDocument({
    size: "A4",
    layout: "landscape",
    margin: 0,
    bufferPages: true,
    compress: true,
    info: {
      Title: "Прайс-лист ПилоРус",
      Author: "ПилоРус",
      Subject: "Актуальные цены пиломатериалов",
    },
  }) as PdfKitDocument;

  const chunks: Buffer[] = [];
  doc.on("data", (chunk) => {
    if (chunk) chunks.push(Buffer.from(chunk as Uint8Array));
  });
  const done = new Promise<void>((resolve, reject) => {
    doc.on("end", () => resolve());
    doc.on("error", (error) => reject(error));
  });

  doc.registerFont("Roboto", ROBOTO_REGULAR);
  doc.registerFont("RobotoBold", ROBOTO_BOLD);

  const margin = 24;
  const bottomLimit = doc.page.height - 38;
  const rowHeight = 25;
  let pageIndex = 0;
  let y = drawIntro(doc, drawHeader(doc, data, pageIndex));

  const addPage = () => {
    doc.addPage();
    pageIndex += 1;
    y = drawHeader(doc, data, pageIndex);
  };

  for (const group of data.groupedRows) {
    if (y + 78 > bottomLimit) addPage();
    y = drawCategoryHeader(doc, y, group.category.name, group.rows.length);
    y = drawTableHeader(doc, y);

    for (let index = 0; index < group.rows.length; index += 1) {
      const row = group.rows[index];
      if (y + rowHeight > bottomLimit) {
        addPage();
        y = drawCategoryHeader(doc, y, group.category.name, group.rows.length, true);
        y = drawTableHeader(doc, y);
      }
      y = drawRow(doc, row, y, index);
    }
    y += 8;
  }

  if (data.groupedRows.length === 0) {
    doc.roundedRect(margin, y, doc.page.width - margin * 2, 42, 6).fill(COLORS.paper).stroke(COLORS.line);
    drawCell(doc, "Позиции не найдены", margin + 10, y + 14, doc.page.width - margin * 2 - 20, {
      bold: true,
      size: 11,
      align: "center",
    });
  }

  drawFooters(doc);
  doc.end();
  await done;
  return Buffer.concat(chunks);
}
