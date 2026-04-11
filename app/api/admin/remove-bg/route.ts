export const dynamic = "force-dynamic";
export const maxDuration = 60; // 60s — AI processing takes time

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

export async function POST(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  const bytes = await file.arrayBuffer();
  const inputBuffer = Buffer.from(bytes);

  try {
    const { removeBackground } = await import("@imgly/background-removal-node");

    // 'small' model downloads ~50MB (vs 100MB for medium) — faster on first run
    const resultBlob = await removeBackground(inputBuffer, { model: "small" });
    const resultBuffer = Buffer.from(await resultBlob.arrayBuffer());

    // Save to /public/images/products/
    const uploadsDir = join(process.cwd(), "public", "images", "products");
    if (!existsSync(uploadsDir)) await mkdir(uploadsDir, { recursive: true });

    const filename = `nobg-${Date.now()}.png`;
    const filepath = join(uploadsDir, filename);
    await writeFile(filepath, resultBuffer);

    return NextResponse.json({ url: `/images/products/${filename}` });
  } catch (err: any) {
    console.error("[remove-bg] error:", err);
    return NextResponse.json({ error: err.message ?? "Processing failed" }, { status: 500 });
  }
}
