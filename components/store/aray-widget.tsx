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

type Message = { id: string; role: "user" | "assistant"; content: string; timestamp: Date };
type Tab = "chat" | "cart" | "calc" | "profile";
type UserInfo = {
  authenticated: boolean; name: string | null; email: string | null;
  level: string; levelInfo: { label: string; next: string; color: string; points: number; nextPoints: number };
  totalChats: number; totalPoints: number; facts: Record<string, string>;
  recentOrders: { id: string; orderNumber: number; status: string; totalAmount: number; createdAt: string }[];
};
interface ArayWidgetProps { page?: string; productName?: string; cartTotal?: number; enabled?: boolean; }

const LEVEL_ICONS: Record<string, string> = { NOVICE: "🌱", BUILDER: "🏗️", MASTER: "⭐", PARTNER: "💎" };

// ─── Фирменный значок Арай ────────────────────────────────────────────────────
// Чистый, профессиональный, играющий — как у Alice AI

function ArayIcon({ size = 40, pulse = false }: { size?: number; pulse?: boolean }) {
  const r = size / 2;
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 100 100" className="absolute inset-0">
        <defs>
          {/* Основной градиент — тёплый золотисто-оранжевый */}
          <radialGradient id={`ag-${size}`} cx="38%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#fff3c0" />
            <stop offset="20%" stopColor="#fbbf24" />
            <stop offset="50%" stopColor="#e8700a" />
            <stop offset="80%" stopColor="#9a3412" />
            <stop offset="100%" stopColor="#431407" />
          </radialGradient>
          {/* Вторичный отсвет снизу-справа */}
          <radialGradient id={`ag2-${size}`} cx="72%" cy="74%" r="50%">
            <stop offset="0%" stopColor="#fb923c" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#fb923c" stopOpacity="0" />
          </radialGradient>
          {/* Блик */}
          <radialGradient id={`hl-${size}`} cx="32%" cy="25%" r="45%">
            <stop offset="0%" stopColor="white" stopOpacity="0.92" />
            <stop offset="40%" stopColor="white" stopOpacity="0.3" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>
          <filter id={`glow-${size}`}>
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        {/* Тень под шаром */}
        <ellipse cx="50" cy="93" rx="26" ry="5" fill="rgba(0,0,0,0.18)" />
        {/* Основная сфера */}
        <circle cx="50" cy="50" r="46" fill={`url(#ag-${size})`} />
        {/* Отсвет снизу */}
        <circle cx="50" cy="50" r="46" fill={`url(#ag2-${size})`} />
        {/* Блик (зеркальная точка) */}
        <circle cx="50" cy="50" r="46" fill={`url(#hl-${size})`} />
        {/* Ободок */}
        <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(255,200,80,0.25)" strokeWidth="1" />
      </svg>

      {/* Вращающееся свечение */}
      <div className="absolute inset-0 rounded-full overflow-hidden">
        <div style={{
          position: "absolute", inset: 0, borderRadius: "50%",
          background: "conic-gradient(from 0deg, transparent 0%, rgba(255,220,80,0.18) 20%, transparent 40%, rgba(255,100,10,0.12) 60%, transparent 80%)",
          animation: "arayIconSpin 8s linear infinite",
          mixBlendMode: "overlay",
        }} />
      </div>

      {/* Внешнее свечение при пульсе */}
      {pulse && (
        <div className="absolute inset-[-4px] rounded-full animate-ping"
          style={{ background: "rgba(232,112,10,0.25)", animationDuration: "1.5s" }} />
      )}
    </div>
  );
}

// ─── Голосовой ввод ───────────────────────────────────────────────────────────

function useVoiceInput(onResult: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const recogRef = useRef<any>(null);
  const start = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR();
    r.lang = "ru-RU"; r.interimResults = false; r.maxAlternatives = 1;
    r.onstart = () => setListening(true);
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    r.onresult = (e: any) => { const t = e.results[0]?.[0]?.transcript || ""; if (t) onResult(t); };
    r.start(); recogRef.current = r;
  }, [onResult]);
  const stop = useCallback(() => { recogRef.current?.stop(); setListening(false); }, []);
  return { listening, start, stop };
}

