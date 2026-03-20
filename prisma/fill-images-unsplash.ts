/**
 * Скрипт заполнения изображений через Unsplash API
 * Для товаров у которых нет фото
 *
 * 1. Зарегистрируйся на https://unsplash.com/developers
 * 2. Создай приложение → скопируй Access Key
 * 3. Вставь ключ ниже или запусти с: UNSPLASH_KEY=твой_ключ npx ts-node ...
 *
 * Запуск:
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/fill-images-unsplash.ts
 */

import * as fs from "fs";
import * as path from "path";
import * as https from "https";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const OUTPUT_DIR = path.join(__dirname, "../public/images/products");

// ────────────────────────────────────────────────────────────────────────────
// 🔑 ВСТАВЬ СВОЙ КЛЮЧ СЮДА (или задай env: UNSPLASH_KEY=xxx)
const UNSPLASH_KEY = process.env.UNSPLASH_KEY || "ВСТАВЬ_КЛЮЧ_ЗДЕСЬ";
// ────────────────────────────────────────────────────────────────────────────

// Поисковые запросы для каждого типа товара (английский — лучше результаты)
const SEARCH_QUERIES: Record<string, string> = {
  // По ключевым словам в названии товара
  "строганная":        "planed pine lumber wood",
  "антисептированная": "pine lumber treated wood",
  "клееный":           "glued laminated timber wood",
  "осб":               "osb board construction",
  "осб-3":             "osb board panel",
  "цсп":               "cement fiber board",
  "плинтус":           "wood baseboard molding",
  "погонаж":           "wood molding profile",
  "наличник":          "wood trim door frame",
  "вагонка":           "pine wall paneling interior",
  "евровагонка":       "euro pine cladding interior",
  "блок-хаус":         "log siding wood cabin",
  "имитация бруса":    "wood imitation beam siding",
  "планкен":           "wood plank facade outdoor",
  "европол":           "pine floor board hardwood",
  "террасная":         "wood terrace decking outdoor",
  "доска":             "lumber pine board wood",
  "брус":              "timber beam wood construction",
  "брусок":            "small timber wood construction",
  "фанера":            "plywood sheet wood",
  "мдф":               "mdf wood panel",
  "двп":               "hardboard wood panel",
  "дсп":               "chipboard wood panel",
  // По породе дерева
  "лиственница":       "larch wood lumber",
  "кедр":              "cedar wood lumber",
  "липа":              "linden basswood",
  "осина":             "aspen wood lumber",
  "сосна":             "pine wood lumber",
};

function getSearchQuery(productName: string): string {
  const n = productName.toLowerCase().replace(/ё/g, "е");

  // Сначала ищем конкретный тип товара
  for (const [key, query] of Object.entries(SEARCH_QUERIES)) {
    if (n.includes(key)) return query;
  }

  return "wood lumber timber"; // fallback
}

// ─── Запрос к Unsplash ───────────────────────────────────────────────────────
function unsplashSearch(query: string, page = 1): Promise<string | null> {
  return new Promise((resolve) => {
    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=5&page=${page}&orientation=landscape`;
    const options = {
      hostname: "api.unsplash.com",
      path: url.replace("https://api.unsplash.com", ""),
      headers: { Authorization: `Client-ID ${UNSPLASH_KEY}` },
      timeout: 10000,
    };

    https.get(options, (res) => {
      let data = "";
      res.on("data", (chunk) => data += chunk);
      res.on("end", () => {
        try {
          const json = JSON.parse(data);
          if (json.errors) { resolve(null); return; }
          const results = json.results || [];
          if (results.length === 0) { resolve(null); return; }
          // Берём случайный из первых 5 результатов
          const idx = Math.floor(Math.random() * Math.min(3, results.length));
          resolve(results[idx]?.urls?.regular || null);
        } catch {
          resolve(null);
        }
      });
    }).on("error", () => resolve(null))
      .on("timeout", () => resolve(null));
  });
}

// ─── Скачать файл ─────────────────────────────────────────────────────────────
function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const makeRequest = (u: string) => {
      https.get(u, { timeout: 20000 }, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          file.close();
          if (fs.existsSync(dest)) fs.unlinkSync(dest);
          return makeRequest(res.headers.location!);
        }
        if (res.statusCode !== 200) {
          file.close();
          if (fs.existsSync(dest)) fs.unlinkSync(dest);
          return reject(new Error(`HTTP ${res.statusCode}`));
        }
        res.pipe(file);
        file.on("finish", () => { file.close(); resolve(); });
      }).on("error", (e) => {
        file.close();
        if (fs.existsSync(dest)) fs.unlinkSync(dest);
        reject(e);
      });
    };
    makeRequest(url);
  });
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── Основная функция ─────────────────────────────────────────────────────────
async function main() {
  console.log("🖼️  Заполнение изображений через Unsplash\n");

  if (UNSPLASH_KEY === "ВСТАВЬ_КЛЮЧ_ЗДЕСЬ") {
    console.error("❌ Укажи Unsplash Access Key!");
    console.log("   Зарегистрируйся на https://unsplash.com/developers");
    console.log("   Затем: UNSPLASH_KEY=твой_ключ npx ts-node --compiler-options '{\"module\":\"CommonJS\"}' prisma/fill-images-unsplash.ts");
    process.exit(1);
  }

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Товары без изображений
  const products = await prisma.product.findMany({
    where: { images: { isEmpty: true } },
    select: { id: true, name: true, slug: true },
  });

  console.log(`📦 Товаров без фото: ${products.length}\n`);

  let success = 0, failed = 0;

  for (const product of products) {
    const query = getSearchQuery(product.name);
    process.stdout.write(`🔍 ${product.name.slice(0, 40).padEnd(40)} `);

    // Ищем фото
    const imageUrl = await unsplashSearch(query);
    if (!imageUrl) {
      process.stdout.write(`✗ не найдено\n`);
      failed++;
      await sleep(500);
      continue;
    }

    // Скачиваем
    const filename = `${product.slug}.jpg`;
    const destPath = path.join(OUTPUT_DIR, filename);
    const publicPath = `/images/products/${filename}`;

    try {
      await downloadFile(imageUrl, destPath);
      await prisma.product.update({
        where: { id: product.id },
        data: { images: { set: [publicPath] } },
      });
      process.stdout.write(`✓ [${query.slice(0, 25)}]\n`);
      success++;
    } catch {
      process.stdout.write(`✗ ошибка загрузки\n`);
      if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
      failed++;
    }

    // Уважаем rate limit Unsplash (50 req/hour для demo)
    await sleep(1200);
  }

  console.log("\n══════════════════════════════════════");
  console.log(`✅ Успешно: ${success}`);
  console.log(`❌ Не найдено: ${failed}`);
  console.log("══════════════════════════════════════");
  console.log("\n⚡ Unsplash требует attribution — добавить ссылку в footer:");
  console.log('   Photos by <a href="https://unsplash.com">Unsplash</a>');

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1); });
