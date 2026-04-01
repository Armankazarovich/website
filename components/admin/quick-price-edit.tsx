"use client";
import { useState, useRef, useEffect } from "react";
import { Check, X, Loader2 } from "lucide-react";

interface QuickPriceEditProps {
  variantId: string;
  field: "pricePerCube" | "pricePerPiece";
  initialValue: number | null;
  unit: string; // "м³" or "шт"
  onSaved?: (newValue: number) => void;
}

export function QuickPriceEdit({ variantId, field, initialValue, unit, onSaved }: QuickPriceEditProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(initialValue || ""));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const save = async () => {
    const num = parseFloat(value);
    if (isNaN(num) || num < 0) return;
    setSaving(true);
    try {
      await fetch("/api/admin/products/quick-edit", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantId, [field]: num }),
      });
      onSaved?.(num);
      setSaved(true);
      setEditing(false);
      setTimeout(() => setSaved(false), 2000);
    } finally { setSaving(false); }
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <input
          ref={inputRef}
          type="number"
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false); }}
          className="w-24 px-2 py-1 text-sm border border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        <span className="text-xs text-muted-foreground">/{unit}</span>
        {saving ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
        ) : (
          <>
            <button onClick={save} className="w-6 h-6 flex items-center justify-center rounded-lg bg-primary text-primary-foreground hover:bg-primary/90">
              <Check className="w-3 h-3" />
            </button>
            <button onClick={() => setEditing(false)} className="w-6 h-6 flex items-center justify-center rounded-lg border border-border hover:bg-muted">
              <X className="w-3 h-3" />
            </button>
          </>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className={`text-sm font-semibold hover:text-primary hover:underline transition-colors cursor-pointer group flex items-center gap-1 ${saved ? "text-emerald-600" : ""}`}
      title="Нажмите для быстрого редактирования"
    >
      {saved ? "✓ Сохранено" : initialValue ? `${initialValue.toLocaleString("ru-RU")} ₽/${unit}` : <span className="text-muted-foreground text-xs">+ цена</span>}
    </button>
  );
}
