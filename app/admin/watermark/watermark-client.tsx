"use client";

import { useState, useRef } from "react";
import { Upload, CheckCircle, Loader2, Image as ImageIcon, Layers, Sliders, Zap } from "lucide-react";
import Image from "next/image";

const POSITIONS = [
  { value: "bottom-right", label: "Правый низ" },
  { value: "bottom-left", label: "Левый низ" },
  { value: "top-right", label: "Правый верх" },
  { value: "top-left", label: "Левый верх" },
  { value: "center", label: "Центр" },
];

interface Props {
  initialLogoUrl: string;
  initialPosition: string;
  initialOpacity: number;
  initialSizePct: number;
}

export function WatermarkClient({ initialLogoUrl, initialPosition, initialOpacity, initialSizePct }: Props) {
  const [logoUrl, setLogoUrl] = useState(initialLogoUrl);
  const [position, setPosition] = useState(initialPosition);
  const [opacity, setOpacity] = useState(initialOpacity);
  const [sizePct, setSizePct] = useState(initialSizePct);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [applying, setApplying] = useState(false);
  const [savedOk, setSavedOk] = useState(false);
  const [applyResult, setApplyResult] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/watermark", { method: "POST", body: formData });
      const data = await res.json();
      if (data.url) setLogoUrl(data.url);
    } finally {
      setUploading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      await fetch("/api/admin/watermark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save_settings", position, opacity, sizePct }),
      });
      setSavedOk(true);
      setTimeout(() => setSavedOk(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  const applyToAll = async () => {
    if (!confirm("Применить водяной знак ко ВСЕМ фото товаров? Это нельзя отменить автоматически.")) return;
    setApplying(true);
    setApplyResult(null);
    try {
      const res = await fetch("/api/admin/watermark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "apply_all", position, opacity, sizePct }),
      });
      const data = await res.json();
      setApplyResult(data.ok ? `Готово! Обработано товаров: ${data.count}` : `Ошибка: ${data.error}`);
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Logo upload */}
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
              Используйте PNG с прозрачным фоном для лучшего результата.
              Логотип будет масштабирован автоматически.
            </p>
            <input ref={fileRef} type="file" accept="image/png,image/webp,image/svg+xml" className="hidden" onChange={handleLogoUpload} />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {uploading ? "Загружаем..." : logoUrl ? "Заменить логотип" : "Загрузить логотип"}
            </button>
          </div>
        </div>
      </div>

      {/* Settings */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-5">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-primary" />
          <h3 className="font-semibold">Настройки</h3>
        </div>

        {/* Position */}
        <div>
          <p className="text-sm font-medium mb-2">Расположение</p>
          <div className="grid grid-cols-3 gap-2">
            {POSITIONS.map((p) => (
              <button
                key={p.value}
                onClick={() => setPosition(p.value)}
                className={`px-3 py-2 rounded-lg text-sm border transition-colors ${
                  position === p.value
                    ? "border-primary bg-primary/10 text-primary font-medium"
                    : "border-border hover:bg-accent"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Opacity */}
        <div>
          <p className="text-sm font-medium mb-2">Прозрачность: {Math.round(opacity * 100)}%</p>
          <input
            type="range"
            min={0.1}
            max={1}
            step={0.05}
            value={opacity}
            onChange={(e) => setOpacity(parseFloat(e.target.value))}
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>Прозрачный</span>
            <span>Непрозрачный</span>
          </div>
        </div>

        {/* Size */}
        <div>
          <p className="text-sm font-medium mb-2">Размер: {sizePct}% от фото</p>
          <input
            type="range"
            min={5}
            max={40}
            step={1}
            value={sizePct}
            onChange={(e) => setSizePct(parseInt(e.target.value))}
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>Маленький</span>
            <span>Большой</span>
          </div>
        </div>

        <button
          onClick={saveSettings}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : savedOk ? <CheckCircle className="w-4 h-4" /> : <Layers className="w-4 h-4" />}
          {saving ? "Сохраняем..." : savedOk ? "Сохранено!" : "Сохранить настройки"}
        </button>
      </div>

      {/* Batch apply */}
      <div className="bg-card border border-amber-500/30 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-500" />
          <h3 className="font-semibold">Пакетное применение</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Применить водяной знак сразу ко всем фотографиям товаров на сайте.
          Исходные фото будут заменены — рекомендуем сначала сохранить настройки выше.
        </p>
        {applyResult && (
          <div className="text-sm font-medium text-emerald-500">{applyResult}</div>
        )}
        <button
          onClick={applyToAll}
          disabled={applying || !logoUrl}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 disabled:opacity-50 transition-colors"
        >
          {applying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
          {applying ? "Применяем..." : "Применить ко всем фото"}
        </button>
      </div>
    </div>
  );
}
