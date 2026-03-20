/**
 * Скрипт импорта изображений с pilmos.ru → ПилоРус
 * Умный матчинг по типу товара + породе дерева
 * Запуск: npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/import-images.ts
 */

import * as fs from "fs";
import * as path from "path";
import * as https from "https";
import * as http from "http";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const XML_PATH = path.join(
  process.env.USERPROFILE || process.env.HOME || "",
  "Downloads",
  "pilmosru.WordPress.2026-03-20 (1).xml"
);
const OUTPUT_DIR = path.join(__dirname, "../public/images/products");

// ─── Типы товаров (ключи для матчинга) ───────────────────────────────────────
const PRODUCT_TYPES = [
  "евровагонка", "вагонка", "блок-хаус", "блок хаус", "блокхаус",
  "планкен", "европол", "терраса", "террасная доска",
  "брус клееный", "клееный брус",
  "брус строганный", "строганный брус",
  "брусок строганный", "строганный брусок",
  "брус обрезной", "обрезной брус",
  "брусок обрезной", "обрезной брусок",
  "доска строганная", "строганная доска",
  "доска обрезная", "обрезная доска",
  "имитация бруса",
  "погонаж", "плинтус", "наличник",
  "фанера", "дсп", "двп", "мдф", "осб", "osb",
];

// ─── Породы дерева ────────────────────────────────────────────────────────────
const WOOD_TYPES: Record<string, string[]> = {
  "сосна":       ["сосна", "сосны", "сосновая", "sosna"],
  "ель":         ["ель", "ели", "еловая", "el"],
  "лиственница": ["лиственница", "лиственницы", "лиственничная", "листвяк"],
  "кедр":        ["кедр", "кедра", "кедровая"],
  "липа":        ["липа", "липы", "липовая"],
  "осина":       ["осина", "осины", "осиновая"],
  "береза":      ["береза", "берёза", "берёзы", "берёзовая", "березовая"],
};

function norm(s: string) {
  return s.toLowerCase().replace(/ё/g, "е").replace(/[^а-яa-z0-9\s-]/g, " ").replace(/\s+/g, " ").trim();
}

function extractType(s: string): string {
  const n = norm(s);
  for (const t of PRODUCT_TYPES) {
    if (n.includes(t)) return t;
  }
  return "";
}

function extractWood(s: string): string[] {
  const n = norm(s);
  const found: string[] = [];
  for (const [wood, variants] of Object.entries(WOOD_TYPES)) {
    if (variants.some((v) => n.includes(v))) found.push(wood);
  }
  return found;
}

function matchScore(wpTitle: string, dbName: string): number {
  const wpType = extractType(wpTitle);
  const dbType = extractType(dbName);
  const wpWood = extractWood(wpTitle);
  const dbWood = extractWood(dbName);

  let score = 0;

  // Тип товара совпадает
  if (wpType && dbType && (wpType === dbType || wpType.includes(dbType) || dbType.includes(wpType))) {
    score += 10;
  } else if (wpType || dbType) {
    return 0; // Разные типы — не подходит
  }

  // Порода дерева совпадает
  const woodMatch = wpWood.some((w) => dbWood.includes(w));
  // Сосна/Ель — могут присутствовать вместе
  const sosnaEl = (wpWood.includes("сосна") || wpWood.includes("ель")) &&
    (dbWood.includes("сосна") || dbWood.includes("ель"));

  if (woodMatch || sosnaEl) {
    score += 5;
  } else if (dbWood.length > 0 && wpWood.length > 0) {
    return 0; // Разные породы — не подходит
  }

  return score;
}

// ─── Строим карту attachmentId → imageUrl ────────────────────────────────────
function buildAttachmentMap(xml: string): Map<string, string> {
  const map = new Map<string, string>();
  const blocks = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
  for (const b of blocks) {
    if (!b.includes("<wp:post_type><![CDATA[attachment]]>")) continue;
    const id = b.match(/<wp:post_id>(\d+)<\/wp:post_id>/)?.[1];
    const url = b.match(/<wp:attachment_url><!\[CDATA\[(https?:\/\/[^\]]+)\]\]>/)?.[1];
    if (id && url) map.set(id, url);
  }
  return map;
}

