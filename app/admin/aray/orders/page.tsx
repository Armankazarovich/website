export const dynamic = "force-dynamic";

import Link from "next/link";
import { ArrowRight, BarChart3, Bell, Bot, CalendarClock, CheckCircle2, FileText, Globe2, Landmark, MessageCircle, MousePointerClick, Network, Package, PanelRight, PlayCircle, Receipt, Repeat, ShieldCheck, Sparkles, Users, WalletCards } from "lucide-react";
import { AraySiteImportStudio } from "@/components/aray/aray-site-import-studio";
import { Button } from "@/components/ui/button";
import { ARAY_AGENCY_STATUSES } from "@/lib/aray-agency-crm-foundation";
import { prisma } from "@/lib/prisma";
import { getCurrentTenantId } from "@/lib/tenant-context";

const ORDER_FLOW = [
  "партнер связывается с клиентом и уточняет задачу",
  "собирается бриф и готовится предложение",
  "клиент подтверждает предложение",
  "после подтверждения выставляется счет на 150 000 ₽",
  "после оплаты клиента партнер оплачивает ARAY/Yuva",
  "после оплаты запускается производство: ТЗ, задачи, сайт/PWA, SEO, реклама и отчеты",
];

const ORDER_LAUNCH_FLOW = [
  {
    title: "Заказ в CRM",
    text: "Партнер видит клиента, сумму, бриф, статус и следующий шаг.",
    icon: Receipt,
  },
  {
    title: "QUIZ с ARAY",
    text: "ARAY ведет разговор как помощник: задает вопросы, открывает нужные разделы и объясняет следующий шаг.",
    icon: Sparkles,
  },
  {
    title: "Новый бизнес из шаблона",
    text: "ARAY создает отдельный проект с чистыми данными, нужными модулями и настройками клиента.",
    icon: PlayCircle,
  },
  {
    title: "Производство",
    text: "После оплаты появляются задачи, сайт, PWA, SEO, реклама, аналитика и отчет.",
    icon: Package,
  },
];

const ARAY_CLICK_STEPS = [
  {
    title: "1. Скан или заявка",
    text: "Вводим домен клиента или берем заявку из CRM, чтобы ARAY понял бизнес и материалы.",
    href: "/admin/aray/orders",
    action: "Капсула",
    icon: Receipt,
  },
  {
    title: "2. Бриф",
    text: "Подтверждаем товары, услуги, акции, фото, контакты, цель и доступы.",
    href: "/admin/aray/briefs",
    action: "Брифы",
    icon: FileText,
  },
  {
    title: "3. Сборка",
    text: "ARAY раскладывает сайт по блокам и готовит черновик в нашем стиле.",
    href: "/admin/aray/builder",
    action: "Собрать",
    icon: Sparkles,
  },
  {
    title: "4. Проверка и домен",
    text: "Открываем сайт, проверяем данные и готовим подключение домена.",
    href: "/admin/site/constructor",
    action: "Проверка",
    icon: PlayCircle,
  },
];

const ARAY_FACTORY_STEPS = [
  {
    title: "1. Рабочая система",
    text: "ARAY подбирает нужные модули: админку, CRM, PWA, роли, уведомления, каталог и проверенный путь заявки.",
  },
  {
    title: "2. Новый бизнес",
    text: "ARAY меняет сферу, дизайн, товары, услуги, фото, контакты, цены, тексты, домен и стиль под клиента.",
  },
  {
    title: "3. Своя админка",
    text: "Проект получает отдельный tenant и рабочую админку вида domain.ru/admin, чтобы данные не смешивались.",
  },
  {
    title: "4. Запуск",
    text: "После проверки и финального подтверждения подключаем домен, PWA, аналитику, заявки, уведомления и партнерский доступ.",
  },
];

const ARAY_OPERATOR_STEPS = [
  {
    title: "Понять задачу",
    text: "ARAY принимает цель: новый сайт, правка ядра, смена сферы, дизайн, товары, интеграции или запуск.",
  },
  {
    title: "Сделать работу",
    text: "Он собирает блоки, тексты, настройки, структуру сайта, CRM-маршрут, PWA и нужные изменения в ядре.",
  },
  {
    title: "Проверить",
    text: "Перед показом запускаются проверки: сборка, навигация, release-гейты, smoke и сценарии без нерабочих кнопок.",
  },
  {
    title: "Попросить подтверждение",
    text: "Домен, платежи, удаление данных и боевой деплой ARAY не делает молча: сначала показывает итог и просит подтвердить.",
  },
];

