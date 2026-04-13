"use client";

import { useState } from "react";
import { Star, Loader2, AlertCircle, CheckCircle } from "lucide-react";

interface ReviewFormProps {
  productId: string;
  productName: string;
}

export function ReviewForm({ productId, productName }: ReviewFormProps) {
  const [authorName, setAuthorName] = useState("");
  const [email, setEmail] = useState("");
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!authorName.trim()) {
      setError("Пожалуйста, введите ваше имя");
      return;
    }

    if (text.trim().length < 10) {
      setError("Текст отзыва должен быть минимум 10 символов");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          authorName: authorName.trim(),
          email: email.trim() || null,
          rating,
          text: text.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 429) {
          setError("Вы уже оставили отзыв на этот товар сегодня. Попробуйте завтра.");
        } else {
          setError(data.error || "Ошибка при отправке отзыва");
        }
        setLoading(false);
        return;
      }

      setSubmitted(true);
      setAuthorName("");
      setEmail("");
      setRating(5);
      setText("");

      // Reset form after 5 seconds
      setTimeout(() => {
        setSubmitted(false);
      }, 5000);
    } catch (err) {
      setError("Ошибка при отправке отзыва. Попробуйте позже.");
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="rounded-2xl border border-border bg-muted/40 p-6 flex items-start gap-4">
        <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
          <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
        </div>
        <div>
          <h3 className="font-semibold text-green-700 dark:text-green-400 mb-1">
            Спасибо за ваш отзыв!
          </h3>
          <p className="text-sm text-muted-foreground">
            Ваш отзыв отправлен на модерацию. Он появится на странице товара после проверки администратором.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Error message */}
      {error && (
        <div className="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/10 p-3 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Star rating selector */}
      <div>
        <label className="block text-sm font-medium mb-2">Ваша оценка</label>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              className="transition-transform hover:scale-110 active:scale-95"
              title={`${star} звёзд`}
            >
              <Star
                className={`w-8 h-8 transition-colors ${
                  star <= rating
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-muted-foreground/30 fill-muted-foreground/30"
                }`}
              />
            </button>
          ))}
        </div>
      </div>

      {/* Name input */}
      <div>
        <label htmlFor="author-name" className="block text-sm font-medium mb-2">
          Ваше имя <span className="text-red-500">*</span>
        </label>
        <input
          id="author-name"
          type="text"
          value={authorName}
          onChange={(e) => setAuthorName(e.target.value)}
          placeholder="Иван"
          className="w-full px-4 py-3 sm:py-2.5 text-base sm:text-sm rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
          required
        />
      </div>

      {/* Email input (optional) */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium mb-2">
          Email (необязательно)
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="ivan@example.com"
          className="w-full px-4 py-3 sm:py-2.5 text-base sm:text-sm rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
        />
      </div>

      {/* Review text */}
      <div>
        <label htmlFor="review-text" className="block text-sm font-medium mb-2">
          Ваш отзыв <span className="text-red-500">*</span>
        </label>
        <textarea
          id="review-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Поделитесь вашим опытом использования этого товара..."
          rows={4}
          className="w-full px-4 py-3 sm:py-2.5 text-base sm:text-sm rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none"
          required
        />
        <p className="text-xs text-muted-foreground mt-1">
          Минимум 10 символов · Максимум 1000 символов
        </p>
      </div>

      {/* Submit button */}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 sm:py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Отправка...
          </>
        ) : (
          "Отправить отзыв"
        )}
      </button>

      {/* Info message */}
      <p className="text-xs text-muted-foreground text-center">
        Ваш отзыв будет опубликован после проверки администратором
      </p>
    </form>
  );
}
