"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import {
  Save, Trash2, Plus, Upload, ImageIcon,
  Check, CheckCircle, Loader2, Wand2, PenTool, Images, ExternalLink,
  ChevronLeft, ChevronRight, ChevronDown, X, GripVertical, Search, Star, Keyboard,
  Calculator, Copy, Sparkles, TrendingUp, TrendingDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { slugify } from "@/lib/slug";
import { buildProductInsightSuggestions, normalizeProductCardTags } from "@/lib/product-insights";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { ActionToast } from "@/components/admin/action-toast";
import { RelatedTasksPanel } from "@/components/admin/related-tasks-panel";
import { AdminModal } from "@/components/admin/admin-modal";

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
  shortDescription: string | null;
  description: string | null;
  categoryId: string;
  images: string[];
  cardTags: string[];
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

type Category = { id: string; name: string; slug: string; parentId?: string | null };
const PRODUCT_PHOTO_MAX_SIZE = 25 * 1024 * 1024;

function getProductId(id: string | string[] | undefined): string | null {
  if (Array.isArray(id)) return id[0] ?? null;
  return id ?? null;
}

function adminPreviewSrc(src: string) {
  if (!src.startsWith("/")) return src;
  return `${src}${src.includes("?") ? "&" : "?"}adminPreview=1`;
}

