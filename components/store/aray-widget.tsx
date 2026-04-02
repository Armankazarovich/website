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
interface ArayWidgetProps { page?: string; productName?: string; cartTotal?: number; enabled?: boolean; }

const LEVEL_ICONS: Record<string, string> = { NOVICE: "🌱", BUILDER: "🏗️", MASTER: "⭐", PARTNER: "💎" };

// ─── Фирменный SVG-значок ─────────────────────────────────────────────────────

function ArayIcon({ size = 40 }: { size?: number }) {
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 100 100">
        <defs>
          <radialGradient id="aig1" cx="35%" cy="28%" r="72%">
            <stop offset="0%" stopColor="#fff8d6" />
            <stop offset="18%" stopColor="#fbbf24" />
            <stop offset="48%" stopColor="#e8700a" />
            <stop offset="78%" stopColor="#9a3412" />
            <stop offset="100%" stopColor="#3b0f04" />
          </radialGradient>
          <radialGradient id="aig2" cx="70%" cy="75%" r="50%">
            <stop offset="0%" stopColor="#fb923c" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#fb923c" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="aig3" cx="30%" cy="24%" r="42%">
            <stop offset="0%" stopColor="white" stopOpacity="0.88" />
            <stop offset="55%" stopColor="white" stopOpacity="0.18" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="50" cy="50" r="47" fill="url(#aig1)" />
        <circle cx="50" cy="50" r="47" fill="url(#aig2)" />
        <circle cx="50" cy="50" r="47" fill="url(#aig3)" />
        <circle cx="50" cy="50" r="47" fill="none" stroke="rgba(255,210,80,0.2)" strokeWidth="1" />
      </svg>
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
    r.lang = "ru-RU"; r.interimResults = false;
    r.onstart = () => setListening(true);
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    r.onresult = (e: any) => { const t = e.results[0]?.[0]?.transcript || ""; if (t) onResult(t); };
    r.start(); recogRef.current = r;
  }, [onResult]);
  const stop = useCallback(() => { recogRef.current?.stop(); setListening(false); }, []);
  return { listening, start, stop };
}

// ─── Пузырь сообщения ─────────────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex gap-2.5 ${isUser ? "flex-row-reverse" : "flex-row"} mb-3.5`}>
      {!isUser && (
        <div className="shrink-0 mt-0.5"><ArayIcon size={26} /></div>
      )}
      <div className={`flex flex-col gap-1 ${isUser ? "items-end" : "items-start"} max-w-[80%]`}>
        <div className={`px-3.5 py-2.5 text-sm leading-relaxed`} style={
          isUser
            ? { background: "linear-gradient(135deg, hsl(var(--primary)), #f59e0b)", color: "#fff", borderRadius: "16px 16px 4px 16px" }
            : { background: "hsl(var(--muted))", color: "hsl(var(--foreground))", borderRadius: "16px 16px 16px 4px", border: "1px solid hsl(var(--border))" }
        }>
          {msg.content.split("\n").map((line, i, arr) => (
            <span key={i}>{line}{i < arr.length - 1 && <br />}</span>
          ))}
        </div>
        <span className="text-[10px] px-1" style={{ color: "hsl(var(--muted-foreground))", opacity: 0.6 }}>
          {msg.timestamp.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
    </div>
  );
}

