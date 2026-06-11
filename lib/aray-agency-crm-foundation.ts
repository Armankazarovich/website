import {
  BarChart3,
  FileText,
  Globe,
  Handshake,
  Landmark,
  LayoutTemplate,
  Package,
  Palette,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type ArayAgencyRoute = {
  href: string;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  status: string;
};

export type ArayAdminWorkflow = {
  title: string;
  subtitle: string;
  href: string;
  step: string;
  result: string;
  actionLabel: string;
  icon: LucideIcon;
};

export type ArayB2bEntryFlow = {
  title: string;
  subtitle: string;
  href: string;
  icon: LucideIcon;
  steps: string[];
  guardrail: string;
};

export const ARAY_AGENCY_ROUTES: ArayAgencyRoute[] = [
  {
    href: "/admin/aray/builder",
    title: "Запуск сайтов",
    subtitle: "эталоны, QUIZ, дубль, PWA, SEO и связи с CRM",
    icon: LayoutTemplate,
    status: "новый фундамент",
  },
  {
    href: "/admin/aray/partners",
    title: "Партнеры",
    subtitle: "Регионы, проверка, договоры и 50/50 модель",
    icon: Users,
    status: "каркас",
  },
  {
    href: "/admin/aray/orders",
    title: "Маркетинговые заказы",
    subtitle: "предложение, счет, оплата и производство",
    icon: Package,
    status: "каркас",
  },
  {
    href: "/admin/aray/requisites",
    title: "Реквизиты и платежи",
    subtitle: "75 000 ₽, получатели, счета, банки и юридическая проверка",
    icon: Landmark,
    status: "каркас",
  },
  {
    href: "/admin/aray/briefs",
    title: "Брифы клиентов",
    subtitle: "Данные бизнеса, материалы и черновик ТЗ",
    icon: FileText,
    status: "каркас",
  },
  {
    href: "/admin/aray/arc",
    title: "ARC баланс",
    subtitle: "Внутренний учет, начисления и отключенный вывод",
    icon: Wallet,
    status: "будущее",
  },
  {
    href: "/admin/aray/brand-kit",
    title: "Бренд-комплект",
    subtitle: "Логотипы, брендбук, реклама и материалы партнеров",
    icon: Palette,
    status: "каркас",
  },
];

export const ARAY_ADMIN_WORKFLOWS: ArayAdminWorkflow[] = [
  {
    title: "Заявка клиента",
    subtitle: "Клиент оставляет заявку на маркетинг под ключ.",
    href: "/admin/aray/partners",
    step: "1",
    result: "Создаем лид, назначаем ответственного и готовим первый контакт.",
    actionLabel: "Открыть заявки",
    icon: Users,
  },
  {
    title: "Партнер",
    subtitle: "Студия, блогер или фрилансер проходит анкету и проверку.",
    href: "/admin/aray/partners",
    step: "2",
    result: "Проверяем регион, роль, реквизиты и выдаем материалы.",
    actionLabel: "Открыть партнеров",
    icon: Users,
  },
  {
    title: "Бриф и ТЗ",
    subtitle: "После заявки собираем бизнес, цели, материалы и доступы.",
    href: "/admin/aray/briefs",
    step: "3",
    result: "Из данных клиента собираем понятное задание для команды.",
    actionLabel: "Собрать бриф",
    icon: FileText,
  },
  {
    title: "Счета и реквизиты",
    subtitle: "После подтверждения клиент получает счет от партнера.",
    href: "/admin/aray/requisites",
    step: "4",
    result: "Клиент видит свою сумму, партнер видит свой платеж ARAY/Yuva.",
    actionLabel: "Проверить счета",
    icon: Landmark,
  },
  {
    title: "Производство",
    subtitle: "После оплаты запускаем сайт, PWA, SEO, рекламу и задачи.",
    href: "/admin/aray/orders",
    step: "5",
    result: "Команда ведет статусы, сроки, файлы и отчеты для клиента.",
    actionLabel: "Открыть заказы",
    icon: Package,
  },
  {
    title: "Бренд и реклама",
    subtitle: "Партнер берет готовые КП, скрипты, баннеры и правила.",
    href: "/admin/aray/brand-kit",
    step: "6",
    result: "Материалы оформлены едино, красиво и безопасно для рекламы.",
    actionLabel: "Открыть материалы",
    icon: Palette,
  },
];

export const ARAY_ADMIN_NAVIGATION_RULES = [
  "Сначала смысл и следующий шаг, потом детали.",
  "Клиентские заявки, партнерские заявки и внутренние расчеты не смешиваем.",
  "Технические слова прячем в настройки, документы и режим администратора.",
];

export const ARAY_B2B_ENTRY_FLOWS: ArayB2bEntryFlow[] = [
  {
    title: "Хочу такой сайт",
    subtitle: "Клиент приходит с сайта, подписи внизу страницы или рекламы и выбирает партнера.",
    href: "/aray/marketing/apply",
    icon: Globe,
    steps: [
      "заявка",
      "выбор партнера",
      "бриф",
      "подтверждение",
      "счет",
      "производство",
    ],
    guardrail: "Полноценная работа начинается после согласования и оплаты.",
  },
  {
    title: "Стать партнером",
    subtitle: "Студия, блогер или агент получает кабинет, материалы и свой поток клиентов.",
    href: "/aray/partners/apply",
    icon: Handshake,
    steps: [
      "анкета",
      "проверка",
      "кабинет",
      "свой сайт",
      "CRM",
      "заказы",
    ],
    guardrail: "Партнер видит свою экономику, клиент видит только свое предложение.",
  },
];

export type ArayPartnerBrandKitItem = {
  title: string;
  note: string;
  status: "ready" | "draft" | "planned";
  href?: string;
};

export const ARAY_PARTNER_BRAND_KIT_ITEMS = [
  {
    title: "логотип ARAY A Mark",
    note: "SVG, PDF, AI и PNG-основа",
    status: "ready",
    href: "/aray/brand-assets/packages/aray-a-mark-logo-pack.zip",
  },
  {
    title: "логотип Yuva / ARAY",
    note: "полный логотип и знак A",
    status: "ready",
    href: "/aray/brand-assets/packages/yuva-aray-logo-pack.zip",
  },
  {
    title: "брендбук PDF",
    note: "структура брендбука и список макетов",
    status: "draft",
    href: "/aray/brand-assets/downloads/aray-brandbook-mockups-blueprint.txt",
  },
  {
    title: "презентация для клиента",
    note: "слайды про маркетинговый отдел под ключ",
    status: "planned",
  },
  {
    title: "коммерческое предложение",
    note: "брендированный RU/EN черновик КП",
    status: "draft",
    href: "/aray/brand-assets/documents/aray-commercial-offer-ru.html",
  },
  {
    title: "листовка для печати",
    note: "A4/A5 и QR-заявка партнера",
    status: "planned",
  },
  {
    title: "шаблон поста",
    note: "готовый текст и визуальный формат",
    status: "planned",
  },
  {
    title: "шаблон сторис",
    note: "короткая подача для блогеров",
    status: "planned",
  },
  {
    title: "баннеры для сайта",
    note: "desktop/mobile рекламные форматы",
    status: "planned",
  },
  {
    title: "партнерский бейдж",
    note: "карточка представителя ARAY",
    status: "planned",
  },
  {
    title: "правила рекламы",
    note: "брендированный EN/RU документ",
    status: "ready",
    href: "/aray/brand-assets/documents/aray-partner-ad-rules-en.html",
  },
  {
    title: "тексты для блогеров",
    note: "скрипты и формулировки готовятся",
    status: "draft",
  },
  {
    title: "инструкция партнера",
    note: "процесс продаж и роль партнера",
    status: "ready",
    href: "/aray/brand-assets/documents/aray-partner-guide-ru.html",
  },
  {
    title: "скрипт продаж",
    note: "разговор партнера с клиентом",
    status: "ready",
    href: "/aray/brand-assets/documents/aray-partner-sales-script-ru.html",
  },
  {
    title: "бриф клиента",
    note: "данные для ТЗ и производства",
    status: "ready",
    href: "/aray/brand-assets/documents/aray-client-brief-ru.html",
  },
  {
    title: "платежи и реквизиты",
    note: "безопасная схема оплат и список данных",
    status: "ready",
    href: "/aray/brand-assets/documents/aray-payments-requisites-ru.html",
  },
] satisfies ArayPartnerBrandKitItem[];

export const ARAY_AGENCY_STATUSES = [
  "новая заявка",
  "связаться с клиентом",
  "бриф и материалы",
  "предложение готово",
  "клиент подтвердил",
  "счет выставлен",
  "клиент оплатил партнеру",
  "партнер оплачивает ARAY/Yuva",
  "производство запущено",
  "в производстве",
  "проверка решения",
  "отправлено клиенту",
  "утверждено",
  "сопровождение",
];

export const ARAY_PARTNER_STATUSES = [
  "заявка",
  "на проверке",
  "ожидает документы",
  "обучение",
  "активен",
  "ограничен",
  "заморожен",
  "отключен",
];

export const ARAY_BRIEF_FIELDS = [
  "сфера бизнеса",
  "город и регион",
  "цели на месяц",
  "сайт, соцсети и материалы",
  "конкуренты",
  "реклама",
  "SEO",
  "бренд и дизайн",
  "автоматизация",
  "ИИ в бизнесе",
  "файлы и доступы",
];

export const ARAY_ARC_RULES = [
  "150 000 ₽ = 3 000 ARC при внутреннем курсе 1 ARC = 50 ₽",
  "75 000 ₽ = 1 500 ARC при внутреннем курсе 1 ARC = 50 ₽",
  "денежные расчеты идут по счетам и договорам",
  "ARC начисляется только после подтвержденной оплаты или ручного начисления с причиной",
  "вывод и выкуп ARC на первом этапе недоступны",
];

export const ARAY_AGENCY_NEXT_STEPS = [
  {
    title: "Сначала подтверждение",
    text: "Партнер связывается с клиентом, собирает бриф и подтверждает предложение.",
    icon: BarChart3,
  },
  {
    title: "Потом оплата",
    text: "После подтверждения клиент оплачивает партнеру, партнер оплачивает ARAY/Yuva.",
    icon: Package,
  },
  {
    title: "Потом производство",
    text: "После оплаты создаются ТЗ, задачи, файлы, сроки и отчеты.",
    icon: Wallet,
  },
];
