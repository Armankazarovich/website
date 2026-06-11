export type ArayPilotPartnerProject = {
  id: string;
  title: string;
  brand: string;
  role: string;
  status: "attached" | "production" | "ready";
  monthlyClientPaymentRub: number;
  monthlyArayPaymentRub: number;
};

export type ArayPartnerPaymentAction = {
  title: string;
  text: string;
  href: string;
  status: "ready" | "needs_confirmation" | "future";
};

export type ArayPartnerTeamMember = {
  name: string;
  role: string;
  access: string;
  note: string;
};

export type ArayPartnerStartStep = {
  title: string;
  text: string;
  href: string;
  action: string;
};

export const ARAY_PILOT_PARTNER = {
  id: "partner-yuva-studio-pilot",
  slug: "yuva-studio",
  name: "Yuva Studio",
  legalProfile: "ИП Варданян Араик Юрьевич",
  website: "https://yuva-studia.ru/",
  region: "Россия",
  city: "пилотный регион",
  publicRole: "партнерская студия ARAY Production",
  publicHeadline: "B2B-студия маркетинга под ключ для малого и среднего бизнеса",
  publicStory:
    "Yuva Studio работает как партнерская студия ARAY Production: принимает клиентов, собирает бриф, ведет коммуникацию и запускает производство через команду ARAY/Yuva.",
  status: "активный пилот",
  paymentProfileId: "ip-vardanyan-araik-yurievich-ru",
  bankVisibility: "реквизиты связаны с закрытым платежным профилем",
  rule: "Для пилота партнерский бренд — Yuva Studio, а юридический профиль и реквизиты оформлены на ИП Варданян Араик Юрьевич. Для новых партнеров название студии, юрлицо и реквизиты будут отдельными настройками.",
};

export const ARAY_PARTNER_PUBLIC_SERVICES = [
  "сайт и PWA-приложение",
  "SEO и индексация",
  "реклама и заявки",
  "PR, брендинг и упаковка",
  "автоматизация бизнеса",
  "внедрение ИИ в процессы",
];

export const ARAY_PARTNER_PUBLIC_STEPS = [
  "Партнер знакомится с бизнесом и собирает заявку.",
  "Клиент заполняет бриф и передает материалы.",
  "Партнер подтверждает предложение с клиентом.",
  "После подтверждения партнер выставляет счет клиенту от своего ИП или ООО.",
  "После оплаты создается производственный заказ в ARAY/Yuva.",
  "Команда запускает производство, сайт, рекламу и сопровождение.",
];

export const ARAY_PARTNER_FIRST_ENTRY: ArayPartnerStartStep[] = [
  {
    title: "Анкета партнера",
    text: "Студия, блогер, агент или менеджер оставляет заявку и рассказывает регион, опыт, аудиторию и юрстатус.",
    href: "/aray/partners/apply",
    action: "Заполнить анкету",
  },
  {
    title: "Проверка в ARAY CRM",
    text: "ARAY/Yuva смотрит регион, реквизиты, роль и готовность работать по правилам качества.",
    href: "/admin/aray/partners",
    action: "Открыть заявки",
  },
  {
    title: "Кабинет студии",
    text: "После одобрения партнер получает страницу, команду, материалы, бренд-комплект и рабочий кабинет.",
    href: "/aray/partners/yuva-studio",
    action: "Страница Yuva",
  },
  {
    title: "Клиенты и заказы",
    text: "Клиент оставляет заявку, партнер ведет продажу, подтверждение, счет и оплату через CRM.",
    href: "/admin/aray/orders",
    action: "Заказы",
  },
  {
    title: "Запуск сайта",
    text: "Из заказа открывается ARAY Launch: QUIZ, выбор эталона, дубль, PWA, SEO и задачи производства.",
    href: "/admin/aray/builder",
    action: "Запуск",
  },
];

export const ARAY_PARTNER_LAUNCH_SURFACES: ArayPartnerStartStep[] = [
  {
    title: "Из CRM",
    text: "Когда заявка уже пришла, партнер нажимает запуск прямо в карточке клиента.",
    href: "/admin/crm",
    action: "CRM",
  },
  {
    title: "Из заказов",
    text: "После подтверждения и оплаты заказ ведет партнера к QUIZ, дублю эталона и производству.",
    href: "/admin/aray/orders",
    action: "Заказы",
  },
  {
    title: "Через ARAY",
    text: "Партнер пишет или говорит задачу, а ARAY открывает нужный раздел и показывает следующий шаг.",
    href: "/admin/aray/builder",
    action: "ARAY Launch",
  },
  {
    title: "Через аналитику",
    text: "После запуска ARAY собирает заявки, рекламу, SEO, отчеты и подсказывает, что улучшать дальше.",
    href: "/admin/analytics",
    action: "Аналитика",
  },
];

