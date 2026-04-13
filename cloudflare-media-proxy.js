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
  "videos.pexels.com",
  "images.pexels.com",
  "player.vimeo.com",
  "api.elevenlabs.io",
  "storage.googleapis.com",
  "cdn.pixabay.com",
  "media.istockphoto.com",
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
    if (url.pathname === "/proxy") {
      let targetUrl;

      if (request.method === "GET") {
        targetUrl = url.searchParams.get("url");
      } else if (request.method === "POST") {
        try {
          const body = await request.json();
          targetUrl = body.url;
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
        // Проксируем запрос
        const proxyRes = await fetch(targetUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept": "*/*",
            "Referer": new URL(targetUrl).origin + "/",
          },
        });

        if (!proxyRes.ok) {
          return new Response(JSON.stringify({ error: "Upstream error", status: proxyRes.status }), {
            status: 502,
            headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
          });
        }

        // Стримим ответ обратно
        const contentType = proxyRes.headers.get("Content-Type") || "application/octet-stream";
        const contentLength = proxyRes.headers.get("Content-Length");

        const respHeaders = {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=86400", // 24h кеш
          ...corsHeaders(origin),
        };

        if (contentLength) {
          respHeaders["Content-Length"] = contentLength;
        }

        // Поддержка Range запросов (для видео seeking)
        const rangeHeader = request.headers.get("Range");
        if (rangeHeader) {
          const rangeRes = await fetch(targetUrl, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
              "Range": rangeHeader,
              "Referer": new URL(targetUrl).origin + "/",
            },
          });

          const rangeHeaders = {
            "Content-Type": rangeRes.headers.get("Content-Type") || contentType,
            "Content-Range": rangeRes.headers.get("Content-Range") || "",
            "Content-Length": rangeRes.headers.get("Content-Length") || "",
            "Accept-Ranges": "bytes",
            "Cache-Control": "public, max-age=86400",
            ...corsHeaders(origin),
          };

          return new Response(rangeRes.body, {
            status: 206,
            headers: rangeHeaders,
          });
        }

        return new Response(proxyRes.body, {
          status: 200,
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
