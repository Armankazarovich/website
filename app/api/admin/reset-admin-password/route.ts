export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  const newPassword = req.nextUrl.searchParams.get("password");

  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
