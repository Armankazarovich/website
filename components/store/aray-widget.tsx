"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import type { Dispatch, SetStateAction } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import { Send, Loader2, RotateCcw, Mic, MicOff, ShoppingCart, ExternalLink, LayoutGrid, Package, MapPin, Phone, PhoneCall, Video, Share2, Copy, Volume2, VolumeX, MessageSquare, ChevronDown, ChevronLeft, ShieldCheck, CheckCircle2, XCircle, Paperclip, FileText, Image as ImageIcon, Trash2, FileAudio, Film, FileArchive, Settings2, Target, Bot, Megaphone, BarChart3, MousePointer2, Wallet, Gift, CreditCard, Landmark, UserPlus, X } from "lucide-react";
import { buildArayGreeting, buildArayChips } from "@/lib/aray-client-ui";
import { ArayIcon, ArayOrb } from "@/components/shared/aray-orb";
import { useCartStore } from "@/store/cart";
import { formatPrice } from "@/lib/utils";
import { ArayBrowser, type ArayBrowserAction } from "@/components/store/aray-browser";
import { useTheme } from "next-themes";
import { getArayContext, initArayTracker } from "@/lib/aray-tracker";
import { playAraySpeech, speakAraySpeechBrowser, stopAraySpeech } from "@/lib/aray-audio";
import {
  canUseArayTtsProxy,
  hasBrowserVoiceFor,
  inferRequestedLanguage,
  normalizeArayHumanInput,
  resolveAraySpeechLanguage,
} from "@/lib/aray-language";
import { prepareAraySpeechText } from "@/lib/aray-speech";
import {
  createAraySyncSource,
  notifyArayHistoryUpdated,
  notifyArayStop,
  subscribeArayHistoryUpdated,
  subscribeArayStop,
} from "@/lib/aray-sync";
import { useAdminOverlayGuard } from "@/lib/use-admin-overlay-guard";
import {
  buildArayBusinessMessengerModeContext,
  buildArayBusinessMessengerPrompt,
  buildArayBusinessMessengerText,
  getArayBusinessMessengerModeTitle,
  isArayGuideRequest,
  isArayBusinessMessengerRequest,
  type ArayBusinessMessengerMode,
} from "@/lib/aray-business-messenger";
import { resolveArayVoiceCommand, type ArayVoiceCommand } from "@/lib/aray-voice-command-os";
import type { AdminArayNavigationContext, AdminArayPageLink } from "@/components/admin/admin-aray-navigation";
import {
  ArayEmbeddedMessenger,
  type ArayEmbeddedMessengerContext,
  type ArayEmbeddedMessengerPrompt,
} from "@/components/store/aray-embedded-messenger";
import { isArayExternalTabOnly } from "@/lib/aray-navigation";
import { createArayMeetingUrl, createStableArayNumber, formatArayPublicNumber } from "@/lib/aray-communication-identity";

const ARAY_WIDGET_SOURCE = createAraySyncSource("aray-widget");
const ARAY_MAX_SMART_CHIPS = 6;
const ARAY_START_SMART_CHIPS = 3;
const ARAY_VISIBLE_HISTORY_LIMIT = 8;
const ARAY_HISTORY_COMPACT_AFTER = 11;
const ARAY_LONG_MESSAGE_LIMIT = 620;
const ARAY_LOCAL_HISTORY_KEY = "aray-chat-history-v1";
const ARAY_PANEL_STATE_KEY = "aray-panel-state-v1";
const ARAY_PHONE_HOME_OPEN_KEY = "aray-phone-home-open-v1";
const ARAY_PHONE_HOME_DEFAULT_VERSION_KEY = "aray-phone-home-default-version-v1";
const ARAY_PHONE_HOME_DEFAULT_VERSION = "2026-05-25-ar-phone-open";
const ARAY_PHONE_OWNER_ID_KEY = "aray-phone-owner-id-v1";
const ARAY_VIDEO_MEETING_BASE_URL =
  process.env.NEXT_PUBLIC_ARAY_VIDEO_MEETING_BASE_URL ||
  process.env.NEXT_PUBLIC_ARAY_MEETING_BASE_URL ||
  "https://meet.jit.si";

// ─── Haptic / Vibration ──────────────────────────────────────────────────────
function haptic(style: "light" | "medium" | "heavy" = "light") {
  if (typeof navigator === "undefined" || !navigator.vibrate) return;
  const ms = style === "heavy" ? 30 : style === "medium" ? 15 : 8;
  try { navigator.vibrate(ms); } catch {}
}

