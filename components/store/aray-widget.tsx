"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { X, Send, RotateCcw, Loader2 } from "lucide-react";
import Image from "next/image";
import { buildArayGreeting, buildArayChips } from "@/lib/aray-agent";

// ─── Типы ─────────────────────────────────────────────────────────────────────

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
};

interface ArayWidgetProps {
  page?: string;
  productName?: string;
  cartTotal?: number;
  enabled?: boolean;
}

// ─── Анимированная кнопка ─────────────────────────────────────────────────────

function ArayButton({ onClick, hasNewMessage }: { onClick: () => void; hasNewMessage: boolean }) {
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setPulse(true);
      setTimeout(() => setPulse(false), 1500);
    }, 6000);
    setTimeout(() => { setPulse(true); setTimeout(() => setPulse(false), 1500); }, 2000);
    return () => clearInterval(timer);
  }, []);

  return (
    <button
      onClick={onClick}
      aria-label="Открыть Арай — световой ассистент"
      className="relative w-14 h-14 rounded-2xl flex items-center justify-center focus:outline-none"
      style={{
        background: "linear-gradient(135deg, #0a1628 0%, #0d2550 40%, #0a3d7a 70%, #1a6bb5 100%)",
        boxShadow: "0 0 24px rgba(30, 120, 220, 0.6), 0 0 48px rgba(30, 80, 180, 0.3), inset 0 1px 0 rgba(100,180,255,0.2)",
      }}
    >
      {/* Пульсирующее свечение */}
      {pulse && (
        <span
          className="absolute inset-0 rounded-2xl animate-ping"
          style={{ background: "rgba(30, 120, 255, 0.3)", animationDuration: "1.2s" }}
        />
      )}

      {/* Золотое кольцо */}
      <span
        className="absolute inset-0 rounded-2xl"
        style={{
          background: "conic-gradient(from 0deg, transparent 0%, rgba(255,200,50,0.4) 25%, transparent 50%, rgba(30,150,255,0.3) 75%, transparent 100%)",
          animation: "spin 8s linear infinite",
        }}
      />

      {/* Аватарка */}
      <div className="relative w-10 h-10 rounded-xl overflow-hidden z-10">
        <Image
          src="/aray/avatar.svg"
          alt="Арай"
          fill
          className="object-cover object-top"
          sizes="40px"
        />
      </div>

      {/* Индикатор нового сообщения */}
      {hasNewMessage && (
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full border-2 border-background flex items-center justify-center">
          <span className="w-1.5 h-1.5 bg-white rounded-full" />
        </span>
      )}

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </button>
  );
}

