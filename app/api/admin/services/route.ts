import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff, requireManager } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireStaff();
  if (!auth.authorized) return auth.response;
  const services = await prisma.service.findMany({ orderBy: { sortOrder: "asc" } });
  return NextResponse.json(services);
}

export async function POST(req: Request) {
  const auth = await requireManager();
  if (!auth.authorized) return auth.response;
  const body = await req.json();
  const service = await prisma.service.create({ data: body });
  return NextResponse.json(service);
}
