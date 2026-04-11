export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function checkAdmin() {
  const session = await auth();
  return session && session.user.role === "ADMIN";
}

// Стартовые отзывы — реалистичные отзывы от покупателей пиломатериалов
const STARTER_REVIEWS = [
  {
    name: "Александр М.",
    rating: 5,
    text: "Отличное качество пиломатериалов, всё строго по размерам. Доставка пришла вовремя, водитель помог разгрузить. Буду заказывать ещё!",
    city: "Москва",
  },
  {
    name: "Сергей К.",
    rating: 5,
    text: "Брал доску обрезную 50×150 для строительства веранды. Качество хорошее, сухая, без сколов. Цена честная для такого качества.",
    city: "Химки",
  },
  {
    name: "Михаил Р.",
    rating: 5,
    text: "Заказываю здесь уже третий раз. Стабильное качество, удобный сайт, быстро оформил и оплатил. Рекомендую!",
    city: "Красногорск",
  },
  {
    name: "Наталья В.",
    rating: 4,
    text: "Хорошая компания. Вагонку взяла для бани — всё ровное, красивое. Немного задержали доставку, но предупредили заранее.",
    city: "Мытищи",
  },
  {
    name: "Дмитрий Л.",
    rating: 5,
    text: "Огромный выбор, знающие менеджеры. Помогли подобрать нужное сечение бруса под мой проект. Цены ниже чем в строительных магазинах.",
    city: "Долгопрудный",
  },
  {
    name: "Игорь С.",
    rating: 5,
    text: "Брус 150×150 для дома заказывал — всё в порядке, по размерам, без гнили. Производство своё, поэтому и цены адекватные и качество стабильное.",
    city: "Лобня",
  },
];

export async function POST(_req: Request) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const created: string[] = [];
  const errors: string[] = [];

  for (const review of STARTER_REVIEWS) {
    try {
      const r = await prisma.review.create({
        data: {
          // Review.name — имя автора (поле в схеме)
          name: review.name,
          rating: review.rating,
          // Добавляем город в начало текста для большей детализации
          text: `[${review.city}] ${review.text}`,
          approved: true, // Стартовые отзывы сразу публикуются
        },
      });
      created.push(r.id);
    } catch (e: any) {
      console.error(`Ошибка создания отзыва от ${review.name}:`, e.message);
      errors.push(review.name);
    }
  }

  return NextResponse.json({
    ok: true,
    created: created.length,
    errors: errors.length > 0 ? errors : undefined,
  });
}