const ARAY_CMS_READY_CARDS = [
  {
    title: "Скан сайта",
    text: "Домен, структура, товары или услуги, акции, фото, контакты и подсказки для брифа.",
    status: "включено",
    icon: Sparkles,
  },
  {
    title: "Партнерская витрина",
    text: "ARAY Production показывает программу, заработок, материалы, обучение и вход партнера.",
    status: "наш стиль",
    icon: Users,
  },
  {
    title: "Сайт и проверка",
    text: "После подтверждения ARAY ведет проект в сборку сайта и открывает результат для проверки.",
    status: "готово к тесту",
    icon: PlayCircle,
  },
  {
    title: "Доступы и запуск",
    text: "Обычный пользователь не видит CMS, партнер видит свой маршрут, домен идёт после проверки.",
    status: "разделено",
    icon: ShieldCheck,
  },
];

const ARAY_SYSTEM_LINKS = [
  {
    title: "CRM и заявки",
    text: "Клиенты, лиды, статусы, задачи и следующий шаг партнера.",
    status: "проверено",
    href: "/admin/crm",
    action: "CRM",
    icon: Receipt,
  },
  {
    title: "Пользователи и доступы",
    text: "Оптовики, партнеры, менеджеры и права без лишних служебных экранов.",
    status: "разделено",
    href: "/admin/director",
    action: "Доступы",
    icon: Users,
  },
  {
    title: "PWA и значки",
    text: "Иконки, манифест, установка и свежая версия мобильного приложения.",
    status: "прошло",
    href: "/admin/site",
    action: "PWA",
    icon: Globe2,
  },
  {
    title: "Уведомления",
    text: "События, напоминания и системные сообщения для команды.",
    status: "подключено",
    href: "/admin/notifications",
    action: "Уведомления",
    icon: Bell,
  },
  {
    title: "Аналитика",
    text: "Отчеты, метрики и контроль результата после запуска сайта.",
    status: "проверено",
    href: "/admin/analytics",
    action: "Аналитика",
    icon: BarChart3,
  },
  {
    title: "Финансы",
    text: "Счета, оплаты, обязательства партнера и контроль денег.",
    status: "проверено",
    href: "/admin/finance",
    action: "Финансы",
    icon: WalletCards,
  },
  {
    title: "ИИ и ключи",
    text: "Яндекс GPT, Claude, ElevenLabs и другие связи проверяем перед боевым запуском.",
    status: "ключи",
    href: "/admin/aray/connectors",
    action: "Ключи",
    icon: Sparkles,
  },
  {
    title: "Домен и публикация",
    text: "Подключаем домен только после проверки сайта, материалов и финального подтверждения.",
    status: "финальный шаг",
    href: "/admin/site/constructor",
    action: "Проверка",
    icon: PlayCircle,
  },
  {
    title: "Ядро и релизы",
    text: "Версия ARAY, отдельные серверы, проверки и безопасный выпуск новых сайтов.",
    status: "следующий слой",
    href: "/admin/site/releases",
    action: "Релизы",
    icon: Network,
  },
];

const ARAY_LIVE_QUIZ_FLOW = [
  "партнер пишет или говорит задачу, как в чате",
  "ARAY задает вопросы по клиенту, цели, шаблону, бренду, фото, услугам и оплате",
  "ARAY открывает нужные страницы рядом: CRM, бриф, шаблон, сайт, PWA, SEO и задачи",
  "ARAY показывает, что готовит: текст, блок, счет, сайт, отчет или задачу",
  "ARAY объясняет коротко и просит подтвердить важное действие перед запуском",
];

