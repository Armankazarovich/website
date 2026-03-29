"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Upload, Save, Plus, Loader2, Check, ImageIcon, Trash2,
  Eye, EyeOff, ChevronUp, ChevronDown,
} from "lucide-react";

type Category = {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  sortOrder: number;
  _count: { products: number };
};

const HIDDEN_ORDER = 999;
const isHidden = (cat: Category) => cat.sortOrder >= HIDDEN_ORDER;

function CategoryRow({
  cat,
  isFirst,
  isLast,
  onUpdate,
  onDelete,
  onMove,
}: {
  cat: Category;
  isFirst: boolean;
  isLast: boolean;
  onUpdate: (id: string, data: Partial<Category>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onMove: (id: string, dir: "up" | "down") => Promise<void>;
}) {
  const [name, setName] = useState(cat.name);
  const [slug, setSlug] = useState(cat.slug);
  const [image, setImage] = useState(cat.image || "");
  const [manualUrl, setManualUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [moving, setMoving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hidden = isHidden(cat);

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

  const handleToggleVisibility = async () => {
    setToggling(true);
    await onUpdate(cat.id, { sortOrder: hidden ? undefined : HIDDEN_ORDER });
    setToggling(false);
  };

  const handleMove = async (dir: "up" | "down") => {
    setMoving(true);
    await onMove(cat.id, dir);
    setMoving(false);
  };

  return (
    <div className={`bg-card rounded-2xl border p-4 flex gap-4 transition-opacity ${hidden ? "opacity-60 border-border" : "border-border"}`}>
      {/* Drag handle / order arrows */}
      <div className="flex flex-col items-center gap-1 shrink-0 pt-1">
        <button
          onClick={() => handleMove("up")}
          disabled={isFirst || moving}
          className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-30 transition-colors"
          title="Переместить выше"
        >
          <ChevronUp className="w-4 h-4" />
        </button>
        <span className="text-xs font-mono text-muted-foreground w-6 text-center">
          {hidden ? "—" : cat.sortOrder}
        </span>
        <button
          onClick={() => handleMove("down")}
          disabled={isLast || moving}
          className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-30 transition-colors"
          title="Переместить ниже"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>

      {/* Photo */}
      <div className="shrink-0">
        <div className="relative w-24 rounded-xl overflow-hidden bg-muted border border-border" style={{ height: "72px" }}>
          {image ? (
            <Image src={image} alt={name} fill className="object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
              <ImageIcon className="w-6 h-6" />
            </div>
          )}
        </div>
        <div className="flex gap-1 mt-2">
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
            Фото
          </button>
          <span className="text-muted-foreground">|</span>
          <button onClick={() => setShowUrlInput(!showUrlInput)} className="text-xs text-muted-foreground hover:text-foreground">
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
                if (e.key === "Enter") { setImage(manualUrl); setManualUrl(""); setShowUrlInput(false); }
              }}
            />
            <button
              onClick={() => { setImage(manualUrl); setManualUrl(""); setShowUrlInput(false); }}
              className="px-2 py-1 bg-primary text-white rounded-lg text-xs"
            >✓</button>
          </div>
        )}
      </div>

      {/* Fields */}
      <div className="flex-1 min-w-0">
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Название</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Slug (URL)</label>
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        {/* Bottom row: stats + actions */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">
              Товаров: <strong className="text-foreground">{cat._count.products}</strong>
            </span>
            {hidden ? (
              <span className="inline-flex items-center gap-1 text-xs bg-amber-500/10 text-amber-600 border border-amber-500/20 px-2 py-0.5 rounded-full">
                <EyeOff className="w-3 h-3" /> Скрыта с сайта
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs bg-green-500/10 text-green-600 border border-green-500/20 px-2 py-0.5 rounded-full">
                <Eye className="w-3 h-3" /> Видна на сайте
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Visibility toggle */}
            <button
              onClick={handleToggleVisibility}
              disabled={toggling}
              title={hidden ? "Показать на сайте" : "Скрыть с сайта"}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                hidden
                  ? "bg-green-500/10 text-green-600 hover:bg-green-500/20 border border-green-500/20"
                  : "bg-muted text-muted-foreground hover:text-foreground hover:bg-accent border border-border"
              }`}
            >
              {toggling ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : hidden ? (
                <Eye className="w-3 h-3" />
              ) : (
                <EyeOff className="w-3 h-3" />
              )}
              {hidden ? "Показать" : "Скрыть"}
            </button>

            {/* Delete */}
            <button
              onClick={() => { if (confirm(`Удалить категорию «${cat.name}»?`)) onDelete(cat.id); }}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              title="Удалить категорию"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            {/* Save */}
            <Button size="sm" onClick={handleSave} disabled={saving || saved}>
              {saved ? (
                <><Check className="w-3 h-3 mr-1" /> Сохранено</>
              ) : saving ? (
                <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> ...</>
              ) : (
                <><Save className="w-3 h-3 mr-1" /> Сохранить</>
              )}
            </Button>
          </div>
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

  const visibleCats = categories.filter((c) => !isHidden(c));
  const hiddenCats = categories.filter((c) => isHidden(c));

  useEffect(() => {
    fetch("/api/admin/categories")
      .then((r) => r.json())
      .then((data) => { setCategories(data); setLoading(false); });
  }, []);

  const handleUpdate = async (id: string, data: Partial<Category>) => {
    // If toggling from hidden → visible, assign next sortOrder
    if (data.sortOrder === undefined && categories.find((c) => c.id === id && isHidden(c))) {
      data.sortOrder = visibleCats.length + 1;
    }
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

  const handleMove = async (id: string, dir: "up" | "down") => {
    const visible = [...visibleCats].sort((a, b) => a.sortOrder - b.sortOrder);
    const idx = visible.findIndex((c) => c.id === id);
    const swapIdx = dir === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= visible.length) return;

    const a = visible[idx];
    const b = visible[swapIdx];

    // Swap sortOrders
    await Promise.all([
      fetch(`/api/admin/categories/${a.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sortOrder: b.sortOrder }),
      }),
      fetch(`/api/admin/categories/${b.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sortOrder: a.sortOrder }),
      }),
    ]);

    setCategories((prev) =>
      prev.map((c) => {
        if (c.id === a.id) return { ...c, sortOrder: b.sortOrder };
        if (c.id === b.id) return { ...c, sortOrder: a.sortOrder };
        return c;
      })
    );
  };

  const handleCreate = async () => {
    if (!newName || !newSlug) return;
    setCreating(true);
    const res = await fetch("/api/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName, slug: newSlug, sortOrder: visibleCats.length + 1 }),
    });
    const created = await res.json();
    setCategories((prev) => [...prev, created]);
    setNewName(""); setNewSlug(""); setShowNew(false); setCreating(false);
  };

  const sortedVisible = [...visibleCats].sort((a, b) => a.sortOrder - b.sortOrder);

  if (loading)
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl">Категории</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {visibleCats.length} видимых · {hiddenCats.length} скрытых
          </p>
        </div>
        <Button onClick={() => setShowNew(!showNew)}>
          <Plus className="w-4 h-4 mr-2" /> Добавить
        </Button>
      </div>

      {/* Hint */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl px-4 py-3 text-sm text-muted-foreground">
        💡 Скрытые категории не видны посетителям сайта. Товары из них сохраняются.
        Стрелки ↑↓ меняют порядок в меню и на главной странице.
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
                  setNewSlug(e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""));
                }}
                placeholder="Сосна и ель"
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Slug (URL)</label>
              <input
                value={newSlug}
                onChange={(e) => setNewSlug(e.target.value)}
                placeholder="sosna-el"
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setShowNew(false)}>Отмена</Button>
            <Button onClick={handleCreate} disabled={creating || !newName || !newSlug}>
              {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Создать
            </Button>
          </div>
        </div>
      )}

      {/* Visible categories */}
      <div className="space-y-3">
        {sortedVisible.map((cat, idx) => (
          <CategoryRow
            key={cat.id}
            cat={cat}
            isFirst={idx === 0}
            isLast={idx === sortedVisible.length - 1}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
            onMove={handleMove}
          />
        ))}
      </div>

      {/* Hidden categories */}
      {hiddenCats.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            <EyeOff className="w-4 h-4" /> Скрытые категории
          </h2>
          {hiddenCats.map((cat) => (
            <CategoryRow
              key={cat.id}
              cat={cat}
              isFirst={true}
              isLast={true}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
              onMove={handleMove}
            />
          ))}
        </div>
      )}

      {categories.length === 0 && (
        <div className="text-center py-12 text-muted-foreground border-2 border-dashed border-border rounded-2xl">
          Категорий нет — создайте первую
        </div>
      )}
    </div>
  );
}
