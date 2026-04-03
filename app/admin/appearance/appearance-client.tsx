"use client";

import { useState } from "react";
import { PALETTE_GROUPS } from "@/components/palette-provider";
import { useToast } from "@/components/ui/use-toast";
import { Lock, Image as ImageIcon, LayoutGrid, Bot } from "lucide-react";

const CARD_STYLES = [
  {
    key: "classic",
    label: "Классика",
    desc: "Чисто и понятно",
    preview: (active: boolean) => (
      <div className={`w-12 h-16 rounded-lg border-2 flex flex-col overflow-hidden ${active ? "border-primary" : "border-border"}`}>
        <div className={`flex-1 ${active ? "bg-primary/20" : "bg-muted"}`} />
        <div className="p-1 space-y-0.5">
          <div className={`h-1 rounded-full w-4/5 ${active ? "bg-primary/40" : "bg-muted-foreground/30"}`} />
          <div className={`h-1 rounded-full w-3/5 ${active ? "bg-primary/30" : "bg-muted-foreground/20"}`} />
        </div>
      </div>
    ),
  },
  {
    key: "showcase",
    label: "Витрина",
    desc: "Цена и плашки на фото",
    preview: (active: boolean) => (
      <div className={`w-12 h-16 rounded-lg border-2 overflow-hidden relative ${active ? "border-primary" : "border-border"}`}>
        <div className={`absolute inset-0 ${active ? "bg-primary/20" : "bg-muted"}`} />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/50 to-transparent" />
        <div className={`absolute top-1 right-1 w-3 h-2 rounded text-[4px] flex items-center justify-center font-bold ${active ? "bg-primary text-white" : "bg-muted-foreground/50 text-white"}`}>₽</div>
        <div className="absolute bottom-1 left-1 right-1 space-y-0.5">
          <div className="h-1 rounded-full w-4/5 bg-white/70" />
          <div className="h-1 rounded-full w-3/5 bg-white/50" />
        </div>
      </div>
    ),
  },
  {
    key: "vivid",
    label: "Живой фон",
    desc: "Анимация для PNG",
    preview: (active: boolean) => (
      <div className={`w-12 h-16 rounded-lg border-2 overflow-hidden relative ${active ? "border-primary" : "border-border"}`}>
        <div className="absolute inset-0" style={{ background: active ? "linear-gradient(-45deg, hsl(var(--primary)/0.4), hsl(var(--primary)/0.15), hsl(var(--primary)/0.35))" : "linear-gradient(-45deg, #ddd, #eee, #d8d8d8)" }} />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className={`w-7 h-8 rounded-sm ${active ? "bg-primary/30" : "bg-muted-foreground/20"}`} />
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-1 bg-card/90">
          <div className={`h-1 rounded-full w-4/5 ${active ? "bg-primary/40" : "bg-muted-foreground/30"}`} />
        </div>
      </div>
    ),
  },
  {
    key: "minimal",
    label: "Минимал",
    desc: "Apple-стиль, без рамок",
    preview: (active: boolean) => (
      <div className="w-12 h-16 rounded-lg overflow-hidden flex flex-col">
        <div className={`flex-1 rounded-lg ${active ? "bg-primary/15" : "bg-muted"}`} />
        <div className="pt-1 space-y-0.5">
          <div className={`h-1 rounded-full w-4/5 ${active ? "bg-primary/50" : "bg-muted-foreground/30"}`} />
          <div className={`h-1.5 rounded-full w-3/5 font-bold ${active ? "bg-primary/70" : "bg-muted-foreground/50"}`} />
        </div>
      </div>
    ),
  },
  {
    key: "magazine",
    label: "Журнал",
    desc: "Фото во весь блок",
    preview: (active: boolean) => (
      <div className={`w-12 h-16 rounded-lg border-2 overflow-hidden relative ${active ? "border-primary" : "border-border"}`}>
        <div className={`absolute inset-0 ${active ? "bg-primary/20" : "bg-muted"}`} />
        <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/70 to-transparent" />
        <div className="absolute bottom-1 left-1 right-1 space-y-0.5">
          <div className="h-1 rounded-full w-4/5 bg-white/80" />
          <div className="h-1 rounded-full w-2/5 bg-white/60" />
        </div>
      </div>
    ),
  },
];

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
  initialCardStyle,
  initialDefaultPalette,
  initialArayEnabled,
}: {
  initialEnabledIds: string[];
  initialPhotoAspect: string;
  initialCardStyle: string;
  initialDefaultPalette: string;
  initialArayEnabled: boolean;
}) {
  const [enabled, setEnabled] = useState<Set<string>>(new Set(initialEnabledIds));
  const [photoAspect, setPhotoAspect] = useState(initialPhotoAspect || "1/1");
  const [cardStyle, setCardStyle] = useState(initialCardStyle || "classic");
  const [defaultPalette, setDefaultPalette] = useState(initialDefaultPalette || "timber");
  const [arayEnabled, setArayEnabled] = useState(initialArayEnabled);
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
          card_style: cardStyle,
          default_palette: defaultPalette,
          aray_enabled: arayEnabled ? "true" : "false",
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

      {/* ── Арай ассистент ── */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Bot className="w-4 h-4 text-amber-500" />
            </div>
            <div>
              <p className="font-semibold text-sm">Арай — ИИ ассистент</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {arayEnabled ? "Виджет виден покупателям на сайте" : "Виджет скрыт от покупателей"}
              </p>
            </div>
          </div>
          <button
            onClick={async () => {
              const next = !arayEnabled;
              setArayEnabled(next);
              await fetch("/api/admin/appearance", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ aray_enabled: next ? "true" : "false" }),
              });
              toast({ title: next ? "Арай включён ✓" : "Арай скрыт ✓", description: next ? "Виджет появится на сайте" : "Виджет скрыт от покупателей" });
            }}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              arayEnabled ? "bg-amber-500" : "bg-muted-foreground/30"
            }`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
              arayEnabled ? "translate-x-6" : "translate-x-1"
            }`} />
          </button>
        </div>
        {!arayEnabled && (
          <p className="mt-3 text-xs text-muted-foreground bg-muted/50 rounded-xl px-3 py-2">
            Включите когда пополните баланс Anthropic — ассистент заработает сразу без передеплоя
          </p>
        )}
      </div>

      {/* ── Стиль карточек ── */}
      <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <LayoutGrid className="w-4 h-4 text-primary" />
          <h3 className="font-semibold">Стиль карточек товаров</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Визуальное оформление карточек во всём каталоге
        </p>
        <div className="grid grid-cols-5 gap-3">
          {CARD_STYLES.map((style) => {
            const isActive = cardStyle === style.key;
            return (
              <button
                key={style.key}
                onClick={() => setCardStyle(style.key)}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                  isActive
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/40 hover:bg-muted/30"
                }`}
              >
                {style.preview(isActive)}
                <div className="text-center">
                  <p className={`text-xs font-bold leading-tight ${isActive ? "text-primary" : ""}`}>{style.label}</p>
                  <p className="text-[9px] text-muted-foreground leading-tight mt-0.5">{style.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

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

        <div className="flex items-start gap-2 p-3 rounded-xl bg-muted/50 text-xs text-muted-foreground">
          <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>Цвет по умолчанию — тема для новых посетителей без сохранённых предпочтений. Клиенты могут переключиться на любую включённую тему.</span>
        </div>

        {PALETTE_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              {group.label}
            </p>
            <div className="space-y-2">
              {group.palettes.map((p) => {
                const isOn = enabled.has(p.id);
                const isDefault = defaultPalette === p.id;
                return (
                  <div
                    key={p.id}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
                      isOn ? "border-primary/40 bg-primary/5" : "border-border bg-muted/30 opacity-50"
                    }`}
                  >
                    <span
                      className="w-9 h-9 rounded-full shrink-0 border-2 border-white/20 shadow cursor-pointer"
                      style={{ background: `linear-gradient(135deg, ${p.sidebar} 50%, ${p.accent} 50%)` }}
                      onClick={() => toggle(p.id)}
                    />
                    <span className="flex-1 font-medium text-sm" onClick={() => toggle(p.id)} style={{cursor: isOn || p.id === "timber" ? "default" : "pointer"}}>{p.name}</span>

                    {/* Default badge / button */}
                    {isDefault ? (
                      <span className="flex items-center gap-1 text-xs font-semibold text-primary bg-primary/10 px-2 py-1 rounded-lg shrink-0">
                        <Lock className="w-3 h-3" />
                        По умолчанию
                      </span>
                    ) : isOn ? (
                      <button
                        onClick={() => setDefaultPalette(p.id)}
                        className="text-xs text-muted-foreground hover:text-primary hover:bg-primary/5 px-2 py-1 rounded-lg transition-colors shrink-0"
                      >
                        Сделать по умолчанию
                      </button>
                    ) : null}

                    {/* Toggle */}
                    {p.id !== "timber" && (
                      <button
                        onClick={() => toggle(p.id)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0 ${isOn ? "bg-primary" : "bg-muted-foreground/30"}`}
                      >
                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${isOn ? "translate-x-4" : "translate-x-1"}`} />
                      </button>
                    )}
                  </div>
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
