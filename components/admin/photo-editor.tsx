"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  X, Type, Layers, Download, RotateCcw, Trash2, Award,
  Loader2, PenTool, Wand2, Crop, Square, Sparkles,
} from "lucide-react";

interface PhotoEditorProps {
  imageUrl: string;
  onSave: (newUrl: string) => void;
  onClose: () => void;
  portraitMode?: boolean;
}

const BG_PRESETS = [
  { label: "Белый",      value: "#ffffff" },
  { label: "Светлый",    value: "#f8f5f0" },
  { label: "Серый",      value: "#e5e7eb" },
  { label: "Тёмный",     value: "#1f2937" },
  { label: "Чёрный",     value: "#000000" },
  { label: "Синий",      value: "#1e3a5f" },
  { label: "Зелёный",    value: "#14532d" },
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

const FONTS = [
  { label: "Чистый",      family: "Arial",        weight: "normal" },
  { label: "Жирный",      family: "Arial",        weight: "bold" },
  { label: "Ударный",     family: "Impact",       weight: "normal" },
  { label: "Элегантный",  family: "Georgia",      weight: "normal" },
  { label: "Современный", family: "Trebuchet MS", weight: "bold" },
  { label: "Технический", family: "Courier New",  weight: "normal" },
];

const EMOJI_ICONS = ["⭐","🔥","✨","💎","🌿","🎯","💡","🚀","❤️","🏅","🔑","🌟","💪","🎁","⚡","🦋"];

export function PhotoEditor({ imageUrl, onSave, onClose, portraitMode = false }: PhotoEditorProps) {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const fabricRef    = useRef<{ canvas: any; lib: any } | null>(null);
  const selObjRef    = useRef<any>(null);
  const customAdvRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [fabricLoaded, setFabricLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<"bg"|"crop"|"shapes"|"text"|"adv"|"logo">("bg");
  const [saving,    setSaving]    = useState(false);
  const [applyingWm,setApplyingWm]= useState(false);
  const [hasSel,    setHasSel]    = useState(false);
  const [selType,   setSelType]   = useState<"text"|"shape"|"image"|null>(null);
  const [toast,     setToast]     = useState("");

  // Background
  const [bgColor,       setBgColor]       = useState("#ffffff");
  const [customBg,      setCustomBg]      = useState("#ffffff");
  const [removingBg,    setRemovingBg]    = useState(false);
  const [bgThreshold,   setBgThreshold]   = useState(235);

  // Crop
  const [cropTop,    setCropTop]    = useState(0);
  const [cropRight,  setCropRight]  = useState(0);
  const [cropBottom, setCropBottom] = useState(0);
  const [cropLeft,   setCropLeft]   = useState(0);
  const [cropApplied,setCropApplied]= useState(false);

  // Shapes
  const [shapeColor,   setShapeColor]   = useState("#4f46e5");
  const [shapeOpacity, setShapeOpacity] = useState(90);
  const [shapeCorners, setShapeCorners] = useState(0);

  // Text (new)
  const [textInput,   setTextInput]   = useState("");
  const [textColor,   setTextColor]   = useState("#ffffff");
  const [fontSize,    setFontSize]    = useState(32);
  const [fontIdx,     setFontIdx]     = useState(0);
  const [textBold,    setTextBold]    = useState(false);
  const [textItalic,  setTextItalic]  = useState(false);
  const [textShadow,  setTextShadow]  = useState(true);
  const [textAlign,   setTextAlign]   = useState<"left"|"center"|"right">("center");

  // Live-edit selected text
  const [liveColor,   setLiveColor]   = useState("#ffffff");
  const [liveSize,    setLiveSize]    = useState(32);
  const [liveFontIdx, setLiveFontIdx] = useState(0);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 2500); };

  // ── Init Fabric ──
  useEffect(() => {
    let mounted = true;
    let canvas: any = null;

    import("fabric").then((lib) => {
      if (!mounted || !canvasRef.current) return;
      const cw = 800, ch = portraitMode ? 1000 : 800;
      canvas = new lib.Canvas(canvasRef.current, {
        width: cw, height: ch, backgroundColor: "#ffffff", preserveObjectStacking: true,
      });
      fabricRef.current = { canvas, lib };

      lib.FabricImage.fromURL(imageUrl, { crossOrigin: "anonymous" }).then((img: any) => {
        if (!mounted || !img) return;
        const scale = Math.min((cw - 80) / (img.width || cw), (ch - 80) / (img.height || ch));
        img.set({ left: cw/2, top: ch/2, originX: "center", originY: "center", scaleX: scale, scaleY: scale });
        canvas.add(img);
        canvas.sendObjectToBack(img);
        canvas.renderAll();
      });

      const trackSel = (e: any) => {
        const obj = e.selected?.[0] || null;
        selObjRef.current = obj;
        setHasSel(!!obj);
        if (!obj) { setSelType(null); return; }
        const t = obj.type;
        if (t === "textbox" || t === "text" || t === "i-text") {
          setSelType("text");
          setLiveColor(obj.fill || "#ffffff");
          setLiveSize(obj.fontSize || 32);
          const fi = FONTS.findIndex(f => f.family === obj.fontFamily);
          setLiveFontIdx(fi >= 0 ? fi : 0);
        } else if (t === "rect" || t === "circle" || t === "triangle") {
          setSelType("shape");
        } else {
          setSelType("image");
        }
      };

      canvas.on("selection:created", trackSel);
      canvas.on("selection:updated", trackSel);
      canvas.on("selection:cleared", () => { selObjRef.current = null; setHasSel(false); setSelType(null); });
      setFabricLoaded(true);
    });

    return () => { mounted = false; canvas?.dispose(); };
  }, [imageUrl]);

  // ── Background ──
  const applyBackground = useCallback((value: string) => {
    const fc = fabricRef.current;
    if (!fc) return;
    setBgColor(value);
    fc.canvas.set("backgroundColor", value === "transparent" ? "" : value);
    fc.canvas.renderAll();
  }, []);

  const removeBg = useCallback(async () => {
    setRemovingBg(true);
    try {
      const resp = await fetch(imageUrl);
      const blob = await resp.blob();
      const bitmap = await createImageBitmap(blob);
      const off = new OffscreenCanvas(bitmap.width, bitmap.height);
      const ctx = off.getContext("2d")!;
      ctx.drawImage(bitmap, 0, 0);
      const imgData = ctx.getImageData(0, 0, bitmap.width, bitmap.height);
      const d = imgData.data;
      const thr = bgThreshold;
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i], g = d[i+1], b = d[i+2];
        if (r >= thr && g >= thr && b >= thr) {
          // Soft fade at edges
          const brightness = Math.min(r, g, b);
          const fade = Math.max(0, brightness - thr) / (255 - thr);
          d[i+3] = Math.round(d[i+3] * (1 - Math.min(1, fade * 3)));
        }
      }
      ctx.putImageData(imgData, 0, 0);
      const newBlob = await off.convertToBlob({ type: "image/png" });
      const newUrl = URL.createObjectURL(newBlob);
      const fc = fabricRef.current;
      if (!fc) return;
      const { canvas, lib } = fc;
      const cw = canvas.width || 800, ch = canvas.height || 800;
      const imgObjs = canvas.getObjects().filter((o: any) => o.type === "image");
      imgObjs.forEach((o: any) => canvas.remove(o));
      const scale = Math.min((cw - 80) / bitmap.width, (ch - 80) / bitmap.height);
      lib.FabricImage.fromURL(newUrl).then((newImg: any) => {
        if (!newImg) return;
        newImg.set({ left: cw/2, top: ch/2, originX: "center", originY: "center", scaleX: scale, scaleY: scale });
        canvas.add(newImg);
        canvas.sendObjectToBack(newImg);
        canvas.backgroundColor = "";
        canvas.renderAll();
        setBgColor("transparent");
      });
      showToast("✨ Фон удалён!");
    } catch {
      showToast("Ошибка. Попробуйте изменить чувствительность.");
    } finally {
      setRemovingBg(false);
    }
  }, [imageUrl, bgThreshold]);

  // ── Crop ──
  const applyCrop = useCallback(() => {
    const fc = fabricRef.current;
    if (!fc) return;
    const { canvas, lib } = fc;
    const cw = canvas.width || 800, ch = canvas.height || 800;
    canvas.clipPath = new lib.Rect({
      left: Math.max(0, cropLeft), top: Math.max(0, cropTop),
      width: Math.max(10, cw - Math.max(0, cropLeft) - Math.max(0, cropRight)),
      height: Math.max(10, ch - Math.max(0, cropTop) - Math.max(0, cropBottom)),
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

  // ── Shapes ──
  const addShape = useCallback((type: "rect"|"circle"|"triangle") => {
    const fc = fabricRef.current;
    if (!fc) return;
    const { canvas, lib } = fc;
    const base = { left: 400, top: 400, originX: "center", originY: "center", fill: shapeColor, opacity: shapeOpacity / 100, strokeWidth: 0 };
    let shape: any;
    if (type === "rect")     shape = new lib.Rect({ ...base, width: 200, height: 200, rx: shapeCorners, ry: shapeCorners });
    else if (type === "circle") shape = new lib.Circle({ ...base, radius: 100 });
    else                     shape = new lib.Triangle({ ...base, width: 200, height: 180 });
    canvas.add(shape);
    canvas.setActiveObject(shape);
    canvas.renderAll();
  }, [shapeColor, shapeOpacity, shapeCorners]);

  const updateSelObj = useCallback((props: Record<string, unknown>) => {
    const obj = selObjRef.current;
    const fc = fabricRef.current;
    if (!obj || !fc) return;
    obj.set(props);
    fc.canvas.renderAll();
  }, []);

  const makeBackground = useCallback(() => {
    const fc = fabricRef.current;
    if (!fc) return;
    const { canvas } = fc;
    const obj = selObjRef.current;
    if (!obj) return;
    const cw = canvas.width || 800, ch = canvas.height || 800;
    obj.set({ left: 0, top: 0, width: cw, height: ch, scaleX: 1, scaleY: 1, originX: "left", originY: "top", rx: 0, ry: 0 });
    canvas.sendObjectToBack(obj);
    canvas.discardActiveObject();
    canvas.renderAll();
  }, []);

  const addEmojiIcon = useCallback((emoji: string) => {
    const fc = fabricRef.current;
    if (!fc) return;
    const { canvas, lib } = fc;
    const text = new lib.FabricText(emoji, { left: 400, top: 400, originX: "center", originY: "center", fontSize: 64 });
    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();
  }, []);

  // ── Text ──
  const addText = useCallback(() => {
    const fc = fabricRef.current;
    if (!fc || !textInput.trim()) return;
    const { canvas, lib } = fc;
    const font = FONTS[fontIdx];
    const text = new lib.Textbox(textInput, {
      left: 400, top: 120, originX: "center", originY: "center",
      fontSize,
      fontFamily: font.family,
      fontWeight: textBold ? "bold" : font.weight,
      fontStyle: textItalic ? "italic" : "normal",
      fill: textColor, textAlign, width: 650,
      shadow: textShadow ? new lib.Shadow({ color: "rgba(0,0,0,0.5)", blur: 6, offsetX: 2, offsetY: 2 }) : undefined,
    });
    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();
    setTextInput("");
  }, [textInput, textColor, fontSize, fontIdx, textBold, textItalic, textAlign, textShadow]);

  // ── Advantages ──
  const addAdvantage = useCallback((icon: string, text: string) => {
    const fc = fabricRef.current;
    if (!fc) return;
    const { canvas, lib } = fc;
    const bg = new lib.Rect({ width: 240, height: 48, rx: 24, ry: 24, fill: "rgba(0,0,0,0.65)", stroke: "rgba(255,255,255,0.25)", strokeWidth: 1 });
    const label = new lib.FabricText(`${icon}  ${text}`, { fontSize: 16, fontFamily: "Arial", fill: "#ffffff", originX: "center", originY: "center", left: 120, top: 24 });
    const group = new lib.Group([bg, label], { left: 280, top: 640 });
    canvas.add(group);
    canvas.setActiveObject(group);
    canvas.renderAll();
  }, []);

  // ── Logo ──
  const handleLogoUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const fc = fabricRef.current;
    if (!fc) return;
    fc.lib.FabricImage.fromURL(url).then((img: any) => {
      if (!img) return;
      img.scaleToWidth(180);
      img.set({ left: 620, top: 660, originX: "center", originY: "center" });
      fc.canvas.add(img);
      fc.canvas.setActiveObject(img);
      fc.canvas.renderAll();
    });
  }, []);

  // ── Watermark ──
  const applyWatermark = useCallback(async () => {
    const fc = fabricRef.current;
    if (!fc) return;
    setApplyingWm(true);
    try {
      const dataUrl = fc.canvas.toDataURL({ format: "png", multiplier: 1 });
      const blob = await (await fetch(dataUrl)).blob();
      const form = new FormData();
      form.append("file", new File([blob], "canvas.png", { type: "image/png" }));
      form.append("folder", "products");
      const up = await (await fetch("/api/admin/upload", { method: "POST", body: form })).json();
      if (!up.url) throw new Error("upload failed");
      const wm = await (await fetch("/api/admin/watermark", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "apply", imageUrl: up.url }) })).json();
      if (!wm.url) throw new Error(wm.error);
      const { lib, canvas } = fc;
      lib.FabricImage.fromURL(wm.url + "?t=" + Date.now(), { crossOrigin: "anonymous" }).then((img: any) => {
        if (!img) return;
        const cw = canvas.width || 800, ch = canvas.height || 800;
        img.set({ left: cw/2, top: ch/2, originX: "center", originY: "center", scaleX: cw/(img.width||cw), scaleY: ch/(img.height||ch) });
        canvas.clear();
        canvas.set("backgroundColor", "#ffffff");
        canvas.add(img);
        canvas.sendObjectToBack(img);
        canvas.renderAll();
      });
    } catch { /* silent */ } finally { setApplyingWm(false); }
  }, []);

  const deleteSelected = useCallback(() => {
    const fc = fabricRef.current;
    if (!fc) return;
    const active = fc.canvas.getActiveObject();
    if (active) { fc.canvas.remove(active); fc.canvas.discardActiveObject(); fc.canvas.renderAll(); setHasSel(false); }
  }, []);

  const undo = useCallback(() => {
    const fc = fabricRef.current;
    if (!fc) return;
    const objs = fc.canvas.getObjects();
    if (objs.length > 0) { fc.canvas.remove(objs[objs.length - 1]); fc.canvas.renderAll(); }
  }, []);

  const handleSave = useCallback(async () => {
    const fc = fabricRef.current;
    if (!fc) return;
    setSaving(true);
    try {
      const dataUrl = fc.canvas.toDataURL({ format: "png", multiplier: 1.5 });
      const blob = await (await fetch(dataUrl)).blob();
      const form = new FormData();
      form.append("file", new File([blob], "product-edited.png", { type: "image/png" }));
      form.append("folder", "products");
      const data = await (await fetch("/api/admin/upload", { method: "POST", body: form })).json();
      if (data.url) { onSave(data.url); onClose(); }
    } catch { /* silent */ } finally { setSaving(false); }
  }, [onSave, onClose]);

  const TABS = [
    { id: "bg"     as const, icon: Layers,   label: "Фон"     },
    { id: "crop"   as const, icon: Crop,     label: "Обрезка" },
    { id: "shapes" as const, icon: Square,   label: "Фигуры"  },
    { id: "text"   as const, icon: Type,     label: "Текст"   },
    { id: "adv"    as const, icon: Wand2,    label: "Плашки"  },
    { id: "logo"   as const, icon: Award,    label: "Лого"    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-medium shadow-xl animate-in slide-in-from-bottom-2 fade-in">
          {toast}
        </div>
      )}

      <div className="bg-card border border-border rounded-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border shrink-0">
          <h2 className="font-display font-semibold text-lg flex items-center gap-2">
            <PenTool className="w-5 h-5 text-blue-500" /> Редактор фото
          </h2>
          <div className="flex items-center gap-2">
            <button onClick={applyWatermark} disabled={applyingWm} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border border-border hover:bg-accent transition-colors disabled:opacity-50">
              {applyingWm ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Award className="w-3.5 h-3.5" />} Водяной знак
            </button>
            <button onClick={undo} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border border-border hover:bg-accent transition-colors">
              <RotateCcw className="w-3.5 h-3.5" /> Отмена
            </button>
            {hasSel && (
              <button onClick={deleteSelected} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border border-destructive/40 text-destructive hover:bg-destructive/10 transition-colors">
                <Trash2 className="w-3.5 h-3.5" /> Удалить
              </button>
            )}
            <button onClick={handleSave} disabled={saving || !fabricLoaded} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {saving ? "Сохраняем..." : "Сохранить"}
            </button>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-accent transition-colors"><X className="w-5 h-5" /></button>
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">

          {/* Canvas */}
          <div className="flex-1 bg-[#1a1a2e] flex items-center justify-center overflow-auto p-4 relative">
            {!fabricLoaded && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/60">
                <Loader2 className="w-8 h-8 animate-spin" /><span className="text-sm">Загружаем редактор...</span>
              </div>
            )}
            <div style={{ transform: "scale(0.65)", transformOrigin: "center center" }}>
              <canvas ref={canvasRef} className="rounded-lg shadow-2xl" />
            </div>
          </div>

          {/* Right panel */}
          <div className="w-72 border-l border-border flex flex-col shrink-0 bg-card">

            {/* Tabs */}
            <div className="grid grid-cols-6 border-b border-border shrink-0">
              {TABS.map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`flex flex-col items-center gap-0.5 py-2 text-[9px] font-medium transition-colors
                    ${activeTab === tab.id ? "bg-primary/10 text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground hover:bg-accent"}`}
                >
                  <tab.icon className="w-3.5 h-3.5" /> {tab.label}
                </button>
              ))}
            </div>

            {/* Scroll area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">

              {/* ── ФОН ── */}
              {activeTab === "bg" && (
                <div className="space-y-4">
                  {/* Remove bg */}
                  <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 space-y-2.5">
                    <p className="text-xs font-semibold text-primary flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" /> Убрать фон
                    </p>
                    <div>
                      <p className="text-[11px] text-muted-foreground mb-1">Чувствительность: {bgThreshold}</p>
                      <input type="range" min={180} max={254} value={bgThreshold} onChange={e => setBgThreshold(Number(e.target.value))} className="w-full accent-primary" />
                      <p className="text-[10px] text-muted-foreground mt-0.5">Меньше → убирает больше оттенков. Больше → только чисто белый.</p>
                    </div>
                    <button onClick={removeBg} disabled={removingBg}
                      className="w-full py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
                      {removingBg ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Обрабатываем...</> : <><Sparkles className="w-3.5 h-3.5" /> Убрать белый фон</>}
                    </button>
                  </div>

                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Готовые фоны</p>
                  <div className="grid grid-cols-4 gap-2">
                    {BG_PRESETS.map(p => (
                      <button key={p.value} onClick={() => applyBackground(p.value)} title={p.label}
                        className={`flex flex-col items-center gap-1 p-1.5 rounded-lg border transition-all hover:border-primary/50 ${bgColor === p.value ? "border-primary ring-1 ring-primary" : "border-border"}`}>
                        <span className="w-8 h-8 rounded-md border border-white/10" style={{ background: p.value === "transparent" ? "repeating-conic-gradient(#ddd 0% 25%, white 0% 50%) 0 0/10px 10px" : p.value }} />
                        <span className="text-[9px] text-muted-foreground leading-none">{p.label}</span>
                      </button>
                    ))}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Свой цвет</p>
                    <div className="flex gap-2">
                      <input type="color" value={customBg} onChange={e => setCustomBg(e.target.value)} className="w-10 h-10 rounded-lg border border-border cursor-pointer p-0.5" />
                      <button onClick={() => applyBackground(customBg)} className="flex-1 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors">Применить</button>
                    </div>
                  </div>
                </div>
              )}

              {/* ── ОБРЕЗКА ── */}
              {activeTab === "crop" && (
                <div className="space-y-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Обрезка фото</p>
                  <p className="text-[11px] text-muted-foreground">Сколько пикселей убрать с каждой стороны (canvas 800×800px)</p>
                  <div className="relative mx-auto bg-muted rounded-lg overflow-hidden" style={{ width: 160, height: 160 }}>
                    <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "repeating-conic-gradient(#aaa 0% 25%, transparent 0% 50%)", backgroundSize: "10px 10px" }} />
                    <div className="absolute border-2 border-primary bg-primary/10" style={{
                      top: `${(cropTop/800)*160}px`, left: `${(cropLeft/800)*160}px`,
                      right: `${(cropRight/800)*160}px`, bottom: `${(cropBottom/800)*160}px`,
                    }} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[{l:"Сверху",v:cropTop,s:setCropTop},{l:"Снизу",v:cropBottom,s:setCropBottom},{l:"Слева",v:cropLeft,s:setCropLeft},{l:"Справа",v:cropRight,s:setCropRight}].map(({l,v,s}) => (
                      <div key={l}>
                        <label className="text-[11px] text-muted-foreground block mb-1">{l} (px)</label>
                        <input type="number" min={0} max={400} value={v} onChange={e => s(Number(e.target.value))}
                          className="w-full px-2 py-1.5 rounded-lg border border-border bg-background text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary/20" />
                      </div>
                    ))}
                  </div>
                  <button onClick={applyCrop} className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors">
                    ✂️ Применить обрезку
                  </button>
                  {cropApplied && (
                    <button onClick={resetCrop} className="w-full py-2 rounded-xl border border-border text-sm text-muted-foreground hover:bg-accent transition-colors">Сбросить обрезку</button>
                  )}
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-700 dark:text-amber-400">
                    💡 После обрезки нажмите <strong>Сохранить</strong>
                  </div>
                </div>
              )}

              {/* ── ФИГУРЫ ── */}
              {activeTab === "shapes" && (
                <div className="space-y-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Добавить фигуру</p>

                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { type: "rect"     as const, label: "Прямоугольник", icon: "▭" },
                      { type: "circle"   as const, label: "Круг",          icon: "●" },
                      { type: "triangle" as const, label: "Треугольник",   icon: "▲" },
                    ].map(s => (
                      <button key={s.type} onClick={() => addShape(s.type)}
                        className="flex flex-col items-center gap-1.5 py-3 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-xs font-medium">
                        <span className="text-2xl leading-none" style={{ color: shapeColor }}>{s.icon}</span>
                        <span className="text-[10px] text-muted-foreground text-center leading-tight">{s.label}</span>
                      </button>
                    ))}
                  </div>

                  <div className="space-y-3 p-3 rounded-xl bg-muted/30 border border-border">
                    <p className="text-xs font-medium text-muted-foreground">Настройки</p>
                    <div className="flex items-center gap-2">
                      <input type="color" value={shapeColor}
                        onChange={e => { setShapeColor(e.target.value); updateSelObj({ fill: e.target.value }); }}
                        className="w-9 h-9 rounded-lg border border-border cursor-pointer p-0.5" />
                      <span className="text-xs text-muted-foreground">Цвет</span>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground mb-1">Прозрачность: {shapeOpacity}%</p>
                      <input type="range" min={10} max={100} value={shapeOpacity}
                        onChange={e => { setShapeOpacity(Number(e.target.value)); updateSelObj({ opacity: Number(e.target.value)/100 }); }}
                        className="w-full accent-primary" />
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground mb-1">Скругление углов: {shapeCorners}px</p>
                      <input type="range" min={0} max={100} value={shapeCorners}
                        onChange={e => { setShapeCorners(Number(e.target.value)); updateSelObj({ rx: Number(e.target.value), ry: Number(e.target.value) }); }}
                        className="w-full accent-primary" />
                    </div>
                  </div>

                  {hasSel && selType === "shape" && (
                    <button onClick={makeBackground}
                      className="w-full py-2.5 rounded-xl bg-primary/10 border border-primary/30 text-primary text-sm font-medium hover:bg-primary/20 transition-colors">
                      🖼️ Сделать фоном
                    </button>
                  )}

                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Иконки и эмодзи</p>
                    <div className="grid grid-cols-8 gap-1">
                      {EMOJI_ICONS.map(e => (
                        <button key={e} onClick={() => addEmojiIcon(e)}
                          className="w-8 h-8 flex items-center justify-center text-xl rounded-lg hover:bg-accent transition-colors" title="Добавить">
                          {e}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── ТЕКСТ ── */}
              {activeTab === "text" && (
                <div className="space-y-3">

                  {/* Live edit selected text */}
                  {selType === "text" && (
                    <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 space-y-3">
                      <p className="text-xs font-semibold text-primary">✏️ Изменить выбранный текст</p>
                      <div className="flex items-center gap-2">
                        <input type="color" value={liveColor}
                          onChange={e => { setLiveColor(e.target.value); updateSelObj({ fill: e.target.value }); }}
                          className="w-9 h-9 rounded-lg border border-border cursor-pointer p-0.5" />
                        <button onClick={() => updateSelObj({ fontWeight: "bold" })}  className="px-3 py-1.5 rounded-lg border border-border hover:bg-accent text-xs font-bold transition-colors">B</button>
                        <button onClick={() => updateSelObj({ fontStyle: "italic" })} className="px-3 py-1.5 rounded-lg border border-border hover:bg-accent text-xs italic transition-colors">I</button>
                        <button onClick={() => updateSelObj({ fontWeight: "normal", fontStyle: "normal" })} className="ml-auto text-[10px] text-muted-foreground hover:text-foreground transition-colors">сброс</button>
                      </div>
                      <div>
                        <p className="text-[11px] text-muted-foreground mb-1">Размер: {liveSize}px</p>
                        <input type="range" min={10} max={120} value={liveSize}
                          onChange={e => { setLiveSize(Number(e.target.value)); updateSelObj({ fontSize: Number(e.target.value) }); }}
                          className="w-full accent-primary" />
                      </div>
                      <div className="grid grid-cols-3 gap-1">
                        {FONTS.map((f, i) => (
                          <button key={i} onClick={() => { setLiveFontIdx(i); updateSelObj({ fontFamily: f.family, fontWeight: f.weight }); }}
                            className={`px-1.5 py-1 rounded-lg text-[10px] border transition-colors ${liveFontIdx === i ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-accent"}`}
                            style={{ fontFamily: f.family, fontWeight: f.weight as "normal"|"bold" }}>
                            {f.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Добавить текст</p>
                  <textarea value={textInput} onChange={e => setTextInput(e.target.value)}
                    placeholder="Введите текст..." rows={3}
                    className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/40" />

                  <div className="grid grid-cols-3 gap-1">
                    {FONTS.map((f, i) => (
                      <button key={i} onClick={() => setFontIdx(i)}
                        className={`px-1.5 py-1 rounded-lg text-[10px] border transition-colors ${fontIdx === i ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-accent"}`}
                        style={{ fontFamily: f.family, fontWeight: f.weight as "normal"|"bold" }}>
                        {f.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <input type="color" value={textColor} onChange={e => setTextColor(e.target.value)}
                      className="w-9 h-9 rounded-lg border border-border cursor-pointer p-0.5" />
                    <button onClick={() => setTextBold(!textBold)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-colors ${textBold ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-accent"}`}>B</button>
                    <button onClick={() => setTextItalic(!textItalic)}
                      className={`px-3 py-1.5 rounded-lg border text-xs italic transition-colors ${textItalic ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-accent"}`}>I</button>
                    {(["left","center","right"] as const).map(a => (
                      <button key={a} onClick={() => setTextAlign(a)}
                        className={`px-2 py-1.5 rounded-lg border text-[10px] transition-colors ${textAlign === a ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-accent"}`}>
                        {a === "left" ? "⬛▯▯" : a === "center" ? "▯⬛▯" : "▯▯⬛"}
                      </button>
                    ))}
                  </div>

                  <div>
                    <p className="text-[11px] text-muted-foreground mb-1">Размер: {fontSize}px</p>
                    <input type="range" min={14} max={96} value={fontSize} onChange={e => setFontSize(Number(e.target.value))} className="w-full accent-primary" />
                  </div>

                  <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
                    <input type="checkbox" checked={textShadow} onChange={e => setTextShadow(e.target.checked)} className="rounded" />
                    Тень под текстом
                  </label>

                  <button onClick={addText} disabled={!textInput.trim()}
                    className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-40 transition-colors">
                    + Добавить на фото
                  </button>
                </div>
              )}

              {/* ── ПЛАШКИ ── */}
              {activeTab === "adv" && (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Плашки-преимущества</p>
                  <p className="text-[11px] text-muted-foreground">Нажмите — плашка появится. Перетащите в нужное место.</p>
                  <div className="space-y-1.5">
                    {ADVANTAGES.map(adv => (
                      <button key={adv.text} onClick={() => addAdvantage(adv.icon, adv.text)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border border-border hover:border-primary/40 hover:bg-primary/5 transition-colors text-left">
                        <span className="text-base">{adv.icon}</span><span className="text-sm">{adv.text}</span>
                      </button>
                    ))}
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground mb-1.5">Своя плашка</p>
                    <div className="flex gap-2">
                      <input ref={customAdvRef} placeholder="Текст плашки..."
                        className="flex-1 bg-muted border border-border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40" />
                      <button onClick={() => { const v = customAdvRef.current?.value?.trim(); if (v) { addAdvantage("⭐", v); if (customAdvRef.current) customAdvRef.current.value = ""; } }}
                        className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90">+</button>
                    </div>
                  </div>
                </div>
              )}

              {/* ── ЛОГО ── */}
              {activeTab === "logo" && (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Логотип / Watermark</p>
                  <p className="text-[11px] text-muted-foreground">Загрузите PNG с прозрачным фоном. Перетащите в нужный угол.</p>
                  <input ref={logoInputRef} type="file" accept="image/png,image/svg+xml,image/webp" className="hidden" onChange={handleLogoUpload} />
                  <button onClick={() => logoInputRef.current?.click()}
                    className="w-full flex flex-col items-center justify-center gap-2 py-8 rounded-xl border-2 border-dashed border-border hover:border-primary/40 hover:bg-primary/5 transition-colors">
                    <Award className="w-8 h-8 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Загрузить логотип</span>
                    <span className="text-[10px] text-muted-foreground/60">PNG, SVG, WebP</span>
                  </button>
                </div>
              )}

            </div>

            {/* Hint footer */}
            <div className="p-3 border-t border-border shrink-0">
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Кликните на элемент чтобы выделить. Перетащите — переместить.
                {selType === "text"  && <span className="text-primary"> ✏️ Текст выбран → вкладка Текст</span>}
                {selType === "shape" && <span className="text-primary"> ● Фигура выбрана → вкладка Фигуры</span>}
              </p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
