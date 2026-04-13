"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Send, Mic, MicOff, Volume2, VolumeX, RotateCcw,
  ImagePlus, Sparkles, X, Download, Maximize2,
  Globe, Zap, Brain, MessageCircle, ExternalLink,
  MessageSquare, Keyboard,
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

// ─── Page context ───────────────────────────────────────────────────────────
const PAGE_CONTEXT: Record<string, { label: string; icon: string; quick: string[] }> = {
  "/admin":            { label: "Дашборд",    icon: "📊", quick: ["Сводка за сегодня", "Новые заказы", "Выручка за неделю"] },
  "/admin/orders":     { label: "Заказы",     icon: "📦", quick: ["Новые заказы", "Ждут подтверждения", "Заказы за сегодня"] },
  "/admin/products":   { label: "Каталог",    icon: "🪵", quick: ["Что не в наличии?", "Топ продаж", "Актуальные цены"] },
  "/admin/clients":    { label: "Клиенты",    icon: "👥", quick: ["Новые клиенты", "Постоянные покупатели", "Лучший клиент"] },
  "/admin/analytics":  { label: "Аналитика",  icon: "📈", quick: ["Выручка за месяц", "Лучшие товары", "Конверсия"] },
  "/admin/finance":    { label: "Финансы",    icon: "💰", quick: ["Выручка за месяц", "Средний чек", "Прибыль"] },
  "/admin/delivery":   { label: "Доставка",   icon: "🚚", quick: ["Активные доставки", "Задержки", "Маршруты сегодня"] },
  "/admin/staff":      { label: "Команда",    icon: "👤", quick: ["Кто в команде?", "Роли и доступы", "Активность"] },
  "/admin/settings":   { label: "Настройки",  icon: "⚙️", quick: ["SMTP email", "Telegram бот", "Домен"] },
  "/admin/appearance": { label: "Оформление", icon: "🎨", quick: ["Сменить тему", "Палитры", "Логотип"] },
};

function getPageCtx(pathname: string) {
  if (PAGE_CONTEXT[pathname]) return PAGE_CONTEXT[pathname];
  const match = Object.keys(PAGE_CONTEXT)
    .filter(k => k !== "/admin" && pathname.startsWith(k))
    .sort((a, b) => b.length - a.length)[0];
  return match ? PAGE_CONTEXT[match] : null;
}

// ─── Types ──────────────────────────────────────────────────────────────────
type MediaAttachment = { type: "image" | "video"; data: string; prompt?: string };
type IframeData = { url: string; title: string };
type Msg = {
  id: string;
  role: "user" | "assistant";
  text: string;
  streaming?: boolean;
  media?: MediaAttachment[];
  generating?: boolean;
};

// ─── Parse helpers ──────────────────────────────────────────────────────────
function parseActions(raw: string) {
  const idx = raw.indexOf("ARAY_ACTIONS:");
  return { text: idx === -1 ? raw : raw.slice(0, idx).trim() };
}

function parseArayCommands(text: string): { cleanText: string; iframe?: IframeData; navigate?: string } {
  let cleanText = text;
  let iframe: IframeData | undefined;
  let navigate: string | undefined;
  const urlMatch = text.match(/__ARAY_SHOW_URL:(.+?):(.+?)__/);
  if (urlMatch) { iframe = { url: urlMatch[1], title: urlMatch[2] }; cleanText = cleanText.replace(urlMatch[0], "").trim(); }
  const navMatch = text.match(/__ARAY_NAVIGATE:(.+?)__/);
  if (navMatch) { navigate = navMatch[1]; cleanText = cleanText.replace(navMatch[0], "").trim(); }
  return { cleanText, iframe, navigate };
}

