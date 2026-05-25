export type ArayBusinessMessageKind = "question" | "offer" | "review" | "comment";
export type ArayBusinessMessengerMode = "compose" | "guide";

const PROFANITY_PATTERNS = [
  /бл+я+\w*/gi,
  /еб+\w*/gi,
  /ёб+\w*/gi,
  /х(у|y)[йяеёю]\w*/gi,
  /пизд\w*/gi,
  /сука\w*/gi,
  /мудак\w*/gi,
  /долбо\w*/gi,
  /нахер\w*/gi,
  /херн\w*/gi,
];

export function cleanArayBusinessInput(value: string, maxLength = 1400) {
  let next = value.replace(/\s+/g, " ").trim().slice(0, maxLength);
  PROFANITY_PATTERNS.forEach((pattern) => {
    next = next.replace(pattern, "");
  });
  return next
    .replace(/\s+([,.!?])/g, "$1")
    .replace(/([!?]){2,}/g, "$1")
    .replace(/\.{2,}/g, ".")
    .replace(/\s+/g, " ")
    .trim();
}

function stripGreeting(value: string) {
  return value
    .replace(/^(здравствуйте|добрый день|добрый вечер|доброе утро|привет|салам)[,!\s-]*/i, "")
    .trim();
}

function stripBusinessInstruction(value: string) {
  let next = value.trim();
  for (let i = 0; i < 2; i += 1) {
    next = next
      .replace(/^(?:клиенту|покупателю|заказчику|продавцу|менеджеру|курьеру|поставщику|сотруднику)\s+/i, "")
      .replace(/^(?:напиши|ответь|скажи|передай|перепиши|оформи|сделай|сформулируй|подготовь)\s+/i, "")
      .replace(/^(?:без воды|по делу|грамотно|вежливо|спокойно|коротко|нормально|по-человечески)\s+/i, "")
      .replace(/^(?:что|так[:,-]?|такое[:,-]?|текст[:,-]?)\s+/i, "")
      .trim();
  }
  return next;
}

function ensurePeriod(value: string) {
  const next = value.trim();
  if (!next) return next;
  return /[.!?]$/.test(next) ? next : `${next}.`;
}

function capitalizeFirst(value: string) {
  const next = value.trim();
  return next ? `${next[0].toUpperCase()}${next.slice(1)}` : next;
}

