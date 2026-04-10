"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Send, Mic, MicOff, Volume2, VolumeX, RotateCcw, ChevronDown,
  ImagePlus, Sparkles, X, Download, Maximize2,
  Globe, Zap, Brain, MessageCircle
} from "lucide-react";

// ─── Classic mode detection ──────────────────────────────────────────────────
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

// ─── Контекст страницы — умные чипсы + capabilities ──────────────────────────
const PAGE_CONTEXT: Record<string, { label: string; icon: string; quick: string[]; capabilities?: string[] }> = {
  "/admin":            { label: "Дашборд",    icon: "📊", quick: ["Сводка за сегодня", "Новые заказы", "Выручка за неделю", "Что срочно?"], capabilities: ["analytics", "orders"] },
  "/admin/orders":     { label: "Заказы",     icon: "📦", quick: ["Новые заказы", "Ждут подтверждения", "Заказы за сегодня", "Проблемные заказы"], capabilities: ["orders", "status"] },
  "/admin/products":   { label: "Каталог",    icon: "🪵", quick: ["Что не в наличии?", "Топ продаж", "Как добавить товар?", "Актуальные цены"], capabilities: ["products", "search"] },
  "/admin/clients":    { label: "Клиенты",    icon: "👥", quick: ["Новые клиенты", "Постоянные покупатели", "Кто давно не покупал?", "Лучший клиент"], capabilities: ["clients", "analytics"] },
  "/admin/analytics":  { label: "Аналитика",  icon: "📈", quick: ["Выручка за месяц", "Лучшие товары", "Динамика продаж", "Конверсия"], capabilities: ["analytics", "charts"] },
  "/admin/finance":    { label: "Финансы",    icon: "💰", quick: ["Выручка за месяц", "Средний чек", "Сравни с прошлым месяцем", "Прибыль"], capabilities: ["finance", "analytics"] },
  "/admin/inventory":  { label: "Склад",      icon: "🏭", quick: ["Что заканчивается?", "Остатки по товарам", "Что пополнить?", "Склад по категориям"], capabilities: ["inventory", "products"] },
  "/admin/crm":        { label: "CRM",        icon: "🎯", quick: ["Новые лиды", "Конверсия лидов", "Горячие клиенты", "Что в работе?"], capabilities: ["crm", "clients"] },
  "/admin/tasks":      { label: "Задачи",     icon: "✅", quick: ["Мои задачи", "Просроченные", "Создай задачу", "Что сделано сегодня?"], capabilities: ["tasks"] },
  "/admin/delivery":   { label: "Доставка",   icon: "🚚", quick: ["Активные доставки", "Задержки", "Маршруты сегодня", "Доставлено за неделю"], capabilities: ["delivery", "orders"] },
  "/admin/staff":      { label: "Команда",    icon: "👤", quick: ["Кто в команде?", "Добавить сотрудника", "Роли и доступы", "Активность"], capabilities: ["staff"] },
  "/admin/settings":   { label: "Настройки",  icon: "⚙️", quick: ["Как настроить сайт?", "SMTP email", "Telegram бот", "Домен и SSL"], capabilities: ["settings"] },
  "/admin/appearance": { label: "Оформление", icon: "🎨", quick: ["Сменить тему", "Палитры", "Как выглядит сайт?", "Логотип"], capabilities: ["appearance"] },
};
const DEFAULT_QUICK = ["Сводка за сегодня", "Новые заказы", "Список товаров", "Что срочно?"];

function getPageCtx(pathname: string) {
  if (PAGE_CONTEXT[pathname]) return PAGE_CONTEXT[pathname];
  const match = Object.keys(PAGE_CONTEXT)
    .filter(k => k !== "/admin" && pathname.startsWith(k))
    .sort((a, b) => b.length - a.length)[0];
  return match ? PAGE_CONTEXT[match] : null;
}

// ─── Типы ────────────────────────────────────────────────────────────────────
type MediaAttachment = {
  type: "image" | "video";
  data: string; // base64 or URL
  prompt?: string;
};

type Msg = {
  id: string;
  role: "user" | "assistant";
  text: string;
  streaming?: boolean;
  media?: MediaAttachment[];
  generating?: boolean; // image/video is being generated
};

function parseActions(raw: string) {
  const idx = raw.indexOf("ARAY_ACTIONS:");
  return { text: idx === -1 ? raw : raw.slice(0, idx).trim() };
}

