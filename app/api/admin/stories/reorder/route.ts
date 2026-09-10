import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireManager } from "@/lib/auth-helpers";
import { getCurrentTenantId } from "@/lib/tenant-context";
import { parseJsonRecord, requireWriteConfirmation } from "@/lib/admin-content-guard";

export const dynamic = "force-dynamic";

// Порядок сторис перетаскиванием — просьба Армана 10.09.2026. Меняется только
// порядок; остальные поля сторис не трогаются. Закреплённые сторис экран
// присылает первыми, поэтому на сайте они тоже остаются первыми.
const MAX_STORIES = 500;

export async function POST(req: Request) {
  const auth = await requireManager();
  if (!auth.authorized) return auth.response;

  const body = await parseJsonRecord(req);
  const confirmationError = requireWriteConfirmation(body);
  if (confirmationError) return confirmationError;

  const raw = Array.isArray(body.ids) ? (body.ids as unknown[]) : [];
  const ids = raw.map((id) => String(id ?? "").trim()).filter(Boolean);
  const unique = Array.from(new Set(ids));
  if (unique.length === 0 || unique.length !== ids.length || unique.length > MAX_STORIES) {
    return NextResponse.json(
      { error: "Не получилось сохранить порядок — обновите страницу и попробуйте ещё раз" },
      { status: 400 },
    );
  }

  const tenantId = getCurrentTenantId();
  const found = await prisma.storeStory.count({ where: { tenantId, id: { in: unique } } });
  if (found !== unique.length) {
    return NextResponse.json(
      { error: "Список сторис изменился — обновите страницу и попробуйте ещё раз" },
      { status: 409 },
    );
  }

  await prisma.$transaction(
    unique.map((id, index) =>
      prisma.storeStory.updateMany({ where: { id, tenantId }, data: { sortOrder: (index + 1) * 10 } }),
    ),
  );

  revalidatePath("/", "layout");
  revalidatePath("/stories");
  return NextResponse.json({ ok: true, count: unique.length });
}
