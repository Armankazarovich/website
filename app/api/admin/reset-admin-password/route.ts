export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

function isAuthorized(secret: string | null) {
  return Boolean(process.env.CRON_SECRET && secret === process.env.CRON_SECRET);
}

async function resetFirstAdminPassword(newPassword: string) {
  if (!newPassword || newPassword.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const admin = await prisma.user.findFirst({
    where: { role: "ADMIN" },
    select: { id: true, email: true, name: true },
  });

  if (!admin) {
    return NextResponse.json({ error: "No admin user found" }, { status: 404 });
  }

  const hash = await bcrypt.hash(newPassword, 12);

  await prisma.user.update({
    where: { id: admin.id },
    data: { passwordHash: hash },
  });

  return NextResponse.json({
    ok: true,
    message: `Password updated for ${admin.email}`,
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const secret = typeof body.secret === "string" ? body.secret : req.headers.get("x-cron-secret");
  const newPassword = typeof body.password === "string" ? body.password : "";

  if (!isAuthorized(secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return resetFirstAdminPassword(newPassword);
}

export async function GET() {
  return NextResponse.json(
    { error: "Use POST with x-cron-secret header and JSON password body" },
    { status: 405, headers: { Allow: "POST" } },
  );
}
