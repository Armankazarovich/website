"use client";

import { useState, useMemo } from "react";
import { Star, CheckCircle, Trash2, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

type Review = {
  id: string;
  name: string;
  rating: number;
  text: string;
  approved: boolean;
  createdAt: Date;
};

export function ReviewsClient({ reviews: initial }: { reviews: Review[] }) {
  const [reviews, setReviews] = useState(initial);
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING" | "APPROVED">("ALL");
  const [ratingFilter, setRatingFilter] = useState<number | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [starterLoading, setStarterLoading] = useState(false);
  const [starterResult, setStarterResult] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return reviews.filter((r) => {
      const matchStatus =
        statusFilter === "ALL" ||
        (statusFilter === "PENDING" && !r.approved) ||
        (statusFilter === "APPROVED" && r.approved);
      const matchRating = ratingFilter === null || r.rating === ratingFilter;
      return matchStatus && matchRating;
    });
  }, [reviews, statusFilter, ratingFilter]);

  const toggleApprove = async (id: string, approved: boolean) => {
    setLoadingId(id);
    try {
      const res = await fetch(`/api/admin/reviews/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approved: !approved }),
      });
      if (res.ok) {
        setReviews((prev) =>
          prev.map((r) => (r.id === id ? { ...r, approved: !approved } : r))
        );
      }
    } finally {
      setLoadingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Удалить отзыв?")) return;
    setLoadingId(id);
    try {
      const res = await fetch(`/api/admin/reviews/${id}`, { method: "DELETE" });
      if (res.ok) {
        setReviews((prev) => prev.filter((r) => r.id !== id));
      }
    } finally {
      setLoadingId(null);
    }
  };

  const addStarterReviews = async () => {
    if (!confirm("Добавить 6 стартовых отзывов? Они будут сразу опубликованы.")) return;
    setStarterLoading(true);
    setStarterResult(null);
    try {
      const res = await fetch("/api/admin/reviews/starter", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.ok) {
        setStarterResult(`Добавлено ${data.created} отзывов. Обновите страницу, чтобы увидеть их.`);
      } else {
        setStarterResult("Ошибка при добавлении отзывов.");
      }
    } catch {
      setStarterResult("Сетевая ошибка.");
    } finally {
      setStarterLoading(false);
    }
  };

  const pendingCount = reviews.filter((r) => !r.approved).length;

  return (
    <div className="space-y-5">
      {/* Панель действий */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={addStarterReviews}
          disabled={starterLoading}
        >
          {starterLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Sparkles className="w-3.5 h-3.5" />
          )}
          Добавить стартовые отзывы
        </Button>
        {starterResult && (
          <span className="text-sm text-muted-foreground">{starterResult}</span>
        )}
      </div>

      {/* Фильтры */}
      <div className="flex flex-wrap gap-3">
        {/* Статус */}
        <div className="flex gap-1.5">
          {([
            { key: "ALL", label: "Все" },
            { key: "PENDING", label: `На проверке${pendingCount ? ` (${pendingCount})` : ""}` },
            { key: "APPROVED", label: "Опубликованы" },
          ] as const).map((f) => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === f.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Рейтинг */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setRatingFilter(null)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              ratingFilter === null
                ? "bg-amber-500 text-white"
                : "bg-muted/40 text-muted-foreground hover:bg-muted"
            }`}
          >
            ★ Все
          </button>
          {[5, 4, 3, 2, 1].map((r) => (
            <button
              key={r}
              onClick={() => setRatingFilter(ratingFilter === r ? null : r)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                ratingFilter === r
                  ? "bg-amber-500 text-white"
                  : "bg-muted/40 text-muted-foreground hover:bg-muted"
              }`}
            >
              {"★".repeat(r)}
            </button>
          ))}
        </div>
      </div>

      {/* Список */}
      <div className="space-y-3">
        {filtered.map((review) => {
          const isLoading = loadingId === review.id;
          return (
            <div
              key={review.id}
              className={`bg-card rounded-2xl border p-5 transition-opacity ${
                review.approved ? "border-border" : "border-amber-200 dark:border-amber-800/50 bg-amber-50/30 dark:bg-amber-900/10"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <p className="font-medium text-sm">{review.name}</p>
                    <div className="flex">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3.5 h-3.5 ${
                            i < review.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"
                          }`}
                        />
                      ))}
                    </div>
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                        review.approved
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                      }`}
                    >
                      {review.approved ? "Опубликован" : "На проверке"}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(review.createdAt).toLocaleDateString("ru-RU")}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{review.text}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  ) : (
                    <>
                      <Button
                        size="sm"
                        variant={review.approved ? "outline" : "default"}
                        className="h-8 text-xs"
                        onClick={() => toggleApprove(review.id, review.approved)}
                      >
                        <CheckCircle className="w-3 h-3 mr-1" />
                        {review.approved ? "Скрыть" : "Опубликовать"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(review.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground border-2 border-dashed border-border rounded-2xl">
            {reviews.length === 0 ? "Отзывов ещё нет" : "Ничего не найдено"}
          </div>
        )}
      </div>
    </div>
  );
}
