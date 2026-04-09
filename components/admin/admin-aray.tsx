"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Send, Mic, MicOff, Volume2, VolumeX, RotateCcw, ChevronDown, ArrowRight, ExternalLink, History, X, Clock } from "lucide-react";
import { ArayOrb } from "@/components/ui/aray-orb";

// ─── Classic mode ──────────────────────────────────────────────────────────────
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

// ─── Контекст страницы — умные чипсы под каждый раздел ──────────────────────
const PAGE_CONTEXT: Record<string, { label: string; icon: string; quick: string[] }> = {
  "/admin":            { label: "Дашборд",   icon: "📊", quick: ["Сводка за сегодня", "Новые заказы", "Выручка за неделю", "Что срочно сделать?"] },
  "/admin/orders":     { label: "Заказы",    icon: "📦", quick: ["Новые заказы", "Ждут подтверждения", "Заказы за сегодня", "Проблемные заказы"] },
  "/admin/products":   { label: "Каталог",   icon: "🪵", quick: ["Что не в наличии?", "Топ продаж", "Как добавить товар?", "Актуальные цены"] },
  "/admin/clients":    { label: "Клиенты",   icon: "👥", quick: ["Новые клиенты", "Постоянные покупатели", "Кто давно не покупал?", "Лучший клиент"] },
  "/admin/analytics":  { label: "Аналитика", icon: "📈", quick: ["Выручка за месяц", "Лучшие товары", "Динамика продаж", "Конверсия"] },
  "/admin/finance":    { label: "Финансы",   icon: "💰", quick: ["Выручка за месяц", "Средний чек", "Сравни с прошлым месяцем", "Прибыль"] },
  "/admin/inventory":  { label: "Склад",     icon: "🏭", quick: ["Что заканчивается?", "Остатки по товарам", "Что пополнить срочно?", "Склад по категориям"] },
  "/admin/crm":        { label: "CRM",       icon: "🎯", quick: ["Новые лиды", "Конверсия лидов", "Горячие клиенты", "Что в работе?"] },
  "/admin/tasks":      { label: "Задачи",    icon: "✅", quick: ["Мои задачи", "Просроченные задачи", "Создай задачу", "Что сделано сегодня?"] },
  "/admin/delivery":   { label: "Доставка",  icon: "🚚", quick: ["Активные доставки", "Задержки", "Маршруты сегодня", "Доставлено за неделю"] },
  "/admin/staff":      { label: "Команда",   icon: "👤", quick: ["Кто в команде?", "Добавить сотрудника", "Роли и доступы", "Активность команды"] },
  "/admin/settings":   { label: "Настройки", icon: "⚙️", quick: ["Как настроить сайт?", "SMTP email", "Telegram бот", "Домен и SSL"] },
};
const DEFAULT_QUICK = ["Сводка за сегодня", "Новые заказы", "Список товаров", "Что срочно?"];

function getPageCtx(pathname: string) {
  // Точное совпадение сначала
  if (PAGE_CONTEXT[pathname]) return PAGE_CONTEXT[pathname];
  // Потом по началу пути
  const match = Object.keys(PAGE_CONTEXT)
    .filter(k => k !== "/admin" && pathname.startsWith(k))
    .sort((a, b) => b.length - a.length)[0];
  return match ? PAGE_CONTEXT[match] : null;
}

// ─── Типы ─────────────────────────────────────────────────────────────────────
type Msg = { id: string; role: "user" | "assistant"; text: string; streaming?: boolean };
type AraySession = { id: string; date: number; title: string; messages: Msg[] };

// ─── История разговоров ────────────────────────────────────────────────────────
const SESSIONS_KEY = "aray-sessions";
const MAX_SESSIONS = 30;

