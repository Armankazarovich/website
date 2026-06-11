export const dynamic = "force-dynamic";

import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  ClipboardList,
  Globe2,
  LayoutTemplate,
  ListChecks,
  Palette,
  PlusCircle,
  Settings2,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Store,
  TextCursorInput,
  WandSparkles,
} from "lucide-react";
import { ArayBlockPlanStudio } from "@/components/aray/aray-block-plan-studio";
import { ArayLaunchPrepareButton } from "@/components/aray/aray-launch-prepare-button";
import { Button } from "@/components/ui/button";
import { ARAY_CMS_INTERNET_STORE_TEMPLATE } from "@/lib/aray-cms-blueprints";
import { buildArayLeadBriefDraft } from "@/lib/aray-crm-automation";
import {
  ARAY_BUILDER_BLOCKS,
  ARAY_BUILDER_WORKFLOW,
  ARAY_EDITABLE_BUSINESS_AREAS,
  getArayBuilderReadiness,
  getArayLaunchBlockPlan,
  type ArayBuilderEditableField,
  type ArayBuilderBlockStatus,
} from "@/lib/aray-block-builder";
import { prisma } from "@/lib/prisma";
import { getCurrentTenantId } from "@/lib/tenant-context";

const statusLabel: Record<ArayBuilderBlockStatus, string> = {
  certified: "готово",
  draft: "доводим",
  planned: "план",
};

const statusClassName: Record<ArayBuilderBlockStatus, string> = {
  certified: "border-emerald-500/35 bg-emerald-500/10 text-emerald-300",
  draft: "border-amber-500/35 bg-amber-500/10 text-amber-300",
  planned: "border-sky-500/35 bg-sky-500/10 text-sky-300",
};

const fieldLabel: Record<ArayBuilderEditableField, string> = {
  eyebrow: "надпись",
  title: "заголовок",
  text: "текст",
  buttons: "кнопки",
  media: "фото",
  colors: "цвета",
  cards: "карточки",
  form: "форма",
  seo: "SEO",
  "crm-link": "CRM",
};

const quizQuestions = [
  {
    title: "Какой шаблон запуска?",
    text: "Интернет-магазин, сайт услуг, производство, B2B, обучение или другой тип проекта",
  },
  {
    title: "Что продаем клиенту?",
    text: "магазин, услуги, маркетинг под ключ, каталог, приложение или полный пакет",
  },
  {
    title: "Кто ведет клиента?",
    text: "партнерская студия, менеджер, ARAY/Yuva или владелец бизнеса",
  },
  {
    title: "Что меняем в дубле?",
    text: "бренд, цвета, тексты, товары, услуги, фото, формы, SEO и PWA",
  },
  {
    title: "Куда идет заказ?",
    text: "в CRM партнера, бриф, счет, производство ARAY/Yuva и отчет клиенту",
  },
];

const focusItems = [
  "Клиент видит заявку и результат, а не кухню сборки",
  "Партнер продает услугу и ведет клиента через CRM",
  "ARAY создает отдельный сайт и синхронно готовит админку, PWA и CRM-путь",
];

const quizOutputs = [
  "новый сайт",
  "новый сайт",
  "форма заявки",
  "карточка клиента",
  "заказ в CRM",
  "админка проекта",
  "бриф",
  "PWA-основа",
  "задачи производства",
];

const benchmarkTemplates = [
  {
    title: "Интернет-магазин",
    tag: "интернет-магазин",
    text: "Каталог, фильтры, карточки, корзина, заявки, PWA и админка.",
  },
  {
    title: "Производство",
    tag: "склад и заказы",
    text: "Продукция, менеджеры, статусы, производство, склад и рабочий поток.",
  },
  {
    title: "Сайт услуг",
    tag: "услуги",
    text: "Услуги, кейсы, команда, форма заявки, CRM и материалы клиента.",
  },
  {
    title: "Маркетинг",
    tag: "услуга под ключ",
    text: "Сайт, PWA, SEO, реклама, бренд, CRM, ИИ и отчетность в одном пакете.",
  },
];

const crmLaunchSteps = [
  {
    title: "Заявка в CRM",
    text: "Партнер получил клиента: карточка появилась в CRM со статусом и ответственным.",
  },
  {
    title: "Кнопка запуска",
    text: "Партнер нажимает 'подготовить запуск', и ARAY открывает QUIZ по этому заказу.",
  },
  {
    title: "QUIZ и сайт",
    text: "ARAY собирает ответы, выбирает шаблон и готовит сайт, бренд, бриф, PWA и SEO-задачи.",
  },
  {
    title: "Канбан производства",
    text: "Заказ идет по статусам: бриф, подтверждение, счет, производство, проверка, запуск, отчет.",
  },
];

