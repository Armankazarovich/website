"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import {
  X, Send, Loader2, MessageCircle, ShoppingCart,
  Calculator, User, RotateCcw, Plus, Minus, Trash2,
  ChevronRight, LogIn, Package, Mic, MicOff
} from "lucide-react";
import Link from "next/link";
import { buildArayGreeting, buildArayChips } from "@/lib/aray-agent";
import { useCartStore } from "@/store/cart";
import { formatPrice } from "@/lib/utils";

// ─── Типы ─────────────────────────────────────────────────────────────────────

type Message = { id: string; role: "user" | "assistant"; content: string; timestamp: Date };
type Tab = "chat" | "cart" | "calc" | "profile";
type UserInfo = {
  authenticated: boolean; name: string | null; email: string | null;
  level: string; levelInfo: { label: string; next: string; color: string; points: number; nextPoints: number };
  totalChats: number; totalPoints: number; facts: Record<string, string>;
  recentOrders: { id: string; orderNumber: number; status: string; totalAmount: number; createdAt: string }[];
};

interface ArayWidgetProps {
  page?: string; productName?: string; cartTotal?: number; enabled?: boolean;
}

// ─── Уровни ───────────────────────────────────────────────────────────────────

const LEVEL_ICONS: Record<string, string> = {
  NOVICE: "🌱", BUILDER: "🏗️", MASTER: "⭐", PARTNER: "💎",
};

// ─── Световой шар Арай ────────────────────────────────────────────────────────
// Анимированный плазменный шар — без фото, только свет

function ArayOrb({ size = 40, glow = true }: { size?: number; glow?: boolean }) {
  return (
    <div
      className="relative rounded-full flex-shrink-0 overflow-hidden"
      style={{
        width: size,
        height: size,
        boxShadow: glow
          ? `0 0 ${size * 0.5}px rgba(232,112,10,0.7), 0 0 ${size}px rgba(232,112,10,0.25)`
          : "none",
      }}
    >
      {/* Базовый градиент — тёплое ядро */}
      <div className="absolute inset-0 rounded-full" style={{
        background: "radial-gradient(circle at 38% 32%, #fffbf0 0%, #fde68a 15%, #f59e0b 35%, #e8700a 58%, #7c2d12 80%, #1a0800 100%)",
      }} />

      {/* Вращающийся световой конус */}
      <div className="absolute inset-0 rounded-full" style={{
        background: "conic-gradient(from 0deg, rgba(255,220,80,0.0) 0%, rgba(255,230,100,0.65) 18%, rgba(255,150,20,0.0) 38%, rgba(255,100,0,0.5) 58%, rgba(255,220,80,0.0) 78%, rgba(255,240,130,0.55) 92%, rgba(255,220,80,0.0) 100%)",
        animation: "arayOrbSpin 5s linear infinite",
        mixBlendMode: "overlay",
      }} />

      {/* Движущийся блик */}
      <div className="absolute inset-0 rounded-full" style={{
        background: "radial-gradient(ellipse at 28% 22%, rgba(255,255,255,0.82) 0%, rgba(255,255,255,0.28) 28%, transparent 60%)",
        animation: "arayHighlight 6s ease-in-out infinite",
      }} />

      {/* Внутренняя тень для глубины */}
      <div className="absolute inset-0 rounded-full" style={{
        boxShadow: "inset 0 0 18px rgba(0,0,0,0.45), inset 0 -6px 12px rgba(0,0,0,0.3)",
      }} />
    </div>
  );
}

// ─── Аватар в сообщении (маленький шар) ───────────────────────────────────────

function ArayAvatar() {
  return (
    <div className="w-7 h-7 shrink-0 mt-0.5 rounded-full" style={{
      background: "radial-gradient(circle at 38% 32%, #fde68a 0%, #f59e0b 35%, #e8700a 65%, #7c2d12 90%)",
      boxShadow: "0 0 8px rgba(232,112,10,0.6)",
    }} />
  );
}

