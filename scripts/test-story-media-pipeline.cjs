/* eslint-disable no-console */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const ffmpegPath = require("ffmpeg-static");
const {
  createStoryMediaJob,
  getStoryMediaJobPublic,
  resolveStoryMediaSourceFromUrl,
  rollbackStoryMediaJob,
} = require("../lib/story-media-jobs.cjs");
const {
  completeStoryVideoUpload,
  planStoryVideoUpload,
} = require("../lib/story-media-upload.cjs");
const {
  publishStoryMedia,
  rollbackStoryMedia,
} = require("../lib/story-media-publish.cjs");
const { runStoryMediaJob } = require("../lib/story-media-worker.cjs");

const {
  STORY_MEDIA_OPTIMIZE_THRESHOLD_BYTES,
  buildStoryFfmpegArgs,
  isSafeStoryMediaJobId,
  shouldOptimizeStoryVideo,
  validateStoryMediaProbe,
} = require("../lib/story-media-policy.cjs");

const checks = [];

function check(name, fn) {
  checks.push({ name, fn });
}

check("small compatible MP4 is kept without re-encoding", () => {
  assert.equal(
    shouldOptimizeStoryVideo({
      size: STORY_MEDIA_OPTIMIZE_THRESHOLD_BYTES,
      extension: "mp4",
      mime: "video/mp4",
    }),
    false,
  );
});

check("large MP4 is optimized", () => {
  assert.equal(
    shouldOptimizeStoryVideo({
      size: STORY_MEDIA_OPTIMIZE_THRESHOLD_BYTES + 1,
      extension: "mp4",
      mime: "video/mp4",
    }),
    true,
  );
});

check("MOV and WebM are normalized even when small", () => {
  assert.equal(shouldOptimizeStoryVideo({ size: 1024, extension: "mov", mime: "video/quicktime" }), true);
  assert.equal(shouldOptimizeStoryVideo({ size: 1024, extension: "webm", mime: "video/webm" }), true);
});

check("job identifiers accept UUIDs and reject traversal", () => {
  assert.equal(isSafeStoryMediaJobId("123e4567-e89b-12d3-a456-426614174000"), true);
  assert.equal(isSafeStoryMediaJobId("../123e4567-e89b-12d3-a456-426614174000"), false);
  assert.equal(isSafeStoryMediaJobId("123"), false);
});

check("local story media URLs resolve only inside the story folder", () => {
  const publicRoot = path.resolve("public", "images", "stories");
  assert.equal(
    resolveStoryMediaSourceFromUrl("/images/stories/example.mp4", { publicRoot }),
    path.join(publicRoot, "example.mp4"),
  );
  assert.throws(() => resolveStoryMediaSourceFromUrl("/images/stories/../secret.mp4", { publicRoot }));
  assert.throws(() => resolveStoryMediaSourceFromUrl("https://example.com/video.mp4", { publicRoot }));
});

check("upload plan keeps small MP4 direct and stages heavy video as an original", () => {
  const publicRoot = path.resolve("public", "images", "stories");
  const small = planStoryVideoUpload({
    uploadStem: "upload-small-1234",
    extension: "mp4",
    mime: "video/mp4",
    fileSize: 4 * 1024 * 1024,
    publicRoot,
  });
  assert.equal(small.optimize, false);
  assert.equal(small.sourcePath, path.join(publicRoot, "upload-small-1234.mp4"));
  assert.equal(small.sourceUrl, "/images/stories/upload-small-1234.mp4");

  const heavy = planStoryVideoUpload({
    uploadStem: "upload-heavy-1234",
    extension: "mp4",
    mime: "video/mp4",
    fileSize: STORY_MEDIA_OPTIMIZE_THRESHOLD_BYTES + 1,
    publicRoot,
  });
  assert.equal(heavy.optimize, true);
  assert.equal(heavy.sourcePath, path.join(publicRoot, "originals", "upload-heavy-1234.mp4"));
  assert.equal(heavy.sourceUrl, "/images/stories/originals/upload-heavy-1234.mp4");
});

