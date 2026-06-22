"use client";

import { useAdminConfirm } from "@/components/admin/admin-confirm-provider";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  ArrowUpRight,
  CheckCircle2,
  CirclePlay,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Link2,
  Loader2,
  Pencil,
  Plus,
  Radio,
  Search,
  Share2,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { AdminSectionTitle } from "@/components/admin/admin-section-title";
import { AdminModal } from "@/components/admin/admin-modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

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
  LIVE: "Live",
};

const ENTITY_LABEL: Record<string, string> = {
  general: "Общие сторис",
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

function StoryPreview({ story }: { story: StoryForm | Story }) {
  const mediaUrl = story.mediaUrl || "";
  const visual = story.posterUrl || mediaUrl;
  const Icon = getTypeIcon(story.type);
  const shouldRenderVideo = story.type !== "IMAGE" && mediaUrl.length > 0 && storyTypeFromMedia(mediaUrl) === "VIDEO";
  return (
    <div className="relative aspect-[9/16] overflow-hidden rounded-2xl border border-border bg-background">
      {shouldRenderVideo ? (
        <video src={mediaUrl} poster={story.posterUrl || undefined} className="h-full w-full object-cover" muted loop playsInline autoPlay preload="metadata" />
      ) : visual ? (
        <img src={visual} alt={story.title || "Story"} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-primary">
          <Icon className="h-9 w-9" />
        </div>
      )}
      <div className="absolute inset-0 bg-background/45" />
      <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full border border-border bg-card/90 px-2 py-1 text-[10px] font-semibold uppercase text-foreground">
        <Icon className="h-3 w-3" />
        {TYPE_LABEL[story.type]}
      </span>
      <span className="absolute right-3 top-3 rounded-full border border-border bg-card/90 px-2 py-1 text-[10px] font-semibold text-muted-foreground">
        9:16
      </span>
      <div className="absolute inset-x-3 bottom-3 rounded-2xl bg-card/90 p-3">
        <p className="line-clamp-2 text-sm font-bold text-foreground">{story.title || "Название сторис"}</p>
        {story.subtitle && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{story.subtitle}</p>}
      </div>
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

  const applyTemplate = (kind: "seller" | "product" | "service" | "review") => {
    if (kind === "product" || kind === "service" || kind === "review") {
      setRelationType(kind);
    }
    if (kind === "seller") {
      setForm((prev) => ({
        ...prev,
        type: "LIVE",
        title: "Онлайн-продавец",
        subtitle: "Живой обзор товара и ответы на вопросы",
        description: "Закрепленный эфир или короткое видео, которое встречает посетителя и помогает быстрее выбрать.",
        ctaLabel: "Задать вопрос",
        ctaUrl: "/contacts",
        entityType: null,
        entityId: "",
        pinned: true,
      }));
    }
    if (kind === "product") {
      setForm((prev) => ({
        ...prev,
        type: "VIDEO",
        title: "Видео-обзор товара",
        subtitle: "Покажите материал, размер и качество",
        description: "Эта сторис будет первой на странице связанного товара, если указать slug товара.",
        ctaLabel: "Открыть товар",
        entityType: "product",
      }));
    }
    if (kind === "service") {
      setForm((prev) => ({
        ...prev,
        type: "VIDEO",
        title: "Как работает услуга",
        subtitle: "Коротко объясните процесс и следующий шаг",
        description: "Сторис можно привязать к услуге по slug, чтобы она открывалась первой на странице услуги.",
        ctaLabel: "Оставить заявку",
        entityType: "service",
      }));
    }
    if (kind === "review") {
      setForm((prev) => ({
        ...prev,
        type: "VIDEO",
        title: "Видео-отзыв клиента",
        subtitle: "Одобренный отзыв можно показать в общем виджете",
        description: "После модерации видео-отзыв работает как доверительный контент для всего сайта.",
        ctaLabel: "Смотреть отзыв",
        entityType: "review",
      }));
    }
  };

  const uploadFile = async (file: File, target: "media" | "poster") => {
    setUploading(target);
    setError("");
    try {
      const data = new FormData();
      data.append("file", file);
      data.append("folder", "stories");
      const res = await fetch("/api/admin/upload", { method: "POST", body: data });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.url) throw new Error(json.error || "Не удалось загрузить файл");
      const pickedKind = pickedMediaKindFromFile(file);
      applyStoryMedia(target, json.url, pickedKind);
    } catch (err: any) {
      setError(err.message || "Не удалось загрузить файл");
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

  const selectedEntityOption = entityOptions.find((option) => option.entityType === relationType && option.entityId === form.entityId);
  const selectedRelations = form.relations || [];

  return (
    <>
    <AdminModal
      open
      onClose={onClose}
      title={isNew ? "Новая сторис" : "Редактировать сторис"}
      subtitle="Видео, live, товарный обзор, услуга или отзыв. Связанные сторис показываются первыми на нужной странице."
      size="xl"
      bodyClassName="p-4 sm:p-5"
      footer={(
        <>
          <Button variant="outline" onClick={onClose} className="min-h-11">
            Отмена
          </Button>
          <Button onClick={save} disabled={saving} className="min-h-11">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Сохранить
          </Button>
        </>
      )}
    >
      <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
        <div className="space-y-3">
          <StoryPreview story={form} />
          <div className="rounded-2xl border border-border bg-card p-3">
            <p className="mb-2 text-[11px] font-semibold uppercase text-muted-foreground">Формат сторис</p>
            <div className="grid grid-cols-3 gap-2">
              {([
                ["IMAGE", ImageIcon, "Фото"],
                ["VIDEO", CirclePlay, "Видео"],
                ["LIVE", Radio, "LIVE"],
              ] as const).map(([type, Icon, label]) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => set("type", type)}
                  className={cn(
                    "flex min-h-10 flex-col items-center justify-center gap-1 rounded-xl border px-2 text-[11px] font-semibold transition-colors",
                    form.type === type
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background text-muted-foreground hover:border-primary/35 hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-background/70 px-3 text-sm font-semibold transition-colors hover:border-primary/45">
              {uploading === "media" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Медиа
              <input
                type="file"
                accept={STORY_MEDIA_ACCEPT}
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) uploadFile(file, "media");
                  event.currentTarget.value = "";
                }}
              />
            </label>
            <label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-background/70 px-3 text-sm font-semibold transition-colors hover:border-primary/45">
              {uploading === "poster" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
              Обложка
              <input
                type="file"
                accept={STORY_POSTER_ACCEPT}
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) uploadFile(file, "poster");
                  event.currentTarget.value = "";
                }}
              />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="outline" onClick={() => setMediaPickerTarget("media")} className="min-h-10">
              <ImageIcon className="h-4 w-4" />
              Библиотека
            </Button>
            <Button type="button" variant="outline" onClick={() => setMediaPickerTarget("poster")} className="min-h-10">
              <ImageIcon className="h-4 w-4" />
              Обложка
            </Button>
          </div>
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
          <p className="text-xs leading-5 text-muted-foreground">
            Видео можно загрузить сюда или вставить ссылку. Для live пока используем ссылку на эфир, а дальше подключим провайдера трансляций.
          </p>
        </div>

        <div className="space-y-5">
          <div className="grid gap-2 sm:grid-cols-4">
            <Button type="button" variant="outline" onClick={() => applyTemplate("seller")} className="justify-start">
              <Radio className="h-4 w-4" />
              Онлайн
            </Button>
            <Button type="button" variant="outline" onClick={() => applyTemplate("product")} className="justify-start">
              <CirclePlay className="h-4 w-4" />
              Товар
            </Button>
            <Button type="button" variant="outline" onClick={() => applyTemplate("service")} className="justify-start">
              <Sparkles className="h-4 w-4" />
              Услуга
            </Button>
            <Button type="button" variant="outline" onClick={() => applyTemplate("review")} className="justify-start">
              <Eye className="h-4 w-4" />
              Отзыв
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className={labelClass}>Тип</label>
              <select className={fieldClass} value={form.type} onChange={(event) => set("type", event.target.value as StoryType)}>
                <option value="VIDEO">Видео</option>
                <option value="IMAGE">Фото</option>
                <option value="LIVE">Live</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Показывать</label>
              <select className={fieldClass} value={form.active ? "yes" : "no"} onChange={(event) => set("active", event.target.value === "yes")}>
                <option value="yes">Активна</option>
                <option value="no">Скрыта</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Закрепление</label>
              <select className={fieldClass} value={form.pinned ? "yes" : "no"} onChange={(event) => set("pinned", event.target.value === "yes")}>
                <option value="no">По порядку</option>
                <option value="yes">Закрепить первой</option>
              </select>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-background/45 p-3">
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold">Связанные товары, услуги и автошаблон</p>
                  <p className="text-xs text-muted-foreground">
                    Один live, обзор или отзыв можно привязать сразу к нескольким товарам и услугам. На нужной странице такая сторис появится первой.
                  </p>
                </div>
                {selectedEntityOption && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    шаблон связан
                  </span>
                )}
              </div>

              <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {RELATION_TYPES.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      setRelationType(type);
                      setEntityQuery("");
                    }}
                    className={cn(
                      "min-h-10 rounded-xl border px-3 text-xs font-semibold transition-colors",
                      relationType === type
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card text-muted-foreground hover:border-primary/35 hover:text-foreground",
                    )}
                  >
                    {ENTITY_LABEL[type]}
                  </button>
                ))}
              </div>

              <div className="grid gap-3 md:grid-cols-[1fr_220px]">
                <label className="relative block">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    className={cn(fieldClass, "pl-9")}
                    value={entityQuery}
                    onChange={(event) => setEntityQuery(event.target.value)}
                    placeholder="Найти по названию, slug или описанию"
                  />
                </label>
                <select
                  className={fieldClass}
                  value={form.entityId || ""}
                  onChange={(event) => {
                    const option = entityOptions.find((item) => item.entityType === relationType && item.entityId === event.target.value);
                    if (option) applyEntityOption(option);
                  }}
                >
                  <option value="">{entityLoading ? "Загружаю..." : "Выбрать из списка"}</option>
                  {entityOptions.map((option) => (
                    <option key={`${option.entityType}-${option.entityId}`} value={option.entityId}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {selectedEntityOption && (
                <button
                  type="button"
                  onClick={() => applyEntityOption(selectedEntityOption)}
                  className="mt-3 flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-2 text-left transition-colors hover:border-primary/35"
                >
                  <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-muted">
                    {selectedEntityOption.image ? (
                      <img src={selectedEntityOption.image} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Sparkles className="m-4 h-6 w-6 text-primary" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{selectedEntityOption.label}</span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">{selectedEntityOption.detail}</span>
                  </span>
                  <span className="hidden rounded-full border border-primary/25 px-3 py-1 text-[11px] font-semibold text-primary sm:inline-flex">
                    применить
                  </span>
                </button>
              )}

              {selectedRelations.length > 0 && (
                <div className="mt-3 rounded-2xl border border-border bg-card/70 p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">Связанные товары и услуги</p>
                    <span className="rounded-full border border-border px-2 py-1 text-[11px] text-muted-foreground">
                      {selectedRelations.length}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedRelations.map((relation) => (
                      <span
                        key={relationKey(relation)}
                        className="inline-flex max-w-full items-center gap-2 rounded-full border border-border bg-background px-2.5 py-1.5 text-xs"
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
                          className="rounded-full text-muted-foreground transition-colors hover:text-destructive"
                          onClick={() => {
                            setForm((prev) => {
                              const nextRelations = (prev.relations || []).filter((item) => relationKey(item) !== relationKey(relation));
                              const removedPrimary = prev.entityType === relation.entityType && prev.entityId === relation.entityId;
                              return {
                                ...prev,
                                relations: nextRelations,
                                entityType: removedPrimary ? nextRelations[0]?.entityType || null : prev.entityType,
                                entityId: removedPrimary ? nextRelations[0]?.entityId || "" : prev.entityId,
                              };
                            });
                          }}
                          aria-label="Убрать связь"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className={labelClass}>Название</label>
              <input className={fieldClass} value={form.title} onChange={(event) => set("title", event.target.value)} placeholder="Например: обзор доски 40x100" />
            </div>
            <div>
              <label className={labelClass}>Короткая подпись</label>
              <input className={fieldClass} value={form.subtitle || ""} onChange={(event) => set("subtitle", event.target.value)} placeholder="Что увидит клиент за 2 секунды" />
            </div>
          </div>

          <div>
            <label className={labelClass}>Описание</label>
            <textarea className={cn(fieldClass, "min-h-[96px] resize-y")} value={form.description || ""} onChange={(event) => set("description", event.target.value)} placeholder="Короткое объяснение, почему это важно и что сделать дальше" />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className={labelClass}>Видео / фото / live ссылка</label>
              <input className={fieldClass} value={form.mediaUrl || ""} onChange={(event) => set("mediaUrl", event.target.value)} placeholder="/images/stories/video.mp4" />
            </div>
            <div>
              <label className={labelClass}>Обложка</label>
              <input className={fieldClass} value={form.posterUrl || ""} onChange={(event) => set("posterUrl", event.target.value)} placeholder="/images/stories/poster.webp" />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className={labelClass}>Связь</label>
              <select className={fieldClass} value={form.entityType || "general"} onChange={(event) => set("entityType", event.target.value === "general" ? null : event.target.value)}>
                <option value="general">Общая сторис</option>
                <option value="product">Товар</option>
                <option value="service">Услуга</option>
                <option value="promotion">Акция</option>
                <option value="review">Видео-отзыв</option>
                <option value="company">О компании</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>ID или slug связи</label>
              <input className={fieldClass} value={form.entityId || ""} onChange={(event) => set("entityId", event.target.value)} placeholder="doska-stroganaya-suhaya-sosna" disabled={!form.entityType} />
            </div>
            <div>
              <label className={labelClass}>Порядок</label>
              <input className={fieldClass} type="number" value={form.sortOrder} onChange={(event) => set("sortOrder", Number(event.target.value))} />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className={labelClass}>Текст кнопки</label>
              <input className={fieldClass} value={form.ctaLabel || ""} onChange={(event) => set("ctaLabel", event.target.value)} placeholder={suggestEntityCta(form.entityType)} />
            </div>
            <div>
              <label className={labelClass}>Ссылка кнопки</label>
              <input className={fieldClass} value={form.ctaUrl || ""} onChange={(event) => set("ctaUrl", event.target.value)} placeholder="/product/slug или /contacts" />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className={labelClass}>Старт</label>
              <input className={fieldClass} type="datetime-local" value={form.startsAt || ""} onChange={(event) => set("startsAt", event.target.value || null)} />
            </div>
            <div>
              <label className={labelClass}>Конец</label>
              <input className={fieldClass} type="datetime-local" value={form.endsAt || ""} onChange={(event) => set("endsAt", event.target.value || null)} />
            </div>
          </div>

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
  const confirmAction = useAdminConfirm();
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalStory, setModalStory] = useState<Partial<Story> | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<Story | null>(null);
  const [error, setError] = useState("");

  const activeCount = useMemo(() => stories.filter(isVisibleNow).length, [stories]);
  const linkedCount = useMemo(() => stories.filter((story) => normalizeRelations(story).length > 0).length, [stories]);
  const liveCount = useMemo(() => stories.filter((story) => story.type === "LIVE").length, [stories]);

  const loadStories = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/stories");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Не удалось загрузить сторис");
      setStories(Array.isArray(data) ? data : []);
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
    if (!(await confirmAction(story.active ? "Скрыть сторис?" : "Показать сторис?"))) return;
    await saveStory({ ...normalizeForm(story), active: !story.active });
  };

  return (
    <div className="space-y-6 px-4 py-4 pb-32 sm:px-6 sm:py-6 sm:pb-36">
      <AdminSectionTitle
        icon={CirclePlay}
        title="Сторис и онлайн-продавец"
        subtitle="Видео, live, отзывы и привязка к товарам/услугам"
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

      <section className="grid gap-3 md:grid-cols-4">
        {[
          ["Всего", stories.length],
          ["Активны", activeCount],
          ["Связаны", linkedCount],
          ["Live", liveCount],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-border bg-card p-4">
            <p className="text-xs font-semibold uppercase text-muted-foreground">{label}</p>
            <p className="mt-2 font-display text-3xl font-bold">{value}</p>
          </div>
        ))}
      </section>

      {error && (
        <div className="admin-alert admin-alert-danger px-3 py-2 text-sm">
          {error}
        </div>
      )}

      {!loading && stories.length > 0 && (
        <section className="flex flex-col gap-3 rounded-2xl border border-border bg-card/70 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase text-primary/80">Рабочая зона</p>
            <h2 className="mt-1 font-display text-2xl font-bold">Сторис в эфире</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {activeCount} активны · {linkedCount} связаны · {liveCount} live
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" className="min-h-10">
              <Link href="/stories" target="_blank">
                <ArrowUpRight className="h-4 w-4" />
                На сайте
              </Link>
            </Button>
            <Button onClick={() => setModalStory({})} className="min-h-10">
              <Plus className="h-4 w-4" />
              Создать
            </Button>
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
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {stories.map((story) => {
            const Icon = getTypeIcon(story.type);
            const entityKey = story.entityType || "general";
            const storyRelations = normalizeRelations(story);
            return (
              <article key={story.id} className="overflow-hidden rounded-2xl border border-border bg-card">
                <div className="grid gap-0 sm:grid-cols-[150px_1fr]">
                  <StoryPreview story={story} />
                  <div className="flex min-w-0 flex-col p-4">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <Badge variant={story.active ? "default" : "outline"} className="rounded-full">
                        {story.active ? "активна" : "скрыта"}
                      </Badge>
                      {story.pinned && <Badge variant="outline" className="rounded-full">закреплена</Badge>}
                      <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-1 text-[10px] font-semibold text-muted-foreground">
                        <Icon className="h-3 w-3" />
                        {TYPE_LABEL[story.type]}
                      </span>
                    </div>
                    <h2 className="line-clamp-2 font-display text-xl font-bold">{story.title}</h2>
                    {story.subtitle && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{story.subtitle}</p>}
                    <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                      <p>
                        Связь: <span className="font-semibold text-foreground">{ENTITY_LABEL[entityKey] || entityKey}</span>
                        {story.entityId ? ` · ${story.entityId}` : ""}
                      </p>
                      {storyRelations.length > 0 && (
                        <p>
                          Объекты: <span className="font-semibold text-foreground">{storyRelations.length}</span>
                          {" · "}
                          {storyRelations.slice(0, 2).map((relation) => relation.label || relation.entityId).join(", ")}
                          {storyRelations.length > 2 ? "..." : ""}
                        </p>
                      )}
                      <p>Просмотры: {story.views} · порядок {story.sortOrder}</p>
                    </div>
                    <div className="mt-auto flex flex-wrap gap-2 pt-4">
                      <Button variant="outline" onClick={() => toggleActive(story)} className="min-h-10">
                        {story.active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        {story.active ? "Скрыть" : "Показать"}
                      </Button>
                      <Button variant="outline" onClick={() => setModalStory(story)} className="min-h-10">
                        <Pencil className="h-4 w-4" />
                        Изменить
                      </Button>
                      {story.ctaUrl && (
                        <Button asChild variant="outline" className="min-h-10">
                          <Link href={story.ctaUrl} target="_blank">
                            <Link2 className="h-4 w-4" />
                            CTA
                          </Link>
                        </Button>
                      )}
                      <Button asChild variant="outline" className="min-h-10">
                        <Link href={storyPublicHref(story.id)} target="_blank">
                          <ArrowUpRight className="h-4 w-4" />
                          На сайте
                        </Link>
                      </Button>
                      <Button variant="outline" onClick={() => setDeleteCandidate(story)} className="min-h-10 text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
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
              Live хранит ссылку на эфир. Следующий слой подключит расписание, трансляции и заявки из просмотра.
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

      {deleteCandidate && (
        <AdminModal
          open
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
