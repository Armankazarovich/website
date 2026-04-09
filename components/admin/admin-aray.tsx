"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Send, Loader2, RotateCcw, Mic, MicOff, Volume2, VolumeX, Sparkles, Zap } from "lucide-react";
import { ArayIcon } from "@/components/store/aray-widget";

// ─── Типы ─────────────────────────────────────────────────────────────────────

type Msg = {
  id: string;
  role: "user" | "assistant";
  text: string;
  streaming?: boolean;
};

function parseActions(raw: string) {
  const marker = "ARAY_ACTIONS:";
  const idx = raw.indexOf(marker);
  if (idx === -1) return { text: raw, actions: [] };
  return { text: raw.slice(0, idx).trim(), actions: [] };
}

// ─── Голосовой ввод ───────────────────────────────────────────────────────────

function useVoice(onResult: (t: string) => void) {
  const [listening, setListening] = useState(false);
  const ref = useRef<any>(null);
  const start = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR();
    r.lang = "ru-RU"; r.interimResults = false;
    r.onstart = () => setListening(true);
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    r.onresult = (e: any) => { const t = e.results[0]?.[0]?.transcript || ""; if (t) onResult(t); };
    r.start(); ref.current = r;
  }, [onResult]);
  const stop = useCallback(() => { ref.current?.stop(); setListening(false); }, []);
  return { listening, start, stop };
}

// ─── TTS ─────────────────────────────────────────────────────────────────────

