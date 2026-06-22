import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPushToStaff } from "@/lib/push";
import {
  buildArayBusinessEventPayload,
  buildArayBusinessEventPlan,
  formatArayBusinessEventForCrm,
  type ArayBusinessEventKind,
} from "@/lib/aray-business-events";

export const dynamic = "force-dynamic";

type StoryMessageKind = "question" | "review" | "comment" | "offer";

type StoryAttachmentMeta = {
  name: string;
  kind: "image" | "document";
  size: number;
};

const storyEventKind: Record<StoryMessageKind, ArayBusinessEventKind> = {
  question: "story.question",
  offer: "story.offer",
  review: "story.review",
  comment: "story.comment",
};

const storyMessageRateLimit = new Map<string, { count: number; resetAt: number }>();

function cleanText(value: unknown, max = 1200) {
  if (typeof value !== "string") return "";
  return value
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, max);
}

function cleanKind(value: unknown): StoryMessageKind {
  if (value === "review" || value === "comment" || value === "offer") return value;
  return "question";
}

function cleanAttachments(value: unknown): StoryAttachmentMeta[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const meta = item as Record<string, unknown>;
      const name = cleanText(meta.name, 120);
      const kind = meta.kind === "image" ? "image" : "document";
      const size = Number(meta.size) || 0;
      if (!name) return null;
      return { name, kind, size: Math.max(0, Math.round(size)) };
    })
    .filter((item): item is StoryAttachmentMeta => Boolean(item))
    .slice(0, 4);
}

function getClientKey(req: NextRequest, storyId: string) {
  const forwardedFor = req.headers.get("x-forwarded-for");
  const ip = forwardedFor ? forwardedFor.split(",")[0]?.trim() : req.headers.get("x-real-ip") || "unknown";
  return `story-message:${storyId}:${ip || "unknown"}`;
}

