import type { TerminalProfileKey } from "@/lib/terminal-profiles";

export type TerminalCapabilityKey =
  | "cash_payment"
  | "qr_payment"
  | "card_payment"
  | "invoice_payment"
  | "electronic_receipt"
  | "receipt_print"
  | "fiscal_receipt"
  | "cash_shift"
  | "customer_lookup"
  | "repeat_order"
  | "crm_sync"
  | "search_index"
  | "barcode_scan"
  | "delivery"
  | "pickup"
  | "tables"
  | "appointments"
  | "booking"
  | "production_jobs"
  | "kitchen_jobs"
  | "inventory"
  | "documents"
  | "notifications"
  | "ai_operator";

export type TerminalCapability = {
  key: TerminalCapabilityKey;
  title: string;
  section: "work" | "payments" | "receipts" | "customers" | "fulfillment" | "devices" | "automation";
  description: string;
  requiresSetup: boolean;
  trustLevel: "CORE" | "BETA" | "NEEDS_PROVIDER" | "NEEDS_CONNECTOR";
  setupHint: string;
};

export const TERMINAL_CAPABILITIES: Record<TerminalCapabilityKey, TerminalCapability> = {
  cash_payment: {
    key: "cash_payment",
    title: "Наличные",
    section: "payments",
    description: "Приём наличных с привязкой к смене.",
    requiresSetup: false,
    trustLevel: "CORE",
    setupHint: "Работает сразу.",
  },
  qr_payment: {
    key: "qr_payment",
    title: "QR / ссылка",
    section: "payments",
    description: "Показать QR или отправить ссылку оплаты клиенту.",
    requiresSetup: true,
    trustLevel: "BETA",
    setupHint: "Нужен платёжный провайдер или ручной QR-сценарий.",
  },
  card_payment: {
    key: "card_payment",
    title: "Карта",
    section: "payments",
    description: "Эквайринг, терминал банка или ручная отметка карты.",
    requiresSetup: true,
    trustLevel: "NEEDS_PROVIDER",
    setupHint: "Нужен банк/эквайринг и сверка статусов.",
  },
  invoice_payment: {
    key: "invoice_payment",
    title: "Счёт",
    section: "payments",
    description: "B2B-оплата по счёту, PDF и реквизиты.",
    requiresSetup: false,
    trustLevel: "CORE",
    setupHint: "Нужны реквизиты компании.",
  },
  electronic_receipt: {
    key: "electronic_receipt",
    title: "Электронное подтверждение",
    section: "receipts",
    description: "Email, ссылка или сообщение вместо бумажного сценария.",
    requiresSetup: false,
    trustLevel: "CORE",
    setupHint: "Работает сразу, фискальный чек подключается отдельно.",
  },
  receipt_print: {
    key: "receipt_print",
    title: "Печать чеков",
    section: "receipts",
    description: "Чек на кассе, кухне, складе или производстве.",
    requiresSetup: true,
    trustLevel: "NEEDS_CONNECTOR",
    setupHint: "Нужен сетевой принтер или локальный коннектор.",
  },
  fiscal_receipt: {
    key: "fiscal_receipt",
    title: "Фискальный чек",
    section: "receipts",
    description: "Законная касса/ОФД или фискальный провайдер.",
    requiresSetup: true,
    trustLevel: "NEEDS_PROVIDER",
    setupHint: "Нужна юридическая настройка кассы, ОФД и возвратов.",
  },
  cash_shift: {
    key: "cash_shift",
    title: "Кассовая смена",
    section: "work",
    description: "Открыть смену, внести наличные, закрыть и сверить.",
    requiresSetup: false,
    trustLevel: "CORE",
    setupHint: "Работает в рабочем пульте терминала.",
  },
  customer_lookup: {
    key: "customer_lookup",
    title: "Поиск клиента",
    section: "customers",
    description: "Автозаполнение клиента по телефону и истории.",
    requiresSetup: false,
    trustLevel: "CORE",
    setupHint: "Работает от базы клиентов и заказов.",
  },
  repeat_order: {
    key: "repeat_order",
    title: "Повтор заказа",
    section: "customers",
    description: "Повторить прошлый заказ или избранные позиции клиента.",
    requiresSetup: false,
    trustLevel: "CORE",
    setupHint: "Работает после первых заказов.",
  },
  crm_sync: {
    key: "crm_sync",
    title: "CRM-синхронизация",
    section: "automation",
    description: "Заказ из терминала попадает в CRM и воронку.",
    requiresSetup: false,
    trustLevel: "CORE",
    setupHint: "Включено как внутренний контур.",
  },
  search_index: {
    key: "search_index",
    title: "Индекс поиска",
    section: "automation",
    description: "Быстрый поиск товаров, клиентов, заказов и контекст для Арая.",
    requiresSetup: false,
    trustLevel: "CORE",
    setupHint: "Пересобирается в блоке синхронизаций.",
  },
  barcode_scan: {
    key: "barcode_scan",
    title: "Сканер штрихкодов",
    section: "devices",
    description: "Сканер в режиме клавиатуры вводит код в активное поле терминала.",
    requiresSetup: true,
    trustLevel: "BETA",
    setupHint: "Нужен сканер в режиме ввода как клавиатура.",
  },
  delivery: {
    key: "delivery",
    title: "Доставка",
    section: "fulfillment",
    description: "Адрес, логистика, стоимость и статус доставки.",
    requiresSetup: false,
    trustLevel: "CORE",
    setupHint: "Можно подключить тарифы и курьеров позже.",
  },
  pickup: {
    key: "pickup",
    title: "Самовывоз",
    section: "fulfillment",
    description: "Выдача со склада, точки или стойки.",
    requiresSetup: false,
    trustLevel: "CORE",
    setupHint: "Работает сразу.",
  },
  tables: {
    key: "tables",
    title: "Столы и зоны",
    section: "fulfillment",
    description: "Зал, стол, веранда, бар и сценарий в заведении.",
    requiresSetup: false,
    trustLevel: "BETA",
    setupHint: "Нужно для ресторанов и кафе.",
  },
  appointments: {
    key: "appointments",
    title: "Запись",
    section: "fulfillment",
    description: "Дата, время, мастер, исполнитель или кабинет.",
    requiresSetup: false,
    trustLevel: "BETA",
    setupHint: "Нужно для услуг и салонов.",
  },
  booking: {
    key: "booking",
    title: "Бронирование",
    section: "fulfillment",
    description: "Номер, ресурс, бронь, дата и статус.",
    requiresSetup: true,
    trustLevel: "BETA",
    setupHint: "Нужна сетка ресурсов или календарь.",
  },
  production_jobs: {
    key: "production_jobs",
    title: "Задания производству",
    section: "work",
    description: "Цех, склад, объект, сборка и подготовка заказа.",
    requiresSetup: false,
    trustLevel: "CORE",
    setupHint: "Печать подключается отдельно.",
  },
  kitchen_jobs: {
    key: "kitchen_jobs",
    title: "Кухня / бар",
    section: "work",
    description: "Отправка блюд или задач в кухню и бар.",
    requiresSetup: false,
    trustLevel: "BETA",
    setupHint: "Печать кухонных чеков подключается отдельно.",
  },
  inventory: {
    key: "inventory",
    title: "Склад и остатки",
    section: "devices",
    description: "Резерв, списание, выдача и контроль наличия.",
    requiresSetup: true,
    trustLevel: "BETA",
    setupHint: "Нужны остатки, правила резерва и роли склада.",
  },
  documents: {
    key: "documents",
    title: "Документы",
    section: "automation",
    description: "Счёт, акт, накладная, бронь или маршрутный лист.",
    requiresSetup: true,
    trustLevel: "BETA",
    setupHint: "Нужны шаблоны документов.",
  },
  notifications: {
    key: "notifications",
    title: "Уведомления",
    section: "automation",
    description: "Push, Telegram, email, QR-статусы и инциденты.",
    requiresSetup: false,
    trustLevel: "CORE",
    setupHint: "Каналы подключаются постепенно.",
  },
  ai_operator: {
    key: "ai_operator",
    title: "Арай-оператор",
    section: "automation",
    description: "Подсказки, диагностика, мастер настройки и инциденты.",
    requiresSetup: false,
    trustLevel: "CORE",
    setupHint: "Рискованные действия требуют подтверждения.",
  },
};

