export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const DISABLED_MESSAGE = "Фоны админки закреплены за фирменными атмосферами ARAY.";

export async function POST() {
  const session = await auth();
  const role = session?.user?.role as string;
  const userId = session?.user?.id as string;

  if (!session || !role || role === "USER" || !userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(
    { error: DISABLED_MESSAGE, photos: [], locked: true },
    { status: 403 },
  );
}