// ─── Markdown рендер (inline) ────────────────────────────────────────────────
function renderInline(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*\n]+\*\*|\*[^*\n]+\*|`[^`\n]+`)/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**"))
      return <strong key={i} className="font-semibold">{p.slice(2, -2)}</strong>;
    if (p.startsWith("*") && p.endsWith("*"))
      return <em key={i}>{p.slice(1, -1)}</em>;
    if (p.startsWith("`") && p.endsWith("`"))
      return (
        <code key={i} className="aray-code-inline">
          {p.slice(1, -1)}
        </code>
      );
    return p as React.ReactNode;
  });
}

function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split("\n");
  const nodes: React.ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === "") { i++; continue; }

    if (/^---+$/.test(line.trim())) {
      nodes.push(<hr key={i} className="my-2 border-none" style={{ borderTop: "1px solid hsl(var(--border)/0.3)" }} />);
      i++; continue;
    }

    const hm = line.match(/^(#{1,3})\s+(.+)$/);
    if (hm) {
      nodes.push(
        <p key={i} className="font-bold mt-2 mb-0.5 text-[13px]" style={{ color: "hsl(var(--primary))" }}>
          {renderInline(hm[2])}
        </p>
      );
      i++; continue;
    }

    if (/^[\-\*]\s/.test(line.trim())) {
      const items: string[] = [];
      while (i < lines.length && /^[\-\*]\s/.test(lines[i].trim())) {
        items.push(lines[i].replace(/^[\-\*]\s/, "").trim()); i++;
      }
      nodes.push(
        <ul key={`ul-${i}`} className="space-y-0.5 my-1">
          {items.map((it, ii) => (
            <li key={ii} className="flex gap-1.5 items-start">
              <span className="mt-[6px] shrink-0 w-1.5 h-1.5 rounded-full" style={{ background: "hsl(var(--primary)/0.6)" }}/>
              <span>{renderInline(it)}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    if (/^\d+\.\s/.test(line.trim())) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
        items.push(lines[i].replace(/^\d+\.\s/, "").trim()); i++;
      }
      nodes.push(
        <ol key={`ol-${i}`} className="space-y-0.5 my-1 list-none">
          {items.map((it, ii) => (
            <li key={ii} className="flex gap-2 items-start">
              <span className="aray-list-number">{ii + 1}</span>
              <span>{renderInline(it)}</span>
            </li>
          ))}
        </ol>
      );
      continue;
    }

    if (line.trim().startsWith("|")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) { tableLines.push(lines[i]); i++; }
      const parseRow = (row: string) => row.split("|").slice(1, -1).map(cell => cell.trim());
      const headers = parseRow(tableLines[0]);
      const sepIdx = tableLines.findIndex(l => /^\|[\s\-:|]+\|$/.test(l.trim()));
      const dataRows = tableLines.slice(sepIdx >= 0 ? sepIdx + 1 : 1).map(parseRow);
      nodes.push(
        <div key={`tbl-${i}`} className="my-2 overflow-x-auto aray-table-wrap">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="aray-table-header">
                {headers.map((h, hi) => (
                  <th key={hi} className="px-3 py-2 text-left font-semibold" style={{ color: "hsl(var(--primary))" }}>{renderInline(h)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dataRows.filter(r => r.some(c => c)).map((row, ri) => (
                <tr key={ri} className="aray-table-row">
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-3 py-2">{renderInline(cell)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    nodes.push(<p key={i}>{renderInline(line)}</p>);
    i++;
  }
  return nodes;
}

// ─── Голосовой ввод ──────────────────────────────────────────────────────────
function useVoice(onResult: (t: string) => void, onAutoSend: () => void) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const ref = useRef<any>(null);

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setSupported(!!SR);
  }, []);

  const start = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    if (ref.current) { try { ref.current.stop(); } catch {} ref.current = null; }
    const r = new SR();
    r.lang = "ru-RU"; r.interimResults = false; r.continuous = false;
    r.onstart = () => setListening(true);
    r.onend = () => { setListening(false); ref.current = null; };
    r.onerror = () => { setListening(false); ref.current = null; };
    r.onresult = (e: any) => {
      const t = e.results[0]?.[0]?.transcript?.trim() || "";
      if (t) { onResult(t); setTimeout(onAutoSend, 120); }
    };
    try { r.start(); ref.current = r; } catch { setListening(false); }
  }, [onResult, onAutoSend]);

  const stop = useCallback(() => {
    if (ref.current) { try { ref.current.stop(); } catch {} ref.current = null; }
    setListening(false);
  }, []);

  return { listening, supported, start, stop };
}

// ─── TTS — ElevenLabs (primary) + браузер (fallback) ─────────────────────────
const voicesCache: { list: SpeechSynthesisVoice[] } = { list: [] };

function loadVoices() {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  const v = window.speechSynthesis.getVoices();
  if (v.length) voicesCache.list = v;
}

function pickBestRuVoice(): SpeechSynthesisVoice | null {
  const voices = voicesCache.list.length
    ? voicesCache.list
    : (typeof window !== "undefined" ? window.speechSynthesis?.getVoices() ?? [] : []);
  const p = [
    (v: SpeechSynthesisVoice) => v.lang.startsWith("ru") && v.name.includes("Natural"),
    (v: SpeechSynthesisVoice) => v.lang.startsWith("ru") && v.name.includes("Microsoft"),
    (v: SpeechSynthesisVoice) => v.lang.startsWith("ru") && v.name.includes("Irina"),
    (v: SpeechSynthesisVoice) => v.lang.startsWith("ru") && v.name.includes("Google"),
    (v: SpeechSynthesisVoice) => v.lang.startsWith("ru"),
  ];
  for (const fn of p) { const f = voices.find(fn); if (f) return f; }
  return null;
}

function cleanForSpeech(t: string) {
  return t.replace(/\*\*(.*?)\*\*/g, "$1").replace(/\*(.*?)\*/g, "$1")
    .replace(/[#_`|]/g, " ")
    .replace(/[\uD800-\uDFFF]/g, "")
    .replace(/[\u2600-\u27BF]/g, "")
    .replace(/[\u{1F000}-\u{1FFFF}]/gu, "")
    .replace(/ARAY_ACTIONS:\[[\s\S]*?\]/g, "")
    .replace(/^---+$/mg, "").replace(/\s{2,}/g, " ").trim();
}

