export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPublicProductsFilter, getPublicVariantsFilter } from "@/lib/product-seo";
import { getSiteSettings, getSetting } from "@/lib/site-settings";
import { getCurrentTenantId } from "@/lib/tenant-context";
import { getVariantUnitPrice, pickVariantUnit } from "@/lib/product-units";

export async function GET() {
  const tenantId = getCurrentTenantId();
  const [products, settings, categories] = await Promise.all([
    prisma.product.findMany({
      where: { tenantId, ...getPublicProductsFilter(), category: { tenantId, showInMenu: true } },
      include: {
        category: true,
        variants: { where: getPublicVariantsFilter(), orderBy: { sortOrder: "asc" } },
      },
      orderBy: { name: "asc" },
    }),
    getSiteSettings(),
    prisma.category.findMany({ where: { tenantId, showInMenu: true }, orderBy: { sortOrder: "asc" } }),
  ]);

  const shopName = getSetting(settings, "company_name") || "ПилоРус";
  const shopUrl = (getSetting(settings, "site_url") || "https://pilo-rus.ru").replace(/\/+$/, "");
  const phone = getSetting(settings, "phone") || "";
  const email = getSetting(settings, "email") || "";
  const categoryIdByDbId = new Map(categories.map((category, index) => [category.id, index + 1]));
  const now = new Date().toISOString().replace("T", " ").slice(0, 16);

  let offersXml = "";
  let offerId = 1;

  for (const product of products) {
    const categoryYmlId = categoryIdByDbId.get(product.categoryId);
    if (!categoryYmlId || !product.variants.length) continue;

    for (const variant of product.variants) {
      const unit = pickVariantUnit(variant, product.saleUnit);
      const price = unit ? getVariantUnitPrice(variant, unit) : null;
      if (!price) continue;

      const productUrl = `${shopUrl}/product/${product.slug}`;
      const imageUrl = product.images[0] ? absoluteUrl(shopUrl, product.images[0]) : "";
      const categoryName = product.category.name;
      const name = `${product.name} ${variant.size}`.trim();
      const description = `${name} — ${categoryName}. Доставка по Москве и Московской области.`;

      offersXml += `
    <offer id="${offerId++}" available="true">
      <url>${escapeXml(productUrl)}</url>
      <name>${escapeXml(name)}</name>
      <price>${Number(price).toFixed(2)}</price>
      <currencyId>RUR</currencyId>
      <categoryId>${categoryYmlId}</categoryId>
      ${imageUrl ? `<picture>${escapeXml(imageUrl)}</picture>` : ""}
      <description>${escapeXml(description)}</description>
      <vendor>${escapeXml(shopName)}</vendor>
      <param name="Размер">${escapeXml(variant.size)}</param>
      ${variant.pricePerCube ? `<param name="Цена за м3">${Number(variant.pricePerCube).toFixed(0)} ₽</param>` : ""}
      ${variant.pricePerSquareMeter ? `<param name="\u0426\u0435\u043d\u0430 \u0437\u0430 \u043c2">${Number(variant.pricePerSquareMeter).toFixed(0)} \u20bd</param>` : ""}
      ${variant.pricePerPiece ? `<param name="Цена за шт">${Number(variant.pricePerPiece).toFixed(0)} ₽</param>` : ""}
      ${variant.piecesPerCube ? `<param name="Шт в м3">${variant.piecesPerCube}</param>` : ""}
    </offer>`;
    }
  }

  const categoriesXml = categories
    .map((category, index) => `    <category id="${index + 1}">${escapeXml(category.name)}</category>`)
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

function absoluteUrl(siteUrl: string, pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `${siteUrl}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
