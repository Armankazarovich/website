export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

async function checkAdmin() {
  const session = await auth();
  const role = session?.user?.role;
  return session && ["SUPER_ADMIN", "ADMIN", "MANAGER"].includes(role as string);
}

// ── Словарь русских терминов → английские ключевые слова ─────────────────────
const KEYWORDS_MAP: Record<string, string> = {
  // Виды пиломатериалов
  "доска":        "wooden board lumber planks",
  "брус":         "timber beam wood construction",
  "вагонка":      "wood wall paneling cladding",
  "блок-хаус":    "log cabin siding wood exterior",
  "блокхаус":     "log cabin siding wood exterior",
  "планкен":      "wood facade cladding planks",
  "террасная":    "terrace decking wood outdoor",
  "палубная":     "decking board wood outdoor",
  "фанера":       "plywood sheet wood",
  "осб":          "osb oriented strand board",
  "двп":          "fiberboard wood panel",
  "мдф":          "mdf wood panel furniture",
  "дсп":          "chipboard wood furniture",
  "имитация":     "wood cladding wall panel",
  "евровагонка":  "euro wood paneling interior",
  "половая":      "hardwood floor boards",
  "пол":          "hardwood floor wood",
  "лаг":          "wooden joist beam",
  "обрешётка":    "wooden frame construction",
  "обрешетка":    "wooden frame construction",
  "рейка":        "wooden slat strip",

  // Породы дерева
  "сосна":        "pine wood lumber natural",
  "ель":          "spruce wood lumber",
  "лиственница":  "larch wood lumber",
  "осина":        "aspen wood lumber",
  "берёза":       "birch wood lumber",
  "береза":       "birch wood lumber",
  "дуб":          "oak wood lumber",
  "кедр":         "cedar wood natural",
  "липа":         "linden wood",

  // Обработка
  "строганый":    "planed smoothed wood timber",
  "строганная":   "planed smoothed wood timber",
  "обрезной":     "sawn timber lumber",
  "антисептик":   "treated lumber wood protection",
  "антисептированный": "treated wood antiseptic lumber",
  "шпунтованный": "tongue groove wood flooring",

  // Общее
  "пиломатериал": "lumber timber sawmill wood",
  "древесина":    "wood timber natural material",
  "дерево":       "wood tree natural material",
};

function buildSearchQuery(productName: string): string {
  const lower = productName.toLowerCase();
  const matched: string[] = [];

  // Ищем совпадения в словаре
  for (const [ru, en] of Object.entries(KEYWORDS_MAP)) {
    if (lower.includes(ru)) {
      matched.push(en);
      if (matched.length >= 2) break; // берём максимум 2 совпадения
    }
  }

  if (matched.length > 0) {
    // Берём первые 3 слова из каждого совпадения
    return matched.map(m => m.split(" ").slice(0, 3).join(" ")).join(" ");
  }

  // Fallback — просто wood lumber
  return `wood lumber timber`;
}

// ── GET /api/admin/photos/search?q=Доска+обрезная ────────────────────────────
export async function GET(req: Request) {
  if (!(await checkAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q") ?? "";
  const page = Number(searchParams.get("page") ?? 1);

  if (!query.trim()) return NextResponse.json({ photos: [], query: "" });

  const apiKey = process.env.PIXABAY_API_KEY;
  const searchQuery = buildSearchQuery(query);

  if (!apiKey) {
    // Без ключа — возвращаем демо-данные с подсказкой
    return NextResponse.json({
      photos: [],
      query: searchQuery,
      error: "PIXABAY_API_KEY не настроен. Получите бесплатный ключ на pixabay.com/api/ и добавьте в настройки Vercel.",
      needsKey: true,
    });
  }

  try {
    const url = new URL("https://pixabay.com/api/");
    url.searchParams.set("key", apiKey);
    url.searchParams.set("q", searchQuery);
    url.searchParams.set("image_type", "photo");
    url.searchParams.set("orientation", "horizontal");
    url.searchParams.set("category", "");
    url.searchParams.set("min_width", "800");
    url.searchParams.set("safesearch", "true");
    url.searchParams.set("per_page", "12");
    url.searchParams.set("page", String(page));
    url.searchParams.set("order", "popular");

    const res = await fetch(url.toString(), {
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) throw new Error(`Pixabay error: ${res.status}`);

    const data = await res.json();

    const photos = (data.hits ?? []).map((h: any) => ({
      id: h.id,
      thumb: h.webformatURL,      // ~640px — для превью
      full: h.largeImageURL,      // ~1920px — для скачивания
      width: h.webformatWidth,
      height: h.webformatHeight,
      tags: h.tags,
      user: h.user,
      pageURL: h.pageURL,
    }));

    return NextResponse.json({
      photos,
      total: data.totalHits,
      query: searchQuery,
      originalQuery: query,
      page,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message, photos: [] }, { status: 500 });
  }
}

// ── POST: download photo → save to /images/products/ ─────────────────────────
export async function POST(req: Request) {
  if (!(await checkAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { photoUrl, productId } = await req.json();
  if (!photoUrl || !productId) return NextResponse.json({ error: "photoUrl and productId required" }, { status: 400 });

  try {
    const { writeFile, mkdir } = await import("fs/promises");
    const { join } = await import("path");
    const { existsSync } = await import("fs");

    // Download photo
    const res = await fetch(photoUrl, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error("Failed to download photo");

    const buf = Buffer.from(await res.arrayBuffer());

    // Save to disk
    const dir = join(process.cwd(), "public", "images", "products");
    if (!existsSync(dir)) await mkdir(dir, { recursive: true });

    const filename = `pixabay-${productId}-${Date.now()}.jpg`;
    const filePath = join(dir, filename);
    await writeFile(filePath, buf);

    const url = `/images/products/${filename}`;

    // Add to product images
    const { prisma } = await import("@/lib/prisma");
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { images: true },
    });

    if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

    await prisma.product.update({
      where: { id: productId },
      data: { images: [...product.images, url] },
    });

    return NextResponse.json({ ok: true, url });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
