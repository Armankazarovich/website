export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

// Antoni — warm, friendly male voice for Russian (multilingual v2)
// Настроен как «нежный мужской голос, настоящий друг»
const VOICE_ID = "ErXwobaYiN019PkySvjV";
const MODEL_ID = "eleven_multilingual_v2";

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "ElevenLabs не настроен" }, { status: 503 });
    }

    const { text } = await req.json();
    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Нет текста" }, { status: 400 });
    }

    // Очищаем markdown и эмодзи для чистого произношения
    const cleanText = text
      .replace(/\*\*(.*?)\*\*/g, "$1")   // **bold**
      .replace(/\*(.*?)\*/g, "$1")        // *italic*
      .replace(/`(.*?)`/g, "$1")          // `code`
      .replace(/#{1,6}\s/g, "")           // headers
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // links
      .replace(/[\u{1F300}-\u{1FFFF}]/gu, "")  // эмодзи
      .trim()
      .slice(0, 500); // Не больше 500 символов за раз (экономим кредиты)

    if (!cleanText) {
      return NextResponse.json({ error: "Пустой текст" }, { status: 400 });
    }

    // ElevenLabs может блокировать по geo (302 redirect) — обрабатываем
    const ttsUrl = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`;
    const ttsBody = JSON.stringify({
      text: cleanText,
      model_id: MODEL_ID,
      voice_settings: {
        stability: 0.50,
        similarity_boost: 0.85,
        style: 0.35,
        use_speaker_boost: true,
        speed: 0.95,
      },
    });

    const response = await fetch(ttsUrl, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        "Accept": "audio/mpeg",
      },
      redirect: "manual", // Ловим 302 вместо следования за редиректом
      body: ttsBody,
    });

    // Geo-блокировка: ElevenLabs возвращает 302 для заблокированных регионов
    if (response.status === 302 || response.status === 301) {
      console.warn("[ElevenLabs TTS] Geo-blocked (302). Falling back to browser speech.");
      return NextResponse.json(
        { error: "voice_blocked", fallback: "browser", text: cleanText },
        { status: 200 } // 200 чтобы клиент обработал fallback, а не ошибку
      );
    }

    if (!response.ok) {
      const err = await response.text();
      console.error("[ElevenLabs TTS error]", response.status, err);
      if (response.status === 401) {
        return NextResponse.json({ error: "Неверный API ключ ElevenLabs" }, { status: 401 });
      }
      if (response.status === 429) {
        return NextResponse.json({ error: "Лимит ElevenLabs исчерпан" }, { status: 429 });
      }
      return NextResponse.json(
        { error: "voice_blocked", fallback: "browser", text: cleanText },
        { status: 200 }
      );
    }

    const audioBuffer = await response.arrayBuffer();

    return new NextResponse(audioBuffer, {
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
