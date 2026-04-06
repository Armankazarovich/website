import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";

function toSlug(text: string): string {
  const map: Record<string, string> = {
    а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "zh",
    з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o",
    п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "kh", ц: "ts",
    ч: "ch", ш: "sh", щ: "shch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu",
    я: "ya",
  };
  return text
    .toLowerCase()
    .split("")
    .map((c) => map[c] ?? c)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { topic, keywords } = await req.json();

  const prompt = `Ты — SEO-копирайтер для сайта компании ПилоРус (пиломатериалы, Подмосковье, г. Химки).
Напиши профессиональную статью-руководство на тему: "${topic}".
Ключевые слова (вплети естественно): ${keywords || topic}.

ТРЕБОВАНИЯ:
- Язык: русский
- Объём контента: 500–800 слов
- Формат content: HTML (используй <h2>, <h3>, <p>, <ul>, <li>, <strong>)
- Никаких дат, времени, упоминаний авторов
- Полезный, практичный контент — советы, которые реально помогают
- Тон: профессиональный, но доступный
- Упоминай контекст: строительство, ремонт, дача, баня — Московская область

Ответь ТОЛЬКО валидным JSON без markdown-обёртки:
{
  "title": "SEO-заголовок статьи (до 65 символов)",
  "slug": "url-transliterated-slug",
  "excerpt": "Краткое описание для превью (до 150 символов)",
  "content": "<h2>...</h2><p>...</p>...",
  "topic": "${topic}",
  "readTime": 5
}`;

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = (msg.content[0] as { text: string }).text.trim();
    // Strip possible markdown code fences
    const json = raw.replace(/^```json?\n?/, "").replace(/\n?```$/, "");
    const data = JSON.parse(json);

    // Ensure slug is safe
    if (!data.slug || data.slug.includes(" ")) {
      data.slug = toSlug(data.title || topic);
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("Generate post error:", err);
    return NextResponse.json({ error: "Ошибка генерации" }, { status: 500 });
  }
}
