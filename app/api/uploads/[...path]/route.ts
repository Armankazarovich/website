export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

// SVG intentionally excluded — SVG can contain inline <script> → XSS vector.
// If SVG support needed, add dedicated sanitizer route.
const MIME_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  pdf: "application/pdf",
};

/**
 * Serve uploaded files dynamically.
 * Next.js in production only serves files that existed at build time in public/.
 * Files uploaded after build (avatars, review photos) need this API route.
 *
 * GET /api/uploads/avatars/avatar-xxx.jpg → reads from public/uploads/avatars/avatar-xxx.jpg
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const segments = params.path;

  // Sanitize: no "..", no absolute paths
  if (segments.some((s) => s === ".." || s.startsWith("/") || s.includes("\\"))) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  const relativePath = segments.join("/");
  const filePath = path.join(process.cwd(), "public", "uploads", relativePath);

  try {
    const buffer = await readFile(filePath);
    const ext = path.extname(filePath).slice(1).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