function useTTS() {
  const [speaking, setSpeaking] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);
  const speakingRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.speechSynthesis) {
      loadVoices();
      window.speechSynthesis.onvoiceschanged = () => { voicesCache.list = window.speechSynthesis.getVoices(); };
    }
  }, []);

  useEffect(() => { speakingRef.current = speaking; }, [speaking]);

  const stopAll = useCallback(() => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    if (typeof window !== "undefined") { window.speechSynthesis?.cancel(); utterRef.current = null; }
    setSpeaking(null);
    speakingRef.current = null;
  }, []);

  const speak = useCallback(async (text: string, id: string) => {
    if (speakingRef.current === id) { stopAll(); return; }
    stopAll();
    const clean = cleanForSpeech(text);
    if (!clean) return;
    setSpeaking(id);
    speakingRef.current = id;

    // Try ElevenLabs first
    try {
      const res = await fetch("/api/ai/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: clean }),
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => { URL.revokeObjectURL(url); if (speakingRef.current === id) { setSpeaking(null); speakingRef.current = null; } audioRef.current = null; };
        audio.onerror = () => { URL.revokeObjectURL(url); if (speakingRef.current === id) { setSpeaking(null); speakingRef.current = null; } audioRef.current = null; };
        audio.play().catch(() => { URL.revokeObjectURL(url); audioRef.current = null; if (speakingRef.current === id) { setSpeaking(null); speakingRef.current = null; } });
        return;
      }
    } catch {}

    // Fallback: browser TTS
    if (typeof window === "undefined" || !window.speechSynthesis) { setSpeaking(null); speakingRef.current = null; return; }
    window.speechSynthesis.cancel();
    window.speechSynthesis.resume();
    const utter = new SpeechSynthesisUtterance(clean);
    utter.lang = "ru-RU"; utter.rate = 1.05; utter.pitch = 1.0; utter.volume = 1.0;
    const voice = pickBestRuVoice();
    if (voice) utter.voice = voice;
    else setTimeout(() => { loadVoices(); const v2 = pickBestRuVoice(); if (v2) utter.voice = v2; }, 300);
    utter.onend = () => { if (speakingRef.current === id) { setSpeaking(null); speakingRef.current = null; } utterRef.current = null; };
    utter.onerror = (e) => { if ((e as any).error === "interrupted") return; if (speakingRef.current === id) { setSpeaking(null); speakingRef.current = null; } utterRef.current = null; };
    utterRef.current = utter;
    window.speechSynthesis.speak(utter);
  }, [stopAll]);

  return { speaking, speak, stop: stopAll, supported: true };
}

