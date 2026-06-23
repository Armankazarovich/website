"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Boxes,
  ChevronLeft,
  ChevronRight,
  CirclePlay,
  Eye,
  Film,
  Layers3,
  MessageCircle,
  Pause,
  Play,
  Radio,
  Sparkles,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAdminOverlayGuard } from "@/lib/use-admin-overlay-guard";
import { StoryActionDrawer } from "@/components/store/story-action-drawer";
import { PopupPortal } from "@/components/ui/popup-portal";

type StoreStoryKind = "IMAGE" | "VIDEO" | "LIVE";

type StoryRelation = {
  entityType: string;
  entityId: string;
  label: string | null;
  image: string | null;
  ctaUrl: string | null;
  sortOrder: number;
};

type Story = {
  id: string;
  type: StoreStoryKind;
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
  pinned: boolean;
  sortOrder: number;
  views: number;
  createdAt: string;
  relations: StoryRelation[];
};

const PHOTO_STORY_MS = 6500;
const STORY_VIDEO_FALLBACK_POSTER = "/images/production/hero-main.webp";

function isVideo(type: StoreStoryKind) {
  return type === "VIDEO" || type === "LIVE";
}

function canInlineVideo(url?: string | null) {
  const value = (url || "").trim();
  return /^(blob:|data:video)/i.test(value) || /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(value);
}

function isExternalHref(href: string) {
  return /^https?:\/\//i.test(href);
}

