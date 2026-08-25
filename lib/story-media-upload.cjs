const path = require("node:path");

const { createStoryMediaJob } = require("./story-media-jobs.cjs");
const { shouldOptimizeStoryVideo } = require("./story-media-policy.cjs");

const STORY_VIDEO_EXTENSIONS = new Set(["m4v", "mov", "mp4", "webm"]);

function safeUploadStem(value) {
  const stem = String(value || "").trim();
  if (!/^[a-zA-Z0-9_-]{3,120}$/.test(stem)) throw new Error("Некорректное имя видео сторис");
  return stem;
}

function safeExtension(value) {
  const extension = String(value || "").trim().toLowerCase().replace(/^\./, "");
  if (!STORY_VIDEO_EXTENSIONS.has(extension)) throw new Error("Неподдерживаемый формат видео сторис");
  return extension;
}

function planStoryVideoUpload({ uploadStem, extension, mime, fileSize, publicRoot }) {
  const safeStem = safeUploadStem(uploadStem);
  const safeExt = safeExtension(extension);
  const safePublicRoot = path.resolve(publicRoot);
  const optimize = shouldOptimizeStoryVideo({ size: fileSize, extension: safeExt, mime });
  const relativeFile = optimize ? path.join("originals", `${safeStem}.${safeExt}`) : `${safeStem}.${safeExt}`;
  const relativeUrl = relativeFile.split(path.sep).join("/");
  return {
    optimize,
    outputStem: safeStem,
    publicRoot: safePublicRoot,
    sourcePath: path.join(safePublicRoot, relativeFile),
    sourceUrl: `/images/stories/${relativeUrl}`,
  };
}

function completeStoryVideoUpload(plan, options = {}) {
  if (!plan?.optimize) {
    return {
      jobId: null,
      status: "READY",
      originalUrl: plan.sourceUrl,
      url: plan.sourceUrl,
      posterUrl: null,
      optimized: false,
    };
  }
  const job = createStoryMediaJob({
    sourcePath: plan.sourcePath,
    sourceUrl: plan.sourceUrl,
    outputStem: plan.outputStem,
    publicRoot: plan.publicRoot,
    jobsRoot: options.jobsRoot,
    ffmpegPath: options.ffmpegPath,
    publishTarget: options.publishTarget || null,
    runInBackground: options.runInBackground !== false,
  });
  return {
    jobId: job.id,
    status: job.status,
    originalUrl: job.originalUrl,
    url: job.url,
    posterUrl: job.posterUrl,
    optimized: true,
  };
}

module.exports = {
  completeStoryVideoUpload,
  planStoryVideoUpload,
};
