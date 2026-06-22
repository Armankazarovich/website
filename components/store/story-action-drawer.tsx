"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import {
  buildArayBusinessMessengerText,
  type ArayBusinessMessageKind,
} from "@/lib/aray-business-messenger";

import {
  ArrowRight,
  BadgeCheck,
  Calculator,
  Check,
  ChevronDown,
  ChevronUp,
  Clock3,
  FileText,
  Heart,
  ImageIcon,
  MessageCircle,
  Paperclip,
  Send,
  Share2,
  Sparkles,
  Star,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const DEFAULT_BUSINESS_ICON = "/logo.png";

type StoryMessageKind = ArayBusinessMessageKind;

type StoryAttachment = {
  id: string;
  name: string;
  kind: "image" | "document";
  size: number;
  previewUrl?: string;
};

type StoryComment = {
  id: string;
  text: string;
  createdAt: string;
  author: "guest" | "aray";
  kind: StoryMessageKind;
  attachments?: Array<Omit<StoryAttachment, "previewUrl">>;
};

export type StoryActionRelation = {
  entityType: string;
  entityId: string;
  label: string | null;
  image: string | null;
  ctaUrl: string | null;
  sortOrder?: number;
};

export type StoryActionStory = {
  id: string;
  type: "IMAGE" | "VIDEO" | "LIVE";
  title: string;
  subtitle: string | null;
  description: string | null;
  ctaLabel: string | null;
  posterUrl?: string | null;
  brandIconUrl?: string | null;
};

const MESSAGE_KIND_OPTIONS: Array<{ value: StoryMessageKind; label: string; hint: string; helper: string; placeholder: string }> = [
  {
    value: "question",
    label: "Вопрос",
    hint: "по товару",
    helper: "Менеджер увидит сторис, товар и ваш вопрос.",
    placeholder: "Напишите, что нужно уточнить: сорт, наличие, доставка, оплата...",
  },
  {
    value: "offer",
    label: "Расчёт",
    hint: "цена, объём",
    helper: "Для расчёта добавьте размер, объём и адрес доставки.",
    placeholder: "Напишите объём, размер, адрес доставки или вопрос по цене...",
  },
  {
    value: "review",
    label: "Отзыв",
    hint: "о заказе",
    helper: "Отзыв уйдёт на модерацию и может попасть в общий виджет.",
    placeholder: "Напишите отзыв о товаре, доставке или менеджере...",
  },
  {
    value: "comment",
    label: "Комментарий",
    hint: "к сторис",
    helper: "Короткий комментарий сохранится вместе с контекстом сторис.",
    placeholder: "Напишите короткий комментарий по этой сторис...",
  },
];

function isExternalHref(href: string) {
  return /^https?:\/\//i.test(href);
}

function relationLabel(type: string) {
  if (type === "product") return "Товар";
  if (type === "service") return "Услуга";
  if (type === "promotion") return "Акция";
  if (type === "review") return "Отзыв";
  if (type === "company") return "Компания";
  return "Связь";
}

function relationActionLabel(type: string) {
  if (type === "product") return "Открыть товар";
  if (type === "service") return "Оставить заявку";
  if (type === "promotion") return "Смотреть акцию";
  if (type === "review") return "Смотреть отзыв";
  return "Открыть";
}

function relationCountLabel(count: number) {
  if (count <= 0) return "Описание и действие";
  if (count === 1) return "Связано: 1 объект";
  if (count < 5) return `Связано: ${count} объекта`;
  return `Связано: ${count} объектов`;
}

function kindLabel(kind: StoryMessageKind) {
  return MESSAGE_KIND_OPTIONS.find((item) => item.value === kind)?.label || "Сообщение";
}

function storySocialKey(storyId: string) {
  return `pilorus:story-social:${storyId}`;
}

function polishStoryDraft(value: string, kind: StoryMessageKind, relationName?: string | null) {
  return buildArayBusinessMessengerText({ text: value, kind, relationLabel: relationName });
}

function contactPayload(value: string) {
  const contact = value.replace(/\s+/g, " ").trim();
  if (!contact) return {};
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)) return { email: contact };
  if (/^[+()\d\s-]{5,}$/.test(contact)) return { phone: contact };
  return { name: contact };
}