// ─── Сообщение ────────────────────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"} mb-4`}>
      {!isUser && (
        <div className="shrink-0 mt-0.5">
          <ArayIcon size={28} />
        </div>
      )}
      <div className={`max-w-[78%] ${isUser ? "items-end" : "items-start"} flex flex-col gap-1`}>
        <div
          className="px-4 py-3 text-sm leading-relaxed"
          style={isUser ? {
            background: "linear-gradient(135deg, #e8700a 0%, #f59e0b 100%)",
            color: "#fff",
            borderRadius: "18px 18px 4px 18px",
          } : {
            background: "rgba(255,255,255,0.07)",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "#e2e4eb",
            borderRadius: "18px 18px 18px 4px",
          }}
        >
          {msg.content.split("\n").map((line, i, arr) => (
            <span key={i}>{line}{i < arr.length - 1 && <br />}</span>
          ))}
        </div>
        <span className="text-[10px] px-1" style={{ color: "rgba(255,255,255,0.22)" }}>
          {msg.timestamp.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
    </div>
  );
}

// ─── Чат ──────────────────────────────────────────────────────────────────────

function ChatTab({ messages, loading, input, setInput, sendMessage, chips, messagesEndRef, inputRef }: {
  messages: Message[]; loading: boolean; input: string;
  setInput: (v: string) => void; sendMessage: (t?: string) => void;
  chips: string[]; messagesEndRef: React.RefObject<HTMLDivElement>;
  inputRef: React.RefObject<HTMLTextAreaElement>;
}) {
  const { listening, start, stop } = useVoiceInput(text => {
    setInput(input ? input + " " + text : text);
    inputRef.current?.focus();
  });

  return (
    <>
      <div className="flex-1 overflow-y-auto px-4 py-4 overscroll-contain">
        {messages.map(m => <MessageBubble key={m.id} msg={m} />)}
        {loading && (
          <div className="flex gap-3 mb-4">
            <ArayIcon size={28} />
            <div className="px-4 py-3 rounded-[18px] rounded-tl-[4px]"
              style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="flex gap-1.5 items-center h-4">
                {[0,1,2].map(i => (
                  <span key={i} className="w-2 h-2 rounded-full"
                    style={{ background: "#e8700a", animation: `arayDot 1.4s ease-in-out ${i*0.2}s infinite` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Чипы */}
      {messages.length <= 1 && !loading && chips.length > 0 && (
        <div className="px-4 pb-3 flex gap-2 flex-wrap">
          {chips.map(q => (
            <button key={q} onClick={() => sendMessage(q)}
              className="text-xs px-3.5 py-1.5 rounded-full transition-all active:scale-95"
              style={{ background: "rgba(232,112,10,0.1)", border: "1px solid rgba(232,112,10,0.22)", color: "#f59e0b" }}>
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Ввод */}
      <div className="px-4 py-3 flex gap-2.5 items-end flex-shrink-0"
        style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <button onClick={listening ? stop : start}
          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 relative transition-all"
          style={{
            background: listening ? "linear-gradient(135deg,#ef4444,#b91c1c)" : "rgba(255,255,255,0.06)",
            border: listening ? "none" : "1px solid rgba(255,255,255,0.1)",
            boxShadow: listening ? "0 0 16px rgba(239,68,68,0.4)" : "none",
          }}>
          {listening && <span className="absolute inset-0 rounded-full animate-ping opacity-50"
            style={{ background: "rgba(239,68,68,0.4)", animationDuration: "1s" }} />}
          {listening
            ? <MicOff className="w-4 h-4 text-white relative z-10" />
            : <Mic className="w-4 h-4 text-white/35 relative z-10" />}
        </button>

        <div className="flex-1 relative">
          <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            rows={1}
            placeholder={listening ? "🎤 Слушаю..." : "Написать Araю..."}
            className="w-full resize-none text-sm rounded-2xl px-4 py-2.5 focus:outline-none transition-all placeholder:text-white/20"
            style={{
              background: "rgba(255,255,255,0.07)",
              border: listening ? "1px solid rgba(239,68,68,0.35)" : "1px solid rgba(255,255,255,0.1)",
              color: "#e2e4eb", maxHeight: "100px",
            }} />
        </div>

        <button onClick={() => sendMessage()} disabled={loading || !input.trim()}
          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all disabled:opacity-25"
          style={{
            background: input.trim() ? "linear-gradient(135deg,#e8700a,#f59e0b)" : "rgba(255,255,255,0.06)",
            border: input.trim() ? "none" : "1px solid rgba(255,255,255,0.1)",
            boxShadow: input.trim() ? "0 4px 16px rgba(232,112,10,0.45)" : "none",
          }}>
          {loading ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Send className="w-4 h-4 text-white" />}
        </button>
      </div>
    </>
  );
}

// ─── Корзина ──────────────────────────────────────────────────────────────────

function CartTab() {
  const { items, updateQuantity, removeItem, totalPrice, totalItems } = useCartStore();
  const total = totalPrice(); const count = totalItems();

  if (items.length === 0) return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
        style={{ background: "rgba(255,255,255,0.05)" }}>
        <ShoppingCart className="w-8 h-8 text-white/20" />
      </div>
      <div className="text-center">
        <p className="text-white/60 font-medium">Корзина пуста</p>
        <p className="text-white/30 text-sm mt-1">Добавь товары из каталога</p>
      </div>
      <Link href="/catalog" className="px-5 py-2.5 rounded-xl text-sm font-medium text-white"
        style={{ background: "linear-gradient(135deg,#e8700a,#f59e0b)" }}>
        В каталог
      </Link>
    </div>
  );

  return (
    <>
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 overscroll-contain">
        {items.map(item => (
          <div key={item.id} className="flex gap-3 p-3.5 rounded-2xl"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-white/5">
              {item.productImage
                ? <img src={item.productImage} alt={item.productName} className="object-cover w-full h-full" />
                : <div className="w-full h-full flex items-center justify-center"><Package className="w-6 h-6 text-white/15" /></div>}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white/85 font-medium truncate">{item.productName}</p>
              <p className="text-xs text-white/35 mt-0.5">{item.variantSize} · {item.unitType === "CUBE" ? "м³" : "шт"}</p>
              <p className="text-sm font-bold mt-1.5" style={{ color: "#f59e0b" }}>{formatPrice(item.price * item.quantity)}</p>
            </div>
            <div className="flex flex-col items-end justify-between">
              <button onClick={() => removeItem(item.id)} className="p-1 hover:bg-red-500/15 rounded-lg transition-colors">
                <Trash2 className="w-3.5 h-3.5 text-red-400/40" />
              </button>
              <div className="flex items-center gap-2">
                <button onClick={() => updateQuantity(item.id, Math.max(0.001, item.quantity - (item.unitType === "CUBE" ? 0.5 : 1)))}
                  className="w-7 h-7 rounded-full flex items-center justify-center bg-white/8">
                  <Minus className="w-3 h-3 text-white/50" />
                </button>
                <span className="text-xs text-white/70 tabular-nums min-w-[24px] text-center">{item.quantity}</span>
                <button onClick={() => updateQuantity(item.id, item.quantity + (item.unitType === "CUBE" ? 0.5 : 1))}
                  className="w-7 h-7 rounded-full flex items-center justify-center bg-white/8">
                  <Plus className="w-3 h-3 text-white/50" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="px-4 pb-6 pt-3 flex-shrink-0" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-white/40 text-sm">{count} поз.</span>
          <span className="text-xl font-bold text-white">{formatPrice(total)}</span>
        </div>
        <Link href="/checkout"
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-white font-semibold transition-all active:scale-[0.98]"
          style={{ background: "linear-gradient(135deg,#e8700a,#f59e0b)", boxShadow: "0 8px 24px rgba(232,112,10,0.35)" }}>
          Оформить заказ <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    </>
  );
}

// ─── Калькулятор ──────────────────────────────────────────────────────────────

function CalcTab({ onAsk }: { onAsk: (t: string) => void }) {
  const [length, setLength] = useState(""); const [width, setWidth] = useState("");
  const [height, setHeight] = useState(""); const [count, setCount] = useState("1");
  const L = parseFloat(length)||0, W = parseFloat(width)||0, H = parseFloat(height)||0, C = parseFloat(count)||1;
  const vol = L>0&&W>0&&H>0 ? L*W*H*C : 0;
  const inp = { background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.1)", color:"#e2e4eb", borderRadius:"14px" };

  return (
    <div className="flex-1 flex flex-col px-4 py-4 gap-4 overflow-y-auto">
      <p className="text-xs text-white/30 uppercase tracking-widest font-medium">Объём пиломатериала</p>
      <div className="grid grid-cols-2 gap-3">
        {[
          {label:"Длина, м", val:length, set:setLength, ph:"6"},
          {label:"Ширина, м", val:width, set:setWidth, ph:"0.15"},
          {label:"Толщина, м", val:height, set:setHeight, ph:"0.05"},
          {label:"Кол-во, шт", val:count, set:setCount, ph:"10"},
        ].map(f => (
          <div key={f.label}>
            <label className="text-[11px] text-white/35 block mb-1.5">{f.label}</label>
            <input type="number" value={f.val} onChange={e=>f.set(e.target.value)}
              placeholder={f.ph} inputMode="decimal"
              className="w-full px-3.5 py-2.5 text-sm focus:outline-none placeholder:text-white/15"
              style={inp} />
          </div>
        ))}
      </div>

      <div className="rounded-2xl p-5 transition-all" style={{
        background: vol>0 ? "rgba(232,112,10,0.1)" : "rgba(255,255,255,0.04)",
        border: vol>0 ? "1px solid rgba(232,112,10,0.3)" : "1px solid rgba(255,255,255,0.07)",
      }}>
        <p className="text-xs text-white/35 mb-1">Результат</p>
        <div className="flex items-baseline gap-2">
          <span className="text-5xl font-bold tabular-nums" style={{ color: vol>0?"#f59e0b":"rgba(255,255,255,0.12)" }}>
            {vol>0 ? vol.toFixed(3) : "—"}
          </span>
          {vol>0 && <span className="text-xl text-white/40">м³</span>}
        </div>
        {vol>0 && <p className="text-xs text-white/25 mt-2">{L}×{W}×{H}м · {C}шт</p>}
      </div>

      {vol>0 && (
        <button onClick={() => onAsk(`Сколько стоит ${vol.toFixed(3)} м³ пиломатериала?`)}
          className="w-full py-3.5 rounded-2xl text-sm font-medium text-white flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
          style={{ background:"linear-gradient(135deg,#e8700a,#f59e0b)", boxShadow:"0 8px 20px rgba(232,112,10,0.3)" }}>
          <MessageCircle className="w-4 h-4" /> Спросить Арая о цене
        </button>
      )}

      <p className="text-center text-[11px] text-white/20">
        Или напиши напрямую: "сколько нужно на дом 8×6"
      </p>
    </div>
  );
}

// ─── Профиль ──────────────────────────────────────────────────────────────────

function ProfileTab({ userInfo, onAskName }: { userInfo: UserInfo|null; onAskName: ()=>void }) {
  if (!userInfo) return <div className="flex-1 flex items-center justify-center"><Loader2 className="w-5 h-5 text-white/20 animate-spin" /></div>;

  const STATUS: Record<string,string> = {
    NEW:"Новый",CONFIRMED:"Подтверждён",PROCESSING:"В работе",SHIPPED:"Отгружен",
    IN_DELIVERY:"Доставляется",DELIVERED:"Доставлен",COMPLETED:"Завершён",CANCELLED:"Отменён",READY_PICKUP:"Готов",
  };
  const pct = userInfo.levelInfo
    ? Math.min(100,((userInfo.totalPoints-userInfo.levelInfo.points)/Math.max(1,userInfo.levelInfo.nextPoints-userInfo.levelInfo.points))*100) : 0;

  if (!userInfo.authenticated) return (
    <div className="flex-1 flex flex-col px-5 py-6 gap-5 overflow-y-auto">
      <div className="text-center py-2">
        <div className="flex justify-center mb-5"><ArayIcon size={80} /></div>
        <p className="text-lg font-semibold text-white">Войди — Арай запомнит всё</p>
        <p className="text-sm text-white/35 mt-1.5">История заказов, уровень, советы</p>
      </div>
      <div className="space-y-2">
        {[
          {i:"🧠",t:"Память на всех устройствах"},
          {i:"📦",t:"История всех заказов"},
          {i:"🏆",t:"Уровни и достижения"},
          {i:"💎",t:"Партнёр ARAY — 50% с рекомендаций"},
        ].map(x => (
          <div key={x.t} className="flex items-center gap-3 px-4 py-3 rounded-2xl"
            style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.07)"}}>
            <span className="text-xl">{x.i}</span>
            <span className="text-sm text-white/65">{x.t}</span>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-2.5">
        <Link href="/login" className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-white font-semibold text-sm"
          style={{background:"linear-gradient(135deg,#e8700a,#f59e0b)",boxShadow:"0 8px 24px rgba(232,112,10,0.35)"}}>
          <LogIn className="w-4 h-4" /> Войти
        </Link>
        <Link href="/register" className="w-full flex items-center justify-center py-3.5 rounded-2xl text-white/50 text-sm"
          style={{border:"1px solid rgba(255,255,255,0.1)"}}>
          Создать аккаунт
        </Link>
      </div>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col px-4 py-4 gap-4 overflow-y-auto overscroll-contain">
      {/* Карточка */}
      <div className="rounded-2xl p-4" style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.08)"}}>
        <div className="flex items-center gap-3.5 mb-4">
          <ArayIcon size={52} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-bold text-white truncate">{userInfo.name || "Гость"}</p>
              {!userInfo.name && (
                <button onClick={onAskName} className="text-[10px] px-2 py-0.5 rounded-lg text-white/40"
                  style={{border:"1px solid rgba(255,255,255,0.12)"}}>+ имя</button>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span>{LEVEL_ICONS[userInfo.level]}</span>
              <span className="text-sm" style={{color:userInfo.levelInfo?.color||"#f59e0b"}}>{userInfo.levelInfo?.label}</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-white">{userInfo.totalPoints}</p>
            <p className="text-[10px] text-white/30">баллов</p>
          </div>
        </div>
        {userInfo.level !== "PARTNER" && (
          <div>
            <div className="flex justify-between text-[10px] text-white/25 mb-1.5">
              <span>{userInfo.levelInfo?.label}</span><span>→ {userInfo.levelInfo?.next}</span>
            </div>
            <div className="h-1 rounded-full overflow-hidden" style={{background:"rgba(255,255,255,0.08)"}}>
              <div className="h-full rounded-full transition-all duration-700"
                style={{width:`${pct}%`,background:`linear-gradient(90deg,#e8700a,#f59e0b)`}} />
            </div>
          </div>
        )}
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-2 gap-2.5">
        {[
          {label:"Диалогов",val:userInfo.totalChats,icon:<MessageCircle className="w-4 h-4"/>},
          {label:"Заказов",val:userInfo.recentOrders.length,icon:<Package className="w-4 h-4"/>},
        ].map(s => (
          <div key={s.label} className="rounded-2xl p-4 text-center"
            style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.07)"}}>
            <div className="flex justify-center mb-1.5 text-white/25">{s.icon}</div>
            <p className="text-2xl font-bold text-white">{s.val}</p>
            <p className="text-[10px] text-white/30 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Заказы */}
      {userInfo.recentOrders.length > 0 && (
        <div>
          <p className="text-[10px] text-white/25 uppercase tracking-widest mb-2">Последние заказы</p>
          <div className="space-y-2">
            {userInfo.recentOrders.map(o => (
              <Link key={o.id} href={`/account/orders/${o.orderNumber}`}
                className="flex items-center justify-between px-4 py-3 rounded-xl active:scale-[0.98] transition-all"
                style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.07)"}}>
                <div>
                  <p className="text-sm text-white/75 font-medium">№{o.orderNumber}</p>
                  <p className="text-[11px] text-white/30">{STATUS[o.status]||o.status}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold" style={{color:"#f59e0b"}}>{formatPrice(o.totalAmount)}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-white/20" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2 pb-2">
        {[
          {href:"/account",label:"Настройки",icon:<User className="w-4 h-4"/>},
          {href:"/account/orders",label:"Все заказы",icon:<Package className="w-4 h-4"/>},
        ].map(l => (
          <Link key={l.href} href={l.href}
            className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all"
            style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.06)"}}>
            <span className="text-white/25">{l.icon}</span>
            <span className="text-sm text-white/55 flex-1">{l.label}</span>
            <ChevronRight className="w-3.5 h-3.5 text-white/20" />
          </Link>
        ))}
      </div>
    </div>
  );
}

// ─── Главный компонент ────────────────────────────────────────────────────────

export function ArayWidget({ page, productName, cartTotal, enabled = true }: ArayWidgetProps) {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [tab, setTab] = useState<Tab>("chat");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasNew, setHasNew] = useState(false);
  const [hiddenForKeyboard, setHiddenForKeyboard] = useState(false);
  const [proactiveBubble, setProactiveBubble] = useState<string|null>(null);
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const [userInfo, setUserInfo] = useState<UserInfo|null>(null);
  const [iconPulse, setIconPulse] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const dragControls = useDragControls();
  const cartCount = useCartStore(s => s.totalItems());
  const pageCtx = { page, productName, cartTotal };
  const chips = buildArayChips(pageCtx);

  useEffect(() => { fetch("/api/ai/me").then(r=>r.json()).then(setUserInfo).catch(()=>{}); }, []);
  useEffect(() => { const t = setTimeout(()=>setVisible(true), 1500); return ()=>clearTimeout(t); }, []);
  useEffect(() => {
    const t = setInterval(()=>{ setIconPulse(true); setTimeout(()=>setIconPulse(false),2000); }, 10000);
    setTimeout(()=>{ setIconPulse(true); setTimeout(()=>setIconPulse(false),2000); }, 4000);
    return ()=>clearInterval(t);
  }, []);
  useEffect(() => {
    const vv = window.visualViewport; if (!vv) return;
    const upd = () => {
      const off = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setKeyboardOffset(off);
      if (!open) setHiddenForKeyboard(off > 50);
    };
    vv.addEventListener("resize", upd); vv.addEventListener("scroll", upd);
    return () => { vv.removeEventListener("resize", upd); vv.removeEventListener("scroll", upd); };
  }, [open]);

  const startChat = useCallback(() => {
    if (messages.length > 0) return;
    const name = userInfo?.name;
    const isReturning = document.cookie.includes("aray_visited=1");
    let greeting = buildArayGreeting({ ...pageCtx, isReturning });
    if (name) {
      const h = new Date().getHours();
      const t = h<12?"Доброе утро":h<17?"Привет":h<22?"Добрый вечер":"Поздно уже";
      greeting = `${t}, ${name}! 👋 ${productName?`Смотришь «${productName}»?`:"Чем могу помочь?"} Спрашивай — я рядом.`;
    }
    setMessages([{id:"welcome",role:"assistant",content:greeting,timestamp:new Date()}]);
    document.cookie = "aray_visited=1; max-age=2592000; path=/";
  }, [messages.length, userInfo?.name, page, productName, cartTotal]);

  useEffect(() => {
    const handler = () => { setVisible(true); setOpen(true); setHasNew(false); setTab("chat"); startChat(); };
    window.addEventListener("aray:open", handler);
    return () => window.removeEventListener("aray:open", handler);
  }, [startChat]);

  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => {
      if (!open) {
        const msg = userInfo?.name ? `${userInfo.name}, помочь с чем-нибудь? 👋`
          : productName ? `Смотришь «${productName}»? Помогу выбрать 👋`
          : "Если есть вопросы — я рядом 😊";
        setProactiveBubble(msg);
        setTimeout(()=>setProactiveBubble(null), 5000);
      }
    }, 18000);
    return ()=>clearTimeout(t);
  }, [visible, open, userInfo?.name, productName]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({behavior:"smooth"}); }, [messages]);

  const handleOpen = () => { setOpen(true); setHasNew(false); setProactiveBubble(null); setTab("chat"); startChat(); };
  const handleAskAray = (text: string) => { setTab("chat"); sendMessage(text); };
  const handleAskName = () => { setTab("chat"); setTimeout(()=>sendMessage("Как тебя зовут? Хочу обращаться по имени 😊"),100); };

  const sendMessage = async (text?: string) => {
    const msg = (text||input).trim();
    if (!msg||loading) return;
    setInput(""); setTab("chat");
    const userMsg: Message = {id:Date.now().toString(),role:"user",content:msg,timestamp:new Date()};
    setMessages(prev=>[...prev,userMsg]);
    setLoading(true);
    try {
      const res = await fetch("/api/ai/chat", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({messages:[...messages,userMsg].map(m=>({role:m.role,content:m.content})), context:{page,productName,cartTotal}}),
      });
      const data = await res.json();
      if (data.message?.includes("звать")||data.message?.includes("имя")) {
        fetch("/api/ai/me").then(r=>r.json()).then(setUserInfo).catch(()=>{});
      }
      setMessages(prev=>[...prev,{id:(Date.now()+1).toString(),role:"assistant",content:data.message||data.error||"Не получилось 🙏",timestamp:new Date()}]);
      if (!open) setHasNew(true);
    } catch {
      setMessages(prev=>[...prev,{id:(Date.now()+1).toString(),role:"assistant",content:"Нет связи. Попробуй снова 🙏",timestamp:new Date()}]);
    } finally { setLoading(false); }
  };

  if (!enabled || !visible) return null;
  if (hiddenForKeyboard && !open) return null;

  const tabs: {id:Tab;icon:React.ReactNode;label:string;badge?:number}[] = [
    {id:"chat",icon:<MessageCircle className="w-5 h-5"/>,label:"Чат"},
    {id:"cart",icon:<ShoppingCart className="w-5 h-5"/>,label:"Корзина",badge:cartCount||undefined},
    {id:"calc",icon:<Calculator className="w-5 h-5"/>,label:"Расчёт"},
    {id:"profile",icon:<User className="w-5 h-5"/>,label:"Профиль"},
  ];

  return (
    <>
      {/* Десктоп кнопка */}
      {!open && (
        <div className="hidden lg:flex fixed z-50 flex-col items-end gap-2" style={{bottom:"2rem",right:"1.5rem"}}>
          {proactiveBubble && (
            <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0}}
              onClick={handleOpen} className="max-w-[200px] px-3.5 py-2.5 rounded-2xl text-xs text-white/75 cursor-pointer"
              style={{background:"rgba(10,10,18,0.96)",border:"1px solid rgba(255,255,255,0.09)",boxShadow:"0 8px 32px rgba(0,0,0,0.5)"}}>
              {proactiveBubble}
            </motion.div>
          )}
          <div className="px-3 py-1.5 rounded-xl pointer-events-none text-center"
            style={{background:"rgba(10,10,18,0.9)",border:"1px solid rgba(255,255,255,0.07)"}}>
            <p className="text-[10px] font-bold text-white/70 tracking-widest">АРАЙ</p>
            <p className="text-[9px] text-white/25 mt-0.5">Световой друг</p>
          </div>
          <button onClick={handleOpen} aria-label="Открыть Арай"
            className="relative focus:outline-none" style={{width:56,height:56}}>
            <div className="absolute inset-0 rounded-2xl" style={{
              background:"linear-gradient(145deg,#1a0800,#3d1206,#7c2d12)",
              border:"1px solid rgba(245,158,11,0.25)",
              boxShadow:"0 0 24px rgba(232,112,10,0.4),0 0 48px rgba(232,112,10,0.12)",
            }}/>
            <div className="absolute inset-[7px]">
              <ArayIcon size={42} pulse={iconPulse} />
            </div>
            {hasNew && <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-black"
              style={{background:"#e8700a"}}/>}
          </button>
        </div>
      )}

      {/* Полноэкранный виджет */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:0.2}}
              className="fixed inset-0 z-[60]"
              style={{background:"rgba(0,0,0,0.65)",backdropFilter:"blur(10px)"}}
              onClick={()=>setOpen(false)} />

            <motion.div
              initial={{y:"100%"}}
              animate={{y:keyboardOffset>0?-keyboardOffset:0}}
              exit={{y:"100%"}}
              transition={{type:"spring",damping:34,stiffness:360}}
              drag="y" dragControls={dragControls}
              dragConstraints={{top:0,bottom:0}} dragElastic={{top:0,bottom:0.3}}
              onDragEnd={(_,info)=>{ if(info.offset.y>100) setOpen(false); }}
              className="fixed bottom-0 left-0 right-0 z-[61] flex flex-col"
              style={{
                height:"92dvh",
                borderRadius:"20px 20px 0 0",
                background:"linear-gradient(180deg, #111118 0%, #0e0e15 100%)",
                border:"1px solid rgba(255,255,255,0.07)",
                boxShadow:"0 -12px 60px rgba(0,0,0,0.8)",
              }}
            >
              {/* Ручка */}
              <div className="flex justify-center pt-2.5 pb-1 cursor-grab active:cursor-grabbing shrink-0"
                onPointerDown={e=>dragControls.start(e)}>
                <div className="w-8 h-[3px] rounded-full bg-white/12" />
              </div>

              {/* Шапка */}
              <div className="flex items-center gap-3 px-5 py-3 shrink-0"
                style={{borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
                <ArayIcon size={36} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-white">Арай</p>
                    {userInfo?.name && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                        style={{background:"rgba(232,112,10,0.12)",color:"#f59e0b",border:"1px solid rgba(232,112,10,0.2)"}}>
                        {LEVEL_ICONS[userInfo.level]} {userInfo.levelInfo?.label}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] mt-0.5 flex items-center gap-1.5 text-white/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
                    {userInfo?.name ? `Привет, ${userInfo.name}!` : "Онлайн · ARAY PRODUCTIONS"}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button onClick={()=>{setMessages([]);startChat();}}
                    className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-white/6 transition-colors">
                    <RotateCcw className="w-3.5 h-3.5 text-white/25" />
                  </button>
                  <button onClick={()=>setOpen(false)}
                    className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-white/6 transition-colors">
                    <X className="w-4 h-4 text-white/35" />
                  </button>
                </div>
              </div>

              {/* Содержимое */}
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.div key={tab} initial={{opacity:0,x:8}} animate={{opacity:1,x:0}}
                    exit={{opacity:0,x:-8}} transition={{duration:0.15}}
                    className="flex-1 flex flex-col min-h-0 overflow-hidden">
                    {tab==="chat" && <ChatTab messages={messages} loading={loading} input={input} setInput={setInput}
                      sendMessage={sendMessage} chips={chips} messagesEndRef={messagesEndRef} inputRef={inputRef}/>}
                    {tab==="cart" && <CartTab/>}
                    {tab==="calc" && <CalcTab onAsk={handleAskAray}/>}
                    {tab==="profile" && <ProfileTab userInfo={userInfo} onAskName={handleAskName}/>}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Таббар */}
              <div className="shrink-0 flex"
                style={{borderTop:"1px solid rgba(255,255,255,0.06)",paddingBottom:"env(safe-area-inset-bottom,0px)",background:"rgba(8,8,14,0.98)"}}>
                {tabs.map(t=>{
                  const active = tab===t.id;
                  return (
                    <button key={t.id} onClick={()=>setTab(t.id)}
                      className="flex-1 flex flex-col items-center justify-center gap-1 py-3 relative transition-all"
                      style={{color:active?"#f59e0b":"rgba(255,255,255,0.25)"}}>
                      {active && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full" style={{background:"#e8700a"}}/>}
                      <div className="relative">
                        {t.icon}
                        {t.badge&&t.badge>0&&(
                          <span className="absolute -top-1.5 -right-2 w-4 h-4 rounded-full text-[9px] font-bold text-white flex items-center justify-center"
                            style={{background:"linear-gradient(135deg,#e8700a,#f59e0b)"}}>
                            {t.badge>9?"9+":t.badge}
                          </span>
                        )}
                      </div>
                      <span className={`text-[10px] leading-none ${active?"font-semibold":"font-normal"}`}>{t.label}</span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <style jsx global>{`
        @keyframes arayIconSpin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes arayDot { 0%,60%,100%{transform:scale(0.5);opacity:0.3} 30%{transform:scale(1);opacity:1} }
      `}</style>
    </>
  );
}
