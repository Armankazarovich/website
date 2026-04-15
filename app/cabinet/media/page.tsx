"use client";

import { useState, useEffect } from "react";
import { Images, FileText, Film, Upload, Loader2, Download, ExternalLink } from "lucide-react";
import Image from "next/image";

type MediaItem = {
  type: "review_photo" | "avatar" | "order_doc";
  url: string;
  date: string;
  reviewId?: string;
  productId?: string;
  orderNumber?: number;
  orderId?: string;
};

type MediaData = {
  photos: MediaItem[];
  avatar: MediaItem[];
  docs: MediaItem[];
  total: number;
};

export default function MyMediaPage() {
  const [tab, setTab] = useState<"all" | "photos" | "docs">("all");
  const [data, setData] = useState<MediaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/cabinet/media")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const tabs = [
    { id: "all" as const, label: "Все", icon: Images },
    { id: "photos" as const, label: "Фото", icon: Images },
    { id: "docs" as const, label: "Документы", icon: FileText },
  ];

  const allPhotos = data ? [...data.avatar, ...data.photos] : [];
  const allDocs = data?.docs || [];
  const filtered = tab === "photos" ? allPhotos : tab === "docs" ? allDocs : [...allPhotos, ...allDocs];

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-xl">Медиабиблиотека</h1>
          <p className="text-xs text-muted-foreground mt-1">
            {data ? `${data.total} файлов` : "Загрузка..."}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted rounded-xl p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${
              tab === t.id ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
            {tab === t.id && (
              <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                {tab === "photos" ? allPhotos.length : tab === "docs" ? allDocs.length : (data?.total ?? 0)}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="bg-card border border-border rounded-2xl p-10 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-10 text-center">
          <Images className="w-12 h-12 text-muted-foreground/15 mx-auto mb-3" />
          <p className="font-medium mb-1">
            {tab === "photos" ? "Фотографий нет" : tab === "docs" ? "Документов нет" : "Медиабиблиотека пуста"}
          </p>
          <p className="text-xs text-muted-foreground">
            {tab === "docs"
              ? "Счета из ваших заказов появятся здесь автоматически"
              : "Фото из ваших отзывов и профиля появятся здесь автоматически"}
          </p>
        </div>
      ) : (
        <>
          {/* Photo grid */}
          {(tab === "all" || tab === "photos") && allPhotos.length > 0 && (
            <div>
              {tab === "all" && <p className="text-xs font-medium text-muted-foreground mb-2">Фотографии ({allPhotos.length})</p>}
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {allPhotos.map((item, i) => (
                  <button
                    key={i}
                    onClick={() => setLightbox(item.url)}
                    className="aspect-square rounded-xl overflow-hidden border border-border bg-muted relative group"
                  >
                    <img src={item.url} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                    {item.type === "avatar" && (
                      <span className="absolute top-1 left-1 text-[9px] bg-primary/80 text-primary-foreground px-1.5 py-0.5 rounded-full">
                        Аватар
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Documents list */}
          {(tab === "all" || tab === "docs") && allDocs.length > 0 && (
            <div>
              {tab === "all" && <p className="text-xs font-medium text-muted-foreground mb-2 mt-4">Документы ({allDocs.length})</p>}
              <div className="space-y-2">
                {allDocs.map((item) => (
                  <a
                    key={item.orderId}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 bg-card border border-border rounded-xl p-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-lg bg-red-50 dark:bg-red-950/30 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5 text-red-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">Счёт №{item.orderNumber}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(item.date).toLocaleDateString("ru-RU")}
                      </p>
                    </div>
                    <Download className="w-4 h-4 text-muted-foreground shrink-0" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <img
            src={lightbox}
            alt=""
            className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
