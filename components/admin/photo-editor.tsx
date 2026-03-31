"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  X,
  Type,
  Layers,
  Download,
  RotateCcw,
  Trash2,
  Award,
  Check,
  Loader2,
  PenTool,
  Wand2,
  Crop,
} from "lucide-react";

interface PhotoEditorProps {
  imageUrl: string;
  onSave: (newUrl: string) => void;
  onClose: () => void;
  // Portrait canvas (4:5) like Wildberries — default false for backward compat
  portraitMode?: boolean;
}

const BG_PRESETS = [
  { label: "Белый", value: "#ffffff" },
  { label: "Светлый", value: "#f8f5f0" },
  { label: "Серый", value: "#e5e7eb" },
  { label: "Тёмный", value: "#1f2937" },
  { label: "Чёрный", value: "#000000" },
  { label: "Синий", value: "#1e3a5f" },
  { label: "Зелёный", value: "#14532d" },
  { label: "Прозрачный", value: "transparent" },
];

const ADVANTAGES = [
  { icon: "🚚", text: "Быстрая доставка" },
  { icon: "✅", text: "Гарантия качества" },
  { icon: "🏆", text: "Лучшая цена" },
  { icon: "⚡", text: "В наличии" },
  { icon: "🌲", text: "Натуральное дерево" },
  { icon: "🔨", text: "От производителя" },
  { icon: "📦", text: "Оптом дешевле" },
  { icon: "🛡️", text: "Без брака" },
];

const FONT_PRESETS = [
  { label: "Обычный", family: "Arial", weight: "normal" as const },
  { label: "Жирный", family: "Arial", weight: "bold" as const },
  { label: "Элегантный", family: "Georgia", weight: "normal" as const },
  { label: "Современный", family: "Trebuchet MS", weight: "bold" as const },
];

