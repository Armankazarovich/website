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
  Calculator,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AdminBack } from "@/components/admin/admin-back";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { ActionToast } from "@/components/admin/action-toast";

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

/** Естественная сортировка по строкам: "6мм" < "9мм" < "12мм" (а не "12" < "6"). */
function naturalCompare(a: string, b: string): number {
  const re = /(\d+)|(\D+)/g;
  const ax = a.match(re) ?? [];
  const bx = b.match(re) ?? [];
  for (let i = 0; i < Math.max(ax.length, bx.length); i++) {
    const av = ax[i] ?? "";
    const bv = bx[i] ?? "";
    const an = parseInt(av, 10);
    const bn = parseInt(bv, 10);
    if (!isNaN(an) && !isNaN(bn)) {
      if (an !== bn) return an - bn;
    } else {
      const cmp = av.localeCompare(bv, "ru");
      if (cmp !== 0) return cmp;
    }
  }
  return 0;
}

/** Парсит "25×100×6000" (3 размерных числа в мм) и считает piecesPerCube.
 *  Возвращает null если формат не похож на "толщина×ширина×длина" — например для
 *  "6мм · 1/1" (фанера — там нет трёх размерных чисел).
 *  Правила валидности: все 3 числа ≥ 5, длина (любое из них) ≥ 500 мм. */
