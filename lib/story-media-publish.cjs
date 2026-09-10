const fs = require("node:fs");
const path = require("node:path");

const { isSafeStoryMediaJobId } = require("./story-media-policy.cjs");

function validatedTarget(job) {
  const target = job?.publishTarget;
  const storyId = String(target?.storyId || "").trim();
  const tenantId = String(target?.tenantId || "").trim();
  const expectedUrl = String(target?.expectedUrl || "").trim();
  const outputUrl = String(job?.outputUrl || "").trim();
  if (!storyId || !tenantId || !expectedUrl.startsWith("/images/stories/") || !outputUrl.startsWith("/images/stories/")) {
    throw new Error("Некорректная цель публикации сторис");
  }
  return { storyId, tenantId, expectedUrl, outputUrl };
}

function createPrismaStoryMediaStore() {
  const { PrismaClient } = require("@prisma/client");
  const prisma = new PrismaClient();
  return {
    async getStory({ storyId, tenantId }) {
      return prisma.storeStory.findFirst({
        where: { id: storyId, tenantId },
        select: { id: true, tenantId: true, mediaUrl: true, posterUrl: true },
      });
    },
    async updateMediaUrl({ storyId, tenantId, expectedUrl, nextUrl, posterUrl }) {
      const result = await prisma.storeStory.updateMany({
        where: { id: storyId, tenantId, mediaUrl: expectedUrl },
        data: posterUrl ? { mediaUrl: nextUrl, posterUrl } : { mediaUrl: nextUrl },
      });
      return result.count;
    },
    async close() {
      await prisma.$disconnect();
    },
  };
}

async function changeStoryMedia(job, store, direction) {
  const target = validatedTarget(job);
  const oldUrl = target.expectedUrl;
  const newUrl = target.outputUrl;
  const expectedUrl = direction === "publish" ? oldUrl : newUrl;
  const nextUrl = direction === "publish" ? newUrl : oldUrl;
  const story = await store.getStory({ storyId: target.storyId, tenantId: target.tenantId });
  if (!story) throw new Error("Сторис для публикации не найдена");
  if (story.mediaUrl === nextUrl) return { changed: false, oldUrl, newUrl, currentUrl: nextUrl };
  if (story.mediaUrl !== expectedUrl) {
    throw new Error("Ссылка сторис изменилась после запуска обработки; публикация остановлена");
  }
  // Обложка: если у сторис её нет, при публикации ставим кадр из готовой
  // копии. Обложку менеджера не трогаем никогда; откат обложку не снимает —
  // это кадр того же ролика.
  const posterUrl =
    direction === "publish" &&
    !String(story.posterUrl || "").trim() &&
    String(job?.posterUrl || "").startsWith("/images/stories/")
      ? job.posterUrl
      : undefined;
  const count = await store.updateMediaUrl({
    storyId: target.storyId,
    tenantId: target.tenantId,
    expectedUrl,
    nextUrl,
    posterUrl,
  });
  if (count !== 1) throw new Error("Сторис изменилась во время публикации; публикация остановлена");
  return { changed: true, oldUrl, newUrl, currentUrl: nextUrl, posterSet: Boolean(posterUrl) };
}

async function publishStoryMedia(job, inputStore) {
  const store = inputStore || createPrismaStoryMediaStore();
  try {
    return await changeStoryMedia(job, store, "publish");
  } finally {
    if (!inputStore) await store.close();
  }
}

async function rollbackStoryMedia(job, inputStore) {
  const store = inputStore || createPrismaStoryMediaStore();
  try {
    return await changeStoryMedia(job, store, "rollback");
  } finally {
    if (!inputStore) await store.close();
  }
}

function safeCliJobPath(value) {
  const jobPath = path.resolve(String(value || ""));
  const job = JSON.parse(fs.readFileSync(jobPath, "utf8"));
  if (!isSafeStoryMediaJobId(job?.id) || path.basename(jobPath) !== `${job.id}.json`) {
    throw new Error("Некорректное задание публикации сторис");
  }
  const jobsRoot = path.resolve(job.jobsRoot || "");
  if (path.dirname(jobPath) !== jobsRoot) throw new Error("Задание находится вне очереди сторис");
  return { jobPath, job };
}

if (require.main === module) {
  const action = process.argv[2];
  const inputPath = process.argv[3];
  (async () => {
    const { job } = safeCliJobPath(inputPath);
    if (action === "publish") await publishStoryMedia(job);
    else if (action === "rollback") await rollbackStoryMedia(job);
    else throw new Error("Неизвестное действие публикации сторис");
  })().then(
    () => process.exit(0),
    (error) => {
      console.error(String(error?.message || error));
      process.exit(1);
    },
  );
}

module.exports = {
  createPrismaStoryMediaStore,
  publishStoryMedia,
  rollbackStoryMedia,
  validatedTarget,
};
