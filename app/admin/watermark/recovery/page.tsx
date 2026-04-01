"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { CheckCircle2, RotateCcw, AlertCircle, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

type Product = { id: string; name: string; slug: string; images: string[] };
type RecoveryData = {
  orphanedOriginals: string[];
  orphanedWm: string[];
  needsRestore: Product[];
  totalProducts: number;
};

export default function WatermarkRecoveryPage() {
  const [data, setData] = useState<RecoveryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  // assignments: productId → image URLs chosen by user
  const [assignments, setAssignments] = useState<Record<string, string[]>>({});
  const [selected, setSelected] = useState<string | null>(null); // selected productId
  const [usedImages, setUsedImages] = useState<Set<string>>(new Set());
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set());
  const [saved, setSaved] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/admin/watermark-recovery")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  function toggleImageForProduct(productId: string, imgUrl: string) {
    setAssignments((prev) => {
      const curr = prev[productId] ?? [];
      const already = curr.includes(imgUrl);
      const next = already ? curr.filter((u) => u !== imgUrl) : [...curr, imgUrl];
      return { ...prev, [productId]: next };
    });
    setUsedImages((prev) => {
      const next = new Set(prev);
      // Remove from all products first, then re-add if selecting
      // (simple: just track globally which are used)
      if (prev.has(imgUrl)) next.delete(imgUrl);
      else next.add(imgUrl);
      return next;
    });
  }

  async function saveProduct(productId: string) {
    const images = assignments[productId];
    if (!images?.length) return;
    setSaving(productId);
    try {
      const res = await fetch("/api/admin/watermark-recovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "assign", productId, images }),
      });
      const d = await res.json();
      if (d.ok) {
        setSaved((prev) => new Set([...prev, productId]));
        setDoneIds((prev) => new Set([...prev, productId]));
      }
    } finally { setSaving(null); }
  }

  async function saveAll() {
    const toSave = Object.entries(assignments).filter(([, imgs]) => imgs.length > 0);
    setSaving("__all__");
    try {
      const res = await fetch("/api/admin/watermark-recovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "auto_restore",
          assignments: toSave.map(([productId, images]) => ({ productId, images })),
        }),
      });
      const d = await res.json();
      if (d.ok) {
        const ids = new Set(toSave.map(([id]) => id));
        setSaved(ids); setDoneIds(ids);
      }
    } finally { setSaving(null); }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
  );

  if (!data) return <div className="p-6 text-destructive">Ошибка загрузки данных</div>;

  const { orphanedOriginals, needsRestore } = data;
  const assignedCount = Object.values(assignments).filter((a) => a.length > 0).length;

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/admin/watermark" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Назад
        </Link>
      </div>
      <div>
        <h1 className="text-2xl font-display font-bold">Восстановление оригинальных фото</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Найдено <strong>{orphanedOriginals.length}</strong> оригинальных файлов на диске и{" "}
          <strong>{needsRestore.length}</strong> товаров с водяными знаками.
          Выберите для каждого товара его оригинальные фото.
        </p>
      </div>

      {orphanedOriginals.length === 0 && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <div>
            <p className="font-medium">Оригинальные файлы не найдены</p>
            <p className="text-sm">Все файлы в папке images/products начинаются с wm- или уже используются в товарах.</p>
          </div>
        </div>
      )}

      {orphanedOriginals.length > 0 && needsRestore.length > 0 && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left — Products */}
          <div className="space-y-3">
            <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Товары с водяными знаками ({needsRestore.length})
            </h2>
            <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
              {needsRestore.map((product) => {
                const isSelected = selected === product.id;
                const assigned = assignments[product.id] ?? [];
                const isDone = doneIds.has(product.id);
                const isSaved = saved.has(product.id);

                return (
                  <div
                    key={product.id}
                    onClick={() => setSelected(isSelected ? null : product.id)}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? "border-primary bg-primary/5 shadow-sm"
                        : isDone
                        ? "border-emerald-500/40 bg-emerald-500/5"
                        : "border-border hover:border-primary/40 bg-card"
                    }`}
                  >
                    {/* Current (watermarked) thumbnail */}
                    <div className="w-14 h-14 rounded-lg overflow-hidden bg-muted shrink-0 relative">
                      {product.images[0] ? (
                        <Image src={product.images[0]} alt={product.name} fill className="object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">нет</div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{product.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {product.images.length} фото (с вод. знаком)
                      </p>
                      {assigned.length > 0 && (
                        <p className="text-xs text-primary">
                          Выбрано оригиналов: {assigned.length}
                        </p>
                      )}
                    </div>

                    <div className="shrink-0 flex flex-col items-center gap-1">
                      {isSaved ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      ) : assigned.length > 0 ? (
                        <button
                          onClick={(e) => { e.stopPropagation(); saveProduct(product.id); }}
                          disabled={saving === product.id}
                          className="text-xs px-2 py-1 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                        >
                          {saving === product.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "Сохранить"}
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right — Orphaned originals */}
          <div className="space-y-3">
            <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Оригинальные файлы на диске ({orphanedOriginals.length})
              {selected && <span className="text-primary normal-case"> — кликни чтобы назначить товару</span>}
            </h2>

            {!selected && (
              <div className="p-3 rounded-xl bg-muted/50 text-sm text-muted-foreground">
                ← Сначала выбери товар слева, потом кликни на оригинальное фото
              </div>
            )}

            <div className="grid grid-cols-3 gap-2 max-h-[70vh] overflow-y-auto pr-1">
              {orphanedOriginals.map((url) => {
                const isAssignedToSelected = selected
                  ? (assignments[selected] ?? []).includes(url)
                  : false;
                const isUsed = usedImages.has(url);

                return (
                  <div
                    key={url}
                    onClick={() => { if (selected) toggleImageForProduct(selected, url); }}
                    className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                      isAssignedToSelected
                        ? "border-primary ring-2 ring-primary/30"
                        : isUsed
                        ? "border-emerald-500/40 opacity-60"
                        : selected
                        ? "border-border hover:border-primary/60"
                        : "border-border opacity-70 cursor-default"
                    }`}
                  >
                    <Image src={url} alt="" fill className="object-cover" />
                    {isAssignedToSelected && (
                      <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                        <CheckCircle2 className="w-6 h-6 text-primary drop-shadow" />
                      </div>
                    )}
                    <div className="absolute bottom-0 inset-x-0 bg-black/50 px-1 py-0.5">
                      <p className="text-[9px] text-white truncate">{url.split("/").pop()}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Save all button */}
      {assignedCount > 0 && (
        <div className="sticky bottom-4 flex justify-end">
          <button
            onClick={saveAll}
            disabled={saving === "__all__"}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-primary text-primary-foreground font-semibold shadow-lg hover:bg-primary/90 disabled:opacity-50 transition-all"
          >
            {saving === "__all__" ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
            Сохранить всё ({assignedCount} товаров)
          </button>
        </div>
      )}

      {/* Info */}
      <div className="text-xs text-muted-foreground space-y-1 border-t border-border pt-4">
        <p>Оригинальные файлы найдены на сервере и отсортированы по дате загрузки (старые — первые).</p>
        <p>Файлы с префиксом wm- (промежуточные водяные знаки) не показаны — только оригиналы.</p>
        <p>После назначения оригиналов товар сразу обновится на сайте.</p>
      </div>
    </div>
  );
}
