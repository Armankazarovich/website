const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const {
  buildStoryFfmpegArgs,
  isSafeStoryMediaJobId,
  validateStoryMediaProbe,
} = require("./story-media-policy.cjs");

const WORKER_WAIT_MS = 1_000;
const WORKER_MAX_WAIT_MS = 30 * 60 * 1_000;
const WORKER_STALE_LOCK_MS = 2 * 60 * 60 * 1_000;
const FFMPEG_TIMEOUT_MS = 30 * 60 * 1_000;

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function isInside(root, candidate) {
  const safeRoot = path.resolve(root);
  const safeCandidate = path.resolve(candidate);
  return safeCandidate === safeRoot || safeCandidate.startsWith(`${safeRoot}${path.sep}`);
}

function assertSafeJob(jobPath, job) {
  if (!isSafeStoryMediaJobId(job?.id)) throw new Error("Invalid story media job id");
  if (!job?.jobsRoot || !isInside(job.jobsRoot, jobPath)) throw new Error("Invalid story media job path");
  if (!job?.publicRoot || !isInside(job.publicRoot, job.sourcePath)) throw new Error("Invalid story media source path");
  if (!isInside(job.publicRoot, job.outputPath)) throw new Error("Invalid story media output path");
  if (!isInside(job.publicRoot, job.posterPath)) throw new Error("Invalid story media poster path");
  if (!job?.ffmpegPath || !fs.existsSync(job.ffmpegPath)) throw new Error("Bundled FFmpeg is unavailable");
}

