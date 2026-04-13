export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

// Leonid — тёплый, естественный русский голос (Flash)
const VOICE_ID = "UIaC9QMb6UP5hfzy6uOD";
const MODEL_ID = "eleven_flash_v2_5";
const HARDCODED_KEY = "sk_012bb7d94cc7ef02a9e11422d9dc6a4a56c7ace7a9ff5eb1";

const VOICE_SETTINGS = {
  stability: 0.82,
  similarity_boost: 0.72,
  style: 0.0,
  use_speaker_boost: true,
  speed: 1.05,
};

// ── Прямой запрос к ElevenLabs ──────────────────────────────────────────────
async function directElevenLabs(cleanText: string, apiKey: string): Promise<ArrayBuffer | null> {
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
        voice_settings: VOICE_SETTINGS,
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
async function cloudflareProxy(cleanText: string, apiKey: string): Promise<ArrayBuffer | null> {
  const proxyUrl = process.env.TTS_PROXY_URL; // https://tts-proxy.pilorus.workers.dev
  if (!proxyUrl) return null;

  try {
    const res = await fetch(proxyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: cleanText,
        voiceId: VOICE_ID,
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
function browserFallback(cleanText: string) {
  return NextResponse.json(
    { error: "voice_blocked", fallback: "browser", text: cleanText },
    { status: 200 }
  );
}

// ═════════════════════════════════════════════════════════════════════════════
export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY || HARDCODED_KEY;

    const { text } = await req.json();
    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Нет текста" }, { status: 400 });
    }

    // Очищаем markdown и эмодзи для чистого произношения
    const cleanText = text
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/\*(.*?)\*/g, "$1")
      .replace(/`(.*?)`/g, "$1")
      .replace(/#{1,6}\s/g, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/[\u{1F300}-\u{1FFFF}]/gu, "")
      .trim()
      .slice(0, 1200);

    if (!cleanText) {
      return NextResponse.json({ error: "Пустой текст" }, { status: 400 });
    }

    // Стратегия: Direct → Cloudflare Proxy → Browser fallback
    // 1. Пробуем напрямую (работает если сервер не в заблокированном регионе)
    let audio = await directElevenLabs(cleanText, apiKey);

    // 2. Если заблокировано — через Cloudflare Worker
    if (!audio) {
      console.log("[TTS] Trying Cloudflare proxy...");
      audio = await cloudflareProxy(cleanText, apiKey);
    }

    // 3. Если ничего не сработало — браузерный fallback
    if (!audio || audio.byteLength < 100) {
      console.log("[TTS] All providers failed, browser fallback");
      return browserFallback(cleanText);
    }

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