const partnerStudioRules = [
  {
    title: "Партнер как студия",
    text: "У партнера есть свои клиенты, своя страница, CRM, материалы и понятный поток продаж.",
  },
  {
    title: "ARAY как маркетолог",
    text: "ARAY задает вопросы, собирает бриф, предлагает тексты, бренд и следующий шаг.",
  },
  {
    title: "Шаблон как основа",
    text: "Система не начинает с пустого листа: берет проверенный сценарий и адаптирует под новый бизнес.",
  },
  {
    title: "Производство внутри",
    text: "После подтверждения заказ уходит команде ARAY/Yuva: сайт, PWA, SEO, реклама, бренд и отчет.",
  },
];

const smartLinkSteps = [
  {
    title: "Сайт партнера",
    text: "Партнер показывает свою страницу ARAY/Yuva и принимает заявку клиента.",
  },
  {
    title: "QUIZ клиента",
    text: "Клиент отвечает на вопросы, оставляет материалы, контакты и задачу.",
  },
  {
    title: "CRM партнера",
    text: "Новый заказ падает партнеру: клиент, бриф, сумма, этап и следующий шаг.",
  },
  {
    title: "Канбан продаж",
    text: "Партнер двигает этапы: связаться, подтвердить, счет, оплата, запуск.",
  },
  {
    title: "Производство ARAY/Yuva",
    text: "ARAY готовит сайт, бренд, PWA, SEO, задачи и черновик для проверки.",
  },
  {
    title: "Выпуск клиенту",
    text: "Партнер проверяет, правит с ARAY, утверждает с клиентом и выпускает сайт.",
  },
];

const cloneChangeRules = [
  "информация и тексты",
  "брендовые цвета",
  "логотипы и картинки",
  "товары, услуги и категории",
  "нужные блоки страницы",
  "форма заявки и QUIZ",
  "SEO и PWA-данные",
  "настройки админки",
  "CRM-маршрут и задачи",
];

const adminSyncRules = [
  {
    title: "Сайт",
    text: "Публичная витрина, страницы, формы, футер ARAY и понятный путь заявки.",
  },
  {
    title: "Админка",
    text: "Настройки проекта, бренд, материалы, роли, заявки, статусы и доступы.",
  },
  {
    title: "CRM",
    text: "Клиенты, брифы, счета, этапы продаж, канбан и производственные задачи.",
  },
  {
    title: "PWA и отчет",
    text: "Быстрый вход, помощник ARAY, SEO-старт, уведомления и отчет клиенту.",
  },
];

const certifiedBlockRules = [
  {
    title: "Блоки из библиотеки",
    text: "Header, footer, карточки, формы, каталоги и контент берем из сертифицированной библиотеки ARAY CMS.",
  },
  {
    title: "Редактирование без поломки",
    text: "Партнер может менять текст, фото, ссылки, видимость, данные и палитру внутри правил блока.",
  },
  {
    title: "Структура защищена",
    text: "Дизайн, сетка, адаптив, отступы и порядок ключевых секций остаются под защитой.",
  },
  {
    title: "ARAY рядом",
    text: "ARAY показывает результат, предлагает вариант, открывает нужный раздел и меняет по просьбе партнера.",
  },
];

const paletteRules = [
  "цвета только из бренд-палитр",
  "контраст проверяется",
  "кнопки остаются читаемыми",
  "PWA и админка получают те же акценты",
  "ARAY может предложить 2-3 безопасных варианта",
  "ручная палитра проходит проверку",
];

const arayLiveRules = [
  {
    title: "Курсор ARAY",
    text: "Партнер видит, куда ARAY смотрит: раздел, блок, поле, кнопку или карточку CRM.",
  },
  {
    title: "Доступ к разделам",
    text: "ARAY может открыть CRM, заказы, брифы, бренд-комплект, аналитику, сайт, PWA, SEO, документы и производство.",
  },
  {
    title: "Появление как попап",
    text: "Подсказки, карточки и материалы появляются мягко в стиле админки: панель, попап, боковой лист или подсветка.",
  },
  {
    title: "Субтитры и голос",
    text: "ARAY объясняет коротко: что делает, зачем это нужно и какой следующий шаг.",
  },
  {
    title: "Действия рядом",
    text: "ARAY открывает разделы, показывает результат, подставляет текст, фото, ссылки и данные.",
  },
  {
    title: "Подтверждение",
    text: "Сохранение, счет, запуск производства и публикация проходят только после согласия человека.",
  },
];

