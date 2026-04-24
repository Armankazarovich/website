import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { sendPushToUser, sendPushToStaff } from "@/lib/push";

// PATCH — like/dislike, admin reply, approve/reject
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const { action, adminReply } = body;

    const review = await prisma.review.findUnique({
      where: { id: params.id },
      include: { product: { select: { name: true, slug: true } } },
    });
    if (!review) {
      return NextResponse.json({ error: "Отзыв не найден" }, { status: 404 });
    }

    // Like / Dislike — anyone can do
    if (action === "like") {
      const updated = await prisma.review.update({
        where: { id: params.id },
        data: { likes: { increment: 1 } },
      });
      return NextResponse.json({ ok: true, likes: updated.likes, dislikes: updated.dislikes });
    }

    if (action === "dislike") {
      const updated = await prisma.review.update({
        where: { id: params.id },
        data: { dislikes: { increment: 1 } },
      });
      return NextResponse.json({ ok: true, likes: updated.likes, dislikes: updated.dislikes });
    }

    // Admin reply — requires ADMIN/MANAGER role
    if (action === "reply") {
      const session = await auth();
      const role = (session?.user as any)?.role;
      if (!session || !["SUPER_ADMIN", "ADMIN", "MANAGER"].includes(role)) {
        return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
      }

      if (!adminReply?.trim()) {
        return NextResponse.json({ error: "Текст ответа обязателен" }, { status: 400 });
      }

      const updated = await prisma.review.update({
        where: { id: params.id },
        data: { adminReply: adminReply.trim(), adminReplyAt: new Date() },
      });

      // Notify customer about admin reply via Push
      if (review.userId) {
        try {
          await sendPushToUser(review.userId, {
            title: "Ответ на ваш отзыв",
            body: adminReply.trim().substring(0, 80),
            url: review.product ? `/product/${review.product.slug}` : "/",
          });
        } catch {}
      }

      return NextResponse.json({ ok: true, adminReply: updated.adminReply });
    }

    // Approve / reject
    if (action === "approve" || action === "reject") {
      const session = await auth();
      const role = (session?.user as any)?.role;
      if (!session || !["SUPER_ADMIN", "ADMIN", "MANAGER"].includes(role)) {
        return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
      }

      const wasApproved = review.approved;
      const updated = await prisma.review.update({
        where: { id: params.id },
        data: { approved: action === "approve" },
      });

      // Notify customer when review is approved (only if newly approved)
      if (action === "approve" && !wasApproved && review.userId) {
        try {
          await sendPushToUser(review.userId, {
            title: "Ваш отзыв опубликован!",
            body: review.product ? `Спасибо за отзыв о "${review.product.name}"` : "Спасибо за ваш отзыв!",
            url: review.product ? `/product/${review.product.slug}` : "/",
          });
        } catch {}
      }

      return NextResponse.json({ ok: true, approved: updated.approved });
    }

    return NextResponse.json({ error: "Неизвестное действие" }, { status: 400 });
  } catch (error) {
    console.error("Review action error:", error);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}

// DELETE — admin only
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    const role = (session?.user as any)?.role;
    if (!session || !["ADMIN"].includes(role)) {
      return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
    }

    await prisma.review.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Review delete error:", error);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