export const ARAY_PILOT_PARTNER_TEAM: ArayPartnerTeamMember[] = [
  {
    name: "Yuva Studio",
    role: "аккаунт партнерской студии",
    access: "общий рабочий контур",
    note: "Студия владеет клиентами, проектами, публичной страницей и партнерским кабинетом.",
  },
  {
    name: "Араик Варданян",
    role: "администратор / юридический профиль",
    access: "реквизиты, счета, финансы, договоры",
    note: "Может управлять платежным профилем, счетами и подключением новых сотрудников студии.",
  },
  {
    name: "Арман",
    role: "партнерский менеджер Yuva Studio / владелец платформы",
    access: "клиенты, брифы, запуск сайтов, ARAY Live, полный контроль",
    note: "В пилоте может работать как менеджер студии Yuva и одновременно видеть весь ARAY-контур: партнеров, качество, CRM, бренд-комплект и развитие платформы.",
  },
  {
    name: "Вика",
    role: "контент-менеджер",
    access: "клиенты, брифы, материалы, фото, задачи",
    note: "Может вести контент, карточки, материалы клиентов и подготовку к производству без доступа к банковским данным.",
  },
];

export const ARAY_PARTNER_STUDIO_ACCESS_RULES = [
  "Партнером является студия или компания, а не один человек.",
  "Люди внутри студии получают роли: владелец, админ, менеджер, контент, бухгалтер.",
  "Клиенты и проекты прикрепляются к студии, а не к случайному сотруднику.",
  "Финансовые поля и реквизиты видят только владелец, админ и бухгалтер.",
  "Контент-менеджер может работать с брифами, фото, текстами и задачами без доступа к счетам.",
  "ARAY Production видит всю сеть, одобряет партнеров и контролирует производство.",
];

export const ARAY_ADMIN_EXTENSION_LAYERS = [
  {
    title: "Не строим заново",
    text: "Используем существующие CRM, заказы, задачи, уведомления, платежи, сотрудников и роли.",
  },
  {
    title: "Не смешиваем хаотично",
    text: "ARAY живет отдельным контуром внутри админки: партнеры, маркетинговые заявки, платежные профили и бренд-комплект.",
  },
  {
    title: "Связываем слоями",
    text: "Клиентская заявка превращается в лид, бриф, заказ производства, счета, задачи и уведомления.",
  },
  {
    title: "Защищаем роли",
    text: "Клиент видит услугу, партнер видит свою экономику, ARAY видит всю сеть и контроль качества.",
  },
];

export const ARAY_PILOT_PARTNER_PROJECTS: ArayPilotPartnerProject[] = [
  {
    id: "zeder",
    title: "Зедер",
    brand: "Zeder",
    role: "первый клиентский проект для проверки менеджерского потока",
    status: "attached",
    monthlyClientPaymentRub: 150_000,
    monthlyArayPaymentRub: 75_000,
  },
  {
    id: "pilorus",
    title: "Пилорус",
    brand: "PiloRus",
    role: "эталон магазина, админки, заказов и производства",
    status: "attached",
    monthlyClientPaymentRub: 150_000,
    monthlyArayPaymentRub: 75_000,
  },
];

export const ARAY_PARTNER_PAYMENT_ACTIONS: ArayPartnerPaymentAction[] = [
  {
    title: "Добавить клиента",
    text: "Партнер создает нового клиента, собирает бриф и выбирает услугу маркетинга под ключ.",
    href: "/admin/aray/briefs",
    status: "ready",
  },
  {
    title: "Страница партнера",
    text: "Публичная витрина партнера для рекламы, истории, услуг и привлечения клиентов.",
    href: "/aray/partners/yuva-studio",
    status: "ready",
  },
  {
    title: "Анкета партнера",
    text: "Новый партнер или менеджер оставляет заявку, после проверки получает роль, кабинет и доступы.",
    href: "/aray/partners/apply",
    status: "ready",
  },
  {
    title: "Счет клиенту",
    text: "Партнер выставляет клиенту счет на 150 000 ₽ только после подтверждения предложения.",
    href: "/admin/aray/orders",
    status: "ready",
  },
  {
    title: "Клиент оплатил",
    text: "Партнер подтверждает поступление денег, после этого система показывает платеж ARAY/Yuva.",
    href: "/admin/aray/orders",
    status: "needs_confirmation",
  },
  {
    title: "Счет ARAY/Yuva",
    text: "Система готовит счет партнеру на 75 000 ₽ по активному платежному профилю.",
    href: "/admin/aray/requisites",
    status: "ready",
  },
  {
    title: "ARAY оплачен",
    text: "После оплаты производственная часть переводится в работу.",
    href: "/admin/aray/orders",
    status: "needs_confirmation",
  },
  {
    title: "Запуск производства",
    text: "Создаются ТЗ, задачи, файлы, сроки и контроль выполнения.",
    href: "/admin/aray/briefs",
    status: "ready",
  },
  {
    title: "Запуск сайта из заказа",
    text: "ARAY открывает QUIZ, берет эталон, делает дубль и связывает сайт, PWA, SEO, CRM и задачи.",
    href: "/admin/aray/builder",
    status: "ready",
  },
  {
    title: "Документы",
    text: "Счет, акт, договор и назначение платежа будут собираться из проверенных профилей.",
    href: "/aray/brand-assets/documents/aray-payments-requisites-ru.html",
    status: "future",
  },
];

export const ARAY_PARTNER_PAYMENT_ACTION_STATUS_LABELS = {
  ready: "готово",
  needs_confirmation: "кнопка подтверждения",
  future: "следующий слой",
} as const;

export const ARAY_PARTNER_PAYMENT_ACTION_STATUS_CLASSES = {
  ready: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  needs_confirmation: "border-primary/30 bg-primary/10 text-primary",
  future: "border-border bg-muted/40 text-muted-foreground",
} as const;
