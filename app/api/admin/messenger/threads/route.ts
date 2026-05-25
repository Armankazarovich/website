export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentTenantId } from "@/lib/tenant-context";
import { arayNumbersMatch, createStableArayNumber } from "@/lib/aray-communication-identity";

const MESSENGER_ROLES = ["SUPER_ADMIN", "ADMIN", "MANAGER", "SELLER"] as const;

async function getSession() {
  const session = await auth();
  const role = session?.user?.role;
  const id = session?.user?.id;
  if (!session || !MESSENGER_ROLES.includes(role as any)) return null;
  return { role, id };
}

function cleanText(value: unknown, maxLength = 1200) {
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

function normalizeSearch(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^\p{L}\p{N}@+]+/gu, " ")
    .replace(/\s+/g, " ");
}

function normalizeDigits(value: string) {
  return value.replace(/\D/g, "");
}

function searchTokens(value: string) {
  return normalizeSearch(value)
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

function textMatchesSearch(haystack: string, query: string) {
  const normalizedHaystack = normalizeSearch(haystack);
  const normalizedQuery = normalizeSearch(query);
  if (!normalizedQuery) return true;
  if (normalizedHaystack.includes(normalizedQuery)) return true;
  const tokens = searchTokens(query);
  return tokens.length > 0 && tokens.every((token) => normalizedHaystack.includes(token));
}

function moneyNumber(value: unknown) {
  const next = Number(value ?? 0);
  return Number.isFinite(next) ? next : 0;
}

function buildEmptyCommerceProfile() {
  return {
    orderCount: 0,
    paidOrderCount: 0,
    unpaidOrderCount: 0,
    totalAmount: 0,
    paidAmount: 0,
    pendingAmount: 0,
    lastOrderAt: null as string | null,
    bonusPoints: 0,
    loyaltyLevel: "Старт",
    walletStatus: "Расчетный",
    paymentSetupStatus: "Реквизиты и банк только по согласию",
  };
}

function loyaltyLevelByAmount(amount: number) {
  if (amount >= 300000) return "Платина";
  if (amount >= 100000) return "Золото";
  if (amount >= 30000) return "Серебро";
  return "Старт";
}

async function buildCommerceProfiles(leads: any[], tenantId: string) {
  const result = new Map<string, ReturnType<typeof buildEmptyCommerceProfile>>();
  for (const lead of leads) result.set(lead.id, buildEmptyCommerceProfile());

  const emails = Array.from(
    new Set(leads.map((lead) => cleanText(lead.email, 120).toLowerCase()).filter(Boolean)),
  );
  const phoneTails = Array.from(
    new Set(leads.map((lead) => normalizePhoneTail(lead.phone)).filter((tail) => tail.length >= 7)),
  );

  if (emails.length === 0 && phoneTails.length === 0) return result;

  const orders = await prisma.order.findMany({
    where: {
      tenantId,
      deletedAt: null,
      OR: [
        emails.length ? { guestEmail: { in: emails, mode: "insensitive" } } : undefined,
        ...(phoneTails.length ? [{ guestPhone: { not: null } }] : []),
      ].filter(Boolean) as any[],
    },
    select: {
      id: true,
      guestEmail: true,
      guestPhone: true,
      status: true,
      paymentStatus: true,
      totalAmount: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 300,
  });

  const payments = await prisma.payment.findMany({
    where: {
      tenantId,
      orderId: { in: orders.map((order) => order.id) },
    },
    select: {
      orderId: true,
      status: true,
      amount: true,
    },
  });
  const paidByOrder = new Map<string, number>();
  for (const payment of payments) {
    if (String(payment.status).toUpperCase() !== "PAID" || !payment.orderId) continue;
    paidByOrder.set(payment.orderId, (paidByOrder.get(payment.orderId) || 0) + moneyNumber(payment.amount));
  }

  for (const lead of leads) {
    const leadEmail = cleanText(lead.email, 120).toLowerCase();
    const leadPhoneTail = normalizePhoneTail(lead.phone);
    const profile = result.get(lead.id) || buildEmptyCommerceProfile();
    const matchedOrders = orders.filter((order) => {
      const orderEmail = cleanText(order.guestEmail, 120).toLowerCase();
      const orderPhoneTail = normalizePhoneTail(order.guestPhone);
      return (
        (leadEmail && orderEmail && leadEmail === orderEmail) ||
        (leadPhoneTail.length >= 7 && orderPhoneTail.endsWith(leadPhoneTail.slice(-7)))
      );
    });

    for (const order of matchedOrders) {
      const total = moneyNumber(order.totalAmount);
      const paid = Math.min(total, paidByOrder.get(order.id) || 0);
      const status = String(order.paymentStatus || "").toUpperCase();
      const orderCompleted = ["COMPLETED", "DELIVERED"].includes(String(order.status).toUpperCase());
      const orderPaid = status === "PAID" || paid >= total || orderCompleted;

      profile.orderCount += 1;
      profile.totalAmount += total;
      profile.paidAmount += orderPaid ? Math.max(total, paid) : paid;
      profile.pendingAmount += orderPaid ? 0 : Math.max(total - paid, 0);
      profile.paidOrderCount += orderPaid ? 1 : 0;
      profile.unpaidOrderCount += orderPaid ? 0 : 1;
      if (!profile.lastOrderAt) profile.lastOrderAt = order.createdAt.toISOString();
    }

    profile.bonusPoints = Math.floor(Math.max(profile.paidAmount, 0) * 0.03);
    profile.loyaltyLevel = loyaltyLevelByAmount(profile.paidAmount);
    result.set(lead.id, profile);
  }

  return result;
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

function serializeThread(lead: any, commerce = buildEmptyCommerceProfile()) {
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
    deletedAt: lead.deletedAt ? lead.deletedAt.toISOString() : null,
    assignee: lead.assignee
      ? { id: lead.assignee.id, name: lead.assignee.name, email: lead.assignee.email }
      : null,
    activities,
    activityCount: lead._count?.activities ?? activities.length,
    lastActivityText: last?.text || lead.comment || "",
    lastActivityAt: last?.createdAt || lead.updatedAt.toISOString(),
    commerce,
  };
}

function roleLabel(role: string | null | undefined) {
  const labels: Record<string, string> = {
    SUPER_ADMIN: "Администратор",
    ADMIN: "Администратор",
    MANAGER: "Менеджер",
    SELLER: "Продажи",
    COURIER: "Курьер",
    ACCOUNTANT: "Бухгалтерия",
    WAREHOUSE: "Склад",
    USER: "Клиент",
  };
  return labels[String(role || "USER")] || "Аккаунт";
}

function serializeAccountSuggestion(user: any) {
  const arayNumber = createStableArayNumber({ id: `account:${user.id}` });
  const now = user.updatedAt?.toISOString?.() || new Date().toISOString();

  return {
    id: `account:${user.id}`,
    name: user.name || user.email || user.phone || "Аккаунт ARAY",
    phone: user.phone || null,
    email: user.email || null,
    company: roleLabel(user.role),
    source: "OTHER",
    stage: "CONTACTED",
    value: null,
    currency: "RUB",
    comment: `AR Phone: ${arayNumber}`,
    tags: ["account", "aray-phone", "directory"],
    createdAt: user.createdAt?.toISOString?.() || now,
    updatedAt: now,
    deletedAt: null,
    assignee: null,
    activities: [],
    activityCount: 0,
    lastActivityText: "Аккаунт платформы. Нажми, чтобы открыть чат и звонки.",
    lastActivityAt: now,
    commerce: buildEmptyCommerceProfile(),
    virtualKind: "account",
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

async function findExistingThreadCandidate(tx: any, tenantId: string, email: string | null, phone: string | null) {
  const phoneTail = normalizePhoneTail(phone);
  if (!email && !phoneTail) return null;
  const candidates = await tx.lead.findMany({
    where: {
      tenantId,
      OR: [
        email ? { email: { equals: email, mode: "insensitive" } } : undefined,
        phoneTail ? { phone: { not: null } } : undefined,
      ].filter(Boolean),
    },
    include: threadInclude,
    orderBy: { updatedAt: "desc" },
    take: 120,
  });

  return candidates.find((lead: any) => {
    const sameEmail = email && lead.email && String(lead.email).toLowerCase() === email.toLowerCase();
    const leadPhoneTail = normalizePhoneTail(lead.phone);
    const samePhone = phoneTail && leadPhoneTail && (
      leadPhoneTail.endsWith(phoneTail.slice(-7)) || phoneTail.endsWith(leadPhoneTail.slice(-7))
    );
    return sameEmail || samePhone;
  }) || null;
}

export async function GET(req: NextRequest) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = getCurrentTenantId();

  const { searchParams } = new URL(req.url);
  const search = cleanText(searchParams.get("search"), 120);
  const leadId = cleanText(searchParams.get("leadId"), 120);
  const normalizedSearch = normalizeSearch(search);
  const searchDigits = normalizeDigits(search);
  const searchHasDigits = searchDigits.length >= 3;

  const where: any = {
    tenantId,
    ...(search ? {} : { deletedAt: null }),
    ...(leadId
      ? { id: leadId }
      : search
      ? {}
      : {}),
  };

  const dbSearchWhere =
    search
      ? {
          tenantId,
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { phone: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
            { company: { contains: search, mode: "insensitive" as const } },
            { comment: { contains: search, mode: "insensitive" as const } },
            { activities: { some: { text: { contains: search, mode: "insensitive" as const } } } },
          ],
        }
      : where;

  const [recentLeads, directLeads, matchingUsers, openCount] = await Promise.all([
    prisma.lead.findMany({
      where,
      include: threadInclude,
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      take: search ? 1000 : 60,
    }),
    search
      ? prisma.lead.findMany({
          where: dbSearchWhere,
          include: threadInclude,
          orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
          take: 500,
        })
      : Promise.resolve([]),
    search
      ? prisma.user.findMany({
          where: {
            tenantId,
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
              { phone: { contains: search, mode: "insensitive" } },
            ],
          },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { updatedAt: "desc" },
          take: 60,
        })
      : Promise.resolve([]),
    prisma.lead.count({ where: { tenantId, deletedAt: null, stage: { notIn: ["WON", "LOST"] as any } } }),
  ]);

  const rawLeads = Array.from(
    new Map([...recentLeads, ...directLeads].map((lead) => [lead.id, lead])).values(),
  );

  const leads = search
    ? rawLeads
        .filter((lead) => {
          const haystack = [
            lead.name,
            lead.phone,
            lead.email,
            lead.company,
            lead.comment,
            ...(lead.tags || []),
            ...(lead.activities || []).map((activity: any) => activity.text),
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          const phoneDigits = normalizeDigits(String(lead.phone || ""));
          const arayNumber = createStableArayNumber({ id: lead.id });

          return (
            !normalizedSearch ||
            textMatchesSearch(haystack, normalizedSearch) ||
            (searchHasDigits && phoneDigits.endsWith(searchDigits.slice(-7))) ||
            arayNumbersMatch(arayNumber, search)
          );
        })
        .sort((a, b) => {
          const aDeleted = a.deletedAt ? 1 : 0;
          const bDeleted = b.deletedAt ? 1 : 0;
          if (aDeleted !== bDeleted) return aDeleted - bDeleted;
          return b.updatedAt.getTime() - a.updatedAt.getTime();
        })
        .slice(0, 60)
    : rawLeads;
  const commerceProfiles = await buildCommerceProfiles(leads, tenantId);
  const leadIdentityKeys = new Set(
    leads.flatMap((lead) => [
      lead.email ? `email:${String(lead.email).toLowerCase()}` : "",
      normalizePhoneTail(lead.phone) ? `phone:${normalizePhoneTail(lead.phone)}` : "",
    ]).filter(Boolean),
  );
  const accountSuggestions = search
    ? matchingUsers
        .filter((user) => {
          const arayNumber = createStableArayNumber({ id: `account:${user.id}` });
          const phoneTail = normalizePhoneTail(user.phone);
          const alreadyInLead =
            (user.email && leadIdentityKeys.has(`email:${String(user.email).toLowerCase()}`)) ||
            (phoneTail && leadIdentityKeys.has(`phone:${phoneTail}`));
          if (alreadyInLead) return false;
          return (
            textMatchesSearch([user.name, user.email, user.phone, roleLabel(user.role)].filter(Boolean).join(" "), search) ||
            arayNumbersMatch(arayNumber, search)
          );
        })
        .slice(0, Math.max(0, 12 - Math.min(leads.length, 12)))
        .map(serializeAccountSuggestion)
    : [];
  const threadResults = [
    ...leads.map((lead) => serializeThread(lead, commerceProfiles.get(lead.id))),
    ...accountSuggestions,
  ];

  return NextResponse.json({
    threads: threadResults,
    stats: {
      threads: threadResults.length,
      open: openCount,
    },
  });
}

export async function POST(req: NextRequest) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = getCurrentTenantId();

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректные данные диалога" }, { status: 400 });
  }

  const name = cleanText(body.name, 120) || "Новый диалог";
  const phone = cleanText(body.phone, 60) || null;
  const email = cleanText(body.email, 120) || null;
  const company = cleanText(body.company, 120) || null;
  const message = cleanText(body.message, 1200);

  const thread = await prisma.$transaction(async (tx) => {
    const existing = await findExistingThreadCandidate(tx, tenantId, email, phone);
    if (existing) {
      if (message) {
        await tx.leadActivity.create({
          data: {
            leadId: existing.id,
            type: "NOTE",
            text: `Клиент: ${message}`,
            userId: s.id,
          },
        });
      }
      await tx.lead.update({
        where: { id: existing.id },
        data: {
          deletedAt: null,
          updatedAt: new Date(),
          assigneeId: existing.assigneeId || s.id,
          tags: Array.from(new Set([...(existing.tags || []), "messenger"])),
        },
      });
      return tx.lead.findUniqueOrThrow({
        where: { id: existing.id },
        include: threadInclude,
      });
    }

    const lead = await tx.lead.create({
      data: {
        tenantId,
        name,
        phone,
        email,
        company,
        source: "OTHER",
        stage: "NEW",
        comment: message || null,
        assigneeId: s.id,
        tags: ["messenger"],
      },
    });

    await tx.leadActivity.create({
      data: {
        leadId: lead.id,
        type: "SYSTEM",
        text: "Диалог создан в ARAY Messenger",
        userId: s.id,
      },
    });

    if (message) {
      await tx.leadActivity.create({
        data: {
          leadId: lead.id,
          type: "NOTE",
          text: `Клиент: ${message}`,
          userId: s.id,
        },
      });
    }

    return tx.lead.findUniqueOrThrow({
      where: { id: lead.id },
      include: threadInclude,
    });
  });

  return NextResponse.json({ thread: serializeThread(thread) }, { status: 201 });
}