// ─── Пузырь сообщения ─────────────────────────────────────────────────────────

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex gap-2.5 ${isUser ? "flex-row-reverse" : "flex-row"} mb-3`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-xl overflow-hidden shrink-0 mt-0.5">
          <Image src="/aray/avatar.svg" alt="Арай" width={28} height={28} className="object-cover object-top" />
        </div>
      )}
      <div
        className={`max-w-[78%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
          isUser
            ? "bg-primary text-white rounded-tr-sm"
            : "rounded-tl-sm text-foreground"
        }`}
        style={
          !isUser
            ? {
                background: "linear-gradient(135deg, rgba(10,30,80,0.8) 0%, rgba(15,50,120,0.6) 100%)",
                border: "1px solid rgba(30,120,255,0.25)",
                color: "#e8f4ff",
              }
            : {}
        }
      >
        {message.content.split("\n").map((line, i) => (
          <span key={i}>
            {line}
            {i < message.content.split("\n").length - 1 && <br />}
          </span>
        ))}
        <span className={`text-[10px] block mt-1 ${isUser ? "text-white/60 text-right" : "opacity-50"}`}>
          {message.timestamp.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
    </div>
  );
}

// ─── Главный виджет ───────────────────────────────────────────────────────────

export function ArayWidget({ page, productName, cartTotal, enabled = true }: ArayWidgetProps) {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasNew, setHasNew] = useState(false);
  const [hiddenForKeyboard, setHiddenForKeyboard] = useState(false);
  const [proactiveBubble, setProactiveBubble] = useState<string | null>(null);
  // Keyboard-aware positioning — компенсируем виртуальную клавиатуру на iOS/Android
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Контекст для чипов и приветствия
  const pageCtx = { page, productName, cartTotal };
  const chips = buildArayChips(pageCtx);

  // Умное приветствие при первом открытии
  const startChat = useCallback(() => {
    if (messages.length === 0) {
      const isReturning = typeof document !== "undefined" && document.cookie.includes("aray_visited=1");
      const greeting = buildArayGreeting({ ...pageCtx, isReturning });
      setMessages([{ id: "welcome", role: "assistant", content: greeting, timestamp: new Date() }]);
      // Запомнить визит
      document.cookie = "aray_visited=1; max-age=2592000; path=/";
    }
  }, [messages.length, page, productName, cartTotal]);

  // Появляется через 3 секунды
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 3000);
    return () => clearTimeout(t);
  }, []);

  // Проактивный пузырь — пишет сам через 12 секунд если не открыт
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => {
      if (!open) {
        const hour = new Date().getHours();
        const msgs = productName
          ? [`Смотришь «${productName}»? Помогу с выбором 👋`]
          : cartTotal && cartTotal > 0
          ? ["Есть вопросы по заказу? Спроси — помогу оформить 🛒"]
          : hour < 12
          ? ["Доброе утро! Чем могу помочь? 👋"]
          : ["Если есть вопросы — пиши, я рядом 😊"];
        setProactiveBubble(msgs[0]);
        setTimeout(() => setProactiveBubble(null), 5000);
      }
    }, 12000);
    return () => clearTimeout(t);
  }, [visible, open, productName, cartTotal]);

  // Слушаем событие открытия из мобильного навбара
  useEffect(() => {
    const handler = () => {
      setVisible(true);
      setOpen(true);
      setHasNew(false);
      startChat();
    };
    window.addEventListener("aray:open", handler);
    return () => window.removeEventListener("aray:open", handler);
  }, [startChat]);

  // VisualViewport — отслеживаем клавиатуру на iOS и Android
  useEffect(() => {
    const vv = typeof window !== "undefined" ? window.visualViewport : null;
    if (!vv) return;

    const update = () => {
      // Разница между layout viewport и visual viewport = высота клавиатуры
      const layoutH = window.innerHeight;
      const visualH = vv.height;
      const offset = Math.max(0, layoutH - visualH - vv.offsetTop);
      setKeyboardOffset(offset);

      // Скрыть плавающую кнопку когда клавиатура открыта (не сам чат)
      if (!open) {
        setHiddenForKeyboard(offset > 50);
      }
    };

    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, [open]);

  // Автоскролл
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleOpen = () => {
    setOpen(true);
    setHasNew(false);
    setProactiveBubble(null);
    startChat();
  };

  const sendMessage = async (text?: string) => {
    const messageText = (text || input).trim();
    if (!messageText || loading) return;
    setInput("");

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: messageText,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({ role: m.role, content: m.content })),
          context: { page, productName, cartTotal },
        }),
      });

      const data = await res.json();
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.message || data.error || "Произошла ошибка. Попробуйте ещё раз.",
        timestamp: new Date(),
      }]);

      if (!open) setHasNew(true);
    } catch {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Временно недоступен. Попробуйте через минуту. 🙏",
        timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  if (!enabled) return null;
  if (!visible) return null;
  if (hiddenForKeyboard && !open) return null;

  return (
    <>
      {/* Кнопка — только на десктопе */}
      {!open && (
        <div className="hidden lg:flex fixed z-50 flex-col items-end gap-2"
          style={{ bottom: "2rem", right: "1.5rem" }}>
          {/* Проактивный пузырь */}
          {proactiveBubble && (
            <div
              className="max-w-[220px] px-3 py-2 rounded-2xl text-xs text-blue-100 cursor-pointer"
              style={{
                background: "rgba(8,20,60,0.92)",
                border: "1px solid rgba(40,120,255,0.4)",
                boxShadow: "0 4px 20px rgba(20,80,200,0.3)",
              }}
              onClick={handleOpen}
            >
              {proactiveBubble}
              <div
                className="absolute -bottom-1.5 right-6 w-3 h-3 rotate-45"
                style={{ background: "rgba(8,20,60,0.92)", border: "0 0 1px 1px solid rgba(40,120,255,0.4)" }}
              />
            </div>
          )}

          {/* Подпись */}
          <div className="pointer-events-none text-center rounded-xl px-2.5 py-1"
            style={{ background: "rgba(10,25,60,0.85)", border: "1px solid rgba(30,120,255,0.3)" }}>
            <p className="text-[10px] font-bold text-blue-200 leading-none">АРАЙ</p>
            <p className="text-[9px] text-blue-400/80 leading-none mt-0.5">Световой друг</p>
          </div>

          <ArayButton onClick={handleOpen} hasNewMessage={hasNew} />
        </div>
      )}

      {/* Чат-панель */}
      {open && (
        <div
          className="fixed z-50 flex flex-col"
          style={keyboardOffset > 0 ? {
            // ── Клавиатура открыта: прячемся над ней ──
            bottom: keyboardOffset,
            left: 0,
            right: 0,
            width: "100%",
            height: `calc(100dvh - ${keyboardOffset}px - 3.5rem)`,
            borderRadius: "20px 20px 0 0",
            overflow: "hidden",
            boxShadow: "0 0 50px rgba(20,80,200,0.5), 0 24px 64px rgba(0,0,0,0.6)",
            border: "1px solid rgba(40,130,255,0.3)",
            background: "linear-gradient(180deg, #050d1f 0%, #081530 50%, #060e20 100%)",
            transition: "bottom 0.18s ease, height 0.18s ease",
          } : {
            // ── Нормальный режим: плавающая панель ──
            bottom: "calc(5rem + env(safe-area-inset-bottom, 0px))",
            right: "1rem",
            width: "min(370px, calc(100vw - 1.5rem))",
            height: "min(580px, calc(100dvh - 7rem))",
            borderRadius: "20px",
            overflow: "hidden",
            boxShadow: "0 0 50px rgba(20,80,200,0.5), 0 24px 64px rgba(0,0,0,0.6)",
            border: "1px solid rgba(40,130,255,0.3)",
            background: "linear-gradient(180deg, #050d1f 0%, #081530 50%, #060e20 100%)",
            transition: "bottom 0.18s ease, height 0.18s ease",
          }}
        >
          {/* Шапка */}
          <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #070f25 0%, #0d2050 100%)", borderBottom: "1px solid rgba(30,120,255,0.2)" }}>
            <div className="w-9 h-9 rounded-xl overflow-hidden ring-2 ring-blue-500/40">
              <Image src="/aray/avatar.svg" alt="Арай" width={36} height={36} className="object-cover object-top" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-blue-100">Арай</p>
              <p className="text-[10px] text-blue-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                Онлайн · ARAY PRODUCTIONS
              </p>
            </div>
            <button
              onClick={() => { setMessages([]); startChat(); }}
              className="w-7 h-7 rounded-xl flex items-center justify-center hover:bg-blue-900/40 transition-colors"
              title="Начать заново"
            >
              <RotateCcw className="w-3.5 h-3.5 text-blue-400" />
            </button>
            <button onClick={() => setOpen(false)}
              className="w-7 h-7 rounded-xl flex items-center justify-center hover:bg-blue-900/40 transition-colors">
              <X className="w-4 h-4 text-blue-300" />
            </button>
          </div>

          {/* Сообщения */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
            {messages.map(msg => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            {loading && (
              <div className="flex gap-2.5 mb-3">
                <div className="w-7 h-7 rounded-xl overflow-hidden shrink-0">
                  <Image src="/aray/avatar.svg" alt="Арай" width={28} height={28} className="object-cover object-top" />
                </div>
                <div className="px-3 py-2.5 rounded-2xl rounded-tl-sm"
                  style={{ background: "rgba(15,40,100,0.6)", border: "1px solid rgba(30,120,255,0.2)" }}>
                  <div className="flex gap-1 items-center h-4">
                    {[0, 1, 2].map(i => (
                      <span key={i} className="w-1.5 h-1.5 rounded-full bg-blue-400"
                        style={{ animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Контекстные подсказки — только если мало сообщений */}
          {messages.length <= 1 && !loading && (
            <div className="px-3 pb-2 flex gap-1.5 flex-wrap">
              {chips.map(q => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="text-[10px] px-2.5 py-1.5 rounded-xl transition-all active:scale-95"
                  style={{
                    background: "rgba(15,50,120,0.5)",
                    border: "1px solid rgba(40,130,255,0.3)",
                    color: "#90c0ff",
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          )}

              {/* Ввод */}
              <div
                className="px-3 py-3 flex-shrink-0 flex gap-2 items-end"
                style={{ borderTop: "1px solid rgba(30,120,255,0.2)" }}
              >
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
                  }}
                  rows={1}
                  placeholder="Написать Araю..."
                  className="flex-1 resize-none text-sm rounded-xl px-3 py-2.5 focus:outline-none"
                  style={{
                    background: "rgba(10,30,80,0.6)",
                    border: "1px solid rgba(40,130,255,0.3)",
                    color: "#d0e8ff",
                    maxHeight: "80px",
                  }}
                />
                <button
                  onClick={() => sendMessage()}
                  disabled={loading || !input.trim()}
                  className="w-9 h-9 rounded-xl flex items-center justify-center transition-all disabled:opacity-40"
                  style={{
                    background: loading || !input.trim()
                      ? "rgba(30,80,160,0.3)"
                      : "linear-gradient(135deg, #1a5cc8, #2a8eff)",
                    boxShadow: input.trim() ? "0 0 12px rgba(30,120,255,0.5)" : "none",
                  }}
                >
                  {loading
                    ? <Loader2 className="w-4 h-4 text-blue-300 animate-spin" />
                    : <Send className="w-4 h-4 text-white" />
                  }
                </button>
              </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </>
  );
}
