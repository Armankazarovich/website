export const ARAY_MARKETING_MONTHLY_PRICE_RUB = 150_000;

export const ARAY_CLIENT_REQUEST_TAG = "Клиентская заявка";
export const ARAY_LAUNCH_TASK_TAG = "ARAY_LAUNCH";

export const ARAY_CLIENT_LEAD_TAGS = [
  "ARAY",
  "Yuva Studio",
  "Маркетинг под ключ",
  ARAY_CLIENT_REQUEST_TAG,
  "150000",
];

export const ARAY_PARTNER_LEAD_TAGS = [
  "ARAY",
  "Партнерство",
  "Партнерская заявка",
  "50/50",
];

export function buildArayClientActivityText(partner: string) {
  return [
    "ARAY: клиентская заявка принята.",
    `Партнер: ${partner}.`,
    "Следующий шаг: связаться с клиентом, подтвердить задачу, собрать бриф и подготовить предложение.",
    "Производство запускается только после согласования условий и оплаты.",
  ].join("\n");
}

export function buildArayPartnerActivityText() {
  return [
    "ARAY: заявка на партнерство принята.",
    "Следующий шаг: проверить регион, формат работы, юридический статус и готовность работать по правилам ARAY/Yuva.",
    "После одобрения партнер получает кабинет, материалы, публичный профиль и CRM-поток.",
  ].join("\n");
}

export function buildArayClientComment(input: {
  partner: string;
  city?: string;
  business?: string;
  service?: string;
  message?: string;
}) {
  return [
    "ARAY marketing department request",
    `Партнерская студия: ${input.partner}`,
    input.city ? `Город / регион: ${input.city}` : null,
    input.business ? `Сфера бизнеса: ${input.business}` : null,
    input.service ? `Интерес: ${input.service}` : null,
    input.message ? `Задача: ${input.message}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildArayPartnerComment(input: {
  city?: string;
  channels?: string;
  message?: string;
}) {
  return [
    "ARAY partner application",
    input.city ? `Город / регион: ${input.city}` : null,
    input.channels ? `Каналы и аудитория: ${input.channels}` : null,
    input.message ? `Комментарий: ${input.message}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

function readCommentValue(comment: string | null | undefined, label: string): string {
  if (!comment) return "";
  const line = comment
    .split("\n")
    .map((item) => item.trim())
    .find((item) => item.toLowerCase().startsWith(`${label.toLowerCase()}:`));

  return line ? line.slice(label.length + 1).trim() : "";
}

export function buildArayLeadBriefDraft(input: {
  name: string;
  phone?: string | null;
  company?: string | null;
  comment?: string | null;
  stage?: string | null;
}) {
  const partner = readCommentValue(input.comment, "Партнерская студия") || "Yuva Studio";
  const city = readCommentValue(input.comment, "Город / регион");
  const business = readCommentValue(input.comment, "Сфера бизнеса");
  const service = readCommentValue(input.comment, "Интерес");
  const task = readCommentValue(input.comment, "Задача");

  const missing = [
    !city ? "город и регион" : null,
    !business ? "сфера бизнеса" : null,
    !task ? "цель, проблема или желаемый результат" : null,
    "логотип, фото, старый сайт или материалы",
    "кто принимает решение и когда нужен запуск",
  ].filter(Boolean) as string[];

  return {
    partner,
    clientName: input.name,
    phone: input.phone || "",
    company: input.company || "",
    city,
    business,
    service: service || "Маркетинг под ключ",
    task,
    stage: input.stage || "NEW",
    missing,
    nextSteps: [
      "Связаться с клиентом и подтвердить задачу.",
      "Дособрать недостающие поля брифа.",
      "Подготовить короткое предложение и сумму.",
      "После подтверждения открыть ARAY Builder из этого заказа.",
    ],
  };
}

export function buildArayLaunchActivityText(draft: ReturnType<typeof buildArayLeadBriefDraft>) {
  return [
    "ARAY: запуск по CRM-заявке подготовлен.",
    `Клиент: ${draft.company || draft.clientName}.`,
    `Партнер: ${draft.partner}.`,
    `Пакет: ${draft.service}.`,
    draft.city ? `Регион: ${draft.city}.` : "Регион нужно уточнить.",
    draft.task ? `Задача: ${draft.task}.` : "Задачу нужно уточнить перед финальным предложением.",
    `Недостающие пункты брифа: ${draft.missing.length}.`,
    "Созданы первые задачи: бриф, структура сайта из блоков, предложение/счет и производственный запуск.",
  ].join("\n");
}

export function buildArayLaunchTaskSpecs(draft: ReturnType<typeof buildArayLeadBriefDraft>) {
  const client = draft.company || draft.clientName;
  const baseContext = [
    `Клиент: ${client}`,
    `Контакт: ${draft.clientName}${draft.phone ? `, ${draft.phone}` : ""}`,
    `Партнер: ${draft.partner}`,
    `Регион: ${draft.city || "уточнить"}`,
    `Сфера: ${draft.business || "уточнить"}`,
    `Пакет: ${draft.service}`,
    draft.task ? `Задача: ${draft.task}` : "Задача: уточнить первым касанием",
    draft.missing.length ? `Доспросить: ${draft.missing.join("; ")}` : "Бриф заполнен достаточно для первого запуска",
  ].join("\n");

  return [
    {
      id: "brief-confirmation",
      title: `ARAY: подтвердить бриф — ${client}`,
      description: [
        baseContext,
        "",
        "Цель: подтвердить задачу, сроки, материалы, лицо принятия решения и готовность к предложению.",
      ].join("\n"),
      status: "TODO",
      priority: "HIGH",
    },
    {
      id: "site-block-plan",
      title: `ARAY: собрать структуру сайта из блоков — ${client}`,
      description: [
        baseContext,
        "",
        "Цель: выбрать эталон, собрать первый набор блоков: главный экран, услуга/пакет, путь заявки, форма, доверие, футер ARAY.",
      ].join("\n"),
      status: "TODO",
      priority: "HIGH",
    },
    {
      id: "offer-and-invoice",
      title: `ARAY: подготовить предложение и счет — ${client}`,
      description: [
        baseContext,
        "",
        "Цель: подготовить короткое предложение на 150 000 ₽ и безопасный сценарий счета после подтверждения условий.",
      ].join("\n"),
      status: "BACKLOG",
      priority: "MEDIUM",
    },
    {
      id: "production-handoff",
      title: `ARAY: запустить производство — ${client}`,
      description: [
        baseContext,
        "",
        "Цель: после оплаты открыть задачи для сайта, PWA, SEO, рекламы, аналитики и отчета клиенту.",
      ].join("\n"),
      status: "BACKLOG",
      priority: "MEDIUM",
    },
  ] as const;
}
