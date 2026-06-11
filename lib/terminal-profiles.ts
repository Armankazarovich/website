export type TerminalProfileKey = "lumber" | "restaurant" | "retail" | "services" | "beauty" | "construction" | "universal";

export type TerminalFulfillmentOption = {
  value: string;
  label: string;
  detailLabel: string;
  detailPlaceholder: string;
  requiresDetail: boolean;
  hasDeliveryCost: boolean;
};

export type TerminalProfile = {
  key: TerminalProfileKey;
  label: string;
  shortLabel: string;
  positionWord: string;
  searchPlaceholder: string;
  sourceLabel: string;
  sourcePlaceholder: string;
  customerNameLabel: string;
  customerNamePlaceholder: string;
  customerPhoneLabel: string;
  fulfillmentTitle: string;
  fulfillment: TerminalFulfillmentOption[];
  defaultFulfillment: string;
  costLabel: string;
  costPlaceholder: string;
  calculatorLabel: string;
  productionTarget: string;
  pipeline: TerminalPipeline;
};

export type TerminalPipeline = {
  orderStatuses: string[];
  paymentStatuses: string[];
  workStatuses: string[];
  crmStageMap: Record<string, string>;
};

const DEFAULT_CRM_STAGE_MAP: Record<string, string> = {
  NEW: "NEW",
  CONFIRMED: "QUALIFIED",
  PROCESSING: "NEGOTIATION",
  READY_PICKUP: "WON",
  SHIPPED: "WON",
  COMPLETED: "WON",
  CANCELLED: "LOST",
};

