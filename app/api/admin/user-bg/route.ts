export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const DISABLED_MESSAGE = "Фоны админки закреплены за фирменными атмосферами ARAY.";

async function getStaffSession() {
  const session = await auth();
  const role = session?.user?.role as string;
  const userId = session?.user?.id as string;
  if (!session || !role || role === "USER" || !userId) return null;
  return { userId, role };
}

export async function GET() {
  const sess = await getStaffSession();
  if (!sess) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json({
    photos: [],
    locked: true,
    message: DISABLED_MESSAGE,
  });
}

export async function POST() {
  const sess = await getStaffSession();
  if (!sess) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json(
    { error: DISABLED_MESSAGE, photos: [], locked: true },
    { status: 403 },
  );
}

export async function DELETE() {
  const sess = await getStaffSession();
  if (!sess) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json({
    photos: [],
    locked: true,
    message: DISABLED_MESSAGE,
  });
}
