"use client";

import { useState, useEffect, useRef } from "react";
import { ALargeSmall } from "lucide-react";

const SIZES = [
  { id: "sm", label: "Меньше", px: "13px",   preview: "A" },
  { id: "md", label: "Обычный", px: "14px",  preview: "A" },
  { id: "lg", label: "Крупнее", px: "15.5px", preview: "A" },
];

const LS_KEY = "aray-font-size";

function apply(px: string) {
  document.documentElement.style.setProperty("font-size", px);
}

export function AdminFontPicker() {
  const [open, setOpen]   = useState(false);
  const [active, setActive] = useState("md");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem(LS_KEY) || "md";
    setActive(saved);
    const px = SIZES.find(s => s.id === saved)?.px || "14px";
    apply(px);
  }, []);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  function pick(id: string) {
    const px = SIZES.find(s => s.id === id)!.px;
    setActive(id);
    localStorage.setItem(LS_KEY, id);
    apply(px);
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
          bg-card border border-border rounded-xl shadow-lg overflow-hidden p-1.5
          animate-in slide-in-from-top-2 fade-in duration-150 w-36">
          {SIZES.map(s => (
            <button
              key={s.id}
              onClick={() => pick(s.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors text-left
                ${active === s.id
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
                }`}
            >
              <span className="text-xs font-medium">{s.label}</span>
              <span style={{ fontSize: s.px, lineHeight: 1, fontWeight: 700 }}>{s.preview}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
