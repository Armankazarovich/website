"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight, CirclePlay, Eye, Pause, Play, Radio, Sparkles, Volume2, VolumeX, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFloatingChromeHidden } from "@/lib/use-floating-ui";
import { useAdminOverlayGuard } from "@/lib/use-admin-overlay-guard";
import { StoryActionDrawer } from "@/components/store/story-action-drawer";
import { PopupPortal } from "@/components/ui/popup-portal";

type StoreStoryKind = "IMAGE" | "VIDEO" | "LIVE";

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
  relations?: StoryRelation[];
};

type StoryRelation = {
  entityType: string;
  entityId: string;
  label: string | null;
  image: string | null;
  ctaUrl: string | null;
  sortOrder: number;
};

const PHOTO_STORY_MS = 6500;
const STORIES_WIDGET_HIDDEN_KEY = "pilorus:stories-widget-hidden";
const STORY_PREVIEW_VIDEO_DELAY_MS = 1800;
const STORY_PREVIEW_VIDEO_MAX_BYTES = 12 * 1024 * 1024;
const STORY_VIDEO_FALLBACK_POSTER = "/images/production/hero-main.webp";

function deriveEntity(pathname: string) {
  const productMatch = pathname.match(/^\/product\/([^/?#]+)/);
  if (productMatch?.[1]) return { entityType: "product", entityId: decodeURIComponent(productMatch[1]) };

  const serviceMatch = pathname.match(/^\/services\/([^/?#]+)/);
  if (serviceMatch?.[1]) return { entityType: "service", entityId: decodeURIComponent(serviceMatch[1]) };

  return null;
}

function isVideoStory(story: Story) {
  return story.type === "VIDEO" || story.type === "LIVE";
}

function canInlineVideo(url?: string | null) {
  const value = (url || "").trim();
  return /^(blob:|data:video)/i.test(value) || /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(value);
}

function storyPoster(story: Story) {
  return (
    story.posterUrl ||
    story.relations?.find((relation) => Boolean(relation.image))?.image ||
    (isVideoStory(story) ? STORY_VIDEO_FALLBACK_POSTER : "")
  );
}

function storyVisual(story: Story) {
  if (story.type === "IMAGE") return story.mediaUrl || storyPoster(story);
  return storyPoster(story);
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

function isPreviewElementVisible(element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);
  return (
    rect.width > 0 &&
    rect.height > 0 &&
    rect.bottom > 0 &&
    rect.right > 0 &&
    rect.top < window.innerHeight &&
    rect.left < window.innerWidth &&
    style.display !== "none" &&
    style.visibility !== "hidden"
  );
}

function StoryMedia({
  story,
  expanded,
  soundEnabled = false,
  paused = false,
  onVideoProgress,
  onVideoEnded,
  onTogglePaused,
  allowPreviewVideo = false,
}: {
  story: Story;
  expanded: boolean;
  soundEnabled?: boolean;
  paused?: boolean;
  onVideoProgress?: (progress: number) => void;
  onVideoEnded?: () => void;
  onTogglePaused?: () => void;
  allowPreviewVideo?: boolean;
}) {
  const [previewHost, setPreviewHost] = useState<HTMLElement | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoLoading, setVideoLoading] = useState(false);
  const [previewVideoEnabled, setPreviewVideoEnabled] = useState(false);
  const src = storyVisual(story);
  const hasInlineVideo = Boolean(isVideoStory(story) && story.mediaUrl && canInlineVideo(story.mediaUrl));
  const showVideo = Boolean((expanded || previewVideoEnabled) && hasInlineVideo);
  const videoActive = expanded || previewVideoEnabled;
  const setVideoNode = useCallback((node: HTMLVideoElement | null) => {
    videoRef.current = node;
    setPreviewHost(node);
  }, []);

  useEffect(() => {
    setPreviewVisible(false);
    if (!allowPreviewVideo || !previewHost || typeof window === "undefined") return;

    const markVisible = () => {
      setPreviewVisible(isPreviewElementVisible(previewHost));
    };

    if (!("IntersectionObserver" in window)) {
      markVisible();
      return;
    }

    markVisible();
    const raf = window.requestAnimationFrame(markVisible);
    const fallbackTimer = window.setTimeout(markVisible, 350);
    const observer = new IntersectionObserver(
      ([entry]) => {
        setPreviewVisible(Boolean(entry?.isIntersecting && entry.intersectionRatio > 0) || isPreviewElementVisible(previewHost));
      },
      { threshold: 0.15 },
    );
    observer.observe(previewHost);
    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(raf);
      window.clearTimeout(fallbackTimer);
    };
  }, [allowPreviewVideo, previewHost]);

  useEffect(() => {
    setVideoLoading(showVideo && expanded);
  }, [expanded, showVideo, story.mediaUrl]);

  useEffect(() => {
    setPreviewVideoEnabled(false);
    if (expanded || !allowPreviewVideo || !previewVisible || !hasInlineVideo || !story.mediaUrl) return;
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mediaQuery.matches) return;

    const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    if (connection?.saveData || /(^|-)2g$/i.test(connection?.effectiveType || "")) return;

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(story.mediaUrl || "", { method: "HEAD", cache: "force-cache" });
        const bytes = Number(response.headers.get("content-length") || 0);
        if (!cancelled && bytes > 0 && bytes <= STORY_PREVIEW_VIDEO_MAX_BYTES) {
          setPreviewVideoEnabled(true);
        }
      } catch {
        // If the server cannot answer HEAD, keep the compact widget lightweight.
      }
    }, STORY_PREVIEW_VIDEO_DELAY_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [allowPreviewVideo, expanded, hasInlineVideo, previewVisible, story.mediaUrl]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoActive) return;
    if (expanded && paused) {
      video.pause();
      return;
    }
    video.play().catch(() => null);
  }, [expanded, paused, previewVideoEnabled, story.mediaUrl, videoActive]);

  if (showVideo) {
    return (
      <div className="relative h-full w-full bg-background">
        <video
          ref={setVideoNode}
          className="h-full w-full bg-background object-cover"
          src={story.mediaUrl || undefined}
          poster={story.posterUrl || undefined}
          playsInline
          muted={!expanded || !soundEnabled}
          loop={!expanded}
          autoPlay={videoActive}
          controls={false}
          preload="metadata"
          onClick={() => {
            if (expanded) onTogglePaused?.();
          }}
          onLoadedMetadata={(event) => {
            const duration = event.currentTarget.duration;
            if (Number.isFinite(duration) && duration > 0) onVideoProgress?.(0);
          }}
          onLoadedData={() => setVideoLoading(false)}
          onCanPlay={() => setVideoLoading(false)}
          onPlaying={() => setVideoLoading(false)}
          onWaiting={() => setVideoLoading(true)}
          onTimeUpdate={(event) => {
            const video = event.currentTarget;
            if (expanded && Number.isFinite(video.duration) && video.duration > 0) {
              onVideoProgress?.(Math.min(1, video.currentTime / video.duration));
            }
          }}
          onEnded={expanded ? onVideoEnded : undefined}
        />
        {videoLoading && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/55 text-primary">
            <CirclePlay className="h-12 w-12 animate-pulse" />
          </div>
        )}
      </div>
    );
  }

  if (src) {
    return (
      <img
        ref={setPreviewHost}
        src={src}
        alt={story.title}
        className="h-full w-full bg-background object-cover"
        loading="lazy"
        decoding="async"
      />
    );
  }

  if (isVideoStory(story)) {
    return (
      <div ref={setPreviewHost} className="flex h-full w-full items-center justify-center bg-card text-primary">
        <CirclePlay className="h-10 w-10" />
      </div>
    );
  }

  return (
    <div ref={setPreviewHost} className="flex h-full w-full items-center justify-center bg-card text-primary">
      <Sparkles className="h-10 w-10" />
    </div>
  );
}

