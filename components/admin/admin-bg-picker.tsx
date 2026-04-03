"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ImageIcon, X, Upload, Trash2, Check, Loader2, Sparkles } from "lucide-react";

// Ken Burns анимации (те же что в admin-nature-bg)
const ANIMS = ["kenburns-in", "kenburns-2", "kenburns-3"];

const UNSPLASH_SUGGESTIONS = [
  { url: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1920&q=80", label: "Горы" },
  { url: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1920&q=80", label: "Лес" },
  { url: "https://images.unsplash.com/photo-1505118380757-91f5f5632de0?auto=format&fit=crop&w=1920&q=80", label: "Океан" },
  { url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1920&q=80", label: "Альпы" },
  { url: "https://images.unsplash.com/photo-1470770903676-69b98201ea1c?auto=format&fit=crop&w=1920&q=80", label: "Водопад" },
  { url: "https://images.unsplash.com/photo-1540979388789-6cee28a1cdc9?auto=format&fit=crop&w=1920&q=80", label: "Город" },
  { url: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1920&q=80", label: "Поля" },
  { url: "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1920&q=80", label: "Снег" },
  { url: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=1920&q=80", label: "Закат" },
  { url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=1920&q=80", label: "Пустыня" },
];

interface AdminBgPickerProps {
  onPhotosChange?: (photos: string[]) => void;
}

export function AdminBgPicker({ onPhotosChange }: AdminBgPickerProps) {
  const [open, setOpen] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [addingUrl, setAddingUrl] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchPhotos = useCallback(async () => {
    const res = await fetch("/api/admin/user-bg").catch(() => null);
    if (!res?.ok) return;
    const data = await res.json();
    setPhotos(data.photos || []);
    onPhotosChange?.(data.photos || []);
  }, [onPhotosChange]);

  useEffect(() => { fetchPhotos(); }, [fetchPhotos]);

  const upload = async (file: File) => {
    if (uploading) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/admin/user-bg", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) { alert(data.error || "Ошибка загрузки"); return; }
      setPhotos(data.photos);
      onPhotosChange?.(data.photos);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally { setUploading(false); }
  };

  const addUnsplash = async (url: string) => {
    setAddingUrl(url);
    // Для Unsplash — сохраняем URL напрямую (без загрузки файла)
    // Сначала получаем текущие фото
    const row = await fetch("/api/admin/user-bg").then(r => r.json()).catch(() => ({ photos: [] }));
    const existing: string[] = row.photos || [];
    if (existing.length >= 5) { alert("Максимум 5 фото. Удали старое."); setAddingUrl(null); return; }
    if (existing.includes(url)) { setAddingUrl(null); return; }
    // Добавляем через DELETE+POST trick — нет, лучше просто PATCH
    // Используем специальный endpoint — добавим URL через POST с json body
    const res = await fetch("/api/admin/user-bg/url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    }).catch(() => null);
    if (res?.ok) {
      const data = await res.json();
      setPhotos(data.photos);
      onPhotosChange?.(data.photos);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
    setAddingUrl(null);
  };

  const remove = async (url: string) => {
    const res = await fetch("/api/admin/user-bg", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    if (res.ok) {
      const data = await res.json();
      setPhotos(data.photos);
      onPhotosChange?.(data.photos);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) upload(file);
  };

  const glass = {
    background: "linear-gradient(135deg, hsl(var(--primary) / 0.08) 0%, transparent 55%), rgba(8, 12, 28, 0.92)",
    backdropFilter: "blur(40px) saturate(180%)",
    WebkitBackdropFilter: "blur(40px) saturate(180%)",
    border: "1px solid rgba(255,255,255,0.14)",
    boxShadow: "0 24px 64px rgba(0,0,0,0.55)",
  } as React.CSSProperties;

  return (
    <>
      {/* ── Кнопка в хедере ── */}
      <button
        onClick={() => setOpen(true)}
        title="Мой фон рабочего места"
        className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-muted/80 transition-colors relative aray-icon-spin"
      >
        <ImageIcon className="w-4 h-4 text-muted-foreground" />
        {photos.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full"
            style={{ background: "hsl(var(--primary))" }} />
        )}
      </button>

      {/* ── Попап управления фоном ── */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[55]"
              style={{ background: "rgba(0,0,0,0.4)" }}
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.97 }}
              transition={{ type: "spring", damping: 28, stiffness: 380 }}
              className="fixed z-[56] flex flex-col"
              style={{
                top: "60px",
                right: "80px",
                width: "400px",
                maxHeight: "80vh",
                borderRadius: "20px",
                ...glass,
              }}
            >
              {/* Шапка */}
              <div className="flex items-center gap-3 px-5 py-4 shrink-0"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary)/0.6))" }}>
                  <ImageIcon className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white/90">Мой фон</p>
                  <p className="text-[10px] text-white/40">Персональные фото рабочего пространства</p>
                </div>
                {saved && (
                  <div className="flex items-center gap-1.5 text-emerald-400 text-xs">
                    <Check className="w-3.5 h-3.5" /> Сохранено
                  </div>
                )}
                <button onClick={() => setOpen(false)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors">
                  <X className="w-3.5 h-3.5 text-white/40" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-5">

                {/* Загруженные фото */}
                {photos.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-white/35 mb-3">
                      Мои фото ({photos.length}/5)
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {photos.map((url, i) => (
                        <div key={url} className="relative group rounded-xl overflow-hidden"
                          style={{ aspectRatio: "16/9" }}>
                          <img src={url} alt="" className="w-full h-full object-cover" />
                          {/* Оверлей с анимацией при hover */}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all duration-200 flex items-center justify-center">
                            <button
                              onClick={() => remove(url)}
                              className="opacity-0 group-hover:opacity-100 transition-all duration-200 w-8 h-8 rounded-full bg-red-500/90 flex items-center justify-center"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-white" />
                            </button>
                          </div>
                          {/* Номер */}
                          <div className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                            style={{ background: "hsl(var(--primary) / 0.85)" }}>
                            {i + 1}
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-white/30 mt-2">
                      Фото показываются по порядку со сменой каждые 20 сек
                    </p>
                  </div>
                )}

                {/* Зона загрузки */}
                {photos.length < 5 && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-white/35 mb-3">
                      Загрузить своё фото
                    </p>
                    <div
                      onDrop={handleDrop}
                      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                      onDragLeave={() => setDragging(false)}
                      onClick={() => fileRef.current?.click()}
                      className="rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all py-6"
                      style={{
                        border: `2px dashed ${dragging ? "hsl(var(--primary))" : "rgba(255,255,255,0.15)"}`,
                        background: dragging ? "hsl(var(--primary) / 0.08)" : "rgba(255,255,255,0.03)",
                      }}
                    >
                      {uploading ? (
                        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "hsl(var(--primary))" }} />
                      ) : (
                        <Upload className="w-8 h-8 text-white/25" />
                      )}
                      <p className="text-sm text-white/50">
                        {uploading ? "Загружаю..." : "Перетащи или нажми"}
                      </p>
                      <p className="text-[10px] text-white/25">JPG, PNG, WEBP · макс 10MB</p>
                    </div>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }}
                    />
                  </div>
                )}

                {/* Пресеты Unsplash */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-3.5 h-3.5" style={{ color: "hsl(var(--primary))" }} />
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-white/35">
                      Бесплатные фото (Unsplash)
                    </p>
                  </div>
                  <div className="grid grid-cols-5 gap-1.5">
                    {UNSPLASH_SUGGESTIONS.map((s) => {
                      const active = photos.includes(s.url);
                      return (
                        <button
                          key={s.url}
                          onClick={() => !active && photos.length < 5 && addUnsplash(s.url)}
                          disabled={active || photos.length >= 5 || addingUrl === s.url}
                          className="relative rounded-lg overflow-hidden transition-all hover:scale-105 disabled:opacity-50 disabled:scale-100"
                          style={{ aspectRatio: "16/9" }}
                          title={s.label}
                        >
                          <img src={s.url.replace("w=1920", "w=200")} alt={s.label}
                            className="w-full h-full object-cover" />
                          {addingUrl === s.url && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                              <Loader2 className="w-4 h-4 text-white animate-spin" />
                            </div>
                          )}
                          {active && (
                            <div className="absolute inset-0 flex items-center justify-center"
                              style={{ background: "hsl(var(--primary) / 0.6)" }}>
                              <Check className="w-4 h-4 text-white" />
                            </div>
                          )}
                          <div className="absolute bottom-0 inset-x-0 py-0.5 text-center"
                            style={{ background: "rgba(0,0,0,0.55)" }}>
                            <span className="text-[8px] text-white/80">{s.label}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Сброс — показать стандартные */}
                {photos.length > 0 && (
                  <button
                    onClick={async () => {
                      for (const url of [...photos]) await remove(url);
                    }}
                    className="w-full py-2 rounded-xl text-xs text-white/40 hover:text-white/70 transition-colors"
                    style={{ border: "1px solid rgba(255,255,255,0.07)" }}
                  >
                    Вернуть стандартный фон
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
