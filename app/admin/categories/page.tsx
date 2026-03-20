"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Upload, Save, Plus, Loader2, Check, ImageIcon, Trash2 } from "lucide-react";

type Category = {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  sortOrder: number;
  _count: { products: number };
};

function CategoryRow({
  cat,
  onUpdate,
  onDelete,
}: {
  cat: Category;
  onUpdate: (id: string, data: Partial<Category>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [name, setName] = useState(cat.name);
  const [slug, setSlug] = useState(cat.slug);
  const [image, setImage] = useState(cat.image || "");
  const [manualUrl, setManualUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", "categories");
    const res = await fetch("/api/admin/upload", { method: "POST", body: formData });
    const data = await res.json();
    if (data.url) setImage(data.url);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSave = async () => {
    setSaving(true);
    await onUpdate(cat.id, { name, slug, image: image || null });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="bg-card rounded-2xl border border-border p-4 flex gap-4">
      {/* Photo */}
      <div className="shrink-0">
        <div
          className="relative w-24 rounded-xl overflow-hidden bg-muted border border-border"
          style={{ height: "72px" }}
        >
          {image ? (
            <Image src={image} alt={name} fill className="object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
              <ImageIcon className="w-6 h-6" />
            </div>
          )}
        </div>
        <div className="flex gap-1 mt-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            {uploading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Upload className="w-3 h-3" />
            )}
            Загрузить
          </button>
          <span className="text-muted-foreground">|</span>
          <button
            onClick={() => setShowUrlInput(!showUrlInput)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            URL
          </button>
        </div>
        {showUrlInput && (
          <div className="mt-2 flex gap-1">
            <input
              value={manualUrl}
              onChange={(e) => setManualUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-2 py-1 text-xs rounded-lg border border-border bg-background focus:outline-none"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setImage(manualUrl);
                  setManualUrl("");
                  setShowUrlInput(false);
                }
              }}
            />
            <button
              onClick={() => {
                setImage(manualUrl);
                setManualUrl("");
                setShowUrlInput(false);
              }}
              className="px-2 py-1 bg-primary text-white rounded-lg text-xs"
            >
              ✓
            </button>
          </div>
        )}
      </div>

      {/* Fields */}
      <div className="flex-1 grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Название</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Slug</label>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Товаров:</span>
          <span className="text-sm font-semibold">{cat._count.products}</span>
        </div>
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => {
              if (confirm("Удалить категорию?")) onDelete(cat.id);
            }}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <Button size="sm" onClick={handleSave} disabled={saving || saved}>
            {saved ? (
              <>
                <Check className="w-3 h-3 mr-1" /> Сохранено
              </>
            ) : saving ? (
              <>
                <Loader2 className="w-3 h-3 mr-1 animate-spin" /> ...
              </>
            ) : (
              <>
                <Save className="w-3 h-3 mr-1" /> Сохранить
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetch("/api/admin/categories")
      .then((r) => r.json())
      .then((data) => {
        setCategories(data);
        setLoading(false);
      });
  }, []);

  const handleUpdate = async (id: string, data: Partial<Category>) => {
    const res = await fetch(`/api/admin/categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const updated = await res.json();
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, ...updated } : c)));
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/admin/categories/${id}`, { method: "DELETE" });
    setCategories((prev) => prev.filter((c) => c.id !== id));
  };

  const handleCreate = async () => {
    if (!newName || !newSlug) return;
    setCreating(true);
    const res = await fetch("/api/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName, slug: newSlug, sortOrder: categories.length }),
    });
    const created = await res.json();
    setCategories((prev) => [...prev, created]);
    setNewName("");
    setNewSlug("");
    setShowNew(false);
    setCreating(false);
  };

  if (loading)
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="font-display font-bold text-2xl">Категории</h1>
        <Button onClick={() => setShowNew(!showNew)}>
          <Plus className="w-4 h-4 mr-2" /> Добавить категорию
        </Button>
      </div>

      {showNew && (
        <div className="bg-card rounded-2xl border border-primary/30 p-4 space-y-3">
          <h3 className="font-semibold">Новая категория</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Название</label>
              <input
                value={newName}
                onChange={(e) => {
                  setNewName(e.target.value);
                  setNewSlug(
                    e.target.value
                      .toLowerCase()
                      .replace(/\s+/g, "-")
                      .replace(/[^a-z0-9-]/g, "")
                  );
                }}
                placeholder="Сосна и ель"
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Slug</label>
              <input
                value={newSlug}
                onChange={(e) => setNewSlug(e.target.value)}
                placeholder="sosna-el"
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setShowNew(false)}>
              Отмена
            </Button>
            <Button onClick={handleCreate} disabled={creating || !newName || !newSlug}>
              {creating ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Создать
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {categories.map((cat) => (
          <CategoryRow key={cat.id} cat={cat} onUpdate={handleUpdate} onDelete={handleDelete} />
        ))}
        {categories.length === 0 && (
          <div className="text-center py-12 text-muted-foreground border-2 border-dashed border-border rounded-2xl">
            Категорий нет
          </div>
        )}
      </div>
    </div>
  );
}
