export type ArayBusinessEventKind =
  | "story.question"
  | "story.offer"
  | "story.review"
  | "story.comment"
  | "order.created"
  | "lead.created"
  | "cart.abandoned"
  | "delivery.requested"
  | "payment.pending"
  | "document.requested"
  | "task.overdue"
  | "stock.low"
  | "review.created"
  | "consultation.requested";

export type ArayBusinessEventSource =
  | "store"
  | "stories"
  | "orders"
  | "crm"
  | "documents"
  | "logistics"
  | "admin"
  | "system";

export type ArayBusinessNiche =
  | "lumber"
  | "services"
  | "freelance"
  | "logistics"
  | "ritual"
  | "beauty"
  | "medical"
  | "repair"
  | "b2b"
  | "universal";

export type ArayBusinessEventPriority = "low" | "medium" | "high" | "urgent";

export type ArayBusinessEventInput = {
  kind: ArayBusinessEventKind;
  source: ArayBusinessEventSource;
  title: string;
  description?: string | null;
  entity?: {
    type: string;
    id?: string | null;
    label?: string | null;
    href?: string | null;
  };
  customer?: {
    name?: string | null;
    phone?: string | null;
    email?: string | null;
  };
  valueRub?: number | null;
  niche?: ArayBusinessNiche;
  context?: Record<string, unknown>;
};

export type ArayBusinessSuggestedAction = {
  id: string;
  label: string;
  owner: "director" | "manager" | "seller" | "courier" | "accountant" | "warehouse" | "aray";
  priority: ArayBusinessEventPriority;
  requiresConfirmation: boolean;
  reason: string;
  href?: string;
};

export type ArayBusinessEventPlan = {
  eventKey: ArayBusinessEventKind;
  source: ArayBusinessEventSource;
  priority: ArayBusinessEventPriority;
  mode: "director" | "client" | "mixed";
  niche: ArayBusinessNiche;
  title: string;
  directorSummary: string;
  clientSummary: string;
  tags: string[];
  requiresHumanConfirmation: boolean;
  suggestedActions: ArayBusinessSuggestedAction[];
};

type ArayBusinessJsonValue =
  | string
  | number
  | boolean
  | null
  | ArayBusinessJsonValue[]
  | { [key: string]: ArayBusinessJsonValue };

function toJsonValue(value: unknown): ArayBusinessJsonValue {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(toJsonValue);
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, toJsonValue(item)]),
    );
  }
  return String(value);
}

function toJsonRecord(record?: Record<string, unknown>): { [key: string]: ArayBusinessJsonValue } {
  if (!record) return {};
  return Object.fromEntries(Object.entries(record).map(([key, value]) => [key, toJsonValue(value)]));
}

const eventBase: Record<
  ArayBusinessEventKind,
  {
    priority: ArayBusinessEventPriority;
    mode: "director" | "client" | "mixed";
    tags: string[];
    directorSummary: string;
    clientSummary: string;
  }
