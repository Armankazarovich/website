export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Star, ThumbsUp, ArrowRight } from "lucide-react";

export default async function MyReviewsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const reviews = await prisma.review
    .findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      include: { product: { select: { name: true, id: true } } },
    })
    .catch(() => []);

  const totalReviews = reviews.length;
  const totalLikes = reviews.reduce((s, r) => s + (r.likes || 0), 0);
  const totalPhotos = reviews.reduce((s, r) => s + (r.images?.length || 0), 0);
  const avgRating =
    totalReviews > 0
      ? (reviews.reduce((s, r) => s + r.rating, 0) / totalReviews).toFixed(1)
      : "—";

  return (
    <div className="space-y-4 pb-4 max-w-2xl mx-auto">
      <div>
        <h1 className="font-display font-bold text-xl">Мои отзывы</h1>
        <p className="text-xs text-muted-foreground mt-1">Ваши оценки и рейтинг</p>
      </div>

      {/* Статистика — показываем только если есть отзывы */}
      {totalReviews > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "Отзывов", value: totalReviews },
            { label: "Рейтинг", value: avgRating },
            { label: "Лайков", value: totalLikes },
            { label: "Фото", value: totalPhotos },
          ].map((s) => (
            <div key={s.label} className="bg-card border border-border rounded-2xl p-3 text-center">
              <p className="text-lg font-display font-bold">{s.value}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Список */}
      {reviews.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <Star className="w-7 h-7 text-primary" />
          </div>
          <p className="text-sm font-medium mb-1">Вы ещё не оставляли отзывов</p>
          <p className="text-xs text-muted-foreground mb-5 max-w-md mx-auto">
            Купите товар и поделитесь мнением — другим клиентам будет проще выбрать
          </p>
          <Link
            href="/catalog"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 h-11 rounded-xl text-sm font-semibold hover:brightness-110 transition-all"
          >
            В каталог <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {reviews.map((r) => (
            <div key={r.id} className="bg-card border border-border rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2 gap-2">
                <p className="text-sm font-semibold truncate flex-1 min-w-0">
                  {r.product?.name || "Общий отзыв"}
                </p>
                <div className="flex items-center gap-0.5 shrink-0">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`w-3.5 h-3.5 ${
                        i < r.rating ? "text-amber-500 fill-amber-500" : "text-muted-foreground/30"
                      }`}
                    />
                  ))}
                </div>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{r.text}</p>
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                {r.approved ? (
                  <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-500">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Опубликован
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-500">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> На модерации
                  </span>
                )}
                <span>{new Date(r.createdAt).toLocaleDateString("ru-RU")}</span>
                {(r.likes || 0) > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <ThumbsUp className="w-3 h-3" /> {r.likes}
                  </span>
                )}
              </div>
              {r.adminReply && (
                <div className="mt-3 pl-3 border-l-2 border-primary/30">
                  <p className="text-[10px] font-semibold text-primary mb-0.5">Ответ магазина</p>
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