function normalizeStoredComment(item: unknown): StoryComment | null {
  if (!item || typeof item !== "object") return null;
  const value = item as Partial<StoryComment>;
  if (typeof value.text !== "string" || !value.text.trim()) return null;
  return {
    id: typeof value.id === "string" ? value.id : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    text: value.text.slice(0, 1200),
    createdAt: typeof value.createdAt === "string" ? value.createdAt : new Date().toISOString(),
    author: value.author === "aray" ? "aray" : "guest",
    kind:
      value.kind === "offer" || value.kind === "review" || value.kind === "comment" || value.kind === "question"
        ? value.kind
        : "comment",
    attachments: Array.isArray(value.attachments) ? value.attachments.slice(0, 4) : [],
  };
}

function formatFileSize(size: number) {
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} МБ`;
  if (size >= 1024) return `${Math.round(size / 1024)} КБ`;
  return `${size} Б`;
}

function openArayStoryContext({
  story,
  kind,
  text,
  relationName,
  attachmentsCount,
  reply,
  sourceAction = "submitted",
}: {
  story: StoryActionStory;
  kind: StoryMessageKind;
  text: string;
  relationName?: string | null;
  attachmentsCount: number;
  reply?: string;
  sourceAction?: "open" | "submitted";
}) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("aray:story-context", {
      detail: {
        storyId: story.id,
        storyTitle: story.title,
        storyType: story.type,
        kind,
        kindLabel: kindLabel(kind),
        text,
        relationName,
        attachmentsCount,
        reply,
        sourceAction,
      },
    }),
  );
}

function readImagePreview(file: File) {
  return new Promise<string | undefined>((resolve) => {
    if (!file.type.startsWith("image/")) {
      resolve(undefined);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : undefined);
    reader.onerror = () => resolve(undefined);
    reader.readAsDataURL(file);
  });
}

export function StoryActionDrawer({
  story,
  relations,
  actionHref,
  expanded,
  onToggle,
  onNavigate,
}: {
  story: StoryActionStory;
  relations: StoryActionRelation[];
  actionHref?: string | null;
  expanded: boolean;
  onToggle: () => void;
  onNavigate?: () => void;
}) {
  const visibleRelations = relations.slice(0, 6);
  const primaryRelation = visibleRelations[0] ?? null;
  const actionLabel = story.ctaLabel || (story.type === "LIVE" ? "Открыть эфир" : "Открыть");
  const drawerIcon =
    primaryRelation?.image ||
    (primaryRelation ? story.posterUrl : story.brandIconUrl || DEFAULT_BUSINESS_ICON) ||
    DEFAULT_BUSINESS_ICON;
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [liked, setLiked] = useState(false);
  const [comments, setComments] = useState<StoryComment[]>([]);
  const [draft, setDraft] = useState("");
  const [contact, setContact] = useState("");
  const [messageKind, setMessageKind] = useState<StoryMessageKind>("question");
  const [rating, setRating] = useState(5);
  const [attachments, setAttachments] = useState<StoryAttachment[]>([]);
  const [commentOpen, setCommentOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [messageStatus, setMessageStatus] = useState<"idle" | "done" | "error">("idle");
  const [messageError, setMessageError] = useState("");
  const [shareStatus, setShareStatus] = useState<"idle" | "done" | "error">("idle");
  const [hydrated, setHydrated] = useState(false);
  const socialKey = useMemo(() => storySocialKey(story.id), [story.id]);
  const relationName = primaryRelation?.label || story.subtitle || story.title;
  const activeKindOption = MESSAGE_KIND_OPTIONS.find((item) => item.value === messageKind) ?? MESSAGE_KIND_OPTIONS[0];

  useEffect(() => {
    setHydrated(false);
    setDraft("");
    setContact("");
    setMessageKind("question");
    setRating(5);
    setAttachments([]);
    setCommentOpen(false);
    setShareStatus("idle");
    setMessageStatus("idle");
    setMessageError("");
    try {
      const raw = window.localStorage.getItem(socialKey);
      const parsed = raw ? JSON.parse(raw) : null;
      setLiked(Boolean(parsed?.liked));
      setComments(
        Array.isArray(parsed?.comments)
          ? parsed.comments.map(normalizeStoredComment).filter(Boolean).slice(0, 12)
          : [],
      );
    } catch {
      setLiked(false);
      setComments([]);
    } finally {
      setHydrated(true);
    }
  }, [socialKey]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(socialKey, JSON.stringify({ liked, comments }));
    } catch {
      // Local reactions should never block the story popup.
    }
  }, [comments, hydrated, liked, socialKey]);

  const openComments = () => {
    setCommentOpen(true);
    if (!expanded) onToggle();
    openArayStoryContext({
      story,
      kind: messageKind,
      text: draft.trim() || "Открыт чат по сторис.",
      relationName,
      attachmentsCount: attachments.length,
      sourceAction: "open",
    });
  };

  const toggleLike = () => {
    setLiked((value) => !value);
  };

  const copyShareUrl = async (shareUrl: string) => {
    const webNavigator =
      typeof navigator === "undefined"
        ? null
        : (navigator as Navigator & {
            clipboard?: Clipboard;
          });

    if (webNavigator?.clipboard?.writeText) {
      await webNavigator.clipboard.writeText(shareUrl);
      return true;
    }

    if (typeof document === "undefined") return false;
    const textarea = document.createElement("textarea");
    textarea.value = shareUrl;
    textarea.setAttribute("readonly", "true");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    textarea.style.top = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);

    try {
      return document.execCommand("copy");
    } finally {
      document.body.removeChild(textarea);
    }
  };

  const shareStory = async () => {
    const shareUrl = typeof window === "undefined" ? "" : `${window.location.origin}/stories?story=${story.id}`;
    const payload = {
      title: story.title,
      text: story.subtitle || story.description || story.title,
      url: shareUrl,
    };

    try {
      const webNavigator =
        typeof navigator === "undefined"
          ? null
          : (navigator as Navigator & {
              share?: (data: ShareData) => Promise<void>;
              clipboard?: Clipboard;
            });

      if (webNavigator?.share) {
        await webNavigator.share(payload);
      } else if (shareUrl) {
        const copied = await copyShareUrl(shareUrl);
        if (!copied) throw new Error("Share copy failed");
      }
      setShareStatus("done");
      window.setTimeout(() => setShareStatus("idle"), 1800);
    } catch {
      setShareStatus("error");
      window.setTimeout(() => setShareStatus("idle"), 1800);
    }
  };

  const polishDraft = () => {
    const source = draft || (attachments.length ? "Передаю вложение для уточнения." : "");
    setDraft(polishStoryDraft(source, messageKind, relationName));
    setMessageStatus("idle");
    setMessageError("");
    setCommentOpen(true);
  };

  const handleFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    const availableSlots = Math.max(0, 4 - attachments.length);
    const selectedFiles = files.slice(0, availableSlots).filter((file) => file.size <= 8 * 1024 * 1024);
    const prepared = await Promise.all(
      selectedFiles.map(async (file) => ({
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        name: file.name,
        kind: file.type.startsWith("image/") ? ("image" as const) : ("document" as const),
        size: file.size,
        previewUrl: await readImagePreview(file),
      })),
    );
    setAttachments((items) => [...items, ...prepared].slice(0, 4));
    setCommentOpen(true);
    event.currentTarget.value = "";
  };

  const submitComment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const source = draft || (attachments.length ? "Передаю вложение для уточнения." : "");
    const text = polishStoryDraft(source, messageKind, relationName).slice(0, 1200);
    if (!text) return;

    setSubmitting(true);
    setMessageStatus("idle");
    setMessageError("");

    const attachmentMeta = attachments.map(({ id, name, kind, size }) => ({ id, name, kind, size }));

    try {
      const response = await fetch(`/api/stories/${encodeURIComponent(story.id)}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: messageKind,
          text,
          originalText: draft.trim(),
          rating,
          pageUrl: typeof window === "undefined" ? null : window.location.href,
          attachments: attachmentMeta,
          ...contactPayload(contact),
        }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof result.error === "string" ? result.error : "Не удалось отправить сообщение");

      const now = Date.now();
      const visibleText = (draft.trim() || text).slice(0, 1200);
      const guestComment: StoryComment = {
        id: `${now}-guest`,
        text: visibleText,
        createdAt: new Date(now).toISOString(),
        author: "guest",
        kind: messageKind,
        attachments: attachmentMeta,
      };
      const arayComment: StoryComment = {
        id: `${now}-aray`,
        text:
          typeof result.arayReply === "string"
            ? result.arayReply
            : "Спасибо. Менеджер увидит сторис, товар и ваше сообщение.",
        createdAt: new Date(now + 1).toISOString(),
        author: "aray",
        kind: messageKind,
        attachments: [],
      };
      setComments((items) =>
        [guestComment, arayComment, ...items].slice(0, 12),
      );
      setDraft("");
      setAttachments([]);
      setMessageStatus("done");
      setCommentOpen(true);
      openArayStoryContext({
        story,
        kind: messageKind,
        text,
        relationName,
        attachmentsCount: attachmentMeta.length,
        reply: typeof result.arayReply === "string" ? result.arayReply : undefined,
      });
    } catch (error) {
      setMessageStatus("error");
      setMessageError(error instanceof Error ? error.message : "Не удалось отправить сообщение");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className={cn(
        "store-story-action-drawer absolute inset-x-2 bottom-2 z-20 overflow-hidden rounded-2xl border border-border text-foreground sm:inset-x-3 sm:bottom-3",
        expanded && "max-h-[82%] overflow-y-auto",
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start gap-3 px-3 pb-2.5 pt-3 text-left"
        aria-expanded={expanded}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-background">
          <img src={drawerIcon} alt="" className="h-full w-full object-cover" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="line-clamp-2 text-[13px] font-bold leading-5 sm:text-sm">{story.title}</span>
          <span className="mt-0.5 block truncate text-[11px] font-semibold text-muted-foreground">
            {relationCountLabel(visibleRelations.length)}
          </span>
        </span>
        {expanded ? (
          <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-primary" />
        ) : (
          <ChevronUp className="mt-1 h-4 w-4 shrink-0 text-primary" />
        )}
      </button>

      <div className="flex items-center gap-1.5 px-3 pb-3">
        <button
          type="button"
          onClick={toggleLike}
          className={cn(
            "inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-2 text-[11px] font-semibold text-muted-foreground transition-colors hover:border-primary/45 hover:text-primary",
            liked && "border-primary/50 bg-primary/10 text-primary",
          )}
          aria-pressed={liked}
        >
          <Heart className={cn("h-3.5 w-3.5", liked && "fill-current")} />
          {liked ? "Нравится" : "Лайк"}
        </button>
        <button
          type="button"
          onClick={openComments}
          className={cn(
            "inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-2 text-[11px] font-semibold text-muted-foreground transition-colors hover:border-primary/45 hover:text-primary",
            commentOpen && "border-primary/45 text-primary",
          )}
        >
          <MessageCircle className="h-3.5 w-3.5" />
          {comments.length > 0 ? `${comments.length} чат` : "Чат"}
        </button>
        <button
          type="button"
          onClick={shareStory}
          className="inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-2 text-[11px] font-semibold text-muted-foreground transition-colors hover:border-primary/45 hover:text-primary"
        >
          {shareStatus === "done" ? <Check className="h-3.5 w-3.5 text-primary" /> : <Share2 className="h-3.5 w-3.5" />}
          {shareStatus === "done" ? "Готово" : shareStatus === "error" ? "Ошибка" : "Поделиться"}
        </button>
      </div>

      {!expanded && (
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-t border-border/70 px-3 py-3">
          <div className="min-w-0">
            {primaryRelation ? (
              <div className="flex min-w-0 items-center gap-2.5">
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-background"
                  title={primaryRelation.label || primaryRelation.entityId}
                >
                  {primaryRelation.image ? (
                    <img src={primaryRelation.image} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Sparkles className="h-4 w-4 text-primary" />
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block text-[10px] font-bold uppercase tracking-wide text-primary">
                    {relationLabel(primaryRelation.entityType)}
                  </span>
                  <span className="mt-0.5 block truncate text-xs font-semibold leading-4 text-foreground">
                    {primaryRelation.label || primaryRelation.entityId}
                  </span>
                </span>
              </div>
            ) : (
              <span className="line-clamp-2 text-xs font-medium leading-4 text-muted-foreground">
                {story.subtitle || "Описание, реакции и бизнес-чат"}
              </span>
            )}
          </div>
          {actionHref && (
            <Link
              href={actionHref}
              target={isExternalHref(actionHref) ? "_blank" : undefined}
              rel={isExternalHref(actionHref) ? "noreferrer" : undefined}
              onClick={onNavigate}
              className="inline-flex min-h-10 shrink-0 items-center justify-center gap-1 rounded-xl bg-primary px-3 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              {actionLabel}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      )}

      {expanded && (
        <div className="space-y-3 border-t border-border px-3 py-3">
          {!commentOpen && (story.subtitle || story.description) && (
            <div className="rounded-2xl border border-border bg-background/55 p-3">
              {story.subtitle && <p className="text-sm font-semibold leading-5">{story.subtitle}</p>}
              {story.description && <p className="mt-2 text-sm leading-6 text-muted-foreground">{story.description}</p>}
            </div>
          )}

          <div className="rounded-2xl border border-border bg-card/95 p-3">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-2.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/35 bg-primary/10 text-primary">
                  <MessageCircle className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-bold leading-5">Быстро связаться</p>
                  <p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">
                    Сторис, товар и выбранный сценарий попадут менеджеру вместе с сообщением.
                  </p>
                </div>
              </div>
              <span className="hidden shrink-0 items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-1 text-[10px] font-bold text-primary sm:inline-flex">
                <Clock3 className="h-3 w-3" />
                быстро
              </span>
            </div>

            {primaryRelation && (
              <div className="mb-3 flex min-w-0 items-center gap-2 rounded-xl border border-border bg-background/65 p-2">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-card">
                  {primaryRelation.image ? (
                    <img src={primaryRelation.image} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Sparkles className="h-4 w-4 text-primary" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[10px] font-bold uppercase tracking-wide text-primary">
                    {relationLabel(primaryRelation.entityType)} в контексте
                  </span>
                  <span className="mt-0.5 block truncate text-xs font-semibold">
                    {primaryRelation.label || primaryRelation.entityId}
                  </span>
                </span>
                <BadgeCheck className="h-4 w-4 shrink-0 text-primary" />
              </div>
            )}

            <div className="mb-3 grid grid-cols-2 gap-1.5">
              {MESSAGE_KIND_OPTIONS.map((option) => {
                const OptionIcon =
                  option.value === "offer"
                    ? Calculator
                    : option.value === "review"
                      ? Star
                      : option.value === "comment"
                        ? FileText
                        : MessageCircle;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setMessageKind(option.value);
                      setCommentOpen(true);
                      setMessageStatus("idle");
                    }}
                    className={cn(
                      "flex min-h-12 items-center gap-2 rounded-xl border border-border bg-background px-2.5 py-1.5 text-left transition-colors hover:border-primary/45",
                      messageKind === option.value && "border-primary/55 bg-primary/10 text-primary",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground",
                        messageKind === option.value && "border-primary/35 bg-primary/10 text-primary",
                      )}
                    >
                      <OptionIcon className="h-3.5 w-3.5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[13px] font-bold leading-4">{option.label}</span>
                      <span className="mt-0.5 block truncate text-[10px] font-semibold text-muted-foreground">{option.hint}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            <form onSubmit={submitComment} className="grid gap-2">
              <div className="overflow-hidden rounded-xl border border-border bg-background transition-colors focus-within:border-primary/55">
                <div className="flex items-center justify-between gap-2 border-b border-border/70 px-3 py-2">
                  <span className="text-[11px] font-bold text-primary">{activeKindOption.label}</span>
                  <span className="text-[10px] font-semibold text-muted-foreground">{draft.length}/1200</span>
                </div>
                <textarea
                  value={draft}
                  onChange={(event) => {
                    setDraft(event.target.value);
                    setMessageStatus("idle");
                  }}
                  maxLength={1200}
                  placeholder={activeKindOption.placeholder}
                  className="min-h-16 w-full resize-none bg-transparent px-3 py-2.5 text-sm leading-5 outline-none placeholder:text-muted-foreground/70"
                />
              </div>

              <p className="flex items-start gap-1.5 text-[11px] leading-4 text-muted-foreground">
                <BadgeCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                {activeKindOption.helper}
              </p>

              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                <input
                  value={contact}
                  onChange={(event) => setContact(event.target.value)}
                  placeholder="Телефон, имя или email"
                  className="min-h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground/75 focus:border-primary/55"
                />
                {messageKind === "review" && (
                  <div className="flex min-h-10 items-center justify-center gap-1 rounded-xl border border-border bg-background px-2">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setRating(value)}
                        className={cn("flex h-7 w-7 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:text-primary", value <= rating && "text-primary")}
                        aria-label={`${value} из 5`}
                      >
                        <Star className={cn("h-4 w-4", value <= rating && "fill-current")} />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {attachments.length > 0 && (
                <div className="grid gap-1.5">
                  {attachments.map((file) => (
                    <div key={file.id} className="flex min-w-0 items-center gap-2 rounded-xl border border-border bg-background p-1.5">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-card text-primary">
                        {file.previewUrl ? (
                          <img src={file.previewUrl} alt="" className="h-full w-full object-cover" />
                        ) : file.kind === "image" ? (
                          <ImageIcon className="h-4 w-4" />
                        ) : (
                          <FileText className="h-4 w-4" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-semibold">{file.name}</span>
                        <span className="block text-[10px] text-muted-foreground">{formatFileSize(file.size)}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setAttachments((items) => items.filter((item) => item.id !== file.id))}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-border text-muted-foreground transition-colors hover:border-primary/45 hover:text-primary"
                        aria-label="Убрать вложение"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                className="hidden"
                onChange={handleFiles}
              />

              <div className="grid grid-cols-[auto_auto_minmax(0,1fr)] gap-1.5">
                <button
                  type="button"
                  onClick={polishDraft}
                  className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-border bg-background px-3 text-xs font-bold transition-colors hover:border-primary/45 hover:text-primary"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Улучшить
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-border bg-background px-3 text-xs font-bold transition-colors hover:border-primary/45 hover:text-primary"
                >
                  <Paperclip className="h-3.5 w-3.5" />
                  {attachments.length > 0 ? `${attachments.length} файл` : "Файл"}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex min-h-10 min-w-0 items-center justify-center gap-1.5 rounded-xl bg-primary px-3 text-xs font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? "Отправка..." : "Отправить"}
                  <Send className="h-3.5 w-3.5" />
                </button>
              </div>
            </form>

            {messageStatus !== "idle" && (
              <div
                className={cn(
                  "mt-2 rounded-xl border px-3 py-2 text-xs font-semibold",
                  messageStatus === "done"
                    ? "border-primary/35 bg-primary/10 text-primary"
                    : "border-destructive/35 bg-destructive/10 text-destructive",
                )}
              >
                {messageStatus === "done" ? "Сообщение принято. Менеджер увидит сторис и ответит по делу." : messageError}
              </div>
            )}

            {comments.length > 0 && (
              <div className="mt-2 grid max-h-36 gap-1.5 overflow-y-auto pr-1">
                {comments.slice(0, 3).map((comment) => (
                  <div
                    key={comment.id}
                    className={cn(
                      "rounded-xl border px-3 py-2 text-xs leading-5",
                      comment.author === "aray"
                        ? "border-primary/30 bg-primary/10 text-foreground"
                        : "border-border bg-background text-foreground",
                    )}
                  >
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase text-muted-foreground">
                        {comment.author === "aray" ? "ПилоРус" : kindLabel(comment.kind)}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(comment.createdAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <p className="line-clamp-3">{comment.text}</p>
                    {comment.attachments && comment.attachments.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {comment.attachments.map((file) => (
                          <span key={file.id} className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
                            {file.kind === "image" ? "Фото" : "Док"}: {file.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {visibleRelations.length > 0 && (
            <div className="grid gap-2">
              {visibleRelations.map((relation) => {
                const content = (
                  <>
                    {relation.image ? (
                      <img src={relation.image} alt="" className="h-12 w-12 shrink-0 rounded-xl object-cover" />
                    ) : (
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                        <Sparkles className="h-4 w-4 text-primary" />
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block text-[10px] font-semibold uppercase text-muted-foreground">
                        {relationLabel(relation.entityType)}
                      </span>
                      <span className="mt-0.5 block truncate text-sm font-semibold">
                        {relation.label || relation.entityId}
                      </span>
                      <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-primary">
                        {relation.ctaUrl ? relationActionLabel(relation.entityType) : "Ссылка не задана"}
                        {relation.ctaUrl && <ArrowRight className="h-3.5 w-3.5" />}
                      </span>
                    </span>
                  </>
                );

                if (!relation.ctaUrl) {
                  return (
                    <div
                      key={`${relation.entityType}-${relation.entityId}`}
                      className="inline-flex min-w-0 items-center gap-3 rounded-2xl border border-border bg-card p-2.5 text-left"
                    >
                      {content}
                    </div>
                  );
                }

                return (
                  <Link
                    key={`${relation.entityType}-${relation.entityId}`}
                    href={relation.ctaUrl}
                    target={isExternalHref(relation.ctaUrl) ? "_blank" : undefined}
                    rel={isExternalHref(relation.ctaUrl) ? "noreferrer" : undefined}
                    onClick={onNavigate}
                    className="inline-flex min-w-0 items-center gap-3 rounded-2xl border border-border bg-card p-2.5 text-left transition-colors hover:border-primary/45"
                  >
                    {content}
                  </Link>
                );
              })}
            </div>
          )}

          {actionHref && (
            <Link
              href={actionHref}
              target={isExternalHref(actionHref) ? "_blank" : undefined}
              rel={isExternalHref(actionHref) ? "noreferrer" : undefined}
              onClick={onNavigate}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              {actionLabel}
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
