"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import {
  X, Send, Loader2, MessageCircle, ShoppingCart,
  Calculator, User, RotateCcw, Plus, Minus, Trash2,
  ChevronRight, Star, Zap, LogIn, Package
} from "lucide-react";
import Image from "next/image";
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

// ─── Уровень клиента ──────────────────────────────────────────────────────────

const LEVEL_ICONS: Record<string, string> = {
  NOVICE: "🌱", BUILDER: "🏗️", MASTER: "⭐", PARTNER: "💎",
};

// ─── Пузырь сообщения ─────────────────────────────────────────────────────────

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex gap-2 ${isUser ? "flex-row-reverse" : "flex-row"} mb-3`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-xl overflow-hidden shrink-0 mt-0.5 ring-1 ring-blue-500/30">
          <Image src="/aray/aray-avatar.jpg" alt="Арай" width={28} height={28} className="object-cover object-top" />
        </div>
      )}
      <div className={`max-w-[78%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${isUser ? "bg-primary text-white rounded-tr-sm" : "rounded-tl-sm"}`}
        style={!isUser ? { background: "linear-gradient(135deg,rgba(10,30,80,0.9),rgba(15,50,120,0.7))", border: "1px solid rgba(30,120,255,0.2)", color: "#e8f4ff" } : {}}>
        {message.content.split("\n").map((line, i, arr) => (
          <span key={i}>{line}{i < arr.length - 1 && <br />}</span>
        ))}
        <span className={`text-[10px] block mt-1 ${isUser ? "text-white/60 text-right" : "opacity-40"}`}>
          {message.timestamp.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
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
  return (
    <>
      {/* Сообщения */}
      <div className="flex-1 overflow-y-auto px-4 py-3 overscroll-contain">
        {messages.map(m => <MessageBubble key={m.id} message={m} />)}
        {loading && (
          <div className="flex gap-2 mb-3">
            <div className="w-7 h-7 rounded-xl overflow-hidden shrink-0 ring-1 ring-blue-500/30">
              <Image src="/aray/aray-avatar.jpg" alt="Арай" width={28} height={28} className="object-cover object-top" />
            </div>
            <div className="px-3 py-2.5 rounded-2xl rounded-tl-sm" style={{ background: "rgba(15,40,100,0.6)", border: "1px solid rgba(30,120,255,0.2)" }}>
              <div className="flex gap-1 items-center h-4">
                {[0, 1, 2].map(i => (
                  <span key={i} className="w-1.5 h-1.5 rounded-full bg-blue-400"
                    style={{ animation: `arayBounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />
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
              className="text-[11px] px-3 py-1.5 rounded-xl transition-all active:scale-95"
              style={{ background: "rgba(15,50,120,0.5)", border: "1px solid rgba(40,130,255,0.3)", color: "#90c0ff" }}>
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Ввод */}
      <div className="px-4 py-3 flex gap-2 items-end flex-shrink-0"
        style={{ borderTop: "1px solid rgba(30,120,255,0.15)" }}>
        <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
          rows={1} placeholder="Написать Araю..."
          className="flex-1 resize-none text-sm rounded-xl px-3 py-2.5 focus:outline-none"
          style={{ background: "rgba(10,30,80,0.6)", border: "1px solid rgba(40,130,255,0.25)", color: "#d0e8ff", maxHeight: "80px" }} />
        <button onClick={() => sendMessage()} disabled={loading || !input.trim()}
          className="w-10 h-10 rounded-xl flex items-center justify-center transition-all disabled:opacity-30 shrink-0"
          style={{ background: loading || !input.trim() ? "rgba(30,80,160,0.3)" : "linear-gradient(135deg,#1a5cc8,#2a8eff)", boxShadow: input.trim() ? "0 0 14px rgba(30,120,255,0.5)" : "none" }}>
          {loading ? <Loader2 className="w-4 h-4 text-blue-300 animate-spin" /> : <Send className="w-4 h-4 text-white" />}
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
          style={{ background: "rgba(20,60,150,0.3)", border: "1px solid rgba(30,120,255,0.2)" }}>
          <ShoppingCart className="w-10 h-10 text-blue-400 opacity-50" />
        </div>
        <p className="text-blue-200 text-center text-sm">Корзина пуста</p>
        <p className="text-blue-400/60 text-xs text-center">Добавь товары из каталога или спроси Арая помочь с выбором</p>
        <Link href="/catalog"
          className="px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-all active:scale-95"
          style={{ background: "linear-gradient(135deg,#1a5cc8,#2a8eff)" }}>
          Перейти в каталог
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 overscroll-contain">
        {items.map(item => (
          <div key={item.id} className="flex gap-3 p-3 rounded-xl"
            style={{ background: "rgba(10,30,80,0.5)", border: "1px solid rgba(30,120,255,0.15)" }}>
            {/* Фото */}
            <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-blue-950/50">
              {item.productImage ? (
                <Image src={item.productImage} alt={item.productName} width={56} height={56} className="object-cover w-full h-full" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="w-6 h-6 text-blue-500/40" />
                </div>
              )}
            </div>
            {/* Инфо */}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-blue-100 font-medium leading-tight truncate">{item.productName}</p>
              <p className="text-xs text-blue-400/70 mt-0.5">{item.variantSize} · {item.unitType === "CUBE" ? "м³" : "шт"}</p>
              <p className="text-sm font-bold text-blue-300 mt-1">{formatPrice(item.price * item.quantity)}</p>
            </div>
            {/* Количество */}
            <div className="flex flex-col items-end justify-between gap-1">
              <button onClick={() => removeItem(item.id)} className="p-1 rounded-lg hover:bg-red-500/20 transition-colors">
                <Trash2 className="w-3.5 h-3.5 text-red-400/60" />
              </button>
              <div className="flex items-center gap-2">
                <button onClick={() => updateQuantity(item.id, Math.max(0.001, item.quantity - (item.unitType === "CUBE" ? 0.5 : 1)))}
                  className="w-6 h-6 rounded-lg flex items-center justify-center"
                  style={{ background: "rgba(30,80,180,0.4)", border: "1px solid rgba(40,120,255,0.3)" }}>
                  <Minus className="w-3 h-3 text-blue-300" />
                </button>
                <span className="text-xs text-blue-200 min-w-[28px] text-center tabular-nums">{item.quantity}</span>
                <button onClick={() => updateQuantity(item.id, item.quantity + (item.unitType === "CUBE" ? 0.5 : 1))}
                  className="w-6 h-6 rounded-lg flex items-center justify-center"
                  style={{ background: "rgba(30,80,180,0.4)", border: "1px solid rgba(40,120,255,0.3)" }}>
                  <Plus className="w-3 h-3 text-blue-300" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Итог + кнопка */}
      <div className="px-4 pb-6 pt-3 flex-shrink-0 space-y-3" style={{ borderTop: "1px solid rgba(30,120,255,0.15)" }}>
        <div className="flex items-center justify-between">
          <span className="text-blue-300 text-sm">{count} позиций</span>
          <span className="text-xl font-bold text-white">{formatPrice(total)}</span>
        </div>
        <Link href="/checkout"
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-white font-semibold text-base transition-all active:scale-[0.98]"
          style={{ background: "linear-gradient(135deg,#1a5cc8,#2a8eff)", boxShadow: "0 0 24px rgba(30,120,255,0.4)" }}>
          Оформить заказ
          <ChevronRight className="w-4 h-4" />
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
    background: "rgba(10,30,80,0.6)", border: "1px solid rgba(40,130,255,0.25)",
    color: "#d0e8ff", borderRadius: "12px",
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
        <p className="text-blue-300/70 text-xs font-medium uppercase tracking-wider mb-3">Размеры пиломатериала</p>
        <div className="grid grid-cols-2 gap-3">
          {fields.map(f => (
            <div key={f.label}>
              <label className="text-[11px] text-blue-400/70 block mb-1">{f.label}</label>
              <input type="number" value={f.val} onChange={e => f.set(e.target.value)}
                placeholder={f.placeholder} inputMode="decimal"
                className="w-full px-3 py-2.5 text-sm focus:outline-none"
                style={inputStyle} />
            </div>
          ))}
        </div>
      </div>

      {/* Результат */}
      <div className="rounded-2xl p-4" style={{ background: volume > 0 ? "rgba(10,40,120,0.6)" : "rgba(10,25,60,0.4)", border: `1px solid ${volume > 0 ? "rgba(40,150,255,0.4)" : "rgba(30,80,160,0.2)"}`, transition: "all 0.3s" }}>
        <p className="text-blue-400/70 text-xs mb-1">Кубатура</p>
        <p className="text-4xl font-bold tabular-nums" style={{ color: volume > 0 ? "#60c0ff" : "rgba(60,120,255,0.3)" }}>
          {volume > 0 ? volume.toFixed(3) : "0.000"}
          <span className="text-lg ml-2" style={{ color: "rgba(100,160,255,0.6)" }}>м³</span>
        </p>
        {volume > 0 && (
          <p className="text-xs text-blue-400/60 mt-1">
            {L}м × {W}м × {H}м × {C}шт = {volume.toFixed(3)} м³
          </p>
        )}
      </div>

      {volume > 0 && (
        <button
          onClick={() => onAskAray(`Сколько стоит ${volume.toFixed(3)} м³ пиломатериала? Помоги подобрать подходящий вариант.`)}
          className="w-full py-3 rounded-2xl text-sm font-medium text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          style={{ background: "linear-gradient(135deg,#1a5cc8,#2a8eff)" }}>
          <MessageCircle className="w-4 h-4" />
          Спросить Арая о цене
        </button>
      )}

      <div className="text-center">
        <p className="text-[11px] text-blue-400/40">
          Арай умеет считать сам — просто напиши<br />
          "сколько нужно на дом 8×6"
        </p>
      </div>
    </div>
  );
}

// ─── Вкладка: Профиль ─────────────────────────────────────────────────────────

function ProfileTab({ userInfo, onAskName }: { userInfo: UserInfo | null; onAskName: () => void }) {
  if (!userInfo) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
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
        {/* Гость */}
        <div className="text-center">
          <div className="w-20 h-20 rounded-2xl overflow-hidden mx-auto mb-4 ring-2 ring-blue-500/30">
            <Image src="/aray/aray-avatar.jpg" alt="Арай" width={80} height={80} className="object-cover object-top" />
          </div>
          <p className="text-lg font-bold text-blue-100">Войди — и Арай запомнит всё</p>
          <p className="text-sm text-blue-400/70 mt-1">История заказов, уровень, персональные советы</p>
        </div>

        {/* Преимущества */}
        <div className="space-y-2.5">
          {[
            { icon: "🧠", text: "Арай помнит тебя на всех устройствах" },
            { icon: "📦", text: "История всех заказов в одном месте" },
            { icon: "🏆", text: "Уровни: Новичок → Строитель → Мастер → Партнёр" },
            { icon: "💎", text: "Партнёр ARAY — 50% с рекомендаций" },
          ].map(item => (
            <div key={item.text} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
              style={{ background: "rgba(10,30,80,0.4)", border: "1px solid rgba(30,120,255,0.15)" }}>
              <span className="text-xl shrink-0">{item.icon}</span>
              <span className="text-sm text-blue-200">{item.text}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          <Link href="/login"
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-white font-semibold text-sm"
            style={{ background: "linear-gradient(135deg,#1a5cc8,#2a8eff)", boxShadow: "0 0 20px rgba(30,120,255,0.35)" }}>
            <LogIn className="w-4 h-4" /> Войти в аккаунт
          </Link>
          <Link href="/register"
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-blue-300 font-medium text-sm"
            style={{ border: "1px solid rgba(40,130,255,0.3)" }}>
            Создать аккаунт
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col px-4 py-4 gap-4 overflow-y-auto overscroll-contain">
      {/* Карточка уровня */}
      <div className="rounded-2xl p-4" style={{ background: "linear-gradient(135deg,rgba(10,30,80,0.8),rgba(15,50,130,0.6))", border: "1px solid rgba(40,130,255,0.2)" }}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-14 h-14 rounded-2xl overflow-hidden ring-2 shrink-0" style={{ ringColor: userInfo.levelInfo?.color || "#60a5fa" }}>
            <Image src="/aray/aray-avatar.jpg" alt="Арай" width={56} height={56} className="object-cover object-top" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <p className="font-bold text-white text-base truncate">
                {userInfo.name || "Гость"}
              </p>
              {!userInfo.name && (
                <button onClick={onAskName} className="text-[10px] px-2 py-0.5 rounded-lg text-blue-300"
                  style={{ border: "1px solid rgba(40,130,255,0.4)" }}>
                  + имя
                </button>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-lg">{LEVEL_ICONS[userInfo.level]}</span>
              <span className="text-sm font-medium" style={{ color: userInfo.levelInfo?.color || "#60a5fa" }}>
                {userInfo.levelInfo?.label}
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold text-white">{userInfo.totalPoints}</p>
            <p className="text-[10px] text-blue-400/60">баллов</p>
          </div>
        </div>

        {/* Прогресс */}
        {userInfo.level !== "PARTNER" && (
          <div>
            <div className="flex justify-between text-[10px] text-blue-400/60 mb-1">
              <span>{userInfo.levelInfo?.label}</span>
              <span>→ {userInfo.levelInfo?.next}</span>
            </div>
            <div className="h-1.5 rounded-full bg-blue-900/50">
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${progressPct}%`, background: `linear-gradient(90deg, ${userInfo.levelInfo?.color || "#60a5fa"}, #2a8eff)` }} />
            </div>
          </div>
        )}
        {userInfo.level === "PARTNER" && (
          <div className="text-center text-xs text-purple-300 mt-1">
            💎 Максимальный уровень — Партнёр ARAY PRODUCTIONS
          </div>
        )}
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Диалогов с Araем", value: userInfo.totalChats, icon: <MessageCircle className="w-4 h-4" /> },
          { label: "Заказов", value: userInfo.recentOrders.length, icon: <Package className="w-4 h-4" /> },
        ].map(stat => (
          <div key={stat.label} className="rounded-xl p-3 text-center"
            style={{ background: "rgba(10,25,70,0.5)", border: "1px solid rgba(30,100,255,0.15)" }}>
            <div className="flex items-center justify-center mb-1 text-blue-400">{stat.icon}</div>
            <p className="text-2xl font-bold text-white">{stat.value}</p>
            <p className="text-[10px] text-blue-400/60 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Последние заказы */}
      {userInfo.recentOrders.length > 0 && (
        <div>
          <p className="text-[11px] text-blue-400/60 uppercase tracking-wider font-medium mb-2">Последние заказы</p>
          <div className="space-y-2">
            {userInfo.recentOrders.map(order => (
              <Link key={order.id} href={`/account/orders/${order.orderNumber}`}
                className="flex items-center justify-between px-3 py-2.5 rounded-xl transition-all active:scale-[0.98]"
                style={{ background: "rgba(10,25,70,0.5)", border: "1px solid rgba(30,100,255,0.15)" }}>
                <div>
                  <p className="text-sm text-blue-200 font-medium">Заказ №{order.orderNumber}</p>
                  <p className="text-[11px] text-blue-400/60">{statusLabels[order.status] || order.status}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-blue-300">{formatPrice(order.totalAmount)}</span>
                  <ChevronRight className="w-4 h-4 text-blue-500/40" />
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
            style={{ background: "rgba(10,25,70,0.4)", border: "1px solid rgba(30,100,255,0.12)" }}>
            <span className="text-blue-400">{link.icon}</span>
            <span className="text-sm text-blue-200 flex-1">{link.label}</span>
            <ChevronRight className="w-4 h-4 text-blue-500/40" />
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

  // Пульс кнопки каждые 8 секунд
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

    // Персонализируем если знаем имя
    if (name) {
      const hour = new Date().getHours();
      const time = hour < 12 ? "Доброе утро" : hour < 17 ? "Привет" : hour < 22 ? "Добрый вечер" : "Поздно уже";
      greeting = `${time}, ${name}! 👋 ${productName ? `Смотришь «${productName}»?` : "Чем могу помочь?"} Спрашивай — я рядом.`;
    }

    setMessages([{ id: "welcome", role: "assistant", content: greeting, timestamp: new Date() }]);
    document.cookie = "aray_visited=1; max-age=2592000; path=/";
  }, [messages.length, userInfo?.name, page, productName, cartTotal]);

  // Слушаем событие открытия (из мобильного навбара)
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

  // Проактивный пузырь через 15 секунд
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => {
      if (!open) {
        const name = userInfo?.name;
        const msg = name
          ? `${name}, помочь с чем-нибудь? 👋`
          : productName
          ? `Смотришь «${productName}»? Помогу выбрать 👋`
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

  const handleAskAray = (text: string) => {
    setTab("chat");
    sendMessage(text);
  };

  const handleAskName = () => {
    setTab("chat");
    const msg = "Как тебя зовут? Хочу обращаться по имени 😊";
    setTimeout(() => sendMessage(msg), 100);
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

      // Если Арай узнал имя — обновляем userInfo
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
        content: "Временно недоступен. Попробуй через минуту 🙏",
        timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  if (!enabled || !visible) return null;
  if (hiddenForKeyboard && !open) return null;

  // ── Конфиг вкладок ──────────────────────────────────────────────────────────
  const tabs: { id: Tab; icon: React.ReactNode; label: string; badge?: number }[] = [
    { id: "chat", icon: <MessageCircle className="w-5 h-5" />, label: "Чат" },
    { id: "cart", icon: <ShoppingCart className="w-5 h-5" />, label: "Корзина",
      badge: cartItemsCount || undefined },
    { id: "calc", icon: <Calculator className="w-5 h-5" />, label: "Расчёт" },
    { id: "profile", icon: <User className="w-5 h-5" />, label: "Профиль" },
  ];

  const panelStyle = {
    background: "linear-gradient(180deg, #030b1a 0%, #050e22 60%, #040c1e 100%)",
    border: "1px solid rgba(40,130,255,0.18)",
    boxShadow: "0 0 60px rgba(20,80,220,0.35), 0 -4px 40px rgba(0,0,0,0.5)",
  };

  return (
    <>
      {/* ── Десктопная кнопка ── */}
      {!open && (
        <div className="hidden lg:flex fixed z-50 flex-col items-end gap-2"
          style={{ bottom: "2rem", right: "1.5rem" }}>
          {proactiveBubble && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="max-w-[220px] px-3 py-2 rounded-2xl text-xs text-blue-100 cursor-pointer relative"
              style={{ background: "rgba(8,20,60,0.95)", border: "1px solid rgba(40,120,255,0.4)", boxShadow: "0 4px 20px rgba(20,80,200,0.3)" }}
              onClick={handleOpen}>
              {proactiveBubble}
            </motion.div>
          )}
          <div className="text-center rounded-xl px-2.5 py-1 pointer-events-none"
            style={{ background: "rgba(10,25,60,0.9)", border: "1px solid rgba(30,120,255,0.3)" }}>
            <p className="text-[10px] font-bold text-blue-200 leading-none">АРАЙ</p>
            <p className="text-[9px] text-blue-400/70 mt-0.5">Световой друг</p>
          </div>
          <button onClick={handleOpen} aria-label="Открыть Арай"
            className="relative w-14 h-14 rounded-2xl flex items-center justify-center focus:outline-none"
            style={{ background: "linear-gradient(145deg,#0a1628,#0d2550,#0a3d7a,#1055aa)", boxShadow: "0 0 24px rgba(30,120,220,0.6),0 0 48px rgba(30,80,180,0.3),inset 0 1px 0 rgba(100,180,255,0.2)" }}>
            {pulse && <span className="absolute inset-0 rounded-2xl animate-ping" style={{ background: "rgba(30,120,255,0.25)", animationDuration: "1.2s" }} />}
            <span className="absolute inset-0 rounded-2xl" style={{ background: "conic-gradient(from 0deg,transparent 0%,rgba(255,200,50,0.35) 25%,transparent 50%,rgba(30,150,255,0.25) 75%,transparent 100%)", animation: "spin 8s linear infinite" }} />
            <div className="relative w-10 h-10 rounded-xl overflow-hidden z-10">
              <Image src="/aray/aray-avatar.jpg" alt="Арай" fill className="object-cover object-top" sizes="40px" />
            </div>
            {hasNew && <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full border-2 border-background" />}
          </button>
        </div>
      )}

      {/* ── Полноэкранный суперэкран ── */}
      <AnimatePresence>
        {open && (
          <>
            {/* Оверлей */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[60]"
              style={{ background: "rgba(0,5,20,0.65)", backdropFilter: "blur(6px)" }}
              onClick={() => setOpen(false)}
            />

            {/* Панель */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: keyboardOffset > 0 ? -keyboardOffset : 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 320 }}
              drag="y"
              dragControls={dragControls}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.3 }}
              onDragEnd={(_, info) => { if (info.offset.y > 120) setOpen(false); }}
              className="fixed bottom-0 left-0 right-0 z-[61] flex flex-col"
              style={{
                height: "92dvh",
                borderRadius: "28px 28px 0 0",
                ...panelStyle,
              }}
            >
              {/* Ручка для свайпа */}
              <div className="flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing shrink-0"
                onPointerDown={e => dragControls.start(e)}>
                <div className="w-10 h-1 rounded-full" style={{ background: "rgba(60,130,255,0.35)" }} />
              </div>

              {/* Шапка */}
              <div className="flex items-center gap-3 px-5 py-3 flex-shrink-0"
                style={{ borderBottom: "1px solid rgba(30,120,255,0.12)" }}>
                <div className="w-10 h-10 rounded-2xl overflow-hidden ring-2 ring-blue-500/30 shrink-0">
                  <Image src="/aray/aray-avatar.jpg" alt="Арай" width={40} height={40} className="object-cover object-top" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-blue-100">Арай</p>
                    {userInfo?.name && (
                      <span className="text-xs px-2 py-0.5 rounded-lg font-medium"
                        style={{ background: "rgba(30,100,255,0.2)", color: userInfo.levelInfo?.color || "#60a5fa", border: `1px solid ${userInfo.levelInfo?.color || "#60a5fa"}40` }}>
                        {LEVEL_ICONS[userInfo.level]} {userInfo.levelInfo?.label}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] flex items-center gap-1" style={{ color: "rgba(100,160,255,0.7)" }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
                    {userInfo?.name ? `Привет, ${userInfo.name}!` : "Онлайн · ARAY PRODUCTIONS"}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => { setMessages([]); startChat(); }}
                    className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors hover:bg-blue-900/40"
                    title="Начать заново">
                    <RotateCcw className="w-3.5 h-3.5 text-blue-400" />
                  </button>
                  <button onClick={() => setOpen(false)}
                    className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors hover:bg-blue-900/40">
                    <X className="w-4 h-4 text-blue-300" />
                  </button>
                </div>
              </div>

              {/* Контент вкладки */}
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.div key={tab} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.18 }}
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
                style={{ borderTop: "1px solid rgba(30,120,255,0.12)", paddingBottom: "env(safe-area-inset-bottom, 0px)", background: "rgba(3,10,28,0.95)" }}>
                {tabs.map(t => {
                  const isActive = tab === t.id;
                  return (
                    <button key={t.id} onClick={() => setTab(t.id)}
                      className="flex-1 flex flex-col items-center justify-center gap-1 py-3 relative transition-all"
                      style={{ color: isActive ? "#60a5fa" : "rgba(100,150,255,0.45)" }}>
                      {isActive && (
                        <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
                          style={{ background: "linear-gradient(90deg,transparent,#60a5fa,transparent)" }} />
                      )}
                      <div className="relative">
                        {t.icon}
                        {t.badge && t.badge > 0 && (
                          <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-[9px] font-bold text-white flex items-center justify-center"
                            style={{ background: "linear-gradient(135deg,#f59e0b,#d97706)" }}>
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

      <style jsx global>{`
        @keyframes arayBounce {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
