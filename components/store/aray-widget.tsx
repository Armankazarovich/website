"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import type { Dispatch, SetStateAction } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import { Send, Loader2, RotateCcw, Mic, MicOff, ShoppingCart, ExternalLink, LayoutGrid, Package, MapPin, Phone, Volume2, VolumeX, MessageSquare, ChevronDown, ChevronLeft, ShieldCheck, CheckCircle2, XCircle, Paperclip, FileText, Image as ImageIcon, Trash2, FileAudio, Film, FileArchive, Settings2, Target, Bot, Megaphone, BarChart3 } from "lucide-react";
import { buildArayGreeting, buildArayChips } from "@/lib/aray-client-ui";
import { ArayIcon, ArayOrb } from "@/components/shared/aray-orb";
import { useCartStore } from "@/store/cart";
import { formatPrice } from "@/lib/utils";
import { ArayBrowser, type ArayBrowserAction } from "@/components/store/aray-browser";
import { useTheme } from "next-themes";
import { getArayContext, initArayTracker } from "@/lib/aray-tracker";
import { playAraySpeech, speakAraySpeechBrowser, stopAraySpeech } from "@/lib/aray-audio";
import { prepareAraySpeechText } from "@/lib/aray-speech";
import {
  createAraySyncSource,
  notifyArayHistoryUpdated,
  notifyArayStop,
  subscribeArayHistoryUpdated,
  subscribeArayStop,
} from "@/lib/aray-sync";
import { useAdminOverlayGuard } from "@/lib/use-admin-overlay-guard";
import type { AdminArayNavigationContext, AdminArayPageLink } from "@/components/admin/admin-aray-navigation";

const ARAY_WIDGET_SOURCE = createAraySyncSource("aray-widget");
const ARAY_MAX_SMART_CHIPS = 6;

// ─── Haptic / Vibration ──────────────────────────────────────────────────────
function haptic(style: "light" | "medium" | "heavy" = "light") {
  if (typeof navigator === "undefined" || !navigator.vibrate) return;
  const ms = style === "heavy" ? 30 : style === "medium" ? 15 : 8;
  try { navigator.vibrate(ms); } catch {}
}

// ─── Типы ─────────────────────────────────────────────────────────────────────

export type ArayAction = {
  type: "navigate" | "spotlight" | "highlight" | "call" | "prompt";
  url?: string;
  label: string;
  prompt?: string;
  icon?: string;
  hint?: string;
  spotX?: number;
  spotY?: number;
};

export type ArayConfirmationDraft = {
  requiresConfirmation: true;
  blockedExecution?: boolean;
  tool: string;
  draft: Record<string, unknown>;
  message?: string;
};

type ArayAttachment = {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  kind: "image" | "text" | "audio" | "video" | "archive" | "file";
  text?: string;
  dataUrl?: string;
  note?: string;
};

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  attachments?: ArayAttachment[];
  actions?: ArayAction[];
  confirmations?: ArayConfirmationDraft[];
  streaming?: boolean;
};

type ArayPromptPayload = {
  text: string;
  displayText?: string;
  localReply?: string;
  context?: string;
  actions?: ArayAction[];
  openUrl?: string;
  openTitle?: string;
};

type SendMessageOptions = Omit<ArayPromptPayload, "text">;

function createStreamingMessageUpdater(
  setMessages: Dispatch<SetStateAction<Message[]>>,
  messageId: string,
) {
  let frameId: number | null = null;
  let latestContent = "";

  const commit = () => {
    frameId = null;
    const content = latestContent;
    setMessages((prev) =>
      prev.map((message) =>
        message.id === messageId ? { ...message, content } : message,
      ),
    );
  };

  return {
    update(content: string) {
      latestContent = content;
      if (typeof window === "undefined") {
        commit();
        return;
      }
      if (frameId === null) {
        frameId = window.requestAnimationFrame(commit);
      }
    },
    flush(content?: string) {
      if (typeof content === "string") latestContent = content;
      if (frameId !== null && typeof window !== "undefined") {
        window.cancelAnimationFrame(frameId);
      }
      commit();
    },
  };
}

type ArayPendingPromptWindow = Window & {
  __arayPendingPrompt?: ArayPromptPayload;
  __arayPendingOpen?: "open" | "voice";
};

function buildPromotionPromptPayload(command: string): ArayPromptPayload | null {
  const normalized = command.trim().toLowerCase();
  if (!normalized) return null;
  if (normalized.includes("метрик") || normalized.includes("цели")) {
    const goals = normalized.includes("цел");
    return {
      text: goals ? "цели метрики" : "метрика",
      displayText: goals ? "цели метрики" : "метрика",
      localReply: goals
        ? "Давай спокойно: цели открываем через счетчик, иначе Яндекс часто дает 403. Открыл вкладку со списком счетчиков. Выбери счетчик сайта, а если OAuth Метрики подключен, я сам создам нужные цели и сохраню ID."
        : "Давай спокойно: сначала найдем счетчик Метрики для сайта. Открыл вкладку со списком счетчиков. Если OAuth подключен, я сам подтяну счетчик, создам цели и сохраню готовность.",
      context: [
        "Раздел: продвижение. Отвечай коротко, один шаг за раз.",
        "Формат: сделай это. Потом: сделал, проверь.",
        "Для Метрики нужны: счетчик, цели заказа/заявки, микроцели телефон/мессенджер/корзина/checkout.",
        "Не открывай прямую ссылку /goals без выбранного счетчика: Яндекс часто показывает 403. Сначала веди в список счетчиков или создай цели через API ARAY.",
        "Если кабинет Яндекса не открывается внутри окна, скажи коротко: открыл вкладку.",
      ].join("\n"),
      openUrl: "https://metrika.yandex.ru/list",
      actions: [
        { type: "navigate", url: "/admin/site?tab=analytics", label: "Настройки сайта", icon: "settings" },
      ],
    };
  }
  if (normalized.includes("seo") || normalized.includes("сео") || normalized.includes("индекса")) {
    return {
      text: "seo",
      displayText: "seo",
      localReply: "Сделал первый шаг: открой sitemap и проверь, что он отдает список страниц. Потом пойдем в robots, Яндекс Вебмастер и Google Search Console без длинной справки.",
      context: [
        "Раздел: продвижение. Проверь SEO и индексацию коротко.",
        "Формат: сделай это. Потом: сделал, проверь.",
        "Нужны шаги: sitemap, robots, Яндекс Вебмастер, Google Search Console.",
        "Не обещай мгновенную индексацию.",
      ].join("\n"),
      actions: [
        { type: "navigate", url: "/sitemap.xml", label: "Открыть sitemap", icon: "external" },
        { type: "navigate", url: "https://webmaster.yandex.ru/sites/", label: "Яндекс Вебмастер", icon: "external" },
        { type: "navigate", url: "https://search.google.com/search-console", label: "Google Search Console", icon: "external" },
      ],
    };
  }
  if (normalized.includes("direct") || normalized.includes("директ")) {
    return {
      text: "direct",
      displayText: "direct",
      localReply: "Открыл мастер Direct. Проверь черновик: группы, объявления, ключи и минус-слова. Бюджет ARAY не включает без подтверждения владельца.",
      context: [
        "Раздел: продвижение. Помоги с Direct коротко.",
        "Формат: сделай это. Потом: сделал, проверь.",
        "Не включай бюджет и показы без подтверждения владельца.",
      ].join("\n"),
      actions: [
        { type: "navigate", url: "/admin/promotion", label: "Мастер Direct", icon: "target" },
        { type: "navigate", url: "https://direct.yandex.ru/dna/grid/campaigns", label: "Кабинет Direct", icon: "external" },
      ],
    };
  }
  if (normalized.includes("организа")) {
    return {
      text: "организация",
      displayText: "организация",
      localReply: "Начнем с организации: открой Яндекс Бизнес и проверь, есть ли профиль этой компании. Если найдем правильный профиль, я сохраню ID и буду использовать контакты в рекламе.",
      context: [
        "Раздел: продвижение. Помоги подключить организацию Яндекс Бизнес коротко.",
        "Формат: сделай это. Потом: сделал, проверь.",
        "Если API-доступа к организациям нет, веди через официальный кабинет и попроси ID/подтверждение.",
      ].join("\n"),
      actions: [
        { type: "navigate", url: "https://business.yandex.ru/", label: "Яндекс Бизнес", icon: "external" },
        { type: "navigate", url: "/admin/site?tab=company", label: "Компания", icon: "settings" },
      ],
    };
  }
  if (normalized.includes("спрос") || normalized.includes("wordstat") || normalized.includes("вордстат")) {
    return {
      text: "спрос",
      displayText: "спрос",
      localReply: "Открыл маршрут по спросу. Сначала смотрим Wordstat: частотность, регионы и сезонность. Если подключим API, я буду сам подтягивать это в аналитику.",
      context: [
        "Раздел: продвижение. Помоги оценить спрос коротко.",
        "Формат: сделай это. Потом: сделал, проверь.",
        "Wordstat/API нужен для частотности, регионов и сезонности. Если API не подключен, веди через официальный Wordstat/Direct.",
      ].join("\n"),
      actions: [
        { type: "navigate", url: "https://wordstat.yandex.ru/", label: "Wordstat", icon: "external" },
        { type: "navigate", url: "/admin/analytics", label: "Аналитика", icon: "target" },
      ],
    };
  }
  return null;
}

function sanitizeArayUrl(url: string): string {
  const target = url.trim();
  if (!target) return "";

  try {
    const parsed = new URL(
      target,
      typeof window !== "undefined" ? window.location.origin : "https://pilo-rus.ru",
    );
    const path = parsed.pathname.replace(/\/+$/, "");
    const isBareMetrikaGoals =
      parsed.hostname === "metrika.yandex.ru" &&
      path === "/goals" &&
      !parsed.searchParams.has("counter_id") &&
      !parsed.searchParams.has("id");

    if (isBareMetrikaGoals) return "https://metrika.yandex.ru/list";
  } catch {}

  return target;
}

function sanitizeArayAction(action: ArayAction): ArayAction {
  if (!action.url) return action;
  const safeUrl = sanitizeArayUrl(action.url);
  if (safeUrl === action.url) return action;

  const looksLikeMetrikaGoals = action.url.includes("metrika.yandex.ru/goals");
  return {
    ...action,
    url: safeUrl,
    label: looksLikeMetrikaGoals ? "Найти счетчик" : action.label,
    hint: looksLikeMetrikaGoals
      ? "Сначала выберите счетчик. После этого откроются цели без 403."
      : action.hint,
  };
}

