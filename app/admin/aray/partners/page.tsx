export const dynamic = "force-dynamic";

import Link from "next/link";
import { ArrowRight, Banknote, Building2, CheckCircle2, FileText, Landmark, MapPin, Megaphone, Package, ShieldCheck, Users, Workflow } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ARAY_AGENCY_NEXT_STEPS,
  ARAY_PARTNER_STATUSES,
} from "@/lib/aray-agency-crm-foundation";
import { prisma } from "@/lib/prisma";
import {
  ARAY_ADMIN_EXTENSION_LAYERS,
  ARAY_PARTNER_FIRST_ENTRY,
  ARAY_PARTNER_LAUNCH_SURFACES,
  ARAY_PARTNER_PAYMENT_ACTION_STATUS_CLASSES,
  ARAY_PARTNER_PAYMENT_ACTION_STATUS_LABELS,
  ARAY_PARTNER_PAYMENT_ACTIONS,
  ARAY_PARTNER_STUDIO_ACCESS_RULES,
  ARAY_PILOT_PARTNER,
  ARAY_PILOT_PARTNER_PROJECTS,
  ARAY_PILOT_PARTNER_TEAM,
} from "@/lib/aray-pilot-partner";
import { getCurrentTenantId } from "@/lib/tenant-context";

const formatRub = (value: number) =>
  new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(value);

const PARTNER_RULES = [
  "партнер подает заявку и проходит проверку",
  "активный доступ появляется только после договора",
  "партнер работает в своем регионе и видит только своих клиентов",
  "первый запуск: Россия, ИП/ООО и ручная юридическая проверка",
];