function atomicWriteJson(filePath, value) {
  const temporaryPath = `${filePath}.${process.pid}.tmp`;
  fs.writeFileSync(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  fs.renameSync(temporaryPath, filePath);
}

function updateJob(jobPath, job, patchValue) {
  const next = {
    ...job,
    ...patchValue,
    updatedAt: new Date().toISOString(),
  };
  atomicWriteJson(jobPath, next);
  return next;
}

function processExists(pid) {
  if (!Number.isInteger(pid) || pid < 1) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function acquireWorkerLock(jobsRoot) {
  const lockPath = path.join(jobsRoot, "worker.lock");
  const startedAt = Date.now();
  while (Date.now() - startedAt < WORKER_MAX_WAIT_MS) {
    try {
      const fd = fs.openSync(lockPath, "wx");
      fs.writeFileSync(fd, JSON.stringify({ pid: process.pid, createdAt: new Date().toISOString() }), "utf8");
      return { fd, lockPath };
    } catch (error) {
      if (error?.code !== "EEXIST") throw error;
      let stale = false;
      try {
        const lock = JSON.parse(fs.readFileSync(lockPath, "utf8"));
        const age = Date.now() - fs.statSync(lockPath).mtimeMs;
        stale = age > WORKER_STALE_LOCK_MS || !processExists(Number(lock.pid));
      } catch {
        stale = true;
      }
      if (stale) {
        try {
          fs.rmSync(lockPath, { force: true });
        } catch {
          // Another worker may have refreshed the lock; wait and try again.
        }
        continue;
      }
      sleep(WORKER_WAIT_MS);
    }
  }
  throw new Error("Story media worker queue timeout");
}

function releaseWorkerLock(lock) {
  if (!lock) return;
  try {
    fs.closeSync(lock.fd);
  } catch {
    // The descriptor may already be closed during process shutdown.
  }
  try {
    const current = JSON.parse(fs.readFileSync(lock.lockPath, "utf8"));
    if (Number(current.pid) === process.pid) fs.rmSync(lock.lockPath, { force: true });
  } catch {
    // A missing lock is already released.
  }
}

function runFfmpeg(ffmpegPath, args, timeout = FFMPEG_TIMEOUT_MS) {
  const result = spawnSync(ffmpegPath, args, {
    encoding: "utf8",
    windowsHide: true,
    timeout,
    maxBuffer: 8 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const diagnostic = String(result.stderr || result.stdout || "FFmpeg failed").trim().slice(-4_000);
    const error = new Error("FFmpeg failed");
    error.diagnostic = diagnostic;
    throw error;
  }
  return result;
}

function durationSeconds(text) {
  const match = String(text).match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/i);
  if (!match) return 0;
  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
}

function parseFfmpegMedia(text, outputSize) {
  const lines = String(text).split(/\r?\n/);
  const videoLine = lines.find((line) => line.includes("Video:")) || "";
  const audioLine = lines.find((line) => line.includes("Audio:")) || "";
  const videoCodec = videoLine.match(/Video:\s*([^\s,(]+)/i)?.[1]?.toLowerCase() || "";
  const audioCodec = audioLine.match(/Audio:\s*([^\s,(]+)/i)?.[1]?.toLowerCase() || null;
  const pixelFormat = videoLine.match(/,\s*(yuv[a-z0-9]+)/i)?.[1]?.toLowerCase() || "";
  const dimensions = videoLine.match(/(?:^|[\s,])(\d{2,5})x(\d{2,5})(?:[\s,\[]|$)/);
  const frameRate = Number(videoLine.match(/([0-9]+(?:\.[0-9]+)?)\s*fps\b/i)?.[1] || 0);
  const width = Number(dimensions?.[1] || 0);
  const height = Number(dimensions?.[2] || 0);
  return {
    streams: [
      {
        codec_type: "video",
        codec_name: videoCodec,
        width,
        height,
        pix_fmt: pixelFormat,
        avg_frame_rate: `${frameRate || 0}/1`,
      },
      ...(audioCodec ? [{ codec_type: "audio", codec_name: audioCodec }] : []),
    ],
    format: {
      format_name: "mp4",
      duration: String(durationSeconds(text)),
      size: String(outputSize),
    },
  };
}

function hasFastStart(filePath) {
  const fd = fs.openSync(filePath, "r");
  try {
    const size = Math.min(fs.fstatSync(fd).size, 2 * 1024 * 1024);
    const buffer = Buffer.alloc(size);
    fs.readSync(fd, buffer, 0, size, 0);
    const moov = buffer.indexOf(Buffer.from("moov"));
    const mdat = buffer.indexOf(Buffer.from("mdat"));
    return moov >= 0 && (mdat < 0 || moov < mdat);
  } finally {
    fs.closeSync(fd);
  }
}

function inspectOutput(ffmpegPath, outputPath, sourceSize) {
  const outputSize = fs.statSync(outputPath).size;
  const inspection = runFfmpeg(ffmpegPath, ["-hide_banner", "-i", outputPath, "-f", "null", "-"]);
  const probe = parseFfmpegMedia(inspection.stderr, outputSize);
  const validation = validateStoryMediaProbe(probe, sourceSize, outputSize);
  if (!validation.ok) throw new Error(validation.reason || "Invalid story media output");
  if (!hasFastStart(outputPath)) throw new Error("MP4 fast start metadata is missing");
  const video = probe.streams.find((stream) => stream.codec_type === "video");
  const audio = probe.streams.find((stream) => stream.codec_type === "audio");
  return {
    sourceSize,
    outputSize,
    duration: Number(probe.format.duration),
    width: video.width,
    height: video.height,
    frameRate: Number(String(video.avg_frame_rate).split("/")[0]),
    videoCodec: video.codec_name,
    audioCodec: audio?.codec_name || null,
    fastStart: true,
  };
}

function processingPath(finalPath, extension) {
  const parsed = path.parse(finalPath);
  return path.join(parsed.dir, `${parsed.name}.processing${extension}`);
}

function safePublicError() {
  return "Не удалось подготовить видео. Оригинал сохранён.";
}

function runStoryMediaPublish(jobPath, job, publishRunner) {
  if (!job.publishTarget) return { published: false };
  if (publishRunner) {
    const result = publishRunner(job);
    if (result && typeof result.then === "function") throw new Error("Synchronous publish runner is required");
    return { published: true, result };
  }
  const publisherPath = path.join(process.cwd(), "lib", "story-media-publish.cjs");
  if (!fs.existsSync(publisherPath)) throw new Error("Story media publisher is missing");
  const result = spawnSync(process.execPath, [publisherPath, "publish", jobPath], {
    cwd: process.cwd(),
    encoding: "utf8",
    windowsHide: true,
    timeout: 60_000,
    maxBuffer: 2 * 1024 * 1024,
    env: process.env,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const error = new Error("Story media publication failed");
    error.diagnostic = String(result.stderr || result.stdout || "publication failed").trim().slice(-2_000);
    throw error;
  }
  return { published: true };
}

function createPoster(job, sourcePath, posterProcessingPath) {
  runFfmpeg(job.ffmpegPath, [
    "-y",
    "-hide_banner",
    "-loglevel",
    "error",
    "-ss",
    "0.5",
    "-i",
    sourcePath,
    "-frames:v",
    "1",
    "-vf",
    "scale=w='min(720,iw)':h='min(1280,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2",
    "-q:v",
    "3",
    posterProcessingPath,
  ]);
  if (!fs.existsSync(posterProcessingPath) || fs.statSync(posterProcessingPath).size < 1_000) {
    throw new Error("Story media poster is invalid");
  }
}

function runStoryMediaJob(jobPath, options = {}) {
  let job = JSON.parse(fs.readFileSync(jobPath, "utf8"));
  assertSafeJob(jobPath, job);
  if (job.status === "READY" && fs.existsSync(job.outputPath) && fs.existsSync(job.posterPath)) return job;

  const outputProcessingPath = processingPath(job.outputPath, ".mp4");
  const posterProcessingPath = processingPath(job.posterPath, ".jpg");
  let lock;

  try {
    job = updateJob(jobPath, job, { status: "QUEUED", error: null });
    lock = acquireWorkerLock(job.jobsRoot);
    job = updateJob(jobPath, job, { status: "PROCESSING", startedAt: new Date().toISOString() });
    fs.mkdirSync(path.dirname(job.outputPath), { recursive: true });
    fs.rmSync(outputProcessingPath, { force: true });
    fs.rmSync(posterProcessingPath, { force: true });

    const sourceSize = fs.statSync(job.sourcePath).size;
    let media = null;
    if (fs.existsSync(job.outputPath)) {
      try {
        media = inspectOutput(job.ffmpegPath, job.outputPath, sourceSize);
      } catch {
        fs.rmSync(job.outputPath, { force: true });
        fs.rmSync(job.posterPath, { force: true });
      }
    }
    if (!media) {
      runFfmpeg(job.ffmpegPath, buildStoryFfmpegArgs(job.sourcePath, outputProcessingPath));
      media = inspectOutput(job.ffmpegPath, outputProcessingPath, sourceSize);
      createPoster(job, outputProcessingPath, posterProcessingPath);
      fs.renameSync(outputProcessingPath, job.outputPath);
      fs.renameSync(posterProcessingPath, job.posterPath);
    } else if (!fs.existsSync(job.posterPath)) {
      createPoster(job, job.outputPath, posterProcessingPath);
      fs.renameSync(posterProcessingPath, job.posterPath);
    }

    let published = false;
    if (job.publishTarget) {
      job = updateJob(jobPath, job, {
        status: "PUBLISHING",
        rollback: {
          storyId: job.publishTarget.storyId,
          tenantId: job.publishTarget.tenantId,
          oldUrl: job.publishTarget.expectedUrl,
          newUrl: job.outputUrl,
          createdAt: new Date().toISOString(),
        },
      });
      published = runStoryMediaPublish(jobPath, job, options.publishRunner).published;
    }
    job = updateJob(jobPath, job, {
      status: "READY",
      completedAt: new Date().toISOString(),
      url: job.outputUrl,
      posterUrl: job.posterUrl,
      media,
      published,
      publishedAt: published ? new Date().toISOString() : null,
      error: null,
      diagnostic: null,
    });
    return job;
  } catch (error) {
    fs.rmSync(outputProcessingPath, { force: true });
    fs.rmSync(posterProcessingPath, { force: true });
    job = updateJob(jobPath, job, {
      status: "FAILED",
      failedAt: new Date().toISOString(),
      error: safePublicError(),
      diagnostic: String(error?.diagnostic || error?.message || error).slice(-4_000),
    });
    return job;
  } finally {
    releaseWorkerLock(lock);
  }
}

if (require.main === module) {
  const jobPath = process.argv[2];
  if (!jobPath) {
    console.error("Story media job path is required");
    process.exit(2);
  }
  try {
    const result = runStoryMediaJob(path.resolve(jobPath));
    process.exit(result.status === "READY" ? 0 : 1);
  } catch (error) {
    console.error(String(error?.message || error));
    process.exit(1);
  }
}

module.exports = {
  hasFastStart,
  inspectOutput,
  parseFfmpegMedia,
  runStoryMediaJob,
  runStoryMediaPublish,
};
