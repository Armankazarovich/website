"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import { X, Send, Loader2, RotateCcw, Mic, MicOff, ShoppingCart, ExternalLink, LayoutGrid, Package, MapPin, Phone, Volume2, VolumeX } from "lucide-react";
import { buildArayGreeting, buildArayChips } from "@/lib/aray-agent";
import { useCartStore } from "@/store/cart";
import { formatPrice } from "@/lib/utils";
import { ArayBrowser, type ArayBrowserAction } from "@/components/store/aray-browser";
import { useTheme } from "next-themes";
import { getArayContext, initArayTracker } from "@/lib/aray-tracker";

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
interface ArayWidgetProps {
  page?: string; productName?: string; cartTotal?: number; enabled?: boolean;
  staffName?: string; userRole?: string; // admin mode props
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

// ─── Живой SVG-шар — без фона снаружи, анимация внутри ───────────────────────

function ArayIcon({ size = 40, glow = false, id = "aig" }: { size?: number; glow?: boolean; id?: string }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 100 100"
      style={{ display: "block", overflow: "visible" }}
    >
      <defs>
        {/* Оранжевый ореол */}
        <filter id={`${id}-glow`} x="-40%" y="-40%" width="180%" height="180%">
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
        <radialGradient id={`${id}-base`} cx="38%" cy="32%" r="70%">
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
        <radialGradient id={`${id}-hot`} cx="50%" cy="22%" r="48%">
          <stop offset="0%" stopColor="#fde68a" stopOpacity="0.75">
            <animate attributeName="stopOpacity"
              values="0.75;1;0.5;0.75" dur="3s" repeatCount="indefinite" />
          </stop>
          <stop offset="100%" stopColor="#fde68a" stopOpacity="0" />
        </radialGradient>

        {/* Зеркальный блик */}
        <radialGradient id={`${id}-hl`} cx="30%" cy="24%" r="40%">
          <stop offset="0%" stopColor="white" stopOpacity="0.88" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </radialGradient>

        {/* Клип для анимации внутри шара */}
        <clipPath id={`${id}-clip`}>
          <circle cx="50" cy="50" r="46" />
        </clipPath>
      </defs>

      {/* Базовая сфера */}
      <circle cx="50" cy="50" r="46" fill={`url(#${id}-base)`}
        filter={glow ? `url(#${id}-glow)` : undefined} />

      {/* Вращающиеся внутренние огни — clipped */}
      <g clipPath={`url(#${id}-clip)`}>
        <ellipse cx="50" cy="28" rx="36" ry="22" fill={`url(#${id}-hot)`}>
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
      <circle cx="50" cy="50" r="46" fill={`url(#${id}-hl)`} />
    </svg>
  );
}