function mergeArayActions(...groups: Array<ArayAction[] | undefined>): ArayAction[] {
  const seen = new Set<string>();
  const merged: ArayAction[] = [];
  for (const group of groups) {
    for (const action of group ?? []) {
      const safeAction = sanitizeArayAction(action);
      const key = `${safeAction.type}:${safeAction.url || ""}:${safeAction.prompt || ""}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(safeAction);
    }
  }
  return merged.slice(0, 6);
}

function normalizeAraySelfReferences(text: string): string {
  return text
    .replaceAll("ARAY сам создаст нужные цели и сохранит ID", "я сам создам нужные цели и сохраню ID")
    .replaceAll("ARAY сам подтянет счетчик, создаст цели и сохранит готовность", "я сам подтяну счетчик, создам цели и сохраню готовность")
    .replaceAll("ARAY сможет сохранить ID и использовать контакты", "я сохраню ID и буду использовать контакты")
    .replaceAll("ARAY будет подтягивать это в аналитику сам", "я буду сам подтягивать это в аналитику")
    .replaceAll("Арай сам", "я сам")
    .replaceAll("ARAY сам", "я сам");
}

function mapServerHistoryMessages(messages: any[]): Message[] {
  return messages.map((m: any) => {
    const role = m.role === "user" ? "user" : "assistant";
    const content = String(m.content || "");
    return {
      id: String(m.id || `${m.role}-${m.createdAt || Date.now()}`),
      role,
      content: role === "assistant" ? normalizeAraySelfReferences(content) : content,
      timestamp: new Date(m.createdAt || Date.now()),
      streaming: false,
    };
  });
}

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

function parseConfirmations(raw: string): { text: string; confirmations: ArayConfirmationDraft[] } {
  const marker = "__ARAY_CONFIRM__";
  const idx = raw.indexOf(marker);
  if (idx === -1) return { text: raw, confirmations: [] };

  const before = raw.slice(0, idx);
  const rest = raw.slice(idx + marker.length);
  const nextMarker = rest.search(/\n__ARAY_META__|__ARAY_ERR__|__ARAY_ADD_CART:|__ARAY_NAVIGATE:|__ARAY_POPUP:|__ARAY_SHOW_URL:|__ARAY_REFRESH__/);
  const jsonText = (nextMarker >= 0 ? rest.slice(0, nextMarker) : rest).trim();
  const after = nextMarker >= 0 ? rest.slice(nextMarker) : "";

  try {
    const parsed = JSON.parse(jsonText);
    const confirmations = Array.isArray(parsed)
      ? parsed.filter((item): item is ArayConfirmationDraft =>
          item &&
          item.requiresConfirmation === true &&
          typeof item.tool === "string" &&
          item.draft &&
          typeof item.draft === "object"
        )
      : [];
    return { text: `${before}${after}`, confirmations };
  } catch {
    return { text: before.trim(), confirmations: [] };
  }
}

function stripArayControlText(raw: string) {
  return raw
    .replace(/\n__ARAY_CONFIRM__[\s\S]*?(?=\n__ARAY_META__|$)/g, "")
    .replace(/\n__ARAY_META__[\s\S]*$/, "")
    .replace(/__ARAY_ERR__[\s\S]*$/, "")
    .replace(/__ARAY_ADD_CART:.+?__/g, "")
    .replace(/__ARAY_NAVIGATE:.+?__/g, "")
    .replace(/__ARAY_POPUP:\{.+?\}__/g, "")
    .replace(/__ARAY_SHOW_URL:.+?__/g, "")
    .replace(/__ARAY_REFRESH__/g, "");
}

function toInternalAppPath(url: string): string | null {
  const value = url.trim();
  if (!value) return null;
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  if (typeof window === "undefined") return null;

  try {
    const parsed = new URL(value, window.location.origin);
    if (parsed.origin !== window.location.origin) return null;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}

function parseShowUrlPayload(raw: string): { url: string; title?: string } | null {
  const match = raw.match(/__ARAY_SHOW_URL:([\s\S]+?)__/);
  if (!match) return null;

  const value = match[1].trim();
  if (!value) return null;
  const protocolIdx = value.indexOf("://");
  const separatorIdx = value.indexOf(":", protocolIdx >= 0 ? protocolIdx + 3 : 0);
  if (separatorIdx < 0) return { url: value };

  return {
    url: value.slice(0, separatorIdx).trim(),
    title: value.slice(separatorIdx + 1).trim() || undefined,
  };
}

function cleanupArayControlText(raw: string) {
  return raw
    .replace(/\n__ARAY_CONFIRM__[\s\S]*$/, "")
    .replace(/__ARAY_ADD_CART:.+?__/g, "")
    .replace(/__ARAY_NAVIGATE:.+?__/g, "")
    .replace(/__ARAY_POPUP:\{.+?\}__/g, "")
    .replace(/__ARAY_SHOW_URL:.+?__/g, "")
    .replace(/__ARAY_REFRESH__/g, "")
    .trim();
}

function formatAttachmentSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function getAttachmentKind(file: File): ArayAttachment["kind"] {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("audio/")) return "audio";
  if (file.type.startsWith("video/")) return "video";
  if (
    file.type.startsWith("text/") ||
    file.type.includes("json") ||
    file.name.toLowerCase().match(/\.(txt|md|csv|json|log)$/)
  ) return "text";
  if (file.name.toLowerCase().match(/\.(zip|rar|7z|tar|gz)$/)) return "archive";
  return "file";
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function prepareImageAttachment(file: File): Promise<string> {
  const sourceUrl = await readFileAsDataUrl(file);
  if (typeof window === "undefined") return sourceUrl;

  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      const maxSide = 1280;
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(sourceUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.84));
    };
    img.onerror = () => resolve(sourceUrl);
    img.src = sourceUrl;
  });
}

async function prepareArayAttachment(file: File): Promise<ArayAttachment> {
  const kind = getAttachmentKind(file);
  const base = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: file.name,
    mimeType: file.type || "application/octet-stream",
    size: file.size,
    kind,
  };

  if (kind === "image") {
    if (file.type === "image/gif" && file.size <= 8 * 1024 * 1024) {
      return { ...base, dataUrl: await readFileAsDataUrl(file), note: "gif-original" };
    }
    if (file.size > 8 * 1024 * 1024) {
      return { ...base, dataUrl: await prepareImageAttachment(file), note: "image-compressed" };
    }
    return { ...base, dataUrl: await prepareImageAttachment(file) };
  }

  if (kind === "text") {
    const text = (await readFileAsText(file)).slice(0, 12000);
    return {
      ...base,
      text,
      note: text.length >= 12000 ? "text-truncated-12000" : undefined,
    };
  }

  if (kind === "audio") {
    return {
      ...base,
      note: "audio-uploaded-transcription-pending",
    };
  }

  if (kind === "video") {
    return {
      ...base,
      note: "video-uploaded-analysis-pending",
    };
  }

  if (kind === "archive") {
    return {
      ...base,
      note: "archive-uploaded-extraction-pending",
    };
  }

  return {
    ...base,
    note: file.name.toLowerCase().endsWith(".pdf")
      ? "pdf-text-extraction-not-enabled-yet"
      : "file-preview-not-enabled-yet",
  };
}

function AttachmentKindIcon({ kind, className }: { kind: ArayAttachment["kind"]; className?: string }) {
  if (kind === "image") return <ImageIcon className={className} />;
  if (kind === "audio") return <FileAudio className={className} />;
  if (kind === "video") return <Film className={className} />;
  if (kind === "archive") return <FileArchive className={className} />;
  return <FileText className={className} />;
}

function getAttachmentActionHint(file: ArayAttachment) {
  if (file.kind === "image") {
    return "Можно разобрать фото, скрин, QR/штрих-код, бумажный список или подготовить товарную карточку.";
  }
  if (file.kind === "audio") return "Аудио принято. Расшифровка и анализ записи идут через мой голосовой контур.";
  if (file.kind === "video") return "Видео принято. Я смогу использовать его для разборов, рекламы и сценариев.";
  if (file.kind === "archive") return "Архив принят. Авто-распаковка будет подключена отдельным безопасным обработчиком.";
  if (file.kind === "text") return "Текст прочитан и передан мне.";
  if (file.note === "pdf-text-extraction-not-enabled-yet") return "PDF принят. Для точного чтения можно прислать фото страницы или текст.";
  return "Файл принят. Если нужно, я подскажу следующий безопасный способ обработки.";
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
    case "settings": return <Settings2 className={cls} />;
    case "target": return <Target className={cls} />;
    case "check": return <CheckCircle2 className={cls} />;
    case "voice": return <Mic className={cls} />;
    case "direct": return <Megaphone className={cls} />;
    case "analytics": return <BarChart3 className={cls} />;
    case "prompt": return <Bot className={cls} />;
    default:        return <ExternalLink className={cls} />;
  }
}

interface ArayWidgetProps {
  page?: string; productName?: string; cartTotal?: number; enabled?: boolean;
  staffName?: string; userRole?: string;
  adminNavigation?: AdminArayNavigationContext;
}

// ─── Admin-specific chips по разделу ────────────────────────────────────────
const ADMIN_CHIPS: Record<string, string[]> = {
  "/admin": ["Открыть заказы", "Открыть каталог", "Открыть аналитику"],
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
  return match ? ADMIN_CHIPS[match] : [];
}

const INSTANT_ADMIN_NAV_RULES: Array<{ href: string; keywords: string[] }> = [
  { href: "/admin/tasks", keywords: ["задач", "дела", "план команды"] },
  { href: "/admin/site", keywords: ["настройки сайта", "сайт", "витрин", "контент сайта", "страниц"] },
  { href: "/admin/orders/new", keywords: ["терминал", "касс", "новый заказ", "оформить заказ"] },
  { href: "/admin/orders", keywords: ["заказ"] },
  { href: "/admin/clients", keywords: ["клиент", "покупател"] },
  { href: "/admin/crm", keywords: ["crm", "црм", "лид", "сделк"] },
  { href: "/admin/delivery", keywords: ["достав", "маршрут", "курьер"] },
  { href: "/admin/products", keywords: ["товар", "каталог", "прайс", "цен"] },
  { href: "/admin/categories", keywords: ["категори"] },
  { href: "/admin/inventory", keywords: ["склад", "остат"] },
  { href: "/admin/analytics", keywords: ["аналит", "отчет", "статист"] },
  { href: "/admin/finance", keywords: ["финанс", "деньг", "выручк"] },
  { href: "/admin/aray/costs", keywords: ["бюджет", "лимит", "расходы ai", "токен"] },
  { href: "/admin/aray/agents", keywords: ["агент", "качество"] },
  { href: "/admin/aray", keywords: ["aray", "арай", "голос", "микрофон"] },
  { href: "/admin/reviews", keywords: ["отзыв", "рейтинг"] },
  { href: "/admin/notifications", keywords: ["уведом", "push", "пуш"] },
  { href: "/admin/email", keywords: ["рассыл", "email", "почт"] },
  { href: "/admin/settings", keywords: ["настройк", "система"] },
];

const ADMIN_NAV_ALIASES: Record<string, string[]> = {
  "/admin": ["главная", "дашборд", "рабочий стол", "панель"],
  "/admin/orders/new": ["терминал", "касса", "оформление", "новый заказ", "создать заказ"],
  "/admin/orders": ["заказы", "продажи", "клиентские заказы"],
  "/admin/delivery": ["доставка", "курьеры", "маршруты"],
  "/admin/delivery/rates": ["тарифы доставки", "цены доставки", "зоны доставки"],
  "/admin/clients": ["клиенты", "покупатели", "база клиентов"],
  "/admin/crm": ["crm", "црм", "лиды", "сделки", "воронка"],
  "/admin/crm/automation": ["автоматизация crm", "роботы crm", "автоворонка"],
  "/admin/workflows": ["сценарии", "сценарии продаж", "воронки продаж"],
  "/admin/tasks": ["задачи", "дела", "поручения", "план команды"],
  "/admin/products": ["каталог", "товары", "прайс", "номенклатура"],
  "/admin/products/new": ["новый товар", "добавить товар", "создать товар"],
  "/admin/products/audit": ["аудит каталога", "проверка каталога", "ошибки каталога"],
  "/admin/products/import-prices": ["импорт цен", "загрузить прайс", "обновить цены"],
  "/admin/categories": ["категории", "разделы каталога"],
  "/admin/inventory": ["склад", "остатки", "наличие"],
  "/admin/media": ["медиа", "фото", "изображения", "картинки"],
  "/admin/images/fix": ["ремонт изображений", "починить фото", "ошибки фото"],
  "/admin/watermark": ["водяной знак", "защита фото"],
  "/admin/watermark/recovery": ["восстановление водяного знака", "вернуть водяной знак"],
  "/admin/import": ["импорт", "экспорт", "загрузка данных"],
  "/admin/business/settings": ["настройки бизнеса", "роли бизнеса", "профиль бизнеса", "компания"],
  "/admin/site": ["сайт", "настройки сайта", "контакты", "seo", "метрика", "аналитика сайта"],
  "/admin/appearance": ["оформление", "дизайн", "тема", "цвета"],
  "/admin/promotion": ["продвижение", "реклама", "директ", "direct", "seo", "метрика"],
  "/admin/promotions": ["акции", "скидки", "промо"],
  "/admin/reviews": ["отзывы", "рейтинг", "репутация"],
  "/admin/email": ["рассылки", "email", "почта", "письма"],
  "/admin/notifications": ["уведомления", "push", "пуш", "пуши"],
  "/admin/analytics": ["аналитика", "статистика", "посещения", "конверсии", "отчеты"],
  "/admin/posts": ["статьи", "новости", "блог", "контент"],
  "/admin/services": ["услуги", "сервисы"],
  "/admin/finance": ["финансы", "деньги", "выручка", "расходы", "прибыль", "окупаемость"],
  "/admin/settings": ["настройки", "система", "общие настройки"],
  "/admin/terminals": ["настройки терминала", "терминалы"],
  "/admin/terminals/training": ["обучение терминала", "тренировка терминала"],
  "/admin/staff": ["команда", "сотрудники", "персонал", "права"],
  "/admin/health": ["здоровье системы", "статус системы", "проверка системы"],
  "/admin/help": ["помощь", "база знаний", "инструкция", "документация"],
  "/admin/aray": ["aray", "арай", "голос", "помощник"],
  "/admin/aray/agents": ["агенты", "агенты aray", "качество aray"],
  "/admin/aray/connectors": ["подключения", "интеграции", "oauth", "яндекс oauth", "google oauth", "ключи", "сервисы"],
  "/admin/aray/costs": ["лимиты aray", "расходы aray", "бюджет aray", "токены"],
  "/admin/aray/modules": ["модули", "модули aray", "центр модулей", "паспорта модулей"],
  "/admin/aray-lab": ["aray lab", "лаборатория aray", "лаборатория"],
};

function normalizeArayNavText(value: string): string {
  return value
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^a-zа-я0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const ADMIN_MUTATION_INTENT_RE =
  /(?:^|\s)(создай|создать|добавь|добавить|поручи|поручить|назначь|назначить|поставь|поставить|напомни|напомнить|измени|изменить|обнови|обновить|перенеси|перенести|закрой|закрыть|удали|удалить|отправь|отправить|запусти|запустить|сделай|сделать|create|add|assign|update|delete|send|run)(?=\s|$)/;

function hasAdminMutationIntent(text: string): boolean {
  return ADMIN_MUTATION_INTENT_RE.test(text);
}

function getAdminPageSearchTerms(page: AdminArayPageLink): string[] {
  const pathTerms = page.href
    .split(/[/?#=&]+/)
    .map((part) => part.replace(/-/g, " "))
    .filter((part) => part && !["admin", "cabinet", "api"].includes(part));

  return [
    page.label,
    page.groupLabel,
    ...(ADMIN_NAV_ALIASES[page.href] ?? []),
    ...pathTerms,
  ]
    .map(normalizeArayNavText)
    .filter((term, index, list) => term.length > 2 && list.indexOf(term) === index);
}

function getAdminPageMatchScore(text: string, page: AdminArayPageLink): number {
  let best = 0;
  for (const term of getAdminPageSearchTerms(page)) {
    const words = term.split(" ").filter(Boolean);
    if (text === term) best = Math.max(best, 120 + term.length);
    else if (text.includes(term)) best = Math.max(best, 90 + term.length);
    else if (words.length > 1 && words.every((word) => text.includes(word))) best = Math.max(best, 65 + term.length);
  }
  return best;
}

function findInstantAdminNavigationTarget(
  raw: string,
  navigation?: AdminArayNavigationContext,
): AdminArayPageLink | null {
  const text = normalizeArayNavText(raw);
  if (!text) return null;
  if (hasAdminMutationIntent(text)) return null;

  const pages = navigation?.availablePages ?? [];
  const hasIntent = /\b(арай|покажи|открой|открыть|перейди|перейти|зайди|зайти|выведи|перекинь|show|open)\b/.test(text);
  const conciseRuleIntent = text.split(" ").length <= 4 && INSTANT_ADMIN_NAV_RULES.some((rule) =>
    rule.keywords.some((keyword) => text.includes(normalizeArayNavText(keyword)))
  );
  const concisePageIntent = text.split(" ").length <= 4 && pages.some((page) => getAdminPageMatchScore(text, page) >= 90);
  if (!hasIntent && !conciseRuleIntent && !concisePageIntent) return null;

  const byHref = new Map(pages.map((page) => [page.href, page]));

  for (const rule of INSTANT_ADMIN_NAV_RULES) {
    if (!rule.keywords.some((keyword) => text.includes(normalizeArayNavText(keyword)))) continue;
    const baseHref = rule.href.split("?")[0];
    const page = byHref.get(rule.href) ?? byHref.get(baseHref);
    if (page) return page.href === rule.href ? page : { ...page, href: rule.href };
  }

  return pages
    .map((page) => ({ page, score: getAdminPageMatchScore(text, page) }))
    .filter((match) => match.score >= 90)
    .sort((a, b) => b.score - a.score || b.page.href.length - a.page.href.length)[0]?.page ?? null;
}

// ─── Маленькая иконка-сфера для аватарки в чат-сообщениях ───────────────────
function ArayAdminNavigationStrip(_props: {
  navigation?: AdminArayNavigationContext;
  onOpenPage: (href: string) => void;
  isDark: boolean;
}) {
  return null;
}

// ─── Голосовой ввод (микрофон) ───────────────────────────────────────────────
function useMic() {
  const [active, setActive] = useState(false);
  const [supported, setSupported] = useState(false);
  const recRef = useRef<any>(null);
  const silenceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      if (!navigator.mediaDevices?.getUserMedia) { resolve(""); return; }
      let permissionStream: MediaStream | null = null;
      try {
        permissionStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch {
        resolve("");
        return;
      } finally {
        permissionStream?.getTracks().forEach(track => track.stop());
      }
      if (recRef.current) { try { recRef.current.stop(); } catch {} recRef.current = null; }
      if (silenceTimer.current) clearTimeout(silenceTimer.current);
      if (maxTimer.current) clearTimeout(maxTimer.current);

      const r = new SR();
      r.lang = "ru-RU";
      r.maxAlternatives = 1;

      // iOS Safari не поддерживает continuous — используем single-shot с авторестартом
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      r.interimResults = !isIOS; // interim на Android/Chrome, не на iOS
      r.continuous = !isIOS; // continuous на Android/Chrome

      let resolved = false;
      let fullText = "";
      let interimText = "";

      const finishWithText = () => {
        if (!resolved) {
          resolved = true;
          setActive(false);
          try { r.stop(); } catch {}
          recRef.current = null;
          if (silenceTimer.current) clearTimeout(silenceTimer.current);
          if (maxTimer.current) clearTimeout(maxTimer.current);
          resolve((fullText || interimText).trim());
        }
      };

      // Автозавершение через 2.5с тишины после речи
      const resetSilenceTimer = () => {
        if (silenceTimer.current) clearTimeout(silenceTimer.current);
        if (fullText || interimText) {
          silenceTimer.current = setTimeout(finishWithText, 1400);
        }
      };

      r.onstart = () => { setActive(true); };
      let restartCount = 0;
      const maxRestartsFast = isIOS ? 2 : 1;

      r.onend = () => {
        // iOS: single-shot завершается после каждой фразы
        // Если текст есть → финишируем, если нет → рестартим до maxRestarts
        if (!resolved && isIOS && !fullText && restartCount < maxRestartsFast) {
          restartCount++;
          try { r.start(); return; } catch { /* fallthrough */ }
        }
        if (!resolved && !isIOS && (fullText || interimText) && restartCount < maxRestartsFast) {
          restartCount++;
          resetSilenceTimer();
          window.setTimeout(() => {
            try { if (!resolved) r.start(); } catch { if (!resolved) finishWithText(); }
          }, 80);
          return;
        }
        finishWithText();
      };
      r.onerror = (e: any) => {
        // "no-speech" — не ошибка, просто тишина → рестарт на iOS
        if (e.error === "no-speech" && !resolved) {
          if (isIOS && restartCount < maxRestartsFast) {
            restartCount++;
            try { r.start(); return; } catch { /* fallthrough */ }
          }
        }
        if (!resolved) finishWithText();
      };
      r.onresult = (e: any) => {
        let nextInterim = "";
        // Собираем все финальные результаты
        for (let i = 0; i < e.results.length; i++) {
          const result = e.results[i];
          const t = result[0]?.transcript?.trim() || "";
          if (result.isFinal) {
            if (t && !fullText.includes(t)) fullText = fullText ? fullText + " " + t : t;
          } else if (t) {
            nextInterim = nextInterim ? `${nextInterim} ${t}` : t;
          }
        }
        if (nextInterim) interimText = nextInterim;
        // iOS single-shot: сразу один финальный результат
        if (isIOS && fullText && !r.continuous) {
          finishWithText();
          return;
        }
        resetSilenceTimer();
      };

      // Таймаут: максимум 14 сек записи
      maxTimer.current = setTimeout(() => { if (!resolved) finishWithText(); }, 9000);

      try {
        r.start(); recRef.current = r;
      } catch {
        setActive(false);
        if (maxTimer.current) clearTimeout(maxTimer.current);
        if (!resolved) { resolved = true; resolve(""); }
      }
    });
  }, []);

  const cancel = useCallback(() => {
    if (recRef.current) { try { recRef.current.stop(); } catch {} recRef.current = null; }
    if (silenceTimer.current) clearTimeout(silenceTimer.current);
    if (maxTimer.current) clearTimeout(maxTimer.current);
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

function inferSpeechLanguage(text: string): string {
  if (/[\u3400-\u9FFF]/.test(text)) return "zh-CN";
  if (/[\u3040-\u30FF]/.test(text)) return "ja-JP";
  if (/[\uAC00-\uD7AF]/.test(text)) return "ko-KR";
  if (/[\u0600-\u06FF]/.test(text)) return "ar-SA";
  if (/[\u0E00-\u0E7F]/.test(text)) return "th-TH";
  if (/[\u0590-\u05FF]/.test(text)) return "he-IL";
  if (/[\u0370-\u03FF]/.test(text)) return "el-GR";
  if (/[А-Яа-яЁё]/.test(text)) return "ru-RU";
  return "en-US";
}

// ─── TTS хук ─────────────────────────────────────────────────────────────────
function useTTS() {
  const [speaking, setSpeaking] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const onDoneRef = useRef<(() => void) | null>(null);
  const lockRef = useRef(false);

  const finish = useCallback(() => {
    lockRef.current = false;
    abortRef.current = null;
    setSpeaking(false);
    const onDone = onDoneRef.current;
    onDoneRef.current = null;
    onDone?.();
  }, []);

  const stop = useCallback(() => {
    lockRef.current = false;
    abortRef.current?.abort(); abortRef.current = null;
    stopAraySpeech();
    onDoneRef.current = null;
    setSpeaking(false);
  }, []);

  const speak = useCallback(async (text: string, onFinished?: () => void) => {
    if (lockRef.current) { stop(); await new Promise(r => setTimeout(r, 50)); }
    stop();
    lockRef.current = true;
    const clean = prepareAraySpeechText(text, { maxLength: 650 });
    if (!clean) { lockRef.current = false; onFinished?.(); return; }
    const lang = inferSpeechLanguage(clean);
    setSpeaking(true);
    onDoneRef.current = onFinished || null;
    const abort = new AbortController();
    abortRef.current = abort;

    try {
      if (clean.length <= 14) {
        await speakAraySpeechBrowser(clean, lang);
        if (!abort.signal.aborted) finish();
        return;
      }

      const res = await fetch("/api/ai/tts", {
        method: "POST", signal: abort.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: clean, source: "aray-widget", lang }),
      });
      if (res.ok) {
        const ct = res.headers.get("content-type") || "";
        if (ct.includes("audio")) {
          const buf = await res.arrayBuffer();
          if (buf.byteLength > 100 && !abort.signal.aborted) {
            await playAraySpeech(buf);
            if (!abort.signal.aborted) {
              finish();
            }
            return;
          }
        } else if (ct.includes("application/json")) {
          const data = await res.json().catch(() => null) as { text?: string } | null;
          if (data?.text && !abort.signal.aborted) {
            await speakAraySpeechBrowser(data.text, (data as { lang?: string }).lang || lang);
            if (!abort.signal.aborted) finish();
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
        await speakAraySpeechBrowser(clean, lang);
      } catch {}
      finish();
    }
  }, [finish, stop]);

  return { speaking, speak, stop };
}

const CONFIRM_TOOL_LABELS: Record<string, string> = {
  update_order_status: "Изменить статус заказа",
  create_task: "Создать задачу",
  update_task: "Обновить задачу",
  update_product_price: "Обновить цену товара",
  toggle_product_active: "Изменить видимость товара",
  send_push_notification: "Отправить push",
  create_lead: "Создать лид",
  create_product: "Создать товар",
  create_category: "Создать категорию",
  update_stock: "Обновить остатки",
  import_price_list: "Импортировать прайс",
  manage_settings: "Изменить настройки",
};

const CONFIRM_FIELD_LABELS: Record<string, string> = {
  orderNumber: "Заказ",
  status: "Статус",
  title: "Название",
  description: "Описание",
  priority: "Приоритет",
  assigneeId: "Исполнитель",
  taskId: "Задача",
  variantId: "Вариант",
  productId: "Товар",
  pricePerCube: "Цена за м3",
  pricePerPiece: "Цена за шт",
  inStock: "В наличии",
  active: "Активен",
  segment: "Сегмент",
  body: "Текст",
  name: "Имя",
  phone: "Телефон",
  email: "Email",
  company: "Компания",
  categoryName: "Категория",
  stockQty: "Остаток",
  action: "Действие",
  key: "Ключ",
  value: "Значение",
};

function formatConfirmValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "да" : "нет";
  if (Array.isArray(value)) return value.map(formatConfirmValue).join(", ");
  if (typeof value === "object") {
    try { return JSON.stringify(value); } catch { return "данные"; }
  }
  return String(value);
}

function confirmationKey(confirmation: ArayConfirmationDraft) {
  try {
    return `${confirmation.tool}:${JSON.stringify(confirmation.draft)}`;
  } catch {
    return confirmation.tool;
  }
}

function ConfirmationCard({
  confirmation,
  isDark,
  onConfirm,
  onCancel,
}: {
  confirmation: ArayConfirmationDraft;
  isDark: boolean;
  onConfirm?: (confirmation: ArayConfirmationDraft) => void;
  onCancel?: (confirmation: ArayConfirmationDraft) => void;
}) {
  const title = CONFIRM_TOOL_LABELS[confirmation.tool] || confirmation.tool;
  const rows = Object.entries(confirmation.draft || {})
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .slice(0, 7);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="w-full rounded-2xl p-3"
      style={{
        background: isDark
          ? "linear-gradient(180deg, hsl(var(--primary) / 0.10), rgba(255,255,255,0.045))"
          : "linear-gradient(180deg, hsl(var(--primary) / 0.08), rgba(0,0,0,0.025))",
        border: "1px solid hsl(var(--primary) / 0.34)",
        boxShadow: "0 0 0 1px hsl(var(--primary) / 0.08)",
      }}
    >
      <div className="flex items-start gap-2">
        <span
          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
          style={{
            color: "hsl(var(--primary))",
            background: "hsl(var(--primary) / 0.12)",
            border: "1px solid hsl(var(--primary) / 0.24)",
          }}
        >
          <ShieldCheck className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[12.5px] font-semibold leading-snug" style={{ color: isDark ? "rgba(255,255,255,0.94)" : "rgba(15,15,15,0.92)" }}>
            {title}
          </p>
          <p className="mt-0.5 text-[10.5px] leading-snug" style={{ color: isDark ? "rgba(255,255,255,0.52)" : "rgba(15,15,15,0.52)" }}>
            Проверь детали. Арай выполнит действие только после подтверждения.
          </p>
        </div>
      </div>

      {rows.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {rows.map(([key, value]) => (
            <div key={key} className="grid grid-cols-[86px_1fr] gap-2 text-[11px]">
              <span className="truncate" style={{ color: isDark ? "rgba(255,255,255,0.42)" : "rgba(15,15,15,0.42)" }}>
                {CONFIRM_FIELD_LABELS[key] || key}
              </span>
              <span className="break-words font-medium" style={{ color: isDark ? "rgba(255,255,255,0.82)" : "rgba(15,15,15,0.82)" }}>
                {formatConfirmValue(value)}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onCancel?.(confirmation)}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-[11.5px] font-semibold transition-all active:scale-[0.97]"
          style={{
            color: isDark ? "rgba(255,255,255,0.72)" : "rgba(15,15,15,0.62)",
            background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
            border: `1px solid ${isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.08)"}`,
          }}
        >
          <XCircle className="h-3.5 w-3.5" />
          Отмена
        </button>
        <button
          type="button"
          onClick={() => onConfirm?.(confirmation)}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-[11.5px] font-semibold transition-all active:scale-[0.97]"
          style={{
            color: "hsl(var(--primary-foreground))",
            background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--atmo-accent)))",
            boxShadow: "0 0 18px hsl(var(--primary) / 0.22)",
          }}
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          Подтвердить
        </button>
      </div>
    </motion.div>
  );
}

