"use client";

import { useState, useEffect, useRef } from "react";
import { Star, Loader2, AlertCircle, CheckCircle, Camera, X } from "lucide-react";
import Image from "next/image";

interface ReviewFormProps {
  productId: string;
  productName: string;
  /** Pre-fill from server: logged-in user's name */
  userName?: string | null;
  /** Pre-fill from server: logged-in user's email */
  userEmail?: string | null;
  /** Pre-fill from server: logged-in user's avatar URL */
  userAvatar?: string | null;
  /** Is the user logged in? */
  isLoggedIn?: boolean;
}

export function ReviewForm({
  productId,
  productName,
  userName,
  userEmail,
  userAvatar,
  isLoggedIn = false,
}: ReviewFormProps) {
  const [authorName, setAuthorName] = useState(userName || "");
  const [email, setEmail] = useState(userEmail || "");
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [honeypot, setHoneypot] = useState(""); // hidden field — bots fill it
  const [formStartTime] = useState(Date.now()); // track how fast form is submitted
  const [images, setImages] = useState<string[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || images.length >= 5) return;

    setUploadingPhoto(true);
    const newImages: string[] = [];

    for (let i = 0; i < Math.min(files.length, 5 - images.length); i++) {
      const file = files[i];
      if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) continue;

      // Convert to base64 data URL for preview, upload to server on submit
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      newImages.push(dataUrl);
    }

    setImages((prev) => [...prev, ...newImages].slice(0, 5));
    setUploadingPhoto(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Sync if props change (e.g. session loads after hydration)
  useEffect(() => {
    if (userName && !authorName) setAuthorName(userName);
    if (userEmail && !email) setEmail(userEmail);
  }, [userName, userEmail]);

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
      // Upload images first (convert base64 to files, upload, get URLs)
      const uploadedUrls: string[] = [];
      for (const img of images) {
        if (img.startsWith("http")) {
          uploadedUrls.push(img);
          continue;
        }
        // Convert data URL to File and upload
        try {
          const blob = await fetch(img).then((r) => r.blob());
          const formData = new FormData();
          formData.append("file", blob, `photo-${Date.now()}.jpg`);
          const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
          if (uploadRes.ok) {
            const { url } = await uploadRes.json();
            uploadedUrls.push(url);
          }
        } catch {
          // Skip failed uploads silently
        }
      }

      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          authorName: authorName.trim(),
          email: email.trim() || null,
          rating,
          text: text.trim(),
          images: uploadedUrls,
          website: honeypot, // honeypot — bots fill this
          _t: formStartTime, // timing check
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
      setLoading(false);
      setRating(5);
      setText("");
      setImages([]);

      // Reset form after 8 seconds
      setTimeout(() => {
        setSubmitted(false);
      }, 8000);
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
      <h3 className="font-display font-bold text-xl">Оставить отзыв</h3>

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

      {/* Name + Email: hidden for logged-in users, shown for guests */}
      {isLoggedIn ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/40 rounded-xl px-4 py-3 border border-border">
          {userAvatar ? (
            <img
              src={userAvatar}
              alt={authorName || "User"}
              className="w-8 h-8 rounded-full object-cover border border-border shrink-0"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
                const fallback = (e.target as HTMLImageElement).nextElementSibling;
                if (fallback) (fallback as HTMLElement).style.display = "flex";
              }}
            />
          ) : null}
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-primary font-bold text-sm shrink-0 ${
              userAvatar ? "bg-primary/10 hidden" : "bg-primary/10"
            }`}
            style={{
              display: userAvatar ? "none" : "flex",
            }}
          >
            {authorName?.charAt(0)?.toUpperCase() || "?"}
          </div>
          <div>
            <p className="font-medium text-foreground">{authorName}</p>
            {email && <p className="text-xs text-muted-foreground">{email}</p>}
          </div>
        </div>
      ) : (
        <>
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
        </>
      )}

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

      {/* Photo upload */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Фото (до 5 шт.)
        </label>
        <div className="flex flex-wrap gap-2">
          {images.map((img, i) => (
            <div key={i} className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border border-border group">
              <img src={img} alt="" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}
                className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          {images.length < 5 && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPhoto}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-primary transition-colors"
            >
              {uploadingPhoto ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Camera className="w-5 h-5" />
              )}
              <span className="text-[9px]">Фото</span>
            </button>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handlePhotoUpload}
          className="hidden"
        />
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