// ─── Голосовой ввод ───────────────────────────────────────────────────────────

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
    return new Promise(async (resolve) => {
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SR) { resolve(""); return; }

      // Запрос разрешения на микрофон
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch {
        resolve(""); return;
      }

      if (recRef.current) { try { recRef.current.stop(); } catch {} }

      const r = new SR();
      r.lang = "ru-RU";
      r.interimResults = false;
      r.continuous = false;
      r.maxAlternatives = 1;
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

// ─── Голос Арая — Streaming ElevenLabs (Leonid, Flash) → Browser ────────────
const ELEVEN_VOICE_ID = "UIaC9QMb6UP5hfzy6uOD"; // Leonid — тёплый, естественный русский
const ELEVEN_MODEL_ID = "eleven_flash_v2_5";       // Flash — быстрый, мультиязычный
const ELEVEN_KEY = "sk_012bb7d94cc7ef02a9e11422d9dc6a4a56c7ace7a9ff5eb1";
const ELEVEN_SPEED = 1.05; // чуть медленнее — стабильнее произношение

function cleanForTTS(text: string): string {
  let t = text;

  // ── 1. Markdown и форматирование ──────────────────────────────────────────
  t = t.replace(/\*\*(.*?)\*\*/g, "$1");
  t = t.replace(/\*(.*?)\*/g, "$1");
  t = t.replace(/#{1,6}\s*/g, "");              // заголовки
  t = t.replace(/[_`~|>]/g, " ");
  t = t.replace(/---+/g, ". ");
  t = t.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

  // ── 2. Эмодзи ────────────────────────────────────────────────────────────
  t = t.replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}\u{2700}-\u{27BF}\u{2300}-\u{23FF}\u{2B50}\u{2B06}-\u{2BAE}\u{231A}-\u{23F3}]/gu, "");

  // ── 3. URL, email, артикулы ───────────────────────────────────────────────
  t = t.replace(/https?:\/\/\S+/g, "");
  t = t.replace(/\S+@\S+\.\S+/g, "");
  t = t.replace(/\b[A-Z]{2,}-\d{3,}\b/g, "");

  // ── 4. Кавычки и скобки ───────────────────────────────────────────────────
  t = t.replace(/[«»""„"'']/g, "");
  t = t.replace(/\(([^)]{0,60})\)/g, ", $1, "); // (текст) → пауза
  t = t.replace(/\([^)]*\)/g, "");              // длинные скобки — убрать

  // ── 5. Списки — убираем маркеры ───────────────────────────────────────────
  t = t.replace(/^[\s]*[-•–—]\s+/gm, "");
  t = t.replace(/^[\s]*\d+[.)]\s+/gm, "");

  // ── 6. Размеры: 100×200×50 → "100 на 200 на 50" ──────────────────────────
  t = t.replace(/(\d+)\s*[×хxXХ]\s*(\d+)(?:\s*[×хxXХ]\s*(\d+))?/g,
    (_, a, b, c) => c ? `${a} на ${b} на ${c}` : `${a} на ${b}`);

  // ── 7. Пробелы внутри чисел: "15 000" → "15000" (ДО замены единиц!) ──────
  t = t.replace(/(\d)\s(\d{3})(?=\s|$|[^\d])/g, "$1$2");
  t = t.replace(/(\d)\s(\d{3})(?=\s|$|[^\d])/g, "$1$2");

  // ── 8. Десятичные: "2,5" → "2 целых 5 десятых", "0,5" → "ноль целых 5" ──
  t = t.replace(/(\d+),(\d+)/g, (_, whole, frac) => {
    if (frac.length === 1) return `${whole} целых ${frac} десятых`;
    if (frac.length === 2) return `${whole} целых ${frac} сотых`;
    return `${whole} точка ${frac}`;
  });

  // ── 9. Единицы ₽, м³ и т.д. → полные слова ────────────────────────────────
  // Сначала составные единицы
  t = t.replace(/₽\s*\/\s*м[³3]/g, " рублей за кубометр");
  t = t.replace(/₽\s*\/\s*м[²2]/g, " рублей за квадратный метр");
  t = t.replace(/₽\s*\/\s*шт\.?/g, " рублей за штуку");
  t = t.replace(/₽\s*\/\s*п\.?\s*м\.?/g, " рублей за погонный метр");
  t = t.replace(/₽\s*\/\s*м\.?\b/g, " рублей за метр");
  t = t.replace(/руб\.?\s*\/\s*м[³3]/g, " рублей за кубометр");
  t = t.replace(/руб\.?\s*\/\s*м[²2]/g, " рублей за квадратный метр");

  // Потом одиночные единицы
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

  // ── 10. Сокращения → полные слова ─────────────────────────────────────────
  t = t.replace(/т\.\s*д\./g, "так далее");
  t = t.replace(/т\.\s*е\./g, "то есть");
  t = t.replace(/т\.\s*п\./g, "тому подобное");
  t = t.replace(/т\.\s*к\./g, "так как");
  t = t.replace(/др\./g, "другие");
  t = t.replace(/пр\./g, "прочее");
  t = t.replace(/кв\.\s*м\.?/g, "квадратных метров");
  t = t.replace(/пог\.\s*м\.?/g, "погонных метров");

  // ── 11. Слэш-разделители ─────────────────────────────────────────────────
  // "рублей за ..." уже обработано выше, остальные слэши
  t = t.replace(/рублей\s*\/\s*кубометров/g, "рублей за кубометр");
  t = t.replace(/рублей\s*\/\s*штук/g, "рублей за штуку");
  t = t.replace(/(\S+)\s*\/\s*(\S+)/g, "$1 или $2");

  // ── 12. Множественные знаки препинания ────────────────────────────────────
  t = t.replace(/!{2,}/g, "!");
  t = t.replace(/\?{2,}/g, "?");
  t = t.replace(/\.{2,}/g, ".");
  t = t.replace(/,{2,}/g, ",");
  t = t.replace(/[;:]{2,}/g, ",");
  // Убираем точку-запятую — запятая достаточно для паузы
  t = t.replace(/;/g, ",");

  // ── 13. Длинное тире → запятая ────────────────────────────────────────────
  t = t.replace(/\s*[—–]\s*/g, ", ");

  // ── 14. Телефоны (8+ цифр) → по цифрам с паузами ─────────────────────────
  t = t.replace(/\+?[\d\s()-]{10,}/g, (m) => {
    const digits = m.replace(/\D/g, "");
    if (digits.length >= 8) return digits.split("").join(" ");
    return m;
  });

  // ── 15. Финальная чистка ──────────────────────────────────────────────────
  t = t.replace(/\s{2,}/g, " ").trim();
  // Убираем висящие запятые и точки: ", ," ".. " ", ."
  t = t.replace(/,\s*,/g, ",");
  t = t.replace(/\.\s*\./g, ".");
  t = t.replace(/,\s*\./g, ".");
  t = t.replace(/^\s*[,.\s]+/, "");

  // Ограничение: макс 1200 символов
  return t.slice(0, 1200);
}

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
    if (!clean) { lockRef.current = false; return; }
    setSpeaking(true);
    onDoneRef.current = onFinished || null;

    const apiKey = process.env.NEXT_PUBLIC_ELEVENLABS_KEY || ELEVEN_KEY;
    const abort = new AbortController();
    abortRef.current = abort;

    try {
      const res = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${ELEVEN_VOICE_ID}/stream?output_format=mp3_22050_32`,
        {
          method: "POST", signal: abort.signal,
          headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
          body: JSON.stringify({
            text: clean, model_id: ELEVEN_MODEL_ID,
            voice_settings: { stability: 0.82, similarity_boost: 0.72, style: 0.0, use_speaker_boost: true, speed: ELEVEN_SPEED },
          }),
        }
      );
      if (res.ok) {
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
            utter.lang = "ru-RU"; utter.voice = ruVoice; utter.rate = 1.0;
            utter.onend = () => { lockRef.current = false; setSpeaking(false); onDoneRef.current?.(); };
            utter.onerror = () => { lockRef.current = false; setSpeaking(false); };
            window.speechSynthesis.speak(utter);
            return;
          }
        }
      } catch {}
      lockRef.current = false; setSpeaking(false);
    }
  }, [stop]);

  return { speaking, speak, stop };
}

