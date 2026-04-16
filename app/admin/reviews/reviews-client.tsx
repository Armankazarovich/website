"use client";

import { useState, useMemo, useEffect } from "react";

const PER_PAGE = 12;
import { Star, CheckCircle, Trash2, Loader2, Sparkles, ExternalLink, Download, Globe, MapPin, MessageSquare, Plus, X, ChevronDown, ChevronUp, Map, Monitor, Lightbulb, Send, ThumbsUp } from "lucide-react";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { Button } from "@/components/ui/button";

// ─── Quick reply templates ───────────────────────────────────────────────────
const QUICK_REPLIES = [
  "Спасибо за ваш отзыв! Рады, что вам понравилось качество наших материалов.",
  "Благодарим за обратную связь! Ждём вас снова.",
  "Спасибо! Мы ценим ваше мнение и стараемся становиться лучше.",
  "Спасибо за отзыв! Приятно работать с такими клиентами.",
  "Благодарим за тёплые слова! Качество — наш приоритет.",
];

function AdminReplyBlock({ reviewId, onReply }: { reviewId: string; onReply: (reply: string) => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const send = async (replyText: string) => {
    if (!replyText.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/reviews/${reviewId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reply", adminReply: replyText.trim() }),
      });
      if (res.ok) {
        onReply(replyText.trim());
        setOpen(false);
      }
    } catch (e) {
      console.error("Reply failed:", e);
    }
    setSending(false);
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="mt-2 flex items-center gap-1.5 text-xs text-primary hover:underline">
        <MessageSquare className="w-3 h-3" /> Ответить
      </button>
    );
  }

  return (
    <div className="mt-3 space-y-2">
      <p className="text-xs font-medium text-muted-foreground">Быстрый ответ:</p>
      <div className="flex flex-wrap gap-1.5">
        {QUICK_REPLIES.map((q, i) => (
          <button key={i} onClick={() => send(q)} disabled={sending}
            className="text-[11px] px-2.5 py-1.5 rounded-lg bg-muted hover:bg-primary/10 hover:text-primary border border-border transition-colors text-left max-w-[200px] truncate">
            {q}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Свой ответ..."
          className="flex-1 px-3 py-2 text-sm rounded-xl border border-border bg-card"
          onKeyDown={(e) => e.key === "Enter" && send(text)}
        />
        <button onClick={() => send(text)} disabled={!text.trim() || sending}
          className="px-3 py-2 rounded-xl bg-primary text-primary-foreground text-sm disabled:opacity-50">
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

type Review = {
  id: string;
  name: string;
  rating: number;
  text: string;
  images?: string[];
  approved: boolean;
  likes?: number;
  dislikes?: number;
  adminReply?: string | null;
  adminReplyAt?: string | null;
  createdAt: Date;
  source?: string;
  product?: { name: string; slug: string } | null;
};

const PLATFORMS: {
  key: string;
  name: string;
  color: string;
  borderColor: string;
  badge: string;
  icon: React.ElementType;
  href: string;
  instruction: string;
  status: string;
}[] = [
  {
    key: "google",
    name: "Google Карты",
    color: "bg-card text-foreground border border-border",
    borderColor: "border-border",
    badge: "bg-secondary text-muted-foreground",
    icon: Globe,
    href: "https://maps.google.com/?cid=YOUR_CID",
    instruction: "Откройте Google Мой Бизнес → Отзывы → скопируйте нужные и добавьте вручную",
    status: "manual",
  },
  {
    key: "yandex",
    name: "Яндекс Карты",
    color: "bg-card text-foreground border border-border",
    borderColor: "border-border",
    badge: "bg-secondary text-muted-foreground",
    icon: Map,
    href: "https://business.yandex.ru/",
    instruction: "Откройте Яндекс Бизнес → Репутация → скопируйте отзывы для публикации",
    status: "manual",
  },
  {
    key: "2gis",
    name: "2GIS",
    color: "bg-card text-foreground border border-border",
    borderColor: "border-border",
    badge: "bg-secondary text-muted-foreground",
    icon: MapPin,
    href: "https://account.2gis.com/",
    instruction: "Авторизуйтесь в 2GIS для бизнеса → Отзывы → скопируйте лучшие",
    status: "manual",
  },
  {
    key: "vk",
    name: "ВКонтакте",
    color: "bg-card text-foreground border border-border",
    borderColor: "border-border",
    badge: "bg-secondary text-muted-foreground",
    icon: MessageSquare,
    href: "https://vk.com/",
    instruction: "Перейдите в группу ВК → раздел «Отзывы» → скопируйте нужные комментарии",
    status: "manual",
  },
];

/* ─── Форма добавления отзыва вручную ─── */
function AddReviewForm({ onAdd }: { onAdd: (r: Omit<Review, "id" | "createdAt">) => void; onClose: () => void }) {
  const [name, setName] = useState("");
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [source, setSource] = useState("google");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!name.trim() || !text.trim()) { setError("Заполните имя и текст"); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/admin/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), rating, text: text.trim(), source, approved: true }),
      });
      if (res.ok) {
        const r = await res.json();
        onAdd(r);
      } else {
        setError("Ошибка при сохранении");
      }
    } catch { setError("Нет соединения"); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-3 p-4 bg-card border border-border rounded-2xl">
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Имя автора</label>
          <input value={name} onChange={e => setName(e.target.value)}
            placeholder="Иван Петров"
            className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Оценка</label>
          <div className="flex gap-1 py-2">
            {[1,2,3,4,5].map(s => (
              <button key={s} onClick={() => setRating(s)}>
                <Star className={`w-5 h-5 ${s <= rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`} />
              </button>
            ))}
          </div>
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Источник</label>
        <div className="flex gap-2 flex-wrap">
          {PLATFORMS.map(p => (
            <button key={p.key} onClick={() => setSource(p.key)}
              className={`admin-pill-btn ${source === p.key ? "admin-pill-btn-active" : ""}`}>
              <p.icon className="w-3.5 h-3.5 inline mr-1" />{p.name}
            </button>
          ))}
          <button onClick={() => setSource("site")}
            className={`admin-pill-btn ${source === "site" ? "admin-pill-btn-active" : ""}`}>
            <Monitor className="w-3.5 h-3.5 inline mr-1" />Сайт
          </button>
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Текст отзыва</label>
        <textarea value={text} onChange={e => setText(e.target.value)} rows={3}
          placeholder="Отличный материал, всё понравилось..."
          className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <button onClick={submit} disabled={loading}
        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
        Добавить отзыв
      </button>
    </div>
  );
}

export function ReviewsClient({
  reviews: initial,
  initialFilter = "ALL",
}: {
  reviews: Review[];
  initialFilter?: "ALL" | "PENDING" | "APPROVED";
}) {
  const [reviews, setReviews] = useState(initial);
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING" | "APPROVED">(initialFilter);
  const [ratingFilter, setRatingFilter] = useState<number | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [starterLoading, setStarterLoading] = useState(false);
  const [starterResult, setStarterResult] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmSeed, setConfirmSeed] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showPlatforms, setShowPlatforms] = useState(false);
  const [page, setPage] = useState(1);

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

  // Сброс страницы при смене фильтра
  useEffect(() => { setPage(1); }, [statusFilter, ratingFilter]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

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

  const handleAdd = (r: any) => {
    setReviews(prev => [{ ...r, id: r.id || Math.random().toString(), createdAt: new Date(), approved: true }, ...prev]);
    setShowAddForm(false);
  };

  return (
    <div className="space-y-5">
      {/* Панель действий */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => setConfirmSeed(true)}
          disabled={starterLoading}
        >
          {starterLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          Стартовые отзывы
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => { setShowAddForm(v => !v); setShowPlatforms(false); }}
        >
          <Plus className="w-3.5 h-3.5" />
          Добавить вручную
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => { setShowPlatforms(v => !v); setShowAddForm(false); }}
        >
          <Globe className="w-3.5 h-3.5" />
          Внешние платформы
          {showPlatforms ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </Button>
        {starterResult && (
          <span className="text-sm text-muted-foreground">{starterResult}</span>
        )}
      </div>

      {/* Форма добавления */}
      {showAddForm && (
        <AddReviewForm
          onAdd={handleAdd}
          onClose={() => setShowAddForm(false)}
        />
      )}

      {/* Внешние платформы */}
      {showPlatforms && (
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-sm">Внешние платформы</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Соберите лучшие отзывы с внешних площадок и добавьте на сайт</p>
            </div>
            <button onClick={() => setShowPlatforms(false)}>
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {PLATFORMS.map(p => (
              <div key={p.key} className={`border ${p.borderColor} rounded-xl p-3 space-y-2`}>
                <div className="flex items-center gap-2">
                  <p.icon className="w-5 h-5 shrink-0" />
                  <span className="font-semibold text-sm">{p.name}</span>
                  <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ${p.badge}`}>Ручной импорт</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{p.instruction}</p>
                <div className="flex gap-2">
                  <a href={p.href} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                    <ExternalLink className="w-3 h-3" />
                    Открыть площадку
                  </a>
                  <button
                    onClick={() => { setShowAddForm(true); setShowPlatforms(false); }}
                    className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
                    <Download className="w-3 h-3" />
                    Добавить отзыв
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-start gap-2.5 p-3 bg-primary/8 border border-primary/15 rounded-xl">
            <Lightbulb className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong className="text-foreground">Совет:</strong> Попросите клиентов оставить отзыв в Google и Яндекс — это улучшает SEO. Лучшие отзывы оттуда добавляйте на сайт кнопкой «Добавить вручную».
            </p>
          </div>
        </div>
      )}

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
              className={`admin-pill-btn ${statusFilter === f.key ? "admin-pill-btn-active" : ""}`}
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
                ? "bg-amber-500/90 text-white dark:bg-amber-600 dark:text-amber-50"
                : "bg-muted/40 text-muted-foreground hover:bg-primary/[0.08]"
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
                  ? "bg-amber-500/90 text-white dark:bg-amber-600 dark:text-amber-50"
                  : "bg-muted/40 text-muted-foreground hover:bg-primary/[0.08]"
              }`}
            >
              {"★".repeat(r)}
            </button>
          ))}
        </div>
      </div>

      {/* Список */}
      <div className="space-y-3">
        {paginated.map((review) => {
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
                    {review.source && review.source !== "site" && (() => {
                      const pl = PLATFORMS.find(p => p.key === review.source);
                      if (!pl) return null;
                      const PlIcon = pl.icon;
                      return (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium inline-flex items-center gap-0.5 ${pl.badge}`}>
                          <PlIcon className="w-2.5 h-2.5" /> {pl.name}
                        </span>
                      );
                    })()}
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(review.createdAt).toLocaleDateString("ru-RU")}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{review.text}</p>

                  {/* Photos — large preview for admin to check before publishing */}
                  {review.images && review.images.filter((u: string) => u && !u.startsWith("data:")).length > 0 && (
                    <div className="mt-3">
                      <p className="text-[11px] text-muted-foreground mb-2 font-medium">📷 {review.images.filter((u: string) => u && !u.startsWith("data:")).length} фото от клиента:</p>
                      <div className="flex gap-2 overflow-x-auto">
                        {review.images.filter((u: string) => u && !u.startsWith("data:")).map((img: string, i: number) => (
                          <a key={i} href={img} target="_blank" rel="noopener noreferrer" className="shrink-0 group relative">
                            <img src={img} alt="" className="w-24 h-24 sm:w-32 sm:h-32 rounded-xl object-cover border-2 border-border group-hover:border-primary transition-colors"
                              onError={(e) => { (e.target as HTMLImageElement).closest("a")!.style.display = "none"; }} />
                            <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded-md">открыть</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Product link */}
                  {review.product && (
                    <p className="text-xs text-primary mt-2">
                      Товар: <a href={`/product/${review.product.slug}`} target="_blank" className="underline">{review.product.name}</a>
                    </p>
                  )}

                  {/* Stats: likes, dislikes */}
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span>👍 {review.likes || 0}</span>
                    <span>👎 {review.dislikes || 0}</span>
                  </div>

                  {/* Admin reply */}
                  {review.adminReply && (
                    <div className="mt-3 pl-3 border-l-2 border-primary/30 bg-primary/5 rounded-r-lg py-2 pr-3">
                      <p className="text-[11px] font-semibold text-primary mb-1">Ответ магазина</p>
                      <p className="text-xs text-muted-foreground">{review.adminReply}</p>
                    </div>
                  )}

                  {/* Reply button + quick templates */}
                  {!review.adminReply && (
                    <AdminReplyBlock reviewId={review.id} onReply={(reply) => {
                      setReviews(prev => prev.map(r => r.id === review.id ? { ...r, adminReply: reply } : r));
                    }} />
                  )}
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
                        onClick={() => setConfirmDeleteId(review.id)}
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

      {/* Пагинация */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground">
            {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} из {filtered.length} отзывов
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-muted/40 text-muted-foreground hover:bg-primary/[0.08] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              ← Назад
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                  p === page
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/40 text-muted-foreground hover:bg-primary/[0.08]"
                }`}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-muted/40 text-muted-foreground hover:bg-primary/[0.08] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Вперёд →
            </button>
          </div>
        </div>
      )}


      <ConfirmDialog
        open={!!confirmDeleteId}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={() => { if (confirmDeleteId) handleDelete(confirmDeleteId); setConfirmDeleteId(null); }}
        title="Удалить отзыв?"
        description="Отзыв будет удалён без возможности восстановления."
        confirmLabel="Удалить"
        variant="danger"
        loading={!!loadingId}
      />
      <ConfirmDialog
        open={confirmSeed}
        onClose={() => setConfirmSeed(false)}
        onConfirm={() => { setConfirmSeed(false); addStarterReviews(); }}
        title="Добавить стартовые отзывы?"
        description="6 готовых отзывов будут добавлены и сразу опубликованы на сайте."
        confirmLabel="Добавить"
        variant="warning"
        loading={starterLoading}
      />
    </div>
  );
}
