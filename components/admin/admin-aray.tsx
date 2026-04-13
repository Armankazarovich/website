"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Send, Mic, MicOff, Volume2, VolumeX, RotateCcw,
  X, Sparkles,
} from "lucide-react";
import { ArayBrowser, type ArayBrowserAction } from "@/components/store/aray-browser";

// ─── Page context for smart chips ───────────────────────────────────────────
const PAGE_CHIPS: Record<string, string[]> = {
  "/admin": ["Сводка за сегодня", "Новые заказы", "Что срочно?"],
  "/admin/orders": ["Новые заказы", "Подтверди все новые", "Заказы за сегодня"],
  "/admin/products": ["Что не в наличии?", "Покажи все цены", "Актуальные цены"],
  "/admin/clients": ["Новые клиенты", "Постоянные покупатели", "Топ клиентов"],
  "/admin/delivery": ["Активные доставки", "Что доставляется?", "Задержки"],
  "/admin/staff": ["Кто в команде?", "Онлайн-статус", "Добавь задачу"],
  "/admin/tasks": ["Все задачи", "Срочные задачи", "Создай задачу"],
  "/admin/crm": ["Новые лиды", "Горячие клиенты", "Добавь лид"],
  "/admin/analytics": ["Выручка за месяц", "Топ товаров", "Динамика продаж"],
  "/admin/finance": ["Выручка сегодня", "Сравни с прошлой неделей", "Средний чек"],
  "/admin/settings": ["Проверь настройки", "Тест Telegram", "SMTP работает?"],
  "/admin/notifications": ["Отправь push всем", "Сколько подписчиков?", "Тест уведомления"],
};
const DEFAULT_CHIPS = ["Сводка за сегодня", "Новые заказы", "Создай задачу"];

function getChips(pathname: string): string[] {
  if (PAGE_CHIPS[pathname]) return PAGE_CHIPS[pathname];
  const match = Object.keys(PAGE_CHIPS)
    .filter(k => k !== "/admin" && pathname.startsWith(k))
    .sort((a, b) => b.length - a.length)[0];
  return match ? PAGE_CHIPS[match] : DEFAULT_CHIPS;
}

// ─── Types ──────────────────────────────────────────────────────────────────
type Msg = { id: string; role: "user" | "assistant"; text: string; streaming?: boolean };

// ─── Parse and clean ARAY commands from response ─────────────────────────────
type ArayAction =
  | { type: "navigate"; path: string }
  | { type: "refresh" }
  | { type: "popup"; url: string; title: string }
  | { type: "show_url"; url: string; title: string };

function parseActions(raw: string): ArayAction[] {
  const actions: ArayAction[] = [];
  // __ARAY_POPUP:{"url":"/admin/orders","title":"Заказы"}__
  for (const m of raw.matchAll(/__ARAY_POPUP:(\{.+?\})__/g)) {
    try {
      const { url, title } = JSON.parse(m[1]);
      if (url) actions.push({ type: "popup", url, title: title || url });
    } catch {}
  }
  // __ARAY_NAVIGATE:/admin/tasks__
  for (const m of raw.matchAll(/__ARAY_NAVIGATE:(.+?)__/g)) {
    actions.push({ type: "navigate", path: m[1] });
  }
  // __ARAY_SHOW_URL:https://....:Title__
  for (const m of raw.matchAll(/__ARAY_SHOW_URL:(.+?):(.+?)__/g)) {
    actions.push({ type: "popup", url: m[1], title: m[2] });
  }
  // __ARAY_REFRESH__
  if (raw.includes("__ARAY_REFRESH__")) actions.push({ type: "refresh" });
  return actions;
}

function cleanResponse(raw: string): string {
  return raw
    .replace(/\n?__ARAY_META__[\s\S]*$/, "")
    .replace(/__ARAY_ERR__/, "")
    .replace(/__ARAY_POPUP:\{.+?\}__/g, "")
    .replace(/__ARAY_SHOW_URL:.+?:.+?__/g, "")
    .replace(/__ARAY_NAVIGATE:.+?__/g, "")
    .replace(/__ARAY_REFRESH__/g, "")
    .replace(/__ARAY_ADD_CART:.+?__/g, "")
    .replace(/ARAY_ACTIONS:\[[\s\S]*?\]/g, "")
    .trim();
}

