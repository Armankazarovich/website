export type ArayBuilderSurface =
  | "public-site"
  | "partner-page"
  | "crm"
  | "pwa"
  | "brand-kit";

export type ArayBuilderRole =
  | "client"
  | "partner"
  | "manager"
  | "production"
  | "admin";

export type ArayBuilderBlockStatus = "certified" | "draft" | "planned";

export type ArayBuilderEditableField =
  | "title"
  | "eyebrow"
  | "text"
  | "buttons"
  | "media"
  | "colors"
  | "cards"
  | "form"
  | "seo"
  | "crm-link";

export type ArayBuilderBlock = {
  id: string;
  title: string;
  purpose: string;
  surfaces: ArayBuilderSurface[];
  roles: ArayBuilderRole[];
  editableFields: ArayBuilderEditableField[];
  qualityChecks: string[];
  systemLinks: string[];
  status: ArayBuilderBlockStatus;
};

export type ArayBuilderWorkflowStep = {
  id: string;
  title: string;
  text: string;
};

export type ArayEditableBusinessArea = {
  id: string;
  title: string;
  text: string;
  examples: string[];
};

export type ArayLaunchBlockPlan = {
  benchmark: string;
  confidence: "ready" | "needs-brief";
  blocks: Array<{
    id: string;
    title: string;
    purpose: string;
    reason: string;
    status: ArayBuilderBlockStatus;
    editableFields: ArayBuilderEditableField[];
    draft: {
      title: string;
      text: string;
      action: string;
    };
  }>;
  ownerInputs: string[];
  readyOutputs: string[];
};

export const ARAY_BUILDER_VERSION = "2026-06-03.partner-crm-launch-v1";

export const ARAY_BUILDER_SURFACES: Array<{
  id: ArayBuilderSurface;
  title: string;
  text: string;
}> = [
  {
    id: "public-site",
    title: "Публичный сайт",
    text: "Клиент видит предложение, примеры, форму заявки, партнера и понятный следующий шаг.",
  },
  {
    id: "partner-page",
    title: "Страница партнера",
    text: "Партнер показывает свою студию, регион, услуги ARAY/Yuva и принимает заявки.",
  },
  {
    id: "crm",
    title: "CRM",
    text: "Менеджер ведет заявку, бриф, счет, производство, документы, оплату и отчет.",
  },
  {
    id: "pwa",
    title: "ARAY App",
    text: "Клиент и партнер получают быстрый вход, помощника, статусы и нужные действия.",
  },
  {
    id: "brand-kit",
    title: "Бренд-комплект",
    text: "Логотипы, цвета, КП, баннеры, правила рекламы и материалы партнеров.",
  },
];