// ─── Пузырь сообщения ─────────────────────────────────────────────────────────

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex gap-2.5 ${isUser ? "flex-row-reverse" : "flex-row"} mb-3`}>
      {!isUser && <ArayAvatar />}
      <div
        className={`max-w-[80%] px-3.5 py-2.5 text-sm leading-relaxed ${isUser ? "rounded-2xl rounded-tr-md" : "rounded-2xl rounded-tl-md"}`}
        style={isUser
          ? { background: "linear-gradient(135deg, #e8700a, #f59e0b)", color: "#fff" }
          : { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)", color: "#e8eaf0" }
        }
      >
        {message.content.split("\n").map((line, i, arr) => (
          <span key={i}>{line}{i < arr.length - 1 && <br />}</span>
        ))}
        <span className={`text-[10px] block mt-1.5 ${isUser ? "text-white/55 text-right" : "text-white/30"}`}>
          {message.timestamp.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
    </div>
  );
}

// ─── Хук голосового ввода ─────────────────────────────────────────────────────

function useVoiceInput(onResult: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const recogRef = useRef<any>(null);

  const start = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR();
    r.lang = "ru-RU";
    r.interimResults = false;
    r.maxAlternatives = 1;
    r.onstart = () => setListening(true);
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    r.onresult = (e: any) => {
      const text = e.results[0]?.[0]?.transcript || "";
      if (text) onResult(text);
    };
    r.start();
    recogRef.current = r;
  }, [onResult]);

  const stop = useCallback(() => {
    recogRef.current?.stop();
    setListening(false);
  }, []);

  return { listening, start, stop };
}

// ─── Вкладка: Чат ─────────────────────────────────────────────────────────────

function ChatTab({ messages, loading, input, setInput, sendMessage, chips, messagesEndRef, inputRef }: {
  messages: Message[]; loading: boolean; input: string;
  setInput: (v: string) => void; sendMessage: (t?: string) => void;
  chips: string[]; messagesEndRef: React.RefObject<HTMLDivElement>;
  inputRef: React.RefObject<HTMLTextAreaElement>;
}) {
  const { listening, start, stop } = useVoiceInput((text) => {
    setInput(input ? input + " " + text : text);
    inputRef.current?.focus();
  });

  return (
    <>
      {/* Сообщения */}
      <div className="flex-1 overflow-y-auto px-4 py-3 overscroll-contain">
        {messages.map(m => <MessageBubble key={m.id} message={m} />)}

        {loading && (
          <div className="flex gap-2.5 mb-3">
            <ArayAvatar />
            <div className="px-3.5 py-3 rounded-2xl rounded-tl-md" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)" }}>
              <div className="flex gap-1.5 items-center h-4">
                {[0, 1, 2].map(i => (
                  <span key={i} className="w-1.5 h-1.5 rounded-full"
                    style={{ background: "#e8700a", animation: `arayBounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Чипы-подсказки */}
      {messages.length <= 1 && !loading && (
        <div className="px-4 pb-2 flex gap-2 flex-wrap">
          {chips.map(q => (
            <button key={q} onClick={() => sendMessage(q)}
              className="text-[11px] px-3 py-1.5 rounded-xl transition-all active:scale-95 whitespace-nowrap"
              style={{ background: "rgba(232,112,10,0.12)", border: "1px solid rgba(232,112,10,0.25)", color: "#f59e0b" }}>
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Ввод */}
      <div className="px-4 py-3 flex gap-2 items-end flex-shrink-0"
        style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>

        {/* Микрофон */}
        <button
          onClick={listening ? stop : start}
          className="w-10 h-10 rounded-xl flex items-center justify-center transition-all shrink-0 relative"
          style={{
            background: listening ? "linear-gradient(135deg,#ef4444,#b91c1c)" : "rgba(255,255,255,0.07)",
            border: listening ? "none" : "1px solid rgba(255,255,255,0.1)",
            boxShadow: listening ? "0 0 16px rgba(239,68,68,0.5)" : "none",
          }}
        >
          {listening && <span className="absolute inset-0 rounded-xl animate-ping" style={{ background: "rgba(239,68,68,0.3)", animationDuration: "1s" }} />}
          {listening
            ? <MicOff className="w-4 h-4 text-white relative z-10" />
            : <Mic className="w-4 h-4 relative z-10" style={{ color: "rgba(255,255,255,0.45)" }} />
          }
        </button>

        <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
          rows={1}
          placeholder={listening ? "🎤 Слушаю..." : "Написать Araю..."}
          className="flex-1 resize-none text-sm rounded-xl px-3.5 py-2.5 focus:outline-none transition-all placeholder:text-white/25"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: listening ? "1px solid rgba(239,68,68,0.4)" : "1px solid rgba(255,255,255,0.1)",
            color: "#e8eaf0",
            maxHeight: "80px",
          }} />

        <button onClick={() => sendMessage()} disabled={loading || !input.trim()}
          className="w-10 h-10 rounded-xl flex items-center justify-center transition-all shrink-0 disabled:opacity-30"
          style={{
            background: input.trim() ? "linear-gradient(135deg,#e8700a,#f59e0b)" : "rgba(255,255,255,0.07)",
            border: input.trim() ? "none" : "1px solid rgba(255,255,255,0.1)",
            boxShadow: input.trim() ? "0 0 16px rgba(232,112,10,0.5)" : "none",
          }}>
          {loading ? <Loader2 className="w-4 h-4 text-orange-300 animate-spin" /> : <Send className="w-4 h-4 text-white" />}
        </button>
      </div>
    </>
  );
}

