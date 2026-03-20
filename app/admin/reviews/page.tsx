export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { Star } from "lucide-react";
import { ReviewActions } from "@/components/admin/review-actions";

export default async function AdminReviewsPage() {
  const reviews = await prisma.review.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <h1 className="font-display font-bold text-2xl">Отзывы</h1>
      <div className="space-y-3">
        {reviews.map((review) => (
          <div key={review.id} className="bg-card rounded-2xl border border-border p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium">{review.name}</p>
                  <div className="flex">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`w-3 h-3 ${i < review.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
                    ))}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${review.approved ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                    {review.approved ? "Опубликован" : "На проверке"}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{review.text}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(review.createdAt).toLocaleDateString("ru-RU")}
                </p>
              </div>
              <ReviewActions reviewId={review.id} approved={review.approved} />
            </div>
          </div>
        ))}
        {reviews.length === 0 && <p className="text-center text-muted-foreground py-12">Отзывов ещё нет</p>}
      </div>
    </div>
  );
}
