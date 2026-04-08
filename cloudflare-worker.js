/**
 * Cloudflare Worker — прокси для Anthropic API
 * Деплой: dashboard.cloudflare.com → Workers → Create → вставить этот код
 * После деплоя добавить в .env на сервере:
 * ANTHROPIC_BASE_URL=https://ИМЯ_ВОРКЕРА.workers.dev
 */

export default {
  async fetch(request) {
    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "https://pilo-rus.ru",
          "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
          "Access-Control-Allow-Headers": "*",
        },
      });
    }

    const url = new URL(request.url);

    // Проксируем на api.anthropic.com
    const targetUrl = "https://api.anthropic.com" + url.pathname + url.search;

    const headers = new Headers(request.headers);
    headers.set("host", "api.anthropic.com");

    const proxyRequest = new Request(targetUrl, {
      method: request.method,
      headers: headers,
      body: request.body,
    });

    const response = await fetch(proxyRequest);

    const newHeaders = new Headers(response.headers);
    newHeaders.set("Access-Control-Allow-Origin", "https://pilo-rus.ru");

    return new Response(response.body, {
      status: response.status,
      headers: newHeaders,
    });
  },
};
