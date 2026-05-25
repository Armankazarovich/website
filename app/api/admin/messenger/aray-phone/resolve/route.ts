export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createStableArayNumber, arayNumbersMatch } from "@/lib/aray-communication-identity";
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

function cleanText(value: unknown, maxLength = 120) {
  if (typeof value !== "string") return "";
  return value
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, maxLength);
}

function normalizePhoneTail(value: unknown) {
  if (typeof value !== "string") return "";
  const digits = value.replace(/\D/g, "");
  return digits.length >= 7 ? digits.slice(-10) : digits;
}

function serializeActivity(activity: any) {
  return {
    id: activity.id,
    leadId: activity.leadId,
    type: activity.type,
    text: activity.text,
    createdAt: activity.createdAt.toISOString(),
    user: activity.user
      ? { id: activity.user.id, name: activity.user.name, email: activity.user.email }
      : null,
  };
}

function serializeThread(lead: any) {
  const activities = [...(lead.activities || [])]
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    .map(serializeActivity);
  const last = activities[activities.length - 1] || null;

  return {
    id: lead.id,
    name: lead.name,
    phone: lead.phone,
    email: lead.email,
    company: lead.company,
    source: lead.source,
    stage: lead.stage,
    value: lead.value ? lead.value.toString() : null,
    currency: lead.currency,
    comment: lead.comment,
    tags: lead.tags || [],
    createdAt: lead.createdAt.toISOString(),
    updatedAt: lead.updatedAt.toISOString(),
    assignee: lead.assignee
      ? { id: lead.assignee.id, name: lead.assignee.name, email: lead.assignee.email }
      : null,
    activities,
    activityCount: lead._count?.activities ?? activities.length,
    lastActivityText: last?.text || lead.comment || "",
    lastActivityAt: last?.createdAt || lead.updatedAt.toISOString(),
  };
}

const threadInclude = {
  assignee: { select: { id: true, name: true, email: true } },
  activities: {
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "desc" as const },
    take: 80,
  },
  _count: { select: { activities: true } },
};

async function findLeadForUser(tx: any, tenantId: string, user: { email: string | null; phone: string | null }) {
  if (user.email) {
    const byEmail = await tx.lead.findFirst({
      where: {
        tenantId,
        email: { equals: user.email, mode: "insensitive" },
      },
      include: threadInclude,
      orderBy: { updatedAt: "desc" },
    });
    if (byEmail) return byEmail;
  }

  const phoneTail = normalizePhoneTail(user.phone);
  if (!phoneTail) return null;

  const candidates = await tx.lead.findMany({
    where: {
      tenantId,
      phone: { not: null },
    },
    include: threadInclude,
    orderBy: { updatedAt: "desc" },
    take: 120,
  });

  return candidates.find((lead: any) => {
    const leadTail = normalizePhoneTail(lead.phone);
    return leadTail && (leadTail.endsWith(phoneTail.slice(-7)) || phoneTail.endsWith(leadTail.slice(-7)));
  }) || null;
}

async function findLeadByArayDial(tx: any, tenantId: string, dial: string) {
  const dialTail = normalizePhoneTail(dial);
  const candidates = await tx.lead.findMany({
    where: {
      tenantId,
    },
    include: threadInclude,
    orderBy: { updatedAt: "desc" },
    take: 1000,
  });

  return candidates.find((lead: any) => {
    const arayNumber = createStableArayNumber({ id: lead.id });
    const leadTail = normalizePhoneTail(lead.phone);
    return (
      arayNumbersMatch(arayNumber, dial) ||
      (dialTail.length >= 7 &&
        leadTail &&
        (leadTail.endsWith(dialTail.slice(-7)) || dialTail.endsWith(leadTail.slice(-7))))
    );
  }) || null;
}

export async function POST(req: NextRequest) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = getCurrentTenantId();

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный номер AR Phone" }, { status: 400 });
  }

  const dial = cleanText(body.number, 80).toUpperCase();
  if (!dial) return NextResponse.json({ error: "Введите AR Phone номер" }, { status: 400 });

  const matchedLead = await findLeadByArayDial(prisma, tenantId, dial);
  if (matchedLead) {
    const activeLead = matchedLead.deletedAt
      ? await prisma.lead.update({
          where: { id: matchedLead.id },
          data: {
            deletedAt: null,
            updatedAt: new Date(),
            tags: Array.from(new Set([...(matchedLead.tags || []), "messenger", "restored"])),
          },
          include: threadInclude,
        })
      : matchedLead;
    return NextResponse.json({
      found: true,
      arayNumber: createStableArayNumber({ id: activeLead.id }),
      thread: serializeThread(activeLead),
    });
  }

  const users = await prisma.user.findMany({
    where: { tenantId },
    select: { id: true, name: true, email: true, phone: true, role: true },
    take: 500,
  });

  const matchedUser = users.find((user) => {
    const arayNumber = createStableArayNumber({ id: `account:${user.id}` });
    return arayNumbersMatch(arayNumber, dial);
  });

  if (!matchedUser) {
    return NextResponse.json(
      { found: false, error: "Такой AR Phone номер пока не найден" },
      { status: 404 },
    );
  }

  const arayNumber = createStableArayNumber({ id: `account:${matchedUser.id}` });
  const thread = await prisma.$transaction(async (tx) => {
    const existing = await findLeadForUser(tx, tenantId, matchedUser);
    if (existing) {
      const comment = String(existing.comment || "");
      const tags = Array.isArray(existing.tags) ? existing.tags : [];
      const needsNumber = !comment.includes(arayNumber);
      const needsTag = !tags.includes("aray-phone");
      if (needsNumber || needsTag) {
        await tx.lead.update({
          where: { id: existing.id },
          data: {
            deletedAt: null,
            comment: needsNumber
              ? [comment, `AR Phone: ${arayNumber}`].filter(Boolean).join("\n")
              : existing.comment,
            tags: needsTag ? Array.from(new Set([...tags, "aray-phone", "internal-contact"])) : tags,
            updatedAt: new Date(),
          },
        });
        return tx.lead.findUniqueOrThrow({
          where: { id: existing.id },
          include: threadInclude,
        });
      }
      if (existing.deletedAt) {
        await tx.lead.update({
          where: { id: existing.id },
          data: { deletedAt: null, updatedAt: new Date() },
        });
        return tx.lead.findUniqueOrThrow({
          where: { id: existing.id },
          include: threadInclude,
        });
      }
      return existing;
    }

    const lead = await tx.lead.create({
      data: {
        tenantId,
        name: matchedUser.name || matchedUser.email || matchedUser.phone || "AR Phone контакт",
        phone: matchedUser.phone || null,
        email: matchedUser.email || null,
        source: "OTHER",
        stage: "CONTACTED",
        comment: `AR Phone: ${arayNumber}`,
        assigneeId: s.id,
        tags: ["aray-phone", "internal-contact"],
      },
    });

    await tx.leadActivity.create({
      data: {
        leadId: lead.id,
        type: "SYSTEM",
        text: `Система: Контакт найден по AR Phone номеру ${arayNumber}`,
        userId: s.id,
      },
    });

    return tx.lead.findUniqueOrThrow({
      where: { id: lead.id },
      include: threadInclude,
    });
  });

  return NextResponse.json({
    found: true,
    arayNumber,
    thread: serializeThread(thread),
  });
}