// ─── Пузырь сообщения (компактный, voice-first) ─────────────────────────────
function MessageBubble({
  msg, onAction, onConfirm, onCancelConfirm, onSpeak, onStopSpeak, speaking, isDark = true,
}: {
  msg: Message;
  onAction?: (a: ArayAction) => void;
  onConfirm?: (confirmation: ArayConfirmationDraft) => void;
  onCancelConfirm?: (confirmation: ArayConfirmationDraft) => void;
  onSpeak?: (text: string) => void;
  onStopSpeak?: () => void;
  speaking?: boolean;
  isDark?: boolean;
}) {
  const isUser = msg.role === "user";
  const visibleContent = isUser ? msg.content : normalizeAraySelfReferences(msg.content);

  return (
      <div className={`flex gap-2 ${isUser ? "flex-row-reverse" : "flex-row"} mb-3`}>
        {!isUser && (
          <div className="shrink-0 mt-0.5"><ArayIcon size={24} id={`ai-${msg.id}`} /></div>
        )}
      <div className={`flex flex-col gap-1 ${isUser ? "items-end" : "items-start"} max-w-[92%]`}>
        <div className="px-4 py-3 text-[14px] leading-[1.62]" style={
          isUser
            ? { background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary)/0.75))", color: "hsl(var(--primary-foreground))", borderRadius: "14px 14px 4px 14px" }
            : {
                background: isDark
                  ? "rgba(255,255,255,0.075)"
                  : "rgba(0,0,0,0.035)",
                color: isDark ? "rgba(255,255,255,0.94)" : "rgba(15,15,15,0.92)",
                borderRadius: "16px 16px 16px 5px",
                border: `1px solid ${isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)"}`,
                boxShadow: "none",
              }
        }>
          {visibleContent
            ? isUser
              ? visibleContent.split("\n").map((line, i, arr) => (
                  <span key={i}>{line}{i < arr.length - 1 && <br />}</span>
                ))
              : <div className="space-y-0.5">{renderMarkdownContent(visibleContent)}</div>
            : !isUser && msg.streaming
            ? <span className="inline-flex gap-1 items-center py-0.5">
                {[0,1,2].map(i => (
                  <span key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: "hsl(var(--primary)/0.8)", animation: `arayDot 1.4s ease-in-out ${i*150}ms infinite` }} />
                ))}
              </span>
            : null
          }
          {msg.streaming && visibleContent && (
            <span className="inline-block w-0.5 h-3.5 ml-0.5 align-middle animate-pulse" style={{ background: "hsl(var(--primary))" }} />
          )}
        </div>

        {msg.attachments && msg.attachments.length > 0 && (
          <div className="flex flex-col gap-1 w-full">
            {msg.attachments.map(file => (
              <div
                key={file.id}
                className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-[11px]"
                style={{
                  background: isDark ? "rgba(255,255,255,0.055)" : "rgba(0,0,0,0.035)",
                  border: `1px solid ${isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.08)"}`,
                  color: isDark ? "rgba(255,255,255,0.72)" : "rgba(15,15,15,0.72)",
                }}
              >
                <AttachmentKindIcon kind={file.kind} className="w-3.5 h-3.5 shrink-0" />
                <span className="min-w-0 flex-1 truncate">{file.name}</span>
                <span className="shrink-0 opacity-60">{formatAttachmentSize(file.size)}</span>
              </div>
            ))}
          </div>
        )}

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
                className="flex min-h-11 items-center gap-2 rounded-xl px-3 py-2 text-left text-[13px] font-medium transition-colors active:scale-[0.98]"
                style={{
                  background: "hsl(var(--primary) / 0.10)",
                  border: "1px solid hsl(var(--primary) / 0.24)",
                  color: isDark ? "rgba(255,255,255,0.90)" : "rgba(15,15,15,0.90)",
                }}
              >
                <span className="flex items-center justify-center w-6 h-6 rounded-lg shrink-0"
                  style={{ background: "hsl(var(--primary) / 0.16)", color: "hsl(var(--primary))" }}>
                  <ActionIcon icon={action.icon} />
                </span>
                <span className="flex-1 leading-tight">{action.label}</span>
                <span className="text-[10px] opacity-40">→</span>
              </motion.button>
            ))}
          </div>
        )}

        {!isUser && msg.confirmations && msg.confirmations.length > 0 && (
          <div className="flex w-full flex-col gap-2">
            {msg.confirmations.map((confirmation, i) => (
              <ConfirmationCard
                key={`${confirmation.tool}-${i}`}
                confirmation={confirmation}
                isDark={isDark}
                onConfirm={onConfirm}
                onCancel={onCancelConfirm}
              />
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
              onClick={() => (speaking ? onStopSpeak?.() : onSpeak(visibleContent))}
              className="flex h-8 w-8 items-center justify-center rounded-full transition-colors active:scale-95"
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

export function ArayWidget({ page, productName, cartTotal, enabled = true, staffName, userRole, adminNavigation }: ArayWidgetProps) {
  const nextPathname = usePathname();
  const router = useRouter();
  const mobileDragControls = useDragControls();
  const pathname = nextPathname || page || "/";
  const isAdmin = pathname.startsWith("/admin");
  const zone = isAdmin ? "admin" : pathname.startsWith("/cabinet") ? "cabinet" : "store";
  const { speaking, speak, stop: stopTTS } = useTTS();
  const { active: micActive, supported: micOk, listen: micListen, cancel: micCancel } = useMic();
  const { resolvedTheme } = useTheme();

  // ── State ──────────────────────────────────────────────────────────────────
  const [chatPanelOpen, setChatPanelOpen] = useState(false);
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [attachments, setAttachments] = useState<ArayAttachment[]>([]);
  const [attachmentsBusy, setAttachmentsBusy] = useState(false);
  const [voiceMode, setVoiceMode] = useState<"text" | "voice">("voice"); // voice-first по умолчанию!
  const voiceModeRef = useRef<"text" | "voice">("voice");
  const [voiceStarting, setVoiceStarting] = useState(false);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);
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
  const [browserUrl] = useState("/");
  const [browserAction, setBrowserAction] = useState<ArayBrowserAction | null>(null);
  useAdminOverlayGuard(open && isMobile);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const longPressTimer = useRef<number | null>(null);
  const longPressTriggered = useRef(false);
  const panelOpenRef = useRef(false);
  // Ref на sendMessage — чтобы event listeners (aray:prompt) не захватывали stale closure
  const sendMessageRef = useRef<((text?: string, options?: SendMessageOptions) => Promise<void>) | null>(null);
  const startVoiceRef = useRef<(() => void) | null>(null);
  const voiceStartGuardRef = useRef(false);
  const voiceNoticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesCountRef = useRef(0);
  const lastPathnameRef = useRef(pathname);

  const showVoiceNotice = useCallback((message: string) => {
    if (voiceNoticeTimerRef.current) clearTimeout(voiceNoticeTimerRef.current);
    setVoiceNotice(message);
    voiceNoticeTimerRef.current = setTimeout(() => setVoiceNotice(null), 3800);
  }, []);

  useEffect(
    () => () => {
      if (voiceNoticeTimerRef.current) clearTimeout(voiceNoticeTimerRef.current);
    },
    [],
  );

  const cartCount = useCartStore(s => s.totalItems());
  const cartPrice = useCartStore(s => s.totalPrice());
  const adminQuickActions = useMemo(
    () => (isAdmin ? (adminNavigation?.quickActions ?? []) : []),
    [adminNavigation, isAdmin]
  );
  const chips = useMemo(
    () => adminQuickActions.length
      ? adminQuickActions.map((action) => action.label)
      : isAdmin
        ? getAdminChips(pathname)
        : buildArayChips({ page: pathname, productName, cartTotal }),
    [adminQuickActions, cartTotal, isAdmin, pathname, productName]
  );
  const visibleChipLimit = isAdmin ? Math.min(ARAY_MAX_SMART_CHIPS, chips.length) : ARAY_MAX_SMART_CHIPS;
  const showSmartChips = chips.length > 0;
  const contextualQuickActions = useMemo<ArayAction[]>(() => {
    if (isAdmin && adminQuickActions.length) {
      return adminQuickActions.slice(0, ARAY_MAX_SMART_CHIPS).map((action) => action.href
        ? {
            type: "navigate",
            url: action.href,
            label: action.label,
            icon: action.kind === "page-action" ? "settings" : "target",
          }
        : {
            type: "prompt",
            prompt: action.prompt,
            label: action.label,
            icon:
              action.label.toLowerCase().includes("direct") ? "direct" :
              action.label.toLowerCase().includes("аналит") ? "analytics" :
              action.label.toLowerCase().includes("голос") ? "voice" :
              "prompt",
          });
    }

    if (pathname.startsWith("/cart") || pathname.startsWith("/checkout") || (cartTotal && cartTotal > 0)) {
      return [
        { type: "navigate", url: "/checkout", label: "Оформить заказ", icon: "check" },
        { type: "prompt", prompt: "Проверь корзину и подскажи, что я мог забыть.", label: "Проверить корзину", icon: "prompt" },
      ];
    }
    if (productName) {
      return [
        { type: "prompt", prompt: `Подбери количество и доставку для товара ${productName}.`, label: "Подобрать количество", icon: "product" },
        { type: "navigate", url: "/cart", label: "Открыть корзину", icon: "check" },
      ];
    }
    if (pathname.startsWith("/catalog")) {
      return [
        { type: "prompt", prompt: "Помоги подобрать материалы под мой проект.", label: "Подобрать материалы", icon: "catalog" },
        { type: "prompt", prompt: "Посчитай материалы для бани 4 на 5.", label: "Баня 4x5", icon: "prompt" },
      ];
    }
    return [
      { type: "navigate", url: "/catalog", label: "Открыть каталог", icon: "catalog" },
      { type: "prompt", prompt: "Что ты умеешь и чем можешь помочь прямо сейчас?", label: "Что умеешь?", icon: "prompt" },
    ];
  }, [adminQuickActions, cartTotal, isAdmin, pathname, productName]);
  const adminNavigationPayload = useMemo(() => {
    if (!isAdmin || !adminNavigation) return undefined;
    return {
      currentPage: adminNavigation.currentPage,
      nearbyPages: adminNavigation.nearbyPages.map(({ href, label, groupLabel }) => ({ href, label, groupLabel })),
      availablePages: adminNavigation.availablePages.map(({ href, label, groupLabel }) => ({ href, label, groupLabel })).slice(0, 80),
      quickActions: adminNavigation.quickActions.map(({ label, prompt, href, kind }) => ({ label, prompt, href, kind })),
    };
  }, [adminNavigation, isAdmin]);

  useEffect(() => {
    panelOpenRef.current = open;
  }, [open]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const workspaceOpen = open && isAdmin && !isMobile;
    document.body.toggleAttribute("data-aray-workspace", workspaceOpen);
    if (workspaceOpen) {
      document.body.dataset.arayWorkspace = "open";
    } else {
      document.body.removeAttribute("data-aray-workspace");
      delete document.body.dataset.arayWorkspace;
    }
    return () => {
      document.body.removeAttribute("data-aray-workspace");
      delete document.body.dataset.arayWorkspace;
    };
  }, [open, isAdmin, isMobile]);

  useEffect(() => {
    messagesCountRef.current = messages.length;
  }, [messages.length]);

  // ── История чата (БД) ────────────────────────────────────────────────────
  const loadHistoryFromDB = useCallback(async () => {
    try {
      const res = await fetch("/api/ai/chat/history", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (data.messages?.length) setMessages(mapServerHistoryMessages(data.messages));
    } catch {}
  }, []);

  const historyLoaded = useRef(false);
  useEffect(() => {
    if (!open) return;
    if (historyLoaded.current) return;
    historyLoaded.current = true;
    void loadHistoryFromDB();
  }, [loadHistoryFromDB, open]);

  const saveMessageToDB = useCallback((role: string, content: string) => {
    if (!content) return;
    fetch("/api/ai/chat/history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, content, context: getArayContext() }),
    }).catch(() => {}).finally(() => notifyArayHistoryUpdated(ARAY_WIDGET_SOURCE));
  }, []);

  useEffect(() => {
    return subscribeArayHistoryUpdated(ARAY_WIDGET_SOURCE, () => {
      if (!panelOpenRef.current) return;
      if (loading) return;
      void loadHistoryFromDB();
    });
  }, [loadHistoryFromDB, loading]);

  // Имя пользователя
  const userLoaded = useRef(false);
  useEffect(() => {
    if (!open || userLoaded.current || staffName) return;
    userLoaded.current = true;
    fetch("/api/ai/me").then(r => r.json()).then(d => {
      if (d.name) setUserName(d.name);
    }).catch(() => {});
  }, [open, staffName]);

  // Voice mode persistence
  useEffect(() => {
    const saved = localStorage.getItem("aray-voice-mode");
    if (saved === "text") { setVoiceMode("text"); voiceModeRef.current = "text"; }
    else { setVoiceMode("voice"); voiceModeRef.current = "voice"; } // voice-first default
  }, []);

  // Preload voices
  useEffect(() => {
    if (!open || voiceMode !== "voice") return;
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
    }
  }, [open, voiceMode]);

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
  // Tracker
  const trackerStarted = useRef(false);
  useEffect(() => {
    if (!open || trackerStarted.current) return;
    trackerStarted.current = true;
    initArayTracker();
  }, [open]);

  // Показать через 1.5 сек
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 1500);
    return () => clearTimeout(t);
  }, []);

  // ── Приветствие ────────────────────────────────────────────────────────────
  const startChat = useCallback((force = false) => {
    if (!force && messages.length > 0) return;
    const h = new Date().getHours();
    const t = h < 6 ? "Не спишь?" : h < 12 ? "Доброе утро" : h < 17 ? "Добрый день" : h < 22 ? "Добрый вечер" : "Поздно уже";
    const name = staffName || userName;
    let greeting: string;
    if (isAdmin && name) {
      greeting = `${t}, ${name.split(" ")[0]}! Чем помочь?`;
    } else if (name) {
      greeting = `${t}, ${name}! ${productName ? `Смотришь «${productName}»?` : "Чем могу помочь?"} Спрашивай.`;
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
          if (!panelOpenRef.current) return;
          if (voiceModeRef.current !== "voice") return;
          setVoiceNotice(null);
          setVoiceStarting(true);
          try {
            const txt = await micListen();
            if (txt) sendMessage(txt);
            else showVoiceNotice("Не расслышал. Нажми микрофон и скажи ещё раз.");
          } catch {
          } finally {
            setVoiceStarting(false);
          }
        }, 900);
      }), 400);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, staffName, userName, page, productName, cartTotal, isAdmin]);

  // Открытие из мобильного навбара
  useEffect(() => {
    const handler = () => {
      delete (window as ArayPendingPromptWindow).__arayPendingOpen;
      setVisible(true); setOpen(true); setHasNew(false); startChat();
    };
    window.addEventListener("aray:open", handler);
    return () => window.removeEventListener("aray:open", handler);
  }, [startChat]);

  // Push-to-talk из мобильного навбара
  useEffect(() => {
    const handler = () => {
      delete (window as ArayPendingPromptWindow).__arayPendingOpen;
      const shouldStartListening = messagesCountRef.current > 0;
      setVisible(true); setOpen(true); setHasNew(false); startChat();
      if (voiceModeRef.current !== "voice") {
        setVoiceMode("voice"); voiceModeRef.current = "voice";
        localStorage.setItem("aray-voice-mode", "voice");
      }
      if (shouldStartListening) {
        window.setTimeout(() => startVoiceRef.current?.(), 220);
      }
    };
    window.addEventListener("aray:voice", handler);
    return () => window.removeEventListener("aray:voice", handler);
  }, [startChat]);

  useEffect(() => {
    const pendingWindow = window as ArayPendingPromptWindow;
    const pendingOpen = pendingWindow.__arayPendingOpen;
    if (!pendingOpen) return;
    delete pendingWindow.__arayPendingOpen;

    const shouldStartListening = pendingOpen === "voice" && messagesCountRef.current > 0;
    setVisible(true); setOpen(true); setHasNew(false); startChat();
    if (pendingOpen === "voice" && voiceModeRef.current !== "voice") {
      setVoiceMode("voice"); voiceModeRef.current = "voice";
      localStorage.setItem("aray-voice-mode", "voice");
    }
    if (shouldStartListening) {
      window.setTimeout(() => startVoiceRef.current?.(), 220);
    }
  }, [startChat]);

  // Отправка текста из ArayDock (чат-бар внизу)
  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<ArayPromptPayload>;
      const payload = ce.detail;
      const text = payload?.text?.trim();
      if (!text) return;
      const pendingWindow = window as ArayPendingPromptWindow;
      if (pendingWindow.__arayPendingPrompt?.text === text) {
        delete pendingWindow.__arayPendingPrompt;
      }
      setVisible(true); setOpen(true); setHasNew(false); startChat();
      if (voiceModeRef.current !== "text") {
        setVoiceMode("text"); voiceModeRef.current = "text";
        localStorage.setItem("aray-voice-mode", "text");
      }
      setShowMessages(true);
      // Микро-задержка чтобы useEffect успел отрендерить приветствие
      // sendMessageRef — избегаем stale closure (useEffect зависит только от startChat)
      setTimeout(() => { sendMessageRef.current?.(text, payload); }, 50);
    };
    window.addEventListener("aray:prompt", handler as EventListener);
    return () => window.removeEventListener("aray:prompt", handler as EventListener);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startChat]);

  useEffect(() => {
    const pending = (window as ArayPendingPromptWindow).__arayPendingPrompt;
    const text = pending?.text?.trim();
    if (!text) return;
    delete (window as ArayPendingPromptWindow).__arayPendingPrompt;
    setVisible(true); setOpen(true); setHasNew(false); startChat();
    if (voiceModeRef.current !== "text") {
      setVoiceMode("text"); voiceModeRef.current = "text";
      localStorage.setItem("aray-voice-mode", "text");
    }
    setShowMessages(true);
    window.setTimeout(() => sendMessageRef.current?.(text, pending), 120);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startChat]);

  // Проактивный пузырь
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => {
      if (!open) {
        const msg = userName ? `${userName}, помочь?`
          : productName ? `Смотришь «${productName}»?` : "Если есть вопросы — я рядом";
        setProactiveBubble(msg);
        setTimeout(() => setProactiveBubble(null), 5000);
      }
    }, 20000);
    return () => clearTimeout(t);
  }, [visible, open, userName, productName]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleOpen = () => { haptic("medium"); setOpen(true); setHasNew(false); setProactiveBubble(null); startChat(); };

  const handleAttachmentFiles = useCallback(async (files: FileList | null) => {
    if (!files?.length) return;
    haptic("light");
    setAttachmentsBusy(true);
    try {
      const incoming = Array.from(files).slice(0, 4);
      const prepared = await Promise.all(incoming.map(prepareArayAttachment));
      setAttachments(prev => [...prev, ...prepared].slice(0, 4));
      if (voiceModeRef.current !== "text") {
        setVoiceMode("text");
        voiceModeRef.current = "text";
        localStorage.setItem("aray-voice-mode", "text");
      }
      setShowMessages(true);
    } catch {
      setAttachments(prev => [...prev, {
        id: `${Date.now()}-attach-error`,
        name: "Файл не удалось прочитать",
        mimeType: "application/octet-stream",
        size: 0,
        kind: "file",
        note: "read-error",
      }]);
    } finally {
      setAttachmentsBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, []);

  const handlePaste = useCallback((event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const files = event.clipboardData?.files;
    if (!files?.length) return;
    event.preventDefault();
    void handleAttachmentFiles(files);
  }, [handleAttachmentFiles]);

  const removeAttachment = useCallback((id: string) => {
    setAttachments(prev => prev.filter(file => file.id !== id));
  }, []);

  const openArayTarget = useCallback((url: string): "internal" | "embedded" | "tab" | null => {
    const target = sanitizeArayUrl(url);
    if (!target) return null;

    const internalPath = toInternalAppPath(target);
    if (internalPath) {
      setBrowserOpen(false);
      setBrowserAction(null);
      router.push(internalPath);
      return "internal";
    }

    setBrowserOpen(false);
    setBrowserAction(null);
    window.open(target, "_blank", "noopener,noreferrer");
    return "tab";
  }, [router]);

  const applyArayOpenCommands = useCallback((rawText: string, actions: ArayAction[]) => {
    let openedInternal = false;
    let openedEmbedded = false;
    let openedTab = false;
    const requestedRefresh = rawText.includes("__ARAY_REFRESH__");

    const openTarget = (url?: string | null) => {
      if (!url) return;
      const kind = openArayTarget(url);
      openedInternal ||= kind === "internal";
      openedEmbedded ||= kind === "embedded";
      openedTab ||= kind === "tab";
    };

    actions.forEach((action) => {
      if (action.type === "navigate" && action.url) openTarget(action.url);
    });

    for (const match of rawText.matchAll(/__ARAY_NAVIGATE:(.+?)__/g)) {
      openTarget(match[1]);
    }

    for (const match of rawText.matchAll(/__ARAY_POPUP:(\{.+?\})__/g)) {
      try {
        const { url } = JSON.parse(match[1]) as { url?: string };
        openTarget(url);
      } catch {}
    }

    const showUrl = parseShowUrlPayload(rawText);
    if (showUrl && !rawText.includes("__ARAY_POPUP:")) {
      openTarget(showUrl.url);
    }

    if (requestedRefresh) {
      try {
        window.dispatchEvent(new CustomEvent("aray:refresh", { detail: { pathname } }));
        window.dispatchEvent(new CustomEvent("aray:admin-refresh", { detail: { pathname } }));
      } catch {}
      window.setTimeout(() => {
        try { router.refresh(); } catch {}
      }, openedInternal ? 200 : 0);
    }

    return {
      openedInternal,
      openedEmbedded,
      openedTab,
      openedAny: openedInternal || openedEmbedded || openedTab,
    };
  }, [openArayTarget, pathname, router]);

  const buildFinalArayText = useCallback((
    parsedText: string,
    isError: boolean,
    commandState: { openedInternal: boolean; openedEmbedded: boolean; openedTab: boolean; openedAny: boolean }
  ) => {
    const clean = cleanupArayControlText(parsedText);
    if (isError) return clean || "Не получилось. Попробуй снова.";
    if (commandState.openedInternal) return clean || "Открыл нужный раздел. Проверь, пожалуйста.";
    if (commandState.openedTab) return clean || "Открыл вкладку. Внешний кабинет не показываю внутри окна, чтобы не было пустого браузера.";
    if (commandState.openedEmbedded) return clean || "Открыл вкладку. Проверь, пожалуйста.";
    return clean || "Готово.";
  }, []);

  // ── Отправка сообщения ────────────────────────────────────────────────────
  const continueVoiceDialogue = useCallback((text: string, options?: { listen?: boolean }) => {
    const phrase = text.trim();
    if (!phrase || voiceModeRef.current !== "voice") return;
    speak(phrase, () => {
      if (options?.listen === false) return;
      window.setTimeout(async () => {
        if (!panelOpenRef.current) return;
        if (voiceModeRef.current !== "voice") return;
        if (voiceStartGuardRef.current) return;
        voiceStartGuardRef.current = true;
        setVoiceNotice(null);
        setVoiceStarting(true);
        try {
          const t = await micListen();
          if (t) {
            haptic("light");
            await sendMessageRef.current?.(t);
          } else {
            showVoiceNotice("Не расслышал. Нажми микрофон и скажи ещё раз.");
          }
        } catch {
        } finally {
          setVoiceStarting(false);
          voiceStartGuardRef.current = false;
        }
      }, 700);
    });
  }, [micListen, showVoiceNotice, speak]);

  const sendMessage = useCallback(async (text?: string, options?: SendMessageOptions) => {
    const rawInput = text || input;
    const effectiveOptions = options ?? (
      pathname.startsWith("/admin/promotion")
        ? buildPromotionPromptPayload(rawInput) ?? undefined
        : undefined
    );
    const msg = rawInput.trim();
    const visibleMsg = (effectiveOptions?.displayText || msg).trim();
    const hiddenContext = effectiveOptions?.context?.trim();
    const modelMsg = hiddenContext ? `${msg}\n\n[Служебный контекст ARAY]\n${hiddenContext}` : msg;
    const messageAttachments = attachments;
    if ((!msg && !visibleMsg && messageAttachments.length === 0) || loading || attachmentsBusy) return;
    setInput("");
    setAttachments([]);
    const instantAdminTarget = !effectiveOptions && isAdmin && messageAttachments.length === 0
      ? findInstantAdminNavigationTarget(visibleMsg || msg, adminNavigation)
      : null;
    if (instantAdminTarget) {
      const userMsg: Message = {
        id: Date.now().toString(),
        role: "user",
        content: visibleMsg || msg,
        timestamp: new Date(),
      };
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Открыл нужный раздел. Проверь, пожалуйста.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, userMsg, assistantMsg]);
      saveMessageToDB("user", userMsg.content);
      saveMessageToDB("assistant", assistantMsg.content);
      openArayTarget(instantAdminTarget.href);
      continueVoiceDialogue(assistantMsg.content);
      if (isMobile) stopAraySpeech();
      setShowMessages(true);
      return;
    }
    // В голосовом режиме — оставляем орб, ответ виден под ним
    // В текстовом режиме — показываем сообщения
    if (voiceModeRef.current === "text") setShowMessages(true);
    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: visibleMsg || msg || "Посмотри вложение.",
      timestamp: new Date(),
      attachments: messageAttachments.length ? messageAttachments : undefined,
    };
    const modelUserMsg = modelMsg ? { ...userMsg, content: modelMsg } : userMsg;
    const allMessages = [...messages, modelUserMsg];
    setMessages(prev => [...prev, userMsg]);
    const attachmentSummary = messageAttachments.length
      ? `\n\n[Вложения: ${messageAttachments.map(file => `${file.name} (${file.kind}, ${formatAttachmentSize(file.size)}). ${getAttachmentActionHint(file)}`).join("; ")}]`
      : "";
    saveMessageToDB("user", `${userMsg.content}${attachmentSummary}`);

    const localReply = effectiveOptions?.localReply?.trim();
    if (localReply && messageAttachments.length === 0) {
      if (effectiveOptions?.openUrl) openArayTarget(effectiveOptions.openUrl);
      const baseActions = mergeArayActions(effectiveOptions?.actions);
      const finalActions = baseActions.length ? baseActions : mergeArayActions(contextualQuickActions);
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: localReply,
        timestamp: new Date(),
        actions: finalActions.length ? finalActions : undefined,
      };
      setMessages(prev => [...prev, assistantMsg]);
      saveMessageToDB("assistant", localReply);
      continueVoiceDialogue(localReply);
      if (isMobile) stopAraySpeech();
      return;
    }

    if (effectiveOptions?.openUrl) openArayTarget(effectiveOptions.openUrl);
    setLoading(true);

    const assistantId = (Date.now() + 1).toString();

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: allMessages.map(m => ({ role: m.role, content: m.content, attachments: m.attachments })),
          context: {
            ...getArayContext(),
            page: pathname,
            productName,
            cartTotal,
            adminNavigation: adminNavigationPayload,
            source: voiceModeRef.current === "voice" ? "voice-mode" : "chat",
            inputMode: voiceModeRef.current,
          },
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
      const streamUpdater = createStreamingMessageUpdater(setMessages, assistantId);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        rawText += decoder.decode(value, { stream: true });
        const displayText = stripArayControlText(rawText);
        streamUpdater.update(displayText);
      }
      streamUpdater.flush(stripArayControlText(rawText));

      const isError = rawText.includes("__ARAY_ERR__");
      const errMatch = rawText.match(/__ARAY_ERR__(.+)$/);
      const cleanText = isError
        ? (errMatch?.[1] || "Не получилось. Попробуй снова.")
        : rawText.replace(/\n__ARAY_META__[\s\S]*$/, "").trim();
      const { text: textWithoutConfirmations, confirmations } = parseConfirmations(cleanText);
      const { text: parsedText, actions } = parseMessageActions(textWithoutConfirmations);

      const commandState = applyArayOpenCommands(rawText, actions);
      const baseActions = mergeArayActions(effectiveOptions?.actions, actions);
      const finalActions = baseActions.length ? baseActions : mergeArayActions(contextualQuickActions);

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
      const finalParsed = buildFinalArayText(parsedText, isError, commandState);

      setMessages(prev => prev.map(m =>
        m.id === assistantId ? { ...m, content: finalParsed, actions: finalActions, confirmations, streaming: false } : m
      ));
      saveMessageToDB("assistant", finalParsed);

      continueVoiceDialogue(finalParsed);
      if (!open) setHasNew(true);

    } catch {
      setMessages(prev => {
        const hasPlaceholder = prev.some(m => m.id === assistantId);
        if (hasPlaceholder) {
          return prev.map(m => m.id === assistantId
            ? { ...m, content: "Нет связи. Попробуй снова.", streaming: false } : m);
        }
        return [...prev, { id: assistantId, role: "assistant", content: "Нет связи. Попробуй снова.", timestamp: new Date() }];
      });
    } finally {
      setLoading(false);
    }
  }, [adminNavigation, adminNavigationPayload, applyArayOpenCommands, attachments, attachmentsBusy, buildFinalArayText, cartTotal, contextualQuickActions, continueVoiceDialogue, input, isAdmin, isMobile, loading, messages, open, openArayTarget, pathname, productName, saveMessageToDB]);

  // Поддерживаем актуальный ref на sendMessage для event listeners
  sendMessageRef.current = sendMessage;

  // Голосовой ввод — ВСЕГДА автоотправка
  const startVoice = useCallback(async () => {
    if (voiceStartGuardRef.current || micActive || loading) return;
    voiceStartGuardRef.current = true;
    setVoiceMode("voice");
    voiceModeRef.current = "voice";
    panelOpenRef.current = true;
    setOpen(true);
    try {
      localStorage.setItem("aray-voice-mode", "voice");
    } catch {}
    stopTTS();
    haptic("medium");
    setVoiceNotice(null);
    setVoiceStarting(true);
    try {
      const text = await micListen();
      if (text) {
        haptic("light");
        await sendMessageRef.current?.(text);
      } else {
        showVoiceNotice("Не расслышал. Нажми микрофон и скажи ещё раз.");
      }
    } catch {
    } finally {
      setVoiceStarting(false);
      voiceStartGuardRef.current = false;
    }
  }, [loading, micActive, micListen, showVoiceNotice, stopTTS]);
  startVoiceRef.current = startVoice;
  const listening = micActive;
  const voicePreparing = voiceStarting && !listening;
  const stopVoice = micCancel;

  const stopAllAray = useCallback(() => {
    stopTTS();
    micCancel();
    notifyArayStop(ARAY_WIDGET_SOURCE);
  }, [micCancel, stopTTS]);

  useEffect(() => {
    return subscribeArayStop(ARAY_WIDGET_SOURCE, () => {
      stopTTS();
      micCancel();
    });
  }, [micCancel, stopTTS]);

  const closeArayPanel = useCallback(() => {
    setOpen(false);
    stopAllAray();
  }, [stopAllAray]);

  useEffect(() => {
    if (lastPathnameRef.current === pathname) return;
    lastPathnameRef.current = pathname;
    if (!isMobile || !open) return;
    setOpen(false);
    setShowMessages(false);
    setProactiveBubble(null);
    stopAllAray();
  }, [isMobile, open, pathname, stopAllAray]);

  useEffect(() => {
    const handler = () => closeArayPanel();
    window.addEventListener("aray:close", handler);
    return () => window.removeEventListener("aray:close", handler);
  }, [closeArayPanel]);

  const resetArayChat = useCallback(() => {
    stopAllAray();
    setMessages([]);
    setAttachments([]);
    fetch("/api/ai/chat/history", { method: "DELETE" })
      .catch(() => {})
      .finally(() => notifyArayHistoryUpdated(ARAY_WIDGET_SOURCE));
    setShowMessages(false);
    startChat(true);
  }, [startChat, stopAllAray]);

  // Обработчик action-кнопок
  const handleAction = useCallback((action: ArayAction) => {
    if (action.type === "prompt") {
      const prompt = (action.prompt || action.label).trim();
      if (!prompt) return;
      setShowMessages(true);
      if (voiceModeRef.current !== "text") {
        setVoiceMode("text");
        voiceModeRef.current = "text";
        localStorage.setItem("aray-voice-mode", "text");
      }
      void sendMessage(prompt);
      return;
    }
    if (action.type === "navigate" && action.url) openArayTarget(action.url);
    if ((action.type === "spotlight" || action.type === "highlight") && action.spotX !== undefined && browserOpen) {
      setBrowserAction({ type: action.type, spotX: action.spotX, spotY: action.spotY, hint: action.hint });
      setTimeout(() => setBrowserAction(null), 5500);
    }
    if (action.type === "call" && action.url) window.location.href = action.url;
  }, [browserOpen, openArayTarget, sendMessage]);

  const handleOpenAdminPage = useCallback((href: string) => {
    haptic("light");
    if (voiceModeRef.current !== "text") {
      setVoiceMode("text");
      voiceModeRef.current = "text";
      localStorage.setItem("aray-voice-mode", "text");
    }
    openArayTarget(href);
    if (isMobile) stopAraySpeech();
    setShowMessages(true);
  }, [isMobile, openArayTarget]);

  const handleChipClick = useCallback((label: string) => {
    haptic("light");
    const action = adminQuickActions.find((item) => item.label === label);
    if (action?.href) {
      handleOpenAdminPage(action.href);
      return;
    }
    const prompt = action?.prompt || label;
    const promotionPayload = pathname.startsWith("/admin/promotion")
      ? buildPromotionPromptPayload(prompt)
      : null;
    if (promotionPayload) {
      sendMessage(promotionPayload.text, promotionPayload);
      return;
    }
    sendMessage(prompt);
  }, [adminQuickActions, handleOpenAdminPage, pathname, sendMessage]);

  const handleCancelConfirmation = useCallback((confirmation: ArayConfirmationDraft) => {
    haptic("light");
    const key = confirmationKey(confirmation);
    setMessages(prev => prev.map(m => m.confirmations
      ? { ...m, confirmations: m.confirmations.filter(c => confirmationKey(c) !== key) }
      : m
    ));
  }, []);

  const handleConfirmAction = useCallback(async (confirmation: ArayConfirmationDraft) => {
    if (loading) return;
    haptic("medium");
    setShowMessages(true);

    const key = confirmationKey(confirmation);
    const label = CONFIRM_TOOL_LABELS[confirmation.tool] || confirmation.tool;
    const userText = `Подтверждаю: ${label}`;
    const userMsg: Message = { id: `${Date.now()}-confirm`, role: "user", content: userText, timestamp: new Date() };
    const assistantId = `${Date.now()}-confirm-response`;
    const allMessages = [...messages, userMsg];

    setMessages(prev => [
      ...prev.map(m => m.confirmations
        ? { ...m, confirmations: m.confirmations.filter(c => confirmationKey(c) !== key) }
        : m
      ),
      userMsg,
      { id: assistantId, role: "assistant", content: "", timestamp: new Date(), streaming: true },
    ]);
    saveMessageToDB("user", userText);
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: allMessages.map(m => ({ role: m.role, content: m.content })),
          confirmAction: { tool: confirmation.tool, draft: confirmation.draft },
          context: {
            ...getArayContext(),
            page: pathname,
            productName,
            cartTotal,
            adminNavigation: adminNavigationPayload,
            source: voiceModeRef.current === "voice" ? "voice-mode" : "chat",
            inputMode: voiceModeRef.current,
          },
        }),
      });

      if (!res.body) throw new Error("No stream");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let rawText = "";
      const streamUpdater = createStreamingMessageUpdater(setMessages, assistantId);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        rawText += decoder.decode(value, { stream: true });
        const displayText = stripArayControlText(rawText);
        streamUpdater.update(displayText);
      }
      streamUpdater.flush(stripArayControlText(rawText));

      const isError = rawText.includes("__ARAY_ERR__");
      const errMatch = rawText.match(/__ARAY_ERR__(.+)$/);
      const cleanText = isError
        ? (errMatch?.[1] || "Не получилось. Попробуй снова.")
        : rawText.replace(/\n__ARAY_META__[\s\S]*$/, "").trim();
      const { text: textWithoutConfirmations, confirmations } = parseConfirmations(cleanText);
      const { text: parsedText, actions } = parseMessageActions(textWithoutConfirmations);
      const commandState = applyArayOpenCommands(rawText, actions);
      const baseActions = mergeArayActions(actions);
      const finalActions = baseActions.length ? baseActions : mergeArayActions(contextualQuickActions);

      const finalParsed = buildFinalArayText(parsedText, isError, commandState);

      setMessages(prev => prev.map(m =>
        m.id === assistantId ? { ...m, content: finalParsed, actions: finalActions, confirmations, streaming: false } : m
      ));
      saveMessageToDB("assistant", finalParsed);

      if (!isError) continueVoiceDialogue(finalParsed);
    } catch {
      setMessages(prev => prev.map(m => m.id === assistantId
        ? { ...m, content: "Не получилось выполнить действие. Проверь соединение и попробуй снова.", streaming: false }
        : m
      ));
    } finally {
      setLoading(false);
    }
  }, [adminNavigationPayload, applyArayOpenCommands, buildFinalArayText, cartTotal, contextualQuickActions, continueVoiceDialogue, loading, messages, pathname, productName, saveMessageToDB]);

  if (!enabled || !visible) return null;

  // ── Тема ──────────────────────────────────────────────────────────────────
  const isDark = resolvedTheme !== "light";

  // Цвета
  const txt = isDark ? "rgba(255,255,255,0.92)" : "rgba(15,15,15,0.92)";
  const txtSub = isDark ? "rgba(255,255,255,0.50)" : "rgba(15,15,15,0.50)";
  const txtMuted = isDark ? "rgba(255,255,255,0.35)" : "rgba(15,15,15,0.35)";
  const inputBg = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.04)";
  const inputBorder = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.10)";
  const dividerColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";
  const panelBg = isDark ? {
    background:
      "radial-gradient(circle at 52% -12%, hsl(var(--primary) / 0.085), transparent 36%), radial-gradient(circle at 86% 18%, hsl(var(--atmo-glow) / 0.055), transparent 34%), linear-gradient(180deg, hsl(var(--card) / 0.82), hsl(var(--background) / 0.74) 48%, hsl(var(--background) / 0.82))",
    backdropFilter: "blur(34px) saturate(190%)",
    WebkitBackdropFilter: "blur(34px) saturate(190%)",
  } as React.CSSProperties : {
    background:
      "radial-gradient(circle at 50% -12%, hsl(var(--primary) / 0.10), transparent 42%), radial-gradient(circle at 86% 18%, hsl(var(--atmo-glow) / 0.06), transparent 34%), linear-gradient(180deg, hsl(var(--card) / 0.90), hsl(var(--background) / 0.78))",
    backdropFilter: "blur(34px) saturate(185%)",
    WebkitBackdropFilter: "blur(34px) saturate(185%)",
  } as React.CSSProperties;
  const primaryColor = "hsl(var(--primary))";
  const primarySoft = "hsl(var(--primary) / 0.08)";
  const primaryBorder = "hsl(var(--primary) / 0.18)";
  const primaryGlow = "hsl(var(--primary) / 0.30)";
  const primaryGradient = "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--atmo-accent)))";
  const voiceActiveColor = "hsl(var(--primary))";
  const voiceSpeakingColor = "hsl(var(--atmo-glow))";
  const voiceActiveGlow = "hsl(var(--primary) / 0.25)";
  const voiceActiveGlowStrong = "hsl(var(--primary) / 0.30)";
  const voiceSpeakingGlow = "hsl(var(--atmo-glow) / 0.20)";
  const voiceSpeakingGlowStrong = "hsl(var(--atmo-glow) / 0.25)";
  const voiceIdleGlow = isDark ? "hsl(var(--primary) / 0.09)" : "hsl(var(--primary) / 0.10)";
  const voiceListeningGradient = "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--atmo-glow)))";
  const voiceListeningGlow = "hsl(var(--primary) / 0.26)";
  const voiceListeningPulse = "hsl(var(--primary) / 0.20)";
  const voiceListeningBorder = "hsl(var(--primary) / 0.34)";

  // ── Орб статус для анимации ────────────────────────────────────────────────
  const orbStatus = listening ? "listening" : speaking ? "speaking" : (voicePreparing || loading) ? "thinking" : "idle";

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,video/*,audio/*,.gif,.webp,.txt,.md,.csv,.json,.log,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.7z"
        className="hidden"
        onChange={e => handleAttachmentFiles(e.target.files)}
      />

      {/* ══ Встроенный браузер Арая ══ */}
      <AnimatePresence>
        {browserOpen && (
          <ArayBrowser initialUrl={browserUrl} onClose={() => setBrowserOpen(false)}
            pendingAction={browserAction} isMobile={isMobile} />
        )}
      </AnimatePresence>

      {/* ══ Проактивный пузырь (над дока-баром, когда чат закрыт) ══ */}
      {!open && proactiveBubble && (
        <div className="fixed z-[90] pointer-events-none"
          style={{ bottom: "calc(72px + env(safe-area-inset-bottom, 0px))", left: "50%", transform: "translateX(-50%)" }}>
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              onClick={handleOpen}
              className="max-w-[260px] px-3.5 py-2.5 rounded-2xl text-xs cursor-pointer pointer-events-auto"
              style={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                color: "hsl(var(--foreground))",
                boxShadow: "0 6px 18px rgba(0,0,0,0.11)",
              }}>
              {proactiveBubble}
            </motion.div>
          </AnimatePresence>
        </div>
      )}

      {/* Десктопный floating-орб удалён — на десктопе вход через ArayDock, на мобилке через нижнюю ARAY-кнопку. */}

      {/* ══ ДЕСКТОП — VOICE-FIRST ПАНЕЛЬ ══ */}
      <AnimatePresence>
        {open && !isMobile && (
          <>
            {!isAdmin && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="fixed inset-0 z-[105]"
                onClick={closeArayPanel}
                style={{ background: "transparent", backdropFilter: "none", WebkitBackdropFilter: "none" }}
              />
            )}
            <motion.div
              initial={isAdmin ? { opacity: 0, x: -28 } : { opacity: 0, scale: 0.94, y: 14 }}
              animate={isAdmin ? { opacity: 1, x: 0 } : { opacity: 1, scale: 1, y: 0 }}
              exit={isAdmin ? { opacity: 0, x: -22 } : { opacity: 0, scale: 0.94, y: 14 }}
              transition={{ type: "spring", damping: 32, stiffness: 360, mass: 0.85 }}
              className={`fixed z-[110] flex flex-col overflow-hidden ${isAdmin ? "admin-aray-workspace-panel" : ""}`}
              style={{
                top: isAdmin ? "calc(64px + 0.75rem)" : "auto",
                bottom: isAdmin ? "0.75rem" : "6rem",
                right: isAdmin ? "auto" : "1.5rem",
                left: isAdmin ? "calc(0.75rem + 3.75rem + 0.75rem)" : "auto",
                width: isAdmin ? "min(clamp(380px, 25vw, 460px), calc(100vw - 104px))" : "min(400px, calc(100vw - 32px))",
                height: isAdmin ? "auto" : "min(600px, calc(100vh - 140px))",
                borderRadius: "24px",
                border: `1px solid ${isAdmin ? "hsl(var(--primary) / 0.16)" : isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.08)"}`,
                boxShadow: isDark
                  ? "0 12px 28px rgba(0,0,0,0.26), 0 0 12px hsl(var(--primary) / 0.035), inset 0 1px 0 rgba(255,255,255,0.055)"
                  : "0 10px 24px rgba(15,23,42,0.065), 0 0 10px hsl(var(--primary) / 0.028), inset 0 1px 0 rgba(255,255,255,0.78)",
                ...panelBg,
              }}>

              {/* ── Шапка: минимальная ── */}
              <div className="admin-aray-capsule-head flex items-center justify-between px-4 py-4 shrink-0">
                <div className="flex items-center gap-2">
                  {!isAdmin && (
                    <span className="admin-aray-capsule-head-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl">
                      <ArayIcon size={30} id="hdr" />
                    </span>
                  )}
                  <div>
                    <p className="text-[14px] font-semibold leading-tight" style={{ color: txt }}>Арай</p>
                    <p className="text-[10.5px] leading-tight mt-0.5" style={{ color: txtSub }}>
                      {speaking ? "Говорю..." : listening ? "Слушаю..." : voicePreparing ? "Включаю микрофон..." : loading ? "Думаю..." : "Онлайн"}
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
                  {(speaking || listening || voicePreparing) && (
                    <button
                      onClick={stopAllAray}
                      className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                      style={{ color: speaking ? voiceSpeakingColor : voiceActiveColor }}
                      title={speaking ? "Остановить голос" : "Остановить микрофон"}
                      aria-label={speaking ? "Остановить голос ARAY" : "Остановить микрофон ARAY"}
                    >
                      {speaking ? <VolumeX className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
                    </button>
                  )}
                  <button onClick={resetArayChat}
                    className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                    style={{ color: txtMuted }} title="Новый чат">
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={closeArayPanel}
                    className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                    style={{ color: txtMuted }}
                    title="Свернуть ARAY"
                    aria-label="Свернуть ARAY">
                    <ChevronLeft className="w-4 h-4" />
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
                          ? `radial-gradient(circle, ${voiceActiveGlow} 0%, transparent 70%)`
                          : speaking
                            ? `radial-gradient(circle, ${voiceSpeakingGlow} 0%, transparent 70%)`
                            : `radial-gradient(circle, ${voiceIdleGlow} 0%, transparent 70%)`,
                      }} />
                      <ArayOrb size={100} id="center" pulse={orbStatus} />
                    </div>

                    {/* Статус */}
                    <p className="text-[13px] font-medium" style={{
                      color: listening ? voiceActiveColor : speaking ? voiceSpeakingColor : txt,
                    }}>
                      {listening ? "Слушаю..." : voicePreparing ? "Включаю микрофон..." : speaking ? "Арай говорит..." : "Нажми на орб — говори"}
                    </p>
                    {voiceNotice && (
                      <p className="max-w-[240px] text-center text-[12px] leading-snug" style={{ color: txtSub }}>
                        {voiceNotice}
                      </p>
                    )}

                    {/* Waveform при говорении */}
                    {(speaking || listening || voicePreparing) && (
                      <div className="flex gap-1 items-center h-6">
                        {[0,1,2,3,4,5,6].map(i => (
                          <motion.span key={i} className="w-1 rounded-full"
                            style={{ background: listening ? voiceActiveColor : voiceSpeakingColor }}
                            animate={{ height: [4, 12 + Math.random() * 8, 4] }}
                            transition={{ duration: 0.6 + Math.random() * 0.4, repeat: Infinity, delay: i * 0.08 }}
                          />
                        ))}
                      </div>
                    )}

                    {(speaking || listening || voicePreparing) && (
                      <button onClick={stopAllAray} className="text-[11px] px-3 py-1 rounded-full transition-all"
                        style={{ color: txtSub, background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)" }}>
                        {speaking ? "Остановить" : "Стоп"}
                      </button>
                    )}

                    {/* Последний ответ — компактно */}
                    {messages.length > 0 && !speaking && !listening && !voicePreparing && (
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
                        style={{ color: primaryColor, background: primarySoft, border: `1px solid ${primaryBorder}` }}>
                        <MessageSquare className="w-3 h-3" />
                        Показать переписку ({messages.length - 1})
                      </button>
                    )}

                    {isAdmin && (
                      <ArayAdminNavigationStrip
                        navigation={adminNavigation}
                        onOpenPage={handleOpenAdminPage}
                        isDark={isDark}
                      />
                    )}

                    {/* Быстрые чипы */}
                    {showSmartChips && (
                      <div className="flex max-w-full gap-2 flex-wrap justify-center mt-1">
                        {chips.slice(0, visibleChipLimit).map(q => (
                          <button key={q} onClick={() => handleChipClick(q)}
                            className="aray-quick-chip max-w-full whitespace-normal break-words text-center text-[12px] leading-snug px-3.5 py-2 rounded-full transition-all active:scale-95"
                            style={{ background: primarySoft, border: `1px solid ${primaryBorder}`, color: primaryColor }}>
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
                      <MessageBubble
                        key={m.id}
                        msg={m}
                        onAction={handleAction}
                        onConfirm={handleConfirmAction}
                        onCancelConfirm={handleCancelConfirmation}
                        onSpeak={speak}
                        onStopSpeak={stopAllAray}
                        speaking={speaking}
                        isDark={isDark}
                      />
                    ))}
                    {loading && (
                      <div className="flex gap-2 mb-3">
                        <ArayIcon size={24} id="aig-load" />
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
                {showMessages && showSmartChips && !loading && (
                  <div
                    className="mb-2 flex gap-2 overflow-x-auto pb-1"
                    data-no-page-swipe
                    style={{ scrollbarWidth: "none" }}
                  >
                    {chips.slice(0, visibleChipLimit).map((q) => (
                      <button
                        key={`desktop-input-${q}`}
                        type="button"
                        onClick={() => handleChipClick(q)}
                        className="aray-quick-chip shrink-0 whitespace-nowrap rounded-full px-3.5 py-2 text-[12px] leading-none transition-all active:scale-95"
                        style={{ background: primarySoft, border: `1px solid ${primaryBorder}`, color: primaryColor }}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                )}
                {attachments.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {attachments.map(file => (
                      <button
                        key={file.id}
                        type="button"
                        onClick={() => removeAttachment(file.id)}
                        className="group flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px]"
                        style={{ background: primarySoft, border: `1px solid ${primaryBorder}`, color: primaryColor }}
                        title="Убрать вложение"
                      >
                        {file.kind === "image" ? <ImageIcon className="h-3 w-3 shrink-0" /> : <FileText className="h-3 w-3 shrink-0" />}
                        <span className="max-w-[150px] truncate">{file.name}</span>
                        <Trash2 className="h-3 w-3 shrink-0 opacity-60 transition-opacity group-hover:opacity-100" />
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex gap-2 items-end">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={attachmentsBusy || loading}
                    className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 relative transition-all disabled:opacity-45"
                    style={{ background: inputBg, border: `1px solid ${inputBorder}`, color: attachments.length ? primaryColor : txtSub }}
                    title="Добавить фото или файл"
                  >
                    {attachmentsBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
                  </button>
                  <button onClick={listening ? stopVoice : startVoice}
                    className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 relative transition-all"
                    style={{
                      background: listening ? voiceListeningGradient : inputBg,
                      border: `1px solid ${listening ? "transparent" : inputBorder}`,
                      boxShadow: listening ? `0 0 14px ${voiceListeningGlow}` : "none",
                    }}>
                    {listening && <span className="absolute inset-0 rounded-full animate-ping"
                      style={{ background: voiceListeningPulse, animationDuration: "1s" }} />}
                    {listening ? <MicOff className="w-4 h-4 text-white relative z-10" /> : <Mic className="w-4 h-4 relative z-10" style={{ color: txtSub }} />}
                  </button>
                  <textarea
                    ref={inputRef} value={input}
                    onChange={e => setInput(e.target.value)}
                    onPaste={handlePaste}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                    onFocus={() => { if (!showMessages) setShowMessages(true); }}
                    rows={1} placeholder={listening ? "Слушаю..." : voicePreparing ? "Включаю микрофон..." : "Написать Араю..."}
                    className="flex-1 resize-none text-[16px] lg:text-[13px] rounded-2xl px-3.5 py-2 focus:outline-none transition-all"
                    style={{ background: inputBg, border: `1px solid ${listening ? voiceListeningBorder : inputBorder}`, color: txt, maxHeight: "80px" }}
                  />
                  <button onClick={() => { haptic("light"); sendMessage(); }} disabled={loading || attachmentsBusy || (!input.trim() && attachments.length === 0)}
                    className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all disabled:opacity-40"
                    style={{
                      background: input.trim() || attachments.length ? primaryGradient : "hsl(var(--muted))",
                      boxShadow: input.trim() || attachments.length ? `0 4px 12px ${primaryGlow}` : "none",
                    }}>
                    {loading
                      ? <Loader2 className="w-4 h-4 animate-spin" style={{ color: "hsl(var(--muted-foreground))" }} />
                      : <Send className="w-4 h-4" style={{ color: input.trim() || attachments.length ? "hsl(var(--primary-foreground))" : "hsl(var(--muted-foreground))" }} />}
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
              aria-hidden="true"
            />
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 32, stiffness: 340, mass: 0.9 }}
              drag="y"
              dragControls={mobileDragControls}
              dragListener={false}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.16}
              onDragEnd={(_, info) => {
                if (info.offset.y > 110 || info.velocity.y > 850) closeArayPanel();
              }}
              role="dialog"
              aria-modal="true"
              aria-label="ARAY"
              className="fixed left-0 right-0 z-[110] mx-auto flex flex-col overflow-hidden transition-[height,bottom,width] duration-150"
              style={{
                bottom: 0,
                width: kbOpen ? "100vw" : "min(100vw - 12px, 480px)",
                maxWidth: kbOpen ? "none" : "480px",
                height: kbOpen ? "100dvh" : "min(94dvh, 820px)",
                borderRadius: kbOpen ? "0" : "24px 24px 0 0",
                border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"}`,
                borderBottom: "none",
                boxShadow: isDark
                  ? "0 -12px 36px rgba(0,0,0,0.30), 0 0 16px hsl(var(--primary) / 0.055)"
                  : "0 -8px 24px rgba(15,23,42,0.08), 0 0 14px hsl(var(--primary) / 0.04)",
                overscrollBehavior: "contain",
                ...panelBg,
              }}>

              {/* Ручка */}
              <div
                className="flex cursor-grab justify-center pt-2 pb-1 shrink-0 active:cursor-grabbing"
                onPointerDown={(event) => {
                  haptic("light");
                  mobileDragControls.start(event);
                }}
                title="Потяни вниз, чтобы свернуть ARAY"
                aria-label="Потяни вниз, чтобы свернуть ARAY"
              >
                <div className="w-10 h-[3px] rounded-full" style={{ background: isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.12)" }} />
              </div>

              {/* Шапка */}
              <div className="flex items-center justify-between px-4 py-2 shrink-0">
                <div className="flex items-center gap-2">
                  <ArayIcon size={28} id="mhdr" />
                  <div>
                    <p className="text-[13px] font-semibold" style={{ color: txt }}>Арай</p>
                    <p className="text-[10px]" style={{ color: txtSub }}>
                      {speaking ? "Говорю..." : listening ? "Слушаю..." : voicePreparing ? "Включаю микрофон..." : loading ? "Думаю..." : "Онлайн"}
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
                  {(speaking || listening || voicePreparing) && (
                    <button
                      onClick={stopAllAray}
                      className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ color: speaking ? voiceSpeakingColor : voiceActiveColor }}
                      aria-label={speaking ? "Остановить голос ARAY" : "Остановить микрофон ARAY"}
                    >
                      {speaking ? <VolumeX className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
                    </button>
                  )}
                  <button onClick={resetArayChat}
                    className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ color: txtMuted }}>
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={closeArayPanel} aria-label="Свернуть ARAY" className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ color: txtMuted }}>
                    <ChevronDown className="w-4 h-4" />
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
                          ? `radial-gradient(circle, ${voiceActiveGlowStrong} 0%, transparent 70%)`
                          : speaking
                            ? `radial-gradient(circle, ${voiceSpeakingGlowStrong} 0%, transparent 70%)`
                            : `radial-gradient(circle, ${voiceIdleGlow} 0%, transparent 70%)`,
                      }} />
                      <ArayOrb size={120} id="mcenter" pulse={orbStatus} />
                    </div>

                    {/* Статус */}
                    <p className="text-[15px] font-medium" style={{
                      color: listening ? voiceActiveColor : speaking ? voiceSpeakingColor : txt,
                    }}>
                      {listening ? "Слушаю..." : voicePreparing ? "Включаю микрофон..." : speaking ? "Арай говорит..." : "Нажми — говори"}
                    </p>
                    {voiceNotice && (
                      <p className="max-w-[250px] text-center text-[12px] leading-snug" style={{ color: txtSub }}>
                        {voiceNotice}
                      </p>
                    )}

                    {/* Waveform */}
                    {(speaking || listening || voicePreparing) && (
                      <div className="flex gap-1 items-center h-8">
                        {[0,1,2,3,4,5,6,7,8].map(i => (
                          <motion.span key={i} className="w-1 rounded-full"
                            style={{ background: listening ? voiceActiveColor : voiceSpeakingColor }}
                            animate={{ height: [4, 14 + Math.random() * 10, 4] }}
                            transition={{ duration: 0.5 + Math.random() * 0.4, repeat: Infinity, delay: i * 0.06 }}
                          />
                        ))}
                      </div>
                    )}

                    {(speaking || listening || voicePreparing) && (
                      <button onClick={stopAllAray} className="text-[12px] px-4 py-1.5 rounded-full"
                        style={{ color: txtSub, background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)" }}>
                        {speaking ? "Остановить" : "Стоп"}
                      </button>
                    )}

                    {/* Последний ответ — компактно */}
                    {messages.length > 0 && !speaking && !listening && !voicePreparing && (
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
                        style={{ color: primaryColor, background: primarySoft, border: `1px solid ${primaryBorder}` }}>
                        <MessageSquare className="w-3 h-3" />
                        Переписка ({messages.length - 1})
                      </button>
                    )}

                    {isAdmin && (
                      <ArayAdminNavigationStrip
                        navigation={adminNavigation}
                        onOpenPage={handleOpenAdminPage}
                        isDark={isDark}
                      />
                    )}

                    {/* Чипы */}
                    {showSmartChips && (
                      <div className="flex max-w-full gap-2 flex-wrap justify-center mt-2">
                        {chips.slice(0, visibleChipLimit).map(q => (
                          <button key={q} onClick={() => handleChipClick(q)}
                            className="aray-quick-chip max-w-full whitespace-normal break-words text-center text-[12px] leading-snug px-4 py-2.5 rounded-full transition-all active:scale-95"
                            style={{ background: primarySoft, border: `1px solid ${primaryBorder}`, color: primaryColor }}>
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
                      <MessageBubble
                        key={m.id}
                        msg={m}
                        onAction={handleAction}
                        onConfirm={handleConfirmAction}
                        onCancelConfirm={handleCancelConfirmation}
                        onSpeak={speak}
                        onStopSpeak={stopAllAray}
                        speaking={speaking}
                        isDark={isDark}
                      />
                    ))}
                    {loading && (
                      <div className="flex gap-2 mb-3">
                        <ArayIcon size={24} id="ml" />
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
                {showMessages && showSmartChips && !loading && (
                  <div
                    className="mb-2 flex gap-2 overflow-x-auto pb-1"
                    data-no-page-swipe
                    style={{ scrollbarWidth: "none" }}
                  >
                    {chips.slice(0, visibleChipLimit).map((q) => (
                      <button
                        key={`mobile-input-${q}`}
                        type="button"
                        onClick={() => handleChipClick(q)}
                        className="aray-quick-chip shrink-0 whitespace-nowrap rounded-full px-3.5 py-2 text-[12px] leading-none transition-all active:scale-95"
                        style={{ background: primarySoft, border: `1px solid ${primaryBorder}`, color: primaryColor }}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                )}
                {attachments.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {attachments.map(file => (
                      <button
                        key={file.id}
                        type="button"
                        onClick={() => removeAttachment(file.id)}
                        className="group flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px]"
                        style={{ background: primarySoft, border: `1px solid ${primaryBorder}`, color: primaryColor }}
                        title="Убрать вложение"
                      >
                        <AttachmentKindIcon kind={file.kind} className="h-3 w-3 shrink-0" />
                        <span className="max-w-[150px] truncate">{file.name}</span>
                        <Trash2 className="h-3 w-3 shrink-0 opacity-60 transition-opacity group-hover:opacity-100" />
                      </button>
                    ))}
                  </div>
                )}
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
                          ? voiceListeningGradient
                          : primaryGradient,
                        boxShadow: listening
                          ? `0 0 24px ${voiceListeningGlow}`
                          : `0 4px 20px ${primaryGlow}`,
                      }}>
                      {listening && <span className="absolute inset-0 rounded-full animate-ping"
                        style={{ background: voiceListeningPulse, animationDuration: "1.2s" }} />}
                      {listening
                        ? <MicOff className="w-6 h-6 text-white relative z-10" />
                        : <Mic className="w-6 h-6 text-white relative z-10" />}
                    </button>
                    <div className="w-10" /> {/* spacer для центрирования */}
                  </div>
                ) : (
                  <div className="flex gap-2 items-end">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={attachmentsBusy || loading}
                      className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 relative disabled:opacity-45"
                      style={{ background: inputBg, border: `1px solid ${inputBorder}`, color: attachments.length ? primaryColor : txtSub }}
                      title="Добавить фото или файл"
                    >
                      {attachmentsBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
                    </button>
                    <button onClick={listening ? stopVoice : startVoice}
                      className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 relative"
                      style={{
                        background: listening ? voiceListeningGradient : inputBg,
                        border: `1px solid ${listening ? "transparent" : inputBorder}`,
                        boxShadow: listening ? `0 0 14px ${voiceListeningGlow}` : "none",
                      }}>
                      {listening && <span className="absolute inset-0 rounded-full animate-ping"
                        style={{ background: voiceListeningPulse, animationDuration: "1s" }} />}
                      {listening ? <MicOff className="w-4 h-4 text-white relative z-10" /> : <Mic className="w-4 h-4 relative z-10" style={{ color: txtSub }} />}
                    </button>
                    <textarea
                      ref={inputRef} value={input}
                      onChange={e => setInput(e.target.value)}
                      onPaste={handlePaste}
                      onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                      onFocus={() => { setShowMessages(true); setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 300); }}
                      inputMode="text"
                      enterKeyHint="send"
                      autoCapitalize="sentences"
                      autoCorrect="on"
                      spellCheck
                      rows={1} placeholder={listening ? "Слушаю..." : voicePreparing ? "Включаю микрофон..." : "Написать Араю..."}
                      className="flex-1 resize-none text-[16px] rounded-2xl px-3.5 py-2.5 focus:outline-none"
                      style={{ background: inputBg, border: `1px solid ${listening ? voiceListeningBorder : inputBorder}`, color: txt, maxHeight: "100px" }}
                    />
                    <button onClick={() => { haptic("light"); sendMessage(); }} disabled={loading || attachmentsBusy || (!input.trim() && attachments.length === 0)}
                      className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 disabled:opacity-40"
                      style={{
                        background: input.trim() || attachments.length ? primaryGradient : "hsl(var(--muted))",
                        boxShadow: input.trim() || attachments.length ? `0 4px 12px ${primaryGlow}` : "none",
                      }}>
                      {loading
                        ? <Loader2 className="w-4 h-4 animate-spin" style={{ color: "hsl(var(--muted-foreground))" }} />
                        : <Send className="w-4 h-4" style={{ color: input.trim() || attachments.length ? "hsl(var(--primary-foreground))" : "hsl(var(--muted-foreground))" }} />}
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
