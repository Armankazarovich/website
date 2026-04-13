/**
 * Cloudflare Worker — универсальный медиа-прокси для ПилоРус
 * Проксирует видео, аудио, изображения с заблокированных сервисов.
 *
 * Использование:
 *   POST /proxy { url: "https://videos.pexels.com/..." }
 *   → проксирует контент, возвращает оригинальный Content-Type
 *
 *   GET /proxy?url=https://videos.pexels.com/...
 *   → то же самое через GET (для <video src="...">)
 *
 * Деплой:
 *   1. dashboard.cloudflare.com → Workers & Pages → Create
 *   2. Вставить этот код → Deploy
 *   3. URL: https://pilorus-media.armankazarovich.workers.dev
 */

const ALLOWED_ORIGINS = [
  "https://pilo-rus.ru",
  "https://www.pilo-rus.ru",
  "http://localhost:3000",
];

// Домены которые разрешено проксировать
const ALLOWED_DOMAINS = [
  // Видео/фото стоки
  "videos.pexels.com",
  "images.pexels.com",
  "player.vimeo.com",
  "cdn.pixabay.com",
  "media.istockphoto.com",
  // Голос
  "api.elevenlabs.io",
  // Google AI (Gemini, Veo3, Imagen, etc)
  "generativelanguage.googleapis.com",  // Gemini API
  "aiplatform.googleapis.com",          // Vertex AI (Veo3, Imagen)
  "storage.googleapis.com",             // Google Cloud Storage
  "us-central1-aiplatform.googleapis.com", // Vertex regional
  "europe-west1-aiplatform.googleapis.com",
  // Anthropic
  "api.anthropic.com",
  // Banana.dev / fal.ai / Replicate — AI inference
  "api.banana.dev",
  "api.fal.ai",
  "api.replicate.com",
  // OpenAI (на будущее)
  "api.openai.com",
  // Stability AI (генерация картинок)
  "api.stability.ai",
];

function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

function isDomainAllowed(url) {
  try {
    const hostname = new URL(url).hostname;
    return ALLOWED_DOMAINS.some(d => hostname === d || hostname.endsWith("." + d));
  } catch {
    return false;
  }
}

export default {
  async fetch(request) {
    const origin = request.headers.get("Origin") || "";
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders(origin) });
    }

    // Health check
    if (url.pathname === "/" || url.pathname === "/health") {
      return new Response(JSON.stringify({ status: "ok", service: "pilorus-media-proxy" }), {
        headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
      });
    }

    // Proxy endpoint
    // GET  /proxy?url=...                     — для видео/медиа
    // POST /proxy { url, method?, headers?, body? } — для AI API
    if (url.pathname === "/proxy") {
      let targetUrl, proxyMethod = "GET", proxyHeaders = {}, proxyBody = null;

      if (request.method === "GET") {
        targetUrl = url.searchParams.get("url");
      } else if (request.method === "POST") {
        try {
          const body = await request.json();
          targetUrl = body.url;
          proxyMethod = body.method || "POST";
          proxyHeaders = body.headers || {};
          proxyBody = body.body ? JSON.stringify(body.body) : null;
        } catch {
          return new Response(JSON.stringify({ error: "Invalid JSON" }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
          });
        }
      }

      if (!targetUrl) {
        return new Response(JSON.stringify({ error: "url parameter required" }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
        });
      }

      // Проверяем что домен в белом списке
      if (!isDomainAllowed(targetUrl)) {
        return new Response(JSON.stringify({ error: "Domain not allowed" }), {
          status: 403,
          headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
        });
      }

      try {
        // Собираем заголовки: дефолтные + кастомные от клиента
        const fetchHeaders = {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept": "*/*",
          "Referer": new URL(targetUrl).origin + "/",
          ...proxyHeaders, // API ключи, Content-Type и т.д.
        };

        // Range запросы для видео
        const rangeHeader = request.headers.get("Range");
        if (rangeHeader && proxyMethod === "GET") {
          fetchHeaders["Range"] = rangeHeader;
        }

        // Проксируем запрос
        const fetchOpts = { method: proxyMethod, headers: fetchHeaders };
        if (proxyBody && proxyMethod !== "GET") {
          fetchOpts.body = proxyBody;
        }

        const proxyRes = await fetch(targetUrl, fetchOpts);

        if (!proxyRes.ok && proxyRes.status !== 206) {
          const errBody = await proxyRes.text().catch(() => "");
          return new Response(JSON.stringify({ error: "Upstream error", status: proxyRes.status, detail: errBody.slice(0, 500) }), {
            status: 502,
            headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
          });
        }

        // Стримим ответ обратно
        const contentType = proxyRes.headers.get("Content-Type") || "application/octet-stream";
        const contentLength = proxyRes.headers.get("Content-Length");
        const isMedia = contentType.startsWith("video/") || contentType.startsWith("image/") || contentType.startsWith("audio/");

        const respHeaders = {
          "Content-Type": contentType,
          "Cache-Control": isMedia ? "public, max-age=86400" : "no-store", // кеш только для медиа
          ...corsHeaders(origin),
        };

        if (contentLength) respHeaders["Content-Length"] = contentLength;
        if (proxyRes.headers.get("Content-Range")) {
          respHeaders["Content-Range"] = proxyRes.headers.get("Content-Range");
          respHeaders["Accept-Ranges"] = "bytes";
        }

        return new Response(proxyRes.body, {
          status: proxyRes.status,
          headers: respHeaders,
        });

      } catch (err) {
        return new Response(JSON.stringify({ error: "Proxy error", message: err.message }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
        });
      }
    }

    return new Response("Not Found", { status: 404 });
  },
};