check("heavy upload returns a job and never exposes the original as ready playback", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "pilorus-story-upload-"));
  const publicRoot = path.join(tempRoot, "public", "images", "stories");
  const jobsRoot = path.join(tempRoot, ".story-media-jobs");
  try {
    const plan = planStoryVideoUpload({
      uploadStem: "upload-heavy-5678",
      extension: "mov",
      mime: "video/quicktime",
      fileSize: 2_048,
      publicRoot,
    });
    fs.mkdirSync(path.dirname(plan.sourcePath), { recursive: true });
    fs.writeFileSync(plan.sourcePath, "preserved original", "utf8");
    const payload = completeStoryVideoUpload(plan, {
      jobsRoot,
      ffmpegPath,
      runInBackground: false,
    });
    assert.equal(payload.status, "QUEUED");
    assert.ok(isSafeStoryMediaJobId(payload.jobId));
    assert.equal(payload.originalUrl, plan.sourceUrl);
    assert.equal(payload.url, null);
    assert.notEqual(payload.url, payload.originalUrl);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

check("conditional publish and rollback change only the intended story media URL", async () => {
  const story = {
    id: "story-canary",
    tenantId: "pilorus",
    mediaUrl: "/images/stories/original-heavy.mp4",
    title: "Онлайн-продавец",
    views: 89,
    sortOrder: 100,
    active: true,
  };
  const updates = [];
  const store = {
    async getStory({ storyId, tenantId }) {
      return story.id === storyId && story.tenantId === tenantId ? { ...story } : null;
    },
    async updateMediaUrl({ storyId, tenantId, expectedUrl, nextUrl }) {
      if (story.id !== storyId || story.tenantId !== tenantId || story.mediaUrl !== expectedUrl) return 0;
      updates.push({ storyId, tenantId, expectedUrl, nextUrl });
      story.mediaUrl = nextUrl;
      return 1;
    },
  };
  const job = {
    outputUrl: "/images/stories/original-heavy-web.mp4",
    publishTarget: {
      storyId: story.id,
      tenantId: story.tenantId,
      expectedUrl: "/images/stories/original-heavy.mp4",
    },
  };

  const published = await publishStoryMedia(job, store);
  assert.equal(published.changed, true);
  assert.equal(story.mediaUrl, job.outputUrl);
  assert.equal(story.title, "Онлайн-продавец");
  assert.equal(story.views, 89);
  assert.equal(story.sortOrder, 100);
  assert.equal(story.active, true);
  assert.equal(updates.length, 1);

  const rolledBack = await rollbackStoryMedia(job, store);
  assert.equal(rolledBack.changed, true);
  assert.equal(story.mediaUrl, job.publishTarget.expectedUrl);
  assert.equal(story.views, 89);
  assert.equal(updates.length, 2);

  story.mediaUrl = "/images/stories/manager-changed.mp4";
  await assert.rejects(() => publishStoryMedia(job, store), /изменилась/);
  assert.equal(updates.length, 2, "conflict must not overwrite a manager change");
});

check("encoder profile is mobile-safe and serial", () => {
  const args = buildStoryFfmpegArgs("source.mov", "result.processing.mp4");
  const joined = args.join(" ");
  assert.match(joined, /-c:v libx264/);
  assert.match(joined, /-pix_fmt yuv420p/);
  assert.match(joined, /-c:a aac/);
  assert.match(joined, /-b:a 96k/);
  assert.match(joined, /-maxrate 4M/);
  assert.match(joined, /-bufsize 8M/);
  assert.match(joined, /-g 60/);
  assert.match(joined, /-threads 1/);
  assert.match(joined, /-movflags \+faststart/);
  assert.match(joined, /force_original_aspect_ratio=decrease/);
});

const validProbe = {
  streams: [
    {
      codec_type: "video",
      codec_name: "h264",
      width: 720,
      height: 1280,
      pix_fmt: "yuv420p",
      avg_frame_rate: "30/1",
    },
    { codec_type: "audio", codec_name: "aac" },
  ],
  format: {
    format_name: "mov,mp4,m4a,3gp,3g2,mj2",
    duration: "4.0",
    size: "1800000",
  },
};

check("validated web copy must be compatible and smaller", () => {
  assert.deepEqual(validateStoryMediaProbe(validProbe, 30_000_000, 1_800_000), { ok: true });
});

check("validation rejects wrong codec, oversized frame and non-smaller output", () => {
  const wrongCodec = structuredClone(validProbe);
  wrongCodec.streams[0].codec_name = "hevc";
  assert.equal(validateStoryMediaProbe(wrongCodec, 30_000_000, 1_800_000).ok, false);

  const oversized = structuredClone(validProbe);
  oversized.streams[0].width = 1080;
  assert.equal(validateStoryMediaProbe(oversized, 30_000_000, 1_800_000).ok, false);

  assert.equal(validateStoryMediaProbe(validProbe, 1_000_000, 1_800_000).ok, false);
});

check("real worker preserves the source, publishes conditionally and keeps a durable rollback", async () => {
  assert.ok(ffmpegPath && fs.existsSync(ffmpegPath), "bundled FFmpeg is missing");
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "pilorus-story-media-"));
  const jobsRoot = path.join(tempRoot, ".story-media-jobs");
  const publicRoot = path.join(tempRoot, "public", "images", "stories");
  const originalsRoot = path.join(publicRoot, "originals");
  fs.mkdirSync(jobsRoot, { recursive: true });
  fs.mkdirSync(originalsRoot, { recursive: true });

  const sourcePath = path.join(originalsRoot, "fixture.mov");
  const story = {
    id: "story-worker-canary",
    tenantId: "pilorus",
    mediaUrl: "/images/stories/originals/fixture.mov",
  };
  const store = {
    async getStory({ storyId, tenantId }) {
      return story.id === storyId && story.tenantId === tenantId ? { ...story } : null;
    },
    async updateMediaUrl({ storyId, tenantId, expectedUrl, nextUrl }) {
      if (story.id !== storyId || story.tenantId !== tenantId || story.mediaUrl !== expectedUrl) return 0;
      story.mediaUrl = nextUrl;
      return 1;
    },
  };

  try {
    const fixture = spawnSync(
      ffmpegPath,
      [
        "-y",
        "-hide_banner",
        "-loglevel",
        "error",
        "-f",
        "lavfi",
        "-i",
        "testsrc2=size=1080x1920:rate=60",
        "-f",
        "lavfi",
        "-i",
        "sine=frequency=880:sample_rate=44100",
        "-t",
        "2",
        "-c:v",
        "libx264",
        "-preset",
        "ultrafast",
        "-crf",
        "10",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        sourcePath,
      ],
      { encoding: "utf8", windowsHide: true, timeout: 60_000 },
    );
    assert.equal(fixture.status, 0, fixture.stderr || "fixture generation failed");
    const sourceSize = fs.statSync(sourcePath).size;

    const created = createStoryMediaJob({
      sourcePath,
      sourceUrl: "/images/stories/originals/fixture.mov",
      outputStem: "fixture",
      jobsRoot,
      publicRoot,
      ffmpegPath,
      publishTarget: {
        storyId: story.id,
        tenantId: story.tenantId,
        expectedUrl: story.mediaUrl,
      },
      runInBackground: false,
    });
    const jobPath = path.join(jobsRoot, `${created.id}.json`);
    const outputPath = path.join(publicRoot, "fixture-web.mp4");
    const posterPath = path.join(publicRoot, "fixture-poster.jpg");
    assert.equal(created.status, "QUEUED");
    assert.equal(created.originalUrl, "/images/stories/originals/fixture.mov");
    assert.equal("sourcePath" in created, false, "public job must not expose server paths");

    const result = runStoryMediaJob(jobPath, {
      publishRunner(job) {
        assert.equal(story.mediaUrl, job.publishTarget.expectedUrl);
        story.mediaUrl = job.outputUrl;
        return { changed: true };
      },
    });
    const receipt = JSON.parse(fs.readFileSync(jobPath, "utf8"));
    const publicJob = getStoryMediaJobPublic(created.id, { jobsRoot });
    assert.equal(result.status, "READY");
    assert.equal(receipt.status, "READY");
    assert.equal(publicJob.status, "READY");
    assert.equal(publicJob.published, true);
    assert.equal(publicJob.canRollback, true);
    assert.equal(story.mediaUrl, "/images/stories/fixture-web.mp4");
    assert.equal("diagnostic" in publicJob, false, "public job must not expose diagnostics");
    assert.equal(receipt.url, "/images/stories/fixture-web.mp4");
    assert.equal(receipt.posterUrl, "/images/stories/fixture-poster.jpg");
    assert.ok(fs.existsSync(sourcePath), "source must be preserved");
    assert.ok(fs.existsSync(outputPath), "validated output must be published");
    assert.ok(fs.existsSync(posterPath), "poster must be published");
    assert.ok(fs.statSync(outputPath).size < sourceSize, "web copy must be smaller than source");
    assert.equal(fs.existsSync(path.join(publicRoot, "fixture-web.processing.mp4")), false);
    assert.equal(receipt.media.videoCodec, "h264");
    assert.equal(receipt.media.audioCodec, "aac");
    assert.ok(receipt.media.width <= 720);
    assert.ok(receipt.media.height <= 1280);
    assert.ok(receipt.media.frameRate <= 30.01);
    assert.equal(receipt.media.fastStart, true);

    const rolledBack = await rollbackStoryMediaJob(created.id, { jobsRoot, store });
    assert.equal(rolledBack.published, false);
    assert.equal(rolledBack.canRollback, false);
    assert.equal(story.mediaUrl, "/images/stories/originals/fixture.mov");
    const rollbackReceipt = JSON.parse(fs.readFileSync(jobPath, "utf8"));
    assert.ok(rollbackReceipt.rolledBackAt);
    assert.equal(rollbackReceipt.rollback.oldUrl, "/images/stories/originals/fixture.mov");
    assert.equal(rollbackReceipt.rollback.newUrl, "/images/stories/fixture-web.mp4");
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

check("failed processing keeps the original and can be retried", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "pilorus-story-media-retry-"));
  const jobsRoot = path.join(tempRoot, ".story-media-jobs");
  const publicRoot = path.join(tempRoot, "public", "images", "stories");
  const originalsRoot = path.join(publicRoot, "originals");
  fs.mkdirSync(originalsRoot, { recursive: true });
  const sourcePath = path.join(originalsRoot, "broken.mov");
  fs.writeFileSync(sourcePath, "not a video", "utf8");

  try {
    const created = createStoryMediaJob({
      sourcePath,
      sourceUrl: "/images/stories/originals/broken.mov",
      outputStem: "retry-fixture",
      jobsRoot,
      publicRoot,
      ffmpegPath,
      runInBackground: false,
    });
    const jobPath = path.join(jobsRoot, `${created.id}.json`);
    const failed = runStoryMediaJob(jobPath);
    const publicFailed = getStoryMediaJobPublic(created.id, { jobsRoot });
    assert.equal(failed.status, "FAILED");
    assert.equal(publicFailed.status, "FAILED");
    assert.equal(publicFailed.canRetry, true);
    assert.equal(publicFailed.error, "Не удалось подготовить видео. Оригинал сохранён.");
    assert.equal("diagnostic" in publicFailed, false);
    assert.ok(fs.existsSync(sourcePath), "failed processing must keep the source");
    assert.equal(fs.existsSync(path.join(publicRoot, "retry-fixture-web.mp4")), false);
    assert.equal(fs.existsSync(path.join(publicRoot, "retry-fixture-poster.jpg")), false);

    const retried = require("../lib/story-media-jobs.cjs").retryStoryMediaJob(created.id, {
      jobsRoot,
      runInBackground: false,
    });
    assert.equal(retried.status, "QUEUED");
    assert.equal(retried.canRetry, false);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

async function main() {
  const results = [];
  for (const item of checks) {
    try {
      await item.fn();
      results.push({ name: item.name, ok: true });
    } catch (error) {
      results.push({ name: item.name, ok: false, error });
    }
  }
  const failed = results.filter((item) => !item.ok);
  if (failed.length) {
    console.error(`Story media pipeline failed: ${failed.length}/${results.length}`);
    for (const item of failed) console.error(`- ${item.name}: ${item.error?.message || item.error}`);
    process.exit(1);
  }
  console.log(`Story media pipeline passed: ${results.length}/${results.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
