"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import {
  Save, Trash2, Plus, Upload, ImageIcon,
  Check, Loader2, Wand2, PenTool, Images, ExternalLink,
  ChevronLeft, ChevronRight, ChevronDown, X, GripVertical, Search, Star, Keyboard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AdminBack } from "@/components/admin/admin-back";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";

// Lazy-load heavy modals — загружаются только при первом открытии
const PhotoEditor = dynamic(
  () => import("@/components/admin/photo-editor").then((m) => ({ default: m.PhotoEditor })),
  { ssr: false, loading: () => null }
);
const MediaPickerModal = dynamic(
  () => import("@/app/admin/media/media-client").then((m) => ({ default: m.MediaPickerModal })),
  { ssr: false, loading: () => null }
);
const PhotoSearch = dynamic(
  () => import("@/components/admin/photo-search").then((m) => ({ default: m.PhotoSearch })),
  { ssr: false, loading: () => null }
);

type Variant = {
  id?: string;
  size: string;
  pricePerCube: string;
  pricePerPiece: string;
  piecesPerCube: string;
  inStock: boolean;
  _tempId?: string;
};

type Product = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  categoryId: string;
  images: string[];
  saleUnit: string;
  active: boolean;
  featured: boolean;
  variants: Array<{
    id: string;
    size: string;
    pricePerCube: string | null;
    pricePerPiece: string | null;
    piecesPerCube: number | null;
    inStock: boolean;
  }>;
};

type Category = { id: string; name: string; slug: string };

