import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

let arayProductionIcon: Promise<Buffer> | null = null;

export function clampArayPwaIconSize(value: number) {
  if (!Number.isFinite(value)) return 512;
  return Math.min(1024, Math.max(32, Math.round(value)));
}

async function readArayProductionIcon() {
  arayProductionIcon ??= readFile(path.join(process.cwd(), "public", "aray", "aray-production-logo.png"));
  return arayProductionIcon;
}

export async function createArayPwaIconResponse(rawSize: string | null | undefined) {
  const size = clampArayPwaIconSize(Number(rawSize ?? 512));
  const source = await readArayProductionIcon();
  const png = await sharp(source)
    .resize(size, size, { fit: "contain", withoutEnlargement: false })
    .png()
    .toBuffer();
  const body = png.buffer.slice(
    png.byteOffset,
    png.byteOffset + png.byteLength
  ) as ArrayBuffer;

  return new Response(body, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}