// ─── Живой SVG-шар (тот же что на сайте) ────────────────────────────────────
function ArayOrb({ size = 40, glow = false, id = "adm" }: { size?: number; glow?: boolean; id?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ display: "block", overflow: "visible" }}>
      <defs>
        <filter id={`${id}-glow`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
          <feColorMatrix in="blur" type="matrix"
            values="2 0.8 0 0 0  0.6 0.2 0 0 0  0 0 0 0 0  0 0 0 0.9 0" result="glow" />
          <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <radialGradient id={`${id}-base`} cx="38%" cy="32%" r="70%">
          <stop offset="0%" stopColor="#fff8d0" />
          <stop offset="18%" stopColor="#fbbf24">
            <animate attributeName="stopColor" values="#fbbf24;#f97316;#fde047;#fbbf24" dur="5s" repeatCount="indefinite" />
          </stop>
          <stop offset="50%" stopColor="#e8700a">
            <animate attributeName="stopColor" values="#e8700a;#c2410c;#f97316;#e8700a" dur="7s" repeatCount="indefinite" />
          </stop>
          <stop offset="82%" stopColor="#7c2d12" />
          <stop offset="100%" stopColor="#1a0500" />
        </radialGradient>
        <radialGradient id={`${id}-hot`} cx="50%" cy="22%" r="48%">
          <stop offset="0%" stopColor="#fde68a" stopOpacity="0.75">
            <animate attributeName="stopOpacity" values="0.75;1;0.5;0.75" dur="3s" repeatCount="indefinite" />
          </stop>
          <stop offset="100%" stopColor="#fde68a" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}-hl`} cx="30%" cy="24%" r="40%">
          <stop offset="0%" stopColor="white" stopOpacity="0.88" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </radialGradient>
        <clipPath id={`${id}-clip`}><circle cx="50" cy="50" r="46" /></clipPath>
      </defs>
      <circle cx="50" cy="50" r="46" fill={`url(#${id}-base)`} filter={glow ? `url(#${id}-glow)` : undefined} />
      <g clipPath={`url(#${id}-clip)`}>
        <ellipse cx="50" cy="28" rx="36" ry="22" fill={`url(#${id}-hot)`}>
          <animateTransform attributeName="transform" type="rotate" from="0 50 50" to="360 50 50" dur="6s" repeatCount="indefinite" />
        </ellipse>
        <ellipse cx="50" cy="72" rx="26" ry="15" fill="#fb923c" opacity="0.18">
          <animateTransform attributeName="transform" type="rotate" from="180 50 50" to="-180 50 50" dur="9s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.18;0.28;0.1;0.18" dur="4.5s" repeatCount="indefinite" />
        </ellipse>
      </g>
      <circle cx="50" cy="50" r="46" fill={`url(#${id}-hl)`} />
    </svg>
  );
}

// ─── Simple markdown rendering ──────────────────────────────────────────────
function MdText({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        if (!line.trim()) return null;
        const parts = line.split(/(\*\*[^*]+\*\*)/g).map((p, j) =>
          p.startsWith("**") && p.endsWith("**")
            ? <strong key={j} className="font-semibold">{p.slice(2, -2)}</strong>
            : p
        );
        if (/^[\-\*—]\s/.test(line.trim())) {
          return (
            <div key={i} className="flex gap-2 items-start pl-1">
              <span className="mt-[7px] w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "hsl(var(--primary)/0.5)" }}/>
              <span>{parts}</span>
            </div>
          );
        }
        return <p key={i}>{parts}</p>;
      })}
    </div>
  );
}

