"use client";

import { useState, useEffect, useRef } from "react";
import { ALargeSmall } from "lucide-react";

const SIZES = [
  { id: "xs", label: "Мини",      px: "12px",  scale: "0.857", preview: "A" },
  { id: "sm", label: "Компакт",   px: "13px",  scale: "0.929", preview: "A" },
  { id: "md", label: "Обычный",   px: "14px",  scale: "1",     preview: "A" },
  { id: "lg", label: "Крупнее",   px: "15.5px",scale: "1.107", preview: "A" },
  { id: "xl", label: "Максимум",  px: "17px",  scale: "1.214", preview: "A" },
];

const LS_KEY = "aray-font-size";

function getDeviceDefault(): string {
  const w = window.innerWidth;
  if (w < 768)  return "sm"; // телефон — компактнее
  if (w < 1280) return "md"; // планшет/ноутбук — стандарт
  return "lg";               // большой монитор — крупнее
}

function apply(size: typeof SIZES[0]) {
  // Корневой размер шрифта — масштабирует все rem значения
  document.documentElement.style.setProperty("font-size", size.px);
  // CSS переменная для масштабирования элементов с px размерами
  document.documentElement.style.setProperty("--aray-font-scale", size.scale);
}

export function AdminFontPicker() {
  const [open, setOpen]   = useState(false);
  const [active, setActive] = useState("md");
  const [isAuto, setIsAuto] = useState(true);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem(LS_KEY);
    const id = saved ?? getDeviceDefault();
    setActive(id);
    setIsAuto(!saved);
    const size = SIZES.find(s => s.id === id) ?? SIZES[2];
    apply(size);
  }, []);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  function pick(id: string) {
    const size = SIZES.find(s => s.id === id)!;
    setActive(id);
    setIsAuto(false);
    localStorage.setItem(LS_KEY, id);
    apply(size);
    setOpen(false);
  }

  function resetToAuto() {
    localStorage.removeItem(LS_KEY);
    const id = getDeviceDefault();
    setActive(id);
    setIsAuto(true);
    const size = SIZES.find(s => s.id === id) ?? SIZES[2];
    apply(size);
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        title="Размер шрифта"
        className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors aray-icon-spin
          ${open ? "bg-muted text-foreground" : "hover:bg-muted/80 text-muted-foreground hover:text-foreground"}`}
      >
        <ALargeSmall className="w-4 h-4" />
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-2 z-50
          bg-card border border-border rounded-2xl shadow-xl overflow-hidden p-2
          animate-in slide-in-from-top-2 fade-in duration-150 w-44">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground px-2 pt-1 pb-2">
            Размер шрифта
          </p>
          {/* Визуальные кнопки размера — горизонтальный ряд */}
          <div className="flex items-end justify-between gap-1 px-2 pb-3">
            {SIZES.map(s => (
              <button
                key={s.id}
                onClick={() => pick(s.id)}
                title={s.label}
                className={`flex flex-col items-center gap-1 flex-1 py-1.5 rounded-xl transition-all ${
                  active === s.id
                    ? "bg-primary/15 ring-1 ring-primary/40"
                    : "hover:bg-muted/60"
                }`}
              >
                <span
                  style={{ fontSize: s.px, lineHeight: 1, fontWeight: 800 }}
                  className={active === s.id ? "text-primary" : "text-muted-foreground"}
                >
                  A
                </span>
                <span className="text-[8px] font-medium text-muted-foreground leading-none">
                  {s.label.slice(0, 4)}
                </span>
              </button>
            ))}
          </div>
          <div className="border-t border-border/50 pt-1.5">
            <button
              onClick={resetToAuto}
              className="w-full flex items-center gap-2 px-3 py-1.5 rounded-xl text-left hover:bg-muted/60 transition-colors"
            >
              <span className="text-xs text-muted-foreground">Авто по устройству</span>
              {isAuto && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