export const TERMINAL_PROFILES: Record<TerminalProfileKey, TerminalProfile> = {
  universal: {
    key: "universal",
    label: "Универсальный бизнес",
    shortLabel: "Бизнес",
    positionWord: "позиция",
    searchPlaceholder: "Поиск товара, услуги, брони или работы...",
    sourceLabel: "Контекст",
    sourcePlaceholder: "точка, канал, проект, зал, объект",
    customerNameLabel: "Клиент",
    customerNamePlaceholder: "клиент, гость, компания или объект",
    customerPhoneLabel: "Телефон",
    fulfillmentTitle: "Сценарий",
    defaultFulfillment: "ON_SITE",
    costLabel: "Доплата",
    costPlaceholder: "0 = без доплаты",
    calculatorLabel: "Расчёт",
    productionTarget: "рабочее место / команда",
    pipeline: {
      orderStatuses: ["Новый", "Подтверждён", "В работе", "Готов", "Выдан", "Завершён", "Отменён"],
      paymentStatuses: ["Ожидает оплату", "Запрошена", "Частично оплачено", "Оплачено", "Возврат", "Ошибка"],
      workStatuses: ["Черновик", "Назначено", "В процессе", "На проверке", "Готово"],
      crmStageMap: DEFAULT_CRM_STAGE_MAP,
    },
    fulfillment: [
      {
        value: "ON_SITE",
        label: "На месте",
        detailLabel: "Место / зона",
        detailPlaceholder: "стол, касса, кабинет, объект, зона",
        requiresDetail: false,
        hasDeliveryCost: false,
      },
      {
        value: "DELIVERY",
        label: "Доставка",
        detailLabel: "Адрес доставки",
        detailPlaceholder: "адрес, подъезд, комментарий",
        requiresDetail: true,
        hasDeliveryCost: true,
      },
      {
        value: "BOOKING",
        label: "Бронь",
        detailLabel: "Дата / место",
        detailPlaceholder: "дата, время, номер, стол, ресурс",
        requiresDetail: true,
        hasDeliveryCost: false,
      },
      {
        value: "REMOTE",
        label: "Онлайн",
        detailLabel: "Канал / ссылка",
        detailPlaceholder: "телефон, чат, ссылка, кабинет",
        requiresDetail: false,
        hasDeliveryCost: false,
      },
    ],
  },
  lumber: {
    key: "lumber",
    label: "Пиломатериалы",
    shortLabel: "Склад",
    positionWord: "материал",
    searchPlaceholder: "Поиск материала, размера или услуги...",
    sourceLabel: "Источник",
    sourcePlaceholder: "телефон, сайт, менеджер",
    customerNameLabel: "Клиент",
    customerNamePlaceholder: "Иван Иванов",
    customerPhoneLabel: "Телефон",
    fulfillmentTitle: "Получение",
    defaultFulfillment: "DELIVERY",
    costLabel: "Доставка",
    costPlaceholder: "0 = самовывоз или уточнить",
    calculatorLabel: "Калькулятор доставки",
    productionTarget: "склад / производство",
    pipeline: {
      orderStatuses: ["Новый", "Подтверждён", "Сборка", "Доставка", "Самовывоз", "Завершён", "Отменён"],
      paymentStatuses: ["Ожидает оплату", "Счёт отправлен", "Предоплата", "Оплачено", "Возврат", "Ошибка"],
      workStatuses: ["Резерв", "Пилится", "Собирается", "Готов к выдаче", "Отгружен"],
      crmStageMap: DEFAULT_CRM_STAGE_MAP,
    },
    fulfillment: [
      {
        value: "DELIVERY",
        label: "Доставка",
        detailLabel: "Адрес доставки",
        detailPlaceholder: "город, улица, дом, ориентир",
        requiresDetail: true,
        hasDeliveryCost: true,
      },
      {
        value: "PICKUP",
        label: "Самовывоз",
        detailLabel: "Пункт выдачи",
        detailPlaceholder: "склад, точка или время выдачи",
        requiresDetail: false,
        hasDeliveryCost: false,
      },
    ],
  },
  restaurant: {
    key: "restaurant",
    label: "Ресторан / кафе",
    shortLabel: "Зал",
    positionWord: "блюдо",
    searchPlaceholder: "Поиск блюда, напитка или модификатора...",
    sourceLabel: "Зона",
    sourcePlaceholder: "зал, веранда, бар, доставка",
    customerNameLabel: "Гость",
    customerNamePlaceholder: "Гость или имя брони",
    customerPhoneLabel: "Телефон гостя",
    fulfillmentTitle: "Формат",
    defaultFulfillment: "DINE_IN",
    costLabel: "Доставка / сервис",
    costPlaceholder: "0 = в зале",
    calculatorLabel: "Сервис",
    productionTarget: "кухня / бар",
    pipeline: {
      orderStatuses: ["Новый", "Принят", "Готовится", "Готов", "Выдан", "Закрыт", "Отменён"],
      paymentStatuses: ["Ожидает оплату", "Счёт открыт", "Частично оплачено", "Оплачено", "Возврат", "Ошибка"],
      workStatuses: ["На кухню", "Готовится", "На выдаче", "Выдано"],
      crmStageMap: DEFAULT_CRM_STAGE_MAP,
    },
    fulfillment: [
      {
        value: "DINE_IN",
        label: "В зале",
        detailLabel: "Стол / зона",
        detailPlaceholder: "стол 12, зал, веранда",
        requiresDetail: true,
        hasDeliveryCost: false,
      },
      {
        value: "TAKEAWAY",
        label: "С собой",
        detailLabel: "Имя / время выдачи",
        detailPlaceholder: "имя гостя, время готовности",
        requiresDetail: false,
        hasDeliveryCost: false,
      },
      {
        value: "DELIVERY",
        label: "Доставка",
        detailLabel: "Адрес доставки",
        detailPlaceholder: "адрес, подъезд, комментарий",
        requiresDetail: true,
        hasDeliveryCost: true,
      },
    ],
  },
  retail: {
    key: "retail",
    label: "Розница / магазин",
    shortLabel: "Магазин",
    positionWord: "товар",
    searchPlaceholder: "Поиск товара, штрихкода или услуги...",
    sourceLabel: "Точка продаж",
    sourcePlaceholder: "касса, витрина, сайт, маркетплейс",
    customerNameLabel: "Покупатель",
    customerNamePlaceholder: "Имя покупателя",
    customerPhoneLabel: "Телефон",
    fulfillmentTitle: "Получение",
    defaultFulfillment: "COUNTER",
    costLabel: "Доставка",
    costPlaceholder: "0 = выдача в магазине",
    calculatorLabel: "Подобрать",
    productionTarget: "касса / склад",
    pipeline: {
      orderStatuses: ["Новый", "Оплата", "Сборка", "Готов к выдаче", "Доставка", "Завершён", "Возврат"],
      paymentStatuses: ["Ожидает оплату", "QR/ссылка", "Оплачено", "Возврат", "Ошибка"],
      workStatuses: ["В корзине", "Собирается", "Упакован", "Выдан"],
      crmStageMap: DEFAULT_CRM_STAGE_MAP,
    },
    fulfillment: [
      {
        value: "COUNTER",
        label: "В магазине",
        detailLabel: "Касса / точка",
        detailPlaceholder: "касса 1, витрина, отдел",
        requiresDetail: false,
        hasDeliveryCost: false,
      },
      {
        value: "PICKUP",
        label: "Самовывоз",
        detailLabel: "Пункт выдачи",
        detailPlaceholder: "магазин, склад, время выдачи",
        requiresDetail: false,
        hasDeliveryCost: false,
      },
      {
        value: "DELIVERY",
        label: "Доставка",
        detailLabel: "Адрес доставки",
        detailPlaceholder: "адрес клиента",
        requiresDetail: true,
        hasDeliveryCost: true,
      },
    ],
  },
  services: {
    key: "services",
    label: "Услуги / запись",
    shortLabel: "Услуги",
    positionWord: "услуга",
    searchPlaceholder: "Поиск услуги, пакета или исполнителя...",
    sourceLabel: "Канал",
    sourcePlaceholder: "сайт, телефон, мессенджер, рекомендация",
    customerNameLabel: "Клиент",
    customerNamePlaceholder: "Имя клиента",
    customerPhoneLabel: "Телефон",
    fulfillmentTitle: "Формат",
    defaultFulfillment: "APPOINTMENT",
    costLabel: "Выезд / сервис",
    costPlaceholder: "0 = без доплаты",
    calculatorLabel: "Расчёт",
    productionTarget: "исполнитель / календарь",
    pipeline: {
      orderStatuses: ["Заявка", "Запись", "В работе", "Выполнено", "Закрыто", "Отменено"],
      paymentStatuses: ["Ожидает оплату", "Предоплата", "Оплачено", "Возврат", "Ошибка"],
      workStatuses: ["Запланировано", "Исполняется", "На согласовании", "Выполнено"],
      crmStageMap: DEFAULT_CRM_STAGE_MAP,
    },
    fulfillment: [
      {
        value: "APPOINTMENT",
        label: "Запись",
        detailLabel: "Дата и время",
        detailPlaceholder: "сегодня 15:00, завтра утром",
        requiresDetail: true,
        hasDeliveryCost: false,
      },
      {
        value: "REMOTE",
        label: "Онлайн",
        detailLabel: "Ссылка / канал",
        detailPlaceholder: "Zoom, Telegram, телефон",
        requiresDetail: false,
        hasDeliveryCost: false,
      },
      {
        value: "ONSITE",
        label: "Выезд",
        detailLabel: "Адрес выезда",
        detailPlaceholder: "адрес клиента или объекта",
        requiresDetail: true,
        hasDeliveryCost: true,
      },
    ],
  },
  beauty: {
    key: "beauty",
    label: "Салон / барбершоп",
    shortLabel: "Салон",
    positionWord: "услуга",
    searchPlaceholder: "Поиск услуги, мастера или набора...",
    sourceLabel: "Канал записи",
    sourcePlaceholder: "Instagram, телефон, сайт, администратор",
    customerNameLabel: "Клиент",
    customerNamePlaceholder: "Имя клиента",
    customerPhoneLabel: "Телефон",
    fulfillmentTitle: "Запись",
    defaultFulfillment: "CHAIR",
    costLabel: "Доплата",
    costPlaceholder: "0 = без доплаты",
    calculatorLabel: "Расчёт",
    productionTarget: "мастер / кабинет",
    pipeline: {
      orderStatuses: ["Новая запись", "Подтверждена", "Клиент пришёл", "В процессе", "Завершена", "Отмена"],
      paymentStatuses: ["Ожидает оплату", "Предоплата", "Оплачено", "Возврат", "Ошибка"],
      workStatuses: ["Запланировано", "У мастера", "Выполнено", "Повторная запись"],
      crmStageMap: DEFAULT_CRM_STAGE_MAP,
    },
    fulfillment: [
      {
        value: "CHAIR",
        label: "В салоне",
        detailLabel: "Мастер / время",
        detailPlaceholder: "мастер, кресло, время",
        requiresDetail: true,
        hasDeliveryCost: false,
      },
      {
        value: "HOME_VISIT",
        label: "Выезд",
        detailLabel: "Адрес выезда",
        detailPlaceholder: "адрес клиента",
        requiresDetail: true,
        hasDeliveryCost: true,
      },
    ],
  },
  construction: {
    key: "construction",
    label: "Стройматериалы",
    shortLabel: "Материалы",
    positionWord: "материал",
    searchPlaceholder: "Поиск материала, бренда, размера или артикула...",
    sourceLabel: "Источник",
    sourcePlaceholder: "сайт, телефон, менеджер, смета, объект",
    customerNameLabel: "Клиент",
    customerNamePlaceholder: "клиент, компания или объект",
    customerPhoneLabel: "Телефон",
    fulfillmentTitle: "Получение",
    defaultFulfillment: "OBJECT",
    costLabel: "Доставка",
    costPlaceholder: "0 = самовывоз или уточнить",
    calculatorLabel: "Доставка",
    productionTarget: "склад / доставка / объект",
    pipeline: {
      orderStatuses: ["Заявка", "Смета", "Согласование", "Сборка", "Доставка", "Закрыто", "Отмена"],
      paymentStatuses: ["Ожидает оплату", "Счёт отправлен", "Предоплата", "Оплачено", "Возврат", "Ошибка"],
      workStatuses: ["Резерв", "Комплектация", "Погрузка", "В пути", "Выдано"],
      crmStageMap: DEFAULT_CRM_STAGE_MAP,
    },
    fulfillment: [
      {
        value: "OBJECT",
        label: "Доставка",
        detailLabel: "Адрес доставки",
        detailPlaceholder: "город, улица, объект, комментарий",
        requiresDetail: true,
        hasDeliveryCost: true,
      },
      {
        value: "PICKUP",
        label: "Самовывоз",
        detailLabel: "Склад / выдача",
        detailPlaceholder: "склад, дата, ответственный",
        requiresDetail: false,
        hasDeliveryCost: false,
      },
      {
        value: "TEAM",
        label: "Поставка этапами",
        detailLabel: "Этап / объект",
        detailPlaceholder: "этап работ, объект, дата поставки",
        requiresDetail: true,
        hasDeliveryCost: false,
      },
    ],
  },
};

export const DEFAULT_TERMINAL_PROFILE = TERMINAL_PROFILES.lumber;

export function resolveTerminalProfile(value: unknown): TerminalProfile {
  const key = String(value || "").trim() as TerminalProfileKey;
  return TERMINAL_PROFILES[key] || DEFAULT_TERMINAL_PROFILE;
}