export function PhotoEditor({ imageUrl, onSave, onClose, portraitMode = false }: PhotoEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fabricRef = useRef<{ canvas: any; lib: any } | null>(null);
  const [fabricLoaded, setFabricLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<"bg" | "text" | "advantages" | "logo" | "crop">("bg");
  const [saving, setSaving] = useState(false);
  const [applyingWm, setApplyingWm] = useState(false);
  const [selectedObj, setSelectedObj] = useState<boolean>(false);
  const [bgColor, setBgColor] = useState("#ffffff");
  const [customBg, setCustomBg] = useState("#ffffff");
  const [textInput, setTextInput] = useState("");
  const [textColor, setTextColor] = useState("#ffffff");
  const [fontSize, setFontSize] = useState(28);
  const [fontPreset, setFontPreset] = useState(0);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const customAdvRef = useRef<HTMLInputElement>(null);
  const [cropTop, setCropTop] = useState(0);
  const [cropRight, setCropRight] = useState(0);
  const [cropBottom, setCropBottom] = useState(0);
  const [cropLeft, setCropLeft] = useState(0);
  const [cropApplied, setCropApplied] = useState(false);

  // Load Fabric.js and init canvas
  useEffect(() => {
    let mounted = true;
    let canvas: any = null;

    import("fabric").then((lib) => {
      if (!mounted || !canvasRef.current) return;

      const canvasW = 800;
      const canvasH = portraitMode ? 1000 : 800;
      canvas = new lib.Canvas(canvasRef.current, {
        width: canvasW,
        height: canvasH,
        backgroundColor: "#ffffff",
        preserveObjectStacking: true,
      });
      fabricRef.current = { canvas, lib };

      // Load product image
      lib.FabricImage.fromURL(imageUrl, { crossOrigin: "anonymous" }).then((img: any) => {
        if (!mounted || !img) return;
        const fitW = canvasW - 80;
        const fitH = canvasH - 80;
        const scale = Math.min(fitW / (img.width || fitW), fitH / (img.height || fitH));
        img.set({
          left: canvasW / 2,
          top: canvasH / 2,
          originX: "center",
          originY: "center",
          scaleX: scale,
          scaleY: scale,
        });
        canvas.add(img);
        canvas.sendObjectToBack(img);
        canvas.renderAll();
      });

      canvas.on("selection:created", () => setSelectedObj(true));
      canvas.on("selection:updated", () => setSelectedObj(true));
      canvas.on("selection:cleared", () => setSelectedObj(false));

      setFabricLoaded(true);
    });

    return () => {
      mounted = false;
      canvas?.dispose();
    };
  }, [imageUrl]);

  const applyBackground = useCallback((value: string) => {
    const fc = fabricRef.current;
    if (!fc) return;
    setBgColor(value);
    const { canvas, lib } = fc;

    if (value === "transparent") {
      canvas.backgroundColor = "";
      canvas.renderAll();
      return;
    }

    if (value.startsWith("#") || value.startsWith("rgb")) {
      canvas.set("backgroundColor", value);
      canvas.renderAll();
      return;
    }
  }, []);

  const addText = useCallback(() => {
    const fc = fabricRef.current;
    if (!fc || !textInput.trim()) return;
    const { canvas, lib } = fc;
    const fp = FONT_PRESETS[fontPreset];
    const text = new lib.Textbox(textInput, {
      left: 400,
      top: 120,
      originX: "center",
      originY: "center",
      fontSize,
      fontFamily: fp.family,
      fontWeight: fp.weight,
      fill: textColor,
      textAlign: "center",
      width: 650,
      shadow: new lib.Shadow({ color: "rgba(0,0,0,0.5)", blur: 6, offsetX: 2, offsetY: 2 }),
    });
    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();
    setTextInput("");
  }, [textInput, textColor, fontSize, fontPreset]);

  const addAdvantage = useCallback((icon: string, text: string) => {
    const fc = fabricRef.current;
    if (!fc) return;
    const { canvas, lib } = fc;

    const bg = new lib.Rect({
      width: 240,
      height: 48,
      rx: 24,
      ry: 24,
      fill: "rgba(0,0,0,0.65)",
      stroke: "rgba(255,255,255,0.25)",
      strokeWidth: 1,
    });
    const label = new lib.FabricText(`${icon}  ${text}`, {
      fontSize: 16,
      fontFamily: "Arial",
      fill: "#ffffff",
      originX: "center",
      originY: "center",
      left: 120,
      top: 24,
    });
    const group = new lib.Group([bg, label], {
      left: 280,
      top: 640,
    });
    canvas.add(group);
    canvas.setActiveObject(group);
    canvas.renderAll();
  }, []);

  const deleteSelected = useCallback(() => {
    const fc = fabricRef.current;
    if (!fc) return;
    const { canvas } = fc;
    const active = canvas.getActiveObject();
    if (active) {
      canvas.remove(active);
      canvas.discardActiveObject();
      canvas.renderAll();
      setSelectedObj(false);
    }
  }, []);

  const undo = useCallback(() => {
    const fc = fabricRef.current;
    if (!fc) return;
    const { canvas } = fc;
    const objects = canvas.getObjects();
    if (objects.length > 0) {
      canvas.remove(objects[objects.length - 1]);
      canvas.renderAll();
    }
  }, []);

  const applyCrop = useCallback(() => {
    const fc = fabricRef.current;
    if (!fc) return;
    const { canvas, lib } = fc;
    const cw = canvas.width || 800;
    const ch = canvas.height || 800;
    const l = Math.max(0, cropLeft);
    const t = Math.max(0, cropTop);
    const w = Math.max(10, cw - l - Math.max(0, cropRight));
    const h = Math.max(10, ch - t - Math.max(0, cropBottom));
    canvas.clipPath = new lib.Rect({
      left: l, top: t, width: w, height: h,
      absolutePositioned: true,
    });
    setCropApplied(true);
    canvas.renderAll();
  }, [cropTop, cropRight, cropBottom, cropLeft]);

  const resetCrop = useCallback(() => {
    const fc = fabricRef.current;
    if (!fc) return;
    fc.canvas.clipPath = undefined;
    setCropTop(0); setCropRight(0); setCropBottom(0); setCropLeft(0);
    setCropApplied(false);
    fc.canvas.renderAll();
  }, []);

  const handleLogoUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const fc = fabricRef.current;
    if (!fc) return;
    const { canvas, lib } = fc;
    lib.FabricImage.fromURL(url).then((img: any) => {
      if (!img) return;
      img.scaleToWidth(180);
      img.set({ left: 620, top: 660, originX: "center", originY: "center" });
      canvas.add(img);
      canvas.setActiveObject(img);
      canvas.renderAll();
    });
  }, []);

  const applyWatermarkFromSettings = useCallback(async () => {
    const fc = fabricRef.current;
    if (!fc) return;
    setApplyingWm(true);
    try {
      // Export current canvas as PNG, apply watermark on server, reload into canvas
      const dataUrl = fc.canvas.toDataURL({ format: "png", multiplier: 1 });
      const blob = await (await fetch(dataUrl)).blob();
      const formData = new FormData();
      formData.append("file", new File([blob], "canvas.png", { type: "image/png" }));
      formData.append("folder", "products");
      const uploadRes = await fetch("/api/admin/upload", { method: "POST", body: formData });
      const uploaded = await uploadRes.json();
      if (!uploaded.url) throw new Error("Upload failed");

      const wmRes = await fetch("/api/admin/watermark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "apply", imageUrl: uploaded.url }),
      });
      const wmData = await wmRes.json();
      if (!wmData.url) throw new Error(wmData.error || "Watermark failed");

      // Reload result into canvas as a new image layer
      const { lib, canvas } = fc;
      lib.FabricImage.fromURL(wmData.url + "?t=" + Date.now(), { crossOrigin: "anonymous" }).then((img: any) => {
        if (!img) return;
        const cw = canvas.width || 800;
        const ch = canvas.height || 800;
        img.set({ left: cw / 2, top: ch / 2, originX: "center", originY: "center",
          scaleX: cw / (img.width || cw), scaleY: ch / (img.height || ch) });
        // Clear canvas and add watermarked image
        canvas.clear();
        canvas.set("backgroundColor", "#ffffff");
        canvas.add(img);
        canvas.sendObjectToBack(img);
        canvas.renderAll();
      });
    } catch (e) {
      console.error("Watermark error:", e);
    } finally {
      setApplyingWm(false);
    }
  }, []);

  const handleSave = useCallback(async () => {
    const fc = fabricRef.current;
    if (!fc) return;
    setSaving(true);
    try {
      const dataUrl = fc.canvas.toDataURL({ format: "png", multiplier: 1.5 });
      const res = await fetch(dataUrl);
      const blob = await res.blob();

      const formData = new FormData();
      formData.append("file", new File([blob], "product-edited.png", { type: "image/png" }));
      formData.append("folder", "products");

      const uploadRes = await fetch("/api/admin/upload", { method: "POST", body: formData });
      const data = await uploadRes.json();
      if (data.url) {
        onSave(data.url);
        onClose();
      }
    } catch (err) {
      console.error("Photo editor save error:", err);
    } finally {
      setSaving(false);
    }
  }, [onSave, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border shrink-0">
          <h2 className="font-display font-semibold text-lg flex items-center gap-2">
            <PenTool className="w-5 h-5 text-blue-500" />
            Редактор фото
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={applyWatermarkFromSettings}
              disabled={applyingWm}
              title="Применить водяной знак из настроек"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border border-border hover:bg-accent transition-colors disabled:opacity-50"
            >
              {applyingWm ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Award className="w-3.5 h-3.5" />}
              Водяной знак
            </button>
            <button
              onClick={undo}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border border-border hover:bg-accent transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Отмена
            </button>
            {selectedObj && (
              <button
                onClick={deleteSelected}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border border-destructive/40 text-destructive hover:bg-destructive/10 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Удалить
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={saving || !fabricLoaded}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {saving ? "Сохраняем..." : "Сохранить"}
            </button>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-accent transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Canvas area */}
          <div className="flex-1 bg-[#1a1a2e] flex items-center justify-center overflow-auto p-4 relative">
            {!fabricLoaded && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/60">
                <Loader2 className="w-8 h-8 animate-spin" />
                <span className="text-sm">Загружаем редактор...</span>
              </div>
            )}
            <div style={{ transform: "scale(0.65)", transformOrigin: "center center" }}>
              <canvas ref={canvasRef} className="rounded-lg shadow-2xl" />
            </div>
          </div>

          {/* Right panel */}
          <div className="w-72 border-l border-border flex flex-col shrink-0 overflow-y-auto bg-card">
            {/* Tabs */}
            <div className="flex border-b border-border shrink-0">
              {([
                { id: "bg" as const, icon: Layers, label: "Фон" },
                { id: "crop" as const, icon: Crop, label: "Обрезка" },
                { id: "text" as const, icon: Type, label: "Текст" },
                { id: "advantages" as const, icon: Wand2, label: "Плашки" },
                { id: "logo" as const, icon: Award, label: "Лого" },
              ]).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors ${
                    activeTab === tab.id
                      ? "bg-primary/10 text-primary border-b-2 border-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 p-4 space-y-4">

              {/* Background tab */}
              {activeTab === "bg" && (
                <div className="space-y-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Готовые фоны</p>
                  <div className="grid grid-cols-4 gap-2">
                    {BG_PRESETS.map((preset) => (
                      <button
                        key={preset.value}
                        onClick={() => applyBackground(preset.value)}
                        title={preset.label}
                        className={`flex flex-col items-center gap-1 p-1.5 rounded-lg border transition-all hover:border-primary/50 ${
                          bgColor === preset.value ? "border-primary ring-1 ring-primary" : "border-border"
                        }`}
                      >
                        <span
                          className="w-8 h-8 rounded-md border border-white/10 shadow-sm"
                          style={{
                            background:
                              preset.value === "transparent"
                                ? "repeating-conic-gradient(#ddd 0% 25%, white 0% 50%) 0 0 / 10px 10px"
                                : preset.value,
                          }}
                        />
                        <span className="text-[9px] text-muted-foreground leading-none">{preset.label}</span>
                      </button>
                    ))}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Свой цвет</p>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={customBg}
                        onChange={(e) => setCustomBg(e.target.value)}
                        className="w-10 h-10 rounded-lg border border-border cursor-pointer p-0.5"
                      />
                      <button
                        onClick={() => applyBackground(customBg)}
                        className="flex-1 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
                      >
                        Применить
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Crop tab */}
              {activeTab === "crop" && (
                <div className="space-y-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Обрезка фото</p>
                  <p className="text-[11px] text-muted-foreground">Укажите сколько пикселей убрать с каждой стороны (canvas 800×800px)</p>

                  {/* Visual crop preview */}
                  <div className="relative mx-auto bg-muted rounded-lg overflow-hidden" style={{ width: 160, height: 160 }}>
                    <div className="absolute inset-0 opacity-30"
                      style={{
                        backgroundImage: "repeating-conic-gradient(#aaa 0% 25%, transparent 0% 50%)",
                        backgroundSize: "10px 10px",
                      }}
                    />
                    <div
                      className="absolute border-2 border-primary bg-primary/10"
                      style={{
                        top: `${(cropTop / 800) * 160}px`,
                        left: `${(cropLeft / 800) * 160}px`,
                        right: `${(cropRight / 800) * 160}px`,
                        bottom: `${(cropBottom / 800) * 160}px`,
                      }}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {([
                      { label: "Сверху", val: cropTop, set: setCropTop },
                      { label: "Снизу", val: cropBottom, set: setCropBottom },
                      { label: "Слева", val: cropLeft, set: setCropLeft },
                      { label: "Справа", val: cropRight, set: setCropRight },
                    ] as const).map(({ label, val, set }) => (
                      <div key={label}>
                        <label className="text-[11px] text-muted-foreground block mb-1">{label} (px)</label>
                        <input
                          type="number"
                          min={0}
                          max={400}
                          value={val}
                          onChange={e => set(Number(e.target.value))}
                          className="w-full px-2 py-1.5 rounded-lg border border-border bg-background text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={applyCrop}
                    className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
                  >
                    ✂️ Применить обрезку
                  </button>

                  {cropApplied && (
                    <button
                      onClick={resetCrop}
                      className="w-full py-2 rounded-xl border border-border text-sm text-muted-foreground hover:bg-accent transition-colors"
                    >
                      Сбросить обрезку
                    </button>
                  )}

                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-700 dark:text-amber-400">
                    💡 После обрезки нажмите <strong>Сохранить</strong> — обрезка применится к итоговому фото.
                  </div>
                </div>
              )}

              {/* Text tab */}
              {activeTab === "text" && (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Добавить текст</p>
                  <p className="text-[11px] text-amber-600 dark:text-amber-400">⚠️ Выберите стиль и цвет ДО нажатия "+ Добавить"</p>
                  <textarea
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder="Введите текст..."
                    rows={3}
                    className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  <div>
                    <p className="text-[11px] text-muted-foreground mb-1.5">Стиль шрифта</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {FONT_PRESETS.map((fp, i) => (
                        <button
                          key={i}
                          onClick={() => setFontPreset(i)}
                          className={`px-2 py-1.5 rounded-lg text-xs border transition-colors ${
                            fontPreset === i ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-accent"
                          }`}
                          style={{ fontFamily: fp.family, fontWeight: fp.weight }}
                        >
                          {fp.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground mb-1">Размер: {fontSize}px</p>
                    <input
                      type="range"
                      min={14}
                      max={96}
                      value={fontSize}
                      onChange={(e) => setFontSize(Number(e.target.value))}
                      className="w-full accent-primary"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={textColor}
                      onChange={(e) => setTextColor(e.target.value)}
                      className="w-9 h-9 rounded-lg border border-border cursor-pointer p-0.5"
                    />
                    <span className="text-xs text-muted-foreground">Цвет текста</span>
                  </div>
                  <button
                    onClick={addText}
                    disabled={!textInput.trim()}
                    className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-40 transition-colors"
                  >
                    + Добавить на фото
                  </button>
                </div>
              )}

              {/* Advantages tab */}
              {activeTab === "advantages" && (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Плашки-преимущества</p>
                  <p className="text-[11px] text-muted-foreground">Нажмите — плашка появится на фото. Перетащите в нужное место.</p>
                  <div className="space-y-1.5">
                    {ADVANTAGES.map((adv) => (
                      <button
                        key={adv.text}
                        onClick={() => addAdvantage(adv.icon, adv.text)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border border-border hover:border-primary/40 hover:bg-primary/5 transition-colors text-left"
                      >
                        <span className="text-base">{adv.icon}</span>
                        <span className="text-sm">{adv.text}</span>
                      </button>
                    ))}
                  </div>
                  <div className="pt-1">
                    <p className="text-[11px] text-muted-foreground mb-1.5">Своя плашка</p>
                    <div className="flex gap-2">
                      <input
                        ref={customAdvRef}
                        placeholder="Текст плашки..."
                        className="flex-1 bg-muted border border-border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
                      />
                      <button
                        onClick={() => {
                          const val = customAdvRef.current?.value?.trim();
                          if (val) { addAdvantage("⭐", val); if (customAdvRef.current) customAdvRef.current.value = ""; }
                        }}
                        className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Logo tab */}
              {activeTab === "logo" && (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Логотип / Watermark</p>
                  <p className="text-[11px] text-muted-foreground">Загрузите PNG с прозрачным фоном. После добавления — перетащите в нужный угол и измените размер.</p>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/png,image/svg+xml,image/webp"
                    className="hidden"
                    onChange={handleLogoUpload}
                  />
                  <button
                    onClick={() => logoInputRef.current?.click()}
                    className="w-full flex flex-col items-center justify-center gap-2 py-8 rounded-xl border-2 border-dashed border-border hover:border-primary/40 hover:bg-primary/5 transition-colors"
                  >
                    <Award className="w-8 h-8 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Загрузить логотип</span>
                    <span className="text-[10px] text-muted-foreground/60">PNG, SVG, WebP</span>
                  </button>
                </div>
              )}
            </div>

            {/* Hint */}
            <div className="p-4 border-t border-border">
              <p className="text-[10px] text-muted-foreground">
                Кликните на элемент чтобы выделить. Перетащите чтобы переместить. Ctrl+Z — отмена.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