export default function AdminProductEditPage() {
  const params = useParams();
  const router = useRouter();
  const isNew = params.id === "new";

  const [product, setProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [allProductIds, setAllProductIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [pipelineProgress, setPipelineProgress] = useState("");
  const [dragOverPhoto, setDragOverPhoto] = useState(false);
  const [photoEditorOpen, setPhotoEditorOpen] = useState(false);
  const [confirmDeleteProduct, setConfirmDeleteProduct] = useState(false);
  const [deletingProduct, setDeletingProduct] = useState(false);
  const [removingBg, setRemovingBg] = useState(false);
  const [autoPipeline, setAutoPipeline] = useState(false);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [photoSearchOpen, setPhotoSearchOpen] = useState(false);
  const [photoToolsOpen, setPhotoToolsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [saleUnit, setSaleUnit] = useState("BOTH");
  const [active, setActive] = useState(true);
  const [featured, setFeatured] = useState(false);
  const [variants, setVariants] = useState<Variant[]>([]);

  useEffect(() => {
    fetch("/api/admin/categories").then((r) => r.json()).then(setCategories);
    // Get all product IDs for prev/next navigation
    fetch("/api/admin/products?ids=1").then((r) => r.json()).then((data) => {
      if (Array.isArray(data)) setAllProductIds(data.map((p: any) => p.id));
    }).catch(() => {});

    if (!isNew && params.id) {
      fetch(`/api/admin/products/${params.id}`)
        .then((r) => r.json())
        .then((p: Product) => {
          setProduct(p);
          setName(p.name);
          setSlug(p.slug);
          setDescription(p.description || "");
          setCategoryId(p.categoryId);
          setImages(p.images);
          setSaleUnit(p.saleUnit);
          setActive(p.active);
          setFeatured(p.featured);
          setVariants(p.variants.map((v) => ({
            id: v.id,
            size: v.size,
            pricePerCube: v.pricePerCube ? String(v.pricePerCube) : "",
            pricePerPiece: v.pricePerPiece ? String(v.pricePerPiece) : "",
            piecesPerCube: v.piecesPerCube ? String(v.piecesPerCube) : "",
            inStock: v.inStock,
          })));
          setLoading(false);
        });
    }
  }, [params.id, isNew]);

  // Ctrl+S save
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [name, slug, description, categoryId, images, saleUnit, active, featured, variants]);

  // Prev / Next navigation
  const currentIdx = allProductIds.indexOf(String(params.id));
  const prevId = currentIdx > 0 ? allProductIds[currentIdx - 1] : null;
  const nextId = currentIdx < allProductIds.length - 1 ? allProductIds[currentIdx + 1] : null;

  const uploadPhotoFile = async (file: File) => {
    setUploadingPhoto(true);
    setPipelineProgress("");
    try {
      setPipelineProgress(autoPipeline ? "Загружаем..." : "");
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "products");
      const res = await fetch("/api/admin/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!data.url) { alert(data.error || "Ошибка загрузки"); return; }
      let finalUrl = data.url;

      if (autoPipeline) {
        setPipelineProgress("AI убирает фон...");
        try {
          const imgRes = await fetch(finalUrl);
          const blob = await imgRes.blob();
          const bgForm = new FormData();
          bgForm.append("file", new File([blob], "photo.png", { type: blob.type }));
          const bgRes = await fetch("/api/admin/remove-bg", { method: "POST", body: bgForm });
          const bgData = await bgRes.json();
          if (bgData.url) finalUrl = bgData.url;
        } catch {}

        setPipelineProgress("Накладываем лого...");
        try {
          const wmRes = await fetch("/api/admin/watermark", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "apply", imageUrl: finalUrl }),
          });
          const wmData = await wmRes.json();
          if (wmData.url && !wmData.error) finalUrl = wmData.url;
        } catch {}

        setPipelineProgress("Готово! ✓");
        setTimeout(() => setPipelineProgress(""), 2000);
      }
      // APPEND to existing images, don't replace — fix for "single image bug"
      setImages(prev => [...prev, finalUrl]);
    } catch {
      alert("Ошибка загрузки фото");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleRemoveBackground = async () => {
    if (!images[0]) return;
    setRemovingBg(true);
    try {
      const response = await fetch(images[0]);
      const blob = await response.blob();
      const formData = new FormData();
      formData.append("file", new File([blob], "photo.png", { type: blob.type }));
      const res = await fetch("/api/admin/remove-bg", { method: "POST", body: formData });
      const data = await res.json();
      if (data.url) setImages([data.url]);
    } catch {}
    finally { setRemovingBg(false); }
  };

  const handleSave = useCallback(async () => {
    if (saving) return;

    // Client-side validation — do not submit invalid data
    if (!name?.trim()) {
      alert("Укажите название товара");
      return;
    }
    if (!categoryId) {
      alert("Выберите категорию");
      return;
    }
    if (!slug?.trim() || !/^[a-z0-9-]+$/.test(slug)) {
      alert("URL (slug) обязателен и может содержать только латиницу, цифры и дефис");
      return;
    }
    if (!variants || variants.length === 0) {
      alert("Добавьте хотя бы один вариант с ценой");
      return;
    }
    for (const v of variants) {
      if (!v.size || !String(v.size).trim()) {
        alert("У всех вариантов должен быть указан размер");
        return;
      }
      const hasPrice = (v.pricePerCube != null && v.pricePerCube !== "") ||
                       (v.pricePerPiece != null && v.pricePerPiece !== "");
      if (!hasPrice) {
        alert(`Вариант "${v.size}": укажите хотя бы одну цену (за м³ или за шт)`);
        return;
      }
    }

    setSaving(true);
    const payload = { name, slug, description, categoryId, images, saleUnit, active, featured, variants };
    let res: Response;
    try {
      if (isNew) {
        res = await fetch("/api/admin/products", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`/api/admin/products/${params.id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
    } catch (err) {
      setSaving(false);
      alert("Сервер недоступен. Проверь интернет и попробуй ещё раз.");
      return;
    }

    let data: any = {};
    try { data = await res.json(); } catch {}
    setSaving(false);

    if (!res.ok) {
      alert(data?.error || `Ошибка ${res.status}: не удалось сохранить`);
      return;
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    if (isNew && data.id) router.replace(`/admin/products/${data.id}`);
  }, [saving, name, slug, description, categoryId, images, saleUnit, active, featured, variants, isNew, params.id, router]);

  const handleDelete = async () => {
    setDeletingProduct(true);
    try {
      const res = await fetch(`/api/admin/products/${params.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(data?.error || `Ошибка ${res.status}: не удалось удалить`);
        return;
      }

      if (data.softDelete) {
        alert(data.message || "Товар скрыт с сайта. История заказов сохранена.");
      }

      setConfirmDeleteProduct(false);
      router.push("/admin/products");
    } catch (err) {
      alert("Сервер недоступен. Проверь интернет.");
    } finally {
      setDeletingProduct(false);
    }
  };

  const addVariant = () => setVariants((prev) => [...prev, {
    size: "", pricePerCube: "", pricePerPiece: "", piecesPerCube: "", inStock: true,
    _tempId: `temp-${Date.now()}`,
  }]);

  const removeVariant = (idx: number) => setVariants((prev) => prev.filter((_, i) => i !== idx));

  const updateVariant = (idx: number, field: keyof Variant, value: string | boolean) =>
    setVariants((prev) => prev.map((v, i) => i === idx ? { ...v, [field]: value } : v));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-5xl pb-24">

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <AdminBack />
          {/* Prev / Next */}
          {!isNew && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => prevId && router.push(`/admin/products/${prevId}`)}
                disabled={!prevId}
                className="p-1.5 rounded-lg hover:bg-primary/[0.08] disabled:opacity-30 transition-colors"
                title="Предыдущий товар"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => nextId && router.push(`/admin/products/${nextId}`)}
                disabled={!nextId}
                className="p-1.5 rounded-lg hover:bg-primary/[0.08] disabled:opacity-30 transition-colors"
                title="Следующий товар"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
          <div>
            <h1 className="font-display font-bold text-xl">{isNew ? "Новый товар" : name || "Редактирование"}</h1>
            {!isNew && slug && <p className="text-xs text-muted-foreground">/{slug}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isNew && slug && (
            <a
              href={`/product/${slug}`}
              target="_blank"
              className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-xl border border-border hover:bg-primary/[0.08] transition-colors text-muted-foreground"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              На сайте
            </a>
          )}
          {!isNew && (
            <Button variant="ghost" size="sm" onClick={() => setConfirmDeleteProduct(true)} className="text-destructive hover:text-destructive hover:bg-destructive/10">
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* ── 2-Column layout ── */}
      <div className="grid lg:grid-cols-[320px_1fr] gap-5">

        {/* ── LEFT: Photo ── */}
        <div className="space-y-3">
          {/* Photo preview */}
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <div
              className={cn(
                "relative aspect-square cursor-pointer transition-all",
                dragOverPhoto && "ring-2 ring-primary ring-inset"
              )}
              onClick={() => !uploadingPhoto && fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOverPhoto(true); }}
              onDragLeave={() => setDragOverPhoto(false)}
              onDrop={async (e) => {
                e.preventDefault(); setDragOverPhoto(false);
                const file = e.dataTransfer.files?.[0];
                if (file?.type.startsWith("image/")) await uploadPhotoFile(file);
              }}
            >
              {images[0] ? (
                <Image src={images[0]} alt={name} fill className="object-cover" unoptimized />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground bg-muted/30">
                  <Upload className="w-10 h-10 opacity-40" />
                  <p className="text-sm font-medium">Нажмите или перетащите фото</p>
                  <p className="text-xs opacity-60">JPG, PNG, WEBP</p>
                </div>
              )}
              {uploadingPhoto && (
                <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">{pipelineProgress || "Загружаем..."}</p>
                </div>
              )}
            </div>

            {/* Photo actions */}
            <div className="p-3 space-y-2">
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) { await uploadPhotoFile(file); if (fileInputRef.current) fileInputRef.current.value = ""; }
              }} />

              <div className="flex gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-dashed border-border text-xs font-medium text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" /> Загрузить
                </button>
                <button
                  onClick={() => setMediaPickerOpen(true)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-border text-xs font-medium text-muted-foreground hover:bg-primary/[0.08] transition-colors"
                >
                  <Images className="w-3.5 h-3.5" /> Библиотека
                </button>
              </div>

              {/* Кнопка удалить фото */}
              {images[0] && (
                <button onClick={() => setImages([])} className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl border border-border/50 text-xs text-muted-foreground hover:text-destructive hover:border-destructive/30 transition-colors">
                  <X className="w-3.5 h-3.5" /> Удалить фото
                </button>
              )}

              {/* Дополнительные инструменты — скрыты по умолчанию */}
              <button
                onClick={() => setPhotoToolsOpen(v => !v)}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl border border-border/40 text-[11px] text-muted-foreground/60 hover:text-muted-foreground transition-colors"
              >
                <Wand2 className="w-3 h-3" />
                {photoToolsOpen ? "Скрыть инструменты" : "Инструменты фото"}
                <ChevronDown className={cn("w-3 h-3 transition-transform", photoToolsOpen && "rotate-180")} />
              </button>

              {photoToolsOpen && (
                <div className="space-y-1.5 pt-0.5">
                  {!isNew && (
                    <button
                      onClick={() => setPhotoSearchOpen(true)}
                      className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-primary/30 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
                    >
                      <Search className="w-3.5 h-3.5" />
                      Найти бесплатное фото (Pixabay)
                    </button>
                  )}
                  {images[0] && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPhotoEditorOpen(true)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-border/50 text-xs font-medium hover:bg-primary/[0.08] transition-colors"
                      >
                        <PenTool className="w-3.5 h-3.5 text-primary" /> Редактор
                      </button>
                      <button
                        onClick={handleRemoveBackground}
                        disabled={removingBg}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-border/50 text-xs font-medium hover:bg-primary/[0.08] disabled:opacity-50 transition-colors"
                      >
                        {removingBg ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5 text-primary" />}
                        {removingBg ? "Убираем..." : "Убрать фон"}
                      </button>
                    </div>
                  )}
                  <button
                    onClick={() => setAutoPipeline((v) => !v)}
                    className={cn(
                      "w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-medium border transition-all",
                      autoPipeline
                        ? "bg-primary/10 border-primary/30 text-primary"
                        : "border-border/40 text-muted-foreground/70 hover:bg-primary/[0.08]"
                    )}
                  >
                    <span className={cn("w-1.5 h-1.5 rounded-full", autoPipeline ? "bg-primary" : "bg-muted-foreground/30")} />
                    {autoPipeline ? "Авто: убрать фон + лого" : "Авто-обработка при загрузке"}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Status card */}
          <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
            <h3 className="text-sm font-semibold">Статус</h3>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm">Активен на сайте</span>
              <button
                onClick={() => setActive((v) => !v)}
                className={cn(
                  "relative w-11 h-6 rounded-full transition-colors",
                  active ? "bg-primary" : "bg-muted"
                )}
              >
                <span className={cn(
                  "absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform",
                  active && "translate-x-5"
                )} />
              </button>
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm flex items-center gap-1">Рекомендуемый <Star className="w-3.5 h-3.5 text-amber-400" /></span>
              <button
                onClick={() => setFeatured((v) => !v)}
                className={cn(
                  "relative w-11 h-6 rounded-full transition-colors",
                  featured ? "bg-primary" : "bg-muted"
                )}
              >
                <span className={cn(
                  "absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform",
                  featured && "translate-x-5"
                )} />
              </button>
            </label>
          </div>
        </div>

        {/* ── RIGHT: Main info ── */}
        <div className="space-y-4">

          {/* Basic info */}
          <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Основная информация</h3>

            <div>
              <label className="block text-sm font-medium mb-1.5">Название товара *</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Доска строганная сосна 1 сорт"
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1.5">Категория *</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">— Выберите —</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Slug (URL)</label>
                <input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="doska-stroganaya-sosna"
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Описание</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Характеристики, особенности, применение..."
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Единица продажи</label>
              <div className="flex gap-2">
                {[
                  { value: "BOTH", label: "м³ и штуки" },
                  { value: "CUBE", label: "Только м³" },
                  { value: "PIECE", label: "Только шт" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setSaleUnit(opt.value)}
                    className={cn(
                      "px-4 py-2 rounded-xl text-sm font-medium border transition-colors",
                      saleUnit === opt.value
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card border-border hover:bg-primary/[0.08]"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Variants */}
          <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Варианты / Цены ({variants.length})
              </h3>
              <Button size="sm" variant="outline" onClick={addVariant}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Добавить
              </Button>
            </div>

            {variants.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground border-2 border-dashed border-border rounded-xl">
                <p className="text-sm mb-2">Нет вариантов</p>
                <button onClick={addVariant} className="text-sm text-primary hover:underline">+ Добавить вариант</button>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-5 px-5">
              <div className="min-w-[560px] space-y-1">
                {/* Table header */}
                <div className="grid grid-cols-[1fr_100px_100px_80px_44px_32px] gap-2 px-2 pb-1">
                  <span className="text-xs text-muted-foreground">Размер</span>
                  <span className="text-xs text-muted-foreground">Цена м³</span>
                  <span className="text-xs text-muted-foreground">Цена шт</span>
                  <span className="text-xs text-muted-foreground">Шт/м³</span>
                  <span className="text-xs text-muted-foreground">Нал.</span>
                  <span />
                </div>
                {variants.map((v, idx) => (
                  <div
                    key={v.id || v._tempId}
                    className={cn(
                      "grid grid-cols-[1fr_100px_100px_80px_44px_32px] gap-2 items-center p-2 rounded-xl transition-colors",
                      idx % 2 === 0 ? "bg-muted/30" : ""
                    )}
                  >
                    <input
                      value={v.size}
                      onChange={(e) => updateVariant(idx, "size", e.target.value)}
                      placeholder="50×150×6000"
                      className="w-full px-2.5 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono"
                    />
                    <input
                      type="number"
                      value={v.pricePerCube}
                      onChange={(e) => updateVariant(idx, "pricePerCube", e.target.value)}
                      placeholder="12000"
                      className="w-full px-2.5 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    <input
                      type="number"
                      value={v.pricePerPiece}
                      onChange={(e) => updateVariant(idx, "pricePerPiece", e.target.value)}
                      placeholder="420"
                      className="w-full px-2.5 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    <input
                      type="number"
                      value={v.piecesPerCube}
                      onChange={(e) => updateVariant(idx, "piecesPerCube", e.target.value)}
                      placeholder="28"
                      className="w-full px-2.5 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    <button
                      onClick={() => updateVariant(idx, "inStock", !v.inStock)}
                      className={cn(
                        "w-10 h-6 rounded-full transition-colors relative shrink-0",
                        v.inStock ? "bg-emerald-500" : "bg-muted"
                      )}
                    >
                      <span className={cn(
                        "absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform",
                        v.inStock && "translate-x-4"
                      )} />
                    </button>
                    <button onClick={() => removeVariant(idx)} className="p-1 text-muted-foreground hover:text-destructive transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Sticky Save Bar ── */}
      <div className="fixed bottom-0 left-0 right-0 z-50 lg:left-64">
        <div className="bg-background/95 backdrop-blur border-t border-border px-6 pt-3 flex items-center justify-between gap-4 max-w-5xl" style={{ paddingBottom: "env(safe-area-inset-bottom, 12px)" }}>
          <p className="text-xs text-muted-foreground hidden sm:block">
            {saved ? <><Check className="w-3 h-3 inline mr-1" /> Сохранено</> : <><Keyboard className="w-3 h-3 inline mr-1" /> Ctrl+S для быстрого сохранения</>}
          </p>
          <div className="flex items-center gap-3 ml-auto">
            <Link href="/admin/products" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              ← К списку
            </Link>
            <Button onClick={handleSave} disabled={saving || saved} size="sm" className="min-w-[140px]">
              {saved ? (
                <><Check className="w-4 h-4 mr-2" /> Сохранено!</>
              ) : saving ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Сохранение...</>
              ) : (
                <><Save className="w-4 h-4 mr-2" /> Сохранить</>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Modals */}
      {photoEditorOpen && images[0] && (
        <PhotoEditor
          imageUrl={images[0]}
          onSave={(newUrl) => { setImages([newUrl]); setPhotoEditorOpen(false); }}
          onClose={() => setPhotoEditorOpen(false)}
        />
      )}
      <MediaPickerModal
        open={mediaPickerOpen}
        onClose={() => setMediaPickerOpen(false)}
        onPick={(url) => { setImages([url]); setMediaPickerOpen(false); }}
      />
      {photoSearchOpen && (
        <PhotoSearch
          productId={String(params.id)}
          productName={name || "товар"}
          onPhotoAdded={(url) => {
            setImages(prev => prev.includes(url) ? prev : [url, ...prev]);
          }}
          onClose={() => setPhotoSearchOpen(false)}
        />
      )}

      <ConfirmDialog
        open={confirmDeleteProduct}
        onClose={() => setConfirmDeleteProduct(false)}
        onConfirm={handleDelete}
        title="Удалить товар?"
        description="Товар и все его варианты будут удалены. Это действие нельзя отменить."
        confirmLabel="Удалить товар"
        variant="danger"
        loading={deletingProduct}
      />
    </div>
  );
}