// ─── Шар ARAY (единый брендовый — огненный) ─────────────────────────────────
function ArayOrb({ size = 28, pulse = false, speaking = false, id = "ao" }: {
  size?: number; pulse?: boolean; speaking?: boolean; id?: string;
}) {
  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* Glow ring when active */}
      {(pulse || speaking) && (
        <div className="absolute inset-0 rounded-full aray-orb-glow" style={{
          background: `radial-gradient(circle, hsl(var(--primary) / 0.3) 0%, transparent 70%)`,
          transform: "scale(1.8)",
          animation: speaking ? "aray-speak-glow 1.5s ease-in-out infinite" : "aray-pulse-glow 2s ease-in-out infinite",
        }}/>
      )}
      <svg width={size} height={size} viewBox="0 0 100 100"
        style={{ display: "block", flexShrink: 0, position: "relative", zIndex: 1 }}>
        <defs>
          <radialGradient id={`${id}-base`} cx="34%" cy="28%" r="70%">
            <stop offset="0%"   stopColor="#fffbe0"/>
            <stop offset="10%"  stopColor="#ffca40"/>
            <stop offset="28%"  stopColor="#f07800"/>
            <stop offset="52%"  stopColor="#c05000"/>
            <stop offset="75%"  stopColor="#6e1c00"/>
            <stop offset="100%" stopColor="#160300"/>
          </radialGradient>
          <radialGradient id={`${id}-dark`} cx="72%" cy="74%" r="52%">
            <stop offset="0%"   stopColor="#050000" stopOpacity="0.75"/>
            <stop offset="100%" stopColor="#050000" stopOpacity="0"/>
          </radialGradient>
          <radialGradient id={`${id}-hl`} cx="30%" cy="25%" r="34%">
            <stop offset="0%"   stopColor="white" stopOpacity="0.85"/>
            <stop offset="100%" stopColor="white" stopOpacity="0"/>
          </radialGradient>
          <radialGradient id={`${id}-rim`} cx="50%" cy="50%" r="50%">
            <stop offset="76%"  stopColor="transparent" stopOpacity="0"/>
            <stop offset="100%" stopColor="#ffcc00" stopOpacity="0.55"/>
          </radialGradient>
          <clipPath id={`${id}-clip`}><circle cx="50" cy="50" r="46"/></clipPath>
        </defs>
        <circle cx="50" cy="50" r="46" fill={`url(#${id}-base)`}/>
        <circle cx="50" cy="50" r="46" fill={`url(#${id}-dark)`}/>
        <circle cx="50" cy="50" r="46" fill={`url(#${id}-rim)`}/>
        <g clipPath={`url(#${id}-clip)`}>
          <ellipse cx="50" cy="50" rx="28" ry="10" fill="white" opacity="0.14">
            <animateTransform attributeName="transform" type="rotate"
              from="0 50 50" to="360 50 50" dur="9s" repeatCount="indefinite"/>
          </ellipse>
        </g>
        <circle cx="50" cy="50" r="46" fill={`url(#${id}-hl)`}/>
        <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(255,200,60,0.22)" strokeWidth="1">
          <animate attributeName="stroke-opacity" values="0.22;0.55;0.22" dur="3s" repeatCount="indefinite"/>
        </circle>
      </svg>
    </div>
  );
}

// ─── Визуализация голоса (волны) ─────────────────────────────────────────────
function VoiceWaveform({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <div className="flex items-center gap-[2px] h-4">
      {[0,1,2,3,4].map(i => (
        <motion.div
          key={i}
          className="w-[3px] rounded-full"
          style={{ background: "hsl(var(--primary))" }}
          animate={{ height: active ? [4, 14, 6, 16, 4] : 4 }}
          transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.1 }}
        />
      ))}
    </div>
  );
}

