"use client";

import { ActionToast } from "@/components/admin/action-toast";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Reorder, useDragControls } from "framer-motion";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  CirclePlay,
  Eye,
  EyeOff,
  GripVertical,
  Image as ImageIcon,
  Link2,
  ListOrdered,
  Loader2,
  Pause,
  Pencil,
  Play,
  Plus,
  Radio,
  RefreshCw,
  RotateCcw,
  Search,
  Share2,
  Sparkles,
  Trash2,
  Upload,
  Volume2,
  VolumeX,
} from "lucide-react";
import { AdminSectionTitle } from "@/components/admin/admin-section-title";
import { AdminModal } from "@/components/admin/admin-modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  monitorStoryMediaJob,
  retryStoryMediaUpload,
  StoryMediaUploadError,
  type StoryMediaUploadState,
  uploadAdminMediaFile,
  uploadStoryMediaFile,
} from "@/lib/admin-upload-client";
import { isStoryTemplateHint } from "@/lib/store-story-templates";

const MediaPickerModal = dynamic(
  () => import("@/app/admin/media/media-client").then((m) => ({ default: m.MediaPickerModal })),
  { ssr: false, loading: () => null },
);

type StoryType = "IMAGE" | "VIDEO" | "LIVE";
type PickedMediaKind = "image" | "video" | "document";
const STORY_MEDIA_ACCEPT = "image/*,video/*,.mp4,.webm,.mov,.m4v";
const STORY_POSTER_ACCEPT = "image/*,.jpg,.jpeg,.png,.webp,.gif";
const STORY_IMAGE_EXTENSIONS = new Set(["avif", "gif", "jpg", "jpeg", "png", "svg", "webp"]);
const STORY_VIDEO_EXTENSIONS = new Set(["m4v", "mov", "mp4", "webm"]);

type Story = {
  id: string;
  type: StoryType;
  title: string;
  subtitle: string | null;
  description: string | null;
  mediaUrl: string | null;
  posterUrl: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  entityType: string | null;
  entityId: string | null;
  placement: string;
  active: boolean;
  pinned: boolean;
  sortOrder: number;
  views: number;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  relations: StoryRelation[];
};

type StoryForm = Omit<Story, "id" | "views" | "createdAt"> & { id?: string };

type StoryMediaCardState = StoryMediaUploadState & {
  canRollback?: boolean;
};

function storyMediaPhase(status?: string): StoryMediaUploadState["phase"] {
  if (status === "PROCESSING") return "processing";
  if (status === "PUBLISHING") return "publishing";
  if (status === "READY") return "ready";
  if (status === "FAILED") return "failed";
  return "queued";
}

function storyMediaMessage(phase: StoryMediaUploadState["phase"], fallback?: string | null) {
  if (fallback) return fallback;
  if (phase === "queued") return "Видео в очереди…";
  if (phase === "processing") return "Облегчаем видео. Покупатели пока видят прежнее.";
  if (phase === "publishing") return "Почти готово…";
  if (phase === "ready") return "Видео облегчено — у покупателей не тормозит.";
  if (phase === "failed") return "Не получилось облегчить видео. Сторис не изменилась — попробуйте ещё раз.";
  return "Загружаем видео…";
}

type StoryRelation = {
  entityType: string;
  entityId: string;
  label: string | null;
  image: string | null;
  ctaUrl: string | null;
  sortOrder: number;
};

type EntityOption = {
  entityType: string;
  entityId: string;
  label: string;
  detail: string;
  image: string | null;
  ctaLabel: string;
  ctaUrl: string;
  template: {
    title: string;
    subtitle: string;
    description: string;
    posterUrl: string | null;
    ctaLabel: string;
    ctaUrl: string;
  };
};

const BLANK_STORY: StoryForm = {
  type: "VIDEO",
  title: "",
  subtitle: "",
  description: "",
  mediaUrl: "",
  posterUrl: "",
  ctaLabel: "Смотреть",
  ctaUrl: "",
  entityType: null,
  entityId: "",
  placement: "site",
  active: true,
  pinned: false,
  sortOrder: 100,
  startsAt: null,
  endsAt: null,
  relations: [],
};

const TYPE_LABEL: Record<StoryType, string> = {
  IMAGE: "Фото",
  VIDEO: "Видео",
  LIVE: "Онлайн-продавец",
};

const ENTITY_LABEL: Record<string, string> = {
  general: "Общая",
  product: "Товар",
  service: "Услуга",
  promotion: "Акция",
  review: "Видео-отзыв",
  company: "О компании",
};

const RELATION_TYPES = ["product", "service", "promotion", "review"] as const;

const fieldClass =
  "w-full min-h-11 rounded-xl border border-border bg-background/70 px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-primary/45 focus:ring-2 focus:ring-primary/15";
const labelClass = "mb-1.5 block text-[11px] font-semibold uppercase text-muted-foreground";

function isRelationType(value?: string | null): value is (typeof RELATION_TYPES)[number] {
  return RELATION_TYPES.includes(value as (typeof RELATION_TYPES)[number]);
}

function isVisibleNow(story: Pick<Story, "active" | "startsAt" | "endsAt">) {
  if (!story.active) return false;
  const now = Date.now();
  const startsAt = story.startsAt ? new Date(story.startsAt).getTime() : null;
  const endsAt = story.endsAt ? new Date(story.endsAt).getTime() : null;
  if (startsAt && Number.isFinite(startsAt) && startsAt > now) return false;
  if (endsAt && Number.isFinite(endsAt) && endsAt < now) return false;
  return true;
}

function relationKey(relation: Pick<StoryRelation, "entityType" | "entityId">) {
  return `${relation.entityType}:${relation.entityId}`;
}

function storyPublicHref(storyId?: string | null) {
  return storyId ? `/stories?story=${encodeURIComponent(storyId)}` : "/stories";
}

