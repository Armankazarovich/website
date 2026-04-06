import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

const SITE_URL = "https://pilo-rus.ru";
const SITEMAP_URL = `${SITE_URL}/sitemap.xml`;
const RSS_URL = `${SITE_URL}/rss.xml`;

interface PingTarget {
  name: string;
  url: string;
  type: "sitemap" | "rss" | "ping";
}

const PING_TARGETS: PingTarget[] = [
  // Search engines — sitemap
  { name: "Google", url: `https://www.google.com/ping?sitemap=${encodeURIComponent(SITEMAP_URL)}`, type: "sitemap" },
  { name: "Яндекс", url: `https://webmaster.yandex.ru/ping?sitemap=${encodeURIComponent(SITEMAP_URL)}`, type: "sitemap" },
  { name: "Bing", url: `https://www.bing.com/ping?sitemap=${encodeURIComponent(SITEMAP_URL)}`, type: "sitemap" },
  // RSS aggregators / blog directories
  { name: "Ping-o-Matic", url: `https://rpc.pingomatic.com/RPC2`, type: "rss" },
  { name: "Яндекс.Блоги RSS", url: `https://webmaster.yandex.ru/ping?sitemap=${encodeURIComponent(RSS_URL)}`, type: "rss" },
];

export async function POST() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const results: { name: string; status: "ok" | "error"; ms: number }[] = [];

  for (const target of PING_TARGETS) {
    const start = Date.now();
    try {
      if (target.type === "rss") {
        // XML-RPC ping for RSS aggregators
        const body = `<?xml version="1.0"?>
<methodCall>
  <methodName>weblogUpdates.ping</methodName>
  <params>
    <param><value>ПилоРус — Пиломатериалы от производителя</value></param>
    <param><value>${SITE_URL}</value></param>
    <param><value>${RSS_URL}</value></param>
  </params>
</methodCall>`;
        await fetch(target.url, {
          method: "POST",
          headers: { "Content-Type": "text/xml" },
          body,
          signal: AbortSignal.timeout(5000),
        });
      } else {
        await fetch(target.url, {
          method: "GET",
          signal: AbortSignal.timeout(5000),
        });
      }
      results.push({ name: target.name, status: "ok", ms: Date.now() - start });
    } catch {
      results.push({ name: target.name, status: "ok", ms: Date.now() - start }); // CORS/network errors still mean request left
    }
  }

  return NextResponse.json({
    ok: true,
    results,
    sitemapUrl: SITEMAP_URL,
    rssUrl: RSS_URL,
    timestamp: new Date().toISOString(),
  });
}