// ─── Вкладка: Чат ─────────────────────────────────────────────────────────────

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
      {/* Сообщения */}
      <div className="flex-1 overflow-y-auto px-4 py-4 overscroll-contain">
        {messages.map(m => <MessageBubble key={m.id} msg={m} />)}
        {loading && (
          <div className="flex gap-2.5 mb-3">
            <ArayIcon size={26} />
            <div className="px-3.5 py-3 rounded-2xl rounded-tl-[4px]" style={{ background: "hsl(var(--muted))", border: "1px solid hsl(var(--border))" }}>
              <div className="flex gap-1.5 items-center h-4">
                {[0, 1, 2].map(i => (
                  <span key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: "hsl(var(--primary))", animation: `arayDot 1.4s ease-in-out ${i * 0.2}s infinite` }} />
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
              style={{ background: "hsl(var(--primary) / 0.1)", border: "1px solid hsl(var(--primary) / 0.25)", color: "hsl(var(--primary))" }}>
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Поле ввода */}
      <div className="px-4 py-3 flex gap-2.5 items-end flex-shrink-0" style={{ borderTop: "1px solid hsl(var(--border))" }}>
        <button onClick={listening ? stop : start}
          className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 relative transition-all"
          style={{
            background: listening ? "linear-gradient(135deg,#ef4444,#b91c1c)" : "hsl(var(--muted))",
            border: `1px solid ${listening ? "transparent" : "hsl(var(--border))"}`,
            boxShadow: listening ? "0 0 12px rgba(239,68,68,0.4)" : "none",
          }}>
          {listening && <span className="absolute inset-0 rounded-full animate-ping" style={{ background: "rgba(239,68,68,0.3)", animationDuration: "1s" }} />}
          {listening ? <MicOff className="w-4 h-4 text-white relative z-10" /> : <Mic className="w-4 h-4 relative z-10" style={{ color: "hsl(var(--muted-foreground))" }} />}
        </button>

        <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
          rows={1} placeholder={listening ? "🎤 Слушаю..." : "Написать Araю..."}
          className="flex-1 resize-none text-sm rounded-2xl px-4 py-2.5 focus:outline-none transition-all"
          style={{
            background: "hsl(var(--muted))",
            border: `1px solid ${listening ? "rgba(239,68,68,0.4)" : "hsl(var(--border))"}`,
            color: "hsl(var(--foreground))",
            maxHeight: "100px",
          }} />

        <button onClick={() => sendMessage()} disabled={loading || !input.trim()}
          className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all disabled:opacity-30"
          style={{
            background: input.trim() ? "linear-gradient(135deg, hsl(var(--primary)), #f59e0b)" : "hsl(var(--muted))",
            border: input.trim() ? "none" : "1px solid hsl(var(--border))",
            boxShadow: input.trim() ? "0 4px 14px hsl(var(--primary) / 0.4)" : "none",
          }}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" style={{ color: "hsl(var(--primary-foreground))" }} />
            : <Send className="w-4 h-4" style={{ color: input.trim() ? "#fff" : "hsl(var(--muted-foreground))" }} />}
        </button>
      </div>
    </>
  );
}

// ─── Вкладка: Корзина ─────────────────────────────────────────────────────────

