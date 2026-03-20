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
} from "lucide-react";

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

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", "products");
    const res = await fetch("/api/admin/upload", { method: "POST", body: formData });
    const data = await res.json();
    if (data.url) {
      setImages([data.url]);
    }
    setUploadingPhoto(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
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
                  <Image src={images[0]} alt={name} fill className="object-cover" />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <ImageIcon className="w-12 h-12" />
                    <span className="text-sm">Нет фото</span>
                  </div>
                )}
              </div>
              {images[0] && (
                <p className="text-xs text-muted-foreground mt-2 font-mono">{images[0]}</p>
              )}
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold">Загрузить новое фото</h3>

              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  className="gap-2"
                >
                  {uploadingPhoto ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Загрузка...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" /> Выбрать файл
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground mt-2">JPG, PNG, WEBP — до 10 МБ</p>
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