function loadSessions(): AraySession[] {
  try { return JSON.parse(localStorage.getItem(SESSIONS_KEY) || "[]"); } catch { return []; }
}
function saveSessions(s: AraySession[]) {
  try { localStorage.setItem(SESSIONS_KEY, JSON.stringify(s.slice(0, MAX_SESSIONS))); } catch {}
}
function upsertSession(sid: string, msgs: Msg[]) {
  const userMsgs = msgs.filter(m => m.role === "user");
  if (userMsgs.length === 0) return;
  const title = userMsgs[0].text.slice(0, 70);
  const all = loadSessions().filter(s => s.id !== sid);
  saveSessions([{ id: sid, date: Date.now(), title, messages: msgs }, ...all]);
}
function formatSessionDate(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();
  const time = d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  if (isToday) return `Сегодня, ${time}`;
  if (isYesterday) return `Вчера, ${time}`;
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" }) + `, ${time}`;
}

type ArayAction = { label: string; href?: string; question?: string };

function parseActions(raw: string): { text: string; actions: ArayAction[] } {
  // Ищем блок [[ACTION:label|href]] или [[QUESTION:label|text]]
  const actions: ArayAction[] = [];
  const text = raw
    .replace(/\[\[ACTION:([^\]|]+)\|([^\]]+)\]\]/g, (_, label, href) => {
      actions.push({ label: label.trim(), href: href.trim() });
      return "";
    })
    .replace(/\[\[QUESTION:([^\]|]+)\|([^\]]+)\]\]/g, (_, label, question) => {
      actions.push({ label: label.trim(), question: question.trim() });
      return "";
    })
    .replace(/ARAY_ACTIONS:[\s\S]*$/, "")
    .trim();
  return { text, actions };
}

