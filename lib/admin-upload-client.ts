"use client";

const ADMIN_UPLOAD_CHUNK_SIZE = 8 * 1024 * 1024;

function makeUploadId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function uploadDirectAdminMedia(file: File, folder: string) {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("folder", folder);

  const response = await fetch("/api/admin/upload", { method: "POST", body: fd });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.url) {
    throw new Error(payload?.error || "Не удалось загрузить файл");
  }
  return payload.url as string;
}

async function uploadChunkedAdminMedia(file: File, folder: string) {
  const uploadId = makeUploadId();
  const total = Math.ceil(file.size / ADMIN_UPLOAD_CHUNK_SIZE);
  let uploadedUrl = "";

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

    const response = await fetch("/api/admin/upload/chunk", { method: "POST", body: fd });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(payload?.error || "Не удалось загрузить часть файла");
    }
    if (payload?.url) uploadedUrl = payload.url;
  }

  if (!uploadedUrl) throw new Error("Файл загружен не полностью");
  return uploadedUrl;
}

export async function uploadAdminMediaFile(file: File, folder: string) {
  if (file.size > ADMIN_UPLOAD_CHUNK_SIZE) {
    return uploadChunkedAdminMedia(file, folder);
  }
  return uploadDirectAdminMedia(file, folder);
}
