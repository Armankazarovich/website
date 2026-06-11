export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireManager } from "@/lib/auth-helpers";
import { requireArayModuleAccess } from "@/lib/aray-module-auth";
import { ARAY_BUILDER_BLOCKS, getArayLaunchBlockPlan } from "@/lib/aray-block-builder";
import {
  ARAY_CLIENT_REQUEST_TAG,
  buildArayLeadBriefDraft,
} from "@/lib/aray-crm-automation";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import { getCurrentTenantId } from "@/lib/tenant-context";
import {
  isStoreConstructorBusinessType,
  type StoreConstructorBusinessType,
} from "@/lib/store-constructor-blueprints";

type SiteStatus = "draft" | "published";

type ConstructorSettings = {
  createdBy: "aray-production";
  status: SiteStatus;
  referralSource: string;
  networkMode: "single" | "network";
  networkId: string;
  networkName: string;
  siteCode: string;
  businessType: StoreConstructorBusinessType;
  city: string;
  contactName: string;
  phone: string;
  email: string;
  warehouse: string;
  workHours: string;
  delivery: string;
  payment: string;
  logoName: string;
  priceFileName: string;
  priceFileSize: number;
  managerName: string;
  referralCode: string;
  rewardPlan: string;
  notes: string;
  updatedById: string;
  updatedAt: string;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function cleanString(value: unknown, maxLength = 160) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function cleanBlockIds(value: unknown) {
  if (!Array.isArray(value)) return [];
  const allowed = new Set(ARAY_BUILDER_BLOCKS.map((block) => block.id));
  const seen = new Set<string>();

  return value
    .map((item) => cleanString(item, 80))
    .filter((id) => {
      if (!id || !allowed.has(id) || seen.has(id)) return false;
      seen.add(id);
      return true;
    })
    .slice(0, 12);
}

function cleanBlockDrafts(value: unknown, allowedIds: string[]) {
  if (!Array.isArray(value)) return {};
  const allowed = new Set(allowedIds);
  const drafts: Record<string, { title: string; text: string; action: string }> = {};

  for (const item of value) {
    const source = asRecord(item);
    const id = cleanString(source.id, 80);
    if (!allowed.has(id)) continue;

    drafts[id] = {
      title: cleanString(source.title, 180),
      text: cleanString(source.text, 900),
      action: cleanString(source.action, 80),
    };
  }

  return drafts;
}

function inferBusinessType(input: {
  business?: string;
  service?: string;
  task?: string;
}): StoreConstructorBusinessType {
  const direct = cleanString(input.business || input.service || "", 80);
  if (isStoreConstructorBusinessType(direct)) return direct;

  const text = `${input.business || ""} ${input.service || ""} ${input.task || ""}`.toLowerCase();
  if (/(пиломат|лес|доск|брус|lumber)/i.test(text)) return "lumber";
  if (/(строй|строит|материал|ремонт|construction)/i.test(text)) return "construction";
  if (/(ресторан|кафе|еда|доставка еды|restaurant)/i.test(text)) return "restaurant";
  if (/(салон|красот|beauty)/i.test(text)) return "beauty";
  if (/(услуг|сервис|маркетинг|сайт|crm|pwa|service)/i.test(text)) return "services";
  if (/(магазин|товар|retail|продаж)/i.test(text)) return "retail";
  return "universal";
}

function buildSiteSlug(input: { leadId: string; name: string; city?: string }) {
  const suffix = input.leadId.replace(/[^a-z0-9]/gi, "").slice(-6).toLowerCase() || Date.now().toString(36);
  const base = slugify([input.name, input.city].filter(Boolean).join(" ")).slice(0, 28) || "client-site";
  return `aray-${base}-${suffix}`.slice(0, 40).replace(/-+$/g, "");
}

function buildPreviewHref(input: {
  name: string;
  city: string;
  businessType: StoreConstructorBusinessType;
  accentColor: string;
  domain: string;
  source: string;
  tenantId: string;
  networkId: string;
  siteCode: string;
  managerName: string;
  referralCode: string;
  rewardPlan: string;
}) {
  const params = new URLSearchParams({ tenantPreview: input.tenantId });
  return `/catalog?${params.toString()}`;
}

export async function POST(req: Request) {
  const auth = await requireManager();
  if (!auth.authorized) return auth.response;

  const moduleAccess = await requireArayModuleAccess({
    moduleId: "constructor.store-builder",
    role: auth.role,
  });
  if (!moduleAccess.authorized) return moduleAccess.response;

  const currentTenantId = getCurrentTenantId();
  const body = asRecord(await req.json().catch(() => null));
  const leadId = cleanString(body.leadId, 128);

  if (body.confirm !== true) {
    return NextResponse.json({ ok: false, error: "Подтвердите создание черновика сайта" }, { status: 400 });
  }

  if (!leadId) {
    return NextResponse.json({ ok: false, error: "Не передана заявка" }, { status: 400 });
  }

  const lead = await prisma.lead.findFirst({
    where: {
      tenantId: currentTenantId,
      id: leadId,
      deletedAt: null,
      tags: { has: ARAY_CLIENT_REQUEST_TAG },
    },
    select: {
      id: true,
      name: true,
      phone: true,
      company: true,
      comment: true,
      stage: true,
      tags: true,
    },
  });

  if (!lead) {
    return NextResponse.json({ ok: false, error: "ARAY-заявка не найдена" }, { status: 404 });
  }

  const draft = buildArayLeadBriefDraft(lead);
  const plan = getArayLaunchBlockPlan(draft);
  const requestedBlockIds = cleanBlockIds(body.selectedBlockIds);
  const selectedBlockIds = requestedBlockIds.length > 0
    ? requestedBlockIds
    : plan.blocks.map((block) => block.id);
  const blockDrafts = cleanBlockDrafts(body.blockDrafts, selectedBlockIds);
  const selectedBlocks = plan.blocks
    .filter((block) => selectedBlockIds.includes(block.id))
    .map((block) => {
      const approvedDraft = blockDrafts[block.id];
      return {
        ...block,
        draft: approvedDraft
          ? {
              title: approvedDraft.title || block.draft.title,
              text: approvedDraft.text || block.draft.text,
              action: approvedDraft.action || block.draft.action,
            }
          : block.draft,
      };
    });

  if (selectedBlocks.length === 0) {
    return NextResponse.json({ ok: false, error: "Выберите хотя бы один блок" }, { status: 400 });
  }

  const client = draft.company || draft.clientName || "Новый клиент ARAY";
  const businessType = inferBusinessType(draft);
  const slug = buildSiteSlug({ leadId: lead.id, name: client, city: draft.city });
  const accentColor = "hsl(var(--primary))";
  const now = new Date().toISOString();
  const domain = `${slug}.pilo-rus.ru`;
  const adminHref = `/admin/site/constructor?tenant=${encodeURIComponent(slug)}`;
  const previewHref = buildPreviewHref({
    name: client,
    city: draft.city || "город уточняется",
    businessType,
    accentColor,
    domain,
    source: draft.partner || "ARAY",
    tenantId: slug,
    networkId: "single",
    siteCode: slug,
    managerName: draft.partner,
    referralCode: lead.id,
    rewardPlan: "ARAY partner launch",
  });
  const approvedBlocks = selectedBlocks.map((block) => ({
    id: block.id,
    title: block.title,
    purpose: block.purpose,
    reason: block.reason,
    status: block.status,
    draft: block.draft,
  }));
  const settingsRoot = asRecord((await prisma.tenant.findUnique({ where: { slug }, select: { settings: true } }))?.settings);
  const constructorSettings: ConstructorSettings = {
    createdBy: "aray-production",
    status: "draft",
    referralSource: draft.partner || "ARAY",
    networkMode: "single",
    networkId: "single",
    networkName: "",
    siteCode: slug,
    businessType,
    city: draft.city || "",
    contactName: draft.clientName,
    phone: draft.phone,
    email: "",
    warehouse: "",
    workHours: "",
    delivery: "Уточняется в брифе ARAY перед запуском.",
    payment: "Счет готовится после подтверждения условий клиентом.",
    logoName: "",
    priceFileName: "",
    priceFileSize: 0,
    managerName: draft.partner,
    referralCode: lead.id,
    rewardPlan: "ARAY partner launch",
    notes: [
      draft.task || "Черновик создан из ARAY-заявки.",
      `Эталон: ${plan.benchmark}.`,
      `Блоки: ${selectedBlocks.map((block) => block.title).join(", ")}.`,
    ].join("\n"),
    updatedById: auth.userId,
    updatedAt: now,
  };
  const activityText = [
    "ARAY: черновик сайта создан из CRM-заявки.",
    `Клиент: ${client}.`,
    `Сайт: ${slug}.`,
    `Эталон: ${plan.benchmark}.`,
    `Блоков в первом черновике: ${selectedBlocks.length}.`,
    `Превью: ${previewHref}.`,
    `Админка: ${adminHref}.`,
    "Следующий шаг: открыть превью, проверить смысл блоков и довести материалы перед публикацией.",
  ].join("\n");

  const result = await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.upsert({
      where: { slug },
      create: {
        slug,
        name: client,
        domain: null,
        primaryColor: accentColor,
        active: false,
        plan: "free",
        settings: {
          ...settingsRoot,
          storeConstructor: constructorSettings,
          arayLaunch: {
            source: "aray-site-shell",
            leadId: lead.id,
            partner: draft.partner,
            service: draft.service,
            benchmark: plan.benchmark,
            confidence: plan.confidence,
            selectedBlockIds,
            approvedBlocks,
            previewHref,
            adminHref,
            missing: draft.missing,
            createdAt: now,
          },
        },
      },
      update: {
        name: client,
        primaryColor: accentColor,
        active: false,
        settings: {
          ...settingsRoot,
          storeConstructor: constructorSettings,
          arayLaunch: {
            source: "aray-site-shell",
            leadId: lead.id,
            partner: draft.partner,
            service: draft.service,
            benchmark: plan.benchmark,
            confidence: plan.confidence,
            selectedBlockIds,
            approvedBlocks,
            previewHref,
            adminHref,
            missing: draft.missing,
            updatedAt: now,
          },
        },
      },
      select: {
        id: true,
        slug: true,
        name: true,
        active: true,
      },
    });

    const activity = await tx.leadActivity.create({
      data: {
        leadId: lead.id,
        type: "SYSTEM",
        text: activityText,
        userId: auth.userId,
      },
      select: { id: true },
    });

    const existingTask = await tx.task.findFirst({
      where: {
        tenantId: currentTenantId,
        tags: { has: "ARAY_SITE_SHELL" },
        relations: {
          some: {
            tenantId: currentTenantId,
            entityType: "LEAD",
            entityId: lead.id,
          },
        },
      },
      select: { id: true },
    });

    const task = existingTask
      ? await tx.task.update({
          where: { id: existingTask.id },
          data: {
            title: `ARAY: проверить черновик сайта — ${client}`,
            description: activityText,
            status: "TODO",
            tags: ["ARAY", "ARAY_LAUNCH", "ARAY_SITE_SHELL", `SITE:${slug}`],
          },
          select: { id: true, title: true },
        })
      : await tx.task.create({
          data: {
            tenantId: currentTenantId,
            title: `ARAY: проверить черновик сайта — ${client}`,
            description: activityText,
            status: "TODO",
            priority: "HIGH",
            createdById: auth.userId,
            tags: ["ARAY", "ARAY_LAUNCH", "ARAY_SITE_SHELL", `SITE:${slug}`],
            relations: {
              create: {
                tenantId: currentTenantId,
                entityType: "LEAD",
                entityId: lead.id,
                label: client,
                href: adminHref,
                metadata: {
                  source: "aray-site-shell",
                  tenantId: slug,
                  previewHref,
                  approvedBlocks,
                },
              },
            },
          },
          select: { id: true, title: true },
        });

    await tx.taskRelation.upsert({
      where: {
        taskId_entityType_entityId: {
          taskId: task.id,
          entityType: "LEAD",
          entityId: lead.id,
        },
      },
      update: {
        tenantId: currentTenantId,
        label: client,
        href: adminHref,
        metadata: {
          source: "aray-site-shell",
          tenantId: slug,
          previewHref,
          approvedBlocks,
        },
      },
      create: {
        tenantId: currentTenantId,
        taskId: task.id,
        entityType: "LEAD",
        entityId: lead.id,
        label: client,
        href: adminHref,
        metadata: {
          source: "aray-site-shell",
          tenantId: slug,
          previewHref,
          approvedBlocks,
        },
      },
    });

    await tx.lead.update({
      where: { id: lead.id },
      data: {
        tags: {
          set: Array.from(new Set([...lead.tags, "ARAY Site Draft", "Сайт-черновик"])),
        },
      },
    });

    return { tenant, activity, task };
  });

  return NextResponse.json({
    ok: true,
    leadId: lead.id,
    activityId: result.activity.id,
    task: result.task,
    site: {
      id: result.tenant.id,
      tenantId: result.tenant.slug,
      slug: result.tenant.slug,
      name: result.tenant.name,
      status: result.tenant.active ? "published" : "draft",
      previewHref,
      adminHref,
      selectedCount: selectedBlocks.length,
    },
  });
}
