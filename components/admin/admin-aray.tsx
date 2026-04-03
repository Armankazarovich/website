"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Send, Loader2, RotateCcw, ChevronRight, TrendingUp, ShoppingBag, Clock } from "lucide-react";

// ─── Персонаж ARAY ────────────────────────────────────────────────────────────
// Простой, чистый Android-стиль. Рубашка = цвет палитры.

function ArayCharacter({ size = 64, blinking = false, waving = false }: {
  size?: number;
  blinking?: boolean;
  waving?: boolean;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block", overflow: "visible" }}>
      <defs>
        <radialGradient id="ac-face" cx="45%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#ffe8cc" />
          <stop offset="100%" stopColor="#f5c89a" />
        </radialGradient>
        <radialGradient id="ac-shirt" cx="50%" cy="30%" r="70%">
          <stop offset="0%" stopColor="hsl(var(--primary) / 0.95)" />
          <stop offset="100%" stopColor="hsl(var(--primary) / 0.60)" />
        </radialGradient>
        <filter id="ac-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="rgba(0,0,0,0.22)" />
        </filter>
      </defs>

      {/* Тело / рубашка */}
      <rect x="18" y="36" width="28" height="24" rx="8" fill="url(#ac-shirt)" filter="url(#ac-shadow)" />
      {/* Воротник */}
      <path d="M26 36 L32 42 L38 36" stroke="rgba(255,255,255,0.50)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      {/* Пуговицы */}
      <circle cx="32" cy="46" r="1.2" fill="rgba(255,255,255,0.40)" />
      <circle cx="32" cy="50" r="1.2" fill="rgba(255,255,255,0.40)" />
      <circle cx="32" cy="54" r="1.2" fill="rgba(255,255,255,0.40)" />

      {/* Левая рука */}
      <g style={{ transformOrigin: "18px 42px", animation: waving ? "acWave 0.8s ease-in-out 2" : "none" }}>
        <rect x="9" y="38" width="10" height="9" rx="4.5" fill="url(#ac-shirt)" />
        {/* Кисть */}
        <circle cx="9" cy="44" r="4" fill="url(#ac-face)" />
      </g>

      {/* Правая рука */}
      <rect x="45" y="38" width="10" height="9" rx="4.5" fill="url(#ac-shirt)" />
      <circle cx="55" cy="44" r="4" fill="url(#ac-face)" />

      {/* Шея */}
      <rect x="27" y="31" width="10" height="8" rx="4" fill="url(#ac-face)" />

      {/* Голова */}
      <ellipse cx="32" cy="22" rx="14" ry="14" fill="url(#ac-face)" filter="url(#ac-shadow)" />

      {/* Волосы */}
      <path d="M18 20 Q18 8 32 8 Q46 8 46 20" fill="hsl(var(--primary) / 0.85)" />
      {/* Чёлка */}
      <path d="M21 16 Q26 12 32 13 Q38 12 43 16" stroke="hsl(var(--primary) / 0.60)" strokeWidth="2.5" fill="none" strokeLinecap="round" />

      {/* Глаза */}
      {blinking ? (
        <>
          <ellipse cx="26" cy="22" rx="2.5" ry="0.8" fill="#2d1a08" />
          <ellipse cx="38" cy="22" rx="2.5" ry="0.8" fill="#2d1a08" />
        </>
      ) : (
        <>
          <circle cx="26" cy="22" r="2.5" fill="#2d1a08" />
          <circle cx="38" cy="22" r="2.5" fill="#2d1a08" />
          {/* Блики */}
          <circle cx="27.2" cy="21" r="0.9" fill="white" />
          <circle cx="39.2" cy="21" r="0.9" fill="white" />
        </>
      )}

      {/* Улыбка */}
      <path d="M27 27 Q32 31 37 27" stroke="#c97c42" strokeWidth="1.8" fill="none" strokeLinecap="round" />

      {/* Ушки */}
      <ellipse cx="18" cy="22" rx="3" ry="4" fill="#f5c89a" />
      <ellipse cx="46" cy="22" rx="3" ry="4" fill="#f5c89a" />
      <ellipse cx="18" cy="22" rx="1.5" ry="2.5" fill="#e8a87a" />
      <ellipse cx="46" cy="22" rx="1.5" ry="2.5" fill="#e8a87a" />

      {/* Нашивка на рубашке */}
      <rect x="22" y="40" width="12" height="6" rx="2" fill="rgba(255,255,255,0.18)" />
      <text x="28" y="45" textAnchor="middle" fill="white" fontSize="3.5" fontWeight="700" fontFamily="system-ui">ARAY</text>

      <style>{`
        @keyframes acWave {
          0%, 100% { transform: rotate(0deg); }
          30% { transform: rotate(-25deg); }
          70% { transform: rotate(10deg); }
        }
      `}</style>
    </svg>
  );
}

// ─── Мини-инсайты ─────────────────────────────────────────────────────────────

type Insight = { icon: React.ReactNode; label: string; value: string };