// ─── Markdown render ────────────────────────────────────────────────────────
function renderInline(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*\n]+\*\*|\*[^*\n]+\*|`[^`\n]+`)/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) return <strong key={i} className="font-semibold">{p.slice(2, -2)}</strong>;
    if (p.startsWith("*") && p.endsWith("*")) return <em key={i}>{p.slice(1, -1)}</em>;
    if (p.startsWith("`") && p.endsWith("`")) return <code key={i} className="aray-code-inline">{p.slice(1, -1)}</code>;
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
    if (/^---+$/.test(line.trim())) { nodes.push(<hr key={i} className="my-2 border-none" style={{ borderTop: "1px solid hsl(var(--border)/0.3)" }} />); i++; continue; }
    const hm = line.match(/^(#{1,3})\s+(.+)$/);
    if (hm) { nodes.push(<p key={i} className="font-bold mt-2 mb-0.5 text-[13px]" style={{ color: "hsl(var(--primary))" }}>{renderInline(hm[2])}</p>); i++; continue; }
    if (/^[\-\*]\s/.test(line.trim())) {
      const items: string[] = [];
      while (i < lines.length && /^[\-\*]\s/.test(lines[i].trim())) { items.push(lines[i].replace(/^[\-\*]\s/, "").trim()); i++; }
      nodes.push(<ul key={`ul-${i}`} className="space-y-0.5 my-1">{items.map((it, ii) => (<li key={ii} className="flex gap-1.5 items-start"><span className="mt-[6px] shrink-0 w-1.5 h-1.5 rounded-full" style={{ background: "hsl(var(--primary)/0.6)" }}/><span>{renderInline(it)}</span></li>))}</ul>);
      continue;
    }
    if (/^\d+\.\s/.test(line.trim())) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) { items.push(lines[i].replace(/^\d+\.\s/, "").trim()); i++; }
      nodes.push(<ol key={`ol-${i}`} className="space-y-0.5 my-1 list-none">{items.map((it, ii) => (<li key={ii} className="flex gap-2 items-start"><span className="aray-list-number">{ii + 1}</span><span>{renderInline(it)}</span></li>))}</ol>);
      continue;
    }
    nodes.push(<p key={i}>{renderInline(line)}</p>);
    i++;
  }
  return nodes;
}

// ─── TTS — ElevenLabs + browser fallback ────────────────────────────────────
function cleanForSpeech(t: string) {
  return t.replace(/\*\*(.*?)\*\*/g, "$1").replace(/\*(.*?)\*/g, "$1")
    .replace(/[#_`|]/g, " ").replace(/[\uD800-\uDFFF]/g, "").replace(/[\u2600-\u27BF]/g, "")
    .replace(/[\u{1F000}-\u{1FFFF}]/gu, "").replace(/ARAY_ACTIONS:\[[\s\S]*?\]/g, "")
    .replace(/__ARAY_SHOW_URL:.+?:.+?__/g, "").replace(/__ARAY_NAVIGATE:.+?__/g, "")
    .replace(/^---+$/mg, "").replace(/\s{2,}/g, " ").trim();
}

const voicesCache: { list: SpeechSynthesisVoice[] } = { list: [] };
function loadVoices() { if (typeof window !== "undefined" && window.speechSynthesis) { const v = window.speechSynthesis.getVoices(); if (v.length) voicesCache.list = v; } }
function pickBestRuVoice(): SpeechSynthesisVoice | null {
  const voices = voicesCache.list.length ? voicesCache.list : (typeof window !== "undefined" ? window.speechSynthesis?.getVoices() ?? [] : []);
  for (const fn of [
    (v: SpeechSynthesisVoice) => v.lang.startsWith("ru") && v.name.includes("Natural"),
    (v: SpeechSynthesisVoice) => v.lang.startsWith("ru") && v.name.includes("Microsoft"),
    (v: SpeechSynthesisVoice) => v.lang.startsWith("ru") && v.name.includes("Google"),
    (v: SpeechSynthesisVoice) => v.lang.startsWith("ru"),
  ]) { const f = voices.find(fn); if (f) return f; }
  return null;
}