function autoCalcPieces(size: string): number | null {
  if (!size) return null;
  // Берём только первые 3 числа ДО первого " · " (чтобы сорт/класс не путался)
  const cleaned = size.split(/[·•|]/)[0];
  const nums = cleaned.match(/\d+(?:[.,]\d+)?/g);
  if (!nums || nums.length < 3) return null;
  const a = parseFloat(nums[0].replace(",", "."));
  const b = parseFloat(nums[1].replace(",", "."));
  const c = parseFloat(nums[2].replace(",", "."));
  if (!a || !b || !c) return null;
  // Все 3 значения должны быть ≥ 5мм (не sort-цифры типа "1/1")
  if (a < 5 || b < 5 || c < 5) return null;
  // Хотя бы одно ≥ 500мм (длина доски/бруса)
  if (Math.max(a, b, c) < 500) return null;
  const vol = (a * b * c) / 1e9;
  if (vol <= 0) return null;
  return Math.round(1 / vol);
}

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
  const [toast, setToast] = useState<string | null>(null);
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
          setVariants(
            p.variants
              .map((v) => ({
                id: v.id,
                size: v.size,
                pricePerCube: v.pricePerCube ? String(v.pricePerCube) : "",
                pricePerPiece: v.pricePerPiece ? String(v.pricePerPiece) : "",
                piecesPerCube: v.piecesPerCube ? String(v.piecesPerCube) : "",
                inStock: v.inStock,
              }))
              // естественная сортировка: 6мм → 9мм → 12мм (а не 12→15→6→9)
              .sort((a, b) => naturalCompare(a.size, b.size))
          );
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

  // Сделать фото по индексу главным (перемещаем в начало массива)
  const setPrimaryImage = (idx: number) => {
    if (idx <= 0 || idx >= images.length) return;
    setImages((prev) => {
      const next = [...prev];
      const [picked] = next.splice(idx, 1);
      return [picked, ...next];
    });
  };

  // Удалить одно фото из галереи по индексу
  const removeImage = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
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
    setVariants((prev) => prev.map((v, i) => {
      if (i !== idx) return v;
      const next = { ...v, [field]: value } as Variant;
      // Авто-расчёт piecesPerCube при вводе size (только если поле ещё пустое)
      if (field === "size" && typeof value === "string" && !next.piecesPerCube) {
        const calc = autoCalcPieces(value);
        if (calc) next.piecesPerCube = String(calc);
      }
      return next;
    }));

  // Ручной пересчёт piecesPerCube из size (иконка калькулятора)
  const recalcPieces = (idx: number) => {
    const v = variants[idx];
    if (!v) return;
    const calc = autoCalcPieces(v.size);
    if (!calc) {
      setToast(`Не могу посчитать из "${v.size}" — нужен формат 25×150×6000 (мм)`);
      return;
    }
    setVariants((prev) => prev.map((x, i) => i === idx ? { ...x, piecesPerCube: String(calc) } : x));
    setToast(`Посчитано: ${calc} шт/м³`);
  };

  // Отсортировать варианты вручную (если менеджер добавил новые в конец)
  const sortVariantsNow = () => {
    const sorted = [...variants].sort((a, b) => naturalCompare(a.size, b.size));
    const changed = sorted.some((v, i) => (v.id || v._tempId) !== (variants[i]?.id || variants[i]?._tempId));
    setVariants(sorted);
    setToast(changed ? "Варианты отсортированы по размеру" : "Уже отсортировано по размеру");
  };

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

            {/* Gallery — всегда видна если есть хотя бы одно фото. Плитка "+" для добавления. */}
            {images.length > 0 && (
              <div className="border-t border-primary/10 p-3">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-2 flex items-center justify-between">
                  <span>Галерея ({images.length})</span>
                  <span className="opacity-60 font-normal normal-case">клик — сделать главным</span>
                </p>
                <div className="grid grid-cols-4 gap-1.5">
                  {images.map((img, idx) => (
                    <div
                      key={img + idx}
                      className={cn(
                        "group relative aspect-square rounded-lg overflow-hidden border cursor-pointer transition-all",
                        idx === 0 ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/50"
                      )}
                      onClick={() => setPrimaryImage(idx)}
                      title={idx === 0 ? "Главное фото" : "Сделать главным"}
                    >
                      <Image src={img} alt="" fill className="object-cover" unoptimized />
                      {idx === 0 && (
                        <div className="absolute top-0.5 left-0.5 bg-primary text-primary-foreground text-[9px] font-semibold px-1.5 py-0.5 rounded">
                          Главное
                        </div>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); removeImage(idx); }}
                        className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-destructive/90 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                        title="Удалить это фото"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {/* Плитка "+" для добавления новых фото */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingPhoto}
                    className="aspect-square rounded-lg border border-dashed border-border hover:border-primary hover:bg-primary/[0.05] flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
                    title="Добавить ещё фото (можно выбрать несколько)"
                  >
                    <Plus className="w-5 h-5" />
                    <span className="text-[9px] font-medium">Добавить</span>
                  </button>
                </div>
              </div>
            )}

            {/* Photo actions */}
            <div className="p-3 space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={async (e) => {
                  const files = Array.from(e.target.files || []);
                  for (const file of files) {
                    await uploadPhotoFile(file);
                  }
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
              />

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

              {/* Блок «Инструменты фото» временно скрыт (редактор / Pixabay / убрать фон / авто-обработка —
                  нестабильны). Вернём когда API стабилизируются. */}
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
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Варианты / Цены ({variants.length})
              </h3>
              <div className="flex items-center gap-1.5 flex-wrap">
                {variants.length > 1 && (
                  <button
                    type="button"
                    onClick={sortVariantsNow}
                    title="Отсортировать по размеру (6мм → 9мм → 12мм)"
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium border border-border hover:bg-primary/[0.08] text-muted-foreground transition-colors"
                  >
                    <GripVertical className="w-3 h-3" /> Сортировать
                  </button>
                )}
                <Button size="sm" variant="outline" onClick={addVariant}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> Добавить
                </Button>
              </div>
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
                    <div className="relative">
                      <input
                        type="number"
                        value={v.piecesPerCube}
                        onChange={(e) => updateVariant(idx, "piecesPerCube", e.target.value)}
                        placeholder="28"
                        className="w-full px-2.5 py-2.5 pr-7 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                      <button
                        type="button"
                        onClick={() => recalcPieces(idx)}
                        title="Авто-расчёт из размера (например 25×100×6000)"
                        className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-primary/15 text-primary/60 hover:text-primary transition-colors"
                      >
                        <Calculator className="w-3 h-3" />
                      </button>
                    </div>
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

      {/* Toast (фидбек админских действий: сортировка, авто-расчёт и т.п.) */}
      <ActionToast message={toast} onDismiss={() => setToast(null)} />

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
