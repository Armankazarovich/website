"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Save, Trash2, Loader2, Check, ToggleLeft, ToggleRight } from "lucide-react";

type Promotion = {
  id: string;
  title: string;
  description: string;
  discount: number | null;
  active: boolean;
  validUntil: string | null;
  createdAt: string;
};

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
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onUpdate(promo.id, {
      title,
      description,
      discount: discount ? Number(discount) : null,
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
        </div>
        <div className="flex flex-col gap-2 shrink-0">
          <Badge variant={promo.active ? "default" : "secondary"}>
            {promo.active ? "Активна" : "Скрыта"}
          </Badge>
          <button
            onClick={() => onUpdate(promo.id, { active: !promo.active })}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            {promo.active ? (
              <ToggleRight className="w-4 h-4 text-primary" />
            ) : (
              <ToggleLeft className="w-4 h-4" />
            )}
            {promo.active ? "Выкл." : "Вкл."}
          </button>
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
        <button
          onClick={() => {
            if (confirm("Удалить акцию?")) onDelete(promo.id);
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
  );
}

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
            <Button variant="ghost" onClick={() => setShowNew(false)}>
              Отмена
            </Button>
            <Button onClick={handleCreate} disabled={creating || !newTitle}>
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
