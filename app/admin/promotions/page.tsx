"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus, Save, Trash2, Loader2, Check, ToggleLeft, ToggleRight,
  AlertTriangle, ImageIcon, X, Upload, Library, Link2,
} from "lucide-react";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";

const MediaPickerModal = dynamic(
  () => import("@/app/admin/media/media-client").then((m) => ({ default: m.MediaPickerModal })),
  { ssr: false }
);

type Promotion = {
  id: string;
  title: string;
  description: string;
  discount: number | null;
  imageUrl: string | null;
  active: boolean;
  validUntil: string | null;
  createdAt: string;
};

/* ── Image picker (reusable) ──────────────────────────────────────────── */
function ImagePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlDraft, setUrlDraft] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "banners");
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.url) onChange(data.url);
    } catch { /* silent */ } finally {
      setUploading(false);
    }
  }, [onChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  }, [handleUpload]);

  return (
    <>
      <div>
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
          <ImageIcon className="w-3.5 h-3.5" /> Картинка
        </label>

        {/* Drop zone / preview */}
        <div
          className={`relative rounded-2xl border-2 transition-all duration-150 overflow-hidden ${
            dragging
              ? "border-primary bg-primary/5 scale-[1.01]"
              : value
              ? "border-border"
              : "border-dashed border-border hover:border-primary/50 bg-muted/30"
          }`}
          style={{ height: value ? 160 : 100 }}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
        >
          {value ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={value} alt="Превью" className="w-full h-full object-cover" />
              {/* Overlay on hover */}
              <div className="absolute inset-0 bg-black/0 hover:bg-black/40 transition-all group flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowMediaPicker(true)}
                  className="opacity-0 group-hover:opacity-100 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/90 text-black text-xs font-semibold transition-all hover:bg-white"
                >
                  <Library className="w-3.5 h-3.5" /> Сменить
                </button>
                <button
                  type="button"
                  onClick={() => onChange("")}
                  className="opacity-0 group-hover:opacity-100 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/90 text-white text-xs font-semibold transition-all hover:bg-red-500"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Удалить
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
              {uploading ? (
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              ) : (
                <>
                  <Upload className="w-5 h-5 opacity-40" />
                  <p className="text-xs">Перетащите фото или выберите ниже</p>
                </>
              )}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 mt-2">
          <button
            type="button"
            onClick={() => setShowMediaPicker(true)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-border text-xs font-medium hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-colors"
          >
            <Library className="w-3.5 h-3.5" /> Медиабиблиотека
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-border text-xs font-medium hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-colors"
          >
            <Upload className="w-3.5 h-3.5" /> Загрузить
          </button>
          <button
            type="button"
            onClick={() => { setShowUrlInput(!showUrlInput); setUrlDraft(value); }}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-border text-xs font-medium hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-colors"
            title="Вставить URL"
          >
            <Link2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* URL input (collapsible) */}
        {showUrlInput && (
          <div className="flex gap-2 mt-2">
            <input
              value={urlDraft}
              onChange={(e) => setUrlDraft(e.target.value)}
              placeholder="https://images.pexels.com/..."
              className="flex-1 px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") { onChange(urlDraft); setShowUrlInput(false); }
                if (e.key === "Escape") setShowUrlInput(false);
              }}
            />
            <button
              type="button"
              onClick={() => { onChange(urlDraft); setShowUrlInput(false); }}
              className="px-3 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary/90 transition-colors"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setShowUrlInput(false)}
              className="px-3 py-2 rounded-xl border border-border text-xs hover:bg-primary/[0.08] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ""; }}
        />
      </div>

      <MediaPickerModal
        open={showMediaPicker}
        onClose={() => setShowMediaPicker(false)}
        onPick={(url) => { onChange(url); setShowMediaPicker(false); }}
      />
    </>
  );
}