function useTTS() {
  const [speaking, setSpeaking] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const speak = useCallback(async (text: string, id: string) => {
    if (speaking === id) { audioRef.current?.pause(); audioRef.current = null; setSpeaking(null); return; }
    audioRef.current?.pause();
    setSpeaking(id);
    try {
      const res = await fetch("/api/ai/tts", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) { setSpeaking(null); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => { setSpeaking(null); URL.revokeObjectURL(url); };
      audio.onerror = () => setSpeaking(null);
      await audio.play();
    } catch { setSpeaking(null); }
  }, [speaking]);
  return { speaking, speak };
}

// ─── Пузырь сообщения ─────────────────────────────────────────────────────────

function Bubble({ msg, onSpeak, speaking }: {
  msg: Msg;
  onSpeak?: (text: string, id: string) => void;
  speaking?: string | null;
}) {
  const isUser = msg.role === "user";
  const isSpeaking = speaking === msg.id;
  return (
    <div className={`flex gap-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      {!isUser && (
        <div className="shrink-0 mt-0.5">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <ArayIconSmall />
        </div>
      )}
      <div className="flex flex-col gap-1 max-w-[82%]">
        <div
          className="px-3 py-2 text-[12px] leading-relaxed"
          style={isUser ? {
            background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary)/0.75))",
            color: "#fff", borderRadius: "14px 14px 4px 14px",
          } : {
            background: "rgba(255,255,255,0.08)",
            color: "rgba(255,255,255,0.90)",
            borderRadius: "14px 14px 14px 4px",
            border: "1px solid rgba(255,255,255,0.10)",
          }}
        >
          {msg.text
            ? msg.text.split("\n").map((line, i, arr) => (
                <span key={i}>{line}{i < arr.length - 1 && <br />}</span>
              ))
            : !isUser && msg.streaming
            ? <span className="inline-flex gap-1 items-center py-0.5">
                {[0, 1, 2].map(i => (
                  <span key={i} className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-bounce"
                    style={{ animationDelay: `${i * 150}ms` }} />
                ))}
              </span>
            : null
          }
          {msg.streaming && msg.text && (
            <span className="inline-block w-0.5 h-3 bg-orange-400 ml-0.5 align-middle animate-pulse" />
          )}
        </div>
        {!isUser && !msg.streaming && msg.text && onSpeak && (
          <button
            onClick={() => onSpeak(msg.text, msg.id)}
            className="self-start flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] transition-all"
            style={{ color: isSpeaking ? "hsl(var(--primary))" : "rgba(255,255,255,0.30)" }}
          >
            {isSpeaking ? <VolumeX className="w-2.5 h-2.5" /> : <Volume2 className="w-2.5 h-2.5" />}
            {isSpeaking ? "стоп" : "озвучить"}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Маленький шар ────────────────────────────────────────────────────────────

function ArayIconSmall() {
  return (
    <svg width="22" height="22" viewBox="0 0 100 100" style={{ display: "block" }}>
      <defs>
        <radialGradient id="ais-base" cx="34%" cy="28%" r="70%">
          <stop offset="0%" stopColor="#fffbe0"/>
          <stop offset="28%" stopColor="#f07800"/>
          <stop offset="75%" stopColor="#6e1c00"/>
          <stop offset="100%" stopColor="#160300"/>
        </radialGradient>
        <radialGradient id="ais-hl" cx="30%" cy="25%" r="34%">
          <stop offset="0%" stopColor="white" stopOpacity="0.85"/>
          <stop offset="100%" stopColor="white" stopOpacity="0"/>
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="46" fill="url(#ais-base)"/>
      <circle cx="50" cy="50" r="46" fill="url(#ais-hl)"/>
    </svg>
  );
}

// ─── Быстрые вопросы ──────────────────────────────────────────────────────────

const QUICK_ADMIN = [
  "Сколько новых заказов?",
  "Покажи сводку за сегодня",
  "Как добавить товар?",
  "Что с доставкой?",
];

// ─── Главный компонент ────────────────────────────────────────────────────────

export function AdminAray({ staffName = "Коллега" }: { staffName?: string }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [bubble, setBubble] = useState<string | null>(null);
  const [hasNew, setHasNew] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { speaking, speak } = useTTS();

  const addInput = useCallback((t: string) => {
    setInput(prev => prev ? prev + " " + t : t);
    inputRef.current?.focus();
  }, []);
  const { listening, start: startMic, stop: stopMic } = useVoice(addInput);

  // Проактивный пузырь
  useEffect(() => {
    const t = setTimeout(() => {
      if (!open) {
        const h = new Date().getHours();
        const greeting = h < 12 ? "Доброе утро" : h < 17 ? "Добрый день" : "Добрый вечер";
        setBubble(`${greeting}, ${staffName}! Чем помочь? 👋`);
        setHasNew(true);
        setTimeout(() => setBubble(null), 6000);
      }
    }, 12000);
    return () => clearTimeout(t);
  }, [open, staffName]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const initChat = useCallback(() => {
    if (messages.length > 0) return;
    const h = new Date().getHours();
    const time = h < 12 ? "Доброе утро" : h < 17 ? "Добрый день" : "Добрый вечер";
    setMessages([{
      id: "welcome", role: "assistant",
      text: `${time}, ${staffName}! 👋 Я Арай — твой помощник по всем вопросам. Заказы, товары, аналитика — спрашивай всё!`,
    }]);
  }, [messages.length, staffName]);

  const handleOpen = () => {
    setOpen(true); setHasNew(false); setBubble(null);
    initChat();
    setTimeout(() => inputRef.current?.focus(), 300);
  };

  const send = async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput("");

    const userMsg: Msg = { id: Date.now().toString(), role: "user", text: msg };
    const allMessages = [...messages, userMsg];
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    const assistantId = (Date.now() + 1).toString();

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: allMessages.map(m => ({ role: m.role, content: m.text })),
          context: { page: "admin" },
        }),
      });

      if (!res.body) throw new Error("No stream");

      setMessages(prev => [...prev, { id: assistantId, role: "assistant", text: "", streaming: true }]);
      setLoading(false);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let rawText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        rawText += decoder.decode(value, { stream: true });
        const displayText = rawText
          .replace(/\n__ARAY_META__[\s\S]*$/, "")
          .replace(/__ARAY_ERR__[\s\S]*$/, "");
        setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, text: displayText } : m));
      }

      const isError = rawText.includes("__ARAY_ERR__");
      const errMatch = rawText.match(/__ARAY_ERR__(.+)$/);
      const cleanText = isError
        ? (errMatch?.[1] || "Что-то пошло не так 🙏")
        : rawText.replace(/\n__ARAY_META__[\s\S]*$/, "").trim();

      const { text: finalText } = parseActions(cleanText);
      setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, text: finalText, streaming: false } : m));
      if (!open) setHasNew(true);

    } catch {
      setMessages(prev => {
        const has = prev.some(m => m.id === assistantId);
        if (has) return prev.map(m => m.id === assistantId ? { ...m, text: "Нет связи 🙏", streaming: false } : m);
        return [...prev, { id: assistantId, role: "assistant", text: "Нет связи 🙏" }];
      });
    } finally {
      setLoading(false);
    }
  };

  // Стиль жидкого стекла
  const glass: React.CSSProperties = {
    background: "linear-gradient(135deg, rgba(232,112,10,0.06) 0%, rgba(8,12,28,0.82) 60%)",
    backdropFilter: "blur(40px) saturate(200%) brightness(0.9)",
    WebkitBackdropFilter: "blur(40px) saturate(200%) brightness(0.9)",
    border: "1px solid rgba(255,255,255,0.13)",
    boxShadow: "0 32px 80px rgba(0,0,0,0.55), 0 1px 0 rgba(255,255,255,0.10) inset, 0 -1px 0 rgba(0,0,0,0.20) inset",
  };

  return (
    <>
      {/* ── Кнопка в сайдбаре ── */}
      <div className="relative flex flex-col items-center px-3 pb-3 shrink-0">
        {/* Проактивный пузырь */}
        <AnimatePresence>
          {bubble && !open && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.90 }}
              className="absolute bottom-full mb-2 left-0 right-0 mx-2 z-50 cursor-pointer"
              onClick={handleOpen}
            >
              <div className="rounded-2xl px-3 py-2.5 text-[11px] leading-snug text-white/85"
                style={{
                  background: "rgba(8,12,28,0.92)",
                  border: "1px solid rgba(255,255,255,0.14)",
                  boxShadow: "0 8px 28px rgba(0,0,0,0.45)",
                  backdropFilter: "blur(20px)",
                }}>
                {bubble}
                <div className="absolute -bottom-1.5 left-6 w-2.5 h-2.5 rotate-45"
                  style={{ background: "rgba(8,12,28,0.92)", borderRight: "1px solid rgba(255,255,255,0.14)", borderBottom: "1px solid rgba(255,255,255,0.14)" }} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Шар + метка */}
        <motion.button
          onClick={handleOpen}
          whileHover={{ scale: 1.04, y: -2 }}
          whileTap={{ scale: 0.94 }}
          transition={{ type: "spring", stiffness: 420, damping: 22 }}
          className="relative w-full flex items-center gap-2.5 px-3 py-2 rounded-xl focus:outline-none"
          style={{
            background: open ? "rgba(232,112,10,0.12)" : "rgba(255,255,255,0.04)",
            border: `1px solid ${open ? "rgba(232,112,10,0.25)" : "rgba(255,255,255,0.08)"}`,
            transition: "background 0.2s, border-color 0.2s",
          }}
        >
          {/* Шар с анимацией */}
          <div className="shrink-0" style={{ animation: "adminArayFloat 3.5s ease-in-out infinite" }}>
            <svg width="38" height="38" viewBox="0 0 100 100" style={{ display: "block" }}>
              <defs>
                <radialGradient id="aaib-base" cx="34%" cy="28%" r="70%">
                  <stop offset="0%" stopColor="#fffbe0"/>
                  <stop offset="10%" stopColor="#ffca40"/>
                  <stop offset="28%" stopColor="#f07800"/>
                  <stop offset="52%" stopColor="#c05000"/>
                  <stop offset="75%" stopColor="#6e1c00"/>
                  <stop offset="100%" stopColor="#160300"/>
                </radialGradient>
                <radialGradient id="aaib-dark" cx="72%" cy="74%" r="52%">
                  <stop offset="0%" stopColor="#050000" stopOpacity="0.75"/>
                  <stop offset="100%" stopColor="#050000" stopOpacity="0"/>
                </radialGradient>
                <radialGradient id="aaib-hl" cx="30%" cy="25%" r="34%">
                  <stop offset="0%" stopColor="white" stopOpacity="0.85"/>
                  <stop offset="100%" stopColor="white" stopOpacity="0"/>
                </radialGradient>
                <radialGradient id="aaib-rim" cx="50%" cy="50%" r="50%">
                  <stop offset="76%" stopColor="transparent" stopOpacity="0"/>
                  <stop offset="100%" stopColor="#ffcc00" stopOpacity="0.55"/>
                </radialGradient>
                <clipPath id="aaib-clip"><circle cx="50" cy="50" r="46"/></clipPath>
              </defs>
              <circle cx="50" cy="50" r="46" fill="url(#aaib-base)"
                style={{ filter: "drop-shadow(0 2px 8px rgba(200,80,0,0.5))" }}/>
              <circle cx="50" cy="50" r="46" fill="url(#aaib-dark)"/>
              <circle cx="50" cy="50" r="46" fill="url(#aaib-rim)"/>
              <g clipPath="url(#aaib-clip)">
                <ellipse cx="50" cy="50" rx="28" ry="10" fill="white" opacity="0.12">
                  <animateTransform attributeName="transform" type="rotate"
                    from="0 50 50" to="360 50 50" dur="9s" repeatCount="indefinite"/>
                </ellipse>
              </g>
              <circle cx="50" cy="50" r="46" fill="url(#aaib-hl)"/>
              <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(255,200,60,0.20)" strokeWidth="1">
                <animate attributeName="stroke-opacity" values="0.20;0.45;0.20" dur="3s" repeatCount="indefinite"/>
              </circle>
            </svg>
          </div>

          <div className="flex-1 min-w-0 text-left">
            <div className="flex items-center gap-1.5">
              <p className="text-[11px] font-bold text-white/85 leading-none">АРАЙ</p>
              <span className="text-[8px] px-1 py-0.5 rounded-full font-medium"
                style={{ background: "hsl(var(--primary)/0.15)", color: "hsl(var(--primary))", border: "1px solid hsl(var(--primary)/0.25)" }}>
                4.6
              </span>
            </div>
            <p className="text-[9px] text-white/38 mt-0.5 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse"/>
              всегда рядом
            </p>
          </div>

          {hasNew && !open && (
            <span className="w-2 h-2 rounded-full shrink-0 animate-pulse"
              style={{ background: "hsl(var(--primary))" }}/>
          )}
        </motion.button>
      </div>

      {/* ── Чат-попап ── */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-[200]"
              style={{ background: "rgba(0,0,0,0.15)", backdropFilter: "blur(2px)" }}
              onClick={() => setOpen(false)}
            />

            {/* Панель */}
            <motion.div
              initial={{ opacity: 0, x: -16, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -16, scale: 0.96 }}
              transition={{ type: "spring", damping: 28, stiffness: 360 }}
              className="fixed z-[201] flex flex-col"
              style={{
                left: "252px",
                bottom: "16px",
                width: "340px",
                height: "520px",
                borderRadius: "22px",
                ...glass,
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* ── Шапка ── */}
              <div className="flex items-center gap-3 px-4 py-3.5 shrink-0"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ animation: "adminArayFloat 3.5s ease-in-out infinite", flexShrink: 0 }}>
                  <svg width="36" height="36" viewBox="0 0 100 100" style={{ display: "block", filter: "drop-shadow(0 2px 8px rgba(200,80,0,0.5))" }}>
                    <defs>
                      <radialGradient id="aah-base" cx="34%" cy="28%" r="70%">
                        <stop offset="0%" stopColor="#fffbe0"/>
                        <stop offset="28%" stopColor="#f07800"/>
                        <stop offset="75%" stopColor="#6e1c00"/>
                        <stop offset="100%" stopColor="#160300"/>
                      </radialGradient>
                      <radialGradient id="aah-hl" cx="30%" cy="25%" r="34%">
                        <stop offset="0%" stopColor="white" stopOpacity="0.85"/>
                        <stop offset="100%" stopColor="white" stopOpacity="0"/>
                      </radialGradient>
                    </defs>
                    <circle cx="50" cy="50" r="46" fill="url(#aah-base)"/>
                    <circle cx="50" cy="50" r="46" fill="url(#aah-hl)"/>
                  </svg>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-white leading-none">Арай</p>
                    <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full font-semibold"
                      style={{ background: "rgba(232,112,10,0.15)", color: "hsl(var(--primary))", border: "1px solid rgba(232,112,10,0.25)" }}>
                      <Zap className="w-2.5 h-2.5"/>
                      Sonnet 4.6
                    </span>
                  </div>
                  <p className="text-[10px] text-white/40 mt-0.5 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse"/>
                    Бизнес-ассистент · помнит всё
                  </p>
                </div>

                <div className="flex gap-1">
                  <button
                    onClick={() => { setMessages([]); setTimeout(initChat, 50); }}
                    className="w-7 h-7 rounded-xl flex items-center justify-center transition-colors hover:bg-white/10"
                    title="Новый чат"
                  >
                    <RotateCcw className="w-3 h-3 text-white/40"/>
                  </button>
                  <button
                    onClick={() => setOpen(false)}
                    className="w-7 h-7 rounded-xl flex items-center justify-center transition-colors hover:bg-white/10"
                  >
                    <X className="w-3.5 h-3.5 text-white/40"/>
                  </button>
                </div>
              </div>

              {/* ── Сообщения ── */}
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scrollbar-hide">
                {messages.map(m => (
                  <Bubble key={m.id} msg={m} onSpeak={speak} speaking={speaking}/>
                ))}
                {loading && (
                  <div className="flex gap-2">
                    <ArayIconSmall/>
                    <div className="px-3 py-2.5 rounded-2xl rounded-tl-[4px]"
                      style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.10)" }}>
                      <span className="inline-flex gap-1 items-center">
                        {[0,1,2].map(i => (
                          <span key={i} className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-bounce"
                            style={{ animationDelay: `${i*150}ms` }}/>
                        ))}
                      </span>
                    </div>
                  </div>
                )}
                <div ref={bottomRef}/>
              </div>

              {/* ── Быстрые вопросы ── */}
              {messages.length <= 1 && !loading && (
                <div className="px-4 pb-2 flex gap-1.5 flex-wrap shrink-0">
                  {QUICK_ADMIN.map(q => (
                    <button key={q} onClick={() => send(q)}
                      className="text-[10px] px-2.5 py-1 rounded-full transition-all active:scale-95"
                      style={{
                        background: "hsl(var(--primary)/0.10)",
                        border: "1px solid hsl(var(--primary)/0.22)",
                        color: "hsl(var(--primary))",
                      }}>
                      {q}
                    </button>
                  ))}
                </div>
              )}

              {/* ── Ввод — жидкое стекло ── */}
              <div className="px-3 pb-3 pt-2 shrink-0"
                style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="flex items-end gap-2 rounded-2xl px-3 py-2"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.12)",
                  }}>
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={e => { setInput(e.target.value); e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 96) + "px"; }}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                    placeholder="Спроси Арая..."
                    rows={1}
                    className="flex-1 text-[12px] focus:outline-none resize-none bg-transparent leading-relaxed"
                    style={{ color: "rgba(255,255,255,0.90)", maxHeight: "96px", minHeight: "20px" }}
                  />

                  <div className="flex items-center gap-1.5 shrink-0 pb-0.5">
                    {/* Модель */}
                    <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full hidden sm:block"
                      style={{ background: "rgba(232,112,10,0.12)", color: "hsl(var(--primary)/0.7)", border: "1px solid rgba(232,112,10,0.18)" }}>
                      4.6
                    </span>

                    {/* Микрофон */}
                    <button
                      onClick={listening ? stopMic : startMic}
                      className="w-7 h-7 rounded-xl flex items-center justify-center transition-all"
                      style={{
                        background: listening ? "hsl(var(--primary)/0.20)" : "rgba(255,255,255,0.06)",
                        border: `1px solid ${listening ? "hsl(var(--primary)/0.40)" : "rgba(255,255,255,0.10)"}`,
                        color: listening ? "hsl(var(--primary))" : "rgba(255,255,255,0.40)",
                      }}
                      title={listening ? "Остановить" : "Голосовой ввод"}
                    >
                      {listening
                        ? <MicOff className="w-3 h-3"/>
                        : <Mic className="w-3 h-3"/>}
                    </button>

                    {/* Отправить */}
                    <button
                      onClick={() => send()}
                      disabled={loading || !input.trim()}
                      className="w-7 h-7 rounded-xl flex items-center justify-center transition-all disabled:opacity-30 active:scale-90"
                      style={{
                        background: input.trim()
                          ? "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary)/0.75))"
                          : "rgba(255,255,255,0.07)",
                        border: "1px solid rgba(255,255,255,0.10)",
                      }}
                    >
                      {loading
                        ? <Loader2 className="w-3 h-3 animate-spin text-white/50"/>
                        : <Send className="w-3 h-3" style={{ color: input.trim() ? "#fff" : "rgba(255,255,255,0.35)" }}/>
                      }
                    </button>
                  </div>
                </div>

                {/* Подпись */}
                <p className="text-center text-[9px] mt-1.5"
                  style={{ color: "rgba(255,255,255,0.18)" }}>
                  Арай помнит каждый разговор · <span style={{ color: "hsl(var(--primary)/0.5)" }}>ARAY PRODUCTIONS</span>
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <style jsx global>{`
        @keyframes adminArayFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-4px); }
        }
      `}</style>
    </>
  );
}
