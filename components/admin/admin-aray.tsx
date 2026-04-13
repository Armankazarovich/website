"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Send, Mic, MicOff, Volume2, VolumeX, RotateCcw,
  X, Keyboard, Globe, ExternalLink, Sparkles,
} from "lucide-react";

// ─── Page context for smart chips ───────────────────────────────────────────
const PAGE_CHIPS: Record<string, string[]> = {
  "/admin": ["Сводка за сегодня", "Новые заказы", "Выручка за неделю"],
  "/admin/orders": ["Новые заказы", "Ждут подтверждения", "Заказы за сегодня"],
  "/admin/products": ["Что не в наличии?", "Топ продаж", "Актуальные цены"],
  "/admin/clients": ["Новые клиенты", "Постоянные покупатели", "Лучший клиент"],
  "/admin/delivery": ["Активные доставки", "Задержки", "Маршруты сегодня"],
  "/admin/staff": ["Кто в команде?", "Активность сотрудников"],
};
const DEFAULT_CHIPS = ["Сводка за сегодня", "Новые заказы", "Что срочно?"];

function getChips(pathname: string): string[] {
  if (PAGE_CHIPS[pathname]) return PAGE_CHIPS[pathname];
  const match = Object.keys(PAGE_CHIPS)
    .filter(k => k !== "/admin" && pathname.startsWith(k))
    .sort((a, b) => b.length - a.length)[0];
  return match ? PAGE_CHIPS[match] : DEFAULT_CHIPS;
}

// ─── Types ──────────────────────────────────────────────────────────────────
type Msg = { id: string; role: "user" | "assistant"; text: string; streaming?: boolean };

// ─── Clean ARAY meta/commands from response ─────────────────────────────────
function cleanResponse(raw: string): string {
  return raw
    .replace(/\n?__ARAY_META__[\s\S]*$/, "")
    .replace(/__ARAY_ERR__/, "")
    .replace(/__ARAY_SHOW_URL:.+?:.+?__/g, "")
    .replace(/__ARAY_NAVIGATE:.+?__/g, "")
    .replace(/ARAY_ACTIONS:\[[\s\S]*?\]/g, "")
    .trim();
}

// ─── Simple markdown rendering ──────────────────────────────────────────────
function MdText({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        if (!line.trim()) return null;

        // Bold
        const parts = line.split(/(\*\*[^*]+\*\*)/g).map((p, j) =>
          p.startsWith("**") && p.endsWith("**")
            ? <strong key={j} className="font-semibold">{p.slice(2, -2)}</strong>
            : p
        );

        // Bullet
        if (/^[\-\*]\s/.test(line.trim())) {
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

// ─── Push-to-talk microphone (tap to start, auto-stops on silence) ──────────
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
    return new Promise((resolve) => {
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SR) { resolve(""); return; }
      if (recRef.current) { try { recRef.current.stop(); } catch {} }

      const r = new SR();
      r.lang = "ru-RU";
      r.interimResults = false;
      r.continuous = false;
      let resolved = false;

      r.onstart = () => setActive(true);
      r.onend = () => { setActive(false); recRef.current = null; if (!resolved) { resolved = true; resolve(""); } };
      r.onerror = () => { setActive(false); recRef.current = null; if (!resolved) { resolved = true; resolve(""); } };
      r.onresult = (e: any) => {
        const text = e.results[0]?.[0]?.transcript?.trim() || "";
        if (!resolved) { resolved = true; resolve(text); }
      };

      try { r.start(); recRef.current = r; }
      catch { setActive(false); if (!resolved) { resolved = true; resolve(""); } }
    });
  }, []);

  const cancel = useCallback(() => {
    if (recRef.current) { try { recRef.current.stop(); } catch {} recRef.current = null; }
    setActive(false);
  }, []);

  return { active, supported, listen, cancel };
}

