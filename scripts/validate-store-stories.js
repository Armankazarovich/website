const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

const checks = [
  {
    file: "prisma/schema.prisma",
    label: "database has stories, views and many-to-one story relations",
    patterns: [
      "model StoreStory",
      "model StoreStoryRelation",
      "relations   StoreStoryRelation[]",
      "story      StoreStory @relation",
      "views       Int",
    ],
  },
  {
    file: "lib/store-story-admin.ts",
    label: "admin write model accepts multi-relations and keeps legacy primary relation",
    patterns: [
      "buildStoryWrite",
      "Array.isArray(body?.relations)",
      "uniqueRelations",
      "RELATION_ENTITY_TYPES",
      "data.entityType",
      "data.entityId",
    ],
  },
  {
    file: "lib/store-stories.ts",
    label: "public story feed prioritizes related stories without hiding the rest",
    patterns: [
      "getPublicStoreStories",
      "relatedStoriesPromise",
      "allStoryRelations",
      "storyPriority",
      "toPublicStory",
      "bumpStoryView",
    ],
  },
  {
    file: "app/api/stories/route.ts",
    label: "public API supports contextual story fetch",
    patterns: ["entityType", "entityId", "take", "getPublicStoreStories"],
  },
  {
    file: "app/api/stories/[id]/view/route.ts",
    label: "public API records story views safely",
    patterns: ["bumpStoryView", "NextResponse.json"],
  },
  {
    file: "app/api/admin/stories/route.ts",
    label: "admin API persists stories with relations",
    patterns: ["requireManager", "buildStoryWrite", "relations", "storyRelationsInclude"],
  },
  {
    file: "app/api/admin/stories/entity-options/route.ts",
    label: "admin editor can choose products, services, promotions and reviews",
    patterns: ["products", "services", "promotions", "reviews", "entityType"],
  },
  {
    file: "app/admin/stories/page.tsx",
    label: "admin editor exposes media, library, sharing and multi-related templates",
    patterns: [
      "normalizeRelations",
      "addRelation",
      "entityOptions",
      "Библиотека",
      "Ссылка для публикации",
      "Связанные товары",
      "автошаблон",
    ],
  },
  {
    file: "app/(store)/layout.tsx",
    label: "store shell mounts global story widget",
    patterns: ["StoriesWidget", "getPublicStoreStories", "initialStories={stories}"],
  },
  {
    file: "app/(store)/stories/page.tsx",
    label: "public stories page renders the commerce story feed",
    patterns: ["StoriesPageClient", "getPublicStoreStories", "/stories", "/catalog"],
  },
  {
    file: "components/store/stories-widget.tsx",
    label: "floating widget supports context, hide/show, sound, progress and related actions",
    patterns: [
      "deriveEntity",
      "/api/stories?",
      "PHOTO_STORY_MS",
      "storyProgress",
      "soundEnabled",
      "relatedActions",
      "StoryActionDrawer",
      "setHidden(true)",
      "onVideoEnded",
      "canInlineVideo",
      "data-store-stories-card",
      "data-store-stories-side-tab",
      "data-store-stories-compact-trigger",
      "xl:block",
      "sm:hidden",
    ],
  },
  {
    file: "components/store/story-action-drawer.tsx",
    label: "story viewer has a collapsible smart drawer for description and related commerce actions",
    patterns: [
      "StoryActionDrawer",
      "expanded",
      "Связано",
      "Описание и действие",
      "relationActionLabel",
      "actionHref",
    ],
  },
  {
    file: "components/store/stories-page-client.tsx",
    label: "public story viewer supports autoplay, video duration, navigation and related actions",
    patterns: [
      "PHOTO_STORY_MS",
      "timerRef",
      "onVideoEnded",
      "RelatedAction",
      "StoryActionDrawer",
      "soundEnabled",
      "StoriesPageClient",
    ],
  },
];

const requiredFiles = [
  "app/api/admin/stories/route.ts",
  "app/api/admin/stories/[id]/route.ts",
  "app/api/admin/stories/entity-options/route.ts",
  "app/api/stories/route.ts",
  "app/api/stories/[id]/view/route.ts",
  "app/admin/stories/page.tsx",
  "app/(store)/stories/page.tsx",
  "components/store/stories-widget.tsx",
  "components/store/story-action-drawer.tsx",
  "components/store/stories-page-client.tsx",
  "lib/store-stories.ts",
  "lib/store-story-admin.ts",
];

const failures = [];

for (const file of requiredFiles) {
  if (!exists(file)) failures.push(`${file}: required story module file is missing`);
}

for (const check of checks) {
  if (!exists(check.file)) continue;
  const text = read(check.file);
  const missing = check.patterns.filter((pattern) => !text.includes(pattern));
  if (missing.length) {
    failures.push(`${check.file}: ${check.label}; missing ${missing.join(", ")}`);
  }
}

if (failures.length) {
  console.error("Store stories check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Store stories check passed: ${checks.length} gates, ${requiredFiles.length} files.`);
