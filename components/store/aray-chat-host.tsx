"use client";

/**
 * ArayChatHost — единый глобальный компонент-хост для Арая.
 *
 * Один на всё приложение (магазин + админка + кабинет). Слушает события:
 *   - `aray:open`         → открыть чат
 *   - `aray:prompt`       → отправить сообщение Араю (от Dock или MobileNav)
 *   - `aray:close`        → закрыть чат
 *   - `aray:reply`        → внешний триггер ответа (от VoiceModeOverlay для истории)
 *
 * Архитектура:
 *   - Десктоп (≥1024px) → окно справа снизу 420×600, draggable, swipe-to-orb
 *   - Планшет/мобилка   → fullscreen
 *   - История           → localStorage `aray.chat.history.v1`
 *   - Streaming         → SSE с парсингом ARAY_NAVIGATE/SHOW_URL/POPUP/ADD_CART/REFRESH/ARAY_ACTIONS
 *   - Markdown          → жирный, курсив, списки, ссылки
 *   - TTS               → озвучка ответа если включён voice mode
 *   - ArayBrowser       → попап-iframe для показа товаров/страниц (открывается по __ARAY_SHOW_URL__)
 */

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Send, Mic, Volume2, VolumeX, RotateCcw, Loader2,
  ShoppingCart, Calculator, Truck, Package, Search, Sparkles,
  ChevronRight, Minimize2, Copy, Check,
} from "lucide-react";
import { ArayOrb } from "@/components/shared/aray-orb";
import { ArayBrowser, type ArayBrowserAction } from "@/components/store/aray-browser";
import { useCartStore } from "@/store/cart";
import { getArayContext, initArayTracker } from "@/lib/aray-tracker";

// ─── Типы ──────────────────────────────────────────────────────────────────────
interface AssistantAction {
  type: "navigate" | "call" | "show";
  url?: string;
  label: string;
  icon?: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  typing?: boolean;
  actions?: AssistantAction[];
}

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  prompt: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const HISTORY_KEY = "aray.chat.history.v1";
const VOICE_PREF_KEY = "aray.voice.enabled.v1";
const MAX_HISTORY = 30;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function haptic(ms: number | number[] = 8) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try { navigator.vibrate(ms as any); } catch {}
  }
}

function formatPrice(n: number): string {
  return new Intl.NumberFormat("ru-RU").format(Math.round(n));
}

function loadHistory(): Message[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.slice(-MAX_HISTORY).map((m: any) => ({
      ...m, timestamp: new Date(m.timestamp),
    })) : [];
  } catch { return []; }
}

function saveHistory(messages: Message[]) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(messages.slice(-MAX_HISTORY)));
  } catch {}
}

// ─── Парсер маркеров из streamed ответа ───────────────────────────────────────
interface ParsedReply {
  text: string;
  navigateUrl?: string;
  showUrl?: { url: string; title?: string };
  popup?: { url: string; title?: string };
  spotlight?: { x: number; y: number; hint?: string };
  addToCart?: { variantId: string; quantity: number; unit?: string };
  refresh?: boolean;
  actions: AssistantAction[];
}

