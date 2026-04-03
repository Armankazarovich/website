"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { CheckCircle2, RotateCcw, AlertCircle, Loader2, Zap, Eye } from "lucide-react";
import Link from "next/link";
import { AdminBack } from "@/components/admin/admin-back";

type Product = { id: string; name: string; slug: string; images: string[] };
type MatchItem = { productId: string; productName: string; images: string[] };
type RecoveryData = {
  orphanedOriginals: string[];
  orphanedWm: string[];
  needsRestore: Product[];
  totalProducts: number;
};

export default function WatermarkRecoveryPage() {
  const [data, setData] = useState<RecoveryData | null>(null);
  const [loading, setLoading] = useState(true);

  // Smart auto-restore state
  const [preview, setPreview] = useState<{ matched: MatchItem[]; unmatched: { productId: string; productName: string }[] } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [restoreResult, setRestoreResult] = useState<{ restored: number; unmatched: { productName: string }[] } | null>(null);

  // Manual matching state
  const [assignments, setAssignments] = useState<Record<string, string[]>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [usedImages, setUsedImages] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/admin/watermark-recovery")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // ── Smart auto-restore: dry run (preview) ───────────────────────────────
  async function loadPreview() {
    setPreviewLoading(true);
    try {
      const res = await fetch("/api/admin/watermark-recovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "smart_auto_restore", dryRun: true }),
      });
      const d = await res.json();
      setPreview(d);
    } finally { setPreviewLoading(false); }
  }

  // ── Smart auto-restore: apply ────────────────────────────────────────────
  async function applyAutoRestore() {
    setRestoring(true);
    try {
      const res = await fetch("/api/admin/watermark-recovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "smart_auto_restore", dryRun: false }),
      });
      const d = await res.json();
      setRestoreResult({ restored: d.restored, unmatched: d.unmatched ?? [] });
      setPreview(null);
      // Reload data
      const r2 = await fetch("/api/admin/watermark-recovery");
      setData(await r2.json());
    } finally { setRestoring(false); }
  }

  // ── Manual matching ──────────────────────────────────────────────────────
  function toggleImage(productId: string, imgUrl: string) {
    setAssignments((prev) => {
      const curr = prev[productId] ?? [];
      const next = curr.includes(imgUrl) ? curr.filter((u) => u !== imgUrl) : [...curr, imgUrl];
      return { ...prev, [productId]: next };
    });
    setUsedImages((prev) => {
      const next = new Set(prev);
      if (prev.has(imgUrl)) next.delete(imgUrl); else next.add(imgUrl);
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
      if (d.ok) setSavedIds((prev) => new Set([...prev, productId]));
    } finally { setSaving(null); }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
  );
  if (!data) return <div className="p-6 text-destructive">Ошибка загрузки</div>;

  const { orphanedOriginals, needsRestore } = data;
  const assignedCount = Object.values(assignments).filter((a) => a.length > 0).length;

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <AdminBack />
      </div>
      <div>
        <h1 className="text-2xl font-display font-bold">Восстановление оригинальных фото</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Найдено <strong>{orphanedOriginals.length}</strong> оригинальных файлов и{" "}
          <strong>{needsRestore.length}</strong> товаров с водяными знаками.
        </p>
      </div>

      {/* ══ SUCCESS ══════════════════════════════════════════════════════════ */}
      {restoreResult && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-6 space-y-3">
          <div className="flex items-center gap-2 text-emerald-700 font-bold text-lg">
            <CheckCircle2 className="w-6 h-6" />
            Восстановлено {restoreResult.restored} товаров!
          </div>
          {restoreResult.unmatched.length > 0 && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">Не удалось восстановить автоматически ({restoreResult.unmatched.length}) — назначьте вручную ниже:</p>
              <ul className="text-sm space-y-0.5">
                {restoreResult.unmatched.map((u, i) => <li key={i} className="text-amber-700">• {u.productName}</li>)}
              </ul>
            </div>
          )}
          <Link href="/" target="_blank" className="inline-flex items-center gap-1 text-sm text-primary underline">
            Открыть сайт и проверить →
          </Link>
        </div>
      )}

      {/* ══ ONE CLICK AUTO-RESTORE ════════════════════════════════════════════ */}
      {needsRestore.length > 0 && !restoreResult && (
        <div className="bg-card border border-primary/30 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-lg">Восстановить всё в 1 клик</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Умный алгоритм сопоставит оригинальные файлы с товарами по названию.
            Сначала посмотрите превью — что именно будет восстановлено.
          </p>

          {/* Preview step */}
          {!preview && (
            <button
              onClick={loadPreview}
              disabled={previewLoading}
              className="flex items-center gap-2 px-6 py-3 rounded-xl border border-primary text-primary font-semibold hover:bg-primary/5 disabled:opacity-50 transition-colors"
            >
              {previewLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
              {previewLoading ? "Анализируем..." : "Показать превью совпадений"}
            </button>
          )}

          {/* Preview results */}
          {preview && (
            <div className="space-y-4">
              <div className="rounded-xl bg-muted/50 p-4 space-y-2 max-h-64 overflow-y-auto">
                <p className="text-sm font-medium text-emerald-700">✓ Найдено совпадений: {preview.matched.length}</p>
                {preview.matched.map((m) => (
                  <div key={m.productId} className="flex items-center gap-2 text-xs">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                    <span className="font-medium">{m.productName}</span>
                    <span className="text-muted-foreground">→ {m.images.map(u => u.split("/").pop()).join(", ")}</span>
                  </div>
                ))}
                {preview.unmatched.length > 0 && (
                  <>
                    <p className="text-sm font-medium text-amber-600 mt-2">⚠ Не найдено совпадений: {preview.unmatched.length}</p>
                    {preview.unmatched.map((u) => (
                      <div key={u.productId} className="flex items-center gap-2 text-xs">
                        <AlertCircle className="w-3 h-3 text-amber-500 shrink-0" />
                        <span>{u.productName}</span>
                        <span className="text-muted-foreground">— назначьте вручную ниже</span>
                      </div>
                    ))}
                  </>
                )}
              </div>

              <div className="flex gap-3 flex-wrap">
                <button
                  onClick={applyAutoRestore}
                  disabled={restoring || preview.matched.length === 0}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-md"
                >
                  {restoring ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                  {restoring ? "Восстанавливаем..." : `Применить (${preview.matched.length} товаров)`}
                </button>
                <button onClick={() => setPreview(null)} className="px-4 py-3 rounded-xl border border-border text-sm hover:bg-muted transition-colors">
                  Отмена
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══ MANUAL MATCHING ═══════════════════════════════════════════════════ */}
      {orphanedOriginals.length > 0 && needsRestore.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-muted-foreground uppercase text-xs tracking-wide">
            Ручное назначение (если авто не справилось)
          </h2>
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Products list */}
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {needsRestore.map((product) => {
                const isSelected = selected === product.id;
                const assigned = assignments[product.id] ?? [];
                const isSaved = savedIds.has(product.id);
                return (
                  <div
                    key={product.id}
                    onClick={() => setSelected(isSelected ? null : product.id)}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected ? "border-primary bg-primary/5 shadow-sm"
                      : isSaved ? "border-emerald-500/40 bg-emerald-500/5"
                      : "border-border hover:border-primary/40 bg-card"
                    }`}
                  >
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted shrink-0 relative">
                      {product.images[0] && <Image src={product.images[0]} alt={product.name} fill className="object-cover" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{product.name}</p>
                      {assigned.length > 0 && <p className="text-xs text-primary">Выбрано: {assigned.length}</p>}
                    </div>
                    {isSaved ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> : assigned.length > 0 ? (
                      <button onClick={(e) => { e.stopPropagation(); saveProduct(product.id); }} disabled={saving === product.id}
                        className="text-xs px-2 py-1 rounded-lg bg-primary text-primary-foreground shrink-0">
                        {saving === product.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "OK"}
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>

            {/* Originals grid */}
            <div className="space-y-2">
              {!selected && (
                <div className="p-3 rounded-xl bg-muted/50 text-sm text-muted-foreground">
                  ← Сначала выбери товар слева
                </div>
              )}
              <div className="grid grid-cols-3 gap-2 max-h-[60vh] overflow-y-auto pr-1">
                {orphanedOriginals.map((url) => {
                  const isChosen = selected ? (assignments[selected] ?? []).includes(url) : false;
                  return (
                    <div key={url} onClick={() => { if (selected) toggleImage(selected, url); }}
                      className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                        isChosen ? "border-primary ring-2 ring-primary/30"
                        : selected ? "border-border hover:border-primary/60"
                        : "border-border opacity-60 cursor-default"
                      }`}
                    >
                      <Image src={url} alt="" fill className="object-cover" />
                      {isChosen && (
                        <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                          <CheckCircle2 className="w-6 h-6 text-white drop-shadow" />
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
        </div>
      )}

      {assignedCount > 0 && (
        <div className="sticky bottom-4 flex justify-end">
          <button
            onClick={async () => {
              setSaving("__all__");
              const toSave = Object.entries(assignments).filter(([, imgs]) => imgs.length > 0);
              await fetch("/api/admin/watermark-recovery", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "auto_restore", assignments: toSave.map(([productId, images]) => ({ productId, images })) }),
              });
              setSavedIds(new Set(toSave.map(([id]) => id)));
              setSaving(null);
            }}
            disabled={saving === "__all__"}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-primary text-primary-foreground font-semibold shadow-lg hover:bg-primary/90 disabled:opacity-50"
          >
            {saving === "__all__" ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
            Сохранить всё ({assignedCount})
          </button>
        </div>
      )}
    </div>
  );
}