> = {
  "story.question": {
    priority: "high",
    mode: "mixed",
    tags: ["story", "lead", "question"],
    directorSummary: "Новый вопрос из сторис: нужно быстро ответить и не потерять контекст товара или услуги.",
    clientSummary: "Вопрос принят. Менеджер должен увидеть контекст сторис и ответить по делу.",
  },
  "story.offer": {
    priority: "medium",
    mode: "director",
    tags: ["story", "offer", "partner"],
    directorSummary: "Новое деловое предложение из сторис: нужно оценить условия, выгоду и риски.",
    clientSummary: "Предложение принято как рабочий контекст, без обещаний до проверки.",
  },
  "story.review": {
    priority: "medium",
    mode: "mixed",
    tags: ["story", "review", "trust"],
    directorSummary: "Новый отзыв из сторис: нужна модерация, связь с товаром и аккуратный ответ.",
    clientSummary: "Отзыв принят на проверку, чтобы сохранить доверие и качество публикации.",
  },
  "story.comment": {
    priority: "medium",
    mode: "mixed",
    tags: ["story", "comment", "context"],
    directorSummary: "Новый комментарий из сторис: нужно понять намерение и при необходимости перевести в лид.",
    clientSummary: "Комментарий принят и передан в рабочий контекст.",
  },
  "order.created": {
    priority: "urgent",
    mode: "director",
    tags: ["order", "crm", "logistics"],
    directorSummary: "Новый заказ: нужно проверить состав, контакт, оплату, доставку и следующий шаг менеджера.",
    clientSummary: "Заказ принят. Клиенту нужен понятный статус, сроки и спокойная коммуникация.",
  },
  "lead.created": {
    priority: "high",
    mode: "director",
    tags: ["lead", "crm", "sales"],
    directorSummary: "Новый лид: нужно быстро определить намерение, ценность и следующий контакт.",
    clientSummary: "Заявка принята. Клиенту нужен короткий понятный ответ.",
  },
  "cart.abandoned": {
    priority: "medium",
    mode: "mixed",
    tags: ["cart", "sales", "return"],
    directorSummary: "Корзина брошена: нужно понять препятствие и предложить мягкий возврат без давления.",
    clientSummary: "Можно помочь завершить выбор, уточнить доставку, размер или цену.",
  },
  "delivery.requested": {
    priority: "high",
    mode: "director",
    tags: ["delivery", "logistics", "route"],
    directorSummary: "Нужна доставка: нужно собрать маршрут, груз, время, исполнителя, стоимость и статус.",
    clientSummary: "Доставка оформляется только после подтверждения условий.",
  },
  "payment.pending": {
    priority: "high",
    mode: "director",
    tags: ["payment", "finance", "risk"],
    directorSummary: "Оплата ожидает действия: нужно проверить статус, счет и аккуратно напомнить клиенту.",
    clientSummary: "Клиенту нужен понятный способ оплаты и подтверждение без давления.",
  },
  "document.requested": {
    priority: "medium",
    mode: "director",
    tags: ["document", "crm", "trust"],
    directorSummary: "Нужен документ: ARAY готовит черновик, но финал требует проверки и подтверждения.",
    clientSummary: "Документ можно подготовить, но отправка идет после проверки ответственного.",
  },
  "task.overdue": {
    priority: "urgent",
    mode: "director",
    tags: ["task", "risk", "control"],
    directorSummary: "Задача просрочена: нужно поднять приоритет, назначить ответственного и убрать риск.",
    clientSummary: "Внутренняя задержка должна быть закрыта без лишнего шума для клиента.",
  },
  "stock.low": {
    priority: "medium",
    mode: "director",
    tags: ["stock", "warehouse", "sales"],
    directorSummary: "Остаток низкий: нужно проверить наличие, закупку и корректность обещаний на сайте.",
    clientSummary: "Клиенту нужно показывать честное наличие и варианты замены.",
  },
  "review.created": {
    priority: "medium",
    mode: "mixed",
    tags: ["review", "trust", "moderation"],
    directorSummary: "Новый отзыв: нужна модерация, ответ и связь с товаром или услугой.",
    clientSummary: "Отзыв принят и будет проверен перед публикацией.",
  },
  "consultation.requested": {
    priority: "high",
    mode: "mixed",
    tags: ["consultation", "sales", "support"],
    directorSummary: "Нужна консультация: нужно быстро понять вопрос, контекст и назначить следующий контакт.",
    clientSummary: "Запрос на консультацию принят, дальше нужен ясный ответ по теме.",
  },
};

