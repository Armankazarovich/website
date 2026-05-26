"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckSquare,
  ChevronDown,
  Copy,
  CreditCard,
  ExternalLink,
  FileText,
  History,
  Heart,
  Link2,
  Loader2,
  Lock,
  Mic,
  MicOff,
  MessageCircle,
  MessageSquare,
  PhoneCall,
  Reply,
  RefreshCw,
  Search,
  Send,
  Settings,
  Share2,
  SlidersHorizontal,
  Trash2,
  UserPlus,
  Video,
  Wallet,
  X,
} from "lucide-react";
import { ArayIcon, ArayOrb } from "@/components/shared/aray-orb";
import { createArayMeetingUrl, createStableArayNumber, formatArayPublicNumber } from "@/lib/aray-communication-identity";
import { buildArayBusinessMessengerText } from "@/lib/aray-business-messenger";
import { cn } from "@/lib/utils";

type MessengerActivity = {
  id: string;
  type: string;
  text: string;
  createdAt: string;
};

type MessengerCommerceProfile = {
  orderCount: number;
  paidOrderCount: number;
  unpaidOrderCount: number;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  lastOrderAt: string | null;
  bonusPoints: number;
  loyaltyLevel: string;
  walletStatus: string;
  paymentSetupStatus: string;
};

type InlineArayAction = {
  type: "navigate" | "prompt";
  label: string;
  url?: string;
  prompt?: string;
  icon?: string;
};

type PrivateArayMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  createdAt: string;
  streaming?: boolean;
  actions?: InlineArayAction[];
};

type MessengerActionTileProps = {
  icon: ReactNode;
  label: string;
  helper?: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
};

type SmartMessengerAction = {
  id: string;
  label: string;
  helper: string;
  icon: ReactNode;
  onClick: () => void;
  disabled?: boolean;
};

type MessengerThread = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  company: string | null;
  stage: string;
  comment: string | null;
  tags: string[];
  updatedAt: string;
  deletedAt?: string | null;
  activities: MessengerActivity[];
  activityCount: number;
  lastActivityText: string;
  lastActivityAt: string;
  commerce?: MessengerCommerceProfile;
  virtualKind?: "account" | "email";
};

type MessengerResponse = {
  threads: MessengerThread[];
};

type SpeechWindow = Window & {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
};

type ComposerRoute = "auto" | "person" | "aray";

export type ArayEmbeddedMessengerPrompt = {
  text: string;
  displayText?: string;
  context?: string;
  actions?: InlineArayAction[];
};

export type ArayEmbeddedMessengerContext = {
  label: string;
  context: string;
};

const STAGE_LABELS: Record<string, string> = {
  NEW: "Новый",
  CONTACTED: "На связи",
  QUALIFIED: "Проверен",
  MEETING: "Встреча",
  PROPOSAL: "КП",
  NEGOTIATION: "Обсуждение",
  WON: "Успех",
  LOST: "Потерян",
  DEFERRED: "Отложен",
  RECURRING: "Повторный",
};

const QUICK_DRAFTS = [
  {
    label: "Удобное время",
    text: "Здравствуйте. Подскажите, пожалуйста, удобное время для связи.",
  },
  {
    label: "Адрес и объем",
    text: "Здравствуйте. Пришлите, пожалуйста, адрес и нужный объем.",
  },
  {
    label: "Проверю наличие",
    text: "Здравствуйте. Я проверю наличие и вернусь с точным расчетом.",
  },
  {
    label: "КП",
    text: "Здравствуйте. Подготовлю короткое предложение по цене, срокам и доставке.",
  },
];

const DOCUMENT_DRAFTS = [
  {
    type: "КП",
    label: "КП",
    hint: "цена, сроки, доставка",
  },
  {
    type: "счет",
    label: "Счет",
    hint: "черновик для оплаты",
  },
  {
    type: "договор",
    label: "Договор",
    hint: "условия поставки",
  },
] as const;

const ARAY_VIDEO_MEETING_BASE_URL =
  process.env.NEXT_PUBLIC_ARAY_VIDEO_MEETING_BASE_URL ||
  process.env.NEXT_PUBLIC_ARAY_MEETING_BASE_URL ||
  "https://meet.jit.si";
const ARAY_MESSENGER_PRIVATE_KEY_PREFIX = "aray-messenger-private-v2:";

function stripPrefix(text: string) {
  return text.replace(/^(Менеджер|Клиент|ARAY|Система)\s*:\s*/i, "").trim();
}

function getDirection(activity: MessengerActivity) {
  const text = activity.text.trim();
  if (/^Клиент\s*:/i.test(text)) return "client";
  if (/^ARAY\s*:/i.test(text)) return "aray";
  if (/^Система\s*:/i.test(text) || activity.type === "SYSTEM" || /Этап измен[её]н/i.test(text)) return "system";
  return "manager";
}

function isStageSystemEvent(activity: MessengerActivity) {
  return getDirection(activity) === "system" && /Этап измен[её]н/i.test(activity.text);
}

