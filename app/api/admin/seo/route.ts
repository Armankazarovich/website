export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function checkAdmin() {
  const session = await auth();
  return session && (session.user as any).role === "ADMIN";
}

export async function POST(req: Request) {
  if (!(await checkAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { action } = await req.json();

  // Ping Yandex and Google with sitemap
  if (action === "ping_sitemap") {
    const siteUrlRow = await prisma.siteSettings.findUnique({ where: { key: "site_url" } });
    const siteUrl = siteUrlRow?.value || "https://pilo-rus.ru";
    const sitemapUrl = encodeURIComponent(`${siteUrl}/sitemap.xml`);

    const results: { engine: string; status: string; ok: boolean }[] = [];

    // Ping Yandex
    try {
      const res = await fetch(`https://webmaster.yandex.ru/ping?sitemap=${sitemapUrl}`, { signal: AbortSignal.timeout(8000) });
      results.push({ engine: "Яндекс", status: res.ok ? "Принято" : `Ошибка ${res.status}`, ok: res.ok });
    } catch {
      results.push({ engine: "Яндекс", status: "Таймаут", ok: false });
    }

    // Ping Google
    try {
      const res = await fetch(`https://www.google.com/ping?sitemap=${sitemapUrl}`, { signal: AbortSignal.timeout(8000) });
      results.push({ engine: "Google", status: res.ok ? "Принято" : `Ошибка ${res.status}`, ok: res.ok });
    } catch {
      results.push({ engine: "Google", status: "Таймаут", ok: false });
    }

    return NextResponse.json({ ok: true, results });
  }

  // Generate meta for all products missing description
  if (action === "auto_meta") {
    const products = await prisma.product.findMany({
      where: { OR: [{ description: null }, { description: "" }] },
      select: { id: true, name: true, category: { select: { name: true } } },
      take: 50,
    });

    let updated = 0;
    for (const p of products) {
      const description = `${p.name} — купить в ПилоРус. ${p.category?.name || "Пиломатериалы"} от производителя в Химках. Доставка по Москве и МО за 1-3 дня. Звоните: 8-985-970-71-33`;
      await prisma.product.update({ where: { id: p.id }, data: { description } });
      updated++;
    }

    return NextResponse.json({ ok: true, updated });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
