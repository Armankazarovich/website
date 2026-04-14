import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// PATCH — like/dislike or admin reply
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const { action, adminReply } = body;

    const review = await prisma.review.findUnique({ where: { id: params.id } });
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
      if (!session || !["ADMIN", "MANAGER"].includes(role)) {
        return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
      }

      if (!adminReply?.trim()) {
        return NextResponse.json({ error: "Текст ответа обязателен" }, { status: 400 });
      }

      const updated = await prisma.review.update({
        where: { id: params.id },
        data: {
          adminReply: adminReply.trim(),
          adminReplyAt: new Date(),
        },
      });
      return NextResponse.json({ ok: true, adminReply: updated.adminReply });
    }

    // Approve / reject
    if (action === "approve" || action === "reject") {
      const session = await auth();
      const role = (session?.user as any)?.role;
      if (!session || !["ADMIN", "MANAGER"].includes(role)) {
        return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
      }

      const updated = await prisma.review.update({
        where: { id: params.id },
        data: { approved: action === "approve" },
      });
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
