"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import { X, Send, Loader2, RotateCcw, Mic, MicOff, ShoppingCart, ExternalLink, LayoutGrid, Package, MapPin, Phone, Volume2, VolumeX } from "lucide-react";
import { buildArayGreeting, buildArayChips } from "@/lib/aray-agent";
import { useCartStore } from "@/store/cart";
import { formatPrice } from "@/lib/utils";
import { ArayBrowser, type ArayBrowserAction } from "@/components/store/aray-browser";

// ─── Типы ─────────────────────────────────────────────────────────────────────

export type ArayAction = {
  type: "navigate" | "spotlight" | "highlight" | "call";
  url?: string;
  label: string;
  icon?: string;
  hint?: string;
  spotX?: number;
  spotY?: number;
};

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  actions?: ArayAction[];
  streaming?: boolean;
};

// ─── Парсим ARAY_ACTIONS из текста ответа ────────────────────────────────────
function parseMessageActions(raw: string): { text: string; actions: ArayAction[] } {
  const marker = "ARAY_ACTIONS:";
  const idx = raw.indexOf(marker);
  if (idx === -1) return { text: raw, actions: [] };
  const text = raw.slice(0, idx).trim();
  try {
    const jsonStr = raw.slice(idx + marker.length).trim();
    const actions = JSON.parse(jsonStr) as ArayAction[];
    return { text, actions };
  } catch {
    return { text: raw, actions: [] };
  }
}

