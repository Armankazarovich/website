"use client";

const ADMIN_UPLOAD_CHUNK_SIZE = 8 * 1024 * 1024;
const STORY_MEDIA_POLL_INTERVAL_MS = 1_500;
const STORY_MEDIA_POLL_TIMEOUT_MS = 20 * 60 * 1000;

export type StoryMediaUploadPhase = "uploading" | "queued" | "processing" | "publishing" | "ready" | "failed";

export type StoryMediaUploadState = {
  phase: StoryMediaUploadPhase;
  jobId?: string;
  message: string;
};

export type StoryMediaUploadResult = {
  url: string;
  posterUrl: string | null;
  originalUrl: string | null;
  optimized: boolean;
  jobId: string | null;
};

type UploadOptions = {
  onState?: (state: StoryMediaUploadState) => void;
  signal?: AbortSignal;
};

type AdminUploadPayload = {
  url?: string | null;
  posterUrl?: string | null;
  originalUrl?: string | null;
  optimized?: boolean;
  jobId?: string | null;
  id?: string;
  status?: "QUEUED" | "PROCESSING" | "PUBLISHING" | "READY" | "FAILED";
  error?: string;
};

export class StoryMediaUploadError extends Error {
  jobId: string | null;

  constructor(message: string, jobId?: string | null) {
    super(message);
    this.name = "StoryMediaUploadError";
    this.jobId = jobId || null;
  }
}

function makeUploadId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function stateMessage(phase: StoryMediaUploadPhase) {
  if (phase === "uploading") return "Загружаем исходник…";
  if (phase === "queued") return "Видео в очереди. Оригинал сохранён.";
  if (phase === "processing") return "Подготавливаем видео для сайта…";
  if (phase === "publishing") return "Проверяем готовую web-копию…";
  if (phase === "ready") return "Видео готово для сайта.";
  return "Не удалось подготовить видео. Оригинал сохранён.";
}

function emitState(options: UploadOptions, phase: StoryMediaUploadPhase, jobId?: string | null) {
  options.onState?.({ phase, jobId: jobId || undefined, message: stateMessage(phase) });
}

function delay(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const onAbort = () => {
      window.clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    };
    const timer = window.setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

async function responsePayload(response: Response) {
  const payload = await response.json().catch(() => null) as AdminUploadPayload | null;
  if (!response.ok) throw new StoryMediaUploadError(payload?.error || "Не удалось загрузить файл", payload?.jobId);
  return payload || {};
}

async function uploadDirectAdminMedia(file: File, folder: string, options: UploadOptions) {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("folder", folder);

  const response = await fetch("/api/admin/upload", { method: "POST", body: fd, signal: options.signal });
  return responsePayload(response);
}

async function uploadChunkedAdminMedia(file: File, folder: string, options: UploadOptions) {
  const uploadId = makeUploadId();
  const total = Math.ceil(file.size / ADMIN_UPLOAD_CHUNK_SIZE);
  let completedPayload: AdminUploadPayload | null = null;

  for (let index = 0; index < total; index += 1) {
    const start = index * ADMIN_UPLOAD_CHUNK_SIZE;
    const end = Math.min(start + ADMIN_UPLOAD_CHUNK_SIZE, file.size);
    const chunk = file.slice(start, end, file.type || "application/octet-stream");
    const fd = new FormData();
    fd.append("file", chunk, file.name);
    fd.append("folder", folder);
    fd.append("uploadId", uploadId);
    fd.append("index", String(index));
    fd.append("total", String(total));
    fd.append("fileName", file.name);
    fd.append("fileType", file.type || "");
    fd.append("fileSize", String(file.size));

    const response = await fetch("/api/admin/upload/chunk", { method: "POST", body: fd, signal: options.signal });
    const payload = await responsePayload(response);
    if (payload.url || payload.jobId) completedPayload = payload;
  }

  if (!completedPayload) throw new StoryMediaUploadError("Файл загружен не полностью");
  return completedPayload;
}

function phaseFromStatus(status?: AdminUploadPayload["status"]): StoryMediaUploadPhase {
  if (status === "PROCESSING") return "processing";
  if (status === "PUBLISHING") return "publishing";
  if (status === "READY") return "ready";
  if (status === "FAILED") return "failed";
  return "queued";
}

export async function monitorStoryMediaJob(jobId: string, options: UploadOptions = {}): Promise<StoryMediaUploadResult> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < STORY_MEDIA_POLL_TIMEOUT_MS) {
    const response = await fetch(`/api/admin/story-media/jobs/${encodeURIComponent(jobId)}`, {
      cache: "no-store",
      signal: options.signal,
    });
    const payload = await responsePayload(response);
    const phase = phaseFromStatus(payload.status);
    emitState(options, phase, jobId);
    if (payload.status === "FAILED") {
      throw new StoryMediaUploadError(payload.error || stateMessage("failed"), jobId);
    }
    if (payload.status === "READY" && payload.url) {
      return {
        url: payload.url,
        posterUrl: payload.posterUrl || null,
        originalUrl: payload.originalUrl || null,
        optimized: true,
        jobId,
      };
    }
    await delay(STORY_MEDIA_POLL_INTERVAL_MS, options.signal);
  }
  throw new StoryMediaUploadError("Подготовка видео заняла слишком много времени. Оригинал сохранён.", jobId);
}

async function resolveUploadPayload(payload: AdminUploadPayload, options: UploadOptions): Promise<StoryMediaUploadResult> {
  const jobId = payload.jobId || payload.id || null;
  if (jobId) {
    emitState(options, phaseFromStatus(payload.status), jobId);
    return monitorStoryMediaJob(jobId, options);
  }
  if (!payload.url) throw new StoryMediaUploadError(payload.error || "Файл загружен не полностью");
  emitState(options, "ready");
  return {
    url: payload.url,
    posterUrl: payload.posterUrl || null,
    originalUrl: payload.originalUrl || payload.url,
    optimized: Boolean(payload.optimized),
    jobId: null,
  };
}

async function uploadAdminMedia(file: File, folder: string, options: UploadOptions = {}) {
  emitState(options, "uploading");
  const payload = file.size > ADMIN_UPLOAD_CHUNK_SIZE
    ? await uploadChunkedAdminMedia(file, folder, options)
    : await uploadDirectAdminMedia(file, folder, options);
  return resolveUploadPayload(payload, options);
}

export async function retryStoryMediaUpload(jobId: string, options: UploadOptions = {}) {
  const response = await fetch(`/api/admin/story-media/jobs/${encodeURIComponent(jobId)}`, {
    method: "POST",
    signal: options.signal,
  });
  const payload = await responsePayload(response);
  return resolveUploadPayload({ ...payload, jobId }, options);
}

export async function uploadStoryMediaFile(file: File, options: UploadOptions = {}) {
  return uploadAdminMedia(file, "stories", options);
}

export async function uploadAdminMediaFile(file: File, folder: string) {
  const result = await uploadAdminMedia(file, folder);
  return result.url;
}
