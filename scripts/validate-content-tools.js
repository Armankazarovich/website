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
    file: "app/admin/media/media-client.tsx",
    label: "media picker supports images, videos and launch-context folders",
    patterns: [
      'type PickerKind = "image" | "video" | "all"',
      "pickerKind?: PickerKind",
      "initialFolder?: string",
      'pickerKind === "all"',
      "initialFolder ??",
    ],
  },
  {
    file: "app/api/admin/media/route.ts",
    label: "media library sees launch content folders and usage",
    patterns: [
      '"services"',
      '"stories"',
      "prisma.service.findMany",
      "prisma.post.findMany",
      "prisma.storeStory.findMany",
      "MediaUsage",
    ],
  },
  {
    file: "app/api/admin/upload/route.ts",
    label: "upload endpoint accepts service and story media",
    patterns: ['"services"', '"stories"', "VIDEO_MAX_SIZE"],
  },
  {
    file: "app/admin/stories/page.tsx",
    label: "story editor uses real library picker, video media and copy feedback",
    patterns: [
      "pickerKind={mediaPickerTarget",
      'initialFolder="stories"',
      "shareCopied",
      "setShareCopied(true)",
      "uploadFile(file, \"media\")",
    ],
  },
  {
    file: "app/admin/services/page.tsx",
    label: "service editor uses unified media upload and library",
    patterns: [
      "MediaPickerModal",
      "uploadServiceMedia",
      'data.append("folder", "services")',
      'initialFolder="services"',
      "addMediaUrl",
    ],
  },
  {
    file: "app/admin/posts/page.tsx",
    label: "article editor uses system modal and media library",
    patterns: [
      "AdminModal",
      "GenerateDialog",
      'initialFolder="posts"',
      "handleUpload",
      "MediaPickerModal",
    ],
  },
  {
    file: "components/store/stories-widget.tsx",
    label: "public story widget uses responsive card, side tab and compact mobile trigger",
    patterns: [
      "data-store-stories-card",
      "data-store-stories-side-tab",
      "data-store-stories-compact-trigger",
      "rounded-l-2xl",
      "store-story-side-panel",
      "calc(6.75rem + env(safe-area-inset-bottom, 0px))",
      "calc(5.75rem + env(safe-area-inset-bottom, 0px))",
      "STORIES_WIDGET_HIDDEN_KEY",
      "hideWidget",
    ],
  },
  {
    file: "app/globals.css",
    label: "story side panel stays responsive to viewport and right edge",
    patterns: [
      ".store-story-side-panel",
      "right: clamp(1rem, 1.8vw, 2rem)",
      "width: min(",
      "calc((100dvh - var(--store-story-panel-top)",
    ],
  },
];

const failures = [];

for (const check of checks) {
  if (!exists(check.file)) {
    failures.push(`${check.file}: missing file`);
    continue;
  }
  const text = read(check.file);
  const missing = check.patterns.filter((pattern) => !text.includes(pattern));
  if (missing.length) failures.push(`${check.file}: ${check.label}; missing ${missing.join(", ")}`);
}

if (failures.length) {
  console.error("Content tools check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Content tools check passed: ${checks.length} gates.`);
