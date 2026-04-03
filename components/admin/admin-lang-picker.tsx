"use client";

import { useState, useRef, useEffect } from "react";
import { Languages } from "lucide-react";
import { useAdminLang } from "@/lib/admin-lang-context";
import { ADMIN_LANGUAGES, type LangCode } from "@/lib/admin-i18n";

export function AdminLangPicker() {
  const { lang, setLang } = useAdminLang();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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
        className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors aray-icon-spin
          ${open ? "bg-muted text-foreground" : "hover:bg-muted/80 text-muted-foreground hover:text-foreground"}`}
      >
        {current ? (
          <span className="text-base leading-none">{current.flag}</span>
        ) : (
          <Languages className="w-4 h-4" />
        )}
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-2 z-50
          bg-card border border-border rounded-2xl shadow-xl overflow-hidden
          animate-in slide-in-from-top-2 fade-in duration-150 w-52 max-h-[70vh] overflow-y-auto">

          <div className="px-3 pt-2.5 pb-1.5 border-b border-border">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              {lang === "ar" ? "اللغة" : "Язык / Language"}
            </p>
          </div>

          <div className="p-1.5 grid grid-cols-1 gap-0.5">
            {ADMIN_LANGUAGES.map(l => (
              <button
                key={l.code}
                onClick={() => pick(l.code)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-colors text-left
                  ${lang === l.code
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                  }`}
              >
                <span className="text-base leading-none shrink-0">{l.flag}</span>
                <span className="text-xs font-medium">{l.label}</span>
                {lang === l.code && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-foreground/70 shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
