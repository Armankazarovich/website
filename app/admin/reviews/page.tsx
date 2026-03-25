export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { ReviewsClient } from "./reviews-client";

export default async function AdminReviewsPage() {
  const reviews = await prisma.review.findMany({
    orderBy: { createdAt: "desc" },
  });

  const pendingCount = reviews.filter((r) => !r.approved).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="font-display font-bold text-2xl">Отзывы</h1>
        {pendingCount > 0 && (
          <span className="bg-amber-100 text-amber-700 text-xs font-semibold px-2.5 py-1 rounded-full">
            {pendingCount} на проверке
          </span>
        )}
      </div>
      <ReviewsClient reviews={reviews as any} />
    </div>
  );
}
