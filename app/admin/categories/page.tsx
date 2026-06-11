"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Upload, Save, Plus, Loader2, Check, ImageIcon, Trash2,
  Eye, EyeOff, ChevronUp, ChevronDown, Settings2,
  CornerDownRight, FolderTree,
} from "lucide-react";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { AdminModal } from "@/components/admin/admin-modal";
import { slugify } from "@/lib/slug";

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
  parent?: { id: string; name: string; slug: string } | null;
  children?: Array<{ id: string; name: string; slug: string; sortOrder: number; showInMenu: boolean; showInFooter: boolean }>;
  _count: { products: number; children?: number };
};

const HIDDEN_ORDER = 999;
const isHidden = (cat: Category) => cat.sortOrder >= HIDDEN_ORDER || (!cat.showInMenu && !cat.showInFooter);

function getDescendantIds(categories: Category[], id: string) {
  const ids = new Set<string>();
  const walk = (parentId: string) => {
    categories
      .filter((category) => category.parentId === parentId)
      .forEach((category) => {
        ids.add(category.id);
        walk(category.id);
      });
  };
  walk(id);
  return ids;
}

function sortCategories(a: Category, b: Category) {
  return Number(isHidden(a)) - Number(isHidden(b)) || a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "ru");
}

function flattenCategoryTree(categories: Category[]) {
  const byParent = new Map<string, Category[]>();
  const used = new Set<string>();

  categories.forEach((category) => {
    const key = category.parentId || "root";
    byParent.set(key, [...(byParent.get(key) ?? []), category]);
  });

  const rows: Array<{ category: Category; depth: number }> = [];
  const walk = (parentId: string, depth: number) => {
    const list = [...(byParent.get(parentId) ?? [])].sort(sortCategories);
    list.forEach((category) => {
      if (used.has(category.id)) return;
      used.add(category.id);
      rows.push({ category, depth });
      walk(category.id, depth + 1);
    });
  };

  walk("root", 0);
  categories
    .filter((category) => !used.has(category.id))
    .sort(sortCategories)
    .forEach((category) => rows.push({ category, depth: 0 }));

  return rows;
}