function parseReply(raw: string): ParsedReply {
  let text = raw;
  const result: ParsedReply = { text: "", actions: [] };

  // __ARAY_META__ — служебная мета в конце
  text = text.replace(/\n?__ARAY_META__[\s\S]*$/, "");

  // __ARAY_ERR__ — ошибка
  const errMatch = text.match(/__ARAY_ERR__(.+?)$/);
  if (errMatch) {
    return { text: errMatch[1].trim(), actions: [] };
  }

  // __ARAY_NAVIGATE:/url__ — переход
  const navMatch = text.match(/__ARAY_NAVIGATE:([^_]+?)__/);
  if (navMatch) result.navigateUrl = navMatch[1];
  text = text.replace(/__ARAY_NAVIGATE:[^_]+?__/g, "");

  // __ARAY_SHOW_URL:url:title__ — показать попап
  const showMatch = text.match(/__ARAY_SHOW_URL:([^:]+?):([^_]+?)__/);
  if (showMatch) result.showUrl = { url: showMatch[1], title: showMatch[2] };
  text = text.replace(/__ARAY_SHOW_URL:[^_]+?:[^_]+?__/g, "");

  // __ARAY_POPUP:{...}__ — JSON попап
  const popupMatch = text.match(/__ARAY_POPUP:(\{[^}]+\})__/);
  if (popupMatch) {
    try {
      const data = JSON.parse(popupMatch[1]);
      result.popup = { url: data.url, title: data.title };
    } catch {}
  }
  text = text.replace(/__ARAY_POPUP:\{[^}]+\}__/g, "");

  // __ARAY_ADD_CART:variantId:qty:unit__
  const cartMatch = text.match(/__ARAY_ADD_CART:([^:]+?):(\d+(?:\.\d+)?)(?::(\w+))?__/);
  if (cartMatch) {
    result.addToCart = {
      variantId: cartMatch[1],
      quantity: parseFloat(cartMatch[2]),
      unit: cartMatch[3],
    };
  }
  text = text.replace(/__ARAY_ADD_CART:[^_]+?__/g, "");

  // __ARAY_SPOTLIGHT:x:y:hint__ — палец-указатель на координатах в попап-браузере
  // x, y — проценты (0-100), hint — текст подсказки "Нажми сюда!"
  const spotMatch = text.match(/__ARAY_SPOTLIGHT:(\d{1,3}(?:\.\d+)?):(\d{1,3}(?:\.\d+)?)(?::([^_]+?))?__/);
  if (spotMatch) {
    result.spotlight = {
      x: parseFloat(spotMatch[1]),
      y: parseFloat(spotMatch[2]),
      hint: spotMatch[3]?.trim(),
    };
  }
  text = text.replace(/__ARAY_SPOTLIGHT:[^_]+?__/g, "");

  // __ARAY_REFRESH__
  if (text.includes("__ARAY_REFRESH__")) result.refresh = true;
  text = text.replace(/__ARAY_REFRESH__/g, "");

  // ARAY_ACTIONS:[...] — кнопки внизу сообщения
  const actionsIdx = text.indexOf("ARAY_ACTIONS:");
  if (actionsIdx !== -1) {
    try {
      const jsonStr = text.slice(actionsIdx + "ARAY_ACTIONS:".length).trim();
      const actions = JSON.parse(jsonStr) as AssistantAction[];
      if (Array.isArray(actions)) result.actions = actions;
    } catch {}
    text = text.slice(0, actionsIdx);
  }

  result.text = text.trim();
  return result;
}

