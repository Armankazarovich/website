const STORY_MEDIA_OPTIMIZE_THRESHOLD_BYTES = 24 * 1024 * 1024;
const STORY_MEDIA_MAX_WIDTH = 720;
const STORY_MEDIA_MAX_HEIGHT = 1280;

function cleanExtension(value) {
  return String(value || "").trim().toLowerCase().replace(/^\./, "");
}

function shouldOptimizeStoryVideo({ size, extension, mime }) {
  const safeSize = Number(size) || 0;
  const ext = cleanExtension(extension);
  const safeMime = String(mime || "").trim().toLowerCase();
  const compatibleMp4 = ext === "mp4" && (!safeMime || safeMime === "video/mp4" || safeMime === "application/octet-stream");
  return !compatibleMp4 || safeSize > STORY_MEDIA_OPTIMIZE_THRESHOLD_BYTES;
}

function buildStoryFfmpegArgs(sourcePath, outputPath) {
  return [
    "-y",
    "-hide_banner",
    "-loglevel",
    "error",
    "-i",
    sourcePath,
    "-map",
    "0:v:0",
    "-map",
    "0:a:0?",
    "-vf",
    "scale=w='min(720,iw)':h='min(1280,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2",
    "-r",
    "30",
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    "23",
    "-maxrate",
    "4M",
    "-bufsize",
    "8M",
    "-pix_fmt",
    "yuv420p",
    "-g",
    "60",
    "-keyint_min",
    "60",
    "-sc_threshold",
    "0",
    "-c:a",
    "aac",
    "-b:a",
    "96k",
    "-ac",
    "2",
    "-movflags",
    "+faststart",
    "-threads",
    "1",
    outputPath,
  ];
}

function parseRate(value) {
  const [rawNumerator, rawDenominator = "1"] = String(value || "0/1").split("/");
  const numerator = Number(rawNumerator);
  const denominator = Number(rawDenominator);
  return Number.isFinite(numerator) && Number.isFinite(denominator) && denominator > 0 ? numerator / denominator : 0;
}

function validateStoryMediaProbe(probe, sourceSize, outputSize) {
  const streams = Array.isArray(probe?.streams) ? probe.streams : [];
  const video = streams.find((stream) => stream?.codec_type === "video");
  const audio = streams.find((stream) => stream?.codec_type === "audio");
  const formatNames = String(probe?.format?.format_name || "").toLowerCase();
  const duration = Number(probe?.format?.duration);
  const width = Number(video?.width);
  const height = Number(video?.height);
  const frameRate = parseRate(video?.avg_frame_rate);
  const safeSourceSize = Number(sourceSize) || 0;
  const safeOutputSize = Number(outputSize) || 0;

  if (!video) return { ok: false, reason: "Видео-дорожка не найдена" };
  if (video.codec_name !== "h264") return { ok: false, reason: "Web-копия должна использовать H.264" };
  if (video.pix_fmt !== "yuv420p") return { ok: false, reason: "Web-копия должна использовать yuv420p" };
  if (audio && audio.codec_name !== "aac") return { ok: false, reason: "Звуковая дорожка должна использовать AAC" };
  if (!formatNames.includes("mp4")) return { ok: false, reason: "Web-копия должна быть MP4" };
  if (!Number.isFinite(duration) || duration <= 0) return { ok: false, reason: "Длительность видео не определена" };
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 2 || height < 2) {
    return { ok: false, reason: "Размер кадра не определён" };
  }
  if (width > STORY_MEDIA_MAX_WIDTH || height > STORY_MEDIA_MAX_HEIGHT) {
    return { ok: false, reason: "Web-копия превышает 720×1280" };
  }
  if (frameRate > 30.01) return { ok: false, reason: "Web-копия превышает 30 кадров/с" };
  if (safeOutputSize <= 0) return { ok: false, reason: "Web-копия пуста" };
  if (safeSourceSize > 0 && safeOutputSize >= safeSourceSize) {
    return { ok: false, reason: "Web-копия не уменьшила исходник" };
  }
  return { ok: true };
}

function isSafeStoryMediaJobId(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ""));
}

module.exports = {
  STORY_MEDIA_MAX_HEIGHT,
  STORY_MEDIA_MAX_WIDTH,
  STORY_MEDIA_OPTIMIZE_THRESHOLD_BYTES,
  buildStoryFfmpegArgs,
  isSafeStoryMediaJobId,
  shouldOptimizeStoryVideo,
  validateStoryMediaProbe,
};