// ─── Push-to-talk microphone ────────────────────────────────────────────────
function useMic() {
  const [active, setActive] = useState(false);
  const [supported, setSupported] = useState(false);
  const recRef = useRef<any>(null);

  useEffect(() => {
    setSupported(!!(
      typeof window !== "undefined" &&
      ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
    ));
  }, []);

  const listen = useCallback((): Promise<string> => {
    return new Promise(async (resolve) => {
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SR) {
        console.warn("[Aray Mic] SpeechRecognition не поддерживается в этом браузере");
        resolve("");
        return;
      }

      // Сначала запросим разрешение на микрофон
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (err) {
        console.warn("[Aray Mic] Микрофон заблокирован:", err);
        resolve("");
        return;
      }

      if (recRef.current) { try { recRef.current.stop(); } catch {} }

      const r = new SR();
      r.lang = "ru-RU";
      r.interimResults = false;
      r.continuous = false;
      r.maxAlternatives = 1;
      let resolved = false;

      r.onstart = () => { console.log("[Aray Mic] Слушаю..."); setActive(true); };
      r.onend = () => { setActive(false); recRef.current = null; if (!resolved) { resolved = true; resolve(""); } };
      r.onerror = (e: any) => {
        console.warn("[Aray Mic] Ошибка:", e.error);
        setActive(false); recRef.current = null;
        if (!resolved) { resolved = true; resolve(""); }
      };
      r.onresult = (e: any) => {
        const text = e.results[0]?.[0]?.transcript?.trim() || "";
        console.log("[Aray Mic] Распознано:", text);
        if (!resolved) { resolved = true; resolve(text); }
      };

      try { r.start(); recRef.current = r; }
      catch (err) {
        console.warn("[Aray Mic] Не удалось запустить:", err);
        setActive(false);
        if (!resolved) { resolved = true; resolve(""); }
      }
    });
  }, []);

  const cancel = useCallback(() => {
    if (recRef.current) { try { recRef.current.stop(); } catch {} recRef.current = null; }
    setActive(false);
  }, []);

  return { active, supported, listen, cancel };
}

// ─── TTS: Streaming ElevenLabs (Leonid, Flash) → Browser Speech ─────────────
const ELEVEN_VOICE = "UIaC9QMb6UP5hfzy6uOD"; // Leonid — тёплый, естественный русский
const ELEVEN_MODEL = "eleven_flash_v2_5";       // Flash — быстрый, мультиязычный
const ELEVEN_KEY = "sk_012bb7d94cc7ef02a9e11422d9dc6a4a56c7ace7a9ff5eb1";
const ELEVEN_SPEED = 1.15; // чуть быстрее нормы — живой темп для ассистента

function cleanTTSText(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1").replace(/\*(.*?)\*/g, "$1")
    .replace(/[#_`~|>]/g, " ")
    .replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}]/gu, "") // все эмодзи
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")  // [ссылки](url) → текст
    .replace(/https?:\/\/\S+/g, "")           // голые URL
    .replace(/\d{4,}/g, (m) => m.split("").join(" ")) // длинные числа по цифрам
    .replace(/₽/g, " рублей").replace(/м³/g, " кубов")
    .replace(/\s{2,}/g, " ").trim().slice(0, 800);
}

