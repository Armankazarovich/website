export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Импорт прайса от поставщика (Пилорус, Стройматериалы и т.д.)
 *
 * CSV формат — разделы с заголовком-категорией + подзаголовок колонок:
 *   Обрезная доска 1 сорт ГОСТ (Сосна/Ель),,,,
 *   "Сечение, мм",Длина,"Кол-во, шт. в м³",Цена за м3,Цена за шт
 *   25х100,6 метров,66,17000,258
 *   ...
 *
 * Стратегия:
 * 1) Парсим CSV по секциям
 * 2) Загружаем все продукты+варианты из БД
 * 3) Для каждой строки CSV: ищем продукт по ключевым словам секции, вариант по размеру
 * 4) Формируем diff (matched/unmatched/changes)
 * 5) Если apply=true → применяем изменения
 */

const ALLOWED_ROLES = ["SUPER_ADMIN", "ADMIN", "MANAGER"];

async function checkAuth() {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;
  return session && ALLOWED_ROLES.includes(role || "");
}

// ─── CSV парсер ───────────────────────────────────────────────
function parseCSVLine(line: string): string[] {
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
  return cells.map((c) => c.trim());
}

// ─── Нормализация ─────────────────────────────────────────────
function normalizeSize(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[х×xX]/g, "×")
    .replace(/\s+/g, "")
    .replace(/,/g, ".");
}

// "6 метров" → 6000, "3 м" → 3000, "3,5 метра" → 3500
function parseLengthToMm(raw: string): number | null {
  const s = raw.toLowerCase().replace(",", ".").trim();
  const m = s.match(/(\d+\.?\d*)\s*(м|метр|метра|метров)?/);
  if (!m) return null;
  const meters = parseFloat(m[1]);
  if (isNaN(meters)) return null;
  return Math.round(meters * 1000);
}

// Убирает стоп-слова и скобки из названия секции
function sectionToKeywords(section: string): string[] {
  const clean = section
    .toLowerCase()
    .replace(/\([^)]*\)/g, "") // убираем скобки (Сосна/Ель)
    .replace(/[.,;!?"'-]/g, " ")
    .trim();
  const stopWords = new Set([
    "и", "в", "на", "с", "для", "от", "до", "по", "из", "к", "у",
    "сорт", "сорта", "мм", "см", "м", "гост", "ту",
  ]);
  return clean.split(/\s+/).filter((w) => w.length > 1 && !stopWords.has(w));
}

// Фуззи-поиск продукта по ключевым словам секции
function scoreMatch(productName: string, keywords: string[]): number {
  const pn = productName.toLowerCase();
  let score = 0;
  for (const kw of keywords) {
    if (pn.includes(kw)) score++;
  }
  return score;
}

// ─── Типы ─────────────────────────────────────────────────────
interface ParsedRow {
  section: string;         // "Обрезная доска 1 сорт ГОСТ (Сосна/Ель)"
  sizeRaw: string;         // "25х100"
  sizeNorm: string;        // "25×100"
  lengthRaw: string;       // "6 метров"
  lengthMm: number | null; // 6000
  fullSize: string;        // "25×100×6000" (если length есть) или "25×100"
  piecesPerCube: number | null;
  pricePerCube: number | null;
  pricePerPiece: number | null;
  rowIndex: number;
}

interface MatchedRow extends ParsedRow {
  productId: string;
  productName: string;
  variantId: string;
  variantSize: string;
  oldPricePerCube: number | null;
  oldPricePerPiece: number | null;
  newPricePerCube: number | null;
  newPricePerPiece: number | null;
  changed: boolean;
}

interface UnmatchedRow extends ParsedRow {
  reason: string;
}

// ─── Парсинг всей таблицы ─────────────────────────────────────
function parseSupplierCSV(text: string): { rows: ParsedRow[]; sections: string[] } {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  let currentSection = "";
  let currentColIdx: { size: number; length: number; ppc: number; ppCube: number; ppPiece: number } | null = null;
  const rows: ParsedRow[] = [];
  const sections = new Set<string>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    const cells = parseCSVLine(line);

    // Пустая строка или строка с одной непустой ячейкой и остальными пустыми → секция
    const nonEmpty = cells.filter((c) => c.length > 0);
    const first = (cells[0] || "").trim();

    // Заголовок секции: первая ячейка непустая, остальные пустые, и это не "Сечение"
    if (first && nonEmpty.length === 1 && !/сечение|размер/i.test(first)) {
      currentSection = first;
      sections.add(first);
      currentColIdx = null;
      continue;
    }

    // Заголовок колонок: содержит "Сечение" или "Размер"
    if (/сечение|размер/i.test(first)) {
      const idx = { size: -1, length: -1, ppc: -1, ppCube: -1, ppPiece: -1 };
      cells.forEach((c, j) => {
        const lc = c.toLowerCase();
        if (/сечение|размер/.test(lc) && idx.size === -1) idx.size = j;
        else if (/длина/.test(lc)) idx.length = j;
        else if (/кол-во|коо-во|кол.во/.test(lc) && /шт/.test(lc)) idx.ppc = j;
        else if (/цена.*м[²2³3]/.test(lc) || /цена.*за.*м[²2³3]/.test(lc)) idx.ppCube = j;
        else if (/цена.*шт/.test(lc)) idx.ppPiece = j;
      });
      currentColIdx = idx;
      continue;
    }

    // Строка данных
    if (!currentColIdx || !currentSection) continue;

    const sizeRaw = (cells[currentColIdx.size] || "").trim();
    if (!sizeRaw) continue;
    const lengthRaw = currentColIdx.length >= 0 ? (cells[currentColIdx.length] || "").trim() : "";
    const ppcRaw = currentColIdx.ppc >= 0 ? (cells[currentColIdx.ppc] || "").trim() : "";
    const ppCubeRaw = currentColIdx.ppCube >= 0 ? (cells[currentColIdx.ppCube] || "").trim() : "";
    const ppPieceRaw = currentColIdx.ppPiece >= 0 ? (cells[currentColIdx.ppPiece] || "").trim() : "";

    const sizeNorm = normalizeSize(sizeRaw);
    const lengthMm = lengthRaw ? parseLengthToMm(lengthRaw) : null;
    const fullSize = lengthMm ? `${sizeNorm}×${lengthMm}` : sizeNorm;

    rows.push({
      section: currentSection,
      sizeRaw,
      sizeNorm,
      lengthRaw,
      lengthMm,
      fullSize,
      piecesPerCube: ppcRaw ? parseInt(ppcRaw.replace(/\s/g, "")) || null : null,
      pricePerCube: ppCubeRaw ? parseFloat(ppCubeRaw.replace(/[^\d.]/g, "")) || null : null,
      pricePerPiece: ppPieceRaw ? parseFloat(ppPieceRaw.replace(/[^\d.]/g, "")) || null : null,
      rowIndex: i + 1,
    });
  }

  return { rows, sections: Array.from(sections) };
}

