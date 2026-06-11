export const dynamic = "force-dynamic";

import Link from "next/link";
import { ArrowRight, Bot, CheckCircle2, FileText, FolderOpen, Sparkles } from "lucide-react";
import { ArayLaunchPrepareButton } from "@/components/aray/aray-launch-prepare-button";
import { Button } from "@/components/ui/button";
import { ARAY_BRIEF_FIELDS } from "@/lib/aray-agency-crm-foundation";
import { buildArayLeadBriefDraft } from "@/lib/aray-crm-automation";
import { prisma } from "@/lib/prisma";
import { getCurrentTenantId } from "@/lib/tenant-context";

const BRIEF_OUTPUTS = [
  "карточка бизнеса",
  "черновик ТЗ",
  "папка материалов",
  "производственные задачи",
  "стартовые SEO-данные",
  "пожелания по бренду",
];

const TASK_STATUS_LABELS: Record<string, string> = {
  BACKLOG: "следом",
  TODO: "сделать",
  IN_PROGRESS: "в работе",
  REVIEW: "проверка",
  DONE: "готово",
};

export default async function ArayBriefsPage({
  searchParams,
}: {
  searchParams?: { leadId?: string };
}) {
  const tenantId = getCurrentTenantId();
  const leadId = typeof searchParams?.leadId === "string" ? searchParams.leadId : "";
  const lead = leadId
    ? await prisma.lead
        .findFirst({
          where: {
            tenantId,
            id: leadId,
            deletedAt: null,
            tags: { has: "Клиентская заявка" },
          },
          select: {
            id: true,
            name: true,
            phone: true,
            company: true,
            comment: true,
            stage: true,
            createdAt: true,
          },
        })
        .catch(() => null)
    : null;
  const draft = lead ? buildArayLeadBriefDraft(lead) : null;
  const launchTasks = lead
    ? await prisma.task
        .findMany({
          where: {
            tenantId,
            tags: { has: "ARAY_LAUNCH" },
            relations: {
              some: {
                tenantId,
                entityType: "LEAD",
                entityId: lead.id,
              },
            },
          },
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            createdAt: true,
          },
          orderBy: [{ status: "asc" }, { createdAt: "asc" }],
        })
        .catch(() => [])
    : [];

  return (
    <div className="admin-page-frame admin-page-frame-readable">
      <section className="rounded-2xl border border-border bg-card px-5 py-6 lg:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              Business Brief
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
              Брифы клиентов
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Клиент рассказывает о бизнесе, материалах, целях и проблемах. ARAY
              превращает эти данные в понятное ТЗ, задачи и первый бренд-комплект.
            </p>
          </div>
          <Button asChild>
            <Link href="/admin/aray/orders">
              К заказам
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      {draft ? (
        <section className="rounded-2xl border border-primary/25 bg-primary/10 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Sparkles className="h-4 w-4 text-primary" />
                Черновик брифа из CRM-заявки
              </div>
              <h2 className="mt-3 text-xl font-semibold text-foreground">
                {draft.company || draft.clientName}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {draft.clientName} · {draft.phone || "телефон не указан"} · партнер: {draft.partner}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline">
                <Link href="/admin/aray/orders">
                  К очереди
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild>
                <Link href={`/admin/aray/builder?leadId=${lead!.id}`}>
                  Запуск сайта
                  <Sparkles className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Город / регион", value: draft.city || "уточнить" },
              { label: "Сфера", value: draft.business || "уточнить" },
              { label: "Интерес", value: draft.service },
              { label: "Статус CRM", value: draft.stage },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-border bg-card px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{item.label}</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_0.9fr]">
            <div className="rounded-2xl border border-border bg-card p-4">
              <h3 className="text-sm font-semibold text-foreground">Задача клиента</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {draft.task || "Пока в заявке нет подробной задачи. Ее нужно уточнить первым звонком."}
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-4">
              <h3 className="text-sm font-semibold text-foreground">Что доспросить</h3>
              <div className="mt-3 grid gap-2">
                {draft.missing.map((item) => (
                  <div key={item} className="flex gap-2 text-xs leading-5 text-muted-foreground">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-border bg-card p-4">
            <h3 className="text-sm font-semibold text-foreground">Следующие действия</h3>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {draft.nextSteps.map((item) => (
                <div key={item} className="flex gap-2 text-xs leading-5 text-muted-foreground">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-primary/25 bg-background p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-2xl">
                <h3 className="text-sm font-semibold text-foreground">Рабочий запуск ARAY</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Когда бриф понятен, фиксируем его в истории лида и создаем первые задачи: подтвердить бриф,
                  собрать структуру сайта из блоков, подготовить предложение и открыть производство.
                </p>
              </div>
              <ArayLaunchPrepareButton leadId={lead!.id} prepared={launchTasks.length > 0} />
            </div>

            {launchTasks.length > 0 ? (
              <div className="mt-4 grid gap-2 md:grid-cols-2">
                {launchTasks.map((task) => (
                  <div key={task.id} className="rounded-xl border border-border bg-card px-3 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-semibold leading-5 text-foreground">{task.title}</p>
                      <span className="shrink-0 rounded-full border border-border bg-background px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                        {TASK_STATUS_LABELS[task.status] || task.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 rounded-xl border border-border bg-card px-3 py-3 text-xs leading-5 text-muted-foreground">
                Задачи еще не созданы. Нажмите фиксацию брифа, когда можно начинать рабочий запуск.
              </p>
            )}
          </div>
        </section>
      ) : leadId ? (
        <section className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5">
          <h2 className="text-base font-semibold text-foreground">Заявка не найдена</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Возможно, заявка удалена или это не клиентская заявка ARAY. Вернитесь в очередь и выберите актуальную карточку.
          </p>
          <Button asChild className="mt-4" variant="outline">
            <Link href="/admin/aray/orders">
              К очереди заявок
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </section>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-base font-semibold text-foreground">Поля первого брифа</h2>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {ARAY_BRIEF_FIELDS.map((field) => (
              <div key={field} className="flex items-center gap-3 rounded-xl border border-border bg-background px-3 py-2.5">
                <FileText className="h-4 w-4 shrink-0 text-primary" />
                <span className="text-sm text-foreground">{field}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-base font-semibold text-foreground">Что создается из брифа</h2>
          <div className="mt-4 space-y-3">
            {BRIEF_OUTPUTS.map((item) => (
              <div key={item} className="flex gap-3 text-sm leading-6 text-muted-foreground">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        {[
          { title: "Материалы", text: "Фото, видео, логотип, презентации, старый сайт и доступы.", icon: FolderOpen },
          { title: "ARAY ТЗ", text: "Система собирает структуру работ и показывает менеджеру черновик.", icon: Bot },
          { title: "Brand Kit", text: "Цвета, тон, PWA, SEO-тон и визуальная подача уходят в бренд-комплект.", icon: Sparkles },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.title} className="rounded-2xl border border-border bg-card p-4">
              <Icon className="h-5 w-5 text-primary" />
              <h3 className="mt-3 text-sm font-semibold text-foreground">{item.title}</h3>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.text}</p>
            </div>
          );
        })}
      </section>
    </div>
  );
}
