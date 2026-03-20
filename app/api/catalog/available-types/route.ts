import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const ALL_TYPE_VALUES = [
  "доска", "брус", "вагонка", "планкен", "блок-хаус",
  "плинтус", "строганная", "фанера", "дсп",
];

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");

  const products = await prisma.product.findMany({
    where: {
      active: true,
      ...(category ? { category: { slug: category } } : {}),
    },
    select: { name: true },
  });

  const namesLower = products.map((p) => p.name.toLowerCase());

  const types = ALL_TYPE_VALUES.filter((tv) =>
    namesLower.some((name) => name.includes(tv))
  );

  return NextResponse.json({ types });
}