function useTTS() {
  const [speaking, setSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => { if (typeof window !== "undefined" && window.speechSynthesis) { loadVoices(); window.speechSynthesis.onvoiceschanged = loadVoices; } }, []);

  const stop = useCallback(() => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    if (typeof window !== "undefined") { window.speechSynthesis?.cancel(); utterRef.current = null; }
    setSpeaking(false);
  }, []);

  const speak = useCallback(async (text: string): Promise<void> => {
    stop();
    const clean = cleanForSpeech(text);
    if (!clean) return;
    setSpeaking(true);

    // Try ElevenLabs
    try {
      const res = await fetch("/api/ai/tts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: clean }) });
      if (res.ok) {
        const ct = res.headers.get("content-type") || "";
        if (!ct.includes("application/json")) {
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          return new Promise<void>((resolve) => {
            const audio = new Audio(url);
            audioRef.current = audio;
            audio.onended = () => { URL.revokeObjectURL(url); setSpeaking(false); audioRef.current = null; resolve(); };
            audio.onerror = () => { URL.revokeObjectURL(url); setSpeaking(false); audioRef.current = null; resolve(); };
            audio.play().catch(() => { URL.revokeObjectURL(url); setSpeaking(false); audioRef.current = null; resolve(); });
          });
        }
      }
    } catch {}

    // Fallback: browser TTS
    if (typeof window === "undefined" || !window.speechSynthesis) { setSpeaking(false); return; }
    window.speechSynthesis.cancel();
    window.speechSynthesis.resume();
    return new Promise<void>((resolve) => {
      const utter = new SpeechSynthesisUtterance(clean);
      utter.lang = "ru-RU"; utter.rate = 1.05; utter.pitch = 1.0; utter.volume = 1.0;
      const voice = pickBestRuVoice();
      if (voice) utter.voice = voice;
      utter.onend = () => { setSpeaking(false); utterRef.current = null; resolve(); };
      utter.onerror = () => { setSpeaking(false); utterRef.current = null; resolve(); };
      utterRef.current = utter;
      window.speechSynthesis.speak(utter);
    });
  }, [stop]);

  return { speaking, speak, stop };
}

// ─── ARAY Orb (fire sphere — same as site) ──────────────────────────────────
function ArayOrb({ size = 52, state = "idle", id = "ao" }: {
  size?: number;
  state?: "idle" | "listening" | "thinking" | "speaking";
  id?: string;
}) {
  const active = state !== "idle";
  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* Glow ring */}
      {active && (
        <div className="absolute inset-0 rounded-full" style={{
          background: state === "listening"
            ? `radial-gradient(circle, hsl(var(--primary) / 0.5) 0%, transparent 70%)`
            : state === "speaking"
            ? `radial-gradient(circle, rgba(255,160,0,0.4) 0%, transparent 70%)`
            : `radial-gradient(circle, hsl(var(--primary) / 0.25) 0%, transparent 70%)`,
          transform: "scale(2.2)",
          animation: state === "listening" ? "aray-listen-pulse 1s ease-in-out infinite"
            : state === "speaking" ? "aray-speak-glow 1.5s ease-in-out infinite"
            : "aray-pulse-glow 2s ease-in-out infinite",
        }}/>
      )}
      <svg width={size} height={size} viewBox="0 0 100 100" style={{ display: "block", position: "relative", zIndex: 1 }}>
        <defs>
          <radialGradient id={`${id}-base`} cx="34%" cy="28%" r="70%">
            <stop offset="0%" stopColor="#fffbe0"/><stop offset="10%" stopColor="#ffca40"/>
            <stop offset="28%" stopColor="#f07800"/><stop offset="52%" stopColor="#c05000"/>
            <stop offset="75%" stopColor="#6e1c00"/><stop offset="100%" stopColor="#160300"/>
          </radialGradient>
          <radialGradient id={`${id}-dark`} cx="72%" cy="74%" r="52%">
            <stop offset="0%" stopColor="#050000" stopOpacity="0.75"/><stop offset="100%" stopColor="#050000" stopOpacity="0"/>
          </radialGradient>
          <radialGradient id={`${id}-hl`} cx="30%" cy="25%" r="34%">
            <stop offset="0%" stopColor="white" stopOpacity="0.85"/><stop offset="100%" stopColor="white" stopOpacity="0"/>
          </radialGradient>
          <radialGradient id={`${id}-rim`} cx="50%" cy="50%" r="50%">
            <stop offset="76%" stopColor="transparent" stopOpacity="0"/><stop offset="100%" stopColor="#ffcc00" stopOpacity="0.55"/>
          </radialGradient>
          <clipPath id={`${id}-clip`}><circle cx="50" cy="50" r="46"/></clipPath>
        </defs>
        <circle cx="50" cy="50" r="46" fill={`url(#${id}-base)`}/>
        <circle cx="50" cy="50" r="46" fill={`url(#${id}-dark)`}/>
        <circle cx="50" cy="50" r="46" fill={`url(#${id}-rim)`}/>
        <g clipPath={`url(#${id}-clip)`}>
          <ellipse cx="50" cy="50" rx="28" ry="10" fill="white" opacity="0.14">
            <animateTransform attributeName="transform" type="rotate" from="0 50 50" to="360 50 50" dur="9s" repeatCount="indefinite"/>
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