export const ALWAYS_ON_TERMINAL_CAPABILITIES: TerminalCapabilityKey[] = [
  "cash_payment",
  "electronic_receipt",
  "customer_lookup",
  "repeat_order",
  "crm_sync",
  "search_index",
  "notifications",
  "ai_operator",
];

export const PROFILE_RECOMMENDED_CAPABILITIES: Record<TerminalProfileKey, TerminalCapabilityKey[]> = {
  universal: [
    "cash_payment",
    "qr_payment",
    "invoice_payment",
    "electronic_receipt",
    "cash_shift",
    "customer_lookup",
    "repeat_order",
    "crm_sync",
    "search_index",
    "notifications",
    "ai_operator",
  ],
  lumber: [
    "cash_payment",
    "qr_payment",
    "invoice_payment",
    "electronic_receipt",
    "cash_shift",
    "delivery",
    "pickup",
    "production_jobs",
    "customer_lookup",
    "repeat_order",
    "crm_sync",
    "search_index",
    "documents",
    "notifications",
    "ai_operator",
  ],
  restaurant: [
    "cash_payment",
    "qr_payment",
    "card_payment",
    "electronic_receipt",
    "cash_shift",
    "tables",
    "delivery",
    "pickup",
    "kitchen_jobs",
    "customer_lookup",
    "repeat_order",
    "crm_sync",
    "search_index",
    "notifications",
    "ai_operator",
  ],
  retail: [
    "cash_payment",
    "qr_payment",
    "card_payment",
    "invoice_payment",
    "electronic_receipt",
    "cash_shift",
    "delivery",
    "pickup",
    "barcode_scan",
    "inventory",
    "customer_lookup",
    "repeat_order",
    "crm_sync",
    "search_index",
    "notifications",
    "ai_operator",
  ],
  services: [
    "cash_payment",
    "qr_payment",
    "invoice_payment",
    "electronic_receipt",
    "appointments",
    "documents",
    "customer_lookup",
    "repeat_order",
    "crm_sync",
    "search_index",
    "notifications",
    "ai_operator",
  ],
  beauty: [
    "cash_payment",
    "qr_payment",
    "card_payment",
    "electronic_receipt",
    "cash_shift",
    "appointments",
    "customer_lookup",
    "repeat_order",
    "crm_sync",
    "search_index",
    "notifications",
    "ai_operator",
  ],
  construction: [
    "cash_payment",
    "qr_payment",
    "invoice_payment",
    "electronic_receipt",
    "cash_shift",
    "delivery",
    "pickup",
    "production_jobs",
    "inventory",
    "documents",
    "customer_lookup",
    "repeat_order",
    "crm_sync",
    "search_index",
    "notifications",
    "ai_operator",
  ],
};

