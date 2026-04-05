"use client";

import { useState, useEffect } from "react";
import {
  ScanSearch, CheckCircle2, AlertTriangle, XCircle,
  Trash2, Wrench, RefreshCw, ImageOff, Copy, Layers,
} from "lucide-react";
import Link from "next/link";
import { AdminBack } from "@/components/admin/admin-back";

type ProductReport = {
  id: string;
  name: string;
  slug: string;
  total: number;
  unique: number;
  duplicatesCount: number;
  brokenCount: number;
  okCount: number;
  hasDuplicates: boolean;
  hasBroken: boolean;
  duplicates: string[];
  broken: string[];
};

type Summary = {
  totalProducts: number;
  withDuplicates: number;
  withBroken: number;
  withNoImages: number;
  totalDuplicateEntries: number;
  totalBrokenRefs: number;
};

export default function ImageFixPage() {
  const [loading, setLoading] = useState(false);
  const [fixing, setFixing] = useState<string | null>(null);
  const [data, setData] = useState<{ summary: Summary; products: ProductReport[] } | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "duplicates" | "broken" | "noimage">("all");

  const scan = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/images/fix");
      const json = await res.json();
      setData(json);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { scan(); }, []);

  const fixAction = async (action: string, label: string) => {
    if (!confirm(`${label}?`)) return;
    setFixing(action);
    setResult(null);
    try {
      const res = await fetch("/api/admin/images/fix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = await res.json();
      if (json.ok) {
        setResult(`✅ ${json.fixed} товаров исправлено, удалено ${json.totalRemoved} записей`);
        await scan(); // refresh
      } else {
        setResult(`❌ Ошибка: ${json.error}`);
      }
    } finally {
      setFixing(null);
    }
  };

  const filtered = data?.products.filter((p) => {
    if (filter === "duplicates") return p.hasDuplicates;
    if (filter === "broken") return p.hasBroken;
    if (filter === "noimage") return p.total === 0;
    return p.hasDuplicates || p.hasBroken || p.total === 0;
  }) ?? [];

  const s = data?.summary;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <AdminBack />
        <div>
          <h1 className="font-display font-bold text-2xl flex items-center gap-2">
            <ScanSearch className="w-6 h-6 text-primary" />
            Диагностика фотографий
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Поиск дублей, сломанных ссылок и отсутствующих фото
          </p>
        </div>
        <button
          onClick={scan}
          disabled={loading}
          className="ml-auto flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-card hover:bg-muted text-sm font-medium transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Сканировать
        </button>
      </div>

      {/* Summary cards */}
      {s && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-card border border-border rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold font-display text-primary">{s.totalProducts}</p>
            <p className="text-xs text-muted-foreground mt-1">Всего товаров</p>
          </div>
          <div
            className={`bg-card border rounded-2xl p-4 text-center cursor-pointer transition-colors ${filter === "duplicates" ? "border-amber-400 bg-amber-50 dark:bg-amber-950/20" : "border-border hover:border-amber-300"}`}
            onClick={() => setFilter(filter === "duplicates" ? "all" : "duplicates")}
          >
            <p className="text-2xl font-bold font-display text-amber-500">{s.withDuplicates}</p>
            <p className="text-xs text-muted-foreground mt-1">С дублями</p>
            {s.totalDuplicateEntries > 0 && (
              <p className="text-xs text-amber-500 font-medium">{s.totalDuplicateEntries} записей</p>
            )}
          </div>
          <div
            className={`bg-card border rounded-2xl p-4 text-center cursor-pointer transition-colors ${filter === "broken" ? "border-red-400 bg-red-50 dark:bg-red-950/20" : "border-border hover:border-red-300"}`}
            onClick={() => setFilter(filter === "broken" ? "all" : "broken")}
          >
            <p className="text-2xl font-bold font-display text-red-500">{s.withBroken}</p>
            <p className="text-xs text-muted-foreground mt-1">Сломанные ссылки</p>
            {s.totalBrokenRefs > 0 && (
              <p className="text-xs text-red-500 font-medium">{s.totalBrokenRefs} файлов нет</p>
            )}
          </div>
          <div
            className={`bg-card border rounded-2xl p-4 text-center cursor-pointer transition-colors ${filter === "noimage" ? "border-slate-400 bg-slate-50 dark:bg-slate-950/20" : "border-border hover:border-slate-300"}`}
            onClick={() => setFilter(filter === "noimage" ? "all" : "noimage")}
          >
            <p className="text-2xl font-bold font-display text-slate-400">{s.withNoImages}</p>
            <p className="text-xs text-muted-foreground mt-1">Без фото</p>
          </div>
        </div>
      )}

      {/* Result message */}
      {result && (
        <div className={`px-4 py-3 rounded-xl text-sm font-medium ${result.startsWith("✅") ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800" : "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800"}`}>
          {result}
        </div>
      )}

      {/* Fix actions */}
      {s && (s.withDuplicates > 0 || s.withBroken > 0) && (
        <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
          <h2 className="font-semibold flex items-center gap-2">
            <Wrench className="w-4 h-4 text-primary" />
            Автоматическое исправление
          </h2>
          <div className="grid sm:grid-cols-3 gap-3">
            {s.withDuplicates > 0 && (
              <button
                onClick={() => fixAction("deduplicate", `Удалить ${s.totalDuplicateEntries} дублирующихся записей из ${s.withDuplicates} товаров`)}
                disabled={!!fixing}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 hover:border-amber-400 transition-colors disabled:opacity-50 text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                  {fixing === "deduplicate" ? (
                    <RefreshCw className="w-5 h-5 text-amber-500 animate-spin" />
                  ) : (
                    <Layers className="w-5 h-5 text-amber-500" />
                  )}
                </div>
                <div>
                  <p className="font-semibold text-sm">Удалить дубли</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {s.totalDuplicateEntries} лишних записей в {s.withDuplicates} товарах
                  </p>
                </div>
              </button>
            )}

            {s.withBroken > 0 && (
              <button
                onClick={() => fixAction("remove_broken", `Удалить ${s.totalBrokenRefs} ссылок на несуществующие файлы`)}
                disabled={!!fixing}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20 hover:border-red-400 transition-colors disabled:opacity-50 text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
                  {fixing === "remove_broken" ? (
                    <RefreshCw className="w-5 h-5 text-red-500 animate-spin" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500" />
                  )}
                </div>
                <div>
                  <p className="font-semibold text-sm">Убрать битые ссылки</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {s.totalBrokenRefs} файлов не найдено на сервере
                  </p>
                </div>
              </button>
            )}

            <button
              onClick={() => fixAction("remove_wm_duplicates", "Удалить водяные знаки-дубли (оставить оригиналы там где они есть)")}
              disabled={!!fixing}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-border bg-card hover:border-primary/40 transition-colors disabled:opacity-50 text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                {fixing === "remove_wm_duplicates" ? (
                  <RefreshCw className="w-5 h-5 text-primary animate-spin" />
                ) : (
                  <ImageOff className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
              <div>
                <p className="font-semibold text-sm">Убрать wm-дубли</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Удалить wm-версии там где есть оригиналы
                </p>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Восстановление из бэкапа */}
      <div className="bg-primary/15 border border-primary/20 rounded-2xl p-5">
        <h2 className="font-semibold flex items-center gap-2 mb-3">
          <CheckCircle2 className="w-4 h-4 text-primary" />
          Восстановление из резервной копии
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Если водяной знак был применён и хотите вернуть оригинальные URL фото — используйте кнопку восстановления.
          Резервная копия создаётся автоматически перед каждым применением водяного знака.
        </p>
        <div className="flex gap-3 flex-wrap">
          <Link
            href="/admin/watermark"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Перейти к водяному знаку → Восстановить
          </Link>
          <Link
            href="/admin/media"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border bg-card text-sm font-semibold hover:bg-muted transition-colors"
          >
            Медиа-библиотека
          </Link>
        </div>
      </div>

      {/* Products list */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground gap-3">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>Сканирую фотографии...</span>
        </div>
      ) : filtered.length > 0 ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              {filter === "all" ? "Товары с проблемами" : filter === "duplicates" ? "Товары с дублями" : filter === "broken" ? "Товары со сломанными ссылками" : "Товары без фото"}
              {" "}({filtered.length})
            </h2>
            {filter !== "all" && (
              <button onClick={() => setFilter("all")} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Показать все →
              </button>
            )}
          </div>
          {filtered.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-4 p-4 bg-card border border-border rounded-2xl hover:border-primary/30 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <Link
                  href={`/admin/products/${p.id}`}
                  className="font-medium text-sm hover:text-primary transition-colors truncate block"
                >
                  {p.name}
                </Link>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {p.total} фото в базе
                  {p.okCount > 0 && <span className="text-emerald-500 ml-2">✓ {p.okCount} ок</span>}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                {p.total === 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs font-medium">
                    <ImageOff className="w-3 h-3" />
                    Нет фото
                  </span>
                )}
                {p.hasDuplicates && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-xs font-medium">
                    <Layers className="w-3 h-3" />
                    {p.duplicatesCount} дубл{p.duplicatesCount === 1 ? "" : "я"}
                  </span>
                )}
                {p.hasBroken && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-medium">
                    <XCircle className="w-3 h-3" />
                    {p.brokenCount} битых
                  </span>
                )}
                <Link
                  href={`/admin/products/${p.id}`}
                  className="px-3 py-1 rounded-lg border border-border bg-muted text-xs font-medium hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors"
                >
                  Открыть
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : data && !loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-950/30 flex items-center justify-center mb-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
          </div>
          <h2 className="font-semibold text-lg mb-1">Всё в порядке!</h2>
          <p className="text-sm text-muted-foreground">
            Дублей и сломанных ссылок не найдено
          </p>
        </div>
      ) : null}
    </div>
  );
}