// ─── Wake word detection — always listening for "Арай" ───────────────────────
function useWakeWord(onWake: () => void) {
  const activeRef = useRef(false);
  const recognitionRef = useRef<any>(null);
  const [wakeReady, setWakeReady] = useState(false);

  const startWakeWord = useCallback(() => {
    if (activeRef.current) return;
    const SR = (typeof window !== "undefined") && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
    if (!SR) return;

    const r = new SR();
    r.lang = "ru-RU";
    r.interimResults = true;
    r.continuous = true;
    r.maxAlternatives = 3;

    r.onstart = () => { activeRef.current = true; setWakeReady(true); };
    r.onend = () => {
      activeRef.current = false;
      // Auto-restart wake word listening
      setTimeout(() => { if (!activeRef.current) startWakeWord(); }, 500);
    };
    r.onerror = (e: any) => {
      activeRef.current = false;
      // "not-allowed" means no mic permission — don't retry
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        setWakeReady(false);
        return;
      }
      // Restart after error
      setTimeout(() => { if (!activeRef.current) startWakeWord(); }, 1000);
    };

    r.onresult = (e: any) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const transcript = e.results[i][0]?.transcript?.toLowerCase() || "";
        // Check all alternatives too
        for (let j = 0; j < e.results[i].length; j++) {
          const alt = e.results[i][j]?.transcript?.toLowerCase() || "";
          if (/\bара[йи]\b|\baray\b|\bара[йи]а\b/.test(alt)) {
            // Wake word detected!
            onWake();
            // Stop wake word listening — main recognition takes over
            try { r.stop(); } catch {}
            recognitionRef.current = null;
            activeRef.current = false;
            return;
          }
        }
      }
    };

    try {
      r.start();
      recognitionRef.current = r;
    } catch {
      activeRef.current = false;
    }
  }, [onWake]);

  const stopWakeWord = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
    activeRef.current = false;
  }, []);

  return { startWakeWord, stopWakeWord, wakeReady };
}

// ─── Voice input (command listening after wake/tap) ─────────────────────────
function useVoiceCommand() {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const recognitionRef = useRef<any>(null);
  const resolveRef = useRef<((text: string) => void) | null>(null);

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setSupported(!!SR);
  }, []);

  const listen = useCallback((): Promise<string> => {
    return new Promise((resolve) => {
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SR) { resolve(""); return; }

      // Stop any existing
      if (recognitionRef.current) { try { recognitionRef.current.stop(); } catch {} }

      const r = new SR();
      r.lang = "ru-RU";
      r.interimResults = false;
      r.continuous = false;
      r.maxAlternatives = 1;

      resolveRef.current = resolve;
      r.onstart = () => setListening(true);
      r.onend = () => {
        setListening(false);
        recognitionRef.current = null;
        if (resolveRef.current) { resolveRef.current(""); resolveRef.current = null; }
      };
      r.onerror = () => {
        setListening(false);
        recognitionRef.current = null;
        if (resolveRef.current) { resolveRef.current(""); resolveRef.current = null; }
      };
      r.onresult = (e: any) => {
        const text = e.results[0]?.[0]?.transcript?.trim() || "";
        // Remove wake word from beginning if present
        const cleaned = text.replace(/^ара[йи]\s*/i, "").trim();
        if (resolveRef.current) { resolveRef.current(cleaned || text); resolveRef.current = null; }
      };

      try { r.start(); recognitionRef.current = r; } catch { setListening(false); resolve(""); }
    });
  }, []);

  const stop = useCallback(() => {
    if (recognitionRef.current) { try { recognitionRef.current.stop(); } catch {} recognitionRef.current = null; }
    setListening(false);
    if (resolveRef.current) { resolveRef.current(""); resolveRef.current = null; }
  }, []);

  return { listening, supported, listen, stop };
}

