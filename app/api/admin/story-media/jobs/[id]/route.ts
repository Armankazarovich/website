import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { canUploadGlobalMedia } from "@/lib/media-permissions";

const { resumeStoryMediaJobIfInterrupted, retryStoryMediaJob } = require("@/lib/story-media-jobs.cjs");

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function authorize() {
  const session = await auth();
  const role = session?.user?.role;
  return session && canUploadGlobalMedia(role as string);
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  if (!(await authorize())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const job = resumeStoryMediaJobIfInterrupted(params.id);
    if (!job) return NextResponse.json({ error: "Задание не найдено" }, { status: 404 });
    return NextResponse.json(job);
  } catch {
    return NextResponse.json({ error: "Некорректное задание обработки видео" }, { status: 400 });
  }
}

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  if (!(await authorize())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const job = retryStoryMediaJob(params.id);
    if (!job) return NextResponse.json({ error: "Задание не найдено" }, { status: 404 });
    return NextResponse.json(job, { status: job.status === "READY" ? 200 : 202 });
  } catch {
    return NextResponse.json({ error: "Не получилось повторить — попробуйте ещё раз" }, { status: 400 });
  }
}