/* ── Promotion Card ───────────────────────────────────────────────────── */
function PromotionCard({
  promo,
  onUpdate,
  onDelete,
}: {
  promo: Promotion;
  onUpdate: (id: string, data: Partial<Promotion>) => Promise<void>;
  onDelete: (id: string) => void;
}) {
  const [title, setTitle] = useState(promo.title);
  const [description, setDescription] = useState(promo.description);
  const [discount, setDiscount] = useState(promo.discount ? String(promo.discount) : "");
  const [imageUrl, setImageUrl] = useState(promo.imageUrl || "");
  const [validUntil, setValidUntil] = useState(promo.validUntil ? promo.validUntil.slice(0, 10) : "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isExpired = promo.validUntil && new Date(promo.validUntil) < new Date();

  const handleSave = async () => {
    setSaving(true);
    await onUpdate(promo.id, {
      title,
      description,
      discount: discount ? Number(discount) : null,
      imageUrl: imageUrl.trim() || null,
      validUntil: validUntil ? new Date(validUntil).toISOString() : null,
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div
      className={`bg-card rounded-2xl border p-5 space-y-4 ${
        promo.active ? "border-border" : "border-border opacity-60"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Заголовок</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Скидка (%)</label>
            <input
              type="number"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              placeholder="Не указана"
              className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs text-muted-foreground mb-1">Описание</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Действует до</label>
            <input
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            {validUntil && (
              <div className="mt-2">
                <span className={`text-xs font-medium px-2 py-1 rounded-lg ${isExpired ? "bg-red-100 text-red-700" : "bg-primary/10 text-primary"}`}>
                  {isExpired
                    ? <span className="flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Истекла</span>
                    : `До ${new Date(validUntil).toLocaleDateString("ru-RU")}`}
                </span>
              </div>
            )}
          </div>
          <div className="col-span-2">
            <ImagePicker value={imageUrl} onChange={setImageUrl} />
          </div>
        </div>

        <div className="flex flex-col gap-2 shrink-0">
          <Badge variant={isExpired ? "destructive" : promo.active ? "default" : "secondary"}>
            {isExpired ? "Истекла" : promo.active ? "Активна" : "Скрыта"}
          </Badge>
          <button
            onClick={() => onUpdate(promo.id, { active: !promo.active })}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            {promo.active
              ? <ToggleRight className="w-4 h-4 text-primary" />
              : <ToggleLeft className="w-4 h-4" />}
            {promo.active ? "Выкл." : "Вкл."}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
        <button
          onClick={() => setConfirmDelete(true)}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
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

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => { setConfirmDelete(false); onDelete(promo.id); }}
        title="Удалить акцию?"
        description={`Акция «${promo.title}» будет удалена навсегда.`}
        confirmLabel="Удалить"
        variant="danger"
      />
    </div>
  );
}

/* ── Main Page ────────────────────────────────────────────────────────── */
export default function AdminPromotionsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newDiscount, setNewDiscount] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetch("/api/admin/promotions")
      .then((r) => r.json())
      .then((data) => {
        setPromotions(data);
        setLoading(false);
      });
  }, []);

  const handleUpdate = async (id: string, data: Partial<Promotion>) => {
    const res = await fetch(`/api/admin/promotions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const updated = await res.json();
    setPromotions((prev) => prev.map((p) => (p.id === id ? { ...p, ...updated } : p)));
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/admin/promotions/${id}`, { method: "DELETE" });
    setPromotions((prev) => prev.filter((p) => p.id !== id));
  };

  const handleCreate = async () => {
    if (!newTitle) return;
    setCreating(true);
    const res = await fetch("/api/admin/promotions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: newTitle,
        description: newDescription,
        discount: newDiscount ? Number(newDiscount) : null,
        active: true,
      }),
    });
    const created = await res.json();
    setPromotions((prev) => [created, ...prev]);
    setNewTitle("");
    setNewDescription("");
    setNewDiscount("");
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
        <h1 className="font-display font-bold text-2xl">Акции</h1>
        <Button onClick={() => setShowNew(!showNew)}>
          <Plus className="w-4 h-4 mr-2" /> Новая акция
        </Button>
      </div>

      {showNew && (
        <div className="bg-card rounded-2xl border border-primary/30 p-5 space-y-3">
          <h3 className="font-semibold">Новая акция</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Заголовок *</label>
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Скидки при объёме"
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Скидка (%)</label>
              <input
                type="number"
                value={newDiscount}
                onChange={(e) => setNewDiscount(e.target.value)}
                placeholder="Не указана"
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-muted-foreground mb-1">Описание</label>
              <textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                rows={3}
                placeholder="Условия акции..."
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setShowNew(false)}>Отмена</Button>
            <Button onClick={handleCreate} disabled={creating || !newTitle}>
              {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Создать
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {promotions.map((promo) => (
          <PromotionCard
            key={promo.id}
            promo={promo}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
          />
        ))}
        {promotions.length === 0 && (
          <div className="text-center py-12 text-muted-foreground border-2 border-dashed border-border rounded-2xl">
            Акций нет
          </div>
        )}
      </div>
    </div>
  );
}
