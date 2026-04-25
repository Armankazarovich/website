export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Star, MessageSquare, ThumbsUp, Camera } from "lucide-react";

export default async function MyReviewsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const reviews = await prisma.review.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: { product: { select: { name: true, id: true } } },
  }).catch(() => []);

  const totalReviews = reviews.length;
  const totalLikes = reviews.reduce((s, r) => s + (r.likes || 0), 0);
  const totalPhotos = reviews.reduce((s, r) => s + (r.images?.length || 0), 0);
  const avgRating = totalReviews > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / totalReviews).toFixed(1) : "—";

  return (
    <div className="space-y-4 pb-4">
      <div>
        <h1 className="font-display font-bold text-xl">Мои отзывы</h1>
        <p className="text-xs text-muted-foreground mt-1">Ваши отзывы и рейтинг</p>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "Отзывов", value: totalReviews, icon: MessageSquare, color: "text-primary" },
          { label: "Рейтинг", value: avgRating, icon: Star, color: "text-yellow-500" },
          { label: "Лайков", value: totalLikes, icon: ThumbsUp, color: "text-emerald-500" },
          { label: "Фото", value: totalPhotos, icon: Camera, color: "text-blue-500" },
        ].map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-2xl p-3 text-center">
            <s.icon className={`w-4 h-4 mx-auto mb-1 ${s.color}`} />
            <p className="text-lg font-display font-bold">{s.value}</p>
            <p className="text-[9px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Список */}
      {reviews.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-8 text-center">
          <Star className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
          <p className="font-medium mb-1">Вы ещё не оставляли отзывов</p>
          <p className="text-xs text-muted-foreground">Купите товар и поделитесь мнением</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <div key={r.id} className="bg-card border border-border rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold truncate flex-1">{r.product?.name || "Товар"}</p>
                <div className="flex items-center gap-0.5 ml-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`w-3 h-3 ${i < r.rating ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground/20"}`} />
                  ))}
                </div>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">{r.text}</p>
              <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                {r.approved ? (
                  <span className="text-emerald-600">Опубликован</span>
                ) : (
                  <span className="text-amber-600">На модерации</span>
                )}
                <span>{new Date(r.createdAt).toLocaleDateString("ru-RU")}</span>
                {(r.likes || 0) > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <ThumbsUp className="w-3 h-3" /> {r.likes}
                  </span>
                )}
              </div>
              {r.adminReply && (
                <div className="mt-2 pl-3 border-l-2 border-primary/30">
                  <p className="text-[10px] font-semibold text-primary">Ответ магазина:</p>
                  <p className="text-xs text-muted-foreground">{r.adminReply}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
