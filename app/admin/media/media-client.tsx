"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  Upload, Trash2, Copy, CheckCircle2, Loader2,
  Wand2, X, ExternalLink, FolderOpen, ScanSearch,
  CheckSquare, Square, Smartphone, Video, FileText,
  Search, ImageIcon,
} from "lucide-react";
import { InfoCard } from "@/components/admin/info-popup";
import { useAdminOverlayGuard } from "@/lib/use-admin-overlay-guard";
import { useClassicMode } from "@/lib/use-classic-mode";

type MediaKind = "image" | "video" | "document";
type PickerKind = "image" | "video" | "all";
type QuickFilter = "all" | "missing-alt" | "used" | "unused" | "images" | "videos";
const MEDIA_BATCH = 96;
const MEDIA_UPLOAD_ACCEPT = "image/*,video/*,.mp4,.webm,.mov,.m4v";
const CAMERA_IMAGE_ACCEPT = "image/*,.jpg,.jpeg,.png,.webp,.gif";
const VIDEO_FILE_EXTENSIONS = new Set(["mp4", "webm", "mov", "m4v"]);
const FOLDER_LABELS: Record<string, string> = {
  all: "Все",
  products: "Товары",
  categories: "Категории",
  production: "Производство",
  aray: "Арай",
  watermarks: "Водяные знаки",
  banners: "Баннеры",
  posts: "Новости",
  services: "Услуги",
  stories: "Сторис",
  videos: "Видео",
  brand: "Бренд",
  default: "Разное",
};
const FOLDER_ORDER = [
  "all",
  "products",
  "categories",
  "production",
  "brand",
  "banners",
  "posts",
  "services",
  "stories",
  "videos",
  "aray",
  "watermarks",
  "default",
];

type MediaFile = {
  url: string; folder: string; filename: string; kind: MediaKind;
  size: number; mtime: number; alt: string;
  usedIn: { type: "product" | "category" | "service" | "post" | "story" | "review" | "promotion" | "settings"; id: string; name: string; slug: string }[];
};

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fmtDate(ts: number) {
  return new Date(ts).toLocaleDateString("ru", { day: "2-digit", month: "short", year: "numeric" });
}

function folderLabel(folder: string) {
  return FOLDER_LABELS[folder] ?? folder;
}

function fileLooksVideo(file?: File) {
  if (!file) return false;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return file.type.startsWith("video/") || VIDEO_FILE_EXTENSIONS.has(ext);
}