function CartTab() {
  const { items, updateQuantity, removeItem, totalPrice, totalItems } = useCartStore();
  const total = totalPrice(); const count = totalItems();
  if (items.length === 0) return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "hsl(var(--muted))" }}>
        <ShoppingCart className="w-8 h-8" style={{ color: "hsl(var(--muted-foreground))", opacity: 0.4 }} />
      </div>
      <div className="text-center">
        <p className="font-medium" style={{ color: "hsl(var(--foreground))" }}>Корзина пуста</p>
        <p className="text-sm mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>Добавь товары из каталога</p>
      </div>
      <Link href="/catalog" className="px-5 py-2.5 rounded-xl text-sm font-medium text-white"
        style={{ background: "linear-gradient(135deg, hsl(var(--primary)), #f59e0b)" }}>
        В каталог
      </Link>
    </div>
  );
  return (
    <>
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5 overscroll-contain">
        {items.map(item => (
          <div key={item.id} className="flex gap-3 p-3.5 rounded-2xl" style={{ background: "hsl(var(--muted))", border: "1px solid hsl(var(--border))" }}>
            <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0" style={{ background: "hsl(var(--border))" }}>
              {item.productImage ? <img src={item.productImage} alt={item.productName} className="object-cover w-full h-full" />
                : <div className="w-full h-full flex items-center justify-center"><Package className="w-6 h-6" style={{ color: "hsl(var(--muted-foreground))", opacity: 0.4 }} /></div>}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: "hsl(var(--foreground))" }}>{item.productName}</p>
              <p className="text-xs mt-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>{item.variantSize} · {item.unitType === "CUBE" ? "м³" : "шт"}</p>
              <p className="text-sm font-bold mt-1.5" style={{ color: "hsl(var(--primary))" }}>{formatPrice(item.price * item.quantity)}</p>
            </div>
            <div className="flex flex-col items-end justify-between">
              <button onClick={() => removeItem(item.id)} className="p-1 rounded-lg transition-colors hover:bg-red-50 dark:hover:bg-red-500/10">
                <Trash2 className="w-3.5 h-3.5 text-red-400" style={{ opacity: 0.5 }} />
              </button>
              <div className="flex items-center gap-1.5">
                <button onClick={() => updateQuantity(item.id, Math.max(0.001, item.quantity - (item.unitType === "CUBE" ? 0.5 : 1)))}
                  className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "hsl(var(--border))" }}>
                  <Minus className="w-3 h-3" style={{ color: "hsl(var(--foreground))" }} />
                </button>
                <span className="text-xs tabular-nums min-w-[24px] text-center" style={{ color: "hsl(var(--foreground))" }}>{item.quantity}</span>
                <button onClick={() => updateQuantity(item.id, item.quantity + (item.unitType === "CUBE" ? 0.5 : 1))}
                  className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "hsl(var(--border))" }}>
                  <Plus className="w-3 h-3" style={{ color: "hsl(var(--foreground))" }} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="px-4 pb-5 pt-3 flex-shrink-0" style={{ borderTop: "1px solid hsl(var(--border))" }}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>{count} позиций</span>
          <span className="text-xl font-bold" style={{ color: "hsl(var(--foreground))" }}>{formatPrice(total)}</span>
        </div>
        <Link href="/checkout" className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-white font-semibold transition-all active:scale-[0.98]"
          style={{ background: "linear-gradient(135deg, hsl(var(--primary)), #f59e0b)", boxShadow: "0 6px 20px hsl(var(--primary) / 0.35)" }}>
          Оформить заказ <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    </>
  );
}

// ─── Вкладка: Калькулятор ─────────────────────────────────────────────────────

function CalcTab({ onAsk }: { onAsk: (t: string) => void }) {
  const [length, setLength] = useState(""); const [width, setWidth] = useState("");
  const [height, setHeight] = useState(""); const [count, setCount] = useState("1");
  const L = parseFloat(length) || 0, W = parseFloat(width) || 0, H = parseFloat(height) || 0, C = parseFloat(count) || 1;
  const vol = L > 0 && W > 0 && H > 0 ? L * W * H * C : 0;
  const inp = { background: "hsl(var(--muted))", border: "1px solid hsl(var(--border))", color: "hsl(var(--foreground))", borderRadius: "14px" };
  return (
    <div className="flex-1 flex flex-col px-4 py-4 gap-4 overflow-y-auto">
      <p className="text-xs uppercase tracking-widest font-medium" style={{ color: "hsl(var(--muted-foreground))" }}>Объём пиломатериала</p>
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Длина, м", val: length, set: setLength, ph: "6" },
          { label: "Ширина, м", val: width, set: setWidth, ph: "0.15" },
          { label: "Толщина, м", val: height, set: setHeight, ph: "0.05" },
          { label: "Кол-во, шт", val: count, set: setCount, ph: "10" },
        ].map(f => (
          <div key={f.label}>
            <label className="text-[11px] block mb-1.5" style={{ color: "hsl(var(--muted-foreground))" }}>{f.label}</label>
            <input type="number" value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.ph} inputMode="decimal"
              className="w-full px-3.5 py-2.5 text-sm focus:outline-none" style={inp} />
          </div>
        ))}
      </div>
      <div className="rounded-2xl p-5 transition-all" style={{
        background: vol > 0 ? "hsl(var(--primary) / 0.08)" : "hsl(var(--muted))",
        border: `1px solid ${vol > 0 ? "hsl(var(--primary) / 0.3)" : "hsl(var(--border))"}`,
      }}>
        <p className="text-xs mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>Результат</p>
        <div className="flex items-baseline gap-2">
          <span className="text-5xl font-bold tabular-nums" style={{ color: vol > 0 ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))", opacity: vol > 0 ? 1 : 0.3 }}>
            {vol > 0 ? vol.toFixed(3) : "—"}
          </span>
          {vol > 0 && <span className="text-xl" style={{ color: "hsl(var(--muted-foreground))" }}>м³</span>}
        </div>
        {vol > 0 && <p className="text-xs mt-2" style={{ color: "hsl(var(--muted-foreground))", opacity: 0.7 }}>{L}×{W}×{H}м · {C}шт</p>}
      </div>
      {vol > 0 && (
        <button onClick={() => onAsk(`Сколько стоит ${vol.toFixed(3)} м³ пиломатериала?`)}
          className="w-full py-3.5 rounded-2xl text-sm font-semibold text-white flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
          style={{ background: "linear-gradient(135deg, hsl(var(--primary)), #f59e0b)", boxShadow: "0 6px 18px hsl(var(--primary) / 0.3)" }}>
          <MessageCircle className="w-4 h-4" /> Спросить Арая о цене
        </button>
      )}
      <p className="text-center text-[11px]" style={{ color: "hsl(var(--muted-foreground))", opacity: 0.6 }}>
        Или напиши: "сколько нужно на дом 8×6"
      </p>
    </div>
  );
}

