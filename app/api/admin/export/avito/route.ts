export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function checkAdmin() {
  const session = await auth();
  const role = session?.user?.role;
  return role === "ADMIN" || role === "MANAGER";
}

export async function GET() {
  if (!(await checkAdmin())) return new Response("Unauthorized", { status: 401 });

  const siteUrlRow = await prisma.siteSettings.findUnique({ where: { key: "site_url" } });
  const siteUrl = siteUrlRow?.value || "https://pilo-rus.ru";

  const phoneRow = await prisma.siteSettings.findUnique({ where: { key: "phone_link" } });
  const phone = phoneRow?.value?.replace(/\D/g, "") || "79859707133";

  const addressRow = await prisma.siteSettings.findUnique({ where: { key: "address" } });
  const address = addressRow?.value || "Химки, ул. Заводская 2А, стр.28";

  const products = await prisma.product.findMany({
    where: { active: true },
    include: {
      category: { select: { name: true } },
      variants: { where: { inStock: true }, orderBy: { size: "asc" } },
    },
  });

  const now = new Date().toISOString().split("T")[0];
  let adId = 1;
  const ads: string[] = [];

  for (const product of products) {
    for (const variant of product.variants.slice(0, 3)) {
      const price = Number(variant.pricePerCube || variant.pricePerPiece || 0);
      if (price <= 0) continue;
      const unit = variant.pricePerCube ? "м³" : "шт";
      const image = product.images[0]
        ? `<Images><Image url="${siteUrl}${product.images[0].startsWith("/") ? "" : "/"}${product.images[0]}"/></Images>`
        : "";

      ads.push(`  <Ad>
    <Id>${adId++}</Id>
    <DateBegin>${now}</DateBegin>
    <DateEnd></DateEnd>
    <Category>Строительные материалы</Category>
    <Title>${product.name} ${variant.size}</Title>
    <Description>${product.description || `${product.name} ${variant.size}. ${product.category?.name || "Пиломатериалы"} от производителя. Доставка по Москве и МО.`}</Description>
    <Price>${price}</Price>
    <Currency>RUR</Currency>
    <Condition>Новое</Condition>
    <ContactMethod>По телефону и в сообщениях</ContactMethod>
    <Address>${address}</Address>
    <Region>Московская область</Region>
    <City>Химки</City>
    <Url>${siteUrl}/product/${product.slug}</Url>
    ${image}
  </Ad>`);
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Ads formatVersion="3" target="Avito.ru">
${ads.join("\n")}
</Ads>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Content-Disposition": `attachment; filename="avito-${now}.xml"`,
    },
  });
}
