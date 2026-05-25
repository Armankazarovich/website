export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentTenantId } from "@/lib/tenant-context";

const MESSENGER_ROLES = ["SUPER_ADMIN", "ADMIN", "MANAGER", "SELLER"] as const;

async function getSession() {
  const session = await auth();
  const role = session?.user?.role;
  const id = session?.user?.id;
  if (!session || !MESSENGER_ROLES.includes(role as any)) return null;
  return { role, id };
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = getCurrentTenantId();
  const lead = await prisma.lead.findFirst({
    where: { id: params.id, tenantId, deletedAt: null },
    select: { id: true },
  });

  if (!lead) return NextResponse.json({ error: "Диалог не найден" }, { status: 404 });

  await prisma.lead.update({
    where: { id: lead.id },
    data: { deletedAt: new Date(), updatedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = getCurrentTenantId();
  let body: any = {};
  try {
    body = await req.json();
  } catch {}

  if (body.action !== "restore") {
    return NextResponse.json({ error: "Неизвестное действие" }, { status: 400 });
  }

  const lead = await prisma.lead.findFirst({
    where: { id: params.id, tenantId },
    select: { id: true, tags: true },
  });

  if (!lead) return NextResponse.json({ error: "Диалог не найден" }, { status: 404 });

  await prisma.lead.update({
    where: { id: lead.id },
    data: {
      deletedAt: null,
      updatedAt: new Date(),
      tags: Array.from(new Set([...(lead.tags || []), "messenger", "restored"])),
    },
  });

  return NextResponse.json({ ok: true });
}
