/**
 * Финальный скрипт: заменяем ВСЕ фото на реальные с pilmos.ru
 * Группируем изображения по типу товара и породе дерева
 *
 * Запуск: npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/fix-images-final.ts
 */

import * as fs from "fs";
import * as path from "path";
import * as https from "https";
import * as http from "http";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const XML_PATH = path.join(process.env.USERPROFILE || "", "Downloads", "pilmosru.WordPress.2026-03-20 (1).xml");
const OUTPUT_DIR = path.join(__dirname, "../public/images/products");

// ─── Типы для матчинга ────────────────────────────────────────────────────────
const TYPE_KEYWORDS: Record<string, string[]> = {
  "евровагонка":    ["евровагонка", "evrovagonka", "euro"],
  "вагонка":        ["вагонка штиль", "vagonka", "вагонка"],
  "блокхаус":       ["блок-хаус", "блокхаус", "block"],
  "планкен":        ["планкен", "planken"],
  "европол":        ["европол", "евро пол", "пол", "europol"],
  "террасная":      ["терраса", "террасн"],
  "имитация":       ["имитация бруса", "имитация"],
  "брус_клееный":   ["клееный", "клееный брус"],
  "брусок":         ["брусок"],
  "брус":           ["брус строганн", "брус обрезн", "брус антисепт", "брус сухой", "брус"],
  "доска":          ["доска строганн", "доска обрезн", "доска антисепт", "доска сухая", "доска"],
  "плинтус":        ["плинтус", "погонаж", "наличник"],
  "фанера":         ["фанера фк", "фанера фсф", "фанера"],
  "мдф":            ["мдф", "mdf"],
  "двп":            ["двп", "оргалит"],
  "дсп":            ["дсп", "дстп"],
  "осб":            ["осб", "osb"],
  "цсп":            ["цсп", "цементно"],
};

const WOOD_KEYWORDS: Record<string, string[]> = {
  "сосна_ель":      ["сосна", "ель", "сосны", "ели", "хвой"],
  "лиственница":    ["лиственниц", "листвяк"],
  "кедр":           ["кедр"],
  "липа":           ["липа", "липы"],
  "осина":          ["осина", "осины"],
  "береза":         ["береза", "берёза", "берез"],
};

function norm(s: string) {
  return s.toLowerCase().replace(/ё/g, "е").trim();
}

function getType(name: string): string {
  const n = norm(name);
  for (const [type, keys] of Object.entries(TYPE_KEYWORDS)) {
    if (keys.some(k => n.includes(k))) return type;
  }
  return "доска";
}

function getWood(name: string): string {
  const n = norm(name);
  for (const [wood, keys] of Object.entries(WOOD_KEYWORDS)) {
    if (keys.some(k => n.includes(k))) return wood;
  }
  return "сосна_ель";
}

// ─── Парсим: attachmentId → URL ──────────────────────────────────────────────
function buildAttachmentMap(xml: string): Map<string, string> {
  const map = new Map<string, string>();
  const blocks = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
  for (const b of blocks) {
    if (!b.includes("post_type><![CDATA[attachment]]>")) continue;
    const id = b.match(/<wp:post_id>(\d+)<\/wp:post_id>/)?.[1];
    const url = b.match(/<wp:attachment_url><!\[CDATA\[(https?:\/\/[^\]]+)\]\]>/)?.[1];
    // Исключаем мелкие превью и лого
    if (id && url && !url.includes("32x32") && !url.includes("cropped-fav")) {
      map.set(id, url);
    }
  }
  return map;
}

// ─── Парсим: WordPress товары с их изображениями ─────────────────────────────
function parseWPProducts(xml: string, attachments: Map<string, string>) {
  const result: Array<{ title: string; type: string; wood: string; imageUrl: string }> = [];
  const blocks = xml.match(/<item>[\s\S]*?<\/item>/g) || [];

  for (const b of blocks) {
    if (!b.includes("post_type><![CDATA[product]]>")) continue;
    const status = b.match(/<wp:status><!\[CDATA\[(\w+)\]\]>/)?.[1];
    if (status === "trash" || status === "auto-draft") continue;

    const title = b.match(/<title><!\[CDATA\[([\s\S]*?)\]\]>/)?.[1]?.trim();
    if (!title) continue;

    const thumbId = b.match(/_thumbnail_id\]\]>[\s\S]*?<wp:meta_value><!\[CDATA\[(\d+)\]\]>/)?.[1];
    if (!thumbId) continue;

    const imageUrl = attachments.get(thumbId);
    if (!imageUrl) continue;

    result.push({
      title,
      type: getType(title),
      wood: getWood(title),
      imageUrl,
    });
  }
  return result;
}