const partnerGrowthTracks = [
  {
    title: "CRM",
    text: "Лиды, брифы, статусы, счета, задачи, клиентская история и следующий шаг.",
  },
  {
    title: "Маркетинг",
    text: "Позиционирование, тексты, УТП, бренд, КП, баннеры, посты и материалы партнера.",
  },
  {
    title: "SEO",
    text: "Заголовки, описание, структура страниц, индексация, sitemap, robots и поисковые задачи.",
  },
  {
    title: "Реклама",
    text: "Аудитория, посадочная страница, UTM, объявления, бюджет и запуск после подтверждения.",
  },
  {
    title: "Раскрутка",
    text: "Контент-план, блогеры, партнерские материалы, региональные страницы и повторные касания.",
  },
  {
    title: "Отчеты",
    text: "Что сделано, что подключено, что проверить, какие заявки пришли и следующий месяц работы.",
  },
];

const arayBesideActions = [
  "показать блоки",
  "заменить раздел",
  "переписать текст",
  "подтянуть данные",
  "поменять фото",
  "согласовать с партнером",
  "записать в CRM",
  "отправить в производство",
];

const blockLabSteps = [
  {
    title: "Идея блока",
    text: "Партнер или команда описывает, какой блок нужен и для какой сферы.",
  },
  {
    title: "ARAY делает вариант",
    text: "ARAY предлагает текст, данные, кнопку, фото, ссылку и связь с CRM внутри правил блока.",
  },
  {
    title: "Проверяем качество",
    text: "Смотрим телефон, широкий экран, смысл, отступы, кнопки, SEO и PWA.",
  },
  {
    title: "Добавляем в библиотеку",
    text: "После согласования блок получает паспорт и становится частью библиотеки.",
  },
];

const blockPassportFields = [
  "название",
  "для какой сферы",
  "что редактируется",
  "куда ведет кнопка",
  "какие данные нужны",
  "какая CRM-связь",
  "проверка адаптива",
  "статус блока",
];

const editorBlockList = [
  { title: "Главный экран", status: "выбран" },
  { title: "Что входит", status: "готов" },
  { title: "Путь заявки", status: "готов" },
  { title: "Форма", status: "CRM" },
  { title: "Футер ARAY", status: "туннель" },
];

const selectedBlockFields = [
  { label: "Заголовок", value: "ARAY Production" },
  { label: "Смысл", value: "Сайт, PWA, CRM и маркетинг под ключ" },
  { label: "Кнопка", value: "Заказать систему" },
  { label: "Связь", value: "Заявка уйдет в ARAY CRM" },
];

const taskStatusLabel: Record<string, string> = {
  BACKLOG: "следом",
  TODO: "сделать",
  IN_PROGRESS: "в работе",
  REVIEW: "проверка",
  DONE: "готово",
};