const ARAY_CONTEXT_DOCUMENTS = [
  {
    title: "Инструкция партнера",
    when: "когда новый партнер проходит первый запуск",
    href: "/aray/brand-assets/documents/aray-partner-guide-ru.html",
  },
  {
    title: "Скрипт продаж",
    when: "когда партнер готовится звонить или писать клиенту",
    href: "/aray/brand-assets/documents/aray-partner-sales-script-ru.html",
  },
  {
    title: "Правила рекламы",
    when: "когда партнер запускает рекламу, пост, сторис или блогерскую подачу",
    href: "/aray/brand-assets/documents/aray-partner-ad-rules-ru.html",
  },
  {
    title: "Бриф клиента",
    when: "когда ARAY собирает данные бизнеса, цели, материалы и доступы",
    href: "/aray/brand-assets/documents/aray-client-brief-ru.html",
  },
  {
    title: "Коммерческое предложение",
    when: "когда нужно показать клиенту состав услуги и понятный пакет",
    href: "/aray/brand-assets/documents/aray-commercial-offer-ru.html",
  },
  {
    title: "Платежи и реквизиты",
    when: "когда готовится счет, оплата партнера или платеж ARAY/Yuva",
    href: "/aray/brand-assets/documents/aray-payments-requisites-ru.html",
  },
];

const SUBSCRIPTION_BILLING_FLOW = [
  {
    title: "Счет готовится при заказе",
    text: "Когда партнер создает заказ, система собирает черновик счета на 150 000 ₽ по реквизитам партнера.",
    icon: FileText,
  },
  {
    title: "Отправка после подтверждения",
    text: "Партнер проверяет клиента, сумму, назначение платежа и только потом отправляет счет.",
    icon: ShieldCheck,
  },
  {
    title: "Ежемесячная подписка",
    text: "После старта система каждый месяц готовит следующий счет, напоминание и статус оплаты.",
    icon: Repeat,
  },
  {
    title: "Доля ARAY/Yuva",
    text: "После поступления оплаты партнер видит обязательство 75 000 ₽ перед ARAY/Yuva.",
    icon: CalendarClock,
  },
];

const ACTIVE_PROJECT_FLOW = [
  "карточка клиента остается в CRM как действующий проект",
  "каждый месяц система готовит счет, задачи, отчет и контроль оплаты",
  "заявки, реклама, SEO и PWA связаны с тем же клиентом",
  "партнер видит свои действия, ARAY/Yuva видит производство и качество",
  "после оплаты месяц открывается для работы, после просрочки появляется напоминание",
];

const DIGITAL_PRODUCT_LAYERS = [
  {
    title: "Услуга как продукт",
    text: "Клиент покупает не часы специалистов, а понятный результат: сайт, PWA, маркетинг, заявки и отчет.",
  },
  {
    title: "Витрина услуг",
    text: "Партнер может продавать пакеты, будущие цифровые продукты, шаблоны, обучение и сопровождение.",
  },
  {
    title: "Один заказ",
    text: "Оплата, бриф, запуск, производство, документы и аналитика идут вокруг одной карточки клиента.",
  },
  {
    title: "База будущего",
    text: "ARAY CMS становится базой для магазинов, сайтов услуг, производства и будущих цифровых продуктов.",
  },
];

const SERVICE_MARKETPLACE_FLOW = [
  {
    title: "Фрилансер",
    text: "Может взять не весь сайт, а понятную задачу: фото, текст, баннер, SEO, карточки, видео или настройку.",
  },
  {
    title: "Партнер",
    text: "Собирает клиента и заказ, а внутри производства подключает нужных специалистов.",
  },
  {
    title: "ARAY/Yuva",
    text: "Держит качество, шаблоны, сроки, проверку и финальный выпуск для клиента.",
  },
  {
    title: "Клиент",
    text: "Получает не хаос подрядчиков, а один результат, один отчет и один понятный маршрут.",
  },
];

const PRODUCTION_SERVICE_AREAS = [
  "SMM и контент-план",
  "обработка фото для сайта",
  "баннеры и дизайн",
  "тексты, карточки и описания",
  "SEO и структура страниц",
  "реклама и UTM",
  "видео и короткие ролики",
  "бренд-материалы",
  "аналитика и отчеты",
  "ИИ-помощники и автоматизация",
  "обучение и инструкции",
  "аудит и улучшения",
];

const PRODUCTION_NETWORK_RULES = [
  "каждая задача идет через заказ ARAY, а не в личных переписках",
  "специалист видит только свою задачу, срок, материалы и критерии качества",
  "начинающие специалисты работают через наставника и проверку результата",
  "клиент получает единый отчет, даже если внутри работала большая команда",
  "ARAY/Yuva отвечает за финальное качество перед выпуском",
];

