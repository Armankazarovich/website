import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { sendPushToUser } from "@/lib/push";
import { getCurrentTenantId } from "@/lib/tenant-context";
import {
  cleanText,
  hasSearchConfirmation,
  hasWriteConfirmation,
  parseJsonRecord,
} from "@/lib/admin-content-guard";

function isReviewAdmin(role: unknown) {
  return role === "SUPER_ADMIN" || role === "ADMIN" || role === "MANAGER";
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await parseJsonRecord(req);
    const action = cleanText(body.action, 40);
    const tenantId = getCurrentTenantId();
    const review = await prisma.review.findFirst({
      where: { id: params.id, tenantId },
      include: { product: { select: { name: true, slug: true } } },
    });
    if (!review) return NextResponse.json({ error: "Review not found" }, { status: 404 });

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

    if (action === "reply") {
      if (!hasWriteConfirmation(body)) {
        return NextResponse.json({ error: "Confirmation required" }, { status: 400 });
      }
      const session = await auth();
      const role = (session?.user as any)?.role;
      if (!session || !isReviewAdmin(role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const replyText = cleanText(body.adminReply, 1200);
      if (!replyText) return NextResponse.json({ error: "Reply text is required" }, { status: 400 });

      const updated = await prisma.review.update({
        where: { id: params.id },
        data: { adminReply: replyText, adminReplyAt: new Date() },
      });

      if (review.userId) {
        try {
          await sendPushToUser(review.userId, {
            title: "Ответ на ваш отзыв",
            body: replyText.substring(0, 80),
            url: review.product ? `/product/${review.product.slug}` : "/",
          });
        } catch {}
      }

      return NextResponse.json({ ok: true, adminReply: updated.adminReply });
    }

    if (action === "approve" || action === "reject") {
      if (!hasWriteConfirmation(body)) {
        return NextResponse.json({ error: "Confirmation required" }, { status: 400 });
      }
      const session = await auth();
      const role = (session?.user as any)?.role;
      if (!session || !isReviewAdmin(role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const wasApproved = review.approved;
      const updated = await prisma.review.update({
        where: { id: params.id },
        data: { approved: action === "approve" },
      });

      if (action === "approve" && !wasApproved && review.userId) {
        try {
          await sendPushToUser(review.userId, {
            title: "Ваш отзыв опубликован",
            body: review.product ? `Спасибо за отзыв о "${review.product.name}"` : "Спасибо за ваш отзыв!",
            url: review.product ? `/product/${review.product.slug}` : "/",
          });
        } catch {}
      }

      return NextResponse.json({ ok: true, approved: updated.approved });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("Review action error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    const role = (session?.user as any)?.role;
    if (!session || (role !== "SUPER_ADMIN" && role !== "ADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!hasSearchConfirmation(req)) {
      return NextResponse.json({ error: "Confirmation required" }, { status: 400 });
    }

    const tenantId = getCurrentTenantId();
    const result = await prisma.review.deleteMany({ where: { id: params.id, tenantId } });
    if (!result.count) return NextResponse.json({ error: "Review not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Review delete error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