const actionTemplates: Record<ArayBusinessEventKind, ArayBusinessSuggestedAction[]> = {
  "story.question": [
    {
      id: "reply-to-story-lead",
      label: "Ответить клиенту по контексту сторис",
      owner: "manager",
      priority: "high",
      requiresConfirmation: true,
      reason: "Ответ отправляется от имени бизнеса.",
    },
    {
      id: "open-related-entity",
      label: "Проверить связанный товар или услугу",
      owner: "seller",
      priority: "medium",
      requiresConfirmation: false,
      reason: "Нужно отвечать по фактам: цена, наличие, условия.",
    },
  ],
  "story.offer": [
    {
      id: "review-offer",
      label: "Разобрать предложение и условия",
      owner: "director",
      priority: "medium",
      requiresConfirmation: false,
      reason: "Сначала нужна оценка пользы, риска и ответственности.",
    },
    {
      id: "prepare-business-reply",
      label: "Подготовить деловой ответ",
      owner: "aray",
      priority: "medium",
      requiresConfirmation: true,
      reason: "Отправка ответа требует подтверждения.",
    },
  ],
  "story.review": [
    {
      id: "moderate-review",
      label: "Проверить отзыв перед публикацией",
      owner: "manager",
      priority: "medium",
      requiresConfirmation: true,
      reason: "Публикация влияет на доверие и репутацию.",
    },
    {
      id: "prepare-review-reply",
      label: "Подготовить спокойный ответ на отзыв",
      owner: "aray",
      priority: "medium",
      requiresConfirmation: true,
      reason: "Ответ публикуется от имени бизнеса.",
    },
  ],
  "story.comment": [
    {
      id: "classify-comment",
      label: "Понять намерение комментария",
      owner: "aray",
      priority: "medium",
      requiresConfirmation: false,
      reason: "Комментарий может быть вопросом, лидом, отзывом или сигналом UX.",
    },
  ],
  "order.created": [
    {
      id: "check-order",
      label: "Проверить заказ и контакт клиента",
      owner: "manager",
      priority: "urgent",
      requiresConfirmation: false,
      reason: "Новый заказ должен быстро попасть в работу.",
    },
    {
      id: "prepare-delivery",
      label: "Подготовить доставку или самовывоз",
      owner: "courier",
      priority: "high",
      requiresConfirmation: true,
      reason: "Передача адреса и запуск доставки требуют подтверждения.",
    },
    {
      id: "prepare-documents",
      label: "Подготовить счет или документы",
      owner: "accountant",
      priority: "medium",
      requiresConfirmation: true,
      reason: "Юридически значимые документы требуют проверки.",
    },
  ],
  "lead.created": [
    {
      id: "qualify-lead",
      label: "Определить намерение и следующий контакт",
      owner: "manager",
      priority: "high",
      requiresConfirmation: false,
      reason: "Скорость ответа повышает шанс продажи.",
    },
  ],
  "cart.abandoned": [
    {
      id: "soft-return",
      label: "Подготовить мягкое возвращающее сообщение",
      owner: "aray",
      priority: "medium",
      requiresConfirmation: true,
      reason: "Сообщение клиенту требует согласия и аккуратного тона.",
    },
  ],
  "delivery.requested": [
    {
      id: "collect-route",
      label: "Собрать маршрут, груз и сроки",
      owner: "courier",
      priority: "high",
      requiresConfirmation: false,
      reason: "Без этих данных нельзя честно считать доставку.",
    },
    {
      id: "choose-carrier",
      label: "Подобрать перевозчика или курьера",
      owner: "director",
      priority: "medium",
      requiresConfirmation: true,
      reason: "Исполнителю нельзя передавать данные без подтверждения.",
    },
  ],
  "payment.pending": [
    {
      id: "check-payment",
      label: "Проверить статус оплаты",
      owner: "accountant",
      priority: "high",
      requiresConfirmation: false,
      reason: "Нужно отделить факт оплаты от ожидания.",
    },
  ],
  "document.requested": [
    {
      id: "prepare-document-draft",
      label: "Подготовить черновик документа",
      owner: "aray",
      priority: "medium",
      requiresConfirmation: false,
      reason: "Черновик безопасен, финал требует проверки.",
    },
  ],
  "task.overdue": [
    {
      id: "raise-task-priority",
      label: "Поднять приоритет и назначить ответственного",
      owner: "director",
      priority: "urgent",
      requiresConfirmation: true,
      reason: "Изменение задачи требует прав.",
    },
  ],
  "stock.low": [
    {
      id: "check-stock",
      label: "Проверить остаток и доступность на сайте",
      owner: "warehouse",
      priority: "medium",
      requiresConfirmation: false,
      reason: "Нельзя обещать клиенту то, чего нет.",
    },
  ],
  "review.created": [
    {
      id: "moderate-review",
      label: "Проверить отзыв перед публикацией",
      owner: "manager",
      priority: "medium",
      requiresConfirmation: true,
      reason: "Публикация влияет на доверие и репутацию.",
    },
  ],
  "consultation.requested": [
    {
      id: "prepare-consultation",
      label: "Подготовить ответ и следующий контакт",
      owner: "manager",
      priority: "high",
      requiresConfirmation: true,
      reason: "Ответ клиенту отправляется от имени бизнеса.",
    },
  ],
};

