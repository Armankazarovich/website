import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 3600; // 1 hour

const SITE_URL = "https://pilo-rus.ru";
const SITE_NAME = "ПилоРус — Пиломатериалы от производителя";
const SITE_DESC = "Полезные статьи о пиломатериалах: выбор, обработка, строительство. Производитель в Химках МО.";

function escapeXml(str: string) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

export async function GET() {
  const posts = await prisma.post.findMany({
    where: { published: true },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      slug: true,
      title: true,
      excerpt: true,
      content: true,
      topic: true,
      coverImage: true,
      createdAt: true,
    },
  });

  const items = posts.map((post) => {
    const url = `${SITE_URL}/news/${post.slug}`;
    const description = escapeXml(stripHtml(post.excerpt || post.content).slice(0, 300));
    const image = post.coverImage
      ? `<enclosure url="${escapeXml(post.coverImage)}" type="image/jpeg" length="0" />`
      : "";
    return `
    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <description>${description}</description>
      ${post.topic ? `<category>${escapeXml(post.topic)}</category>` : ""}
      <pubDate>${new Date(post.createdAt).toUTCString()}</pubDate>
      ${image}
    </item>`;
  }).join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(SITE_NAME)}</title>
    <link>${SITE_URL}</link>
    <description>${escapeXml(SITE_DESC)}</description>
    <language>ru</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml" />
    <image>
      <url>${SITE_URL}/logo.png</url>
      <title>${escapeXml(SITE_NAME)}</title>
      <link>${SITE_URL}</link>
    </image>
    ${items}
  </channel>
</rss>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
