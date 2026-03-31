"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Save,
  Trash2,
  Plus,
  Upload,
  ImageIcon,
  Check,
  Loader2,
  Sparkles,
  Wand2,
  PenTool,
} from "lucide-react";
import { PhotoEditor } from "@/components/admin/photo-editor";

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
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<"main" | "photo" | "variants">("main");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
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
  const [manualImageUrl, setManualImageUrl] = useState("");

  useEffect(() => {
    fetch("/api/admin/categories")
      .then((r) => r.json())
      .then(setCategories);
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
            p.variants.map((v) => ({
              id: v.id,
              size: v.size,
              pricePerCube: v.pricePerCube ? String(v.pricePerCube) : "",
              pricePerPiece: v.pricePerPiece ? String(v.pricePerPiece) : "",
              piecesPerCube: v.piecesPerCube ? String(v.piecesPerCube) : "",
              inStock: v.inStock,
            }))
          );
          setLoading(false);
        });
    }
  }, [params.id, isNew]);

  const [dragOverPhoto, setDragOverPhoto] = useState(false);
  const [photoEditorOpen, setPhotoEditorOpen] = useState(false);
  const [removingBg, setRemovingBg] = useState(false);
  const [bgRemoveProgress, setBgRemoveProgress] = useState("");
  // Auto-pipeline: remove bg + apply watermark automatically on upload
  const [autoPipeline, setAutoPipeline] = useState(false);
  const [pipelineProgress, setPipelineProgress] = useState("");

  const handleRemoveBackground = async () => {
    if (!images[0]) return;
    setRemovingBg(true);
    setBgRemoveProgress("Скачиваем фото...");
    try {
      // Fetch the current image and send to server-side AI endpoint
      const response = await fetch(images[0]);
      const blob = await response.blob();

      setBgRemoveProgress("AI убирает фон...");
      const formData = new FormData();
      formData.append("file", new File([blob], "photo.png", { type: blob.type }));

      const res = await fetch("/api/admin/remove-bg", { method: "POST", body: formData });
      const data = await res.json();

      if (data.url) {
        setImages([data.url]);
        setBgRemoveProgress("Готово!");
        setTimeout(() => setBgRemoveProgress(""), 2000);
      } else {
        throw new Error(data.error || "No URL returned");
      }
    } catch (e) {
      console.error(e);
      setBgRemoveProgress("Ошибка обработки");
      setTimeout(() => setBgRemoveProgress(""), 3000);
    } finally {
      setRemovingBg(false);
    }
  };

  const uploadPhotoFile = async (file: File) => {
    setUploadingPhoto(true);
    setPipelineProgress("");
    try {
      // Step 1: Upload original
      setPipelineProgress(autoPipeline ? "Загружаем фото..." : "");
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "products");
      const res = await fetch("/api/admin/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!data.url) { alert(data.error || "Ошибка загрузки фото"); return; }

      let finalUrl = data.url;

      if (autoPipeline) {
        // Step 2: Remove background
        setPipelineProgress("AI убирает фон...");
        try {
          const imgRes = await fetch(finalUrl);
          const blob = await imgRes.blob();
          const bgForm = new FormData();
          bgForm.append("file", new File([blob], "photo.png", { type: blob.type }));
          const bgRes = await fetch("/api/admin/remove-bg", { method: "POST", body: bgForm });
          const bgData = await bgRes.json();
          if (bgData.url) finalUrl = bgData.url;
        } catch { /* continue without bg removal */ }

        // Step 3: Apply watermark
        setPipelineProgress("Накладываем водяной знак...");
        try {
          const wmRes = await fetch("/api/admin/watermark", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "apply", imageUrl: finalUrl }),
          });
          const wmData = await wmRes.json();
          if (wmData.url && !wmData.error) finalUrl = wmData.url;
        } catch { /* continue without watermark */ }

        setPipelineProgress("Готово! ✓");
        setTimeout(() => setPipelineProgress(""), 2500);
      }

      setImages([finalUrl]);
    } catch {
      alert("Ошибка загрузки фото");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadPhotoFile(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handlePhotoDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverPhoto(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) await uploadPhotoFile(file);
  };

  const handleManualUrl = () => {
    if (manualImageUrl.trim()) {
      setImages([manualImageUrl.trim()]);
      setManualImageUrl("");
    }
  };

  const addVariant = () => {
    setVariants((prev) => [
      ...prev,
      {
        size: "",
        pricePerCube: "",
        pricePerPiece: "",
        piecesPerCube: "",
        inStock: true,
        _tempId: `temp-${Date.now()}-${Math.random()}`,
      },
    ]);
  };

  const removeVariant = (idx: number) => {
    setVariants((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateVariant = (idx: number, field: keyof Variant, value: string | boolean) => {
    setVariants((prev) => prev.map((v, i) => (i === idx ? { ...v, [field]: value } : v)));
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = { name, slug, description, categoryId, images, saleUnit, active, featured, variants };
    let res;
    if (isNew) {
      res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      res = await fetch(`/api/admin/products/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }
    const data = await res.json();
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      if (isNew && data.id) {
        router.replace(`/admin/products/${data.id}`);
      }
    }
  };

  const handleDelete = async () => {
    if (!confirm("Удалить товар? Это действие нельзя отменить.")) return;
    await fetch(`/api/admin/products/${params.id}`, { method: "DELETE" });
    router.push("/admin/products");
  };

  const tabs = [
    { id: "main", label: "Основное" },
    { id: "photo", label: "Фото" },
    { id: "variants", label: `Варианты (${variants.length})` },
  ] as const;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/products"
            className="p-2 rounded-xl hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="font-display font-bold text-2xl">
              {isNew ? "Новый товар" : name}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isNew ? "Создание нового товара" : `/${slug}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isNew && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
          <Button onClick={handleSave} disabled={saving || saved} className="min-w-[120px]">
            {saved ? (
              <>
                <Check className="w-4 h-4 mr-2" /> Сохранено
              </>
            ) : saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Сохранение...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" /> Сохранить
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted/50 p-1 rounded-xl w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-card shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-card rounded-2xl border border-border p-6">
        {/* TAB: Main */}
        {activeTab === "main" && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1.5">Название товара *</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Доска строганная сосна 1 сорт"
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Slug (URL)</label>
                <input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="doska-stroganaya-sosna"
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Категория *</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">— Выберите категорию —</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Описание</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Описание товара, характеристики, особенности..."
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Единица продажи</label>
              <div className="flex gap-2">
                {[
                  { value: "BOTH", label: "м³ и штуки" },
                  { value: "CUBE", label: "Только м³" },
                  { value: "PIECE", label: "Только штуки" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setSaleUnit(opt.value)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                      saleUnit === opt.value
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card border-border hover:bg-muted"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="w-4 h-4 accent-primary"
                />
                <span className="text-sm font-medium">Активен (виден на сайте)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={featured}
                  onChange={(e) => setFeatured(e.target.checked)}
                  className="w-4 h-4 accent-primary"
                />
                <span className="text-sm font-medium">Рекомендуемый (на главной)</span>
              </label>
            </div>
          </div>
        )}

        {/* TAB: Photo */}
        {activeTab === "photo" && (
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold mb-4">Текущее фото</h3>
              <div className="relative w-72 h-52 rounded-2xl overflow-hidden bg-muted border border-border">
                {images[0] ? (
                  <Image src={images[0]} alt={name} fill className="object-cover" unoptimized />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <ImageIcon className="w-12 h-12" />
                    <span className="text-sm">Нет фото</span>
                  </div>
                )}
              </div>
              {images[0] && (
                <p className="text-xs text-muted-foreground mt-2 font-mono truncate max-w-xs">{images[0]}</p>
              )}

              {/* AI Tools */}
              {images[0] && (
                <div className="mt-3 space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {/* Photo Editor */}
                    <button
                      onClick={() => setPhotoEditorOpen(true)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm font-semibold hover:from-blue-600 hover:to-indigo-700 transition-all shadow-md shadow-blue-500/20 active:scale-95"
                    >
                      <PenTool className="w-4 h-4 shrink-0" />
                      <span>🎨 Редактор фото</span>
                    </button>

                    {/* AI Remove Background */}
                    <button
                      onClick={handleRemoveBackground}
                      disabled={removingBg}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white text-sm font-semibold hover:from-violet-600 hover:to-purple-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-md shadow-purple-500/20 active:scale-95"
                    >
                      {removingBg ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                          <span>{bgRemoveProgress || "Обрабатываем..."}</span>
                        </>
                      ) : bgRemoveProgress === "Готово!" ? (
                        <>
                          <Check className="w-4 h-4 shrink-0" />
                          <span>Фон удалён!</span>
                        </>
                      ) : (
                        <>
                          <Wand2 className="w-4 h-4 shrink-0" />
                          <span>✨ Убрать фон (AI)</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Сервер убирает фон через AI — без задержек в браузере
                  </p>
                </div>
              )}

              {/* Photo Editor Modal */}
              {photoEditorOpen && images[0] && (
                <PhotoEditor
                  imageUrl={images[0]}
                  onSave={(newUrl) => setImages([newUrl])}
                  onClose={() => setPhotoEditorOpen(false)}
                />
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Загрузить новое фото</h3>
                {/* Auto-pipeline toggle */}
                <button
                  onClick={() => setAutoPipeline((v) => !v)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                    autoPipeline
                      ? "bg-violet-500/15 border-violet-500/40 text-violet-500"
                      : "border-border text-muted-foreground hover:bg-accent"
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${autoPipeline ? "bg-violet-500" : "bg-muted-foreground/40"}`} />
                  Авто: убрать фон + лого
                </button>
              </div>
              {autoPipeline && (
                <p className="text-xs text-violet-400/80 -mt-2">
                  ✨ При загрузке: AI уберёт фон → наложит водяной знак автоматически
                </p>
              )}

              <div>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                <div
                  className={`relative rounded-2xl border-2 border-dashed cursor-pointer transition-all flex flex-col items-center justify-center gap-2 py-8
                    ${dragOverPhoto
                      ? "border-primary bg-primary/10 scale-[1.02]"
                      : "border-border hover:border-primary/60 hover:bg-muted/50"
                    }`}
                  onClick={() => !uploadingPhoto && fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDragOverPhoto(true); }}
                  onDragLeave={() => setDragOverPhoto(false)}
                  onDrop={handlePhotoDrop}
                >
                  {uploadingPhoto ? (
                    <>
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                      <p className="text-sm text-muted-foreground">
                        {pipelineProgress || "Загрузка и оптимизация..."}
                      </p>
                    </>
                  ) : dragOverPhoto ? (
                    <>
                      <Upload className="w-8 h-8 text-primary" />
                      <p className="text-sm font-semibold text-primary">Отпустите для загрузки</p>
                    </>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Перетащите фото сюда</p>
                      <p className="text-xs text-muted-foreground">или нажмите для выбора файла</p>
                      <p className="text-xs text-muted-foreground/60 mt-1">JPG, PNG, WEBP → авто-сжатие в WebP</p>
                    </>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Или вставить URL</label>
                <div className="flex gap-2">
                  <input
                    value={manualImageUrl}
                    onChange={(e) => setManualImageUrl(e.target.value)}
                    placeholder="https://example.com/photo.jpg"
                    className="flex-1 px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    onKeyDown={(e) => e.key === "Enter" && handleManualUrl()}
                  />
                  <Button
                    variant="outline"
                    onClick={handleManualUrl}
                    disabled={!manualImageUrl.trim()}
                  >
                    Применить
                  </Button>
                </div>
              </div>

              {images[0] && (
                <button
                  onClick={() => setImages([])}
                  className="text-sm text-destructive hover:underline"
                >
                  Удалить фото
                </button>
              )}
            </div>
          </div>
        )}

        {/* TAB: Variants */}
        {activeTab === "variants" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Варианты товара</h3>
              <Button size="sm" variant="outline" onClick={addVariant}>
                <Plus className="w-4 h-4 mr-1" /> Добавить
              </Button>
            </div>

            {variants.length === 0 && (
              <div className="text-center py-10 text-muted-foreground border-2 border-dashed border-border rounded-xl">
                <p className="mb-3">Нет вариантов</p>
                <Button size="sm" variant="outline" onClick={addVariant}>
                  <Plus className="w-4 h-4 mr-1" /> Добавить вариант
                </Button>
              </div>
            )}

            <div className="space-y-3">
              {variants.map((v, idx) => (
                <div
                  key={v.id || v._tempId}
                  className="grid gap-3 p-4 bg-muted/30 rounded-xl border border-border"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground w-4">
                      #{idx + 1}
                    </span>
                    <div className="flex-1">
                      <label className="block text-xs text-muted-foreground mb-1">
                        Размер / Сечение
                      </label>
                      <input
                        value={v.size}
                        onChange={(e) => updateVariant(idx, "size", e.target.value)}
                        placeholder="50×150×6000"
                        className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                    <button
                      onClick={() => removeVariant(idx)}
                      className="ml-auto p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-3 ml-6">
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">
                        Цена за м³ (₽)
                      </label>
                      <input
                        type="number"
                        value={v.pricePerCube}
                        onChange={(e) => updateVariant(idx, "pricePerCube", e.target.value)}
                        placeholder="12000"
                        className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">
                        Цена за штуку (₽)
                      </label>
                      <input
                        type="number"
                        value={v.pricePerPiece}
                        onChange={(e) => updateVariant(idx, "pricePerPiece", e.target.value)}
                        placeholder="420"
                        className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Шт/м³</label>
                      <input
                        type="number"
                        value={v.piecesPerCube}
                        onChange={(e) => updateVariant(idx, "piecesPerCube", e.target.value)}
                        placeholder="28"
                        className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                  </div>

                  <div className="ml-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={v.inStock}
                        onChange={(e) => updateVariant(idx, "inStock", e.target.checked)}
                        className="w-4 h-4 accent-primary"
                      />
                      <span className="text-sm">В наличии</span>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom save bar */}
      <div className="flex items-center justify-between pt-2 pb-6">
        <Link
          href="/admin/products"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Назад к товарам
        </Link>
        <Button onClick={handleSave} disabled={saving || saved} size="lg">
          {saved ? (
            <>
              <Check className="w-4 h-4 mr-2" /> Сохранено!
            </>
          ) : saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Сохранение...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" /> Сохранить изменения
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
