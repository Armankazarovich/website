"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  CirclePlay,
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
  if (story.type === "IMAGE") return story.mediaUrl || story.posterUrl || "";
  if (story.posterUrl) return story.posterUrl;
  return story.mediaUrl && canInlineVideo(story.mediaUrl) ? story.mediaUrl : "";
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
  onVideoProgress,
  onVideoEnded,
}: {
  story: Story;
  active?: boolean;
  soundEnabled?: boolean;
  onVideoProgress?: (progress: number) => void;
  onVideoEnded?: () => void;
}) {
  const visual = storyVisual(story);
  const hasVideo = isVideo(story.type) && story.mediaUrl && canInlineVideo(story.mediaUrl);

  if (hasVideo) {
    return (
      <video
        src={story.mediaUrl || undefined}
        poster={story.posterUrl || undefined}
        className="h-full w-full bg-background object-cover"
        muted={!active || !soundEnabled}
        controls={false}
        autoPlay
        loop={!active}
        playsInline
        preload="metadata"
        onLoadedMetadata={() => onVideoProgress?.(0)}
        onTimeUpdate={(event) => {
          const video = event.currentTarget;
          if (active && Number.isFinite(video.duration) && video.duration > 0) {
            onVideoProgress?.(Math.min(1, video.currentTime / video.duration));
          }
        }}
        onEnded={active ? onVideoEnded : undefined}
      />
    );
  }

  if (visual) {
    return <img src={visual} alt={story.title} className="h-full w-full bg-background object-cover" loading="lazy" />;
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
  const [progress, setProgress] = useState(0);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const timerRef = useRef<number | null>(null);
  const activeStory = activeIndex === null ? null : stories[activeIndex];
  const activePosition = activeIndex ?? 0;
  const total = stories.length;
  const requestedStoryId = initialStoryId || searchParams.get("story") || undefined;
  useAdminOverlayGuard(Boolean(activeStory));

  const close = () => {
    setActiveIndex(null);
    setSoundEnabled(false);
    setProgress(0);
    setDetailsOpen(false);
  };

  const open = (index: number) => {
    setActiveIndex(index);
    setSoundEnabled(false);
    setProgress(0);
    setDetailsOpen(false);
  };

  useEffect(() => {
    if (!requestedStoryId) return;
    const nextIndex = stories.findIndex((story) => story.id === requestedStoryId);
    if (nextIndex >= 0) open(nextIndex);
  }, [requestedStoryId, stories]);

  const next = useCallback(() => {
    if (!total) return;
    setProgress(0);
    setActiveIndex((value) => (value === null ? 0 : (value + 1) % total));
  }, [total]);

  const prev = useCallback(() => {
    if (!total) return;
    setProgress(0);
    setActiveIndex((value) => (value === null ? 0 : (value - 1 + total) % total));
  }, [total]);

  useEffect(() => {
    setProgress(0);
    setDetailsOpen(false);
  }, [activeStory?.id]);

  useEffect(() => {
    if (!activeStory) return;
    if (timerRef.current) window.clearInterval(timerRef.current);
    if (detailsOpen) return;
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
  }, [activeStory, detailsOpen, next]);

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

  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {stories.map((story, index) => {
          const relatedActions = storyRelations(story).slice(0, 2);
          return (
            <article
              key={story.id}
              className="group overflow-hidden rounded-2xl border border-border bg-card shadow-xl shadow-black/10 transition-colors hover:border-primary/35"
            >
              <button type="button" onClick={() => open(index)} className="block w-full text-left">
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
                  onClick={() => open(index)}
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
                onVideoProgress={(nextProgress) => {
                  if (!detailsOpen) setProgress(nextProgress);
                }}
                onVideoEnded={() => {
                  if (detailsOpen) return;
                  setProgress(1);
                  if (total > 1) next();
                }}
              />
              {isVideo(activeStory.type) && activeStory.mediaUrl && canInlineVideo(activeStory.mediaUrl) && (
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