function useTTS() {
  const [speaking, setSpeaking] = useState(false);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const onDoneRef = useRef<(() => void) | null>(null);

  const stop = useCallback(() => {
    abortRef.current?.abort(); abortRef.current = null;
    if (currentAudioRef.current) { currentAudioRef.current.pause(); currentAudioRef.current.src = ""; currentAudioRef.current = null; }
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    setSpeaking(false);
  }, []);

  // Разбиваем текст на предложения для быстрого старта
  const splitSentences = useCallback((text: string): string[] => {
    const raw = text.match(/[^.!?]+[.!?]+/g) || [text];
    const chunks: string[] = [];
    let cur = "";
    for (const s of raw) {
      if (cur.length + s.length > 140 && cur) { chunks.push(cur.trim()); cur = s; }
      else cur += s;
    }
    if (cur.trim()) chunks.push(cur.trim());
    return chunks.filter(c => c.length > 2);
  }, []);

  // Загрузка одного аудио-фрагмента
  const fetchOne = useCallback(async (text: string, signal: AbortSignal): Promise<HTMLAudioElement | null> => {
    const apiKey = process.env.NEXT_PUBLIC_ELEVENLABS_KEY || ELEVEN_KEY;
    try {
      const res = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${ELEVEN_VOICE}/stream?output_format=mp3_22050_32&optimize_streaming_latency=4`,
        {
          method: "POST", signal,
          headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
          body: JSON.stringify({
            text, model_id: ELEVEN_MODEL,
            voice_settings: { stability: 0.60, similarity_boost: 0.75, style: 0.20, use_speaker_boost: true, speed: ELEVEN_SPEED },
          }),
        }
      );
      if (!res.ok) return null;
      const blob = await res.blob();
      if (blob.size < 100) return null;
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => URL.revokeObjectURL(url);
      audio.onerror = () => URL.revokeObjectURL(url);
      return audio;
    } catch { return null; }
  }, []);

  const speak = useCallback(async (text: string, onFinished?: () => void) => {
    stop();
    const clean = cleanTTSText(text);
    if (!clean) return;
    setSpeaking(true);
    onDoneRef.current = onFinished || null;

    const abort = new AbortController();
    abortRef.current = abort;

    const sentences = splitSentences(clean);

    // Параллельно: первое предложение + все остальные
    const firstPromise = fetchOne(sentences[0], abort.signal);
    const restPromise = sentences.length > 1
      ? Promise.all(sentences.slice(1).map(s => fetchOne(s, abort.signal)))
      : Promise.resolve([] as (HTMLAudioElement | null)[]);

    // Играем первое предложение (быстрый старт ~500ms)
    const firstAudio = await firstPromise;
    if (!firstAudio || abort.signal.aborted) {
      setSpeaking(false); onDoneRef.current?.(); return;
    }
    currentAudioRef.current = firstAudio;
    await new Promise<void>(resolve => {
      firstAudio.onended = () => { URL.revokeObjectURL(firstAudio.src); resolve(); };
      firstAudio.onerror = () => resolve();
      firstAudio.play().catch(() => resolve());
    });

    // Играем остальные фрагменты последовательно
    if (!abort.signal.aborted) {
      const rest = await restPromise;
      for (const audio of rest) {
        if (!audio || abort.signal.aborted) break;
        currentAudioRef.current = audio;
        await new Promise<void>(resolve => {
          audio.onended = () => { URL.revokeObjectURL(audio.src); resolve(); };
          audio.onerror = () => resolve();
          audio.play().catch(() => resolve());
        });
      }
    }

    if (!abort.signal.aborted) {
      setSpeaking(false);
      onDoneRef.current?.();
    }
  }, [stop, splitSentences, fetchOne]);

  return { speaking, speak, stop };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── MAIN COMPONENT ─────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
export function AdminAray({ staffName = "Коллега", userRole }: {
  staffName?: string; userRole?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const chips = getChips(pathname);

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [voiceMode, setVoiceMode] = useState<"text" | "voice">("text");
  // Встроенный браузер Арая (попап)
  const [browserOpen, setBrowserOpen] = useState(false);
  const [browserUrl, setBrowserUrl] = useState("/admin");
  const [isMobile, setIsMobile] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const longPressTimer = useRef<number | null>(null);
  const longPressTriggered = useRef(false);

  const { speaking, speak, stop: stopTTS } = useTTS();
  const { active: micActive, supported: micOk, listen: micListen, cancel: micCancel } = useMic();

  // Load voice mode preference + mobile detect
  useEffect(() => {
    const saved = localStorage.getItem("aray-voice-mode");
    if (saved === "voice") setVoiceMode("voice");
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Preload voices (нужно для Safari/Chrome — голоса грузятся асинхронно)
  useEffect(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
    }
  }, []);

  // ── Память чата: сохраняем/восстанавливаем из localStorage ──────────────
  const CHAT_KEY = "aray-admin-chat";
  const MAX_STORED = 30; // максимум 30 сообщений

  // Восстановить при первом рендере
  useEffect(() => {
    try {
      const saved = localStorage.getItem(CHAT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Msg[];
        if (parsed.length > 0) setMessages(parsed.map(m => ({ ...m, streaming: false })));
      }
    } catch {}
  }, []);

  // Сохранять при каждом изменении (без streaming сообщений)
  useEffect(() => {
    if (messages.length === 0) return;
    const toSave = messages
      .filter(m => m.text && !m.streaming)
      .slice(-MAX_STORED);
    try { localStorage.setItem(CHAT_KEY, JSON.stringify(toSave)); } catch {}
  }, [messages]);

  // Auto-scroll
  useEffect(() => {
    if (open) setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 60);
  }, [messages, open]);

  // Welcome message (только если нет сохранённых)
  useEffect(() => {
    if (open && messages.length === 0) {
      const h = new Date().getHours();
      const gr = h < 6 ? "Не спишь?" : h < 12 ? "Доброе утро" : h < 17 ? "Привет" : h < 22 ? "Добрый вечер" : "Поздновато";
      const name = staffName && staffName !== "Коллега" && staffName !== "Администратор"
        ? `, ${staffName.split(" ")[0]}` : "";
      setMessages([{ id: "w", role: "assistant", text: `${gr}${name}! Чем помочь?` }]);
    }
  }, [open, messages.length, staffName]);

  // External events (aray:open from sidebar / bottom nav)
  useEffect(() => {
    const h1 = () => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 200); };
    const h2 = (e: Event) => {
      const { text } = (e as CustomEvent).detail || {};
      if (text) sendMessage(text);
    };
    window.addEventListener("aray:open", h1);
    window.addEventListener("aray:fill", h2);
    return () => { window.removeEventListener("aray:open", h1); window.removeEventListener("aray:fill", h2); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Core: send message ───────────────────────────────────────────────────
  const sendMessage = useCallback(async (text: string) => {
    const msg = text.trim();
    if (!msg || loading) return;
    if (!open) setOpen(true);
    setInput("");

    const userMsg: Msg = { id: `u${Date.now()}`, role: "user", text: msg };
    const aid = `a${Date.now()}`;
    const allMsgs = [...messages, userMsg];
    setMessages(prev => [...prev, userMsg, { id: aid, role: "assistant", text: "", streaming: true }]);
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: allMsgs.map(m => ({ role: m.role, content: m.text })),
          context: { page: pathname },
        }),
      });

      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let raw = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        raw += dec.decode(value, { stream: true });
        const display = cleanResponse(raw);
        setMessages(prev => prev.map(m => m.id === aid ? { ...m, text: display } : m));
      }

      const final = cleanResponse(raw);
      setMessages(prev => prev.map(m => m.id === aid ? { ...m, text: final, streaming: false } : m));

      // Auto-voice response
      if (voiceMode === "voice" && final) speak(final, () => {
        // После того как Арай договорил — автоматически слушаем (как Алиса)
        setTimeout(async () => {
          try { const t = await micListen(); if (t) sendMessage(t); } catch {}
        }, 300);
      });

      // Execute ALL actions from the response
      const actions = parseActions(raw);
      for (const action of actions) {
        if (action.type === "navigate") {
          setTimeout(() => router.push(action.path), 600);
        }
        if (action.type === "refresh") {
          setTimeout(() => router.refresh(), 400);
        }
        if (action.type === "popup" || action.type === "show_url") {
          // Открываем в попап-браузере Арая вместо новой вкладки
          setBrowserUrl(action.url);
          setBrowserOpen(true);
        }
      }

    } catch (err) {
      setMessages(prev => prev.map(m => m.id === aid
        ? { ...m, text: "Не удалось связаться с сервером. Проверь интернет и попробуй ещё раз.", streaming: false }
        : m
      ));
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, loading, open, pathname, voiceMode, speak, router]);

  // ─── Voice input (push-to-talk) ───────────────────────────────────────────
  const handleMic = useCallback(async () => {
    if (micActive) { micCancel(); return; }
    if (!open) setOpen(true);
    const text = await micListen();
    if (text) sendMessage(text);
  }, [micActive, micCancel, micListen, open, sendMessage]);

  // ─── Keyboard handlers ────────────────────────────────────────────────────
  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  const toggleVoice = () => {
    const next = voiceMode === "text" ? "voice" : "text";
    setVoiceMode(next);
    localStorage.setItem("aray-voice-mode", next);
    if (next === "text") stopTTS();
  };

  // ═══ RENDER ═══════════════════════════════════════════════════════════════
  return (
    <>
      {/* ══ Встроенный браузер Арая (попап) ══ */}
      <AnimatePresence>
        {browserOpen && (
          <ArayBrowser
            initialUrl={browserUrl}
            onClose={() => setBrowserOpen(false)}
            isMobile={isMobile}
          />
        )}
      </AnimatePresence>

      {/* ── FLOATING ORB BUTTON (tap = open chat, long-press = voice) ── */}
      <motion.button
        onClick={() => { if (!longPressTriggered.current) { setOpen(v => !v); if (!open) setTimeout(() => inputRef.current?.focus(), 200); } }}
        onTouchStart={() => {
          longPressTriggered.current = false;
          longPressTimer.current = window.setTimeout(async () => {
            longPressTriggered.current = true;
            if (!open) setOpen(true);
            // Push-to-talk: начинаем слушать
            const text = await micListen();
            if (text) {
              // Включаем голосовой режим если ещё не включён
              if (voiceMode !== "voice") { setVoiceMode("voice"); localStorage.setItem("aray-voice-mode", "voice"); }
              sendMessage(text);
            }
          }, 400);
        }}
        onTouchEnd={() => { if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; } }}
        onTouchCancel={() => { if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; } }}
        className="fixed z-[55] right-4 w-14 h-14 rounded-full flex items-center justify-center"
        style={{
          ...({
            bottom: "calc(80px + max(12px, env(safe-area-inset-bottom, 12px)))",
          }),
          background: micActive
            ? "rgba(59,130,246,0.15)"
            : open ? "hsl(var(--muted))" : "transparent",
          boxShadow: micActive
            ? "0 4px 24px rgba(59,130,246,0.5), 0 0 40px rgba(59,130,246,0.2)"
            : open
              ? "0 4px 20px rgba(0,0,0,0.15)"
              : "0 4px 24px rgba(255,130,0,0.35), 0 0 40px rgba(255,130,0,0.12)",
        }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        title={micActive ? "Слушаю..." : "Арай — AI ассистент (удерживай = голос)"}
      >
        {/* Pulse ring when idle */}
        {!open && !loading && (
          <motion.span className="absolute inset-[-4px] rounded-full"
            style={{ background: "radial-gradient(circle, rgba(255,140,0,0.3) 0%, transparent 70%)" }}
            animate={{ scale: [1, 1.3], opacity: [0.6, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeOut" }}/>
        )}

        {/* Loading spinner ring */}
        {loading && (
          <motion.span className="absolute inset-[-3px] rounded-full border-2 border-t-transparent border-orange-400/50"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}/>
        )}

        <AnimatePresence mode="wait">
          {open ? (
            <motion.span key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
              <X className="w-6 h-6" style={{ color: "hsl(var(--foreground))" }}/>
            </motion.span>
          ) : (
            <motion.span key="orb" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }}>
              <ArayOrb size={48} glow id="adm-btn"/>
            </motion.span>
          )}
        </AnimatePresence>

        {/* Speaking indicator */}
        {speaking && (
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-white animate-pulse"/>
        )}
      </motion.button>

      {/* ── CHAT POPUP ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ type: "spring", damping: 26, stiffness: 300 }}
            className={`fixed z-[54] flex flex-col overflow-hidden shadow-2xl ${isMobile ? "inset-0 rounded-none" : "right-4 rounded-2xl"}`}
            style={{
              ...(!isMobile ? {
                bottom: "calc(80px + max(12px, env(safe-area-inset-bottom, 12px)) + 64px)",
                width: "min(400px, calc(100vw - 32px))",
                height: "min(540px, calc(100vh - 120px))",
              } : {}),
              background: "hsl(var(--background))",
              border: isMobile ? "none" : "1px solid hsl(var(--border))",
              boxShadow: "0 20px 60px rgba(0,0,0,0.25), 0 0 0 1px hsl(var(--border)/0.5)",
            }}
          >
            {/* ─ Header ─ */}
            <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: "hsl(var(--border))" }}>
              <div className="shrink-0"><ArayOrb size={32} id="adm-hdr"/></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-foreground">Арай</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400"/>
                  <span className="text-[10px] text-muted-foreground">AI ассистент</span>
                </div>
              </div>
              <button onClick={() => { setMessages([]); try { localStorage.removeItem(CHAT_KEY); } catch {} }} className="p-1.5 rounded-lg hover:bg-muted transition-colors" title="Новый чат">
                <RotateCcw className="w-3.5 h-3.5 text-muted-foreground"/>
              </button>
              <button onClick={toggleVoice}
                className={`px-2 py-1 rounded-lg text-[10px] font-medium transition-all ${
                  voiceMode === "voice"
                    ? "bg-primary/15 text-primary border border-primary/30"
                    : "bg-muted text-muted-foreground hover:text-foreground border border-transparent"
                }`}
                title={voiceMode === "voice" ? "Режим: Голос (нажми для текста)" : "Режим: Текст (нажми для голоса)"}>
                {voiceMode === "voice"
                  ? <span className="flex items-center gap-1"><Volume2 className="w-3 h-3"/> Голос</span>
                  : <span className="flex items-center gap-1"><VolumeX className="w-3 h-3"/> Текст</span>}
              </button>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                <X className="w-3.5 h-3.5 text-muted-foreground"/>
              </button>
            </div>

            {/* ─ Messages ─ */}
            <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
              {messages.map(msg => (
                <motion.div key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} gap-2`}
                >
                  {/* Мини-шар рядом с сообщением Арая */}
                  {msg.role === "assistant" && (
                    <div className="shrink-0 mt-1"><ArayOrb size={20} id={`msg-${msg.id}`}/></div>
                  )}
                  <div className={`max-w-[82%] px-3.5 py-2.5 rounded-2xl text-[13.5px] leading-relaxed ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-muted text-foreground rounded-bl-md"
                  }`}>
                    {msg.text ? <MdText text={msg.text}/> : msg.streaming ? (
                      <span className="inline-flex gap-1 items-center">
                        <span className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}/>
                        <span className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}/>
                        <span className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}/>
                      </span>
                    ) : null}
                  </div>
                </motion.div>
              ))}

              {/* Quick chips after welcome */}
              {messages.length === 1 && !loading && (
                <div className="flex flex-wrap gap-2 mt-1">
                  {chips.map(c => (
                    <button key={c} onClick={() => sendMessage(c)}
                      className="px-3 py-1.5 text-[12px] rounded-full bg-muted hover:bg-muted/80 text-foreground border border-border transition-colors active:scale-95"
                      style={{ WebkitTapHighlightColor: "transparent" }}>
                      {c}
                    </button>
                  ))}
                </div>
              )}

              {/* Voice speak button on last assistant message */}
              {messages.length > 1 && !loading && messages[messages.length - 1]?.role === "assistant" && (
                <button onClick={() => {
                  const last = messages[messages.length - 1];
                  if (speaking) stopTTS(); else speak(last.text);
                }}
                  className="self-start flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors active:scale-95 border border-border/50"
                  style={{ WebkitTapHighlightColor: "transparent" }}>
                  {speaking ? <><VolumeX className="w-3.5 h-3.5"/> остановить</> : <><Volume2 className="w-3.5 h-3.5"/> озвучить</>}
                </button>
              )}

              <div ref={bottomRef}/>
            </div>

            {/* ─ Input ─ */}
            <div className="border-t px-3 pb-3 pt-2" style={{ borderColor: "hsl(var(--border))" }}>
              {/* Mic status */}
              {micActive && (
                <div className="flex items-center gap-2 px-3 py-1.5 mb-2 rounded-xl bg-primary/10 text-primary text-[12px]">
                  <Mic className="w-3.5 h-3.5 animate-pulse"/>
                  <span>Слушаю... говори</span>
                  <button onClick={micCancel} className="ml-auto text-primary/60 hover:text-primary">
                    <X className="w-3.5 h-3.5"/>
                  </button>
                </div>
              )}

              <div className="flex items-end gap-2">
                {/* Mic button */}
                {micOk && (
                  <button onClick={handleMic}
                    className={`shrink-0 p-2.5 rounded-xl transition-all active:scale-90 ${
                      micActive
                        ? "bg-primary text-white"
                        : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"
                    }`}
                    style={{ WebkitTapHighlightColor: "transparent" }}
                    title={micActive ? "Остановить" : "Голосовой ввод"}>
                    {micActive ? <MicOff className="w-5 h-5"/> : <Mic className="w-5 h-5"/>}
                  </button>
                )}

                {/* Text input */}
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="Напиши или скажи..."
                  rows={1}
                  className="flex-1 resize-none text-[13.5px] leading-relaxed outline-none px-3 py-2.5 rounded-xl bg-muted text-foreground border border-border focus:border-primary/50 transition-colors"
                  style={{ maxHeight: 80, fontFamily: "inherit" }}
                  onInput={e => { const t = e.currentTarget; t.style.height = "auto"; t.style.height = Math.min(t.scrollHeight, 80) + "px"; }}
                />

                {/* Send */}
                <button onClick={() => sendMessage(input)}
                  disabled={!input.trim() || loading}
                  className={`shrink-0 p-2.5 rounded-xl transition-all active:scale-90 ${
                    input.trim() && !loading
                      ? "bg-primary text-white hover:bg-primary/90"
                      : "bg-muted text-muted-foreground"
                  }`}
                  style={{ WebkitTapHighlightColor: "transparent" }}
                  title="Отправить (Enter)">
                  <Send className="w-5 h-5"/>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
