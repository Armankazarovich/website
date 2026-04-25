export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import type { OrderStatus } from "@prisma/client";
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

const STAFF_ROLES = ["SUPER_ADMIN", "ADMIN", "MANAGER", "COURIER", "ACCOUNTANT", "WAREHOUSE", "SELLER"];
const ACTIVE_STATUSES: OrderStatus[] = ["NEW", "CONFIRMED", "PROCESSING", "SHIPPED", "IN_DELIVERY", "READY_PICKUP"];
const FINISHED_STATUSES: OrderStatus[] = ["DELIVERED", "COMPLETED"];

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;
  const role = ((session.user as { role?: string }).role) || "USER";
  const isStaff = STAFF_ROLES.includes(role);

  // Профиль + личные stats — параллельно
  const [user, activeOrders, finishedOrders, totalSpentAgg, reviewsCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true, phone: true, address: true, avatarUrl: true },
    }),
    prisma.order.count({
      where: { userId, deletedAt: null, status: { in: ACTIVE_STATUSES } },
    }),
    prisma.order.count({
      where: { userId, deletedAt: null, status: { in: FINISHED_STATUSES } },
    }),
    prisma.order.aggregate({
      where: { userId, deletedAt: null, status: { not: "CANCELLED" } },
      _sum: { totalAmount: true, deliveryCost: true },
    }),
    prisma.review.count({ where: { userId } }).catch(() => 0),
  ]);

  const totalSpent =
    Number(totalSpentAgg._sum.totalAmount || 0) + Number(totalSpentAgg._sum.deliveryCost || 0);

  // Staff stats — только для сотрудников
  let staffStats: { todayNewOrders: number; pendingReviews: number } | null = null;
  if (isStaff) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [todayNewOrders, pendingReviews] = await Promise.all([
      prisma.order.count({
        where: { deletedAt: null, status: "NEW", createdAt: { gte: todayStart } },
      }),
      prisma.review.count({ where: { approved: false } }).catch(() => 0),
    ]);

    staffStats = { todayNewOrders, pendingReviews };
  }

  return NextResponse.json({
    ...user,
    stats: {
      activeOrders,
      finishedOrders,
      totalSpent,
      reviewsCount,
    },
    staffStats,
  });
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