const CRM_STAGE_LABELS: Record<string, string> = {
  NEW: "новая заявка",
  CONTACTED: "связались",
  QUALIFIED: "бриф понятен",
  MEETING: "встреча",
  PROPOSAL: "предложение",
  NEGOTIATION: "согласование",
  WON: "выиграно",
  LOST: "потеряно",
  DEFERRED: "отложено",
  RECURRING: "сопровождение",
};

const NEXT_ACTION_BY_STAGE: Record<string, string> = {
  NEW: "Связаться, подтвердить задачу и собрать первый бриф.",
  CONTACTED: "Довести вводные до понятного брифа.",
  QUALIFIED: "Подготовить предложение и сумму для клиента.",
  MEETING: "Зафиксировать договоренности и следующий шаг.",
  PROPOSAL: "Проверить предложение и подготовить счет.",
  NEGOTIATION: "Закрыть вопросы клиента и подтвердить запуск.",
  WON: "Открыть производство, задачи и отчетный маршрут.",
  LOST: "Зафиксировать причину и не обещать лишнего.",
  DEFERRED: "Назначить дату возврата к клиенту.",
  RECURRING: "Готовить ежемесячный счет, задачи и отчет.",
};

function formatRubValue(value: unknown): string {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount) || amount <= 0) return "сумма не задана";

  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatLeadDate(date: Date): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Moscow",
  }).format(date);
}

