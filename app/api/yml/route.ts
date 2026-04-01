// Яндекс Маркет YML фид — автоматически генерируется из товаров
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSiteSettings, getSetting } from "@/lib/site-settings";

export async function GET() {
  const [products, settings] = await Promise.all([
    prisma.product.findMany({
      where: { active: true },
      include: { category: true, variants: { where: { inStock: true } } },
      orderBy: { name: "asc" },
    }),
    getSiteSettings(),
  ]);

  const shopName = getSetting(settings, "company_name") || "ПилоРус";
  const shopUrl  = getSetting(settings, "site_url") || "https://pilo-rus.ru";
  const phone    = getSetting(settings, "phone") || "";
  const email    = getSetting(settings, "email") || "";

  const now = new Date().toISOString().replace("T", " ").slice(0, 16);

  // Build offers
  let offersXml = "";
  let offerId = 1;

  for (const product of products) {
    if (!product.variants.length) continue;

    for (const variant of product.variants) {
      const price = variant.pricePerCube ?? variant.pricePerPiece;
      if (!price) continue;

      const productUrl = `${shopUrl}/product/${product.slug}`;
      const imageUrl = product.images[0] ? `${shopUrl}${product.images[0]}` : "";
      const categoryName = product.category.name;
      const name = `${product.name} ${variant.size}`.trim();
      const description = `${name} — ${categoryName}. Доставка по Москве и МО.`;

      offersXml += `
    <offer id="${offerId++}" available="true">
      <url>${productUrl}</url>
      <name>${escapeXml(name)}</name>
      <price>${Number(price).toFixed(2)}</price>
      <currencyId>RUR</currencyId>
      <categoryId>${product.categoryId}</categoryId>
      ${imageUrl ? `<picture>${escapeXml(imageUrl)}</picture>` : ""}
      <description>${escapeXml(description)}</description>
      <vendor>${escapeXml(shopName)}</vendor>
      <param name="Размер">${escapeXml(variant.size)}</param>
      ${variant.pricePerCube ? `<param name="Цена за м³">${Number(variant.pricePerCube).toFixed(0)} ₽</param>` : ""}
      ${variant.pricePerPiece ? `<param name="Цена за шт">${Number(variant.pricePerPiece).toFixed(0)} ₽</param>` : ""}
      ${variant.piecesPerCube ? `<param name="Шт в м³">${variant.piecesPerCube}</param>` : ""}
    </offer>`;
    }
  }

  // Build categories
  const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });
  const categoriesXml = categories
    .map((c) => `    <category id="${c.id}">${escapeXml(c.name)}</category>`)
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE yml_catalog SYSTEM "shops.dtd">
<yml_catalog date="${now}">
  <shop>
    <name>${escapeXml(shopName)}</name>
    <company>${escapeXml(shopName)}</company>
    <url>${escapeXml(shopUrl)}</url>
    ${phone ? `<phone>${escapeXml(phone)}</phone>` : ""}
    ${email ? `<email>${escapeXml(email)}</email>` : ""}
    <currencies>
      <currency id="RUR" rate="1"/>
    </currencies>
    <categories>
${categoriesXml}
    </categories>
    <offers>
${offersXml}
    </offers>
  </shop>
</yml_catalog>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