function upgradePriorityByValue(priority: ArayBusinessEventPriority, valueRub?: number | null) {
  if (!valueRub || valueRub < 100000) return priority;
  if (priority === "low") return "medium";
  if (priority === "medium") return "high";
  return priority;
}

export function buildArayBusinessEventPlan(input: ArayBusinessEventInput): ArayBusinessEventPlan {
  const base = eventBase[input.kind];
  const priority = upgradePriorityByValue(base.priority, input.valueRub);
  const title = input.title.trim() || base.directorSummary;
  const niche = input.niche || "universal";
  const actions = (actionTemplates[input.kind] || []).map((action) => ({
    ...action,
    priority: action.priority === "medium" ? priority : action.priority,
    href: action.href || input.entity?.href || undefined,
  }));

  return {
    eventKey: input.kind,
    source: input.source,
    priority,
    mode: base.mode,
    niche,
    title,
    directorSummary: `${base.directorSummary} ${input.valueRub ? `Сумма: ${input.valueRub.toLocaleString("ru-RU")} ₽.` : ""}`.trim(),
    clientSummary: base.clientSummary,
    tags: Array.from(new Set([...base.tags, niche, "aray-event"])),
    requiresHumanConfirmation: actions.some((action) => action.requiresConfirmation),
    suggestedActions: actions,
  };
}

export function formatArayBusinessEventForCrm(plan: ArayBusinessEventPlan) {
  const actions = plan.suggestedActions
    .slice(0, 3)
    .map((action, index) => `${index + 1}. ${action.label}`)
    .join("\n");

  return [
    "ARAY Business Event",
    `Событие: ${plan.title}`,
    `Приоритет: ${plan.priority}`,
    `Режим: ${plan.mode}`,
    `Для директора: ${plan.directorSummary}`,
    `Для клиента: ${plan.clientSummary}`,
    actions ? `Следующие действия:\n${actions}` : null,
    plan.requiresHumanConfirmation ? "Важные действия: только после подтверждения." : null,
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildArayBusinessEventPayload(input: ArayBusinessEventInput, plan: ArayBusinessEventPlan) {
  return {
    kind: input.kind,
    source: input.source,
    title: plan.title,
    priority: plan.priority,
    mode: plan.mode,
    niche: plan.niche,
    tags: plan.tags,
    entity: input.entity
      ? {
          type: input.entity.type,
          id: input.entity.id ?? null,
          label: input.entity.label ?? null,
          href: input.entity.href ?? null,
        }
      : null,
    customer: input.customer
      ? {
          name: input.customer.name ?? null,
          phone: input.customer.phone ?? null,
          email: input.customer.email ?? null,
        }
      : null,
    valueRub: input.valueRub || null,
    context: toJsonRecord(input.context),
    requiresHumanConfirmation: plan.requiresHumanConfirmation,
    suggestedActions: plan.suggestedActions.map((action) => ({
      id: action.id,
      label: action.label,
      owner: action.owner,
      priority: action.priority,
      requiresConfirmation: action.requiresConfirmation,
    })),
  };
}
