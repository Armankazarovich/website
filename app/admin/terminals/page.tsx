import Link from "next/link";
import {
  ArrowRight,
  Banknote,
  Bot,
  BookOpen,
  CheckCircle2,
  ChefHat,
  CreditCard,
  Monitor,
  Package,
  Printer,
  QrCode,
  ReceiptText,
  Router,
  ScanLine,
  ShieldCheck,
  Settings2,
  Smartphone,
  Store,
  Truck,
  UserRound,
  Wrench,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { TERMINAL_PROFILES } from "@/lib/terminal-profiles";
import { TerminalIntegrationActions } from "./terminal-integration-actions";
import { TerminalOpsActions } from "./terminal-ops-actions";
import { TerminalProfileSettings } from "./terminal-profile-settings";
const WORKSTATIONS = [
  {
    title: "Касса",
    description: "Оплата, чек, возврат, смена, быстрый заказ.",
    icon: Store,
    routes: ["чек клиенту", "оплата", "кассовый принтер"],
  },
  {
    title: "Официант / менеджер",
    description: "Приём заказа на телефоне, планшете или стойке.",
    icon: UserRound,
    routes: ["заказ в кухню", "комментарии", "статус"],
  },
  {
    title: "Кухня / производство",
    description: "Печать задач по зонам: кухня, цех, склад, сборка.",
    icon: ChefHat,
    routes: ["маршрут печати", "тикет", "готовность"],
  },
  {
    title: "Склад / выдача",
    description: "Сборка, отгрузка, доставка, сканирование позиций.",
    icon: Package,
    routes: ["накладная", "штрихкод", "курьер"],
  },
];
const DEVICE_GROUPS = [
  {
    title: "Онлайн-оплата",
    description: "Провайдер, тестовый режим, уведомления от сервиса, фискальный чек.",
    icon: CreditCard,
    status: "Проектируется",
    items: ["эквайринг", "счёт", "предоплата", "возврат"],
  },
  {
    title: "Принтеры",
    description: "Чеки, кухня, производство, офис, складские накладные.",
    icon: Printer,
    status: "Нужен коннектор",
    items: ["USB", "LAN/Wi-Fi", "термопринтер", "A4"],
  },
  {
    title: "Сканеры",
    description: "Штрихкод и QR: проводной сканер как клавиатура, камера и сеть через модуль.",
    icon: ScanLine,
    status: "Базовый режим",
    items: ["штрихкод", "QR", "инвентаризация", "поиск"],
  },
  {
    title: "Рабочие места",
    description:
      "Профили под ресторан, магазин, услуги, производство и стройку.",
    icon: Monitor,
    status: "Готовим",
    items: ["касса", "официант", "кухня", "склад"],
  },
  {
    title: "Синхронизация",
    description:
      "CRM, сайт, индекс поиска, статусы от сервисов, уведомления и очередь обмена.",
    icon: Router,
    status: "Контур готов",
    items: ["CRM", "индекс", "статусы", "Арай"],
  },
];
const SUPPORT_MATRIX = [
  {
    title: "Сканеры как клавиатура",
    support: "поддерживаем первыми",
    description:
      "Работают как клавиатура: сканер вводит штрихкод в активное поле терминала.",
    examples: "Zebra / Honeywell / Datalogic в режиме ввода как клавиатура",
  },
  {
    title: "Сетевые POS-принтеры",
    support: "приоритет",
    description:
      "Печать чеков, заказов кухни/цеха и накладных через сеть или официальный модуль производителя.",
    examples: "Star WebPRNT/CloudPRNT, Epson ePOS, ESC/POS через коннектор",
  },
  {
    title: "USB-принтеры",
    support: "через коннектор",
    description:
      "Браузер не может надёжно печатать тихо напрямую, нужен локальный агент на ПК.",
    examples: "Windows service / desktop connector / Electron helper",
  },
  {
    title: "Онлайн-оплата",
    support: "после событий терминала",
    description:
      "Терминал создаёт запрос оплаты, провайдер возвращает статус через защищённое уведомление.",
    examples: "эквайринг, платёжная ссылка, QR, счёт",
  },
];
const EVENT_ROUTES = [
  { event: "order_created", target: "офис / менеджер", icon: ReceiptText },
  { event: "payment_requested", target: "касса / банк", icon: Banknote },
  { event: "send_to_production", target: "кухня / цех / склад", icon: ChefHat },
  { event: "shipment_ready", target: "выдача / доставка", icon: Truck },
];
const SHIFT_FLOW = [
  {
    title: "Открытие",
    description:
      "Кассир выбирает рабочее место, вводит стартовые наличные, система фиксирует дату, устройство и ответственного.",
  },
  {
    title: "Работа",
    description:
      "Все продажи, интернет-заказы, самовывозы, оплаты, возвраты, скидки и служебные операции привязываются к смене.",
  },
  {
    title: "Сверка",
    description:
      "В конце кассир вводит фактические наличные, карта/онлайн подтягиваются из оплат, система показывает расхождения.",
  },
  {
    title: "Закрытие",
    description:
      "Формируются отчёт смены, PDF, журнал операций, уведомление руководителю и задачи по расхождениям.",
  },
];
const MOBILE_TERMINAL_FLOW = [
  {
    title: "Фрилансер с телефона",
    description:
      "Создаёт заказ, показывает QR, отправляет ссылку, фиксирует комментарий и не теряет клиента.",
    icon: Smartphone,
  },
  {
    title: "Касса с принтером",
    description:
      "Печатает чек, маршрут кухни/цеха, накладную и закрывает операции в смене.",
    icon: Printer,
  },
  {
    title: "Без принтера",
    description:
      "Электронный чек, PDF, ссылка оплаты и уведомление клиенту вместо бумажного сценария.",
    icon: QrCode,
  },
];
const LEGAL_GUARDS = [
  "Заказ, оплата и фискальный чек живут отдельными статусами.",
  "Арай готовит действие, но деньги, чек и отправку подтверждает сотрудник.",
  "Устройство получает уровень доверия: план, есть официальный модуль, проверено на стенде, сертифицировано ARAY.",
  "Если нет кассы или ОФД, интерфейс не делает вид, что чек уже законно пробит.",
];
const ARAY_OPERATOR_LAYERS = [
  {
    title: "Диагностика",
    description:
      "Проверяет профиль сферы, рабочее место, оплату, чек, принтер, сканер, сеть, права и последние ошибки.",
  },
  {
    title: "Мастер настройки",
    description:
      "Ведёт обычного человека по шагам: выбрать сферу, подключить устройство, сделать тест, сохранить маршрут.",
  },
  {
    title: "Автопочинка",
    description:
      "Может сбросить зависшую очередь печати, повторить запрос статуса, обновить оплату, создать задачу ответственному.",
  },
  {
    title: "Эскалация",
    description:
      "Если нужен человек, собирает пакет: скрин, логи, устройство, роль, заказ, ошибка, шаги воспроизведения.",
  },
];
const ARAY_RISK_LEVELS = [
  [
    "Можно самому",
    "подсказки, поиск, инструкции, проверка статусов, тест без денег",
  ],
  [
    "Нужно подтверждение",
    "создать заказ, отправить счёт, печать, повтор операции, смена маршрута",
  ],
  [
    "Только админ",
    "касса/ОФД, платежный провайдер, роли, возвраты, массовые действия",
  ],
  [
    "Только специалист",
    "юридические настройки, сертификация устройства, налоговые спорные случаи",
  ],
];
const ESCALATION_FLOW = [
  [
    "1. Самодиагностика",
    "Арай проверяет профиль, рабочее место, права, смену, оплату, устройство, сеть и очередь.",
  ],
  [
    "2. Попытка решить",
    "Показывает шаги, запускает безопасный тест или готовит действие с подтверждением.",
  ],
  [
    "3. Инцидент",
    "Если не решил, создаёт карточку с кодом, контекстом, логами, заказом, устройством и ролью.",
  ],
  [
    "4. Уведомление",
    "Команда получает push/Telegram/email и сразу видит, что уже проверено.",
  ],
];
const SETUP_LEVELS = [
  ["1. Быстрый старт", "телефон, QR/ссылка, электронное подтверждение"],
  ["2. Рабочая касса", "смена, принтер, сканер, роли сотрудников"],
  ["3. Законный контур", "эквайринг, касса/ОФД, отчёты, возвраты"],
  ["4. Рабочий контур", "кухня/цех/склад, маршруты печати, Арай-оператор"],
];
const SELF_SERVICE_LAYERS = [
  ["Ежедневная работа", "терминал, заказ, клиент, QR, печать, смена"],
  [
    "Настройки владельца",
    "профиль сферы, рабочие места, роли, сценарии получения",
  ],
  [
    "Интеграции",
    "оплата, фискализация, принтеры, склад, доставка, бухгалтерия",
  ],
  ["Поддержка", "Арай, диагностика, инцидент, уведомление команды"],
];
const SELF_SERVICE_STEPS = [
  {
    title: "1. Выбрать сферу",
    owner: "владелец или Арай",
    action:
      "Профиль меняет слова, поля, статусы и маршруты: ресторан, магазин, услуги, стройка или универсальный режим.",
    check: "Терминал не показывает лишнюю кашу: только релевантные сценарии.",
  },
  {
    title: "2. Создать рабочее место",
    owner: "админ",
    action:
      "Мобильная точка, касса, официант, кухня, склад, объект или выездной сотрудник.",
    check:
      "У каждой точки понятны режим оплаты, печати, сканера и роль сотрудника.",
  },
  {
    title: "3. Открыть смену",
    owner: "кассир",
    action: "Ввести стартовые наличные, выбрать точку и начать продажи.",
    check: "Все оплаты, возвраты и расхождения привязаны к смене.",
  },
  {
    title: "4. Проверить обмен",
    owner: "админ или Арай",
    action:
      "Подготовить коннекторы, пересобрать индекс, проверить QR-уведомления и очередь событий.",
    check: "CRM, заказы сайта, поиск, уведомления и Арай видят одну картину.",
  },
  {
    title: "5. Сделать тест",
    owner: "сотрудник",
    action:
      "Создать тест печати, тест QR/уведомлений и тестовый заказ без обещания реальной фискализации.",
    check: "Если что-то не проходит, создаётся инцидент с контекстом.",
  },
  {
    title: "6. Обучить команду",
    owner: "руководитель",
    action:
      "Открыть короткое обучение по ролям: кассир, менеджер, фрилансер, владелец.",
    check: "Человек знает, где заказать, где проверить, где звать Арая.",
  },
];
const SETTINGS_MAP = [
  ["Профиль сферы", "здесь, блок “Настройка профиля терминала”"],
  [
    "Рабочие места",
    "блок “Рабочий пульт терминала”: мобильная точка, смена, тест печати",
  ],
  ["Коннекторы", "блок “Синхронизации, индексация и уведомления”"],
  [
    "Оплаты",
    "очередь оплат: QR, ссылка, статусы ожидает/оплачено/ошибка",
  ],
  [
    "Печать",
    "PrintJob + очередь printing jobs: чек, кухня, склад, производство",
  ],
  ["Смены", "открыть/закрыть в рабочем пульте, дальше добавим PDF-отчёт"],
  ["Обучение", "/admin/terminals/training"],
];
const UX_REMAINING = [
  [
    "Провайдер оплаты",
    "выбрать банк/эквайринг, подключить уведомления о статусах и тестовый режим",
  ],
  [
    "Фискальный контур",
    "касса/ОФД или провайдер чеков, возвраты, статусы, юридическая проверка",
  ],
  [
    "Локальный коннектор",
    "тихая USB-печать, сетевые принтеры, повтор, ошибка устройства",
  ],
  [
    "PDF отчёт смены",
    "закрытие кассы, сверка, расхождения, отправка руководителю",
  ],
  [
    "Процессор очереди",
    "фоновые повторы обмена, повтор статусов, очередь ошибок и уведомления",
  ],
  [
    "Арай-действия",
    "черновик заказа, QR, статус, инцидент и настройка только с подтверждением",
  ],
];
async function getTerminalOpsSnapshot() {
  try {
    const [
      workstations,
      openShifts,
      pendingPayments,
      queuedPrintJobs,
      openIncidents,
      connectors,
      queuedSyncJobs,
      failedSyncJobs,
      indexedEntities,
      recentPayments,
      recentPrintJobs,
      recentSyncJobs,
    ] = await Promise.all([
      prisma.terminalWorkstation.count({ where: { status: "ACTIVE" } }),
      prisma.cashShift.count({ where: { status: "OPEN" } }),
      prisma.payment.count({
        where: { status: { in: ["PENDING", "REQUESTED"] } },
      }),
      prisma.printJob.count({ where: { status: "QUEUED" } }),
      prisma.supportIncident.count({
        where: { status: "OPEN", category: "terminal" },
      }),
      prisma.terminalConnector.count({ where: { status: "ACTIVE" } }),
      prisma.terminalSyncJob.count({ where: { status: "QUEUED" } }),
      prisma.terminalSyncJob.count({ where: { status: "FAILED" } }),
      prisma.terminalSearchIndex.count(),
      prisma.payment.findMany({ orderBy: { createdAt: "desc" }, take: 4 }),
      prisma.printJob.findMany({ orderBy: { createdAt: "desc" }, take: 4 }),
      prisma.terminalSyncJob.findMany({
        orderBy: { createdAt: "desc" },
        take: 4,
      }),
    ]);
    return {
      workstations,
      openShifts,
      pendingPayments,
      queuedPrintJobs,
      openIncidents,
      connectors,
      queuedSyncJobs,
      failedSyncJobs,
      indexedEntities,
      recentPayments,
      recentPrintJobs,
      recentSyncJobs,
    };
  } catch {
    return {
      workstations: 0,
      openShifts: 0,
      pendingPayments: 0,
      queuedPrintJobs: 0,
      openIncidents: 0,
      connectors: 0,
      queuedSyncJobs: 0,
      failedSyncJobs: 0,
      indexedEntities: 0,
      recentPayments: [],
      recentPrintJobs: [],
      recentSyncJobs: [],
    };
  }
}
export default async function AdminTerminalsPage() {
  const ops = await getTerminalOpsSnapshot();
  return (
    <div className="space-y-6">
      {" "}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        {" "}
        <div>
          {" "}
          <div className="flex items-center gap-2">
            {" "}
            <Settings2 className="h-5 w-5 text-primary" />{" "}
            <h1 className="font-display text-2xl font-bold">
              Терминалы и устройства
            </h1>{" "}
          </div>{" "}
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {" "}
            Единая настройка рабочих мест, оплат, принтеров, сканеров и
            маршрутов печати для любой сферы бизнеса.{" "}
          </p>{" "}
        </div>{" "}
        <div className="grid gap-2 sm:grid-cols-2 lg:min-w-[360px]">
          <Link
            href="/admin/orders/new"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Smartphone className="h-4 w-4" /> Терминал
          </Link>
          <Link
            href="/admin/terminals/training"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 text-sm font-semibold text-foreground transition-colors hover:border-primary/40"
          >
            <BookOpen className="h-4 w-4" /> Обучение
          </Link>
        </div>{" "}
      </div>{" "}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {" "}
        {DEVICE_GROUPS.map((group) => {
          const Icon = group.icon;
          return (
            <div
              key={group.title}
              className="rounded-2xl border border-border bg-card p-4"
            >
              {" "}
              <div className="mb-3 flex items-start justify-between gap-3">
                {" "}
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  {" "}
                  <Icon className="h-5 w-5" />{" "}
                </div>{" "}
                <span className="rounded-xl border border-border bg-background px-2 py-1 text-[11px] font-medium text-muted-foreground">
                  {" "}
                  {group.status}{" "}
                </span>{" "}
              </div>{" "}
              <h2 className="text-sm font-semibold">{group.title}</h2>{" "}
              <p className="mt-1 min-h-10 text-xs text-muted-foreground">
                {group.description}
              </p>{" "}
              <div className="mt-3 flex flex-wrap gap-1">
                {" "}
                {group.items.map((item) => (
                  <span
                    key={item}
                    className="rounded-xl bg-muted/40 px-2 py-1 text-[11px] text-muted-foreground"
                  >
                    {" "}
                    {item}{" "}
                  </span>
                ))}{" "}
              </div>{" "}
            </div>
          );
        })}{" "}
      </div>{" "}
      <TerminalOpsActions /> <TerminalProfileSettings />{" "}
      <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        {" "}
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          {" "}
          <div className="flex items-start gap-3">
            {" "}
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              {" "}
              <ShieldCheck className="h-5 w-5" />{" "}
            </div>{" "}
            <div>
              {" "}
              <h2 className="font-semibold">
                Мастер самостоятельного запуска
              </h2>{" "}
              <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
                {" "}
                Разделён так, чтобы обычный человек понял порядок: сначала
                профиль и рабочее место, потом смена, обмен, тесты и
                обучение.{" "}
              </p>{" "}
            </div>{" "}
          </div>{" "}
          <Link
            href="/admin/terminals/training"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold text-foreground transition-colors hover:border-primary/40"
          >
            {" "}
            <BookOpen className="h-4 w-4" /> Обучение{" "}
          </Link>{" "}
        </div>{" "}
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {" "}
          {SELF_SERVICE_LAYERS.map(([title, text]) => (
            <div
              key={title}
              className="rounded-2xl border border-border bg-background p-4"
            >
              {" "}
              <p className="text-sm font-semibold">{title}</p>{" "}
              <p className="mt-2 text-xs text-muted-foreground">{text}</p>{" "}
            </div>
          ))}{" "}
        </div>{" "}
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {" "}
          {SELF_SERVICE_STEPS.map((step) => (
            <div
              key={step.title}
              className="rounded-2xl border border-border bg-background p-4"
            >
              {" "}
              <div className="mb-3 flex items-start justify-between gap-3">
                {" "}
                <p className="text-sm font-semibold">{step.title}</p>{" "}
                <span className="rounded-xl border border-border bg-muted/20 px-2 py-1 text-[11px] text-muted-foreground">
                  {" "}
                  {step.owner}{" "}
                </span>{" "}
              </div>{" "}
              <p className="text-xs text-muted-foreground">{step.action}</p>{" "}
              <div className="mt-3 rounded-xl border border-border bg-muted/20 p-3">
                {" "}
                <p className="text-[10px] font-semibold uppercase tracking-wide text-primary">
                  Проверка
                </p>{" "}
                <p className="mt-1 text-xs text-muted-foreground">
                  {step.check}
                </p>{" "}
              </div>{" "}
            </div>
          ))}{" "}
        </div>{" "}
      </section>{" "}
      <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        {" "}
        <div className="mb-4 flex items-center gap-2">
          {" "}
          <Monitor className="h-5 w-5 text-primary" />{" "}
          <h2 className="font-semibold">Операционный центр</h2>{" "}
        </div>{" "}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {" "}
          {[
            ["Рабочие места", ops.workstations, "активные точки"],
            ["Открытые смены", ops.openShifts, "касса в работе"],
            ["Ждут оплату", ops.pendingPayments, "PENDING / REQUESTED"],
            ["Очередь печати", ops.queuedPrintJobs, "QUEUED"],
            ["Инциденты", ops.openIncidents, "нужна реакция"],
            ["Коннекторы", ops.connectors, "активные связи"],
            ["Синхронизация", ops.queuedSyncJobs, "jobs в очереди"],
            ["Индекс", ops.indexedEntities, "записи поиска"],
          ].map(([title, value, text]) => (
            <div
              key={title}
              className="rounded-2xl border border-border bg-background p-4"
            >
              {" "}
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {title}
              </p>{" "}
              <p className="mt-2 text-2xl font-bold text-foreground">{value}</p>{" "}
              <p className="mt-1 text-xs text-muted-foreground">{text}</p>{" "}
            </div>
          ))}{" "}
        </div>{" "}
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          {" "}
          <div className="rounded-2xl border border-border bg-muted/20 p-4">
            {" "}
            <p className="mb-3 text-sm font-semibold">Последние оплаты</p>{" "}
            <div className="space-y-2">
              {" "}
              {ops.recentPayments.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Платёжных операций пока нет.
                </p>
              ) : (
                ops.recentPayments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-3 py-2"
                  >
                    {" "}
                    <div className="min-w-0">
                      {" "}
                      <p className="truncate text-xs font-semibold">
                        {payment.method}
                      </p>{" "}
                      <p className="text-[11px] text-muted-foreground">
                        {payment.status}
                      </p>{" "}
                    </div>{" "}
                    <p className="shrink-0 text-xs font-bold">
                      {Number(payment.amount).toLocaleString("ru-RU")} ₽
                    </p>{" "}
                  </div>
                ))
              )}{" "}
            </div>{" "}
          </div>{" "}
          <div className="rounded-2xl border border-border bg-muted/20 p-4">
            {" "}
            <p className="mb-3 text-sm font-semibold">Последняя печать</p>{" "}
            <div className="space-y-2">
              {" "}
              {ops.recentPrintJobs.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Очередь печати пока пустая.
                </p>
              ) : (
                ops.recentPrintJobs.map((job) => (
                  <div
                    key={job.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-3 py-2"
                  >
                    {" "}
                    <div className="min-w-0">
                      {" "}
                      <p className="truncate text-xs font-semibold">
                        {job.title}
                      </p>{" "}
                      <p className="text-[11px] text-muted-foreground">
                        {job.route} · {job.type}
                      </p>{" "}
                    </div>{" "}
                    <p className="shrink-0 text-xs font-semibold text-primary">
                      {job.status}
                    </p>{" "}
                  </div>
                ))
              )}{" "}
            </div>{" "}
          </div>{" "}
          <div className="rounded-2xl border border-border bg-muted/20 p-4">
            {" "}
            <p className="mb-3 text-sm font-semibold">Синхронизация</p>{" "}
            <div className="space-y-2">
              {" "}
              {ops.recentSyncJobs.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Событий обмена пока нет.
                </p>
              ) : (
                ops.recentSyncJobs.map((job) => (
                  <div
                    key={job.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-3 py-2"
                  >
                    {" "}
                    <div className="min-w-0">
                      {" "}
                      <p className="truncate text-xs font-semibold">
                        {job.event}
                      </p>{" "}
                      <p className="text-[11px] text-muted-foreground">
                        {job.channel} · {job.entityType}
                      </p>{" "}
                    </div>{" "}
                    <p className="shrink-0 text-xs font-semibold text-primary">
                      {job.status}
                    </p>{" "}
                  </div>
                ))
              )}{" "}
            </div>{" "}
          </div>{" "}
        </div>{" "}
      </section>{" "}
      <TerminalIntegrationActions />{" "}
      <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        {" "}
        <div className="mb-4 flex items-center gap-2">
          {" "}
          <Wrench className="h-5 w-5 text-primary" />{" "}
          <h2 className="font-semibold">Где что настраивается</h2>{" "}
        </div>{" "}
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {" "}
          {SETTINGS_MAP.map(([title, text]) => (
            <div
              key={title}
              className="rounded-2xl border border-border bg-background p-4"
            >
              {" "}
              <p className="text-sm font-semibold">{title}</p>{" "}
              <p className="mt-2 text-xs text-muted-foreground">{text}</p>{" "}
            </div>
          ))}{" "}
        </div>{" "}
        <div className="mt-4 flex flex-wrap gap-2">
          {" "}
          <Link
            href="/admin/terminals/training"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold text-foreground transition-colors hover:border-primary/40"
          >
            {" "}
            <BookOpen className="h-4 w-4" /> Открыть обучение{" "}
          </Link>{" "}
          <Link
            href="/admin/orders/new"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {" "}
            <Smartphone className="h-4 w-4" /> Проверить терминал{" "}
          </Link>{" "}
        </div>{" "}
      </section>{" "}
      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        {" "}
        <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
          {" "}
          <div className="mb-4 flex items-center gap-2">
            {" "}
            <Monitor className="h-5 w-5 text-primary" />{" "}
            <h2 className="font-semibold">Профили рабочих мест</h2>{" "}
          </div>{" "}
          <div className="grid gap-3 sm:grid-cols-2">
            {" "}
            {WORKSTATIONS.map((station) => {
              const Icon = station.icon;
              return (
                <div
                  key={station.title}
                  className="rounded-2xl border border-border bg-background p-4"
                >
                  {" "}
                  <div className="flex items-start gap-3">
                    {" "}
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      {" "}
                      <Icon className="h-5 w-5" />{" "}
                    </div>{" "}
                    <div className="min-w-0">
                      {" "}
                      <h3 className="text-sm font-semibold">
                        {station.title}
                      </h3>{" "}
                      <p className="mt-1 text-xs text-muted-foreground">
                        {station.description}
                      </p>{" "}
                    </div>{" "}
                  </div>{" "}
                  <div className="mt-3 flex flex-wrap gap-1">
                    {" "}
                    {station.routes.map((route) => (
                      <span
                        key={route}
                        className="rounded-xl border border-border px-2 py-1 text-[11px] text-muted-foreground"
                      >
                        {" "}
                        {route}{" "}
                      </span>
                    ))}{" "}
                  </div>{" "}
                </div>
              );
            })}{" "}
          </div>{" "}
        </section>{" "}
        <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
          {" "}
          <div className="mb-4 flex items-center gap-2">
            {" "}
            <Router className="h-5 w-5 text-primary" />{" "}
            <h2 className="font-semibold">Маршруты событий</h2>{" "}
          </div>{" "}
          <div className="space-y-2">
            {" "}
            {EVENT_ROUTES.map((route) => {
              const Icon = route.icon;
              return (
                <div
                  key={route.event}
                  className="flex items-center gap-3 rounded-xl border border-border bg-background p-3"
                >
                  {" "}
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                    {" "}
                    <Icon className="h-4 w-4" />{" "}
                  </div>{" "}
                  <div className="min-w-0 flex-1">
                    {" "}
                    <p className="font-mono text-xs font-semibold">
                      {route.event}
                    </p>{" "}
                    <p className="text-xs text-muted-foreground">
                      {route.target}
                    </p>{" "}
                  </div>{" "}
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />{" "}
                </div>
              );
            })}{" "}
          </div>{" "}
        </section>{" "}
      </div>{" "}
      <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        {" "}
        <div className="mb-4 flex items-center gap-2">
          {" "}
          <Smartphone className="h-5 w-5 text-primary" />{" "}
          <h2 className="font-semibold">
            Мобильная касса для фрилансеров и выездных сотрудников
          </h2>{" "}
        </div>{" "}
        <div className="grid gap-3 md:grid-cols-3">
          {" "}
          {MOBILE_TERMINAL_FLOW.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="rounded-2xl border border-border bg-background p-4"
              >
                {" "}
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  {" "}
                  <Icon className="h-5 w-5" />{" "}
                </div>{" "}
                <p className="text-sm font-semibold">{item.title}</p>{" "}
                <p className="mt-2 text-xs text-muted-foreground">
                  {item.description}
                </p>{" "}
              </div>
            );
          })}{" "}
        </div>{" "}
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          {" "}
          {SETUP_LEVELS.map(([title, text]) => (
            <div
              key={title}
              className="rounded-2xl border border-border bg-muted/20 p-4"
            >
              {" "}
              <p className="text-sm font-semibold">{title}</p>{" "}
              <p className="mt-1 text-xs text-muted-foreground">{text}</p>{" "}
            </div>
          ))}{" "}
        </div>{" "}
      </section>{" "}
      <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        {" "}
        <div className="mb-4 flex items-center gap-2">
          {" "}
          <Settings2 className="h-5 w-5 text-primary" />{" "}
          <h2 className="font-semibold">Профили сфер и CRM-логика</h2>{" "}
        </div>{" "}
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {" "}
          {Object.values(TERMINAL_PROFILES).map((profile) => (
            <div
              key={profile.key}
              className="rounded-2xl border border-border bg-background p-4"
            >
              {" "}
              <div className="mb-3 flex items-start justify-between gap-3">
                {" "}
                <div>
                  {" "}
                  <p className="text-sm font-semibold">{profile.label}</p>{" "}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {profile.productionTarget}
                  </p>{" "}
                </div>{" "}
                <span className="rounded-xl bg-primary/10 px-2 py-1 text-[10px] font-medium text-primary">
                  {" "}
                  {profile.positionWord}{" "}
                </span>{" "}
              </div>{" "}
              <div className="space-y-2">
                {" "}
                <div>
                  {" "}
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Заказы
                  </p>{" "}
                  <div className="flex flex-wrap gap-1">
                    {" "}
                    {profile.pipeline.orderStatuses
                      .slice(0, 4)
                      .map((status) => (
                        <span
                          key={status}
                          className="rounded-xl border border-border px-2 py-1 text-[11px] text-muted-foreground"
                        >
                          {" "}
                          {status}{" "}
                        </span>
                      ))}{" "}
                  </div>{" "}
                </div>{" "}
                <div>
                  {" "}
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Оплаты
                  </p>{" "}
                  <div className="flex flex-wrap gap-1">
                    {" "}
                    {profile.pipeline.paymentStatuses
                      .slice(0, 4)
                      .map((status) => (
                        <span
                          key={status}
                          className="rounded-xl border border-border px-2 py-1 text-[11px] text-muted-foreground"
                        >
                          {" "}
                          {status}{" "}
                        </span>
                      ))}{" "}
                  </div>{" "}
                </div>{" "}
              </div>{" "}
            </div>
          ))}{" "}
        </div>{" "}
      </section>{" "}
      <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        {" "}
        <div className="mb-4 flex items-center gap-2">
          {" "}
          <ShieldCheck className="h-5 w-5 text-primary" />{" "}
          <h2 className="font-semibold">Деньги, налоги и доверие</h2>{" "}
        </div>{" "}
        <div className="grid gap-3 md:grid-cols-2">
          {" "}
          {LEGAL_GUARDS.map((rule) => (
            <div
              key={rule}
              className="flex items-start gap-3 rounded-2xl border border-border bg-background p-4"
            >
              {" "}
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{" "}
              <p className="text-sm text-muted-foreground">{rule}</p>{" "}
            </div>
          ))}{" "}
        </div>{" "}
      </section>{" "}
      <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        {" "}
        <div className="mb-4 flex items-center gap-2">
          {" "}
          <Wrench className="h-5 w-5 text-primary" />{" "}
          <h2 className="font-semibold">Как это будет подключаться</h2>{" "}
        </div>{" "}
        <div className="grid gap-3 md:grid-cols-5">
          {" "}
          {[
            "Выбрать сферу",
            "Создать рабочее место",
            "Добавить устройство",
            "Проверить доступ",
            "Назначить маршрут",
          ].map((step, index) => (
            <div
              key={step}
              className="rounded-2xl border border-border bg-background p-4"
            >
              {" "}
              <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-xs font-bold text-primary">
                {" "}
                {index + 1}{" "}
              </div>{" "}
              <p className="text-sm font-semibold">{step}</p>{" "}
            </div>
          ))}{" "}
        </div>{" "}
        <div className="mt-4 rounded-2xl border border-border bg-muted/20 p-4">
          {" "}
          <div className="flex items-start gap-3">
            {" "}
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />{" "}
            <p className="text-sm text-muted-foreground">
              {" "}
              Для простых USB-сканеров уже подходит режим клавиатуры. Для тихой
              печати чеков, кухни и производства нужен локальный коннектор или
              сетевой принтер с проверенным доступом. Это защитит клиентов от
              сложной техники и даст настройку “проверить и включить”.{" "}
            </p>{" "}
          </div>{" "}
        </div>{" "}
      </section>{" "}
      <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        {" "}
        <div className="mb-4 flex items-center gap-2">
          {" "}
          <ShieldCheck className="h-5 w-5 text-primary" />{" "}
          <h2 className="font-semibold">Кассовые смены</h2>{" "}
        </div>{" "}
        <div className="grid gap-3 md:grid-cols-4">
          {" "}
          {SHIFT_FLOW.map((step, index) => (
            <div
              key={step.title}
              className="rounded-2xl border border-border bg-background p-4"
            >
              {" "}
              <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-xs font-bold text-primary">
                {" "}
                {index + 1}{" "}
              </div>{" "}
              <p className="text-sm font-semibold">{step.title}</p>{" "}
              <p className="mt-2 text-xs text-muted-foreground">
                {step.description}
              </p>{" "}
            </div>
          ))}{" "}
        </div>{" "}
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {" "}
          {[
            ["Деньги", "старт, наличные, карта, онлайн, возвраты, инкассация"],
            ["Заказы", "сайт, касса, самовывоз, доставка, производство"],
            ["Отчёты", "X-отчёт, закрытие, PDF, отправка руководителю"],
          ].map(([title, text]) => (
            <div
              key={title}
              className="rounded-2xl border border-border bg-muted/20 p-4"
            >
              {" "}
              <p className="text-sm font-semibold">{title}</p>{" "}
              <p className="mt-1 text-xs text-muted-foreground">{text}</p>{" "}
            </div>
          ))}{" "}
        </div>{" "}
      </section>{" "}
      <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        {" "}
        <div className="mb-4 flex items-center gap-2">
          {" "}
          <Printer className="h-5 w-5 text-primary" />{" "}
          <h2 className="font-semibold">Матрица поддержки</h2>{" "}
        </div>{" "}
        <div className="grid gap-3 md:grid-cols-2">
          {" "}
          {SUPPORT_MATRIX.map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-border bg-background p-4"
            >
              {" "}
              <div className="mb-2 flex items-start justify-between gap-3">
                {" "}
                <h3 className="text-sm font-semibold">{item.title}</h3>{" "}
                <span className="shrink-0 rounded-xl bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary">
                  {" "}
                  {item.support}{" "}
                </span>{" "}
              </div>{" "}
              <p className="text-xs text-muted-foreground">
                {item.description}
              </p>{" "}
              <p className="mt-3 text-[11px] text-muted-foreground">
                {item.examples}
              </p>{" "}
            </div>
          ))}{" "}
        </div>{" "}
      </section>{" "}
      <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        {" "}
        <div className="mb-4 flex items-center gap-2">
          {" "}
          <Bot className="h-5 w-5 text-primary" />{" "}
          <h2 className="font-semibold">Арай как внутренний менеджер</h2>{" "}
        </div>{" "}
        <div className="grid gap-3 md:grid-cols-3">
          {" "}
          {[
            [
              "Собрать заказ",
              "Найти клиента, подобрать позиции, уточнить количество и доставку.",
            ],
            [
              "Подготовить действие",
              "Создать черновик заказа, счёт, платёжную ссылку или печать.",
            ],
            [
              "Попросить подтверждение",
              "Менеджер подтверждает, после этого действие уходит в систему.",
            ],
          ].map(([title, text]) => (
            <div
              key={title}
              className="rounded-2xl border border-border bg-background p-4"
            >
              {" "}
              <p className="text-sm font-semibold">{title}</p>{" "}
              <p className="mt-2 text-xs text-muted-foreground">{text}</p>{" "}
            </div>
          ))}{" "}
        </div>{" "}
        <div className="mt-4 rounded-2xl border border-border bg-muted/20 p-4">
          {" "}
          <p className="text-sm text-muted-foreground">
            {" "}
            Правило безопасности: Арай может подготовить заказ, счёт, печать и
            отправку клиенту, но финальное действие с деньгами, печатью или
            уведомлением проходит через подтверждение сотрудника и
            журналируется.{" "}
          </p>{" "}
        </div>{" "}
      </section>{" "}
      <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        {" "}
        <div className="mb-4 flex items-center gap-2">
          {" "}
          <Bot className="h-5 w-5 text-primary" />{" "}
          <h2 className="font-semibold">Арай-оператор поддержки</h2>{" "}
        </div>{" "}
        <div className="grid gap-3 md:grid-cols-4">
          {" "}
          {ARAY_OPERATOR_LAYERS.map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-border bg-background p-4"
            >
              {" "}
              <p className="text-sm font-semibold">{item.title}</p>{" "}
              <p className="mt-2 text-xs text-muted-foreground">
                {item.description}
              </p>{" "}
            </div>
          ))}{" "}
        </div>{" "}
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          {" "}
          {ARAY_RISK_LEVELS.map(([title, text]) => (
            <div
              key={title}
              className="rounded-2xl border border-border bg-muted/20 p-4"
            >
              {" "}
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                {title}
              </p>{" "}
              <p className="mt-2 text-xs text-muted-foreground">{text}</p>{" "}
            </div>
          ))}{" "}
        </div>{" "}
      </section>{" "}
      <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        {" "}
        <div className="mb-4 flex items-center gap-2">
          {" "}
          <ShieldCheck className="h-5 w-5 text-primary" />{" "}
          <h2 className="font-semibold">Эскалация проблем</h2>{" "}
        </div>{" "}
        <div className="grid gap-3 md:grid-cols-4">
          {" "}
          {ESCALATION_FLOW.map(([title, text]) => (
            <div
              key={title}
              className="rounded-2xl border border-border bg-background p-4"
            >
              {" "}
              <p className="text-sm font-semibold">{title}</p>{" "}
              <p className="mt-2 text-xs text-muted-foreground">{text}</p>{" "}
            </div>
          ))}{" "}
        </div>{" "}
      </section>{" "}
      <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        {" "}
        <div className="mb-4 flex items-center gap-2">
          {" "}
          <QrCode className="h-5 w-5 text-primary" />{" "}
          <h2 className="font-semibold">Что осталось доделать</h2>{" "}
        </div>{" "}
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {" "}
          {UX_REMAINING.map(([title, text]) => (
            <div
              key={title}
              className="rounded-2xl border border-border bg-background p-4"
            >
              {" "}
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                {title}
              </p>{" "}
              <p className="mt-2 text-sm text-muted-foreground">{text}</p>{" "}
            </div>
          ))}{" "}
        </div>{" "}
      </section>{" "}
    </div>
  );
}
