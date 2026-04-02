"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import {
  Search, Loader2, Download, Check, X,
  ChevronLeft, ChevronRight, ExternalLink, Sparkles, AlertTriangle,
} from "lucide-react";

type Photo = {
  id: number;
  thumb: string;
  full: string;
  width: number;
  height: number;
  tags: string;
  user: string;
  pageURL: string;
};

interface PhotoSearchProps {
  productId: string;
  productName: string;
  onPhotoAdded: (url: string) => void;
  onClose: () => void;
}

export function PhotoSearch({ productId, productName, onPhotoAdded, onClose }: PhotoSearchProps) {
  const [query, setQuery] = useState(productName);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchedQuery, setSearchedQuery] = useState("");
  const [translatedQuery, setTranslatedQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [needsKey, setNeedsKey] = useState(false);
  const [saving, setSaving] = useState<number | null>(null);
  const [saved, setSaved] = useState<Set<number>>(new Set());

  const search = useCallback(async (q: string, p = 1) => {
    if (!q.trim()) return;
    setLoading(true);
    setError(null);
    setNeedsKey(false);
    try {
      const res = await fetch(`/api/admin/photos/search?q=${encodeURIComponent(q)}&page=${p}`);
      const data = await res.json();

      if (data.needsKey) {
        setNeedsKey(true);
        setPhotos([]);
        return;
      }
      if (data.error) { setError(data.error); setPhotos([]); return; }

      setPhotos(data.photos ?? []);
      setTotal(data.total ?? 0);
      setSearchedQuery(q);
      setTranslatedQuery(data.query ?? "");
      setPage(p);
    } finally {
      setLoading(false);
    }
  }, []);

  const savePhoto = async (photo: Photo) => {
    setSaving(photo.id);
    try {
      const res = await fetch("/api/admin/photos/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoUrl: photo.full, productId }),
      });
      const data = await res.json();
      if (data.ok) {
        onPhotoAdded(data.url);
        setSaved(prev => new Set([...prev, photo.id]));
      } else {
        alert(data.error ?? "Ошибка при сохранении");
      }
    } finally {
      setSaving(null);
    }
  };

  const totalPages = Math.ceil(Math.min(total, 500) / 12);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-background rounded-3xl shadow-2xl w-full max-w-4xl my-4">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h2 className="font-display font-bold text-lg">Найти фото бесплатно</h2>
            <span className="text-xs bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full font-medium">
              Pixabay — бесплатно
            </span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-muted transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">

          {/* Search bar */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && search(query)}
                placeholder="Название товара..."
                className="w-full pl-9 pr-4 py-2.5 border border-border rounded-2xl bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <button
              onClick={() => search(query)}
              disabled={loading || !query.trim()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Найти
            </button>
          </div>

          {/* Translated query hint */}
          {translatedQuery && !loading && (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              Поиск по английским ключевым словам:
              <span className="font-medium text-foreground">{translatedQuery}</span>
            </p>
          )}

          {/* Needs API key */}
          {needsKey && (
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-5">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-amber-700 dark:text-amber-400">Нужен бесплатный API ключ</p>
                  <p className="text-sm text-muted-foreground mt-1 mb-3">
                    Pixabay даёт бесплатный ключ — регистрация 2 минуты
                  </p>
                  <ol className="text-sm space-y-1.5 text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-600 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
                      <span>Зайди на <a href="https://pixabay.com/api/" target="_blank" rel="noopener" className="text-primary underline">pixabay.com/api/</a> → зарегистрируйся бесплатно</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-600 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
                      <span>Скопируй свой API Key на странице после входа</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-600 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
                      <span>Добавь в Vercel → Settings → Environment Variables:<br />
                        <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">PIXABAY_API_KEY = твой_ключ</code>
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-600 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">4</span>
                      <span>Переедеплой → готово! 100 запросов/минуту бесплатно</span>
                    </li>
                  </ol>
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {error && !needsKey && (
            <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-2xl p-4 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Loading skeleton */}
          {loading && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="aspect-[4/3] rounded-2xl bg-muted animate-pulse" />
              ))}
            </div>
          )}

          {/* Photo grid */}
          {!loading && photos.length > 0 && (
            <>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Найдено: {total.toLocaleString("ru")} фото</span>
                {saved.size > 0 && (
                  <span className="text-emerald-500 font-medium">✓ {saved.size} фото добавлено</span>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {photos.map(photo => (
                  <div
                    key={photo.id}
                    className={`group relative rounded-2xl overflow-hidden border-2 transition-all ${
                      saved.has(photo.id)
                        ? "border-emerald-400 shadow-lg shadow-emerald-400/20"
                        : "border-border hover:border-primary/50 hover:shadow-md"
                    }`}
                  >
                    <div className="aspect-[4/3] relative bg-muted">
                      <Image
                        src={photo.thumb}
                        alt={photo.tags}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>

                    {/* Overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200 flex items-center justify-center gap-2">
                      {saved.has(photo.id) ? (
                        <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg">
                          <Check className="w-5 h-5 text-white" />
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => savePhoto(photo)}
                            disabled={saving === photo.id}
                            className="opacity-0 group-hover:opacity-100 transition-opacity w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-lg hover:bg-primary/90 disabled:opacity-60"
                            title="Добавить к товару"
                          >
                            {saving === photo.id
                              ? <Loader2 className="w-5 h-5 text-white animate-spin" />
                              : <Download className="w-5 h-5 text-white" />
                            }
                          </button>
                          <a
                            href={photo.pageURL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="opacity-0 group-hover:opacity-100 transition-opacity w-8 h-8 rounded-full bg-white/90 flex items-center justify-center shadow-lg hover:bg-white"
                            title="Открыть на Pixabay"
                          >
                            <ExternalLink className="w-4 h-4 text-gray-700" />
                          </a>
                        </>
                      )}
                    </div>

                    {/* Author */}
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-[9px] text-white/80">© {photo.user}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={() => search(searchedQuery, page - 1)}
                    disabled={page <= 1 || loading}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-border text-sm hover:bg-muted disabled:opacity-40 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" /> Назад
                  </button>
                  <span className="text-sm text-muted-foreground">
                    {page} / {Math.min(totalPages, 42)}
                  </span>
                  <button
                    onClick={() => search(searchedQuery, page + 1)}
                    disabled={page >= totalPages || loading}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-border text-sm hover:bg-muted disabled:opacity-40 transition-colors"
                  >
                    Вперёд <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              <p className="text-[10px] text-center text-muted-foreground">
                Фото предоставлены <a href="https://pixabay.com" target="_blank" rel="noopener" className="underline">Pixabay</a> — бесплатно для коммерческого использования
              </p>
            </>
          )}

          {/* Empty */}
          {!loading && photos.length === 0 && searchedQuery && !error && !needsKey && (
            <div className="text-center py-10 text-muted-foreground">
              <p className="text-sm">По запросу «{searchedQuery}» ничего не найдено</p>
              <p className="text-xs mt-1">Попробуйте другое название</p>
            </div>
          )}

          {/* Initial state */}
          {!loading && photos.length === 0 && !searchedQuery && !needsKey && (
            <div className="text-center py-10">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <Search className="w-8 h-8 text-primary/50" />
              </div>
              <p className="text-sm text-muted-foreground">
                Введите название товара и нажмите «Найти»
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Умный поиск автоматически переводит на английский
              </p>
              <button
                onClick={() => search(productName)}
                className="mt-4 text-sm text-primary underline hover:no-underline"
              >
                Поискать по «{productName}»
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
