"use client";

import { useState, useRef } from "react";
import { Upload, CheckCircle, Loader2, Image as ImageIcon, Layers, Sliders, Zap, AlertCircle, Type, RotateCcw, ShieldCheck, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";

const POSITIONS = [
  { value: "bottom-right", label: "Правый низ" },
  { value: "bottom-left",  label: "Левый низ"  },
  { value: "top-right",    label: "Правый верх" },
  { value: "top-left",     label: "Левый верх"  },
  { value: "center",       label: "Центр"       },
];

interface Props {
  initialLogoUrl:    string;
  initialPosition:   string;
  initialOpacity:    number;
  initialSizePct:    number;
  initialType?:      string;
  initialText?:      string;
  initialTextColor?: string;
  initialBackupDate?: string;
}

export function WatermarkClient({
  initialLogoUrl, initialPosition, initialOpacity, initialSizePct,
  initialType = "logo", initialText = "", initialTextColor = "#ffffff",
  initialBackupDate = "",
}: Props) {
  const [logoUrl,    setLogoUrl]    = useState(initialLogoUrl);
  const [position,   setPosition]   = useState(initialPosition);
  const [opacity,    setOpacity]    = useState(initialOpacity);
  const [sizePct,    setSizePct]    = useState(initialSizePct);
  const [wmType,     setWmType]     = useState<"logo"|"text">(initialType === "text" ? "text" : "logo");
  const [wmText,     setWmText]     = useState(initialText);
  const [textColor,  setTextColor]  = useState(initialTextColor);
  const [backupDate, setBackupDate] = useState(initialBackupDate);

  const [uploading,  setUploading]  = useState(false);
  const [uploadError,setUploadError]= useState<string | null>(null);
  const [uploadOk,   setUploadOk]   = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [savedOk,    setSavedOk]    = useState(false);
  const [applying,   setApplying]   = useState(false);
  const [backing,    setBacking]    = useState(false);
  const [restoring,  setRestoring]  = useState(false);
  const [cleaning,   setCleaning]   = useState(false);
  const [applyResult,setApplyResult]= useState<string | null>(null);
  const [applyOk,    setApplyOk]    = useState<boolean | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [confirmBackup,   setConfirmBackup]   = useState(false);
  const [confirmRestore,  setConfirmRestore]  = useState(false);
  const [confirmCleanup,  setConfirmCleanup]  = useState(false);
  const [confirmApplyAll, setConfirmApplyAll] = useState(false);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setUploadError(null); setUploadOk(false);
    try {
      const form = new FormData();
      form.append("file", file);
      const res  = await fetch("/api/admin/watermark", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok || data.error) { setUploadError(data.error || `Ошибка ${res.status}`); return; }
      if (data.url) { setLogoUrl(data.url + "?t=" + Date.now()); setUploadOk(true); setTimeout(() => setUploadOk(false), 3000); }
    } catch { setUploadError("Не удалось подключиться к серверу"); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ""; }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      await fetch("/api/admin/watermark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save_settings", position, opacity, sizePct, type: wmType, text: wmText, textColor }),
      });
      setSavedOk(true);
      setTimeout(() => setSavedOk(false), 2500);
    } finally { setSaving(false); }
  };

  const backupImages = async () => {
    setBacking(true);
    try {
      const res  = await fetch("/api/admin/watermark", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "backup_images" }) });
      const data = await res.json();
      if (data.ok) {
        const now = new Date().toLocaleString("ru-RU", { day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit" });
        setBackupDate(now);
        setApplyResult(`Резервная копия создана: ${data.count} товаров`);
        setApplyOk(true);
      }
    } finally { setBacking(false); }
  };

  const restoreImages = async () => {
    setRestoring(true);
    setApplyResult(null);
    try {
      const res  = await fetch("/api/admin/watermark", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "restore_images" }) });
      const data = await res.json();
      setApplyResult(data.ok ? `Восстановлено: ${data.restored} товаров` : `Ошибка: ${data.error}`);
      setApplyOk(data.ok ? true : false);
    } finally { setRestoring(false); }
  };

  const cleanupOrphans = async () => {
    setCleaning(true); setApplyResult(null);
    try {
      const res  = await fetch("/api/admin/watermark", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "cleanup_orphans" }) });
      const data = await res.json();
      setApplyResult(data.ok ? `Удалено дублей: ${data.deleted} файл(ов)` : `Ошибка: ${data.error}`);
      setApplyOk(data.ok ? true : false);
    } finally { setCleaning(false); }
  };

  const applyToAll = async () => {
    setApplying(true); setApplyResult(null);
    try {
      const res  = await fetch("/api/admin/watermark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "apply_all", position, opacity, sizePct, type: wmType, text: wmText, textColor }),
      });
      const data = await res.json();
      setApplyResult(data.ok ? `Готово! Обработано товаров: ${data.count}` : `Ошибка: ${data.error}`);
      setApplyOk(data.ok ? true : false);
    } finally { setApplying(false); }
  };

  return (
    <div className="space-y-6">

      {/* ── Тип водяного знака ── */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-primary" />
          <h3 className="font-semibold">Тип водяного знака</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => setWmType("logo")}
            className={`flex flex-col items-center gap-2 py-4 rounded-xl border-2 transition-all ${wmType === "logo" ? "border-primary bg-primary/15" : "border-border hover:border-primary/40"}`}>
            <ImageIcon className={`w-6 h-6 ${wmType === "logo" ? "text-primary" : "text-muted-foreground"}`} />
            <span className={`text-sm font-medium ${wmType === "logo" ? "text-primary" : ""}`}>Логотип / Иконка</span>
            <span className="text-[11px] text-muted-foreground text-center">PNG с прозрачным фоном</span>
          </button>
          <button onClick={() => setWmType("text")}
            className={`flex flex-col items-center gap-2 py-4 rounded-xl border-2 transition-all ${wmType === "text" ? "border-primary bg-primary/15" : "border-border hover:border-primary/40"}`}>
            <Type className={`w-6 h-6 ${wmType === "text" ? "text-primary" : "text-muted-foreground"}`} />
            <span className={`text-sm font-medium ${wmType === "text" ? "text-primary" : ""}`}>Текст</span>
            <span className="text-[11px] text-muted-foreground text-center">Название сайта или домен</span>
          </button>
        </div>
      </div>

      {/* ── Логотип ── */}
      {wmType === "logo" && (
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-primary" />
            <h3 className="font-semibold">Логотип / водяной знак</h3>
          </div>
          <div className="flex items-start gap-4">
            <div className="shrink-0">
              {logoUrl ? (
                <div className="w-24 h-24 rounded-xl border border-border overflow-hidden bg-checkerboard flex items-center justify-center">
                  <Image src={logoUrl} alt="Watermark" width={80} height={80} className="object-contain" />
                </div>
              ) : (
                <div className="w-24 h-24 rounded-xl border-2 border-dashed border-border flex items-center justify-center text-muted-foreground">
                  <ImageIcon className="w-8 h-8" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground mb-3">
                PNG с прозрачным фоном. Логотип масштабируется автоматически.
              </p>
              <input ref={fileRef} type="file" accept="image/png,image/webp,image/svg+xml" className="hidden" onChange={handleLogoUpload} />
              <button onClick={() => fileRef.current?.click()} disabled={uploading}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : uploadOk ? <CheckCircle className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
                {uploading ? "Загружаем..." : uploadOk ? "Загружено!" : logoUrl ? "Заменить" : "Загрузить PNG"}
              </button>
              {uploadError && <div className="flex items-center gap-2 mt-2 text-sm text-destructive"><AlertCircle className="w-4 h-4" />{uploadError}</div>}
              {uploadOk    && <p className="mt-1.5 text-xs text-emerald-600 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Логотип успешно загружен</p>}
            </div>
          </div>
        </div>
      )}

      {/* ── Текстовый водяной знак ── */}
      {wmType === "text" && (
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Type className="w-4 h-4 text-primary" />
            <h3 className="font-semibold">Текст водяного знака</h3>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1.5">Текст</label>
            <input type="text" value={wmText} onChange={e => setWmText(e.target.value)}
              placeholder="pilo-rus.ru или © ПилоРус"
              className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1.5">Цвет текста</label>
            <div className="flex items-center gap-3">
              <input type="color" value={textColor} onChange={e => setTextColor(e.target.value)}
                className="w-10 h-10 rounded-lg border border-border cursor-pointer p-0.5" />
              <div className="flex gap-2">
                {["#ffffff","#000000","#cccccc","#ff6600"].map(c => (
                  <button key={c} onClick={() => setTextColor(c)}
                    className={`w-8 h-8 rounded-lg border-2 transition-all ${textColor === c ? "border-primary scale-110" : "border-border"}`}
                    style={{ background: c }} title={c} />
                ))}
              </div>
            </div>
          </div>
          {/* Preview */}
          {wmText && (
            <div className="rounded-xl bg-muted p-4 flex items-center justify-center" style={{ minHeight: 80 }}>
              <span className="font-bold text-lg tracking-wider" style={{ color: textColor, textShadow: "0 1px 3px rgba(0,0,0,0.4)", opacity: opacity }}>
                {wmText}
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── Настройки ── */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-5">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-primary" />
          <h3 className="font-semibold">Настройки</h3>
        </div>

        {/* Position */}
        <div>
          <p className="text-sm font-medium mb-2">Расположение</p>
          <div className="grid grid-cols-3 gap-2">
            {POSITIONS.map(p => (
              <button key={p.value} onClick={() => setPosition(p.value)}
                className={`px-3 py-2 rounded-lg text-sm border transition-colors ${position === p.value ? "border-primary bg-primary/10 text-primary font-medium" : "border-border hover:bg-accent"}`}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Opacity */}
        <div>
          <p className="text-sm font-medium mb-2">Прозрачность: {Math.round(opacity * 100)}%</p>
          <input type="range" min={0.05} max={1} step={0.05} value={opacity} onChange={e => setOpacity(parseFloat(e.target.value))} className="w-full accent-primary" />
          <div className="flex justify-between text-xs text-muted-foreground mt-1"><span>Прозрачный</span><span>Непрозрачный</span></div>
        </div>

        {/* Size */}
        <div>
          <p className="text-sm font-medium mb-2">Размер: {sizePct}% от фото</p>
          <input type="range" min={5} max={40} step={1} value={sizePct} onChange={e => setSizePct(parseInt(e.target.value))} className="w-full accent-primary" />
          <div className="flex justify-between text-xs text-muted-foreground mt-1"><span>Маленький</span><span>Большой</span></div>
        </div>

        <button onClick={saveSettings} disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : savedOk ? <CheckCircle className="w-4 h-4" /> : <Layers className="w-4 h-4" />}
          {saving ? "Сохраняем..." : savedOk ? "Сохранено!" : "Сохранить настройки"}
        </button>
      </div>

      {/* ── Пакетное применение + авто-бэкап ── */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" />
          <h3 className="font-semibold">Применить ко всем фото</h3>
        </div>

        <div className="flex items-start gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-sm">
          <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Защита включена автоматически</p>
            <p className="text-xs mt-0.5">Перед применением система сама сохраняет резервную копию всех фото. Отменить можно в любой момент.</p>
          </div>
        </div>

        {backupDate && (
          <p className="text-xs text-muted-foreground">Последняя копия: {backupDate}</p>
        )}

        {applyResult && (
          <div className={`flex items-center gap-2 text-sm font-medium ${applyOk === true ? "text-emerald-600" : applyOk === false ? "text-destructive" : "text-muted-foreground"}`}>
            {applyOk === true  && <CheckCircle className="w-4 h-4 shrink-0" />}
            {applyOk === false && <AlertCircle className="w-4 h-4 shrink-0" />}
            {applyResult}
          </div>
        )}

        <div className="flex gap-3 flex-wrap">
          <button onClick={() => setConfirmApplyAll(true)} disabled={applying || (wmType === "logo" && !logoUrl) || (wmType === "text" && !wmText.trim())}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors">
            {applying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            {applying ? "Применяем..." : "Применить ко всем фото"}
          </button>

          {backupDate && (
            <button onClick={() => setConfirmRestore(true)} disabled={restoring}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-primary/[0.08] disabled:opacity-50 transition-colors">
              {restoring ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
              {restoring ? "Восстанавливаем..." : "Отменить — вернуть оригиналы"}
            </button>
          )}
        </div>

        {/* Cleanup orphaned duplicates */}
        <div className="pt-3 border-t border-border/60">
          <p className="text-xs text-muted-foreground mb-2">
            Старые wm-файлы больше не нужны — теперь при повторном применении они перезаписываются автоматически (без дублей). Удалите накопившиеся старые файлы кнопкой ниже:
          </p>
          <button onClick={() => setConfirmCleanup(true)} disabled={cleaning}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-destructive hover:border-destructive/40 hover:bg-destructive/5 disabled:opacity-50 transition-colors">
            {cleaning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            {cleaning ? "Очищаем..." : "Удалить дубли / неиспользуемые wm-файлы"}
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmBackup}
        onClose={() => setConfirmBackup(false)}
        onConfirm={() => { setConfirmBackup(false); backupImages(); }}
        title="Создать резервную копию?"
        description="Создать резервную копию всех фото товаров? Это позволит восстановить их после применения водяного знака."
        confirmLabel="Создать копию"
        variant="default"
        loading={backing}
      />
      <ConfirmDialog
        open={confirmRestore}
        onClose={() => setConfirmRestore(false)}
        onConfirm={() => { setConfirmRestore(false); restoreImages(); }}
        title="Восстановить оригиналы?"
        description="Восстановить все фото товаров из резервной копии? Это отменит применённые водяные знаки."
        confirmLabel="Восстановить"
        variant="warning"
        loading={restoring}
      />
      <ConfirmDialog
        open={confirmCleanup}
        onClose={() => setConfirmCleanup(false)}
        onConfirm={() => { setConfirmCleanup(false); cleanupOrphans(); }}
        title="Удалить неиспользуемые файлы?"
        description="Удалить все неиспользуемые wm-* файлы? Файлы, на которые не ссылается ни один товар, будут удалены."
        confirmLabel="Удалить"
        variant="danger"
        loading={cleaning}
      />
      <ConfirmDialog
        open={confirmApplyAll}
        onClose={() => setConfirmApplyAll(false)}
        onConfirm={() => { setConfirmApplyAll(false); applyToAll(); }}
        title="Применить ко всем фото?"
        description="Водяной знак будет применён ко ВСЕМ фото товаров. Сначала создайте резервную копию если ещё не сделали!"
        confirmLabel="Применить"
        variant="warning"
        loading={applying}
      />
    </div>
  );
}