function InsightPill({ icon, label, value }: Insight) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
      style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.10)" }}>
      <span style={{ color: "hsl(var(--primary))" }}>{icon}</span>
      <div>
        <p className="text-[9px] text-white/40 leading-none">{label}</p>
        <p className="text-[12px] font-semibold text-white leading-none mt-0.5">{value}</p>
      </div>
    </div>
  );
}

// ─── Чат ──────────────────────────────────────────────────────────────────────

type Msg = { id: string; role: "user" | "assistant"; text: string };

const TIPS = [
  "Привет! Я помогу разобраться с любым вопросом по системе 😊",
  "Нажми «Заказы» → «Новые» чтобы быстро найти свежие заявки",
  "Можешь спросить меня о выручке, клиентах или товарах — расскажу",
  "Устал? Напиши мне — поддержу 💪",
  "Для создания заказа — кнопка «Заказ по телефону» в разделе Заказы",
];

function pickTip() { return TIPS[Math.floor(Math.random() * TIPS.length)]; }

export function AdminAray({ staffName = "Коллега" }: { staffName?: string }) {
  const [open, setOpen] = useState(false);
  const [blink, setBlink] = useState(false);
  const [wave, setWave] = useState(false);
  const [bubble, setBubble] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [hasNew, setHasNew] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Анимация мигания глаз
  useEffect(() => {
    const interval = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 200);
    }, 3500 + Math.random() * 2000);
    return () => clearInterval(interval);
  }, []);

  // Проактивный пузырь через 15 секунд
  useEffect(() => {
    const t = setTimeout(() => {
      if (!open) {
        setBubble(pickTip());
        setHasNew(true);
        setTimeout(() => setBubble(null), 6000);
      }
    }, 15000);
    return () => clearTimeout(t);
  }, [open]);

  // Приветствие при открытии
  const initChat = useCallback(() => {
    if (messages.length > 0) return;
    const h = new Date().getHours();
    const time = h < 12 ? "Доброе утро" : h < 17 ? "Добрый день" : "Добрый вечер";
    setMessages([{
      id: "welcome",
      role: "assistant",
      text: `${time}, ${staffName}! 👋 Я ARAY — твой умный помощник. Спрашивай что угодно по системе, заказам или просто пообщаемся!`,
    }]);
  }, [messages.length, staffName]);

  // Загрузка инсайтов
  useEffect(() => {
    fetch("/api/admin/notifications/count")
      .then(r => r.json())
      .then(d => {
        setInsights([
          { icon: <ShoppingBag className="w-3.5 h-3.5" />, label: "Ждут обработки", value: String(d.newOrders ?? "—") },
          { icon: <Clock className="w-3.5 h-3.5" />, label: "Всего активных", value: String(d.total ?? "—") },
        ]);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleOpen = () => {
    setOpen(true);
    setHasNew(false);
    setBubble(null);
    setWave(true);
    setTimeout(() => setWave(false), 1000);
    initChat();
  };

  const send = async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput("");
    const userMsg: Msg = { id: Date.now().toString(), role: "user", text: msg };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/aray", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.text })),
        }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        text: data.message || "Не смог ответить, попробуй ещё раз.",
      }]);
    } catch {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        text: "Нет связи 🙏 Попробуй позже.",
      }]);
    } finally { setLoading(false); }
  };

  // Стекло панели
  const glass = {
    background: "linear-gradient(135deg, hsl(var(--primary) / 0.08) 0%, transparent 55%), rgba(8, 12, 28, 0.88)",
    backdropFilter: "blur(32px) saturate(180%)",
    WebkitBackdropFilter: "blur(32px) saturate(180%)",
    border: "1px solid rgba(255,255,255,0.12)",
    boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
  } as React.CSSProperties;

  const QUICK = ["Сколько новых заказов?", "Как создать заказ?", "Что с выручкой?", "Помогай!"];

  return (
    <>
      {/* ── Персонаж в сайдбаре ── */}
      <div className="relative flex flex-col items-center px-3 pb-3 shrink-0">
        {/* Пузырь */}
        <AnimatePresence>
          {bubble && !open && (
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              className="absolute bottom-full mb-2 left-0 right-0 mx-2 z-50"
            >
              <div className="rounded-xl px-3 py-2 text-[11px] leading-snug text-white/85 cursor-pointer"
                style={{
                  background: "rgba(8,12,28,0.90)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                }}
                onClick={handleOpen}>
                {bubble}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Кнопка-персонаж */}
        <motion.button
          onClick={handleOpen}
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.96 }}
          transition={{ type: "spring", stiffness: 400, damping: 22 }}
          className="relative focus:outline-none w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-colors"
          style={{
            background: open ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div style={{ animation: "arayFloat 3.5s ease-in-out infinite", flexShrink: 0 }}>
            <ArayCharacter size={40} blinking={blink} waving={wave} />
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-[11px] font-semibold text-white/80 leading-none">ARAY</p>
            <p className="text-[9px] text-white/40 mt-0.5 leading-none flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
              онлайн
            </p>
          </div>
          {hasNew && !open && (
            <span className="w-2 h-2 rounded-full shrink-0 animate-pulse"
              style={{ background: "hsl(var(--primary))" }} />
          )}
        </motion.button>
      </div>

      {/* ── Панель чата (попап) ── */}
      <AnimatePresence>
        {open && (
          <>
            {/* Оверлей */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-[45]"
              style={{ background: "rgba(0,0,0,0.20)" }}
              onClick={() => setOpen(false)}
            />

            {/* Панель */}
            <motion.div
              initial={{ opacity: 0, x: -20, scale: 0.97 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -20, scale: 0.97 }}
              transition={{ type: "spring", damping: 30, stiffness: 380 }}
              className="fixed z-[46] flex flex-col"
              style={{
                left: "248px",
                bottom: "16px",
                width: "320px",
                height: "480px",
                borderRadius: "20px",
                ...glass,
              }}
            >
              {/* Шапка с персонажем */}
              <div className="flex items-center gap-3 px-4 pt-4 pb-3 shrink-0"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ animation: "arayFloat 3.5s ease-in-out infinite", flexShrink: 0 }}>
                  <ArayCharacter size={44} waving={wave} blinking={blink} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white leading-none">ARAY</p>
                  <p className="text-[10px] text-white/45 mt-0.5 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
                    Бизнес-ассистент
                  </p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => { setMessages([]); initChat(); }}
                    className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors"
                    title="Новый чат">
                    <RotateCcw className="w-3 h-3 text-white/40" />
                  </button>
                  <button onClick={() => setOpen(false)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors">
                    <X className="w-3.5 h-3.5 text-white/40" />
                  </button>
                </div>
              </div>

              {/* Инсайты */}
              {insights.length > 0 && messages.length <= 1 && (
                <div className="px-4 pt-3 flex gap-2 shrink-0">
                  {insights.map((ins, i) => <InsightPill key={i} {...ins} />)}
                </div>
              )}

              {/* Сообщения */}
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                {messages.map(m => (
                  <div key={m.id} className={`flex gap-2 ${m.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                    {m.role === "assistant" && (
                      <div className="shrink-0 mt-0.5">
                        <ArayCharacter size={22} />
                      </div>
                    )}
                    <div
                      className="max-w-[78%] px-3 py-2 text-[12px] leading-relaxed"
                      style={m.role === "user" ? {
                        background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary)/0.7))",
                        color: "#fff",
                        borderRadius: "14px 14px 4px 14px",
                      } : {
                        background: "rgba(255,255,255,0.08)",
                        color: "rgba(255,255,255,0.88)",
                        borderRadius: "14px 14px 14px 4px",
                        border: "1px solid rgba(255,255,255,0.10)",
                      }}
                    >
                      {m.text.split("\n").map((line, i, arr) => (
                        <span key={i}>{line}{i < arr.length - 1 && <br />}</span>
                      ))}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex gap-2">
                    <ArayCharacter size={22} />
                    <div className="px-3 py-2.5 rounded-2xl rounded-tl-[4px]"
                      style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.10)" }}>
                      <div className="flex gap-1 items-center">
                        {[0, 1, 2].map(i => (
                          <span key={i} className="w-1.5 h-1.5 rounded-full"
                            style={{ background: "hsl(var(--primary))", animation: `aDot 1.4s ease-in-out ${i * 0.2}s infinite` }} />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Быстрые вопросы */}
              {messages.length <= 1 && !loading && (
                <div className="px-4 pb-2 flex gap-1.5 flex-wrap shrink-0">
                  {QUICK.map(q => (
                    <button key={q} onClick={() => send(q)}
                      className="text-[10px] px-2.5 py-1 rounded-full transition-all"
                      style={{
                        background: "hsl(var(--primary) / 0.10)",
                        border: "1px solid hsl(var(--primary) / 0.22)",
                        color: "hsl(var(--primary))",
                      }}>
                      {q}
                    </button>
                  ))}
                </div>
              )}

              {/* Ввод */}
              <div className="px-3 pb-3 flex gap-2 shrink-0"
                style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") send(); }}
                  placeholder="Спроси ARAY..."
                  className="flex-1 rounded-xl px-3 py-2 text-[12px] focus:outline-none"
                  style={{
                    background: "rgba(255,255,255,0.07)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    color: "rgba(255,255,255,0.90)",
                  }}
                />
                <button onClick={() => send()} disabled={loading || !input.trim()}
                  className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all disabled:opacity-30"
                  style={{
                    background: input.trim() ? "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary)/0.7))" : "rgba(255,255,255,0.07)",
                    border: "1px solid rgba(255,255,255,0.10)",
                  }}>
                  {loading
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin text-white/50" />
                    : <Send className="w-3.5 h-3.5" style={{ color: input.trim() ? "#fff" : "rgba(255,255,255,0.35)" }} />}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <style jsx global>{`
        @keyframes arayFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-4px); }
        }
        @keyframes aDot {
          0%, 60%, 100% { transform: scale(0.5); opacity: 0.3; }
          30% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </>
  );
}
