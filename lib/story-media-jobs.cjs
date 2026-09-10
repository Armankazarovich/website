const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");

const { isSafeStoryMediaJobId } = require("./story-media-policy.cjs");
const { rollbackStoryMedia } = require("./story-media-publish.cjs");

const STORY_MEDIA_URL_PREFIX = "/images/stories/";

function defaultJobsRoot() {
  return path.join(process.cwd(), ".story-media-jobs");
}

function defaultPublicRoot() {
  return path.join(process.cwd(), "public", "images", "stories");
}

function isInside(root, candidate) {
  const safeRoot = path.resolve(root);
  const safeCandidate = path.resolve(candidate);
  return safeCandidate === safeRoot || safeCandidate.startsWith(`${safeRoot}${path.sep}`);
}

function safeJobPath(id, jobsRoot = defaultJobsRoot()) {
  if (!isSafeStoryMediaJobId(id)) throw new Error("Некорректное задание обработки видео");
  return path.join(path.resolve(jobsRoot), `${id}.json`);
}

function atomicWriteJson(filePath, value) {
  const temporaryPath = `${filePath}.${process.pid}.tmp`;
  fs.writeFileSync(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  fs.renameSync(temporaryPath, filePath);
}

function safeOutputStem(value) {
  const stem = String(value || "").trim();
  if (!/^[a-zA-Z0-9_-]{3,120}$/.test(stem)) throw new Error("Некорректное имя web-копии");
  return stem;
}

function normalizeStoryMediaUrl(value) {
  const raw = String(value || "").trim();
  if (!raw.startsWith(STORY_MEDIA_URL_PREFIX) || raw.includes("\\") || raw.includes("\0")) {
    throw new Error("Поддерживаются только локальные видео сторис");
  }
  let decoded;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    throw new Error("Некорректная ссылка на видео сторис");
  }
  const relative = decoded.slice(STORY_MEDIA_URL_PREFIX.length);
  if (!relative || relative.split("/").some((segment) => !segment || segment === "." || segment === "..")) {
    throw new Error("Некорректная ссылка на видео сторис");
  }
  return `${STORY_MEDIA_URL_PREFIX}${relative}`;
}

function resolveStoryMediaSourceFromUrl(value, { publicRoot = defaultPublicRoot() } = {}) {
  const normalized = normalizeStoryMediaUrl(value);
  const relative = normalized.slice(STORY_MEDIA_URL_PREFIX.length).split("/").join(path.sep);
  const candidate = path.resolve(publicRoot, relative);
  if (!isInside(publicRoot, candidate)) throw new Error("Видео находится вне папки сторис");
  return candidate;
}

function publicStoryUrl(fileName) {
  return `${STORY_MEDIA_URL_PREFIX}${fileName}`;
}

function startStoryMediaWorker(jobPath) {
  const workerPath = path.join(process.cwd(), "lib", "story-media-worker.cjs");
  if (!fs.existsSync(workerPath)) throw new Error("Обработчик видео не найден в релизе");
  const child = spawn(process.execPath, [workerPath, jobPath], {
    cwd: process.cwd(),
    detached: true,
    stdio: "ignore",
    windowsHide: true,
    env: process.env,
  });
  child.unref();
}