export default async function ArayPartnersPage() {
  const tenantId = getCurrentTenantId();
  const clientLeads = await prisma.lead
    .findMany({
      where: {
        tenantId,
        deletedAt: null,
        tags: { has: "ARAY" },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        name: true,
        company: true,
        phone: true,
        stage: true,
        value: true,
        currency: true,
        comment: true,
        createdAt: true,
      },
    })
    .catch(() => []);

  const partnershipLeads = await prisma.partnershipLead
    .findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 5,
    })
    .catch(() => []);

  return (
    <div className="admin-page-frame admin-page-frame-readable">
      <section className="rounded-2xl border border-border bg-card px-5 py-6 lg:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              ARAY Partner OS
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
              Партнеры и регионы
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Первый контур партнерской сети: заявка партнера, проверка, город, договор,
              клиенты, 50/50 экономика и связь с производственной CRM ARAY/Yuva.
            </p>
          </div>
          <Button asChild>
            <Link href="/admin/aray/orders">
              Заказы партнеров
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-4">
        {[
          { label: "Пилот", value: "Россия", icon: MapPin },
          { label: "Первый партнер", value: "Yuva Studio", icon: Building2 },
          { label: "Модель", value: "50 / 50", icon: CheckCircle2 },
          { label: "Проекты", value: "Зедер / Пилорус", icon: ShieldCheck },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="rounded-2xl border border-border bg-card p-4">
              <Icon className="h-5 w-5 text-primary" />
              <p className="mt-3 text-xs text-muted-foreground">{item.label}</p>
              <p className="mt-1 text-lg font-semibold text-foreground">{item.value}</p>
            </div>
          );
        })}
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Workflow className="h-4 w-4 text-primary" />
          Архитектура ARAY внутри нашей админки
        </div>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Мы не делаем отдельную систему с нуля. Мы дополняем существующую CRM, заказы, задачи, уведомления,
          платежи и роли отдельным ARAY-контуром для партнерских студий и маркетингового производства.
        </p>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {ARAY_ADMIN_EXTENSION_LAYERS.map((layer) => (
            <div key={layer.title} className="rounded-xl border border-border bg-background p-4">
              <h3 className="text-sm font-semibold text-foreground">{layer.title}</h3>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">{layer.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              Первый вход партнера
            </div>
            <h2 className="mt-3 text-xl font-semibold text-foreground">
              Yuva Studio как первый партнерский кабинет
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Партнером остается студия. Люди внутри студии получают роли: владелец, админ,
              менеджер, контент или бухгалтер. Арман в пилоте может работать как менеджер
              Yuva Studio и одновременно держать контроль всей платформы ARAY.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href="/aray/partners/apply">
                Регистрация
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/admin/aray/orders">
                Заказы
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild>
              <Link href="/admin/aray/builder">
                Запуск сайтов
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {ARAY_PARTNER_FIRST_ENTRY.map((step, index) => (
            <Link
              key={step.title}
              href={step.href}
              className="group rounded-xl border border-border bg-background p-4 transition-colors hover:border-primary/35 hover:bg-primary/[0.035]"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {index + 1}
              </span>
              <h3 className="mt-3 text-sm font-semibold text-foreground">{step.title}</h3>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">{step.text}</p>
              <div className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-primary">
                {step.action}
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Workflow className="h-4 w-4 text-primary" />
          Запуск из CRM, заказа или ARAY
        </div>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          Партнер не ищет технический раздел вручную. Он работает с клиентом, а система ведет его:
          заявка, бриф, счет, запуск сайта, PWA, SEO, производство, аналитика и отчет.
        </p>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {ARAY_PARTNER_LAUNCH_SURFACES.map((surface) => (
            <Link
              key={surface.title}
              href={surface.href}
              className="group rounded-xl border border-border bg-background p-4 transition-colors hover:border-primary/35 hover:bg-primary/[0.035]"
            >
              <h3 className="text-sm font-semibold text-foreground">{surface.title}</h3>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">{surface.text}</p>
              <div className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-primary">
                {surface.action}
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Building2 className="h-4 w-4 text-primary" />
                Пилотный партнер
              </div>
              <h2 className="mt-3 text-xl font-semibold text-foreground">{ARAY_PILOT_PARTNER.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{ARAY_PILOT_PARTNER.legalProfile}</p>
            </div>
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-300">
              {ARAY_PILOT_PARTNER.status}
            </span>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {[
              { label: "Регион", value: ARAY_PILOT_PARTNER.region },
              { label: "Город", value: ARAY_PILOT_PARTNER.city },
              { label: "Профиль оплат", value: "закрытый профиль ИП" },
              { label: "Доступ к реквизитам", value: "только внутри админки" },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-border bg-background px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{item.label}</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-xl border border-primary/25 bg-primary/10 p-4">
            <div className="flex gap-3">
              <Landmark className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div>
                <p className="text-sm font-semibold text-foreground">{ARAY_PILOT_PARTNER.bankVisibility}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{ARAY_PILOT_PARTNER.rule}</p>
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/aray/partners/yuva-studio">
                Страница партнера
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/admin/aray/briefs">
                Добавить клиента
                <FileText className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={ARAY_PILOT_PARTNER.website}>
                Сайт Yuva
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/admin/aray/requisites">
                Реквизиты
                <Landmark className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/admin/aray/orders">
                Заказы
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/admin/aray/builder">
                Запуск сайтов
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Package className="h-4 w-4 text-primary" />
            Прикрепленные проекты
          </div>
          <div className="mt-4 grid gap-3">
            {ARAY_PILOT_PARTNER_PROJECTS.map((project) => (
              <div key={project.id} className="rounded-xl border border-border bg-background p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{project.title}</h3>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{project.role}</p>
                  </div>
                  <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
                    прикреплен
                  </span>
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <div className="rounded-xl border border-border bg-card px-3 py-2">
                    <p className="text-[11px] text-muted-foreground">Клиент платит партнеру</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {formatRub(project.monthlyClientPaymentRub)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border bg-card px-3 py-2">
                    <p className="text-[11px] text-muted-foreground">Партнер платит ARAY/Yuva</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {formatRub(project.monthlyArayPaymentRub)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Megaphone className="h-4 w-4 text-primary" />
              Клиентские заявки Yuva Studio
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Заявки с витрины идут в CRM как клиентские лиды: клиент видит 150 000 ₽, а внутренняя экономика остается закрытой.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href="/aray/marketing/apply">
                Форма клиента
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/admin/crm">
                CRM
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>

        {clientLeads.length > 0 ? (
          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {clientLeads.map((lead) => (
              <div key={lead.id} className="rounded-xl border border-border bg-background p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{lead.name}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {lead.company || "компания не указана"} · {lead.phone || "телефон не указан"}
                    </p>
                  </div>
                  <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-300">
                    клиент
                  </span>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <div className="rounded-xl border border-border bg-card px-3 py-2">
                    <p className="text-[11px] text-muted-foreground">Пакет</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {lead.value ? formatRub(Number(lead.value)) : "150 000 ₽"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border bg-card px-3 py-2">
                    <p className="text-[11px] text-muted-foreground">Статус CRM</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">{lead.stage}</p>
                  </div>
                </div>
                {lead.comment && (
                  <p className="mt-3 line-clamp-3 text-xs leading-5 text-muted-foreground">{lead.comment}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-5 rounded-xl border border-border bg-background p-5 text-sm text-muted-foreground">
            Пока клиентских заявок нет. Когда клиент заполнит форму маркетинга, он появится здесь и в CRM-лидах.
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Users className="h-4 w-4 text-primary" />
              Команда партнерской студии
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Yuva Studio работает как аккаунт студии: Араик, Арман, Вика и будущие сотрудники получают свои роли и доступы.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/admin/staff">
              Сотрудники
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          {ARAY_PILOT_PARTNER_TEAM.map((member) => (
            <div key={member.name} className="rounded-xl border border-border bg-background p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{member.name}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{member.role}</p>
                </div>
                <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
                  роль
                </span>
              </div>
              <p className="mt-3 text-xs font-medium text-foreground">{member.access}</p>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">{member.note}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          {ARAY_PARTNER_STUDIO_ACCESS_RULES.map((rule) => (
            <div key={rule} className="flex gap-3 rounded-xl border border-border bg-card px-3 py-3 text-xs leading-5 text-muted-foreground">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>{rule}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Banknote className="h-4 w-4 text-primary" />
              Кнопки платежного потока
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Пилотный путь для Yuva Studio: клиентская оплата, обязательство перед ARAY/Yuva и запуск производства.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/aray/brand-assets/documents/aray-payments-requisites-ru.html">
              Правила оплат
              <FileText className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {ARAY_PARTNER_PAYMENT_ACTIONS.map((action) => (
            <Link
              key={action.title}
              href={action.href}
              className="group rounded-xl border border-border bg-background p-4 transition-colors hover:border-primary/35 hover:bg-primary/[0.035]"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-sm font-semibold text-foreground">{action.title}</h3>
                <span
                  className={`rounded-full border px-2 py-1 text-[10px] font-semibold ${
                    ARAY_PARTNER_PAYMENT_ACTION_STATUS_CLASSES[action.status]
                  }`}
                >
                  {ARAY_PARTNER_PAYMENT_ACTION_STATUS_LABELS[action.status]}
                </span>
              </div>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">{action.text}</p>
              <div className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-primary">
                Открыть
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Заявки на партнерство
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Анкеты с публичной страницы приходят сюда, дальше мы проверяем регион, юрстатус и одобряем партнера.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/aray/partners/apply">
              Анкета
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        {partnershipLeads.length > 0 ? (
          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {partnershipLeads.map((lead) => (
              <div key={lead.id} className="rounded-xl border border-border bg-background p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{lead.name}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {lead.company || "компания не указана"} · {lead.phone}
                    </p>
                  </div>
                  <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
                    новая заявка
                  </span>
                </div>
                {lead.message && (
                  <p className="mt-3 line-clamp-3 text-xs leading-5 text-muted-foreground">{lead.message}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-5 rounded-xl border border-border bg-background p-5 text-sm text-muted-foreground">
            Пока новых заявок нет. После отправки анкеты партнер появится здесь и в CRM-лидах.
          </div>
        )}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-base font-semibold text-foreground">Статусы партнера</h2>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {ARAY_PARTNER_STATUSES.map((status, index) => (
              <div key={status} className="flex items-center gap-3 rounded-xl border border-border bg-background px-3 py-2.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {index + 1}
                </span>
                <span className="text-sm text-foreground">{status}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-base font-semibold text-foreground">Правила старта</h2>
          <div className="mt-4 space-y-3">
            {PARTNER_RULES.map((rule) => (
              <div key={rule} className="flex gap-3 text-sm leading-6 text-muted-foreground">
                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>{rule}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        {ARAY_AGENCY_NEXT_STEPS.map((step) => {
          const Icon = step.icon;
          return (
            <div key={step.title} className="rounded-2xl border border-border bg-card p-4">
              <Icon className="h-5 w-5 text-primary" />
              <h3 className="mt-3 text-sm font-semibold text-foreground">{step.title}</h3>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{step.text}</p>
            </div>
          );
        })}
      </section>
    </div>
  );
}