// ─── TTS: browser voices (stable everywhere) + ElevenLabs upgrade ───────────
function useTTS() {
  const [speaking, setSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stop = useCallback(() => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    setSpeaking(false);
  }, []);

  const speak = useCallback(async (text: string) => {
    stop();
    const clean = text
      .replace(/\*\*(.*?)\*\*/g, "$1").replace(/\*(.*?)\*/g, "$1")
      .replace(/[#_`|]/g, " ").replace(/[\u{1F000}-\u{1FFFF}]/gu, "")
      .replace(/\s{2,}/g, " ").trim();
    if (!clean) return;
    setSpeaking(true);

    // Try ElevenLabs first (server-side, no VPN needed)
    try {
      const res = await fetch("/api/ai/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: clean }),
      });
      if (res.ok && !(res.headers.get("content-type") || "").includes("json")) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => { URL.revokeObjectURL(url); setSpeaking(false); audioRef.current = null; };
        audio.onerror = () => { URL.revokeObjectURL(url); setSpeaking(false); audioRef.current = null; };
        await audio.play().catch(() => {});
        return;
      }
    } catch {}

    // Fallback: browser TTS (works everywhere, no API needed)
    if (typeof window !== "undefined" && window.speechSynthesis) {
      const utter = new SpeechSynthesisUtterance(clean);
      utter.lang = "ru-RU";
      utter.rate = 1.05;
      const voices = window.speechSynthesis.getVoices();
      const ruVoice = voices.find(v => v.lang.startsWith("ru") && v.name.includes("Natural"))
        || voices.find(v => v.lang.startsWith("ru") && v.name.includes("Microsoft"))
        || voices.find(v => v.lang.startsWith("ru"));
      if (ruVoice) utter.voice = ruVoice;
      utter.onend = () => setSpeaking(false);
      utter.onerror = () => setSpeaking(false);
      window.speechSynthesis.speak(utter);
    } else {
      setSpeaking(false);
    }
  }, [stop]);

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
  const [autoVoice, setAutoVoice] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { speaking, speak, stop: stopTTS } = useTTS();
  const { active: micActive, supported: micOk, listen: micListen, cancel: micCancel } = useMic();

  // Load auto-voice preference
  useEffect(() => { setAutoVoice(localStorage.getItem("aray-auto-voice") === "1"); }, []);

  // Auto-scroll
  useEffect(() => {
    if (open) setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 60);
  }, [messages, open]);

  // Welcome message
  useEffect(() => {
    if (open && messages.length === 0) {
      const h = new Date().getHours();
      const gr = h < 6 ? "Не спишь?" : h < 12 ? "Доброе утро" : h < 17 ? "Привет" : h < 22 ? "Добрый вечер" : "Поздновато";
      const name = staffName !== "Коллега" ? `, ${staffName}` : "";
      setMessages([{ id: "w", role: "assistant", text: `${gr}${name}! Чем помочь?` }]);
    }
  }, [open, messages.length, staffName]);

  // External events
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

      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status}`);
      }

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
      if (autoVoice && final) speak(final);

      // Handle navigation commands
      const navMatch = raw.match(/__ARAY_NAVIGATE:(.+?)__/);
      if (navMatch) router.push(navMatch[1]);

    } catch (err) {
      setMessages(prev => prev.map(m => m.id === aid
        ? { ...m, text: "Не удалось связаться с сервером. Проверь интернет и попробуй ещё раз.", streaming: false }
        : m
      ));
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, loading, open, pathname, autoVoice, speak, router]);

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
    const next = !autoVoice;
    setAutoVoice(next);
    localStorage.setItem("aray-auto-voice", next ? "1" : "0");
    if (!next) stopTTS();
  };

  // ═══ RENDER ═══════════════════════════════════════════════════════════════
  return (
    <>
      {/* ── FLOATING BUTTON ── */}
      <motion.button
        onClick={() => { setOpen(v => !v); if (!open) setTimeout(() => inputRef.current?.focus(), 200); }}
        className="fixed z-[30] right-4 bottom-4 w-14 h-14 rounded-full flex items-center justify-center shadow-xl"
        style={{
          background: "linear-gradient(135deg, #ff8800, #ff6600, #ee4400)",
          boxShadow: open
            ? "0 4px 20px rgba(255,100,0,0.3)"
            : "0 4px 24px rgba(255,100,0,0.5), 0 0 60px rgba(255,130,0,0.15)",
        }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        title="Арай — AI ассистент"
      >
        {/* Pulse ring when idle */}
        {!open && !loading && (
          <motion.span className="absolute inset-0 rounded-full"
            style={{ background: "rgba(255,120,0,0.4)" }}
            animate={{ scale: [1, 1.4], opacity: [0.5, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}/>
        )}

        {/* Loading spinner ring */}
        {loading && (
          <motion.span className="absolute inset-[-3px] rounded-full border-2 border-t-transparent border-white/50"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}/>
        )}

        <AnimatePresence mode="wait">
          {open ? (
            <motion.span key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
              <X className="w-6 h-6 text-white"/>
            </motion.span>
          ) : (
            <motion.span key="sun" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }}>
              <Sparkles className="w-6 h-6 text-white"/>
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
            className="fixed z-[29] right-4 bottom-[84px] flex flex-col rounded-2xl overflow-hidden shadow-2xl"
            style={{
              width: "min(400px, calc(100vw - 32px))",
              height: "min(540px, calc(100vh - 120px))",
              background: "hsl(var(--background))",
              border: "1px solid hsl(var(--border))",
              boxShadow: "0 20px 60px rgba(0,0,0,0.25), 0 0 0 1px hsl(var(--border)/0.5)",
            }}
          >
            {/* ─ Header ─ */}
            <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: "hsl(var(--border))" }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                style={{ background: "linear-gradient(135deg, #ff8800, #ee5500)" }}>
                <Sparkles className="w-4 h-4 text-white"/>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-foreground">Арай</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400"/>
                  <span className="text-[10px] text-muted-foreground">AI ассистент</span>
                </div>
              </div>
              <button onClick={() => { setMessages([]); }} className="p-1.5 rounded-lg hover:bg-muted transition-colors" title="Новый чат">
                <RotateCcw className="w-3.5 h-3.5 text-muted-foreground"/>
              </button>
              <button onClick={toggleVoice} className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                title={autoVoice ? "Голос ВКЛ" : "Голос ВЫКЛ"}>
                {autoVoice
                  ? <Volume2 className="w-3.5 h-3.5 text-primary"/>
                  : <VolumeX className="w-3.5 h-3.5 text-muted-foreground"/>}
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
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-[13.5px] leading-relaxed ${
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
                      className="px-3 py-1.5 text-[12px] rounded-full bg-muted hover:bg-muted/80 text-foreground border border-border transition-colors">
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
                  className="self-start flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                  {speaking ? <><VolumeX className="w-3 h-3"/> остановить</> : <><Volume2 className="w-3 h-3"/> озвучить</>}
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
                    className={`shrink-0 p-2.5 rounded-xl transition-all ${
                      micActive
                        ? "bg-primary text-white"
                        : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"
                    }`}
                    title={micActive ? "Остановить" : "Голосовой ввод"}>
                    {micActive ? <MicOff className="w-4 h-4"/> : <Mic className="w-4 h-4"/>}
                  </button>
                )}

                {/* Text input */}
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="Напиши сообщение..."
                  rows={1}
                  className="flex-1 resize-none text-[13.5px] leading-relaxed outline-none px-3 py-2.5 rounded-xl bg-muted text-foreground border border-border focus:border-primary/50 transition-colors"
                  style={{ maxHeight: 80, fontFamily: "inherit" }}
                  onInput={e => { const t = e.currentTarget; t.style.height = "auto"; t.style.height = Math.min(t.scrollHeight, 80) + "px"; }}
                />

                {/* Send */}
                <button onClick={() => sendMessage(input)}
                  disabled={!input.trim() || loading}
                  className={`shrink-0 p-2.5 rounded-xl transition-all ${
                    input.trim() && !loading
                      ? "bg-primary text-white hover:bg-primary/90"
                      : "bg-muted text-muted-foreground"
                  }`}
                  title="Отправить (Enter)">
                  <Send className="w-4 h-4"/>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
