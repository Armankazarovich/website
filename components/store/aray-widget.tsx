"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Loader2, RotateCcw, Mic, MicOff, ShoppingCart, ExternalLink, LayoutGrid, Package, MapPin, Phone, Volume2, VolumeX, MessageSquare, ChevronDown } from "lucide-react";
import { buildArayGreeting, buildArayChips } from "@/lib/aray-agent";
import { ArayOrb } from "@/components/shared/aray-orb";
import { ArayChatPanel } from "@/components/store/aray-chat-panel";
import { useCartStore } from "@/store/cart";
import { formatPrice } from "@/lib/utils";
import { ArayBrowser, type ArayBrowserAction } from "@/components/store/aray-browser";
import { useTheme } from "next-themes";
import { getArayContext, initArayTracker } from "@/lib/aray-tracker";

// ─── Haptic / Vibration ──────────────────────────────────────────────────────
function haptic(style: "light" | "medium" | "heavy" = "light") {
  if (typeof navigator === "undefined" || !navigator.vibrate) return;
  const ms = style === "heavy" ? 30 : style === "medium" ? 15 : 8;
  try { navigator.vibrate(ms); } catch {}
}

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

// ─── Markdown рендер ─────────────────────────────────────────────────────────
function renderInline(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*\n]+\*\*|\*[^*\n]+\*|`[^`\n]+`)/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**"))
      return <strong key={i} className="font-semibold" style={{ color: "inherit" }}>{p.slice(2, -2)}</strong>;
    if (p.startsWith("*") && p.endsWith("*"))
      return <em key={i}>{p.slice(1, -1)}</em>;
    if (p.startsWith("`") && p.endsWith("`"))
      return <code key={i} className="px-1 py-0.5 rounded text-[11px] font-mono"
        style={{ background: "hsl(var(--muted))", color: "hsl(var(--primary))" }}>{p.slice(1, -1)}</code>;
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
      nodes.push(<hr key={`hr-${i}`} className="my-2" style={{ borderColor: "hsl(var(--border))" }} />);
      i++; continue;
    }

    if (/^[\-\*•]\s/.test(line.trim())) {
      const items: string[] = [];
      while (i < lines.length && /^[\-\*•]\s/.test(lines[i].trim())) {
        items.push(lines[i].replace(/^[\s]*[\-\*•]\s+/, "").trim()); i++;
      }
      nodes.push(<ul key={`ul-${i}`} className="space-y-0.5 my-1">{items.map((it, ii) => (
        <li key={ii} className="flex gap-2 items-start">
          <span className="mt-[7px] w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "hsl(var(--primary)/0.5)" }}/>
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
      const parseRow = (row: string) => {
        const inner = row.replace(/^\|/, "").replace(/\|$/, "");
        return inner.split("|").map(c => c.trim());
      };
      const headers = parseRow(tableLines[0]);
      const sepIdx = tableLines.findIndex(l => /^\|[\s\-:|]+\|$/.test(l.trim()));
      const dataRows = tableLines.slice(sepIdx >= 0 ? sepIdx + 1 : 1).map(parseRow);
      nodes.push(
        <div key={`tbl-${i}`} className="my-2 overflow-x-auto rounded-xl" style={{ border: "1px solid hsl(var(--border))" }}>
          <table className="w-full text-[11.5px]">
            <thead>
              <tr style={{ background: "hsl(var(--muted)/0.5)", borderBottom: "1px solid hsl(var(--border))" }}>
                {headers.map((h, hi) => <th key={hi} className="px-3 py-2 text-left font-semibold" style={{ color: "hsl(var(--primary))" }}>{renderInline(h)}</th>)}
              </tr>
            </thead>
            <tbody>
              {dataRows.filter(r => r.some(c => c)).map((row, ri) => (
                <tr key={ri} style={{ borderTop: "1px solid hsl(var(--border)/0.5)" }}>
                  {row.map((cell, ci) => <td key={ci} className="px-3 py-2" style={{ color: "hsl(var(--foreground)/0.85)" }}>{renderInline(cell)}</td>)}
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

interface ArayWidgetProps {
  page?: string; productName?: string; cartTotal?: number; enabled?: boolean;
  staffName?: string; userRole?: string;
}

// ─── Admin-specific chips по разделу ────────────────────────────────────────
const ADMIN_CHIPS: Record<string, string[]> = {
  "/admin": ["Сводка за сегодня", "Новые заказы", "Что срочно?"],
  "/admin/orders": ["Новые заказы", "Подтверди все новые", "Заказы за сегодня"],
  "/admin/products": ["Что не в наличии?", "Покажи все цены", "Актуальные цены"],
  "/admin/clients": ["Новые клиенты", "Постоянные покупатели", "Топ клиентов"],
  "/admin/delivery": ["Активные доставки", "Что доставляется?", "Задержки"],
  "/admin/staff": ["Кто в команде?", "Онлайн-статус", "Добавь задачу"],
  "/admin/tasks": ["Все задачи", "Срочные задачи", "Создай задачу"],
  "/admin/crm": ["Новые лиды", "Горячие клиенты", "Добавь лид"],
  "/admin/analytics": ["Выручка за месяц", "Топ товаров", "Динамика продаж"],
  "/admin/finance": ["Выручка сегодня", "Сравни с прошлой неделей", "Средний чек"],
  "/admin/settings": ["Проверь настройки", "Тест Telegram", "SMTP работает?"],
  "/admin/notifications": ["Отправь push всем", "Сколько подписчиков?", "Тест уведомления"],
};
function getAdminChips(pathname: string): string[] {
  if (ADMIN_CHIPS[pathname]) return ADMIN_CHIPS[pathname];
  const match = Object.keys(ADMIN_CHIPS)
    .filter(k => k !== "/admin" && pathname.startsWith(k))
    .sort((a, b) => b.length - a.length)[0];
  return match ? ADMIN_CHIPS[match] : ["Сводка за сегодня", "Новые заказы", "Создай задачу"];
}

// ─── Маленькая иконка-сфера для аватарки в чат-сообщениях ───────────────────
function ArayIcon({ size = 40, id = "aig" }: { size?: number; id?: string }) {
  const R = 44;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ display: "block" }}>
      <defs>
        <radialGradient id={`${id}-b`} cx="36%" cy="30%" r="65%">
          <stop offset="0%" stopColor="#ffb347"/><stop offset="30%" stopColor="#ff8c00"/>
          <stop offset="65%" stopColor="#b45309"/><stop offset="100%" stopColor="#050200"/>
        </radialGradient>
        <radialGradient id={`${id}-h`} cx="30%" cy="24%" r="30%">
          <stop offset="0%" stopColor="white" stopOpacity="0.90"/>
          <stop offset="100%" stopColor="white" stopOpacity="0"/>
        </radialGradient>
        <clipPath id={`${id}-cl`}><circle cx="50" cy="50" r={R}/></clipPath>
      </defs>
      <circle cx="50" cy="50" r={R} fill={`url(#${id}-b)`}/>
      <g clipPath={`url(#${id}-cl)`} opacity="0.4">
        <ellipse cx="50" cy="50" rx="9" ry={R} fill="none" stroke="rgba(255,200,100,0.5)" strokeWidth="0.5">
          <animateTransform attributeName="transform" type="rotate" values="0 50 50;360 50 50" dur="20s" repeatCount="indefinite"/>
        </ellipse>
        <ellipse cx="50" cy="50" rx="22" ry={R} fill="none" stroke="rgba(255,200,100,0.35)" strokeWidth="0.45">
          <animateTransform attributeName="transform" type="rotate" values="0 50 50;360 50 50" dur="20s" repeatCount="indefinite"/>
        </ellipse>
        <ellipse cx="50" cy="50" rx={R} ry="2" fill="none" stroke="rgba(255,200,100,0.4)" strokeWidth="0.45"/>
        <ellipse cx="50" cy="34" rx="32" ry="3" fill="none" stroke="rgba(255,200,100,0.25)" strokeWidth="0.35"/>
        <ellipse cx="50" cy="66" rx="32" ry="3" fill="none" stroke="rgba(255,200,100,0.25)" strokeWidth="0.35"/>
        <ellipse cx="50" cy="50" rx={R - 4} ry="10" fill="none" stroke="rgba(251,191,36,0.4)" strokeWidth="0.6" strokeDasharray="4 3">
          <animateTransform attributeName="transform" type="rotate" values="20 50 50;380 50 50" dur="8s" repeatCount="indefinite"/>
        </ellipse>
        <circle r="1.5" fill="#fde68a">
          <animateMotion dur="3s" repeatCount="indefinite" path="M14,50 A36,12 0 1,1 86,50 A36,12 0 1,1 14,50"/>
          <animate attributeName="opacity" values="0.2;0.9;0.2" dur="3s" repeatCount="indefinite"/>
        </circle>
      </g>
      <circle cx="50" cy="50" r={R} fill={`url(#${id}-h)`}/>
    </svg>
  );
}

