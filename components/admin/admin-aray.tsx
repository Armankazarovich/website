"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Send, Mic, MicOff, Volume2, VolumeX, RotateCcw, ChevronDown, ChevronUp } from "lucide-react";

// ─── Типы ─────────────────────────────────────────────────────────────────────

type Msg = {
  id: string;
  role: "user" | "assistant";
  text: string;
  streaming?: boolean;
};

function parseActions(raw: string) {
  const idx = raw.indexOf("ARAY_ACTIONS:");
  return { text: idx === -1 ? raw : raw.slice(0, idx).trim() };
}

// ─── Голосовой ввод ───────────────────────────────────────────────────────────

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
    r.lang = "ru-RU";
    r.interimResults = false;
    r.continuous = false;
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

// ─── Маленький шар ────────────────────────────────────────────────────────────

function ArayOrb({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ display: "block", flexShrink: 0 }}>
      <defs>
        <radialGradient id="ao-base" cx="34%" cy="28%" r="70%">
          <stop offset="0%" stopColor="#fffbe0"/>
          <stop offset="10%" stopColor="#ffca40"/>
          <stop offset="28%" stopColor="#f07800"/>
          <stop offset="52%" stopColor="#c05000"/>
          <stop offset="75%" stopColor="#6e1c00"/>
          <stop offset="100%" stopColor="#160300"/>
        </radialGradient>
        <radialGradient id="ao-dark" cx="72%" cy="74%" r="52%">
          <stop offset="0%" stopColor="#050000" stopOpacity="0.75"/>
          <stop offset="100%" stopColor="#050000" stopOpacity="0"/>
        </radialGradient>
        <radialGradient id="ao-hl" cx="30%" cy="25%" r="34%">
          <stop offset="0%" stopColor="white" stopOpacity="0.85"/>
          <stop offset="100%" stopColor="white" stopOpacity="0"/>
        </radialGradient>
        <radialGradient id="ao-rim" cx="50%" cy="50%" r="50%">
          <stop offset="76%" stopColor="transparent" stopOpacity="0"/>
          <stop offset="100%" stopColor="#ffcc00" stopOpacity="0.55"/>
        </radialGradient>
        <clipPath id="ao-clip"><circle cx="50" cy="50" r="46"/></clipPath>
      </defs>
      <circle cx="50" cy="50" r="46" fill="url(#ao-base)"
        style={{ filter: "drop-shadow(0 2px 8px rgba(200,80,0,0.5))" }}/>
      <circle cx="50" cy="50" r="46" fill="url(#ao-dark)"/>
      <circle cx="50" cy="50" r="46" fill="url(#ao-rim)"/>
      <g clipPath="url(#ao-clip)">
        <ellipse cx="50" cy="50" rx="28" ry="10" fill="white" opacity="0.14">
          <animateTransform attributeName="transform" type="rotate"
            from="0 50 50" to="360 50 50" dur="9s" repeatCount="indefinite"/>
        </ellipse>
      </g>
      <circle cx="50" cy="50" r="46" fill="url(#ao-hl)"/>
      <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(255,200,60,0.22)" strokeWidth="1">
        <animate attributeName="stroke-opacity" values="0.22;0.50;0.22" dur="3s" repeatCount="indefinite"/>
      </circle>
    </svg>
  );
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
    <div className={`flex gap-2.5 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      {!isUser && <div className="shrink-0 mt-0.5"><ArayOrb size={22} /></div>}
      <div className="flex flex-col gap-1 max-w-[80%]">
        <div className="px-3.5 py-2.5 text-[13px] leading-relaxed"
          style={isUser ? {
            background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary)/0.80))",
            color: "#fff",
            borderRadius: "16px 16px 4px 16px",
            boxShadow: "0 2px 12px hsl(var(--primary)/0.30)",
          } : {
            background: "rgba(255,255,255,0.09)",
            color: "rgba(255,255,255,0.93)",
            borderRadius: "16px 16px 16px 4px",
            border: "1px solid rgba(255,255,255,0.12)",
          }}>
          {msg.text
            ? msg.text.split("\n").map((line, i, arr) => (
                <span key={i}>{line}{i < arr.length - 1 && <br />}</span>
              ))
            : !isUser && msg.streaming
            ? <span className="inline-flex gap-1.5 items-center py-0.5">
                {[0, 1, 2].map(i => (
                  <span key={i} className="w-2 h-2 rounded-full bg-orange-400 animate-bounce"
                    style={{ animationDelay: `${i * 160}ms` }} />
                ))}
              </span>
            : null
          }
          {msg.streaming && msg.text && (
            <span className="inline-block w-0.5 h-3.5 bg-orange-400 ml-0.5 align-middle animate-pulse" />
          )}
        </div>
        {!isUser && !msg.streaming && msg.text && onSpeak && (
          <button onClick={() => onSpeak(msg.text, msg.id)}
            className="self-start flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] transition-all hover:opacity-80"
            style={{ color: isSpeaking ? "hsl(var(--primary))" : "rgba(255,255,255,0.35)" }}>
            {isSpeaking ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
            {isSpeaking ? "стоп" : "озвучить"}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Быстрые вопросы ──────────────────────────────────────────────────────────

const QUICK = [
  "Сколько заказов сегодня?",
  "Покажи сводку",
  "Как добавить товар?",
  "Что с доставкой?",
];

// ─── Главный компонент ────────────────────────────────────────────────────────

export function AdminAray({ staffName = "Коллега" }: { staffName?: string }) {
  const [expanded, setExpanded] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { speaking, speak } = useTTS();

  // send нужен до useVoice
  const sendRef = useRef<(text?: string) => Promise<void>>();

  const addInput = useCallback((t: string) => {
    setInput(t);
    if (!expanded) setExpanded(true);
  }, [expanded]);

  const autoSend = useCallback(() => {
    sendRef.current?.();
  }, []);

  const { listening, supported, start: startMic, stop: stopMic } = useVoice(addInput, autoSend);

  // Приветствие
  useEffect(() => {
    if (expanded && messages.length === 0) {
      const h = new Date().getHours();
      const time = h < 12 ? "Доброе утро" : h < 17 ? "Добрый день" : "Добрый вечер";
      setMessages([{
        id: "welcome", role: "assistant",
        text: `${time}, ${staffName}! 👋 Я Арай — твой ассистент. Заказы, товары, аналитика — спрашивай.`,
      }]);
    }
  }, [expanded, messages.length, staffName]);

  useEffect(() => {
    if (expanded) setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 60);
  }, [messages, expanded]);

  // Открыть по событию от мобильного nav
  useEffect(() => {
    const handler = () => { setExpanded(true); setTimeout(() => inputRef.current?.focus(), 300); };
    window.addEventListener("aray:open", handler);
    return () => window.removeEventListener("aray:open", handler);
  }, []);

  const send = useCallback(async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput("");

    const userMsg: Msg = { id: Date.now().toString(), role: "user", text: msg };
    const allMsgs = [...messages, userMsg];
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    const assistantId = (Date.now() + 1).toString();

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: allMsgs.map(m => ({ role: m.role, content: m.text })),
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

    } catch {
      setMessages(prev => {
        const has = prev.some(m => m.id === assistantId);
        if (has) return prev.map(m => m.id === assistantId ? { ...m, text: "Нет связи 🙏", streaming: false } : m);
        return [...prev, { id: assistantId, role: "assistant", text: "Нет связи 🙏" }];
      });
    } finally {
      setLoading(false);
    }
  }, [input, messages, loading]);

  // Регистрируем send в ref для голоса
  useEffect(() => { sendRef.current = send; }, [send]);

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  // Стиль — как раздел сайдбара, тёмный непрозрачный
  const panelBg: React.CSSProperties = {
    background: "rgba(8, 12, 30, 0.94)",
    backdropFilter: "blur(32px) saturate(180%)",
    WebkitBackdropFilter: "blur(32px) saturate(180%)",
    borderTop: "1px solid rgba(255,255,255,0.10)",
  };

  const chatBg: React.CSSProperties = {
    background: "rgba(5, 8, 22, 0.60)",
  };

  return (
    <>
      {/* ── Основная панель — фиксирована снизу, правее сайдбара ── */}
      <div
        className="fixed bottom-0 left-0 right-0 lg:left-60 z-[150]"
        style={panelBg}
      >
        {/* ── Чат-область (раскрывается вверх) ── */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 340, opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: "spring", damping: 32, stiffness: 320 }}
              className="overflow-hidden"
              style={chatBg}
            >
              {/* Шапка чата */}
              <div className="flex items-center gap-3 px-4 py-2.5"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                <ArayOrb size={28} />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-bold text-white/92">Арай</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"/>
                    <span className="text-[11px] text-white/40">Бизнес-ассистент</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setMessages([])}
                    className="p-1.5 rounded-lg text-white/30 hover:text-white/65 hover:bg-white/[0.07] transition-all"
                    title="Очистить">
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setExpanded(false)}
                    className="p-1.5 rounded-lg text-white/30 hover:text-white/65 hover:bg-white/[0.07] transition-all"
                    title="Свернуть">
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Сообщения */}
              <div
                className="flex flex-col gap-3 px-4 py-3 overflow-y-auto"
                style={{ height: "calc(340px - 48px)" }}
              >
                {messages.map(msg => (
                  <Bubble key={msg.id} msg={msg} onSpeak={speak} speaking={speaking} />
                ))}

                {/* Быстрые вопросы — только после приветствия */}
                {messages.length === 1 && !loading && (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {QUICK.map(q => (
                      <button key={q} onClick={() => send(q)}
                        className="px-3 py-1.5 rounded-xl text-[11px] font-medium transition-all hover:opacity-85 active:scale-95"
                        style={{
                          background: "rgba(255,255,255,0.07)",
                          border: "1px solid rgba(255,255,255,0.11)",
                          color: "rgba(255,255,255,0.72)",
                        }}>
                        {q}
                      </button>
                    ))}
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Строка ввода — всегда видна — КАК CLAUDE ── */}
        <div className="flex items-end gap-2.5 px-4 py-3"
          style={{ borderTop: expanded ? "1px solid rgba(255,255,255,0.06)" : "none" }}>

          {/* Шар + кнопка раскрыть/свернуть */}
          <button
            onClick={() => {
              setExpanded(v => !v);
              if (!expanded) setTimeout(() => inputRef.current?.focus(), 250);
            }}
            className="shrink-0 mb-0.5 relative transition-transform hover:scale-105 active:scale-95"
            style={{ WebkitTapHighlightColor: "transparent" }}
            title={expanded ? "Свернуть Арая" : "Открыть Арая"}>
            <ArayOrb size={34} />
            <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center"
              style={{ background: "rgba(8,12,30,0.95)", border: "1px solid rgba(255,255,255,0.15)" }}>
              {expanded
                ? <ChevronDown className="w-2 h-2 text-white/50" />
                : <ChevronUp className="w-2 h-2 text-white/50" />}
            </span>
          </button>

          {/* Поле ввода */}
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              onFocus={() => !expanded && setExpanded(true)}
              placeholder={listening ? "Слушаю..." : "Спроси Арая..."}
              rows={1}
              className="w-full resize-none bg-transparent text-white/88 placeholder-white/28 text-[13px] leading-relaxed outline-none py-1 pr-1"
              style={{ maxHeight: 100, fontFamily: "inherit" }}
              onInput={e => {
                const t = e.currentTarget;
                t.style.height = "auto";
                t.style.height = Math.min(t.scrollHeight, 100) + "px";
              }}
            />
          </div>

          {/* Кнопки */}
          <div className="flex items-center gap-1.5 shrink-0 mb-0.5">
            {/* Микрофон — только если браузер поддерживает */}
            {supported && (
              <button
                onClick={listening ? stopMic : startMic}
                className="p-2 rounded-xl transition-all"
                style={{
                  background: listening ? "hsl(var(--primary)/0.22)" : "rgba(255,255,255,0.07)",
                  color: listening ? "hsl(var(--primary))" : "rgba(255,255,255,0.50)",
                  border: `1.5px solid ${listening ? "hsl(var(--primary)/0.45)" : "rgba(255,255,255,0.10)"}`,
                  animation: listening ? "micPulse 1.2s ease-in-out infinite" : "none",
                }}>
                {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
            )}

            {/* Отправить */}
            <button
              onClick={() => send()}
              disabled={!input.trim() || loading}
              className="p-2 rounded-xl transition-all"
              style={{
                background: input.trim() && !loading
                  ? "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary)/0.80))"
                  : "rgba(255,255,255,0.07)",
                color: input.trim() && !loading ? "#fff" : "rgba(255,255,255,0.28)",
                border: "1.5px solid rgba(255,255,255,0.10)",
                boxShadow: input.trim() && !loading ? "0 2px 12px hsl(var(--primary)/0.35)" : "none",
              }}>
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Нижняя метка */}
        <div className="text-center pb-1.5 -mt-0.5">
          <span className="text-[9px] tracking-wide" style={{ color: "rgba(255,255,255,0.16)" }}>
            Арай помнит каждый разговор ·{" "}
            <span style={{ color: "hsl(var(--primary)/0.40)" }}>ARAY PRODUCTIONS</span>
          </span>
        </div>
      </div>

      <style>{`
        @keyframes micPulse {
          0%, 100% { box-shadow: 0 0 0 0 hsl(var(--primary)/0.4); }
          50% { box-shadow: 0 0 0 6px hsl(var(--primary)/0); }
        }
      `}</style>
    </>
  );
}
