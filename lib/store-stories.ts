import "server-only";

import { prisma } from "@/lib/prisma";

export type StoreStoryKind = "IMAGE" | "VIDEO" | "LIVE";

export type PublicStoreStory = {
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
  relations: PublicStoreStoryRelation[];
};

export type PublicStoreStoryRelation = {
  entityType: string;
  entityId: string;
  label: string | null;
  image: string | null;
  ctaUrl: string | null;
  sortOrder: number;
};

type StoryQuery = {
  take?: number;
  entityType?: string | null;
  entityId?: string | null;
};

function cleanToken(value?: string | null) {
  const text = (value || "").trim();
  return text.length > 0 ? text.slice(0, 120) : null;
}

function storySelect() {
  return {
    id: true,
    type: true,
    title: true,
    subtitle: true,
    description: true,
    mediaUrl: true,
    posterUrl: true,
    ctaLabel: true,
    ctaUrl: true,
    entityType: true,
    entityId: true,
    placement: true,
    pinned: true,
    sortOrder: true,
    views: true,
    createdAt: true,
    relations: {
      select: {
        entityType: true,
        entityId: true,
        label: true,
        image: true,
        ctaUrl: true,
        sortOrder: true,
      },
    },
  } as const;
}

function scheduleWhere(now: Date) {
  return {
    active: true,
    AND: [
      { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
      { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
    ],
  };
}

function toPublicStory(story: any): PublicStoreStory {
  return {
    id: story.id,
    type: story.type,
    title: story.title,
    subtitle: story.subtitle,
    description: story.description,
    mediaUrl: story.mediaUrl,
    posterUrl: story.posterUrl,
    ctaLabel: story.ctaLabel,
    ctaUrl: story.ctaUrl,
    entityType: story.entityType,
    entityId: story.entityId,
    placement: story.placement,
    pinned: story.pinned,
    sortOrder: story.sortOrder,
    views: story.views,
    createdAt: story.createdAt.toISOString(),
    relations: (story.relations || [])
      .slice()
      .sort((a: any, b: any) => a.sortOrder - b.sortOrder)
      .map((relation: any) => ({
        entityType: relation.entityType,
        entityId: relation.entityId,
        label: relation.label,
        image: relation.image,
        ctaUrl: relation.ctaUrl,
        sortOrder: relation.sortOrder,
      })),
  };
}

function legacyStoryRelations(story: any) {
  const storyType = cleanToken(story.entityType);
  if (!storyType) return [];

  return (story.entityId || "")
    .split(/[\s,;]+/)
    .map((item: string) => cleanToken(item))
    .filter(Boolean)
    .map((entityId: string) => ({ entityType: storyType, entityId }));
}

function allStoryRelations(story: any) {
  const explicit = (story.relations || [])
    .map((relation: any) => ({
      entityType: cleanToken(relation.entityType),
      entityId: cleanToken(relation.entityId),
    }))
    .filter((relation: any) => relation.entityType && relation.entityId);

  const seen = new Set<string>();
  return [...explicit, ...legacyStoryRelations(story)].filter((relation: any) => {
    const key = `${relation.entityType}:${relation.entityId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function storyPriority(story: any, relatedType: string | null, relatedId: string | null) {
  const storyType = cleanToken(story.entityType);
  const relations = allStoryRelations(story);

  if (relatedType && relatedId && relations.some((relation: any) => relation.entityType === relatedType && relation.entityId === relatedId)) return 0;
  if (!storyType && relations.length === 0) return 1;
  if (relatedType && storyType === relatedType && !relatedId) return 2;
  return 3;
}

export async function getPublicStoreStories({
  take = 16,
  entityType,
  entityId,
}: StoryQuery = {}): Promise<PublicStoreStory[]> {
  const safeTake = Math.min(Math.max(Number(take) || 16, 1), 80);
  const now = new Date();
  const relatedType = cleanToken(entityType);
  const relatedId = cleanToken(entityId);
  const orderBy = [
    { pinned: "desc" as const },
    { sortOrder: "asc" as const },
    { createdAt: "desc" as const },
  ];

  const baseStoriesPromise = prisma.storeStory.findMany({
    where: scheduleWhere(now),
    select: storySelect(),
    orderBy,
    take: Math.max(safeTake, 80),
  });

  const relatedStoriesPromise = relatedType && relatedId
    ? prisma.storeStory.findMany({
        where: {
          ...scheduleWhere(now),
          OR: [
            { relations: { some: { entityType: relatedType, entityId: relatedId } } },
            { entityType: relatedType, entityId: relatedId },
            { entityType: relatedType, entityId: { contains: relatedId } },
          ],
        },
        select: storySelect(),
        orderBy,
        take: 40,
      })
    : Promise.resolve([]);

  const [baseStories, relatedStories] = await Promise.all([baseStoriesPromise, relatedStoriesPromise]);
  const storyMap = new Map<string, (typeof baseStories)[number]>();
  for (const story of [...relatedStories, ...baseStories]) {
    storyMap.set(story.id, story);
  }
  const stories = Array.from(storyMap.values());

  return stories
    .sort((a, b) => {
      const priorityA = storyPriority(a, relatedType, relatedId);
      const priorityB = storyPriority(b, relatedType, relatedId);
      if (priorityA !== priorityB) return priorityA - priorityB;
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      return b.createdAt.getTime() - a.createdAt.getTime();
    })
    .slice(0, safeTake)
    .map(toPublicStory);
}

export async function bumpStoryView(id: string) {
  if (!id) return;
  await prisma.storeStory.update({
    where: { id },
    data: { views: { increment: 1 } },
  }).catch(() => null);
}