// ─── Голосовой ввод (микрофон) ───────────────────────────────────────────────
function useMic() {
  const [active, setActive] = useState(false);
  const [supported, setSupported] = useState(false);
  const recRef = useRef<any>(null);
  const silenceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setSupported(!!(
      typeof window !== "undefined" &&
      ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
    ));
  }, []);

  const listen = useCallback((): Promise<string> => {
    return new Promise(async (resolve) => {
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SR) { resolve(""); return; }
      try { await navigator.mediaDevices.getUserMedia({ audio: true }); } catch { resolve(""); return; }
      if (recRef.current) { try { recRef.current.stop(); } catch {} }

      const r = new SR();
      r.lang = "ru-RU";
      r.maxAlternatives = 1;

      // iOS Safari не поддерживает continuous — используем single-shot с авторестартом
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      r.interimResults = !isIOS; // interim на Android/Chrome, не на iOS
      r.continuous = !isIOS; // continuous на Android/Chrome

      let resolved = false;
      let fullText = "";
      let lastResultTime = Date.now();

      const finishWithText = () => {
        if (!resolved) {
          resolved = true;
          setActive(false);
          recRef.current = null;
          if (silenceTimer.current) clearTimeout(silenceTimer.current);
          resolve(fullText.trim());
        }
      };

      // Автозавершение через 2.5с тишины после речи
      const resetSilenceTimer = () => {
        if (silenceTimer.current) clearTimeout(silenceTimer.current);
        if (fullText) {
          silenceTimer.current = setTimeout(finishWithText, 2500);
        }
      };

      r.onstart = () => { setActive(true); lastResultTime = Date.now(); };
      let restartCount = 0;
      const maxRestarts = 4; // iOS: до 4 перезапусков (~10 сек суммарно)

      r.onend = () => {
        // iOS: single-shot завершается после каждой фразы
        // Если текст есть → финишируем, если нет → рестартим до maxRestarts
        if (!resolved && isIOS && !fullText && restartCount < maxRestarts) {
          restartCount++;
          try { r.start(); return; } catch { /* fallthrough */ }
        }
        finishWithText();
      };
      r.onerror = (e: any) => {
        // "no-speech" — не ошибка, просто тишина → рестарт на iOS
        if (e.error === "no-speech" && !resolved) {
          if (isIOS && restartCount < maxRestarts) {
            restartCount++;
            try { r.start(); return; } catch { /* fallthrough */ }
          }
        }
        if (!resolved) { resolved = true; setActive(false); recRef.current = null; resolve(fullText.trim() || ""); }
      };
      r.onresult = (e: any) => {
        lastResultTime = Date.now();
        // Собираем все финальные результаты
        let interim = "";
        for (let i = 0; i < e.results.length; i++) {
          const result = e.results[i];
          if (result.isFinal) {
            const t = result[0]?.transcript?.trim() || "";
            if (t && !fullText.includes(t)) fullText = fullText ? fullText + " " + t : t;
          } else {
            interim = result[0]?.transcript?.trim() || "";
          }
        }
        // iOS single-shot: сразу один финальный результат
        if (isIOS && fullText && !r.continuous) {
          finishWithText();
          return;
        }
        resetSilenceTimer();
      };

      // Таймаут: максимум 15 сек записи
      const maxTimer = setTimeout(() => { if (!resolved) finishWithText(); }, 15000);

      try {
        r.start(); recRef.current = r;
      } catch {
        setActive(false);
        clearTimeout(maxTimer);
        if (!resolved) { resolved = true; resolve(""); }
      }
    });
  }, []);

  const cancel = useCallback(() => {
    if (recRef.current) { try { recRef.current.stop(); } catch {} recRef.current = null; }
    if (silenceTimer.current) clearTimeout(silenceTimer.current);
    setActive(false);
  }, []);

  return { active, supported, listen, cancel };
}

