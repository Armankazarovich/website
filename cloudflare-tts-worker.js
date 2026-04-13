/**
 * Cloudflare Worker — прокси для ElevenLabs TTS API
 * Обходит гео-блокировку ElevenLabs в России.
 *
 * Деплой:
 * 1. dashboard.cloudflare.com → Workers & Pages → Create
 * 2. Вставить этот код → Deploy
 * 3. Добавить в .env на сервере:
 *    TTS_PROXY_URL=https://ИМЯ_ВОРКЕРА.workers.dev/tts
 *
 * Запрос от сервера:
 *   POST /tts  { text, voiceId, apiKey }
 *   → проксирует на api.elevenlabs.io → возвращает audio/mpeg
 */

const ALLOWED_ORIGINS = [
  "https://pilo-rus.ru",
  "https://www.pilo-rus.ru",
];

const DEFAULT_VOICE = "13JzN9jg1ViUP8Pf3uet"; // Anton Ru
const DEFAULT_MODEL = "eleven_multilingual_v2";

export default {
  async fetch(request) {
    const origin = request.headers.get("Origin") || "";

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    try {
      const body = await request.json();
      const { text, voiceId, apiKey } = body;

      if (!text || !apiKey) {
        return new Response(JSON.stringify({ error: "text and apiKey required" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const voice = voiceId || DEFAULT_VOICE;
      const url = `https://api.elevenlabs.io/v1/text-to-speech/${voice}/stream?output_format=mp3_22050_32`;

      const ttsRes = await fetch(url, {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: text.slice(0, 1500),
          model_id: DEFAULT_MODEL,
          voice_settings: {
            stability: 0.82,
            similarity_boost: 0.72,
            style: 0.0,
            use_speaker_boost: true,
            speed: 1.05,
          },
        }),
      });

      if (!ttsRes.ok) {
        const errText = await ttsRes.text();
        return new Response(JSON.stringify({ error: "ElevenLabs error", status: ttsRes.status, detail: errText }), {
          status: 502,
          headers: { "Content-Type": "application/json" },
        });
      }

      const corsOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

      return new Response(ttsRes.body, {
        status: 200,
        headers: {
          "Content-Type": "audio/mpeg",
          "Access-Control-Allow-Origin": corsOrigin,
          "Cache-Control": "no-store",
        },
      });

    } catch (err) {
      return new Response(JSON.stringify({ error: "Worker error", message: err.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
};
