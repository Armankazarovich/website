"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Upload, Save, Plus, Loader2, Check, ImageIcon, Trash2,
  Eye, EyeOff, ChevronUp, ChevronDown, Settings2,
} from "lucide-react";

type Category = {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  sortOrder: number;
  parentId: string | null;
  showInMenu: boolean;
  showInFooter: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  _count: { products: number };
};

const HIDDEN_ORDER = 999;
const isHidden = (cat: Category) => cat.sortOrder >= HIDDEN_ORDER;

// ── Компактная строка категории ───────────────────────────────
function CategoryRow({
  cat, isFirst, isLast, allCats,
  onUpdate, onDelete, onMove,
}: {
  cat: Category;
  isFirst: boolean;
  isLast: boolean;
  allCats: Category[];
  onUpdate: (id: string, data: Partial<Category>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onMove: (id: string, dir: "up" | "down") => Promise<void>;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [toggling, setToggling]   = useState(false);
  const [moving, setMoving]       = useState(false);
  const hidden = isHidden(cat);

  const handleToggle = async () => {
    setToggling(true);
    await onUpdate(cat.id, { sortOrder: hidden ? undefined : HIDDEN_ORDER });
    setToggling(false);
  };

  return (
    <>
      <div className={`bg-card rounded-xl border p-3 flex items-center gap-3 transition-opacity ${hidden ? "opacity-55" : ""}`}>
        {/* Стрелки порядка */}
        <div className="flex flex-col items-center gap-0.5 shrink-0">
          <button
            onClick={() => { setMoving(true); onMove(cat.id, "up").finally(() => setMoving(false)); }}
            disabled={isFirst || moving || hidden}
            className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-25 transition-colors"
          ><ChevronUp className="w-3.5 h-3.5" /></button>
          <span className="text-[10px] font-mono text-muted-foreground w-5 text-center">
            {hidden ? "—" : cat.sortOrder}
          </span>
          <button
            onClick={() => { setMoving(true); onMove(cat.id, "down").finally(() => setMoving(false)); }}
            disabled={isLast || moving || hidden}
            className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-25 transition-colors"
          ><ChevronDown className="w-3.5 h-3.5" /></button>
        </div>

        {/* Миниатюра */}
        <div className="w-14 h-10 rounded-lg overflow-hidden border bg-muted shrink-0 relative">
          {cat.image
            ? <Image src={cat.image} alt={cat.name} fill className="object-cover" unoptimized />
            : <div className="absolute inset-0 flex items-center justify-center"><ImageIcon className="w-4 h-4 text-muted-foreground" /></div>
          }
        </div>

        {/* Название + мета */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{cat.name}</p>
          <p className="text-[11px] text-muted-foreground truncate">
            {cat._count.products} товаров · /{cat.slug}
            {cat.parentId && <span className="ml-1 text-primary/60">↳ подкат.</span>}
          </p>
        </div>

        {/* Навигация-флаги */}
        <div className="hidden sm:flex items-center gap-1.5 shrink-0">
          {cat.showInMenu
            ? <span className="text-[10px] bg-green-500/10 text-green-600 border border-green-500/20 px-1.5 py-0.5 rounded-full">Меню</span>
            : <span className="text-[10px] bg-muted text-muted-foreground border border-border px-1.5 py-0.5 rounded-full line-through">Меню</span>
          }
          {cat.showInFooter
            ? <span className="text-[10px] bg-blue-500/10 text-blue-600 border border-blue-500/20 px-1.5 py-0.5 rounded-full">Футер</span>
            : <span className="text-[10px] bg-muted text-muted-foreground border border-border px-1.5 py-0.5 rounded-full line-through">Футер</span>
          }
        </div>

        {/* Статус видимости */}
        {hidden
          ? <span className="hidden sm:flex items-center gap-1 text-[11px] bg-amber-500/10 text-amber-600 border border-amber-500/20 px-2 py-0.5 rounded-full shrink-0">
              <EyeOff className="w-3 h-3" /> Скрыта
            </span>
          : <span className="hidden sm:flex items-center gap-1 text-[11px] bg-green-500/10 text-green-600 border border-green-500/20 px-2 py-0.5 rounded-full shrink-0">
              <Eye className="w-3 h-3" /> Видна
            </span>
        }

        {/* Действия */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleToggle}
            disabled={toggling}
            title={hidden ? "Показать на сайте" : "Скрыть с сайта"}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            {toggling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : hidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => setModalOpen(true)}
            title="Настройки"
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <Settings2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => { if (confirm(`Удалить «${cat.name}»?`)) onDelete(cat.id); }}
            title="Удалить"
            className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <CategoryModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        cat={cat}
        allCats={allCats}
        onSave={async (data) => {
          await onUpdate(cat.id, data);
          setModalOpen(false);
        }}
      />
    </>
  );
}

// ── Модальное окно настроек ───────────────────────────────────
function CategoryModal({
  open, onClose, cat, allCats, onSave,
}: {
  open: boolean;
  onClose: () => void;
  cat: Category | null;
  allCats: Category[];
  onSave: (data: Partial<Category> & { image?: string | null }) => Promise<void>;
}) {
  const [name, setName]                     = useState("");
  const [slug, setSlug]                     = useState("");
  const [image, setImage]                   = useState("");
  const [parentId, setParentId]             = useState<string>("");
  const [showInMenu, setShowInMenu]         = useState(true);
  const [showInFooter, setShowInFooter]     = useState(true);
  const [seoTitle, setSeoTitle]             = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [uploading, setUploading]           = useState(false);
  const [uploadError, setUploadError]       = useState("");
  const [dragOver, setDragOver]             = useState(false);
  const [saving, setSaving]                 = useState(false);
  const [saved, setSaved]                   = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Заполнить поля при открытии
  useEffect(() => {
    if (open) {
      setName(cat?.name ?? "");
      setSlug(cat?.slug ?? "");
      setImage(cat?.image || "");
      setParentId(cat?.parentId || "");
      setShowInMenu(cat?.showInMenu ?? true);
      setShowInFooter(cat?.showInFooter ?? true);
      setSeoTitle(cat?.seoTitle || "");
      setSeoDescription(cat?.seoDescription || "");
      setSaved(false);
      setUploadError("");
    }
  }, [open, cat]);

  const uploadFile = async (file: File) => {
    setUploading(true);
    setUploadError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "categories");
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.url) {
        setImage(data.url);
      } else {
        setUploadError(data.error || "Ошибка загрузки");
      }
    } catch (e) {
      setUploadError("Ошибка загрузки файла");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave({
      name, slug,
      image: image || null,
      parentId: parentId || null,
      showInMenu, showInFooter,
      seoTitle: seoTitle || null,
      seoDescription: seoDescription || null,
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 800);
  };

  // Исключаем текущую категорию из списка родителей
  const parentOptions = allCats.filter(c => c.id !== cat?.id && !isHidden(c));

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg w-[calc(100vw-2rem)] flex flex-col p-0 gap-0 max-h-[90dvh] overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-4 border-b border-border shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="w-4 h-4" />
            {cat ? cat.name : "Новая категория"}
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">

        {/* Фото + Основные поля */}
        <div className="flex gap-4">
          {/* Drag & drop зона */}
          <div className="shrink-0">
            <label className="block text-xs text-muted-foreground mb-1.5">Фото</label>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f); }} />
            <div
              className={`relative w-28 rounded-xl overflow-hidden border-2 border-dashed cursor-pointer transition-colors
                ${dragOver ? "border-primary bg-primary/10" : "border-border bg-muted hover:border-primary/50 hover:bg-muted/80"}`}
              style={{ height: "84px" }}
              onClick={() => !uploading && fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault(); setDragOver(false);
                const f = e.dataTransfer.files?.[0];
                if (f?.type.startsWith("image/")) uploadFile(f);
              }}
              title="Нажмите или перетащите фото"
            >
              {uploading ? (
                <div className="absolute inset-0 flex items-center justify-center bg-background/60">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                </div>
              ) : image ? (
                <Image src={image} alt="preview" fill className="object-cover" unoptimized />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground gap-1.5">
                  <Upload className="w-5 h-5" />
                  <span className="text-[10px]">Фото</span>
                </div>
              )}
              {dragOver && (
                <div className="absolute inset-0 flex items-center justify-center bg-primary/20 text-primary text-[10px] font-semibold">
                  Отпустить
                </div>
              )}
            </div>
            {image && (
              <button onClick={() => setImage("")} className="text-[10px] text-muted-foreground hover:text-destructive mt-1 w-full text-center">
                Убрать
              </button>
            )}
            {uploadError && (
              <p className="text-[10px] text-destructive mt-1 text-center">{uploadError}</p>
            )}
          </div>

          {/* Название + Slug */}
          <div className="flex-1 space-y-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Название</label>
              <input
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!cat) setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""));
                }}
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="Сосна и Ель"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Slug (URL)</label>
              <input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="sosna-el"
              />
            </div>
          </div>
        </div>

        {/* Навигация */}
        <div className="border-t pt-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Навигация</p>

          <div className="grid grid-cols-2 gap-2">
            <label className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-colors ${showInMenu ? "border-green-500/30 bg-green-500/5" : "border-border bg-muted/50"}`}>
              <input type="checkbox" checked={showInMenu} onChange={(e) => setShowInMenu(e.target.checked)} className="w-4 h-4 accent-green-500" />
              <div>
                <p className="text-xs font-medium">Меню шапки</p>
                <p className="text-[10px] text-muted-foreground">Главная навигация</p>
              </div>
            </label>
            <label className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-colors ${showInFooter ? "border-blue-500/30 bg-blue-500/5" : "border-border bg-muted/50"}`}>
              <input type="checkbox" checked={showInFooter} onChange={(e) => setShowInFooter(e.target.checked)} className="w-4 h-4 accent-blue-500" />
              <div>
                <p className="text-xs font-medium">Подвал</p>
                <p className="text-[10px] text-muted-foreground">Ссылки в футере</p>
              </div>
            </label>
          </div>

          <div>
            <label className="block text-xs text-muted-foreground mb-1">Родительская категория</label>
            <select
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">Нет — основная категория</option>
              {parentOptions.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* SEO */}
        <div className="border-t pt-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">SEO (Яндекс / Google)</p>

          <div>
            <label className="block text-xs text-muted-foreground mb-1">
              Title <span className="text-muted-foreground/60">({seoTitle.length}/70)</span>
            </label>
            <input
              value={seoTitle}
              onChange={(e) => setSeoTitle(e.target.value)}
              maxLength={70}
              placeholder={`${name || "Категория"} — купить в ПилоРус`}
              className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">
              Description <span className="text-muted-foreground/60">({seoDescription.length}/160)</span>
            </label>
            <textarea
              value={seoDescription}
              onChange={(e) => setSeoDescription(e.target.value)}
              maxLength={160}
              rows={2}
              placeholder={`Купить ${name || "товары категории"} от производителя. Низкие цены, доставка по Москве и МО.`}
              className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        </div>{/* end scroll area */}

        {/* Кнопки — fixed at bottom */}
        <div className="flex gap-2 justify-end px-5 py-4 border-t border-border shrink-0 bg-card">
          <Button variant="ghost" onClick={onClose}>Отмена</Button>
          <Button onClick={handleSave} disabled={saving || saved || !name || !slug}>
            {saved
              ? <><Check className="w-3.5 h-3.5 mr-1.5" /> Сохранено</>
              : saving
              ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Сохранение...</>
              : <><Save className="w-3.5 h-3.5 mr-1.5" /> Сохранить</>
            }
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Главная страница ──────────────────────────────────────────
export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading]       = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  const visibleCats = categories.filter((c) => !isHidden(c));
  const hiddenCats  = categories.filter((c) =>  isHidden(c));

  useEffect(() => {
    fetch("/api/admin/categories")
      .then((r) => r.json())
      .then((data) => { setCategories(data); setLoading(false); });
  }, []);

  const handleUpdate = async (id: string, data: Partial<Category>) => {
    // Если снимаем скрытие → назначить порядок
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
    const sorted = [...visibleCats].sort((a, b) => a.sortOrder - b.sortOrder);
    const idx     = sorted.findIndex((c) => c.id === id);
    const swapIdx = dir === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const a = sorted[idx];
    const b = sorted[swapIdx];
    await Promise.all([
      fetch(`/api/admin/categories/${a.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sortOrder: b.sortOrder }) }),
      fetch(`/api/admin/categories/${b.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sortOrder: a.sortOrder }) }),
    ]);
    setCategories((prev) =>
      prev.map((c) => {
        if (c.id === a.id) return { ...c, sortOrder: b.sortOrder };
        if (c.id === b.id) return { ...c, sortOrder: a.sortOrder };
        return c;
      })
    );
  };

  const handleCreate = async (data: Partial<Category> & { image?: string | null }) => {
    const res = await fetch("/api/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, sortOrder: visibleCats.length + 1 }),
    });
    const created = await res.json();
    setCategories((prev) => [...prev, created]);
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
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> Добавить
        </Button>
      </div>

      <div className="bg-primary/5 border border-primary/20 rounded-xl px-4 py-3 text-sm text-muted-foreground">
        💡 Стрелки ↑↓ — порядок в меню и каталоге. <strong>⚙️ Настройки</strong> — фото, SEO, навигация, подкатегория.
      </div>

      {/* Видимые */}
      <div className="space-y-2">
        {sortedVisible.map((cat, idx) => (
          <CategoryRow
            key={cat.id} cat={cat}
            isFirst={idx === 0} isLast={idx === sortedVisible.length - 1}
            allCats={categories}
            onUpdate={handleUpdate} onDelete={handleDelete} onMove={handleMove}
          />
        ))}
      </div>

      {/* Скрытые */}
      {hiddenCats.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            <EyeOff className="w-3.5 h-3.5" /> Скрытые категории
          </h2>
          {hiddenCats.map((cat) => (
            <CategoryRow
              key={cat.id} cat={cat}
              isFirst isLast
              allCats={categories}
              onUpdate={handleUpdate} onDelete={handleDelete} onMove={handleMove}
            />
          ))}
        </div>
      )}

      {categories.length === 0 && (
        <div className="text-center py-12 text-muted-foreground border-2 border-dashed border-border rounded-2xl">
          Категорий нет — создайте первую
        </div>
      )}

      {/* Модалка создания */}
      <CategoryModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        cat={null}
        allCats={categories}
        onSave={async (data) => {
          await handleCreate(data);
          setCreateOpen(false);
        }}
      />
    </div>
  );
}