// ─── Вкладка: Корзина ─────────────────────────────────────────────────────────

function CartTab() {
  const { items, updateQuantity, removeItem, totalPrice, totalItems } = useCartStore();
  const total = totalPrice();
  const count = totalItems();

  if (items.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6">
        <div className="w-20 h-20 rounded-2xl flex items-center justify-center"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <ShoppingCart className="w-10 h-10 opacity-20" />
        </div>
        <p className="text-white/70 text-center text-sm">Корзина пуста</p>
        <p className="text-white/35 text-xs text-center">Добавь товары или спроси Арая помочь с выбором</p>
        <Link href="/catalog"
          className="px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-all active:scale-95"
          style={{ background: "linear-gradient(135deg,#e8700a,#f59e0b)" }}>
          Перейти в каталог
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5 overscroll-contain">
        {items.map(item => (
          <div key={item.id} className="flex gap-3 p-3 rounded-2xl"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0"
              style={{ background: "rgba(255,255,255,0.06)" }}>
              {item.productImage
                ? <img src={item.productImage} alt={item.productName} className="object-cover w-full h-full" />
                : <div className="w-full h-full flex items-center justify-center"><Package className="w-6 h-6 opacity-20" /></div>
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white/90 font-medium leading-tight truncate">{item.productName}</p>
              <p className="text-xs text-white/40 mt-0.5">{item.variantSize} · {item.unitType === "CUBE" ? "м³" : "шт"}</p>
              <p className="text-sm font-bold mt-1" style={{ color: "#f59e0b" }}>{formatPrice(item.price * item.quantity)}</p>
            </div>
            <div className="flex flex-col items-end justify-between gap-1">
              <button onClick={() => removeItem(item.id)} className="p-1 rounded-lg transition-colors hover:bg-red-500/15">
                <Trash2 className="w-3.5 h-3.5 text-red-400/50" />
              </button>
              <div className="flex items-center gap-2">
                <button onClick={() => updateQuantity(item.id, Math.max(0.001, item.quantity - (item.unitType === "CUBE" ? 0.5 : 1)))}
                  className="w-7 h-7 rounded-xl flex items-center justify-center"
                  style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <Minus className="w-3 h-3 text-white/60" />
                </button>
                <span className="text-xs text-white/80 min-w-[28px] text-center tabular-nums">{item.quantity}</span>
                <button onClick={() => updateQuantity(item.id, item.quantity + (item.unitType === "CUBE" ? 0.5 : 1))}
                  className="w-7 h-7 rounded-xl flex items-center justify-center"
                  style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <Plus className="w-3 h-3 text-white/60" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="px-4 pb-6 pt-3 flex-shrink-0 space-y-3" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="flex items-center justify-between">
          <span className="text-white/50 text-sm">{count} позиций</span>
          <span className="text-xl font-bold text-white">{formatPrice(total)}</span>
        </div>
        <Link href="/checkout"
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-white font-semibold text-base transition-all active:scale-[0.98]"
          style={{ background: "linear-gradient(135deg,#e8700a,#f59e0b)", boxShadow: "0 0 28px rgba(232,112,10,0.4)" }}>
          Оформить заказ <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    </>
  );
}

// ─── Вкладка: Калькулятор ─────────────────────────────────────────────────────

function CalcTab({ onAskAray }: { onAskAray: (text: string) => void }) {
  const [length, setLength] = useState("");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [count, setCount] = useState("1");

  const L = parseFloat(length) || 0;
  const W = parseFloat(width) || 0;
  const H = parseFloat(height) || 0;
  const C = parseFloat(count) || 1;
  const volume = L > 0 && W > 0 && H > 0 ? L * W * H * C : 0;

  const inputStyle = {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.10)",
    color: "#e8eaf0",
    borderRadius: "12px",
  };

  const fields = [
    { label: "Длина, м", val: length, set: setLength, placeholder: "напр. 6" },
    { label: "Ширина, м", val: width, set: setWidth, placeholder: "напр. 0.15" },
    { label: "Толщина, м", val: height, set: setHeight, placeholder: "напр. 0.05" },
    { label: "Количество, шт", val: count, set: setCount, placeholder: "напр. 10" },
  ];

  return (
    <div className="flex-1 flex flex-col px-4 py-4 gap-4 overflow-y-auto">
      <div>
        <p className="text-white/40 text-xs font-medium uppercase tracking-wider mb-3">Размеры пиломатериала</p>
        <div className="grid grid-cols-2 gap-3">
          {fields.map(f => (
            <div key={f.label}>
              <label className="text-[11px] text-white/40 block mb-1">{f.label}</label>
              <input type="number" value={f.val} onChange={e => f.set(e.target.value)}
                placeholder={f.placeholder} inputMode="decimal"
                className="w-full px-3 py-2.5 text-sm focus:outline-none placeholder:text-white/20"
                style={inputStyle} />
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl p-4 transition-all" style={{
        background: volume > 0 ? "rgba(232,112,10,0.12)" : "rgba(255,255,255,0.04)",
        border: volume > 0 ? "1px solid rgba(232,112,10,0.35)" : "1px solid rgba(255,255,255,0.07)",
      }}>
        <p className="text-white/40 text-xs mb-1">Кубатура</p>
        <p className="text-4xl font-bold tabular-nums" style={{ color: volume > 0 ? "#f59e0b" : "rgba(255,255,255,0.15)" }}>
          {volume > 0 ? volume.toFixed(3) : "0.000"}
          <span className="text-lg ml-2 opacity-60">м³</span>
        </p>
        {volume > 0 && (
          <p className="text-xs text-white/35 mt-1">{L}м × {W}м × {H}м × {C}шт</p>
        )}
      </div>

      {volume > 0 && (
        <button
          onClick={() => onAskAray(`Сколько стоит ${volume.toFixed(3)} м³ пиломатериала? Помоги подобрать.`)}
          className="w-full py-3 rounded-2xl text-sm font-medium text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          style={{ background: "linear-gradient(135deg,#e8700a,#f59e0b)", boxShadow: "0 0 20px rgba(232,112,10,0.35)" }}>
          <MessageCircle className="w-4 h-4" />
          Спросить Арая о цене
        </button>
      )}

      <p className="text-center text-[11px] text-white/25">
        Арай умеет считать сам — просто напиши<br />"сколько нужно на дом 8×6"
      </p>
    </div>
  );
}

// ─── Вкладка: Профиль ─────────────────────────────────────────────────────────

function ProfileTab({ userInfo, onAskName }: { userInfo: UserInfo | null; onAskName: () => void }) {
  if (!userInfo) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-6 h-6 opacity-30 animate-spin" />
      </div>
    );
  }

  const statusLabels: Record<string, string> = {
    NEW: "Новый", CONFIRMED: "Подтверждён", PROCESSING: "В работе",
    SHIPPED: "Отгружен", IN_DELIVERY: "Доставляется", DELIVERED: "Доставлен",
    COMPLETED: "Завершён", CANCELLED: "Отменён", READY_PICKUP: "Готов к выдаче",
  };

  const progressPct = userInfo.levelInfo
    ? Math.min(100, ((userInfo.totalPoints - userInfo.levelInfo.points) / Math.max(1, userInfo.levelInfo.nextPoints - userInfo.levelInfo.points)) * 100)
    : 0;

  if (!userInfo.authenticated) {
    return (
      <div className="flex-1 flex flex-col px-5 py-6 gap-5 overflow-y-auto">
        <div className="text-center py-4">
          <div className="flex justify-center mb-5">
            <ArayOrb size={72} glow />
          </div>
          <p className="text-lg font-semibold text-white">Войди — и Арай запомнит всё</p>
          <p className="text-sm text-white/40 mt-1.5">История заказов, уровень, персональные советы</p>
        </div>

        <div className="space-y-2">
          {[
            { icon: "🧠", text: "Арай помнит тебя на всех устройствах" },
            { icon: "📦", text: "История всех заказов в одном месте" },
            { icon: "🏆", text: "Уровни: Новичок → Строитель → Мастер → Партнёр" },
            { icon: "💎", text: "Партнёр ARAY — 50% с рекомендаций" },
          ].map(item => (
            <div key={item.text} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <span className="text-xl shrink-0">{item.icon}</span>
              <span className="text-sm text-white/70">{item.text}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2.5">
          <Link href="/login"
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-white font-semibold text-sm"
            style={{ background: "linear-gradient(135deg,#e8700a,#f59e0b)", boxShadow: "0 0 24px rgba(232,112,10,0.4)" }}>
            <LogIn className="w-4 h-4" /> Войти в аккаунт
          </Link>
          <Link href="/register"
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-white/70 font-medium text-sm"
            style={{ border: "1px solid rgba(255,255,255,0.12)" }}>
            Создать аккаунт
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col px-4 py-4 gap-4 overflow-y-auto overscroll-contain">
      {/* Карточка пользователя */}
      <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="flex items-center gap-3 mb-4">
          <ArayOrb size={52} glow />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="font-bold text-white text-base truncate">{userInfo.name || "Гость"}</p>
              {!userInfo.name && (
                <button onClick={onAskName} className="text-[10px] px-2 py-0.5 rounded-lg text-white/50"
                  style={{ border: "1px solid rgba(255,255,255,0.15)" }}>
                  + имя
                </button>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-base">{LEVEL_ICONS[userInfo.level]}</span>
              <span className="text-sm font-medium" style={{ color: userInfo.levelInfo?.color || "#f59e0b" }}>
                {userInfo.levelInfo?.label}
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-white">{userInfo.totalPoints}</p>
            <p className="text-[10px] text-white/35 mt-0.5">баллов</p>
          </div>
        </div>

        {userInfo.level !== "PARTNER" && (
          <div>
            <div className="flex justify-between text-[10px] text-white/35 mb-1.5">
              <span>{userInfo.levelInfo?.label}</span>
              <span>→ {userInfo.levelInfo?.next}</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/8 overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${progressPct}%`, background: `linear-gradient(90deg, #e8700a, ${userInfo.levelInfo?.color || "#f59e0b"})` }} />
            </div>
          </div>
        )}
        {userInfo.level === "PARTNER" && (
          <p className="text-center text-xs text-white/40 mt-1">💎 Максимальный уровень — Партнёр ARAY PRODUCTIONS</p>
        )}
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-2 gap-2.5">
        {[
          { label: "Диалогов с Araем", value: userInfo.totalChats, icon: <MessageCircle className="w-4 h-4" /> },
          { label: "Заказов", value: userInfo.recentOrders.length, icon: <Package className="w-4 h-4" /> },
        ].map(stat => (
          <div key={stat.label} className="rounded-2xl p-3 text-center"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="flex items-center justify-center mb-1 text-white/30">{stat.icon}</div>
            <p className="text-2xl font-bold text-white">{stat.value}</p>
            <p className="text-[10px] text-white/35 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Последние заказы */}
      {userInfo.recentOrders.length > 0 && (
        <div>
          <p className="text-[11px] text-white/30 uppercase tracking-wider font-medium mb-2">Последние заказы</p>
          <div className="space-y-2">
            {userInfo.recentOrders.map(order => (
              <Link key={order.id} href={`/account/orders/${order.orderNumber}`}
                className="flex items-center justify-between px-3 py-2.5 rounded-xl transition-all active:scale-[0.98]"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div>
                  <p className="text-sm text-white/80 font-medium">Заказ №{order.orderNumber}</p>
                  <p className="text-[11px] text-white/35">{statusLabels[order.status] || order.status}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold" style={{ color: "#f59e0b" }}>{formatPrice(order.totalAmount)}</span>
                  <ChevronRight className="w-4 h-4 text-white/20" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Ссылки */}
      <div className="space-y-2 pb-2">
        {[
          { href: "/account", label: "Настройки профиля", icon: <User className="w-4 h-4" /> },
          { href: "/account/orders", label: "Все заказы", icon: <Package className="w-4 h-4" /> },
        ].map(link => (
          <Link key={link.href} href={link.href}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <span className="text-white/30">{link.icon}</span>
            <span className="text-sm text-white/65 flex-1">{link.label}</span>
            <ChevronRight className="w-4 h-4 text-white/20" />
          </Link>
        ))}
      </div>
    </div>
  );
}

// ─── Главный виджет ───────────────────────────────────────────────────────────

export function ArayWidget({ page, productName, cartTotal, enabled = true }: ArayWidgetProps) {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [tab, setTab] = useState<Tab>("chat");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasNew, setHasNew] = useState(false);
  const [hiddenForKeyboard, setHiddenForKeyboard] = useState(false);
  const [proactiveBubble, setProactiveBubble] = useState<string | null>(null);
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [pulse, setPulse] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const dragControls = useDragControls();
  const cartItemsCount = useCartStore((s) => s.totalItems());

  const pageCtx = { page, productName, cartTotal };
  const chips = buildArayChips(pageCtx);

  // Загрузить инфо о пользователе
  useEffect(() => {
    fetch("/api/ai/me").then(r => r.json()).then(setUserInfo).catch(() => {});
  }, []);

  // Появляется через 2 секунды
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 2000);
    return () => clearTimeout(t);
  }, []);

  // Пульс кнопки
  useEffect(() => {
    const t = setInterval(() => { setPulse(true); setTimeout(() => setPulse(false), 1500); }, 8000);
    setTimeout(() => { setPulse(true); setTimeout(() => setPulse(false), 1500); }, 3000);
    return () => clearInterval(t);
  }, []);

  // VisualViewport для клавиатуры
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      const offset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setKeyboardOffset(offset);
      if (!open) setHiddenForKeyboard(offset > 50);
    };
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => { vv.removeEventListener("resize", update); vv.removeEventListener("scroll", update); };
  }, [open]);

  // Умное приветствие
  const startChat = useCallback(() => {
    if (messages.length > 0) return;
    const isReturning = document.cookie.includes("aray_visited=1");
    const name = userInfo?.name;
    let greeting = buildArayGreeting({ ...pageCtx, isReturning });

    if (name) {
      const hour = new Date().getHours();
      const time = hour < 12 ? "Доброе утро" : hour < 17 ? "Привет" : hour < 22 ? "Добрый вечер" : "Поздно уже";
      greeting = `${time}, ${name}! 👋 ${productName ? `Смотришь «${productName}»?` : "Чем могу помочь?"} Спрашивай — я рядом.`;
    }

    setMessages([{ id: "welcome", role: "assistant", content: greeting, timestamp: new Date() }]);
    document.cookie = "aray_visited=1; max-age=2592000; path=/";
  }, [messages.length, userInfo?.name, page, productName, cartTotal]);

  // Событие открытия из навбара
  useEffect(() => {
    const handler = () => {
      setVisible(true);
      setOpen(true);
      setHasNew(false);
      setTab("chat");
      startChat();
    };
    window.addEventListener("aray:open", handler);
    return () => window.removeEventListener("aray:open", handler);
  }, [startChat]);

  // Проактивный пузырь
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => {
      if (!open) {
        const name = userInfo?.name;
        const msg = name
          ? `${name}, помочь с чем-нибудь? 👋`
          : productName ? `Смотришь «${productName}»? Помогу выбрать 👋`
          : "Если есть вопросы — я рядом 😊";
        setProactiveBubble(msg);
        setTimeout(() => setProactiveBubble(null), 5000);
      }
    }, 15000);
    return () => clearTimeout(t);
  }, [visible, open, userInfo?.name, productName]);

  // Автоскролл
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleOpen = () => {
    setOpen(true);
    setHasNew(false);
    setProactiveBubble(null);
    setTab("chat");
    startChat();
  };

  const handleAskAray = (text: string) => { setTab("chat"); sendMessage(text); };

  const handleAskName = () => {
    setTab("chat");
    setTimeout(() => sendMessage("Как тебя зовут? Хочу обращаться по имени 😊"), 100);
  };

  const sendMessage = async (text?: string) => {
    const messageText = (text || input).trim();
    if (!messageText || loading) return;
    setInput("");
    setTab("chat");

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: messageText, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })),
          context: { page, productName, cartTotal },
        }),
      });
      const data = await res.json();

      if (data.message?.toLowerCase().includes("звать") || data.message?.toLowerCase().includes("имя")) {
        fetch("/api/ai/me").then(r => r.json()).then(setUserInfo).catch(() => {});
      }

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(), role: "assistant",
        content: data.message || data.error || "Что-то пошло не так 🙏",
        timestamp: new Date(),
      }]);
      if (!open) setHasNew(true);
    } catch {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(), role: "assistant",
        content: "Нет связи. Проверь интернет и попробуй снова 🙏",
        timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  if (!enabled || !visible) return null;
  if (hiddenForKeyboard && !open) return null;

  // Вкладки
  const tabs: { id: Tab; icon: React.ReactNode; label: string; badge?: number }[] = [
    { id: "chat", icon: <MessageCircle className="w-5 h-5" />, label: "Чат" },
    { id: "cart", icon: <ShoppingCart className="w-5 h-5" />, label: "Корзина", badge: cartItemsCount || undefined },
    { id: "calc", icon: <Calculator className="w-5 h-5" />, label: "Расчёт" },
    { id: "profile", icon: <User className="w-5 h-5" />, label: "Профиль" },
  ];

  // Цвета панели — глубокий тёмный, минималистичный
  const panelStyle = {
    background: "linear-gradient(180deg, #0c0c14 0%, #0f0f1a 50%, #0a0a12 100%)",
    border: "1px solid rgba(255,255,255,0.08)",
    boxShadow: "0 -8px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(232,112,10,0.08)",
  };

  return (
    <>
      {/* ── Десктопная кнопка ── */}
      {!open && (
        <div className="hidden lg:flex fixed z-50 flex-col items-end gap-2"
          style={{ bottom: "2rem", right: "1.5rem" }}>

          {proactiveBubble && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="max-w-[220px] px-3.5 py-2.5 rounded-2xl text-xs text-white/80 cursor-pointer"
              style={{ background: "rgba(12,12,20,0.97)", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}
              onClick={handleOpen}>
              {proactiveBubble}
            </motion.div>
          )}

          {/* Подпись */}
          <div className="text-center px-3 py-1.5 rounded-xl pointer-events-none"
            style={{ background: "rgba(12,12,20,0.9)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <p className="text-[10px] font-bold text-white/80 leading-none tracking-widest">АРАЙ</p>
            <p className="text-[9px] text-white/30 mt-0.5">Световой друг</p>
          </div>

          {/* Кнопка-шар */}
          <button onClick={handleOpen} aria-label="Открыть Арай"
            className="relative flex items-center justify-center focus:outline-none"
            style={{ width: 56, height: 56 }}>
            {/* Внешнее свечение при пульсе */}
            {pulse && (
              <span className="absolute inset-0 rounded-2xl animate-ping"
                style={{ background: "rgba(232,112,10,0.2)", animationDuration: "1.2s" }} />
            )}
            {/* Фоновый контейнер */}
            <div className="absolute inset-0 rounded-2xl" style={{
              background: "linear-gradient(145deg, #1a0800, #3d1206, #7c2d12)",
              border: "1px solid rgba(245,158,11,0.3)",
              boxShadow: "0 0 24px rgba(232,112,10,0.5), 0 0 48px rgba(232,112,10,0.15)",
            }} />
            {/* Шар */}
            <div className="relative z-10">
              <ArayOrb size={42} glow={false} />
            </div>
            {/* Новое сообщение */}
            {hasNew && <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-background"
              style={{ background: "#e8700a" }} />}
          </button>
        </div>
      )}

      {/* ── Полноэкранный виджет ── */}
      <AnimatePresence>
        {open && (
          <>
            {/* Оверлей */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[60]"
              style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
              onClick={() => setOpen(false)}
            />

            {/* Панель */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: keyboardOffset > 0 ? -keyboardOffset : 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 32, stiffness: 340 }}
              drag="y"
              dragControls={dragControls}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.3 }}
              onDragEnd={(_, info) => { if (info.offset.y > 120) setOpen(false); }}
              className="fixed bottom-0 left-0 right-0 z-[61] flex flex-col"
              style={{ height: "92dvh", borderRadius: "24px 24px 0 0", ...panelStyle }}
            >
              {/* Ручка */}
              <div className="flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing shrink-0"
                onPointerDown={e => dragControls.start(e)}>
                <div className="w-9 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }} />
              </div>

              {/* Шапка */}
              <div className="flex items-center gap-3 px-5 py-3 flex-shrink-0"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="shrink-0">
                  <ArayOrb size={38} glow />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-white">Арай</p>
                    {userInfo?.name && (
                      <span className="text-[11px] px-2 py-0.5 rounded-lg font-medium"
                        style={{ background: "rgba(232,112,10,0.15)", color: "#f59e0b", border: "1px solid rgba(232,112,10,0.25)" }}>
                        {LEVEL_ICONS[userInfo.level]} {userInfo.levelInfo?.label}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] flex items-center gap-1.5 mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
                    {userInfo?.name ? `Привет, ${userInfo.name}!` : "Онлайн · ARAY PRODUCTIONS"}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => { setMessages([]); startChat(); }}
                    className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors hover:bg-white/8"
                    title="Начать заново">
                    <RotateCcw className="w-3.5 h-3.5 text-white/30" />
                  </button>
                  <button onClick={() => setOpen(false)}
                    className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors hover:bg-white/8">
                    <X className="w-4 h-4 text-white/40" />
                  </button>
                </div>
              </div>

              {/* Контент вкладки */}
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.div key={tab} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.15 }}
                    className="flex-1 flex flex-col min-h-0 overflow-hidden">
                    {tab === "chat" && (
                      <ChatTab messages={messages} loading={loading} input={input} setInput={setInput}
                        sendMessage={sendMessage} chips={chips} messagesEndRef={messagesEndRef} inputRef={inputRef} />
                    )}
                    {tab === "cart" && <CartTab />}
                    {tab === "calc" && <CalcTab onAskAray={handleAskAray} />}
                    {tab === "profile" && <ProfileTab userInfo={userInfo} onAskName={handleAskName} />}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Таббар */}
              <div className="flex-shrink-0 flex items-stretch"
                style={{
                  borderTop: "1px solid rgba(255,255,255,0.07)",
                  paddingBottom: "env(safe-area-inset-bottom, 0px)",
                  background: "rgba(8,8,14,0.98)",
                }}>
                {tabs.map(t => {
                  const isActive = tab === t.id;
                  return (
                    <button key={t.id} onClick={() => setTab(t.id)}
                      className="flex-1 flex flex-col items-center justify-center gap-1 py-3 relative transition-all"
                      style={{ color: isActive ? "#f59e0b" : "rgba(255,255,255,0.28)" }}>
                      {isActive && (
                        <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
                          style={{ background: "linear-gradient(90deg, transparent, #e8700a, transparent)" }} />
                      )}
                      <div className="relative">
                        {t.icon}
                        {t.badge && t.badge > 0 && (
                          <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-[9px] font-bold text-white flex items-center justify-center"
                            style={{ background: "linear-gradient(135deg,#e8700a,#f59e0b)" }}>
                            {t.badge > 9 ? "9+" : t.badge}
                          </span>
                        )}
                      </div>
                      <span className={`text-[10px] leading-none ${isActive ? "font-semibold" : "font-medium"}`}>{t.label}</span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── CSS анимации ── */}
      <style jsx global>{`
        @keyframes arayOrbSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes arayHighlight {
          0%, 100% { opacity: 0.82; transform: translateX(0) translateY(0); }
          33% { opacity: 0.6; transform: translateX(15%) translateY(8%); }
          66% { opacity: 0.9; transform: translateX(-8%) translateY(15%); }
        }
        @keyframes arayBounce {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </>
  );
}