function polishBusinessMeaning(value: string) {
  return value
    .replace(/пусть\s+пришл[её]т/gi, "пришлите, пожалуйста,")
    .replace(/пришлите\s+адрес/gi, "пришлите, пожалуйста, адрес")
    .replace(/пришлите,\s*пожалуйста,\s*,/gi, "пришлите, пожалуйста,")
    .replace(/доставка\s+завтра\s+после\s+(\d{1,2})(?![:.\d])/gi, "доставка будет завтра после $1:00")
    .replace(/(после\s+\d{1,2}:00)\s+(пришлите)/gi, "$1. Пришлите")
    .replace(/после\s+(\d{1,2}:00)\s+и\s+пришлите/gi, "после $1. Пришлите")
    .replace(/\s+([,.!?])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function findOrderNumber(value: string) {
  return value.match(/(?:заказ|заявка|номер|№|#)\s*[:№#-]?\s*(\d{3,})/i)?.[1] || value.match(/^\D*(\d{4,})\D*$/)?.[1] || null;
}

export function buildArayBusinessMessengerText({
  text,
  kind = "offer",
  relationLabel,
  attachmentsCount = 0,
}: {
  text: string;
  kind?: ArayBusinessMessageKind;
  relationLabel?: string | null;
  attachmentsCount?: number;
}) {
  const cleaned = cleanArayBusinessInput(text);
  const fallback = attachmentsCount > 0 ? "Передаю вложение для уточнения." : "Нужно коротко и по делу уточнить детали.";
  const source = polishBusinessMeaning(stripGreeting(stripBusinessInstruction(cleaned || fallback)));
  const orderNumber = findOrderNumber(source);
  const relationLine = relationLabel ? ` Контекст: ${relationLabel}.` : "";
  const attachmentLine = attachmentsCount > 0 ? ` Вложения: ${attachmentsCount}.` : "";

  if (kind === "question") {
    if (orderNumber) {
      const details = source.replace(orderNumber, "").replace(/(?:заказ|заявка|номер|№|#)\s*[:№#-]?/gi, "").trim();
      return ensurePeriod(`Здравствуйте. Подскажите, пожалуйста, статус заказа №${orderNumber}${details ? `: ${details}` : ""}.${relationLine}${attachmentLine}`);
    }
    return ensurePeriod(`Здравствуйте. Подскажите, пожалуйста: ${source}.${relationLine}${attachmentLine}`);
  }

  if (kind === "review") {
    return ensurePeriod(`Хочу оставить отзыв: ${source}.${relationLine}${attachmentLine}`);
  }

  if (kind === "comment") {
    return ensurePeriod(`Комментарий по теме: ${source}.${relationLine}${attachmentLine}`);
  }

  if (/(доставка|самовывоз|оплат|адрес|срок|заказ|готов)/i.test(source)) {
    return ensurePeriod(`Здравствуйте. ${capitalizeFirst(source)}.${relationLine}${attachmentLine}`);
  }

  return ensurePeriod(`Здравствуйте. Предлагаю обсудить условия: ${source}.${relationLine}${attachmentLine} Готов(а) уточнить детали и следующий шаг`);
}

export function isArayBusinessMessengerRequest(text: string) {
  const normalized = text.toLowerCase();
  return (
    /как\s+(написать|сказать|ответить|сформулировать)/i.test(normalized) ||
    /(оформи|поправь|сделай|перепиши|переведи).{0,48}(сообщ|текст|ответ|предлож|отзыв|коммент)/i.test(normalized) ||
    /(без мата|без воды|делов|вежлив|грамотн|по делу|нормально донести)/i.test(normalized)
  );
}

export function isArayGuideRequest(text: string) {
  const normalized = text.toLowerCase();
  return (
    /(что ты умеешь|что умеешь|как работаешь|как это работает|покажи фичу|покажи демо)/i.test(normalized) ||
    /(проведи|проводник|подскажи куда|куда нажать|что дальше|следующий шаг)/i.test(normalized)
  );
}

export function getArayBusinessMessengerModeTitle(mode: ArayBusinessMessengerMode) {
  return mode === "compose" ? "Как написать" : "Проведи меня";
}

export function buildArayBusinessMessengerModeContext({
  mode,
  relationLabel,
}: {
  mode: ArayBusinessMessengerMode;
  relationLabel?: string | null;
}) {
  const base = [
    "[ARAY Business Messenger Mode]",
    `Режим: ${getArayBusinessMessengerModeTitle(mode)}.`,
    relationLabel ? `Контекст: ${relationLabel}.` : null,
  ].filter(Boolean);

  if (mode === "compose") {
    base.push(
      "Главная задача: перевести смысл человека в грамотный человеческий бизнес-язык.",
      "Сначала дай готовый текст для отправки, потом коротко объясни, что исправил.",
      "Убирай мат, агрессию, лишнюю воду, двусмысленность и тяжелые термины.",
      "Не отправляй сообщение сам: отправка только после подтверждения человека.",
    );
  } else {
    base.push(
      "Главная задача: вести человека по платформе и объяснять действие коротко по пунктам.",
      "Если нужно открыть раздел, открыть его и остаться рядом в чате.",
      "После действия говори коротко: что открыл, что проверить, какой следующий шаг.",
      "Изменения, деньги, реклама, документы и внешняя отправка только после подтверждения.",
    );
  }

  return base.join("\n");
}

export function buildArayBusinessMessengerPrompt({
  text,
  relationLabel,
  attachmentsCount = 0,
}: {
  text: string;
  relationLabel?: string | null;
  attachmentsCount?: number;
}) {
  return [
    "[ARAY Business Messenger]",
    "Если человек просит написать, поправить, перевести или смягчить сообщение, верни готовый текст для отправки.",
    "Сохрани смысл человека, но убери мат, агрессию, лишнюю воду и двусмысленность.",
    "Пиши по-человечески: спокойно, уважительно, коротко, без канцелярита.",
    "Если есть номер заказа, фото, документ, товар или сторис — используй это как контекст, но не выдумывай факты.",
    "Если человек просит передать информацию дальше, подготовь текст и предложи создать лид, задачу или отправку только после подтверждения.",
    relationLabel ? `Контекст: ${relationLabel}.` : null,
    attachmentsCount > 0 ? `Вложений: ${attachmentsCount}.` : null,
    `Исходная фраза: ${cleanArayBusinessInput(text, 1000) || "пустая"}`,
  ]
    .filter(Boolean)
    .join("\n");
}
