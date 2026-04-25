export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { normalizePhone } from "@/lib/phone";
import { rateLimit } from "@/lib/rate-limit";

const limiter = rateLimit("cabinet-profile", 20, 60_000);

const patchSchema = z.object({
  name: z.string().trim().min(2, "Имя слишком короткое").max(100, "Имя слишком длинное").optional(),
  phone: z.string().trim().max(30).optional().nullable(),
  address: z.string().trim().max(500, "Адрес слишком длинный").optional().nullable(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true, phone: true, address: true, avatarUrl: true },
  });

  return NextResponse.json(user);
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!limiter.check(session.user.id)) {
    return NextResponse.json({ error: "Слишком часто. Попробуйте через минуту." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Некорректные данные" },
      { status: 400 }
    );
  }

  const { name, phone, address } = parsed.data;

  // Нормализация телефона
  let normalizedPhone: string | null | undefined = undefined;
  if (phone !== undefined) {
    if (phone === null || phone.trim() === "") {
      normalizedPhone = null;
    } else {
      const n = normalizePhone(phone);
      if (!n) {
        return NextResponse.json({ error: "Некорректный номер телефона" }, { status: 400 });
      }
      normalizedPhone = n;
    }
  }

  // Обновляем только переданные поля
  const data: Record<string, unknown> = {};
  if (name !== undefined) data.name = name;
  if (normalizedPhone !== undefined) data.phone = normalizedPhone;
  if (address !== undefined) data.address = address === null ? null : address;

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data,
    select: { name: true, phone: true, address: true },
  });

  return NextResponse.json({ ok: true, ...user });
}
