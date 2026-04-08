"use client";

import { useState, useRef, useEffect } from "react";
import { Languages, Check } from "lucide-react";
import { useAdminLang } from "@/lib/admin-lang-context";
import { ADMIN_LANGUAGES, type LangCode } from "@/lib/admin-i18n";

function useClassicMode() {
  const [classic, setClassic] = useState(false);
  useEffect(() => {
    setClassic(localStorage.getItem("aray-classic-mode") === "1");
    const h = () => setClassic(localStorage.getItem("aray-classic-mode") === "1");
    window.addEventListener("aray-classic-change", h);
    return () => window.removeEventListener("aray-classic-change", h);
  }, []);
  return classic;
}
// ─── Inline language picker (for mobile settings panel) ─────────────────────
export function AdminLangPickerInline() {
  const { lang, setLang } = useAdminLang();
  return (
    <div className="grid grid-cols-3 gap-2">
      {ADMIN_LANGUAGES.map(l => (
        <button
          key={l.code}
          onClick={() => setLang(l.code)}
          className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl transition-all text-center relative hover:brightness-125"
          style={
            lang === l.code
              ? { background: "hsl(var(--primary)/0.2)", border: "1.5px solid hsl(var(--primary)/0.5)" }
              : { background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(255,255,255,0.08)" }
          }
        >
          <span className="text-2xl leading-none">{l.flag}</span>
          <span className="text-[10px] font-medium text-white/70 leading-tight">{l.label}</span>
          {lang === l.code && (
            <span className="absolute top-1.5 right-1.5 w-3 h-3 rounded-full flex items-center justify-center"
              style={{ background: "hsl(var(--primary))" }}>
              <Check className="w-2 h-2 text-white" />
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

// ─── Dropdown lang picker (for desktop topbar) ───────────────────────────────
export function AdminLangPicker() {
  const { lang, setLang } = useAdminLang();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const classic = useClassicMode();

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const current = ADMIN_LANGUAGES.find(l => l.code === lang);

  function pick(code: LangCode) {
    setLang(code);
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        title="Язык / Language"
        className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:scale-110
          ${open ? "bg-primary/20 ring-2 ring-primary/30" : "hover:bg-primary/15"}`}
      >
        {current ? (
          <span className="text-base leading-none">{current.flag}</span>
        ) : (
          <Languages className="w-4 h-4 text-primary" />
        )}
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-2 z-50 animate-in slide-in-from-top-2 fade-in duration-150"
          style={classic ? {
            background: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "20px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
            width: "260px",
          } : {
            background: "rgba(10,14,30,0.96)",
            backdropFilter: "blur(32px) saturate(200%)",
            WebkitBackdropFilter: "blur(32px) saturate(200%)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: "20px",
            boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
            width: "260px",
          }}>

          <div className="px-4 pt-3 pb-2"
            style={{ borderBottom: classic ? "1px solid hsl(var(--border))" : "1px solid rgba(255,255,255,0.07)" }}>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em]"
              style={{ color: classic ? "hsl(var(--muted-foreground))" : "rgba(255,255,255,0.35)" }}>
              Язык / Language
            </p>
          </div>

          {/* Card grid */}
          <div className="p-3 grid grid-cols-3 gap-2">
            {ADMIN_LANGUAGES.map(l => (
              <button
                key={l.code}
                onClick={() => pick(l.code)}
                className="flex flex-col items-center gap-1.5 py-3 px-1 rounded-2xl transition-all text-center relative group"
                style={
                  lang === l.code
                    ? { background: "hsl(var(--primary)/0.2)", border: "1.5px solid hsl(var(--primary)/0.5)" }
                    : classic
                    ? { background: "hsl(var(--muted)/0.5)", border: "1.5px solid hsl(var(--border))" }
                    : { background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(255,255,255,0.08)" }
                }
              >
                <span className="text-2xl leading-none group-hover:scale-110 transition-transform">{l.flag}</span>
                <span className={`text-[10px] font-medium leading-tight ${lang === l.code ? (classic ? "text-primary" : "text-white/90") : (classic ? "text-muted-foreground" : "text-white/55")}`}>
                  {l.label}
                </span>
                {lang === l.code && (
                  <span className="absolute top-1.5 right-1.5 w-3 h-3 rounded-full flex items-center justify-center"
                    style={{ background: "hsl(var(--primary))" }}>
                    <Check className="w-2 h-2 text-white" />
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
