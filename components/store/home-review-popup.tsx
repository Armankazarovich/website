"use client";

import { useState, useRef } from "react";
import { Star, Loader2, AlertCircle, CheckCircle, Camera, X, MessageSquarePlus } from "lucide-react";

export function HomeReviewPopup() {
  const [open, setOpen] = useState(false);
  const [authorName, setAuthorName] = useState("");
  const [email, setEmail] = useState("");
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [formStartTime] = useState(Date.now());
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!authorName.trim()) { setError("Пожалуйста, введите ваше имя"); return; }
    if (text.trim().length < 10) { setError("Текст отзыва должен быть минимум 10 символов"); return; }
    setLoading(true);
    try {
      const uploadedUrls: string[] = [];
      for (const img of images) {
        if (img.startsWith("http")) { uploadedUrls.push(img); continue; }
        try {
          const blob = await fetch(img).then((r) => r.blob());
          const formData = new FormData();
          formData.append("file", blob, `photo-${Date.now()}.jpg`);
          const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
          if (uploadRes.ok) { const { url } = await uploadRes.json(); uploadedUrls.push(url); }
        } catch { /* skip */ }
      }
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: null,
          authorName: authorName.trim(),
          email: email.trim() || null,
          rating,
          text: text.trim(),
          images: uploadedUrls,
          website: honeypot,
          _t: formStartTime,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Ошибка при отправке отзыва");
        setLoading(false);
        return;
      }
      setSubmitted(true);
      setLoading(false);
    } catch {
      setError("Ошибка при отправке. Попробуйте позже.");
      setLoading(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    if (submitted) {
      setTimeout(() => {
        setSubmitted(false);
        setAuthorName("");
        setEmail("");
        setRating(5);
        setText("");
        setImages([]);
        setError("");
      }, 300);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 active:scale-[0.97] transition-all shadow-sm shadow-primary/20"
      >
        <MessageSquarePlus className="w-4 h-4" />
        Написать отзыв
      </button>

      {open && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Modal */}
          <div className="relative bg-card rounded-3xl border border-border shadow-2xl w-full max-w-lg max-h-[90dvh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-card/95 backdrop-blur-sm rounded-t-3xl border-b border-border/50 px-6 py-4 flex items-center justify-between z-10">
              <h2 className="font-display font-bold text-lg">Оставить отзыв</h2>
              <button
                onClick={handleClose}
                className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-muted transition-colors"
                aria-label="Закрыть"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {submitted ? (
              <div className="p-8 flex flex-col items-center text-center gap-4">
                <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="font-semibold text-lg text-green-700 dark:text-green-400">
                  Спасибо за ваш отзыв!
                </h3>
                <p className="text-sm text-muted-foreground">
                  Ваш отзыв отправлен на модерацию и скоро появится на сайте.
                </p>
                <button
                  onClick={handleClose}
                  className="mt-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  Отлично!
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                {error && (
                  <div className="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/10 p-3 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                  </div>
                )}

                {/* Rating */}
                <div>
                  <label className="block text-sm font-medium mb-2">Ваша оценка</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        className="transition-transform hover:scale-110 active:scale-95"
                      >
                        <Star
                          className={`w-8 h-8 transition-colors ${
                            star <= rating
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-muted-foreground hover:text-yellow-300"
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Name */}
                <div>
                  <label className="block text-sm font-medium mb-1.5">Ваше имя *</label>
                  <input
                    type="text"
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    placeholder="Как вас зовут?"
                    className="w-full px-4 py-2.5 rounded-xl border-2 border-border bg-background text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all"
                    maxLength={100}
                    required
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium mb-1.5">Email <span className="text-muted-foreground">(необязательно)</span></label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Для уведомления об ответе"
                    className="w-full px-4 py-2.5 rounded-xl border-2 border-border bg-background text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all"
                  />
                </div>

                {/* Review text */}
                <div>
                  <label className="block text-sm font-medium mb-1.5">Ваш отзыв *</label>
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Расскажите о вашем опыте покупки..."
                    rows={4}
                    className="w-full px-4 py-2.5 rounded-xl border-2 border-border bg-background text-sm resize-none focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all"
                    maxLength={2000}
                    required
                  />
                  <p className="text-[11px] text-muted-foreground/60 mt-1">{text.length}/2000</p>
                </div>

                {/* Photo upload */}
                <div>
                  <label className="block text-sm font-medium mb-1.5">Фото <span className="text-muted-foreground">(до 5 шт)</span></label>
                  <div className="flex flex-wrap gap-2">
                    {images.map((img, idx) => (
                      <div key={idx} className="relative w-16 h-16 rounded-xl overflow-hidden border border-border">
                        <img src={img} alt="" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setImages(images.filter((_, i) => i !== idx))}
                          className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center"
                        >
                          <X className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    ))}
                    {images.length < 5 && (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingPhoto}
                        className="w-16 h-16 rounded-xl border-2 border-dashed border-border hover:border-primary/50 flex items-center justify-center transition-colors"
                      >
                        {uploadingPhoto ? (
                          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                        ) : (
                          <Camera className="w-5 h-5 text-muted-foreground" />
                        )}
                      </button>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handlePhotoUpload}
                  />
                </div>

                {/* Honeypot */}
                <input
                  type="text"
                  name="website"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                  className="hidden"
                  tabIndex={-1}
                  autoComplete="off"
                />

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
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
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