// ─── Image preview component ─────────────────────────────────────────────────
function MediaPreview({ media, onClose }: { media: MediaAttachment; onClose?: () => void }) {
  const [fullscreen, setFullscreen] = useState(false);
  const src = media.data.startsWith("data:") ? media.data : `data:image/png;base64,${media.data}`;

  return (
    <>
      <div className="aray-media-preview group relative">
        <img src={src} alt={media.prompt || "Generated"} className="aray-media-img" onClick={() => setFullscreen(true)} />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100">
          <div className="flex gap-2">
            <button onClick={() => setFullscreen(true)} className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm hover:bg-white/30">
              <Maximize2 className="w-3.5 h-3.5 text-white"/>
            </button>
            <a href={src} download={`aray-${Date.now()}.png`} className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm hover:bg-white/30">
              <Download className="w-3.5 h-3.5 text-white"/>
            </a>
          </div>
        </div>
        {media.prompt && <p className="text-[10px] mt-1 opacity-50 truncate">{media.prompt}</p>}
      </div>

      {/* Fullscreen modal */}
      <AnimatePresence>
        {fullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setFullscreen(false)}
          >
            <motion.img
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              src={src}
              className="max-w-full max-h-full rounded-2xl shadow-2xl"
              onClick={e => e.stopPropagation()}
            />
            <button onClick={() => setFullscreen(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white">
              <X className="w-5 h-5"/>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Generating indicator ────────────────────────────────────────────────────
function GeneratingIndicator({ type }: { type?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="aray-generating-indicator"
    >
      <div className="aray-generating-shimmer"/>
      <div className="relative z-10 flex items-center gap-2 px-4 py-3">
        <Sparkles className="w-4 h-4 text-amber-400 animate-pulse"/>
        <span className="text-[12px] font-medium">
          {type === "image" ? "Генерирую изображение..." : "Создаю контент..."}
        </span>
      </div>
    </motion.div>
  );
}

// ─── Пузырь сообщения ────────────────────────────────────────────────────────
function Bubble({ msg, onSpeak, speaking }: {
  msg: Msg; onSpeak?: (t: string, id: string) => void; speaking?: string | null;
}) {
  const isUser = msg.role === "user";
  const isSpeaking = speaking === msg.id;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", damping: 28, stiffness: 340 }}
      className={`flex gap-2.5 ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      {!isUser && (
        <div className="shrink-0 mt-1">
          <ArayOrb size={24} speaking={isSpeaking} pulse={msg.streaming} id={`bo-${msg.id}`}/>
        </div>
      )}
      <div className="flex flex-col gap-1 max-w-[82%]">
        <div className={`px-4 py-3 text-[13.5px] leading-relaxed ${isUser ? "aray-chat-bubble-user" : "aray-chat-bubble-assistant"}`}>
          {/* Media attachments */}
          {msg.media?.map((m, idx) => (
            <div key={idx} className="mb-2">
              <MediaPreview media={m}/>
            </div>
          ))}

          {/* Generating indicator */}
          {msg.generating && <GeneratingIndicator type="image"/>}

          {/* Text content */}
          {msg.text
            ? <div className="space-y-1">{renderMarkdown(msg.text)}</div>
            : !isUser && msg.streaming
            ? <span className="inline-flex gap-1.5 items-center py-0.5">
                {[0,1,2].map(i => (
                  <motion.span
                    key={i}
                    className="aray-typing-dot"
                    animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
                  />
                ))}
              </span>
            : null}
          {msg.streaming && msg.text && <span className="aray-stream-cursor"/>}
        </div>

        {/* Action buttons under assistant message */}
        {!isUser && !msg.streaming && msg.text && (
          <div className="flex items-center gap-1 pl-1">
            {onSpeak && (
              <button onClick={() => onSpeak(msg.text, msg.id)}
                className={`aray-speak-btn px-2 py-0.5 text-[10px] ${isSpeaking ? "aray-speak-btn-active" : ""}`}>
                {isSpeaking ? <><VolumeX className="w-3 h-3"/> <VoiceWaveform active/></> : <><Volume2 className="w-3 h-3"/> озвучить</>}
              </button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Capability pills ────────────────────────────────────────────────────────
function CapabilityPills() {
  const pills = [
    { icon: Brain, label: "AI", tip: "Claude Sonnet 4.6" },
    { icon: ImagePlus, label: "Imagen", tip: "Google AI" },
    { icon: Volume2, label: "Голос", tip: "ElevenLabs" },
    { icon: Globe, label: "Веб", tip: "Поиск в интернете" },
  ];
  return (
    <div className="flex gap-1.5 flex-wrap">
      {pills.map(p => (
        <div key={p.label} className="aray-capability-pill" title={p.tip}>
          <p.icon className="w-3 h-3"/>
          <span>{p.label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Главный компонент ───────────────────────────────────────────────────────
export function AdminAray({ staffName = "Коллега", userRole }: {
  staffName?: string;
  userRole?: string;
}) {
  const classic = useClassicMode();
  const pathname = usePathname();
  const pageCtx = getPageCtx(pathname);
  const quickList = pageCtx?.quick ?? DEFAULT_QUICK;

  const [expanded, setExpanded] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [autoVoice, setAutoVoice] = useState(false);
  const [showGenMenu, setShowGenMenu] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const sendRef = useRef<(text?: string) => Promise<void>>();
  const { speaking, speak, stop: stopVoice } = useTTS();

  useEffect(() => {
    setAutoVoice(localStorage.getItem("aray-auto-voice") === "1");
  }, []);

  const addInput = useCallback((t: string) => { setInput(t); if (!expanded) setExpanded(true); }, [expanded]);
  const autoSend = useCallback(() => { sendRef.current?.(); }, []);
  const { listening, supported: micSupported, start: startMic, stop: stopMic } = useVoice(addInput, autoSend);

  // Auto-voice for new responses
  const lastMsgRef = useRef<string>("");
  useEffect(() => {
    if (!autoVoice) return;
    const last = messages[messages.length - 1];
    if (last?.role === "assistant" && !last.streaming && last.text && last.id !== lastMsgRef.current) {
      lastMsgRef.current = last.id;
      speak(last.text, last.id);
    }
  }, [messages, autoVoice, speak]);

  const toggleAutoVoice = useCallback(() => {
    const next = !autoVoice;
    setAutoVoice(next);
    localStorage.setItem("aray-auto-voice", next ? "1" : "0");
    if (!next) stopVoice();
  }, [autoVoice, stopVoice]);

  // Welcome message
  useEffect(() => {
    if (expanded && messages.length === 0) {
      const h = new Date().getHours();
      const gr = h < 6 ? "Не спишь?" : h < 12 ? "Доброе утро" : h < 17 ? "Привет" : h < 22 ? "Добрый вечер" : "Поздновато";
      const name = staffName !== "Коллега" ? `, ${staffName}` : "";
      const pageNote = pageCtx
        ? ` Мы в **${pageCtx.label}**. Чем помочь?`
        : " Что нужно — спрашивай.";
      setMessages([{ id: "w", role: "assistant", text: `${gr}${name}!${pageNote}` }]);
    }
  }, [expanded, messages.length, staffName, pageCtx]);

  // Auto-scroll
  useEffect(() => {
    if (expanded) setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 60);
  }, [messages, expanded]);

  // Open via event
  useEffect(() => {
    const h = () => { setExpanded(true); setTimeout(() => inputRef.current?.focus(), 200); };
    window.addEventListener("aray:open", h);
    return () => window.removeEventListener("aray:open", h);
  }, []);

  // Fill input via event
  useEffect(() => {
    const h = (e: Event) => {
      const { text } = (e as CustomEvent<{ text: string }>).detail || {};
      if (text) { addInput(text); setExpanded(true); setTimeout(() => inputRef.current?.focus(), 150); }
    };
    window.addEventListener("aray:fill", h);
    return () => window.removeEventListener("aray:fill", h);
  }, [addInput]);

  // ─── Image generation ──────────────────────────────────────────────────────
  const generateImage = useCallback(async (prompt: string) => {
    const aid = Date.now().toString();
    setMessages(prev => [...prev,
      { id: (Date.now() - 1).toString(), role: "user", text: prompt },
      { id: aid, role: "assistant", text: "", generating: true }
    ]);
    setShowGenMenu(false);

    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, type: "image" }),
      });
      const data = await res.json();

      if (data.success && data.data) {
        setMessages(prev => prev.map(m => m.id === aid ? {
          ...m,
          text: "Готово! Вот что получилось:",
          generating: false,
          media: [{ type: "image" as const, data: data.data, prompt }]
        } : m));
      } else {
        setMessages(prev => prev.map(m => m.id === aid ? {
          ...m,
          text: data.error || "Не удалось сгенерировать. Попробуй другой запрос.",
          generating: false
        } : m));
      }
    } catch {
      setMessages(prev => prev.map(m => m.id === aid ? {
        ...m,
        text: "Нет связи с Google AI. Попробуй позже.",
        generating: false
      } : m));
    }
  }, []);

  // ─── Main send function ────────────────────────────────────────────────────
  const send = useCallback(async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput("");
    if (!expanded) setExpanded(true);

    // Detect image generation intent
    const imgPatterns = /(?:сгенерируй|создай|нарисуй|сделай)\s+(?:изображение|картинку|фото|баннер|картину|иллюстрацию|лого)/i;
    if (imgPatterns.test(msg)) {
      generateImage(msg);
      return;
    }

    const userMsg: Msg = { id: Date.now().toString(), role: "user", text: msg };
    const allMsgs = [...messages, userMsg];
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);
    const aid = (Date.now() + 1).toString();

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: allMsgs.map(m => ({ role: m.role, content: m.text })),
          context: { page: pathname },
        }),
      });
      if (!res.body) throw new Error("no stream");

      setMessages(prev => [...prev, { id: aid, role: "assistant", text: "", streaming: true }]);
      setLoading(false);

      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let raw = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        raw += dec.decode(value, { stream: true });
        const disp = raw.replace(/\n__ARAY_META__[\s\S]*$/, "").replace(/__ARAY_ERR__[\s\S]*$/, "");
        setMessages(prev => prev.map(m => m.id === aid ? { ...m, text: disp } : m));
      }
      const isErr = raw.includes("__ARAY_ERR__");
      const clean = isErr
        ? (raw.match(/__ARAY_ERR__(.+)$/)?.[1] || "Что-то пошло не так")
        : raw.replace(/\n__ARAY_META__[\s\S]*$/, "").trim();
      const { text: final } = parseActions(clean);
      setMessages(prev => prev.map(m => m.id === aid ? { ...m, text: final, streaming: false } : m));
    } catch {
      setMessages(prev => {
        const has = prev.some(m => m.id === aid);
        return has
          ? prev.map(m => m.id === aid ? { ...m, text: "Нет связи. Попробуй ещё раз.", streaming: false } : m)
          : [...prev, { id: aid, role: "assistant", text: "Нет связи. Попробуй ещё раз." }];
      });
    } finally { setLoading(false); }
  }, [input, messages, loading, expanded, pathname, generateImage]);

  useEffect(() => { sendRef.current = send; }, [send]);

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const hasText = input.trim().length > 0;

  return (
    <>
      {/* ══ ПАНЕЛЬ ЧАТА — полный экран, жидкое стекло ══════════════════════════ */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 30, stiffness: 320 }}
            className="fixed z-[25] left-0 lg:left-60 right-0 aray-chat-panel flex flex-col"
            style={{ bottom: "72px" }}
          >
            {/* ── Header ── */}
            <div className="aray-chat-header flex items-center gap-3 px-5 py-3 shrink-0">
              <ArayOrb size={30} pulse={loading} speaking={!!speaking} id="header-orb"/>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="aray-name-glow text-[15px] font-bold tracking-tight">Арай</span>
                  <span className="aray-online-dot"/>
                  {pageCtx && (
                    <span className="aray-section-badge">
                      <span>{pageCtx.icon}</span>
                      <span>{pageCtx.label}</span>
                    </span>
                  )}
                </div>
                <div className="mt-0.5">
                  <CapabilityPills/>
                </div>
              </div>
              <button onClick={() => setMessages([])} className="aray-chat-ctrl-btn p-2" title="Новый чат">
                <RotateCcw className="w-3.5 h-3.5"/>
              </button>
              <button onClick={() => setExpanded(false)} className="aray-chat-ctrl-btn p-2" title="Свернуть">
                <ChevronDown className="w-4 h-4"/>
              </button>
            </div>

            {/* ── Messages ── */}
            <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3 aray-messages-area">
              {messages.map(msg => (
                <Bubble key={msg.id} msg={msg} onSpeak={speak} speaking={speaking}/>
              ))}

              {/* Quick chips after welcome */}
              {messages.length === 1 && !loading && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, staggerChildren: 0.05 }}
                  className="flex flex-wrap gap-2 mt-2 pl-9"
                >
                  {quickList.map((q, idx) => (
                    <motion.button
                      key={q}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 + idx * 0.06 }}
                      onClick={() => send(q)}
                      className="aray-quick-btn px-3.5 py-2 text-[12px] active:scale-95 transition-transform"
                    >
                      {q}
                    </motion.button>
                  ))}
                  {/* Generate image chip */}
                  <motion.button
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    onClick={() => { setInput("Сгенерируй изображение "); inputRef.current?.focus(); }}
                    className="aray-quick-btn aray-quick-btn-special px-3.5 py-2 text-[12px] active:scale-95 transition-transform"
                  >
                    <ImagePlus className="w-3 h-3 inline mr-1"/> Создать картинку
                  </motion.button>
                </motion.div>
              )}
              <div ref={bottomRef}/>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══ INPUT BAR — always visible ════════════════════════════════════════════ */}
      <div className="fixed bottom-0 left-0 lg:left-60 right-0 z-[26] aray-chat-bar">

        {/* Quick chips collapsed */}
        {!expanded && (
          <div className="flex gap-1.5 px-4 pt-2.5 pb-1 overflow-x-auto scrollbar-none">
            {quickList.map(q => (
              <button key={q}
                onClick={() => { send(q); setExpanded(true); }}
                className="aray-quick-btn shrink-0 px-3 py-1.5 text-[11px] active:scale-95 transition-transform whitespace-nowrap">
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Input row */}
        <div className="flex items-end gap-2.5 px-4 py-2.5">

          {/* Orb button */}
          <button
            onClick={() => { setExpanded(v => !v); if (!expanded) setTimeout(() => inputRef.current?.focus(), 150); }}
            className="shrink-0 mb-0.5 transition-transform hover:scale-105 active:scale-95"
            style={{ WebkitTapHighlightColor: "transparent" }}
            title={expanded ? "Свернуть" : "Открыть Арая"}
          >
            <ArayOrb size={34} pulse={loading} speaking={!!speaking} id="bar-orb"/>
          </button>

          {/* Textarea */}
          <div className="flex-1 min-w-0 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              onFocus={() => !expanded && setExpanded(true)}
              placeholder={listening ? "Слушаю..." : pageCtx ? `Спроси про ${pageCtx.label.toLowerCase()}...` : "Спроси Арая..."}
              rows={1}
              className="aray-chat-input w-full resize-none text-[13.5px] leading-relaxed outline-none py-1.5 pr-8"
              style={{ maxHeight: 88, fontFamily: "inherit" }}
              onInput={e => {
                const t = e.currentTarget;
                t.style.height = "auto";
                t.style.height = Math.min(t.scrollHeight, 88) + "px";
              }}
            />
            {/* Generate button inside input */}
            <button
              onClick={() => setShowGenMenu(!showGenMenu)}
              className="absolute right-1 bottom-1.5 aray-gen-btn p-1"
              title="Генерация контента"
            >
              <Sparkles className="w-3.5 h-3.5"/>
            </button>

            {/* Generate menu popup */}
            <AnimatePresence>
              {showGenMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  className="aray-gen-menu absolute bottom-full right-0 mb-2"
                >
                  <button onClick={() => { setInput("Сгенерируй изображение: "); setShowGenMenu(false); inputRef.current?.focus(); }}
                    className="aray-gen-menu-item">
                    <ImagePlus className="w-4 h-4"/> Изображение
                  </button>
                  <button onClick={() => { setInput("Создай баннер для: "); setShowGenMenu(false); inputRef.current?.focus(); }}
                    className="aray-gen-menu-item">
                    <Zap className="w-4 h-4"/> Баннер
                  </button>
                  <button onClick={() => { setInput("Напиши текст для: "); setShowGenMenu(false); inputRef.current?.focus(); }}
                    className="aray-gen-menu-item">
                    <MessageCircle className="w-4 h-4"/> Текст
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1 shrink-0 mb-0.5">
            {/* Voice toggle */}
            <button
              onClick={toggleAutoVoice}
              className={`aray-chat-action-btn p-2 ${autoVoice ? "aray-chat-action-btn-active" : ""}`}
              title={autoVoice ? "Голос ВКЛ" : "Включить голос"}
            >
              {autoVoice ? <Volume2 className="w-4 h-4"/> : <VolumeX className="w-4 h-4"/>}
            </button>

            {/* Mic */}
            {micSupported && (
              <button
                onClick={listening ? stopMic : startMic}
                className={`aray-chat-action-btn p-2 ${listening ? "aray-chat-action-btn-active" : ""}`}
                title={listening ? "Стоп" : "Говори"}
              >
                {listening ? <MicOff className="w-4 h-4"/> : <Mic className="w-4 h-4"/>}
              </button>
            )}

            {/* Send */}
            <button
              onClick={() => send()}
              disabled={!hasText || loading}
              className="aray-chat-send-btn p-2"
              data-ready={hasText && !loading}
              title="Отправить (Enter)"
            >
              <Send className="w-4 h-4"/>
            </button>
          </div>
        </div>

        {/* Bottom label */}
        <div className="text-center pb-2 -mt-0.5">
          <span className="aray-chat-label text-[9px] tracking-wide">
            {pageCtx ? `${pageCtx.icon} ${pageCtx.label} · ` : ""}
            Арай · AI + Голос + Генерация ·{" "}
            <span style={{ color: "hsl(var(--primary)/0.5)" }}>ARAY</span>
          </span>
        </div>
      </div>
    </>
  );
}
