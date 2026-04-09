"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Upload, Trash2, Copy, CheckCircle2, Loader2,
  Wand2, X, ExternalLink, FolderOpen, ScanSearch,
  CheckSquare, Square, Smartphone,
} from "lucide-react";
import { InfoCard } from "@/components/admin/info-popup";

function useClassicMode() {
  const [classic, setClassic] = useState(false);
  useEffect(() => {
    setClassic(localStorage.getItem("aray-classic-mode") === "1");
    const h = () => setClassic(localStorage.getItem("aray-classic-mode") === "1");
    window.addEventListener("aray-classic-change", h);
    return () => window.removeEventListener("aray-classic-change", h);
  }, []);
  return classic;
}

type MediaFile = {
  url: string; folder: string; filename: string;
  size: number; mtime: number; alt: string;
  usedIn: { type: "product" | "category"; id: string; name: string; slug: string }[];
};

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fmtDate(ts: number) {
  return new Date(ts).toLocaleDateString("ru", { day: "2-digit", month: "short", year: "numeric" });
}

// ── File card ─────────────────────────────────────────────────────────────────
function MediaCard({
  file, selected, bulkMode, bulkSelected, onSelect, onDelete, onAltSave, onCopy,
}: {
  file: MediaFile;
  selected: boolean;
  bulkMode: boolean;
  bulkSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onAltSave: (alt: string) => void;
  onCopy: () => void;
}) {
  const [alt, setAlt] = useState(file.alt);
  const [altSaved, setAltSaved] = useState(false);
  const [delConfirm, setDelConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  const saveAlt = async () => {
    setSaving(true);
    onAltSave(alt);
    setTimeout(() => { setAltSaved(true); setSaving(false); setTimeout(() => setAltSaved(false), 1500); }, 300);
  };

  const ext = file.filename.split(".").pop()?.toUpperCase() ?? "";
  const isImage = ["JPG", "JPEG", "PNG", "WEBP", "SVG", "GIF"].includes(ext);

  return (
    <div
      className={`group relative rounded-2xl border-2 overflow-hidden bg-card transition-all cursor-pointer ${
        bulkSelected
          ? "border-primary shadow-md shadow-primary/20 ring-2 ring-primary/30"
          : selected && !bulkMode
          ? "border-primary shadow-md shadow-primary/20"
          : "border-border hover:border-primary/40"
      }`}
      onClick={onSelect}
    >
      {/* Thumbnail */}
      <div className="relative aspect-square bg-muted">
        {isImage ? (
          <Image src={file.url} alt={file.alt || file.filename} fill className="object-cover" sizes="200px" />
        ) : (
          <div className="flex items-center justify-center h-full text-2xl font-bold text-muted-foreground">{ext}</div>
        )}

        {/* Bulk mode checkbox */}
        {bulkMode && (
          <div className="absolute top-1.5 left-1.5 z-10">
            <div className={`w-5 h-5 rounded flex items-center justify-center transition-all ${
              bulkSelected ? "bg-primary" : "bg-black/50 border border-white/40"
            }`}>
              {bulkSelected && (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </div>
          </div>
        )}

        {/* Usage badge */}
        {file.usedIn.length > 0 && !bulkMode && (
          <div className="absolute top-1.5 left-1.5 bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full">
            {file.usedIn.length}
          </div>
        )}

        {/* Selected overlay (single mode) */}
        {selected && !bulkMode && (
          <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-primary drop-shadow" />
          </div>
        )}

        {/* Bulk selected overlay */}
        {bulkSelected && (
          <div className="absolute inset-0 bg-primary/15" />
        )}

        {/* Actions overlay (not in bulk mode) */}
        {!bulkMode && (
          <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
            <button onClick={onCopy} title="Копировать URL"
              className="w-7 h-7 rounded-lg bg-black/60 text-white flex items-center justify-center hover:bg-black/80">
              <Copy className="w-3.5 h-3.5" />
            </button>
            <a href={file.url} target="_blank" rel="noopener" title="Открыть" onClick={(e) => e.stopPropagation()}
              className="w-7 h-7 rounded-lg bg-black/60 text-white flex items-center justify-center hover:bg-black/80">
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            {file.usedIn.length === 0 && (
              <button onClick={(e) => { e.stopPropagation(); setDelConfirm(true); }} title="Удалить"
                className="w-7 h-7 rounded-lg bg-red-600/80 text-white flex items-center justify-center hover:bg-red-700">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-2 space-y-1.5" onClick={(e) => e.stopPropagation()}>
        <p className="text-[11px] text-muted-foreground truncate" title={file.filename}>{file.filename}</p>
        <p className="text-[10px] text-muted-foreground">{fmtSize(file.size)} · {fmtDate(file.mtime)}</p>

        {!bulkMode && (
          <>
            {/* ALT input */}
            <div className="flex gap-1">
              <input
                value={alt}
                onChange={(e) => setAlt(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") saveAlt(); }}
                placeholder="ALT текст..."
                className="flex-1 text-[11px] px-2 py-1 rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary/40 min-w-0"
              />
              <button onClick={saveAlt} disabled={saving}
                className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs transition-colors ${
                  altSaved ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-primary/10 text-muted-foreground"
                }`}>
                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : altSaved ? <CheckCircle2 className="w-3 h-3" /> : "✓"}
              </button>
            </div>

            {/* Used in */}
            {file.usedIn.length > 0 && (
              <div className="text-[10px] text-primary truncate">
                {file.usedIn.map((u) => u.name).join(", ")}
              </div>
            )}
          </>
        )}

        {/* Bulk mode: show usage warning */}
        {bulkMode && file.usedIn.length > 0 && (
          <p className="text-[10px] text-amber-500 truncate">используется в {file.usedIn.length} товарах</p>
        )}
      </div>

      {/* Delete confirm */}
      {delConfirm && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-3 z-10 rounded-2xl"
          style={{ background: "rgba(10,10,12,0.88)", backdropFilter: "blur(12px)" }}
          onClick={(e) => e.stopPropagation()}>
          <Trash2 className="w-5 h-5 text-destructive" />
          <p className="text-xs font-medium text-center text-white/90">Удалить файл?</p>
          <div className="flex gap-2">
            <button onClick={() => { onDelete(); setDelConfirm(false); }}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
              style={{ background: "hsl(var(--destructive))" }}>Удалить</button>
            <button onClick={() => setDelConfirm(false)}
              className="px-3 py-1.5 rounded-lg text-xs text-white/70"
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}>Отмена</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export function MediaClient({ pickerMode = false, onPick }: { pickerMode?: boolean; onPick?: (url: string) => void }) {
  const isClassic = useClassicMode();
  const popupStyle = isClassic ? {
    background: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
  } : {
    background: "rgba(12,12,14,0.82)",
    backdropFilter: "blur(48px) saturate(220%) brightness(0.85)",
    WebkitBackdropFilter: "blur(48px) saturate(220%) brightness(0.85)",
    border: "1px solid rgba(255,255,255,0.14)",
    boxShadow: "0 32px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.05) inset",
  };
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [folder, setFolder] = useState<string>("all");
  const [selected, setSelected] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [autoAltLoading, setAutoAltLoading] = useState(false);
  const [autoAltResult, setAutoAltResult] = useState<string>("");
  const [dragOver, setDragOver] = useState(false);
  // Bulk delete
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkConfirm, setBulkConfirm] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const loadFiles = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/media");
    const data = await res.json();
    setFiles(data.files ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { loadFiles(); }, [loadFiles]);

  // Filter
  const filtered = files.filter((f) => {
    const matchFolder = folder === "all" || f.folder === folder;
    const matchSearch = !search || f.filename.toLowerCase().includes(search.toLowerCase()) ||
      f.alt.toLowerCase().includes(search.toLowerCase()) ||
      f.usedIn.some((u) => u.name.toLowerCase().includes(search.toLowerCase()));
    return matchFolder && matchSearch;
  });

  const folders = ["all", ...Array.from(new Set(files.map((f) => f.folder)))];

  // Deletable in bulk = not in use
  const bulkDeletable = filtered.filter(f => f.usedIn.length === 0);
  const bulkSelectedCount = bulkSelected.size;
  const bulkSelectedDeletable = Array.from(bulkSelected).filter(url => {
    const f = files.find(x => x.url === url);
    return f && f.usedIn.length === 0;
  });

  async function upload(file: File) {
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("folder", folder === "all" ? "products" : folder);
    await fetch("/api/admin/upload", { method: "POST", body: fd });
    await loadFiles();
    setUploading(false);
  }

  async function handleFiles(fileList: FileList | null) {
    if (!fileList) return;
    for (const f of Array.from(fileList)) await upload(f);
  }

  async function deleteFile(url: string) {
    await fetch("/api/admin/media", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete", url }) });
    setFiles((prev) => prev.filter((f) => f.url !== url));
    if (selected === url) setSelected(null);
  }

  async function bulkDelete() {
    setBulkDeleting(true);
    setBulkConfirm(false);
    const toDelete = bulkSelectedDeletable;
    for (const url of toDelete) {
      await fetch("/api/admin/media", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete", url }) });
    }
    setFiles((prev) => prev.filter(f => !toDelete.includes(f.url)));
    setBulkSelected(new Set());
    setBulkMode(false);
    setBulkDeleting(false);
  }

  function toggleBulkSelect(url: string) {
    setBulkSelected(prev => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  }

  function selectAllBulk() {
    setBulkSelected(new Set(bulkDeletable.map(f => f.url)));
  }

  function clearBulkSelect() {
    setBulkSelected(new Set());
  }

  async function saveAlt(url: string, alt: string) {
    await fetch("/api/admin/media", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "save_alt", url, alt }) });
    setFiles((prev) => prev.map((f) => f.url === url ? { ...f, alt } : f));
  }

  async function autoGenerateAlt() {
    setAutoAltLoading(true);
    const res = await fetch("/api/admin/media", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "auto_generate_alt" }) });
    const data = await res.json();
    setAutoAltResult(`Заполнено ALT: ${data.count} файлов`);
    await loadFiles();
    setAutoAltLoading(false);
    setTimeout(() => setAutoAltResult(""), 3000);
  }

  function copyUrl(url: string) {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      {!pickerMode && (
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-display font-bold">Медиабиблиотека</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{files.length} файлов</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link
              href="/admin/images/fix"
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 text-sm font-medium hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
            >
              <ScanSearch className="w-4 h-4" />
              Диагностика фото
            </Link>
            <button onClick={autoGenerateAlt} disabled={autoAltLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-card text-sm hover:bg-primary/[0.08] transition-colors disabled:opacity-50">
              {autoAltLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4 text-primary" />}
              Авто ALT по товарам
            </button>
            {/* Bulk mode toggle */}
            <button
              onClick={() => { setBulkMode(!bulkMode); setBulkSelected(new Set()); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-colors ${
                bulkMode
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card hover:bg-primary/[0.08] text-foreground"
              }`}
            >
              {bulkMode ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
              {bulkMode ? "Отмена выбора" : "Выбрать несколько"}
            </button>
            {autoAltResult && <span className="text-sm text-emerald-600 self-center">{autoAltResult}</span>}
          </div>
        </div>
      )}

      {/* Bulk actions toolbar */}
      {bulkMode && !pickerMode && (
        <div className="flex items-center gap-3 px-4 py-3 bg-primary/5 border border-primary/20 rounded-2xl flex-wrap">
          <div className="flex items-center gap-2 text-sm font-medium">
            <CheckSquare className="w-4 h-4 text-primary" />
            <span>Выбрано: <strong className="text-primary">{bulkSelectedCount}</strong></span>
            {bulkSelectedCount > 0 && bulkSelectedCount !== bulkSelectedDeletable.length && (
              <span className="text-xs text-muted-foreground">({bulkSelectedDeletable.length} можно удалить)</span>
            )}
          </div>
          <div className="flex gap-2 ml-auto flex-wrap">
            <button
              onClick={selectAllBulk}
              className="px-3 py-1.5 rounded-xl border border-border text-xs font-medium hover:bg-primary/[0.08] transition-colors"
            >
              Выбрать все свободные ({bulkDeletable.length})
            </button>
            {bulkSelectedCount > 0 && (
              <button
                onClick={clearBulkSelect}
                className="px-3 py-1.5 rounded-xl border border-border text-xs font-medium hover:bg-primary/[0.08] transition-colors"
              >
                Снять выделение
              </button>
            )}
            {bulkSelectedDeletable.length > 0 && (
              <button
                onClick={() => setBulkConfirm(true)}
                disabled={bulkDeleting}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-destructive text-white text-xs font-semibold hover:bg-destructive/90 transition-colors disabled:opacity-50"
              >
                {bulkDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                Удалить выбранные ({bulkSelectedDeletable.length})
              </button>
            )}
          </div>
        </div>
      )}

      {/* Upload zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
        onClick={() => fileRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-colors ${
          dragOver ? "border-primary bg-primary/15" : "border-border hover:border-primary/40 hover:bg-primary/[0.05]"
        }`}
      >
        <input ref={fileRef} type="file" multiple accept="image/*" className="hidden" onChange={(e) => handleFiles(e.target.files)} />
        {/* Camera input for mobile */}
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleFiles(e.target.files)} />
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          {uploading ? (
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          ) : (
            <Upload className="w-8 h-8 opacity-50" />
          )}
          <p className="text-sm font-medium">
            {uploading ? "Загружаем..." : "Перетащите фото или нажмите для выбора"}
          </p>
          <p className="text-xs">JPG, PNG, WebP, SVG · с компьютера или телефона</p>
        </div>
      </div>

      {/* Mobile camera upload button */}
      {!pickerMode && (
        <button
          onClick={(e) => { e.stopPropagation(); cameraRef.current?.click(); }}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border text-sm text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-colors"
        >
          <Smartphone className="w-4 h-4" />
          Сфотографировать с телефона / камеры
        </button>
      )}

      {/* Filters */}
      <div className="flex gap-1 flex-wrap items-center">
        {folders.map((f) => (
          <button key={f} onClick={() => setFolder(f)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
              folder === f ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80 text-muted-foreground"
            }`}>
            {f === "all" ? "Все" : f}
          </button>
        ))}
      </div>

      {/* ALT info banner */}
      {!pickerMode && (
        <InfoCard
          title="ALT атрибут фото"
          body="Описание фото для поисковиков и незрячих. «Авто ALT по товарам» — заполняет ALT из названий связанных товаров автоматически."
          width={280}
        />
      )}

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <FolderOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>{search ? "Ничего не найдено" : "Нет файлов"}</p>
        </div>
      ) : (
        <div className={`grid gap-3 ${pickerMode ? "grid-cols-3 sm:grid-cols-4 md:grid-cols-5" : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"}`}>
          {filtered.map((file) => (
            <MediaCard
              key={file.url}
              file={file}
              selected={selected === file.url}
              bulkMode={bulkMode}
              bulkSelected={bulkSelected.has(file.url)}
              onSelect={() => {
                if (pickerMode && onPick) { onPick(file.url); return; }
                if (bulkMode) { toggleBulkSelect(file.url); return; }
                setSelected(selected === file.url ? null : file.url);
              }}
              onDelete={() => deleteFile(file.url)}
              onAltSave={(alt) => saveAlt(file.url, alt)}
              onCopy={() => copyUrl(file.url)}
            />
          ))}
        </div>
      )}

      {/* Copy feedback */}
      {copiedUrl && (
        <div className="fixed bottom-6 right-6 z-50 bg-foreground text-background px-4 py-2 rounded-xl text-sm font-medium shadow-lg flex items-center gap-2 animate-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          URL скопирован
        </div>
      )}

      {/* Bulk delete confirm dialog */}
      {bulkConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setBulkConfirm(false)} />
          <div className="relative rounded-2xl p-6 w-full max-w-sm text-center space-y-4" style={popupStyle}>
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6 text-destructive" />
            </div>
            <div>
              <p className="font-display font-bold text-lg" style={{ color: isClassic ? undefined : "rgba(255,255,255,0.92)" }}>Удалить {bulkSelectedDeletable.length} фото?</p>
              <p className="text-sm mt-1" style={{ color: isClassic ? undefined : "rgba(255,255,255,0.55)" }}>Файлы будут удалены с сервера навсегда. Это действие нельзя отменить.</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setBulkConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-primary/[0.08] transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={bulkDelete}
                className="flex-1 py-2.5 rounded-xl bg-destructive text-white text-sm font-semibold hover:bg-destructive/90 transition-colors"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Picker modal (for use inside product edit) ────────────────────────────────
export function MediaPickerModal({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (url: string) => void }) {
  const isClassic = useClassicMode();
  const popupStyle = isClassic ? {
    background: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
  } : {
    background: "rgba(12,12,14,0.82)",
    backdropFilter: "blur(48px) saturate(220%) brightness(0.85)",
    WebkitBackdropFilter: "blur(48px) saturate(220%) brightness(0.85)",
    border: "1px solid rgba(255,255,255,0.14)",
    boxShadow: "0 32px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.05) inset",
  };
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden" style={popupStyle}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <h2 className="font-bold text-lg" style={{ color: isClassic ? undefined : "rgba(255,255,255,0.92)" }}>Выбрать из медиабиблиотеки</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-primary/[0.04] flex items-center justify-center transition-colors" style={{ color: isClassic ? undefined : "rgba(255,255,255,0.6)" }}>
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          <MediaClient pickerMode onPick={(url) => { onPick(url); onClose(); }} />
        </div>
      </div>
    </div>
  );
}