function storyVisual(story: Story) {
  const poster =
    story.posterUrl ||
    story.relations?.find((relation) => Boolean(relation.image))?.image ||
    (isVideo(story.type) ? STORY_VIDEO_FALLBACK_POSTER : "");
  if (story.type === "IMAGE") return story.mediaUrl || poster;
  return poster;
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

function storyRelations(story: Story) {
  const seen = new Set<string>();
  const relations = [...(story.relations || [])];
  if (
    story.entityType &&
    story.entityId &&
    !relations.some((relation) => relation.entityType === story.entityType && relation.entityId === story.entityId)
  ) {
    relations.unshift({
      entityType: story.entityType,
      entityId: story.entityId,
      label: null,
      image: story.posterUrl,
      ctaUrl: story.ctaUrl,
      sortOrder: 0,
    });
  }

  return relations.filter((relation) => {
    const key = `${relation.entityType}:${relation.entityId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function StoryVisual({
  story,
  active,
  soundEnabled = false,
  paused = false,
  onVideoProgress,
  onVideoEnded,
  onTogglePaused,
}: {
  story: Story;
  active?: boolean;
  soundEnabled?: boolean;
  paused?: boolean;
  onVideoProgress?: (progress: number) => void;
  onVideoEnded?: () => void;
  onTogglePaused?: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoLoading, setVideoLoading] = useState(false);
  const visual = storyVisual(story);
  const hasVideo = Boolean(active && isVideo(story.type) && story.mediaUrl && canInlineVideo(story.mediaUrl));

  useEffect(() => {
    setVideoLoading(hasVideo);
  }, [hasVideo, story.mediaUrl]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !active) return;
    if (paused) {
      video.pause();
      return;
    }
    video.play().catch(() => null);
  }, [active, paused, story.mediaUrl]);

  if (hasVideo) {
    return (
      <div className="relative h-full w-full bg-background">
        <video
          ref={videoRef}
          src={story.mediaUrl || undefined}
          poster={story.posterUrl || undefined}
          className="h-full w-full bg-background object-cover"
          muted={!active || !soundEnabled}
          controls={false}
          autoPlay={active}
          loop={!active}
          playsInline
          preload="metadata"
          onClick={() => {
            if (active) onTogglePaused?.();
          }}
          onLoadedMetadata={() => onVideoProgress?.(0)}
          onLoadedData={() => setVideoLoading(false)}
          onCanPlay={() => setVideoLoading(false)}
          onPlaying={() => setVideoLoading(false)}
          onWaiting={() => setVideoLoading(true)}
          onTimeUpdate={(event) => {
            const video = event.currentTarget;
            if (active && Number.isFinite(video.duration) && video.duration > 0) {
              onVideoProgress?.(Math.min(1, video.currentTime / video.duration));
            }
          }}
          onEnded={active ? onVideoEnded : undefined}
        />
        {videoLoading && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/55 text-primary">
            <CirclePlay className="h-12 w-12 animate-pulse" />
          </div>
        )}
      </div>
    );
  }

  if (visual) {
    return <img src={visual} alt={story.title} className="h-full w-full bg-background object-cover" loading="lazy" decoding="async" />;
  }

  if (isVideo(story.type)) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-card text-primary">
        <CirclePlay className="h-10 w-10" />
      </div>
    );
  }

  return (
    <div className="flex h-full w-full items-center justify-center bg-card text-primary">
      <Sparkles className="h-10 w-10" />
    </div>
  );
}

function StoryBadge({ type }: { type: StoreStoryKind }) {
  const Icon = type === "LIVE" ? Radio : CirclePlay;
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card/95 px-2 py-1 text-[10px] font-semibold uppercase text-foreground">
      <Icon className="h-3 w-3 text-primary" />
      {type === "LIVE" ? "Live" : "Story"}
    </span>
  );
}

type StoryFilter = "all" | "live" | "video" | "product" | "service";

const STORY_FILTERS = [
  { id: "all", label: "Все", icon: Layers3 },
  { id: "live", label: "Live", icon: Radio },
  { id: "video", label: "Видео", icon: Film },
  { id: "product", label: "Товары", icon: Boxes },
  { id: "service", label: "Услуги", icon: MessageCircle },
] satisfies Array<{ id: StoryFilter; label: string; icon: typeof CirclePlay }>;

function storyMatchesFilter(story: Story, filter: StoryFilter) {
  if (filter === "all") return true;
  if (filter === "live") return story.type === "LIVE";
  if (filter === "video") return story.type === "VIDEO" || story.type === "LIVE";
  return storyRelations(story).some((relation) => relation.entityType === filter);
}

function getPrimaryRelation(story: Story) {
  const relations = storyRelations(story);
  return relations.find((relation) => relation.ctaUrl) || relations[0] || null;
}

function formatStoryViews(views: number) {
  if (views <= 0) return "новое";
  return `${views} просмотров`;
}

function RelatedAction({ relation, onClick }: { relation: StoryRelation; onClick?: () => void }) {
  const content = (
    <>
      {relation.image ? (
        <img src={relation.image} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
      ) : (
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <Sparkles className="h-5 w-5 text-primary" />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block text-[10px] font-semibold uppercase text-muted-foreground">
          {relationLabel(relation.entityType)}
        </span>
        <span className="mt-0.5 block truncate text-sm font-semibold text-foreground">
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
      <div className="inline-flex min-w-0 items-center gap-3 rounded-2xl border border-border bg-card p-2.5 text-left">
        {content}
      </div>
    );
  }

  return (
    <Link
      href={relation.ctaUrl}
      onClick={onClick}
      target={isExternalHref(relation.ctaUrl) ? "_blank" : undefined}
      rel={isExternalHref(relation.ctaUrl) ? "noreferrer" : undefined}
      className="inline-flex min-w-0 items-center gap-3 rounded-2xl border border-border bg-card p-2.5 text-left transition-colors hover:border-primary/45"
    >
      {content}
    </Link>
  );
}

export function StoriesPageClient({ stories, initialStoryId }: { stories: Story[]; initialStoryId?: string }) {
  const searchParams = useSearchParams();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [filter, setFilter] = useState<StoryFilter>("all");
  const timerRef = useRef<number | null>(null);
  const activeStory = activeIndex === null ? null : stories[activeIndex];
  const activePosition = activeIndex ?? 0;
  const total = stories.length;
  const requestedStoryId = initialStoryId || searchParams.get("story") || undefined;
  const filterStats = useMemo(
    () =>
      STORY_FILTERS.map((item) => ({
        ...item,
        count: stories.filter((story) => storyMatchesFilter(story, item.id)).length,
      })),
    [stories],
  );
  const filteredStories = useMemo(
    () => stories.filter((story) => storyMatchesFilter(story, filter)),
    [filter, stories],
  );
  const spotlightStory = filteredStories[0] || stories[0];
  const spotlightRelation = spotlightStory ? getPrimaryRelation(spotlightStory) : null;
  useAdminOverlayGuard(Boolean(activeStory));

  const close = () => {
    setActiveIndex(null);
    setSoundEnabled(false);
    setPaused(false);
    setProgress(0);
    setDetailsOpen(false);
  };

  const open = (index: number) => {
    setActiveIndex(index);
    setSoundEnabled(false);
    setPaused(false);
    setProgress(0);
    setDetailsOpen(false);
  };

  const openStory = (storyId: string) => {
    const nextIndex = stories.findIndex((story) => story.id === storyId);
    if (nextIndex >= 0) open(nextIndex);
  };

  useEffect(() => {
    if (!requestedStoryId) return;
    const nextIndex = stories.findIndex((story) => story.id === requestedStoryId);
    if (nextIndex >= 0) open(nextIndex);
  }, [requestedStoryId, stories]);

  const next = useCallback(() => {
    if (!total) return;
    setProgress(0);
    setPaused(false);
    setActiveIndex((value) => (value === null ? 0 : (value + 1) % total));
  }, [total]);

  const prev = useCallback(() => {
    if (!total) return;
    setProgress(0);
    setPaused(false);
    setActiveIndex((value) => (value === null ? 0 : (value - 1 + total) % total));
  }, [total]);

  useEffect(() => {
    setProgress(0);
    setDetailsOpen(false);
    setPaused(false);
  }, [activeStory?.id]);

  useEffect(() => {
    if (!activeStory) return;
    if (timerRef.current) window.clearInterval(timerRef.current);
    if (detailsOpen || paused) return;
    if (isVideo(activeStory.type) && activeStory.mediaUrl && canInlineVideo(activeStory.mediaUrl)) return;

    const startedAt = Date.now();
    timerRef.current = window.setInterval(() => {
      const nextProgress = Math.min(1, (Date.now() - startedAt) / PHOTO_STORY_MS);
      setProgress(nextProgress);
      if (nextProgress >= 1) next();
    }, 80);

    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [activeStory, detailsOpen, next, paused]);

  if (stories.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Sparkles className="h-8 w-8" />
        </div>
        <h2 className="font-display text-2xl font-bold">Сторис скоро появятся</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
          Продавец сможет добавлять видео-обзоры товаров, услуг и отзывы клиентов прямо из админки.
        </p>
      </div>
    );
  }

  const storyFrozen = paused || detailsOpen;
  const toggleStoryPaused = () => {
    if (storyFrozen) {
      setDetailsOpen(false);
      setPaused(false);
      return;
    }
    setPaused(true);
  };

  return (
    <>
      <div className="space-y-6">
        <div className="-mx-1 overflow-x-auto px-1 pb-2">
          <div className="flex min-w-max gap-3">
            {stories.slice(0, 14).map((story) => (
              <button
                key={`rail-${story.id}`}
                type="button"
                data-store-stories-rail-item={story.id}
                onClick={() => openStory(story.id)}
                className="group w-[92px] shrink-0 text-left"
              >
                <span className="relative block aspect-[3/4] overflow-hidden rounded-2xl border border-border bg-card shadow-lg shadow-black/10 transition-colors group-hover:border-primary/45">
                  <StoryVisual story={story} />
                  <span className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-background/15" />
                  <span className="absolute left-2 top-2">
                    <StoryBadge type={story.type} />
                  </span>
                  <span className="absolute inset-x-2 bottom-2 line-clamp-2 text-xs font-semibold text-foreground">
                    {story.title}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {filterStats.map((item) => {
            const Icon = item.icon;
            const selected = filter === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilter(item.id)}
                className={cn(
                  "inline-flex min-h-10 items-center gap-2 rounded-xl border px-3 text-sm font-semibold transition-colors",
                  selected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-foreground hover:border-primary/45",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[11px]",
                    selected ? "bg-background/20 text-primary-foreground" : "bg-primary/10 text-primary",
                  )}
                >
                  {item.count}
                </span>
              </button>
            );
          })}
        </div>

        {spotlightStory && (
          <section
            data-store-stories-spotlight={spotlightStory.id}
            className="grid overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-black/10 lg:grid-cols-[minmax(0,1.15fr)_minmax(330px,0.85fr)]"
          >
            <button
              type="button"
              data-store-stories-spotlight-media
              onClick={() => openStory(spotlightStory.id)}
              className="group relative block min-h-[360px] text-left"
            >
              <StoryVisual story={spotlightStory} />
              <span className="absolute inset-0 bg-gradient-to-t from-background via-background/35 to-transparent" />
              <span className="absolute left-4 top-4">
                <StoryBadge type={spotlightStory.type} />
              </span>
              <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full border border-border bg-card/95 px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                <Eye className="h-3.5 w-3.5 text-primary" />
                {formatStoryViews(spotlightStory.views)}
              </span>
              <span className="absolute inset-x-4 bottom-4 rounded-2xl border border-border/70 bg-card/95 p-4 backdrop-blur">
                <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase text-primary">
                  <CirclePlay className="h-4 w-4" />
                  Смотреть сейчас
                </span>
                <span className="mt-2 block font-display text-2xl font-bold text-foreground md:text-3xl">
                  {spotlightStory.title}
                </span>
                {spotlightStory.subtitle && (
                  <span className="mt-1 block text-sm leading-6 text-muted-foreground">{spotlightStory.subtitle}</span>
                )}
              </span>
            </button>

            <div className="flex flex-col gap-4 border-t border-border p-5 lg:border-l lg:border-t-0">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  <Sparkles className="h-3.5 w-3.5" />
                  Видео-витрина
                </div>
                <h2 className="mt-3 font-display text-2xl font-bold">{spotlightStory.title}</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {spotlightStory.description || spotlightStory.subtitle || "Короткий обзор помогает быстрее понять товар, размер, цену и следующий шаг."}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-xl border border-border bg-background/35 p-3">
                  <div className="font-semibold text-foreground">{formatStoryViews(spotlightStory.views)}</div>
                  <div className="mt-1 text-muted-foreground">интерес</div>
                </div>
                <div className="rounded-xl border border-border bg-background/35 p-3">
                  <div className="font-semibold text-foreground">{storyRelations(spotlightStory).length || 1}</div>
                  <div className="mt-1 text-muted-foreground">связей</div>
                </div>
                <div className="rounded-xl border border-border bg-background/35 p-3">
                  <div className="font-semibold text-foreground">{spotlightStory.type === "LIVE" ? "Live" : "Story"}</div>
                  <div className="mt-1 text-muted-foreground">формат</div>
                </div>
              </div>

              {spotlightRelation && <RelatedAction relation={spotlightRelation} />}

              <div className="mt-auto grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  data-store-stories-spotlight-open
                  onClick={() => openStory(spotlightStory.id)}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  <CirclePlay className="h-4 w-4" />
                  Смотреть сторис
                </button>
                <Link
                  href="/catalog"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-background/35 px-4 text-sm font-semibold transition-colors hover:border-primary/45"
                >
                  В каталог
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </section>
        )}

        {filteredStories.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <Sparkles className="mx-auto h-8 w-8 text-primary" />
            <h2 className="mt-3 font-display text-2xl font-bold">В этом разделе пока пусто</h2>
            <p className="mt-2 text-sm text-muted-foreground">Можно открыть все сторисы или добавить новые материалы в админке.</p>
            <button
              type="button"
              onClick={() => setFilter("all")}
              className="mt-4 inline-flex min-h-10 items-center justify-center rounded-xl border border-primary/35 bg-primary/10 px-4 text-sm font-semibold text-primary"
            >
              Показать все
            </button>
          </div>
        )}

        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filteredStories.map((story) => {
          const relatedActions = storyRelations(story).slice(0, 2);
          return (
                <article
                  key={story.id}
                  data-store-stories-page-card={story.id}
                  className="group overflow-hidden rounded-2xl border border-border bg-card shadow-xl shadow-black/10 transition-colors hover:border-primary/35"
                >
              <button type="button" data-store-stories-page-card-media onClick={() => openStory(story.id)} className="block w-full text-left">
                <div className="relative aspect-[9/12] overflow-hidden bg-background">
                  <StoryVisual story={story} />
                  <span className="absolute inset-0 bg-background/45" />
                  <span className="absolute left-3 top-3">
                    <StoryBadge type={story.type} />
                  </span>
                  {story.views > 0 && (
                    <span className="absolute right-3 top-3 rounded-full border border-border bg-card/95 px-2 py-1 text-[10px] font-semibold text-muted-foreground">
                      {story.views} просмотров
                    </span>
                  )}
                  <div className="absolute inset-x-3 bottom-3 rounded-2xl border border-border/70 bg-card/95 p-3">
                    <h2 className="line-clamp-2 text-base font-bold text-foreground">{story.title}</h2>
                    {story.subtitle && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{story.subtitle}</p>}
                  </div>
                </div>
              </button>
              <div className="space-y-3 p-4">
                {story.description && <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">{story.description}</p>}
                {relatedActions.length > 0 && (
                  <div className="grid gap-2">
                    {relatedActions.map((relation) => (
                      <RelatedAction key={`${story.id}-${relation.entityType}-${relation.entityId}`} relation={relation} />
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  data-store-stories-page-card-open
                  onClick={() => openStory(story.id)}
                  className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-primary/35 bg-primary/10 px-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/15"
                >
                  <CirclePlay className="h-4 w-4" />
                  Смотреть сторис
                </button>
              </div>
            </article>
          );
          })}
        </div>
      </div>

      {activeStory && (
        <PopupPortal>
        <div className="store-story-overlay fixed inset-0 z-[120] flex items-center justify-center bg-background/96 p-2 sm:p-4" onClick={close}>
          <div className="store-story-side-panel relative flex w-full max-w-[430px] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-black/40" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-3">
              <div className="min-w-0">
                <StoryBadge type={activeStory.type} />
                <h2 className="mt-2 truncate text-sm font-semibold">{activeStory.title}</h2>
              </div>
              <button
                type="button"
                onClick={close}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Закрыть сторис"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {total > 1 && (
              <div className="flex gap-1 border-b border-border px-3 py-2">
                {stories.map((story, index) => (
                  <button
                    key={story.id}
                    type="button"
                    onClick={() => open(index)}
                    className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"
                    aria-label={`Сторис ${index + 1}`}
                  >
                    <span
                      className="block h-full rounded-full bg-primary transition-[width] duration-100"
                      style={{
                        width:
                          index < activePosition
                            ? "100%"
                            : index === activePosition
                              ? `${Math.max(3, progress * 100)}%`
                              : "0%",
                      }}
                    />
                  </button>
                ))}
              </div>
            )}

            <div className="store-story-frame relative aspect-[9/16] shrink-0 bg-background">
              <StoryVisual
                story={activeStory}
                active
                soundEnabled={soundEnabled}
                paused={storyFrozen}
                onTogglePaused={toggleStoryPaused}
                onVideoProgress={(nextProgress) => {
                  if (!storyFrozen) setProgress(nextProgress);
                }}
                onVideoEnded={() => {
                  if (storyFrozen) return;
                  setProgress(1);
                  if (total > 1) next();
                }}
              />
              {isVideo(activeStory.type) && activeStory.mediaUrl && canInlineVideo(activeStory.mediaUrl) && (
                <>
                  <button
                    type="button"
                    onClick={toggleStoryPaused}
                    className="absolute left-3 top-3 inline-flex min-h-9 items-center gap-2 rounded-full border border-border bg-card/95 px-3 text-xs font-semibold text-foreground transition-colors hover:border-primary/45"
                    aria-label={storyFrozen ? "Продолжить сторис" : "Поставить сторис на паузу"}
                    title={storyFrozen ? "Продолжить" : "Пауза"}
                  >
                    {storyFrozen ? <Play className="h-4 w-4 text-primary" /> : <Pause className="h-4 w-4 text-primary" />}
                    {storyFrozen ? "Продолжить" : "Пауза"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSoundEnabled((enabled) => !enabled)}
                    className={cn(
                      "absolute right-3 top-3 inline-flex min-h-9 items-center gap-2 rounded-full border px-3 text-xs font-semibold transition-colors",
                      soundEnabled
                        ? "border-primary/45 bg-primary/15 text-primary hover:bg-primary/20"
                        : "border-border bg-card/95 text-foreground hover:border-primary/45",
                    )}
                    aria-label={soundEnabled ? "Выключить звук сторис" : "Включить звук сторис"}
                    title={soundEnabled ? "Выключить звук" : "Включить звук"}
                  >
                    {soundEnabled ? (
                      <VolumeX className="h-4 w-4 text-primary-foreground" />
                    ) : (
                      <Volume2 className="h-4 w-4 text-primary" />
                    )}
                    {soundEnabled ? "Выключить звук" : "Включить звук"}
                  </button>
                </>
              )}
              {total > 1 && (
                <>
                  <button
                    type="button"
                    onClick={prev}
                    className="absolute left-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card/90 text-foreground"
                    aria-label="Предыдущий сторис"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={next}
                    className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card/90 text-foreground"
                    aria-label="Следующий сторис"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              )}
              <StoryActionDrawer
                story={activeStory}
                relations={storyRelations(activeStory)}
                actionHref={activeStory.ctaUrl || storyRelations(activeStory).find((relation) => relation.ctaUrl)?.ctaUrl || (activeStory.type === "LIVE" && activeStory.mediaUrl ? activeStory.mediaUrl : "")}
                expanded={detailsOpen}
                onToggle={() => setDetailsOpen((open) => !open)}
                onNavigate={close}
              />
            </div>
          </div>
        </div>
        </PopupPortal>
      )}
    </>
  );
}
