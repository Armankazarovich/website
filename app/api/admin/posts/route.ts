import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff, requireManager } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireStaff();
  if (!auth.authorized) return auth.response;
  const posts = await prisma.post.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(posts);
}

export async function POST(req: Request) {
  const auth = await requireManager();
  if (!auth.authorized) return auth.response;
  const body = await req.json();
  const post = await prisma.post.create({ data: body });
  return NextResponse.json(post);
}