// ─── Вкладка: Профиль ─────────────────────────────────────────────────────────

function ProfileTab({ userInfo, onAskName }: { userInfo: UserInfo | null; onAskName: () => void }) {
  if (!userInfo) return <div className="flex-1 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin" style={{ color: "hsl(var(--muted-foreground))" }} /></div>;
  const STATUS: Record<string, string> = { NEW: "Новый", CONFIRMED: "Подтверждён", PROCESSING: "В работе", SHIPPED: "Отгружен", IN_DELIVERY: "Доставляется", DELIVERED: "Доставлен", COMPLETED: "Завершён", CANCELLED: "Отменён", READY_PICKUP: "Готов" };
  const pct = userInfo.levelInfo ? Math.min(100, ((userInfo.totalPoints - userInfo.levelInfo.points) / Math.max(1, userInfo.levelInfo.nextPoints - userInfo.levelInfo.points)) * 100) : 0;
  if (!userInfo.authenticated) return (
    <div className="flex-1 flex flex-col px-5 py-6 gap-5 overflow-y-auto">
      <div className="text-center py-2">
        <div className="flex justify-center mb-5"><ArayIcon size={80} /></div>
        <p className="text-lg font-semibold" style={{ color: "hsl(var(--foreground))" }}>Войди — Арай запомнит всё</p>
        <p className="text-sm mt-1.5" style={{ color: "hsl(var(--muted-foreground))" }}>История, уровень, персональные советы</p>
      </div>
      <div className="space-y-2">
        {[{ i: "🧠", t: "Память на всех устройствах" }, { i: "📦", t: "История всех заказов" }, { i: "🏆", t: "Уровни и достижения" }, { i: "💎", t: "Партнёр — 50% с рекомендаций" }].map(x => (
          <div key={x.t} className="flex items-center gap-3 px-4 py-3 rounded-2xl" style={{ background: "hsl(var(--muted))", border: "1px solid hsl(var(--border))" }}>
            <span className="text-xl">{x.i}</span>
            <span className="text-sm" style={{ color: "hsl(var(--foreground))" }}>{x.t}</span>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-2.5">
        <Link href="/login" className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-white font-semibold text-sm"
          style={{ background: "linear-gradient(135deg, hsl(var(--primary)), #f59e0b)", boxShadow: "0 6px 20px hsl(var(--primary) / 0.35)" }}>
          <LogIn className="w-4 h-4" /> Войти
        </Link>
        <Link href="/register" className="w-full flex items-center justify-center py-3.5 rounded-2xl text-sm font-medium" style={{ border: "1px solid hsl(var(--border))", color: "hsl(var(--foreground))" }}>
          Создать аккаунт
        </Link>
      </div>
    </div>
  );
  return (
    <div className="flex-1 flex flex-col px-4 py-4 gap-3.5 overflow-y-auto overscroll-contain">
      <div className="rounded-2xl p-4" style={{ background: "hsl(var(--muted))", border: "1px solid hsl(var(--border))" }}>
        <div className="flex items-center gap-3.5 mb-4">
          <ArayIcon size={52} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-bold truncate" style={{ color: "hsl(var(--foreground))" }}>{userInfo.name || "Гость"}</p>
              {!userInfo.name && <button onClick={onAskName} className="text-[10px] px-2 py-0.5 rounded-lg" style={{ border: "1px solid hsl(var(--border))", color: "hsl(var(--muted-foreground))" }}>+ имя</button>}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span>{LEVEL_ICONS[userInfo.level]}</span>
              <span className="text-sm" style={{ color: userInfo.levelInfo?.color || "hsl(var(--primary))" }}>{userInfo.levelInfo?.label}</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold" style={{ color: "hsl(var(--foreground))" }}>{userInfo.totalPoints}</p>
            <p className="text-[10px]" style={{ color: "hsl(var(--muted-foreground))" }}>баллов</p>
          </div>
        </div>
        {userInfo.level !== "PARTNER" && (
          <div>
            <div className="flex justify-between text-[10px] mb-1.5" style={{ color: "hsl(var(--muted-foreground))" }}>
              <span>{userInfo.levelInfo?.label}</span><span>→ {userInfo.levelInfo?.next}</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "hsl(var(--border))" }}>
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: `linear-gradient(90deg, hsl(var(--primary)), #f59e0b)` }} />
            </div>
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {[{ label: "Диалогов", val: userInfo.totalChats, icon: <MessageCircle className="w-4 h-4" /> }, { label: "Заказов", val: userInfo.recentOrders.length, icon: <Package className="w-4 h-4" /> }].map(s => (
          <div key={s.label} className="rounded-2xl p-4 text-center" style={{ background: "hsl(var(--muted))", border: "1px solid hsl(var(--border))" }}>
            <div className="flex justify-center mb-1.5" style={{ color: "hsl(var(--muted-foreground))" }}>{s.icon}</div>
            <p className="text-2xl font-bold" style={{ color: "hsl(var(--foreground))" }}>{s.val}</p>
            <p className="text-[10px] mt-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>{s.label}</p>
          </div>
        ))}
      </div>
      {userInfo.recentOrders.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: "hsl(var(--muted-foreground))" }}>Последние заказы</p>
          <div className="space-y-2">
            {userInfo.recentOrders.map(o => (
              <Link key={o.id} href={`/account/orders/${o.orderNumber}`} className="flex items-center justify-between px-4 py-3 rounded-xl active:scale-[0.98] transition-all" style={{ background: "hsl(var(--muted))", border: "1px solid hsl(var(--border))" }}>
                <div>
                  <p className="text-sm font-medium" style={{ color: "hsl(var(--foreground))" }}>№{o.orderNumber}</p>
                  <p className="text-[11px]" style={{ color: "hsl(var(--muted-foreground))" }}>{STATUS[o.status] || o.status}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold" style={{ color: "hsl(var(--primary))" }}>{formatPrice(o.totalAmount)}</span>
                  <ChevronRight className="w-3.5 h-3.5" style={{ color: "hsl(var(--muted-foreground))" }} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
      <div className="space-y-2 pb-2">
        {[{ href: "/account", label: "Настройки профиля", icon: <User className="w-4 h-4" /> }, { href: "/account/orders", label: "Все заказы", icon: <Package className="w-4 h-4" /> }].map(l => (
          <Link key={l.href} href={l.href} className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all" style={{ background: "hsl(var(--muted))", border: "1px solid hsl(var(--border))" }}>
            <span style={{ color: "hsl(var(--muted-foreground))" }}>{l.icon}</span>
            <span className="text-sm flex-1" style={{ color: "hsl(var(--foreground))" }}>{l.label}</span>
            <ChevronRight className="w-3.5 h-3.5" style={{ color: "hsl(var(--muted-foreground))" }} />
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
  const [proactiveBubble, setProactiveBubble] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  // Для мобильной клавиатуры
  const [mobileH, setMobileH] = useState<number | null>(null);
  const [mobileBottom, setMobileBottom] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const dragControls = useDragControls();
  const cartCount = useCartStore(s => s.totalItems());
  const pageCtx = { page, productName, cartTotal };
  const chips = buildArayChips(pageCtx);

  // Определить мобильный
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Данные пользователя
  useEffect(() => {
    fetch("/api/ai/me").then(r => r.json()).then(setUserInfo).catch(() => {});
  }, []);

  // Показать через 1.5 сек
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 1500);
    return () => clearTimeout(t);
  }, []);

  // VisualViewport — слежение за клавиатурой (только мобильный)
  useEffect(() => {
    if (!isMobile) return;
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      const keyboardH = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setMobileBottom(keyboardH);
      // Высота панели = реальная высота экрана минус клавиатура
      if (open) setMobileH(vv.height * 0.96);
    };
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => { vv.removeEventListener("resize", update); vv.removeEventListener("scroll", update); };
  }, [isMobile, open]);

  // Сброс высоты при закрытии
  useEffect(() => {
    if (!open) { setMobileH(null); setMobileBottom(0); }
  }, [open]);

  const startChat = useCallback(() => {
    if (messages.length > 0) return;
    const name = userInfo?.name;
    const isReturning = typeof document !== "undefined" && document.cookie.includes("aray_visited=1");
    let greeting = buildArayGreeting({ ...pageCtx, isReturning });
    if (name) {
      const h = new Date().getHours();
      const t = h < 12 ? "Доброе утро" : h < 17 ? "Привет" : h < 22 ? "Добрый вечер" : "Поздно уже";
      greeting = `${t}, ${name}! 👋 ${productName ? `Смотришь «${productName}»?` : "Чем могу помочь?"} Спрашивай — я рядом.`;
    }
    setMessages([{ id: "welcome", role: "assistant", content: greeting, timestamp: new Date() }]);
    if (typeof document !== "undefined") document.cookie = "aray_visited=1; max-age=2592000; path=/";
  }, [messages.length, userInfo?.name, page, productName, cartTotal]);

  // Событие открытия из мобильного навбара
  useEffect(() => {
    const handler = () => { setVisible(true); setOpen(true); setHasNew(false); setTab("chat"); startChat(); };
    window.addEventListener("aray:open", handler);
    return () => window.removeEventListener("aray:open", handler);
  }, [startChat]);

  // Проактивный пузырь
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => {
      if (!open) {
        const msg = userInfo?.name ? `${userInfo.name}, помочь с чем-нибудь? 👋`
          : productName ? `Смотришь «${productName}»? Помогу 👋` : "Если есть вопросы — я рядом 😊";
        setProactiveBubble(msg);
        setTimeout(() => setProactiveBubble(null), 5000);
      }
    }, 20000);
    return () => clearTimeout(t);
  }, [visible, open, userInfo?.name, productName]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleOpen = () => { setOpen(true); setHasNew(false); setProactiveBubble(null); setTab("chat"); startChat(); };

  const sendMessage = async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput(""); setTab("chat");
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: msg, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })), context: { page, productName, cartTotal } }),
      });
      const data = await res.json();
      if (data.message?.includes("звать") || data.message?.includes("имя")) {
        fetch("/api/ai/me").then(r => r.json()).then(setUserInfo).catch(() => {});
      }
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", content: data.message || data.error || "Не получилось 🙏", timestamp: new Date() }]);
      if (!open) setHasNew(true);
    } catch {
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", content: "Нет связи. Попробуй снова 🙏", timestamp: new Date() }]);
    } finally { setLoading(false); }
  };

  if (!enabled || !visible) return null;

  const tabs: { id: Tab; icon: React.ReactNode; label: string; badge?: number }[] = [
    { id: "chat", icon: <MessageCircle className="w-5 h-5" />, label: "Чат" },
    { id: "cart", icon: <ShoppingCart className="w-5 h-5" />, label: "Корзина", badge: cartCount || undefined },
    { id: "calc", icon: <Calculator className="w-5 h-5" />, label: "Расчёт" },
    { id: "profile", icon: <User className="w-5 h-5" />, label: "Профиль" },
  ];

  // ── Шапка (общая для десктоп и мобайл) ──────────────────────────────────────
  const PanelHeader = () => (
    <div className="flex items-center gap-3 px-5 py-3.5 flex-shrink-0" style={{ borderBottom: "1px solid hsl(var(--border))" }}>
      <ArayIcon size={34} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold" style={{ color: "hsl(var(--foreground))" }}>Арай</p>
          {userInfo?.name && (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
              style={{ background: "hsl(var(--primary) / 0.1)", color: "hsl(var(--primary))", border: "1px solid hsl(var(--primary) / 0.2)" }}>
              {LEVEL_ICONS[userInfo.level]} {userInfo.levelInfo?.label}
            </span>
          )}
        </div>
        <p className="text-[10px] mt-0.5 flex items-center gap-1.5" style={{ color: "hsl(var(--muted-foreground))" }}>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
          {userInfo?.name ? `Привет, ${userInfo.name}!` : "Онлайн · ARAY"}
        </p>
      </div>
      <div className="flex gap-1">
        <button onClick={() => { setMessages([]); startChat(); }} className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors hover:bg-muted">
          <RotateCcw className="w-3.5 h-3.5" style={{ color: "hsl(var(--muted-foreground))" }} />
        </button>
        <button onClick={() => setOpen(false)} className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors hover:bg-muted">
          <X className="w-4 h-4" style={{ color: "hsl(var(--muted-foreground))" }} />
        </button>
      </div>
    </div>
  );

  // ── Таббар (общий) ───────────────────────────────────────────────────────────
  const TabBar = () => (
    <div className="flex-shrink-0 flex" style={{ borderTop: "1px solid hsl(var(--border))", background: "hsl(var(--card))", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
      {tabs.map(t => {
        const active = tab === t.id;
        return (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex-1 flex flex-col items-center justify-center gap-1 py-3 relative transition-all"
            style={{ color: active ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))" }}>
            {active && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full" style={{ background: "hsl(var(--primary))" }} />}
            <div className="relative">
              {t.icon}
              {t.badge && t.badge > 0 && (
                <span className="absolute -top-1.5 -right-2 w-4 h-4 rounded-full text-[9px] font-bold text-white flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, hsl(var(--primary)), #f59e0b)" }}>
                  {t.badge > 9 ? "9+" : t.badge}
                </span>
              )}
            </div>
            <span className={`text-[10px] leading-none ${active ? "font-semibold" : "font-normal"}`}>{t.label}</span>
          </button>
        );
      })}
    </div>
  );

  // ── Контент вкладки ──────────────────────────────────────────────────────────
  const TabContent = () => (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.15 }}
          className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {tab === "chat" && <ChatTab messages={messages} loading={loading} input={input} setInput={setInput}
            sendMessage={sendMessage} chips={chips} messagesEndRef={messagesEndRef} inputRef={inputRef} />}
          {tab === "cart" && <CartTab />}
          {tab === "calc" && <CalcTab onAsk={text => { setTab("chat"); sendMessage(text); }} />}
          {tab === "profile" && <ProfileTab userInfo={userInfo} onAskName={() => { setTab("chat"); setTimeout(() => sendMessage("Как тебя зовут? Хочу обращаться по имени 😊"), 100); }} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );

  const panelBase = {
    background: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
  };

  return (
    <>
      {/* ══ ДЕСКТОП КНОПКА (только если панель закрыта) ══ */}
      {!open && (
        <div className="hidden lg:flex fixed z-50 flex-col items-end gap-2" style={{ bottom: "1.5rem", right: "1.5rem" }}>
          {proactiveBubble && (
            <motion.div initial={{ opacity: 0, y: 8, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              onClick={handleOpen}
              className="max-w-[200px] px-3.5 py-2.5 rounded-2xl text-xs cursor-pointer shadow-lg"
              style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", color: "hsl(var(--foreground))", boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }}>
              {proactiveBubble}
            </motion.div>
          )}
          <button onClick={handleOpen} aria-label="Открыть Арай"
            className="relative focus:outline-none group" style={{ width: 52, height: 52 }}>
            {/* Контейнер */}
            <div className="absolute inset-0 rounded-2xl transition-all group-hover:scale-105"
              style={{ background: "linear-gradient(145deg,#1a0800,#3d1206,#7c2d12)", border: "1px solid rgba(245,158,11,0.25)", boxShadow: "0 0 20px rgba(232,112,10,0.35), 0 4px 16px rgba(0,0,0,0.2)" }} />
            <div className="absolute inset-[6px]"><ArayIcon size={40} /></div>
            {hasNew && <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 animate-pulse" style={{ background: "hsl(var(--primary))", borderColor: "hsl(var(--background))" }} />}
          </button>
        </div>
      )}

      {/* ══ ДЕСКТОП ПОПАП — чистый, не полноэкранный ══ */}
      <AnimatePresence>
        {open && !isMobile && (
          <>
            {/* Лёгкий оверлей */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
              className="fixed inset-0 z-[60]" onClick={() => setOpen(false)}
              style={{ background: "rgba(0,0,0,0.15)", backdropFilter: "blur(2px)" }} />

            {/* Попап 400×600 справа внизу */}
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ type: "spring", damping: 28, stiffness: 380 }}
              className="fixed z-[61] flex flex-col"
              style={{
                bottom: "6rem", right: "1.5rem",
                width: "380px", height: "580px",
                borderRadius: "20px",
                boxShadow: "0 24px 64px rgba(0,0,0,0.18), 0 0 0 1px hsl(var(--border))",
                ...panelBase,
              }}
            >
              <PanelHeader />
              <TabContent />
              <TabBar />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ══ МОБИЛЬНЫЙ — полный экран, клавиатура не летает ══ */}
      <AnimatePresence>
        {open && isMobile && (
          <>
            {/* Оверлей */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[60]"
              style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)" }}
              onClick={() => setOpen(false)} />

            {/* Панель — следит за клавиатурой */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 34, stiffness: 360 }}
              drag="y" dragControls={dragControls}
              dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: 0.25 }}
              onDragEnd={(_, info) => { if (info.offset.y > 100) setOpen(false); }}
              className="fixed left-0 right-0 z-[61] flex flex-col"
              style={{
                bottom: mobileBottom > 0 ? `${mobileBottom}px` : 0,
                height: mobileH ? `${mobileH}px` : "92dvh",
                borderRadius: "20px 20px 0 0",
                boxShadow: "0 -8px 48px rgba(0,0,0,0.25)",
                ...panelBase,
              }}
            >
              {/* Ручка свайпа */}
              <div className="flex justify-center pt-2.5 pb-1 cursor-grab active:cursor-grabbing shrink-0"
                onPointerDown={e => dragControls.start(e)}>
                <div className="w-8 h-[3px] rounded-full" style={{ background: "hsl(var(--border))" }} />
              </div>
              <PanelHeader />
              <TabContent />
              <TabBar />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <style jsx global>{`
        @keyframes arayDot {
          0%, 60%, 100% { transform: scale(0.5); opacity: 0.3; }
          30% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </>
  );
}