// ─── Voice waveform ─────────────────────────────────────────────────────────
function VoiceWaveform({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-[3px] h-5 ${className}`}>
      {[0,1,2,3,4,5,6].map(i => (
        <motion.div key={i} className="w-[3px] rounded-full"
          style={{ background: "hsl(var(--primary))" }}
          animate={{ height: [3, 16, 5, 20, 8, 14, 3] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.08 }}/>
      ))}
    </div>
  );
}

// ─── Media preview ──────────────────────────────────────────────────────────
function MediaPreview({ media }: { media: MediaAttachment }) {
  const [fullscreen, setFullscreen] = useState(false);
  const src = media.data.startsWith("data:") ? media.data : `data:image/png;base64,${media.data}`;
  return (
    <>
      <div className="group relative rounded-xl overflow-hidden">
        <img src={src} alt={media.prompt || "Generated"} className="max-w-full rounded-xl cursor-pointer" onClick={() => setFullscreen(true)} />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
          <div className="flex gap-2">
            <button onClick={() => setFullscreen(true)} className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm hover:bg-white/30"><Maximize2 className="w-3.5 h-3.5 text-white"/></button>
            <a href={src} download={`aray-${Date.now()}.png`} className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm hover:bg-white/30"><Download className="w-3.5 h-3.5 text-white"/></a>
          </div>
        </div>
      </div>
      <AnimatePresence>
        {fullscreen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setFullscreen(false)}>
            <motion.img initial={{ scale: 0.8 }} animate={{ scale: 1 }} exit={{ scale: 0.8 }}
              src={src} className="max-w-full max-h-full rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()}/>
            <button onClick={() => setFullscreen(false)} className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white"><X className="w-5 h-5"/></button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Message bubble ─────────────────────────────────────────────────────────
function Bubble({ msg, classic }: { msg: Msg; classic: boolean }) {
  const isUser = msg.role === "user";
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className={`flex gap-2.5 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      {!isUser && <div className="shrink-0 mt-1"><ArayOrb size={24} state={msg.streaming ? "thinking" : "idle"} id={`bo-${msg.id}`}/></div>}
      <div className="flex flex-col gap-1 max-w-[82%]">
        <div className={`px-4 py-3 text-[13.5px] leading-relaxed rounded-2xl ${isUser ? "aray-chat-bubble-user" : "aray-chat-bubble-assistant"}`}>
          {msg.media?.map((m, idx) => <div key={idx} className="mb-2"><MediaPreview media={m}/></div>)}
          {msg.generating && (
            <div className="flex items-center gap-2 px-2 py-2"><Sparkles className="w-4 h-4 text-amber-400 animate-pulse"/><span className="text-[12px]">Генерирую...</span></div>
          )}
          {msg.text ? <div className="space-y-1">{renderMarkdown(msg.text)}</div>
            : !isUser && msg.streaming ? <span className="inline-flex gap-1.5 items-center py-0.5">
              {[0,1,2].map(i => <motion.span key={i} className="w-2 h-2 rounded-full" style={{ background: "hsl(var(--primary))" }}
                animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }} transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}/>)}
            </span> : null}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Iframe viewer ──────────────────────────────────────────────────────────
function IframeViewer({ data, onClose }: { data: IframeData; onClose: () => void }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
        className="w-full max-w-5xl h-[85vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col"
        style={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border)/0.3)" }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-5 py-3 border-b" style={{ borderColor: "hsl(var(--border)/0.2)" }}>
          <Globe className="w-4 h-4 text-primary"/><span className="text-sm font-medium flex-1 truncate">{data.title}</span>
          <a href={data.url} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg hover:bg-primary/10"><ExternalLink className="w-4 h-4 text-primary"/></a>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-destructive/10"><X className="w-4 h-4"/></button>
        </div>
        <iframe src={data.url} className="flex-1 w-full border-none" sandbox="allow-scripts allow-same-origin allow-forms allow-popups" title={data.title}/>
      </motion.div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── MAIN: Voice-first AI Assistant ─────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