function checkRateLimit(key: string) {
  const now = Date.now();
  const windowMs = 10 * 60 * 1000;
  const existing = storyMessageRateLimit.get(key);
  if (!existing || existing.resetAt < now) {
    storyMessageRateLimit.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (existing.count >= 6) return false;
  existing.count += 1;
  return true;
}

function buildArayReply(kind: StoryMessageKind) {
  if (kind === "review") {
    return "Спасибо. Отзыв отправлен на модерацию, менеджер увидит сторис и связанный товар.";
  }
  if (kind === "offer") {
    return "Спасибо. Заявка на расчёт принята, менеджер быстро разберёт условия.";
  }
  if (kind === "comment") {
    return "Спасибо. Комментарий сохранён, менеджер увидит контекст сторис.";
  }
  return "Спасибо. Вопрос передан менеджеру, вам ответят по контексту сторис.";
}

function notificationPreview(primary: string, fallback: string) {
  return cleanText(primary || fallback, 90).replace(/\s+/g, " ").trim().slice(0, 80);
}

async function resolveStoryProductId(storyId: string, fallbackEntityType?: string | null, fallbackEntityId?: string | null) {
  const relation = await prisma.storeStoryRelation.findFirst({
    where: {
      storyId,
      entityType: "product",
    },
    orderBy: { sortOrder: "asc" },
    select: { entityId: true },
  });

  const entityId = relation?.entityId || (fallbackEntityType === "product" ? fallbackEntityId : null);
  if (!entityId) return null;

  const product = await prisma.product.findFirst({
    where: {
      OR: [{ id: entityId }, { slug: entityId }],
    },
    select: { id: true, name: true, slug: true },
  });

  return product;
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const storyId = params.id;
    const body = await req.json().catch(() => ({}));
    const kind = cleanKind(body.kind);
    const text = cleanText(body.text);
    const originalText = cleanText(body.originalText);
    const name = cleanText(body.name, 120) || "Гость из сторис";
    const phone = cleanText(body.phone, 80) || null;
    const email = cleanText(body.email, 160) || null;
    const rating = Math.min(5, Math.max(1, Number(body.rating) || 5));
    const pageUrl = cleanText(body.pageUrl, 500) || null;
    const attachments = cleanAttachments(body.attachments);

    if (body.website) {
      return NextResponse.json({ ok: true, arayReply: buildArayReply(kind) });
    }

    if (text.length < 3) {
      return NextResponse.json({ error: "Напишите сообщение" }, { status: 400 });
    }

    if (!checkRateLimit(getClientKey(req, storyId))) {
      return NextResponse.json({ error: "Слишком много сообщений. Попробуйте чуть позже." }, { status: 429 });
    }

    const story = await prisma.storeStory.findUnique({
      where: { id: storyId },
      select: {
        id: true,
        title: true,
        type: true,
        entityType: true,
        entityId: true,
      },
    });

    if (!story) {
      return NextResponse.json({ error: "Сторис не найдена" }, { status: 404 });
    }

    const context = [
      `Сторис: ${story.title}`,
      `Тип: ${story.type}`,
      story.entityType && story.entityId ? `Связь: ${story.entityType}:${story.entityId}` : null,
      pageUrl ? `Страница: ${pageUrl}` : null,
      originalText && originalText !== text ? `Первичный текст: ${originalText}` : null,
      `Сообщение: ${text}`,
      attachments.length
        ? `Вложения: ${attachments
            .map((item) => `${item.kind === "image" ? "фото" : "документ"} ${item.name} (${item.size} байт)`)
            .join(", ")}`
        : null,
    ]
      .filter(Boolean)
      .join("\n");

    const businessEventInput = {
      kind: storyEventKind[kind],
      source: "stories" as const,
      title: `${story.title}: ${kind}`,
      description: text,
      entity: {
        type: "STORE_STORY",
        id: story.id,
        label: story.title,
        href: pageUrl || `/stories?story=${story.id}`,
      },
      customer: { name, phone, email },
      niche: "lumber" as const,
      context: {
        storyId: story.id,
        storyType: story.type,
        storyEntityType: story.entityType,
        storyEntityId: story.entityId,
        attachmentsCount: attachments.length,
        pageUrl,
      },
    };
    const businessEventPlan = buildArayBusinessEventPlan(businessEventInput);
    const businessEventPayload = buildArayBusinessEventPayload(businessEventInput, businessEventPlan);
    const enrichedContext = `${context}\n\n${formatArayBusinessEventForCrm(businessEventPlan)}`;
    const staffPreview = notificationPreview(originalText, text);

    if (kind === "review") {
      const product = await resolveStoryProductId(story.id, story.entityType, story.entityId);
      const review = await prisma.review.create({
        data: {
          ...(product?.id ? { productId: product.id } : {}),
          name,
          rating,
          text,
          source: "story",
          sourceUrl: pageUrl || `/stories?story=${story.id}`,
          approved: false,
        },
      });

      await prisma.task
        .create({
          data: {
            title: `Проверить отзыв из сторис: ${story.title}`.slice(0, 140),
            description: enrichedContext,
            priority: "MEDIUM",
            tags: ["story", "review", "aray"],
            relations: {
              create: [
                {
                  entityType: "REVIEW",
                  entityId: review.id,
                  label: "Отзыв из сторис",
                  href: "/admin/reviews?status=pending",
                  metadata: { storyId: story.id, productId: product?.id || null, arayBusinessEvent: businessEventPayload },
                },
              ],
            },
          },
        })
        .catch(() => null);

      await sendPushToStaff({
        title: "Новый отзыв из сторис",
        body: `${name}: ${staffPreview}`,
        url: "/admin/reviews?status=pending",
      }).catch(() => null);

      return NextResponse.json({
        ok: true,
        kind,
        reviewId: review.id,
        arayReply: buildArayReply(kind),
        arayBusinessEvent: businessEventPayload,
      });
    }

    const lead = await prisma.lead.create({
      data: {
        name,
        phone,
        email,
        source: "WEBSITE",
        stage: "NEW",
        comment: enrichedContext,
        tags: [
          "Сторис",
          kind === "offer" ? "Предложение" : kind === "question" ? "Вопрос" : "Комментарий",
          "ARAY",
        ],
      },
    });

    const task = await prisma.task
      .create({
        data: {
          title: `${kind === "offer" ? "Разобрать предложение" : "Ответить на сообщение"} из сторис: ${story.title}`.slice(0, 140),
          description: enrichedContext,
          priority: kind === "offer" ? "MEDIUM" : "HIGH",
          tags: ["story", "lead", "aray"],
          relations: {
            create: [
              {
                entityType: "LEAD",
                entityId: lead.id,
                label: "Лид из сторис",
                href: `/admin/crm?leadId=${lead.id}`,
                metadata: { storyId: story.id, kind, arayBusinessEvent: businessEventPayload },
              },
            ],
          },
        },
      })
      .catch(() => null);

    await prisma.leadActivity
      .create({
        data: {
          leadId: lead.id,
          type: "NOTE",
          text: `Клиент: ${text}\n\nARAY Story: ${formatArayBusinessEventForCrm(businessEventPlan)}`,
        },
      })
      .catch(() => null);

    await sendPushToStaff({
      title: kind === "offer" ? "Расчёт из сторис" : "Сообщение из сторис",
      body: `${name}: ${staffPreview}`,
      url: `/admin/crm?leadId=${lead.id}`,
    }).catch(() => null);

    return NextResponse.json({
      ok: true,
      kind,
      leadId: lead.id,
      taskId: task?.id || null,
      arayReply: buildArayReply(kind),
      arayBusinessEvent: businessEventPayload,
    });
  } catch (error) {
    console.error("Story message error:", error);
    return NextResponse.json({ error: "Не удалось отправить сообщение" }, { status: 500 });
  }
}