// ─── Парсим товары WordPress ──────────────────────────────────────────────────
function extractWPProducts(xml: string, attachments: Map<string, string>) {
  const results: Array<{ title: string; imageUrl: string }> = [];
  const blocks = xml.match(/<item>[\s\S]*?<\/item>/g) || [];

  for (const b of blocks) {
    if (!b.includes("<wp:post_type><![CDATA[product]]>")) continue;
    const status = b.match(/<wp:status><!\[CDATA\[(\w+)\]\]>/)?.[1];
    if (status === "trash" || status === "auto-draft") continue;

    const title = b.match(/<title><!\[CDATA\[([\s\S]*?)\]\]>/)?.[1]?.trim();
    if (!title) continue;

    const thumbId = b.match(
      /<wp:meta_key><!\[CDATA\[_thumbnail_id\]\]>[\s\S]*?<wp:meta_value><!\[CDATA\[(\d+)\]\]>/
    )?.[1];

    const imageUrl = thumbId ? attachments.get(thumbId) : undefined;
    if (!imageUrl) continue;

    results.push({ title, imageUrl });
  }
  return results;
}

// ─── Скачать файл ─────────────────────────────────────────────────────────────
function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const client = url.startsWith("https") ? https : http;
    const req = client.get(url, { timeout: 20000 }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        if (fs.existsSync(dest)) fs.unlinkSync(dest);
        return downloadFile(res.headers.location!, dest).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        file.close();
        if (fs.existsSync(dest)) fs.unlinkSync(dest);
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      res.pipe(file);
      file.on("finish", () => { file.close(); resolve(); });
    });
    req.on("error", (err) => { file.close(); if (fs.existsSync(dest)) fs.unlinkSync(dest); reject(err); });
    req.on("timeout", () => { req.destroy(); if (fs.existsSync(dest)) fs.unlinkSync(dest); reject(new Error("Timeout")); });
  });
}

// ─── Основная функция ─────────────────────────────────────────────────────────
async function main() {
  console.log("🚀 Запуск импорта изображений (умный матчинг)\n");

  if (!fs.existsSync(XML_PATH)) {
    console.error(`❌ Файл не найден: ${XML_PATH}`); process.exit(1);
  }
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const xml = fs.readFileSync(XML_PATH, "utf-8");
  const attachments = buildAttachmentMap(xml);
  const wpProducts = extractWPProducts(xml, attachments);

  console.log(`🗂️  Вложений: ${attachments.size}, товаров WP с фото: ${wpProducts.length}`);

  const dbProducts = await prisma.product.findMany({
    select: { id: true, name: true, slug: true, images: true },
  });

  // Товары без изображений
  const noImage = dbProducts.filter((p) => p.images.length === 0);
  console.log(`📦 Наших товаров без фото: ${noImage.length}\n`);

  let downloaded = 0, updated = 0, errors = 0;

  for (const db of noImage) {
    // Ищем лучшее совпадение среди всех WP товаров
    let bestScore = 0;
    let bestWP: typeof wpProducts[0] | null = null;

    for (const wp of wpProducts) {
      const score = matchScore(wp.title, db.name);
      if (score > bestScore) {
        bestScore = score;
        bestWP = wp;
      }
    }

    if (!bestWP || bestScore < 10) {
      process.stdout.write(`⚠️  Нет совпадения: ${db.name}\n`);
      continue;
    }

    const origName = bestWP.imageUrl.split("/").pop() || "image.jpg";
    const ext = path.extname(origName) || ".jpg";
    const filename = `${db.slug}${ext}`;
    const destPath = path.join(OUTPUT_DIR, filename);
    const publicPath = `/images/products/${filename}`;

    if (!fs.existsSync(destPath)) {
      try {
        process.stdout.write(`⬇️  ${db.name.slice(0, 42).padEnd(42)} [score:${bestScore}] `);
        await downloadFile(bestWP.imageUrl, destPath);
        process.stdout.write(`✓\n`);
        downloaded++;
      } catch (err) {
        process.stdout.write(`✗\n`);
        errors++;
        continue;
      }
    } else {
      downloaded++;
    }

    await prisma.product.update({
      where: { id: db.id },
      data: { images: { set: [publicPath] } },
    });
    updated++;
  }

  console.log("\n══════════════════════════════════════");
  console.log(`✅ Скачано:         ${downloaded}`);
  console.log(`📝 Обновлено в БД: ${updated}`);
  console.log(`❌ Ошибок:         ${errors}`);
  console.log("══════════════════════════════════════\n");

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1); });