export const ARAY_BUILDER_BLOCKS: ArayBuilderBlock[] = [
  {
    id: "hero-offer",
    title: "Главный экран",
    purpose: "Сразу объясняет, что ARAY дает бизнесу: сайт, PWA, CRM и маркетинг под ключ.",
    surfaces: ["public-site", "partner-page"],
    roles: ["client", "partner"],
    editableFields: ["eyebrow", "title", "text", "buttons", "media", "colors", "seo"],
    qualityChecks: [
      "одна главная мысль",
      "две понятные кнопки",
      "заголовок не ломает телефон",
      "следующий шаг виден без чтения всей страницы",
    ],
    systemLinks: ["форма заявки", "выбор партнера", "CRM лид"],
    status: "certified",
  },
  {
    id: "example-filter-grid",
    title: "Примеры и фильтры",
    purpose: "Показывает не просто лендинг, а систему: сайты, PWA, CRM, маркетинг и партнеров.",
    surfaces: ["public-site", "brand-kit"],
    roles: ["client", "partner", "manager"],
    editableFields: ["title", "text", "buttons", "cards", "seo"],
    qualityChecks: [
      "карточки одинаковой высоты",
      "фильтры не пугают",
      "пустое место не выглядит ошибкой",
      "каждая карточка ведет в действие",
    ],
    systemLinks: ["шаблоны сайтов", "партнерские материалы", "ARAY CRM"],
    status: "draft",
  },
  {
    id: "product-stack",
    title: "Что входит",
    purpose: "Коротко объясняет состав продукта: сайт, PWA, CRM, SEO, реклама, бренд, автоматизация и ИИ.",
    surfaces: ["public-site", "partner-page", "brand-kit"],
    roles: ["client", "partner"],
    editableFields: ["title", "text", "cards", "colors"],
    qualityChecks: [
      "не больше одной мысли в карточке",
      "без технических терминов",
      "каждый пункт понятен владельцу бизнеса",
    ],
    systemLinks: ["пакет услуг", "бриф клиента", "коммерческое предложение"],
    status: "draft",
  },
  {
    id: "crm-process",
    title: "Путь заявки",
    purpose: "Показывает путь клиента от заявки до оплаты, производства и отчета.",
    surfaces: ["public-site", "crm", "pwa"],
    roles: ["client", "partner", "manager", "production"],
    editableFields: ["title", "text", "cards", "crm-link"],
    qualityChecks: [
      "клиент не видит экономику партнера",
      "партнер видит следующий шаг",
      "производство получает задачу только после подтверждения",
    ],
    systemLinks: ["лид", "бриф", "счет", "заказ", "отчет"],
    status: "certified",
  },
  {
    id: "lead-form",
    title: "Заявка и бриф",
    purpose: "Собирает данные клиента или партнера и отправляет их в правильный поток CRM.",
    surfaces: ["public-site", "partner-page", "crm", "pwa"],
    roles: ["client", "partner", "manager"],
    editableFields: ["title", "text", "form", "buttons", "crm-link"],
    qualityChecks: [
      "форма короткая",
      "телефон обязателен",
      "тип заявки понятен",
      "заявка не теряется в CRM",
    ],
    systemLinks: ["клиентский лид", "партнерская анкета", "уведомление менеджеру"],
    status: "certified",
  },
  {
    id: "partner-profile",
    title: "Профиль партнера",
    purpose: "Дает партнеру красивую страницу, регион, статус, материалы, заявки и рабочий кабинет.",
    surfaces: ["partner-page", "crm", "brand-kit"],
    roles: ["partner", "manager", "admin"],
    editableFields: ["title", "text", "media", "buttons", "cards", "crm-link"],
    qualityChecks: [
      "реквизиты не показываются публично",
      "клиент видит только свое предложение",
      "партнер видит свою экономику внутри кабинета",
    ],
    systemLinks: ["партнер", "регион", "клиенты партнера", "материалы"],
    status: "draft",
  },
  {
    id: "price-offer",
    title: "Цена и предложение",
    purpose: "Показывает клиенту понятную сумму и состав услуги без внутренней экономики.",
    surfaces: ["public-site", "partner-page", "crm"],
    roles: ["client", "partner", "manager", "admin"],
    editableFields: ["title", "text", "cards", "buttons", "crm-link"],
    qualityChecks: [
      "клиентская цена отделена от партнерской доли",
      "оплата только после подтверждения",
      "условия короткие и проверяемые",
    ],
    systemLinks: ["счет клиенту", "платеж партнеру", "реквизиты ARAY/Yuva"],
    status: "draft",
  },
  {
    id: "footer-tunnel",
    title: "Футер ARAY",
    purpose: "Возвращает человека из любого сайта в ARAY: заказать такой же сайт или стать партнером.",
    surfaces: ["public-site", "partner-page", "pwa"],
    roles: ["client", "partner"],
    editableFields: ["text", "buttons", "seo", "crm-link"],
    qualityChecks: [
      "есть ссылка на ARAY",
      "есть путь 'хочу такой сайт'",
      "есть путь 'стать партнером'",
      "ссылки ведут в правильные формы",
    ],
    systemLinks: ["туннель сайтов", "клиентская заявка", "партнерская анкета"],
    status: "certified",
  },
];