function AdminImagePreview({
  src,
  alt,
  className,
  fallbackLabel = "Фото не загрузилось",
}: {
  src: string;
  alt: string;
  className?: string;
  fallbackLabel?: string;
}) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (failed) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-muted/40 text-muted-foreground">
        <ImageIcon className="h-8 w-8 opacity-45" />
        <span className="px-3 text-center text-xs font-medium leading-tight">{fallbackLabel}</span>
      </div>
    );
  }

  return (
    <img
      src={adminPreviewSrc(src)}
      alt={alt}
      className={cn("h-full w-full object-cover", className)}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

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

function formatCategoryOption(category: Category, categories: Category[]) {
  const parent = category.parentId ? categories.find((item) => item.id === category.parentId) : null;
  return parent ? `${parent.name} / ${category.name}` : category.name;
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

/** Прогресс готовности товара к публикации (для менеджера). */
function calcReadiness(p: {
  name: string;
  categoryId: string;
  slug: string;
  images: string[];
  variants: Array<{ size: string; pricePerCube: string; pricePerPiece: string }>;
  shortDescription: string;
  description: string;
}): { percent: number; missing: string[] } {
  const checks: Array<{ ok: boolean; label: string }> = [
    { ok: !!p.name?.trim() && !!p.categoryId && !!p.slug?.trim(), label: "Название, категория, URL" },
    { ok: (p.images?.length ?? 0) > 0, label: "Хотя бы одно фото" },
    { ok: (p.variants?.length ?? 0) > 0 && p.variants.every(v => v.size && (v.pricePerCube || v.pricePerPiece)), label: "Размеры и цены" },
    { ok: (p.shortDescription?.trim().length ?? 0) >= 55 && (p.shortDescription?.trim().length ?? 0) <= 155, label: "Короткое описание (55–155 символов)" },
    { ok: (p.description?.trim().length ?? 0) >= 180, label: "SEO-описание (от 180 символов)" },
    { ok: p.variants.some(v => !!v.pricePerPiece), label: "Цена за штуку (нужно для Директа)" },
  ];
  const done = checks.filter(c => c.ok).length;
  return {
    percent: Math.round((done / checks.length) * 100),
    missing: checks.filter(c => !c.ok).map(c => c.label),
  };
}

export default function AdminProductEditPage() {
  const params = useParams();
  const router = useRouter();
  const productId = getProductId(params.id);
  const isNew = productId === "new" || !productId;

  const [product, setProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryCreateOpen, setCategoryCreateOpen] = useState(false);
  const [quickCategoryName, setQuickCategoryName] = useState("");
  const [quickCategoryParentId, setQuickCategoryParentId] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);
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
  const [improvingDesc, setImprovingDesc] = useState(false);
  const [contentDrafting, setContentDrafting] = useState(false);
  const [improveError, setImproveError] = useState<string | null>(null);
  const [contentDraftError, setContentDraftError] = useState<string | null>(null);
  const [duplicating, setDuplicating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [shortDescription, setShortDescription] = useState("");
  const [description, setDescription] = useState("");
  const [cardTags, setCardTags] = useState<string[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [saleUnit, setSaleUnit] = useState("BOTH");
  const [active, setActive] = useState(true);
  const [featured, setFeatured] = useState(false);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [pendingVariantStockToggle, setPendingVariantStockToggle] = useState<{
    idx: number;
    size: string;
    nextInStock: boolean;
  } | null>(null);

  const handleNameChange = (value: string) => {
    setName(value);
    if (!slugTouched || !slug.trim()) {
      setSlug(slugify(value));
    }
  };

  const handleSlugChange = (value: string) => {
    setSlugTouched(true);
    setSlug(slugify(value));
  };

  const loadCategories = useCallback(async () => {
    const res = await fetch("/api/admin/categories", { cache: "no-store" });
    const data = await res.json().catch(() => []);
    if (Array.isArray(data)) setCategories(data);
  }, []);

  useEffect(() => {
    void loadCategories();
    // Get all product IDs for prev/next navigation
    fetch("/api/admin/products?ids=1").then((r) => r.json()).then((data) => {
      if (Array.isArray(data)) setAllProductIds(data.map((p: any) => p.id));
    }).catch(() => {});

    if (!isNew && productId) {
      fetch(`/api/admin/products/${productId}`)
        .then((r) => {
          if (!r.ok) throw new Error("Product not found");
          return r.json();
        })
        .then((p: Product) => {
          if (p.id && p.id !== productId) router.replace(`/admin/products/${p.id}`);
          setProduct(p);
          setName(p.name);
          setSlug(p.slug);
          setSlugTouched(false);
          setShortDescription(p.shortDescription || "");
          setDescription(p.description || "");
          setCardTags(Array.isArray(p.cardTags) ? p.cardTags.slice(0, 3) : []);
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
        })
        .catch(() => {
          setToast("Товар не найден или недоступен");
          setLoading(false);
        });
    }
  }, [productId, isNew, router, loadCategories]);

  // Prev / Next navigation
  const currentIdx = allProductIds.indexOf(productId ?? "");
  const prevId = currentIdx > 0 ? allProductIds[currentIdx - 1] : null;
  const nextId = currentIdx < allProductIds.length - 1 ? allProductIds[currentIdx + 1] : null;

  const uploadPhotoFile = async (file: File) => {
    if (file.size > PRODUCT_PHOTO_MAX_SIZE) {
      setToast("Фото больше 25MB. Сожмите файл или загрузите другое изображение.");
      return;
    }
    setUploadingPhoto(true);
    setPipelineProgress("");
    try {
      setPipelineProgress(autoPipeline ? "Загружаем..." : "");
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "products");
      const res = await fetch("/api/admin/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!data.url) {
        setToast(data.error || "Ошибка загрузки");
        return;
      }
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
      setToast("Фото добавлено. Нажмите «Сохранить», чтобы изменения появились на сайте.");
    } catch {
      setToast("Ошибка загрузки фото");
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
    setToast("Главное фото изменено. Нажмите «Сохранить», чтобы применить.");
  };

  // Удалить одно фото из галереи по индексу
  const removeImage = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
    setToast("Фото убрано из товара. Нажмите «Сохранить», чтобы применить.");
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
      if (data.url) {
        setImages((prev) => [data.url, ...prev.slice(1)]);
        setToast("Фон обработан. Нажмите «Сохранить», чтобы применить.");
      }
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
    const finalSlug = slugify(slug || name);
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
    const payload = {
      name,
      slug: finalSlug,
      shortDescription,
      description,
      categoryId,
      images,
      cardTags: normalizeProductCardTags(cardTags),
      saleUnit,
      active,
      featured,
      variants,
    };
    let res: Response;
    try {
      if (isNew) {
        res = await fetch("/api/admin/products", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`/api/admin/products/${productId}`, {
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
  }, [saving, name, slug, shortDescription, description, categoryId, images, cardTags, saleUnit, active, featured, variants, isNew, productId, router]);

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
  }, [handleSave]);

  const handleDelete = async () => {
    if (!productId || isNew) return;
    setDeletingProduct(true);
    try {
      const res = await fetch(`/api/admin/products/${productId}`, { method: "DELETE" });
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

  const requestVariantStockToggle = (idx: number) => {
    const variant = variants[idx];
    if (!variant) return;
    setPendingVariantStockToggle({
      idx,
      size: variant.size || `#${idx + 1}`,
      nextInStock: !variant.inStock,
    });
  };

  const confirmVariantStockToggle = () => {
    if (!pendingVariantStockToggle) return;
    updateVariant(pendingVariantStockToggle.idx, "inStock", pendingVariantStockToggle.nextInStock);
    setToast(
      pendingVariantStockToggle.nextInStock
        ? "Вариант вернётся в наличие после сохранения товара."
        : "Вариант будет снят с наличия после сохранения товара."
    );
    setPendingVariantStockToggle(null);
  };

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

  // Массово изменить цены в % — по колонке (pricePerCube или pricePerPiece)
  const bulkPriceAdjust = (percent: number, field: "pricePerCube" | "pricePerPiece") => {
    const label = field === "pricePerCube" ? "цены за м³" : "цены за шт";
    const sign = percent > 0 ? "+" : "";
    if (!confirm(`Изменить все ${label} на ${sign}${percent}%? Это применится только локально — сохраните товар чтобы применить.`)) return;
    setVariants((prev) => prev.map(v => {
      const old = parseFloat(v[field] || "0");
      if (!old) return v;
      const next = Math.round(old * (1 + percent / 100));
      return { ...v, [field]: String(next) };
    }));
    setToast(`Цены ${field === "pricePerCube" ? "за м³" : "за шт"} изменены на ${sign}${percent}%`);
  };

  // Улучшить описание через AI (тот же endpoint что и в drawer)
  const improveDescription = async () => {
    if (isNew || !productId) {
      setImproveError("Сохраните товар хотя бы раз, потом AI сможет улучшить описание");
      return;
    }
    setImprovingDesc(true);
    setImproveError(null);
    try {
      const res = await fetch(`/api/admin/products/${productId}/improve-seo`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setImproveError(data.error || `Ошибка ${res.status}`);
        return;
      }
      if (data.shortDescription) setShortDescription(data.shortDescription);
      if (data.description) {
        setDescription(data.description);
        setToast("ARAY обновил короткое и полное SEO-описание");
      }
    } catch {
      setImproveError("Сервер недоступен, попробуй ещё раз");
    } finally {
      setImprovingDesc(false);
    }
  };

  const buildCurrentPriceHint = () => {
    const priced = variants.find((variant) => {
      const cube = Number(variant.pricePerCube || 0);
      const piece = Number(variant.pricePerPiece || 0);
      return cube > 0 || piece > 0;
    });
    if (!priced) return { price: null, unit: null };

    const cube = Number(priced.pricePerCube || 0);
    const piece = Number(priced.pricePerPiece || 0);
    if (saleUnit !== "PIECE" && cube > 0) {
      return {
        price: `от ${new Intl.NumberFormat("ru-RU").format(Math.round(cube))} ₽`,
        unit: "за м³",
      };
    }
    if (piece > 0) {
      return {
        price: `от ${new Intl.NumberFormat("ru-RU").format(Math.round(piece))} ₽`,
        unit: "за шт",
      };
    }
    return { price: null, unit: null };
  };

  const applyArayContentCore = async () => {
    if (!name.trim()) {
      setContentDraftError("Сначала укажите название товара");
      return;
    }

    setContentDrafting(true);
    setContentDraftError(null);
    const priceHint = buildCurrentPriceHint();

    try {
      const res = await fetch("/api/admin/aray/content/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "product",
          title: name,
          description,
          category: selectedCategoryName,
          price: priceHint.price,
          unit: priceHint.unit,
          region: "Москва и Московская область",
          businessType: "catalog",
          tone: "steady",
          variants: variants.map((variant) => ({
            size: variant.size,
            pricePerCube: variant.pricePerCube,
            pricePerPiece: variant.pricePerPiece,
            inStock: variant.inStock,
          })),
          benefits: previewCardTags.length ? previewCardTags : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.draft) {
        throw new Error(data?.error || "ARAY Content Core не вернул черновик");
      }

      const draft = data.draft as {
        shortDescription?: string;
        plainDescription?: string;
        cardTags?: string[];
      };
      if (draft.shortDescription) setShortDescription(draft.shortDescription);
      if (draft.plainDescription) setDescription(draft.plainDescription);
      if (Array.isArray(draft.cardTags)) setCardTags(draft.cardTags.slice(0, 3));
      setToast("ARAY Core собрал описание, карточку и подсказки. Проверьте и сохраните товар.");
    } catch (error) {
      setContentDraftError(error instanceof Error ? error.message : "Не удалось собрать текст через ARAY Core");
    } finally {
      setContentDrafting(false);
    }
  };

  const createQuickCategory = async () => {
    const cleanName = quickCategoryName.trim();
    if (!cleanName) {
      setToast("Введите название категории");
      return;
    }

    setCreatingCategory(true);
    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: cleanName,
          slug: slugify(cleanName),
          parentId: quickCategoryParentId || null,
          showInMenu: true,
          showInFooter: true,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setToast(data?.error || `Ошибка ${res.status}: категорию не удалось создать`);
        return;
      }

      await loadCategories();
      if (data?.id) setCategoryId(data.id);
      setQuickCategoryName("");
      setQuickCategoryParentId("");
      setCategoryCreateOpen(false);
      setToast("Категория создана и выбрана для товара");
    } catch {
      setToast("Сервер недоступен, категорию не удалось создать");
    } finally {
      setCreatingCategory(false);
    }
  };

  // Дублировать товар — создаёт копию с `-copy` slug, перекидывает на редактирование дубля
  const duplicateProduct = async () => {
    if (isNew || !productId) return;
    if (!confirm(`Дублировать "${name}"? Будет создан новый товар с тем же набором вариантов.`)) return;
    setDuplicating(true);
    try {
      const baseSlug = slug.replace(/-copy(-\d+)?$/, "");
      const newSlug = `${baseSlug}-copy-${Date.now().toString().slice(-4)}`;
      const payload = {
        name: `${name} (копия)`,
        slug: newSlug,
        shortDescription,
        description,
        categoryId,
        images: [...images],
        cardTags: normalizeProductCardTags(cardTags),
        saleUnit,
        active: false, // дубликат создаётся в "скрытых" — менеджер проверяет и публикует
        featured: false,
        variants: variants.map(v => ({
          size: v.size,
          pricePerCube: v.pricePerCube,
          pricePerPiece: v.pricePerPiece,
          piecesPerCube: v.piecesPerCube,
          inStock: v.inStock,
        })),
      };
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || `Ошибка ${res.status}`);
        return;
      }
      if (data.id) {
        router.push(`/admin/products/${data.id}`);
      }
    } catch {
      alert("Сервер недоступен");
    } finally {
      setDuplicating(false);
    }
  };

  // Прогресс готовности товара
  const selectedCategoryName = categories.find((category) => category.id === categoryId)?.name || "";
  const insightSuggestions = buildProductInsightSuggestions({
    name,
    category: selectedCategoryName,
    shortDescription,
    description,
    saleUnit,
    variants: variants.map((variant) => ({ size: variant.size, inStock: variant.inStock })),
  }).slice(0, 6);
  const normalizedCardTags = normalizeProductCardTags(cardTags);
  const previewCardTags = normalizedCardTags.length > 0 ? normalizedCardTags : insightSuggestions.slice(0, 3);

  const setCardTagSlot = (index: number, value: string) => {
    setCardTags((prev) => {
      const next = [...prev].slice(0, 3);
      next[index] = value;
      return next;
    });
  };

  const addInsightSuggestion = (tag: string) => {
    setCardTags((prev) => {
      const next = [...prev].slice(0, 3);
      const exists = normalizeProductCardTags(next).some((item) => item.toLowerCase() === tag.toLowerCase());
      if (exists) return next;

      const emptyIndex = next.findIndex((item) => !item?.trim());
      if (emptyIndex >= 0) {
        next[emptyIndex] = tag;
        return next;
      }

      next[2] = tag;
      return next;
    });
  };

  const readiness = calcReadiness({ name, categoryId, slug, images, variants, shortDescription, description });
  const saveStatus = saved ? (
    <>
      <Check className="mr-1 inline h-3.5 w-3.5 text-primary" />
      Сохранено
    </>
  ) : (
    <>
      <Keyboard className="mr-1 inline h-3.5 w-3.5" />
      Ctrl+S для быстрого сохранения
    </>
  );
  const saveActions = (
    <div className="grid w-full grid-cols-[minmax(0,1fr)_auto] gap-2 sm:w-auto sm:flex sm:items-center">
      <Link
        href="/admin/products"
        className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border px-3 text-sm text-muted-foreground transition-colors hover:bg-primary/[0.05] hover:text-foreground sm:w-auto"
      >
        К списку
      </Link>
      <Button onClick={handleSave} disabled={saving || saved} size="sm" className="min-h-11 min-w-[148px]">
        {saved ? (
          <>
            <Check className="mr-2 h-4 w-4" />
            Сохранено
          </>
        ) : saving ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Сохраняем...
          </>
        ) : (
          <>
            <Save className="mr-2 h-4 w-4" />
            Сохранить
          </>
        )}
      </Button>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="admin-page-frame admin-page-frame-fluid pb-28">

      {/* ── Top bar ── */}
      <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
        <div className="flex min-w-0 items-start gap-3">
          {/* Prev / Next */}
          {!isNew && (
            <div className="flex shrink-0 items-center gap-1 rounded-xl border border-border bg-card p-1">
              <button
                onClick={() => prevId && router.push(`/admin/products/${prevId}`)}
                disabled={!prevId}
                className="inline-flex h-11 w-11 items-center justify-center rounded-lg transition-colors hover:bg-primary/[0.08] disabled:opacity-30"
                title="Предыдущий товар"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => nextId && router.push(`/admin/products/${nextId}`)}
                disabled={!nextId}
                className="inline-flex h-11 w-11 items-center justify-center rounded-lg transition-colors hover:bg-primary/[0.08] disabled:opacity-30"
                title="Следующий товар"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
          <div className="min-w-0 pt-1">
            <h1 className="break-words font-display text-xl font-bold leading-tight sm:text-2xl">
              {isNew ? "Новый товар" : name || "Редактирование"}
            </h1>
            {!isNew && slug && <p className="mt-0.5 truncate text-xs text-muted-foreground">/{slug}</p>}
          </div>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto lg:justify-end">
          {!isNew && slug && (
            <a
              href={`/product/${slug}`}
              target="_blank"
              title={active ? "Открыть товар на сайте" : "Открыть публичный адрес черновика"}
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-primary/[0.08] sm:flex-none"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              {active ? "На сайте" : "Предпросмотр"}
            </a>
          )}
          {!isNew && (
            <button
              type="button"
              onClick={duplicateProduct}
              disabled={duplicating}
              title="Дублировать товар (создать копию с теми же вариантами)"
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-primary/[0.08] disabled:opacity-50 sm:flex-none"
            >
              {duplicating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">Дублировать</span>
            </button>
          )}
          {!isNew && (
            <Button variant="ghost" size="sm" onClick={() => setConfirmDeleteProduct(true)} className="min-h-11 min-w-11 text-destructive hover:text-destructive hover:bg-destructive/10">
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      <section className="rounded-2xl border border-border bg-card p-3 sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">
              {isNew ? "Создание товара" : "Редактирование товара"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Заполните данные, цены и фото. Сохранение находится внутри формы и не перекрывает помощника.
            </p>
          </div>
          {saveActions}
        </div>
      </section>

      {/* ── Readiness Bar (тонкая строка прогресса готовности для менеджера) ── */}
      {!isNew && readiness.percent === 100 && (
        <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground">
          <Check className="w-3.5 h-3.5 text-primary" />
          <span>Товар готов к публикации · SEO и Директ корректны</span>
        </div>
      )}
      {!isNew && readiness.percent < 100 && (
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl border border-border bg-primary/[0.03]">
          <div className="relative w-8 h-8 shrink-0">
            <svg className="w-8 h-8 -rotate-90" viewBox="0 0 40 40">
              <circle cx="20" cy="20" r="16" fill="none" stroke="hsl(var(--primary) / 0.12)" strokeWidth="5" />
              <circle
                cx="20" cy="20" r="16" fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="5"
                strokeDasharray={`${(readiness.percent / 100) * 100.53} 100.53`}
                strokeLinecap="round"
                className="transition-all duration-500"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-foreground">
              {readiness.percent}
            </span>
          </div>
          <p className="text-xs text-muted-foreground min-w-0 truncate">
            <span className="text-foreground font-medium">Не хватает:</span> {readiness.missing.join(" · ")}
          </p>
        </div>
      )}

      {/* ── 2-Column layout ── */}
      <div className="grid lg:grid-cols-[320px_1fr] gap-5">

        {/* ── LEFT: Photo ── */}
        <div className="space-y-3">
          {/* Photo preview */}
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <div
              className={cn(
                "relative aspect-[4/3] cursor-pointer transition-all sm:aspect-square",
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
                <AdminImagePreview src={images[0]} alt={name} fallbackLabel="Фото есть в базе, но превью не загрузилось" />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground bg-muted/30">
                  <Upload className="w-10 h-10 opacity-40" />
                  <p className="text-sm font-medium">Нажмите или перетащите фото</p>
                  <p className="text-xs opacity-60">JPG, PNG, WebP до 25MB</p>
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
                      <AdminImagePreview src={img} alt="" fallbackLabel="Не загрузилось" />
                      {idx === 0 && (
                        <div className="absolute top-0.5 left-0.5 bg-primary text-primary-foreground text-[9px] font-semibold px-1.5 py-0.5 rounded">
                          Главное
                        </div>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); removeImage(idx); }}
                        className="absolute top-0.5 right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive/90 text-white opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100"
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
                <button
                  onClick={() => {
                    setImages([]);
                    setToast("Все фото убраны из товара. Нажмите «Сохранить», чтобы применить.");
                  }}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl border border-border/50 text-xs text-muted-foreground hover:text-destructive hover:border-destructive/30 transition-colors"
                >
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
              <span className="text-sm">{active ? "Активен на сайте" : "Скрыт с сайта"}</span>
              <button
                type="button"
                aria-label={active ? "Скрыть товар с сайта" : "Показать товар на сайте"}
                aria-pressed={active}
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
              <span className="text-sm flex items-center gap-1">
                {featured ? "Рекомендуемый" : "Обычный товар"} <Star className="w-3.5 h-3.5 text-amber-400" />
              </span>
              <button
                type="button"
                aria-label={featured ? "Убрать из рекомендуемых" : "Добавить в рекомендуемые"}
                aria-pressed={featured}
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

          {!isNew && productId && (
            <div className="hidden lg:block">
              <RelatedTasksPanel
                entityType="PRODUCT"
                entityId={productId}
                entityLabel={name || product?.name || "Товар"}
                entityHref={`/admin/products/${productId}`}
              />
            </div>
          )}
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
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Доска строганная сосна 1 сорт"
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <label className="block text-sm font-medium">Категория *</label>
                  <button
                    type="button"
                    onClick={() => setCategoryCreateOpen(true)}
                    className="inline-flex items-center gap-1 rounded-xl border border-primary/25 bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary transition-colors hover:bg-primary/15"
                  >
                    <Plus className="h-3 w-3" />
                    Новая
                  </button>
                </div>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">— Выберите —</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{formatCategoryOption(c, categories)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Slug (URL)</label>
                <input
                  value={slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  placeholder="doska-stroganaya-sosna"
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono"
                />
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <div className="mb-1.5 flex items-center justify-between gap-3">
                  <label className="block text-sm font-medium">Короткое описание для карточек</label>
                  <span className="text-[11px] text-muted-foreground">{shortDescription.trim().length}/155</span>
                </div>
                <textarea
                  value={shortDescription}
                  onChange={(e) => setShortDescription(e.target.value)}
                  rows={2}
                  placeholder="Одна короткая продающая фраза: что это, для чего подходит и ключевая польза."
                  className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
                  Эталон: 55–155 символов. Показывается в карточках каталога и под названием товара, поэтому без списков и длинных SEO-фраз.
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between gap-3 mb-1.5">
                  <label className="block text-sm font-medium">Полное SEO-описание товара</label>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <span className="hidden text-[11px] text-muted-foreground sm:inline">{description.trim().length}/450</span>
                    <button
                      type="button"
                      onClick={applyArayContentCore}
                      disabled={contentDrafting || !name.trim()}
                      title="ARAY соберёт короткое описание, SEO-текст и подсказки карточки из текущих данных"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-semibold bg-card text-primary border border-primary/30 hover:bg-primary/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {contentDrafting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                      {contentDrafting ? "Собираю..." : "ARAY Core"}
                    </button>
                    <button
                      type="button"
                      onClick={improveDescription}
                      disabled={improvingDesc || isNew}
                      title={isNew ? "Сначала сохраните товар" : "ARAY заполнит короткое и полное описание по эталону"}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-semibold bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {improvingDesc ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                      {improvingDesc ? "ARAY думает…" : "ARAY SEO"}
                    </button>
                  </div>
                </div>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={5}
                  placeholder="Полное описание: применение, материал/порода, сорт, размеры, доставка, кому подойдет. Пишите естественно, без набивки ключей."
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                />
                <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
                  Эталон: 180–450 символов пользы для покупателя. Этот текст идет в карточку товара, SEO и описание характеристик.
                </p>
                {improveError && (
                  <p className="mt-1.5 text-[11px] text-destructive">{improveError}</p>
                )}
                {contentDraftError && (
                  <p className="mt-1.5 text-[11px] text-destructive">{contentDraftError}</p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-background/55 p-3 sm:p-4">
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <label className="block text-sm font-medium">Подсказки в карточке</label>
                  <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                    Пустые поля работают автоматически. Если нужно, выберите или напишите до 3 продающих пунктов.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCardTags([])}
                  className="inline-flex h-8 shrink-0 items-center justify-center rounded-xl border border-border px-3 text-[11px] font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                >
                  Авто
                </button>
              </div>

              <div className="grid gap-2 sm:grid-cols-3">
                {[0, 1, 2].map((slot) => (
                  <input
                    key={slot}
                    value={cardTags[slot] || ""}
                    onChange={(e) => setCardTagSlot(slot, e.target.value)}
                    maxLength={34}
                    placeholder={insightSuggestions[slot] || `Подсказка ${slot + 1}`}
                    className="h-10 rounded-xl border border-border bg-card px-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                ))}
              </div>

              {insightSuggestions.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {insightSuggestions.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => addInsightSuggestion(tag)}
                      className="inline-flex items-center gap-1 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary transition-colors hover:bg-primary/15"
                    >
                      <Plus className="h-3 w-3" />
                      {tag}
                    </button>
                  ))}
                </div>
              )}

              <div className="mt-3 rounded-xl border border-border/70 bg-card/70 p-3">
                <p className="mb-2 text-[11px] font-semibold uppercase text-muted-foreground">Предпросмотр</p>
                <div className="grid gap-1.5">
                  {previewCardTags.map((tag) => (
                    <span key={tag} className="inline-flex min-w-0 items-center gap-1.5 text-xs font-semibold text-foreground/80">
                      <CheckCircle className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                      <span className="truncate">{tag}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Единица продажи</label>
              <div className="flex flex-wrap gap-2">
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

            {variants.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                <span className="text-muted-foreground">Массово по цене м³:</span>
                <button
                  type="button"
                  onClick={() => bulkPriceAdjust(10, "pricePerCube")}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-primary/20 text-primary hover:bg-primary/[0.08] hover:border-primary/40 transition-colors"
                  title="Поднять все цены за м³ на 10%"
                >
                  <TrendingUp className="w-3 h-3" /> +10%
                </button>
                <button
                  type="button"
                  onClick={() => bulkPriceAdjust(-10, "pricePerCube")}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-primary/20 text-primary hover:bg-primary/[0.08] hover:border-primary/40 transition-colors"
                  title="Снизить все цены за м³ на 10%"
                >
                  <TrendingDown className="w-3 h-3" /> −10%
                </button>
                <span className="text-muted-foreground/30 mx-1">·</span>
                <span className="text-muted-foreground">за шт:</span>
                <button
                  type="button"
                  onClick={() => bulkPriceAdjust(10, "pricePerPiece")}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-primary/20 text-primary hover:bg-primary/[0.08] hover:border-primary/40 transition-colors"
                  title="Поднять все цены за шт на 10%"
                >
                  <TrendingUp className="w-3 h-3" /> +10%
                </button>
                <button
                  type="button"
                  onClick={() => bulkPriceAdjust(-10, "pricePerPiece")}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-primary/20 text-primary hover:bg-primary/[0.08] hover:border-primary/40 transition-colors"
                  title="Снизить все цены за шт на 10%"
                >
                  <TrendingDown className="w-3 h-3" /> −10%
                </button>
              </div>
            )}

            {variants.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground border-2 border-dashed border-border rounded-xl">
                <p className="text-sm mb-2">Нет вариантов</p>
                <button onClick={addVariant} className="text-sm text-primary hover:underline">+ Добавить вариант</button>
              </div>
            ) : (
              <>
              <div className="space-y-2 md:hidden">
                {variants.map((v, idx) => (
                  <div
                    key={v.id || v._tempId}
                    className="rounded-2xl border border-border bg-background/60 p-3 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Размер
                        </label>
                        <input
                          value={v.size}
                          onChange={(e) => updateVariant(idx, "size", e.target.value)}
                          placeholder="50x150x6000"
                          className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      </div>
                      <button
                        onClick={() => removeVariant(idx)}
                        className="mt-5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
                        aria-label="Удалить вариант"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Цена м3
                        <input
                          type="number"
                          value={v.pricePerCube}
                          onChange={(e) => updateVariant(idx, "pricePerCube", e.target.value)}
                          placeholder="12000"
                          className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      </label>
                      <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Цена шт
                        <input
                          type="number"
                          value={v.pricePerPiece}
                          onChange={(e) => updateVariant(idx, "pricePerPiece", e.target.value)}
                          placeholder="420"
                          className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      </label>
                    </div>

                    <div className="grid grid-cols-[1fr_auto] items-end gap-2">
                      <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Шт/м3
                        <div className="relative mt-1">
                          <input
                            type="number"
                            value={v.piecesPerCube}
                            onChange={(e) => updateVariant(idx, "piecesPerCube", e.target.value)}
                            placeholder="28"
                            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 pr-10 text-sm font-normal normal-case tracking-normal text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                          />
                          <button
                            type="button"
                            onClick={() => recalcPieces(idx)}
                            title="Авто-расчет из размера"
                            className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-primary/70 transition-colors hover:bg-primary/15 hover:text-primary"
                          >
                            <Calculator className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </label>
                      <button
                        onClick={() => requestVariantStockToggle(idx)}
                        className={cn(
                          "flex min-h-[42px] items-center gap-2 rounded-xl border px-3 text-xs font-semibold transition-colors",
                          v.inStock
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                            : "border-border bg-muted/40 text-muted-foreground"
                        )}
                      >
                        <span
                          className={cn(
                            "h-2.5 w-2.5 rounded-full",
                            v.inStock ? "bg-emerald-400" : "bg-muted-foreground/50"
                          )}
                        />
                        {v.inStock ? "В наличии" : "Скрыт"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden overflow-x-auto -mx-5 px-5 md:block">
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
                      onClick={() => requestVariantStockToggle(idx)}
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
              </>
            )}
          </div>
        </div>
      </div>

      <section className="rounded-2xl border border-border bg-card p-3 sm:p-4 lg:sticky lg:bottom-5 lg:z-30">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">Проверьте товар перед сохранением</p>
            <p className="mt-1 text-xs text-muted-foreground">{saveStatus}</p>
          </div>
          {saveActions}
        </div>
      </section>

      {/* Toast (фидбек админских действий: сортировка, авто-расчёт и т.п.) */}
      <ActionToast message={toast} onDismiss={() => setToast(null)} />

      <AdminModal
        open={categoryCreateOpen}
        onClose={() => setCategoryCreateOpen(false)}
        title="Новая категория"
        subtitle="Создайте категорию и сразу выберите её для товара"
        size="sm"
        bodyClassName="space-y-4 px-5 py-4"
        footer={(
          <>
            <Button variant="ghost" onClick={() => setCategoryCreateOpen(false)} disabled={creatingCategory}>
              Отмена
            </Button>
            <Button onClick={createQuickCategory} disabled={creatingCategory || !quickCategoryName.trim()}>
              {creatingCategory ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Создать
            </Button>
          </>
        )}
      >
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Название</span>
          <input
            value={quickCategoryName}
            onChange={(e) => setQuickCategoryName(e.target.value)}
            placeholder="Например: Кедр"
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <span className="mt-1 block text-[11px] text-muted-foreground">
            URL будет создан автоматически: {slugify(quickCategoryName) || "category"}
          </span>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Родительская категория</span>
          <select
            value={quickCategoryParentId}
            onChange={(e) => setQuickCategoryParentId(e.target.value)}
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">Нет — основная категория</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {formatCategoryOption(category, categories)}
              </option>
            ))}
          </select>
        </label>
      </AdminModal>

      {/* Modals */}
      {photoEditorOpen && images[0] && (
        <PhotoEditor
          imageUrl={images[0]}
          onSave={(newUrl) => {
            setImages((prev) => [newUrl, ...prev.slice(1)]);
            setPhotoEditorOpen(false);
            setToast("Фото отредактировано. Нажмите «Сохранить», чтобы применить.");
          }}
          onClose={() => setPhotoEditorOpen(false)}
        />
      )}
      <MediaPickerModal
        open={mediaPickerOpen}
        onClose={() => setMediaPickerOpen(false)}
        onPick={(url) => {
          setImages((prev) => [url, ...prev.filter((item) => item !== url)]);
          setMediaPickerOpen(false);
          setToast("Фото выбрано из библиотеки. Нажмите «Сохранить», чтобы применить.");
        }}
      />
      {photoSearchOpen && (
        <PhotoSearch
          productId={productId ?? "new"}
          productName={name || "товар"}
          onPhotoAdded={(url) => {
            setImages(prev => prev.includes(url) ? prev : [url, ...prev]);
            setToast("Фото добавлено. Нажмите «Сохранить», чтобы применить.");
          }}
          onClose={() => setPhotoSearchOpen(false)}
        />
      )}

      <ConfirmDialog
        open={Boolean(pendingVariantStockToggle)}
        onClose={() => setPendingVariantStockToggle(null)}
        onConfirm={confirmVariantStockToggle}
        title={pendingVariantStockToggle?.nextInStock ? "Вернуть вариант в наличие?" : "Снять вариант с наличия?"}
        description={pendingVariantStockToggle
          ? `Вариант ${pendingVariantStockToggle.size} изменится на "${pendingVariantStockToggle.nextInStock ? "В наличии" : "Скрыт"}". Изменение применится после сохранения товара.`
          : undefined}
        confirmLabel={pendingVariantStockToggle?.nextInStock ? "Вернуть в наличие" : "Снять с наличия"}
        cancelLabel="Оставить как есть"
        variant="warning"
      />

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