async function writeArayClipboardText(text: string) {
  if (!text.trim()) return false;

  try {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {}

  try {
    const field = document.createElement("textarea");
    field.value = text;
    field.setAttribute("readonly", "true");
    field.style.position = "fixed";
    field.style.left = "-9999px";
    field.style.top = "0";
    document.body.appendChild(field);
    field.focus();
    field.select();
    const copied = document.execCommand("copy");
    document.body.removeChild(field);
    return copied;
  } catch {
    return false;
  }
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

type ArayLiveAction = {
  id: string;
  label: string;
  detail?: string;
  kind: "open" | "show" | "write" | "confirm" | "voice" | "file";
};

const SILENT_LIVE_ACTION_LABELS = new Set(["ARAY открыт", "AR Phone открыт"]);

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

type ArayStoryContextPayload = {
  storyId?: string;
  storyTitle?: string;
  storyType?: "IMAGE" | "VIDEO" | "LIVE" | string;
  kind?: "question" | "offer" | "review" | "comment" | string;
  kindLabel?: string;
  text?: string;
  relationName?: string | null;
  attachmentsCount?: number;
  reply?: string;
  sourceAction?: "open" | "submitted";
};

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
  __arayPendingOpen?: "open" | "voice" | "phone";
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
  if (target.startsWith("//")) return "";

  try {
    const parsed = new URL(
      target,
      typeof window !== "undefined" ? window.location.origin : "https://pilo-rus.ru",
    );
    if (!["http:", "https:", "tel:", "mailto:"].includes(parsed.protocol)) return "";
    const path = parsed.pathname.replace(/\/+$/, "");
    const isBareMetrikaGoals =
      parsed.hostname === "metrika.yandex.ru" &&
      path === "/goals" &&
      !parsed.searchParams.has("counter_id") &&
      !parsed.searchParams.has("id");

    if (isBareMetrikaGoals) return "https://metrika.yandex.ru/list";
    if (parsed.origin === (typeof window !== "undefined" ? window.location.origin : "https://pilo-rus.ru")) {
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
    return parsed.href;
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

function isArayNavigationNoise(message: Message) {
  if (message.role !== "assistant" || message.actions?.length || message.confirmations?.length) return false;
  const content = String(message.content || "").replace(/\s+/g, " ").trim();
  return [
    "Открыл диалоги внутри Арая",
    "Открыл добавление контакта внутри Арая",
    "Перешёл в «",
    "Открыл «",
    "Открыл видеокомнату",
    "Ссылка встречи",
  ].some((marker) => content.startsWith(marker));
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

function mapLocalHistoryMessages(messages: any[]): Message[] {
  return messages
    .map((m: any) => {
      const role = m.role === "user" ? "user" : "assistant";
      const content = String(m.content || "");
      if (!content.trim()) return null;
      return {
        id: String(m.id || `${role}-${m.timestamp || Date.now()}`),
        role,
        content: role === "assistant" ? normalizeAraySelfReferences(content) : content,
        timestamp: new Date(m.timestamp || Date.now()),
        streaming: false,
      } satisfies Message;
    })
    .filter(Boolean) as Message[];
}

function readLocalArayHistory(): Message[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(ARAY_LOCAL_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? mapLocalHistoryMessages(parsed) : [];
  } catch {
    return [];
  }
}

function writeLocalArayHistory(messages: Message[]) {
  if (typeof window === "undefined") return;
  try {
    const compact = messages
      .filter((message) => !message.streaming && message.content.trim())
      .filter((message) => !isArayNavigationNoise(message))
      .slice(-50)
      .map((message) => ({
        id: message.id,
        role: message.role,
        content: message.content,
        timestamp: message.timestamp.toISOString(),
      }));
    window.localStorage.setItem(ARAY_LOCAL_HISTORY_KEY, JSON.stringify(compact));
  } catch {}
}

// ─── Парсим ARAY_ACTIONS из текста ответа ────────────────────────────────────
function parseMessageActions(raw: string): { text: string; actions: ArayAction[] } {
  const marker = "ARAY_ACTIONS:";
  const idx = raw.indexOf(marker);
  if (idx === -1) return { text: raw, actions: [] };
  const text = raw.slice(0, idx).trim();
  const rest = raw.slice(idx + marker.length);
  const nextMarker = rest.search(/\n__ARAY_META__|__ARAY_ERR__|__ARAY_ADD_CART:|__ARAY_NAVIGATE:|__ARAY_POPUP:|__ARAY_SHOW_URL:|__ARAY_REFRESH__/);
  const jsonStr = (nextMarker >= 0 ? rest.slice(0, nextMarker) : rest).trim();
  const after = nextMarker >= 0 ? rest.slice(nextMarker) : "";
  try {
    const actions = JSON.parse(jsonStr) as ArayAction[];
    return { text: `${text}${after}`, actions };
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
    const fallback = [
      before.trim(),
      "Не удалось прочитать карточку подтверждения. Повтори действие, я подготовлю её заново.",
    ].filter(Boolean).join("\n");
    return { text: fallback, confirmations: [] };
  }
}

function isTranslationRequest(text: string): boolean {
  const normalized = text.toLowerCase();
  return /\btranslate\b/i.test(text) || /перев[её]д|перевести|переведи|на\s+(китай|армян|англ|немец|француз|испан|турец|араб|япон|корей|грузин|итальян|португал|польск|греческ|иврит|хинди)/i.test(normalized);
}

function normalizeTranslationReply(text: string, request: string): string {
  if (!isTranslationRequest(request)) return text;
  const cleaned = text
    .trim()
    .replace(/\n+\((?:[^)]{1,180})\)\s*$/g, "")
    .replace(/\s+\((?:[A-Za-zÀ-žĀ-ſḀ-ỿ\s'`,.-]{2,180})\)\s*$/g, "")
    .replace(/^(?:перевод|вот перевод|на [^:：]{2,40})[:：]\s*/i, "")
    .trim();
  return cleaned || text;
}

function getLatestPendingConfirmation(messages: Message[]): ArayConfirmationDraft | null {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const confirmations = messages[i]?.confirmations;
    if (confirmations?.length) return confirmations[0];
  }
  return null;
}

function isConfirmationReply(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  return /^(да|ага|ок|окей|подтверждаю|подтвердить|создай|выполняй|запускай|можно|\+)$/i.test(normalized);
}

function stripArayControlText(raw: string) {
  return raw
    .replace(/\n__ARAY_CONFIRM__[\s\S]*?(?=\n__ARAY_META__|$)/g, "")
    .replace(/\n?ARAY_ACTIONS:\[[\s\S]*?\](?=\n__ARAY_META__|\n__ARAY_ERR__|\n__ARAY_ADD_CART:|\n__ARAY_NAVIGATE:|\n__ARAY_POPUP:|\n__ARAY_SHOW_URL:|\n__ARAY_REFRESH__|$)/g, "")
    .replace(/\n__ARAY_META__[\s\S]*$/, "")
    .replace(/__ARAY_ERR__[\s\S]*$/, "")
    .replace(/__ARAY_ADD_CART:.+?__/g, "")
    .replace(/__ARAY_NAVIGATE:.+?__/g, "")
    .replace(/__ARAY_POPUP:\{.+?\}__/g, "")
    .replace(/__ARAY_SHOW_URL:[\s\S]+?__/g, "")
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
    .replace(/\n?ARAY_ACTIONS:\[[\s\S]*?\](?=\n__ARAY_META__|\n__ARAY_ERR__|\n__ARAY_ADD_CART:|\n__ARAY_NAVIGATE:|\n__ARAY_POPUP:|\n__ARAY_SHOW_URL:|\n__ARAY_REFRESH__|$)/g, "")
    .replace(/__ARAY_ADD_CART:.+?__/g, "")
    .replace(/__ARAY_NAVIGATE:.+?__/g, "")
    .replace(/__ARAY_POPUP:\{.+?\}__/g, "")
    .replace(/__ARAY_SHOW_URL:[\s\S]+?__/g, "")
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
      dataUrl: file.size <= 12 * 1024 * 1024 ? await readFileAsDataUrl(file) : undefined,
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
  const parts = text.split(/(\*\*[^*\n]+\*\*|\*[^*\n]+\*|`[^`\n]+`|\[[^\]\n]+\]\([^)]+\))/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**"))
      return <strong key={i} className="font-semibold" style={{ color: "inherit" }}>{p.slice(2, -2)}</strong>;
    if (p.startsWith("*") && p.endsWith("*"))
      return <em key={i}>{p.slice(1, -1)}</em>;
    if (p.startsWith("`") && p.endsWith("`"))
      return <code key={i} className="px-1 py-0.5 rounded text-[11px] font-mono"
        style={{ background: "hsl(var(--muted))", color: "hsl(var(--primary))" }}>{p.slice(1, -1)}</code>;
    const link = p.match(/^\[([^\]\n]+)\]\(([^)]+)\)$/);
    if (link) {
      const href = link[2].trim();
      return (
        <a
          key={i}
          href={href}
          target={href.startsWith("/") ? undefined : "_blank"}
          rel={href.startsWith("/") ? undefined : "noreferrer"}
          className="font-semibold underline decoration-primary/35 underline-offset-2 transition-colors hover:text-primary"
        >
          {link[1]}
        </a>
      );
    }
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
    case "wallet": return <Wallet className={cls} />;
    case "bonus": return <Gift className={cls} />;
    case "payment": return <CreditCard className={cls} />;
    case "bank": return <Landmark className={cls} />;
    case "contact": return <UserPlus className={cls} />;
    case "chat": return <MessageSquare className={cls} />;
    default:        return <ExternalLink className={cls} />;
  }
}

const ARAY_PHONE_CHAT_ACTION: ArayAction = { type: "navigate", url: "/admin/messenger", label: "Чаты", icon: "chat" };
const ARAY_PHONE_CONTACT_ACTION: ArayAction = { type: "navigate", url: "/admin/messenger?add=contact", label: "Контакт", icon: "contact" };
const ARAY_PHONE_ACCOUNT_ACTION: ArayAction = { type: "navigate", url: "/admin/settings", label: "Аккаунт", icon: "settings" };

function ArayPhoneShortcutPad({
  onAction,
  onDial,
  onCopyOwnNumber,
  onShareOwnNumber,
  onStartOwnVideo,
  onCopyVideoInvite,
  onClose,
  isDark,
  primaryColor,
  primarySoft,
  primaryBorder,
  txtSub,
  txt,
  now,
  ownNumber,
  compact = false,
}: {
  onAction: (action: ArayAction) => void;
  onDial: (value: string) => void;
  onCopyOwnNumber: () => void;
  onShareOwnNumber: () => void;
  onStartOwnVideo: () => void;
  onCopyVideoInvite: () => void;
  onClose: () => void;
  isDark: boolean;
  primaryColor: string;
  primarySoft: string;
  primaryBorder: string;
  txtSub: string;
  txt: string;
  now: Date | null;
  ownNumber: string;
  compact?: boolean;
}) {
  const [dialValue, setDialValue] = useState("");
  const [dialOpen, setDialOpen] = useState(false);
  const timeText = now
    ? now.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
    : "--:--";
  const dateText = now
    ? now.toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" })
    : "Сегодня";
  const publicNumber = formatArayPublicNumber(ownNumber);
  const phoneActions = [
    {
      label: "Чаты",
      hint: "переписка",
      icon: <MessageSquare className="h-4 w-4" />,
      onClick: () => {
        setDialOpen(false);
        onAction(ARAY_PHONE_CHAT_ACTION);
      },
      active: !dialOpen,
    },
    {
      label: "Набрать",
      hint: "номер",
      icon: <PhoneCall className="h-4 w-4" />,
      onClick: () => {
        setDialOpen((value) => !value);
      },
      active: dialOpen,
    },
    {
      label: "Видео",
      hint: "встреча",
      icon: <Video className="h-4 w-4" />,
      onClick: () => {
        onStartOwnVideo();
        setDialOpen(false);
      },
      active: false,
    },
    {
      label: "Пригласить",
      hint: "контакт",
      icon: <UserPlus className="h-4 w-4" />,
      onClick: () => onAction(ARAY_PHONE_CONTACT_ACTION),
    },
    {
      label: "Поделиться",
      hint: "мой номер",
      icon: <Share2 className="h-4 w-4" />,
      onClick: onShareOwnNumber,
    },
    {
      label: "Аккаунт",
      hint: "настройки",
      icon: <Settings2 className="h-4 w-4" />,
      onClick: () => onAction(ARAY_PHONE_ACCOUNT_ACTION),
    },
  ];
  const externalChannels = [
    {
      key: "telegram",
      label: "Telegram",
      hint: "браузер",
      logo: "TG",
      accent: "hsl(200 92% 55%)",
      onClick: () => {
        setDialOpen(false);
        onAction({ type: "navigate", url: "https://web.telegram.org/a/", label: "Telegram", icon: "chat" });
      },
    },
    {
      key: "whatsapp",
      label: "WhatsApp",
      hint: "браузер",
      logo: "WA",
      accent: "hsl(142 70% 45%)",
      onClick: () => {
        setDialOpen(false);
        onAction({ type: "navigate", url: "https://web.whatsapp.com/", label: "WhatsApp", icon: "chat" });
      },
    },
    {
      key: "zangi",
      label: "Zangi",
      hint: "сайт",
      logo: "ZA",
      accent: "hsl(258 86% 66%)",
      onClick: () => {
        setDialOpen(false);
        onAction({ type: "navigate", url: "https://zangi.com/", label: "Zangi", icon: "chat" });
      },
    },
    {
      key: "email",
      label: "Почта",
      hint: "центр",
      logo: "@",
      accent: primaryColor,
      onClick: () => {
        setDialOpen(false);
        onAction({ type: "navigate", url: "/admin/email", label: "Почта", icon: "direct" });
      },
    },
    {
      key: "mailings",
      label: "Рассылки",
      hint: "центр",
      logo: "RS",
      accent: "hsl(32 95% 52%)",
      onClick: () => {
        setDialOpen(false);
        onAction({ type: "navigate", url: "/admin/notifications", label: "Рассылки", icon: "direct" });
      },
    },
    {
      key: "meet",
      label: "Meet",
      hint: "попап",
      logo: "JV",
      accent: "hsl(184 78% 44%)",
      onClick: () => {
        setDialOpen(false);
        onStartOwnVideo();
      },
    },
  ];

  if (compact) {
    return (
      <div
        className="mb-3 w-full max-w-[430px] rounded-[22px] p-2"
        style={{
          background: "linear-gradient(135deg, hsl(var(--card) / 0.82), hsl(var(--background) / 0.64))",
          border: `1px solid ${primaryBorder}`,
          boxShadow: "inset 0 1px 0 hsl(var(--foreground) / 0.05)",
        }}
      >
        <div className="flex items-center gap-2">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl"
            style={{ color: primaryColor, background: primarySoft }}
          >
            <Phone className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-bold leading-none" style={{ color: txt }}>AR Phone</p>
            <p className="mt-1 truncate text-[11px] font-bold leading-none" style={{ color: primaryColor }}>{publicNumber}</p>
          </div>
          <button
            type="button"
            onClick={onCopyOwnNumber}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl transition hover:bg-muted/40"
            style={{ color: txtSub, border: `1px solid ${primaryBorder}` }}
            aria-label="Скопировать номер"
            title="Скопировать номер"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onShareOwnNumber}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl transition hover:brightness-110"
            style={{ color: primaryColor, background: primarySoft, border: `1px solid ${primaryBorder}` }}
            aria-label="Поделиться номером"
            title="Поделиться номером"
          >
            <Share2 className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-1">
          {phoneActions.slice(0, 3).map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={item.onClick}
              className="inline-flex min-h-9 min-w-0 items-center justify-center gap-1.5 rounded-[15px] px-2 text-[10px] font-bold transition hover:bg-muted/40"
              style={{
                color: item.active ? primaryColor : txt,
                background: item.active ? primarySoft : "hsl(var(--background) / 0.42)",
                border: `1px solid ${item.active ? primaryBorder : "hsl(var(--border) / 0.68)"}`,
              }}
            >
              {item.icon}
              <span className="truncate">{item.label}</span>
            </button>
          ))}
        </div>
        <div data-aray-phone-integrations className="mt-2 grid grid-cols-2 gap-1">
          {externalChannels.map((item) => (
            <button
              key={item.key}
              type="button"
              data-aray-phone-channel={item.key}
              onClick={item.onClick}
              className="flex min-h-10 min-w-0 items-center gap-2 rounded-2xl px-2 text-left transition hover:scale-[1.015] active:scale-[0.98]"
              style={{
                background: "hsl(var(--background) / 0.48)",
                border: `1px solid ${primaryBorder}`,
              }}
              aria-label={`Открыть ${item.label}`}
              title={`${item.label} · ${item.hint}`}
            >
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-2xl text-[9px] font-black"
                style={{
                  color: item.accent,
                  background: "hsl(var(--foreground) / 0.045)",
                  boxShadow: `inset 0 0 0 1px ${item.accent}`,
                }}
              >
                {item.logo}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[10px] font-bold leading-none" style={{ color: txt }}>
                  {item.label}
                </span>
                <span className="mt-1 block truncate text-[8.5px] font-semibold leading-none" style={{ color: txtSub }}>
                  {item.hint}
                </span>
              </span>
            </button>
          ))}
        </div>
        {dialOpen && (
          <div className="mt-2 flex gap-1.5">
            <input
              value={dialValue}
              onChange={(event) => setDialValue(event.target.value.toUpperCase())}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  onDial(dialValue);
                }
              }}
              className="min-w-0 flex-1 rounded-2xl px-3 py-2 text-[12px] font-semibold outline-none"
              style={{ background: "hsl(var(--card) / 0.74)", border: `1px solid ${primaryBorder}`, color: txt }}
              placeholder="6229 16 33"
              aria-label="Внутренний номер или телефон"
            />
            <button
              type="button"
              onClick={() => onDial(dialValue)}
              disabled={!dialValue.trim()}
              className="inline-flex shrink-0 items-center justify-center rounded-2xl px-3 text-[11px] font-bold transition disabled:opacity-40"
              style={{ color: "hsl(var(--primary-foreground))", background: primaryColor }}
            >
              <Phone className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className="w-full max-w-[344px] rounded-[26px] p-2.5"
      style={{
        background: isDark
          ? "linear-gradient(180deg, hsl(var(--foreground) / 0.045), hsl(var(--foreground) / 0.022))"
          : "linear-gradient(180deg, hsl(var(--foreground) / 0.040), hsl(var(--foreground) / 0.018))",
        border: "1px solid hsl(var(--foreground) / 0.045)",
        boxShadow: "inset 0 1px 0 hsl(var(--foreground) / 0.055)",
      }}
    >
      <div className="mb-2 flex items-center justify-between gap-2 px-1">
        <div className="min-w-0">
          <p className="truncate text-[12.5px] font-bold leading-none" style={{ color: txt }}>AR Phone</p>
          <p className="mt-1 truncate text-[9.5px] leading-none capitalize" style={{ color: txtSub }}>
            {timeText} · {dateText}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="rounded-full px-2 py-1 text-[9.5px] font-semibold leading-none"
            style={{ color: primaryColor, background: primarySoft }}
          >
            online
          </span>
          <button
            type="button"
            onClick={() => onAction(ARAY_PHONE_ACCOUNT_ACTION)}
            className="flex h-6 w-6 items-center justify-center rounded-full transition hover:bg-muted/40"
            style={{ color: txtSub }}
            aria-label="Аккаунт AR Phone"
            title="Аккаунт AR Phone"
          >
            <Settings2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex h-6 w-6 items-center justify-center rounded-full transition hover:bg-muted/40"
            style={{ color: txtSub }}
            aria-label="Скрыть AR Phone"
            title="Скрыть AR Phone"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <div
        className="mb-2 overflow-hidden rounded-[22px] px-3 py-2.5"
        style={{
          background: `radial-gradient(circle at 12% 0%, ${primarySoft}, transparent 46%), hsl(var(--foreground) / 0.028)`,
          border: "1px solid hsl(var(--foreground) / 0.045)",
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[9.5px] font-semibold uppercase tracking-[0.12em]" style={{ color: txtSub }}>мой номер</p>
            <p className="mt-1 whitespace-nowrap text-[25px] font-bold leading-none tracking-normal" style={{ color: primaryColor }}>
              {publicNumber}
            </p>
            <p className="mt-1 text-[10.5px] leading-4" style={{ color: txtSub }}>
              Отправьте номер или приглашение, чтобы вам написали или позвонили.
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-1.5">
            <button
              type="button"
              onClick={onCopyOwnNumber}
              className="inline-flex h-8 w-8 items-center justify-center rounded-2xl transition hover:bg-muted/40"
              style={{ color: txt, background: "hsl(var(--background) / 0.48)", border: "1px solid hsl(var(--foreground) / 0.055)" }}
              aria-label="Скопировать номер"
              title="Скопировать номер"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={onShareOwnNumber}
              className="inline-flex h-8 w-8 items-center justify-center rounded-2xl transition hover:brightness-110"
              style={{ color: primaryColor, background: primarySoft, border: "1px solid hsl(var(--foreground) / 0.055)" }}
              aria-label="Поделиться номером"
              title="Поделиться номером"
            >
              <Share2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {phoneActions.slice(0, 3).map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={item.onClick}
            className="group inline-flex min-h-11 min-w-0 items-center justify-center gap-1.5 rounded-[17px] px-2 text-[11px] font-bold transition active:scale-[0.98]"
            style={{
              color: item.active ? "hsl(var(--primary-foreground))" : txtSub,
              background: item.active ? primaryColor : "hsl(var(--foreground) / 0.026)",
              border: item.active ? "1px solid transparent" : "1px solid hsl(var(--foreground) / 0.06)",
            }}
          >
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-2xl transition group-hover:scale-105"
              style={{
                color: item.active ? "hsl(var(--primary-foreground))" : primaryColor,
                background: item.active ? "hsl(var(--primary-foreground) / 0.14)" : primarySoft,
              }}
            >
              {item.icon}
            </span>
            <span className="min-w-0 truncate">{item.label}</span>
          </button>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-center gap-1.5">
        {phoneActions.slice(3).map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={item.onClick}
            className="inline-flex min-h-8 min-w-0 items-center justify-center gap-1.5 rounded-full px-2 text-[9.5px] font-semibold transition hover:bg-muted/40"
            style={{
              color: txtSub,
              background: "transparent",
              border: "1px solid transparent",
            }}
          >
            {item.icon}
            <span className="truncate">{item.label}</span>
          </button>
        ))}
      </div>
      <div
        data-aray-phone-integrations
        className="mt-2 rounded-[20px] p-2"
        style={{
          background: "hsl(var(--background) / 0.48)",
          border: `1px solid ${primaryBorder}`,
        }}
      >
        <div className="mb-1.5 flex items-center justify-between gap-2 px-1">
          <span className="text-[9.5px] font-bold uppercase tracking-[0.12em]" style={{ color: txtSub }}>
            Внешние каналы
          </span>
          <span className="truncate text-[9.5px] font-semibold" style={{ color: primaryColor }}>
            через Арай
          </span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {externalChannels.map((item) => (
            <button
              key={item.key}
              type="button"
              data-aray-phone-channel={item.key}
              onClick={item.onClick}
              className="group flex min-h-12 min-w-0 items-center gap-2 rounded-[16px] px-2.5 text-left transition hover:bg-muted/40 active:scale-[0.98]"
              style={{ border: "1px solid hsl(var(--foreground) / 0.055)" }}
              aria-label={`Открыть ${item.label}`}
              title={`${item.label} · ${item.hint}`}
            >
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-2xl text-[9px] font-black tracking-normal transition group-hover:scale-105"
                style={{
                  color: item.accent,
                  background: "hsl(var(--foreground) / 0.045)",
                  boxShadow: `inset 0 0 0 1px ${item.accent}`,
                }}
              >
                {item.logo}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[10.5px] font-bold leading-none" style={{ color: txt }}>
                  {item.label}
                </span>
                <span className="mt-1 block truncate text-[9px] font-semibold leading-none" style={{ color: txtSub }}>
                  {item.hint}
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>
      {dialOpen && (
        <div
          className="mt-2 rounded-[20px] p-2"
          style={{
            background: "hsl(var(--background) / 0.56)",
            border: `1px solid ${primaryBorder}`,
          }}
        >
          <div className="mb-1 flex items-center justify-between gap-2 px-1">
            <span className="text-[9.5px] font-semibold uppercase tracking-[0.12em]" style={{ color: txtSub }}>
              Набрать номер
            </span>
            <span className="text-[9.5px] font-semibold" style={{ color: primaryColor }}>
              номер или телефон
            </span>
          </div>
          <div className="flex gap-1.5">
            <input
              value={dialValue}
              onChange={(event) => setDialValue(event.target.value.toUpperCase())}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  onDial(dialValue);
                }
              }}
              className="min-w-0 flex-1 rounded-2xl px-3 py-2 text-[12px] font-semibold outline-none transition focus:ring-2 focus:ring-primary/20"
              style={{
                background: "hsl(var(--card) / 0.74)",
                border: `1px solid ${primaryBorder}`,
                color: txt,
              }}
              placeholder="Например: 6229 16 33"
              aria-label="Внутренний номер или телефон"
            />
            <button
              type="button"
              onClick={() => onDial(dialValue)}
              disabled={!dialValue.trim()}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-2xl px-3 py-2 text-[11px] font-bold transition hover:brightness-110 disabled:opacity-40"
              style={{ color: "hsl(var(--primary-foreground))", background: primaryColor }}
            >
              <Phone className="h-3.5 w-3.5" />
              Звонить
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ArayWorkspaceBridge({
  onOpenMessenger,
  onOpenPhone,
  phoneOpen,
  contextLabel,
  primaryColor,
  primarySoft,
  primaryBorder,
  txt,
  txtSub,
}: {
  onOpenMessenger: () => void;
  onOpenPhone: () => void;
  phoneOpen: boolean;
  contextLabel?: string;
  primaryColor: string;
  primarySoft: string;
  primaryBorder: string;
  txt: string;
  txtSub: string;
}) {
  return (
    <div
      className="w-full max-w-[372px] rounded-2xl p-1.5"
      style={{
        background: "hsl(var(--background) / 0.46)",
        border: `1px solid ${primaryBorder}`,
      }}
    >
      <div className="grid grid-cols-3 gap-1">
        <button
          type="button"
          className="min-w-0 rounded-xl px-2 py-2 text-left transition hover:bg-muted/40"
          style={{ color: txt }}
          aria-current="true"
        >
          <span className="flex items-center gap-1.5 text-[10.5px] font-bold leading-none">
            <Bot className="h-3 w-3 shrink-0" />
            <span className="truncate">Личный Арай</span>
          </span>
          <span className="mt-1 block truncate text-[9.5px]" style={{ color: txtSub }}>клиент не видит</span>
        </button>
        <button
          type="button"
          onClick={onOpenMessenger}
          className="min-w-0 rounded-xl px-2 py-2 text-left transition hover:bg-muted/40"
          style={{ color: txtSub }}
        >
          <span className="flex items-center gap-1.5 text-[10.5px] font-bold leading-none">
            <MessageSquare className="h-3 w-3 shrink-0" />
            <span className="truncate">Диалоги</span>
          </span>
          <span className="mt-1 block truncate text-[9.5px]" style={{ color: txtSub }}>
            {contextLabel ? `рядом: ${contextLabel}` : "клиенты и CRM"}
          </span>
        </button>
        <button
          type="button"
          onClick={onOpenPhone}
          className="min-w-0 rounded-xl px-2 py-2 text-left transition hover:bg-muted/40"
          style={{
            color: phoneOpen ? primaryColor : txtSub,
            background: phoneOpen ? primarySoft : "transparent",
            boxShadow: phoneOpen ? `inset 0 0 0 1px ${primaryBorder}` : "none",
          }}
        >
          <span className="flex items-center gap-1.5 text-[10.5px] font-bold leading-none">
            <Phone className="h-3 w-3 shrink-0" />
            <span className="truncate">AR Phone</span>
          </span>
          <span className="mt-1 block truncate text-[9.5px]" style={{ color: phoneOpen ? primaryColor : txtSub }}>
            {phoneOpen ? "на экране" : "показать"}
          </span>
        </button>
      </div>
    </div>
  );
}

function ArayMessengerModeSwitch({
  mode,
  onChange,
}: {
  mode: ArayBusinessMessengerMode;
  onChange: (mode: ArayBusinessMessengerMode) => void;
}) {
  const items: Array<{ mode: ArayBusinessMessengerMode; label: string; icon: "prompt" | "target" }> = [
    { mode: "compose", label: "Как написать", icon: "prompt" },
    { mode: "guide", label: "Проведи меня", icon: "target" },
  ];

  return (
    <div
      className="flex max-w-full items-center gap-1 rounded-full p-1"
      style={{
        background: "hsl(var(--muted) / 0.30)",
        border: "1px solid hsl(var(--border) / 0.70)",
      }}
    >
      {items.map((item) => {
        const active = item.mode === mode;
        return (
          <button
            key={item.mode}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(item.mode)}
            className="inline-flex min-h-8 min-w-0 items-center justify-center gap-1.5 rounded-full px-3 text-[11.5px] font-semibold leading-none transition-all hover:bg-muted/40 active:scale-[0.97]"
            style={{
              background: active ? "hsl(var(--primary) / 0.14)" : "transparent",
              color: active ? "hsl(var(--primary))" : "hsl(var(--foreground) / 0.66)",
              boxShadow: active ? "inset 0 0 0 1px hsl(var(--primary) / 0.28)" : "none",
            }}
          >
            <ActionIcon icon={item.icon} />
            <span className="truncate">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
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
  { href: "/admin/messenger", keywords: ["мессендж", "чат", "переписк", "сообщен"] },
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
  "/admin/messenger": ["мессенджер", "чат", "переписка", "сообщения", "арай чат", "бизнес чат"],
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

const ADMIN_NAV_FALLBACK_META: Record<string, { label: string; group: string; groupLabel: string }> = {
  "/admin": { label: "Рабочий стол", group: "dashboard", groupLabel: "Главное" },
  "/admin/orders": { label: "Заказы", group: "sales", groupLabel: "Продажи" },
  "/admin/orders/new": { label: "Терминал", group: "sales", groupLabel: "Продажи" },
  "/admin/messenger": { label: "Мессенджер", group: "sales", groupLabel: "Продажи" },
  "/admin/tasks": { label: "Задачи", group: "team", groupLabel: "Команда" },
  "/admin/products": { label: "Каталог", group: "catalog", groupLabel: "Каталог" },
  "/admin/categories": { label: "Категории", group: "catalog", groupLabel: "Каталог" },
  "/admin/inventory": { label: "Склад", group: "catalog", groupLabel: "Каталог" },
  "/admin/clients": { label: "Клиенты", group: "crm", groupLabel: "CRM" },
  "/admin/crm": { label: "CRM", group: "crm", groupLabel: "CRM" },
  "/admin/delivery": { label: "Доставка", group: "orders", groupLabel: "Заказы" },
  "/admin/analytics": { label: "Аналитика", group: "growth", groupLabel: "Рост" },
  "/admin/finance": { label: "Финансы", group: "finance", groupLabel: "Финансы" },
  "/admin/promotion": { label: "Продвижение", group: "growth", groupLabel: "Рост" },
  "/admin/promotions": { label: "Акции", group: "growth", groupLabel: "Рост" },
  "/admin/reviews": { label: "Отзывы", group: "growth", groupLabel: "Рост" },
  "/admin/email": { label: "Рассылки", group: "growth", groupLabel: "Рост" },
  "/admin/notifications": { label: "Уведомления", group: "growth", groupLabel: "Рост" },
  "/admin/settings": { label: "Настройки", group: "system", groupLabel: "Система" },
  "/admin/site": { label: "Сайт", group: "site", groupLabel: "Сайт" },
  "/admin/appearance": { label: "Оформление", group: "site", groupLabel: "Сайт" },
  "/admin/aray": { label: "ARAY", group: "aray", groupLabel: "ARAY" },
  "/admin/aray/agents": { label: "Агенты ARAY", group: "aray", groupLabel: "ARAY" },
  "/admin/aray/connectors": { label: "Подключения", group: "aray", groupLabel: "ARAY" },
  "/admin/aray/costs": { label: "Расходы ARAY", group: "aray", groupLabel: "ARAY" },
  "/admin/aray/modules": { label: "Модули ARAY", group: "aray", groupLabel: "ARAY" },
};

function createAdminFallbackPage(href: string): AdminArayPageLink {
  const baseHref = href.split("?")[0];
  const meta = ADMIN_NAV_FALLBACK_META[href] ?? ADMIN_NAV_FALLBACK_META[baseHref] ?? {
    label: baseHref.split("/").filter(Boolean).pop()?.replace(/-/g, " ") || "Раздел",
    group: "smart",
    groupLabel: "Навигация",
  };
  return { href, label: meta.label, group: meta.group, groupLabel: meta.groupLabel, active: false };
}

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

function looksLikeOpenSourceIntent(text: string): boolean {
  const normalized = normalizeArayNavText(text);
  return /^(найди|поищи|покажи|открой|включи|поставь|построй|подбери)\b/.test(normalized) &&
    /(музык|фильм|клип|видео|картин|фото|изображен|цвет|маршрут|урок|обуч|книг|аудиокниг|отзыв|документ|инструкц)/.test(normalized);
}

function detectArayWorkspaceCommand(text: string): "chat" | "messenger" | null {
  const normalized = normalizeArayNavText(text);
  if (!normalized) return null;

  if (/(главн.*чат|чат.*ара|арай.*чат|верни.*ара|назад.*ара|помощник.*арай)/.test(normalized)) {
    return "chat";
  }

  const hasWorkspaceIntent =
    /\b(открой|открыть|покажи|показать|перейди|перейти|зайди|зайти|выведи|найди|где|хочу|нужн)\b/.test(normalized) ||
    normalized.split(" ").length <= 4;
  const wantsMessenger =
    /\b(диалог|диалоги|мессенджер|месенджер|переписк|сообщен|пользовател|клиент|клиенты|чат|чаты)\b/.test(normalized);

  if (hasWorkspaceIntent && wantsMessenger) return "messenger";
  return null;
}

function extractArayMessengerQuery(text: string) {
  return text
    .trim()
    .replace(/^(?:арай|арей|пожалуйста|плиз|брат)\s+/i, "")
    .replace(/^(?:открой|открыть|покажи|показать|найди|перейди|перейти|зайди|зайти|выведи|хочу|нужно|можешь)\s+/i, "")
    .replace(/\b(?:диалог|диалоги|мессенджер|месенджер|переписку|переписка|сообщения|пользователи|пользователя|пользователь|чаты|чат|клиента|клиент|с)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatArayActionLabel(label: string) {
  return label
    .replace(/^\s*(?:открыть|показать|перейти|новая вкладка)\s*:\s*/i, "")
    .replace(/\s+/g, " ")
    .trim() || "источник";
}

function formatExternalActionLabel(url: string, index: number) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
    const path = parsed.pathname.toLowerCase();

    if (host.includes("music.yandex")) return "Открыть: Яндекс Музыка";
    if (host.includes("youtube") || host.includes("youtu.be")) return "Открыть: YouTube";
    if (host.includes("kinopoisk")) return "Открыть: Кинопоиск";
    if (host.includes("2gis")) return "Открыть: 2ГИС";
    if (host.includes("yandex") && path.includes("/images")) return "Открыть: Яндекс Картинки";
    if (host.includes("yandex") && path.includes("/video")) return "Открыть: Яндекс Видео";
    if (host.includes("yandex") && path.includes("/maps")) return "Открыть: Яндекс Карты";
    if (host.includes("yandex")) return "Открыть: Яндекс Поиск";
    return `Открыть: ${host}`;
  } catch {
    return `Открыть ссылку ${index + 1}`;
  }
}

function extractUrlActionsFromText(text: string): ArayAction[] {
  const urls = text.match(/https?:\/\/[^\s<>"']+/gi) ?? [];
  const seen = new Set<string>();
  const actions: ArayAction[] = [];

  for (const rawUrl of urls) {
    const url = rawUrl.replace(/[),.;!?]+$/g, "");
    if (!url || seen.has(url)) continue;
    seen.add(url);
    actions.push({
      type: "navigate",
      url,
      label: formatExternalActionLabel(url, actions.length),
      icon: url.includes("maps") ? "map" : "external",
    });
  }

  return actions.slice(0, 5);
}

function wantsLinkFollowUp(text: string) {
  const normalized = normalizeArayNavText(text);
  return /\b(ссылк|кнопк|вариант|источник|плейлист|открой|покажи)\b/.test(normalized) &&
    /\b(дай|давай|скинь|покажи|открой|где|можно|нужн|еще|ещё)\b/.test(normalized);
}

function getLatestExternalActions(messages: Message[]): ArayAction[] {
  const collected: ArayAction[] = [];

  for (let i = messages.length - 1; i >= 0 && collected.length < 5; i -= 1) {
    const message = messages[i];
    if (message.role !== "assistant") continue;
    const messageActions = (message.actions ?? []).filter((action) =>
      action.type === "navigate" &&
      typeof action.url === "string" &&
      /^https?:\/\//i.test(action.url),
    );
    collected.push(...messageActions);
    collected.push(...extractUrlActionsFromText(message.content));
  }

  return mergeArayActions(collected);
}

function getStreamingSpeechPreview(text: string) {
  const clean = prepareAraySpeechText(text, { maxLength: 260, ensureSentenceEnd: false });
  if (clean.length < 34) return "";

  const sentence = clean.match(/^.{34,220}?[.!?](?:\s|$)/)?.[0]?.trim();
  if (sentence) return sentence;

  if (clean.length >= 96) {
    return `${clean.slice(0, 180).replace(/[,.\s]+$/g, "").trim()}.`;
  }

  return "";
}

function getSpeechRemainder(fullText: string, spokenPreview: string) {
  const full = prepareAraySpeechText(fullText, { maxLength: 650 });
  const spoken = prepareAraySpeechText(spokenPreview, { maxLength: 260 });
  if (!full || !spoken) return full;

  if (full.startsWith(spoken)) {
    return full.slice(spoken.length).replace(/^[,.\s]+/g, "").trim();
  }

  const probe = spoken.slice(0, Math.min(48, spoken.length));
  if (probe.length >= 24 && full.startsWith(probe)) {
    return full.slice(spoken.length).replace(/^[,.\s]+/g, "").trim();
  }

  return "";
}

function detectBusinessMessageKind(text: string): "question" | "offer" | "review" | "comment" {
  const normalized = normalizeArayNavText(text);
  if (/(отзыв|оценк|понрав|не понрав)/.test(normalized)) return "review";
  if (/(коммент|напиши под|оставь под)/.test(normalized)) return "comment";
  if (/(вопрос|спроси|уточни|подскаж|как|когда|сколько|где)/.test(normalized)) return "question";
  return "offer";
}

function buildBusinessComposeReply(text: string, relationLabel: string, attachmentsCount: number): { text: string; actions: ArayAction[] } {
  const polished = buildArayBusinessMessengerText({
    text,
    kind: detectBusinessMessageKind(text),
    relationLabel,
    attachmentsCount,
  });

  return {
    text: [
      "Готовый текст для отправки:",
      "",
      `«${polished}»`,
      "",
      "Что сделал:",
      "1. Сохранил смысл.",
      "2. Убрал резкость и лишнюю воду.",
      "3. Оставил спокойный деловой тон.",
    ].join("\n"),
    actions: [
      { type: "prompt", prompt: `Сделай короче и теплее: ${polished}`, label: "Короче", icon: "prompt" },
      { type: "prompt", prompt: `Создай задачу по этому сообщению: ${polished}`, label: "В задачу", icon: "check" },
      { type: "navigate", url: "/admin/crm", label: "CRM", icon: "target" },
    ],
  };
}

function buildBusinessGuideReply(mode: ArayBusinessMessengerMode): { text: string; actions: ArayAction[] } {
  const modeTitle = getArayBusinessMessengerModeTitle(mode);
  return {
    text: [
      `Я рядом. Сейчас режим: ${modeTitle}.`,
      "",
      "Как это работает:",
      "1. Пишешь или говоришь простыми словами.",
      "2. Я открываю нужный раздел или готовлю текст.",
      "3. Важные действия делаю только после подтверждения.",
      "",
      "Два быстрых режима:",
      "1. Как написать — перевожу смысл в спокойный бизнес-язык.",
      "2. Проведи меня — открываю, показываю и объясняю следующий шаг.",
    ].join("\n"),
    actions: [
      { type: "prompt", prompt: "Перепиши по-деловому: клиент грубо спросил про цену и доставку, ответь спокойно.", label: "Как написать", icon: "prompt" },
      { type: "prompt", prompt: "Проведи меня по запуску рекламы: что проверить первым шагом?", label: "Проведи меня", icon: "target" },
      { type: "navigate", url: "/admin/promotion", label: "Direct и SEO", icon: "direct" },
      { type: "navigate", url: "/admin/crm", label: "CRM", icon: "target" },
    ],
  };
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
    const page = byHref.get(rule.href) ?? byHref.get(baseHref) ?? createAdminFallbackPage(rule.href);
    if (page) return page.href === rule.href ? page : { ...page, href: rule.href };
  }

  return pages
    .map((page) => ({ page, score: getAdminPageMatchScore(text, page) }))
    .filter((match) => match.score >= 90)
    .sort((a, b) => b.score - a.score || b.page.href.length - a.page.href.length)[0]?.page ?? null;
}

function hasNavigationSuccessClaim(text: string) {
  return /\b(открыл|открыла|открылся|открыто|открываю|переш[её]л|перешла|показал|показываю|вывел|вывожу)\b/i.test(text);
}

function stripNavigationSuccessClaim(text: string) {
  return text
    .replace(/^\s*(открыл|открыла|открываю|показал|показываю|вывел|вывожу)\s+(нужный\s+)?(раздел|страницу|вкладку)\.?\s*/i, "")
    .replace(/^\s*проверь,\s*пожалуйста\.?\s*/i, "")
    .trim();
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

  const speak = useCallback(async (text: string, onFinished?: () => void, languageHint?: string | null) => {
    if (lockRef.current) { stop(); await new Promise(r => setTimeout(r, 50)); }
    stop();
    lockRef.current = true;
    const clean = prepareAraySpeechText(text, { maxLength: 650 });
    if (!clean) { lockRef.current = false; onFinished?.(); return; }
    const lang = resolveAraySpeechLanguage(clean, languageHint);
    setSpeaking(true);
    onDoneRef.current = onFinished || null;
    const abort = new AbortController();
    abortRef.current = abort;

    try {
      if (!canUseArayTtsProxy(lang)) {
        if (hasBrowserVoiceFor(lang)) {
          await speakAraySpeechBrowser(clean, lang);
        }
        if (!abort.signal.aborted) finish();
        return;
      }

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

  const speakBrowser = useCallback(async (text: string, onFinished?: () => void, languageHint?: string | null) => {
    if (lockRef.current) { stop(); await new Promise(r => setTimeout(r, 50)); }
    stop();
    lockRef.current = true;
    const clean = prepareAraySpeechText(text, { maxLength: 320 });
    if (!clean) { lockRef.current = false; onFinished?.(); return; }
    const lang = resolveAraySpeechLanguage(clean, languageHint);
    setSpeaking(true);
    onDoneRef.current = onFinished || null;
    const abort = new AbortController();
    abortRef.current = abort;

    try {
      await speakAraySpeechBrowser(clean, lang);
      if (!abort.signal.aborted) finish();
    } catch {
      if (!abort.signal.aborted) finish();
    }
  }, [finish, stop]);

  return { speaking, speak, speakBrowser, stop };
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
  assigneeName: "Исполнитель",
  dueDate: "Срок",
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

const CONFIRM_HIDDEN_FIELDS = new Set(["description", "assigneeId", "tags"]);

function formatConfirmValue(value: unknown, key?: string): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "да" : "нет";
  if (key === "priority") {
    const priorityLabels: Record<string, string> = {
      LOW: "низкий",
      MEDIUM: "средний",
      HIGH: "высокий",
      URGENT: "срочно",
    };
    return priorityLabels[String(value)] || String(value);
  }
  if (key === "status") {
    const statusLabels: Record<string, string> = {
      TODO: "сделать",
      IN_PROGRESS: "в работе",
      REVIEW: "проверка",
      DONE: "готово",
    };
    return statusLabels[String(value)] || String(value);
  }
  if (key === "dueDate" && typeof value === "string") {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleString("ru-RU", {
        day: "2-digit",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
  }
  if (Array.isArray(value)) return value.map((item) => formatConfirmValue(item)).join(", ");
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
    .filter(([key]) => !CONFIRM_HIDDEN_FIELDS.has(key))
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
                {formatConfirmValue(value, key)}
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

function ArayHistoryCompactNotice({
  count,
  expanded,
  onToggle,
  isDark,
}: {
  count: number;
  expanded: boolean;
  onToggle: () => void;
  isDark: boolean;
}) {
  if (count <= 0 && !expanded) return null;

  return (
    <div className="mb-3 flex justify-center">
      <button
        type="button"
        onClick={onToggle}
        className="inline-flex max-w-full items-center gap-2 rounded-full px-3.5 py-2 text-[11.5px] font-medium transition-all active:scale-[0.98]"
        style={{
          color: "hsl(var(--foreground) / 0.66)",
          background: "hsl(var(--muted) / 0.32)",
          border: "1px solid hsl(var(--border) / 0.72)",
        }}
      >
        <MessageSquare className="h-3.5 w-3.5 opacity-70" />
        <span className="truncate">
          {expanded ? "Сжать переписку" : `Ранее в переписке: ${count} сообщ.`}
        </span>
        <ChevronDown className={`h-3.5 w-3.5 opacity-60 transition-transform ${expanded ? "" : "rotate-180"}`} />
      </button>
    </div>
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
  const [expanded, setExpanded] = useState(false);
  const canCompress =
    !isUser &&
    !msg.streaming &&
    !msg.confirmations?.length &&
    visibleContent.length > ARAY_LONG_MESSAGE_LIMIT;
  const isCompressed = canCompress && !expanded;

  return (
      <div className={`flex gap-2 ${isUser ? "flex-row-reverse" : "flex-row"} mb-3`}>
        {!isUser && (
          <div className="shrink-0 mt-0.5"><ArayIcon size={24} id={`ai-${msg.id}`} /></div>
        )}
      <div className={`flex flex-col gap-1 ${isUser ? "items-end" : "items-start"} max-w-[92%]`}>
        <div className="relative px-4 py-3 text-[14px] leading-[1.62]" style={
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
                maxHeight: isCompressed ? "15.5rem" : undefined,
                overflow: isCompressed ? "hidden" : undefined,
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
          {isCompressed && (
            <span
              className="pointer-events-none absolute inset-x-0 bottom-0 h-16 rounded-b-[inherit]"
              style={{
                background: isDark
                  ? "linear-gradient(180deg, transparent, hsl(var(--card) / 0.98))"
                  : "linear-gradient(180deg, transparent, hsl(var(--card) / 0.98))",
              }}
            />
          )}
        </div>
        {canCompress && (
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="ml-1 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium transition-all active:scale-[0.98]"
            style={{
              color: "hsl(var(--primary))",
              background: "hsl(var(--primary) / 0.08)",
              border: "1px solid hsl(var(--primary) / 0.18)",
            }}
          >
            {expanded ? "Сжать ответ" : "Показать полностью"}
            <ChevronDown className={`h-3 w-3 transition-transform ${expanded ? "rotate-180" : ""}`} />
          </button>
        )}

        {msg.attachments && msg.attachments.length > 0 && (
          <div className="flex flex-col gap-1 w-full">
            {msg.attachments.map(file => (
              <div
                key={file.id}
                className="flex flex-col gap-2 rounded-xl px-2.5 py-2 text-[11px]"
                style={{
                  background: isDark ? "rgba(255,255,255,0.055)" : "rgba(0,0,0,0.035)",
                  border: `1px solid ${isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.08)"}`,
                  color: isDark ? "rgba(255,255,255,0.72)" : "rgba(15,15,15,0.72)",
                }}
              >
                <div className="flex items-center gap-2">
                  <AttachmentKindIcon kind={file.kind} className="w-3.5 h-3.5 shrink-0" />
                  <span className="min-w-0 flex-1 truncate">{file.name}</span>
                  <span className="shrink-0 opacity-60">{formatAttachmentSize(file.size)}</span>
                </div>
                {file.kind === "audio" && file.dataUrl && (
                  <audio controls preload="metadata" className="h-8 w-full max-w-[260px]" src={file.dataUrl} />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Action cards */}
        {!isUser && msg.actions && msg.actions.length > 0 && (
          <div className="flex flex-col gap-1.5 w-full">
            {msg.actions.map((action, i) => {
              const isExternalLink =
                action.type === "navigate" &&
                typeof action.url === "string" &&
                /^https?:\/\//i.test(action.url);
              const actionContent = (
                <>
                  <span className="flex items-center justify-center w-6 h-6 rounded-xl shrink-0"
                    style={{ background: "hsl(var(--primary) / 0.16)", color: "hsl(var(--primary))" }}>
                    <ActionIcon icon={action.icon} />
                  </span>
                  <span className="flex-1 leading-tight">{action.label}</span>
                  <span className="text-[10px] opacity-40">→</span>
                </>
              );
              const actionClass = "flex min-h-11 items-center gap-2 rounded-xl px-3 py-2 text-left text-[13px] font-medium transition-colors active:scale-[0.98]";
              const actionStyle = {
                background: "hsl(var(--primary) / 0.10)",
                border: "1px solid hsl(var(--primary) / 0.24)",
                color: "hsl(var(--foreground) / 0.90)",
              };

              return (
                <motion.button
                  key={i}
                  onClick={() => onAction?.(action)}
                  aria-label={isExternalLink ? `${action.label}, открыть в новой вкладке` : action.label}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className={actionClass}
                  style={actionStyle}
                >
                  {actionContent}
                </motion.button>
              );
            })}
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
  const { speaking, speak, speakBrowser, stop: stopTTS } = useTTS();
  const { active: micActive, supported: micOk, listen: micListen, cancel: micCancel } = useMic();
  const { resolvedTheme, setTheme } = useTheme();

  // ── State ──────────────────────────────────────────────────────────────────
  const [chatPanelOpen, setChatPanelOpen] = useState(false);
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [attachments, setAttachments] = useState<ArayAttachment[]>([]);
  const [attachmentsBusy, setAttachmentsBusy] = useState(false);
  const [voiceMode, setVoiceMode] = useState<"text" | "voice">("voice"); // voice-first по умолчанию!
  const [messengerMode, setMessengerMode] = useState<ArayBusinessMessengerMode>("guide");
  const [arayWorkspaceView, setArayWorkspaceView] = useState<"chat" | "messenger">("chat");
  const [embeddedMessengerContext, setEmbeddedMessengerContext] = useState<ArayEmbeddedMessengerContext | null>(null);
  const [embeddedMessengerQuery, setEmbeddedMessengerQuery] = useState("");
  const voiceModeRef = useRef<"text" | "voice">("voice");
  const [voiceStarting, setVoiceStarting] = useState(false);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [voiceMessageRecording, setVoiceMessageRecording] = useState(false);
  const [hasNew, setHasNew] = useState(false);
  const [proactiveBubble, setProactiveBubble] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [kbOpen, setKbOpen] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [userAccountId, setUserAccountId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userRoleFromAccount, setUserRoleFromAccount] = useState<string | null>(null);
  const [userAccountReady, setUserAccountReady] = useState(false);
  const [showMessages, setShowMessages] = useState(false); // voice-first: сообщения скрыты по умолчанию
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [arayPhoneOpen, setArayPhoneOpen] = useState(true);
  const [arayPhoneOwnerId, setArayPhoneOwnerId] = useState("");
  const [clockNow, setClockNow] = useState<Date | null>(null);
  // Встроенный браузер
  const [browserOpen, setBrowserOpen] = useState(false);
  const [browserUrl, setBrowserUrl] = useState("/");
  const [browserAction, setBrowserAction] = useState<ArayBrowserAction | null>(null);
  const [liveActions, setLiveActions] = useState<ArayLiveAction[]>([]);
  useAdminOverlayGuard(open && isMobile);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const longPressTimer = useRef<number | null>(null);
  const longPressTriggered = useRef(false);
  const voiceMessageRecorderRef = useRef<MediaRecorder | null>(null);
  const voiceMessageStreamRef = useRef<MediaStream | null>(null);
  const voiceMessageChunksRef = useRef<Blob[]>([]);
  const voiceMessageStartedAtRef = useRef(0);
  const panelOpenRef = useRef(false);
  const autoOpenedArayPhoneRef = useRef(false);
  // Ref на sendMessage — чтобы event listeners (aray:prompt) не захватывали stale closure
  const sendMessageRef = useRef<((text?: string, options?: SendMessageOptions) => Promise<void>) | null>(null);
  const confirmActionRef = useRef<((confirmation: ArayConfirmationDraft) => Promise<void>) | null>(null);

  const openArayPanel = useCallback(() => {
    panelOpenRef.current = true;
    setOpen(true);
    try {
      window.localStorage.setItem(ARAY_PANEL_STATE_KEY, "open");
    } catch {}
  }, []);
  const startVoiceRef = useRef<(() => void) | null>(null);
  const voiceStartGuardRef = useRef(false);
  const voiceNoticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesCountRef = useRef(0);

  const cleanConversationMessages = useMemo(
    () => messages.filter((message) => !isArayNavigationNoise(message)),
    [messages],
  );
  const shouldCompactHistory = cleanConversationMessages.length > ARAY_HISTORY_COMPACT_AFTER;
  const compactedHistoryCount = shouldCompactHistory ? Math.max(0, cleanConversationMessages.length - ARAY_VISIBLE_HISTORY_LIMIT) : 0;
  const visibleConversationMessages = useMemo(() => {
    if (!shouldCompactHistory || historyExpanded) return cleanConversationMessages;
    return cleanConversationMessages.slice(-ARAY_VISIBLE_HISTORY_LIMIT);
  }, [cleanConversationMessages, historyExpanded, shouldCompactHistory]);

  const showVoiceNotice = useCallback((message: string) => {
    if (voiceNoticeTimerRef.current) clearTimeout(voiceNoticeTimerRef.current);
    setVoiceNotice(message);
    voiceNoticeTimerRef.current = setTimeout(() => setVoiceNotice(null), 3800);
  }, []);

  const pushLiveAction = useCallback((
    label: string,
    detail?: string,
    kind: ArayLiveAction["kind"] = "show",
  ) => {
    if (SILENT_LIVE_ACTION_LABELS.has(label)) return;
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setLiveActions((current) => [...current.slice(-3), { id, label, detail, kind }]);
    window.setTimeout(() => {
      setLiveActions((current) => current.filter((item) => item.id !== id));
    }, 6500);
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
  const startScreenChipLimit = isAdmin ? Math.min(ARAY_START_SMART_CHIPS, chips.length) : Math.min(4, chips.length);
  const lastConversationMessage = visibleConversationMessages[visibleConversationMessages.length - 1];
  const lastAssistantHasWorkActions =
    lastConversationMessage?.role === "assistant" &&
    ((lastConversationMessage.actions?.length || 0) > 0 || (lastConversationMessage.confirmations?.length || 0) > 0);
  const showSmartChips = chips.length > 0 && !lastAssistantHasWorkActions;
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
  const contextualActionFallback = useMemo(
    () => mergeArayActions(contextualQuickActions),
    [contextualQuickActions],
  );
  const businessMessengerContextLabel = useMemo(() => {
    if (isAdmin) return adminNavigation?.currentPage?.label || "админка";
    if (productName) return productName;
    if (pathname.startsWith("/catalog")) return "каталог";
    if (pathname.startsWith("/cart")) return "корзина";
    return "сайт";
  }, [adminNavigation, isAdmin, pathname, productName]);
  const arayPhoneOwnerNumber = useMemo(() => {
    if (!userAccountReady) return "AR .... .. ..";
    return createStableArayNumber({
      id: userAccountId ? `account:${userAccountId}` : `local:${arayPhoneOwnerId || "browser"}`,
    });
  }, [arayPhoneOwnerId, userAccountId, userAccountReady]);
  const arayPhoneOwnerNumberReady = !arayPhoneOwnerNumber.includes(".");
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

  useEffect(() => {
    if (messages.length === 0) return;
    writeLocalArayHistory(messages);
  }, [messages]);

  // ── История чата (БД) ────────────────────────────────────────────────────
  const loadHistoryFromDB = useCallback(async () => {
    try {
      const res = await fetch("/api/ai/chat/history", { cache: "no-store" });
      if (!res.ok) throw new Error("history");
      const data = await res.json();
      if (data.messages?.length) {
        setMessages(mapServerHistoryMessages(data.messages));
        return;
      }
      const localHistory = readLocalArayHistory();
      if (localHistory.length) setMessages((current) => (current.length > 1 ? current : localHistory));
    } catch {
      const localHistory = readLocalArayHistory();
      if (localHistory.length) setMessages((current) => (current.length > 1 ? current : localHistory));
    }
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
    if (userLoaded.current) return;
    userLoaded.current = true;
    fetch("/api/ai/me").then(r => r.json()).then(d => {
      if (d.name && !staffName) setUserName(d.name);
      if (d.userId) setUserAccountId(d.userId);
      if (d.email) setUserEmail(d.email);
      if (d.role) setUserRoleFromAccount(d.role);
    }).catch(() => {}).finally(() => setUserAccountReady(true));
  }, [staffName]);

  // Voice mode persistence
  useEffect(() => {
    const saved = localStorage.getItem("aray-voice-mode");
    if (saved === "text") { setVoiceMode("text"); voiceModeRef.current = "text"; }
    else { setVoiceMode("voice"); voiceModeRef.current = "voice"; } // voice-first default
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("aray-messenger-mode");
    if (saved === "compose" || saved === "guide") {
      setMessengerMode(saved);
    }
  }, []);

  useEffect(() => {
    const version = localStorage.getItem(ARAY_PHONE_HOME_DEFAULT_VERSION_KEY);
    if (version !== ARAY_PHONE_HOME_DEFAULT_VERSION) {
      localStorage.setItem(ARAY_PHONE_HOME_OPEN_KEY, "open");
      localStorage.setItem(ARAY_PHONE_HOME_DEFAULT_VERSION_KEY, ARAY_PHONE_HOME_DEFAULT_VERSION);
      setArayPhoneOpen(true);
      return;
    }
    const saved = localStorage.getItem(ARAY_PHONE_HOME_OPEN_KEY);
    setArayPhoneOpen(saved !== "closed");
  }, []);

  useEffect(() => {
    let ownerId = localStorage.getItem(ARAY_PHONE_OWNER_ID_KEY);
    if (!ownerId) {
      ownerId = typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(ARAY_PHONE_OWNER_ID_KEY, ownerId);
    }
    setArayPhoneOwnerId(ownerId);
  }, []);

  useEffect(() => {
    setClockNow(new Date());
    const timer = window.setInterval(() => setClockNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const closeArayPhoneHome = useCallback(() => {
    setArayPhoneOpen(false);
    try {
      localStorage.setItem(ARAY_PHONE_HOME_OPEN_KEY, "closed");
    } catch {}
  }, []);

  const openArayPhoneHome = useCallback(() => {
    setArayPhoneOpen(true);
    try {
      localStorage.setItem(ARAY_PHONE_HOME_OPEN_KEY, "open");
    } catch {}
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
    if (!force) {
      const localHistory = readLocalArayHistory();
      if (localHistory.length) {
        setMessages(localHistory);
        return;
      }
    }
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

  useEffect(() => {
    if (!isAdmin || isMobile || autoOpenedArayPhoneRef.current) return;
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(ARAY_PANEL_STATE_KEY);
    if (saved === "closed") return;
    autoOpenedArayPhoneRef.current = true;
    setVisible(true);
    openArayPanel();
    setHasNew(false);
    setProactiveBubble(null);
    setArayWorkspaceView("chat");
    setShowMessages(false);
    startChat();
  }, [isAdmin, isMobile, openArayPanel, startChat]);

  useEffect(() => {
    function handlePhoneOpen(event: Event) {
      const detail = (event as CustomEvent<{ reason?: string; keepView?: boolean }>).detail;
      openArayPhoneHome();
      setVisible(true);
      openArayPanel();
      setHasNew(false);
      setProactiveBubble(null);
      startChat();
      if (!detail?.keepView) {
        setArayWorkspaceView("chat");
        setShowMessages(false);
      }
      pushLiveAction("AR Phone открыт", detail?.reason || "Событие связи", "open");
    }

    window.addEventListener("aray:phone-open", handlePhoneOpen as EventListener);
    return () => window.removeEventListener("aray:phone-open", handlePhoneOpen as EventListener);
  }, [openArayPanel, openArayPhoneHome, pushLiveAction, startChat]);

  // Открытие из мобильного навбара
  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ mode?: "open" | "voice" | "phone" }>).detail;
      delete (window as ArayPendingPromptWindow).__arayPendingOpen;
      setVisible(true);
      openArayPanel();
      openArayPhoneHome();
      setHasNew(false);
      setProactiveBubble(null);
      setArayWorkspaceView("chat");
      setShowMessages(false);
      startChat();
      pushLiveAction(
        detail?.mode === "phone" ? "AR Phone открыт" : "ARAY открыт",
        detail?.mode === "phone" ? "Номер, чаты, звонок и видео рядом." : "Готов слушать, писать и вести по шагам.",
        detail?.mode === "phone" ? "open" : "voice",
      );
    };
    window.addEventListener("aray:open", handler);
    return () => window.removeEventListener("aray:open", handler);
  }, [openArayPanel, openArayPhoneHome, pushLiveAction, startChat]);

  // Push-to-talk из мобильного навбара
  useEffect(() => {
    const handler = () => {
      delete (window as ArayPendingPromptWindow).__arayPendingOpen;
      const shouldStartListening = messagesCountRef.current > 0;
      setVisible(true);
      openArayPanel();
      openArayPhoneHome();
      setHasNew(false);
      setProactiveBubble(null);
      setArayWorkspaceView("chat");
      setShowMessages(false);
      startChat();
      if (voiceModeRef.current !== "voice") {
        setVoiceMode("voice"); voiceModeRef.current = "voice";
        localStorage.setItem("aray-voice-mode", "voice");
      }
      pushLiveAction("Слушаю голос", "Можно говорить задачу сразу.", "voice");
      if (shouldStartListening) {
        window.setTimeout(() => startVoiceRef.current?.(), 220);
      }
    };
    window.addEventListener("aray:voice", handler);
    return () => window.removeEventListener("aray:voice", handler);
  }, [openArayPanel, openArayPhoneHome, pushLiveAction, startChat]);

  useEffect(() => {
    const pendingWindow = window as ArayPendingPromptWindow;
    const pendingOpen = pendingWindow.__arayPendingOpen;
    if (!pendingOpen) return;
    delete pendingWindow.__arayPendingOpen;

    const shouldStartListening = pendingOpen === "voice" && messagesCountRef.current > 0;
    setVisible(true);
    openArayPanel();
    openArayPhoneHome();
    setHasNew(false);
    setProactiveBubble(null);
    setArayWorkspaceView("chat");
    setShowMessages(false);
    startChat();
    if (pendingOpen === "voice" && voiceModeRef.current !== "voice") {
      setVoiceMode("voice"); voiceModeRef.current = "voice";
      localStorage.setItem("aray-voice-mode", "voice");
    }
    pushLiveAction(
      pendingOpen === "voice" ? "Слушаю голос" : "ARAY открыт",
      pendingOpen === "voice" ? "Можно говорить задачу сразу." : "Готов слушать, писать и вести по шагам.",
      pendingOpen === "voice" ? "voice" : "open",
    );
    if (shouldStartListening) {
      window.setTimeout(() => startVoiceRef.current?.(), 220);
    }
  }, [openArayPanel, openArayPhoneHome, pushLiveAction, startChat]);

  // Отправка текста из ArayDock (чат-бар внизу)
  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<ArayPromptPayload>;
      const payload = ce.detail;
      const text = payload?.text?.trim();
      if (!text) return;
      pushLiveAction("Принял задачу", payload.displayText || text, "write");
      if (payload?.localReply) {
        const displayText = (payload.displayText || text).trim();
        const userMessage = displayText
          ? {
              id: Date.now().toString(),
              role: "user" as const,
              content: displayText,
              timestamp: new Date(),
            }
          : null;
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: payload.localReply,
          timestamp: new Date(),
          actions: payload.actions?.length ? payload.actions : undefined,
        };
        const nextMessages = userMessage ? [userMessage, assistantMessage] : [assistantMessage];
        setVisible(true); openArayPanel(); setHasNew(false); startChat();
        setArayWorkspaceView("chat");
        if (voiceModeRef.current !== "text") {
          setVoiceMode("text"); voiceModeRef.current = "text";
          localStorage.setItem("aray-voice-mode", "text");
        }
        setShowMessages(true);
        setMessages(prev => [...prev, ...nextMessages]);
        if (userMessage) saveMessageToDB("user", userMessage.content);
        saveMessageToDB("assistant", assistantMessage.content);
        return;
      }
      const pendingWindow = window as ArayPendingPromptWindow;
      if (pendingWindow.__arayPendingPrompt?.text === text) {
        delete pendingWindow.__arayPendingPrompt;
      }
      setVisible(true); openArayPanel(); setHasNew(false); startChat();
      setArayWorkspaceView("chat");
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
  }, [openArayPanel, pushLiveAction, startChat]);

  useEffect(() => {
    const handler = (event: Event) => {
      const payload = (event as CustomEvent<ArayStoryContextPayload>).detail;
      if (!payload) return;
      const kindLabel = payload.kindLabel || "Сообщение";
      const relation = payload.relationName?.trim();
      const sourceText = payload.text?.trim();
      const isOpen = payload.sourceAction === "open";
      const title = payload.storyTitle?.trim() || "сторис";
      const assistantText = isOpen
        ? [
            `Открыл чат по сторис «${title}».`,
            relation ? `Контекст: ${relation}.` : "",
            "Можно принять вопрос, отзыв, предложение или комментарий. Я помогу оформить и передать дальше.",
          ].filter(Boolean).join("\n")
        : [
            `${kindLabel} из сторис принято.`,
            relation ? `Контекст: ${relation}.` : "",
            sourceText ? `Смысл: ${sourceText}` : "",
            payload.reply || "Я сохранил рабочий контекст. Следующий шаг: ответить клиенту, создать задачу или открыть связанный объект.",
          ].filter(Boolean).join("\n");
      const actions: ArayAction[] = [
        {
          type: "prompt",
          label: "Ответ клиенту",
          icon: "prompt",
          prompt: `Подготовь короткий ответ по сторис "${title}"${relation ? `, контекст ${relation}` : ""}: ${sourceText || "клиент открыл чат"}`,
        },
        {
          type: "prompt",
          label: "Задача",
          icon: "check",
          prompt: `Создай задачу по обращению из сторис "${title}"${relation ? `, контекст ${relation}` : ""}: ${sourceText || "проверить обращение"}`,
        },
      ];
      if (relation) {
        actions.push({
          type: "prompt",
          label: "Связь",
          icon: "target",
          prompt: `Покажи, что связано со сторис "${title}" и контекстом "${relation}"`,
        });
      }

      const assistantMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: assistantText,
        timestamp: new Date(),
        actions,
      };
      setVisible(true); openArayPanel(); setHasNew(false); startChat();
      setArayWorkspaceView("chat");
      if (voiceModeRef.current !== "text") {
        setVoiceMode("text"); voiceModeRef.current = "text";
        localStorage.setItem("aray-voice-mode", "text");
      }
      setShowMessages(true);
      setMessages(prev => [...prev, assistantMessage]);
      saveMessageToDB("assistant", assistantText);
    };

    window.addEventListener("aray:story-context", handler as EventListener);
    return () => window.removeEventListener("aray:story-context", handler as EventListener);
  }, [openArayPanel, saveMessageToDB, startChat]);

  useEffect(() => {
    const pending = (window as ArayPendingPromptWindow).__arayPendingPrompt;
    const text = pending?.text?.trim();
    if (!text) return;
    delete (window as ArayPendingPromptWindow).__arayPendingPrompt;
    setVisible(true); openArayPanel(); setHasNew(false); startChat();
    setArayWorkspaceView("chat");
    if (voiceModeRef.current !== "text") {
      setVoiceMode("text"); voiceModeRef.current = "text";
      localStorage.setItem("aray-voice-mode", "text");
    }
    setShowMessages(true);
    window.setTimeout(() => sendMessageRef.current?.(text, pending), 120);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openArayPanel, startChat]);

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

  const handleOpen = () => {
    haptic("medium");
    openArayPanel();
    openArayPhoneHome();
    setHasNew(false);
    setProactiveBubble(null);
    setArayWorkspaceView("chat");
    setShowMessages(false);
    startChat();
    pushLiveAction("ARAY открыт", "Готов слушать, писать и вести по шагам.", "voice");
  };

  const openEmbeddedMessenger = useCallback((query?: string) => {
    const cleanQuery = query?.trim() || "";
    setEmbeddedMessengerQuery((current) => {
      if (cleanQuery && current === cleanQuery) {
        window.setTimeout(() => setEmbeddedMessengerQuery(cleanQuery), 0);
        return "";
      }
      return cleanQuery;
    });
    setArayWorkspaceView("messenger");
    setVisible(true);
    openArayPanel();
    setHasNew(false);
    setProactiveBubble(null);
    startChat();
    haptic("light");
  }, [openArayPanel, startChat]);

  const handleArayPhoneDial = useCallback((value: string) => {
    const clean = value.trim().toUpperCase();
    if (!clean) {
      openEmbeddedMessenger();
      return;
    }
    const digits = clean.replace(/\D/g, "");
    const dial = clean.startsWith("AR") || digits.length < 8
      ? clean
      : `AR ${digits.slice(-8, -4)} ${digits.slice(-4, -2)} ${digits.slice(-2)}`;
    openArayPhoneHome();
    openEmbeddedMessenger(`__aray_dial__:${dial}`);
    pushLiveAction("Набираю внутренний номер", dial, "open");
  }, [openArayPhoneHome, openEmbeddedMessenger, pushLiveAction]);

  useEffect(() => {
    function handlePhoneDial(event: Event) {
      const detail = (event as CustomEvent<{ number?: string }>).detail;
      const number = detail?.number?.trim();
      if (!number) return;
      handleArayPhoneDial(number);
    }

    window.addEventListener("aray:phone-dial", handlePhoneDial as EventListener);
    return () => window.removeEventListener("aray:phone-dial", handlePhoneDial as EventListener);
  }, [handleArayPhoneDial]);

  const copyOwnArayPhoneNumber = useCallback(async () => {
    if (!arayPhoneOwnerNumberReady) {
      showVoiceNotice("Номер связывается с аккаунтом.");
      return;
    }
    const publicNumber = formatArayPublicNumber(arayPhoneOwnerNumber);
    try {
      const copied = await writeArayClipboardText(publicNumber);
      if (!copied) throw new Error("copy failed");
      showVoiceNotice(`Мой номер скопирован: ${publicNumber}`);
      pushLiveAction("Скопировал мой номер", publicNumber, "open");
    } catch {
      showVoiceNotice(`Мой номер: ${publicNumber}`);
    }
  }, [arayPhoneOwnerNumber, arayPhoneOwnerNumberReady, pushLiveAction, showVoiceNotice]);

  const shareOwnArayPhoneNumber = useCallback(async () => {
    if (!arayPhoneOwnerNumberReady) {
      showVoiceNotice("Номер связывается с аккаунтом.");
      return;
    }
    const title = "Мой AR Phone";
    const meetingUrl = createArayMeetingUrl(arayPhoneOwnerNumber, ARAY_VIDEO_MEETING_BASE_URL);
    const publicNumber = formatArayPublicNumber(arayPhoneOwnerNumber);
    const text = [`Мой номер: ${publicNumber}`, `Видео: ${meetingUrl}`].join("\n");
    try {
      if ("share" in navigator && typeof navigator.share === "function") {
        await navigator.share({ title, text, url: meetingUrl });
        showVoiceNotice("Открыл поделиться моим номером");
      } else {
        const copied = await writeArayClipboardText(text);
        if (!copied) throw new Error("copy failed");
        showVoiceNotice("Мой номер скопирован для отправки");
      }
      pushLiveAction("Поделиться моим номером", publicNumber, "open");
    } catch {
      showVoiceNotice(`Мой номер: ${publicNumber}`);
    }
  }, [arayPhoneOwnerNumber, arayPhoneOwnerNumberReady, pushLiveAction, showVoiceNotice]);

  const copyOwnArayVideoInvite = useCallback(async () => {
    if (!arayPhoneOwnerNumberReady) {
      showVoiceNotice("Номер связывается с аккаунтом.");
      return;
    }
    const meetingUrl = createArayMeetingUrl(arayPhoneOwnerNumber, ARAY_VIDEO_MEETING_BASE_URL);
    const publicNumber = formatArayPublicNumber(arayPhoneOwnerNumber);
    try {
      const copied = await writeArayClipboardText(`Номер: ${publicNumber}\nВидео-встреча: ${meetingUrl}`);
      if (!copied) throw new Error("copy failed");
      showVoiceNotice("Ссылка на видео-встречу скопирована");
      pushLiveAction("Скопировал ссылку на видео", publicNumber, "open");
    } catch {
      showVoiceNotice(`Видео-встреча: ${meetingUrl}`);
    }
  }, [arayPhoneOwnerNumber, arayPhoneOwnerNumberReady, pushLiveAction, showVoiceNotice]);

  const openOwnArayVideoRoom = useCallback(async () => {
    if (!arayPhoneOwnerNumberReady) {
      showVoiceNotice("Номер связывается с аккаунтом.");
      return;
    }
    const meetingUrl = createArayMeetingUrl(arayPhoneOwnerNumber, ARAY_VIDEO_MEETING_BASE_URL);
    const publicNumber = formatArayPublicNumber(arayPhoneOwnerNumber);
    openArayPhoneHome();
    try {
      await writeArayClipboardText(`Номер: ${publicNumber}\nВидео: ${meetingUrl}`);
    } catch {}
    setBrowserAction(null);
    setBrowserUrl(meetingUrl);
    setBrowserOpen(true);
    showVoiceNotice("Открыл видеошлюз AR Phone");
    pushLiveAction("Открыл видео AR Phone", publicNumber, "open");
  }, [arayPhoneOwnerNumber, arayPhoneOwnerNumberReady, openArayPhoneHome, pushLiveAction, showVoiceNotice]);

  const askArayFromMessenger = useCallback((payload: ArayEmbeddedMessengerPrompt) => {
    pushLiveAction("Подключил ARAY к диалогу", payload.displayText || payload.text, "write");
    window.dispatchEvent(new CustomEvent("aray:prompt", { detail: payload }));
  }, [pushLiveAction]);

  const handleAttachmentFiles = useCallback(async (files: FileList | null) => {
    if (!files?.length) return;
    haptic("light");
    setAttachmentsBusy(true);
    try {
      const incoming = Array.from(files).slice(0, 4);
      const prepared = await Promise.all(incoming.map(prepareArayAttachment));
      setAttachments(prev => [...prev, ...prepared].slice(0, 4));
      pushLiveAction("Принял вложения", `${prepared.length} файл(а): фото, документы или медиа.`, "file");
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
  }, [pushLiveAction]);

  const handlePaste = useCallback((event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const files = event.clipboardData?.files;
    if (!files?.length) return;
    event.preventDefault();
    void handleAttachmentFiles(files);
  }, [handleAttachmentFiles]);

  const removeAttachment = useCallback((id: string) => {
    setAttachments(prev => prev.filter(file => file.id !== id));
  }, []);

  const stopVoiceMessageRecording = useCallback(() => {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    const recorder = voiceMessageRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
  }, []);

  const startVoiceMessageRecording = useCallback(async () => {
    if (voiceMessageRecording || loading || attachmentsBusy) return;
    if (typeof window === "undefined" || typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      showVoiceNotice("Голосовые сообщения не поддерживаются в этом браузере.");
      return;
    }
    longPressTriggered.current = true;
    stopTTS();
    micCancel();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      voiceMessageStreamRef.current = stream;
      voiceMessageChunksRef.current = [];
      const preferredType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "";
      const recorder = preferredType ? new MediaRecorder(stream, { mimeType: preferredType }) : new MediaRecorder(stream);
      voiceMessageRecorderRef.current = recorder;
      voiceMessageStartedAtRef.current = Date.now();
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) voiceMessageChunksRef.current.push(event.data);
      };
      recorder.onstop = async () => {
        const chunks = voiceMessageChunksRef.current;
        const mimeType = recorder.mimeType || "audio/webm";
        const duration = Date.now() - voiceMessageStartedAtRef.current;
        voiceMessageStreamRef.current?.getTracks().forEach((track) => track.stop());
        voiceMessageStreamRef.current = null;
        voiceMessageRecorderRef.current = null;
        setVoiceMessageRecording(false);

        if (duration < 600 || chunks.length === 0) {
          showVoiceNotice("Голосовое слишком короткое.");
          return;
        }

        const extension = mimeType.includes("mp4") || mimeType.includes("mpeg") ? "m4a" : "webm";
        const blob = new Blob(chunks, { type: mimeType });
        const file = new File([blob], `voice-${new Date().toISOString().replace(/[:.]/g, "-")}.${extension}`, { type: mimeType });
        const attachment = await prepareArayAttachment(file);
        setAttachments((prev) => [...prev, attachment].slice(0, 4));
        setShowMessages(true);
        setVoiceMode("text");
        voiceModeRef.current = "text";
        localStorage.setItem("aray-voice-mode", "text");
        showVoiceNotice("Голосовое прикреплено. Нажми отправить, когда готово.");
      };
      recorder.start();
      setVoiceMessageRecording(true);
      haptic("medium");
    } catch {
      setVoiceMessageRecording(false);
      voiceMessageStreamRef.current?.getTracks().forEach((track) => track.stop());
      voiceMessageStreamRef.current = null;
      showVoiceNotice("Не получилось включить микрофон для голосового.");
    }
  }, [attachmentsBusy, loading, micCancel, showVoiceNotice, stopTTS, voiceMessageRecording]);

  const handleVoiceButtonPointerDown = useCallback(() => {
    if (loading || attachmentsBusy) return;
    longPressTriggered.current = false;
    if (longPressTimer.current) window.clearTimeout(longPressTimer.current);
    longPressTimer.current = window.setTimeout(() => {
      void startVoiceMessageRecording();
    }, 420);
  }, [attachmentsBusy, loading, startVoiceMessageRecording]);

  const handleVoiceButtonPointerEnd = useCallback(() => {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    if (voiceMessageRecorderRef.current) stopVoiceMessageRecording();
  }, [stopVoiceMessageRecording]);

  const handleVoiceButtonClick = useCallback(() => {
    if (longPressTriggered.current) {
      longPressTriggered.current = false;
      return;
    }
    micActive ? micCancel() : startVoiceRef.current?.();
  }, [micActive, micCancel]);

  const polishBusinessMessage = useCallback(() => {
    setArayWorkspaceView("chat");
    setMessengerMode("compose");
    localStorage.setItem("aray-messenger-mode", "compose");
    const nextText = buildArayBusinessMessengerText({
      text: input || "Помоги коротко и по делу написать сообщение.",
      kind: "offer",
      relationLabel: businessMessengerContextLabel,
      attachmentsCount: attachments.length,
    });
    setInput(nextText);
    setShowMessages(true);
    if (voiceModeRef.current !== "text") {
      setVoiceMode("text");
      voiceModeRef.current = "text";
      localStorage.setItem("aray-voice-mode", "text");
    }
    haptic("light");
    window.setTimeout(() => inputRef.current?.focus(), 40);
  }, [attachments.length, businessMessengerContextLabel, input]);

  const changeMessengerMode = useCallback((mode: ArayBusinessMessengerMode) => {
    setArayWorkspaceView("chat");
    setMessengerMode(mode);
    localStorage.setItem("aray-messenger-mode", mode);
    setShowMessages(true);
    if (mode === "compose") {
      if (voiceModeRef.current !== "text") {
        setVoiceMode("text");
        voiceModeRef.current = "text";
        localStorage.setItem("aray-voice-mode", "text");
      }
      window.setTimeout(() => inputRef.current?.focus(), 40);
    }
    haptic("light");
  }, []);

  const openArayTarget = useCallback((url: string): "internal" | "embedded" | "tab" | null => {
    const target = sanitizeArayUrl(url);
    if (!target) {
      pushLiveAction("Ссылка заблокирована", "ARAY открывает только безопасные http/https, телефон и почту.", "confirm");
      return null;
    }

    const internalPath = toInternalAppPath(target);
    if (internalPath) {
      setBrowserOpen(false);
      setBrowserAction(null);
      pushLiveAction("Открываю раздел", internalPath, "open");
      router.push(internalPath);
      return "internal";
    }

    if (target.startsWith("tel:") || target.startsWith("mailto:")) {
      pushLiveAction(target.startsWith("tel:") ? "Готовлю звонок" : "Готовлю письмо", target, "open");
      window.location.href = target;
      return "tab";
    }

    setBrowserOpen(false);
    setBrowserAction(null);
    if (!isArayExternalTabOnly(target)) {
      setBrowserUrl(target);
      setBrowserOpen(true);
      pushLiveAction("Показываю страницу", target, "show");
      return "embedded";
    }

    const opened = window.open(target, "_blank", "noopener,noreferrer");
    if (!opened) return null;
    try { opened.opener = null; } catch {}
    pushLiveAction("Открыл внешнюю вкладку", target, "open");
    return "tab";
  }, [pushLiveAction, router]);

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
    if (!commandState.openedAny && clean && hasNavigationSuccessClaim(clean)) {
      const rest = stripNavigationSuccessClaim(clean);
      return rest || "Подготовил действие. Нажми кнопку ниже или напиши раздел ещё раз, и я открою его.";
    }
    if (commandState.openedInternal) return clean || "Открываю нужный раздел.\n1. Остаюсь рядом.\n2. Напиши, что проверить дальше.";
    if (commandState.openedTab) {
      const base = clean || "Открыл внешний источник.";
      const hint = "Открыл в новой вкладке сверху. Я остаюсь рядом в этом чате.";
      return /нов(ой|ую)\s+вкладк|вкладк[аеу]\s+сверху/i.test(base) ? base : `${base}\n\n${hint}`;
    }
    if (commandState.openedEmbedded) return clean || "Открываю вкладку.\n1. Проверь страницу.\n2. Напиши, что подсветить.";
    return clean || "Готово.";
  }, []);

  const runVoiceCommand = useCallback((command: ArayVoiceCommand): boolean => {
    pushLiveAction(command.label, command.reply, command.effect === "blocked-terminal" ? "confirm" : "voice");

    if (command.effect === "blocked-terminal") {
      return false;
    }

    if (command.effect === "open" && command.href) {
      const openKind = openArayTarget(command.href);
      return Boolean(openKind);
    }

    if (command.effect === "back") {
      router.back();
      return true;
    }

    if (command.effect === "refresh") {
      router.refresh();
      return true;
    }

    if (command.effect === "scroll-top") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return true;
    }

    if (command.effect === "scroll-bottom") {
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" });
      return true;
    }

    if (command.effect === "scroll-down") {
      window.scrollBy({ top: Math.round(window.innerHeight * 0.78), behavior: "smooth" });
      return true;
    }

    if (command.effect === "scroll-up") {
      window.scrollBy({ top: -Math.round(window.innerHeight * 0.78), behavior: "smooth" });
      return true;
    }

    if (command.effect === "theme-dark") {
      setTheme("dark");
      return true;
    }

    if (command.effect === "theme-light") {
      setTheme("light");
      return true;
    }

    return false;
  }, [openArayTarget, pushLiveAction, router, setTheme]);

  // ── Отправка сообщения ────────────────────────────────────────────────────
  const scheduleVoiceFollowUp = useCallback((enabled = true) => {
    if (!enabled) return;
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
  }, [micListen, showVoiceNotice]);

  const continueVoiceDialogue = useCallback((text: string, options?: { listen?: boolean; languageHint?: string | null }) => {
    const phrase = text.trim();
    if (!phrase || voiceModeRef.current !== "voice") return;
    speak(phrase, () => {
      scheduleVoiceFollowUp(options?.listen !== false);
    }, options?.languageHint);
  }, [scheduleVoiceFollowUp, speak]);

  const sendMessage = useCallback(async (text?: string, options?: SendMessageOptions) => {
    const rawInput = text || input;
    const effectiveOptions = options ?? (
      pathname.startsWith("/admin/promotion")
        ? buildPromotionPromptPayload(rawInput) ?? undefined
        : undefined
    );
    const normalizedInput = normalizeArayHumanInput(rawInput);
    const msg = normalizedInput.text.trim();
    const visibleMsg = (effectiveOptions?.displayText || normalizedInput.original || msg).trim();
    const userIntentText = msg || visibleMsg;
    const wantsBusinessCompose = !effectiveOptions && isArayBusinessMessengerRequest(userIntentText);
    const wantsGuideReply = !effectiveOptions && isArayGuideRequest(userIntentText);
    const speechLanguageHint = inferRequestedLanguage(userIntentText);
    const modeContext = !effectiveOptions && (wantsBusinessCompose || wantsGuideReply)
      ? buildArayBusinessMessengerModeContext({
          mode: messengerMode,
          relationLabel: businessMessengerContextLabel,
        })
      : "";
    const businessMessengerContext = wantsBusinessCompose
      ? buildArayBusinessMessengerPrompt({
          text: msg,
          relationLabel: businessMessengerContextLabel,
          attachmentsCount: attachments.length,
        })
      : "";
    const activeMessengerContext = arayWorkspaceView === "messenger"
      ? embeddedMessengerContext?.context?.trim()
      : "";
    const hiddenContext = [effectiveOptions?.context?.trim(), activeMessengerContext, modeContext, businessMessengerContext]
      .filter(Boolean)
      .join("\n\n");
    const modelInput = normalizedInput.corrected && visibleMsg !== msg
      ? `${msg}\n\n[ARAY понял ввод в неверной раскладке. Оригинал пользователя: ${visibleMsg}]`
      : msg;
    const modelMsg = hiddenContext ? `${modelInput}\n\n[Служебный контекст ARAY]\n${hiddenContext}` : modelInput;
    const messageAttachments = attachments;
    if ((!msg && !visibleMsg && messageAttachments.length === 0) || loading || attachmentsBusy) return;
    const pendingConfirmation = !effectiveOptions && messageAttachments.length === 0
      ? getLatestPendingConfirmation(messages)
      : null;
    if (pendingConfirmation && isConfirmationReply(userIntentText)) {
      setInput("");
      setAttachments([]);
      await confirmActionRef.current?.(pendingConfirmation);
      return;
    }
    setInput("");
    setAttachments([]);
    const latestExternalActions = !effectiveOptions && messageAttachments.length === 0 && wantsLinkFollowUp(userIntentText)
      ? getLatestExternalActions(messages)
      : [];
    if (latestExternalActions.length > 0) {
      const userMsg: Message = {
        id: Date.now().toString(),
        role: "user",
        content: visibleMsg || msg,
        timestamp: new Date(),
      };
      const assistantText = "Держу готовые переходы рядом. Нажми нужный источник, он откроется в новой вкладке, а я останусь здесь.";
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: assistantText,
        timestamp: new Date(),
        actions: latestExternalActions,
      };
      setMessages(prev => [...prev, userMsg, assistantMsg]);
      saveMessageToDB("user", userMsg.content);
      saveMessageToDB("assistant", assistantText);
      setArayWorkspaceView("chat");
      setShowMessages(true);
      continueVoiceDialogue(assistantText, { languageHint: speechLanguageHint });
      if (isMobile) stopAraySpeech();
      return;
    }
    const localVoiceCommand = !effectiveOptions && messageAttachments.length === 0
      ? resolveArayVoiceCommand(userIntentText, { isAdmin, pathname })
      : null;
    if (localVoiceCommand) {
      const userMsg: Message = {
        id: Date.now().toString(),
        role: "user",
        content: visibleMsg || msg,
        timestamp: new Date(),
      };
      const executed = runVoiceCommand(localVoiceCommand);
      const assistantText = executed || localVoiceCommand.effect === "blocked-terminal"
        ? localVoiceCommand.reply
        : `${localVoiceCommand.reply}\n\nЕсли раздел не открылся, нажми кнопку ниже.`;
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: assistantText,
        timestamp: new Date(),
        actions: mergeArayActions(localVoiceCommand.actions, contextualActionFallback),
      };
      setMessages(prev => [...prev, userMsg, assistantMsg]);
      saveMessageToDB("user", userMsg.content);
      saveMessageToDB("assistant", assistantText);
      setShowMessages(true);
      continueVoiceDialogue(assistantText, {
        listen: localVoiceCommand.effect !== "blocked-terminal",
        languageHint: speechLanguageHint,
      });
      if (isMobile) stopAraySpeech();
      return;
    }
    const workspaceCommand = !effectiveOptions && isAdmin && messageAttachments.length === 0
      ? detectArayWorkspaceCommand(userIntentText)
      : null;
    if (workspaceCommand) {
      const messengerQuery = workspaceCommand === "messenger" ? extractArayMessengerQuery(userIntentText) : "";
      if (workspaceCommand === "messenger") {
        openEmbeddedMessenger(messengerQuery || undefined);
      } else {
        setArayWorkspaceView("chat");
        setShowMessages(true);
      }
      if (isMobile) stopAraySpeech();
      return;
    }
    const instantAdminTarget = !effectiveOptions && isAdmin && messageAttachments.length === 0
      && !looksLikeOpenSourceIntent(userIntentText)
      ? findInstantAdminNavigationTarget(userIntentText, adminNavigation)
      : null;
    if (instantAdminTarget) {
      const openKind = openArayTarget(instantAdminTarget.href);
      const userMsg: Message = {
        id: Date.now().toString(),
        role: "user",
        content: visibleMsg || msg,
        timestamp: new Date(),
      };
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: openKind
          ? `Открываю раздел «${instantAdminTarget.label}».\n1. Я остаюсь рядом.\n2. Напиши, что проверить или заполнить.`
          : `Не смог открыть раздел «${instantAdminTarget.label}» автоматически. Напиши его название ещё раз или выбери в меню.`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, userMsg, assistantMsg]);
      saveMessageToDB("user", userMsg.content);
      saveMessageToDB("assistant", assistantMsg.content);
      continueVoiceDialogue(assistantMsg.content);
      if (isMobile) stopAraySpeech();
      setShowMessages(true);
      return;
    }
    // В голосовом режиме — оставляем орб, ответ виден под ним
    // В текстовом режиме — показываем сообщения
    if (voiceModeRef.current === "text") setShowMessages(true);
    if (arayWorkspaceView === "messenger") setArayWorkspaceView("chat");
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
      const finalActions = baseActions;
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: localReply,
        timestamp: new Date(),
        actions: finalActions.length ? finalActions : undefined,
      };
      setMessages(prev => [...prev, assistantMsg]);
      saveMessageToDB("assistant", localReply);
      continueVoiceDialogue(localReply, { languageHint: speechLanguageHint });
      if (isMobile) stopAraySpeech();
      return;
    }

    const shouldUseLocalComposeReply =
      !effectiveOptions &&
      messageAttachments.length === 0 &&
      wantsBusinessCompose &&
      !wantsGuideReply &&
      !hasAdminMutationIntent(normalizeArayNavText(userIntentText)) &&
      !looksLikeOpenSourceIntent(userIntentText);

    if (shouldUseLocalComposeReply) {
      const reply = buildBusinessComposeReply(userIntentText, businessMessengerContextLabel, messageAttachments.length);
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: reply.text,
        timestamp: new Date(),
        actions: mergeArayActions(reply.actions, contextualActionFallback),
      };
      setMessages(prev => [...prev, assistantMsg]);
      saveMessageToDB("assistant", reply.text);
      continueVoiceDialogue(reply.text, { languageHint: speechLanguageHint });
      if (isMobile) stopAraySpeech();
      return;
    }

    if (!effectiveOptions && messageAttachments.length === 0 && wantsGuideReply) {
      const reply = buildBusinessGuideReply(messengerMode);
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: reply.text,
        timestamp: new Date(),
        actions: mergeArayActions(reply.actions, contextualActionFallback),
      };
      setMessages(prev => [...prev, assistantMsg]);
      saveMessageToDB("assistant", reply.text);
      continueVoiceDialogue(reply.text, { languageHint: speechLanguageHint });
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
      let spokenPreview = "";
      let previewSpeechFinished = false;
      let streamFinished = false;
      let queuedSpeechRemainder = "";
      const playQueuedSpeechRemainder = () => {
        if (!streamFinished || !previewSpeechFinished) return;
        if (queuedSpeechRemainder.length > 24) {
          continueVoiceDialogue(queuedSpeechRemainder, { languageHint: speechLanguageHint });
          return;
        }
        scheduleVoiceFollowUp(true);
      };
      const maybeStartStreamingSpeech = (displayText: string) => {
        if (spokenPreview || voiceModeRef.current !== "voice") return;
        const preview = getStreamingSpeechPreview(displayText);
        if (!preview) return;
        spokenPreview = preview;
        void speakBrowser(preview, () => {
          previewSpeechFinished = true;
          playQueuedSpeechRemainder();
        }, speechLanguageHint);
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        rawText += decoder.decode(value, { stream: true });
        const displayText = stripArayControlText(rawText);
        streamUpdater.update(displayText);
        maybeStartStreamingSpeech(displayText);
      }
      streamUpdater.flush(stripArayControlText(rawText));
      streamFinished = true;

      const isError = rawText.includes("__ARAY_ERR__");
      const errMatch = rawText.match(/__ARAY_ERR__(.+)$/);
      const cleanText = isError
        ? (errMatch?.[1] || "Не получилось. Попробуй снова.")
        : rawText.replace(/\n__ARAY_META__[\s\S]*$/, "").trim();
      const { text: textWithoutConfirmations, confirmations } = parseConfirmations(cleanText);
      const { text: parsedText, actions } = parseMessageActions(textWithoutConfirmations);

      const commandState = applyArayOpenCommands(rawText, actions);
      const linkActions = extractUrlActionsFromText(parsedText);
      const baseActions = mergeArayActions(effectiveOptions?.actions, actions, linkActions, contextualActionFallback);
      const finalActions = baseActions;

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
      const finalParsed = normalizeTranslationReply(
        buildFinalArayText(parsedText, isError, commandState),
        userIntentText,
      );

      setMessages(prev => prev.map(m =>
        m.id === assistantId ? { ...m, content: finalParsed, actions: finalActions, confirmations, streaming: false } : m
      ));
      saveMessageToDB("assistant", finalParsed);

      if (spokenPreview) {
        queuedSpeechRemainder = getSpeechRemainder(finalParsed, spokenPreview);
        playQueuedSpeechRemainder();
      } else {
        continueVoiceDialogue(finalParsed, { languageHint: speechLanguageHint });
      }
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
  }, [adminNavigation, adminNavigationPayload, applyArayOpenCommands, arayWorkspaceView, attachments, attachmentsBusy, buildFinalArayText, businessMessengerContextLabel, cartTotal, contextualActionFallback, continueVoiceDialogue, embeddedMessengerContext, input, isAdmin, isMobile, loading, messages, messengerMode, open, openArayTarget, openEmbeddedMessenger, pathname, productName, runVoiceCommand, saveMessageToDB, scheduleVoiceFollowUp, speakBrowser]);

  // Поддерживаем актуальный ref на sendMessage для event listeners
  sendMessageRef.current = sendMessage;

  // Голосовой ввод — ВСЕГДА автоотправка
  const startVoice = useCallback(async () => {
    if (voiceStartGuardRef.current || micActive || loading) return;
    voiceStartGuardRef.current = true;
    setVoiceMode("voice");
    voiceModeRef.current = "voice";
    openArayPanel();
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
  }, [loading, micActive, micListen, openArayPanel, showVoiceNotice, stopTTS]);
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
    panelOpenRef.current = false;
    setOpen(false);
    try {
      window.localStorage.setItem(ARAY_PANEL_STATE_KEY, "closed");
    } catch {}
    setShowMessages(false);
    setBrowserOpen(false);
    setBrowserAction(null);
    setProactiveBubble(null);
    stopAllAray();
  }, [stopAllAray]);

  useEffect(() => {
    const handler = () => closeArayPanel();
    window.addEventListener("aray:close", handler);
    return () => window.removeEventListener("aray:close", handler);
  }, [closeArayPanel]);

  const resetArayChat = useCallback(() => {
    stopAllAray();
    setArayWorkspaceView("chat");
    setMessages([]);
    setAttachments([]);
    setHistoryExpanded(false);
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
      pushLiveAction("Пишу запрос", action.label, "write");
      setArayWorkspaceView("chat");
      setShowMessages(true);
      if (voiceModeRef.current !== "text") {
        setVoiceMode("text");
        voiceModeRef.current = "text";
        localStorage.setItem("aray-voice-mode", "text");
      }
      void sendMessage(prompt);
      return;
    }
    if (action.type === "navigate" && action.url) {
      const internalPath = toInternalAppPath(action.url);
      if (internalPath?.startsWith("/admin/messenger")) {
        const wantsContact = internalPath.includes("add=contact") || action.label.toLowerCase().includes("контакт");
        openEmbeddedMessenger(wantsContact ? "__add_contact__" : undefined);
        return;
      }
      const openKind = openArayTarget(action.url);
      if (openKind) {
        const label = formatArayActionLabel(action.label);
        pushLiveAction(openKind === "tab" ? "Открыл вкладку" : "Перешёл в раздел", label, "open");
        if (isMobile) stopAraySpeech();
      }
      return;
    }
    if ((action.type === "spotlight" || action.type === "highlight") && action.spotX !== undefined && browserOpen) {
      setBrowserAction({ type: action.type, spotX: action.spotX, spotY: action.spotY, hint: action.hint });
      setTimeout(() => setBrowserAction(null), 5500);
      pushLiveAction("Показываю место", action.hint || action.label, "show");
    }
    if (action.type === "call" && action.url) {
      pushLiveAction("Готовлю звонок", action.label, "open");
      window.location.href = action.url;
    }
  }, [browserOpen, isMobile, openArayTarget, openEmbeddedMessenger, pushLiveAction, sendMessage]);

  const handleOpenAdminPage = useCallback((href: string) => {
    haptic("light");
    if (voiceModeRef.current !== "text") {
      setVoiceMode("text");
      voiceModeRef.current = "text";
      localStorage.setItem("aray-voice-mode", "text");
    }
    pushLiveAction("Открываю страницу", href, "open");
    openArayTarget(href);
    if (isMobile) stopAraySpeech();
    setShowMessages(true);
  }, [isMobile, openArayTarget, pushLiveAction]);

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
    pushLiveAction("Выполняю подтверждённое действие", label, "confirm");
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
      const baseActions = mergeArayActions(actions, contextualActionFallback);
      const finalActions = baseActions;

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
  }, [adminNavigationPayload, applyArayOpenCommands, buildFinalArayText, cartTotal, contextualActionFallback, continueVoiceDialogue, loading, messages, pathname, productName, pushLiveAction, saveMessageToDB]);

  confirmActionRef.current = handleConfirmAction;

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

      <AnimatePresence>
        {open && liveActions.length > 0 && (
          <motion.div
            className="pointer-events-none fixed left-3 right-3 top-3 z-[120] space-y-2 lg:left-auto lg:right-4 lg:top-[calc(64px+0.75rem)] lg:w-[280px]"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            aria-live="polite"
          >
            {liveActions.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                className="rounded-2xl border border-border bg-card px-3 py-2"
              >
                <div className="flex min-w-0 items-start gap-2">
                  <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <MousePointer2 className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-bold text-foreground">{item.label}</span>
                    {item.detail && (
                      <span className="mt-0.5 line-clamp-2 block text-[11px] leading-4 text-muted-foreground">
                        {item.detail}
                      </span>
                    )}
                  </span>
                </div>
              </motion.div>
            ))}
          </motion.div>
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
                      className="w-7 h-7 rounded-xl flex items-center justify-center transition-colors hover:bg-muted/60"
                      style={{ color: speaking ? voiceSpeakingColor : voiceActiveColor }}
                      title={speaking ? "Остановить голос" : "Остановить микрофон"}
                      aria-label={speaking ? "Остановить голос ARAY" : "Остановить микрофон ARAY"}
                    >
                      {speaking ? <VolumeX className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
                    </button>
                  )}
                  {isAdmin && (
                    <button
                      onClick={() => openEmbeddedMessenger()}
                      className="w-7 h-7 rounded-xl flex items-center justify-center transition-colors hover:bg-muted/60"
                      style={{
                        color: arayWorkspaceView === "messenger" ? primaryColor : txtMuted,
                        background: arayWorkspaceView === "messenger" ? primarySoft : "transparent",
                      }}
                      title="Диалоги внутри Арая"
                      aria-label="Открыть диалоги внутри Арая"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button onClick={resetArayChat}
                    className="w-7 h-7 rounded-xl flex items-center justify-center transition-colors hover:bg-muted/60"
                    style={{ color: txtMuted }} title="Новый чат">
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={closeArayPanel}
                    className="w-7 h-7 rounded-xl flex items-center justify-center transition-colors hover:bg-muted/60"
                    style={{ color: txtMuted }}
                    title="Свернуть ARAY"
                    aria-label="Свернуть ARAY">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* ── Основная зона: орб по центру или сообщения ── */}
              <div className="flex-1 flex flex-col overflow-hidden">
                {isAdmin && arayWorkspaceView === "messenger" && (
                  <ArayEmbeddedMessenger
                    staffName={staffName || userName || "Администратор"}
                    onAskAray={askArayFromMessenger}
                    onContextChange={setEmbeddedMessengerContext}
                    onBack={() => setArayWorkspaceView("chat")}
                    initialSearch={embeddedMessengerQuery}
                  />
                )}
                {/* Орб-зона — voice-first центральный элемент */}
                {arayWorkspaceView !== "messenger" && !showMessages && (
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

                    {isAdmin && (
                      <div className="flex w-full flex-col items-center gap-2">
                        {arayPhoneOpen ? (
                          <ArayPhoneShortcutPad
                            onAction={handleAction}
                            onDial={handleArayPhoneDial}
                            onCopyOwnNumber={copyOwnArayPhoneNumber}
                            onShareOwnNumber={shareOwnArayPhoneNumber}
                            onStartOwnVideo={openOwnArayVideoRoom}
                            onCopyVideoInvite={copyOwnArayVideoInvite}
                            onClose={closeArayPhoneHome}
                            isDark={isDark}
                            primaryColor={primaryColor}
                            primarySoft={primarySoft}
                            primaryBorder={primaryBorder}
                            txtSub={txtSub}
                            txt={txt}
                            now={clockNow}
                            ownNumber={arayPhoneOwnerNumber}
                          />
                        ) : (
                          <button
                            type="button"
                            onClick={openArayPhoneHome}
                            className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-[11px] font-semibold transition hover:bg-muted/40"
                            style={{ color: primaryColor, background: primarySoft, border: `1px solid ${primaryBorder}` }}
                          >
                            <Phone className="h-3.5 w-3.5" />
                            Показать AR Phone
                          </button>
                        )}
                        {!arayPhoneOpen && (
                          <ArayWorkspaceBridge
                            onOpenMessenger={() => openEmbeddedMessenger()}
                            onOpenPhone={openArayPhoneHome}
                            phoneOpen={arayPhoneOpen}
                            contextLabel={embeddedMessengerContext?.label}
                            primaryColor={primaryColor}
                            primarySoft={primarySoft}
                            primaryBorder={primaryBorder}
                            txt={txt}
                            txtSub={txtSub}
                          />
                        )}
                      </div>
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
                    {messages.length > 0 && !arayPhoneOpen && !speaking && !listening && !voicePreparing && (
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

                    <div className="flex flex-wrap justify-center gap-2">
                    {messages.length > 1 && !arayPhoneOpen && (
                      <button onClick={() => setShowMessages(true)}
                        className="flex items-center gap-1 text-[11px] px-3 py-1.5 rounded-full transition-all"
                        style={{ color: primaryColor, background: primarySoft, border: `1px solid ${primaryBorder}` }}>
                        <MessageSquare className="w-3 h-3" />
                        История Арая ({messages.length - 1})
                      </button>
                    )}
                    </div>

                    {isAdmin && (
                      <ArayAdminNavigationStrip
                        navigation={adminNavigation}
                        onOpenPage={handleOpenAdminPage}
                        isDark={isDark}
                      />
                    )}

                  </div>
                )}

                {/* Сообщения (текстовый режим или по кнопке) */}
                {arayWorkspaceView !== "messenger" && showMessages && (
                  <div className="flex-1 overflow-y-auto px-4 py-3 overscroll-contain">
                    {isAdmin && (
                      <div className="mb-3 flex flex-col items-center gap-2">
                        {arayPhoneOpen ? (
                          <ArayPhoneShortcutPad
                            onAction={handleAction}
                            onDial={handleArayPhoneDial}
                            onCopyOwnNumber={copyOwnArayPhoneNumber}
                            onShareOwnNumber={shareOwnArayPhoneNumber}
                            onStartOwnVideo={openOwnArayVideoRoom}
                            onCopyVideoInvite={copyOwnArayVideoInvite}
                            onClose={closeArayPhoneHome}
                            isDark={isDark}
                            primaryColor={primaryColor}
                            primarySoft={primarySoft}
                            primaryBorder={primaryBorder}
                            txtSub={txtSub}
                            txt={txt}
                            now={clockNow}
                            ownNumber={arayPhoneOwnerNumber}
                            compact
                          />
                        ) : (
                          <button
                            type="button"
                            onClick={openArayPhoneHome}
                            className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-[11px] font-semibold transition hover:bg-muted/40"
                            style={{ color: primaryColor, background: primarySoft, border: `1px solid ${primaryBorder}` }}
                          >
                            <Phone className="h-3.5 w-3.5" />
                            Показать AR Phone
                          </button>
                        )}
                        {!arayPhoneOpen && (
                          <ArayWorkspaceBridge
                            onOpenMessenger={() => openEmbeddedMessenger()}
                            onOpenPhone={openArayPhoneHome}
                            phoneOpen={arayPhoneOpen}
                            contextLabel={embeddedMessengerContext?.label}
                            primaryColor={primaryColor}
                            primarySoft={primarySoft}
                            primaryBorder={primaryBorder}
                            txt={txt}
                            txtSub={txtSub}
                          />
                        )}
                      </div>
                    )}
                    {/* Кнопка "Свернуть к орбу" */}
                    <div className="flex justify-center mb-3">
                      <button onClick={() => setShowMessages(false)}
                        className="flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full transition-all"
                        style={{ color: txtSub, background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)" }}>
                        <ChevronDown className="w-3 h-3 rotate-180" /> Свернуть к орбу
                      </button>
                    </div>
                    <ArayHistoryCompactNotice
                      count={compactedHistoryCount}
                      expanded={historyExpanded}
                      onToggle={() => setHistoryExpanded((value) => !value)}
                      isDark={isDark}
                    />
                    {visibleConversationMessages.map(m => (
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
              {arayWorkspaceView !== "messenger" && (
              <div className="px-4 py-3 shrink-0" style={{ borderTop: `1px solid ${dividerColor}` }}>
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
                    aria-label="Добавить фото или файл"
                    className="h-10 w-10 rounded-full flex items-center justify-center shrink-0 relative transition-all hover:-translate-y-0.5 disabled:opacity-45 disabled:hover:translate-y-0"
                    style={{ background: inputBg, border: `1px solid ${inputBorder}`, color: attachments.length ? primaryColor : txtSub }}
                    title="Добавить фото или файл"
                  >
                    {attachmentsBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
                  </button>
                  <button
                    onPointerDown={handleVoiceButtonPointerDown}
                    onPointerUp={handleVoiceButtonPointerEnd}
                    onPointerCancel={handleVoiceButtonPointerEnd}
                    onPointerLeave={handleVoiceButtonPointerEnd}
                    onClick={handleVoiceButtonClick}
                    aria-label={voiceMessageRecording ? "Отпустите, чтобы прикрепить голосовое" : listening ? "Остановить голос" : "Голос Арая или удерживать для сообщения"}
                    className="h-10 w-10 rounded-full flex items-center justify-center shrink-0 relative transition-all hover:-translate-y-0.5"
                    style={{
                      background: listening || voiceMessageRecording ? voiceListeningGradient : inputBg,
                      border: `1px solid ${listening || voiceMessageRecording ? "transparent" : inputBorder}`,
                      boxShadow: listening || voiceMessageRecording ? `0 0 14px ${voiceListeningGlow}` : "none",
                    }}>
                    {(listening || voiceMessageRecording) && <span className="absolute inset-0 rounded-full animate-ping"
                      style={{ background: voiceListeningPulse, animationDuration: "1s" }} />}
                    {listening || voiceMessageRecording ? <MicOff className="w-4 h-4 relative z-10" style={{ color: "hsl(var(--primary-foreground))" }} /> : <Mic className="w-4 h-4 relative z-10" style={{ color: txtSub }} />}
                  </button>
                  <textarea
                    ref={inputRef} value={input}
                    onChange={e => setInput(e.target.value)}
                    onPaste={handlePaste}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                    onFocus={() => { if (!showMessages && !arayPhoneOpen) setShowMessages(true); }}
                    rows={1} placeholder={listening ? "Слушаю..." : voicePreparing ? "Включаю микрофон..." : "Написать Араю..."}
                    className="flex-1 resize-none text-[16px] lg:text-[13px] rounded-2xl px-4 py-2.5 focus:outline-none transition-all"
                    style={{ background: inputBg, border: `1px solid ${listening ? voiceListeningBorder : inputBorder}`, color: txt, maxHeight: "80px" }}
                  />
                  <button onClick={() => { haptic("light"); sendMessage(); }} disabled={loading || attachmentsBusy || (!input.trim() && attachments.length === 0)}
                    aria-label="Отправить"
                    className="h-10 w-10 rounded-full flex items-center justify-center shrink-0 transition-all hover:-translate-y-0.5 disabled:opacity-40 disabled:hover:translate-y-0"
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
              )}
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
                      className="w-7 h-7 rounded-xl flex items-center justify-center"
                      style={{ color: speaking ? voiceSpeakingColor : voiceActiveColor }}
                      aria-label={speaking ? "Остановить голос ARAY" : "Остановить микрофон ARAY"}
                    >
                      {speaking ? <VolumeX className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
                    </button>
                  )}
                  {isAdmin && (
                    <button
                      onClick={() => openEmbeddedMessenger()}
                      className="w-7 h-7 rounded-xl flex items-center justify-center"
                      style={{
                        color: arayWorkspaceView === "messenger" ? primaryColor : txtMuted,
                        background: arayWorkspaceView === "messenger" ? primarySoft : "transparent",
                      }}
                      aria-label="Открыть диалоги внутри Арая"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
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
                {isAdmin && arayWorkspaceView === "messenger" && (
                  <ArayEmbeddedMessenger
                    staffName={staffName || userName || "Администратор"}
                    onAskAray={askArayFromMessenger}
                    onContextChange={setEmbeddedMessengerContext}
                    onBack={() => setArayWorkspaceView("chat")}
                    initialSearch={embeddedMessengerQuery}
                  />
                )}
                {arayWorkspaceView !== "messenger" && !showMessages && (
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

                    {isAdmin && (
                      <div className="flex w-full flex-col items-center gap-2">
                        {arayPhoneOpen ? (
                          <ArayPhoneShortcutPad
                            onAction={handleAction}
                            onDial={handleArayPhoneDial}
                            onCopyOwnNumber={copyOwnArayPhoneNumber}
                            onShareOwnNumber={shareOwnArayPhoneNumber}
                            onStartOwnVideo={openOwnArayVideoRoom}
                            onCopyVideoInvite={copyOwnArayVideoInvite}
                            onClose={closeArayPhoneHome}
                            isDark={isDark}
                            primaryColor={primaryColor}
                            primarySoft={primarySoft}
                            primaryBorder={primaryBorder}
                            txtSub={txtSub}
                            txt={txt}
                            now={clockNow}
                            ownNumber={arayPhoneOwnerNumber}
                          />
                        ) : (
                          <button
                            type="button"
                            onClick={openArayPhoneHome}
                            className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-[11px] font-semibold"
                            style={{ color: primaryColor, background: primarySoft, border: `1px solid ${primaryBorder}` }}
                          >
                            <Phone className="h-3.5 w-3.5" />
                            Показать AR Phone
                          </button>
                        )}
                        {!arayPhoneOpen && (
                          <ArayWorkspaceBridge
                            onOpenMessenger={() => openEmbeddedMessenger()}
                            onOpenPhone={openArayPhoneHome}
                            phoneOpen={arayPhoneOpen}
                            contextLabel={embeddedMessengerContext?.label}
                            primaryColor={primaryColor}
                            primarySoft={primarySoft}
                            primaryBorder={primaryBorder}
                            txt={txt}
                            txtSub={txtSub}
                          />
                        )}
                      </div>
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
                    {messages.length > 0 && !arayPhoneOpen && !speaking && !listening && !voicePreparing && (
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

                    <div className="flex flex-wrap justify-center gap-2">
                    {messages.length > 1 && !arayPhoneOpen && (
                      <button onClick={() => setShowMessages(true)}
                        className="flex items-center gap-1 text-[11px] px-3 py-1.5 rounded-full"
                        style={{ color: primaryColor, background: primarySoft, border: `1px solid ${primaryBorder}` }}>
                        <MessageSquare className="w-3 h-3" />
                        История Арая ({messages.length - 1})
                      </button>
                    )}
                    </div>

                    {isAdmin && (
                      <ArayAdminNavigationStrip
                        navigation={adminNavigation}
                        onOpenPage={handleOpenAdminPage}
                        isDark={isDark}
                      />
                    )}

                  </motion.div>
                )}

                {/* Сообщения */}
                {arayWorkspaceView !== "messenger" && showMessages && (
                  <div className="flex-1 overflow-y-auto px-4 py-3 overscroll-contain">
                    {isAdmin && (
                      <div className="mb-3 flex flex-col items-center gap-2">
                        {arayPhoneOpen ? (
                          <ArayPhoneShortcutPad
                            onAction={handleAction}
                            onDial={handleArayPhoneDial}
                            onCopyOwnNumber={copyOwnArayPhoneNumber}
                            onShareOwnNumber={shareOwnArayPhoneNumber}
                            onStartOwnVideo={openOwnArayVideoRoom}
                            onCopyVideoInvite={copyOwnArayVideoInvite}
                            onClose={closeArayPhoneHome}
                            isDark={isDark}
                            primaryColor={primaryColor}
                            primarySoft={primarySoft}
                            primaryBorder={primaryBorder}
                            txtSub={txtSub}
                            txt={txt}
                            now={clockNow}
                            ownNumber={arayPhoneOwnerNumber}
                            compact
                          />
                        ) : (
                          <button
                            type="button"
                            onClick={openArayPhoneHome}
                            className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-[11px] font-semibold"
                            style={{ color: primaryColor, background: primarySoft, border: `1px solid ${primaryBorder}` }}
                          >
                            <Phone className="h-3.5 w-3.5" />
                            Показать AR Phone
                          </button>
                        )}
                        {!arayPhoneOpen && (
                          <ArayWorkspaceBridge
                            onOpenMessenger={() => openEmbeddedMessenger()}
                            onOpenPhone={openArayPhoneHome}
                            phoneOpen={arayPhoneOpen}
                            contextLabel={embeddedMessengerContext?.label}
                            primaryColor={primaryColor}
                            primarySoft={primarySoft}
                            primaryBorder={primaryBorder}
                            txt={txt}
                            txtSub={txtSub}
                          />
                        )}
                      </div>
                    )}
                    <div className="flex justify-center mb-3">
                      <button onClick={() => setShowMessages(false)}
                        className="flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full"
                        style={{ color: txtSub, background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)" }}>
                        <ChevronDown className="w-3 h-3 rotate-180" /> Свернуть к орбу
                      </button>
                    </div>
                    <ArayHistoryCompactNotice
                      count={compactedHistoryCount}
                      expanded={historyExpanded}
                      onToggle={() => setHistoryExpanded((value) => !value)}
                      isDark={isDark}
                    />
                    {visibleConversationMessages.map(m => (
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
              {arayWorkspaceView !== "messenger" && (
              <div className="px-4 py-3 shrink-0" style={{
                borderTop: `1px solid ${dividerColor}`,
                paddingBottom: kbOpen ? "8px" : "max(16px, env(safe-area-inset-bottom, 16px))",
              }}>
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
                        ? <MicOff className="w-6 h-6 relative z-10" style={{ color: "hsl(var(--primary-foreground))" }} />
                        : <Mic className="w-6 h-6 relative z-10" style={{ color: "hsl(var(--primary-foreground))" }} />}
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
                    <button
                      onPointerDown={handleVoiceButtonPointerDown}
                      onPointerUp={handleVoiceButtonPointerEnd}
                      onPointerCancel={handleVoiceButtonPointerEnd}
                      onPointerLeave={handleVoiceButtonPointerEnd}
                      onClick={handleVoiceButtonClick}
                      aria-label={voiceMessageRecording ? "Отпустите, чтобы прикрепить голосовое" : listening ? "Остановить голос" : "Голос Арая или удерживать для сообщения"}
                      className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 relative"
                      style={{
                        background: listening || voiceMessageRecording ? voiceListeningGradient : inputBg,
                        border: `1px solid ${listening || voiceMessageRecording ? "transparent" : inputBorder}`,
                        boxShadow: listening || voiceMessageRecording ? `0 0 14px ${voiceListeningGlow}` : "none",
                      }}>
                    {(listening || voiceMessageRecording) && <span className="absolute inset-0 rounded-full animate-ping"
                      style={{ background: voiceListeningPulse, animationDuration: "1s" }} />}
                    {listening || voiceMessageRecording ? <MicOff className="w-4 h-4 relative z-10" style={{ color: "hsl(var(--primary-foreground))" }} /> : <Mic className="w-4 h-4 relative z-10" style={{ color: txtSub }} />}
                    </button>
                    <textarea
                      ref={inputRef} value={input}
                      onChange={e => setInput(e.target.value)}
                      onPaste={handlePaste}
                      onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                      onFocus={() => {
                        if (!arayPhoneOpen) {
                          setShowMessages(true);
                          setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 300);
                        }
                      }}
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
              )}
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