function storyTypeFromMedia(url: string, kind?: PickedMediaKind): StoryType | null {
  if (kind === "image") return "IMAGE";
  if (kind === "video") return "VIDEO";

  const cleanUrl = url.trim().split(/[?#]/)[0] || "";
  const ext = cleanUrl.split(".").pop()?.toLowerCase() ?? "";
  if (/^data:image\//i.test(url) || STORY_IMAGE_EXTENSIONS.has(ext)) return "IMAGE";
  if (/^(blob:|data:video\/)/i.test(url) || STORY_VIDEO_EXTENSIONS.has(ext)) return "VIDEO";
  return null;
}

function pickedMediaKindFromFile(file: File): PickedMediaKind | undefined {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (file.type.startsWith("image/") || STORY_IMAGE_EXTENSIONS.has(ext)) return "image";
  if (file.type.startsWith("video/") || STORY_VIDEO_EXTENSIONS.has(ext)) return "video";
  return undefined;
}

function normalizeRelations(story?: Partial<Story> | null): StoryRelation[] {
  const seen = new Set<string>();
  const relations = Array.isArray(story?.relations) ? story.relations : [];
  const normalized = relations
    .map((relation, index) => ({
      entityType: relation.entityType,
      entityId: relation.entityId,
      label: relation.label || null,
      image: relation.image || null,
      ctaUrl: relation.ctaUrl || null,
      sortOrder: relation.sortOrder ?? (index + 1) * 10,
    }))
    .filter((relation) => relation.entityType && relation.entityId)
    .filter((relation) => {
      const key = relationKey(relation);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  if (story?.entityType && story?.entityId && !seen.has(`${story.entityType}:${story.entityId}`)) {
    normalized.unshift({
      entityType: story.entityType,
      entityId: story.entityId,
      label: null,
      image: null,
      ctaUrl: story.ctaUrl || null,
      sortOrder: 0,
    });
  }

  return normalized;
}

function entityOptionToRelation(option: EntityOption, sortOrder: number): StoryRelation {
  return {
    entityType: option.entityType,
    entityId: option.entityId,
    label: option.label,
    image: option.image,
    ctaUrl: option.ctaUrl,
    sortOrder,
  };
}

function addRelation(relations: StoryRelation[], relation: StoryRelation) {
  const key = relationKey(relation);
  const next = relations.filter((item) => relationKey(item) !== key);
  next.push({ ...relation, sortOrder: relation.sortOrder || (next.length + 1) * 10 });
  return next;
}

function normalizeForm(story?: Partial<Story> | null): StoryForm {
  if (!story) return { ...BLANK_STORY, relations: [] };
  return {
    id: story.id,
    type: story.type || "VIDEO",
    title: story.title || "",
    subtitle: story.subtitle || "",
    description: story.description || "",
    mediaUrl: story.mediaUrl || "",
    posterUrl: story.posterUrl || "",
    ctaLabel: story.ctaLabel || "",
    ctaUrl: story.ctaUrl || "",
    entityType: story.entityType || null,
    entityId: story.entityId || "",
    placement: story.placement || "site",
    active: story.active ?? true,
    pinned: story.pinned ?? false,
    sortOrder: story.sortOrder ?? 100,
    startsAt: story.startsAt ? story.startsAt.slice(0, 16) : null,
    endsAt: story.endsAt ? story.endsAt.slice(0, 16) : null,
    relations: normalizeRelations(story),
  };
}

function getTypeIcon(type: StoryType) {
  if (type === "LIVE") return Radio;
  if (type === "IMAGE") return ImageIcon;
  return CirclePlay;
}

function suggestEntityCta(entityType: string | null) {
  if (entityType === "product") return "Открыть товар";
  if (entityType === "service") return "Оставить заявку";
  if (entityType === "promotion") return "Смотреть акцию";
  if (entityType === "review") return "Смотреть отзыв";
  return "Смотреть";
}

// Менеджер видит вес видео прямо на карточке: тяжёлое тормозит у покупателя,
// лёгкое готово. Правило «тяжёлое» — то же, что у обработчика видео.
const { shouldOptimizeStoryVideo } = require("@/lib/story-media-policy.cjs") as {
  shouldOptimizeStoryVideo: (input: { size: number; extension: string; mime?: string }) => boolean;
};

function MediaWeightBadge({ story, prepared }: { story: Story; prepared: boolean }) {
  const url = story.mediaUrl || "";
  const isVideo = story.type !== "IMAGE" && storyTypeFromMedia(url) === "VIDEO";
  const [bytes, setBytes] = useState<number | null>(null);
  useEffect(() => {
    if (!isVideo || !url.startsWith("/")) return;
    let alive = true;
    fetch(url, { method: "HEAD", cache: "no-store" })
      .then((response) => {
        const length = Number(response.headers.get("content-length"));
        if (alive && response.ok && Number.isFinite(length) && length > 0) setBytes(length);
      })
      .catch(() => null);
    return () => {
      alive = false;
    };
  }, [isVideo, url]);
  if (!isVideo || bytes === null) {
    return prepared ? <Badge variant="outline" className="rounded-full">лёгкое видео</Badge> : null;
  }
  const mb = bytes / 1048576;
  const extension = (url.split("?")[0].split(".").pop() || "").toLowerCase();
  const heavy = !prepared && shouldOptimizeStoryVideo({ size: bytes, extension, mime: extension === "mp4" ? "video/mp4" : "" });
  const size = (mb >= 10 ? Math.round(mb) : Math.round(mb * 10) / 10).toLocaleString("ru-RU");
  return (
    <Badge variant="outline" className={cn("rounded-full", heavy && "border-destructive/40 text-destructive")}>
      {heavy ? `видео ${size} МБ — облегчите` : `видео ${size} МБ — лёгкое`}
    </Badge>
  );
}

// Строка режима «Порядок»: тянуть за ручку — мышью или пальцем; стрелки —
// для клавиатуры и для тех, кому неудобно тянуть.
function OrderRow({
  story,
  index,
  total,
  onMove,
}: {
  story: Story;
  index: number;
  total: number;
  onMove: (from: number, to: number) => void;
}) {
  const controls = useDragControls();
  const visual = story.posterUrl || (storyTypeFromMedia(story.mediaUrl || "") === "IMAGE" ? story.mediaUrl : "");
  const Icon = getTypeIcon(story.type);
  return (
    <Reorder.Item
      value={story}
      dragListener={false}
      dragControls={controls}
      whileDrag={{ scale: 1.02 }}
      className="flex items-center gap-2 rounded-2xl border border-border bg-card p-2 sm:gap-3"
    >
      <button
        type="button"
        onPointerDown={(event) => controls.start(event)}
        className="flex h-11 w-11 shrink-0 cursor-grab touch-none items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted/40 active:cursor-grabbing"
        aria-label={`Перетащить «${story.title}»`}
        title="Потяните, чтобы переставить"
      >
        <GripVertical className="h-5 w-5" />
      </button>
      <span className="w-5 shrink-0 text-center text-sm font-semibold tabular-nums text-muted-foreground">{index + 1}</span>
      <div className="flex h-14 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-background text-primary">
        {visual ? (
          <img src={visual} alt="" className="h-full w-full object-cover" />
        ) : story.mediaUrl && storyTypeFromMedia(story.mediaUrl) === "VIDEO" ? (
          // Нет обложки — кадр из самого ролика, а не значок (замечание Армана 11.09.2026).
          <video src={`${story.mediaUrl}#t=0.1`} className="h-full w-full object-cover" muted playsInline preload="metadata" aria-hidden="true" />
        ) : (
          <Icon className="h-4 w-4" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{story.title}</p>
        <p className="truncate text-xs text-muted-foreground">
          {TYPE_LABEL[story.type]}
          {story.pinned ? " · закреплена" : ""}
          {story.active ? "" : " · скрыта"}
        </p>
      </div>
      <div className="flex shrink-0 gap-1">
        <button
          type="button"
          onClick={() => onMove(index, index - 1)}
          disabled={index === 0}
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-border text-foreground transition-colors hover:border-primary/40 disabled:opacity-30"
          aria-label={`Выше: «${story.title}»`}
        >
          <ArrowUp className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => onMove(index, index + 1)}
          disabled={index === total - 1}
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-border text-foreground transition-colors hover:border-primary/40 disabled:opacity-30"
          aria-label={`Ниже: «${story.title}»`}
        >
          <ArrowDown className="h-4 w-4" />
        </button>
      </div>
    </Reorder.Item>
  );
}

// Название связанного товара или услуги вместо служебного адреса.
function relationName(story: Story, relations: ReturnType<typeof normalizeRelations>) {
  const match = relations.find((relation) => relation.entityId === story.entityId) || relations[0];
  return (match?.label || "").trim();
}

// compact — превью в карточке списка: заголовок и тип уже написаны рядом,
// поэтому в превью только видео и две кнопки под палец.
function StoryPreview({ story, compact = false }: { story: StoryForm | Story; compact?: boolean }) {
  const mediaUrl = story.mediaUrl || "";
  const visual = story.posterUrl || mediaUrl;
  const Icon = getTypeIcon(story.type);
  const shouldRenderVideo = story.type !== "IMAGE" && mediaUrl.length > 0 && storyTypeFromMedia(mediaUrl) === "VIDEO";
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [previewSound, setPreviewSound] = useState(false);
  const [previewPaused, setPreviewPaused] = useState(false);
  useEffect(() => {
    setPreviewSound(false);
    setPreviewPaused(false);
  }, [mediaUrl]);
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !shouldRenderVideo) return;
    if (previewPaused) {
      video.pause();
      return;
    }
    video.play().catch(() => null);
  }, [previewPaused, shouldRenderVideo]);
  return (
    <div className="relative aspect-[9/16] overflow-hidden rounded-2xl border border-border bg-background">
      {shouldRenderVideo ? (
        <video
          ref={videoRef}
          src={mediaUrl}
          poster={story.posterUrl || undefined}
          className="h-full w-full object-cover"
          muted={!previewSound}
          loop
          playsInline
          autoPlay
          preload="metadata"
          onClick={() => setPreviewPaused((paused) => !paused)}
        />
      ) : visual ? (
        <img src={visual} alt={story.title || "Story"} className="h-full w-full object-cover" />
      ) : (
        <div className="h-full w-full bg-primary/10" />
      )}
      <div className={cn("absolute inset-0", compact ? "bg-background/10" : "bg-background/45")} />
      {!compact && (
        <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full border border-border bg-card/90 px-2 py-1 text-[10px] font-semibold uppercase text-foreground">
          <Icon className="h-3 w-3" />
          {TYPE_LABEL[story.type]}
        </span>
      )}
      {shouldRenderVideo && (
        <>
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setPreviewPaused((paused) => !paused);
            }}
            className={cn("absolute right-14 top-2 flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card/90 text-foreground transition-colors hover:border-primary/40", compact && "hidden sm:flex")}
            aria-label={previewPaused ? "Продолжить превью" : "Поставить превью на паузу"}
            title={previewPaused ? "Продолжить" : "Пауза"}
          >
            {previewPaused ? <Play className="h-4 w-4 text-primary" /> : <Pause className="h-4 w-4 text-primary" />}
            <span className="sr-only">{previewPaused ? "Продолжить" : "Пауза"}</span>
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setPreviewSound((enabled) => !enabled);
            }}
            className={cn(
              "absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-full border transition-colors",
              previewSound
                    ? "border-primary/45 bg-primary/15 text-primary"
                : "border-border bg-card/90 text-foreground hover:border-primary/40",
              compact && "hidden sm:flex",
            )}
            aria-label={previewSound ? "Выключить звук превью" : "Включить звук превью"}
            title={previewSound ? "Выключить звук" : "Включить звук"}
          >
            {previewSound ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4 text-primary" />}
            <span className="sr-only">{previewSound ? "Выключить звук" : "Включить звук"}</span>
          </button>
        </>
      )}
      {!compact && (
        <div className="absolute inset-x-3 bottom-3 rounded-2xl bg-card/90 p-3">
          <p className="line-clamp-2 text-sm font-bold text-foreground">{story.title || "Название сторис"}</p>
          {story.subtitle && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{story.subtitle}</p>}
        </div>
      )}
    </div>
  );
}