// ─── Основная функция: матчинг + diff ─────────────────────────
async function buildReport(csvText: string) {
  const { rows, sections } = parseSupplierCSV(csvText);

  if (rows.length === 0) {
    return { ok: false, error: "Не распарсил ни одной строки из CSV. Проверь формат." };
  }

  const products = await prisma.product.findMany({
    where: { active: true },
    include: { variants: true, category: true },
  });

  const matched: MatchedRow[] = [];
  const unmatched: UnmatchedRow[] = [];

  // Для каждой секции подбираем лучший продукт один раз
  const sectionToProduct = new Map<string, typeof products[0] | null>();
  for (const sec of sections) {
    const keywords = sectionToKeywords(sec);
    let best: { product: typeof products[0]; score: number } | null = null;
    for (const p of products) {
      const score = scoreMatch(p.name, keywords);
      if (score >= Math.max(2, keywords.length - 1)) {
        if (!best || score > best.score) best = { product: p, score };
      }
    }
    sectionToProduct.set(sec, best?.product || null);
  }

  for (const row of rows) {
    const product = sectionToProduct.get(row.section);
    if (!product) {
      unmatched.push({ ...row, reason: `Не найден продукт для секции "${row.section}"` });
      continue;
    }

    // Ищем вариант по полному размеру (size × length) или только по sectional
    const v = product.variants.find((v) => {
      const vn = normalizeSize(v.size);
      return vn === row.fullSize || vn === row.sizeNorm || vn.startsWith(row.fullSize) || vn.startsWith(row.sizeNorm + "×");
    });

    if (!v) {
      unmatched.push({ ...row, reason: `Продукт "${product.name}" найден, но варианта "${row.fullSize}" нет` });
      continue;
    }

    const oldCube = v.pricePerCube ? Number(v.pricePerCube) : null;
    const oldPiece = v.pricePerPiece ? Number(v.pricePerPiece) : null;
    const newCube = row.pricePerCube;
    const newPiece = row.pricePerPiece;

    const changed =
      (newCube !== null && newCube !== oldCube) ||
      (newPiece !== null && newPiece !== oldPiece);

    matched.push({
      ...row,
      productId: product.id,
      productName: product.name,
      variantId: v.id,
      variantSize: v.size,
      oldPricePerCube: oldCube,
      oldPricePerPiece: oldPiece,
      newPricePerCube: newCube,
      newPricePerPiece: newPiece,
      changed,
    });
  }

  return {
    ok: true,
    total: rows.length,
    matched: matched.length,
    changed: matched.filter((m) => m.changed).length,
    unmatched: unmatched.length,
    sections: sections.length,
    details: { matched, unmatched },
  };
}

// ─── Endpoint ─────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  if (!(await checkAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { csv?: string; apply?: boolean } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const csv = body.csv || "";
  const apply = body.apply === true;

  if (!csv || csv.trim().length < 20) {
    return NextResponse.json({ error: "CSV пустой или слишком короткий" }, { status: 400 });
  }

  const report = await buildReport(csv);

  if (!report.ok) {
    return NextResponse.json(report, { status: 400 });
  }

  if (!apply) {
    return NextResponse.json({ ...report, applied: false });
  }

  // Применяем изменения
  let updated = 0;
  const errors: string[] = [];
  const matched = report.details!.matched;
  for (const m of matched) {
    if (!m.changed) continue;
    try {
      const data: { pricePerCube?: number; pricePerPiece?: number } = {};
      if (m.newPricePerCube !== null) data.pricePerCube = m.newPricePerCube;
      if (m.newPricePerPiece !== null) data.pricePerPiece = m.newPricePerPiece;
      if (Object.keys(data).length > 0) {
        await prisma.productVariant.update({
          where: { id: m.variantId },
          data,
        });
        updated++;
      }
    } catch (e) {
      errors.push(`${m.productName} / ${m.variantSize}: ${String(e).slice(0, 80)}`);
    }
  }

  return NextResponse.json({ ...report, applied: true, updated, errors });
}