export function AdminAray({ staffName = "Коллега", userRole }: {
  staffName?: string; userRole?: string;
}) {
  const classic = useClassicMode();
  const pathname = usePathname();
  const router = useRouter();
  const pageCtx = getPageCtx(pathname);

  // ─── State ─────────────────────────────────────────────────────────────────
  type OrbState = "idle" | "listening" | "thinking" | "speaking";
  const [orbState, setOrbState] = useState<OrbState>("idle");
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [iframeData, setIframeData] = useState<IframeData | null>(null);
  const [statusText, setStatusText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const busyRef = useRef(false);

  const { speaking, speak, stop: stopTTS } = useTTS();
  const { listening, supported: micSupported, listen: listenCommand, stop: stopListening } = useVoiceCommand();

  // Sync speaking state to orb
  useEffect(() => {
    if (speaking) setOrbState("speaking");
    else if (orbState === "speaking") setOrbState("idle");
  }, [speaking, orbState]);

  useEffect(() => {
    if (listening) setOrbState("listening");
    else if (orbState === "listening" && !busyRef.current) setOrbState("idle");
  }, [listening, orbState]);

  // Auto-scroll chat
  useEffect(() => {
    if (showChat) setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 60);
  }, [messages, showChat]);

  // ─── Core: send message and get voice response ────────────────────────────
  const processMessage = useCallback(async (text: string) => {
    if (!text.trim() || busyRef.current) return;
    busyRef.current = true;

    const userMsg: Msg = { id: Date.now().toString(), role: "user", text: text.trim() };
    const aid = (Date.now() + 1).toString();

    // Detect image generation
    const imgPatterns = /(?:сгенерируй|создай|нарисуй|сделай)\s+(?:изображение|картинку|фото|баннер|картину|иллюстрацию|лого)/i;
    if (imgPatterns.test(text)) {
      setMessages(prev => [...prev, userMsg, { id: aid, role: "assistant", text: "", generating: true }]);
      setOrbState("thinking");
      setStatusText("Генерирую...");
      try {
        const res = await fetch("/api/ai/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: text, type: "image" }) });
        const data = await res.json();
        if (data.success && data.data) {
          setMessages(prev => prev.map(m => m.id === aid ? { ...m, text: "Готово!", generating: false, media: [{ type: "image" as const, data: data.data, prompt: text }] } : m));
          setShowChat(true);
          await speak("Готово! Вот что получилось.");
        } else {
          const errText = data.error || "Не удалось сгенерировать";
          setMessages(prev => prev.map(m => m.id === aid ? { ...m, text: errText, generating: false } : m));
          await speak(errText);
        }
      } catch {
        setMessages(prev => prev.map(m => m.id === aid ? { ...m, text: "Нет связи", generating: false } : m));
        await speak("Нет связи с сервером");
      }
      busyRef.current = false;
      setStatusText("");
      return;
    }

    // Regular chat
    const allMsgs = [...messages, userMsg];
    setMessages(prev => [...prev, userMsg]);
    setOrbState("thinking");
    setStatusText("Думаю...");

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
      const clean = isErr ? (raw.match(/__ARAY_ERR__(.+)$/)?.[1] || "Что-то пошло не так") : raw.replace(/\n__ARAY_META__[\s\S]*$/, "").trim();
      const { text: actionClean } = parseActions(clean);
      const { cleanText: final, iframe, navigate } = parseArayCommands(actionClean);

      setMessages(prev => prev.map(m => m.id === aid ? { ...m, text: final, streaming: false } : m));
      setStatusText("");

      // Handle commands
      if (iframe) { setIframeData(iframe); setShowChat(true); }
      if (navigate) router.push(navigate);

      // Speak the response
      await speak(final);
    } catch {
      const errText = "Ошибка связи. Попробуй ещё раз.";
      setMessages(prev => {
        const has = prev.some(m => m.id === aid);
        return has
          ? prev.map(m => m.id === aid ? { ...m, text: errText, streaming: false } : m)
          : [...prev, { id: aid, role: "assistant", text: errText }];
      });
      setStatusText("");
      await speak(errText);
    }
    busyRef.current = false;
  }, [messages, pathname, speak, router]);

  // ─── Voice interaction flow ───────────────────────────────────────────────
  const startVoiceInteraction = useCallback(async () => {
    if (busyRef.current) return;
    stopTTS(); // Stop any current speech

    setOrbState("listening");
    setStatusText("Слушаю...");

    const text = await listenCommand();
    if (text) {
      setStatusText("");
      await processMessage(text);
    } else {
      setOrbState("idle");
      setStatusText("");
    }
  }, [listenCommand, processMessage, stopTTS]);

  // ─── Wake word "Арай" ─────────────────────────────────────────────────────
  const { startWakeWord, stopWakeWord, wakeReady } = useWakeWord(
    useCallback(() => {
      // Wake word detected — start listening for command
      startVoiceInteraction();
    }, [startVoiceInteraction])
  );

  // Start wake word on mount (if mic is available)
  useEffect(() => {
    // Small delay to let page render
    const timer = setTimeout(() => {
      if (micSupported && !busyRef.current) startWakeWord();
    }, 2000);
    return () => { clearTimeout(timer); stopWakeWord(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [micSupported]);

  // Restart wake word after interaction ends
  useEffect(() => {
    if (orbState === "idle" && !busyRef.current && micSupported) {
      const timer = setTimeout(startWakeWord, 1000);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orbState, micSupported]);

  // ─── Welcome on first open ────────────────────────────────────────────────
  useEffect(() => {
    if (showChat && messages.length === 0) {
      const h = new Date().getHours();
      const gr = h < 6 ? "Не спишь?" : h < 12 ? "Доброе утро" : h < 17 ? "Привет" : h < 22 ? "Добрый вечер" : "Поздновато";
      const name = staffName !== "Коллега" ? `, ${staffName}` : "";
      setMessages([{ id: "w", role: "assistant", text: `${gr}${name}! Чем помочь?` }]);
    }
  }, [showChat, messages.length, staffName]);

  // Open via events
  useEffect(() => {
    const h = () => setShowChat(true);
    window.addEventListener("aray:open", h);
    return () => window.removeEventListener("aray:open", h);
  }, []);

  useEffect(() => {
    const h = (e: Event) => {
      const { text } = (e as CustomEvent<{ text: string }>).detail || {};
      if (text) { processMessage(text); }
    };
    window.addEventListener("aray:fill", h);
    return () => window.removeEventListener("aray:fill", h);
  }, [processMessage]);

  // ─── Text chat send ───────────────────────────────────────────────────────
  const sendText = useCallback(() => {
    const text = input.trim();
    if (!text) return;
    setInput("");
    processMessage(text);
  }, [input, processMessage]);

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendText(); }
  };

  // ─── Orb tap handler ──────────────────────────────────────────────────────
  const handleOrbTap = useCallback(() => {
    if (orbState === "speaking") {
      // Tap while speaking → stop
      stopTTS();
      setOrbState("idle");
      return;
    }
    if (orbState === "listening") {
      // Tap while listening → cancel
      stopListening();
      setOrbState("idle");
      setStatusText("");
      return;
    }
    // Idle → start voice
    stopWakeWord();
    startVoiceInteraction();
  }, [orbState, stopTTS, stopListening, stopWakeWord, startVoiceInteraction]);

  const hasText = input.trim().length > 0;

  return (
    <>
      {/* ══ FLOATING ORB ═════════════════════════════════════════════════════════ */}
      <div className="fixed z-[30] right-5 bottom-5 flex flex-col items-center gap-2">
        {/* Status text above orb */}
        <AnimatePresence>
          {(statusText || orbState !== "idle") && (
            <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }}
              className="flex flex-col items-center gap-1">
              {orbState === "listening" && <VoiceWaveform />}
              {statusText && (
                <span className="text-[11px] font-medium px-3 py-1 rounded-full whitespace-nowrap"
                  style={{
                    background: orbState === "listening" ? "hsl(var(--primary)/0.2)" : "rgba(0,0,0,0.6)",
                    color: orbState === "listening" ? "hsl(var(--primary))" : "white",
                    backdropFilter: "blur(12px)",
                  }}>
                  {statusText}
                </span>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Chat toggle button */}
        <motion.button
          onClick={() => setShowChat(v => !v)}
          className="p-2 rounded-full transition-all"
          style={{
            background: showChat ? "hsl(var(--primary)/0.2)" : "rgba(0,0,0,0.3)",
            color: showChat ? "hsl(var(--primary))" : "rgba(255,255,255,0.5)",
            backdropFilter: "blur(8px)",
          }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          title={showChat ? "Скрыть чат" : "Текстовый чат"}
        >
          {showChat ? <X className="w-4 h-4" /> : <Keyboard className="w-4 h-4" />}
        </motion.button>

        {/* Main orb */}
        <motion.button
          onClick={handleOrbTap}
          className="relative group"
          style={{ WebkitTapHighlightColor: "transparent" }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.92 }}
          title="Нажми чтобы говорить, или скажи 'Арай'"
        >
          {/* Hover glow */}
          <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: "radial-gradient(circle, hsl(var(--primary) / 0.2) 0%, transparent 70%)", transform: "scale(2.5)" }}/>

          {/* Listening pulse ring */}
          {orbState === "listening" && (
            <motion.div className="absolute -inset-2 rounded-full border-2" style={{ borderColor: "hsl(var(--primary))" }}
              animate={{ scale: [1, 1.3, 1], opacity: [0.8, 0, 0.8] }} transition={{ duration: 1.5, repeat: Infinity }}/>
          )}

          <ArayOrb size={56} state={orbState} id="main-orb"/>

          {/* Wake word ready indicator */}
          {wakeReady && orbState === "idle" && (
            <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-black animate-pulse" title="Слушаю 'Арай...'"/>
          )}
        </motion.button>
      </div>

      {/* ══ TEXT CHAT POPUP ═══════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showChat && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className="fixed z-[29] right-5 bottom-[140px] flex flex-col"
            style={{
              width: "min(400px, calc(100vw - 40px))",
              height: "min(520px, calc(100vh - 200px))",
              borderRadius: "24px",
              overflow: "hidden",
              boxShadow: "0 24px 80px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.06)",
              background: classic ? "hsl(var(--background))" : "linear-gradient(180deg, rgba(10,10,18,0.97), rgba(6,6,14,0.99))",
              border: classic ? "1px solid hsl(var(--border))" : "1px solid rgba(255,255,255,0.08)",
            }}
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 shrink-0"
              style={{ borderBottom: classic ? "1px solid hsl(var(--border))" : "1px solid rgba(255,255,255,0.06)", background: classic ? "hsl(var(--muted)/0.3)" : "rgba(255,255,255,0.02)" }}>
              <ArayOrb size={28} state={orbState} id="chat-orb"/>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-bold" style={{ color: classic ? "hsl(var(--foreground))" : "white" }}>Арай</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"/>
                  {pageCtx && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full"
                      style={{ background: classic ? "hsl(var(--primary)/0.1)" : "rgba(255,255,255,0.06)", color: classic ? "hsl(var(--primary))" : "rgba(255,255,255,0.5)" }}>
                      {pageCtx.icon} {pageCtx.label}
                    </span>
                  )}
                </div>
              </div>
              <button onClick={() => setMessages([])} className="p-1.5 rounded-xl" style={{ color: classic ? "hsl(var(--muted-foreground))" : "rgba(255,255,255,0.4)" }} title="Новый чат">
                <RotateCcw className="w-3.5 h-3.5"/>
              </button>
              <button onClick={() => setShowChat(false)} className="p-1.5 rounded-xl" style={{ color: classic ? "hsl(var(--muted-foreground))" : "rgba(255,255,255,0.4)" }}>
                <X className="w-3.5 h-3.5"/>
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3"
              style={{ color: classic ? "hsl(var(--foreground))" : "rgba(255,255,255,0.88)" }}>
              {messages.map(msg => <Bubble key={msg.id} msg={msg} classic={classic}/>)}
              <div ref={bottomRef}/>
            </div>

            {/* Input */}
            <div className="shrink-0 px-3 pb-3 pt-2" style={{ borderTop: classic ? "1px solid hsl(var(--border))" : "1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex items-end gap-2">
                <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey}
                  placeholder="Напиши Араю..." rows={1}
                  className="flex-1 resize-none text-[13px] leading-relaxed outline-none px-3 py-2 rounded-xl"
                  style={{
                    maxHeight: 80, fontFamily: "inherit",
                    background: classic ? "hsl(var(--muted))" : "rgba(255,255,255,0.06)",
                    color: classic ? "hsl(var(--foreground))" : "white",
                    border: classic ? "1px solid hsl(var(--border))" : "1px solid rgba(255,255,255,0.08)",
                  }}
                  onInput={e => { const t = e.currentTarget; t.style.height = "auto"; t.style.height = Math.min(t.scrollHeight, 80) + "px"; }}
                />
                <button onClick={sendText} disabled={!hasText || busyRef.current}
                  className="p-2 rounded-xl transition-all shrink-0"
                  style={{
                    background: hasText ? "hsl(var(--primary))" : "transparent",
                    color: hasText ? "white" : (classic ? "hsl(var(--muted-foreground))" : "rgba(255,255,255,0.2)"),
                  }}>
                  <Send className="w-4 h-4"/>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══ IFRAME VIEWER ════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {iframeData && <IframeViewer data={iframeData} onClose={() => setIframeData(null)}/>}
      </AnimatePresence>

      {/* ══ CSS Animations ═══════════════════════════════════════════════════════ */}
      <style jsx global>{`
        @keyframes aray-listen-pulse {
          0%, 100% { transform: scale(2.2); opacity: 0.5; }
          50% { transform: scale(2.6); opacity: 0.8; }
        }
        @keyframes aray-speak-glow {
          0%, 100% { transform: scale(2.0); opacity: 0.3; }
          50% { transform: scale(2.4); opacity: 0.6; }
        }
        @keyframes aray-pulse-glow {
          0%, 100% { transform: scale(2.0); opacity: 0.2; }
          50% { transform: scale(2.3); opacity: 0.4; }
        }
      `}</style>
    </>
  );
}