function StoryModal({
  story,
  onClose,
  onSave,
}: {
  story: Partial<Story> | null;
  onClose: () => void;
  onSave: (data: StoryForm) => Promise<void>;
}) {
  const [form, setForm] = useState<StoryForm>(() => normalizeForm(story));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"media" | "poster" | null>(null);
  const [mediaUploadState, setMediaUploadState] = useState<StoryMediaUploadState | null>(null);
  const [mediaPickerTarget, setMediaPickerTarget] = useState<"media" | "poster" | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [entityOptions, setEntityOptions] = useState<EntityOption[]>([]);
  const [entityQuery, setEntityQuery] = useState("");
  const [relationType, setRelationType] = useState<(typeof RELATION_TYPES)[number]>(() => {
    const primaryType = story?.entityType || normalizeRelations(story)[0]?.entityType;
    return isRelationType(primaryType) ? primaryType : "product";
  });
  const [entityLoading, setEntityLoading] = useState(false);
  const [error, setError] = useState("");
  const isNew = !form.id;

  const set = <K extends keyof StoryForm>(key: K, value: StoryForm[K]) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "entityType") {
        next.entityId = "";
        next.ctaLabel = suggestEntityCta(value as string | null);
      }
      return next;
    });
  };

  const applyStoryMedia = (target: "media" | "poster", url: string, kind?: PickedMediaKind) => {
    setForm((prev) => {
      if (target === "poster") return { ...prev, posterUrl: url };

      const pickedType = storyTypeFromMedia(url, kind);
      return {
        ...prev,
        mediaUrl: url,
        type: pickedType === "VIDEO" && prev.type === "LIVE" ? "LIVE" : pickedType || prev.type,
      };
    });
  };

  useEffect(() => {
    let cancelled = false;

    const params = new URLSearchParams({
      type: relationType,
      q: entityQuery,
    });

    setEntityLoading(true);
    fetch(`/api/admin/stories/entity-options?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setEntityOptions(Array.isArray(data?.options) ? data.options : []);
      })
      .catch(() => {
        if (!cancelled) setEntityOptions([]);
      })
      .finally(() => {
        if (!cancelled) setEntityLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [entityQuery, relationType]);

  const applyEntityOption = (option: EntityOption) => {
    setForm((prev) => ({
      ...prev,
      entityType: option.entityType,
      entityId: option.entityId,
      title: option.template.title || prev.title,
      subtitle: option.template.subtitle || prev.subtitle,
      description: option.template.description || prev.description,
      posterUrl: option.template.posterUrl || prev.posterUrl,
      ctaLabel: option.template.ctaLabel || option.ctaLabel || prev.ctaLabel,
      ctaUrl: option.template.ctaUrl || option.ctaUrl || prev.ctaUrl,
      relations: addRelation(prev.relations || [], entityOptionToRelation(option, ((prev.relations || []).length + 1) * 10)),
    }));
  };

  const uploadFile = async (file: File, target: "media" | "poster") => {
    setUploading(target);
    setError("");
    try {
      const pickedKind = pickedMediaKindFromFile(file);
      if (target === "media" && pickedKind === "video") {
        const result = await uploadStoryMediaFile(file, { onState: setMediaUploadState });
        applyStoryMedia(target, result.url, pickedKind);
        if (result.posterUrl) {
          setForm((prev) => ({ ...prev, posterUrl: prev.posterUrl || result.posterUrl || "" }));
        }
      } else {
        const url = await uploadAdminMediaFile(file, "stories");
        applyStoryMedia(target, url, pickedKind);
        if (target === "media") setMediaUploadState(null);
      }
    } catch (err: any) {
      setError(err.message || "Не удалось загрузить файл");
      if (target === "media" && err instanceof StoryMediaUploadError) {
        setMediaUploadState({
          phase: "failed",
          jobId: err.jobId || undefined,
          message: err.message,
        });
      }
    } finally {
      setUploading(null);
    }
  };

  const retryMediaUpload = async () => {
    const jobId = mediaUploadState?.jobId;
    if (!jobId) return;
    setUploading("media");
    setError("");
    try {
      const result = await retryStoryMediaUpload(jobId, { onState: setMediaUploadState });
      applyStoryMedia("media", result.url, "video");
      if (result.posterUrl) {
        setForm((prev) => ({ ...prev, posterUrl: prev.posterUrl || result.posterUrl || "" }));
      }
    } catch (err: any) {
      setError(err.message || "Не удалось повторить подготовку видео");
      setMediaUploadState({
        phase: "failed",
        jobId,
        message: err.message || "Не получилось облегчить видео. Ваш файл цел.",
      });
    } finally {
      setUploading(null);
    }
  };

  const save = async () => {
    if (!form.title.trim()) {
      setError("Нужно название сторис");
      return;
    }
    if (form.active && !form.mediaUrl?.trim() && !form.posterUrl?.trim()) {
      setError("Добавь видео, фото или обложку перед публикацией активной сторис");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSave(form);
      onClose();
    } catch (err: any) {
      setError(err.message || "Не удалось сохранить сторис");
    } finally {
      setSaving(false);
    }
  };

  const selectedRelations = form.relations || [];
  // Замечание Армана 11.09.2026: «о чём сторис» выбиралось в трёх местах, «Товар» повторялся,
  // форма была серой и с техшумом. Теперь пять шагов по порядку, в каждом — один выбор;
  // название и кнопка подставляются из выбранного товара или услуги.
  const [ctaCustomOpen, setCtaCustomOpen] = useState(false);
  const aboutOptions: Array<{ value: string; label: string }> = [
    { value: "general", label: "Общая" },
    { value: "product", label: "Товар" },
    { value: "service", label: "Услуга" },
    { value: "promotion", label: "Акция" },
    { value: "company", label: "О компании" },
    { value: "review", label: "Отзыв клиента" },
  ];
  const aboutValue = form.entityType || "general";
  const chooseAbout = (value: string) => {
    set("entityType", value === "general" ? null : value);
    if (isRelationType(value)) {
      setRelationType(value);
      setEntityQuery("");
    }
  };
  const searchPlaceholder =
    relationType === "service"
      ? "Найдите услугу по названию"
      : relationType === "promotion"
        ? "Найдите акцию по названию"
        : relationType === "review"
          ? "Найдите отзыв по имени или тексту"
          : "Найдите товар по названию";
  const primaryRelationHref = selectedRelations.find((relation) => relation.ctaUrl)?.ctaUrl || "";
  const ctaPresets = ["/contacts", "/catalog", "/stories"];
  const ctaTarget =
    !form.ctaUrl || (primaryRelationHref && form.ctaUrl === primaryRelationHref)
      ? "linked"
      : ctaPresets.includes(form.ctaUrl)
        ? form.ctaUrl
        : "custom";
  const showCustomCta = ctaCustomOpen || ctaTarget === "custom";
  const stepTitle = (n: number, title: string, hint?: string) => (
    <div className="flex items-start gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
        {n}
      </span>
      <div className="min-w-0">
        <p className="text-base font-semibold leading-7 text-foreground">{title}</p>
        {hint && <p className="text-xs leading-5 text-muted-foreground">{hint}</p>}
      </div>
    </div>
  );
  const toggleRow = (checked: boolean, onToggle: () => void, title: string, hint: string) => (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={checked}
      className={cn(
        "flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors",
        checked ? "border-primary/50 bg-primary/10" : "border-border bg-background/60 hover:border-primary/35",
      )}
    >
      <span className={cn("mt-0.5 flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors", checked ? "bg-primary" : "bg-muted")}>
        <span className={cn("h-4 w-4 rounded-full bg-background transition-transform", checked && "translate-x-4")} />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-foreground">{title}</span>
        <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{hint}</span>
      </span>
    </button>
  );

  return (
    <>
    <AdminModal
      open
      onClose={onClose}
      title={isNew ? "Новая сторис" : "Редактировать сторис"}
      subtitle="Видео, записанный онлайн-продавец, товарный обзор, услуга или отзыв. Связанные сторис показываются первыми на нужной странице."
      size="xl"
      bodyClassName="p-4 sm:p-5"
      footer={(
        <>
          <Button variant="outline" onClick={onClose} className="min-h-11">
            Отмена
          </Button>
          <Button onClick={save} disabled={saving || uploading !== null} className="min-h-11">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Сохранить
          </Button>
        </>
      )}
    >
      <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
        {/* Замечание Армана 11.09.2026: форма — пять понятных шагов по порядку, без повторов и
            техшума. На телефоне первым идёт шаг загрузки, просмотр — ниже. */}
        <div className="order-2 space-y-3 lg:order-1">
          <p className={labelClass}>Так увидит покупатель</p>
          <StoryPreview story={form} />
          <Button
            type="button"
            variant="outline"
            className="w-full min-h-10 justify-center"
            onClick={() => {
              const url = form.id ? storyPublicHref(form.id) : form.ctaUrl || "/stories";
              const absoluteUrl = typeof window === "undefined" ? url : new URL(url, window.location.origin).toString();
              navigator.clipboard?.writeText(absoluteUrl).catch(() => null);
              setShareCopied(true);
              window.setTimeout(() => setShareCopied(false), 1800);
            }}
          >
            {shareCopied ? <CheckCircle2 className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
            {shareCopied ? "Ссылка скопирована" : "Ссылка для публикации"}
          </Button>
          {form.id && (
            <Button asChild type="button" variant="outline" className="w-full min-h-10 justify-center">
              <Link href={storyPublicHref(form.id)} target="_blank">
                <ArrowUpRight className="h-4 w-4" />
                Открыть сторис на сайте
              </Link>
            </Button>
          )}
        </div>

        <div className="order-1 space-y-4 lg:order-2">
          <section className="rounded-2xl border border-border bg-card/60 p-4">
            {stepTitle(1, "Видео или фото")}
            <label className="mt-3 flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 px-4 py-5 text-center transition-colors hover:border-primary/70 hover:bg-primary/10">
              {uploading === "media" ? <Loader2 className="h-6 w-6 animate-spin text-primary" /> : <Upload className="h-6 w-6 text-primary" />}
              <span className="text-sm font-semibold text-foreground">
                {form.mediaUrl ? "Заменить видео или фото" : "Загрузить видео или фото"}
              </span>
              <span className="max-w-md text-xs leading-5 text-muted-foreground">
                Видео до 3 минут. Сайт сам облегчит его, чтобы у покупателей не тормозило. Ваш файл сохранится как есть.
              </span>
              <input
                type="file"
                accept={STORY_MEDIA_ACCEPT}
                disabled={uploading !== null}
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) uploadFile(file, "media");
                  event.currentTarget.value = "";
                }}
              />
            </label>
            {mediaUploadState && (
              <div className={cn(
                "mt-3 rounded-xl border px-3 py-2.5 text-xs leading-5",
                mediaUploadState.phase === "failed"
                  ? "border-destructive/35 bg-destructive/10 text-destructive"
                  : mediaUploadState.phase === "ready"
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                    : "border-primary/30 bg-primary/10 text-foreground",
              )}>
                <div className="flex items-start gap-2">
                  {uploading === "media"
                    ? <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin" />
                    : mediaUploadState.phase === "failed"
                      ? <RefreshCw className="mt-0.5 h-4 w-4 shrink-0" />
                      : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}
                  <div className="min-w-0 flex-1">
                    <p>{mediaUploadState.message}</p>
                    {mediaUploadState.phase === "failed" && mediaUploadState.jobId && (
                      <Button type="button" variant="outline" onClick={retryMediaUpload} disabled={uploading !== null} className="mt-2 min-h-9">
                        <RefreshCw className="h-4 w-4" />
                        Повторить подготовку
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button type="button" variant="outline" onClick={() => setMediaPickerTarget("media")} className="min-h-10">
                <ImageIcon className="h-4 w-4" />
                Библиотека
              </Button>
              <label className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-background/70 px-3 text-sm font-semibold transition-colors hover:border-primary/45">
                {uploading === "poster" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
                {form.posterUrl ? "Сменить обложку" : "Обложка"}
                <input
                  type="file"
                  accept={STORY_POSTER_ACCEPT}
                  disabled={uploading !== null}
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) uploadFile(file, "poster");
                    event.currentTarget.value = "";
                  }}
                />
              </label>
            </div>
            {form.type !== "IMAGE" && (
              <div className="mt-3">
                {toggleRow(
                  form.type === "LIVE",
                  () => set("type", form.type === "LIVE" ? "VIDEO" : "LIVE"),
                  "Онлайн-продавец",
                  "Записанное видео продавца с кнопкой «спросить». Прямой эфир пока не подключён.",
                )}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-border bg-card/60 p-4">
            {stepTitle(2, "О чём сторис", "На странице выбранного товара или услуги эта сторис встанет первой.")}
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {aboutOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => chooseAbout(option.value)}
                  aria-pressed={aboutValue === option.value}
                  className={cn(
                    "min-h-11 rounded-xl border px-3 text-sm font-semibold transition-colors",
                    aboutValue === option.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background/60 text-muted-foreground hover:border-primary/35 hover:text-foreground",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {isRelationType(aboutValue) && (
              <div className="mt-3 space-y-2">
                <label className="relative block">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    className={cn(fieldClass, "pl-9")}
                    value={entityQuery}
                    onChange={(event) => setEntityQuery(event.target.value)}
                    placeholder={searchPlaceholder}
                    aria-label={searchPlaceholder}
                  />
                </label>
                <div className="grid gap-1.5">
                  {entityLoading && <p className="px-1 text-xs text-muted-foreground">Ищу…</p>}
                  {!entityLoading && entityOptions.slice(0, 6).map((option) => {
                    const chosen = selectedRelations.some((relation) => relation.entityType === option.entityType && relation.entityId === option.entityId);
                    return (
                      <button
                        key={`${option.entityType}-${option.entityId}`}
                        type="button"
                        onClick={() => applyEntityOption(option)}
                        disabled={chosen}
                        className={cn(
                          "flex min-h-12 w-full items-center gap-3 rounded-xl border px-2 py-1.5 text-left transition-colors",
                          chosen ? "border-primary/40 bg-primary/5" : "border-border bg-background/60 hover:border-primary/35",
                        )}
                      >
                        <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-xl bg-muted">
                          {option.image ? (
                            <img src={option.image} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <Sparkles className="m-2.5 h-4 w-4 text-primary" />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-foreground">{option.label}</span>
                          {option.detail && <span className="block truncate text-xs text-muted-foreground">{option.detail}</span>}
                        </span>
                        <span className="shrink-0 text-xs font-semibold text-primary">{chosen ? "выбрано" : "выбрать"}</span>
                      </button>
                    );
                  })}
                  {!entityLoading && entityOptions.length === 0 && (
                    <p className="px-1 text-xs text-muted-foreground">Ничего не нашлось — попробуйте другое слово.</p>
                  )}
                </div>
                <p className="text-xs leading-5 text-muted-foreground">
                  Можно выбрать несколько. Название и кнопка подставятся из товара — поправьте, если нужно.
                </p>
              </div>
            )}
            {selectedRelations.length > 0 && (
              <div className="mt-3 rounded-2xl border border-border bg-background/50 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-muted-foreground">Связанные товары и услуги</p>
                  <span className="rounded-full border border-border px-2 py-1 text-[11px] text-muted-foreground">
                    {selectedRelations.length}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedRelations.map((relation) => (
                    <span
                      key={relationKey(relation)}
                      className="inline-flex max-w-full items-center gap-2 rounded-full border border-border bg-card px-2.5 py-1.5 text-xs"
                    >
                      {relation.image ? (
                        <img src={relation.image} alt="" className="h-5 w-5 rounded-full object-cover" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5 text-primary" />
                      )}
                      <span className="max-w-[190px] truncate font-medium">
                        {relation.label || relation.entityId}
                      </span>
                      <button
                        type="button"
                        className="flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-destructive"
                        onClick={() => {
                          setForm((prev) => {
                            const nextRelations = (prev.relations || []).filter((item) => relationKey(item) !== relationKey(relation));
                            const removedPrimary = prev.entityType === relation.entityType && prev.entityId === relation.entityId;
                            return {
                              ...prev,
                              relations: nextRelations,
                              entityType: removedPrimary ? nextRelations[0]?.entityType || prev.entityType : prev.entityType,
                              entityId: removedPrimary ? nextRelations[0]?.entityId || "" : prev.entityId,
                            };
                          });
                        }}
                        aria-label={`Убрать «${relation.label || relation.entityId}»`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-border bg-card/60 p-4">
            {stepTitle(3, "Текст", "Название покупатель видит сразу, подпись и описание — если откроет подробности.")}
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div>
                <label className={labelClass}>Название</label>
                <input className={fieldClass} value={form.title} onChange={(event) => set("title", event.target.value)} placeholder="Например: обзор доски 40×100" />
              </div>
              <div>
                <label className={labelClass}>Подпись (необязательно)</label>
                <input className={fieldClass} value={form.subtitle || ""} onChange={(event) => set("subtitle", event.target.value)} placeholder="Одна строка: что покупатель поймёт за 2 секунды" />
              </div>
            </div>
            <div className="mt-3">
              <label className={labelClass}>Описание (необязательно)</label>
              <textarea className={cn(fieldClass, "min-h-[88px] resize-y")} value={form.description || ""} onChange={(event) => set("description", event.target.value)} placeholder="Пара предложений: почему это важно и что сделать дальше" />
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card/60 p-4">
            {stepTitle(4, "Кнопка под видео", "Что написано на кнопке и куда она ведёт.")}
            <div className="mt-3 flex flex-wrap gap-2">
              {["Смотреть", "Открыть товар", "Задать вопрос", "Оставить заявку"].map((label) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => set("ctaLabel", label)}
                  aria-pressed={form.ctaLabel === label}
                  className={cn(
                    "min-h-10 rounded-full border px-3 text-sm font-medium transition-colors",
                    form.ctaLabel === label
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background/60 text-muted-foreground hover:border-primary/35 hover:text-foreground",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div>
                <label className={labelClass}>Своя надпись</label>
                <input className={fieldClass} value={form.ctaLabel || ""} onChange={(event) => set("ctaLabel", event.target.value)} placeholder={suggestEntityCta(form.entityType)} />
              </div>
              <div>
                <label className={labelClass}>Куда ведёт</label>
                <select
                  className={fieldClass}
                  value={showCustomCta ? "custom" : ctaTarget}
                  onChange={(event) => {
                    const value = event.target.value;
                    if (value === "custom") {
                      setCtaCustomOpen(true);
                      return;
                    }
                    setCtaCustomOpen(false);
                    set("ctaUrl", value === "linked" ? primaryRelationHref : value);
                  }}
                >
                  <option value="linked">{selectedRelations.length > 0 ? "К выбранному товару или услуге" : "Без перехода — только видео и чат"}</option>
                  <option value="/contacts">Контакты</option>
                  <option value="/catalog">Каталог</option>
                  <option value="/stories">Все сторис</option>
                  <option value="custom">Своя ссылка…</option>
                </select>
              </div>
            </div>
            {showCustomCta && (
              <div className="mt-3">
                <label className={labelClass}>Своя ссылка</label>
                <input className={fieldClass} value={form.ctaUrl || ""} onChange={(event) => set("ctaUrl", event.target.value)} placeholder="Адрес страницы на сайте или полная ссылка" />
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-border bg-card/60 p-4">
            {stepTitle(5, "Показ")}
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {toggleRow(form.active, () => set("active", !form.active), "Показывать на сайте", "Выключите, чтобы подготовить сторис заранее.")}
              {toggleRow(form.pinned, () => set("pinned", !form.pinned), "Первой в ленте", "Закреплённые сторис стоят перед остальными.")}
            </div>
            <details className="mt-3 rounded-xl border border-border bg-background/40 px-3 py-2">
              <summary className="cursor-pointer select-none py-1.5 text-sm font-semibold text-muted-foreground">
                Расписание (необязательно)
              </summary>
              <p className="mt-1 text-xs text-muted-foreground">Пусто — сторис показывается всегда.</p>
              <div className="mt-2 grid gap-3 md:grid-cols-2">
                <div>
                  <label className={labelClass}>Показывать с</label>
                  <input className={fieldClass} type="datetime-local" value={form.startsAt || ""} onChange={(event) => set("startsAt", event.target.value || null)} />
                </div>
                <div>
                  <label className={labelClass}>Показывать по</label>
                  <input className={fieldClass} type="datetime-local" value={form.endsAt || ""} onChange={(event) => set("endsAt", event.target.value || null)} />
                </div>
              </div>
            </details>
          </section>

          {/* Адреса файлов нужны редко — администратору. Менеджер работает кнопками выше. */}
          <details className="rounded-xl border border-border bg-background/40 px-3 py-2">
            <summary className="cursor-pointer select-none py-1.5 text-sm font-semibold text-muted-foreground">
              Для администратора — адреса файлов
            </summary>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div>
                <label className={labelClass}>Адрес видео или фото</label>
                <input className={fieldClass} value={form.mediaUrl || ""} onChange={(event) => set("mediaUrl", event.target.value)} placeholder="/images/stories/video.mp4" />
              </div>
              <div>
                <label className={labelClass}>Адрес обложки</label>
                <input className={fieldClass} value={form.posterUrl || ""} onChange={(event) => set("posterUrl", event.target.value)} placeholder="/images/stories/poster.webp" />
              </div>
            </div>
            <Button type="button" variant="outline" onClick={() => setMediaPickerTarget("poster")} className="mt-3 min-h-10">
              <ImageIcon className="h-4 w-4" />
              Обложка из библиотеки
            </Button>
          </details>

          {error && (
            <div className="admin-alert admin-alert-danger px-3 py-2 text-sm">
              {error}
            </div>
          )}
        </div>
      </div>
    </AdminModal>
    {mediaPickerTarget && (
      <MediaPickerModal
        open
        onClose={() => setMediaPickerTarget(null)}
        pickerKind={mediaPickerTarget === "media" ? "all" : "image"}
        initialFolder="stories"
        title={mediaPickerTarget === "media" ? "Выбрать видео или фото сторис" : "Выбрать обложку сторис"}
        onPick={(url, file) => {
          applyStoryMedia(mediaPickerTarget, url, file?.kind);
          setMediaPickerTarget(null);
        }}
      />
    )}
    </>
  );
}

export default function AdminStoriesPage() {
  // Где действие можно вернуть — не спрашиваем: делаем сразу и даём «Вернуть» (Арман, 10.09.2026).
  const [toast, setToast] = useState<{ message: string; action?: { label: string; onClick: () => void } } | null>(null);
  const dismissToast = useCallback(() => setToast(null), []);
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalStory, setModalStory] = useState<Partial<Story> | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<Story | null>(null);
  const [storyMediaStates, setStoryMediaStates] = useState<Record<string, StoryMediaCardState>>({});
  const [error, setError] = useState("");

  const activeCount = useMemo(() => stories.filter(isVisibleNow).length, [stories]);
  const linkedCount = useMemo(() => stories.filter((story) => normalizeRelations(story).length > 0).length, [stories]);
  const liveCount = useMemo(() => stories.filter((story) => story.type === "LIVE").length, [stories]);
  const totalViews = useMemo(() => stories.reduce((sum, story) => sum + (story.views || 0), 0), [stories]);
  const topStories = useMemo(() => [...stories].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 3), [stories]);
  const [statsOpen, setStatsOpen] = useState(false);

  // Режим «Порядок»: черновик списка, сохраняется одной кнопкой.
  const [ordering, setOrdering] = useState(false);
  const [orderDraft, setOrderDraft] = useState<Story[]>([]);
  const [orderSaving, setOrderSaving] = useState(false);
  const startOrdering = () => {
    setOrderDraft(stories);
    setOrdering(true);
  };
  const moveInDraft = (from: number, to: number) => {
    setOrderDraft((list) => {
      if (to < 0 || to >= list.length) return list;
      const next = [...list];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  };
  const saveOrder = async () => {
    // На сайте закреплённые всегда первые — присылаем их первыми, порядок внутри групп сохраняем.
    const ordered = [...orderDraft.filter((story) => story.pinned), ...orderDraft.filter((story) => !story.pinned)];
    setOrderSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/stories/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: ordered.map((story) => story.id), confirm: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Не получилось сохранить порядок — попробуйте ещё раз");
      setOrdering(false);
      await loadStories();
    } catch (err: any) {
      setError(err.message || "Не получилось сохранить порядок — попробуйте ещё раз");
    } finally {
      setOrderSaving(false);
    }
  };

  const loadStories = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/stories");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Не удалось загрузить сторис");
      const nextStories = Array.isArray(data) ? data : [];
      setStories(nextStories);
      const mediaStories = nextStories.filter((story: Story) =>
        story.type !== "IMAGE" && story.mediaUrl?.startsWith("/images/stories/"),
      );
      const receipts = await Promise.all(mediaStories.map(async (story: Story) => {
        const response = await fetch(`/api/admin/stories/${encodeURIComponent(story.id)}/media`, { cache: "no-store" });
        if (!response.ok) return null;
        const payload = await response.json().catch(() => null);
        return payload?.job ? { storyId: story.id, job: payload.job } : null;
      }));
      const restoredStates: Record<string, StoryMediaCardState> = {};
      for (const receipt of receipts) {
        if (!receipt) continue;
        const phase = storyMediaPhase(receipt.job.status);
        restoredStates[receipt.storyId] = {
          phase,
          jobId: receipt.job.id,
          message: receipt.job.rolledBack
            ? "Вернули как было."
            : storyMediaMessage(phase, receipt.job.error),
          canRollback: Boolean(receipt.job.canRollback),
        };
      }
      setStoryMediaStates(restoredStates);
      for (const receipt of receipts) {
        if (!receipt) continue;
        const phase = storyMediaPhase(receipt.job.status);
        if (!["queued", "processing", "publishing"].includes(phase)) continue;
        void monitorStoryMediaJob(receipt.job.id, {
          onState: (state) => setStoryMediaState(receipt.storyId, state),
        }).then(
          () => loadStories(),
          (monitorError) => setStoryMediaState(receipt.storyId, {
            phase: "failed",
            jobId: receipt.job.id,
            message: monitorError?.message || storyMediaMessage("failed"),
          }),
        );
      }
    } catch (err: any) {
      setError(err.message || "Не удалось загрузить сторис");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStories();
  }, []);

  const saveStory = async (form: StoryForm) => {
    const res = await fetch(form.id ? `/api/admin/stories/${form.id}` : "/api/admin/stories", {
      method: form.id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, confirm: true }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Не удалось сохранить сторис");
    await loadStories();
  };

  const deleteStory = async (story: Story) => {
    const res = await fetch(`/api/admin/stories/${story.id}?confirm=true`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Не удалось удалить сторис");
      return;
    }
    setDeleteCandidate(null);
    await loadStories();
  };

  const toggleActive = async (story: Story) => {
    const nextActive = !story.active;
    await saveStory({ ...normalizeForm(story), active: nextActive });
    setToast({
      message: nextActive ? `«${story.title}» снова на сайте` : `«${story.title}» скрыта с сайта`,
      action: {
        label: "Вернуть",
        onClick: () => void saveStory({ ...normalizeForm(story), active: story.active }),
      },
    });
  };

  const setStoryMediaState = (storyId: string, state: StoryMediaUploadState, canRollback = false) => {
    setStoryMediaStates((prev) => ({
      ...prev,
      [storyId]: { ...state, canRollback },
    }));
  };

  // «Сделать обложку» — без окна: меняется только пустая обложка, свою можно поставить в форме.
  const [posterBusyId, setPosterBusyId] = useState<string | null>(null);
  const makeStoryPoster = async (story: Story) => {
    setError("");
    setPosterBusyId(story.id);
    try {
      const res = await fetch(`/api/admin/stories/${encodeURIComponent(story.id)}/media`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "poster", confirm: true }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.error || "Не получилось сделать обложку. Сторис не изменилась.");
      await loadStories();
    } catch (err: any) {
      setError(err.message || "Не получилось сделать обложку. Сторис не изменилась.");
    } finally {
      setPosterBusyId(null);
    }
  };

  const prepareStoryVideo = async (story: Story, retryJobId?: string) => {
    // Без окна: действие обратимо — на карточке сразу виден ход, потом «Вернуть как было».

    setError("");
    try {
      let jobId = retryJobId || "";
      if (jobId) {
        const result = await retryStoryMediaUpload(jobId, {
          onState: (state) => setStoryMediaState(story.id, state),
        });
        setStoryMediaState(story.id, {
          phase: "ready",
          jobId,
          message: storyMediaMessage("ready"),
        }, true);
        await loadStories();
        return result;
      }

      setStoryMediaState(story.id, {
        phase: "queued",
        message: storyMediaMessage("queued"),
      });
      const response = await fetch(`/api/admin/stories/${encodeURIComponent(story.id)}/media`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "optimize", confirm: true }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new StoryMediaUploadError(payload.error || storyMediaMessage("failed"), payload.id);
      jobId = payload.id || "";
      if (!jobId) {
        setStoryMediaState(story.id, {
          phase: "ready",
          message: payload.message || "Видео и так лёгкое — облегчать не нужно.",
        });
        return;
      }

      await monitorStoryMediaJob(jobId, {
        onState: (state) => setStoryMediaState(story.id, state),
      });
      setStoryMediaState(story.id, {
        phase: "ready",
        jobId,
        message: storyMediaMessage("ready"),
      }, true);
      await loadStories();
    } catch (err: any) {
      const jobId = err instanceof StoryMediaUploadError ? err.jobId : retryJobId;
      const message = err.message || storyMediaMessage("failed");
      setStoryMediaState(story.id, { phase: "failed", jobId: jobId || undefined, message });
      setError(message);
    }
  };

  const rollbackStoryVideo = async (story: Story, jobId: string) => {
    // Без окна: облегчённую версию можно включить снова одной кнопкой.
    setError("");
    try {
      const response = await fetch(`/api/admin/stories/${encodeURIComponent(story.id)}/media`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "rollback", jobId, confirm: true }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Не получилось вернуть как было");
      setStoryMediaState(story.id, {
        phase: "ready",
        jobId,
        message: "Вернули как было.",
      });
      await loadStories();
    } catch (err: any) {
      setError(err.message || "Не получилось вернуть как было");
    }
  };

  return (
    <div className="space-y-6 px-4 py-4 pb-32 sm:px-6 sm:py-6 sm:pb-36">
      <AdminSectionTitle
        icon={CirclePlay}
        title="Сторис"
        subtitle="Видео о товарах и услугах для покупателей"
        action={(
          <div className="flex gap-2">
            <Button asChild variant="outline" className="hidden min-h-11 sm:inline-flex">
              <Link href="/stories" target="_blank">
                <ArrowUpRight className="h-4 w-4" />
                На сайте
              </Link>
            </Button>
            <Button onClick={() => setModalStory({})} className="min-h-11">
              <Plus className="h-4 w-4" />
              Создать
            </Button>
          </div>
        )}
      />

      {error && (
        <div className="admin-alert admin-alert-danger px-3 py-2 text-sm">
          {error}
        </div>
      )}

      {!loading && stories.length > 0 && (
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card/70 px-4 py-3">
          <p className="min-w-0 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{activeCount} на сайте</span>
            {stories.length - activeCount > 0 ? ` · ${stories.length - activeCount} скрыто` : ""}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setStatsOpen(true)} className="min-h-11">
              <BarChart3 className="h-4 w-4" />
              Статистика
            </Button>
            {stories.length > 1 && (
              <Button variant="outline" onClick={startOrdering} disabled={ordering} className="min-h-11">
                <ListOrdered className="h-4 w-4" />
                Порядок
              </Button>
            )}
          </div>
        </section>
      )}

      {loading ? (
        <div className="flex min-h-[240px] items-center justify-center rounded-2xl border border-border bg-card">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : stories.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <CirclePlay className="h-8 w-8" />
          </div>
          <h2 className="font-display text-2xl font-bold">Сторис пока нет</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            Создай первый обзор товара, услугу или видео-отзыв. Виджет появится на сайте автоматически.
          </p>
          <Button onClick={() => setModalStory({})} className="mt-5 min-h-11">
            <Plus className="h-4 w-4" />
            Создать сторис
          </Button>
        </div>
      ) : ordering ? (
        <section className="space-y-3 rounded-2xl border border-primary/30 bg-card/70 p-3 sm:p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-display text-xl font-bold">Порядок сторис</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Потяните сторис за ручку слева или нажмите стрелки. Закреплённые всегда первые.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setOrdering(false)} disabled={orderSaving} className="min-h-11">
                Отмена
              </Button>
              <Button onClick={saveOrder} disabled={orderSaving} className="min-h-11">
                {orderSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Сохранить порядок
              </Button>
            </div>
          </div>
          <Reorder.Group axis="y" values={orderDraft} onReorder={setOrderDraft} className="space-y-2">
            {orderDraft.map((story, index) => (
              <OrderRow key={story.id} story={story} index={index} total={orderDraft.length} onMove={moveInDraft} />
            ))}
          </Reorder.Group>
        </section>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2 min-[1800px]:grid-cols-3">
          {stories.map((story) => {
            const Icon = getTypeIcon(story.type);
            const entityKey = story.entityType || "general";
            const storyRelations = normalizeRelations(story);
            const mediaState = storyMediaStates[story.id];
            const mediaBusy = mediaState && ["uploading", "queued", "processing", "publishing"].includes(mediaState.phase);
            const canPrepareVideo = story.type !== "IMAGE" && story.mediaUrl?.startsWith("/images/stories/");
            const preparedWebCopy = /-web\.mp4(?:[?#]|$)/i.test(story.mediaUrl || "");
            return (
              <article key={story.id} className="overflow-hidden rounded-2xl border border-border bg-card">
                {/* Замер 11.09.2026: на телефоне видео во всю ширину делало карточку выше экрана, на планшете
                    и на 1280 текст сжимался до 145–166 точек. Теперь маленькое превью слева, кнопки — отдельной
                    строкой: на телефоне во всю ширину карточки, на компьютере под текстом. */}
                <div className="grid grid-cols-[88px_1fr] gap-0 sm:grid-cols-[150px_1fr] sm:grid-rows-[1fr_auto]">
                  <div className="sm:row-span-2">
                    <StoryPreview story={story} compact />
                  </div>
                  <div className="flex min-w-0 flex-col p-3 sm:p-4">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <Badge variant={story.active ? "default" : "outline"} className="rounded-full">
                        {story.active ? "активна" : "скрыта"}
                      </Badge>
                      {story.pinned && <Badge variant="outline" className="rounded-full">закреплена</Badge>}
                      <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-1 text-[10px] font-semibold text-muted-foreground">
                        <Icon className="h-3 w-3" />
                        {TYPE_LABEL[story.type]}
                      </span>
                      <MediaWeightBadge story={story} prepared={preparedWebCopy} />
                      {(isStoryTemplateHint(story.subtitle) || isStoryTemplateHint(story.description)) && (
                        <Badge variant="outline" className="rounded-full border-destructive/40 text-destructive" title="Покупатели этот текст не видят — сайт его прячет. Напишите настоящий текст.">
                          текст-заготовка — перепишите
                        </Badge>
                      )}
                    </div>
                    <h2 className="line-clamp-2 font-display text-xl font-bold">{story.title}</h2>
                    {story.subtitle && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{story.subtitle}</p>}
                    <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                      <p>
                        О чём: <span className="font-semibold text-foreground">{ENTITY_LABEL[entityKey] || entityKey}</span>
                        {relationName(story, storyRelations) ? ` · ${relationName(story, storyRelations)}` : ""}
                      </p>
                      {storyRelations.length > 0 && (
                        <p>
                          Товары и услуги: <span className="font-semibold text-foreground">{storyRelations.length}</span>
                          {" · "}
                          {storyRelations.slice(0, 2).map((relation) => relation.label).filter(Boolean).join(", ")}
                          {storyRelations.length > 2 ? "..." : ""}
                        </p>
                      )}
                      <p>Просмотров: {story.views}</p>
                      {story.ctaUrl && (
                        <p className="truncate">
                          Кнопка: <span className="font-semibold text-foreground">«{story.ctaLabel || "Смотреть"}»</span>{" "}
                          <Link href={story.ctaUrl} target="_blank" className="inline-flex items-center gap-1 underline decoration-dotted underline-offset-2 hover:text-primary">
                            <Link2 className="h-3 w-3" />
                            проверить
                          </Link>
                        </p>
                      )}
                    </div>
                    {mediaState && (
                      <div className={cn(
                        "mt-3 rounded-xl border px-3 py-2 text-xs leading-5",
                        mediaState.phase === "failed"
                          ? "border-destructive/35 bg-destructive/10 text-destructive"
                          : "border-primary/25 bg-primary/10 text-foreground",
                      )}>
                        <div className="flex items-start gap-2">
                          {mediaBusy
                            ? <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin" />
                            : mediaState.phase === "failed"
                              ? <RefreshCw className="mt-0.5 h-4 w-4 shrink-0" />
                              : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}
                          <div className="min-w-0 flex-1">
                            <p>{mediaState.message}</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {mediaBusy && (
                                <Button type="button" variant="outline" onClick={loadStories} className="min-h-9">
                                  <RefreshCw className="h-4 w-4" />
                                  Обновить статус
                                </Button>
                              )}
                              {mediaState.phase === "failed" && canPrepareVideo && (
                                <Button type="button" variant="outline" onClick={() => prepareStoryVideo(story, mediaState.jobId || undefined)} className="min-h-9">
                                  <RefreshCw className="h-4 w-4" />
                                  Повторить
                                </Button>
                              )}
                              {mediaState.canRollback && mediaState.jobId && (
                                <Button type="button" variant="outline" onClick={() => rollbackStoryVideo(story, mediaState.jobId!)} className="h-auto min-h-9 whitespace-normal text-left">
                                  <RotateCcw className="h-4 w-4" />
                                  Вернуть как было
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="col-span-2 flex flex-wrap gap-2 px-3 pb-3 sm:col-span-1 sm:col-start-2 sm:px-4 sm:pb-4">
                    <Button variant="outline" onClick={() => setModalStory(story)} className="min-h-11">
                      <Pencil className="h-4 w-4" />
                      Изменить
                    </Button>
                    {canPrepareVideo && !preparedWebCopy && (
                      <Button variant="outline" onClick={() => prepareStoryVideo(story)} disabled={Boolean(mediaBusy)} className="min-h-11">
                        {mediaBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                        Облегчить видео
                      </Button>
                    )}
                    {canPrepareVideo && !story.posterUrl && (
                      <Button variant="outline" onClick={() => makeStoryPoster(story)} disabled={Boolean(mediaBusy) || posterBusyId === story.id} className="min-h-11">
                        {posterBusyId === story.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
                        Сделать обложку
                      </Button>
                    )}
                    <Button variant="outline" onClick={() => toggleActive(story)} className="min-h-11">
                      {story.active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      {story.active ? "Скрыть" : "Показать"}
                    </Button>
                    <Button asChild variant="outline" className="min-h-11">
                      <Link href={storyPublicHref(story.id)} target="_blank">
                        <ArrowUpRight className="h-4 w-4" />
                        На сайте
                      </Link>
                    </Button>
                    <Button variant="outline" onClick={() => setDeleteCandidate(story)} className="min-h-11 text-destructive hover:text-destructive" aria-label={`Удалить «${story.title}»`} title="Удалить">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <section className="rounded-2xl border border-border bg-card/55 p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase text-muted-foreground">Подсказки</p>
            <h2 className="mt-1 font-semibold">Логика показа</h2>
          </div>
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <div className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr]">
          <div className="rounded-2xl border border-border bg-background/40 p-4">
            <h3 className="font-semibold">Связь со страницей</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Общая сторис работает по сайту. Связанная сторис поднимается первой на странице товара или услуги.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-background/40 p-4">
            <h3 className="font-semibold">Доверие</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Видео-отзыв можно привязать как review и показывать вместе с товарами, услугами или общим виджетом.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-background/40 p-4">
            <h3 className="font-semibold">Онлайн-продавец</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Сейчас это записанное видео продавца: обзор, ответы и понятный следующий шаг. Прямой эфир пока не подключён и появится отдельным проверенным слоем.
            </p>
          </div>
        </div>
      </section>

      {modalStory !== null && (
        <StoryModal
          story={Object.keys(modalStory).length === 0 ? null : modalStory}
          onClose={() => setModalStory(null)}
          onSave={saveStory}
        />
      )}

      <ActionToast message={toast?.message ?? null} action={toast?.action} onDismiss={dismissToast} durationMs={5000} />

      {statsOpen && (
        <AdminModal
          open
          size="sm"
          className="admin-modal-compact"
          onClose={() => setStatsOpen(false)}
          title="Статистика сторис"
          footer={(
            <Button variant="outline" onClick={() => setStatsOpen(false)} className="min-h-11">
              Закрыть
            </Button>
          )}
        >
          <dl className="grid grid-cols-2 gap-3">
            {([
              ["Всего", stories.length],
              ["На сайте", activeCount],
              ["Скрыто", stories.length - activeCount],
              ["С товаром или услугой", linkedCount],
              ["Онлайн-продавец", liveCount],
              ["Просмотров", totalViews],
            ] as const).map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-border bg-card p-3">
                <dt className="text-xs font-semibold text-muted-foreground">{label}</dt>
                <dd className="mt-1 font-display text-2xl font-bold">{value}</dd>
              </div>
            ))}
          </dl>
          {topStories.length > 0 && totalViews > 0 && (
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Больше всего смотрят</p>
              <ol className="mt-2 space-y-1.5 text-sm">
                {topStories.map((story, place) => (
                  <li key={story.id} className="flex items-center justify-between gap-3">
                    <span className="truncate">{place + 1}. {story.title}</span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">{story.views}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </AdminModal>
      )}

      {deleteCandidate && (
        <AdminModal
          open
          className="admin-modal-compact"
          onClose={() => setDeleteCandidate(null)}
          title="Удалить сторис"
          subtitle="Сторис исчезнет из виджета и публичной страницы."
          size="sm"
          footer={(
            <>
              <Button variant="outline" onClick={() => setDeleteCandidate(null)}>
                Оставить
              </Button>
              <Button onClick={() => deleteStory(deleteCandidate)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                <Trash2 className="h-4 w-4" />
                Удалить
              </Button>
            </>
          )}
        >
          <p className="text-sm leading-6 text-muted-foreground">
            Ты удаляешь «{deleteCandidate.title}». Если нужно временно убрать сторис с сайта, лучше нажать «Скрыть».
          </p>
        </AdminModal>
      )}
    </div>
  );
}