export function StoriesWidget({ initialStories }: { initialStories: Story[] }) {
  const pathname = usePathname();
  const [stories, setStories] = useState<Story[]>(initialStories);
  const [index, setIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [hidden, setHidden] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem(STORIES_WIDGET_HIDDEN_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [paused, setPaused] = useState(false);
  const [storyProgress, setStoryProgress] = useState(0);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [lockPageScroll, setLockPageScroll] = useState(false);
  const viewedRef = useRef<Set<string>>(new Set());
  const floatingChromeHidden = useFloatingChromeHidden();
  useAdminOverlayGuard(lockPageScroll);

  const entity = useMemo(() => deriveEntity(pathname), [pathname]);
  const current = stories[index] || stories[0];
  const total = stories.length;

  useEffect(() => {
    try {
      if (hidden) window.localStorage.setItem(STORIES_WIDGET_HIDDEN_KEY, "1");
      else window.localStorage.removeItem(STORIES_WIDGET_HIDDEN_KEY);
    } catch {
      // Storage can be unavailable in private modes; the widget still works for this session.
    }
  }, [hidden]);

  useEffect(() => {
    let cancelled = false;
    if (!entity) {
      setStories(initialStories);
      setIndex(0);
      return;
    }

    const params = new URLSearchParams({
      entityType: entity.entityType,
      entityId: entity.entityId,
      take: "18",
    });

    fetch(`/api/stories?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        const nextStories = Array.isArray(data?.stories) ? data.stories : initialStories;
        setStories(nextStories.length > 0 ? nextStories : initialStories);
        setIndex(0);
      })
      .catch(() => {
        if (!cancelled) {
          setStories(initialStories);
          setIndex(0);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [entity, initialStories]);

  useEffect(() => {
    if (!current || expanded || hidden || total <= 1) return;
    const timer = window.setInterval(() => {
      setIndex((value) => (value + 1) % total);
    }, 6500);
    return () => window.clearInterval(timer);
  }, [current, expanded, hidden, total]);

  useEffect(() => {
    if (!current || hidden || !expanded || viewedRef.current.has(current.id)) return;
    viewedRef.current.add(current.id);
    fetch(`/api/stories/${current.id}/view`, { method: "POST" }).catch(() => null);
  }, [current, expanded, hidden]);

  useEffect(() => {
    setStoryProgress(0);
    setDetailsOpen(false);
    setPaused(false);
  }, [current?.id, expanded]);

  useEffect(() => {
    if (!expanded || typeof window === "undefined") {
      setLockPageScroll(false);
      return;
    }

    const mediaQuery = window.matchMedia("(max-width: 1023px)");
    const syncLock = () => setLockPageScroll(mediaQuery.matches);
    syncLock();
    mediaQuery.addEventListener("change", syncLock);
    return () => {
      mediaQuery.removeEventListener("change", syncLock);
      setLockPageScroll(false);
    };
  }, [expanded]);

  useEffect(() => {
    if (!expanded || detailsOpen || paused || !current) return;
    if (isVideoStory(current) && current.mediaUrl && canInlineVideo(current.mediaUrl)) return;

    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      const progress = Math.min(1, (Date.now() - startedAt) / PHOTO_STORY_MS);
      setStoryProgress(progress);
      if (progress >= 1) {
        window.clearInterval(timer);
        if (total > 1) setIndex((value) => (value + 1) % total);
      }
    }, 80);

    return () => window.clearInterval(timer);
  }, [current, expanded, detailsOpen, paused, total]);

  if (!current || total === 0 || (floatingChromeHidden && !expanded)) return null;

  const next = () => {
    setStoryProgress(0);
    setPaused(false);
    setIndex((value) => (value + 1) % total);
  };
  const prev = () => {
    setStoryProgress(0);
    setPaused(false);
    setIndex((value) => (value - 1 + total) % total);
  };
  const relatedActions = storyRelations(current).slice(0, 6);
  const firstAction = relatedActions.find((relation) => relation.ctaUrl);
  const linked = relatedActions.length > 0;
  const actionHref = current.ctaUrl || firstAction?.ctaUrl || (current.type === "LIVE" && current.mediaUrl ? current.mediaUrl : "");
  const hasInlineVideo = isVideoStory(current) && Boolean(current.mediaUrl) && canInlineVideo(current.mediaUrl);
  const compactLabel = current.type === "LIVE" ? "LIVE" : "Обзор";
  const openStory = () => {
    setSoundEnabled(false);
    setPaused(false);
    setExpanded(true);
  };
  const closeStory = () => {
    setExpanded(false);
    setSoundEnabled(false);
    setPaused(false);
    setStoryProgress(0);
  };
  const hideWidget = () => {
    setHidden(true);
    closeStory();
  };
  const storyFrozen = paused || detailsOpen;
  const toggleStoryPaused = () => {
    if (storyFrozen) {
      setDetailsOpen(false);
      setPaused(false);
      return;
    }
    setPaused(true);
  };

  if (hidden) {
    return (
      <>
        <button
          type="button"
          onClick={() => setHidden(false)}
          data-store-stories-side-tab
          className="group fixed right-0 z-[44] hidden h-[104px] w-11 items-center justify-center rounded-l-2xl border border-r-0 border-primary/28 bg-card text-primary shadow-xl transition-colors hover:border-primary/55 sm:flex"
          style={{ bottom: "calc(6.75rem + env(safe-area-inset-bottom, 0px))" }}
          aria-label="Показать сторис"
          title="Показать сторис"
        >
          <span className="absolute right-0 top-3 h-8 w-0.5 rounded-l-full bg-primary" />
          <CirclePlay className="h-5 w-5" />
          <span className="pointer-events-none absolute right-full mr-2 flex min-h-10 items-center gap-2 whitespace-nowrap rounded-full border border-border bg-card px-3 text-xs font-semibold text-foreground opacity-0 transition-opacity group-hover:opacity-100">
            <CirclePlay className="h-3.5 w-3.5 text-primary" />
            Открыть сторис
          </span>
        </button>
        <button
          type="button"
          onClick={() => setHidden(false)}
          data-store-stories-compact-trigger
          data-store-stories-side-tab
          className="fixed right-0 z-[44] flex h-16 w-9 items-center justify-center rounded-l-2xl border border-r-0 border-primary/32 bg-card text-primary shadow-xl shadow-black/20 sm:hidden"
          style={{ bottom: "calc(5.75rem + env(safe-area-inset-bottom, 0px))" }}
          aria-label="Показать сторис"
          title="Показать сторис"
        >
          {current.type === "LIVE" ? <Radio className="h-4 w-4" /> : <CirclePlay className="h-4 w-4" />}
          {current.type === "LIVE" && (
            <span className="absolute right-1.5 top-2 h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.75)]" />
          )}
        </button>
      </>
    );
  }

  return (
    <>
      {!expanded && (
      <div
        data-store-stories-card
        className="fixed right-6 z-[44] hidden w-[152px] xl:block"
        style={{ bottom: "calc(6.75rem + env(safe-area-inset-bottom, 0px))" }}
        aria-label="Сторис продавца"
      >
        <button
          type="button"
          onClick={openStory}
          className="group relative h-[214px] w-full overflow-hidden rounded-2xl border border-primary/28 bg-card shadow-2xl shadow-black/25 transition-colors hover:border-primary/58"
        >
          <StoryMedia story={current} expanded={false} allowPreviewVideo />
          <span className="absolute inset-0 bg-background/68" />
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full border border-border bg-card px-2 py-1 text-[10px] font-semibold text-foreground">
            {current.type === "LIVE" ? <Radio className="h-3 w-3" /> : <CirclePlay className="h-3 w-3" />}
            {current.type === "LIVE" ? "LIVE" : "Видео"}
          </span>
        </button>
        <button
          type="button"
          onClick={hideWidget}
          className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:border-primary/45 hover:text-primary"
          aria-label="Скрыть сторис в бок"
          title="Скрыть сторис в бок"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        <div className="mt-2 flex justify-center gap-1.5">
          {stories.slice(0, 5).map((story, storyIndex) => (
            <button
              key={story.id}
              type="button"
              aria-label={`Сторис ${storyIndex + 1}`}
              onClick={() => setIndex(storyIndex)}
              className={cn(
                "h-1.5 rounded-full transition-all",
                storyIndex === index ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/35",
              )}
            />
          ))}
        </div>
      </div>
      )}

      {!expanded && (
      <div
        data-store-stories-mini-video
        className="fixed right-2 z-[44] h-[112px] w-[76px] sm:hidden"
        style={{ bottom: "calc(5.75rem + env(safe-area-inset-bottom, 0px))" }}
      >
        <button
          type="button"
          onClick={openStory}
          data-store-stories-compact-trigger
          className="relative flex h-full w-full overflow-hidden rounded-2xl border border-border bg-card transition-colors active:scale-[0.97]"
          aria-label="Открыть сторис"
          title={current.title}
        >
          <StoryMedia story={current} expanded={false} allowPreviewVideo />
          <span className="absolute inset-0 bg-background/35" />
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full border border-border/70 bg-card/95 px-1.5 py-0.5 text-[9px] font-bold uppercase leading-none text-foreground">
            {current.type === "LIVE" ? <Radio className="h-2.5 w-2.5 text-primary" /> : <CirclePlay className="h-2.5 w-2.5 text-primary" />}
            {compactLabel}
          </span>
          {current.type === "LIVE" && (
            <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full border-2 border-card bg-emerald-500" />
          )}
        </button>
        <button
          type="button"
          onClick={hideWidget}
          className="absolute -left-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:border-primary/45 hover:text-primary"
          aria-label="Свернуть сторис в бок"
          title="Свернуть в бок"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
      )}

      {!expanded && (
      <div
        data-store-stories-side-tab
        className="group fixed right-0 z-[44] hidden h-[104px] w-11 items-center justify-center rounded-l-2xl border border-r-0 border-primary/28 bg-card text-primary shadow-xl transition-colors hover:border-primary/55 sm:flex xl:hidden"
        style={{ bottom: "calc(6.75rem + env(safe-area-inset-bottom, 0px))" }}
        aria-label="Сторис продавца"
      >
        <button
          type="button"
          onClick={openStory}
          className="relative flex h-full w-full items-center justify-center"
          aria-label="Открыть сторис"
          title={current.title}
        >
          <span className="absolute right-0 top-3 h-8 w-0.5 rounded-l-full bg-primary" />
          {current.type === "LIVE" ? <Radio className="h-5 w-5" /> : <CirclePlay className="h-5 w-5" />}
          <span className="pointer-events-none absolute right-full mr-2 flex min-h-10 max-w-[220px] items-center gap-2 whitespace-nowrap rounded-full border border-border bg-card px-3 text-xs font-semibold text-foreground opacity-0 shadow-xl transition-opacity group-hover:opacity-100">
            {current.type === "LIVE" ? <Radio className="h-3.5 w-3.5 text-primary" /> : <CirclePlay className="h-3.5 w-3.5 text-primary" />}
            <span className="max-w-[160px] truncate">{current.title}</span>
          </span>
        </button>
        <button
          type="button"
          onClick={hideWidget}
          className="absolute -left-3 -top-3 flex h-7 w-7 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:border-primary/45 hover:text-primary"
          aria-label="Скрыть сторис в бок"
          title="Скрыть сторис"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      )}

      {expanded && (
        <PopupPortal>
        <div className="store-story-overlay fixed inset-0 z-[120] flex items-center justify-center bg-background/96 p-2 sm:p-4" onClick={closeStory}>
          <div className="store-story-side-panel relative flex w-full max-w-[430px] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-black/40" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full border border-primary/35 bg-primary/10 px-2 py-1 text-[10px] font-semibold uppercase text-primary">
                    {current.type === "LIVE" ? <Radio className="h-3 w-3" /> : <CirclePlay className="h-3 w-3" />}
                    {current.type === "LIVE" ? "Live" : "Stories"}
                  </span>
                  {linked && (
                    <span className="rounded-full border border-border px-2 py-1 text-[10px] text-muted-foreground">
                      связано
                    </span>
                  )}
                </div>
                <h2 className="mt-2 truncate text-sm font-semibold">{current.title}</h2>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    hideWidget();
                  }}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-border text-muted-foreground transition-colors hover:text-foreground"
                  aria-label="Скрыть сторис"
                  title="Скрыть сторис"
                >
                  <Eye className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={closeStory}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-border text-muted-foreground transition-colors hover:text-foreground"
                  aria-label="Закрыть сторис"
                  title="Закрыть сторис"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {total > 1 && (
              <div className="flex gap-1 border-b border-border px-3 py-2" aria-label="Прогресс сторис">
                {stories.map((story, storyIndex) => (
                  <button
                    key={story.id}
                    type="button"
                    onClick={() => {
                      setStoryProgress(0);
                      setIndex(storyIndex);
                    }}
                    className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"
                    aria-label={`Сторис ${storyIndex + 1}`}
                  >
                    <span
                      className="block h-full rounded-full bg-primary transition-[width] duration-100"
                      style={{
                        width:
                          storyIndex < index
                            ? "100%"
                            : storyIndex === index
                              ? `${Math.max(3, storyProgress * 100)}%`
                              : "0%",
                      }}
                    />
                  </button>
                ))}
              </div>
            )}

            <div className="store-story-frame relative aspect-[9/16] shrink-0 bg-background">
              <StoryMedia
                story={current}
                expanded
                soundEnabled={soundEnabled}
                paused={storyFrozen}
                onTogglePaused={toggleStoryPaused}
                onVideoProgress={(progress) => {
                  if (!storyFrozen) setStoryProgress(progress);
                }}
                onVideoEnded={() => {
                  if (storyFrozen) return;
                  setStoryProgress(1);
                  if (total > 1) setIndex((value) => (value + 1) % total);
                }}
              />
              {hasInlineVideo && (
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
                story={current}
                relations={relatedActions}
                actionHref={actionHref}
                expanded={detailsOpen}
                onToggle={() => setDetailsOpen((open) => !open)}
                onNavigate={() => setExpanded(false)}
              />
            </div>
          </div>
        </div>
        </PopupPortal>
      )}
    </>
  );
}