// ─── Markdown рендер (inline) ─────────────────────────────────────────────────
function renderInline(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*\n]+\*\*|\*[^*\n]+\*|`[^`\n]+`)/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**"))
      return <strong key={i} className="font-semibold">{p.slice(2, -2)}</strong>;
    if (p.startsWith("*") && p.endsWith("*"))
      return <em key={i}>{p.slice(1, -1)}</em>;
    if (p.startsWith("`") && p.endsWith("`"))
      return (
        <code key={i} className="px-1.5 py-0.5 rounded-md text-[11.5px] font-mono"
          style={{ background: "hsl(var(--primary)/0.12)", color: "hsl(var(--primary))" }}>
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

    // --- разделитель
    if (/^---+$/.test(line.trim())) {
      nodes.push(<hr key={i} className="my-1.5 border-none" style={{ borderTop: "1px solid hsl(var(--border)/0.4)" }} />);
      i++; continue;
    }

    // ### заголовок
    const hm = line.match(/^(#{1,3})\s+(.+)$/);
    if (hm) {
      nodes.push(
        <p key={i} className="font-bold mt-2 mb-0.5 text-[13px]" style={{ color: "hsl(var(--primary))" }}>
          {renderInline(hm[2])}
        </p>
      );
      i++; continue;
    }

    // Список - item
    if (/^[\-\*]\s/.test(line.trim())) {
      const items: string[] = [];
      while (i < lines.length && /^[\-\*]\s/.test(lines[i].trim())) {
        items.push(lines[i].replace(/^[\-\*]\s/, "").trim()); i++;
      }
      nodes.push(
        <ul key={`ul-${i}`} className="space-y-0.5 my-1">
          {items.map((it, ii) => (
            <li key={ii} className="flex gap-1.5 items-start">
              <span className="mt-[6px] shrink-0 w-1 h-1 rounded-full" style={{ background: "hsl(var(--primary)/0.7)" }}/>
              <span>{renderInline(it)}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Нумерованный список
    if (/^\d+\.\s/.test(line.trim())) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
        items.push(lines[i].replace(/^\d+\.\s/, "").trim()); i++;
      }
      nodes.push(
        <ol key={`ol-${i}`} className="space-y-0.5 my-1 list-none">
          {items.map((it, ii) => (
            <li key={ii} className="flex gap-2 items-start">
              <span className="shrink-0 w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center mt-0.5"
                style={{ background: "hsl(var(--primary)/0.15)", color: "hsl(var(--primary))" }}>
                {ii + 1}
              </span>
              <span>{renderInline(it)}</span>
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // Markdown таблица |...|...|
    if (line.trim().startsWith("|")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        tableLines.push(lines[i]);
        i++;
      }
      const parseRow = (row: string) =>
        row.split("|").slice(1, -1).map(cell => cell.trim());
      const headers = parseRow(tableLines[0]);
      const sepIdx = tableLines.findIndex(l => /^\|[\s\-:|]+\|$/.test(l.trim()));
      const dataRows = tableLines.slice(sepIdx >= 0 ? sepIdx + 1 : 1).map(parseRow);
      nodes.push(
        <div key={`tbl-${i}`} className="my-2 overflow-x-auto rounded-xl border"
          style={{ borderColor: "hsl(var(--border)/0.5)" }}>
          <table className="w-full text-[12px]">
            <thead>
              <tr style={{ background: "hsl(var(--primary)/0.08)", borderBottom: "1px solid hsl(var(--border)/0.5)" }}>
                {headers.map((h, hi) => (
                  <th key={hi} className="px-3 py-2 text-left font-semibold"
                    style={{ color: "hsl(var(--primary))" }}>{renderInline(h)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dataRows.filter(r => r.some(c => c)).map((row, ri) => (
                <tr key={ri} style={{ borderTop: "1px solid hsl(var(--border)/0.25)" }}>
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

// ─── Голос ────────────────────────────────────────────────────────────────────
function useVoice(onSend: (t: string) => void) {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");   // текст в процессе распознавания
  const [supported, setSupported] = useState(false);
  const ref = useRef<any>(null);

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setSupported(!!SR);
  }, []);

  const start = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    if (ref.current) { try { ref.current.abort(); } catch {} ref.current = null; }
    const r = new SR();
    r.lang = "ru-RU";
    r.interimResults = true;   // показывать в процессе
    r.continuous = false;
    r.maxAlternatives = 1;
    r.onstart = () => { setListening(true); setInterim(""); };
    r.onend = () => { setListening(false); setInterim(""); ref.current = null; };
    r.onerror = (e: any) => {
      // Не показываем ошибку no-speech — это нормально
      if (e.error !== "no-speech") console.warn("[Mic]", e.error);
      setListening(false); setInterim(""); ref.current = null;
    };
    r.onresult = (e: any) => {
      let final = "";
      let inter = "";
      for (let i = 0; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) final += res[0].transcript;
        else inter += res[0].transcript;
      }
      setInterim(inter);
      if (final.trim()) {
        setInterim("");
        // Передаём текст НАПРЯМУЮ в send — без промежуточного state
        onSend(final.trim());
      }
    };
    try { r.start(); ref.current = r; } catch (err) {
      console.warn("[Mic start]", err);
      setListening(false);
    }
  }, [onSend]);

  const stop = useCallback(() => {
    if (ref.current) { try { ref.current.stop(); } catch {} ref.current = null; }
    setListening(false); setInterim("");
  }, []);

  return { listening, interim, supported, start, stop };
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
    .replace(/[\uD800-\uDFFF]/g, "")   // surrogate pairs (emoji)
    .replace(/[\u2600-\u27BF]/g, "")   // misc symbols
    .replace(/[\u{1F000}-\u{1FFFF}]/gu, "") // emoji (es2018+)
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
    // Стоп ElevenLabs аудио
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    // Стоп браузерный TTS
    if (typeof window !== "undefined") {
      window.speechSynthesis?.cancel();
      utterRef.current = null;
    }
    setSpeaking(null);
    speakingRef.current = null;
  }, []);

  const speak = useCallback(async (text: string, id: string) => {
    // Повторный клик — остановить
    if (speakingRef.current === id) { stopAll(); return; }
    stopAll();

    const clean = cleanForSpeech(text);
    if (!clean) return;

    setSpeaking(id);
    speakingRef.current = id;

    // ── Пробуем ElevenLabs ──────────────────────────────────────────────────
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
        audio.onended = () => {
          URL.revokeObjectURL(url);
          if (speakingRef.current === id) { setSpeaking(null); speakingRef.current = null; }
          audioRef.current = null;
        };
        audio.onerror = () => {
          URL.revokeObjectURL(url);
          if (speakingRef.current === id) { setSpeaking(null); speakingRef.current = null; }
          audioRef.current = null;
        };
        audio.play().catch(() => {
          URL.revokeObjectURL(url);
          audioRef.current = null;
          if (speakingRef.current === id) { setSpeaking(null); speakingRef.current = null; }
        });
        return; // ElevenLabs работает — выходим
      }
    } catch {
      // ElevenLabs недоступен — падаем на браузерный TTS
    }

    // ── Fallback: браузерный TTS ────────────────────────────────────────────
    if (typeof window === "undefined" || !window.speechSynthesis) {
      setSpeaking(null); speakingRef.current = null; return;
    }
    window.speechSynthesis.cancel();
    window.speechSynthesis.resume(); // Chrome fix

    const utter = new SpeechSynthesisUtterance(clean);
    utter.lang = "ru-RU"; utter.rate = 1.05; utter.pitch = 1.0; utter.volume = 1.0;
    const voice = pickBestRuVoice();
    if (voice) utter.voice = voice;
    else setTimeout(() => { loadVoices(); const v2 = pickBestRuVoice(); if (v2) utter.voice = v2; }, 300);
    utter.onend = () => {
      if (speakingRef.current === id) { setSpeaking(null); speakingRef.current = null; }
      utterRef.current = null;
    };
    utter.onerror = (e) => {
      if ((e as any).error === "interrupted") return;
      if (speakingRef.current === id) { setSpeaking(null); speakingRef.current = null; }
      utterRef.current = null;
    };
    utterRef.current = utter;
    window.speechSynthesis.speak(utter);
  }, [stopAll]);

  return { speaking, speak, stop: stopAll, supported: true };
}

// ArayOrb — импортирован из @/components/ui/aray-orb (единый шар для всего сайта)

// ─── Пузырь сообщения ─────────────────────────────────────────────────────────
function Bubble({ msg, onSpeak, speaking }: {
  msg: Msg; onSpeak?: (t: string, id: string) => void; speaking?: string | null;
}) {
  const isUser = msg.role === "user";
  const isSpeaking = speaking === msg.id;
  return (
    <div className={`flex gap-2.5 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      {!isUser && <div className="shrink-0 mt-1"><ArayOrb size={22}/></div>}
      <div className="flex flex-col gap-1 max-w-[82%]">
        <div className={`px-4 py-2.5 text-[13.5px] leading-relaxed ${isUser ? "aray-chat-bubble-user" : "aray-chat-bubble-assistant"}`}>
          {msg.text === "__loading__"
            ? <span className="inline-flex items-center gap-2 py-0.5" style={{ color: "hsl(var(--primary)/0.75)" }}>
                <span className="inline-flex gap-1">
                  {[0,1,2].map(i => <span key={i} className="aray-typing-dot animate-bounce" style={{ animationDelay: `${i*160}ms`, width: 5, height: 5 }}/>)}
                </span>
                <span className="text-[11px] font-medium">Загружаю данные...</span>
              </span>
            : msg.text
            ? <div className="space-y-1">{renderMarkdown(msg.text)}</div>
            : !isUser && msg.streaming
            ? <span className="inline-flex items-center gap-2 py-0.5" style={{ color: "hsl(var(--primary)/0.7)" }}>
                <span className="inline-flex gap-1">
                  {[0,1,2].map(i => <span key={i} className="aray-typing-dot animate-bounce" style={{ animationDelay: `${i*160}ms`, width: 5, height: 5 }}/>)}
                </span>
                <span className="text-[11px] font-medium opacity-70">Думаю...</span>
              </span>
            : null}
          {msg.streaming && msg.text && msg.text !== "__loading__" && <span className="aray-stream-cursor"/>}
        </div>
        {!isUser && !msg.streaming && msg.text && onSpeak && (
          <button onClick={() => onSpeak(msg.text, msg.id)}
            className={`aray-speak-btn self-start px-2 py-0.5 text-[10px] ${isSpeaking ? "aray-speak-btn-active" : ""}`}>
            {isSpeaking ? <VolumeX className="w-3 h-3"/> : <Volume2 className="w-3 h-3"/>}
            {isSpeaking ? "стоп" : "озвучить"}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Главный компонент ────────────────────────────────────────────────────────
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
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const sendRef = useRef<(text?: string) => Promise<void>>();
  const { speaking, speak, stop: stopVoice } = useTTS();

  // Загрузка autoVoice из localStorage
  useEffect(() => {
    setAutoVoice(localStorage.getItem("aray-auto-voice") === "1");
  }, []);

  const addInput = useCallback((t: string) => { setInput(t); if (!expanded) setExpanded(true); }, [expanded]);
  const { listening, interim: micInterim, supported: micSupported, start: startMic, stop: stopMic } = useVoice(
    useCallback((t: string) => { sendRef.current?.(t); }, [])
  );

  // ─── История разговоров ───────────────────────────────────────────────────
  const [showHistory, setShowHistory] = useState(false);
  const [sessions, setSessions] = useState<AraySession[]>([]);
  const sessionIdRef = useRef<string>(Date.now().toString());

  // Auto-озвучка: когда autoVoice включён — озвучивать каждый новый ответ Арая
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

  // Приветствие — конкретное по разделу
  useEffect(() => {
    if (expanded && messages.length === 0) {
      const h = new Date().getHours();
      const gr = h < 12 ? "Доброе утро" : h < 17 ? "Привет" : "Добрый вечер";
      const pageNote = pageCtx
        ? ` Ты в **${pageCtx.label}**. ${pageCtx.quick[0]} — хочешь покажу прямо сейчас?`
        : " Что нужно — спрашивай, всё сделаю.";
      setMessages([{ id: "w", role: "assistant", text: `${gr}, ${staffName}!${pageNote}` }]);
    }
  }, [expanded, messages.length, staffName, pageCtx]);

  // Автоскролл
  useEffect(() => {
    if (expanded) setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 60);
  }, [messages, expanded]);

  // Сохранение текущей сессии при каждом новом сообщении
  useEffect(() => {
    upsertSession(sessionIdRef.current, messages);
  }, [messages]);

  // Открытие по событию
  useEffect(() => {
    const h = () => { setExpanded(true); setTimeout(() => inputRef.current?.focus(), 200); };
    window.addEventListener("aray:open", h);
    return () => window.removeEventListener("aray:open", h);
  }, []);

  // Заполнить инпут и открыть по событию (для кнопок "Спросить Арая")
  useEffect(() => {
    const h = (e: Event) => {
      const { text } = (e as CustomEvent<{ text: string }>).detail || {};
      if (text) {
        addInput(text);
        setExpanded(true);
        setTimeout(() => inputRef.current?.focus(), 150);
      }
    };
    window.addEventListener("aray:fill", h);
    return () => window.removeEventListener("aray:fill", h);
  }, [addInput]);

  const send = useCallback(async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput("");
    if (!expanded) setExpanded(true);

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
        // Убираем технические маркеры из отображения
        const disp = raw
          .replace(/__ARAY_TOOL__/g, "")
          .replace(/\n__ARAY_META__[\s\S]*$/, "")
          .replace(/__ARAY_ERR__[\s\S]*$/, "")
          .trim();
        // Показываем "Загружаю..." если инструмент запущен, но текст ещё не пришёл
        const isLoadingTool = raw.includes("__ARAY_TOOL__") && disp.length === 0;
        setMessages(prev => prev.map(m => m.id === aid
          ? { ...m, text: isLoadingTool ? "__loading__" : disp }
          : m
        ));
      }
      const isErr = raw.includes("__ARAY_ERR__");
      const clean = isErr
        ? (raw.match(/__ARAY_ERR__(.+)$/)?.[1] || "Что-то пошло не так 🙏")
        : raw.replace(/__ARAY_TOOL__/g, "").replace(/\n__ARAY_META__[\s\S]*$/, "").trim();
      const { text: final } = parseActions(clean);
      setMessages(prev => prev.map(m => m.id === aid ? { ...m, text: final, streaming: false } : m));
    } catch {
      setMessages(prev => {
        const has = prev.some(m => m.id === aid);
        return has
          ? prev.map(m => m.id === aid ? { ...m, text: "Нет связи 🙏", streaming: false } : m)
          : [...prev, { id: aid, role: "assistant", text: "Нет связи 🙏" }];
      });
    } finally { setLoading(false); }
  }, [input, messages, loading, expanded, pathname]);

  useEffect(() => { sendRef.current = send; }, [send]);

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const hasText = input.trim().length > 0;
  const textPrimary = classic ? "hsl(var(--foreground))" : "rgba(255,255,255,0.92)";
  const textMuted   = classic ? "hsl(var(--muted-foreground))" : "rgba(255,255,255,0.42)";

  return (
    <>
      {/* ══ ПАНЕЛЬ ЧАТА — полный экран, прозрачное стекло ══════════════════════ */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ type: "spring", damping: 34, stiffness: 360 }}
            className="fixed z-[25] left-0 lg:left-60 right-0 aray-chat-panel flex flex-col overflow-hidden"
            style={{ bottom: "72px" }}
          >
            {/* ── Шапка ── */}
            <div className="aray-chat-header flex items-center gap-3 px-5 py-3 shrink-0">
              <ArayOrb size={32} pulse={loading}/>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[14px] font-bold tracking-tight" style={{ color: textPrimary }}>Арай</span>
                  <span className="aray-online-dot"/>
                  {pageCtx && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: "hsl(var(--primary)/0.12)", color: "hsl(var(--primary))", border: "1px solid hsl(var(--primary)/0.22)" }}>
                      {pageCtx.label}
                    </span>
                  )}
                  <span className="text-[10px] hidden sm:inline" style={{ color: textMuted }}>помнит всё · всегда рядом</span>
                </div>
              </div>
              <button
                onClick={() => { setShowHistory(v => !v); setSessions(loadSessions()); }}
                className={`aray-chat-ctrl-btn p-2 ${showHistory ? "text-primary" : ""}`}
                title="История разговоров">
                <History className="w-3.5 h-3.5"/>
              </button>
              <button
                onClick={() => {
                  // Архивируем текущий и начинаем новый
                  sessionIdRef.current = Date.now().toString();
                  setMessages([]);
                  setShowHistory(false);
                }}
                className="aray-chat-ctrl-btn p-2" title="Новый разговор">
                <RotateCcw className="w-3.5 h-3.5"/>
              </button>
              <button onClick={() => setExpanded(false)} className="aray-chat-ctrl-btn p-2" title="Свернуть">
                <ChevronDown className="w-4 h-4"/>
              </button>
            </div>

            {/* ── Панель истории ── */}
            {showHistory && (
              <div className="absolute inset-0 z-20 flex flex-col aray-history-panel" style={{ top: 0, borderRadius: "inherit" }}>
                {/* Шапка истории */}
                <div className="flex items-center justify-between px-4 py-3 shrink-0 aray-history-header">
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4" style={{ color: "hsl(var(--primary))" }}/>
                    <span className="text-[13px] font-bold" style={{ color: "hsl(var(--foreground))" }}>История разговоров</span>
                  </div>
                  <button onClick={() => setShowHistory(false)} className="aray-chat-ctrl-btn p-1.5">
                    <X className="w-3.5 h-3.5"/>
                  </button>
                </div>
                {/* Список сессий */}
                <div className="flex-1 overflow-y-auto p-3 space-y-1">
                  {sessions.filter(s => s.messages.filter(m => m.role === "user").length > 0).length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                      <Clock className="w-10 h-10" style={{ color: "hsl(var(--muted-foreground)/0.3)" }}/>
                      <p className="text-[13px] text-muted-foreground/60">Нет сохранённых разговоров</p>
                    </div>
                  ) : sessions.filter(s => s.messages.filter(m => m.role === "user").length > 0).map(s => (
                    <button key={s.id}
                      onClick={() => {
                        setMessages(s.messages);
                        sessionIdRef.current = s.id;
                        setShowHistory(false);
                      }}
                      className="w-full text-left px-3 py-2.5 rounded-xl transition-colors hover:bg-primary/[0.06] active:bg-primary/[0.10] group">
                      <div className="flex items-center gap-2">
                        <div className="text-[12.5px] font-medium truncate flex-1" style={{ color: "hsl(var(--foreground))" }}>
                          {s.title}
                        </div>
                        <span className="text-[10px] shrink-0" style={{ color: "hsl(var(--muted-foreground)/0.5)" }}>
                          {s.messages.filter(m => m.role === "user").length} вопр.
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Clock className="w-2.5 h-2.5 shrink-0" style={{ color: "hsl(var(--muted-foreground)/0.4)" }}/>
                        <span className="text-[11px]" style={{ color: "hsl(var(--muted-foreground)/0.55)" }}>
                          {formatSessionDate(s.date)}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
                {/* Футер очистки */}
                <div className="px-4 py-3 shrink-0 aray-history-footer">
                  <button
                    onClick={() => {
                      localStorage.removeItem(SESSIONS_KEY);
                      setSessions([]);
                    }}
                    className="w-full text-center text-[11px] py-1.5 rounded-xl transition-colors hover:bg-destructive/10"
                    style={{ color: "hsl(var(--destructive)/0.7)" }}>
                    Очистить всю историю
                  </button>
                </div>
              </div>
            )}

            {/* ── Лента сообщений ── */}
            <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
              {/* Welcome — когда нет сообщений */}
              {messages.length === 0 && !loading && (
                <div className="flex flex-col items-center justify-center h-full gap-4 py-8 select-none">
                  <ArayOrb size={52} pulse={false}/>
                  <div className="text-center space-y-1">
                    <p className="text-[15px] font-bold" style={{ color: "hsl(var(--foreground))" }}>Привет, {staffName}!</p>
                    <p className="text-[12px]" style={{ color: "hsl(var(--muted-foreground))" }}>Спрашивай — отвечу сразу</p>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center max-w-xs">
                    {quickList.slice(0, 3).map(q => (
                      <button key={q} onClick={() => send(q)}
                        className="text-[11.5px] font-medium px-3.5 py-2 rounded-full transition-all active:scale-95"
                        style={{ background: "hsl(var(--primary)/0.10)", border: "1px solid hsl(var(--primary)/0.22)", color: "hsl(var(--primary))" }}>
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map(msg => (
                <Bubble key={msg.id} msg={msg} onSpeak={speak} speaking={speaking}/>
              ))}

              {/* Быстрые чипсы — появляются после приветствия */}
              {messages.length === 1 && !loading && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="flex flex-wrap gap-2 mt-1 pl-8">
                  {quickList.map(q => (
                    <button key={q} onClick={() => send(q)}
                      className="aray-quick-btn px-3 py-1.5 text-[12px] active:scale-95 transition-transform">
                      {q}
                    </button>
                  ))}
                </motion.div>
              )}
              <div ref={bottomRef}/>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══ INPUT BAR + QUICK CHIPS — всегда виден ══════════════════════════════ */}
      <div className="fixed bottom-0 left-0 lg:left-60 right-0 z-[26] aray-chat-bar">

        {/* Быстрые чипсы в свёрнутом виде */}
        {!expanded && (
          <div className="flex gap-1.5 px-4 pt-2.5 pb-1 overflow-x-auto scrollbar-none">
            {quickList.map(q => (
              <button key={q}
                onClick={() => { send(q); setExpanded(true); }}
                className="aray-quick-btn shrink-0 px-3 py-1 text-[11px] active:scale-95 transition-transform whitespace-nowrap">
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Input строка */}
        <div className="flex items-end gap-2.5 px-4 py-2.5">

          {/* Шар — открыть/закрыть */}
          <button
            onClick={() => { setExpanded(v => !v); if (!expanded) setTimeout(() => inputRef.current?.focus(), 150); }}
            className="shrink-0 mb-0.5 transition-transform hover:scale-105 active:scale-95"
            style={{ WebkitTapHighlightColor: "transparent" }}
            title={expanded ? "Свернуть" : "Открыть Арая"}>
            <ArayOrb size={36} pulse={loading}/>
          </button>

          {/* Input */}
          <div className="flex-1 min-w-0">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              onFocus={() => !expanded && setExpanded(true)}
              placeholder={
                listening
                  ? (micInterim || "Слушаю...")
                  : pageCtx
                  ? `Спроси про ${pageCtx.label.toLowerCase()}...`
                  : "Спроси Арая..."
              }
              rows={1}
              className="aray-chat-input w-full resize-none text-[14px] leading-relaxed outline-none py-1.5"
              style={{ maxHeight: 96, fontFamily: "inherit", letterSpacing: "-0.01em", fontWeight: 450 }}
              onInput={e => {
                const t = e.currentTarget;
                t.style.height = "auto";
                t.style.height = Math.min(t.scrollHeight, 88) + "px";
              }}
            />
          </div>

          {/* Кнопки */}
          <div className="flex items-center gap-1 shrink-0 mb-0.5">
            {/* Глобальный toggle голоса */}
            <button
              onClick={toggleAutoVoice}
              className={`aray-chat-action-btn p-2 ${autoVoice ? "aray-chat-action-btn-active" : ""}`}
              title={autoVoice ? "Голос ВКЛ — нажми чтобы выключить" : "Включить голос (все ответы)"}>
              {autoVoice ? <Volume2 className="w-4 h-4"/> : <VolumeX className="w-4 h-4"/>}
            </button>

            {/* Микрофон */}
            {micSupported && (
              <button
                onClick={listening ? stopMic : startMic}
                className={`aray-chat-action-btn p-2 ${listening ? "aray-chat-action-btn-active" : ""}`}
                title={listening ? "Стоп" : "Говори — пойму"}>
                {listening ? <MicOff className="w-4 h-4"/> : <Mic className="w-4 h-4"/>}
              </button>
            )}

            {/* Отправить */}
            <button
              onClick={() => send()}
              disabled={!hasText || loading}
              className="aray-chat-send-btn p-2"
              data-ready={hasText && !loading}
              title="Отправить (Enter)">
              <Send className="w-4 h-4"/>
            </button>
          </div>
        </div>

        {/* Метка снизу */}
        <div className="text-center pb-2 -mt-1">
          <span className="aray-chat-label text-[9px] tracking-wide">
            {pageCtx ? `${pageCtx.label} · ` : ""}Арай помнит всё ·{" "}
            <span style={{ color: "hsl(var(--primary)/0.45)" }}>ARAY</span>
          </span>
        </div>
      </div>
    </>
  );
}
