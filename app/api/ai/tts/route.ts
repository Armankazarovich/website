export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { cleanForTTS } from "@/lib/tts-clean";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { calculateElevenLabsCost } from "@/lib/api-pricing";

// Anton Ru — спокойный, разговорный, без акцента (Multilingual v2)
const VOICE_ID = "13JzN9jg1ViUP8Pf3uet";
const MODEL_ID = "eleven_multilingual_v2";

// Голосовые настройки настроены на "Брат-Арай":
// спокойный рабочий тембр, без театральности и без спешки.
const BASE_VOICE_SETTINGS = {
  stability: 0.52,
  similarity_boost: 0.78,
  style: 0.46,
  use_speaker_boost: true,
  speed: 0.96,
};

type ArayVoiceTone = "calm" | "important" | "urgent";

function detectVoiceTone(text: string): ArayVoiceTone {
  const normalized = text.toLowerCase();
  if (/(сроч|критич|горит|ошиб|опасн|не работает|не хватает|просроч|риск|внимание)/.test(normalized)) {
    return "urgent";
  }
  if (/(главное|важно|итог|действие|следующий шаг|срок|заказ|задач|цель|бюджет|расход|выручк|готовност)/.test(normalized)) {
    return "important";
  }
  return "calm";
}

function voiceSettingsForTone(tone: ArayVoiceTone) {
  if (tone === "urgent") {
    return {
      ...BASE_VOICE_SETTINGS,
      stability: 0.64,
      style: 0.32,
      speed: 0.90,
    };
  }
  if (tone === "important") {
    return {
      ...BASE_VOICE_SETTINGS,
      stability: 0.60,
      style: 0.36,
      speed: 0.92,
    };
  }
  return BASE_VOICE_SETTINGS;
}

function shapeProfessionalDelivery(text: string, tone: ArayVoiceTone): string {
  let shaped = text
    .replace(/\b(Главное|Важно|Итог|Действие|Следующий шаг|Риск|Срок|Бюджет|Заказ|Задача)\s*:/gi, "$1. ")
    .replace(/\b(Готово|Проверил|Нашел|Создал|Открыл)\s*:/gi, "$1. ")
    .replace(/\s*—\s*/g, ". ")
    .replace(/!+/g, ".")
    .replace(/\s{2,}/g, " ")
    .trim();

  if (tone === "urgent" && !/^Внимание[.!?]/i.test(shaped)) {
    shaped = `Внимание. ${shaped}`;
  }

  return shaped;
}

// ── Прямой запрос к ElevenLabs ──────────────────────────────────────────────
async function directElevenLabs(cleanText: string, apiKey: string, voiceSettings: typeof BASE_VOICE_SETTINGS): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        "Accept": "audio/mpeg",
      },
      redirect: "manual",
      body: JSON.stringify({
        text: cleanText,
        model_id: MODEL_ID,
        voice_settings: voiceSettings,
      }),
    });

    // Geo-blocked
    if (res.status === 302 || res.status === 301) {
      console.warn("[TTS] ElevenLabs geo-blocked (302)");
      return null;
    }
    if (!res.ok) {
      console.warn("[TTS] ElevenLabs error:", res.status);
      return null;
    }
    return await res.arrayBuffer();
  } catch (err: any) {
    console.warn("[TTS] ElevenLabs network error:", err?.message);
    return null;
  }
}

// ── Запрос через Cloudflare Worker прокси ───────────────────────────────────
async function cloudflareProxy(cleanText: string, apiKey: string, voiceSettings: typeof BASE_VOICE_SETTINGS): Promise<ArrayBuffer | null> {
  const proxyUrl = process.env.TTS_PROXY_URL || "https://pilorus-tts.armankazarovich.workers.dev";
  if (!proxyUrl) return null;

  try {
    const res = await fetch(proxyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: cleanText,
        voiceId: VOICE_ID,
        voice_id: VOICE_ID,
        modelId: MODEL_ID,
        model_id: MODEL_ID,
        voiceSettings: voiceSettings,
        voice_settings: voiceSettings,
        apiKey,
      }),
    });

    if (!res.ok) {
      console.warn("[TTS] Cloudflare proxy error:", res.status);
      return null;
    }

    const ct = res.headers.get("content-type") || "";
    if (ct.includes("audio")) {
      return await res.arrayBuffer();
    }
    // Proxy returned JSON error
    console.warn("[TTS] Proxy returned non-audio");
    return null;
  } catch (err: any) {
    console.warn("[TTS] Proxy network error:", err?.message);
    return null;
  }
}