export const PROFILE_RELEVANT_CAPABILITIES: Record<TerminalProfileKey, TerminalCapabilityKey[]> = {
  universal: Object.keys(TERMINAL_CAPABILITIES) as TerminalCapabilityKey[],
  lumber: [
    "cash_payment",
    "qr_payment",
    "card_payment",
    "invoice_payment",
    "electronic_receipt",
    "receipt_print",
    "fiscal_receipt",
    "cash_shift",
    "customer_lookup",
    "repeat_order",
    "crm_sync",
    "search_index",
    "barcode_scan",
    "delivery",
    "pickup",
    "production_jobs",
    "inventory",
    "documents",
    "notifications",
    "ai_operator",
  ],
  restaurant: [
    "cash_payment",
    "qr_payment",
    "card_payment",
    "invoice_payment",
    "electronic_receipt",
    "receipt_print",
    "fiscal_receipt",
    "cash_shift",
    "customer_lookup",
    "repeat_order",
    "crm_sync",
    "search_index",
    "barcode_scan",
    "delivery",
    "pickup",
    "tables",
    "production_jobs",
    "kitchen_jobs",
    "inventory",
    "documents",
    "notifications",
    "ai_operator",
  ],
  retail: [
    "cash_payment",
    "qr_payment",
    "card_payment",
    "invoice_payment",
    "electronic_receipt",
    "receipt_print",
    "fiscal_receipt",
    "cash_shift",
    "customer_lookup",
    "repeat_order",
    "crm_sync",
    "search_index",
    "barcode_scan",
    "delivery",
    "pickup",
    "inventory",
    "documents",
    "notifications",
    "ai_operator",
  ],
  services: [
    "cash_payment",
    "qr_payment",
    "card_payment",
    "invoice_payment",
    "electronic_receipt",
    "receipt_print",
    "fiscal_receipt",
    "cash_shift",
    "customer_lookup",
    "repeat_order",
    "crm_sync",
    "search_index",
    "delivery",
    "appointments",
    "booking",
    "documents",
    "notifications",
    "ai_operator",
  ],
  beauty: [
    "cash_payment",
    "qr_payment",
    "card_payment",
    "invoice_payment",
    "electronic_receipt",
    "receipt_print",
    "fiscal_receipt",
    "cash_shift",
    "customer_lookup",
    "repeat_order",
    "crm_sync",
    "search_index",
    "appointments",
    "documents",
    "notifications",
    "ai_operator",
  ],
  construction: [
    "cash_payment",
    "qr_payment",
    "card_payment",
    "invoice_payment",
    "electronic_receipt",
    "receipt_print",
    "fiscal_receipt",
    "cash_shift",
    "customer_lookup",
    "repeat_order",
    "crm_sync",
    "search_index",
    "barcode_scan",
    "delivery",
    "pickup",
    "production_jobs",
    "inventory",
    "documents",
    "notifications",
    "ai_operator",
  ],
};

export function parseTerminalCapabilityKeys(value?: string | null): TerminalCapabilityKey[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.filter((key): key is TerminalCapabilityKey => key in TERMINAL_CAPABILITIES);
    }
  } catch {
    return value
      .split(",")
      .map((key) => key.trim())
      .filter((key): key is TerminalCapabilityKey => key in TERMINAL_CAPABILITIES);
  }
  return [];
}

export function getDefaultTerminalCapabilities(profile: TerminalProfileKey): TerminalCapabilityKey[] {
  return Array.from(new Set([...ALWAYS_ON_TERMINAL_CAPABILITIES, ...PROFILE_RECOMMENDED_CAPABILITIES[profile]]));
}

export function resolveTerminalCapabilities(profile: TerminalProfileKey, stored?: string | null) {
  const enabled = parseTerminalCapabilityKeys(stored);
  const enabledKeys = enabled.length ? enabled : getDefaultTerminalCapabilities(profile);
  const finalKeys = Array.from(new Set([...ALWAYS_ON_TERMINAL_CAPABILITIES, ...enabledKeys]));
  const recommendedKeys = PROFILE_RECOMMENDED_CAPABILITIES[profile];

  return {
    enabledKeys: finalKeys,
    recommendedKeys,
    all: Object.values(TERMINAL_CAPABILITIES),
  };
}
