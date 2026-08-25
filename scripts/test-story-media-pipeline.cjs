/* eslint-disable no-console */
const assert = require("node:assert/strict");

const {
  STORY_MEDIA_OPTIMIZE_THRESHOLD_BYTES,
  buildStoryFfmpegArgs,
  isSafeStoryMediaJobId,
  shouldOptimizeStoryVideo,
  validateStoryMediaProbe,
} = require("../lib/story-media-policy.cjs");

const checks = [];

function check(name, fn) {
  try {
    fn();
    checks.push({ name, ok: true });
  } catch (error) {
    checks.push({ name, ok: false, error });
  }
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

const failed = checks.filter((item) => !item.ok);
if (failed.length) {
  console.error(`Story media pipeline failed: ${failed.length}/${checks.length}`);
  for (const item of failed) console.error(`- ${item.name}: ${item.error?.message || item.error}`);
  process.exit(1);
}

console.log(`Story media pipeline passed: ${checks.length}/${checks.length}`);