export default async function ArayMarketingOrdersPage() {
  const tenantId = getCurrentTenantId();
  const arayLeads = await prisma.lead
    .findMany({
      where: {
        tenantId,
        deletedAt: null,
        tags: { has: "Клиентская заявка" },
      },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        name: true,
        company: true,
        phone: true,
        stage: true,
        value: true,
        comment: true,
        createdAt: true,
        activities: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            text: true,
          },
        },
      },
    })
    .catch(() => []);

  const liveTotal = arayLeads.reduce((sum, lead) => sum + Number(lead.value || 0), 0);

  return (
    <div className="admin-page-frame admin-page-frame-aray-workspace">
      <section className="admin-aray-command-grid">
        <div className="admin-aray-command-main">
          <AraySiteImportStudio />
        </div>

        <aside className="admin-aray-command-side rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
              <MessageCircle className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                ARAY Chat-first
              </p>
              <h1 className="mt-1 text-xl font-semibold tracking-tight text-foreground">
                Работаем с Араем, экран помогает справа
              </h1>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-primary/20 bg-primary/10 p-4">
            <div className="flex items-start gap-3">
              <Bot className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div>
                <p className="text-sm font-semibold text-foreground">Первый шаг</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Напиши Араю задачу, вставь домен клиента или начни QUIZ. Арай откроет нужный раздел, соберет данные и покажет следующий шаг без лишней карты.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-2">
            <div className="flex gap-3 rounded-xl border border-border bg-background px-3 py-3">
              <MousePointerClick className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div>
                <p className="text-sm font-semibold text-foreground">1. Домен, QUIZ или заявка</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">Сканируем сайт, задаем вопросы или берем клиента из CRM.</p>
              </div>
            </div>
            <div className="flex gap-3 rounded-xl border border-border bg-background px-3 py-3">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div>
                <p className="text-sm font-semibold text-foreground">2. Черновик</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">Арай собирает структуру, товары, тексты и первый вариант.</p>
              </div>
            </div>
            <div className="flex gap-3 rounded-xl border border-border bg-background px-3 py-3">
              <PanelRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div>
                <p className="text-sm font-semibold text-foreground">3. Проверка и запуск</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">Смотрим сайт, подтверждаем важное, потом домен и публикация.</p>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/aray/briefs">
                Брифы
                <FileText className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/aray/builder">
                Сборка
                <Sparkles className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </aside>
      </section>

      <section className="hidden">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              ARAY Agency CRM
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
              Капсула запуска проекта
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Один рабочий вход: вводим домен или берем заявку клиента,
              ARAY собирает материалы, раскладывает сайт по шагам и ведет до проверки.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/admin/aray/builder">
                Собрать сайт
                <Sparkles className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/admin/aray/briefs">
                Брифы
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="hidden">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              ARAY-фабрика сайтов
            </p>
            <h2 className="mt-1 text-base font-semibold text-foreground">
              Не копия чужого бизнеса, а новый сайт из боевого шаблона
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              ARAY создает отдельный проект: другая сфера, другой дизайн,
              другие товары, своя админка и свой домен.
            </p>
          </div>
          <span className="w-fit rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            domain.ru/admin
          </span>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {ARAY_FACTORY_STEPS.map((step) => (
            <article key={step.title} className="rounded-xl border border-border bg-background p-4">
              <h3 className="text-sm font-semibold text-foreground">{step.title}</h3>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">{step.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="hidden">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              ARAY Operator
            </p>
            <h2 className="mt-1 text-base font-semibold text-foreground">
              Даем Араю руки, но оставляем контроль запуска
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              ARAY должен уметь сам собирать сайт, менять ядро, готовить проверку и вести выпуск.
              Но опасные действия остаются через подтверждение: домены, деньги, удаление данных и боевой деплой.
            </p>
          </div>
          <span className="w-fit rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            человек подтверждает
          </span>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {ARAY_OPERATOR_STEPS.map((step) => (
            <article key={step.title} className="rounded-xl border border-border bg-background p-4">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <h3 className="mt-3 text-sm font-semibold text-foreground">{step.title}</h3>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">{step.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="hidden">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              пульт запуска ARAY CMS
            </p>
            <h2 className="mt-1 text-base font-semibold text-foreground">
              CMS внутри, ARAY Production снаружи
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Публичные партнерские страницы делаем отдельной витриной: кому подходит
              программа, на чем партнер зарабатывает, какие материалы есть и как войти
              в кабинет. Внутри админки остается рабочий маршрут: скан, бриф,
              сборка, проверка и финальное подтверждение перед доменом.
            </p>
          </div>
          <span className="w-fit rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            без каши в меню
          </span>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {ARAY_CMS_READY_CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <article key={card.title} className="rounded-xl border border-border bg-background p-4">
                <div className="flex items-start justify-between gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                    {card.status}
                  </span>
                </div>
                <h3 className="mt-3 text-sm font-semibold text-foreground">{card.title}</h3>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">{card.text}</p>
              </article>
            );
          })}
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/aray-production">
              Витрина Production
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/catalog">
              Текущий сайт
              <PlayCircle className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/aray/builder">
              Сборка сайта
              <Sparkles className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/director">
              Группы и доступы
              <Users className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      <section className="hidden">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              проверенные связки
            </p>
            <h2 className="mt-1 text-base font-semibold text-foreground">
              Все важное для запуска в одном месте
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              Короткая карта перед запуском: все главные разделы на виду,
              без длинного чтения и поиска по меню.
            </p>
          </div>
          <span className="w-fit rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
            функциональные проверки пройдены
          </span>
        </div>

        <div className="mt-5 grid gap-2 md:grid-cols-2">
          {ARAY_SYSTEM_LINKS.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.title}
                href={item.href}
                className="group flex min-h-20 items-center gap-3 rounded-xl border border-border bg-background px-3 py-3 transition-colors hover:border-primary/35 hover:bg-primary/[0.035]"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-primary">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">{item.title}</span>
                    <span className="rounded-full border border-border bg-card px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                      {item.status}
                    </span>
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-muted-foreground">{item.text}</span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
              </Link>
            );
          })}
        </div>
      </section>

      {/* Main import panel lives at the top: ARAY chat-first law. */}

      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              рабочий путь
            </p>
            <h2 className="mt-1 text-base font-semibold text-foreground">
              Идем по шагам: домен, бриф, сборка, проверка
            </h2>
          </div>
          <span className="w-fit rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            без лишних экранов
          </span>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {ARAY_CLICK_STEPS.map((step) => {
            const Icon = step.icon;
            return (
              <div key={step.title} className="flex min-h-40 flex-col rounded-xl border border-border bg-background p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{step.title}</h3>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{step.text}</p>
                  </div>
                </div>
                <Button asChild variant="outline" size="sm" className="mt-auto w-fit">
                  <Link href={step.href}>
                    {step.action}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Receipt className="h-4 w-4 text-primary" />
              Живая очередь ARAY CRM
            </div>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              Здесь появляются заявки с публичного ARAY: клиент, телефон, задача,
              сумма, статус CRM и следующий шаг для партнера.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold text-muted-foreground">
              {arayLeads.length} заявок
            </span>
            <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              {formatRubValue(liveTotal)}
            </span>
          </div>
        </div>

        {arayLeads.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-border bg-background p-6 text-center">
            <Sparkles className="mx-auto h-8 w-8 text-primary" />
            <h2 className="mt-3 text-base font-semibold text-foreground">Пока нет клиентских заявок ARAY</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
              Первая заявка с формы “Заказать систему” появится здесь и в CRM.
              После этого партнер сможет собрать бриф, предложение, счет и запуск.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <Button asChild>
                <Link href="/aray/marketing/apply">
                  Открыть форму
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/admin/crm">
                  CRM
                  <Users className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-5 grid gap-3">
            {arayLeads.map((lead) => (
              <article key={lead.id} className="rounded-2xl border border-border bg-background p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-semibold text-foreground">
                        {lead.company || lead.name}
                      </h2>
                      <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
                        {CRM_STAGE_LABELS[lead.stage] || lead.stage}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {lead.name} · {lead.phone || "телефон не указан"} · {formatLeadDate(lead.createdAt)}
                    </p>
                    {lead.comment ? (
                      <p className="mt-3 whitespace-pre-line rounded-xl border border-border bg-card px-3 py-3 text-xs leading-5 text-muted-foreground">
                        {lead.comment}
                      </p>
                    ) : null}
                  </div>

                  <div className="shrink-0 rounded-xl border border-border bg-card px-4 py-3 lg:w-72">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">сумма</p>
                    <p className="mt-1 text-lg font-semibold text-foreground">{formatRubValue(lead.value)}</p>
                    <p className="mt-3 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">следующий шаг</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      {NEXT_ACTION_BY_STAGE[lead.stage] || "Проверить заявку и назначить ответственного."}
                    </p>
                  </div>
                </div>

                {lead.activities[0]?.text ? (
                  <div className="mt-3 flex gap-3 rounded-xl border border-primary/20 bg-primary/10 px-3 py-3 text-xs leading-5 text-muted-foreground">
                    <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span className="whitespace-pre-line">{lead.activities[0].text}</span>
                  </div>
                ) : null}

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button asChild variant="outline" size="sm">
                    <Link href="/admin/crm">
                      Открыть CRM
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/admin/aray/briefs?leadId=${lead.id}`}>
                      Собрать бриф
                      <FileText className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild size="sm">
                    <Link href={`/admin/aray/builder?leadId=${lead.id}`}>
                      Запуск сайта
                      <Sparkles className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-base font-semibold text-foreground">Первый поток</h2>
          <div className="mt-4 space-y-3">
            {ORDER_FLOW.map((item) => (
              <div key={item} className="flex gap-3 text-sm leading-6 text-muted-foreground">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-base font-semibold text-foreground">Статусы заказа</h2>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {ARAY_AGENCY_STATUSES.map((status, index) => (
              <div key={status} className="flex items-center gap-3 rounded-xl border border-border bg-background px-3 py-2.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {index + 1}
                </span>
                <span className="text-sm text-foreground">{status}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">Запуск сайта из заказа</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Заказ не живет отдельно от сайта. Из него ARAY открывает QUIZ,
              создает отдельный сайт и ведет партнера до производства, аналитики и отчета.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/admin/aray/builder">
              ARAY Launch
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {ORDER_LAUNCH_FLOW.map((step) => {
            const Icon = step.icon;
            return (
              <div key={step.title} className="rounded-xl border border-border bg-background p-4">
                <Icon className="h-5 w-5 text-primary" />
                <h3 className="mt-3 text-sm font-semibold text-foreground">{step.title}</h3>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">{step.text}</p>
              </div>
            );
          })}
        </div>
      </section>

      <details className="rounded-2xl border border-dashed border-border bg-background/40 p-5">
        <summary className="cursor-pointer list-none">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                служебная карта
              </p>
              <h2 className="mt-1 text-base font-semibold text-foreground">
                Показать производство, счета, документы и будущие слои
              </h2>
            </div>
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-muted-foreground">
              скрыто, чтобы не мешало
              <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </div>
        </summary>

        <div className="mt-5 grid gap-4">
      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Sparkles className="h-4 w-4 text-primary" />
          QUIZ с ARAY, а не сухая анкета
        </div>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          Партнер не заполняет тяжелую техническую форму один. ARAY работает рядом:
          спрашивает, открывает разделы, показывает подготовку, объясняет и просит подтвердить запуск.
        </p>
        <div className="mt-5 grid gap-2 md:grid-cols-2">
          {ARAY_LIVE_QUIZ_FLOW.map((item) => (
            <div key={item} className="flex gap-3 rounded-xl border border-border bg-background px-3 py-3 text-xs leading-5 text-muted-foreground">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <FileText className="h-4 w-4 text-primary" />
          ARAY показывает материалы по ситуации
        </div>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          Бренд-комплект, правила и документы оставляем как память системы. ARAY не заставляет
          партнера искать их вручную: он показывает нужный материал в момент продажи, рекламы,
          брифа, счета или запуска производства.
        </p>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {ARAY_CONTEXT_DOCUMENTS.map((document) => (
            <Link
              key={document.title}
              href={document.href}
              className="group rounded-xl border border-border bg-background p-4 transition-colors hover:border-primary/35 hover:bg-primary/[0.035]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{document.title}</h3>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">{document.when}</p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-primary transition-transform group-hover:translate-x-0.5" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Package className="h-4 w-4 text-primary" />
          Производство через ARAY
        </div>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          Все цифровые работы можно разложить на понятные задачи: от SMM и фото до SEO,
          рекламы, видео, инструкций и ИИ-автоматизации. Так предприниматель покупает результат,
          а специалисты получают ясную работу внутри одного заказа.
        </p>
        <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {PRODUCTION_SERVICE_AREAS.map((service) => (
            <div key={service} className="rounded-xl border border-border bg-background px-3 py-3 text-sm font-medium text-foreground">
              {service}
            </div>
          ))}
        </div>
        <div className="mt-5 grid gap-2 md:grid-cols-2">
          {PRODUCTION_NETWORK_RULES.map((rule) => (
            <div key={rule} className="flex gap-3 rounded-xl border border-border bg-background px-3 py-3 text-xs leading-5 text-muted-foreground">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>{rule}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Users className="h-4 w-4 text-primary" />
          Специалисты внутри производства
        </div>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          Это основа будущей биржи ARAY: партнер продает пакет клиенту, а внутри заказа
          появляются аккуратные задачи для фрилансеров и команды без потери качества.
        </p>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {SERVICE_MARKETPLACE_FLOW.map((layer) => (
            <div key={layer.title} className="rounded-xl border border-border bg-background p-4">
              <h3 className="text-sm font-semibold text-foreground">{layer.title}</h3>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">{layer.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Sparkles className="h-4 w-4 text-primary" />
          Цифровой продукт ARAY
        </div>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          Это будущая витрина цифровых услуг: партнер продает понятный пакет, CRM ведет клиента,
          ARAY/Yuva делает производство, а система каждый месяц поддерживает оплату, задачи и отчет.
        </p>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {DIGITAL_PRODUCT_LAYERS.map((layer) => (
            <div key={layer.title} className="rounded-xl border border-border bg-background p-4">
              <h3 className="text-sm font-semibold text-foreground">{layer.title}</h3>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">{layer.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Repeat className="h-4 w-4 text-primary" />
          Действующие проекты в CRM
        </div>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          После запуска клиент не исчезает. Он остается активным проектом: сайт, PWA, заявки,
          реклама, SEO, счета, задачи и отчеты живут в одном маршруте.
        </p>
        <div className="mt-5 grid gap-2 md:grid-cols-2">
          {ACTIVE_PROJECT_FLOW.map((item) => (
            <div key={item} className="flex gap-3 rounded-xl border border-border bg-background px-3 py-3 text-xs leading-5 text-muted-foreground">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">Подписка и счета</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Маркетинг под ключ ведем как ежемесячную услугу. Система готовит счета и напоминания,
              а отправку и юридические детали партнер подтверждает перед клиентом.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/admin/aray/requisites">
              Реквизиты
              <Landmark className="h-4 w-4" />
            </Link>
          </Button>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {SUBSCRIPTION_BILLING_FLOW.map((step) => {
            const Icon = step.icon;
            return (
              <div key={step.title} className="rounded-xl border border-border bg-background p-4">
                <Icon className="h-5 w-5 text-primary" />
                <h3 className="mt-3 text-sm font-semibold text-foreground">{step.title}</h3>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">{step.text}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">Следующий рабочий слой</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Когда появится модель данных, этот раздел станет очередью заказов с фильтрами,
              счетами, оплатами партнера и задачами производства.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href="/admin/aray/requisites">
                Реквизиты
                <Landmark className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/admin/aray/arc">
                ARC баланс
                <Package className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
        </div>
      </details>
    </div>
  );
}