function formatSystemEventText(text: string) {
  return stripPrefix(text)
    .replace(/^Этап измен[её]н:\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function stripPrivateArayControlText(raw: string) {
  return raw
    .replace(/\n__ARAY_CONFIRM__[\s\S]*?(?=\n__ARAY_META__|$)/g, "")
    .replace(/\n?ARAY_ACTIONS:\[[\s\S]*?\](?=\n__ARAY_META__|\n__ARAY_ERR__|\n__ARAY_ADD_CART:|\n__ARAY_NAVIGATE:|\n__ARAY_POPUP:|\n__ARAY_SHOW_URL:|\n__ARAY_REFRESH__|$)/g, "")
    .replace(/\n__ARAY_META__[\s\S]*$/g, "")
    .replace(/__ARAY_ERR__[\s\S]*$/g, "")
    .replace(/__ARAY_ADD_CART:.+?__/g, "")
    .replace(/__ARAY_NAVIGATE:.+?__/g, "")
    .replace(/__ARAY_POPUP:\{.+?\}__/g, "")
    .replace(/__ARAY_SHOW_URL:[\s\S]+?__/g, "")
    .replace(/__ARAY_REFRESH__/g, "")
    .replace(/\[Режим\][\s\S]*?(?=\n\[Запрос\]|\n\[Контекст диалога\]|$)/g, "")
    .replace(/\[Контекст диалога\][\s\S]*?(?=\n\[Последние сообщения\]|$)/g, "")
    .replace(/\[Последние сообщения\][\s\S]*$/g, "")
    .replace(/Ты приватный помощник менеджера внутри бизнес-переписки\./gi, "")
    .replace(/Собеседник не видит твой ответ\./gi, "")
    .replace(/Отвечай коротко[^.]*\./gi, "")
    .replace(/Важные действия[^.]*\./gi, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .trim();
}

function safeMessengerHref(value: string) {
  const href = value.trim();
  if (!href) return null;
  if (href.startsWith("/") && !href.startsWith("//")) return href;
  try {
    const parsed = new URL(href);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") return parsed.toString();
  } catch {}
  return null;
}

function trimUrlToken(value: string) {
  let href = value;
  let suffix = "";
  while (/[.,!?;:\]]$/.test(href)) {
    suffix = `${href.slice(-1)}${suffix}`;
    href = href.slice(0, -1);
  }
  return { href, suffix };
}

function compactMessengerUrlLabel(href: string) {
  try {
    const parsed = new URL(href, "https://pilorus.local");
    if (href.startsWith("/")) return parsed.pathname.slice(0, 42) || "/";
    const host = parsed.hostname.replace(/^www\./i, "");
    return `Открыть ${host}`;
  } catch {
    return "Открыть ссылку";
  }
}

function renderMessengerInline(text: string, keyPrefix: string): ReactNode[] {
  const tokenPattern = /(\*\*[^*\n]+\*\*|`[^`\n]+`|\[[^\]\n]{1,140}\]\((?:https?:\/\/|\/)[^\s)]+\)|https?:\/\/[^\s<>()]+|\/[A-Za-z0-9][^\s<>()]*)/g;
  const nodes: ReactNode[] = [];
  let cursor = 0;
  let index = 0;

  for (const match of text.matchAll(tokenPattern)) {
    const raw = match[0];
    const start = match.index ?? 0;
    if (start > cursor) nodes.push(text.slice(cursor, start));

    const markdownLink = raw.match(/^\[([^\]\n]+)\]\(([^)]+)\)$/);
    if (markdownLink) {
      const href = safeMessengerHref(markdownLink[2]);
      const label = markdownLink[1].trim().slice(0, 80) || compactMessengerUrlLabel(markdownLink[2]);
      nodes.push(
        href ? (
          <a
            key={`${keyPrefix}-link-${index}`}
            href={href}
            target={href.startsWith("/") ? undefined : "_blank"}
            rel={href.startsWith("/") ? undefined : "noopener noreferrer"}
            className="font-semibold text-primary underline decoration-primary/35 underline-offset-2 transition-colors hover:decoration-primary"
          >
            {label}
          </a>
        ) : label,
      );
    } else if (raw.startsWith("**") && raw.endsWith("**")) {
      nodes.push(<strong key={`${keyPrefix}-strong-${index}`} className="font-semibold">{raw.slice(2, -2)}</strong>);
    } else if (raw.startsWith("`") && raw.endsWith("`")) {
      nodes.push(
        <code key={`${keyPrefix}-code-${index}`} className="rounded bg-muted/45 px-1 py-0.5 font-mono text-[11px] text-primary">
          {raw.slice(1, -1)}
        </code>,
      );
    } else {
      const { href: rawHref, suffix } = trimUrlToken(raw);
      const href = safeMessengerHref(rawHref);
      nodes.push(
        href ? (
          <a
            key={`${keyPrefix}-url-${index}`}
            href={href}
            target={href.startsWith("/") ? undefined : "_blank"}
            rel={href.startsWith("/") ? undefined : "noopener noreferrer"}
            className="font-semibold text-primary underline decoration-primary/35 underline-offset-2 transition-colors hover:decoration-primary"
          >
            {compactMessengerUrlLabel(rawHref)}
          </a>
        ) : raw,
      );
      if (suffix) nodes.push(suffix);
    }

    cursor = start + raw.length;
    index += 1;
  }

  if (cursor < text.length) nodes.push(text.slice(cursor));
  return nodes;
}

function MessengerMessageText({ text, fallback = "" }: { text: string; fallback?: string }) {
  const value = text || fallback;
  if (!value) return null;
  const lines = value.split("\n");

  return (
    <span className="whitespace-pre-wrap break-words" style={{ overflowWrap: "anywhere", wordBreak: "break-word" }}>
      {lines.map((line, index) => (
        <span key={`line-${index}`}>
          {renderMessengerInline(line, `line-${index}`)}
          {index < lines.length - 1 ? <br /> : null}
        </span>
      ))}
    </span>
  );
}

function MessengerActionTile({
  icon,
  label,
  helper,
  onClick,
  disabled,
  danger,
}: MessengerActionTileProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex min-h-11 items-center gap-2 rounded-xl border px-2.5 text-left transition disabled:opacity-45",
        danger
          ? "border-destructive/25 bg-background/65 text-destructive hover:bg-destructive/10"
          : "aray-dialog-action-tile border-transparent bg-muted/20 text-foreground hover:bg-primary/10 hover:text-primary",
      )}
    >
      <span className={cn("inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-xl", danger ? "bg-destructive/10" : "bg-primary/10 text-primary")}>
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[11px] font-bold">{label}</span>
        {helper ? <span className="block truncate text-[9.5px] font-normal text-muted-foreground">{helper}</span> : null}
      </span>
    </button>
  );
}

function parseShowUrlPayload(raw: string): { url: string; title?: string } | null {
  const match = raw.match(/__ARAY_SHOW_URL:([\s\S]+?)__/);
  if (!match) return null;
  const value = match[1].trim();
  if (!value) return null;
  const protocolIndex = value.indexOf("://");
  const separatorIndex = value.indexOf(":", protocolIndex >= 0 ? protocolIndex + 3 : 0);
  if (separatorIndex < 0) return { url: value };
  return {
    url: value.slice(0, separatorIndex).trim(),
    title: value.slice(separatorIndex + 1).trim() || undefined,
  };
}

function extractInlineArayActions(raw: string): InlineArayAction[] {
  const actions = new Map<string, InlineArayAction>();
  const addAction = (action: InlineArayAction | null) => {
    if (!action?.label?.trim()) return;
    const key = `${action.type}:${action.url || action.prompt || action.label}`;
    if (!actions.has(key)) {
      actions.set(key, { ...action, label: action.label.trim().slice(0, 54) });
    }
  };

  const actionsMatch = raw.match(
    /ARAY_ACTIONS:(\[[\s\S]*?\])(?=\n__ARAY_META__|\n__ARAY_ERR__|\n__ARAY_ADD_CART:|\n__ARAY_NAVIGATE:|\n__ARAY_POPUP:|\n__ARAY_SHOW_URL:|\n__ARAY_REFRESH__|$)/,
  );
  if (actionsMatch?.[1]) {
    try {
      const parsed = JSON.parse(actionsMatch[1]);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          const type = item?.type === "prompt" ? "prompt" : "navigate";
          const label = typeof item?.label === "string" ? item.label : "";
          const url = typeof item?.url === "string" ? item.url : undefined;
          const prompt = typeof item?.prompt === "string" ? item.prompt : undefined;
          if (type === "navigate" && url) addAction({ type, label: label || "Открыть", url, icon: item?.icon });
          if (type === "prompt" && prompt) addAction({ type, label: label || "Спросить Арая", prompt, icon: item?.icon });
        }
      }
    } catch {
      // If the model returned malformed metadata, keep the visible message clean and skip buttons.
    }
  }

  for (const match of raw.matchAll(/__ARAY_NAVIGATE:([\s\S]+?)__/g)) {
    const url = match[1]?.trim();
    if (url) addAction({ type: "navigate", label: "Открыть раздел", url, icon: "navigate" });
  }

  const showUrl = parseShowUrlPayload(raw);
  if (showUrl?.url) {
    addAction({ type: "navigate", label: showUrl.title || "Открыть источник", url: showUrl.url, icon: "external" });
  }

  return Array.from(actions.values()).slice(0, 4);
}

function messageRoleLabel(direction: string, staffName?: string) {
  if (direction === "client") return "Собеседник";
  if (direction === "manager") return staffName || "Менеджер";
  if (direction === "aray") return "Арай";
  return "Система";
}

function compactMessengerActivities(activities: MessengerActivity[]) {
  const visible: Array<
    | { kind: "activity"; activity: MessengerActivity }
    | { kind: "summary"; id: string; text: string; count: number; events: MessengerActivity[] }
  > = [];
  const stageEvents = activities.filter(isStageSystemEvent);
  const stageEventIds = new Set(stageEvents.map((activity) => activity.id));
  const latestStage = stageEvents[stageEvents.length - 1];

  if (stageEvents.length > 2 && latestStage) {
    visible.push({
      kind: "summary",
      id: "stage-summary",
      count: stageEvents.length,
      events: stageEvents,
      text: `CRM-история: ${stageEvents.length} изменений этапа. Последнее: ${formatSystemEventText(latestStage.text)}`,
    });
  }

  for (const activity of activities) {
    if (stageEventIds.has(activity.id)) {
      if (stageEvents.length > 2) continue;
    }
    visible.push({ kind: "activity", activity });
  }

  return visible;
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatShortTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function isArayDirectedMessage(text: string) {
  const normalized = text.trim().toLowerCase().replace(/ё/g, "е");
  return /(^|\s)(арай|aray)(\s|,|\.|!|\?|:|$)/i.test(normalized);
}

function isArayIntentMessage(text: string) {
  const normalized = text.trim().toLowerCase().replace(/ё/g, "е");
  if (!normalized) return false;
  if (isArayDirectedMessage(normalized)) return true;
  if (/\b(что|как)\s+(ему|ей|клиенту|собеседнику|покупателю)\s+(сказать|ответить|написать)\b/.test(normalized)) return true;
  if (/\b(как|что)\s+(ответить|написать|сказать|сделать дальше)\b/.test(normalized)) return true;
  if (/\b(помоги|посоветуй|как лучше|что делать дальше|следующий шаг|сформулируй|исправь|улучши|переведи)\b/.test(normalized)) return true;
  if (/^(найди|поищи|открой|покажи|построй|подбери|проверь|объясни|расскажи|подготовь|создай)\b/.test(normalized)) return true;
  return false;
}

function threadSubtitle(thread: MessengerThread) {
  return [thread.phone, thread.email, thread.company].filter(Boolean).join(" · ") || "CRM-диалог";
}

function formatMoneyShort(value?: number | null) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount) || amount <= 0) return "0 ₽";
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatShortContactPhone(phone?: string | null) {
  const digits = phone?.replace(/\D/g, "") || "";
  if (digits.length < 6) return phone || "";
  const last = digits.slice(-4);
  const prefix = digits.length > 10 ? `+${digits.slice(0, digits.length - 10)}` : "";
  return `${prefix}•••${last}`;
}

function getThreadSmartFacts(thread: MessengerThread) {
  return [
    thread.phone ? { label: formatShortContactPhone(thread.phone), title: thread.phone } : null,
    { label: STAGE_LABELS[thread.stage] || thread.stage, title: "Этап CRM" },
    thread.activityCount > 0 ? { label: `${thread.activityCount} событий`, title: "История CRM" } : null,
    thread.company ? { label: thread.company, title: "Компания" } : null,
  ].filter(Boolean) as Array<{ label: string; title: string }>;
}

function cleanProofreadText(raw: string) {
  return stripPrivateArayControlText(raw)
    .replace(/^исправленный текст\s*:\s*/i, "")
    .replace(/^исправлено\s*:\s*/i, "")
    .replace(/^текст\s*:\s*/i, "")
    .trim()
    .replace(/^["«]+|["»]+$/g, "")
    .trim();
}

function getArayInternalNumber(thread: MessengerThread) {
  const commentNumber = thread.comment?.match(/\bAR\s*\d{4}\s*\d{2}\s*\d{2}\b/i)?.[0];
  if (commentNumber) {
    const digits = commentNumber.replace(/\D/g, "");
    if (digits.length >= 8) return `AR ${digits.slice(-8, -4)} ${digits.slice(-4, -2)} ${digits.slice(-2)}`;
  }
  return createStableArayNumber({ id: thread.id });
}

function normalizeArayDialValue(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function arayDialDigits(value: string) {
  return value.replace(/\D/g, "");
}

function isLikelyPhoneDial(value: string) {
  const normalized = normalizeArayDialValue(value);
  return !normalized.startsWith("AR") && arayDialDigits(value).length >= 5;
}

function findThreadByArayDial(threads: MessengerThread[], value: string) {
  const dial = normalizeArayDialValue(value);
  const digits = arayDialDigits(value);
  if (!dial && !digits) return null;

  return threads.find((thread) => {
    const arayNumber = getArayInternalNumber(thread);
    const normalizedNumber = normalizeArayDialValue(arayNumber);
    const numberDigits = arayDialDigits(arayNumber);
    const phoneDigits = arayDialDigits(thread.phone || "");
    return (
      normalizedNumber === dial ||
      (dial.length >= 6 && normalizedNumber.endsWith(dial)) ||
      (digits.length >= 6 && numberDigits.endsWith(digits)) ||
      (digits.length >= 7 && phoneDigits.endsWith(digits.slice(-7)))
    );
  }) || null;
}

function getArayMeetingUrl(thread: MessengerThread) {
  return createArayMeetingUrl(getArayInternalNumber(thread), ARAY_VIDEO_MEETING_BASE_URL);
}

function getCallPhoneHref(phone?: string | null) {
  const clean = phone?.replace(/[^\d+]/g, "") || "";
  if (!clean || clean.length < 5) return null;
  return `tel:${clean}`;
}

async function writeTextToClipboard(text: string) {
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

async function shareTextPayload({ title, text, url }: { title: string; text: string; url?: string }) {
  const canShare = typeof navigator !== "undefined" && "share" in navigator;
  if (canShare) {
    try {
      await (navigator as Navigator & {
        share?: (data: { title?: string; text?: string; url?: string }) => Promise<void>;
      }).share?.({ title, text, url });
      return "shared" as const;
    } catch {
      // User cancel or blocked share sheet: fall back to copy below.
    }
  }
  const copied = await writeTextToClipboard([text, url].filter(Boolean).join("\n"));
  return copied ? "copied" as const : "failed" as const;
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] || "A";
  const second = parts.length > 1 ? parts[1]?.[0] : "";
  return `${first}${second}`.toUpperCase();
}

function createArayContext(thread: MessengerThread) {
  return [
    "Раздел: ARAY Messenger внутри чата Арая.",
    `Собеседник: ${thread.name}.`,
    `Внутренний AR номер: ${getArayInternalNumber(thread)}.`,
    thread.phone ? `Телефон: ${thread.phone}.` : null,
    thread.email ? `Почта: ${thread.email}.` : null,
    thread.company ? `Компания: ${thread.company}.` : null,
    `Статус CRM: ${STAGE_LABELS[thread.stage] || thread.stage}.`,
    "Помогай в переписке, формулируй по-человечески, без воды и без агрессии.",
    "Важные действия не выполняй без подтверждения человека.",
  ].filter(Boolean).join("\n");
}

export function ArayEmbeddedMessenger({
  staffName,
  onAskAray,
  onContextChange,
  onBack,
  initialSearch,
  initialLeadId,
}: {
  staffName?: string;
  onAskAray: (payload: ArayEmbeddedMessengerPrompt) => void;
  onContextChange?: (context: ArayEmbeddedMessengerContext | null) => void;
  onBack: () => void;
  initialSearch?: string | null;
  initialLeadId?: string | null;
}) {
  const router = useRouter();
  const initialSearchValue = initialSearch?.trim().startsWith("__") ? "" : initialSearch?.trim() || "";
  const [threads, setThreads] = useState<MessengerThread[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState(initialSearchValue);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [threadListOpen, setThreadListOpen] = useState(true);
  const [systemEventsOpen, setSystemEventsOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [callStudioOpen, setCallStudioOpen] = useState(false);
  const [videoRoomOpen, setVideoRoomOpen] = useState(false);
  const [pendingDialNumber, setPendingDialNumber] = useState("");
  const [threadSettingsOpen, setThreadSettingsOpen] = useState(false);
  const [contactFormOpen, setContactFormOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [contactDraft, setContactDraft] = useState({
    name: "",
    phone: "",
    email: "",
    company: "",
    message: "",
  });
  const [creatingContact, setCreatingContact] = useState(false);
  const [composerRoute, setComposerRoute] = useState<ComposerRoute>("auto");
  const [proofreadingDraft, setProofreadingDraft] = useState(false);
  const [draftReview, setDraftReview] = useState<{ source: string; corrected: string } | null>(null);
  const [privateArayOpen, setPrivateArayOpen] = useState(false);
  const [composerMode, setComposerMode] = useState<"client" | "aray">("client");
  const [privateArayBusy, setPrivateArayBusy] = useState(false);
  const [privateArayMessages, setPrivateArayMessages] = useState<PrivateArayMessage[]>([]);
  const [inputListening, setInputListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const inputSpeechRecognitionRef = useRef<any>(null);
  const inputSpeechTranscriptRef = useRef("");
  const autoOpenSearchRef = useRef("");
  const pendingDialNumberRef = useRef("");
  const initialLeadIdRef = useRef(initialLeadId?.trim() || "");
  const privateArayThreadIdRef = useRef<string | null>(null);

  const selected = useMemo(
    () => threads.find((thread) => thread.id === selectedId) || threads[0] || null,
    [selectedId, threads],
  );
  const autoDraftGoesToAray = useMemo(() => isArayIntentMessage(draft), [draft]);
  const draftGoesToAray = composerRoute === "auto" ? autoDraftGoesToAray : composerRoute === "aray";
  const visibleActivities = useMemo(
    () => selected ? compactMessengerActivities(selected.activities) : [],
    [selected],
  );

  useEffect(() => {
    const query = initialSearch?.trim();
    if (!query) return;
    if (query === "__add_contact__") {
      autoOpenSearchRef.current = "";
      pendingDialNumberRef.current = "";
      setPendingDialNumber("");
      setSearch("");
      setThreadListOpen(true);
      setContactFormOpen(true);
      setStatus("Добавь имя, телефон, почту или компанию");
      return;
    }
    if (query.startsWith("__aray_dial__:")) {
      const dial = query.slice("__aray_dial__:".length).trim().toUpperCase();
      autoOpenSearchRef.current = "";
      pendingDialNumberRef.current = dial;
      setPendingDialNumber(dial);
      setSearch("");
      setThreadListOpen(true);
      setContactFormOpen(false);
      setCallStudioOpen(false);
      setStatus(dial ? `Ищу внутренний номер ${dial}` : "Введи внутренний номер AR Phone");
      return;
    }
    pendingDialNumberRef.current = "";
    setPendingDialNumber("");
    autoOpenSearchRef.current = query.toLowerCase();
    setSearch(query);
    setThreadListOpen(true);
  }, [initialSearch]);

  useEffect(() => {
    const cleanLeadId = initialLeadId?.trim() || "";
    if (!cleanLeadId) {
      initialLeadIdRef.current = "";
      return;
    }
    if (initialLeadIdRef.current === cleanLeadId) return;
    initialLeadIdRef.current = cleanLeadId;
    autoOpenSearchRef.current = "";
    setThreadListOpen(true);
  }, [initialLeadId]);

  const fetchThreads = useCallback(async (query = search) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      const cleanQuery = query.trim();
      const cleanLeadId = initialLeadIdRef.current;
      if (cleanQuery) params.set("search", cleanQuery);
      if (cleanLeadId) params.set("leadId", cleanLeadId);
      const res = await fetch(`/api/admin/messenger/threads?${params.toString()}`, { cache: "no-store" });
      const data: MessengerResponse & { error?: string } = await res.json();
      if (!res.ok) throw new Error(data.error || "Не удалось открыть диалоги");
      const nextThreads = data.threads || [];
      setThreads(nextThreads);
      if (cleanLeadId) {
        const match = nextThreads.find((thread) => thread.id === cleanLeadId);
        initialLeadIdRef.current = "";
        if (match) {
          autoOpenSearchRef.current = "";
          setSelectedId(match.id);
          setThreadListOpen(false);
          setContactFormOpen(false);
          setStatus(`Открыл диалог: ${match.name}`);
          return;
        }
      }
      const pendingDial = pendingDialNumberRef.current;
      if (pendingDial) {
        const match = findThreadByArayDial(nextThreads, pendingDial);
        if (match) {
          pendingDialNumberRef.current = "";
          setPendingDialNumber("");
          setSelectedId(match.id);
          setThreadListOpen(false);
          setCallStudioOpen(true);
          setStatus(`Открыл AR Phone для ${match.name}`);
        } else {
          pendingDialNumberRef.current = "";
          try {
            const res = await fetch("/api/admin/messenger/aray-phone/resolve", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ number: pendingDial }),
            });
            const data: { thread?: MessengerThread; arayNumber?: string; error?: string } = await res.json().catch(() => ({}));
            if (res.ok && data.thread) {
              setThreads((current) => {
                const without = current.filter((item) => item.id !== data.thread!.id);
                return [data.thread!, ...without];
              });
              setPendingDialNumber("");
              setSelectedId(data.thread.id);
              setThreadListOpen(false);
              setContactFormOpen(false);
              setCallStudioOpen(true);
              setStatus(`Открыл AR Phone для ${data.thread.name}`);
              return;
            }
          } catch {
            // If the directory cannot resolve the number, we fall back to creating a contact.
          }
          setThreadListOpen(true);
          setContactFormOpen(true);
          setContactDraft((current) => ({
            ...current,
            phone: isLikelyPhoneDial(pendingDial) && !current.phone ? pendingDial : current.phone,
            message: current.message || `Искали AR Phone номер: ${pendingDial}`,
          }));
          setStatus(`Не нашёл номер ${pendingDial}. Открыл создание контакта.`);
        }
        return;
      }
      const autoQuery = cleanQuery.toLowerCase();
      if (autoQuery && autoOpenSearchRef.current === autoQuery && nextThreads.length > 0) {
        const match = nextThreads.find((thread) =>
          [thread.name, thread.phone || "", thread.email || "", thread.company || "", thread.lastActivityText || ""]
            .join(" ")
            .toLowerCase()
            .includes(autoQuery)
        ) || nextThreads[0];
        autoOpenSearchRef.current = "";
        setSelectedId(match.id);
        setThreadListOpen(false);
        setStatus(`Открыл диалог: ${match.name}`);
        return;
      }
      setSelectedId((current) => {
        if (current && nextThreads.some((thread) => thread.id === current)) return current;
        return nextThreads[0]?.id || null;
      });
    } catch (error: any) {
      setStatus(error?.message || "Диалоги не загрузились");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchThreads(search);
    }, search ? 220 : 0);
    return () => window.clearTimeout(timer);
  }, [fetchThreads, search]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [privateArayMessages.length, selected?.activities.length, selectedId]);

  useEffect(() => {
    if (!draftReview) return;
    const clean = draft.trim();
    if (!clean || clean === draftReview.source || clean === draftReview.corrected) return;
    setDraftReview(null);
  }, [draft, draftReview]);

  const replaceThread = useCallback((thread: MessengerThread) => {
    setThreads((current) => {
      const without = current.filter((item) => item.id !== thread.id);
      return [thread, ...without];
    });
    setSelectedId(thread.id);
    setThreadListOpen(false);
  }, []);

  const restoreArchivedThread = useCallback(async (thread: MessengerThread) => {
    if (!thread.deletedAt) return true;
    setStatus(`Восстанавливаю диалог: ${thread.name}`);
    try {
      const res = await fetch(`/api/admin/messenger/threads/${thread.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restore" }),
      });
      const data: { error?: string } = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Диалог не восстановлен");
      setThreads((current) =>
        current.map((item) =>
          item.id === thread.id
            ? {
                ...item,
                deletedAt: null,
                tags: Array.from(new Set([...(item.tags || []), "messenger", "restored"])),
              }
            : item,
        ),
      );
      setStatus(`Диалог восстановлен: ${thread.name}`);
      return true;
    } catch (error: any) {
      setStatus(error?.message || "Диалог не восстановлен");
      return false;
    }
  }, []);

  const openDirectoryAccountThread = useCallback(async (thread: MessengerThread) => {
    if (thread.virtualKind !== "account" && !thread.id.startsWith("account:")) return false;
    setStatus(`Открываю аккаунт: ${thread.name}`);
    try {
      const res = await fetch("/api/admin/messenger/aray-phone/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ number: getArayInternalNumber(thread) }),
      });
      const data: { thread?: MessengerThread; error?: string } = await res.json().catch(() => ({}));
      if (!res.ok || !data.thread) throw new Error(data.error || "Аккаунт не открыт");

      setThreads((current) => {
        const without = current.filter((item) => item.id !== thread.id && item.id !== data.thread!.id);
        return [data.thread!, ...without];
      });
      setSelectedId(data.thread.id);
      setThreadListOpen(false);
      setContactFormOpen(false);
      setSystemEventsOpen(false);
      setToolsOpen(false);
      setCallStudioOpen(false);
      setVideoRoomOpen(false);
      setThreadSettingsOpen(false);
      setDeleteConfirmOpen(false);
      setComposerRoute("auto");
      setPrivateArayOpen(false);
      setComposerMode("client");
      setPrivateArayBusy(false);
      setProofreadingDraft(false);
      setDraftReview(null);
      privateArayThreadIdRef.current = null;
      setPrivateArayMessages([]);
      setDraft("");
      setStatus(`Открыл чат и AR Phone: ${data.thread.name}`);
      return true;
    } catch (error: any) {
      setContactDraft((current) => ({
        ...current,
        name: current.name || thread.name,
        phone: current.phone || thread.phone || "",
        email: current.email || thread.email || "",
        company: current.company || thread.company || "",
        message: current.message || "Контакт найден в аккаунтах ARAY",
      }));
      setContactFormOpen(true);
      setThreadListOpen(true);
      setStatus(error?.message || "Аккаунт найден. Проверь данные и создай контакт.");
      return true;
    }
  }, []);

  const openEmailContactThread = useCallback(async (thread: MessengerThread) => {
    if (thread.virtualKind !== "email" && !thread.id.startsWith("email:")) return false;
    setStatus(`Открываю почтовый контакт: ${thread.email || thread.name}`);
    try {
      const res = await fetch("/api/admin/messenger/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: thread.name || thread.email || "Почтовый контакт",
          phone: "",
          email: thread.email || thread.id.replace(/^email:/, ""),
          company: "Почта",
          message: "Контакт открыт из почтовой базы ARAY",
        }),
      });
      const data: { thread?: MessengerThread; error?: string } = await res.json().catch(() => ({}));
      if (!res.ok || !data.thread) throw new Error(data.error || "Почтовый контакт не открыт");

      setThreads((current) => {
        const without = current.filter((item) => item.id !== thread.id && item.id !== data.thread!.id);
        return [data.thread!, ...without];
      });
      setSelectedId(data.thread.id);
      setThreadListOpen(false);
      setContactFormOpen(false);
      setSystemEventsOpen(false);
      setToolsOpen(false);
      setCallStudioOpen(false);
      setVideoRoomOpen(false);
      setThreadSettingsOpen(false);
      setDeleteConfirmOpen(false);
      setComposerRoute("auto");
      setPrivateArayOpen(false);
      setComposerMode("client");
      setPrivateArayBusy(false);
      setProofreadingDraft(false);
      setDraftReview(null);
      privateArayThreadIdRef.current = null;
      setPrivateArayMessages([]);
      setDraft("");
      setStatus(`Почтовый контакт открыт: ${data.thread.name}`);
      return true;
    } catch (error: any) {
      setContactDraft((current) => ({
        ...current,
        name: current.name || thread.name,
        phone: current.phone || "",
        email: current.email || thread.email || thread.id.replace(/^email:/, ""),
        company: current.company || "Почта",
        message: current.message || "Контакт из почтовой базы ARAY",
      }));
      setContactFormOpen(true);
      setThreadListOpen(true);
      setStatus(error?.message || "Проверь почтовый контакт и создай диалог.");
      return true;
    }
  }, []);

  const openThread = useCallback(async (id: string) => {
    const thread = threads.find((item) => item.id === id);
    if (thread && (thread.virtualKind === "account" || thread.id.startsWith("account:"))) {
      const opened = await openDirectoryAccountThread(thread);
      if (opened) return;
    }
    if (thread && (thread.virtualKind === "email" || thread.id.startsWith("email:"))) {
      const opened = await openEmailContactThread(thread);
      if (opened) return;
    }
    if (thread?.deletedAt) {
      const restored = await restoreArchivedThread(thread);
      if (!restored) return;
    }
    setSelectedId(id);
    setThreadListOpen(false);
    setContactFormOpen(false);
    setSystemEventsOpen(false);
    setToolsOpen(false);
    setCallStudioOpen(false);
    setVideoRoomOpen(false);
    setThreadSettingsOpen(false);
    setDeleteConfirmOpen(false);
    setComposerRoute("auto");
    setPrivateArayOpen(false);
    setComposerMode("client");
    setPrivateArayBusy(false);
    setProofreadingDraft(false);
    setDraftReview(null);
    privateArayThreadIdRef.current = null;
    setPrivateArayMessages([]);
    setDraft("");
    setStatus(thread?.deletedAt ? "Диалог восстановлен и открыт" : null);
  }, [openDirectoryAccountThread, openEmailContactThread, restoreArchivedThread, threads]);

  const createContactThread = useCallback(async () => {
    const name = contactDraft.name.trim();
    const phone = contactDraft.phone.trim();
    const email = contactDraft.email.trim();
    const company = contactDraft.company.trim();
    const message = contactDraft.message.trim();
    if (!name && !phone && !email && !company) {
      setStatus("Добавь имя, телефон, почту или компанию");
      return;
    }

    setCreatingContact(true);
    try {
      const res = await fetch("/api/admin/messenger/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name || company || phone || email || "Новый контакт",
          phone,
          email,
          company,
          message,
        }),
      });
      const data: { thread?: MessengerThread; error?: string } = await res.json();
      if (!res.ok || !data.thread) throw new Error(data.error || "Контакт не создан");
      replaceThread(data.thread);
      setContactDraft({ name: "", phone: "", email: "", company: "", message: "" });
      setContactFormOpen(false);
      setStatus(`Контакт создан: ${data.thread.name}`);
    } catch (error: any) {
      setStatus(error?.message || "Контакт не создан");
    } finally {
      setCreatingContact(false);
    }
  }, [contactDraft, replaceThread]);

  useEffect(() => {
    if (!selectedId) {
      privateArayThreadIdRef.current = null;
      setPrivateArayMessages([]);
      return;
    }
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(`aray-messenger-private:${selectedId}`);
      const raw = window.localStorage.getItem(`${ARAY_MESSENGER_PRIVATE_KEY_PREFIX}${selectedId}`);
      const parsed = raw ? JSON.parse(raw) : [];
      privateArayThreadIdRef.current = selectedId;
      setPrivateArayMessages(Array.isArray(parsed) ? parsed.slice(-80) : []);
    } catch {
      privateArayThreadIdRef.current = selectedId;
      setPrivateArayMessages([]);
    }
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId || typeof window === "undefined") return;
    if (privateArayThreadIdRef.current !== selectedId) return;
    const saved = privateArayMessages.filter((message) => !message.streaming).slice(-20);
    try {
      if (saved.length) {
        window.localStorage.setItem(`${ARAY_MESSENGER_PRIVATE_KEY_PREFIX}${selectedId}`, JSON.stringify(saved));
      } else {
        window.localStorage.removeItem(`${ARAY_MESSENGER_PRIVATE_KEY_PREFIX}${selectedId}`);
      }
    } catch {
      // Private ARAY history is a convenience layer; CRM history remains the durable source.
    }
  }, [privateArayMessages, selectedId]);

  const postMessage = useCallback(async (direction: "manager" | "client" | "system", text: string) => {
    if (!selected) return null;
    const clean = text.trim();
    if (!clean) return null;
    setSending(true);
    try {
      const res = await fetch(`/api/admin/messenger/threads/${selected.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ direction, text: clean }),
      });
      const data: { thread?: MessengerThread; delivery?: { message?: string }; error?: string } = await res.json();
      if (!res.ok) throw new Error(data.error || "Сообщение не сохранено");
      if (!data.thread) throw new Error("Сообщение не сохранено");
      const nextThread = { ...data.thread, commerce: data.thread.commerce || selected.commerce } as MessengerThread;
      replaceThread(nextThread);
      return { thread: nextThread, delivery: data.delivery };
    } catch (error: any) {
      setStatus(error?.message || "Сообщение не сохранено");
      return null;
    } finally {
      setSending(false);
    }
  }, [replaceThread, selected]);

  const sendManagerMessage = useCallback(async () => {
    const saved = await postMessage("manager", draft);
    if (saved) {
      setDraft("");
      setDraftReview(null);
      setToolsOpen(false);
      setStatus(saved.delivery?.message || "Ответ сохранён в CRM-диалоге");
    }
  }, [draft, postMessage]);

  const saveClientMessage = useCallback(async () => {
    const saved = await postMessage("client", draft);
    if (saved) {
      setDraft("");
      setDraftReview(null);
      setToolsOpen(false);
      setStatus(saved.delivery?.message || "Входящее добавлено");
    }
  }, [draft, postMessage]);

  const polishDraft = useCallback(() => {
    if (!selected) return;
    setDraft(buildArayBusinessMessengerText({
      text: draft || "Напиши короткий деловой ответ собеседнику.",
      kind: "offer",
      relationLabel: selected.name,
    }));
    setComposerRoute("person");
    setToolsOpen(false);
    setStatus("Арай оформил текст. Проверь перед отправкой.");
  }, [draft, selected]);

  const askAray = useCallback(() => {
    if (!selected) return;
    const text = draft.trim()
      ? `Помоги с ответом собеседнику ${selected.name}: ${draft.trim()}`
      : `Открой режим мессенджера и помоги по диалогу с собеседником ${selected.name}.`;
    onAskAray({
      text,
      displayText: draft.trim() ? "Арай, помоги с ответом" : "Арай, помоги с диалогом",
      context: createArayContext(selected),
      actions: [
        { type: "prompt", prompt: "Оформи короткий ответ собеседнику", label: "Оформить ответ", icon: "prompt" },
        { type: "navigate", url: `/admin/crm?leadId=${selected.id}`, label: "CRM", icon: "target" },
        { type: "navigate", url: "/admin/tasks", label: "Задачи", icon: "settings" },
      ],
    });
    setStatus("Арай открылся рядом с этим диалогом");
  }, [draft, onAskAray, selected]);

  const keepArayBesideDialog = useCallback(() => {
    if (!selected) return;
    onContextChange?.({ label: selected.name, context: createArayContext(selected) });
    composerRef.current?.focus();
    setStatus(null);
  }, [onContextChange, selected]);

  const openArayTarget = useCallback((url: string) => {
    const clean = url.trim();
    if (!clean) return;
    if (typeof window === "undefined") return;

    try {
      const target = new URL(clean, window.location.origin);
      if (target.origin === window.location.origin) {
        router.push(`${target.pathname}${target.search}${target.hash}`);
        setStatus("Открыл раздел. Арай остается рядом.");
        return;
      }
      window.open(target.toString(), "_blank", "noopener,noreferrer");
      setStatus("Открыл источник в новой вкладке.");
    } catch {
      setStatus("Не получилось открыть ссылку.");
    }
  }, [router]);

  const askPrivateAray = useCallback(async (text: string, displayText?: string) => {
    if (!selected) return;
    const clean = text.trim();
    if (!clean || privateArayBusy) return;
    const now = new Date().toISOString();
    const userMessage: PrivateArayMessage = {
      id: `private-user-${Date.now()}`,
      role: "user",
      text: displayText?.trim() || clean,
      createdAt: now,
    };
    const assistantId = `private-aray-${Date.now() + 1}`;
    const assistantMessage: PrivateArayMessage = {
      id: assistantId,
      role: "assistant",
      text: "",
      createdAt: now,
      streaming: true,
    };

    const recentDialog = selected.activities
      .slice(-12)
      .map((activity) => `${messageRoleLabel(getDirection(activity), staffName)}: ${stripPrefix(activity.text)}`)
      .join("\n");
    const contextPrompt = [
      "Контекст для Арая. Не повторяй этот текст в ответе.",
      "Ты участник одного мессенджера ARAY: отвечай как живой помощник, коротко, ясно и по делу.",
      "Если человек просит найти, открыть или подготовить что-то, дай понятный следующий шаг. Важные действия, отправку, деньги, документы и изменения не выполняй без подтверждения человека.",
      "",
      createArayContext(selected),
      recentDialog ? `\nПоследние сообщения:\n${recentDialog}` : "",
    ].filter(Boolean).join("\n");

    setPrivateArayBusy(true);
    setStatus(null);
    setPrivateArayMessages((current) => [...current, userMessage, assistantMessage].slice(-60));

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            { role: "user", content: contextPrompt },
            { role: "assistant", content: "Понял контекст. Жду вопрос." },
            { role: "user", content: clean },
          ],
          context: {
            page: "/admin/messenger",
            source: "messenger-inline",
            inputMode: "text",
          },
        }),
      });
      if (!res.body) throw new Error("Нет ответа Арая");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let rawText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        rawText += decoder.decode(value, { stream: true });
        const visibleText = stripPrivateArayControlText(rawText);
        setPrivateArayMessages((current) =>
          current.map((message) =>
            message.id === assistantId ? { ...message, text: visibleText, streaming: true } : message
          )
        );
      }

      const isError = rawText.includes("__ARAY_ERR__");
      const errorText = rawText.match(/__ARAY_ERR__(.+)$/)?.[1]?.trim();
      const finalText = isError
        ? errorText || "Не получилось получить ответ. Попробуй ещё раз."
        : stripPrivateArayControlText(rawText) || "Готово. Напиши, что нужно уточнить.";
      const finalActions = isError ? [] : extractInlineArayActions(rawText);

      setPrivateArayMessages((current) =>
        current.map((message) =>
          message.id === assistantId ? { ...message, text: finalText, streaming: false, actions: finalActions } : message
        )
      );
      setStatus(null);
    } catch (error: any) {
      setPrivateArayMessages((current) =>
        current.map((message) =>
          message.id === assistantId
            ? { ...message, text: error?.message || "Не получилось получить ответ.", streaming: false }
            : message
        )
      );
      setStatus(null);
    } finally {
      setPrivateArayBusy(false);
    }
  }, [privateArayBusy, selected, staffName]);

  const handleInlineArayAction = useCallback(async (action: InlineArayAction) => {
    if (action.type === "navigate" && action.url) {
      openArayTarget(action.url);
      return;
    }
    if (action.type === "prompt") {
      await askPrivateAray(action.prompt || action.label, action.label);
    }
  }, [askPrivateAray, openArayTarget]);

  const sendPrivateArayQuestion = useCallback(async () => {
    if (!selected) return;
    const question = draft.trim()
      ? `Помоги по диалогу с собеседником ${selected.name}: ${draft.trim()}`
      : `Посмотри диалог с собеседником ${selected.name} и предложи следующий лучший шаг.`;
    await askPrivateAray(question, draft.trim() ? draft.trim() : "Что лучше сделать дальше?");
    setDraft("");
  }, [askPrivateAray, draft, selected]);

  const proofreadClientDraft = useCallback(async (text: string) => {
    const clean = text.trim();
    if (!clean) return "";
    setProofreadingDraft(true);
    setStatus("Арай проверяет текст перед отправкой");
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: [
                "Проверь текст менеджера перед отправкой клиенту.",
                "Исправь только орфографию, грамматику, пунктуацию и явные опечатки.",
                "Не добавляй новые факты, цены, обещания, скидки, документы и сроки.",
                "Если смысл непонятен, верни исходный текст без выдумок.",
                "Ответь только исправленным текстом, без пояснений.",
                "",
                clean,
              ].join("\n"),
            },
          ],
          context: {
            page: "/admin/messenger",
            source: "messenger-proofread",
            inputMode: "text",
          },
        }),
      });
      if (!res.body) throw new Error("Нет ответа Арая");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let rawText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        rawText += decoder.decode(value, { stream: true });
      }

      return cleanProofreadText(rawText) || clean;
    } finally {
      setProofreadingDraft(false);
    }
  }, []);

  const sendSmartMessage = useCallback(async () => {
    const clean = draft.trim();
    if (!clean) return;
    const routeToAray = composerRoute === "auto" ? isArayIntentMessage(clean) : composerRoute === "aray";
    if (routeToAray) {
      setDraft("");
      setComposerRoute("auto");
      await askPrivateAray(clean, clean);
      return;
    }
    const reviewReady = draftReview && (draftReview.corrected === clean || draftReview.source === clean);
    if (!reviewReady) {
      try {
        const corrected = await proofreadClientDraft(clean);
        const nextText = corrected || clean;
        setDraftReview({ source: clean, corrected: nextText });
        if (nextText !== clean) {
          setDraft(nextText);
          setComposerRoute("person");
          setStatus("Арай поправил текст. Проверь и нажми отправить ещё раз.");
        } else {
          setStatus("Арай проверил текст. Нажми отправить ещё раз, если всё верно.");
        }
      } catch {
        setDraftReview({ source: clean, corrected: clean });
        setStatus("Проверка не прошла. Нажми отправить ещё раз, если текст можно сохранить как есть.");
      }
      return;
    }
    await sendManagerMessage();
    setComposerRoute("auto");
  }, [askPrivateAray, composerRoute, draft, draftReview, proofreadClientDraft, sendManagerMessage]);

  const requestDocumentDraft = useCallback(async (documentType: "КП" | "счет" | "договор") => {
    if (!selected) return;
    const source = draft.trim() || stripPrefix(selected.lastActivityText) || "подготовь по текущему диалогу";
    await askPrivateAray(
      `Подготовь черновик документа: ${documentType}. Собеседник: ${selected.name}. Основа: ${source}`,
      `Подготовь ${documentType}`,
    );
    setToolsOpen(false);
  }, [askPrivateAray, draft, selected]);

  const requestEstimateCart = useCallback(async () => {
    if (!selected) return;
    const source = draft.trim() || stripPrefix(selected.lastActivityText) || "ожидаю список, смету, фото или голосовое";
    await askPrivateAray(
      [
        `Подготовь разбор сметы/списка для ${selected.name}.`,
        `Основа: ${source}.`,
        "Нужно: выделить позиции, размеры, количество, подобрать товары каталога, проверить остатки/варианты, предложить корзину и сравнение.",
        "Ничего не добавляй в корзину без подтверждения человека. Если нужен файл или фото, попроси приложить.",
      ].join(" "),
      "Смета в корзину",
    );
    setToolsOpen(false);
  }, [askPrivateAray, draft, selected]);

  const clearDraftAndAssistant = useCallback(() => {
    setDraft("");
    setPrivateArayMessages([]);
    setToolsOpen(false);
    setThreadSettingsOpen(false);
    setDeleteConfirmOpen(false);
    setComposerRoute("auto");
    if (selectedId && typeof window !== "undefined") {
      window.localStorage.removeItem(`aray-messenger-private:${selectedId}`);
      window.localStorage.removeItem(`${ARAY_MESSENGER_PRIVATE_KEY_PREFIX}${selectedId}`);
    }
    setStatus("Черновик и временные ответы Арая очищены");
  }, [selectedId]);

  const handleCopyMessage = useCallback(async (text: string) => {
    const clean = stripPrefix(text);
    if (!clean) return;
    const copied = await writeTextToClipboard(clean);
    setStatus(copied ? "Текст скопирован" : "Скопируй текст вручную");
  }, []);

  const deleteSelectedThread = useCallback(async () => {
    if (!selected) return;
    setSending(true);
    try {
      const res = await fetch(`/api/admin/messenger/threads/${selected.id}`, { method: "DELETE" });
      const data: { error?: string } = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Диалог не удалён");
      setThreads((current) => current.filter((thread) => thread.id !== selected.id));
      setSelectedId((current) => (current === selected.id ? null : current));
      setThreadListOpen(true);
      setSystemEventsOpen(false);
      setToolsOpen(false);
      setCallStudioOpen(false);
      setVideoRoomOpen(false);
      setThreadSettingsOpen(false);
      setContactFormOpen(false);
      setDeleteConfirmOpen(false);
      setDraft("");
      setPrivateArayMessages([]);
      setStatus(`Диалог удалён: ${selected.name}`);
    } catch (error: any) {
      setStatus(error?.message || "Диалог не удалён");
    } finally {
      setSending(false);
    }
  }, [selected]);

  const handleReplyToMessage = useCallback((activity: MessengerActivity) => {
    const clean = stripPrefix(activity.text);
    setDraft(clean ? `По сообщению: ${clean}\n\n` : "");
    setStatus("Ответ привязан к сообщению");
  }, []);

  const handleReactToMessage = useCallback((activity: MessengerActivity) => {
    const clean = stripPrefix(activity.text);
    setStatus(clean ? "Сообщение отмечено как важное" : "Отметил сообщение");
  }, []);

  const handlePolishMessage = useCallback((activity: MessengerActivity) => {
    if (!selected) return;
    setDraft(buildArayBusinessMessengerText({
      text: stripPrefix(activity.text),
      kind: "offer",
      relationLabel: selected.name,
    }));
    setStatus("Арай подготовил спокойный ответ");
  }, [selected]);

  const askArayForThreadSummary = useCallback(async () => {
    if (!selected) return;
    await askPrivateAray(
      `Кратко собери историю диалога с ${selected.name}: что важно, какой статус, какие риски и следующий лучший шаг. Не отправляй собеседнику.`,
      "Собери историю диалога",
    );
    setThreadSettingsOpen(false);
  }, [askPrivateAray, selected]);

  const askArayForNextStep = useCallback(async () => {
    if (!selected) return;
    await askPrivateAray(
      `Посмотри переписку с ${selected.name} и предложи один следующий лучший шаг: сообщение, задача, документ или проверка CRM. Не отправляй без подтверждения.`,
      "Что делать дальше?",
    );
  }, [askPrivateAray, selected]);

  const startVoiceCall = useCallback(() => {
    if (!selected) return;
    const href = getCallPhoneHref(selected.phone);
    if (!href) {
      setStatus("В карточке нет телефона для звонка");
      return;
    }
    setStatus(`Открываю звонок: ${selected.phone}`);
    window.location.href = href;
  }, [selected]);

  const openArayNumberPanel = useCallback(() => {
    if (!selected) return;
    setCallStudioOpen(true);
    setToolsOpen(false);
    setThreadSettingsOpen(false);
    setStatus(`Открыл связь по номеру ${formatArayPublicNumber(getArayInternalNumber(selected))}`);
  }, [selected]);

  const copyArayNumber = useCallback(async () => {
    if (!selected) return;
    const publicNumber = formatArayPublicNumber(getArayInternalNumber(selected));
    const copied = await writeTextToClipboard(publicNumber);
    setStatus(copied ? `Скопировал номер ${publicNumber}` : `Номер: ${publicNumber}`);
  }, [selected]);

  const buildArayPhoneInvite = useCallback(() => {
    if (!selected) return "";
    const publicNumber = formatArayPublicNumber(getArayInternalNumber(selected));
    const meetingUrl = getArayMeetingUrl(selected);
    return [
      `Номер: ${publicNumber}`,
      "Можно написать, созвониться или открыть видеовстречу.",
      `Видео: ${meetingUrl}`,
    ].join("\n");
  }, [selected]);

  const copyArayPhoneInvite = useCallback(async () => {
    const text = buildArayPhoneInvite();
    if (!text) return;
    const copied = await writeTextToClipboard(text);
    setStatus(copied ? "Приглашение AR Phone скопировано" : "Приглашение готово, скопируй вручную");
  }, [buildArayPhoneInvite]);

  const shareArayPhoneInvite = useCallback(async () => {
    if (!selected) return;
    const meetingUrl = getArayMeetingUrl(selected);
    const text = buildArayPhoneInvite();
    const result = await shareTextPayload({
      title: `AR Phone: ${selected.name}`,
      text,
      url: meetingUrl,
    });
    setStatus(
      result === "shared"
        ? "Открыл системное меню «Поделиться»"
        : result === "copied"
          ? "Поделиться не открылось, приглашение скопировано"
          : "Поделиться не получилось. Можно скопировать номер.",
    );
  }, [buildArayPhoneInvite, selected]);

  const openVideoMeeting = useCallback(async () => {
    if (!selected) return;
    setCallStudioOpen(true);
    setVideoRoomOpen(true);
    setStatus("Видео открыто внутри AR Phone");
  }, [selected]);

  const copyMeetingLink = useCallback(async () => {
    if (!selected) return;
    const meetingUrl = getArayMeetingUrl(selected);
    const copied = await writeTextToClipboard(meetingUrl);
    setStatus(copied ? "Ссылка видеовстречи скопирована" : meetingUrl);
  }, [selected]);

  const prepareVideoCall = useCallback(async () => {
    if (!selected) return;
    setCallStudioOpen(true);
    setVideoRoomOpen(false);
    setToolsOpen(false);
    setThreadSettingsOpen(false);
    setStatus("AR Phone открыт: выбери телефон, видео, приглашение или ссылку");
  }, [selected]);

  const createTask = useCallback(async () => {
    if (!selected) return;
    const title = `Связаться: ${selected.name}`;
    const description = draft.trim() || stripPrefix(selected.lastActivityText) || `Проверить диалог ${selected.name}`;
    setSending(true);
    try {
      const res = await fetch("/api/admin/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          priority: "MEDIUM",
          relations: [{ entityType: "LEAD", entityId: selected.id, label: selected.name, href: "/admin/messenger" }],
          tags: ["messenger", "aray"],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Задача не создана");
      await postMessage("system", `Создана задача: ${title}`);
      setStatus("Задача создана и связана с диалогом");
    } catch (error: any) {
      setStatus(error?.message || "Задача не создана");
    } finally {
      setSending(false);
    }
  }, [draft, postMessage, selected]);

  const prepareVideoInviteOnly = useCallback(() => {
    if (!selected) return;
    const meetingUrl = getArayMeetingUrl(selected);
    setDraft(
      [
        "Здравствуйте! Предлагаю короткую видеовстречу: обсудим детали и быстро отвечу на вопросы.",
        "Когда вам удобно?",
        `Ссылка: ${meetingUrl}`,
      ].join("\n"),
    );
    setComposerRoute("person");
    setCallStudioOpen(false);
    setStatus("Черновик приглашения готов. Проверь и отправь клиенту.");
    composerRef.current?.focus();
  }, [selected]);

  const explainWalletAndBonuses = useCallback(async () => {
    if (!selected) return;
    const commerce = selected.commerce;
    await askPrivateAray(
      [
        `Объясни менеджеру коротко финансовую карточку клиента ${selected.name}.`,
        `Заказы: ${commerce?.orderCount || 0}. Оплачено: ${formatMoneyShort(commerce?.paidAmount)}. К оплате: ${formatMoneyShort(commerce?.pendingAmount)}.`,
        `Бонусы: ${commerce?.bonusPoints || 0}. Уровень: ${commerce?.loyaltyLevel || "Старт"}.`,
        "Важно: не обещай списание бонусов и не создавай платеж без подтверждения человека и правил программы.",
      ].join(" "),
      "Кошелек и бонусы",
    );
    setToolsOpen(false);
  }, [askPrivateAray, selected]);

  const preparePaymentRequest = useCallback(async () => {
    if (!selected) return;
    const commerce = selected.commerce;
    await askPrivateAray(
      [
        `Подготовь черновик сообщения по оплате для ${selected.name}.`,
        `К оплате по данным системы: ${formatMoneyShort(commerce?.pendingAmount)}.`,
        `Оплачено по истории: ${formatMoneyShort(commerce?.paidAmount)}.`,
        "Если суммы нет, попроси выбрать заказ или счет. Не выдавай ссылку на оплату и не меняй статус без подключенного провайдера.",
      ].join(" "),
      "Подготовить оплату",
    );
    setToolsOpen(false);
  }, [askPrivateAray, selected]);

  const toggleVoiceDraft = useCallback(() => {
    if (inputSpeechRecognitionRef.current) {
      try {
        inputSpeechRecognitionRef.current.stop?.();
      } catch {}
      inputSpeechRecognitionRef.current = null;
      setInputListening(false);
      setStatus("Голосовой режим остановлен");
      return;
    }

    if (typeof window === "undefined") return;
    const SpeechRecognitionCtor =
      (window as SpeechWindow).SpeechRecognition || (window as SpeechWindow).webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      setStatus("Голосовой ввод не поддерживается в этом браузере");
      return;
    }

    try {
      const recognition = new SpeechRecognitionCtor();
      inputSpeechTranscriptRef.current = "";
      recognition.lang = "ru-RU";
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.onresult = (event: any) => {
        let transcript = "";
        for (let index = 0; index < event.results.length; index += 1) {
          transcript += event.results[index]?.[0]?.transcript || "";
        }
        inputSpeechTranscriptRef.current = transcript.trim();
        setDraft(inputSpeechTranscriptRef.current);
      };
      recognition.onerror = () => {
        inputSpeechRecognitionRef.current = null;
        setInputListening(false);
      };
      recognition.onend = () => {
        inputSpeechRecognitionRef.current = null;
        setInputListening(false);
      };
      inputSpeechRecognitionRef.current = recognition;
      setInputListening(true);
      setStatus("Голосовой режим включён");
      recognition.start();
    } catch {
      inputSpeechRecognitionRef.current = null;
      setInputListening(false);
      setStatus("Не удалось включить микрофон");
    }
  }, []);

  const showList = threadListOpen || !selected;
  const recipientLabel = selected?.name?.trim() || "диалог";
  const selectedCallHref = getCallPhoneHref(selected?.phone);
  const selectedArayNumber = selected ? getArayInternalNumber(selected) : "";
  const selectedPublicArayNumber = selectedArayNumber ? formatArayPublicNumber(selectedArayNumber) : "";
  const pendingDialCallHref = isLikelyPhoneDial(pendingDialNumber) ? getCallPhoneHref(pendingDialNumber) : null;
  const composerBusy = privateArayBusy || sending || proofreadingDraft;
  const composerTargetLabel = draftGoesToAray ? "Араю" : "клиенту";
  const composerStateText = draftGoesToAray ? "Арай ответит тебе в этом чате" : "Ответ сохранится в CRM-диалоге";
  const composerPlaceholder = draftGoesToAray ? "Спроси Арая..." : `Ответ ${recipientLabel}...`;
  const sendButtonLabel = proofreadingDraft ? "Арай проверяет текст" : draftGoesToAray ? "Спросить Арая" : draftReview ? "Подтвердить и сохранить" : "Проверить ответ";
  const meetingStatusText = selectedCallHref
    ? "Телефон, видео и приглашение без лишнего шума"
    : "Видео и приглашение готовы. Телефон клиента не указан.";
  const smartMessengerActions = useMemo<SmartMessengerAction[]>(() => {
    if (!selected) return [];
    const actions: SmartMessengerAction[] = [
      {
        id: "next",
        label: "Следующий шаг",
        helper: "Арай решит",
        icon: <ArayIcon size={18} id={`smart-next-${selected.id}`} />,
        onClick: askArayForNextStep,
        disabled: sending || privateArayBusy,
      },
      {
        id: "reply",
        label: draft.trim() ? "Улучшить ответ" : "Оформить ответ",
        helper: draft.trim() ? "коротко и чисто" : "без воды",
        icon: <MessageSquare className="h-3.5 w-3.5" />,
        onClick: polishDraft,
        disabled: sending || privateArayBusy,
      },
    ];

    if ((selected.commerce?.pendingAmount || 0) > 0 || (selected.commerce?.unpaidOrderCount || 0) > 0) {
      actions.splice(1, 0, {
        id: "payment",
        label: "Оплата",
        helper: "счет и QR",
        icon: <CreditCard className="h-3.5 w-3.5" />,
        onClick: preparePaymentRequest,
        disabled: sending || privateArayBusy,
      });
    } else if (selected.activityCount > 0) {
      actions.push({
        id: "history",
        label: "История",
        helper: `${selected.activityCount} событий`,
        icon: <History className="h-3.5 w-3.5" />,
        onClick: askArayForThreadSummary,
        disabled: privateArayBusy,
      });
    }

    actions.push({
      id: "phone",
      label: "AR Phone",
      helper: selectedCallHref ? "звонок и видео" : "приглашение",
      icon: <PhoneCall className="h-3.5 w-3.5" />,
      onClick: openArayNumberPanel,
      disabled: sending || privateArayBusy,
    });

    return actions.slice(0, 4);
  }, [
    askArayForNextStep,
    askArayForThreadSummary,
    draft,
    openArayNumberPanel,
    polishDraft,
    preparePaymentRequest,
    privateArayBusy,
    selected,
    selectedCallHref,
    sending,
  ]);

  useEffect(() => {
    if (showList || !selected) {
      onContextChange?.(null);
      return;
    }
    onContextChange?.({ label: selected.name, context: createArayContext(selected) });
    return () => onContextChange?.(null);
  }, [onContextChange, selected, showList]);

  return (
    <div data-aray-embedded-messenger className="flex min-h-0 flex-1 flex-col">
      <AnimatePresence mode="wait" initial={false}>
      {showList ? (
        <motion.div
          key="thread-list"
          className="flex min-h-0 flex-1 flex-col px-4 pb-3"
          initial={{ opacity: 0, y: 12, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.985 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          <div className="flex min-h-0 flex-1 flex-col justify-start gap-3">
            <div className="flex flex-none items-center gap-3 rounded-[24px] border border-border/70 bg-background/55 px-4 py-3">
              <ArayOrb size={52} id="messenger-orb" pulse={loading ? "thinking" : "idle"} />
              <div className="min-w-0 text-left">
                <p className="text-[14px] font-semibold text-foreground">Диалоги</p>
                <p className="mt-0.5 line-clamp-2 text-[12px] leading-5 text-muted-foreground">
                  Клиенты, Арай, звонки и CRM в одном окне.
                </p>
              </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[26px] border border-border/80 bg-background/80">
              <div className="border-b border-border/70 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-3.5 w-3.5 text-primary" />
                    <span className="text-[12px] font-semibold text-foreground">Пользователи и чаты</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setContactFormOpen((value) => !value)}
                      className="inline-flex h-8 items-center justify-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3 text-[11px] font-semibold text-primary transition hover:bg-primary/15"
                      aria-expanded={contactFormOpen}
                      aria-label="Добавить контакт"
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      <span>Контакт</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void fetchThreads()}
                      disabled={loading}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-muted/20 text-muted-foreground transition hover:border-primary/50 hover:text-primary disabled:opacity-45"
                      aria-label="Обновить диалоги"
                    >
                      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={onBack}
                      className="inline-flex h-8 items-center justify-center rounded-full border border-border bg-muted/20 px-3 text-[11px] font-semibold text-muted-foreground transition hover:border-primary/50 hover:text-primary"
                    >
                      Назад
                    </button>
                  </div>
                </div>
                {pendingDialNumber && (
                  <div className="mb-2 rounded-2xl border border-primary/25 bg-primary/[0.06] px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="min-w-0 truncate text-[11px] font-semibold text-foreground">
                        Набираем: {pendingDialNumber}
                      </span>
                      <div className="flex shrink-0 items-center gap-1">
                        {pendingDialCallHref && (
                          <a
                            href={pendingDialCallHref}
                            className="inline-flex h-7 items-center justify-center gap-1 rounded-full bg-primary/12 px-2 text-[10px] font-semibold text-primary transition hover:bg-primary/18"
                          >
                            <PhoneCall className="h-3 w-3" />
                            Позвонить
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            pendingDialNumberRef.current = "";
                            setPendingDialNumber("");
                            setStatus(null);
                          }}
                          className="inline-flex h-7 items-center justify-center rounded-full border border-border bg-background/70 px-2 text-[10px] font-semibold text-muted-foreground transition hover:border-primary/50 hover:text-primary"
                        >
                          Очистить
                        </button>
                      </div>
                    </div>
                    <p className="mt-1 text-[10.5px] leading-4 text-muted-foreground">
                      Если номер есть в базе, открою карточку связи. Если нет — можно создать контакт.
                    </p>
                  </div>
                )}
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className="h-10 w-full rounded-2xl border border-border bg-background/70 pl-9 pr-3 text-[13px] outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/10"
                    placeholder="Найти человека, компанию или сообщение..."
                  />
                </div>
                <AnimatePresence initial={false}>
                  {contactFormOpen && (
                    <motion.form
                      initial={{ opacity: 0, y: -6, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: "auto" }}
                      exit={{ opacity: 0, y: -6, height: 0 }}
                      transition={{ duration: 0.18, ease: "easeOut" }}
                      className="mt-2 overflow-hidden"
                      onSubmit={(event) => {
                        event.preventDefault();
                        void createContactThread();
                      }}
                    >
                      <div className="rounded-2xl border border-primary/20 bg-primary/[0.06] p-2">
                        <div className="grid grid-cols-2 gap-1.5">
                          <input
                            value={contactDraft.name}
                            onChange={(event) => setContactDraft((value) => ({ ...value, name: event.target.value }))}
                            className="h-9 rounded-xl border border-border bg-background/80 px-2.5 text-[12px] outline-none focus:border-primary/60"
                            placeholder="Имя"
                          />
                          <input
                            value={contactDraft.phone}
                            onChange={(event) => setContactDraft((value) => ({ ...value, phone: event.target.value }))}
                            className="h-9 rounded-xl border border-border bg-background/80 px-2.5 text-[12px] outline-none focus:border-primary/60"
                            placeholder="Телефон"
                            inputMode="tel"
                          />
                          <input
                            value={contactDraft.email}
                            onChange={(event) => setContactDraft((value) => ({ ...value, email: event.target.value }))}
                            className="h-9 rounded-xl border border-border bg-background/80 px-2.5 text-[12px] outline-none focus:border-primary/60"
                            placeholder="Почта"
                            inputMode="email"
                          />
                          <input
                            value={contactDraft.company}
                            onChange={(event) => setContactDraft((value) => ({ ...value, company: event.target.value }))}
                            className="h-9 rounded-xl border border-border bg-background/80 px-2.5 text-[12px] outline-none focus:border-primary/60"
                            placeholder="Компания"
                          />
                        </div>
                        <textarea
                          value={contactDraft.message}
                          onChange={(event) => setContactDraft((value) => ({ ...value, message: event.target.value }))}
                          className="mt-1.5 min-h-10 w-full resize-none rounded-xl border border-border bg-background/80 px-2.5 py-2 text-[12px] outline-none focus:border-primary/60"
                          placeholder="Первое сообщение или заметка"
                        />
                        <div className="mt-1.5 flex items-center gap-1.5">
                          <button
                            type="submit"
                            disabled={creatingContact}
                            className="inline-flex min-h-9 flex-1 items-center justify-center gap-2 rounded-xl bg-primary/12 px-3 text-[11px] font-semibold text-primary transition hover:bg-primary/18 disabled:opacity-45"
                          >
                            {creatingContact ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
                            Создать контакт
                          </button>
                          <button
                            type="button"
                            onClick={() => setContactFormOpen(false)}
                            className="inline-flex min-h-9 items-center justify-center rounded-xl border border-border bg-background/70 px-3 text-[11px] font-semibold text-muted-foreground transition hover:border-primary/50 hover:text-primary"
                          >
                            Отмена
                          </button>
                        </div>
                      </div>
                    </motion.form>
                  )}
                </AnimatePresence>
                {status && showList && (
                  <p className="mt-2 truncate rounded-full bg-muted/25 px-3 py-1.5 text-[11px] text-muted-foreground">
                    {status}
                  </p>
                )}
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-3">
                <button
                  type="button"
                  onClick={onBack}
                  className="group mb-2 flex w-full items-center gap-3 rounded-2xl border border-primary/25 bg-primary/5 px-3 py-3 text-left transition hover:border-primary/50 hover:bg-primary/10"
                >
                  <ArayIcon size={42} id="messenger-list-aray" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-[13px] font-bold text-foreground">Арай</span>
                      <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[9.5px] font-semibold text-primary">рядом</span>
                    </span>
                    <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">Помощник, поиск, документы и действия</span>
                    <span className="mt-1 block truncate text-[12px] text-foreground/75">Открыть главный чат с Араем</span>
                  </span>
                </button>
                {loading && threads.length === 0 ? (
                  <div className="flex h-28 items-center justify-center rounded-2xl border border-border bg-muted/15 text-xs text-muted-foreground">
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    Открываю чаты
                  </div>
                ) : threads.length === 0 ? (
                  <div className="flex h-28 flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-muted/15 px-5 text-center text-xs text-muted-foreground">
                    <MessageCircle className="h-8 w-8 text-primary" />
                    Диалогов пока нет. Новые заявки появятся здесь.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {threads.map((thread) => (
                      <button
                        key={thread.id}
                        type="button"
                        onClick={() => void openThread(thread.id)}
                        className={cn(
                          "group flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition hover:border-primary/45 hover:bg-muted/20",
                          thread.deletedAt
                            ? "border-amber-400/25 bg-amber-500/[0.055]"
                            : "border-border/80 bg-background/70",
                        )}
                      >
                        <span className="relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-primary/35 bg-primary/10 text-[12px] font-bold text-primary">
                          {getInitials(thread.name)}
                          <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background bg-emerald-500" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center justify-between gap-2">
                            <span className="truncate text-[13px] font-bold text-foreground">{thread.name}</span>
                            <span className="flex shrink-0 items-center gap-1">
                              {thread.deletedAt && (
                                <span className="rounded-full bg-amber-400/12 px-2 py-0.5 text-[9px] font-semibold text-amber-300">
                                  архив
                                </span>
                              )}
                              <span className="text-[10px] text-muted-foreground">{formatShortTime(thread.lastActivityAt)}</span>
                            </span>
                          </span>
                          <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">{threadSubtitle(thread)}</span>
                          <span className="mt-1 flex max-w-full flex-wrap gap-1 overflow-hidden">
                            <span
                              title="AR Phone"
                              className="inline-flex max-w-full items-center gap-1 rounded-full border border-primary/25 bg-primary/8 px-2 py-0.5 text-[9.5px] font-semibold text-primary"
                            >
                              <PhoneCall className="h-2.5 w-2.5 shrink-0" />
                              <span className="truncate">{formatArayPublicNumber(getArayInternalNumber(thread))}</span>
                            </span>
                            {getThreadSmartFacts(thread).slice(0, 3).map((fact) => (
                              <span
                                key={`${thread.id}-${fact.title}-${fact.label}`}
                                title={fact.title}
                                className="max-w-full truncate rounded-full border border-border/70 bg-muted/20 px-2 py-0.5 text-[9.5px] font-semibold text-muted-foreground"
                              >
                                {fact.label}
                              </span>
                            ))}
                          </span>
                          <span className="mt-1 block truncate text-[12px] text-foreground/75">
                            {thread.deletedAt
                              ? "Нажми, чтобы восстановить и открыть диалог"
                              : stripPrefix(thread.lastActivityText) || "История пока пустая"}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      ) : (
        <motion.div
          key={`thread-${selected.id}`}
          className="flex min-h-0 flex-1 flex-col"
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
        >
          <div className="shrink-0 border-b border-border/70 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setThreadListOpen(true)}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-muted/20 text-muted-foreground transition hover:border-primary/50 hover:text-primary"
                aria-label="Назад к диалогам"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-bold text-foreground">{selected.name}</p>
                <p className="truncate text-[11px] text-muted-foreground">{threadSubtitle(selected)}</p>
                <button
                  type="button"
                  data-aray-phone-number
                  onClick={openArayNumberPanel}
                  className="mt-1 inline-flex max-w-full items-center gap-1.5 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary transition hover:bg-primary/15"
                  title="Открыть AR Phone"
                >
                  <PhoneCall className="h-3 w-3 shrink-0" />
                  <span className="truncate">{selectedPublicArayNumber}</span>
                </button>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={selectedCallHref ? startVoiceCall : openArayNumberPanel}
                  disabled={sending || privateArayBusy}
                  title={selectedCallHref ? "Позвонить" : "Открыть AR Phone"}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-transparent text-muted-foreground transition hover:bg-primary/10 hover:text-primary disabled:opacity-35"
                  aria-label="Позвонить"
                >
                  <PhoneCall className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => void prepareVideoCall()}
                  disabled={sending || privateArayBusy}
                  title="Открыть AR Phone"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-transparent text-muted-foreground transition hover:bg-primary/10 hover:text-primary disabled:opacity-35"
                  aria-label="Открыть AR Phone"
                >
                  <Video className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => openArayTarget("/admin/aray/connectors")}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-transparent text-muted-foreground transition hover:bg-primary/10 hover:text-primary"
                  aria-label="Настройки диалога"
                  title="Подключения ARAY"
                >
                  <Settings className="h-4 w-4" />
                </button>
              </div>
            </div>
            <AnimatePresence initial={false}>
              {false && threadSettingsOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, y: -6, height: 0 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="overflow-hidden"
                >
                  <div className="aray-dialog-action-center mt-3 rounded-2xl border border-border/70 bg-background/80 p-2 shadow-[0_12px_34px_rgba(0,0,0,0.18)]">
                    <div className="mb-2 flex items-center justify-between gap-2 px-1">
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold text-foreground">Центр действий</p>
                        <p className="truncate text-[10px] text-muted-foreground">Ответы, документы, CRM, связь и порядок в одном месте</p>
                      </div>
                      <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary">
                        {selected.activityCount} событий
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={askArayForThreadSummary}
                        disabled={privateArayBusy}
                        className="aray-dialog-action-button inline-flex min-h-10 items-center gap-2 rounded-xl bg-muted/18 px-2.5 text-left text-[11px] font-semibold text-foreground transition hover:bg-primary/10 hover:text-primary disabled:opacity-45"
                      >
                        <History className="h-3.5 w-3.5 shrink-0 text-primary" />
                        <span className="min-w-0 truncate">Собрать историю</span>
                      </button>
                      <button
                        type="button"
                        onClick={askArayForNextStep}
                        disabled={privateArayBusy}
                        className="aray-dialog-action-button inline-flex min-h-10 items-center gap-2 rounded-xl bg-muted/18 px-2.5 text-left text-[11px] font-semibold text-foreground transition hover:bg-primary/10 hover:text-primary disabled:opacity-45"
                      >
                        <ArayIcon size={18} id={`settings-next-${selected.id}`} />
                        <span className="min-w-0 truncate">Следующий шаг</span>
                      </button>
                <button
                  type="button"
                  data-aray-messenger-tools
                  onClick={() => {
                          setSystemEventsOpen((value) => !value);
                          setThreadSettingsOpen(false);
                        }}
                        className="aray-dialog-action-button inline-flex min-h-10 items-center gap-2 rounded-xl bg-muted/18 px-2.5 text-left text-[11px] font-semibold text-foreground transition hover:bg-primary/10 hover:text-primary"
                      >
                        <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 text-primary transition-transform", systemEventsOpen && "rotate-180")} />
                        <span className="min-w-0 truncate">CRM-история</span>
                      </button>
                      <button
                        type="button"
                        onClick={clearDraftAndAssistant}
                        className="aray-dialog-action-button inline-flex min-h-10 items-center gap-2 rounded-xl bg-muted/18 px-2.5 text-left text-[11px] font-semibold text-foreground transition hover:bg-primary/10 hover:text-primary"
                      >
                        <RefreshCw className="h-3.5 w-3.5 shrink-0 text-primary" />
                        <span className="min-w-0 truncate">Очистить черновик</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setContactFormOpen(true);
                          setThreadListOpen(true);
                          setThreadSettingsOpen(false);
                        }}
                        className="aray-dialog-action-button inline-flex min-h-10 items-center gap-2 rounded-xl bg-muted/18 px-2.5 text-left text-[11px] font-semibold text-foreground transition hover:bg-primary/10 hover:text-primary"
                      >
                        <UserPlus className="h-3.5 w-3.5 shrink-0 text-primary" />
                        <span className="min-w-0 truncate">Добавить контакт</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmOpen(true)}
                        disabled={sending}
                        className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-destructive/20 bg-background/70 px-2.5 text-left text-[11px] font-semibold text-destructive transition hover:bg-destructive/10 disabled:opacity-45"
                      >
                        <Trash2 className="h-3.5 w-3.5 shrink-0" />
                        <span className="min-w-0 truncate">Удалить диалог</span>
                      </button>
                    </div>
                    <div className="-mx-0.5 mt-2 flex gap-1.5 overflow-x-auto px-0.5 pb-1">
                      {QUICK_DRAFTS.map((item) => (
                        <button
                          key={item.label}
                          type="button"
                          onClick={() => {
                            setDraft(item.text);
                            setComposerRoute("person");
                            setThreadSettingsOpen(false);
                          }}
                          className="aray-dialog-chip shrink-0 rounded-full border border-border bg-muted/15 px-3 py-1.5 text-[10.5px] font-semibold text-muted-foreground transition hover:border-primary/45 hover:text-primary"
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                    <div className="aray-dialog-action-group mt-2 rounded-xl bg-muted/12 p-1.5">
                      <div className="mb-1 flex items-center gap-1.5 px-1 text-[10px] font-semibold text-muted-foreground">
                        <Settings className="h-3 w-3" />
                        Продажи и работа
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        <MessengerActionTile
                          icon={<Wallet className="h-3.5 w-3.5" />}
                          label="Кошелек"
                          helper="оплаты и бонусы"
                          onClick={explainWalletAndBonuses}
                          disabled={sending || privateArayBusy}
                        />
                        <MessengerActionTile
                          icon={<CreditCard className="h-3.5 w-3.5" />}
                          label="Оплата"
                          helper="счет, банк, QR"
                          onClick={preparePaymentRequest}
                          disabled={sending || privateArayBusy}
                        />
                        <MessengerActionTile
                          icon={<ArayIcon size={18} id={`polish-center-${selected.id}`} />}
                          label="Оформить ответ"
                          helper="коротко и чисто"
                          onClick={polishDraft}
                          disabled={sending || privateArayBusy}
                        />
                        <MessengerActionTile
                          icon={<CheckSquare className="h-3.5 w-3.5" />}
                          label="В задачу"
                          helper="поставить контроль"
                          onClick={createTask}
                          disabled={sending || privateArayBusy}
                        />
                        <MessengerActionTile
                          icon={<MessageSquare className="h-3.5 w-3.5" />}
                          label="Входящее"
                          helper="со слов клиента"
                          onClick={saveClientMessage}
                          disabled={sending || privateArayBusy || !draft.trim()}
                        />
                        <MessengerActionTile
                          icon={<FileText className="h-3.5 w-3.5" />}
                          label="Смета"
                          helper="в корзину после проверки"
                          onClick={requestEstimateCart}
                          disabled={sending || privateArayBusy}
                        />
                        <MessengerActionTile
                          icon={<ExternalLink className="h-3.5 w-3.5" />}
                          label="CRM"
                          helper="карточка клиента"
                          onClick={() => openArayTarget(`/admin/crm?leadId=${selected.id}`)}
                          disabled={sending || privateArayBusy}
                        />
                        <MessengerActionTile
                          icon={<ExternalLink className="h-3.5 w-3.5" />}
                          label="Файлы"
                          helper="медиа и PDF"
                          onClick={() => openArayTarget("/admin/media")}
                          disabled={sending || privateArayBusy}
                        />
                      </div>
                    </div>
                    <div className="aray-dialog-action-group mt-2 rounded-xl bg-muted/12 p-1.5">
                      <div className="mb-1 flex items-center gap-1.5 px-1 text-[10px] font-semibold text-muted-foreground">
                        <FileText className="h-3 w-3" />
                        Документы
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        {DOCUMENT_DRAFTS.map((item) => (
                          <button
                            key={item.type}
                            type="button"
                            onClick={() => requestDocumentDraft(item.type)}
                            disabled={sending || privateArayBusy}
                            className="aray-dialog-document-button min-h-10 rounded-xl bg-background/65 px-2 text-left text-[11px] font-bold text-foreground transition hover:bg-primary/10 hover:text-primary disabled:opacity-45"
                          >
                            <span className="block truncate">{item.label}</span>
                            <span className="block truncate text-[9px] font-normal text-muted-foreground">{item.hint}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    {deleteConfirmOpen && (
                      <div className="mt-2 rounded-xl border border-destructive/20 bg-background/75 p-2">
                        <p className="text-[10.5px] font-semibold leading-4 text-foreground">
                          Удалить диалог из CRM? История будет скрыта из мессенджера.
                        </p>
                        <div className="mt-2 flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmOpen(false)}
                            className="inline-flex h-8 flex-1 items-center justify-center rounded-xl bg-muted/25 px-2 text-[10.5px] font-semibold text-foreground transition hover:bg-muted/40"
                          >
                            Отмена
                          </button>
                          <button
                            type="button"
                            onClick={() => void deleteSelectedThread()}
                            disabled={sending}
                            className="inline-flex h-8 flex-1 items-center justify-center rounded-xl bg-destructive/15 px-2 text-[10.5px] font-semibold text-destructive transition hover:bg-destructive/20 disabled:opacity-45"
                          >
                            Удалить
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
            {selected.activities.length === 0 && privateArayMessages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-xs text-muted-foreground">
                <MessageCircle className="h-8 w-8 text-primary" />
                История пока пустая. Напиши ответ или зафиксируй входящее сообщение.
              </div>
            ) : (
              <div className="space-y-3">
                {visibleActivities.map((item) => {
                  if (item.kind === "summary") {
                    return (
                      <div key={item.id} className="flex justify-center">
                        <div className="w-full max-w-[92%]">
                          <button
                            type="button"
                            onClick={() => setSystemEventsOpen((value) => !value)}
                            className="group inline-flex w-full items-center gap-2 rounded-full border border-border/70 bg-muted/15 px-3 py-1.5 text-[10.5px] font-medium text-muted-foreground transition hover:border-primary/40 hover:text-primary"
                          >
                            <History className="h-3.5 w-3.5 shrink-0 opacity-70" />
                            <span className="min-w-0 flex-1 truncate text-left">{item.text}</span>
                            <span className="rounded-full bg-muted/35 px-1.5 py-0.5 text-[9px]">{item.count}</span>
                            <ChevronDown className={cn("h-3 w-3 shrink-0 transition-transform", systemEventsOpen && "rotate-180")} />
                          </button>
                          <AnimatePresence initial={false}>
                            {systemEventsOpen && (
                              <motion.div
                                initial={{ opacity: 0, height: 0, y: -4 }}
                                animate={{ opacity: 1, height: "auto", y: 0 }}
                                exit={{ opacity: 0, height: 0, y: -4 }}
                                transition={{ duration: 0.18, ease: "easeOut" }}
                                className="mt-2 overflow-hidden rounded-2xl border border-border/70 bg-background/70"
                              >
                                <div className="max-h-44 overflow-y-auto p-2">
                                  {item.events.slice(-8).map((event) => (
                                    <div
                                      key={event.id}
                                      className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-[10.5px] text-muted-foreground"
                                    >
                                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" />
                                      <span className="min-w-0 flex-1 truncate">{formatSystemEventText(event.text)}</span>
                                      <span className="shrink-0 text-[10px] opacity-70">{formatShortTime(event.createdAt)}</span>
                                    </div>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    );
                  }

                  const activity = item.activity;
                  const direction = getDirection(activity);
                  const fromClient = direction === "client";
                  const assistant = direction === "aray";
                  const system = direction === "system";
                  if (system) {
                    return (
                      <div key={activity.id} className="flex justify-center">
                        <div className="inline-flex max-w-[86%] items-center gap-1.5 rounded-full border border-border/70 bg-muted/12 px-3 py-1.5 text-center text-[10px] leading-4 text-muted-foreground">
                          <History className="h-3 w-3 shrink-0 opacity-60" />
                          <span className="truncate">{formatSystemEventText(activity.text)}</span>
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div
                      key={activity.id}
                      className={cn("flex items-end gap-2", fromClient || assistant ? "justify-start" : "justify-end")}
                    >
                      {fromClient && !assistant && (
                        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-[11px] font-bold text-primary">
                          {getInitials(selected.name)}
                        </span>
                      )}
                      {assistant && <ArayIcon size={30} id={`messenger-${activity.id}`} />}
                      <div className={cn("group/message flex min-w-0 max-w-[82%] flex-col gap-1", assistant && "max-w-[88%]")}>
                        <div
                          className={cn(
                            "min-w-0 rounded-2xl border px-3.5 py-2.5 text-[13px] leading-5 shadow-none",
                            fromClient && "rounded-tl-[5px] border-border bg-background/80 text-foreground",
                            direction === "manager" && "rounded-tr-[5px] border-primary/55 bg-primary/45 text-foreground",
                            assistant && "rounded-tl-[5px] border-border bg-muted/25 text-foreground",
                          )}
                        >
                          <MessengerMessageText text={stripPrefix(activity.text)} />
                        </div>
                        <div className={cn(
                          "flex items-center gap-1",
                          direction === "manager" ? "justify-end" : "justify-start",
                        )}>
                          <span className="shrink-0 text-[10px] text-muted-foreground/65">
                            {formatTime(activity.createdAt)}
                          </span>
                          <span className="flex items-center gap-1 opacity-0 transition-opacity group-hover/message:opacity-100 group-focus-within/message:opacity-100">
                          <button
                            type="button"
                            onClick={() => void handleCopyMessage(activity.text)}
                            className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-transparent text-muted-foreground/70 transition hover:bg-muted/35 hover:text-primary"
                            aria-label="Скопировать сообщение"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReplyToMessage(activity)}
                            className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-transparent text-muted-foreground/70 transition hover:bg-muted/35 hover:text-primary"
                            aria-label="Ответить на сообщение"
                          >
                            <Reply className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReactToMessage(activity)}
                            className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-transparent text-muted-foreground/70 transition hover:bg-muted/35 hover:text-primary"
                            aria-label="Отметить сообщение"
                          >
                            <Heart className="h-3 w-3" />
                          </button>
                          {direction !== "manager" && (
                            <button
                              type="button"
                              onClick={() => handlePolishMessage(activity)}
                              className="inline-flex h-6 items-center gap-1 rounded-full bg-transparent px-1.5 text-[10px] font-semibold text-primary/85 transition hover:bg-primary/10 hover:text-primary"
                              aria-label="Оформить ответ через Арая"
                            >
                              <ArayIcon size={13} id={`polish-${activity.id}`} />
                              Ответ
                            </button>
                          )}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {privateArayMessages.map((message) => {
                  const fromUser = message.role === "user";
                  return (
                    <div
                      key={message.id}
                      className={cn("flex items-end gap-2", fromUser ? "justify-end" : "justify-start")}
                    >
                      {!fromUser && <ArayIcon size={30} id={`private-inline-${message.id}`} />}
                      <div className={cn("group/message flex min-w-0 max-w-[82%] flex-col gap-1", !fromUser && "max-w-[88%]")}>
                        <div
                          className={cn(
                            "min-w-0 rounded-2xl border px-3.5 py-2.5 text-[13px] leading-5 shadow-none",
                            fromUser
                              ? "rounded-tr-[5px] border-primary/55 bg-primary/45 text-foreground"
                              : "rounded-tl-[5px] border-border bg-muted/25 text-foreground",
                          )}
                        >
                          <MessengerMessageText text={message.text} fallback={message.streaming ? "Думаю..." : ""} />
                          {!fromUser && message.actions?.length ? (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {message.actions.map((action, index) => (
                                <button
                                  key={`${action.type}-${action.label}-${index}`}
                                  type="button"
                                  onClick={() => void handleInlineArayAction(action)}
                                  className="inline-flex max-w-full items-center gap-1 rounded-full border border-primary/25 bg-primary/8 px-2.5 py-1 text-[10.5px] font-semibold text-primary transition hover:border-primary/55 hover:bg-primary/14"
                                >
                                  {action.type === "navigate" ? (
                                    <ExternalLink className="h-3 w-3 shrink-0" />
                                  ) : (
                                    <ArayIcon size={13} id={`inline-action-${message.id}-${index}`} />
                                  )}
                                  <span className="truncate">{action.label}</span>
                                </button>
                              ))}
                            </div>
                          ) : null}
                        </div>
                        <div className={cn("flex items-center gap-1", fromUser ? "justify-end" : "justify-start")}>
                          <span className="shrink-0 text-[10px] text-muted-foreground/65">
                            {formatTime(message.createdAt)}
                          </span>
                          <span className="flex items-center gap-1 opacity-0 transition-opacity group-hover/message:opacity-100 group-focus-within/message:opacity-100">
                            <button
                              type="button"
                              onClick={() => void handleCopyMessage(message.text)}
                              className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-transparent text-muted-foreground/70 transition hover:bg-muted/35 hover:text-primary"
                              aria-label="Скопировать сообщение"
                            >
                              <Copy className="h-3 w-3" />
                            </button>
                            {!fromUser && (
                              <button
                                type="button"
                                onClick={() => setDraft(message.text)}
                                className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-transparent text-muted-foreground/70 transition hover:bg-muted/35 hover:text-primary"
                                aria-label="Вставить ответ в поле"
                              >
                                <Reply className="h-3 w-3" />
                              </button>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          <div className="relative shrink-0 border-t border-border/70 bg-background/70 px-4 py-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-1">
              <div className="inline-grid min-w-[192px] max-w-full flex-1 grid-cols-3 rounded-full border border-border/70 bg-muted/15 p-0.5 sm:flex-none">
                {([
                  { id: "auto", label: "Умно", helper: draftGoesToAray ? "к Араю" : "в CRM", icon: <SlidersHorizontal className="h-3 w-3" /> },
                  { id: "person", label: "Клиент", helper: "CRM", icon: <MessageSquare className="h-3 w-3" /> },
                  { id: "aray", label: "Арай", helper: "помощь", icon: <ArayIcon size={13} id={`route-segment-${selected.id}`} /> },
                ] as Array<{ id: ComposerRoute; label: string; helper: string; icon: ReactNode }>).map((item) => {
                  const active =
                    composerRoute === item.id ||
                    (composerRoute === "auto" && item.id === "auto");
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setComposerRoute(item.id)}
                      className={cn(
                        "inline-flex min-w-0 items-center justify-center gap-1 rounded-full px-2 py-1.5 text-[10.5px] font-semibold transition",
                        active
                          ? "bg-primary/12 text-primary"
                          : "text-muted-foreground hover:bg-background/60 hover:text-foreground",
                      )}
                      aria-label={`Отправлять: ${item.label}`}
                      title={`${item.label}: ${item.helper}`}
                    >
                      {item.icon}
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="mb-2 flex min-h-5 items-center justify-between gap-2 px-1 text-[10.5px] text-muted-foreground">
              <span className="inline-flex min-w-0 items-center gap-1.5">
                {draftGoesToAray ? <ArayIcon size={14} id={`route-live-${selected.id}`} /> : <MessageSquare className="h-3 w-3 shrink-0 text-primary" />}
                <span className="truncate">Пишем {composerTargetLabel}</span>
              </span>
              <span className="min-w-0 truncate text-right">{composerStateText}</span>
            </div>
            <AnimatePresence initial={false}>
              {draftReview && !draftGoesToAray && draft.trim() ? (
                <motion.div
                  initial={{ opacity: 0, y: 6, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, y: 6, height: 0 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="overflow-hidden"
                >
                  <div className="mb-2 flex items-center justify-between gap-2 rounded-2xl border border-primary/20 bg-primary/[0.06] px-3 py-2 text-[10.5px] text-muted-foreground">
                    <span className="inline-flex min-w-0 items-center gap-1.5">
                      <ArayIcon size={15} id={`proofread-${selected.id}`} />
                      <span className="truncate">
                        {draftReview.corrected !== draftReview.source ? "Арай поправил грамматику. Проверь перед отправкой." : "Арай проверил текст. Можно подтвердить отправку."}
                      </span>
                    </span>
                    {draftReview.corrected !== draftReview.source && (
                      <button
                        type="button"
                        onClick={() => {
                          setDraft(draftReview.source);
                          setDraftReview({ source: draftReview.source, corrected: draftReview.source });
                          setStatus("Вернул исходный текст");
                        }}
                        className="shrink-0 rounded-full bg-background/70 px-2 py-1 text-[10px] font-semibold text-muted-foreground transition hover:text-primary"
                      >
                        Исходный
                      </button>
                    )}
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
            <div className="hidden">
              {QUICK_DRAFTS.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  className="shrink-0 rounded-full border border-border bg-muted/20 px-3 py-1.5 text-[11px] font-semibold text-muted-foreground transition hover:border-primary/50 hover:text-primary"
                  onClick={() => setDraft(item.text)}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <AnimatePresence initial={false}>
              {callStudioOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, y: 8, height: 0 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="overflow-hidden"
                >
                  <div className="mb-2 rounded-[22px] border border-primary/20 bg-background/78 p-2.5 shadow-[0_12px_34px_rgba(0,0,0,0.16)]">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                        <PhoneCall className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12.5px] font-bold text-foreground">AR Phone</p>
                        <p className="truncate text-[10.5px] text-muted-foreground">Звонок, видео и приглашение по одному номеру</p>
                        <button
                          type="button"
                          onClick={() => void copyArayNumber()}
                          className="mt-1 inline-flex max-w-full items-center gap-1 rounded-full bg-primary/8 px-2 py-0.5 text-[10px] font-semibold text-primary"
                          title="Скопировать номер"
                        >
                          <Copy className="h-3 w-3 shrink-0" />
                          <span className="truncate">{selectedPublicArayNumber}</span>
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setCallStudioOpen(false);
                        }}
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-transparent text-muted-foreground transition hover:bg-muted/30 hover:text-foreground"
                        aria-label="Закрыть видеовстречу"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        onClick={startVoiceCall}
                        disabled={!selectedCallHref || sending || privateArayBusy}
                        className="inline-flex min-h-12 items-center justify-center gap-1.5 rounded-2xl bg-primary/12 px-2 text-[11px] font-bold text-primary transition hover:bg-primary/18 disabled:opacity-35"
                        aria-label="Позвонить"
                      >
                        <PhoneCall className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">Телефон</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => void openVideoMeeting()}
                        disabled={sending || privateArayBusy}
                        className="inline-flex min-h-12 items-center justify-center gap-1.5 rounded-2xl bg-primary/12 px-2 text-[11px] font-bold text-primary transition hover:bg-primary/18 disabled:opacity-35"
                        aria-label="Открыть видеовстречу"
                      >
                        <Video className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">Видео</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => void prepareVideoInviteOnly()}
                        disabled={sending || privateArayBusy}
                        className="inline-flex min-h-12 items-center justify-center gap-1.5 rounded-2xl bg-primary/12 px-2 text-[11px] font-bold text-primary transition hover:bg-primary/18 disabled:opacity-35"
                        aria-label="Подготовить приглашение"
                      >
                        <UserPlus className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">Пригласить</span>
                      </button>
                    </div>
                    <div className="mt-2 flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => void shareArayPhoneInvite()}
                        disabled={sending || privateArayBusy}
                        className="inline-flex min-h-8 min-w-0 items-center justify-center gap-1.5 rounded-full border border-border/60 bg-muted/15 px-2.5 text-[10px] font-semibold text-muted-foreground transition hover:border-primary/45 hover:text-primary disabled:opacity-35"
                        aria-label="Поделиться AR Phone"
                      >
                        <Share2 className="h-3 w-3 shrink-0" />
                        <span className="truncate">Поделиться</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => void copyArayPhoneInvite()}
                        className="inline-flex min-h-8 min-w-0 items-center justify-center gap-1.5 rounded-full border border-border/60 bg-muted/15 px-2.5 text-[10px] font-semibold text-muted-foreground transition hover:border-primary/45 hover:text-primary"
                        aria-label="Скопировать приглашение"
                      >
                        <Copy className="h-3 w-3 shrink-0" />
                        <span className="truncate">Номер</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => void copyMeetingLink()}
                        className="inline-flex min-h-8 min-w-0 items-center justify-center gap-1.5 rounded-full border border-border/60 bg-muted/15 px-2.5 text-[10px] font-semibold text-muted-foreground transition hover:border-primary/45 hover:text-primary"
                        aria-label="Ссылка встречи"
                      >
                        <Link2 className="h-3 w-3 shrink-0" />
                        <span className="truncate">Ссылка</span>
                      </button>
                    </div>
                    {videoRoomOpen && selected && (
                      <div className="mt-2 overflow-hidden rounded-2xl border border-border/70 bg-background/75">
                        <div className="flex items-center justify-between gap-2 border-b border-border/60 px-3 py-2">
                          <div className="min-w-0">
                            <p className="truncate text-[11px] font-bold text-foreground">Видео звонок</p>
                            <p className="truncate text-[10px] text-muted-foreground">{selected.name} · {selectedPublicArayNumber}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setVideoRoomOpen(false)}
                            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted/25 text-muted-foreground transition hover:bg-muted/40 hover:text-foreground"
                            aria-label="Закрыть видео"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <iframe
                          title={`AR Phone video ${selected.name}`}
                          src={`${getArayMeetingUrl(selected)}#config.prejoinPageEnabled=false&config.startWithAudioMuted=true&config.startWithVideoMuted=false`}
                          allow="camera; microphone; fullscreen; display-capture; autoplay; clipboard-write"
                          className="h-64 w-full border-0 bg-background sm:h-72"
                        />
                      </div>
                    )}
                    <p className="mt-2 line-clamp-2 text-[10px] leading-4 text-muted-foreground">
                      {meetingStatusText}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <AnimatePresence initial={false}>
              {false && privateArayOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, y: 8, height: 0 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="overflow-hidden"
                >
                  <div className="mb-2 rounded-[22px] border border-primary/20 bg-primary/[0.07] p-2.5 shadow-[0_10px_28px_rgba(0,0,0,0.16)]">
                    <div className="flex items-start gap-2">
                      <ArayIcon size={26} id={`private-aray-${selected.id}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-foreground">
                          <Lock className="h-3 w-3 text-primary" />
                          Арай рядом
                        </div>
                        <p className="mt-0.5 text-[10.5px] leading-4 text-muted-foreground">
                          Собеседник этого не видит. Здесь можно обсудить ответ, документ, задачу или следующий шаг.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setPrivateArayOpen(false);
                          setComposerMode("client");
                        }}
                        className="rounded-full px-2 py-1 text-[10px] font-semibold text-muted-foreground transition hover:bg-muted/30 hover:text-foreground"
                      >
                        Скрыть
                      </button>
                    </div>
                    {privateArayMessages.length > 0 && (
                      <div className="mt-2 max-h-36 space-y-1.5 overflow-y-auto rounded-[18px] bg-background/50 p-2">
                        {privateArayMessages.slice(-4).map((message) => (
                          <div
                            key={message.id}
                            className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}
                          >
                            <div
                              className={cn(
                                "max-w-[88%] rounded-2xl px-3 py-2 text-[11.5px] leading-5",
                                message.role === "user"
                                  ? "rounded-br-md border border-primary/55 bg-primary/45 text-foreground"
                                  : "rounded-bl-md border border-border/70 bg-background/80 text-foreground",
                              )}
                            >
                              <div className="mb-0.5 flex items-center justify-between gap-2 text-[9px] font-semibold uppercase opacity-70">
                                <span>{message.role === "user" ? "Вопрос" : "Приватный Арай"}</span>
                                <span>{formatShortTime(message.createdAt)}</span>
                              </div>
                              <MessengerMessageText text={message.text} fallback={message.streaming ? "Думаю..." : ""} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            {false && smartMessengerActions.length > 0 && !toolsOpen && !threadSettingsOpen && !callStudioOpen && (
              <div className="mb-2 rounded-2xl border border-primary/15 bg-primary/[0.045] p-2">
                <div className="mb-1.5 flex items-center justify-between gap-2 px-1">
                  <span className="inline-flex min-w-0 items-center gap-1.5 text-[10.5px] font-bold text-foreground">
                    <ArayIcon size={15} id={`smart-strip-${selected.id}`} />
                    <span className="truncate">Арай предложил</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setThreadSettingsOpen(true);
                      setToolsOpen(false);
                    }}
                    className="shrink-0 rounded-full bg-background/55 px-2 py-1 text-[10px] font-semibold text-muted-foreground transition hover:text-primary"
                  >
                    Все
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {smartMessengerActions.map((action) => (
                    <button
                      key={action.id}
                      type="button"
                      onClick={action.onClick}
                      disabled={action.disabled}
                      className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-background/60 px-2.5 text-left text-[11px] font-semibold text-foreground transition hover:bg-primary/10 hover:text-primary disabled:opacity-45"
                    >
                      <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        {action.icon}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate">{action.label}</span>
                        <span className="block truncate text-[9px] font-normal text-muted-foreground">{action.helper}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="flex items-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setComposerRoute((route) => route === "aray" ? "auto" : "aray");
                  keepArayBesideDialog();
                }}
                disabled={sending || privateArayBusy}
                className={cn(
                  "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-transparent transition hover:bg-primary/10 disabled:opacity-45",
                  draftGoesToAray && "bg-primary/10",
                )}
                aria-label="Выбрать Арая как получателя"
                title={draftGoesToAray ? "Сейчас пишем Араю" : "Переключить на Арая"}
              >
                <ArayIcon size={34} id={`composer-aray-${selected.id}`} />
              </button>
              <textarea
                ref={composerRef}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void sendSmartMessage();
                  }
                }}
                className="max-h-28 min-h-11 flex-1 resize-none rounded-2xl border border-border/80 bg-muted/15 px-4 py-3 text-[14px] leading-5 outline-none transition placeholder:text-muted-foreground/70 focus:border-primary/35 focus:bg-background/85 focus:ring-2 focus:ring-primary/10"
                placeholder={composerPlaceholder}
                aria-label={composerPlaceholder}
                rows={1}
              />
              <button
                type="button"
                onClick={toggleVoiceDraft}
                className={cn(
                  "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border bg-muted/15 text-muted-foreground transition hover:border-primary/45 hover:text-primary disabled:opacity-45",
                  inputListening && "border-primary/60 bg-primary/12 text-primary",
                )}
                aria-label={inputListening ? "Остановить голосовой ввод" : "Голосовой ввод"}
                disabled={sending || privateArayBusy}
              >
                {inputListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>
              <button
                type="button"
                onClick={() => void sendSmartMessage()}
                disabled={composerBusy || !draft.trim()}
                className={cn(
                  "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition disabled:opacity-45",
                  draft.trim()
                    ? "bg-primary/12 text-primary hover:bg-primary/18"
                    : "bg-muted/20 text-muted-foreground/50",
                )}
                aria-label={sendButtonLabel}
                title={sendButtonLabel}
              >
                {composerBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : draftReview && !draftGoesToAray ? <CheckSquare className="h-4 w-4" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
            <div className="hidden">
              <button
                type="button"
                onClick={() => setComposerMode("client")}
                title={`Сообщение для ${recipientLabel}`}
                className={cn(
                  "flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold transition",
                  composerMode === "client" ? "bg-primary/12 text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <MessageSquare className="h-3 w-3 shrink-0" />
                <span className="truncate">{recipientLabel}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setPrivateArayOpen(true);
                  setComposerMode("aray");
                }}
                className={cn(
                  "flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold transition",
                  composerMode === "aray" ? "bg-primary/12 text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Lock className="h-3 w-3 shrink-0" />
                <span className="truncate">Арай приватно</span>
              </button>
            </div>
            <AnimatePresence initial={false}>
              {false && toolsOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, y: 8, height: 0 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="absolute bottom-[4.25rem] left-4 right-4 z-30 overflow-hidden"
                >
                  <div className="max-h-[min(320px,46dvh)] overflow-y-auto rounded-2xl border border-border/70 bg-background/95 p-2 shadow-[0_18px_48px_rgba(0,0,0,0.28)]">
                    <div className="mb-2 flex items-center justify-between gap-2 px-1">
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold text-foreground">Действия</p>
                        <p className="truncate text-[10px] text-muted-foreground">Документы, задачи, смета и быстрые ответы</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setToolsOpen(false)}
                        className="rounded-full bg-muted/20 px-2 py-1 text-[10px] font-semibold text-muted-foreground transition hover:bg-primary/10 hover:text-primary"
                      >
                        Скрыть
                      </button>
                    </div>

                    <div className="-mx-0.5 mb-2 flex gap-1.5 overflow-x-auto px-0.5 pb-1">
                      {QUICK_DRAFTS.map((item) => (
                        <button
                          key={item.label}
                          type="button"
                          onClick={() => {
                            setDraft(item.text);
                            setComposerRoute("person");
                            setToolsOpen(false);
                          }}
                          className="shrink-0 rounded-full border border-border bg-muted/15 px-3 py-1.5 text-[10.5px] font-semibold text-muted-foreground transition hover:border-primary/45 hover:text-primary"
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={explainWalletAndBonuses}
                        disabled={sending || privateArayBusy}
                        className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-muted/20 px-2.5 text-left text-[11px] font-semibold text-foreground transition hover:bg-primary/10 hover:text-primary disabled:opacity-45"
                      >
                        <Wallet className="h-3.5 w-3.5 shrink-0 text-primary" />
                        <span className="min-w-0">
                          <span className="block truncate">Кошелек</span>
                          <span className="block truncate text-[9.5px] font-normal text-muted-foreground">оплаты и бонусы</span>
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={preparePaymentRequest}
                        disabled={sending || privateArayBusy}
                        className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-muted/20 px-2.5 text-left text-[11px] font-semibold text-foreground transition hover:bg-primary/10 hover:text-primary disabled:opacity-45"
                      >
                        <CreditCard className="h-3.5 w-3.5 shrink-0 text-primary" />
                        <span className="min-w-0">
                          <span className="block truncate">Оплата</span>
                          <span className="block truncate text-[9.5px] font-normal text-muted-foreground">счет, банк, QR</span>
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={polishDraft}
                        disabled={sending || privateArayBusy}
                        className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-muted/20 px-2.5 text-left text-[11px] font-semibold text-foreground transition hover:bg-primary/10 hover:text-primary disabled:opacity-45"
                      >
                        <ArayIcon size={18} id={`polish-tool-${selected.id}`} />
                        <span className="min-w-0">
                          <span className="block truncate">Оформить ответ</span>
                          <span className="block truncate text-[9.5px] font-normal text-muted-foreground">без воды</span>
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={askArayForNextStep}
                        disabled={sending || privateArayBusy}
                        className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-muted/20 px-2.5 text-left text-[11px] font-semibold text-foreground transition hover:bg-primary/10 hover:text-primary disabled:opacity-45"
                      >
                        <ArayIcon size={18} id={`beside-tool-${selected.id}`} />
                        <span className="min-w-0">
                          <span className="block truncate">Следующий шаг</span>
                          <span className="block truncate text-[9.5px] font-normal text-muted-foreground">по контексту</span>
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={createTask}
                        disabled={sending || privateArayBusy}
                        className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-muted/20 px-2.5 text-left text-[11px] font-semibold text-foreground transition hover:bg-primary/10 hover:text-primary disabled:opacity-45"
                      >
                        <CheckSquare className="h-3.5 w-3.5 shrink-0 text-primary" />
                        <span className="min-w-0">
                          <span className="block truncate">В задачу</span>
                          <span className="block truncate text-[9.5px] font-normal text-muted-foreground">контроль</span>
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={saveClientMessage}
                        disabled={sending || privateArayBusy || !draft.trim()}
                        className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-muted/20 px-2.5 text-left text-[11px] font-semibold text-foreground transition hover:bg-primary/10 hover:text-primary disabled:opacity-45"
                      >
                        <MessageSquare className="h-3.5 w-3.5 shrink-0 text-primary" />
                        <span className="min-w-0">
                          <span className="block truncate">Входящее</span>
                          <span className="block truncate text-[9.5px] font-normal text-muted-foreground">со слов клиента</span>
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={requestEstimateCart}
                        disabled={sending || privateArayBusy}
                        className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-muted/20 px-2.5 text-left text-[11px] font-semibold text-foreground transition hover:bg-primary/10 hover:text-primary disabled:opacity-45"
                      >
                        <FileText className="h-3.5 w-3.5 shrink-0 text-primary" />
                        <span className="min-w-0">
                          <span className="block truncate">Смета в корзину</span>
                          <span className="block truncate text-[9.5px] font-normal text-muted-foreground">список, фото, остатки</span>
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => openArayTarget(`/admin/crm?leadId=${selected.id}`)}
                        disabled={sending || privateArayBusy}
                        className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-muted/20 px-2.5 text-left text-[11px] font-semibold text-foreground transition hover:bg-primary/10 hover:text-primary disabled:opacity-45"
                      >
                        <ExternalLink className="h-3.5 w-3.5 shrink-0 text-primary" />
                        <span className="min-w-0">
                          <span className="block truncate">CRM</span>
                          <span className="block truncate text-[9.5px] font-normal text-muted-foreground">карточка и лиды</span>
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => openArayTarget("/admin/media")}
                        disabled={sending || privateArayBusy}
                        className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-muted/20 px-2.5 text-left text-[11px] font-semibold text-foreground transition hover:bg-primary/10 hover:text-primary disabled:opacity-45"
                      >
                        <ExternalLink className="h-3.5 w-3.5 shrink-0 text-primary" />
                        <span className="min-w-0">
                          <span className="block truncate">Файлы</span>
                          <span className="block truncate text-[9.5px] font-normal text-muted-foreground">фото, PDF, медиа</span>
                        </span>
                      </button>
                    </div>

                    <div className="mt-2 rounded-xl bg-muted/15 p-1.5">
                      <div className="mb-1 flex items-center gap-1.5 px-1 text-[10px] font-semibold text-muted-foreground">
                        <FileText className="h-3 w-3" />
                        Документы
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        {DOCUMENT_DRAFTS.map((item) => (
                          <button
                            key={item.type}
                            type="button"
                            onClick={() => requestDocumentDraft(item.type)}
                            disabled={sending || privateArayBusy}
                            className="min-h-10 rounded-xl bg-background/65 px-2 text-left text-[11px] font-bold text-foreground transition hover:bg-primary/10 hover:text-primary disabled:opacity-45"
                          >
                            <span className="block truncate">{item.label}</span>
                            <span className="block truncate text-[9px] font-normal text-muted-foreground">{item.hint}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            {status && <div className="mt-2 truncate text-[11px] text-muted-foreground">{status}</div>}
          </div>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
}