function storyMediaWorkerIsActive(jobsRoot = defaultJobsRoot()) {
  const lockPath = path.join(path.resolve(jobsRoot), "worker.lock");
  if (!fs.existsSync(lockPath)) return false;
  try {
    const lock = JSON.parse(fs.readFileSync(lockPath, "utf8"));
    const pid = Number(lock.pid);
    if (!Number.isInteger(pid) || pid < 1) return false;
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function toPublicJob(job) {
  return {
    id: job.id,
    status: job.status,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    originalUrl: job.sourceUrl,
    url: job.url || null,
    posterUrl: job.posterUrl && job.status === "READY" ? job.posterUrl : null,
    media: job.status === "READY" ? job.media || null : null,
    error: job.status === "FAILED" ? job.error || "Не получилось облегчить видео. Ваш файл цел — попробуйте ещё раз." : null,
    published: Boolean(job.published),
    rolledBack: Boolean(job.rolledBackAt && !job.published),
    canRetry: job.status === "FAILED",
    canRollback: Boolean(job.published && job.rollback?.oldUrl && job.rollback?.newUrl),
  };
}

function createStoryMediaJob({
  sourcePath,
  sourceUrl,
  outputStem,
  jobsRoot = defaultJobsRoot(),
  publicRoot = defaultPublicRoot(),
  ffmpegPath = require("ffmpeg-static"),
  publishTarget = null,
  runInBackground = true,
}) {
  const safeJobsRoot = path.resolve(jobsRoot);
  const safePublicRoot = path.resolve(publicRoot);
  const safeSourcePath = path.resolve(sourcePath);
  const safeSourceUrl = normalizeStoryMediaUrl(sourceUrl);
  const stem = safeOutputStem(outputStem);
  if (!isInside(safePublicRoot, safeSourcePath)) throw new Error("Исходник находится вне папки сторис");
  if (!fs.existsSync(safeSourcePath) || !fs.statSync(safeSourcePath).isFile()) throw new Error("Исходное видео не найдено");
  if (!ffmpegPath || !fs.existsSync(ffmpegPath)) throw new Error("Сервис подготовки видео временно недоступен");

  fs.mkdirSync(safeJobsRoot, { recursive: true });
  fs.mkdirSync(safePublicRoot, { recursive: true });
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const outputFileName = `${stem}-web.mp4`;
  const posterFileName = `${stem}-poster.jpg`;
  const outputPath = path.join(safePublicRoot, outputFileName);
  const posterPath = path.join(safePublicRoot, posterFileName);
  if (fs.existsSync(outputPath) || fs.existsSync(posterPath)) throw new Error("Web-копия с таким именем уже существует");

  const job = {
    version: 1,
    id,
    status: "QUEUED",
    createdAt: now,
    updatedAt: now,
    jobsRoot: safeJobsRoot,
    publicRoot: safePublicRoot,
    sourcePath: safeSourcePath,
    sourceUrl: safeSourceUrl,
    outputPath,
    outputUrl: publicStoryUrl(outputFileName),
    posterPath,
    posterUrl: publicStoryUrl(posterFileName),
    ffmpegPath: path.resolve(ffmpegPath),
    publishTarget,
  };
  const jobPath = safeJobPath(id, safeJobsRoot);
  atomicWriteJson(jobPath, job);
  if (runInBackground) startStoryMediaWorker(jobPath);
  return toPublicJob(job);
}

function getStoryMediaJob(id, { jobsRoot = defaultJobsRoot() } = {}) {
  const jobPath = safeJobPath(id, jobsRoot);
  if (!fs.existsSync(jobPath)) return null;
  const job = JSON.parse(fs.readFileSync(jobPath, "utf8"));
  if (job.id !== id) throw new Error("Некорректное задание обработки видео");
  return job;
}

function getStoryMediaJobPublic(id, options = {}) {
  const job = getStoryMediaJob(id, options);
  return job ? toPublicJob(job) : null;
}

function findLatestStoryMediaJobForStory(storyId, tenantId, { jobsRoot = defaultJobsRoot() } = {}) {
  const safeStoryId = String(storyId || "").trim();
  const safeTenantId = String(tenantId || "").trim();
  const safeJobsRoot = path.resolve(jobsRoot);
  if (!safeStoryId || !safeTenantId || !fs.existsSync(safeJobsRoot)) return null;

  let latest = null;
  for (const entry of fs.readdirSync(safeJobsRoot, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
    const id = entry.name.slice(0, -5);
    if (!isSafeStoryMediaJobId(id)) continue;
    try {
      const job = getStoryMediaJob(id, { jobsRoot: safeJobsRoot });
      if (job?.publishTarget?.storyId !== safeStoryId || job?.publishTarget?.tenantId !== safeTenantId) continue;
      if (!latest || String(job.updatedAt || job.createdAt) > String(latest.updatedAt || latest.createdAt)) latest = job;
    } catch {
      // Ignore unrelated or interrupted receipt files; the selected story stays unchanged.
    }
  }
  return latest ? toPublicJob(latest) : null;
}

function resumeStoryMediaJobIfInterrupted(id, { jobsRoot = defaultJobsRoot(), runInBackground = true } = {}) {
  const jobPath = safeJobPath(id, jobsRoot);
  const job = getStoryMediaJob(id, { jobsRoot });
  if (!job) return null;
  if (job.status === "READY" || job.status === "FAILED" || storyMediaWorkerIsActive(jobsRoot)) {
    return toPublicJob(job);
  }
  const next = {
    ...job,
    status: "QUEUED",
    updatedAt: new Date().toISOString(),
    recoveredAt: new Date().toISOString(),
    error: null,
    diagnostic: null,
  };
  atomicWriteJson(jobPath, next);
  if (runInBackground) startStoryMediaWorker(jobPath);
  return toPublicJob(next);
}

function retryStoryMediaJob(id, { jobsRoot = defaultJobsRoot(), runInBackground = true } = {}) {
  const jobPath = safeJobPath(id, jobsRoot);
  const job = getStoryMediaJob(id, { jobsRoot });
  if (!job) return null;
  if (job.status === "READY") return toPublicJob(job);
  if (job.status !== "FAILED") return resumeStoryMediaJobIfInterrupted(id, { jobsRoot, runInBackground });
  const next = {
    ...job,
    status: "QUEUED",
    updatedAt: new Date().toISOString(),
    retriedAt: new Date().toISOString(),
    error: null,
    diagnostic: null,
  };
  atomicWriteJson(jobPath, next);
  if (runInBackground) startStoryMediaWorker(jobPath);
  return toPublicJob(next);
}

async function rollbackStoryMediaJob(id, { jobsRoot = defaultJobsRoot(), store } = {}) {
  const jobPath = safeJobPath(id, jobsRoot);
  const job = getStoryMediaJob(id, { jobsRoot });
  if (!job) return null;
  if (!job.publishTarget || !job.rollback?.oldUrl || !job.rollback?.newUrl) {
    throw new Error("Для этого видео нет подтверждённого отката");
  }
  if (!job.published) return toPublicJob(job);

  const rollbackResult = await rollbackStoryMedia(job, store);
  const next = {
    ...job,
    published: false,
    updatedAt: new Date().toISOString(),
    rolledBackAt: new Date().toISOString(),
    rollbackResult,
  };
  atomicWriteJson(jobPath, next);
  return toPublicJob(next);
}

module.exports = {
  STORY_MEDIA_URL_PREFIX,
  createStoryMediaJob,
  defaultJobsRoot,
  defaultPublicRoot,
  findLatestStoryMediaJobForStory,
  getStoryMediaJob,
  getStoryMediaJobPublic,
  normalizeStoryMediaUrl,
  resolveStoryMediaSourceFromUrl,
  resumeStoryMediaJobIfInterrupted,
  rollbackStoryMediaJob,
  retryStoryMediaJob,
  startStoryMediaWorker,
  toPublicJob,
};