export const ARAY_BUILDER_WORKFLOW: ArayBuilderWorkflowStep[] = [
  {
    id: "crm-order",
    title: "Получить заказ в CRM",
    text: "Партнер продает услугу клиенту и ведет карточку заказа внутри ARAY CRM.",
  },
  {
    id: "run-quiz",
    title: "Пройти QUIZ ARAY",
    text: "ARAY задает вопросы по заказу: бизнес, цель, шаблон, бренд, материалы, регион и нужный результат.",
  },
  {
    id: "build-site",
    title: "Собрать сайт",
    text: "Система берет проверенный сценарий ARAY CMS и меняет его под клиента.",
  },
  {
    id: "connect-production",
    title: "Связать с производством",
    text: "Формы, бриф, счет, PWA, SEO, бренд и задачи создаются в правильном производственном потоке.",
  },
  {
    id: "client-approval",
    title: "Утвердить с клиентом",
    text: "Партнер показывает понятный результат, согласует оплату и не раскрывает внутреннюю экономику.",
  },
  {
    id: "publish",
    title: "Запустить и отчитаться",
    text: "Команда выпускает сайт на домен, включает PWA/SEO/CRM и возвращает партнеру отчет для клиента.",
  },
];

export const ARAY_EDITABLE_BUSINESS_AREAS: ArayEditableBusinessArea[] = [
  {
    id: "site-content",
    title: "Сайт и страницы",
    text: "Все видимые части сайта должны быть редактируемыми без кода.",
    examples: ["заголовки", "тексты", "кнопки", "фото", "блоки", "футер ARAY"],
  },
  {
    id: "crm-flow",
    title: "CRM и заявки",
    text: "Заявка должна идти по понятному маршруту, а статусы и ответственные должны настраиваться.",
    examples: ["лиды", "брифы", "статусы", "ответственные", "следующий шаг", "уведомления"],
  },
  {
    id: "commerce",
    title: "Товары и услуги",
    text: "Для магазинов и агентских услуг нужна единая логика каталога, пакетов и предложений.",
    examples: ["категории", "товары", "услуги", "тарифы", "цены", "пакеты"],
  },
  {
    id: "partner-money",
    title: "Партнеры и оплаты",
    text: "Партнер видит свою работу и экономику, клиент видит только свое предложение.",
    examples: ["партнер", "регион", "реквизиты", "счет клиенту", "платеж ARAY/Yuva", "договор"],
  },
  {
    id: "brand-seo",
    title: "Бренд, SEO и PWA",
    text: "Бренд-комплект, поисковые данные и приложение должны меняться из админки.",
    examples: ["логотип", "цвета", "SEO", "иконки PWA", "обложки", "документы"],
  },
  {
    id: "aray-actions",
    title: "Действия ARAY",
    text: "Помощник должен не только отвечать, а помогать выполнить работу внутри системы.",
    examples: ["спросить", "сгенерировать", "найти", "заполнить", "открыть раздел", "закрыть задачу"],
  },
];

const ARAY_FIRST_SITE_BLOCK_IDS = [
  "hero-offer",
  "product-stack",
  "crm-process",
  "lead-form",
  "price-offer",
  "footer-tunnel",
] as const;

const ARAY_BLOCK_PLAN_REASONS: Record<string, string> = {
  "hero-offer": "сразу объясняет клиенту предложение и следующий шаг",
  "product-stack": "показывает, что входит в запуск: сайт, PWA, CRM, SEO, реклама и отчет",
  "crm-process": "связывает сайт с заявкой, брифом, счетом и производством",
  "lead-form": "собирает контакт и задачу без тяжелой анкеты",
  "price-offer": "фиксирует понятную цену и состав пакета",
  "footer-tunnel": "оставляет ARAY-туннель для новых клиентов и партнеров",
};

function pickLaunchBenchmark(input: {
  business?: string;
  service?: string;
}) {
  const text = `${input.business || ""} ${input.service || ""}`.toLowerCase();
  if (/магаз|каталог|товар|строй|материал|склад|достав/.test(text)) return "ARAY интернет-магазин";
  if (/услуг|сервис|маркет|студи|агент|консалт|ремонт/.test(text)) return "ARAY Services";
  if (/ресторан|еда|кафе|доставк/.test(text)) return "ARAY Restaurant";
  if (/красот|салон|барбер|космет/.test(text)) return "ARAY Beauty";
  return "ARAY Universal";
}