export default async function ArayBuilderPage({
  searchParams,
}: {
  searchParams?: { leadId?: string };
}) {
  const tenantId = getCurrentTenantId();
  const readiness = getArayBuilderReadiness();
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
          },
          orderBy: [{ status: "asc" }, { createdAt: "asc" }],
        })
        .catch(() => [])
    : [];
  const blockPlan = draft ? getArayLaunchBlockPlan(draft) : null;
  const storeTemplate = ARAY_CMS_INTERNET_STORE_TEMPLATE;

  return (
    <div className="admin-page-frame admin-page-frame-aray-workspace">
      <section className="overflow-hidden rounded-[28px] border border-border bg-card">
        <div className="grid gap-0 lg:grid-cols-[1fr_420px]">
          <div className="p-5 sm:p-6 lg:p-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              ARAY Launch OS
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              ARAY CMS: запуск сайтов под ключ
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
              Партнер работает с Араем, а система собирает сайт из готовых
              блоков, шаблонов, цветов и автоматизаций. На экране только
              понятный запуск: бриф, сборка, проверка, домен.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button asChild>
                <Link href="/admin/aray/orders">
                  Создать заказ в CRM
                  <ClipboardList className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/admin/aray/partners">
                  Партнеры и клиенты
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>

          <aside className="border-t border-border bg-background/55 p-5 sm:p-6 lg:border-l lg:border-t-0">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <LayoutTemplate className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Руль у партнера</p>
                <p className="text-xs text-muted-foreground">продажа, QUIZ, сайт, CRM и запуск</p>
              </div>
            </div>

            <div className="mt-5 grid gap-3">
              {focusItems.map((item) => (
                <div key={item} className="flex gap-3 rounded-2xl border border-border bg-card p-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                  <p className="text-sm leading-6 text-foreground">{item}</p>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </section>

      <section className="rounded-[28px] border border-primary/25 bg-primary/[0.06] p-5 sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              {storeTemplate.badge}
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
              {storeTemplate.title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {storeTemplate.description}
            </p>
            <p className="mt-3 rounded-2xl border border-primary/25 bg-background px-4 py-3 text-sm font-semibold text-foreground">
              На выходе: {storeTemplate.result}
            </p>
          </div>
          <Button asChild>
            <Link href="/admin/aray/orders#aray-site-factory">
              Создать магазин
              <Sparkles className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {storeTemplate.blocks.slice(0, 8).map((block) => (
            <article key={block.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Store className="h-5 w-5" />
                </span>
                <span className="rounded-full border border-border bg-background px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  {block.kind}
                </span>
              </div>
              <h3 className="mt-4 text-sm font-semibold text-foreground">{block.title}</h3>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">{block.purpose}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {block.editable.slice(0, 4).map((item) => (
                  <span key={item} className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                    {item}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          <article className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Palette className="h-4 w-4 text-primary" />
              Палитры
            </div>
            <div className="mt-3 grid gap-2">
              {storeTemplate.palettes.map((palette) => (
                <div key={palette.id} className="rounded-xl border border-border bg-background px-3 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold text-foreground">{palette.title}</p>
                    <span className="flex gap-1">
                      {palette.colors.map((color) => (
                        <span key={color} className="h-4 w-4 rounded-full border border-border" style={{ backgroundColor: color }} />
                      ))}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] leading-4 text-muted-foreground">{palette.text}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Settings2 className="h-4 w-4 text-primary" />
              Автоматизации
            </div>
            <div className="mt-3 grid gap-2">
              {storeTemplate.automations.slice(0, 6).map((automation) => (
                <Link
                  key={automation.id}
                  href={automation.route}
                  className="rounded-xl border border-border bg-background px-3 py-3 transition hover:border-primary/40"
                >
                  <p className="text-xs font-semibold text-foreground">{automation.title}</p>
                  <p className="mt-1 text-[11px] leading-4 text-muted-foreground">{automation.text}</p>
                </Link>
              ))}
            </div>
          </article>

          <article className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Проверки перед доменом
            </div>
            <div className="mt-3 grid gap-2">
              {storeTemplate.qualityGates.map((gate) => (
                <div key={gate} className="flex gap-2 rounded-xl border border-border bg-background px-3 py-2.5 text-xs leading-5 text-muted-foreground">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                  <span>{gate}</span>
                </div>
              ))}
            </div>
          </article>
        </div>
      </section>

      <section className="rounded-[28px] border border-border bg-card p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              рабочий мастер
            </p>
            <h2 className="mt-1 text-xl font-semibold text-foreground">
              Один понятный путь: заявка, бриф, блоки, черновик сайта
            </h2>
          </div>
          <Button asChild variant="outline">
            <Link href="/admin/aray/orders">
              Открыть заявки
              <ClipboardList className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {crmLaunchSteps.map((item, index) => (
            <article key={item.title} className="rounded-2xl border border-border bg-background p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <span className="text-sm font-semibold">{index + 1}</span>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.text}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {draft ? (
        <section className="rounded-[28px] border border-primary/25 bg-primary/10 p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Sparkles className="h-4 w-4 text-primary" />
                Запуск привязан к CRM-заявке
              </div>
              <h2 className="mt-3 text-xl font-semibold text-foreground">
                {draft.company || draft.clientName}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {draft.clientName} · {draft.phone || "телефон не указан"} · {draft.city || "регион уточнить"}
              </p>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                {draft.task || "Задача пока не раскрыта. Перед сборкой сайта нужно уточнить цель, материалы и срок запуска."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline">
                <Link href={`/admin/aray/briefs?leadId=${lead!.id}`}>
                  Бриф заявки
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild>
                <Link href="/admin/aray/orders">
                  Очередь ARAY
                  <ClipboardList className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Шаблон", value: draft.business ? "подобрать по сфере" : "уточнить сферу" },
              { label: "Пакет", value: draft.service },
              { label: "Партнер", value: draft.partner },
              { label: "Недостает", value: `${draft.missing.length} пунктов` },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-border bg-card px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{item.label}</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-2xl border border-border bg-card p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-2xl">
                <h3 className="text-sm font-semibold text-foreground">Готовность к сборке из блоков</h3>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  Builder берет этот бриф как вход: сначала фиксируем задачи, затем выбираем шаблон,
                  собираем главный экран, путь заявки, форму и футер ARAY.
                </p>
              </div>
              <ArayLaunchPrepareButton leadId={lead!.id} prepared={launchTasks.length > 0} size="sm" />
            </div>

            {launchTasks.length > 0 ? (
              <div className="mt-4 grid gap-2 md:grid-cols-2">
                {launchTasks.map((task) => (
                  <div key={task.id} className="flex items-start justify-between gap-3 rounded-xl border border-border bg-background px-3 py-3">
                    <p className="text-xs font-semibold leading-5 text-foreground">{task.title}</p>
                    <span className="shrink-0 rounded-full border border-border bg-card px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                      {taskStatusLabel[task.status] || task.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 rounded-xl border border-border bg-background px-3 py-3 text-xs leading-5 text-muted-foreground">
                Рабочие задачи еще не созданы. Зафиксируйте бриф, и Арай подготовит первый пакет запуска.
              </p>
            )}
          </div>

          {blockPlan ? (
            <ArayBlockPlanStudio leadId={lead!.id} plan={blockPlan} />
          ) : null}
        </section>
      ) : null}

      {!draft ? (
        <section className="rounded-[28px] border border-primary/25 bg-primary/10 p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Sparkles className="h-4 w-4 text-primary" />
                Начинаем не с пустого конструктора
              </div>
              <h2 className="mt-3 text-xl font-semibold text-foreground">
                Выберите заявку клиента, и ARAY соберет запуск по шагам
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Так мы не теряем контекст: имя клиента, задача, телефон, бриф и блоки сайта идут из одной карточки.
              </p>
            </div>
            <Button asChild>
              <Link href="/admin/aray/orders">
                Перейти к заявкам
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
      ) : null}

      <details className="rounded-[28px] border border-dashed border-border bg-background/40 p-5 sm:p-6">
        <summary className="cursor-pointer list-none">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                служебная карта ARAY
              </p>
              <h2 className="mt-1 text-xl font-semibold text-foreground">
                Показать шаблоны, редактор, будущие слои и библиотеку блоков
              </h2>
            </div>
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-muted-foreground">
              скрыто, чтобы не мешало запуску
              <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </div>
        </summary>

        <div className="mt-5 grid gap-4">
      <section className="rounded-[28px] border border-border bg-card p-5 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              под ключ вместо конструктора
            </p>
              <h2 className="mt-1 text-xl font-semibold text-foreground">Партнер начинает с QUIZ и шаблона</h2>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
            <CheckCircle2 className="h-3.5 w-3.5" />
            ARAY соберет сайт
          </span>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {benchmarkTemplates.map((template) => (
            <article key={template.title} className="rounded-2xl border border-border bg-background p-4">
              <span className="rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
                {template.tag}
              </span>
              <h3 className="mt-4 text-base font-semibold text-foreground">{template.title}</h3>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">{template.text}</p>
            </article>
          ))}
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {quizQuestions.map((question, index) => {
            return (
              <article key={question.title} className="rounded-2xl border border-border bg-background p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <span className="text-sm font-semibold">{index + 1}</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{question.title}</h3>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{question.text}</p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <div className="mt-5 rounded-2xl border border-primary/25 bg-primary/10 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">После QUIZ ARAY готовит сайт</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Без ручной сборки с нуля: система берет проверенный сценарий, меняет его под клиента и показывает, что подтвердить дальше.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {quizOutputs.map((output) => (
                <span key={output} className="rounded-full border border-primary/25 bg-background px-2.5 py-1 text-[11px] font-semibold text-primary">
                  {output}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-border bg-card p-5 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              партнерская студия
            </p>
            <h2 className="mt-1 text-xl font-semibold text-foreground">Партнеры продают и ведут клиентов через CRM</h2>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold text-muted-foreground">
            доступ не для клиента
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {partnerStudioRules.map((rule) => (
            <article key={rule.title} className="rounded-2xl border border-border bg-background p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-sm font-semibold text-foreground">{rule.title}</h3>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">{rule.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-[28px] border border-border bg-card p-5 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              умная связка
            </p>
            <h2 className="mt-1 text-xl font-semibold text-foreground">Клиент, партнер и производство идут одним заказом</h2>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
            <CheckCircle2 className="h-3.5 w-3.5" />
            без ручной потери данных
          </span>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {smartLinkSteps.map((step, index) => (
            <article key={step.title} className="rounded-2xl border border-border bg-background p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <span className="text-sm font-semibold">{index + 1}</span>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{step.title}</h3>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{step.text}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-[28px] border border-border bg-card p-5 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              закон ARAY CMS
            </p>
            <h2 className="mt-1 text-xl font-semibold text-foreground">Шаблоны и блоки — база для будущих сфер</h2>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold text-muted-foreground">
            оригинал не трогаем
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="rounded-2xl border border-primary/25 bg-primary/10 p-4">
            <p className="text-sm font-semibold text-foreground">Как работает создание сайта</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Берем сертифицированный шаблон, создаем отдельный сайт для клиента и меняем только то,
              что нужно бизнесу. Библиотека ARAY CMS остается защищенной.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {cloneChangeRules.map((rule) => (
              <div key={rule} className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5 text-xs font-semibold text-foreground">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                {rule}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-border bg-card p-5 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              синхронный запуск
            </p>
            <h2 className="mt-1 text-xl font-semibold text-foreground">ARAY создает не страницу, а управляемую систему</h2>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold text-muted-foreground">
            сайт + админка + CRM
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {adminSyncRules.map((rule) => (
            <article key={rule.title} className="rounded-2xl border border-border bg-background p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <BadgeCheck className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-sm font-semibold text-foreground">{rule.title}</h3>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">{rule.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-[28px] border border-border bg-card p-5 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              блоки ARAY CMS
            </p>
            <h2 className="mt-1 text-xl font-semibold text-foreground">ARAY собирает сайт из сертифицированных частей</h2>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
            <CheckCircle2 className="h-3.5 w-3.5" />
            контент меняем, структуру бережем
          </span>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {certifiedBlockRules.map((rule) => (
            <article key={rule.title} className="rounded-2xl border border-border bg-background p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <LayoutTemplate className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-sm font-semibold text-foreground">{rule.title}</h3>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">{rule.text}</p>
            </article>
          ))}
        </div>

        <div className="mt-5 rounded-2xl border border-primary/25 bg-primary/10 p-4">
          <p className="text-sm font-semibold text-foreground">ARAY рядом с партнером</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Партнер пишет в чат, а ARAY открывает нужный раздел, показывает результат, меняет блок и просит подтвердить действие.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {arayBesideActions.map((action) => (
              <span key={action} className="rounded-full border border-primary/25 bg-background px-2.5 py-1 text-[11px] font-semibold text-primary">
                {action}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-border bg-background p-4">
            <p className="text-sm font-semibold text-foreground">Цвета тоже по правилам ARAY CMS</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            ARAY не дает случайную палитру. Он предлагает безопасные бренд-варианты, проверяет контраст и переносит акценты в сайт, PWA и админку.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {paletteRules.map((rule) => (
              <span key={rule} className="rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                {rule}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-border bg-card p-5 sm:p-6">
        <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              лаборатория блоков
            </p>
            <h2 className="mt-1 text-xl font-semibold text-foreground">Мы можем вместе с ARAY пополнять библиотеку</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Новый блок не появляется как случайная верстка. Мы описываем задачу,
              ARAY готовит вариант, партнер согласует смысл, а система проверяет
              качество перед добавлением в библиотеку.
            </p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Button asChild>
                <Link href="/admin/aray/briefs">
                  Предложить блок
                  <PlusCircle className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/admin/aray/brand-kit">
                  Материалы бренда
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {blockLabSteps.map((step, index) => (
              <article key={step.title} className="rounded-2xl border border-border bg-background p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <span className="text-sm font-semibold">{index + 1}</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{step.title}</h3>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{step.text}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-border bg-background p-4">
          <p className="text-sm font-semibold text-foreground">Паспорт каждого блока</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {blockPassportFields.map((field) => (
              <span key={field} className="rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                {field}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-border bg-card p-5 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              ARAY Live
            </p>
            <h2 className="mt-1 text-xl font-semibold text-foreground">ARAY ведет партнера по админке вживую</h2>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold text-muted-foreground">
            доступ, попапы, голос
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {arayLiveRules.map((rule) => (
            <article key={rule.title} className="rounded-2xl border border-border bg-background p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Sparkles className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-sm font-semibold text-foreground">{rule.title}</h3>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">{rule.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-[28px] border border-border bg-card p-5 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              сопровождение партнера
            </p>
            <h2 className="mt-1 text-xl font-semibold text-foreground">ARAY ведет не только сайт, а весь маркетинговый путь</h2>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold text-muted-foreground">
            от CRM до раскрутки
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {partnerGrowthTracks.map((track) => (
            <article key={track.title} className="rounded-2xl border border-border bg-background p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <ListChecks className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-sm font-semibold text-foreground">{track.title}</h3>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">{track.text}</p>
            </article>
          ))}
        </div>
      </section>

      <details className="rounded-[28px] border border-border bg-card p-5 sm:p-6">
        <summary className="cursor-pointer list-none">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                служебный редактор партнеров
              </p>
              <h2 className="mt-1 text-xl font-semibold text-foreground">Показать, как партнер проверит и поправит сайт</h2>
            </div>
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold text-muted-foreground">
              скрыто для клиентов
              <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </div>
        </summary>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="sr-only">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              как будет выглядеть редактор
            </p>
            <h2 className="mt-1 text-xl font-semibold text-foreground">Нажал на блок — поменял — проверил</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold text-muted-foreground">
              <Smartphone className="h-3.5 w-3.5 text-primary" />
              телефон
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold text-muted-foreground">
              <Globe2 className="h-3.5 w-3.5 text-primary" />
              сайт
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold text-muted-foreground">
              <ClipboardList className="h-3.5 w-3.5 text-primary" />
              CRM
            </span>
          </div>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-[260px_minmax(0,1fr)_320px]">
          <div className="rounded-2xl border border-border bg-background p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-foreground">Блоки страницы</h3>
              <PlusCircle className="h-4 w-4 text-primary" />
            </div>
            <div className="mt-4 grid gap-2">
              {editorBlockList.map((block) => (
                <button
                  key={block.title}
                  type="button"
                  className={`flex min-h-12 items-center justify-between gap-3 rounded-xl border px-3 text-left text-sm transition ${
                    block.status === "выбран"
                      ? "border-primary/45 bg-primary/10 text-foreground"
                      : "border-border bg-card text-muted-foreground"
                  }`}
                >
                  <span className="font-semibold">{block.title}</span>
                  <span className="rounded-full border border-border bg-background px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]">
                    {block.status}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-background p-4">
            <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">живой сайт</p>
                <h3 className="mt-1 text-sm font-semibold text-foreground">ARAY Production</h3>
              </div>
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-300">
                сохранено
              </span>
            </div>

            <div className="mt-4 rounded-2xl border border-primary/35 bg-card p-5">
              <div className="inline-flex rounded-full border border-border/15 bg-background/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-100">
                простая система для бизнеса
              </div>
              <h3 className="mt-4 max-w-xl text-2xl font-semibold leading-tight text-foreground">
                Сайт, PWA, CRM и маркетинг в одном запуске
              </h3>
              <p className="mt-3 max-w-xl text-sm leading-6 text-foreground/70">
                Клиент оставляет заявку, партнер ведет общение, а ARAY/Yuva запускает производство.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <span className="rounded-xl bg-card px-4 py-2 text-xs font-bold text-foreground">Заказать систему</span>
                <span className="rounded-xl border border-border/15 bg-card/5 px-4 py-2 text-xs font-bold text-foreground">Стать партнером</span>
              </div>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              {["Заявка", "Бриф", "Производство"].map((item) => (
                <div key={item} className="rounded-xl border border-border bg-card px-3 py-3">
                  <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">{item}</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">подключено</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-background p-4">
            <div className="flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Выбранный блок</h3>
            </div>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              Меняем смысл, просим ARAY переписать и сразу видим результат.
            </p>

            <div className="mt-4 grid gap-3">
              {selectedBlockFields.map((field) => (
                <div key={field.label} className="rounded-xl border border-border bg-card px-3 py-3">
                  <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">{field.label}</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">{field.value}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 grid gap-2">
              <div className="inline-flex min-h-11 items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/10 px-4 text-sm font-semibold text-primary">
                <span className="inline-flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Текст
                </span>
                <span className="text-xs font-semibold text-primary/80">черновик</span>
              </div>
              <div className="inline-flex min-h-11 items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 text-sm font-semibold text-foreground">
                <span className="inline-flex items-center gap-2">
                  <TextCursorInput className="h-4 w-4" />
                  Правки
                </span>
                <span className="text-xs font-semibold text-muted-foreground">в плане блоков</span>
              </div>
              <div className="inline-flex min-h-11 items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 text-sm font-semibold text-foreground">
                <span className="inline-flex items-center gap-2">
                  <ListChecks className="h-4 w-4" />
                  Проверка
                </span>
                <span className="text-xs font-semibold text-muted-foreground">после сохранения</span>
              </div>
            </div>
          </div>
        </div>
      </details>

      <section className="rounded-[28px] border border-border bg-card p-5 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              следующий шаг
            </p>
            <h2 className="mt-1 text-xl font-semibold text-foreground">Партнерская продажа идет через CRM</h2>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300">
            <WandSparkles className="h-3.5 w-3.5" />
            только партнерский доступ
          </span>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {crmLaunchSteps.map((item, index) => (
            <article key={item.title} className="rounded-2xl border border-border bg-background p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <span className="text-sm font-semibold">{index + 1}</span>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.text}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <details className="rounded-[28px] border border-border bg-card p-5 sm:p-6">
        <summary className="cursor-pointer list-none">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                будущая система
              </p>
              <h2 className="mt-1 text-xl font-semibold text-foreground">Показать, что еще будет редактироваться</h2>
            </div>
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold text-muted-foreground">
              скрыто, чтобы не мешало
              <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </div>
        </summary>

      <div className="mt-5 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[28px] border border-border bg-card p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                редактируется
              </p>
              <h2 className="mt-1 text-xl font-semibold text-foreground">Все живое уходит в админку</h2>
            </div>
            <WandSparkles className="h-5 w-5 text-primary" />
          </div>

          <div className="mt-5 grid gap-3">
            {ARAY_EDITABLE_BUSINESS_AREAS.map((area) => (
              <article key={area.id} className="rounded-2xl border border-border bg-background p-4">
                <h3 className="text-sm font-semibold text-foreground">{area.title}</h3>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{area.text}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {area.examples.map((example) => (
                    <span
                      key={example}
                      className="rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-medium text-muted-foreground"
                    >
                      {example}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="rounded-[28px] border border-border bg-card p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                маршрут
              </p>
              <h2 className="mt-1 text-xl font-semibold text-foreground">От пустого экрана до запуска</h2>
            </div>
            <BadgeCheck className="h-5 w-5 text-primary" />
          </div>

          <div className="mt-5 grid gap-3">
            {ARAY_BUILDER_WORKFLOW.map((step, index) => (
              <article key={step.id} className="rounded-2xl border border-border bg-background p-4">
                <div className="flex gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-xs font-semibold text-primary">
                    {index + 1}
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{step.title}</h3>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{step.text}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
      </details>

      <details className="rounded-[28px] border border-border bg-card p-5 sm:p-6">
        <summary className="cursor-pointer list-none">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                для команды
              </p>
              <h2 className="mt-1 text-xl font-semibold text-foreground">Показать техническую библиотеку блоков</h2>
            </div>
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold text-muted-foreground">
              {readiness.totalBlocks} блоков
              <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </div>
        </summary>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="sr-only">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              библиотека
            </p>
            <h2 className="mt-1 text-xl font-semibold text-foreground">Готовим сертифицированные блоки</h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-muted-foreground">
            Это контроль для нас: блок должен быть понятным, редактируемым, связанным с CRM и готовым для повторного использования.
          </p>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {ARAY_BUILDER_BLOCKS.map((block) => (
            <article key={block.id} className="rounded-2xl border border-border bg-background p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{block.title}</h3>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{block.purpose}</p>
                </div>
                <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusClassName[block.status]}`}>
                  {statusLabel[block.status]}
                </span>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {block.editableFields.map((field) => (
                  <span key={field} className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2.5 py-1 text-[11px] font-medium text-cyan-200">
                    {fieldLabel[field]}
                  </span>
                ))}
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {block.qualityChecks.slice(0, 2).map((check) => (
                  <div key={check} className="flex gap-2 text-xs leading-5 text-muted-foreground">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                    <span>{check}</span>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </details>
        </div>
      </details>
    </div>
  );
}