// ─── Markdown рендер inline ───────────────────────────────────────────────────
function renderInline(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*\n]+\*\*|\*[^*\n]+\*|`[^`\n]+`|\[[^\]]+\]\([^)]+\))/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**"))
      return <strong key={i} className="font-semibold">{p.slice(2, -2)}</strong>;
    if (p.startsWith("*") && p.endsWith("*"))
      return <em key={i}>{p.slice(1, -1)}</em>;
    if (p.startsWith("`") && p.endsWith("`"))
      return <code key={i} className="px-1 py-0.5 rounded bg-muted text-primary text-[12px] font-mono">{p.slice(1, -1)}</code>;
    if (p.startsWith("[")) {
      const m = p.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (m) return <a key={i} href={m[2]} className="text-primary underline" target="_blank" rel="noreferrer">{m[1]}</a>;
    }
    return <span key={i}>{p}</span>;
  });
}

function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split("\n");
  const nodes: React.ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    if (/^[\-\*•]\s/.test(line.trim())) {
      const items: string[] = [];
      while (i < lines.length && /^[\-\*•]\s/.test(lines[i].trim())) {
        items.push(lines[i].replace(/^[\s]*[\-\*•]\s+/, "").trim());
        i++;
      }
      nodes.push(
        <ul key={`ul-${nodes.length}`} className="space-y-1 my-1.5">
          {items.map((it, ii) => (
            <li key={ii} className="flex gap-2 items-start">
              <span className="mt-[7px] w-1.5 h-1.5 rounded-full shrink-0 bg-primary/50" />
              <span className="flex-1">{renderInline(it)}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    }
    if (/^\d+\.\s/.test(line.trim())) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, "").trim());
        i++;
      }
      nodes.push(
        <ol key={`ol-${nodes.length}`} className="space-y-1 my-1.5 ml-2">
          {items.map((it, ii) => (
            <li key={ii} className="flex gap-2 items-start">
              <span className="text-primary font-semibold shrink-0">{ii + 1}.</span>
              <span className="flex-1">{renderInline(it)}</span>
            </li>
          ))}
        </ol>
      );
      continue;
    }
    nodes.push(
      <p key={`p-${nodes.length}`} className="leading-relaxed">{renderInline(line)}</p>
    );
    i++;
  }
  return <div className="space-y-1">{nodes}</div>;
}

// ─── Quick actions для пустого чата ───────────────────────────────────────────
function getQuickActions(productName?: string | null, isStaff?: boolean): QuickAction[] {
  if (isStaff) {
    return [
      { id: "stat", label: "Сводка дня", icon: <Sparkles className="w-4 h-4" />, prompt: "Покажи сводку: заказы, выручка, что важно сегодня" },
      { id: "orders", label: "Новые заказы", icon: <Package className="w-4 h-4" />, prompt: "Покажи новые заказы" },
      { id: "tasks", label: "Мои задачи", icon: <Search className="w-4 h-4" />, prompt: "Какие у меня задачи?" },
      { id: "stock", label: "Остатки", icon: <Truck className="w-4 h-4" />, prompt: "Что заканчивается на складе?" },
    ];
  }
  const base: QuickAction[] = [
    { id: "find", label: "Подобрать", icon: <Search className="w-4 h-4" />, prompt: "Помоги подобрать материал — расскажу что строю" },
    { id: "calc", label: "Рассчитать", icon: <Calculator className="w-4 h-4" />, prompt: "Рассчитай сколько материала нужно" },
    { id: "delivery", label: "Доставка", icon: <Truck className="w-4 h-4" />, prompt: "Расскажи про доставку и сроки" },
    { id: "compare", label: "Сравнить", icon: <Package className="w-4 h-4" />, prompt: "Сравни виды пиломатериалов" },
  ];
  if (productName) {
    base.unshift({
      id: "about",
      label: `Про ${productName.length > 18 ? productName.slice(0, 18) + "..." : productName}`,
      icon: <Sparkles className="w-4 h-4" />,
      prompt: `Расскажи про ${productName}: для каких задач, какое качество, плюсы и минусы`,
    });
  }
  return base.slice(0, 4);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── ГЛАВНЫЙ КОМПОНЕНТ ────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
export function ArayChatHost() {
  const pathname = usePathname() || "/";
  const router = useRouter();
  const cartItems = useCartStore((s) => s.items);
  const addToCart = useCartStore((s) => s.addItem);

  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [showActions, setShowActions] = useState(true);
  const [browserState, setBrowserState] = useState<{ url: string; title?: string } | null>(null);
  const [browserAction, setBrowserAction] = useState<ArayBrowserAction | null>(null);
  const [toastInfo, setToastInfo] = useState<string | null>(null);

  // Auto-dismiss тост через 3 сек
  useEffect(() => {
    if (!toastInfo) return;
    const t = setTimeout(() => setToastInfo(null), 3000);
    return () => clearTimeout(t);
  }, [toastInfo]);
  const [isMobile, setIsMobile] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isProcessing = useRef(false);

  // ── Initial mount ────────────────────────────────────────────────────────────
  useEffect(() => {
    setMessages(loadHistory());
    try {
      setVoiceEnabled(localStorage.getItem(VOICE_PREF_KEY) === "true");
    } catch {}
    initArayTracker();
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // ── Persist voice preference ────────────────────────────────────────────────
  useEffect(() => {
    try { localStorage.setItem(VOICE_PREF_KEY, String(voiceEnabled)); } catch {}
  }, [voiceEnabled]);

  // ── Persist messages ────────────────────────────────────────────────────────
  useEffect(() => {
    if (messages.length > 0 && !messages.some(m => m.typing)) {
      saveHistory(messages);
    }
  }, [messages]);

  // ── Auto-scroll к низу ──────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  // ── TTS озвучка ─────────────────────────────────────────────────────────────
  const speak = useCallback(async (text: string) => {
    if (!text || !voiceEnabled) return;
    try {
      const res = await fetch("/api/ai/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (res.ok && res.headers.get("content-type")?.includes("audio")) {
        const buf = await res.arrayBuffer();
        const blob = new Blob([buf], { type: "audio/mpeg" });
        const url = URL.createObjectURL(blob);
        // Останавливаем предыдущее воспроизведение
        if (audioRef.current) {
          try { audioRef.current.pause(); } catch {}
        }
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => URL.revokeObjectURL(url);
        await audio.play();
      } else {
        // Browser fallback
        try {
          const u = new SpeechSynthesisUtterance(text);
          u.lang = "ru-RU";
          speechSynthesis.cancel();
          speechSynthesis.speak(u);
        } catch {}
      }
    } catch (e) {
      console.warn("[ArayHost] TTS error", e);
    }
  }, [voiceEnabled]);

  // ── Отправка сообщения в Арая ───────────────────────────────────────────────
  const sendMessage = useCallback(async (text: string, options?: { silent?: boolean }) => {
    if (!text.trim() || isProcessing.current) return;
    isProcessing.current = true;
    setLoading(true);
    setShowActions(false);

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: "user",
      content: text.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput("");
    if (inputRef.current) inputRef.current.style.height = "auto";

    // Typing indicator
    const typingId = `t-${Date.now()}`;
    setMessages(prev => [
      ...prev,
      { id: typingId, role: "assistant", content: "", timestamp: new Date(), typing: true },
    ]);

    try {
      // Контекст для API
      const productName = (() => {
        const m = pathname.match(/\/product\/([^/]+)/);
        return m ? decodeURIComponent(m[1]).replace(/-/g, " ") : null;
      })();
      const cartTotal = cartItems.reduce((s, it: any) => s + (Number(it.price) || 0) * (Number(it.quantity) || 0), 0);

      const ctx = {
        ...getArayContext(),
        page: pathname,
        productName,
        cartTotal,
        zone: pathname.startsWith("/admin") ? "admin" : pathname.startsWith("/cabinet") ? "cabinet" : "store",
      };

      const apiMessages = messages
        .filter(m => !m.typing)
        .map(m => ({ role: m.role, content: m.content }));
      apiMessages.push({ role: "user", content: text.trim() });

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages.slice(-15), context: ctx }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (!res.body) throw new Error("No stream");

      // Удаляем typing, добавляем пустое сообщение для streaming
      const assistantId = `a-${Date.now()}`;
      setMessages(prev =>
        prev.filter(m => m.id !== typingId).concat({
          id: assistantId, role: "assistant", content: "", timestamp: new Date(),
        })
      );

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let raw = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        raw += decoder.decode(value, { stream: true });

        // Live preview: показываем текст без маркеров на лету
        const liveText = raw
          .replace(/\n?__ARAY_META__[\s\S]*$/, "")
          .replace(/__ARAY_ERR__[\s\S]*$/, "")
          .replace(/__ARAY_NAVIGATE:[^_]+?__/g, "")
          .replace(/__ARAY_SHOW_URL:[^_]+?:[^_]+?__/g, "")
          .replace(/__ARAY_POPUP:\{[^}]+\}__/g, "")
          .replace(/__ARAY_ADD_CART:[^_]+?__/g, "")
          .replace(/__ARAY_REFRESH__/g, "")
          .split("ARAY_ACTIONS:")[0]
          .trim();

        setMessages(prev =>
          prev.map(m => m.id === assistantId ? { ...m, content: liveText } : m)
        );
      }

      // Финальный парсинг
      const parsed = parseReply(raw);

      setMessages(prev =>
        prev.map(m => m.id === assistantId ? { ...m, content: parsed.text, actions: parsed.actions } : m)
      );

      // Действия
      if (parsed.addToCart) {
        try {
          // Через cart store — нужно прочитать товар по variantId
          // Простой подход: dispatch custom event, cart-aware компонент сам обработает
          window.dispatchEvent(new CustomEvent("aray:add-to-cart", { detail: parsed.addToCart }));
        } catch (e) { console.warn("[Aray] add-to-cart error", e); }
      }

      // Известно что блокируют iframe (X-Frame-Options/CSP). Для них — новая вкладка.
      const externalIframeBlockers = [
        "yandex.ru", "ya.ru", "direct.yandex", "metrika.yandex",
        "gosuslugi.ru", "nalog.ru", "egrul.nalog",
        "sberbank.ru", "tinkoff.ru", "alfabank.ru", "vtb.ru",
        "wildberries.ru", "ozon.ru", "avito.ru",
      ];

      const isBlockedExternal = (u: string) => {
        try {
          if (!u.startsWith("http")) return false;
          const host = new URL(u).hostname.toLowerCase();
          return externalIframeBlockers.some(b => host.includes(b));
        } catch { return false; }
      };

      const showCandidate = parsed.showUrl || parsed.popup;
      if (showCandidate) {
        if (isBlockedExternal(showCandidate.url)) {
          // Открываем в новой вкладке — попытка iframe бесполезна
          window.open(showCandidate.url, "_blank", "noopener,noreferrer");
          setToastInfo(`Открыл ${showCandidate.title || "страницу"} в новой вкладке`);
        } else {
          setBrowserState({ url: showCandidate.url, title: showCandidate.title });
          // Если есть spotlight — ставим через 1.2с (даём странице загрузиться)
          if (parsed.spotlight) {
            setTimeout(() => {
              setBrowserAction({
                type: "spotlight",
                spotX: parsed.spotlight!.x,
                spotY: parsed.spotlight!.y,
                hint: parsed.spotlight!.hint,
              });
            }, 1200);
          }
        }
      } else if (parsed.spotlight && browserState) {
        // Если попап уже открыт — сразу ставим указатель
        setBrowserAction({
          type: "spotlight",
          spotX: parsed.spotlight.x,
          spotY: parsed.spotlight.y,
          hint: parsed.spotlight.hint,
        });
      }

      if (parsed.navigateUrl) {
        // Внешняя ссылка → новое окно. Внутренняя → router
        if (parsed.navigateUrl.startsWith("http")) {
          window.open(parsed.navigateUrl, "_blank", "noopener,noreferrer");
        } else {
          setTimeout(() => router.push(parsed.navigateUrl!), 800);
        }
      }

      if (parsed.refresh) {
        setTimeout(() => router.refresh(), 600);
      }

      // Озвучка
      if (parsed.text && voiceEnabled && !options?.silent) {
        speak(parsed.text);
      }

      // Эмит для VoiceOverlay/трекера
      try {
        window.dispatchEvent(new CustomEvent("aray:reply", {
          detail: { text: parsed.text, mode: "chat" },
        }));
      } catch {}

    } catch (err: any) {
      console.error("[ArayHost] send error", err?.message);
      setMessages(prev =>
        prev.filter(m => m.id !== typingId).concat({
          id: `e-${Date.now()}`,
          role: "assistant",
          content: "Что-то пошло не так. Попробуй ещё раз через минуту.",
          timestamp: new Date(),
        })
      );
    } finally {
      setLoading(false);
      isProcessing.current = false;
    }
  }, [pathname, cartItems, messages, voiceEnabled, speak, router]);

  // ── Listen to global events ──────────────────────────────────────────────────
  useEffect(() => {
    const onOpen = () => {
      setOpen(true);
      setMinimized(false);
      haptic(8);
      setTimeout(() => inputRef.current?.focus(), 250);
    };
    const onClose = () => setOpen(false);
    const onPrompt = (e: Event) => {
      const ce = e as CustomEvent<{ text: string }>;
      const text = ce.detail?.text;
      if (!text) return;
      setOpen(true);
      setMinimized(false);
      sendMessage(text);
    };
    window.addEventListener("aray:open", onOpen);
    window.addEventListener("aray:close", onClose);
    window.addEventListener("aray:prompt", onPrompt as EventListener);
    return () => {
      window.removeEventListener("aray:open", onOpen);
      window.removeEventListener("aray:close", onClose);
      window.removeEventListener("aray:prompt", onPrompt as EventListener);
    };
  }, [sendMessage]);

  // ── Escape → close ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !browserState) handleClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, browserState]);

  // ── Auto-resize textarea ─────────────────────────────────────────────────────
  useEffect(() => {
    const ta = inputRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(120, Math.max(44, ta.scrollHeight)) + "px";
  }, [input]);

  const handleClose = useCallback(() => {
    setOpen(false);
    setMinimized(false);
    if (audioRef.current) {
      try { audioRef.current.pause(); } catch {}
    }
    try { speechSynthesis.cancel(); } catch {}
  }, []);

  const handleClear = useCallback(() => {
    setMessages([]);
    setShowActions(true);
    saveHistory([]);
    haptic(10);
  }, []);

  const copyMessage = useCallback((id: string, text: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {}
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const cartTotal = useMemo(
    () => cartItems.reduce((s, it: any) => s + (Number(it.price) || 0) * (Number(it.quantity) || 0), 0),
    [cartItems]
  );

  // ── Контекст для quick actions ───────────────────────────────────────────────
  const productName = useMemo(() => {
    const m = pathname.match(/\/product\/([^/]+)/);
    return m ? decodeURIComponent(m[1]).replace(/-/g, " ") : null;
  }, [pathname]);
  const isStaff = pathname.startsWith("/admin");
  const quickActions = useMemo(() => getQuickActions(productName, isStaff), [productName, isStaff]);

  if (!open) return null;

  // ─── РЕНДЕР: окно или попап-минимизация ─────────────────────────────────────
  return (
    <>
      <AnimatePresence>
        {!minimized && (
          <motion.div
            key="chat"
            initial={isMobile ? { y: "100%" } : { opacity: 0, scale: 0.95, y: 24 }}
            animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
            exit={isMobile ? { y: "100%" } : { opacity: 0, scale: 0.95, y: 24 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className={`fixed z-[300] flex flex-col bg-card border border-border ${
              isMobile
                ? "inset-0 rounded-none"
                : "bottom-20 right-6 w-[420px] h-[640px] rounded-[24px] shadow-2xl"
            }`}
            style={{
              backdropFilter: isMobile ? undefined : "blur(20px) saturate(180%)",
              WebkitBackdropFilter: isMobile ? undefined : "blur(20px) saturate(180%)",
            }}
            role="dialog"
            aria-modal="true"
            aria-label="Чат с Араем"
          >
            {/* ─── Header ─────────────────────────────────────────────── */}
            <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-border"
              style={{ paddingTop: isMobile ? "max(12px, env(safe-area-inset-top, 12px))" : undefined }}>
              <div className="flex items-center gap-3 min-w-0">
                <div className="shrink-0">
                  <ArayOrb size={36} pulse={loading ? "listening" : "idle"} id="header" />
                </div>
                <div className="min-w-0">
                  <h2 className="font-display font-bold text-base truncate">Арай</h2>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {loading ? "думаю..." : isStaff ? "правая рука" : "проводник по дереву"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {cartTotal > 0 && !isStaff && (
                  <button
                    onClick={() => router.push("/cart")}
                    className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary transition-colors text-[12px] font-semibold"
                    title="Открыть корзину"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" strokeWidth={2.2} />
                    {formatPrice(cartTotal)} ₽
                  </button>
                )}
                <button
                  onClick={() => setVoiceEnabled(v => !v)}
                  className="p-2 rounded-xl hover:bg-muted transition-colors"
                  title={voiceEnabled ? "Выключить озвучку" : "Включить озвучку"}
                  aria-label="Озвучка"
                >
                  {voiceEnabled
                    ? <Volume2 className="w-4 h-4 text-primary" />
                    : <VolumeX className="w-4 h-4 text-muted-foreground" />}
                </button>
                {messages.length > 0 && (
                  <button
                    onClick={handleClear}
                    className="p-2 rounded-xl hover:bg-muted transition-colors"
                    title="Очистить чат"
                    aria-label="Очистить"
                  >
                    <RotateCcw className="w-4 h-4 text-muted-foreground" />
                  </button>
                )}
                {!isMobile && (
                  <button
                    onClick={() => setMinimized(true)}
                    className="p-2 rounded-xl hover:bg-muted transition-colors"
                    title="Свернуть к орбу"
                    aria-label="Свернуть"
                  >
                    <Minimize2 className="w-4 h-4 text-muted-foreground" />
                  </button>
                )}
                <button
                  onClick={handleClose}
                  className="p-2 rounded-xl hover:bg-muted transition-colors"
                  aria-label="Закрыть"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* ─── Messages ───────────────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4">
              {/* Welcome */}
              {messages.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center text-center pt-6 pb-4"
                >
                  <ArayOrb size={80} pulse="idle" id="welcome" />
                  <h3 className="font-display font-bold text-xl mt-4">
                    {isStaff ? "Привет, брат" : "Привет!"}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1.5 max-w-[280px]">
                    {isStaff
                      ? "Я твоя правая рука. Спроси про заказы, склад, задачи — отвечу или сделаю."
                      : "Я Арай. Помогу подобрать материал, рассчитать сколько нужно и оформить заказ."}
                  </p>
                </motion.div>
              )}

              {showActions && messages.length === 0 && (
                <div className="grid grid-cols-2 gap-2 mt-2 mb-2">
                  {quickActions.map((action) => (
                    <motion.button
                      key={action.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => sendMessage(action.prompt)}
                      className="flex items-center gap-2.5 p-3 rounded-2xl border border-border bg-muted/30 hover:bg-muted/60 hover:border-primary/30 transition-all text-left"
                    >
                      <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        {action.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{action.label}</p>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
                    </motion.button>
                  ))}
                </div>
              )}

              {/* Сообщения */}
              <div className="space-y-3">
                {messages.filter(m => !m.typing || loading).map((msg) => {
                  const isUser = msg.role === "user";
                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.18 }}
                      className={`flex ${isUser ? "justify-end" : "justify-start"} group`}
                    >
                      {!isUser && (
                        <div className="w-8 h-8 rounded-full shrink-0 mr-2 mt-0.5 overflow-hidden border border-primary/30">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src="/images/aray/face-mob.png" alt="Арай" className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className={`max-w-[82%] flex flex-col gap-1.5 ${isUser ? "items-end" : "items-start"}`}>
                        <div
                          className={`rounded-2xl px-3.5 py-2.5 text-[14px] leading-relaxed ${
                            isUser
                              ? "bg-primary text-primary-foreground rounded-br-md"
                              : "bg-muted border border-border rounded-bl-md"
                          }`}
                        >
                          {msg.typing ? (
                            <div className="flex items-center gap-1.5 py-1">
                              <span className="w-2 h-2 rounded-full bg-primary/70 animate-pulse" style={{ animationDelay: "0ms" }} />
                              <span className="w-2 h-2 rounded-full bg-primary/70 animate-pulse" style={{ animationDelay: "150ms" }} />
                              <span className="w-2 h-2 rounded-full bg-primary/70 animate-pulse" style={{ animationDelay: "300ms" }} />
                            </div>
                          ) : (
                            renderMarkdown(msg.content)
                          )}
                        </div>

                        {/* Actions buttons */}
                        {!isUser && msg.actions && msg.actions.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {msg.actions.slice(0, 4).map((a, ii) => (
                              <button
                                key={ii}
                                onClick={() => {
                                  if (a.type === "navigate" && a.url) {
                                    if (a.url.startsWith("http")) window.open(a.url, "_blank");
                                    else router.push(a.url);
                                  } else if (a.type === "call" && a.url) {
                                    window.location.href = a.url;
                                  } else if (a.type === "show" && a.url) {
                                    setBrowserState({ url: a.url, title: a.label });
                                  }
                                }}
                                className="px-3 py-1.5 rounded-xl text-[12px] font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                              >
                                {a.label}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Time + copy */}
                        {!msg.typing && (
                          <div className="flex items-center gap-2 px-1">
                            <span className="text-[10px] text-muted-foreground/60">
                              {msg.timestamp.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                            {!isUser && msg.content && (
                              <button
                                onClick={() => copyMessage(msg.id, msg.content)}
                                className="opacity-0 group-hover:opacity-60 hover:opacity-100 transition-opacity"
                                title="Копировать"
                              >
                                {copiedId === msg.id
                                  ? <Check className="w-3 h-3 text-emerald-500" />
                                  : <Copy className="w-3 h-3 text-muted-foreground" />}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              <div ref={messagesEndRef} />
            </div>

            {/* ─── Input ──────────────────────────────────────────────── */}
            <div
              className="shrink-0 border-t border-border px-3 py-2.5"
              style={{ paddingBottom: isMobile ? "max(12px, env(safe-area-inset-bottom, 12px))" : undefined }}
            >
              <div className="flex items-end gap-2">
                <button
                  onClick={() => {
                    haptic(8);
                    window.dispatchEvent(new CustomEvent("aray:voice"));
                  }}
                  className="p-2.5 rounded-xl hover:bg-muted transition-colors shrink-0 mb-0.5"
                  title="Голосовой режим"
                  aria-label="Голос"
                >
                  <Mic className="w-5 h-5 text-muted-foreground" />
                </button>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Напиши Араю..."
                  rows={1}
                  className="flex-1 px-4 py-2.5 text-[14px] rounded-2xl border border-border bg-background text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 resize-none"
                  style={{ minHeight: "44px", maxHeight: "120px", fontSize: "16px" }}
                  aria-label="Сообщение"
                />
                <button
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || loading}
                  className="p-2.5 rounded-xl bg-primary text-primary-foreground disabled:opacity-30 hover:brightness-110 transition-all shrink-0 mb-0.5"
                  style={{
                    boxShadow: input.trim() ? "0 0 14px hsl(var(--primary) / 0.45)" : undefined,
                  }}
                  aria-label="Отправить"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Минимизация — мини-орб справа снизу */}
      <AnimatePresence>
        {minimized && !isMobile && (
          <motion.button
            key="min"
            initial={{ opacity: 0, scale: 0.6, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.6, y: 24 }}
            transition={{ type: "spring", stiffness: 420, damping: 26 }}
            onClick={() => { setMinimized(false); haptic(8); }}
            className="fixed z-[300] bottom-24 right-6 w-14 h-14 rounded-full bg-card border border-primary/30 shadow-2xl flex items-center justify-center hover:scale-110 transition-transform"
            style={{ boxShadow: "0 8px 32px hsl(var(--primary) / 0.25)" }}
            aria-label="Развернуть чат с Араем"
          >
            <ArayOrb size={42} pulse={loading ? "listening" : "idle"} id="min" />
            {loading && (
              <span className="absolute top-0 right-0 w-3 h-3 rounded-full bg-primary animate-pulse" />
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* ArayBrowser попап для показа товаров/страниц + spotlight (палец-указатель) */}
      <AnimatePresence>
        {browserState && (
          <ArayBrowser
            key="browser"
            initialUrl={browserState.url}
            title={browserState.title}
            onClose={() => { setBrowserState(null); setBrowserAction(null); }}
            pendingAction={browserAction}
            isMobile={isMobile}
          />
        )}
      </AnimatePresence>

      {/* Тост — "открыл в новой вкладке" */}
      <AnimatePresence>
        {toastInfo && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[400] flex items-center gap-2 px-4 py-2.5 rounded-full bg-card border border-border shadow-lg"
            style={{ boxShadow: "0 8px 32px hsl(var(--foreground) / 0.12)" }}
          >
            <Sparkles className="w-4 h-4 text-primary shrink-0" />
            <span className="text-[13px] font-medium text-foreground">{toastInfo}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