// ─── Пузырь сообщения ─────────────────────────────────────────────────────────

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
  const isSpeaking = speaking;

  return (
    <div className={`flex gap-2.5 ${isUser ? "flex-row-reverse" : "flex-row"} mb-3.5`}>
      {!isUser && (
        <div className="shrink-0 mt-0.5"><ArayIcon size={24} id="aig1" /></div>
      )}
      <div className={`flex flex-col gap-1.5 ${isUser ? "items-end" : "items-start"} max-w-[85%]`}>
        <div className="px-3.5 py-2.5 text-sm leading-relaxed" style={
          isUser
            ? { background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary)/0.75))", color: "#fff", borderRadius: "16px 16px 4px 16px" }
            : {
                background: isDark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.04)",
                color: isDark ? "rgba(255,255,255,0.90)" : "rgba(15,15,15,0.90)",
                borderRadius: "16px 16px 16px 4px",
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
          <span className="text-[10px]" style={{ color: isDark ? "rgba(255,255,255,0.38)" : "rgba(0,0,0,0.35)" }}>
            {msg.timestamp.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
          </span>
          {/* Кнопка голоса — только для сообщений Арая */}
          {!isUser && onSpeak && (
            <button
              onClick={() => { if (isSpeaking) { /* stop handled by parent */ } onSpeak(msg.content); }}
              className="flex items-center justify-center w-5 h-5 rounded-full transition-all active:scale-90"
              style={{ color: isSpeaking ? "hsl(var(--primary))" : isDark ? "rgba(255,255,255,0.28)" : "rgba(0,0,0,0.30)" }}
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

export function ArayWidget({ page, productName, cartTotal, enabled = true, staffName, userRole }: ArayWidgetProps) {
  const nextPathname = usePathname();
  const pathname = nextPathname || page || "/";
  const isAdmin = pathname.startsWith("/admin");
  const zone = isAdmin ? "admin" : pathname.startsWith("/cabinet") ? "cabinet" : "store";
  const { speaking, speak, stop: stopTTS } = useTTS();
  const { active: micActive, supported: micOk, listen: micListen, cancel: micCancel } = useMic();
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [voiceMode, setVoiceMode] = useState<"text" | "voice">("text");
  const voiceModeRef = useRef<"text" | "voice">("text");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasNew, setHasNew] = useState(false);
  const [proactiveBubble, setProactiveBubble] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [kbHeight, setKbHeight] = useState(0); // высота клавиатуры для мобильного чата
  const [userName, setUserName] = useState<string | null>(null);
  // Встроенный браузер Арая
  const [browserOpen, setBrowserOpen] = useState(false);
  const [browserUrl, setBrowserUrl] = useState("/");
  const [browserAction, setBrowserAction] = useState<ArayBrowserAction | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const longPressTimer = useRef<number | null>(null);
  const longPressTriggered = useRef(false);
  const dragControls = useDragControls();
  const cartCount = useCartStore(s => s.totalItems());
  const cartPrice = useCartStore(s => s.totalPrice());
  const chips = isAdmin ? getAdminChips(pathname) : buildArayChips({ page, productName, cartTotal });

  // ── Единая история чата (БД) ─────────────────────────────────────────────
  const historyLoaded = useRef(false);

  // Загрузить историю из БД при первом рендере
  useEffect(() => {
    if (historyLoaded.current) return;
    historyLoaded.current = true;
    fetch("/api/ai/chat/history").then(r => r.json()).then(data => {
      if (data.messages?.length) {
        setMessages(data.messages.map((m: any) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          timestamp: new Date(m.createdAt),
          streaming: false,
        })));
      }
    }).catch(() => {});
  }, []);

  // Сохранить сообщение в БД (вызывается после каждого нового)
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

  // Voice mode + мобильный?
  useEffect(() => {
    const saved = localStorage.getItem("aray-voice-mode");
    if (saved === "voice") { setVoiceMode("voice"); voiceModeRef.current = "voice"; }
  }, []);

  // Preload voices (нужно для Safari/Chrome — голоса грузятся асинхронно)
  useEffect(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
    }
  }, []);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Keyboard-aware: отслеживаем высоту клавиатуры через visualViewport
  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) return;
    const vv = window.visualViewport;
    const onResize = () => {
      const diff = window.innerHeight - vv.height;
      setKbHeight(diff > 50 ? diff : 0); // >50px = клавиатура открыта
    };
    vv.addEventListener("resize", onResize);
    return () => vv.removeEventListener("resize", onResize);
  }, []);

  // Инициализировать трекер
  useEffect(() => { initArayTracker(); }, []);

  // Показать через 1.5 сек
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 1500);
    return () => clearTimeout(t);
  }, []);

  // Клавиатура убрана — используем CSS dvh + safe-area

  const startChat = useCallback(() => {
    if (messages.length > 0) return; // уже есть (или восстановлены из БД)
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
      greeting = buildArayGreeting({ page, productName, cartTotal, isReturning });
    }
    setMessages([{ id: "welcome", role: "assistant", content: greeting, timestamp: new Date() }]);
    if (typeof document !== "undefined") document.cookie = "aray_visited=1; max-age=2592000; path=/";
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, staffName, userName, page, productName, cartTotal, isAdmin]);

  // Открытие из мобильного навбара
  useEffect(() => {
    const handler = () => { setVisible(true); setOpen(true); setHasNew(false); startChat(); };
    window.addEventListener("aray:open", handler);
    return () => window.removeEventListener("aray:open", handler);
  }, [startChat]);

  // Push-to-talk из мобильного навбара (long-press на шар)
  useEffect(() => {
    const handler = () => {
      // Открываем чат и включаем голосовой режим, сам чат обработает ввод
      setVisible(true); setOpen(true); setHasNew(false);
      startChat();
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
    saveMessageToDB("user", msg); // сохраняем в БД
    setLoading(true);

    const assistantId = (Date.now() + 1).toString();

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: allMessages.map(m => ({ role: m.role, content: m.content })),
          context: { page, productName, cartTotal, ...getArayContext() },
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

      // ── Выполнение ARAY команд из ответа API ──────────────────────────
      // Добавление в корзину: __ARAY_ADD_CART:{"variantId":"...","quantity":1,"unit":"piece"}__
      const cartMatches = rawText.matchAll(/__ARAY_ADD_CART:(.+?)__/g);
      for (const cm of cartMatches) {
        try {
          const { variantId, quantity, unit } = JSON.parse(cm[1]);
          if (variantId) {
            // Загружаем данные варианта и добавляем в корзину
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
                    variantId: variant.id,
                    productId: variant.productId,
                    productName: variant.productName,
                    productSlug: variant.productSlug,
                    variantSize: variant.size,
                    productImage: variant.image || undefined,
                    unitType,
                    quantity: quantity || 1,
                    price,
                  });
                }
              })
              .catch(() => {});
          }
        } catch {}
      }

      // Навигация: __ARAY_NAVIGATE:/catalog/brus__
      const navMatch = rawText.match(/__ARAY_NAVIGATE:(.+?)__/);
      if (navMatch) {
        const navPath = navMatch[1];
        if (navPath.startsWith("/")) {
          setTimeout(() => { window.location.href = navPath; }, 800);
        }
      }

      // Попап-браузер: __ARAY_POPUP:{"url":"/catalog/doski","title":"Доски"}__
      const popupMatches = rawText.matchAll(/__ARAY_POPUP:(\{.+?\})__/g);
      for (const pm of popupMatches) {
        try {
          const { url, title } = JSON.parse(pm[1]);
          if (url) { setBrowserUrl(url); setBrowserOpen(true); }
        } catch {}
      }

      // Показать внешний URL (legacy): __ARAY_SHOW_URL:https://...:Title__
      const showUrlMatch = rawText.match(/__ARAY_SHOW_URL:(.+?):(.+?)__/);
      if (showUrlMatch && !rawText.includes("__ARAY_POPUP:")) {
        setBrowserUrl(showUrlMatch[1]);
        setBrowserOpen(true);
      }

      // Очищаем служебные команды из отображаемого текста
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
      saveMessageToDB("assistant", finalParsed); // сохраняем ответ в БД

      // Автоозвучка в голосовом режиме → после ответа автослушание (как Алиса)
      if (voiceModeRef.current === "voice" && finalParsed) {
        speak(finalParsed, () => {
          setTimeout(async () => {
            try { const t = await micListen(); if (t) sendMessage(t); } catch {}
          }, 300);
        });
      }

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

  // Голосовой ввод (Promise-based, как в админке)
  const startVoice = useCallback(async () => {
    try {
      const text = await micListen();
      if (text) {
        if (voiceModeRef.current === "voice") {
          sendMessage(text);
        } else {
          setInput(prev => prev ? prev + " " + text : text);
          inputRef.current?.focus();
        }
      }
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [micListen]);
  const listening = micActive;
  const stopVoice = micCancel;

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

  // ── Тема ──────────────────────────────────────────────────────────────────
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== "light";

  // ── Общие стили панели — адаптивные под тему ──────────────────────────────
  const panelBg = isDark ? {
    background: "rgba(12, 12, 14, 0.80)",
    backdropFilter: "blur(28px) saturate(180%) brightness(0.88)",
    WebkitBackdropFilter: "blur(28px) saturate(180%) brightness(0.88)",
    border: "1px solid rgba(255, 255, 255, 0.12)",
    boxShadow: "0 24px 64px rgba(0,0,0,0.45), 0 1px 0 rgba(255,255,255,0.08) inset",
  } as React.CSSProperties : {
    background: "rgba(255, 255, 255, 0.92)",
    backdropFilter: "blur(28px) saturate(180%)",
    WebkitBackdropFilter: "blur(28px) saturate(180%)",
    border: "1px solid rgba(0, 0, 0, 0.10)",
    boxShadow: "0 24px 64px rgba(0,0,0,0.12), 0 1px 0 rgba(255,255,255,0.5) inset",
  } as React.CSSProperties;

  // Цвета текста для темы
  const txt = isDark ? "rgba(255,255,255,0.90)" : "rgba(15,15,15,0.90)";
  const txtSub = isDark ? "rgba(255,255,255,0.45)" : "rgba(15,15,15,0.50)";
  const txtMuted = isDark ? "rgba(255,255,255,0.38)" : "rgba(15,15,15,0.40)";
  const inputBg = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.04)";
  const inputBorder = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.10)";
  const dividerColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";
  const bubbleBg = isDark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.04)";
  const bubbleBorder = isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.08)";

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

      {/* ══ КНОПКА — плавающая сфера (скрыта в админке на мобилке — там шар встроен в док) ══ */}
      {!open && !isMobile && (
        <div className="flex fixed z-[101] flex-col items-end gap-2.5"
          style={{ bottom: isMobile ? "calc(68px + env(safe-area-inset-bottom, 0px))" : "1.5rem", right: "1rem" }}>
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

          {/* Живая сфера — пульс, свечение, push-to-talk */}
          <motion.button
            onClick={() => {
              if (longPressTriggered.current) return;
              handleOpen();
            }}
            onPointerDown={() => {
              longPressTriggered.current = false;
              longPressTimer.current = window.setTimeout(async () => {
                longPressTriggered.current = true;
                // Push-to-talk: слушаем БЕЗ открытия чата (как Алиса)
                startChat(); // на всякий случай инициализируем
                if (voiceMode !== "voice") { setVoiceMode("voice"); voiceModeRef.current = "voice"; localStorage.setItem("aray-voice-mode", "voice"); }
                try {
                  const text = await micListen();
                  if (text) sendMessage(text);
                } catch {}
              }, 400);
            }}
            onPointerUp={() => { if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; } }}
            onPointerCancel={() => { if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; } }}
            whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
            transition={{ type: "spring", stiffness: 400, damping: 18 }}
            aria-label={listening ? "Слушаю..." : "Арай — удерживай для голоса"}
            className="relative focus:outline-none w-14 h-14 rounded-full flex items-center justify-center"
            style={{
              WebkitTapHighlightColor: "transparent",
              boxShadow: listening
                ? "0 4px 30px rgba(59,130,246,0.55), 0 0 60px rgba(59,130,246,0.2)"
                : speaking
                  ? "0 4px 30px rgba(52,211,153,0.45), 0 0 60px rgba(52,211,153,0.15)"
                  : "0 4px 30px rgba(255,130,0,0.4), 0 0 60px rgba(255,130,0,0.15)",
            }}>

            {/* Пуль