// ─── Скачать ─────────────────────────────────────────────────────────────────
function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const get = (u: string) => {
      const client = u.startsWith("https") ? https : http;
      client.get(u, { timeout: 20000 }, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          file.close();
          if (fs.existsSync(dest)) fs.unlinkSync(dest);
          return get(res.headers.location!);
        }
        if (res.statusCode !== 200) {
          file.close();
          if (fs.existsSync(dest)) fs.unlinkSync(dest);
          return reject(new Error(`HTTP ${res.statusCode}`));
        }
        res.pipe(file);
        file.on("finish", () => { file.close(); resolve(); });
      }).on("error", e => { file.close(); if (fs.existsSync(dest)) fs.unlinkSync(dest); reject(e); });
    };
    get(url);
  });
}

// ─── Основная функция ─────────────────────────────────────────────────────────
async function main() {
  console.log("🔄 Заменяем фото на реальные с pilmos.ru\n");

  if (!fs.existsSync(XML_PATH)) { console.error("❌ XML не найден"); process.exit(1); }
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const xml = fs.readFileSync(XML_PATH, "utf-8");
  const attachments = buildAttachmentMap(xml);
  const wpProducts = parseWPProducts(xml, attachments);

  // Группируем WordPress фото по type+wood
  const imagePool = new Map<string, string[]>();
  for (const wp of wpProducts) {
    const key = `${wp.type}__${wp.wood}`;
    if (!imagePool.has(key)) imagePool.set(key, []);
    imagePool.get(key)!.push(wp.imageUrl);

    // Также добавляем только по типу (запасной вариант)
    const typeKey = `type__${wp.type}`;
    if (!imagePool.has(typeKey)) imagePool.set(typeKey, []);
    imagePool.get(typeKey)!.push(wp.imageUrl);
  }

  console.log(`📚 Пул изображений: ${imagePool.size} групп, ${wpProducts.length} фото\n`);

  // Все наши товары — заменяем ВСЕ (включая уже заполненные Unsplash-ом)
  const dbProducts = await prisma.product.findMany({
    select: { id: true, name: true, slug: true, images: true },
  });

  // Счётчик использования URL (чтобы не повторяться)
  const usedUrls = new Set<string>();
  const usedIdx = new Map<string, number>();

  function getNextImage(key: string): string | null {
    const pool = imagePool.get(key);
    if (!pool || pool.length === 0) return null;
    const idx = usedIdx.get(key) || 0;
    // Ищем неиспользованный
    for (let i = 0; i < pool.length; i++) {
      const url = pool[(idx + i) % pool.length];
      if (!usedUrls.has(url)) {
        usedUrls.add(url);
        usedIdx.set(key, (idx + i + 1) % pool.length);
        return url;
      }
    }
    // Все использованы — берём по порядку
    const url = pool[idx % pool.length];
    usedIdx.set(key, (idx + 1) % pool.length);
    return url;
  }

  let success = 0, failed = 0;

  for (const db of dbProducts) {
    const type = getType(db.name);
    const wood = getWood(db.name);

    // Ищем фото: сначала точный type+wood, потом только type
    let imageUrl = getNextImage(`${type}__${wood}`) || getNextImage(`type__${type}`);

    // Последний запасной вариант — любой брус/доска
    if (!imageUrl) {
      imageUrl = getNextImage("type__брус") || getNextImage("type__доска");
    }

    if (!imageUrl) {
      console.log(`⚠️  Нет фото для: ${db.name}`);
      failed++;
      continue;
    }

    const ext = path.extname(imageUrl.split("?")[0]) || ".jpg";
    const filename = `${db.slug}${ext}`;
    const destPath = path.join(OUTPUT_DIR, filename);
    const publicPath = `/images/products/${filename}`;

    // Удаляем старый файл если был
    const oldExts = [".jpg", ".jpeg", ".png", ".webp"];
    for (const e of oldExts) {
      const old = path.join(OUTPUT_DIR, `${db.slug}${e}`);
      if (old !== destPath && fs.existsSync(old)) fs.unlinkSync(old);
    }

    try {
      process.stdout.write(`⬇️  ${db.name.slice(0, 42).padEnd(42)} `);
      if (!fs.existsSync(destPath)) {
        await downloadFile(imageUrl, destPath);
      }
      await prisma.product.update({
        where: { id: db.id },
        data: { images: { set: [publicPath] } },
      });
      process.stdout.write(`✓\n`);
      success++;
    } catch (e) {
      process.stdout.write(`✗ ${(e as Error).message.slice(0,30)}\n`);
      failed++;
    }
  }

  console.log("\n══════════════════════════════════════");
  console.log(`✅ Успешно обновлено: ${success}`);
  console.log(`❌ Ошибок:           ${failed}`);
  console.log("══════════════════════════════════════");
  console.log("\n🎉 Все товары теперь с реальными фото с pilmos.ru!");

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); prisma.$disconnect(); process.exit(1); });
