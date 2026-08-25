import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { parseJsonRecord, requireWriteConfirmation } from "@/lib/admin-content-guard";
import { requireManager } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { getCurrentTenantId } from "@/lib/tenant-context";

const {
  createStoryMediaJob,
  findLatestStoryMediaJobForStory,
  getStoryMediaJob,
  resolveStoryMediaSourceFromUrl,
  rollbackStoryMediaJob,
} = require("@/lib/story-media-jobs.cjs");
const { shouldOptimizeStoryVideo } = require("@/lib/story-media-policy.cjs");

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function revalidateStorySurfaces() {
  revalidatePath("/", "layout");
  revalidatePath("/stories");
  revalidatePath("/admin/stories");
}

function safeOutputStem(storyId: string, mediaUrl: string) {
  const base = path.basename(mediaUrl, path.extname(mediaUrl)).replace(/[^a-zA-Z0-9_-]+/g, "-").slice(0, 64);
  const storyPart = storyId.replace(/[^a-zA-Z0-9_-]+/g, "-").slice(0, 24);
  return `${base || "story"}-${storyPart || "media"}-${Date.now()}-${randomUUID().slice(0, 8)}`.slice(0, 120);
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireManager();
  if (!auth.authorized) return auth.response;
  const tenantId = getCurrentTenantId();
  const story = await prisma.storeStory.findFirst({
    where: { id: params.id, tenantId },
    select: { id: true },
  });
  if (!story) return NextResponse.json({ error: "Сторис не найдена" }, { status: 404 });
  return NextResponse.json({ job: findLatestStoryMediaJobForStory(story.id, tenantId) });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireManager();
  if (!auth.authorized) return auth.response;

  const body = await parseJsonRecord(req);
  const confirmationError = requireWriteConfirmation(body);
  if (confirmationError) return confirmationError;

  const tenantId = getCurrentTenantId();
  const action = String(body.action || "optimize").trim().toLowerCase();

  try {
    if (action === "rollback") {
      const jobId = String(body.jobId || "").trim();
      const internalJob = getStoryMediaJob(jobId);
      if (!internalJob) return NextResponse.json({ error: "Задание не найдено" }, { status: 404 });
      if (internalJob.publishTarget?.storyId !== params.id || internalJob.publishTarget?.tenantId !== tenantId) {
        return NextResponse.json({ error: "Откат не относится к этой сторис" }, { status: 403 });
      }
      const job = await rollbackStoryMediaJob(jobId);
      revalidateStorySurfaces();
      return NextResponse.json(job);
    }

    if (action !== "optimize") {
      return NextResponse.json({ error: "Неизвестное действие с видео" }, { status: 400 });
    }

    const story = await prisma.storeStory.findFirst({
      where: { id: params.id, tenantId },
      select: { id: true, type: true, mediaUrl: true },
    });
    if (!story) return NextResponse.json({ error: "Сторис не найдена" }, { status: 404 });
    if ((story.type !== "VIDEO" && story.type !== "LIVE") || !story.mediaUrl) {
      return NextResponse.json({ error: "У этой сторис нет видео для подготовки" }, { status: 400 });
    }

    const sourcePath = resolveStoryMediaSourceFromUrl(story.mediaUrl);
    if (!fs.existsSync(sourcePath) || !fs.statSync(sourcePath).isFile()) {
      return NextResponse.json({ error: "Исходное видео не найдено. Сторис не изменена." }, { status: 404 });
    }
    const size = fs.statSync(sourcePath).size;
    const extension = path.extname(sourcePath).slice(1).toLowerCase();
    if (!shouldOptimizeStoryVideo({ size, extension, mime: extension === "mp4" ? "video/mp4" : "" })) {
      return NextResponse.json({
        id: null,
        status: "READY",
        url: story.mediaUrl,
        originalUrl: story.mediaUrl,
        optimized: false,
        published: true,
        canRollback: false,
        message: "Видео уже подходит для сайта.",
      });
    }

    const job = createStoryMediaJob({
      sourcePath,
      sourceUrl: story.mediaUrl,
      outputStem: safeOutputStem(story.id, story.mediaUrl),
      publishTarget: {
        storyId: story.id,
        tenantId,
        expectedUrl: story.mediaUrl,
      },
    });
    return NextResponse.json(job, { status: 202 });
  } catch (error) {
    console.error("[stories-media] protected action failed", error);
    return NextResponse.json(
      { error: "Не удалось подготовить видео. Сторис не изменена, оригинал сохранён." },
      { status: 409 },
    );
  }
}