// ─── Markdown рендер (клиентский виджет) ─────────────────────────────────────
function renderInline(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*\n]+\*\*|\*[^*\n]+\*|`[^`\n]+`)/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**"))
      return <strong key={i} className="font-semibold text-white">{p.slice(2, -2)}</strong>;
    if (p.startsWith("*") && p.endsWith("*"))
      return <em key={i}>{p.slice(1, -1)}</em>;
    if (p.startsWith("`") && p.endsWith("`"))
      return <code key={i} className="px-1 py-0.5 rounded text-[11px] font-mono"
        style={{ background: "rgba(255,255,255,0.12)", color: "hsl(var(--primary))" }}>{p.slice(1, -1)}</code>;
    return p as React.ReactNode;
  });
}

function renderMarkdownContent(text: string): React.ReactNode[] {
  const lines = text.split("\n");
  const nodes: React.ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === "") { i++; continue; }

    if (/^---+$/.test(line.trim())) {
      nodes.push(<hr key={i} className="my-1.5" style={{ borderColor: "rgba(255,255,255,0.12)" }} />);
      i++; continue;
    }

    const hm = line.match(/^(#{1,3})\s+(.+)$/);
    if (hm) {
      nodes.push(<p key={i} className="font-bold mt-2 mb-0.5 text-[13px]" style={{ color: "hsl(var(--primary))" }}>{renderInline(hm[2])}</p>);
      i++; continue;
    }

    if (/^[\-\*]\s/.test(line.trim())) {
      const items: string[] = [];
      while (i < lines.length && /^[\-\*]\s/.test(lines[i].trim())) {
        items.push(lines[i].replace(/^[\-\*]\s/, "").trim()); i++;
      }
      nodes.push(<ul key={`ul-${i}`} className="space-y-0.5 my-1">{items.map((it, ii) => (
        <li key={ii} className="flex gap-1.5 items-start">
          <span className="mt-[6px] shrink-0 w-1 h-1 rounded-full" style={{ background: "hsl(var(--primary)/0.8)" }} />
          <span>{renderInline(it)}</span>
        </li>
      ))}</ul>);
      continue;
    }

    if (/^\d+\.\s/.test(line.trim())) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
        items.push(lines[i].replace(/^\d+\.\s/, "").trim()); i++;
      }
      nodes.push(<ol key={`ol-${i}`} className="space-y-0.5 my-1 list-none">{items.map((it, ii) => (
        <li key={ii} className="flex gap-2 items-start">
          <span className="shrink-0 w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center mt-0.5"
            style={{ background: "hsl(var(--primary)/0.2)", color: "hsl(var(--primary))" }}>{ii + 1}</span>
          <span>{renderInline(it)}</span>
        </li>
      ))}</ol>);
      continue;
    }

    if (line.trim().startsWith("|")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) { tableLines.push(lines[i]); i++; }
      const parseRow = (row: string) => row.split("|").slice(1, -1).map(c => c.trim());
      const headers = parseRow(tableLines[0]);
      const sepIdx = tableLines.findIndex(l => /^\|[\s\-:|]+\|$/.test(l.trim()));
      const dataRows = tableLines.slice(sepIdx >= 0 ? sepIdx + 1 : 1).map(parseRow);
      nodes.push(
        <div key={`tbl-${i}`} className="my-2 overflow-x-auto rounded-xl" style={{ border: "1px solid rgba(255,255,255,0.12)" }}>
          <table className="w-full text-[11.5px]">
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.10)" }}>
                {headers.map((h, hi) => <th key={hi} className="px-3 py-2 text-left font-semibold" style={{ color: "hsl(var(--primary))" }}>{renderInline(h)}</th>)}
              </tr>
            </thead>
            <tbody>
              {dataRows.filter(r => r.some(c => c)).map((row, ri) => (
                <tr key={ri} style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                  {row.map((cell, ci) => <td key={ci} className="px-3 py-2" style={{ color: "rgba(255,255,255,0.85)" }}>{renderInline(cell)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    nodes.push(<p key={i} className="leading-relaxed">{renderInline(line)}</p>);
    i++;
  }
  return nodes;
}

// ─── Иконка для action-кнопки ─────────────────────────────────────────────────
function ActionIcon({ icon }: { icon?: string }) {
  const cls = "w-3.5 h-3.5 shrink-0";
  switch (icon) {
    case "catalog": return <LayoutGrid className={cls} />;
    case "product": return <Package className={cls} />;
    case "map":     return <MapPin className={cls} />;
    case "phone":   return <Phone className={cls} />;
    default:        return <ExternalLink className={cls} />;
  }
}
interface ArayWidgetProps { page?: string; productName?: string; cartTotal?: number; enabled?: boolean; }

// ─── Живой SVG-шар — без фона снаружи, анимация внутри ───────────────────────

function ArayIcon({ size = 40, glow = false }: { size?: number; glow?: boolean }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 100 100"
      style={{ display: "block", overflow: "visible" }}
    >
      <defs>
        {/* Оранжевый ореол */}
        <filter id="aig-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
          <feColorMatrix in="blur" type="matrix"
            values="2 0.8 0 0 0  0.6 0.2 0 0 0  0 0 0 0 0  0 0 0 0.9 0"
            result="glow" />
          <feMerge>
            <feMergeNode in="glow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Базовый градиент сферы */}
        <radialGradient id="aig-base" cx="38%" cy="32%" r="70%">
          <stop offset="0%" stopColor="#fff8d0" />
          <stop offset="18%" stopColor="#fbbf24">
            <animate attributeName="stopColor"
              values="#fbbf24;#f97316;#fde047;#fbbf24"
              dur="5s" repeatCount="indefinite" />
          </stop>
          <stop offset="50%" stopColor="#e8700a">
            <animate attributeName="stopColor"
              values="#e8700a;#c2410c;#f97316;#e8700a"
              dur="7s" repeatCount="indefinite" />
          </stop>
          <stop offset="82%" stopColor="#7c2d12" />
          <stop offset="100%" stopColor="#1a0500" />
        </radialGradient>

        {/* Вращающийся внутренний жар */}
        <radialGradient id="aig-hot" cx="50%" cy="22%" r="48%">
          <stop offset="0%" stopColor="#fde68a" stopOpacity="0.75">
            <animate attributeName="stopOpacity"
              values="0.75;1;0.5;0.75" dur="3s" repeatCount="indefinite" />
          </stop>
          <stop offset="100%" stopColor="#fde68a" stopOpacity="0" />
        </radialGradient>

        {/* Зеркальный блик */}
        <radialGradient id="aig-hl" cx="30%" cy="24%" r="40%">
          <stop offset="0%" stopColor="white" stopOpacity="0.88" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </radialGradient>

        {/* Клип для анимации внутри шара */}
        <clipPath id="aig-clip">
          <circle cx="50" cy="50" r="46" />
        </clipPath>
      </defs>

      {/* Базовая сфера */}
      <circle cx="50" cy="50" r="46" fill="url(#aig-base)"
        filter={glow ? "url(#aig-glow)" : undefined} />

      {/* Вращающиеся внутренние огни — clipped */}
      <g clipPath="url(#aig-clip)">
        <ellipse cx="50" cy="28" rx="36" ry="22" fill="url(#aig-hot)">
          <animateTransform attributeName="transform" type="rotate"
            from="0 50 50" to="360 50 50" dur="6s" repeatCount="indefinite" />
        </ellipse>
        <ellipse cx="50" cy="72" rx="26" ry="15" fill="#fb923c" opacity="0.18">
          <animateTransform attributeName="transform" type="rotate"
            from="180 50 50" to="-180 50 50" dur="9s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.18;0.28;0.1;0.18" dur="4.5s" repeatCount="indefinite" />
        </ellipse>
      </g>

      {/* Блик (поверх всего) */}
      <circle cx="50" cy="50" r="46" fill="url(#aig-hl)" />
    </svg>
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

// ─── Голос Арая — TTS через ElevenLabs ───────────────────────────────────────

function useTTS() {
  const [speaking, setSpeaking] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const speak = useCallback(async (text: string, msgId: string) => {
    // Стоп если уже играет
    if (speaking === msgId) {
      audioRef.current?.pause();
      audioRef.current = null;
      setSpeaking(null);
      return;
    }
    audioRef.current?.pause();
    setSpeaking(msgId);

    try {
      const res = await fetch("/api/ai/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) { setSpeaking(null); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => { setSpeaking(null); URL.revokeObjectURL(url); };
      audio.onerror = () => { setSpeaking(null); };
      await audio.play();
    } catch { setSpeaking(null); }
  }, [speaking]);

  return { speaking, speak };
}

// ─── Пузырь сообщения ─────────────────────────────────────────────────────────

function MessageBubble({
  msg, onAction, onSpeak, speaking,
}: {
  msg: Message;
  onAction?: (a: ArayAction) => void;
  onSpeak?: (text: string, id: string) => void;
  speaking?: string | null;
}) {
  const isUser = msg.role === "user";
  const isSpeaking = speaking === msg.id;

  return (
    <div className={`flex gap-2.5 ${isUser ? "flex-row-reverse" : "flex-row"} mb-3.5`}>
      {!isUser && (
        <div className="shrink-0 mt-0.5"><ArayIcon size={24} /></div>
      )}
      <div className={`flex flex-col gap-1.5 ${isUser ? "items-end" : "items-start"} max-w-[85%]`}>
        <div className="px-3.5 py-2.5 text-sm leading-relaxed" style={
          isUser
            ? { background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary)/0.75))", color: "#fff", borderRadius: "16px 16px 4px 16px" }
            : { background: "rgba(255,255,255,0.09)", color: "rgba(255,255,255,0.90)", borderRadius: "16px 16px 16px 4px", border: "1px solid rgba(255,255,255,0.10)" }
        }>
          {msg.content
            ? isUser
              ? msg.content.split("\n").map((line, i, arr) => (
                  <span key={i}>{line}{i < arr.length - 1 && <br />}</span>
                ))
              : <div className="space-y-0.5">{renderMarkdownContent(msg.content)}</div>
            : !isUser && msg.streaming
            ? <span className="inline-flex gap-1 items-center py-0.5">
                <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "hsl(var(--primary)/0.8)", animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "hsl(var(--primary)/0.8)", animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "hsl(var(--primary)/0.8)", animationDelay: "300ms" }} />
              </span>
            : null
          }
          {msg.streaming && msg.content && (
            <span className="inline-block w-0.5 h-3.5 ml-0.5 align-middle animate-pulse" style={{ background: "hsl(var(--primary))" }} />
          )}
        </div>

        {/* ── Action cards — кнопки от Арая ── */}
        {!isUser && msg.actions && msg.actions.length > 0 && (
          <div className="flex flex-col gap-1.5 w-full">
            {msg.actions.map((action, i) => (
              <motion.button
                key={i}
                onClick={() => onAction?.(action)}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl text-sm font-medium text-left transition-all active:scale-[0.97]"
                style={{
                  background: "rgba(232,112,10,0.10)",
                  border: "1px solid rgba(232,112,10,0.25)",
                  color: "rgba(255,255,255,0.90)",
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = "rgba(232,112,10,0.18)";
                  e.currentTarget.style.borderColor = "rgba(232,112,10,0.45)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = "rgba(232,112,10,0.10)";
                  e.currentTarget.style.borderColor = "rgba(232,112,10,0.25)";
                }}
              >
                <span className="flex items-center justify-center w-7 h-7 rounded-xl shrink-0"
                  style={{ background: "rgba(232,112,10,0.20)" }}>
                  <ActionIcon icon={action.icon} />
                </span>
                <span className="flex-1 leading-tight">{action.label}</span>
                <span className="text-xs opacity-50">→</span>
              </motion.button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 px-1">
          <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.38)" }}>
            {msg.timestamp.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
          </span>
          {/* Кнопка голоса — только для сообщений Арая */}
          {!isUser && onSpeak && (
            <button
              onClick={() => onSpeak(msg.content, msg.id)}
              className="flex items-center justify-center w-5 h-5 rounded-full transition-all active:scale-90"
              style={{ color: isSpeaking ? "hsl(var(--primary))" : "rgba(255,255,255,0.28)" }}
              title={isSpeaking ? "Остановить" : "Озвучить"}
            >
              {isSpeaking
                ? <VolumeX className="w-3 h-3" />
                : <Volume2 className="w-3 h-3" />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Главный компонент ────────────────────────────────────────────────────────

export function ArayWidget({ page, productName, cartTotal, enabled = true }: ArayWidgetProps) {
  const { speaking, speak } = useTTS();
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasNew, setHasNew] = useState(false);
  const [proactiveBubble, setProactiveBubble] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  // Встроенный браузер Арая
  const [browserOpen, setBrowserOpen] = useState(false);
  const [browserUrl, setBrowserUrl] = useState("/");
  const [browserAction, setBrowserAction] = useState<ArayBrowserAction | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const dragControls = useDragControls();
  const sessionIdRef = useRef<string>(Date.now().toString());

  // Сохранение истории
  useEffect(() => {
    const userMsgs = messages.filter(m => m.role === "user");
    if (userMsgs.length === 0) return;
    try {
      const title = userMsgs[0].content.slice(0, 70);
      const existing = JSON.parse(localStorage.getItem("aray-client-sessions") || "[]");
      const filtered = existing.filter((s: any) => s.id !== sessionIdRef.current);
      const session = {
        id: sessionIdRef.current,
        date: Date.now(),
        title,
        messages: messages.map(m => ({ ...m, timestamp: m.timestamp.toISOString() })),
      };
      localStorage.setItem("aray-client-sessions", JSON.stringify([session, ...filtered].slice(0, 20)));
    } catch {}
  }, [messages]);
  const cartCount = useCartStore(s => s.totalItems());
  const cartPrice = useCartStore(s => s.totalPrice());
  const chips = buildArayChips({ page, productName, cartTotal });

  // Имя пользователя
  useEffect(() => {
    fetch("/api/ai/me").then(r => r.json()).then(d => {
      if (d.name) setUserName(d.name);
    }).catch(() => {});
  }, []);

  // Мобильный?
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Показать через 1.5 сек
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 1500);
    return () => clearTimeout(t);
  }, []);

  // Клавиатура убрана — используем CSS dvh + safe-area

  const startChat = useCallback(() => {
    if (messages.length > 0) return;
    const isReturning = typeof document !== "undefined" && document.cookie.includes("aray_visited=1");
    let greeting = buildArayGreeting({ page, productName, cartTotal, isReturning });
    if (userName) {
      const h = new Date().getHours();
      const t = h < 12 ? "Доброе утро" : h < 17 ? "Добрый день" : h < 22 ? "Добрый вечер" : "Поздно уже";
      greeting = `${t}, ${userName}! 👋 ${productName ? `Смотришь «${productName}»?` : "Чем могу помочь?"} Спрашивай.`;
    }
    setMessages([{ id: "welcome", role: "assistant", content: greeting, timestamp: new Date() }]);
    if (typeof document !== "undefined") document.cookie = "aray_visited=1; max-age=2592000; path=/";
  }, [messages.length, userName, page, productName, cartTotal]);

  // Открытие из мобильного навбара
  useEffect(() => {
    const handler = () => { setVisible(true); setOpen(true); setHasNew(false); startChat(); };
    window.addEventListener("aray:open", handler);
    return () => window.removeEventListener("aray:open", handler);
  }, [startChat]);

  // Проактивный пузырь
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => {
      if (!open) {
        const msg = userName ? `${userName}, помочь с чем-нибудь? 👋`
          : productName ? `Смотришь «${productName}»? Помогу 👋` : "Если есть вопросы — я рядом 😊";
        setProactiveBubble(msg);
        setTimeout(() => setProactiveBubble(null), 5000);
      }
    }, 20000);
    return () => clearTimeout(t);
  }, [visible, open, userName, productName]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleOpen = () => { setOpen(true); setHasNew(false); setProactiveBubble(null); startChat(); };

  const sendMessage = async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput("");
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: msg, timestamp: new Date() };
    const allMessages = [...messages, userMsg];
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    const assistantId = (Date.now() + 1).toString();

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: allMessages.map(m => ({ role: m.role, content: m.content })),
          context: { page, productName, cartTotal },
        }),
      });

      if (!res.body) throw new Error("No stream");

      // Add empty streaming placeholder
      setMessages(prev => [...prev, {
        id: assistantId, role: "assistant", content: "", timestamp: new Date(), streaming: true,
      }]);
      setLoading(false);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let rawText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        rawText += decoder.decode(value, { stream: true });

        // Show text without internal markers
        const displayText = rawText
          .replace(/\n__ARAY_META__[\s\S]*$/, "")
          .replace(/__ARAY_ERR__[\s\S]*$/, "");

        setMessages(prev => prev.map(m =>
          m.id === assistantId ? { ...m, content: displayText } : m
        ));
      }

      // Parse final content
      const isError = rawText.includes("__ARAY_ERR__");
      const errMatch = rawText.match(/__ARAY_ERR__(.+)$/);
      const cleanText = isError
        ? (errMatch?.[1] || "Не получилось. Попробуй снова 🙏")
        : rawText.replace(/\n__ARAY_META__[\s\S]*$/, "").trim();

      const { text: parsedText, actions } = parseMessageActions(cleanText);

      if (actions.length > 0 && actions[0].type === "navigate" && actions[0].url) {
        setBrowserUrl(actions[0].url);
        setBrowserOpen(true);
      }

      setMessages(prev => prev.map(m =>
        m.id === assistantId ? { ...m, content: parsedText, actions, streaming: false } : m
      ));

      if (!open) setHasNew(true);

    } catch {
      setMessages(prev => {
        const hasPlaceholder = prev.some(m => m.id === assistantId);
        if (hasPlaceholder) {
          return prev.map(m => m.id === assistantId
            ? { ...m, content: "Нет связи. Попробуй снова 🙏", streaming: false }
            : m
          );
        }
        return [...prev, {
          id: assistantId, role: "assistant",
          content: "Нет связи. Попробуй снова 🙏", timestamp: new Date(),
        }];
      });
    } finally {
      setLoading(false);
    }
  };

  const { listening, start: startVoice, stop: stopVoice } = useVoiceInput(text => {
    setInput(input ? input + " " + text : text);
    inputRef.current?.focus();
  });

  // ── Обработчик кнопок-действий от Арая — ДОЛЖЕН быть до return! ──────────
  const handleAction = useCallback((action: ArayAction) => {
    if (action.type === "navigate" && action.url) {
      setBrowserUrl(action.url);
      setBrowserOpen(true);
    }
    if ((action.type === "spotlight" || action.type === "highlight") && action.spotX !== undefined) {
      setBrowserAction({ type: action.type, spotX: action.spotX, spotY: action.spotY, hint: action.hint });
      if (!browserOpen) setBrowserOpen(true);
      setTimeout(() => setBrowserAction(null), 5500);
    }
    if (action.type === "call" && action.url) {
      window.location.href = action.url;
    }
  }, [browserOpen]);

  if (!enabled || !visible) return null;

  // ── Общие стили панели ────────────────────────────────────────────────────
  const panelBg = {
    background: "rgba(11, 11, 13, 0.92)",
    backdropFilter: "blur(40px) saturate(0%) brightness(0.65)",
    WebkitBackdropFilter: "blur(40px) saturate(0%) brightness(0.65)",
    border: "1px solid rgba(255, 255, 255, 0.10)",
    boxShadow: "0 24px 64px rgba(0,0,0,0.55), 0 1px 0 rgba(255,255,255,0.07) inset",
  } as React.CSSProperties;

  return (
    <>
      {/* ══ Встроенный браузер Арая ══ */}
      <AnimatePresence>
        {browserOpen && (
          <ArayBrowser
            initialUrl={browserUrl}
            onClose={() => setBrowserOpen(false)}
            pendingAction={browserAction}
            isMobile={isMobile}
          />
        )}
      </AnimatePresence>

      {/* ══ КНОПКА — чистая сфера, без тёмного фона ══ */}
      {!open && (
        <div className="hidden lg:flex fixed z-50 flex-col items-end gap-2.5"
          style={{ bottom: "1.5rem", right: "1.5rem" }}>
          {/* Проактивный пузырь */}
          <AnimatePresence>
            {proactiveBubble && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92 }}
                onClick={handleOpen}
                className="max-w-[200px] px-3.5 py-2.5 rounded-2xl text-xs cursor-pointer"
                style={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  color: "hsl(var(--foreground))",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                }}>
                {proactiveBubble}
                <div className="absolute -bottom-1.5 right-4 w-3 h-3 rotate-45"
                  style={{ background: "hsl(var(--card))", borderRight: "1px solid hsl(var(--border))", borderBottom: "1px solid hsl(var(--border))" }} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Чистая сфера — без квадратного фона */}
          <motion.button
            onClick={handleOpen}
            whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
            transition={{ type: "spring", stiffness: 400, damping: 18 }}
            aria-label="Открыть Арай"
            className="relative focus:outline-none"
            style={{ width: 56, height: 56, WebkitTapHighlightColor: "transparent" }}>
            <ArayIcon size={56} glow />
            {hasNew && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 animate-pulse"
                style={{ background: "hsl(var(--primary))", borderColor: "hsl(var(--background))" }} />
            )}
            {cartCount > 0 && !hasNew && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full text-[9px] font-bold text-white flex items-center justify-center px-0.5"
                style={{ background: "linear-gradient(135deg,#e8700a,#f59e0b)" }}>
                {cartCount > 9 ? "9+" : cartCount}
              </span>
            )}
          </motion.button>
        </div>
      )}

      {/* ══ ДЕСКТОП ПОПАП ══ */}
      <AnimatePresence>
        {open && !isMobile && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-[60]"
              onClick={() => setOpen(false)}
              style={{ background: "rgba(0,0,0,0.12)", backdropFilter: "blur(2px)" }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.93, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93, y: 16 }}
              transition={{ type: "spring", damping: 28, stiffness: 380 }}
              className="fixed z-[61] flex flex-col overflow-hidden"
              style={{
                bottom: "6rem", right: "1.5rem",
                width: "380px", height: "560px",
                borderRadius: "20px",
                boxShadow: "0 24px 64px rgba(0,0,0,0.18), 0 0 0 1px hsl(var(--border))",
                ...panelBg,
              }}>
              {/* Шапка */}
              <div className="flex items-center gap-3 px-4 py-3 shrink-0"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                <ArayIcon size={32} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.92)" }}>Арай</p>
                  <p className="text-[10px] flex items-center gap-1.5 mt-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                    {userName ? `Привет, ${userName}!` : "ARAY · онлайн"}
                  </p>
                </div>
                {cartCount > 0 && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl"
                    style={{ background: "hsl(var(--primary)/0.1)", border: "1px solid hsl(var(--primary)/0.2)" }}>
                    <ShoppingCart className="w-3.5 h-3.5" style={{ color: "hsl(var(--primary))" }} />
                    <span className="text-[11px] font-semibold tabular-nums" style={{ color: "hsl(var(--primary))" }}>
                      {formatPrice(cartPrice)}
                    </span>
                  </div>
                )}
                <div className="flex gap-0.5">
                  <button onClick={() => { sessionIdRef.current = Date.now().toString(); setMessages([]); startChat(); }}
                    className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors"
                    style={{ color: "rgba(255,255,255,0.40)" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    title="Новый чат"><RotateCcw className="w-3.5 h-3.5" /></button>
                  <button onClick={() => setOpen(false)}
                    className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors"
                    style={{ color: "rgba(255,255,255,0.40)" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                    <X className="w-4 h-4" /></button>
                </div>
              </div>
              {/* Сообщения */}
              <div className="flex-1 overflow-y-auto px-4 py-4 overscroll-contain">
                {messages.map(m => (
                  <MessageBubble key={m.id} msg={m} onAction={handleAction} onSpeak={speak} speaking={speaking} />
                ))}
                {loading && (
                  <div className="flex gap-2.5 mb-3">
                    <ArayIcon size={24} />
                    <div className="px-3.5 py-3 rounded-2xl rounded-tl-[4px]"
                      style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.10)" }}>
                      <div className="flex gap-1.5 items-center h-4">
                        {[0,1,2].map(i => (
                          <span key={i} className="w-1.5 h-1.5 rounded-full"
                            style={{ background: "hsl(var(--primary))", animation: `arayDot 1.4s ease-in-out ${i*0.2}s infinite` }} />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
              {/* Чипсы */}
              {messages.length <= 1 && !loading && chips.length > 0 && (
                <div className="px-4 pb-2 flex gap-2 flex-wrap">
                  {chips.map(q => (
                    <button key={q} onClick={() => sendMessage(q)}
                      className="text-xs px-3 py-1.5 rounded-full transition-all active:scale-95"
                      style={{ background: "hsl(var(--primary)/0.08)", border: "1px solid hsl(var(--primary)/0.2)", color: "hsl(var(--primary))" }}>
                      {q}
                    </button>
                  ))}
                </div>
              )}
              {/* Инпут */}
              <div className="px-4 py-3 flex gap-2 items-end shrink-0"
                style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                <button onClick={listening ? stopVoice : startVoice}
                  className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 relative transition-all"
                  style={{
                    background: listening ? "linear-gradient(135deg,#ef4444,#b91c1c)" : "rgba(255,255,255,0.09)",
                    border: `1px solid ${listening ? "transparent" : "rgba(255,255,255,0.14)"}`,
                    boxShadow: listening ? "0 0 12px rgba(239,68,68,0.4)" : "none",
                  }}>
                  {listening && <span className="absolute inset-0 rounded-full animate-ping"
                    style={{ background: "rgba(239,68,68,0.3)", animationDuration: "1s" }} />}
                  {listening ? <MicOff className="w-4 h-4 text-white relative z-10" /> : <Mic className="w-4 h-4 relative z-10" style={{ color: "rgba(255,255,255,0.55)" }} />}
                </button>
                <textarea
                  ref={inputRef} value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  rows={1} placeholder={listening ? "🎤 Слушаю..." : "Написать Арaю..."}
                  className="flex-1 resize-none text-sm rounded-2xl px-4 py-2.5 focus:outline-none transition-all"
                  style={{
                    background: "rgba(255,255,255,0.07)",
                    border: `1px solid ${listening ? "rgba(239,68,68,0.4)" : "rgba(255,255,255,0.12)"}`,
                    color: "rgba(255,255,255,0.90)",
                    maxHeight: "100px",
                  }}
                />
                <button onClick={() => sendMessage()} disabled={loading || !input.trim()}
                  className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all disabled:opacity-40"
                  style={{
                    background: input.trim() ? "linear-gradient(135deg, hsl(var(--primary)), #f59e0b)" : "hsl(var(--muted))",
                    border: "1px solid hsl(var(--border))",
                    boxShadow: input.trim() ? "0 4px 12px hsl(var(--primary)/0.3)" : "none",
                  }}>
                  {loading
                    ? <Loader2 className="w-4 h-4 animate-spin" style={{ color: "hsl(var(--muted-foreground))" }} />
                    : <Send className="w-4 h-4" style={{ color: input.trim() ? "#fff" : "hsl(var(--muted-foreground))" }} />}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ══ МОБИЛЬНЫЙ FULLSCREEN ══ */}
      <AnimatePresence>
        {open && isMobile && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 z-[60]"
              style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(5px)", WebkitBackdropFilter: "blur(5px)" }}
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 32, stiffness: 340, mass: 0.9 }}
              className="fixed left-0 right-0 bottom-0 z-[61] flex flex-col overflow-hidden"
              style={{
                height: "92dvh",
                borderRadius: "20px 20px 0 0",
                boxShadow: "0 -8px 48px rgba(0,0,0,0.25)",
                ...panelBg,
              }}>
              {/* Ручка — свайп вниз для закрытия */}
              <div
                className="flex justify-center pt-2.5 pb-1 shrink-0"
                onClick={() => setOpen(false)}
              >
                <div className="w-10 h-[3px] rounded-full" style={{ background: "rgba(255,255,255,0.20)" }} />
              </div>
              {/* Шапка */}
              <div className="flex items-center gap-3 px-4 py-3 shrink-0"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                <ArayIcon size={32} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.92)" }}>Арай</p>
                  <p className="text-[10px] flex items-center gap-1.5 mt-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                    {userName ? `Привет, ${userName}!` : "ARAY · онлайн"}
                  </p>
                </div>
                {cartCount > 0 && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl"
                    style={{ background: "hsl(var(--primary) / 0.1)", border: "1px solid hsl(var(--primary) / 0.2)" }}>
                    <ShoppingCart className="w-3.5 h-3.5" style={{ color: "hsl(var(--primary))" }} />
                    <span className="text-[11px] font-semibold tabular-nums" style={{ color: "hsl(var(--primary))" }}>
                      {formatPrice(cartPrice)}
                    </span>
                  </div>
                )}
                <div className="flex gap-0.5">
                  <button onClick={() => { setMessages([]); startChat(); }}
                    className="w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{ color: "rgba(255,255,255,0.40)" }} title="Новый чат">
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setOpen(false)}
                    className="w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{ color: "rgba(255,255,255,0.40)" }}>
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {/* Сообщения */}
              <div className="flex-1 overflow-y-auto px-4 py-4 overscroll-contain">
                {messages.map(m => (
                  <MessageBubble key={m.id} msg={m} onAction={handleAction} onSpeak={speak} speaking={speaking} />
                ))}
                {loading && (
                  <div className="flex gap-2.5 mb-3">
                    <ArayIcon size={24} />
                    <div className="px-3.5 py-3 rounded-2xl rounded-tl-[4px]"
                      style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.10)" }}>
                      <div className="flex gap-1.5 items-center h-4">
                        {[0,1,2].map(i => (
                          <span key={i} className="w-1.5 h-1.5 rounded-full"
                            style={{ background: "hsl(var(--primary))", animation: `arayDot 1.4s ease-in-out ${i*0.2}s infinite` }} />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
              {/* Чипсы */}
              {messages.length <= 1 && !loading && chips.length > 0 && (
                <div className="px-4 pb-2 flex gap-2 flex-wrap shrink-0">
                  {chips.map(q => (
                    <button key={q} onClick={() => sendMessage(q)}
                      className="text-xs px-3 py-1.5 rounded-full transition-all active:scale-95"
                      style={{ background: "hsl(var(--primary)/0.08)", border: "1px solid hsl(var(--primary)/0.2)", color: "hsl(var(--primary))" }}>
                      {q}
                    </button>
                  ))}
                </div>
              )}
              {/* Инпут */}
              <div className="px-4 py-3 flex gap-2 items-end shrink-0"
                style={{
                  borderTop: "1px solid rgba(255,255,255,0.08)",
                  paddingBottom: "max(12px, env(safe-area-inset-bottom, 12px))",
                }}>
                <button onClick={listening ? stopVoice : startVoice}
                  className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 relative"
                  style={{
                    background: listening ? "linear-gradient(135deg,#ef4444,#b91c1c)" : "rgba(255,255,255,0.09)",
                    border: `1px solid ${listening ? "transparent" : "rgba(255,255,255,0.14)"}`,
                  }}>
                  {listening && <span className="absolute inset-0 rounded-full animate-ping"
                    style={{ background: "rgba(239,68,68,0.3)", animationDuration: "1s" }} />}
                  {listening
                    ? <MicOff className="w-4 h-4 text-white relative z-10" />
                    : <Mic className="w-4 h-4 relative z-10" style={{ color: "rgba(255,255,255,0.55)" }} />}
                </button>
                <textarea
                  ref={inputRef} value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  rows={1} placeholder={listening ? "🎤 Слушаю..." : "Написать Арaю..."}
                  className="flex-1 resize-none text-sm rounded-2xl px-4 py-2.5 focus:outline-none"
                  style={{
                    background: "rgba(255,255,255,0.07)",
                    border: `1px solid ${listening ? "rgba(239,68,68,0.4)" : "rgba(255,255,255,0.12)"}`,
                    color: "rgba(255,255,255,0.90)",
                    maxHeight: "100px",
                  }}
                />
                <button onClick={() => sendMessage()} disabled={loading || !input.trim()}
                  className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 disabled:opacity-40"
                  style={{
                    background: input.trim() ? "linear-gradient(135deg, hsl(var(--primary)), #f59e0b)" : "hsl(var(--muted))",
                    border: "1px solid hsl(var(--border))",
                    boxShadow: input.trim() ? "0 4px 12px hsl(var(--primary)/0.3)" : "none",
                  }}>
                  {loading
                    ? <Loader2 className="w-4 h-4 animate-spin" style={{ color: "hsl(var(--muted-foreground))" }} />
                    : <Send className="w-4 h-4" style={{ color: input.trim() ? "#fff" : "hsl(var(--muted-foreground))" }} />}
                </button>
              </div>
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
