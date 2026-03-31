"use client";

import { useState } from "react";
import { PALETTE_GROUPS } from "@/components/palette-provider";
import { useToast } from "@/components/ui/use-toast";
import { Lock } from "lucide-react";

export function AppearanceClient({ initialEnabledIds }: { initialEnabledIds: string[] }) {
  const [enabled, setEnabled] = useState<Set<string>>(new Set(initialEnabledIds));
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const toggle = (id: string) => {
    if (id === "timber") return; // timber always on
    setEnabled((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/appearance", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ palettes_enabled: Array.from(enabled).join(",") }),
      });
      if (!res.ok) throw new Error();
      toast({ title: "Сохранено", description: "Настройки оформления обновлены" });
    } catch {
      toast({ title: "Ошибка", description: "Не удалось сохранить", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-6 space-y-6">
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
                  {/* Цветовой кружок */}
                  <span
                    className="w-9 h-9 rounded-full shrink-0 border-2 border-white/20 shadow"
                    style={{
                      background: `linear-gradient(135deg, ${p.sidebar} 50%, ${p.accent} 50%)`,
                    }}
                  />
                  {/* Название */}
                  <span className="flex-1 font-medium text-sm">{p.name}</span>
                  {/* Локер или toggle */}
                  {isLocked ? (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Lock className="w-3 h-3" />
                      По умолчанию
                    </span>
                  ) : (
                    <span
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                        isOn ? "bg-primary" : "bg-muted-foreground/30"
                      }`}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                          isOn ? "translate-x-4" : "translate-x-1"
                        }`}
                      />
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
          {saving ? "Сохранение..." : "Сохранить"}
        </button>
      </div>
    </div>
  );
}
