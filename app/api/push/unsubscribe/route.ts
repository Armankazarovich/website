export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  const { endpoint } = await req.json();

  if (!endpoint) {
    return NextResponse.json({ error: "endpoint required" }, { status: 400 });
  }

  // Удаляем подписку по endpoint. Для зарегистрированных — только их подписку.
  await prisma.pushSubscription.deleteMany({
    where: session?.user?.id
      ? { endpoint, userId: session.user.id }
      : { endpoint },
  });

  return NextResponse.json({ ok: true });
}