// ── File card ─────────────────────────────────────────────────────────────────
function MediaCard({
  file, selected, bulkMode, bulkSelected, pickerMode, onSelect, onDelete, onAltSave, onCopy,
}: {
  file: MediaFile;
  selected: boolean;
  bulkMode: boolean;
  bulkSelected: boolean;
  pickerMode?: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onAltSave: (alt: string) => Promise<void>;
  onCopy: () => void;
}) {
  const [alt, setAlt] = useState(file.alt);
  const [altSaved, setAltSaved] = useState(false);
  const [altError, setAltError] = useState("");
  const [delConfirm, setDelConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewFailed, setPreviewFailed] = useState(false);

  const saveAlt = async () => {
    setSaving(true);
    setAltError("");
    try {
      await onAltSave(alt);
      setAltSaved(true);
      setTimeout(() => setAltSaved(false), 1500);
    } catch (error) {
      setAltError(error instanceof Error ? error.message : "Не удалось сохранить ALT");
    } finally {
      setSaving(false);
    }
  };

  const ext = file.filename.split(".").pop()?.toUpperCase() ?? "";
  const isImage = file.kind === "image";
  const isVideo = file.kind === "video";

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
        {isImage && !previewFailed ? (
          <img
            src={file.url}
            alt={file.alt || file.filename}
            loading="lazy"
            className="h-full w-full object-cover"
            onError={() => setPreviewFailed(true)}
          />
        ) : isVideo && !previewFailed ? (
          <video
            src={file.url}
            className="h-full w-full object-cover"
            muted
            preload="metadata"
            playsInline
            onError={() => setPreviewFailed(true)}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
            {isVideo ? <Video className="h-8 w-8 opacity-45" /> : <FileText className="h-8 w-8 opacity-45" />}
            <span className="text-xs font-bold">{ext || "FILE"}</span>
          </div>
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

        {!bulkMode && (
          <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center justify-between gap-1">
            <span className={`rounded-full border px-1.5 py-0.5 text-[10px] font-bold ${
              file.alt.trim()
                ? "border-primary/30 bg-primary/10 text-primary"
                : "border-destructive/30 bg-destructive/10 text-destructive"
            }`}>
              {file.alt.trim() ? "ALT" : "Нет ALT"}
            </span>
            <span className={`rounded-full border px-1.5 py-0.5 text-[10px] font-bold ${
              file.usedIn.length > 0
                ? "border-primary/30 bg-card text-primary"
                : "border-border bg-muted text-muted-foreground"
            }`}>
              {file.usedIn.length > 0 ? "В деле" : "Свободно"}
            </span>
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
        {!bulkMode && !pickerMode && (
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
      <div className="p-2 space-y-1.5" onClick={pickerMode ? undefined : (e) => e.stopPropagation()}>
        <p className="text-[11px] text-muted-foreground truncate" title={file.filename}>{file.filename}</p>
        <p className="text-[10px] text-muted-foreground">{fmtSize(file.size)} · {fmtDate(file.mtime)}</p>

        {!bulkMode && !pickerMode && (
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
            {altError && <p className="text-[10px] text-destructive">{altError}</p>}
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
export function MediaClient({
  pickerMode = false,
  onPick,
  pickerKind = "image",
  initialFolder,
}: {
  pickerMode?: boolean;
  onPick?: (url: string, file?: MediaFile) => void;
  pickerKind?: PickerKind;
  initialFolder?: string;
}) {
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
  const [loadError, setLoadError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [search, setSearch] = useState("");
  const [folder, setFolder] = useState<string>("all");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
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
  useAdminOverlayGuard(bulkConfirm);
  const [renderLimit, setRenderLimit] = useState(MEDIA_BATCH);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const loadFiles = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const res = await fetch("/api/admin/media");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Не удалось загрузить медиабиблиотеку");
      setFiles(data.files ?? []);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Не удалось загрузить медиабиблиотеку");
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadFiles(); }, [loadFiles]);

  const stats = {
    total: files.length,
    images: files.filter((file) => file.kind === "image").length,
    missingAlt: files.filter((file) => file.kind === "image" && !file.alt.trim()).length,
    used: files.filter((file) => file.usedIn.length > 0).length,
    unused: files.filter((file) => file.usedIn.length === 0).length,
  };

  const quickFilters: Array<{ value: QuickFilter; label: string; count: number }> = [
    { value: "all", label: "Все файлы", count: stats.total },
    { value: "missing-alt", label: "Без ALT", count: stats.missingAlt },
    { value: "used", label: "Используются", count: stats.used },
    { value: "unused", label: "Свободные", count: stats.unused },
    { value: "images", label: "Фото", count: stats.images },
    { value: "videos", label: "Видео", count: files.filter((file) => file.kind === "video").length },
  ];

  function acceptsPickerKind(file: MediaFile) {
    if (pickerMode) {
      if (pickerKind === "image" && file.kind !== "image") return false;
      if (pickerKind === "video" && file.kind !== "video") return false;
      if (pickerKind === "all" && file.kind !== "image" && file.kind !== "video") return false;
    }
    return true;
  }

  function resolveUploadFolder(file?: File) {
    if (folder !== "all") return folder;
    return initialFolder ?? (fileLooksVideo(file) || pickerKind === "video" ? "videos" : "products");
  }

  // Filter
  const filtered = files.filter((f) => {
    if (!acceptsPickerKind(f)) return false;
    const needle = search.trim().toLowerCase();
    const matchFolder = folder === "all" || f.folder === folder;
    const matchSearch = !needle || f.filename.toLowerCase().includes(needle) ||
      f.folder.toLowerCase().includes(needle) ||
      f.alt.toLowerCase().includes(needle) ||
      f.usedIn.some((u) => u.name.toLowerCase().includes(needle) || u.slug.toLowerCase().includes(needle));
    const matchQuick =
      quickFilter === "all" ||
      (quickFilter === "missing-alt" && f.kind === "image" && !f.alt.trim()) ||
      (quickFilter === "used" && f.usedIn.length > 0) ||
      (quickFilter === "unused" && f.usedIn.length === 0) ||
      (quickFilter === "images" && f.kind === "image") ||
      (quickFilter === "videos" && f.kind === "video");
    return matchFolder && matchSearch && matchQuick;
  }).sort((a, b) => {
    if (pickerMode && folder === "all" && initialFolder) {
      const preferredFolderDiff = Number(b.folder === initialFolder) - Number(a.folder === initialFolder);
      if (preferredFolderDiff !== 0) return preferredFolderDiff;
    }
    return b.mtime - a.mtime;
  });
  const visibleFiles = filtered.slice(0, renderLimit);
  const hasMoreFiles = renderLimit < filtered.length;
  const uploadTargetFolder = resolveUploadFolder();
  const canResetMediaFilters = folder !== "all" || quickFilter !== "all" || search.trim().length > 0;

  useEffect(() => {
    setRenderLimit(MEDIA_BATCH);
  }, [search, folder, quickFilter, pickerMode, pickerKind]);

  const folders = Array.from(new Set(["all", initialFolder, ...files.map((f) => f.folder)].filter(Boolean) as string[]))
    .sort((a, b) => {
      if (a === "all") return -1;
      if (b === "all") return 1;
      if (pickerMode && initialFolder) {
        if (a === initialFolder) return -1;
        if (b === initialFolder) return 1;
      }
      const ai = FOLDER_ORDER.indexOf(a);
      const bi = FOLDER_ORDER.indexOf(b);
      if (ai === -1 && bi === -1) return a.localeCompare(b);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });

  // Deletable in bulk = not in use
  const bulkDeletable = filtered.filter(f => f.usedIn.length === 0);
  const bulkSelectedCount = bulkSelected.size;
  const bulkSelectedDeletable = Array.from(bulkSelected).filter(url => {
    const f = files.find(x => x.url === url);
    return f && f.usedIn.length === 0;
  });

  async function upload(file: File): Promise<string | null> {
    setUploading(true);
    setUploadError("");
    const fd = new FormData();
    fd.append("file", file);
    fd.append("folder", resolveUploadFolder(file));

    try {
      const response = await fetch("/api/admin/upload", { method: "POST", body: fd });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || "Не удалось загрузить файл");
      }
      const data = await response.json().catch(() => ({}));
      await loadFiles();
      if (data?.url) {
        setSelected(data.url);
        return data.url;
      }
      return null;
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Не удалось загрузить файл");
      return null;
    } finally {
      setUploading(false);
    }
  }

  async function handleFiles(fileList: FileList | null) {
    if (!fileList) return;
    const list = Array.from(fileList);
    if (list.length === 0) return;
    if (pickerMode) {
      const pickedUrl = await upload(list[0]);
      if (pickedUrl && onPick) onPick(pickedUrl);
      return;
    }
    for (const f of list) await upload(f);
  }

  async function deleteFile(url: string) {
    const res = await fetch("/api/admin/media", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete", url }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      setUploadError(data?.error || "Не удалось удалить файл");
      return;
    }
    setFiles((prev) => prev.filter((f) => f.url !== url));
    if (selected === url) setSelected(null);
  }

  async function bulkDelete() {
    setBulkDeleting(true);
    setBulkConfirm(false);
    const toDelete = bulkSelectedDeletable;
    const deleted: string[] = [];
    try {
      for (const url of toDelete) {
        const res = await fetch("/api/admin/media", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete", url }) });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.ok) throw new Error(data?.error || "Не удалось удалить часть файлов");
        deleted.push(url);
      }
      setFiles((prev) => prev.filter(f => !deleted.includes(f.url)));
      setBulkSelected(new Set());
      setBulkMode(false);
    } catch (error) {
      setFiles((prev) => prev.filter(f => !deleted.includes(f.url)));
      setUploadError(error instanceof Error ? error.message : "Не удалось удалить часть файлов");
    } finally {
      setBulkDeleting(false);
    }
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
    const res = await fetch("/api/admin/media", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "save_alt", url, alt }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) throw new Error(data?.error || "Не удалось сохранить ALT");
    setFiles((prev) => prev.map((f) => f.url === url ? { ...f, alt } : f));
  }

  async function autoGenerateAlt() {
    setAutoAltLoading(true);
    setUploadError("");
    try {
      const res = await fetch("/api/admin/media", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "auto_generate_alt" }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data?.error || "Не удалось заполнить ALT");
      setAutoAltResult(`Заполнено ALT: ${data.count} файлов`);
      await loadFiles();
      setTimeout(() => setAutoAltResult(""), 3000);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Не удалось заполнить ALT");
    } finally {
      setAutoAltLoading(false);
    }
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
            <p className="text-sm text-muted-foreground mt-0.5">
              {files.length} файлов · {stats.missingAlt} фото без ALT · {stats.unused} свободных
            </p>
          </div>
          <div className="flex w-full gap-2 flex-wrap sm:w-auto">
            <Link
              href="/admin/images/fix"
              className="flex min-h-[42px] flex-1 items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-400 dark:hover:bg-amber-900/30 sm:flex-none"
            >
              <ScanSearch className="w-4 h-4" />
              Диагностика фото
            </Link>
            <button onClick={autoGenerateAlt} disabled={autoAltLoading}
              className="flex min-h-[42px] flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm transition-colors hover:bg-primary/[0.08] disabled:opacity-50 sm:flex-none">
              {autoAltLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4 text-primary" />}
              Авто ALT по товарам
            </button>
            {/* Bulk mode toggle */}
            <button
              onClick={() => { setBulkMode(!bulkMode); setBulkSelected(new Set()); }}
              className={`flex min-h-[42px] flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-colors sm:flex-none ${
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

      {!pickerMode && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="flex items-center gap-1.5 text-xs uppercase tracking-[0.14em] text-muted-foreground">
              <ImageIcon className="h-3.5 w-3.5" />
              Фото
            </p>
            <p className="mt-1 text-2xl font-bold text-foreground">{stats.images}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Без ALT</p>
            <p className={`mt-1 text-2xl font-bold ${stats.missingAlt > 0 ? "text-amber-500" : "text-emerald-500"}`}>
              {stats.missingAlt}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">В товарах</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{stats.used}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Свободные</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{stats.unused}</p>
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
        <input ref={fileRef} type="file" multiple accept={MEDIA_UPLOAD_ACCEPT} className="hidden" onChange={(e) => handleFiles(e.target.files)} />
        {/* Camera input for mobile */}
        <input ref={cameraRef} type="file" accept={CAMERA_IMAGE_ACCEPT} capture="environment" className="hidden" onChange={(e) => handleFiles(e.target.files)} />
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          {uploading ? (
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          ) : (
            <Upload className="w-8 h-8 opacity-50" />
          )}
          <p className="text-sm font-medium">
            {uploading
              ? "Загружаем..."
              : pickerMode
              ? "Перетащите медиа сюда — оно сразу попадёт в нужную папку"
              : "Перетащите фото или видео, либо нажмите для выбора"}
          </p>
          <p className="text-xs">
            Фото до 25MB · видео MP4/WebM/MOV/M4V до 200MB · папка: {folderLabel(uploadTargetFolder)}
          </p>
        </div>
      </div>

      {uploadError && (
        <div className="rounded-xl border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {uploadError}
        </div>
      )}

      {loadError && (
        <div className="rounded-xl border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {loadError}
        </div>
      )}

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

      {/* Search */}
      <div className="rounded-2xl border border-border bg-card p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={pickerMode ? "Найти медиа по товару, ALT или имени файла..." : "Найти файл, товар, категорию или ALT..."}
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-border bg-background/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-colors"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-primary/10 text-muted-foreground hover:text-foreground transition-colors"
              title="Очистить"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-2 rounded-2xl border border-border bg-card p-3">
        {!pickerMode && (
          <div className="scrollbar-none flex gap-1.5 overflow-x-auto">
            {quickFilters.map((item) => (
              <button
                key={item.value}
                onClick={() => setQuickFilter(item.value)}
                className={`inline-flex min-h-[34px] shrink-0 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition-colors ${
                  quickFilter === item.value
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground hover:bg-primary/[0.08] hover:text-foreground"
                }`}
              >
                {item.label}
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                  quickFilter === item.value ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                }`}>
                  {item.count}
                </span>
              </button>
            ))}
          </div>
        )}
        <div className="scrollbar-none flex gap-1.5 overflow-x-auto">
          {folders.map((f) => (
            <button
              key={f}
              onClick={() => setFolder(f)}
              className={`inline-flex min-h-[34px] shrink-0 items-center rounded-xl px-3 text-xs font-medium transition-colors ${
                folder === f ? "bg-primary/10 text-primary" : "bg-muted hover:bg-muted/80 text-muted-foreground"
              }`}
            >
              {folderLabel(f)}
            </button>
          ))}
        </div>
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
        <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
          <FolderOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-semibold text-foreground">
            {search
              ? "Ничего не найдено"
              : folder !== "all"
              ? `В папке «${folderLabel(folder)}» пока пусто`
              : "Нет файлов"}
          </p>
          {pickerMode && folder === "all" && initialFolder && (
            <p className="mt-1 max-w-sm text-xs">
              Новые файлы загрузятся в папку «{folderLabel(initialFolder)}», а список показывает подходящие фото и видео из всей библиотеки.
            </p>
          )}
          {canResetMediaFilters && (
            <button
              type="button"
              onClick={() => {
                setFolder("all");
                setQuickFilter("all");
                setSearch("");
              }}
              className="mt-4 inline-flex min-h-[40px] items-center justify-center rounded-xl border border-primary/30 bg-primary/10 px-4 text-sm font-semibold text-primary transition-colors hover:bg-primary/15"
            >
              Показать все медиа
            </button>
          )}
        </div>
      ) : (
        <div className={`grid gap-3 ${pickerMode ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4" : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"}`}>
          {visibleFiles.map((file) => (
            <MediaCard
              key={file.url}
              file={file}
              selected={selected === file.url}
              bulkMode={bulkMode}
              bulkSelected={bulkSelected.has(file.url)}
              pickerMode={pickerMode}
              onSelect={() => {
                if (pickerMode && onPick) { onPick(file.url, file); return; }
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

      {!loading && hasMoreFiles && (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card/70 p-4 text-center sm:flex-row">
          <p className="text-sm text-muted-foreground">
            Показано {visibleFiles.length} из {filtered.length}. Остальные файлы подгружаются порциями.
          </p>
          <button
            onClick={() => setRenderLimit((value) => value + MEDIA_BATCH)}
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-primary/40 bg-primary/10 px-4 text-sm font-semibold text-primary transition-colors hover:bg-primary/15"
          >
            Показать ещё {Math.min(MEDIA_BATCH, filtered.length - visibleFiles.length)}
          </button>
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
        <div className="fixed inset-0 z-[220] flex items-center justify-center p-4">
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
export function MediaPickerModal({
  open,
  onClose,
  onPick,
  pickerKind = "image",
  initialFolder,
  title = "Выбрать из медиабиблиотеки",
}: {
  open: boolean;
  onClose: () => void;
  onPick: (url: string, file?: MediaFile) => void;
  pickerKind?: PickerKind;
  initialFolder?: string;
  title?: string;
}) {
  const isClassic = useClassicMode();
  useAdminOverlayGuard(open);
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
  if (!open || typeof document === "undefined") return null;
  const overlayStyle = {
    paddingTop: "max(1rem, env(safe-area-inset-top, 0px))",
    paddingBottom: "max(6.5rem, calc(env(safe-area-inset-bottom, 0px) + 6rem))",
  };
  const modalStyle = {
    ...popupStyle,
    maxHeight: "calc(100dvh - 8rem)",
  };

  const modal = (
    <div className="fixed inset-0 z-[420] flex items-center justify-center px-3 sm:px-4 pointer-events-auto" style={overlayStyle}>
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="admin-popup-liquid admin-modal-panel relative flex w-full max-w-4xl flex-col overflow-hidden rounded-2xl"
        style={modalStyle}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <h2 className="font-bold text-lg" style={{ color: isClassic ? undefined : "hsl(var(--foreground) / 0.92)" }}>{title}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-xl hover:bg-primary/[0.04] flex items-center justify-center transition-colors" style={{ color: isClassic ? undefined : "hsl(var(--foreground) / 0.6)" }}>
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          <MediaClient
            pickerMode
            pickerKind={pickerKind}
            initialFolder={initialFolder}
            onPick={(url, file) => { onPick(url, file); onClose(); }}
          />
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
