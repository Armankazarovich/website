export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function checkAdmin() {
  const session = await auth();
  return session && (session.user as any).role === "ADMIN";
}

export async function GET() {
  if (!(await checkAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const promotions = await prisma.promotion.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(promotions);
}

export async function POST(req: Request) {
  if (!(await checkAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { title, description, discount, imageUrl, validUntil, active } = await req.json();
  const promotion = await prisma.promotion.create({
    data: {
      title,
      description,
      discount: discount || null,
      imageUrl,
      validUntil: validUntil ? new Date(validUntil) : null,
      active: active ?? true,
    },
  });
  return NextResponse.json(promotion);
}