// ── Web Speech API fallback info ────────────────────────────────────────────
function normalizeSpeechLang(lang: unknown): string | undefined {
  if (typeof lang !== "string") return undefined;
  const normalized = lang.trim();
  if (!/^[a-z]{2,3}(?:-[A-Z]{2})?$/.test(normalized)) return undefined;
  return normalized;
}

function browserFallback(cleanText: string, lang?: string) {
  return NextResponse.json(
    { error: "voice_blocked", fallback: "browser", text: cleanText, lang: lang || "ru-RU" },
    { status: 200 }
  );
}

// ═════════════════════════════════════════════════════════════════════════════
export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;

    const body = await req.json();
    const { text, source, lang } = body as { text?: string; source?: string; lang?: string };
    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Нет текста" }, { status: 400 });
    }

    // Очищаем текст для естественного произношения (см. lib/tts-clean.ts)
    // Расшифровывает аббревиатуры (ГОСТ, ООО, НДС), латиницу (WhatsApp→вотсап),
    // единицы (₽/м³→"рублей за кубометр"), телефоны (+7-985→плюс 7 985),
    // скобки→паузы, кавычки→удалить, размеры через ×→"на" и т.д.
    const baseCleanText = cleanForTTS(text);
    const speechLang = normalizeSpeechLang(lang);
    const tone = detectVoiceTone(baseCleanText);
    const cleanText = shapeProfessionalDelivery(baseCleanText, tone);
    const voiceSettings = voiceSettingsForTone(tone);

    if (!cleanText) {
      return NextResponse.json({ error: "Пустой текст" }, { status: 400 });
    }

    if (!apiKey) {
      console.warn("[TTS] ELEVENLABS_API_KEY is not configured, using browser fallback");
      return browserFallback(cleanText, speechLang);
    }

    // Стратегия: Cloudflare Worker → Direct → Browser fallback
    // VPS в России → ElevenLabs заблокирован → Cloudflare первый
    // 1. Через Cloudflare Worker (за границей, без блокировки)
    let audio = await cloudflareProxy(cleanText, apiKey, voiceSettings);

    // 2. Если CF не настроен/ошибка — пробуем напрямую
    if (!audio) {
      console.log("[TTS] CF failed, trying direct...");
      audio = await directElevenLabs(cleanText, apiKey, voiceSettings);
    }

    // 3. Если ничего не сработало — браузерный fallback (НЕ логируем, не платный)
    if (!audio || audio.byteLength < 100) {
      console.log("[TTS] All providers failed, browser fallback");
      return browserFallback(cleanText, speechLang);
    }

    // ── Логирование расходов ElevenLabs в фоне ─────────────────────────────
    // ElevenLabs Multilingual v2: $0.00022 за символ (Creator план $22/100k credits)
    const characters = cleanText.length;
    const cost = calculateElevenLabsCost(MODEL_ID, characters);

    // Получаем userId если есть сессия (не блокируем основной ответ)
    auth().then(async (session) => {
      try {
        await (prisma as any).arayTokenLog?.create({
          data: {
            userId: session?.user?.id || null,
            sessionId: null,
            provider: "elevenlabs",
            model: MODEL_ID,
            tier: null,
            inputTokens: 0,
            outputTokens: 0,
            characters,
            costUsd: cost.usd,
            costRub: cost.rub,
            feature: "tts",
            endpoint: "/api/ai/tts",
            source: source || null,
          },
        });
      } catch (err) {
        console.error("[TTS log error]", err);
      }
    }).catch(() => {});

    return new NextResponse(audio, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });

  } catch (err: any) {
    console.error("[TTS route error]", err?.message);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