function buildBlockDraft(blockId: string, input: {
  clientName?: string;
  company?: string;
  business?: string;
  service?: string;
  task?: string;
  city?: string;
}) {
  const client = input.company || input.clientName || "ваш бизнес";
  const business = input.business || "бизнес";
  const service = input.service || "сайт, PWA, CRM и маркетинг";
  const city = input.city || "вашем регионе";
  const task = input.task || "получать заявки и видеть понятный результат";

  const drafts: Record<string, { title: string; text: string; action: string }> = {
    "hero-offer": {
      title: `${client}: ${service} под ключ`,
      text: `Собираем для ${business} понятный запуск: сайт, заявки, CRM, PWA, SEO и отчетность, чтобы команда видела путь от обращения до результата.`,
      action: "Оставить заявку",
    },
    "product-stack": {
      title: "Что входит в запуск",
      text: `Стартуем с задачи клиента: ${task}. Затем готовим структуру сайта, форму заявки, CRM-маршрут, базовое SEO, PWA и первые материалы для продвижения.`,
      action: "Посмотреть состав",
    },
    "crm-process": {
      title: "Путь заявки без потерь",
      text: `Заявка попадает в CRM, превращается в бриф, предложение, счет, оплату, производство и отчет. Партнер видит следующий шаг, а клиент получает понятный процесс.`,
      action: "Открыть процесс",
    },
    "lead-form": {
      title: "Короткий бриф для старта",
      text: `Клиент оставляет контакты, город, сферу, задачу и материалы. Арай подсказывает, что доспросить, и готовит рабочий запуск по заявке.`,
      action: "Заполнить бриф",
    },
    "price-offer": {
      title: "Пакет с понятной ценой",
      text: `Запуск ведем как услугу под ключ: сайт, PWA, CRM, маркетинг и отчетность. Условия подтверждаются до счета и старта производства.`,
      action: "Получить предложение",
    },
    "footer-tunnel": {
      title: "Хотите такой же запуск в ${city}?",
      text: `ARAY помогает партнерам и бизнесу запускать сайты из проверенных блоков, подключать заявки к CRM и вести работу по шагам.`,
      action: "Запустить с ARAY",
    },
  };

  return drafts[blockId] || {
    title: client,
    text: `Блок помогает показать ${business}, объяснить ценность и связать действие клиента с CRM.`,
    action: "Продолжить",
  };
}

export function getArayLaunchBlockPlan(input: {
  clientName?: string;
  company?: string;
  business?: string;
  service?: string;
  city?: string;
  task?: string;
  missing?: string[];
}): ArayLaunchBlockPlan {
  const missing = input.missing || [];
  const blocks = ARAY_FIRST_SITE_BLOCK_IDS
    .map((id) => ARAY_BUILDER_BLOCKS.find((block) => block.id === id))
    .filter(Boolean)
    .map((block) => ({
      id: block!.id,
      title: block!.title,
      purpose: block!.purpose,
      reason: ARAY_BLOCK_PLAN_REASONS[block!.id] || "нужен для первого запуска",
      status: block!.status,
      editableFields: block!.editableFields,
      draft: buildBlockDraft(block!.id, input),
    }));

  return {
    benchmark: pickLaunchBenchmark(input),
    confidence: missing.length > 2 ? "needs-brief" : "ready",
    blocks,
    ownerInputs: [
      ...missing,
      !input.city ? "город и регион запуска" : null,
      "логотип, фото, старый сайт или материалы клиента",
      "тон бренда: строгий, дружелюбный, премиальный или простой",
    ].filter(Boolean) as string[],
    readyOutputs: [
      "структура первого сайта",
      "главный экран",
      "пакет услуг",
      "путь заявки",
      "форма лида",
      "связь с CRM",
      "задачи производства",
    ],
  };
}

export function getArayBuilderReadiness() {
  const certified = ARAY_BUILDER_BLOCKS.filter((block) => block.status === "certified").length;
  const draft = ARAY_BUILDER_BLOCKS.filter((block) => block.status === "draft").length;
  const planned = ARAY_BUILDER_BLOCKS.filter((block) => block.status === "planned").length;

  return {
    version: ARAY_BUILDER_VERSION,
    totalBlocks: ARAY_BUILDER_BLOCKS.length,
    certified,
    draft,
    planned,
    editableSurfaces: ARAY_BUILDER_SURFACES.length,
  };
}
