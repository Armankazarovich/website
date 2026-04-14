import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { sendPushToStaff } from "@/lib/push";

// Simple in-memory rate limiting (resets per deployment)
// For production, consider using Redis or database-backed rate limiting
const reviewRateLimit = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(key: string, maxAttempts: number = 1, windowMs: number = 86400000): boolean {
  const now = Date.now();
  const existing = reviewRateLimit.get(key);

  if (!existing || now > existing.resetTime) {
    reviewRateLimit.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (existing.count >= maxAttempts) {
    return false;
  }

  existing.count++;
  return true;
}

// POST — create customer review (goes to moderation)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { productId, authorName, email, rating, text, images } = body;

    // Validation
    if (!productId || !authorName?.trim()) {
      return NextResponse.json(
        { error: "productId и authorName обязательны" },
        { status: 400 }
      );
    }

    const numRating = Number(rating);
    if (!numRating || numRating < 1 || numRating > 5 || !Number.isInteger(numRating)) {
      return NextResponse.json(
        { error: "Рейтинг должен быть от 1 до 5" },
        { status: 400 }
      );
    }

    if (!text || text.trim().length < 10 || text.trim().length > 2000) {
      return NextResponse.json(
        { error: "Текст отзыва: от 10 до 2000 символов" },
        { status: 400 }
      );
    }

    // Email validation (basic)
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json(
        { error: "Некорректный email" },
        { status: 400 }
      );
    }

    // ── Anti-spam (invisible to normal users) ──
    // 1. Honeypot: if hidden field "website" is filled, it's a bot
    if (body.website) {
      // Silently accept but don't save — bot thinks it worked
      return NextResponse.json({ ok: true, message: "Спасибо! Ваш отзыв отправлен на модерацию", reviewId: "fake" }, { status: 201 });
    }

    // 2. Time check: form must take >3 seconds to fill (bots are instant)
    if (body._t) {
      const elapsed = Date.now() - Number(body._t);
      if (elapsed < 3000) {
        return NextResponse.json({ ok: true, message: "Спасибо! Ваш отзыв отправлен на модерацию", reviewId: "fake" }, { status: 201 });
      }
    }

    // 3. Text quality: reject gibberish (same char repeated, all caps, URLs)
    const cleanText = text?.trim() || "";
    const hasRepeat = /(.)\1{5,}/.test(cleanText); // aaaaaa
    const hasUrls = /(https?:\/\/|www\.|\.com|\.ru|\.net)/i.test(cleanText);
    const allCaps = cleanText.length > 20 && cleanText === cleanText.toUpperCase();
    if (hasRepeat || hasUrls || allCaps) {
      return NextResponse.json(
        { error: "Текст отзыва содержит недопустимый контент" },
        { status: 400 }
      );
    }

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Товар не найден" },
        { status: 404 }
      );
    }

    // Rate limiting: use email or IP address
    const forwardedFor = req.headers.get("x-forwarded-for");
    const clientIp = forwardedFor ? forwardedFor.split(",")[0].trim() : "unknown";
    const identifier = email?.trim() || clientIp;
    const key = `review:${productId}:${identifier}`;

    if (!checkRateLimit(key, 1, 86400000)) {
      return NextResponse.json(
        { error: "Вы уже оставили отзыв на этот товар сегодня. Попробуйте завтра." },
        { status: 429 }
      );
    }

    // Get session — if logged in, attach userId
    const session = await auth();
    const userId = session?.user?.id || null;

    // Create review (PENDING for moderation)
    const review = await prisma.review.create({
      data: {
        productId,
        name: authorName.trim(),
        rating: numRating,
        text: text.trim(),
        images: Array.isArray(images) ? images.filter((u: string) => typeof u === "string" && (u.startsWith("http") || u.startsWith("/images/") || u.startsWith("/uploads/"))).slice(0, 5) : [],
        source: "internal",
        approved: false, // Requires admin approval
        ...(userId ? { userId } : {}),
      },
    });

    // Send Telegram notification to admin
    try {
      const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
      const telegramChatId = process.env.TELEGRAM_CHAT_ID;

      if (telegramBotToken && telegramChatId) {
        const starsEmoji = "⭐".repeat(Number(rating));
        const message = `🆕 *Новый отзыв на модерации*\n\n*Товар:* ${product.name}\n*Автор:* ${authorName.trim()}\n*Рейтинг:* ${starsEmoji} (${rating}/5)\n\n*Текст:*\n${text.trim()}\n\n📋 [Посмотреть в админке](https://pilo-rus.ru/admin/reviews)`;

        await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: telegramChatId,
            text: message,
            parse_mode: "Markdown",
          }),
        });
      }
    } catch (error) {
      console.error("Failed to send Telegram notification:", error);
    }

    // Push notification to staff
    try {
      await sendPushToStaff({
        title: `Новый отзыв ${numRating}⭐`,
        body: `${authorName.trim()}: ${text.trim().substring(0, 60)}...`,
        url: "/admin/reviews?status=pending",
      });
    } catch {}

    return NextResponse.json(
      {
        ok: true,
        message: "Спасибо! Ваш отзыв отправлен на модерацию",
        reviewId: review.id,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Review submission error:", error);
    return NextResponse.json(
      { error: "Ошибка при сохранении отзыва. Попробуйте позже." },
      { status: 500 }
    );
  }
}