// ─── TTS — очистка текста для голоса ─────────────────────────────────────────
function cleanForTTS(text: string): string {
  let t = text;
  // Markdown
  t = t.replace(/\*\*(.*?)\*\*/g, "$1");
  t = t.replace(/\*(.*?)\*/g, "$1");
  t = t.replace(/#{1,6}\s*/g, "");
  t = t.replace(/[_`~|>]/g, " ");
  t = t.replace(/---+/g, ". ");
  t = t.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  // Эмодзи
  t = t.replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}\u{2700}-\u{27BF}\u{2300}-\u{23FF}\u{2B50}\u{2B06}-\u{2BAE}\u{231A}-\u{23F3}]/gu, "");
  // URL, email
  t = t.replace(/https?:\/\/\S+/g, "");
  t = t.replace(/\S+@\S+\.\S+/g, "");
  t = t.replace(/\b[A-Z]{2,}-\d{3,}\b/g, "");
  // Кавычки и скобки
  t = t.replace(/[«»""„"'']/g, "");
  t = t.replace(/\(([^)]{0,60})\)/g, ", $1, ");
  t = t.replace(/\([^)]*\)/g, "");
  // Списки
  t = t.replace(/^[\s]*[-•–—]\s+/gm, "");
  t = t.replace(/^[\s]*\d+[.)]\s+/gm, "");
  // Размеры: 100×200×50 → "100 на 200 на 50"
  t = t.replace(/(\d+)\s*[×хxXХ]\s*(\d+)(?:\s*[×хxXХ]\s*(\d+))?/g,
    (_, a, b, c) => c ? `${a} на ${b} на ${c}` : `${a} на ${b}`);
  // Пробелы внутри чисел
  t = t.replace(/(\d)\s(\d{3})(?=\s|$|[^\d])/g, "$1$2");
  t = t.replace(/(\d)\s(\d{3})(?=\s|$|[^\d])/g, "$1$2");
  // Десятичные
  t = t.replace(/(\d+),(\d+)/g, (_, whole, frac) => {
    if (frac.length === 1) return `${whole} целых ${frac} десятых`;
    if (frac.length === 2) return `${whole} целых ${frac} сотых`;
    return `${whole} точка ${frac}`;
  });
  // Составные единицы с ₽
  t = t.replace(/₽\s*\/\s*м[³3]/g, " рублей за кубометр");
  t = t.replace(/₽\s*\/\s*м[²2]/g, " рублей за квадратный метр");
  t = t.replace(/₽\s*\/\s*шт\.?/g, " рублей за штуку");
  t = t.replace(/₽\s*\/\s*п\.?\s*м\.?/g, " рублей за погонный метр");
  t = t.replace(/₽\s*\/\s*м\.?\b/g, " рублей за метр");
  t = t.replace(/руб\.?\s*\/\s*м[³3]/g, " рублей за кубометр");
  t = t.replace(/руб\.?\s*\/\s*м[²2]/g, " рублей за квадратный метр");
  // Одиночные единицы
  t = t.replace(/м[³3]/g, " кубометров ");
  t = t.replace(/м[²2]/g, " квадратных метров ");
  t = t.replace(/(\d)\s*мм\b/g, "$1 миллиметров ");
  t = t.replace(/(\d)\s*см\b/g, "$1 сантиметров ");
  t = t.replace(/(\d)\s*м\b/g, "$1 метров ");
  t = t.replace(/(\d)\s*кг\b/g, "$1 килограмм ");
  t = t.replace(/(\d)\s*г\b/g, "$1 грамм ");
  t = t.replace(/(\d)\s*л\b/g, "$1 литров ");
  t = t.replace(/(\d)\s*%/g, "$1 процентов ");
  t = t.replace(/°[CС]/g, " градусов ");
  t = t.replace(/шт\.?/g, " штук ");
  t = t.replace(/₽/g, " рублей ");
  t = t.replace(/руб\.?/g, " рублей ");
  t = t.replace(/(\d)\s*р\b\.?/g, "$1 рублей ");
  // Сокращения
  t = t.replace(/т\.\s*д\./g, "так далее");
  t = t.replace(/т\.\s*е\./g, "то есть");
  t = t.replace(/т\.\s*п\./g, "тому подобное");
  t = t.replace(/т\.\s*к\./g, "так как");
  t = t.replace(/др\./g, "другие");
  t = t.replace(/пр\./g, "прочее");
  t = t.replace(/кв\.\s*м\.?/g, "квадратных метров");
  t = t.replace(/пог\.\s*м\.?/g, "погонных метров");
  // Слэш-разделители
  t = t.replace(/рублей\s*\/\s*кубометров/g, "рублей за кубометр");
  t = t.replace(/рублей\s*\/\s*штук/g, "рублей за штуку");
  t = t.replace(/(\S+)\s*\/\s*(\S+)/g, "$1 или $2");
  // Множественные знаки препинания
  t = t.replace(/!{2,}/g, "!");
  t = t.replace(/\?{2,}/g, "?");
  t = t.replace(/\.{2,}/g, ".");
  t = t.replace(/,{2,}/g, ",");
  t = t.replace(/[;:]{2,}/g, ",");
  t = t.replace(/;/g, ",");
  // Длинное тире
  t = t.replace(/\s*[—–]\s*/g, ", ");
  // Телефоны
  t = t.replace(/\+?[\d\s()-]{10,}/g, (m) => {
    const digits = m.replace(/\D/g, "");
    if (digits.length >= 8) return digits.split("").join(" ");
    return m;
  });
  // Финальная чистка
  t = t.replace(/\s{2,}/g, " ").trim();
  t = t.replace(/,\s*,/g, ",");
  t = t.replace(/\.\s*\./g, ".");
  t = t.replace(/,\s*\./g, ".");
  t = t.replace(/^\s*[,.\s]+/, "");
  return t.slice(0, 1200);
}

// ─── TTS хук ─────────────────────────────────────────────────────────────────
function useTTS() {
  const [speaking, setSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const onDoneRef = useRef<(() => void) | null>(null);
  const lockRef = useRef(false);

  const stop = useCallback(() => {
    lockRef.current = false;
    abortRef.current?.abort(); abortRef.current = null;
    if (audioRef.current) {
      audioRef.current.pause();
      try { URL.revokeObjectURL(audioRef.current.src); } catch {}
      audioRef.current = null;
    }
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    setSpeaking(false);
  }, []);

  const speak = useCallback(async (text: string, onFinished?: () => void) => {
    if (lockRef.current) { stop(); await new Promise(r => setTimeout(r, 50)); }
    stop();
    lockRef.current = true;
    const clean = cleanForTTS(text);
    if (!clean) { lockRef.current = false; onFinished?.(); return; }
    setSpeaking(true);
    onDoneRef.current = onFinished || null;
    const abort = new AbortController();
    abortRef.current = abort;

    try {
      const res = await fetch("/api/ai/tts", {
        method: "POST", signal: abort.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: clean }),
      });
      if (res.ok) {
        const ct = res.headers.get("content-type") || "";
        if (ct.includes("audio")) {
          const blob = await res.blob();
          if (blob.size > 100 && !abort.signal.aborted) {
            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);
            audioRef.current = audio;
            await new Promise<void>(resolve => {
              audio.onended = () => { URL.revokeObjectURL(url); resolve(); };
              audio.onerror = () => { URL.revokeObjectURL(url); resolve(); };
              audio.play().catch(() => resolve());
            });
            if (!abort.signal.aborted) {
              lockRef.current = false; setSpeaking(false); audioRef.current = null;
              onDoneRef.current?.();
            }
            return;
          }
        }
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.name === "AbortError") return;
    }

    // Фоллбэк — браузерный голос
    if (!abort.signal.aborted) {
      try {
        if (typeof window !== "undefined" && window.speechSynthesis) {
          window.speechSynthesis.cancel();
          const voices = window.speechSynthesis.getVoices();
          const ruVoice = voices.find(v => v.lang.startsWith("ru"));
          if (ruVoice) {
            const utter = new SpeechSynthesisUtterance(clean);
            utter.lang = "ru-RU"; utter.voice = ruVoice; utter.rate = 1.05;
            utter.onend = () => { lockRef.current = false; setSpeaking(false); onDoneRef.current?.(); };
            utter.onerror = () => { lockRef.current = false; setSpeaking(false); onDoneRef.current?.(); };
            window.speechSynthesis.speak(utter);
            return;
          }
        }
      } catch {}
      // Нет голоса — всё равно вызываем callback чтобы цепочка диалога не прерывалась
      lockRef.current = false; setSpeaking(false);
      onDoneRef.current?.();
    }
  }, [stop]);

  return { speaking, speak, stop };
}

// ─── Пузырь сообщения (компактный, voice-first) ─────────────────────────────
function MessageBubble({
  msg, onAction, onSpeak, speaking, isDark = true,
}: {
  msg: Message;
  onAction?: (a: ArayAction) => void;
  onSpeak?: (text: string) => void;
  speaking?: boolean;
  isDark?: boolean;
}) {
  const isUser = msg.role === "user";

  return (
    <div className={`flex gap-2 ${isUser ? "flex-row-reverse" : "flex-row"} mb-3`}>
      {!isUser && (
        <div className="shrink-0 mt-0.5"><ArayIcon size={22} id={`ai-${msg.id}`} /></div>
      )}
      <div className={`flex flex-col gap-1 ${isUser ? "items-end" : "items-start"} max-w-[85%]`}>
        <div className="px-3 py-2 text-[13px] leading-relaxed" style={
          isUser
            ? { background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary)/0.75))", color: "#fff", borderRadius: "14px 14px 4px 14px" }
            : {
                background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)",
                color: isDark ? "rgba(255,255,255,0.90)" : "rgba(15,15,15,0.90)",
                borderRadius: "14px 14px 14px 4px",
                border: `1px solid ${isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.08)"}`,
              }
        }>
          {msg.content
            ? isUser
              ? msg.content.split("\n").map((line, i, arr) => (
                  <span key={i}>{line}{i < arr.length - 1 && <br />}</span>
                ))
              : <div className="space-y-0.5">{renderMarkdownContent(msg.content)}</div>
            : !isUser && msg.streaming
            ? <span className="inline-flex gap-1 items-center py-0.5">
                {[0,1,2].map(i => (
                  <span key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: "hsl(var(--primary)/0.8)", animation: `arayDot 1.4s ease-in-out ${i*150}ms infinite` }} />
                ))}
              </span>
            : null
          }
          {msg.streaming && msg.content && (
            <span className="inline-block w-0.5 h-3.5 ml-0.5 align-middle animate-pulse" style={{ background: "hsl(var(--primary))" }} />
          )}
        </div>

        {/* Action cards */}
        {!isUser && msg.actions && msg.actions.length > 0 && (
          <div className="flex flex-col gap-1.5 w-full">
            {msg.actions.map((action, i) => (
              <motion.button
                key={i}
                onClick={() => onAction?.(action)}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] font-medium text-left transition-all active:scale-[0.97]"
                style={{
                  background: isDark ? "rgba(232,112,10,0.10)" : "rgba(232,112,10,0.08)",
                  border: `1px solid ${isDark ? "rgba(232,112,10,0.25)" : "rgba(232,112,10,0.30)"}`,
                  color: isDark ? "rgba(255,255,255,0.90)" : "rgba(15,15,15,0.90)",
                }}
              >
                <span className="flex items-center justify-center w-6 h-6 rounded-lg shrink-0"
                  style={{ background: "rgba(232,112,10,0.20)" }}>
                  <ActionIcon icon={action.icon} />
                </span>
                <span className="flex-1 leading-tight">{action.label}</span>
                <span className="text-[10px] opacity-40">→</span>
              </motion.button>
            ))}
          </div>
        )}

        {/* Время + озвучить */}
        <div className="flex items-center gap-1.5 px-0.5">
          <span className="text-[10px]" style={{ color: isDark ? "rgba(255,255,255,0.30)" : "rgba(0,0,0,0.30)" }}>
            {msg.timestamp.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
          </span>
          {!isUser && onSpeak && (
            <button
              onClick={() => onSpeak(msg.content)}
              className="flex items-center justify-center w-5 h-5 rounded-full transition-all active:scale-90"
              style={{ color: speaking ? "hsl(var(--primary))" : isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.25)" }}
              title={speaking ? "Остановить" : "Озвучить"}
            >
              {speaking ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── ГЛАВНЫЙ КОМПОНЕНТ — VOICE-FIRST ─────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export function ArayWidget({ page, productName, cartTotal, enabled = true, staffName, userRole }: ArayWidgetProps) {
  const nextPathname = usePathname();
  const pathname = nextPathname || page || "/";
  const isAdmin = pathname.startsWith("/admin");
  const zone = isAdmin ? "admin" : pathname.startsWith("/cabinet") ? "cabinet" : "store";
  const { speaking, speak, stop: stopTTS } = useTTS();
  const { active: micActive, supported: micOk, listen: micListen, cancel: micCancel } = useMic();

  // ── State ──────────────────────────────────────────────────────────────────
  const [chatPanelOpen, setChatPanelOpen] = useState(false);
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [voiceMode, setVoiceMode] = useState<"text" | "voice">("voice"); // voice-first по умолчанию!
  const voiceModeRef = useRef<"text" | "voice">("voice");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasNew, setHasNew] = useState(false);
  const [proactiveBubble, setProactiveBubble] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [kbOpen, setKbOpen] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [showMessages, setShowMessages] = useState(false); // voice-first: сообщения скрыты по умолчанию
  // Встроенный браузер
  const [browserOpen, setBrowserOpen] = useState(false);
  const [browserUrl, setBrowserUrl] = useState("/");
  const [browserAction, setBrowserAction] = useState<ArayBrowserAction | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const longPressTimer = useRef<number | null>(null);
  const longPressTriggered = useRef(false);
  const cartCount = useCartStore(s => s.totalItems());
  const cartPrice = useCartStore(s => s.totalPrice());
  const chips = isAdmin ? getAdminChips(pathname) : buildArayChips({ page: pathname, productName, cartTotal });

  // ── История чата (БД) ────────────────────────────────────────────────────
  const historyLoaded = useRef(false);
  useEffect(() => {
    if (historyLoaded.current) return;
    historyLoaded.current = true;
    fetch("/api/ai/chat/history").then(r => r.json()).then(data => {
      if (data.messages?.length) {
        setMessages(data.messages.map((m: any) => ({
          id: m.id, role: m.role, content: m.content,
          timestamp: new Date(m.createdAt), streaming: false,
        })));
        // Voice-first: орб всегда первый, история доступна по кнопке
      }
    }).catch(() => {});
  }, []);

  const saveMessageToDB = useCallback((role: string, content: string) => {
    if (!content) return;
    fetch("/api/ai/chat/history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, content, context: getArayContext() }),
    }).catch(() => {});
  }, []);

  // Имя пользователя
  useEffect(() => {
    fetch("/api/ai/me").then(r => r.json()).then(d => {
      if (d.name) setUserName(d.name);
    }).catch(() => {});
  }, []);

  // Voice mode persistence
  useEffect(() => {
    const saved = localStorage.getItem("aray-voice-mode");
    if (saved === "text") { setVoiceMode("text"); voiceModeRef.current = "text"; }
    else { setVoiceMode("voice"); voiceModeRef.current = "voice"; } // voice-first default
  }, []);

  // Preload voices
  useEffect(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
    }
  }, []);

  // Mobile detect
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Keyboard-aware (iOS) — lightweight CSS-first approach
  useEffect(() => {
    if (typeof window === "undefined") return;
    const vv = window.visualViewport;
    if (vv) {
      const onResize = () => {
        const diff = window.innerHeight - vv.height;
        const isOpen = diff > 80;
        setKbOpen(isOpen);
        if (isOpen) setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 150);
      };
      vv.addEventListener("resize", onResize);
      return () => vv.removeEventListener("resize", onResize);
    }
    // Fallback
    const onFocus = (e: FocusEvent) => {
      if ((e.target as HTMLElement)?.tagName === "TEXTAREA" || (e.target as HTMLElement)?.tagName === "INPUT") {
        setTimeout(() => { setKbOpen(true); messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, 300);
      }
    };
    const onBlur = () => setTimeout(() => setKbOpen(false), 100);
    document.addEventListener("focusin", onFocus);
    document.addEventListener("focusout", onBlur);
    return () => { document.removeEventListener("focusin", onFocus); document.removeEventListener("focusout", onBlur); };
  }, []);

  // Body scroll lock при открытом чате (мобилка)
  useEffect(() => {
    if (open && isMobile) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = prev; };
    }
  }, [open, isMobile]);

  // Tracker
  useEffect(() => { initArayTracker(); }, []);

  // Показать через 1.5 сек
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 1500);
    return () => clearTimeout(t);
  }, []);

  // ── Приветствие ────────────────────────────────────────────────────────────
  const startChat = useCallback(() => {
    if (messages.length > 0) return;
    const h = new Date().getHours();
    const t = h < 6 ? "Не спишь?" : h < 12 ? "Доброе утро" : h < 17 ? "Добрый день" : h < 22 ? "Добрый вечер" : "Поздно уже";
    const name = staffName || userName;
    let greeting: string;
    if (isAdmin && name) {
      greeting = `${t}, ${name.split(" ")[0]}! Чем помочь?`;
    } else if (name) {
      greeting = `${t}, ${name}! 👋 ${productName ? `Смотришь «${productName}»?` : "Чем могу помочь?"} Спрашивай.`;
    } else {
      const isReturning = typeof document !== "undefined" && document.cookie.includes("aray_visited=1");
      greeting = buildArayGreeting({ page: pathname, productName, cartTotal, isReturning });
    }
    setMessages([{ id: "welcome", role: "assistant", content: greeting, timestamp: new Date() }]);
    if (typeof document !== "undefined") document.cookie = "aray_visited=1; max-age=2592000; path=/";
    // Голосовое приветствие в voice-режиме (короткое) → потом автослушание
    if (voiceModeRef.current === "voice") {
      const shortGreeting = name ? `${t}, ${name.split(" ")[0]}!` : t + "!";
      setTimeout(() => speak(shortGreeting, () => {
        // После приветствия автоматически слушаем юзера
        setTimeout(async () => {
          if (voiceModeRef.current !== "voice") return;
          try { const txt = await micListen(); if (txt) sendMessage(txt); } catch {}
        }, 400);
      }), 400);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, staffName, userName, page, productName, cartTotal, isAdmin]);

  // Открытие из мобильного навбара
  useEffect(() => {
    const handler = () => { setVisible(true); setOpen(true); setHasNew(false); startChat(); };
    window.addEventListener("aray:open", handler);
    return () => window.removeEventListener("aray:open", handler);
  }, [startChat]);

  // Push-to-talk из мобильного навбара
  useEffect(() => {
    const handler = () => {
      setVisible(true); setOpen(true); setHasNew(false); startChat();
      if (voiceModeRef.current !== "voice") {
        setVoiceMode("voice"); voiceModeRef.current = "voice";
        localStorage.setItem("aray-voice-mode", "voice");
      }
    };
    window.addEventListener("aray:voice", handler);
    return () => window.removeEventListener("aray:voice", handler);
  }, [startChat]);

  // Проактивный пузырь
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => {
      if (!open) {
        const msg = userName ? `${userName}, помочь? 👋`
          : productName ? `Смотришь «${productName}»? 👋` : "Если есть вопросы — я рядом 😊";
        setProactiveBubble(msg);
        setTimeout(() => setProactiveBubble(null), 5000);
      }
    }, 20000);
    return () => clearTimeout(t);
  }, [visible, open, userName, productName]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleOpen = () => { haptic("medium"); setOpen(true); setHasNew(false); setProactiveBubble(null); startChat(); };

  // ── Отправка сообщения ────────────────────────────────────────────────────
  const sendMessage = async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput("");
    // В голосовом режиме — оставляем орб, ответ виден под ним
    // В текстовом режиме — показываем сообщения
    if (voiceModeRef.current === "text") setShowMessages(true);
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: msg, timestamp: new Date() };
    const allMessages = [...messages, userMsg];
    setMessages(prev => [...prev, userMsg]);
    saveMessageToDB("user", msg);
    setLoading(true);

    const assistantId = (Date.now() + 1).toString();

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: allMessages.map(m => ({ role: m.role, content: m.content })),
          context: { ...getArayContext(), page: pathname, productName, cartTotal },
        }),
      });

      if (!res.body) throw new Error("No stream");
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
        const displayText = rawText
          .replace(/\n__ARAY_META__[\s\S]*$/, "")
          .replace(/__ARAY_ERR__[\s\S]*$/, "")
          .replace(/__ARAY_ADD_CART:.+?__/g, "")
          .replace(/__ARAY_NAVIGATE:.+?__/g, "")
          .replace(/__ARAY_POPUP:\{.+?\}__/g, "")
          .replace(/__ARAY_SHOW_URL:.+?:.+?__/g, "")
          .replace(/__ARAY_REFRESH__/g, "");
        setMessages(prev => prev.map(m =>
          m.id === assistantId ? { ...m, content: displayText } : m
        ));
      }

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

      // ── Команды из ответа API ─────────────────────────────────────────────
      // Корзина
      const cartMatches = rawText.matchAll(/__ARAY_ADD_CART:(.+?)__/g);
      for (const cm of cartMatches) {
        try {
          const { variantId, quantity, unit } = JSON.parse(cm[1]);
          if (variantId) {
            fetch(`/api/variants/${variantId}`)
              .then(r => r.ok ? r.json() : null)
              .then(variant => {
                if (variant) {
                  const cartStore = useCartStore.getState();
                  const unitType = unit === "cube" ? "CUBE" : "PIECE";
                  const price = unitType === "CUBE" && variant.pricePerCube
                    ? variant.pricePerCube
                    : variant.pricePerPiece || 0;
                  cartStore.addItem({
                    variantId: variant.id, productId: variant.productId,
                    productName: variant.productName, productSlug: variant.productSlug,
                    variantSize: variant.size, productImage: variant.image || undefined,
                    unitType, quantity: quantity || 1, price,
                  });
                }
              }).catch(() => {});
          }
        } catch {}
      }

      // Навигация
      const navMatch = rawText.match(/__ARAY_NAVIGATE:(.+?)__/);
      if (navMatch && navMatch[1].startsWith("/")) {
        setTimeout(() => { window.location.href = navMatch[1]; }, 800);
      }

      // Попап-браузер
      const popupMatches = rawText.matchAll(/__ARAY_POPUP:(\{.+?\})__/g);
      for (const pm of popupMatches) {
        try {
          const { url } = JSON.parse(pm[1]);
          if (url) { setBrowserUrl(url); setBrowserOpen(true); }
        } catch {}
      }

      // Внешний URL (legacy)
      const showUrlMatch = rawText.match(/__ARAY_SHOW_URL:(.+?):(.+?)__/);
      if (showUrlMatch && !rawText.includes("__ARAY_POPUP:")) {
        setBrowserUrl(showUrlMatch[1]); setBrowserOpen(true);
      }

      // Очищаем команды из текста
      const finalParsed = parsedText
        .replace(/__ARAY_ADD_CART:.+?__/g, "")
        .replace(/__ARAY_NAVIGATE:.+?__/g, "")
        .replace(/__ARAY_POPUP:\{.+?\}__/g, "")
        .replace(/__ARAY_SHOW_URL:.+?:.+?__/g, "")
        .replace(/__ARAY_REFRESH__/g, "")
        .trim();

      setMessages(prev => prev.map(m =>
        m.id === assistantId ? { ...m, content: finalParsed, actions, streaming: false } : m
      ));
      saveMessageToDB("assistant", finalParsed);

      // Автоозвучка → после ответа автослушание (как Алиса/Siri)
      if (voiceModeRef.current === "voice" && finalParsed) {
        speak(finalParsed, () => {
          // Небольшая пауза после речи → автоматически начинаем слушать
          setTimeout(async () => {
            if (voiceModeRef.current !== "voice") return; // юзер мог переключить на текст
            try {
              const t = await micListen();
              if (t) {
                haptic("light");
                sendMessage(t);
              }
              // Если пустой результат — не запускаем повторно, юзер нажмёт орб
            } catch {}
          }, 400);
        });
      }
      if (!open) setHasNew(true);

    } catch {
      setMessages(prev => {
        const hasPlaceholder = prev.some(m => m.id === assistantId);
        if (hasPlaceholder) {
          return prev.map(m => m.id === assistantId
            ? { ...m, content: "Нет связи. Попробуй снова 🙏", streaming: false } : m);
        }
        return [...prev, { id: assistantId, role: "assistant", content: "Нет связи. Попробуй снова 🙏", timestamp: new Date() }];
      });
    } finally {
      setLoading(false);
    }
  };

  // Голосовой ввод — ВСЕГДА автоотправка
  const startVoice = useCallback(async () => {
    haptic("medium");
    try {
      const text = await micListen();
      if (text) {
        haptic("light");
        sendMessage(text); // Всегда отправляем сразу — голос = действие
      }
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [micListen]);
  const listening = micActive;
  const stopVoice = micCancel;

  // Обработчик action-кнопок
  const handleAction = useCallback((action: ArayAction) => {
    if (action.type === "navigate" && action.url) { setBrowserUrl(action.url); setBrowserOpen(true); }
    if ((action.type === "spotlight" || action.type === "highlight") && action.spotX !== undefined) {
      setBrowserAction({ type: action.type, spotX: action.spotX, spotY: action.spotY, hint: action.hint });
      if (!browserOpen) setBrowserOpen(true);
      setTimeout(() => setBrowserAction(null), 5500);
    }
    if (action.type === "call" && action.url) window.location.href = action.url;
  }, [browserOpen]);

  if (!enabled || !visible) return null;

  // ── Тема ──────────────────────────────────────────────────────────────────
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== "light";

  // Цвета
  const txt = isDark ? "rgba(255,255,255,0.92)" : "rgba(15,15,15,0.92)";
  const txtSub = isDark ? "rgba(255,255,255,0.50)" : "rgba(15,15,15,0.50)";
  const txtMuted = isDark ? "rgba(255,255,255,0.35)" : "rgba(15,15,15,0.35)";
  const inputBg = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.04)";
  const inputBorder = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.10)";
  const dividerColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";
  const panelBg = isDark ? {
    background: "rgba(12, 12, 14, 0.88)",
    backdropFilter: "blur(32px) saturate(180%)",
    WebkitBackdropFilter: "blur(32px) saturate(180%)",
  } as React.CSSProperties : {
    background: "rgba(255, 255, 255, 0.94)",
    backdropFilter: "blur(32px) saturate(180%)",
    WebkitBackdropFilter: "blur(32px) saturate(180%)",
  } as React.CSSProperties;

  // ── Орб статус для анимации ────────────────────────────────────────────────
  const orbStatus = listening ? "listening" : speaking ? "speaking" : loading ? "listening" : "idle";

  return (
    <>
      {/* ══ Встроенный браузер Арая ══ */}
      <AnimatePresence>
        {browserOpen && (
          <ArayBrowser initialUrl={browserUrl} onClose={() => setBrowserOpen(false)}
            pendingAction={browserAction} isMobile={isMobile} />
        )}
      </AnimatePresence>

      {/* ══ КНОПКА-ОРБ (когда чат закрыт, скрыта на мобилке — там орб в доке) ══ */}
      {!open && !isMobile && (
        <div className="flex fixed z-[101] flex-col items-end gap-2.5"
          style={{ bottom: "1.5rem", right: "1rem" }}>
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

          {/* Живая сфера — push-to-talk. БЕЗ motion.button — CSS transform убивает SVG анимации */}
          <button
            onClick={() => { if (longPressTriggered.current) return; handleOpen(); }}
            onPointerDown={() => {
              longPressTriggered.current = false;
              longPressTimer.current = window.setTimeout(async () => {
                longPressTriggered.current = true;
                startChat();
                if (voiceMode !== "voice") { setVoiceMode("voice"); voiceModeRef.current = "voice"; localStorage.setItem("aray-voice-mode", "voice"); }
                try { const text = await micListen(); if (text) sendMessage(text); } catch {}
              }, 400);
            }}
            onPointerUp={() => { if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; } }}
            onPointerCancel={() => { if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; } }}
            aria-label={listening ? "Слушаю..." : "Арай — удерживай для голоса"}
            className="relative focus:outline-none w-14 h-14 rounded-full flex items-center justify-center transition-transform duration-150 hover:scale-[1.08] active:scale-[0.92]"
            style={{
              WebkitTapHighlightColor: "transparent",
              boxShadow: listening
                ? "0 4px 30px rgba(59,130,246,0.55), 0 0 60px rgba(59,130,246,0.2)"
                : speaking
                  ? "0 4px 30px rgba(52,211,153,0.45), 0 0 60px rgba(52,211,153,0.15)"
                  : "0 4px 30px rgba(255,130,0,0.4), 0 0 60px rgba(255,130,0,0.15)",
            }}>
            <ArayOrb size={56} id="float" pulse={orbStatus}
              badge={hasNew}
              badgeCount={!isAdmin && !hasNew && !speaking && !listening && cartCount > 0 ? cartCount : undefined} />
          </button>
        </div>
      )}

      {/* ══ ДЕСКТОП — VOICE-FIRST ПАНЕЛЬ ══ */}
      <AnimatePresence>
        {open && !isMobile && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-[105]"
              onClick={() => setOpen(false)}
              style={{ background: isDark ? "rgba(0,0,0,0.25)" : "rgba(0,0,0,0.12)", backdropFilter: "blur(3px)" }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.93, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93, y: 16 }}
              transition={{ type: "spring", damping: 28, stiffness: 380 }}
              className="fixed z-[110] flex flex-col overflow-hidden"
              style={{
                bottom: "6rem", right: "1.5rem",
                width: "min(400px, calc(100vw - 32px))",
                height: "min(600px, calc(100vh - 140px))",
                borderRadius: "24px",
                border: `1px solid ${isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.08)"}`,
                boxShadow: isDark
                  ? "0 24px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06)"
                  : "0 24px 80px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.06)",
                ...panelBg,
              }}>

              {/* ── Шапка: минимальная ── */}
              <div className="flex items-center justify-between px-4 pt-3 pb-2 shrink-0">
                <div className="flex items-center gap-2">
                  <ArayIcon size={24} id="hdr" />
                  <div>
                    <p className="text-[13px] font-semibold" style={{ color: txt }}>Арай</p>
                    <p className="text-[10px]" style={{ color: txtSub }}>
                      {speaking ? "Говорю..." : listening ? "Слушаю..." : loading ? "Думаю..." : "Онлайн"}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1 items-center">
                  {!isAdmin && cartCount > 0 && (
                    <div className="flex items-center gap-1 px-2 py-1 rounded-lg mr-1"
                      style={{ background: "hsl(var(--primary)/0.1)" }}>
                      <ShoppingCart className="w-3 h-3" style={{ color: "hsl(var(--primary))" }} />
                      <span className="text-[10px] font-semibold" style={{ color: "hsl(var(--primary))" }}>
                        {formatPrice(cartPrice)}
                      </span>
                    </div>
                  )}
                  <button onClick={() => { setMessages([]); fetch("/api/ai/chat/history", { method: "DELETE" }).catch(() => {}); setShowMessages(false); startChat(); }}
                    className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                    style={{ color: txtMuted }} title="Новый чат">
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setOpen(false)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                    style={{ color: txtMuted }}>
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* ── Основная зона: орб по центру или сообщения ── */}
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Орб-зона — voice-first центральный элемент */}
                {!showMessages && (
                  <div className="flex flex-col items-center justify-center gap-4 py-6 px-4 animate-in fade-in zoom-in-95 duration-300">
                    {/* Орб — БЕЗ motion.div! CSS transform убивает SVG анимации на мобилке */}
                    <div
                      className="relative cursor-pointer transition-transform duration-150 active:scale-[0.92]"
                      onClick={listening ? stopVoice : startVoice}
                    >
                      {/* Ambient glow */}
                      <div className="absolute inset-[-20px] rounded-full pointer-events-none transition-all duration-700" style={{
                        background: listening
                          ? "radial-gradient(circle, rgba(59,130,246,0.25) 0%, transparent 70%)"
                          : speaking
                            ? "radial-gradient(circle, rgba(52,211,153,0.20) 0%, transparent 70%)"
                            : "radial-gradient(circle, rgba(255,140,0,0.15) 0%, transparent 70%)",
                      }} />
                      <ArayOrb size={100} id="center" pulse={orbStatus} />
                    </div>

                    {/* Статус */}
                    <p className="text-[13px] font-medium" style={{
                      color: listening ? "#60a5fa" : speaking ? "#34d399" : txt,
                    }}>
                      {listening ? "Слушаю..." : speaking ? "Арай говорит..." : "Нажми на орб — говори"}
                    </p>

                    {/* Waveform при говорении */}
                    {(speaking || listening) && (
                      <div className="flex gap-1 items-center h-6">
                        {[0,1,2,3,4,5,6].map(i => (
                          <motion.span key={i} className="w-1 rounded-full"
                            style={{ background: listening ? "#60a5fa" : "#34d399" }}
                            animate={{ height: [4, 12 + Math.random() * 8, 4] }}
                            transition={{ duration: 0.6 + Math.random() * 0.4, repeat: Infinity, delay: i * 0.08 }}
                          />
                        ))}
                      </div>
                    )}

                    {speaking && (
                      <button onClick={stopTTS} className="text-[11px] px-3 py-1 rounded-full transition-all"
                        style={{ color: txtSub, background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)" }}>
                        Остановить
                      </button>
                    )}

                    {/* Последний ответ — компактно */}
                    {messages.length > 0 && !speaking && !listening && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="max-w-full px-4 py-3 rounded-2xl text-[13px] leading-relaxed text-center"
                        style={{
                          background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.03)",
                          color: isDark ? "rgba(255,255,255,0.80)" : "rgba(15,15,15,0.80)",
                          maxHeight: "120px", overflow: "hidden",
                        }}>
                        <div className="line-clamp-4">
                          {messages[messages.length - 1]?.role === "assistant"
                            ? renderMarkdownContent(messages[messages.length - 1].content).slice(0, 3)
                            : null}
                        </div>
                      </motion.div>
                    )}

                    {/* Кнопка "Показать историю" */}
                    {messages.length > 1 && (
                      <button onClick={() => setShowMessages(true)}
                        className="flex items-center gap-1 text-[11px] px-3 py-1.5 rounded-full transition-all"
                        style={{ color: "hsl(var(--primary))", background: "hsl(var(--primary)/0.08)", border: "1px solid hsl(var(--primary)/0.15)" }}>
                        <MessageSquare className="w-3 h-3" />
                        Показать переписку ({messages.length - 1})
                      </button>
                    )}

                    {/* Быстрые чипы */}
                    {chips.length > 0 && messages.length <= 1 && (
                      <div className="flex gap-2 flex-wrap justify-center mt-1">
                        {chips.map(q => (
                          <button key={q} onClick={() => { haptic("light"); sendMessage(q); }}
                            className="text-[11px] px-3 py-1.5 rounded-full transition-all active:scale-95"
                            style={{ background: "hsl(var(--primary)/0.08)", border: "1px solid hsl(var(--primary)/0.18)", color: "hsl(var(--primary))" }}>
                            {q}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Сообщения (текстовый режим или по кнопке) */}
                {showMessages && (
                  <div className="flex-1 overflow-y-auto px-4 py-3 overscroll-contain">
                    {/* Кнопка "Свернуть к орбу" */}
                    <div className="flex justify-center mb-3">
                      <button onClick={() => setShowMessages(false)}
                        className="flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full transition-all"
                        style={{ color: txtSub, background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)" }}>
                        <ChevronDown className="w-3 h-3 rotate-180" /> Свернуть к орбу
                      </button>
                    </div>
                    {messages.map(m => (
                      <MessageBubble key={m.id} msg={m} onAction={handleAction} onSpeak={speak} speaking={speaking} isDark={isDark} />
                    ))}
                    {loading && (
                      <div className="flex gap-2 mb-3">
                        <ArayIcon size={22} id="aig-load" />
                        <div className="px-3 py-2.5 rounded-2xl rounded-tl-[4px]"
                          style={{ background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.03)", border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"}` }}>
                          <div className="flex gap-1.5 items-center h-4">
                            {[0,1,2].map(i => (
                              <span key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: "hsl(var(--primary))", animation: `arayDot 1.4s ease-in-out ${i*0.2}s infinite` }} />
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* ── Инпут — нижняя панель ── */}
              <div className="px-4 py-3 shrink-0" style={{ borderTop: `1px solid ${dividerColor}` }}>
                <div className="flex gap-2 items-end">
                  <button onClick={listening ? stopVoice : startVoice}
                    className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 relative transition-all"
                    style={{
                      background: listening ? "linear-gradient(135deg,#ef4444,#b91c1c)" : inputBg,
                      border: `1px solid ${listening ? "transparent" : inputBorder}`,
                      boxShadow: listening ? "0 0 12px rgba(239,68,68,0.4)" : "none",
                    }}>
                    {listening && <span className="absolute inset-0 rounded-full animate-ping"
                      style={{ background: "rgba(239,68,68,0.3)", animationDuration: "1s" }} />}
                    {listening ? <MicOff className="w-4 h-4 text-white relative z-10" /> : <Mic className="w-4 h-4 relative z-10" style={{ color: txtSub }} />}
                  </button>
                  <textarea
                    ref={inputRef} value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                    onFocus={() => { if (!showMessages) setShowMessages(true); }}
                    rows={1} placeholder={listening ? "Слушаю..." : "Написать Араю..."}
                    className="flex-1 resize-none text-[16px] lg:text-[13px] rounded-2xl px-3.5 py-2 focus:outline-none transition-all"
                    style={{ background: inputBg, border: `1px solid ${listening ? "rgba(239,68,68,0.4)" : inputBorder}`, color: txt, maxHeight: "80px" }}
                  />
                  <button onClick={() => { haptic("light"); sendMessage(); }} disabled={loading || !input.trim()}
                    className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all disabled:opacity-40"
                    style={{
                      background: input.trim() ? "linear-gradient(135deg, hsl(var(--primary)), #f59e0b)" : "hsl(var(--muted))",
                      boxShadow: input.trim() ? "0 4px 12px hsl(var(--primary)/0.3)" : "none",
                    }}>
                    {loading
                      ? <Loader2 className="w-4 h-4 animate-spin" style={{ color: "hsl(var(--muted-foreground))" }} />
                      : <Send className="w-4 h-4" style={{ color: input.trim() ? "#fff" : "hsl(var(--muted-foreground))" }} />}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ══ МОБИЛЬНЫЙ FULLSCREEN — VOICE-FIRST ══ */}
      <AnimatePresence>
        {open && isMobile && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 z-[105]"
              style={{ background: isDark ? "rgba(0,0,0,0.55)" : "rgba(0,0,0,0.35)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 32, stiffness: 340, mass: 0.9 }}
              className="fixed left-0 right-0 z-[110] flex flex-col overflow-hidden transition-[height,bottom] duration-150"
              style={{
                bottom: 0,
                height: kbOpen ? "100dvh" : "94dvh",
                borderRadius: kbOpen ? "0" : "24px 24px 0 0",
                border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"}`,
                borderBottom: "none",
                boxShadow: "0 -8px 48px rgba(0,0,0,0.3)",
                ...panelBg,
              }}>

              {/* Ручка */}
              <div className="flex justify-center pt-2 pb-1 shrink-0" onClick={() => setOpen(false)}>
                <div className="w-10 h-[3px] rounded-full" style={{ background: isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.12)" }} />
              </div>

              {/* Шапка */}
              <div className="flex items-center justify-between px-4 py-2 shrink-0">
                <div className="flex items-center gap-2">
                  <ArayIcon size={24} id="mhdr" />
                  <div>
                    <p className="text-[13px] font-semibold" style={{ color: txt }}>Арай</p>
                    <p className="text-[10px]" style={{ color: txtSub }}>
                      {speaking ? "Говорю..." : listening ? "Слушаю..." : loading ? "Думаю..." : "Онлайн"}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1 items-center">
                  {!isAdmin && cartCount > 0 && (
                    <div className="flex items-center gap-1 px-2 py-1 rounded-lg mr-1"
                      style={{ background: "hsl(var(--primary)/0.1)" }}>
                      <ShoppingCart className="w-3 h-3" style={{ color: "hsl(var(--primary))" }} />
                      <span className="text-[10px] font-semibold" style={{ color: "hsl(var(--primary))" }}>{formatPrice(cartPrice)}</span>
                    </div>
                  )}
                  <button onClick={() => { setMessages([]); fetch("/api/ai/chat/history", { method: "DELETE" }).catch(() => {}); setShowMessages(false); startChat(); }}
                    className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ color: txtMuted }}>
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setOpen(false)} aria-label="Закрыть чат" className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ color: txtMuted }}>
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* ── Основная зона ── */}
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Орб-зона — voice-first */}
                {!showMessages && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center justify-center gap-5 py-8 px-4 flex-1">

                    {/* Большой орб — БЕЗ motion.div! CSS transform убивает SVG анимации на мобилке */}
                    <div
                      className="relative cursor-pointer transition-transform duration-150 active:scale-[0.92]"
                      onClick={() => { haptic("medium"); listening ? stopVoice() : startVoice(); }}
                    >
                      <div className="absolute inset-[-28px] rounded-full pointer-events-none transition-all duration-700" style={{
                        background: listening
                          ? "radial-gradient(circle, rgba(59,130,246,0.30) 0%, transparent 70%)"
                          : speaking
                            ? "radial-gradient(circle, rgba(52,211,153,0.25) 0%, transparent 70%)"
                            : "radial-gradient(circle, rgba(255,140,0,0.18) 0%, transparent 70%)",
                      }} />
                      <ArayOrb size={120} id="mcenter" pulse={orbStatus} />
                    </div>

                    {/* Статус */}
                    <p className="text-[15px] font-medium" style={{
                      color: listening ? "#60a5fa" : speaking ? "#34d399" : txt,
                    }}>
                      {listening ? "Слушаю..." : speaking ? "Арай говорит..." : "Нажми — говори"}
                    </p>

                    {/* Waveform */}
                    {(speaking || listening) && (
                      <div className="flex gap-1 items-center h-8">
                        {[0,1,2,3,4,5,6,7,8].map(i => (
                          <motion.span key={i} className="w-1 rounded-full"
                            style={{ background: listening ? "#60a5fa" : "#34d399" }}
                            animate={{ height: [4, 14 + Math.random() * 10, 4] }}
                            transition={{ duration: 0.5 + Math.random() * 0.4, repeat: Infinity, delay: i * 0.06 }}
                          />
                        ))}
                      </div>
                    )}

                    {speaking && (
                      <button onClick={stopTTS} className="text-[12px] px-4 py-1.5 rounded-full"
                        style={{ color: txtSub, background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)" }}>
                        Остановить
                      </button>
                    )}

                    {/* Последний ответ — компактно */}
                    {messages.length > 0 && !speaking && !listening && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="max-w-full px-4 py-3 rounded-2xl text-[13px] leading-relaxed text-center"
                        style={{
                          background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.03)",
                          color: isDark ? "rgba(255,255,255,0.80)" : "rgba(15,15,15,0.80)",
                          maxHeight: "140px", overflow: "hidden",
                        }}>
                        <div className="line-clamp-5">
                          {messages[messages.length - 1]?.role === "assistant"
                            ? renderMarkdownContent(messages[messages.length - 1].content).slice(0, 4)
                            : null}
                        </div>
                      </motion.div>
                    )}

                    {/* Кнопка переписки */}
                    {messages.length > 1 && (
                      <button onClick={() => setShowMessages(true)}
                        className="flex items-center gap-1 text-[11px] px-3 py-1.5 rounded-full"
                        style={{ color: "hsl(var(--primary))", background: "hsl(var(--primary)/0.08)", border: "1px solid hsl(var(--primary)/0.15)" }}>
                        <MessageSquare className="w-3 h-3" />
                        Переписка ({messages.length - 1})
                      </button>
                    )}

                    {/* Чипы */}
                    {chips.length > 0 && messages.length <= 1 && (
                      <div className="flex gap-2 flex-wrap justify-center mt-2">
                        {chips.map(q => (
                          <button key={q} onClick={() => { haptic("light"); sendMessage(q); }}
                            className="text-[12px] px-3.5 py-2 rounded-full transition-all active:scale-95"
                            style={{ background: "hsl(var(--primary)/0.08)", border: "1px solid hsl(var(--primary)/0.18)", color: "hsl(var(--primary))" }}>
                            {q}
                          </button>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Сообщения */}
                {showMessages && (
                  <div className="flex-1 overflow-y-auto px-4 py-3 overscroll-contain">
                    <div className="flex justify-center mb-3">
                      <button onClick={() => setShowMessages(false)}
                        className="flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full"
                        style={{ color: txtSub, background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)" }}>
                        <ChevronDown className="w-3 h-3 rotate-180" /> Свернуть к орбу
                      </button>
                    </div>
                    {messages.map(m => (
                      <MessageBubble key={m.id} msg={m} onAction={handleAction} onSpeak={speak} speaking={speaking} isDark={isDark} />
                    ))}
                    {loading && (
                      <div className="flex gap-2 mb-3">
                        <ArayIcon size={22} id="ml" />
                        <div className="px-3 py-2.5 rounded-2xl rounded-tl-[4px]"
                          style={{ background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.03)", border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"}` }}>
                          <div className="flex gap-1.5 items-center h-4">
                            {[0,1,2].map(i => (
                              <span key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: "hsl(var(--primary))", animation: `arayDot 1.4s ease-in-out ${i*0.2}s infinite` }} />
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* ── Мобильный инпут ── */}
              <div className="px-4 py-3 shrink-0" style={{
                borderTop: `1px solid ${dividerColor}`,
                paddingBottom: kbOpen ? "8px" : "max(16px, env(safe-area-inset-bottom, 16px))",
              }}>
                {/* Голосовой режим — большая кнопка */}
                {voiceMode === "voice" && !input.trim() && !showMessages ? (
                  <div className="flex items-center justify-center gap-3">
                    <button onClick={() => { setVoiceMode("text"); voiceModeRef.current = "text"; localStorage.setItem("aray-voice-mode", "text"); setShowMessages(true); }}
                      className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{ background: inputBg, border: `1px solid ${inputBorder}` }}>
                      <MessageSquare className="w-4 h-4" style={{ color: txtSub }} />
                    </button>
                    <button
                      onClick={() => { haptic("heavy"); listening ? stopVoice() : startVoice(); }}
                      className="w-16 h-16 rounded-full flex items-center justify-center relative transition-all active:scale-90"
                      style={{
                        background: listening
                          ? "linear-gradient(135deg,#ef4444,#b91c1c)"
                          : "linear-gradient(135deg, hsl(var(--primary)), #f59e0b)",
                        boxShadow: listening
                          ? "0 0 24px rgba(239,68,68,0.5)"
                          : "0 4px 20px hsl(var(--primary)/0.3)",
                      }}>
                      {listening && <span className="absolute inset-0 rounded-full animate-ping"
                        style={{ background: "rgba(239,68,68,0.25)", animationDuration: "1.2s" }} />}
                      {listening
                        ? <MicOff className="w-6 h-6 text-white relative z-10" />
                        : <Mic className="w-6 h-6 text-white relative z-10" />}
                    </button>
                    <div className="w-10" /> {/* spacer для центрирования */}
                  </div>
                ) : (
                  <div className="flex gap-2 items-end">
                    <button onClick={listening ? stopVoice : startVoice}
                      className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 relative"
                      style={{
                        background: listening ? "linear-gradient(135deg,#ef4444,#b91c1c)" : inputBg,
                        border: `1px solid ${listening ? "transparent" : inputBorder}`,
                        boxShadow: listening ? "0 0 12px rgba(239,68,68,0.4)" : "none",
                      }}>
                      {listening && <span className="absolute inset-0 rounded-full animate-ping"
                        style={{ background: "rgba(239,68,68,0.3)", animationDuration: "1s" }} />}
                      {listening ? <MicOff className="w-4 h-4 text-white relative z-10" /> : <Mic className="w-4 h-4 relative z-10" style={{ color: txtSub }} />}
                    </button>
                    <textarea
                      ref={inputRef} value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                      onFocus={() => { setShowMessages(true); setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 300); }}
                      rows={1} placeholder={listening ? "Слушаю..." : "Написать Араю..."}
                      className="flex-1 resize-none text-[16px] rounded-2xl px-3.5 py-2.5 focus:outline-none"
                      style={{ background: inputBg, border: `1px solid ${listening ? "rgba(239,68,68,0.4)" : inputBorder}`, color: txt, maxHeight: "100px" }}
                    />
                    <button onClick={() => { haptic("light"); sendMessage(); }} disabled={loading || !input.trim()}
                      className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 disabled:opacity-40"
                      style={{
                        background: input.trim() ? "linear-gradient(135deg, hsl(var(--primary)), #f59e0b)" : "hsl(var(--muted))",
                        boxShadow: input.trim() ? "0 4px 12px hsl(var(--primary)/0.3)" : "none",
                      }}>
                      {loading
                        ? <Loader2 className="w-4 h-4 animate-spin" style={{ color: "hsl(var(--muted-foreground))" }} />
                        : <Send className="w-4 h-4" style={{ color: input.trim() ? "#fff" : "hsl(var(--muted-foreground))" }} />}
                    </button>
                  </div>
                )}
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
        @keyframes arayWave {
          0% { height: 4px; }
          100% { height: 16px; }
        }
      `}</style>
    </>
  );
}