// ── Компактная строка категории ───────────────────────────────
function CategoryRow({
  cat, depth, isFirst, isLast, allCats,
  onUpdate, onDelete, onMove,
}: {
  cat: Category;
  depth: number;
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
  const [confirmToggle, setConfirmToggle] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const hidden = isHidden(cat);

  const handleToggle = async () => {
    setToggling(true);
    try {
      await onUpdate(cat.id, hidden
        ? { sortOrder: undefined, showInMenu: true, showInFooter: true }
        : { sortOrder: HIDDEN_ORDER, showInMenu: false, showInFooter: false });
    } finally {
      setToggling(false);
    }
  };

  return (
    <>
      <div
        className={`bg-card rounded-xl border p-3 flex items-center gap-3 transition-opacity ${hidden ? "opacity-55" : ""} ${depth > 0 ? "border-l-primary/35" : ""}`}
        style={{ marginLeft: depth ? Math.min(depth, 3) * 18 : 0 }}
      >
        {/* Стрелки порядка */}
        <div className="flex flex-col items-center gap-0.5 shrink-0">
          <button
            onClick={() => { setMoving(true); onMove(cat.id, "up").finally(() => setMoving(false)); }}
            disabled={isFirst || moving || hidden}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-25 transition-colors md:min-h-0 md:min-w-0"
          ><ChevronUp className="w-3.5 h-3.5" /></button>
          <span className="text-[10px] font-mono text-muted-foreground w-5 text-center">
            {hidden ? "—" : cat.sortOrder}
          </span>
          <button
            onClick={() => { setMoving(true); onMove(cat.id, "down").finally(() => setMoving(false)); }}
            disabled={isLast || moving || hidden}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-25 transition-colors md:min-h-0 md:min-w-0"
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
          <p className="flex items-center gap-1.5 font-medium text-sm truncate">
            {depth > 0 && <CornerDownRight className="h-3.5 w-3.5 shrink-0 text-primary" />}
            <span className="truncate">{cat.name}</span>
          </p>
          <p className="text-[11px] text-muted-foreground truncate">
            {cat._count.products} товаров · /{cat.slug}
            {(cat._count.children ?? 0) > 0 && <span className="ml-1 text-primary/70">· {cat._count.children} подкат.</span>}
            {cat.parent?.name && <span className="ml-1 text-primary/60">· в {cat.parent.name}</span>}
          </p>
        </div>

        {/* Навигация-флаги */}
        <div className="hidden sm:flex items-center gap-1.5 shrink-0">
          {cat.showInMenu
            ? <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded-full">Меню</span>
            : <span className="text-[10px] bg-muted text-muted-foreground border border-border px-1.5 py-0.5 rounded-full line-through">Меню</span>
          }
          {cat.showInFooter
            ? <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded-full">Футер</span>
            : <span className="text-[10px] bg-muted text-muted-foreground border border-border px-1.5 py-0.5 rounded-full line-through">Футер</span>
          }
        </div>

        {/* Статус видимости */}
        {hidden
          ? <span className="hidden sm:flex items-center gap-1 text-[11px] bg-amber-500/10 text-amber-600 border border-amber-500/20 px-2 py-0.5 rounded-full shrink-0">
              <EyeOff className="w-3 h-3" /> Скрыта
            </span>
          : <span className="hidden sm:flex items-center gap-1 text-[11px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full shrink-0">
              <Eye className="w-3 h-3" /> Видна
            </span>
        }

        {/* Действия */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setConfirmToggle(true)}
            disabled={toggling}
            title={hidden ? "Показать на сайте" : "Скрыть с сайта"}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent transition-colors md:min-h-0 md:min-w-0"
          >
            {toggling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : hidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => setModalOpen(true)}
            title="Настройки"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent transition-colors md:min-h-0 md:min-w-0"
          >
            <Settings2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            title="Удалить"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center p-1.5 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors md:min-h-0 md:min-w-0"
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
      <ConfirmDialog
        open={confirmToggle}
        onClose={() => setConfirmToggle(false)}
        onConfirm={() => {
          setConfirmToggle(false);
          void handleToggle();
        }}
        title={hidden ? `Показать «${cat.name}» на сайте?` : `Скрыть «${cat.name}» с сайта?`}
        description={hidden
          ? "Категория снова появится в навигации сайта."
          : "Категория исчезнет из меню и футера, товары останутся в каталоге."}
        confirmLabel={hidden ? "Показать" : "Скрыть"}
        variant="warning"
        loading={toggling}
      />
      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => { setConfirmDelete(false); onDelete(cat.id); }}
        title={`Удалить «${cat.name}»?`}
        description="Категория будет удалена. Товары категории не удаляются."
        confirmLabel="Удалить"
        variant="danger"
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
  const [slugTouched, setSlugTouched]       = useState(false);
  const [image, setImage]                   = useState("");
  const [parentId, setParentId]             = useState<string>("");
  const [showInMenu, setShowInMenu]         = useState(false);
  const [showInFooter, setShowInFooter]     = useState(false);
  const [seoTitle, setSeoTitle]             = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [uploading, setUploading]           = useState(false);
  const [uploadError, setUploadError]       = useState("");
  const [dragOver, setDragOver]             = useState(false);
  const [saving, setSaving]                 = useState(false);
  const [saved, setSaved]                   = useState(false);
  const [saveError, setSaveError]           = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Заполнить поля при открытии
  useEffect(() => {
    if (open) {
      setName(cat?.name ?? "");
      setSlug(cat?.slug ?? "");
      setSlugTouched(Boolean(cat?.slug));
      setImage(cat?.image || "");
      setParentId(cat?.parentId || "");
      setShowInMenu(cat ? cat.showInMenu : false);
      setShowInFooter(cat ? cat.showInFooter : false);
      setSeoTitle(cat?.seoTitle || "");
      setSeoDescription(cat?.seoDescription || "");
      setSaved(false);
      setUploadError("");
      setSaveError("");
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
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.error) {
        setUploadError(data.error || "Не удалось загрузить файл");
      } else if (data.url) {
        setImage(data.url);
      } else {
        setUploadError("Сервер не вернул URL файла");
      }
    } catch (e) {
      setUploadError("Ошибка загрузки файла");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError("");
    setSaved(false);
    try {
      await onSave({
        name, slug,
        image: image || null,
        parentId: parentId || null,
        showInMenu, showInFooter,
        seoTitle: seoTitle || null,
        seoDescription: seoDescription || null,
      });
      setSaved(true);
      setTimeout(() => { setSaved(false); onClose(); }, 800);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Не удалось сохранить категорию");
    } finally {
      setSaving(false);
    }
  };

  // Исключаем текущую категорию из списка родителей
  const blockedParents = cat ? getDescendantIds(allCats, cat.id) : new Set<string>();
  const parentOptions = allCats.filter(c => c.id !== cat?.id && !blockedParents.has(c.id) && !isHidden(c));

  const handleNameChange = (value: string) => {
    setName(value);
    if (!slugTouched) setSlug(slugify(value));
  };

  const handleSlugChange = (value: string) => {
    setSlugTouched(true);
    setSlug(slugify(value));
  };

  return (
    <AdminModal
      open={open}
      onClose={onClose}
      title={cat ? cat.name : "Новая категория"}
      subtitle="Фото, меню, футер, подкатегория и SEO"
      size="lg"
      bodyClassName="px-5 py-4 space-y-5"
      footer={(
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Отмена
          </Button>
          <Button onClick={handleSave} disabled={saving || saved || !name || !slug}>
            {saved
              ? <><Check className="w-3.5 h-3.5 mr-1.5" /> Сохранено</>
              : saving
              ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Сохранение...</>
              : <><Save className="w-3.5 h-3.5 mr-1.5" /> Сохранить</>
            }
          </Button>
        </>
      )}
    >

        {/* Фото + Основные поля */}
        <div className="flex flex-col gap-4 sm:flex-row">
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
          <div className="flex-1 min-w-0 space-y-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Название</label>
              <input
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="Сосна и Ель"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Slug (URL)</label>
              <input
                value={slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="sosna-el"
              />
            </div>
          </div>
        </div>

        {saveError && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {saveError}
          </div>
        )}

        {/* Навигация */}
        <div className="border-t pt-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Навигация</p>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-colors ${showInMenu ? "border-primary/30 bg-primary/5" : "border-border bg-muted/50"}`}>
              <input type="checkbox" checked={showInMenu} onChange={(e) => setShowInMenu(e.target.checked)} className="w-4 h-4 accent-primary" />
              <div>
                <p className="text-xs font-medium">Меню шапки</p>
                <p className="text-[10px] text-muted-foreground">Главная навигация</p>
              </div>
            </label>
            <label className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-colors ${showInFooter ? "border-primary/30 bg-primary/15" : "border-border bg-muted/50"}`}>
              <input type="checkbox" checked={showInFooter} onChange={(e) => setShowInFooter(e.target.checked)} className="w-4 h-4 accent-primary" />
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

    </AdminModal>
  );
}

// ── Главная страница ──────────────────────────────────────────
export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const visibleCats = categories.filter((c) => !isHidden(c));
  const hiddenCats  = categories.filter((c) =>  isHidden(c));

  useEffect(() => {
    let alive = true;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const r = await fetch("/api/admin/categories");
        const data = await r.json().catch(() => null);
        if (!r.ok) throw new Error(data?.error || "Не удалось загрузить категории");
        if (!Array.isArray(data)) throw new Error("API категорий вернул неожиданный ответ");
        if (alive) setCategories(data);
      } catch (err) {
        if (alive) setError(err instanceof Error ? err.message : "Не удалось загрузить категории");
      } finally {
        if (alive) setLoading(false);
      }
    };
    load();
    return () => { alive = false; };
  }, []);

  const readApi = async <T,>(res: Response, fallback: string): Promise<T> => {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || fallback);
    return data as T;
  };

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
    const updated = await readApi<Partial<Category>>(res, "Не удалось обновить категорию");
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, ...updated } : c)));
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/admin/categories/${id}`, { method: "DELETE" });
    await readApi(res, "Не удалось удалить категорию");
    setCategories((prev) => prev.filter((c) => c.id !== id));
  };

  const handleMove = async (id: string, dir: "up" | "down") => {
    const target = categories.find((category) => category.id === id);
    if (!target) return;
    const sorted = categories
      .filter((category) => !isHidden(category) && (category.parentId || "") === (target.parentId || ""))
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "ru"));
    const idx     = sorted.findIndex((c) => c.id === id);
    const swapIdx = dir === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const a = sorted[idx];
    const b = sorted[swapIdx];
    const results = await Promise.all([
      fetch(`/api/admin/categories/${a.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sortOrder: b.sortOrder }) }),
      fetch(`/api/admin/categories/${b.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sortOrder: a.sortOrder }) }),
    ]);
    await Promise.all(results.map((res) => readApi(res, "Не удалось изменить порядок категорий")));
    setCategories((prev) =>
      prev.map((c) => {
        if (c.id === a.id) return { ...c, sortOrder: b.sortOrder };
        if (c.id === b.id) return { ...c, sortOrder: a.sortOrder };
        return c;
      })
    );
  };

  const handleCreate = async (data: Partial<Category> & { image?: string | null }) => {
    const hiddenOnCreate = data.showInMenu === false && data.showInFooter === false;
    const res = await fetch("/api/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, sortOrder: hiddenOnCreate ? HIDDEN_ORDER : visibleCats.length + 1 }),
    });
    const created = await readApi<Category>(res, "Не удалось создать категорию");
    setCategories((prev) => [...prev, created]);
  };

  const categoryRows = flattenCategoryTree(categories);
  const visibleRows = categoryRows.filter(({ category }) => !isHidden(category));
  const hiddenRows = categoryRows.filter(({ category }) => isHidden(category));

  if (loading)
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="admin-page-frame admin-page-frame-readable">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl">Категории</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {visibleCats.length} видимых · {hiddenCats.length} скрытых
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" /> Добавить
        </Button>
      </div>

      <div className="border border-border rounded-xl px-4 py-3 text-sm text-muted-foreground bg-muted/30">
        <span className="inline-flex items-center gap-2">
          <FolderTree className="h-4 w-4 text-primary" />
          Стрелки ↑↓ — порядок внутри дерева. <strong className="text-foreground/70 font-medium">Настройки</strong> — фото, SEO, навигация, родительская категория.
        </span>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Видимые */}
      <div className="space-y-2">
        {visibleRows.map(({ category: cat, depth }, idx) => (
          <CategoryRow
            key={cat.id} cat={cat}
            depth={depth}
            isFirst={idx === 0} isLast={idx === visibleRows.length - 1}
            allCats={categories}
            onUpdate={handleUpdate} onDelete={handleDelete} onMove={handleMove}
          />
        ))}
      </div>

      {/* Скрытые */}
      {hiddenRows.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            <EyeOff className="w-3.5 h-3.5" /> Скрытые категории
          </h2>
          {hiddenRows.map(({ category: cat, depth }) => (
            <CategoryRow
              key={cat.id} cat={cat}
              depth={depth}
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
