"use client";

import { useState, useRef } from "react";
import {
  FileDown, Upload, FileSpreadsheet, CheckCircle2,
  AlertCircle, Loader2, Info, Download,
} from "lucide-react";

export function ImportClient() {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ updated: number; created: number; errors: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f && (f.name.endsWith(".xlsx") || f.name.endsWith(".csv"))) {
      setFile(f);
      setResult(null);
      setError(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) { setFile(f); setResult(null); setError(null); }
  };

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    setResult(null);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/products/import", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || `Ошибка ${res.status}`);
      } else {
        setResult(data);
      }
    } catch {
      setError("Не удалось подключиться к серверу");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-display font-bold">Импорт / Экспорт товаров</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Массовое управление товарами через Excel или CSV
        </p>
      </div>

      {/* Export section */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <FileDown className="w-4 h-4 text-primary" />
          <h3 className="font-semibold">Шаг 1 — Скачать шаблон</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Скачайте Excel-файл со всеми текущими товарами. Отредактируйте цены, остатки, названия — и загрузите обратно.
        </p>
        <div className="flex flex-wrap gap-3">
          <a
            href="/api/admin/products/export"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            <Download className="w-4 h-4" />
            Скачать Excel (.xlsx)
          </a>
          <a
            href="/api/admin/products/export?format=csv"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-card text-sm font-medium hover:bg-accent transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-primary" />
            Скачать CSV
          </a>
        </div>

        {/* Column guide */}
        <div className="mt-2 p-3 rounded-xl bg-muted/50 text-xs text-muted-foreground space-y-1">
          <p className="font-medium text-foreground mb-1.5">Колонки в файле:</p>
          {[
            ["id", "ID варианта (не менять!)"],
            ["slug", "Slug товара (не менять!)"],
            ["Категория", "Название категории"],
            ["Товар", "Название товара"],
            ["Размер", "Размер варианта"],
            ["Цена м³", "Цена за кубометр (₽)"],
            ["Цена шт", "Цена за штуку (₽)"],
            ["Шт/м³", "Количество штук в 1 м³"],
            ["В наличии", "1 = да, 0 = нет"],
            ["Ед.изм.", "CUBE / PIECE / BOTH"],
          ].map(([col, desc]) => (
            <div key={col} className="flex gap-2">
              <span className="font-mono text-foreground w-20 shrink-0">{col}</span>
              <span>{desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Import section */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Upload className="w-4 h-4 text-primary" />
          <h3 className="font-semibold">Шаг 2 — Загрузить файл</h3>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleFileDrop}
          onClick={() => fileRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
            file ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/30"
          }`}
        >
          <input ref={fileRef} type="file" accept=".xlsx,.csv" className="hidden" onChange={handleFileChange} />
          {file ? (
            <div className="flex flex-col items-center gap-2">
              <FileSpreadsheet className="w-8 h-8 text-primary" />
              <p className="font-medium text-sm">{file.name}</p>
              <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB · Нажмите чтобы заменить</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Upload className="w-8 h-8 opacity-40" />
              <p className="text-sm font-medium">Перетащите .xlsx или .csv</p>
              <p className="text-xs">или нажмите для выбора файла</p>
            </div>
          )}
        </div>

        {/* Result */}
        {result && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-1.5">
            <div className="flex items-center gap-2 font-semibold text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              Импорт завершён
            </div>
            <p className="text-sm text-muted-foreground">
              Обновлено: <strong>{result.updated}</strong> &nbsp;·&nbsp; Создано: <strong>{result.created}</strong>
            </p>
            {result.errors.length > 0 && (
              <div className="mt-2 text-xs text-amber-600 dark:text-amber-400 space-y-0.5">
                {result.errors.map((e, i) => <p key={i}>⚠ {e}</p>)}
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-sm text-destructive">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        <button
          onClick={handleImport}
          disabled={!file || importing}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {importing ? "Импортируем..." : "Применить импорт"}
        </button>
      </div>

      {/* Info */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-sm">
        <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
        <div className="text-muted-foreground space-y-1">
          <p><strong className="text-foreground">Безопасно:</strong> Импорт только обновляет и добавляет товары — не удаляет существующие.</p>
          <p><strong className="text-foreground">Ключ:</strong> Поиск по slug + размеру. Если не найдено — создаётся новый вариант.</p>
          <p><strong className="text-foreground">Формат:</strong> Столбец "id" варианта — самый надёжный способ обновления.</p>
        </div>
      </div>
    </div>
  );
}
