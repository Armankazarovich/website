"use client";

import React, { useState } from "react";
import { X } from "lucide-react";

type PwaPlatform = "android" | "ios" | "desktop";

/* SVG иконки для каждого шага */
const IcoChrome = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.6"/>
    <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.6"/>
    <path d="M12 8h8.5M6 20l3-5.2M18 20l-3-5.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
  </svg>
);
const IcoThreeDots = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
  </svg>
);
const IcoAddScreen = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <rect x="3" y="4" width="14" height="18" rx="2" stroke="currentColor" strokeWidth="1.6"/>
    <path d="M17 8h2a2 2 0 012 2v10a2 2 0 01-2 2H9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
    <path d="M10 10h4M12 8v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);
const IcoCheck = ({ color }: { color: string }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" fill={color} fillOpacity="0.2" stroke={color} strokeWidth="1.6"/>
    <path d="M7.5 12l3 3 6-6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const IcoSafari = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.6"/>
    <path d="M16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
    <circle cx="12" cy="12" r="1" fill="currentColor"/>
  </svg>
);
const IcoShare = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
    <circle cx="18" cy="5" r="3" stroke="currentColor" strokeWidth="1.6"/>
    <circle cx="6" cy="12" r="3" stroke="currentColor" strokeWidth="1.6"/>
    <circle cx="18" cy="19" r="3" stroke="currentColor" strokeWidth="1.6"/>
  </svg>
);
const IcoPlus = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <rect x="3" y="3" width="18" height="18" rx="4" stroke="currentColor" strokeWidth="1.6"/>
    <path d="M12 8v8M8 12h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);
const IcoInstall = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <rect x="3" y="3" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.6"/>
    <path d="M3 20h18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
    <path d="M12 7v6M9 11l3 3 3-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const INSTRUCTIONS: Record<PwaPlatform, { title: string; color: string; steps: { icon: React.ReactNode; text: string }[] }> = {
  android: {
    title: "Установить на Android",
    color: "#3DDC84",
    steps: [
      { icon: <IcoChrome />, text: "Откройте сайт в браузере Chrome" },
      { icon: <IcoThreeDots />, text: "Нажмите меню (три точки) в правом верхнем углу" },
      { icon: <IcoAddScreen />, text: "Выберите «Добавить на главный экран»" },
      { icon: <IcoCheck color="#3DDC84" />, text: "Нажмите «Добавить» — иконка появится на экране" },
    ],
  },
  ios: {
    title: "Установить на iPhone / iPad",
    color: "#aaaaaa",
    steps: [
      { icon: <IcoSafari />, text: "Откройте сайт в Safari (именно в Safari!)" },
      { icon: <IcoShare />, text: "Нажмите кнопку «Поделиться» внизу экрана" },
      { icon: <IcoPlus />, text: 'Выберите «На экран "Домой"»' },
      { icon: <IcoCheck color="#aaaaaa" />, text: "Нажмите «Добавить» — готово!" },
    ],
  },
  desktop: {
    title: "Установить на Windows / Mac",
    color: "#0078D4",
    steps: [
      { icon: <IcoChrome />, text: "Откройте сайт в Chrome или Edge" },
      { icon: <IcoThreeDots />, text: "Нажмите меню (три точки) справа в адресной строке" },
      { icon: <IcoInstall />, text: "Выберите «Установить ПилоРус» или «Сохранить как приложение»" },
      { icon: <IcoCheck color="#0078D4" />, text: "Подтвердите — иконка появится в меню Пуск / Dock" },
    ],
  },
};

export function PwaFooterBadges() {
  const [open, setOpen] = useState<PwaPlatform | null>(null);

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        {/* Android */}
        <button
          onClick={() => setOpen("android")}
          title="Установить на Android"
          className="flex items-center gap-1.5 backdrop-blur-sm bg-zinc-900/5 border border-zinc-900/10 dark:bg-white/5 dark:border-white/10 hover:bg-zinc-900/10 hover:border-[#3DDC84]/50 dark:hover:bg-white/10 dark:hover:border-[#3DDC84]/40 rounded-lg px-2.5 py-1.5 text-xs text-zinc-700 dark:text-zinc-300 transition-all cursor-pointer"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" className="text-[#3DDC84] shrink-0">
            <path d="M17.523 15.341a.5.5 0 01-.694.132l-3.08-2.18a.5.5 0 00-.554 0l-3.08 2.18a.5.5 0 01-.694-.132l-.408-.577a.5.5 0 01.098-.689l2.892-2.046V7a.5.5 0 01.5-.5h1a.5.5 0 01.5.5v4.029l2.892 2.046a.5.5 0 01.098.689zM2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10S2 17.523 2 12z" />
          </svg>
          Android
        </button>

        {/* iOS */}
        <button
          onClick={() => setOpen("ios")}
          title="Установить на iOS"
          className="flex items-center gap-1.5 backdrop-blur-sm bg-zinc-900/5 border border-zinc-900/10 dark:bg-white/5 dark:border-white/10 hover:bg-zinc-900/10 hover:border-zinc-500/50 dark:hover:bg-white/10 dark:hover:border-zinc-400/40 rounded-lg px-2.5 py-1.5 text-xs text-zinc-700 dark:text-zinc-300 transition-all cursor-pointer"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" className="text-zinc-700 dark:text-zinc-300 shrink-0">
            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
          </svg>
          iOS
        </button>

        {/* Windows */}
        <button
          onClick={() => setOpen("desktop")}
          title="Установить на Windows"
          className="flex items-center gap-1.5 backdrop-blur-sm bg-zinc-900/5 border border-zinc-900/10 dark:bg-white/5 dark:border-white/10 hover:bg-zinc-900/10 hover:border-[#0078D4]/50 dark:hover:bg-white/10 dark:hover:border-[#0078D4]/40 rounded-lg px-2.5 py-1.5 text-xs text-zinc-700 dark:text-zinc-300 transition-all cursor-pointer"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" className="text-[#0078D4] shrink-0">
            <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801" />
          </svg>
          Windows
        </button>
      </div>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/65 backdrop-blur-sm"
            onClick={() => setOpen(null)}
          />

          {/* Dialog */}
          <div className="relative w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl shadow-black/80"
            style={{
              backdropFilter: "blur(40px) saturate(180%) brightness(0.45)",
              WebkitBackdropFilter: "blur(40px) saturate(180%) brightness(0.45)",
              background: "linear-gradient(135deg, rgba(255,255,255,0.07) 0%, rgba(0,0,0,0.55) 100%)",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            {/* Glass shine */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />
            <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
            {/* Colored top stripe */}
            <div className="h-1 w-full" style={{ background: INSTRUCTIONS[open].color }} />

            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-bold text-white text-base leading-tight">
                  {INSTRUCTIONS[open].title}
                </h3>
                <button
                  onClick={() => setOpen(null)}
                  className="text-white/40 hover:text-white/80 transition-colors ml-3 shrink-0"
                  aria-label="Закрыть"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2">
                {INSTRUCTIONS[open].steps.map((step, i) => (
                  <div key={i} className="flex items-center gap-3 bg-white/6 border border-white/8 rounded-xl px-4 py-3">
                    <span className="shrink-0 text-zinc-300">{step.icon}</span>
                    <p className="text-sm text-zinc-200 leading-snug">{step.text}</p>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setOpen(null)}
                className="mt-4 w-full bg-brand-orange hover:bg-brand-orange/90 text-white font-semibold text-sm py-2.5 rounded-xl transition-colors shadow-lg shadow-brand-orange/25"
              >
                Понятно!
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
