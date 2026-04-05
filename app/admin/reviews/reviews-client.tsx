"use client";

import { useState, useMemo } from "react";
import { Star, CheckCircle, Trash2, Loader2, Sparkles, ExternalLink, Download, Globe, MapPin, MessageSquare, Plus, X, ChevronDown, ChevronUp, Map, Monitor, Lightbulb } from "lucide-react";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { Button } from "@/components/ui/button";

type Review = {
  id: string;
  name: string;
  rating: number;
  text: string;
  approved: boolean;
  createdAt: Date;
  source?: string;
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
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    borderColor: "border-blue-200 dark:border-blue-800/40",
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    icon: Globe,
    href: "https://maps.google.com/?cid=YOUR_CID",
    instruction: "Откройте Google Мой Бизнес → Отзывы → скопируйте нужные и добавьте вручную",
    status: "manual",
  },
  {
    key: "yandex",
    name: "Яндекс Карты",
    color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    borderColor: "border-amber-200 dark:border-amber-800/40",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    icon: Map,
    href: "https://business.yandex.ru/",
    instruction: "Откройте Яндекс Бизнес → Репутация → скопируйте отзывы для публикации",
    status: "manual",
  },
  {
    key: "2gis",
    name: "2GIS",
    color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    borderColor: "border-green-200 dark:border-green-800/40",
    badge: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
    icon: MapPin,
    href: "https://account.2gis.com/",
    instruction: "Авторизуйтесь в 2GIS для бизнеса → Отзывы → скопируйте лучшие",
    status: "manual",
  },
  {
    key: "vk",
    name: "ВКонтакте",
    color: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
    borderColor: "border-sky-200 dark:border-sky-800/40",
    badge: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
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
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                source === p.key ? "bg-primary text-primary-foreground" : "bg-muted/60 text-muted-foreground hover:bg-muted"
              }`}>
              <p.icon className="w-3.5 h-3.5 inline mr-1" />{p.name}
            </button>
          ))}
          <button onClick={() => setSource("site")}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
              source === "site" ? "bg-primary text-primary-foreground" : "bg-muted/60 text-muted-foreground hover:bg-muted"
            }`}>
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

export function ReviewsClient({ reviews: initial }: { reviews: Review[] }) {
  const [reviews, setReviews] = useState(initial);
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING" | "APPROVED">("ALL");
  const [ratingFilter, setRatingFilter] = useState<number | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [starterLoading, setStarterLoading] = useState(false);
  const [starterResult, setStarterResult] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmSeed, setConfirmSeed] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showPlatforms, setShowPlatforms] = useState(false);

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
                    {review.source && review.source !== "site" && (() => {
                      const pl = PLATFORMS.find(p => p.key === review.source);
                      return pl ? (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${pl.badge}`}>
                          {pl.icon} {pl.name}
                        </span>
                      ) : null;
                    })()}
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
