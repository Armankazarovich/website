"use client";

import { useState } from "react";
import { PALETTE_GROUPS } from "@/components/palette-provider";
import { useToast } from "@/components/ui/use-toast";
import { Lock, Image as ImageIcon } from "lucide-react";

const ASPECT_OPTIONS = [
  {
    value: "1/1",
    label: "1 : 1",
    desc: "Квадрат",
    preview: "██████\n██████\n██████\n██████",
  },
  {
    value: "4/5",
    label: "4 : 5",
    desc: "Портрет (Wildberries)",
    preview: "█████\n█████\n█████\n█████\n█████",
  },
  {
    value: "3/4",
    label: "3 : 4",
    desc: "Высокий портрет",
    preview: "████\n████\n████\n████\n████\n████",
  },
  {
    value: "4/3",
    label: "4 : 3",
    desc: "Пейзаж",
    preview: "████████\n████████\n████████\n████████",
  },
];

export function AppearanceClient({
  initialEnabledIds,
  initialPhotoAspect,
}: {
  initialEnabledIds: string[];
  initialPhotoAspect: string;
}) {
  const [enabled, setEnabled] = useState<Set<string>>(new Set(initialEnabledIds));
  const [photoAspect, setPhotoAspect] = useState(initialPhotoAspect || "1/1");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const toggle = (id: string) => {
    if (id === "timber") return;
    setEnabled((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/appearance", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          palettes_enabled: Array.from(enabled).join(","),
          photo_aspect_ratio: photoAspect,
        }),
      });
      if (!res.ok) throw new Error();
      toast({ title: "Сохранено ✓", description: "Настройки оформления обновлены" });
    } catch {
      toast({ title: "Ошибка", description: "Не удалось сохранить", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* ── Соотношение фото ── */}
      <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-primary" />
          <h3 className="font-semibold">Соотношение фотографий товаров</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Применяется ко всем карточкам и страницам товаров на сайте
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {ASPECT_OPTIONS.map((opt) => {
            const [w, h] = opt.value.split("/").map(Number);
            const isActive = photoAspect === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setPhotoAspect(opt.value)}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                  isActive
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/40 hover:bg-muted/30"
                }`}
              >
                {/* Visual preview of ratio */}
                <div
                  className={`rounded-lg ${isActive ? "bg-primary/20" : "bg-muted"} border ${isActive ? "border-primary/30" : "border-border"}`}
                  style={{
                    width: `${Math.round(48 * Math.min(1, w / h))}px`,
                    height: `${Math.round(48 * Math.min(1, h / w))}px`,
                  }}
                />
                <div className="text-center">
                  <p className={`text-sm font-bold ${isActive ? "text-primary" : ""}`}>{opt.label}</p>
                  <p className="text-[10px] text-muted-foreground leading-tight">{opt.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Цветовые темы ── */}
      <div className="bg-card border border-border rounded-2xl p-6 space-y-6">
        <div>
          <h3 className="font-semibold mb-1">Цветовые темы</h3>
          <p className="text-sm text-muted-foreground">Выберите темы доступные клиентам</p>
        </div>

        {PALETTE_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              {group.label}
            </p>
            <div className="space-y-2">
              {group.palettes.map((p) => {
                const isOn = enabled.has(p.id);
                const isLocked = p.id === "timber";
                return (
                  <button
                    key={p.id}
                    onClick={() => toggle(p.id)}
                    disabled={isLocked}
                    className={`w-full flex items-center gap-4 p-3 rounded-xl border transition-all text-left ${
                      isOn
                        ? "border-primary/40 bg-primary/5"
                        : "border-border bg-muted/30 opacity-50"
                    } ${isLocked ? "cursor-default" : "hover:border-primary/60 cursor-pointer"}`}
                  >
                    <span
                      className="w-9 h-9 rounded-full shrink-0 border-2 border-white/20 shadow"
                      style={{ background: `linear-gradient(135deg, ${p.sidebar} 50%, ${p.accent} 50%)` }}
                    />
                    <span className="flex-1 font-medium text-sm">{p.name}</span>
                    {isLocked ? (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Lock className="w-3 h-3" />
                        По умолчанию
                      </span>
                    ) : (
                      <span className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${isOn ? "bg-primary" : "bg-muted-foreground/30"}`}>
                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${isOn ? "translate-x-4" : "translate-x-1"}`} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        <div className="pt-2 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Включено: {enabled.size} из {PALETTE_GROUPS.flatMap((g) => g.palettes).length} тем
          </p>
          <button
            onClick={save}
            disabled={saving}
            className="px-6 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {saving ? "Сохранение..." : "Сохранить всё"}
          </button>
        </div>
      </div>
    </div>
  );
}
