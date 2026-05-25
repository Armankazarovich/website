"use client";

import { useState, useEffect, useMemo, useRef, useCallback, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Plus, Minus, Loader2, Phone, Search, Calculator,
  ChevronDown, User, MessageSquare, X, ShoppingCart,
  CreditCard, Banknote, Building2, Check, AlertCircle, Zap, BookOpen,
  ChevronUp, Truck, Package, Star, Info,
  Hand, Ruler, TrendingUp, TreePine, Clock, CheckCircle2, Settings2,
  Mail, Printer, QrCode, Send, ShieldCheck, Smartphone, Wifi, KeyRound, ExternalLink,
  ReceiptText, History, ArrowLeft,
  MapPinned,
} from "lucide-react";
import {
  ALWAYS_ON_TERMINAL_CAPABILITIES,
  PROFILE_RELEVANT_CAPABILITIES,
  TERMINAL_CAPABILITIES,
  getDefaultTerminalCapabilities,
  type TerminalCapabilityKey,
} from "@/lib/terminal-capabilities";
import { DEFAULT_TERMINAL_PROFILE, type TerminalProfile, type TerminalProfileKey } from "@/lib/terminal-profiles";
import { AdminModal } from "@/components/admin/admin-modal";
import { PopupPortal } from "@/components/ui/popup-portal";
import { useAdminPageHeader } from "@/components/admin/admin-page-actions";
import { useAdminOverlayGuard } from "@/lib/use-admin-overlay-guard";
import { buildMarketPriceIntelligence, type MarketPricePoint } from "@/lib/market-price-intelligence";

type Variant = {
  id: string;
  size: string;
  pricePerCube: number | null;
  pricePerPiece: number | null;
  inStock: boolean;
};

type Product = {
  id: string;
  name: string;
  saleUnit: "CUBE" | "PIECE" | "BOTH";
  category?: { name: string; slug: string };
  variants: Variant[];
};

type CartItem = {
  variantId: string;
  productName: string;
  variantSize: string;
  unitType: "CUBE" | "PIECE";
  quantity: number;
  price: number;
};

type RecentOrder = {
  id: string;
  orderNumber: number;
  createdAt: string;
  totalAmount: number;
  deliveryCost: number;
  deliveryAddress: string | null;
  terminalProfile?: string | null;
  fulfillmentType?: string | null;
  fulfillmentDetail?: string | null;
  paymentMethod: string;
  comment: string | null;
  items: CartItem[];
};

type CustomerLookup = {
  customer: {
    id: string | null;
    name: string;
    email: string;
    phone: string;
    address: string;
    source: "client" | "order";
    orderCount: number;
    totalSpent: number;
    lastOrderAt: string | null;
  } | null;
  recentOrders: RecentOrder[];
  favoriteItems: Array<CartItem & { count: number }>;
};

type TerminalMode = "REGISTER" | "ORDER" | "MARKET";
type OrderPanelView = "cart" | "checkout";
type MarketFilter = "all" | "inStock" | "withPrice" | "cube" | "piece" | "inCart";

type DemandProviderState = {
  key: string;
  name: string;
  connected: boolean;
  status: "ready" | "needs_token";
  regionScope: string;
  limitText: string;
  pricingText: string;
  sourceUrl: string;
  capabilities: string[];
};

type MarketDemandTopic = {
  phrase: string;
  source: "category" | "product" | "activity" | "manual";
  region: string;
  status: "ready_to_fetch" | "needs_provider";
  providers: string[];
};

type MarketDemandResponse = {
  generatedAt: string;
  cacheTtlMinutes: number;
  region: string;
  language: string;
  summary: string;
  providers: DemandProviderState[];
  topics: MarketDemandTopic[];
  nextSteps: string[];
};

type YandexDirectStatus = {
  configured: boolean;
  connected: boolean;
  campaignsCount: number;
  campaigns: Array<{
    id: number;
    name: string;
    state: string;
    status: string;
    type: string;
    startDate: string | null;
  }>;
  error: string | null;
};

const MARKET_FILTERS: Array<{ key: MarketFilter; label: string; hint: string }> = [
  { key: "all", label: "Все", hint: "Все позиции выбранной площадки" },
  { key: "inStock", label: "В наличии", hint: "Можно добавить в заказ сейчас" },
  { key: "withPrice", label: "С ценой", hint: "Позиции без ручного уточнения цены" },
  { key: "cube", label: "м³", hint: "Продается кубами" },
  { key: "piece", label: "шт", hint: "Продается поштучно" },
  { key: "inCart", label: "В заказе", hint: "Уже добавлено в корзину" },
];

function toPositivePrice(value: number | null | undefined) {
  const price = Number(value);
  return Number.isFinite(price) && price > 0 ? price : null;
}

function collectVariantPrices(variant: Variant) {
  return [toPositivePrice(variant.pricePerCube), toPositivePrice(variant.pricePerPiece)].filter((price): price is number => price !== null);
}

function collectProductPrices(product: Product) {
  return product.variants.flatMap(collectVariantPrices);
}

function collectMarketPricePoints(
  product: Product,
  category: string,
  inCartQuantity: number,
): MarketPricePoint[] {
  return product.variants.flatMap((variant) => {
    const points: MarketPricePoint[] = [];
    const cubePrice = toPositivePrice(variant.pricePerCube);
    const piecePrice = toPositivePrice(variant.pricePerPiece);
    if (cubePrice && product.saleUnit !== "PIECE") {
      points.push({
        unit: "m3",
        price: cubePrice,
        productName: product.name,
        category,
        inStock: variant.inStock,
        inCartQuantity,
      });
    }
    if (piecePrice && product.saleUnit !== "CUBE") {
      points.push({
        unit: "piece",
        price: piecePrice,
        productName: product.name,
        category,
        inStock: variant.inStock,
        inCartQuantity,
      });
    }
    return points;
  });
}

type TerminalWorkstation = {
  id: string;
  name: string;
  type: string;
  profile: string;
  status?: string | null;
};

type CashShift = {
  id: string;
  workstationId: string | null;
  openedAt: string;
  closedAt?: string | null;
  openingCash: number | string;
  expectedCash?: number | string | null;
  actualCash?: number | string | null;
  cashDelta?: number | string | null;
  cardTotal?: number | string | null;
  onlineTotal?: number | string | null;
  salesTotal?: number | string | null;
  refundTotal?: number | string | null;
  orderCount?: number | null;
  workstation?: TerminalWorkstation | null;
};

type CashCenterTab = "overview" | "reports" | "journal";

// ── Скрипты продаж для менеджера ────────────────────────────────
type SalesScript = {
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
  text: string;
  tip: string;
};

const SCRIPTS: SalesScript[] = [
  {
    id: "greeting",
    label: "Приветствие",
    icon: Hand,
    color: "bg-primary/10 border-primary/20 text-primary",
    text: "«Компания ПилоРус, меня зовут [имя], добрый день! Чем могу помочь?»",
    tip: "Представьтесь по имени — это повышает доверие клиента.",
  },
  {
    id: "volume",
    label: "Уточнить объём",
    icon: Ruler,
    color: "bg-primary/5 border-primary/20 text-primary",
    text: "«Скажите, какой объём материала планируете? Лучше заказать с запасом 10–15% — отходы при раскрое неизбежны.»",
    tip: "Запас 10% = меньше дозаказов = довольный клиент.",
  },
  {
    id: "upsell",
    label: "Апсейл (крупный заказ)",
    icon: TrendingUp,
    color: "bg-muted/30 border-border text-foreground",
    text: "«При заказе от 5 м³ делаем максимальную скидку на доставку — итого выйдет выгоднее, чем везти самостоятельно. Рассчитаем точно по вашему адресу.»",
    tip: "Крупный заказ + точный расчёт доставки — главный рычаг увеличения чека.",
  },
  {
    id: "quality",
    label: "Вопрос о качестве",
    icon: TreePine,
    color: "bg-muted/30 border-border text-foreground",
    text: "«Для каких целей берёте? Для бани — рекомендую лиственницу (не гниёт), для стропил — сосну 1 сорт. Для чернового пола — 2 сорт сэкономит бюджет.»",
    tip: "Экспертный совет = доверие = повторные покупки.",
  },
  {
    id: "urgency",
    label: "Срочность",
    icon: Clock,
    color: "bg-primary/5 border-primary/20 text-primary",
    text: "«Сейчас сезон — склад быстро расходится. Могу зафиксировать вашу позицию, оплата в течение 1–2 дней. Так точно получите нужное количество.»",
    tip: "Сезонная срочность реальна — используйте честно.",
  },
  {
    id: "objection",
    label: "Возражение «дорого»",
    icon: MessageSquare,
    color: "bg-muted/30 border-border text-foreground",
    text: "«Понимаю. Давайте посмотрим на сорт — 2 сорт той же породы обойдётся на 15–20% дешевле. Плюс у нас нет скрытых доборов за объём.»",
    tip: "Не снижайте цену — предложите альтернативу внутри ассортимента.",
  },
  {
    id: "closing",
    label: "Закрытие сделки",
    icon: CheckCircle2,
    color: "bg-primary/10 border-primary/20 text-primary",
    text: "«Итого [сумма] ₽, доставка [дата/самовывоз]. Оформляем? Уточните имя и телефон для заказа.»",
    tip: "Называйте конкретную сумму и дату — клиенту проще сказать «да».",
  },
];

const PROFILE_SALES_SCRIPTS: Partial<Record<TerminalProfileKey, SalesScript[]>> = {
  lumber: [
    {
      id: "greeting",
      label: "Приветствие",
      icon: Hand,
      color: "border-border bg-card text-foreground",
      text: "«Компания ПилоРус, меня зовут [имя], добрый день. Подскажите, какой материал и объём вам нужен?»",
      tip: "Начинаем с материала и объёма: так менеджер сразу понимает, что считать.",
    },
    {
      id: "use-case",
      label: "Цель покупки",
      icon: TreePine,
      color: "border-border bg-card text-foreground",
      text: "«Для чего берёте материал: баня, кровля, пол, обшивка или черновая работа? Тогда предложу сорт и породу без переплаты.»",
      tip: "Сфера сама подставляет правильные вопросы. Для ресторана здесь будут стол, кухня и чек, для услуг — мастер и запись.",
    },
    {
      id: "volume",
      label: "Объём и размер",
      icon: Ruler,
      color: "border-border bg-card text-foreground",
      text: "«Скажите размер, толщину и примерный объём. Если не знаете точно, я быстро посчитаю по площади или количеству штук.»",
      tip: "Сразу переводим разговор в расчёт: м³, штуки, доставка, запас.",
    },
    {
      id: "delivery",
      label: "Доставка / самовывоз",
      icon: Truck,
      color: "border-border bg-card text-foreground",
      text: "«Нужна доставка или самовывоз? Если доставка, напишите адрес — посчитаю рейс и подберу машину.»",
      tip: "В пиломатериалах логистика часто решает продажу сильнее скидки.",
    },
    {
      id: "objection",
      label: "Если дорого",
      icon: MessageSquare,
      color: "border-border bg-card text-foreground",
      text: "«Понимаю. Давайте подберём сорт или породу под задачу: можно сохранить качество там, где важно, и сэкономить на черновых местах.»",
      tip: "Не ломаем цену, а предлагаем правильную альтернативу.",
    },
    {
      id: "closing",
      label: "Закрытие",
      icon: CheckCircle2,
      color: "border-border bg-card text-foreground",
      text: "«Итого [сумма], материал [позиции], получение [доставка/самовывоз]. Оформляем заказ и фиксируем наличие?»",
      tip: "Финал должен быть короткий: сумма, состав, получение, действие.",
    },
  ],
  universal: SCRIPTS,
};

const fmt = (n: number) => n.toLocaleString("ru-RU") + " ₽";

const INPUT_CLASS = "w-full rounded-xl border border-border bg-background px-3 py-2 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/20";
const COMPACT_INPUT_CLASS = "rounded-xl border border-border bg-background px-3 py-2 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/20";
const SOFT_SELECTED_CLASS = "border-primary/45 bg-primary/10 text-primary";
const TERMINAL_DRAFT_STORAGE_KEY = "aray-terminal-order-draft:v1";
const TERMINAL_CART_EVENT = "aray:terminal-cart";
const TERMINAL_CART_OPEN_EVENT = "aray:terminal-cart-open";

function TerminalPortal({ active, children }: { active: boolean; children: ReactNode }) {
  return active ? <PopupPortal>{children}</PopupPortal> : <>{children}</>;
}

function shouldRestoreTerminalSearchFocus() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(min-width: 768px) and (pointer: fine)").matches;
}

const ORDER_CHANNELS = [
  { value: "PHONE", label: "Телефон", icon: Phone },
  { value: "WEBSITE", label: "Сайт", icon: ShoppingCart },
  { value: "OFFICE", label: "Офис", icon: Building2 },
  { value: "MESSENGER", label: "Чат", icon: MessageSquare },
] as const;

type OrderChannel = (typeof ORDER_CHANNELS)[number]["value"];

const TERMINAL_MODES = [
  {
    value: "ORDER",
    label: "Заказы",
    description: "телефон, сайт, CRM",
    icon: Phone,
  },
  {
    value: "REGISTER",
    label: "Касса",
    description: "смена, оплата, чек",
    icon: Banknote,
  },
] as const;

const TERMINAL_SETTINGS_SECTIONS = [
  { id: "start", label: "Запуск", description: "профиль и автонастройка", icon: Zap },
  { id: "cash", label: "Касса", description: "смена и рабочее место", icon: Banknote },
  { id: "payments", label: "Оплата", description: "наличные, QR, карта, счёт", icon: CreditCard },
  { id: "receipts", label: "Чеки", description: "электронный, принтер, фискальный", icon: ShieldCheck },
  { id: "devices", label: "Устройства", description: "принтеры и сканеры", icon: Printer },
  { id: "sync", label: "Синхронизация", description: "CRM, поиск, уведомления", icon: Wifi },
  { id: "aray", label: "Арай", description: "помощник настройки", icon: MessageSquare },
] as const;

type TerminalSettingsSection = (typeof TERMINAL_SETTINGS_SECTIONS)[number]["id"];

const TERMINAL_SETTINGS_CAPABILITIES: Record<TerminalSettingsSection, TerminalCapabilityKey[]> = {
  start: ["customer_lookup", "repeat_order", "crm_sync", "search_index"],
  cash: ["cash_shift", "cash_payment", "documents"],
  payments: ["cash_payment", "qr_payment", "card_payment", "invoice_payment"],
  receipts: ["electronic_receipt", "receipt_print", "fiscal_receipt"],
  devices: ["receipt_print", "barcode_scan", "kitchen_jobs", "production_jobs"],
  sync: ["crm_sync", "search_index", "notifications", "documents"],
  aray: ["ai_operator", "customer_lookup", "repeat_order", "notifications"],
};

type TerminalSetupGuide = {
  title: string;
  status: string;
  storage: string;
  steps: string[];
  fields: string[];
};

const TERMINAL_SETUP_GUIDES: Partial<Record<TerminalCapabilityKey, TerminalSetupGuide>> = {
  receipt_print: {
    title: "Подключение принтера",
    status: "Нужен сетевой принтер или локальный коннектор",
    storage: "Настройки храним в TerminalConnector.settings, секреты показываем только как статус.",
    steps: [
      "Выберите тип: сетевой LAN/Wi-Fi или локальный коннектор на кассовом компьютере.",
      "Укажите IP/порт или токен локального коннектора.",
      "Нажмите тест печати и проверьте контрольный чек.",
    ],
    fields: ["Адрес принтера/IP", "Порт", "Маршрут печати", "Токен коннектора"],
  },
  fiscal_receipt: {
    title: "Фискализация",
    status: "Только через проверенного провайдера или законную кассу",
    storage: "Ключи ОФД/кассы не показываем открыто; в интерфейсе видны статус, провайдер и последние 4 символа ключа.",
    steps: [
      "Выберите страну/юрисдикцию и провайдера.",
      "Заполните реквизиты организации и данные кассы.",
      "Проведите тестовый чек и тест возврата.",
    ],
    fields: ["Провайдер", "ID кассы", "Токен API", "ОФД/режим чеков"],
  },
  qr_payment: {
    title: "QR / ссылка оплаты",
    status: "Бета до подключения платёжного провайдера",
    storage: "Ключ провайдера и секрет уведомлений хранятся на сервере; в терминале показываем только статус.",
    steps: [
      "Выберите банк или платёжного провайдера.",
      "Добавьте ключ провайдера и секрет уведомлений.",
      "Сделайте тест оплаты, отмены и уведомления клиенту.",
    ],
    fields: ["Провайдер", "Ключ провайдера", "Секрет уведомлений", "Адрес для статусов"],
  },
  card_payment: {
    title: "Эквайринг / карта",
    status: "Нужен банк или ручная сверка",
    storage: "Договор и ключи эквайринга хранятся в защищённых настройках провайдера.",
    steps: [
      "Подключите банк/эквайринг или включите ручную отметку оплаты.",
      "Настройте сверку платежей со сменой.",
      "Проверьте оплату, возврат и отмену.",
    ],
    fields: ["Банк", "Номер терминала", "Номер договора", "Режим сверки"],
  },
  barcode_scan: {
    title: "Сканер штрихкодов",
    status: "Проводной сканер работает как клавиатура; камера и сеть требуют модуля",
    storage: "Для сканера в режиме клавиатуры ключи не нужны. Для сетевых сканеров нужен коннектор.",
    steps: [
      "Переведите сканер в режим ввода как клавиатура.",
      "Поставьте курсор в поле поиска терминала.",
      "Отсканируйте код и проверьте поиск товара.",
    ],
    fields: ["Тип сканера", "Префикс/суффикс", "Поле поиска", "Тестовый код"],
  },
  kitchen_jobs: {
    title: "Кухня / зона печати",
    status: "Нужен маршрут печати или экран задач",
    storage: "Маршруты храним в рабочем месте терминала и PrintJob.route.",
    steps: [
      "Создайте зону: кухня, цех, склад или выдача.",
      "Привяжите категории товаров к зоне.",
      "Проверьте, что заказ попадает в нужный маршрут.",
    ],
    fields: ["Зона", "Категории", "Принтер/экран", "Маршрут"],
  },
  production_jobs: {
    title: "Производство / сборка",
    status: "Бета: очередь задач уже есть, маршруты уточняются под сферу",
    storage: "Задачи создаются через PrintJob и TerminalSyncJob.",
    steps: [
      "Определите этапы: сборка, резка, упаковка, отгрузка.",
      "Свяжите этапы со статусами заказа.",
      "Проверьте печать или экран задач.",
    ],
    fields: ["Этап", "Ответственный", "Маршрут", "Статус заказа"],
  },
  notifications: {
    title: "Уведомления",
    status: "Внутренний контур готов, внешние каналы подключаются отдельно",
    storage: "События попадают в TerminalSyncJob; ключи SMS/мессенджеров хранятся на сервере.",
    steps: [
      "Выберите события: заказ создан, статус изменён, QR создан, оплата пришла.",
      "Подключите канал: push, email, SMS или мессенджер.",
      "Запустите тест уведомления.",
    ],
    fields: ["Канал", "События", "Шаблон", "Ключ канала"],
  },
  crm_sync: {
    title: "CRM-синхронизация",
    status: "Внутренний контур работает",
    storage: "Заказ терминала сразу создаёт CRM-событие и индекс поиска.",
    steps: [
      "Проверьте карту статусов для сферы бизнеса.",
      "Создайте тестовый заказ.",
      "Убедитесь, что он появился в Заказах и CRM.",
    ],
    fields: ["Профиль бизнеса", "Карта статусов", "Воронка", "Ответственный"],
  },
  search_index: {
    title: "Индекс сайта и терминала",
    status: "Работает для товаров, клиентов и заказов",
    storage: "Данные лежат в TerminalSearchIndex, пересборка доступна в разделе терминалов.",
    steps: [
      "После изменения товаров запустите пересборку индекса.",
      "Проверьте поиск товара, клиента и заказа.",
      "Арай использует этот индекс как контекст.",
    ],
    fields: ["Товары", "Клиенты", "Заказы", "Дата индекса"],
  },
};

const WORK_MODES = [
  { value: "MOBILE", label: "Телефон", icon: Smartphone, description: "заказ, клиент, электронное подтверждение", capability: "electronic_receipt" },
  { value: "STATION", label: "Касса", icon: Wifi, description: "смена, принтер, сканер, рабочее место", capability: "cash_shift" },
  { value: "FIELD", label: "Выезд", icon: Truck, description: "доставка, самовывоз, объект", capability: "delivery" },
] as const;

const PAYMENT_OPTS = [
  { label: "Наличные", icon: Banknote, value: "Наличные", description: "кассир примет и сверит в смене", capability: "cash_payment" },
  { label: "QR / ссылка", icon: QrCode, value: "QR / ссылка", description: "показать на телефоне или отправить клиенту", capability: "qr_payment" },
  { label: "Карта", icon: CreditCard, value: "Карта", description: "терминал, эквайринг или ручная отметка", capability: "card_payment" },
  { label: "Счёт", icon: Building2, value: "Безнал по счёту", description: "B2B, PDF, оплата по реквизитам", capability: "invoice_payment" },
] as const;

const RECEIPT_MODES = [
  { value: "ELECTRONIC", label: "Электронный", icon: Mail, description: "email, SMS или ссылка клиенту", capability: "electronic_receipt" },
  { value: "PRINTER", label: "Принтер", icon: Printer, description: "чек, кухня, производство", capability: "receipt_print" },
  { value: "LATER", label: "После оплаты", icon: ShieldCheck, description: "когда касса или ОФД подтвердит", capability: "fiscal_receipt" },
] as const;

type WorkMode = (typeof WORK_MODES)[number]["value"];
type ReceiptMode = (typeof RECEIPT_MODES)[number]["value"];

function getRequestedTerminalMode(mode: string): TerminalMode | null {
  if (mode === "market" || mode === "exchange") return "ORDER";
  if (mode === "cash" || mode === "register") return "REGISTER";
  if (mode === "order") return "ORDER";
  return null;
}

export default function NewPhoneOrderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedMode = searchParams.get("mode")?.toLowerCase() ?? "";
  const requestedTerminalMode = getRequestedTerminalMode(requestedMode);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    guestName: "",
    guestPhone: "",
    guestEmail: "",
    fulfillmentType: DEFAULT_TERMINAL_PROFILE.defaultFulfillment,
    fulfillmentDetail: "",
    paymentMethod: "Наличные",
    contactMethod: "PHONE" as OrderChannel,
    contactUsername: "",
    comment: "",
  });

  const [items, setItems] = useState<CartItem[]>([]);
  const [deliveryCost, setDeliveryCost] = useState(0);
  const [deliveryCostInput, setDeliveryCostInput] = useState("");

  // Delivery rates
  const [deliveryRates, setDeliveryRates] = useState<Array<{ id: string; vehicleName: string; payload: string; maxVolume: number; basePrice: number }>>([]);
  const [calcOpen, setCalcOpen] = useState(false);
  const [calcVolume, setCalcVolume] = useState("");
  const [calcSuggestions, setCalcSuggestions] = useState<typeof deliveryRates>([]);

  // Product search
  const [productSearch, setProductSearch] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [unitType, setUnitType] = useState<"CUBE" | "PIECE">("CUBE");
  const [quantity, setQuantity] = useState(1);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [marketCategory, setMarketCategory] = useState<string>("all");
  const [marketShop, setMarketShop] = useState<string>("");
  const [marketFilter, setMarketFilter] = useState<MarketFilter>("all");

  // UI
  const [showScripts, setShowScripts] = useState(false);
  const [activeScript, setActiveScript] = useState<string | null>(null);
  const [showClientForm, setShowClientForm] = useState(true);
  const [orderPanelView, setOrderPanelView] = useState<OrderPanelView>("cart");
  const [addedFlash, setAddedFlash] = useState<string | null>(null);
  const [showMobileCart, setShowMobileCart] = useState(false);
  const [showMarketInsights, setShowMarketInsights] = useState(false);
  const [marketDemand, setMarketDemand] = useState<MarketDemandResponse | null>(null);
  const [marketDemandLoading, setMarketDemandLoading] = useState(false);
  const [marketDemandError, setMarketDemandError] = useState("");
  const [directStatus, setDirectStatus] = useState<YandexDirectStatus | null>(null);
  const [directStatusLoading, setDirectStatusLoading] = useState(false);
  const [clientLookup, setClientLookup] = useState<CustomerLookup | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [terminalMode, setTerminalMode] = useState<TerminalMode>(requestedTerminalMode ?? "ORDER");
  const [workMode, setWorkMode] = useState<WorkMode>("MOBILE");
  const [receiptMode, setReceiptMode] = useState<ReceiptMode>("ELECTRONIC");
  const [terminalProfile, setTerminalProfile] = useState<TerminalProfile>(DEFAULT_TERMINAL_PROFILE);
  const [enabledCapabilities, setEnabledCapabilities] = useState<TerminalCapabilityKey[]>(
    getDefaultTerminalCapabilities(DEFAULT_TERMINAL_PROFILE.key)
  );
  const [showTerminalSettings, setShowTerminalSettings] = useState(false);
  const [terminalSettingsSection, setTerminalSettingsSection] = useState<TerminalSettingsSection>("start");
  const [expandedCapabilityKey, setExpandedCapabilityKey] = useState<TerminalCapabilityKey | null>(null);
  const [expandedSetupKey, setExpandedSetupKey] = useState<TerminalCapabilityKey | null>(null);
  const [terminalSettingsBusy, setTerminalSettingsBusy] = useState("");
  const [terminalSettingsMessage, setTerminalSettingsMessage] = useState("");
  const [workstations, setWorkstations] = useState<TerminalWorkstation[]>([]);
  const [openShifts, setOpenShifts] = useState<CashShift[]>([]);
  const [recentShifts, setRecentShifts] = useState<CashShift[]>([]);
  const [selectedWorkstationId, setSelectedWorkstationId] = useState("");
  const [openingCash, setOpeningCash] = useState("0");
  const [closingCash, setClosingCash] = useState("");
  const [cashCloseOpen, setCashCloseOpen] = useState(false);
  const [cashCenterOpen, setCashCenterOpen] = useState(false);
  const [cashCenterTab, setCashCenterTab] = useState<CashCenterTab>("overview");
  const [shiftLoading, setShiftLoading] = useState(true);
  const [shiftBusy, setShiftBusy] = useState("");
  const [shiftMessage, setShiftMessage] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const draftRestoredRef = useRef(false);
  const deliveryRatesLoadedRef = useRef(false);
  const shiftStateLoadedRef = useRef(false);

  useEffect(() => {
    fetch("/api/admin/terminal/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data?.profile) return;
        setTerminalProfile(data.profile);
        setForm((current) => ({
          ...current,
          fulfillmentType: current.fulfillmentType || data.profile.defaultFulfillment,
        }));
        if (Array.isArray(data.capabilities?.enabledKeys)) {
          setEnabledCapabilities(data.capabilities.enabledKeys);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!calcOpen || deliveryRatesLoadedRef.current) return;
    const controller = new AbortController();
    fetch("/api/admin/delivery-rates", { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => {
        setDeliveryRates(Array.isArray(data) ? data : []);
        deliveryRatesLoadedRef.current = true;
      })
      .catch(() => {});
    return () => controller.abort();
  }, [calcOpen]);

  useEffect(() => {
    fetch("/api/admin/terminal/catalog")
      .then((r) => r.json())
      .then((data) => {
        setProducts(Array.isArray(data) ? data : []);
        setLoadingProducts(false);
      })
      .catch(() => setLoadingProducts(false));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(TERMINAL_DRAFT_STORAGE_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw);

      if (draft?.form && typeof draft.form === "object") {
        setForm((current) => ({ ...current, ...draft.form }));
      }
      if (Array.isArray(draft?.items)) {
        setItems(
          draft.items
            .filter((item: Partial<CartItem>) =>
              item &&
              typeof item.variantId === "string" &&
              typeof item.productName === "string" &&
              typeof item.variantSize === "string" &&
              (item.unitType === "CUBE" || item.unitType === "PIECE") &&
              Number.isFinite(Number(item.quantity)) &&
              Number.isFinite(Number(item.price))
            )
            .map((item: CartItem) => ({
              ...item,
              quantity: Number(item.quantity),
              price: Number(item.price),
            }))
        );
      }
      if (typeof draft?.deliveryCostInput === "string") setDeliveryCostInput(draft.deliveryCostInput);
      if (Number.isFinite(Number(draft?.deliveryCost))) setDeliveryCost(Number(draft.deliveryCost));
      if (!requestedTerminalMode && (draft?.terminalMode === "REGISTER" || draft?.terminalMode === "ORDER")) setTerminalMode(draft.terminalMode);
      if (WORK_MODES.some((mode) => mode.value === draft?.workMode)) setWorkMode(draft.workMode);
      if (RECEIPT_MODES.some((mode) => mode.value === draft?.receiptMode)) setReceiptMode(draft.receiptMode);
      if (draft?.orderPanelView === "cart" || draft?.orderPanelView === "checkout") setOrderPanelView(draft.orderPanelView);
    } catch {
      window.localStorage.removeItem(TERMINAL_DRAFT_STORAGE_KEY);
    } finally {
      draftRestoredRef.current = true;
    }
  }, [requestedTerminalMode]);

  useEffect(() => {
    if (requestedTerminalMode === "REGISTER") {
      setTerminalMode("REGISTER");
      setWorkMode("STATION");
      return;
    }
    if (requestedTerminalMode === "ORDER") {
      setTerminalMode("ORDER");
      if (workMode === "STATION") setWorkMode("MOBILE");
    }
  }, [requestedTerminalMode, router, workMode]);

  useEffect(() => {
    if (!showMobileCart) return;
    const closeIfDesktop = () => {
      if (window.innerWidth >= 768) setShowMobileCart(false);
    };

    closeIfDesktop();
    window.addEventListener("resize", closeIfDesktop);
    return () => window.removeEventListener("resize", closeIfDesktop);
  }, [showMobileCart]);

  useEffect(() => {
    if (!showMobileCart) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowMobileCart(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showMobileCart]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const openTerminalCart = () => {
      if (items.length === 0) return;
      setOrderPanelView("cart");
      setShowMobileCart(true);
      searchRef.current?.blur();
    };

    window.addEventListener(TERMINAL_CART_OPEN_EVENT, openTerminalCart);
    return () => window.removeEventListener(TERMINAL_CART_OPEN_EVENT, openTerminalCart);
  }, [items.length]);

  const terminalOverlayOpen =
    showMobileCart ||
    showScripts ||
    showTerminalSettings ||
    cashCloseOpen ||
    cashCenterOpen ||
    Boolean(selectedProductId);

  useAdminOverlayGuard(terminalOverlayOpen);

  useEffect(() => {
    if (!draftRestoredRef.current || typeof window === "undefined") return;
    const hasDraft =
      items.length > 0 ||
      deliveryCost > 0 ||
      form.guestName.trim() ||
      form.guestPhone.trim() ||
      form.guestEmail.trim() ||
      form.fulfillmentDetail.trim() ||
      form.contactUsername.trim() ||
      form.comment.trim();

    if (!hasDraft) {
      window.localStorage.removeItem(TERMINAL_DRAFT_STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(
      TERMINAL_DRAFT_STORAGE_KEY,
      JSON.stringify({
        savedAt: Date.now(),
        form,
        items,
        deliveryCost,
        deliveryCostInput,
        terminalMode,
        workMode,
        receiptMode,
        orderPanelView,
      })
    );
  }, [deliveryCost, deliveryCostInput, form, items, orderPanelView, receiptMode, terminalMode, workMode]);

  const loadShiftState = useCallback(async () => {
    setShiftLoading(true);
    try {
      const [workstationsRes, shiftsRes] = await Promise.all([
        fetch("/api/admin/terminal/workstations"),
        fetch("/api/admin/terminal/shifts"),
      ]);
      const workstationsData = workstationsRes.ok ? await workstationsRes.json().catch(() => ({})) : {};
      const shiftsData = shiftsRes.ok ? await shiftsRes.json().catch(() => ({})) : {};
      const nextWorkstations = Array.isArray(workstationsData.workstations) ? workstationsData.workstations : [];
      const nextOpenShifts = Array.isArray(shiftsData.openShifts) ? shiftsData.openShifts : [];
      const nextRecentShifts = Array.isArray(shiftsData.recentShifts) ? shiftsData.recentShifts : [];

      setWorkstations(nextWorkstations);
      setOpenShifts(nextOpenShifts);
      setRecentShifts(nextRecentShifts);
      setSelectedWorkstationId((current) => current || nextOpenShifts[0]?.workstationId || nextWorkstations[0]?.id || "");
      shiftStateLoadedRef.current = true;
    } finally {
      setShiftLoading(false);
    }
  }, []);

  useEffect(() => {
    const shouldLoadShiftState = terminalMode === "REGISTER" || cashCenterOpen;
    if (!shouldLoadShiftState) {
      setShiftLoading(false);
      return;
    }
    if (shiftStateLoadedRef.current) return;
    loadShiftState().catch(() => setShiftLoading(false));
  }, [cashCenterOpen, loadShiftState, terminalMode]);

  useEffect(() => {
    const phoneDigits = form.guestPhone.replace(/\D/g, "");
    if (phoneDigits.length < 7) {
      setClientLookup(null);
      setLookupLoading(false);
      return;
    }

    const controller = new AbortController();
    let cancelled = false;
    setClientLookup(null);
    setLookupLoading(true);
    const timer = window.setTimeout(() => {
      fetch(`/api/admin/terminal/customer?phone=${encodeURIComponent(form.guestPhone)}`, {
        signal: controller.signal,
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((data: CustomerLookup | null) => {
          if (cancelled) return;
          if (!data) {
            setClientLookup(null);
            return;
          }
          setClientLookup(data);

          if (data.customer) {
            setForm((current) => ({
              ...current,
              guestName: current.guestName || data.customer?.name || "",
              guestEmail: current.guestEmail || data.customer?.email || "",
              fulfillmentDetail: current.fulfillmentDetail || data.customer?.address || "",
            }));
          }
        })
        .catch((err) => {
          if (!cancelled && err?.name !== "AbortError") setClientLookup(null);
        })
        .finally(() => {
          if (!cancelled) setLookupLoading(false);
        });
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [form.guestPhone]);

  const categories = useMemo(() => {
    const cats = new Map<string, string>();
    products.forEach((p) => {
      if (p.category) cats.set(p.category.slug, p.category.name);
    });
    return [{ slug: "all", name: "Все" }, ...Array.from(cats.entries()).map(([slug, name]) => ({ slug, name }))];
  }, [products]);

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    return products.filter((p) => {
      const matchCat = activeCategory === "all" || p.category?.slug === activeCategory;
      const matchQ = !q || p.name.toLowerCase().includes(q) || p.variants.some((v) => v.size.toLowerCase().includes(q));
      return matchCat && matchQ;
    });
  }, [products, productSearch, activeCategory]);

  const marketCategories = useMemo(() => {
    const realCategories = categories.filter((cat) => cat.slug !== "all");
    return [
      {
        slug: "all",
        name: "Все категории",
        count: products.length,
        demand: "нет данных по спросу",
      },
      ...realCategories.map((cat) => {
        const categoryProducts = products.filter((product) => product.category?.slug === cat.slug);
        return {
          slug: cat.slug,
          name: cat.name,
          count: categoryProducts.length,
          demand: "нет данных по спросу",
        };
      }),
    ];
  }, [categories, products]);

  const marketCategoryProducts = useMemo(() => (
    marketCategory === "all"
      ? products
      : products.filter((product) => product.category?.slug === marketCategory)
  ), [marketCategory, products]);

  const marketShops = useMemo(() => {
    const categoryLabel = marketCategories.find((cat) => cat.slug === marketCategory)?.name || "Все категории";
    const categoryGroups = marketCategory === "all"
      ? categories.filter((cat) => cat.slug !== "all")
      : categories.filter((cat) => cat.slug === marketCategory);

    const shops = categoryGroups
      .map((cat) => {
        const shopProducts = products.filter((product) => product.category?.slug === cat.slug);
        if (shopProducts.length === 0) return null;
        const variantsCount = shopProducts.reduce((sum, product) => sum + product.variants.length, 0);
        return {
          id: `pilorus-${cat.slug}`,
          name: `${cat.name} · ПилоРус`,
          category: cat.name,
          products: shopProducts,
          variantsCount,
          contacts: "ПилоРус · склад и менеджер",
          delivery: "самовывоз, доставка, заявка",
          demand: "нет данных",
          supply: variantsCount > 0 ? `${variantsCount} вар.` : "нет данных",
        };
      })
      .filter((shop): shop is NonNullable<typeof shop> => Boolean(shop));

    if (shops.length > 0) return shops;
    return [{
      id: "pilorus-empty",
      name: `${categoryLabel} · магазин не выбран`,
      category: categoryLabel,
      products: marketCategoryProducts,
      variantsCount: marketCategoryProducts.reduce((sum, product) => sum + product.variants.length, 0),
      contacts: "контакты магазина появятся здесь",
      delivery: "условия доставки появятся здесь",
      demand: "нет данных",
      supply: "нет данных",
    }];
  }, [categories, marketCategories, marketCategory, marketCategoryProducts, products]);

  useEffect(() => {
    if (terminalMode !== "MARKET") return;
    if (!marketShops.length) return;
    if (!marketShop || !marketShops.some((shop) => shop.id === marketShop)) {
      setMarketShop(marketShops[0].id);
    }
  }, [marketShop, marketShops, terminalMode]);

  const activeMarketShop = marketShops.find((shop) => shop.id === marketShop) || marketShops[0];
  const marketSearchProducts = useMemo(() => {
    const normalizeText = (value?: string | null) => (value || "").toLowerCase().replace(/ё/g, "е");
    const q = normalizeText(productSearch.trim());
    const source = activeMarketShop?.products || marketCategoryProducts;
    return source.filter((product) => {
      if (!q) return true;
      return normalizeText(product.name).includes(q)
        || normalizeText(product.category?.name).includes(q)
        || normalizeText(activeMarketShop?.name).includes(q)
        || product.variants.some((variant) => normalizeText(variant.size).includes(q));
    });
  }, [activeMarketShop, marketCategoryProducts, productSearch]);

  const isProductInCart = useCallback(
    (product: Product) => items.some((item) => item.productName === product.name),
    [items]
  );

  const matchesMarketFilter = useCallback((product: Product, filter: MarketFilter) => {
    if (filter === "all") return true;
    if (filter === "inStock") return product.variants.some((variant) => variant.inStock);
    if (filter === "withPrice") {
      return collectProductPrices(product).length > 0;
    }
    if (filter === "cube") {
      return product.saleUnit !== "PIECE" && product.variants.some((variant) => toPositivePrice(variant.pricePerCube) !== null);
    }
    if (filter === "piece") {
      return product.saleUnit !== "CUBE" && product.variants.some((variant) => toPositivePrice(variant.pricePerPiece) !== null);
    }
    if (filter === "inCart") return isProductInCart(product);
    return true;
  }, [isProductInCart]);

  const marketFilterPills = useMemo(
    () => MARKET_FILTERS.map((filter) => ({
      ...filter,
      count: marketSearchProducts.filter((product) => matchesMarketFilter(product, filter.key)).length,
    })),
    [marketSearchProducts, matchesMarketFilter]
  );

  const marketProducts = useMemo(
    () => marketSearchProducts.filter((product) => matchesMarketFilter(product, marketFilter)),
    [marketFilter, marketSearchProducts, matchesMarketFilter]
  );
  const visibleCatalogProducts = terminalMode === "MARKET" ? marketProducts : filteredProducts;
  const itemsTotal = useMemo(() => items.reduce((sum, it) => sum + it.quantity * it.price, 0), [items]);
  const totalAmount = itemsTotal + deliveryCost;
  const totalVolume = useMemo(() => items.filter((i) => i.unitType === "CUBE").reduce((s, i) => s + i.quantity, 0), [items]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(
      new CustomEvent(TERMINAL_CART_EVENT, {
        detail: {
          items: items.length,
          total: totalAmount,
          visible: items.length > 0,
        },
      }),
    );
  }, [items.length, totalAmount]);

  useEffect(() => {
    return () => {
      if (typeof window === "undefined") return;
      window.dispatchEvent(
        new CustomEvent(TERMINAL_CART_EVENT, {
          detail: { items: 0, total: 0, visible: false },
        }),
      );
    };
  }, []);

  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const selectedVariant = selectedProduct?.variants.find((v) => v.id === selectedVariantId);
  const selectedProductMarketStats = useMemo(() => {
    if (!selectedProduct) return null;
    const prices = collectProductPrices(selectedProduct);
    const inStockVariants = selectedProduct.variants.filter((variant) => variant.inStock).length;
    const inCartQuantity = items
      .filter((item) => item.productName === selectedProduct.name)
      .reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    return {
      minPrice: prices.length ? Math.min(...prices) : 0,
      maxPrice: prices.length ? Math.max(...prices) : 0,
      inStockVariants,
      totalVariants: selectedProduct.variants.length,
      inCartQuantity,
      reviews: "нет подключенных отзывов",
      rating: "нет рейтинга",
      priceHistory: "история цены не подключена",
      demand: inCartQuantity > 0 ? "есть спрос в текущем заказе" : "событий спроса пока нет",
    };
  }, [items, selectedProduct]);
  const marketQuoteRows = useMemo(() => {
    return marketProducts
      .map((product) => {
        const prices = collectProductPrices(product);
        const minPrice = prices.length ? Math.min(...prices) : 0;
        const maxPrice = prices.length ? Math.max(...prices) : 0;
        const inStockVariants = product.variants.filter((variant) => variant.inStock).length;
        const inCartQuantity = items
          .filter((item) => item.productName === product.name)
          .reduce((sum, item) => sum + Number(item.quantity || 0), 0);

        return {
          id: product.id,
          product,
          name: product.name,
          category: product.category?.name || activeMarketShop?.category || "Категория",
          minPrice,
          maxPrice,
          variantsCount: product.variants.length,
          inStockVariants,
          inCartQuantity,
        };
      })
      .sort((a, b) => (a.minPrice || Number.MAX_SAFE_INTEGER) - (b.minPrice || Number.MAX_SAFE_INTEGER))
      .slice(0, 8);
  }, [activeMarketShop, items, marketProducts]);
  const marketPriceIntelligence = useMemo(() => {
    const points = marketProducts.flatMap((product) => {
      const inCartQuantity = items
        .filter((item) => item.productName === product.name)
        .reduce((sum, item) => sum + Number(item.quantity || 0), 0);
      return collectMarketPricePoints(
        product,
        product.category?.name || activeMarketShop?.category || "Категория",
        inCartQuantity,
      );
    });

    return buildMarketPriceIntelligence(points);
  }, [activeMarketShop, items, marketProducts]);
  const marketQuoteMaxPrice = useMemo(
    () => Math.max(1, ...marketQuoteRows.map((row) => row.maxPrice || row.minPrice || 1)),
    [marketQuoteRows]
  );
  const marketAveragePrice = useMemo(() => {
    const prices = marketProducts.flatMap(collectProductPrices);
    if (!prices.length) return 0;
    return Math.round(prices.reduce((sum, price) => sum + price, 0) / prices.length);
  }, [marketProducts]);
  const marketPriceStats = useMemo(() => {
    const prices = marketProducts.flatMap(collectProductPrices);
    const inStockProducts = marketProducts.filter((product) => product.variants.some((variant) => variant.inStock)).length;
    const withPriceProducts = marketProducts.filter((product) => collectProductPrices(product).length > 0).length;
    const inCartProducts = marketProducts.filter((product) => isProductInCart(product)).length;

    return {
      minPrice: prices.length ? Math.min(...prices) : 0,
      maxPrice: prices.length ? Math.max(...prices) : 0,
      averagePrice: prices.length ? Math.round(prices.reduce((sum, price) => sum + price, 0) / prices.length) : 0,
      inStockProducts,
      withPriceProducts,
      inCartProducts,
    };
  }, [isProductInCart, marketProducts]);
  const marketDemandProductNames = useMemo(
    () => marketProducts.slice(0, 10).map((product) => product.name),
    [marketProducts]
  );
  const yandexDemandProvider = marketDemand?.providers.find((provider) => provider.key === "yandex-wordstat") ?? null;
  const demandHeatmapRegions: Array<{ region: string; status: string; tone: number }> = [];
  const marketDemandStatusLabel = marketDemandLoading
    ? "проверяем API"
    : yandexDemandProvider?.connected
      ? "Yandex готов"
      : marketDemand
        ? "нужен ключ Yandex"
        : "ожидает проверки";
  const directStatusLabel = directStatusLoading
    ? "проверяем Direct"
    : directStatus?.connected
      ? `Direct готов: ${directStatus.campaignsCount} камп.`
      : directStatus?.configured
        ? "Direct требует доступ"
        : "Direct не настроен";

  useEffect(() => {
    if (terminalMode !== "MARKET") return;
    const controller = new AbortController();
    const params = new URLSearchParams({
      category: activeMarketShop?.category || "пиломатериалы",
      activity: "продажа пиломатериалов",
      region: "Россия",
      language: "ru",
    });
    marketDemandProductNames.forEach((name) => params.append("product", name));

    setMarketDemandLoading(true);
    setMarketDemandError("");
    fetch(`/api/admin/market-demand?${params.toString()}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("Не удалось получить план спроса");
        return res.json() as Promise<MarketDemandResponse>;
      })
      .then((data) => {
        setMarketDemand(data);
        setMarketDemandError("");
      })
      .catch((err) => {
        if (err?.name !== "AbortError") {
          setMarketDemandError("Yandex сейчас не ответил. Цены из каталога работают, спрос не выдумываем.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setMarketDemandLoading(false);
      });

    return () => controller.abort();
  }, [activeMarketShop?.category, marketDemandProductNames, terminalMode]);

  useEffect(() => {
    if (terminalMode !== "MARKET") return;
    const controller = new AbortController();

    setDirectStatusLoading(true);
    fetch("/api/admin/direct/status", {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("Direct status failed");
        return res.json() as Promise<YandexDirectStatus>;
      })
      .then((data) => setDirectStatus(data))
      .catch((err) => {
        if (err?.name !== "AbortError") {
          setDirectStatus({
            configured: false,
            connected: false,
            campaignsCount: 0,
            campaigns: [],
            error: "Direct статус не загрузился",
          });
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setDirectStatusLoading(false);
      });

    return () => controller.abort();
  }, [terminalMode]);

  const marketHeaderSubtitle = useMemo(() => {
    const category = activeMarketShop?.category || "Все категории";
    const shop = activeMarketShop?.name?.replace(/\s*·\s*ПилоРус$/, "") || "ПилоРус";
    return `${category} → ${shop} · ${marketProducts.length} поз.`;
  }, [activeMarketShop, marketProducts.length]);
  const marketHeaderContextKey = `${terminalMode}:${marketCategory}:${marketShop}:${marketProducts.length}`;
  const marketHeaderContext = useMemo(() => {
    if (terminalMode !== "MARKET") return null;

    return (
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={() => setShowMarketInsights(true)}
          className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-3 text-xs font-semibold text-primary transition-colors hover:bg-primary/15"
          title="Открыть сводку"
        >
          <TrendingUp className="h-4 w-4 shrink-0" />
          Сводка
        </button>
      </div>
    );
  }, [terminalMode]);

  const availableUnits = useMemo((): Array<"CUBE" | "PIECE"> => {
    if (!selectedProduct) return ["CUBE", "PIECE"];
    const { saleUnit } = selectedProduct;
    const hasCube = saleUnit !== "PIECE" && (selectedVariant ? selectedVariant.pricePerCube != null : true);
    const hasPiece = saleUnit !== "CUBE" && (selectedVariant ? selectedVariant.pricePerPiece != null : true);
    const units: Array<"CUBE" | "PIECE"> = [];
    if (hasCube) units.push("CUBE");
    if (hasPiece) units.push("PIECE");
    return units.length > 0 ? units : ["CUBE"];
  }, [selectedProduct, selectedVariant]);

  const handleSelectProduct = useCallback((product: Product) => {
    setSelectedProductId(product.id);
    setSelectedVariantId("");
    setProductSearch("");
    if (product.saleUnit === "CUBE") setUnitType("CUBE");
    else if (product.saleUnit === "PIECE") setUnitType("PIECE");
    // auto-select first in-stock variant
    const firstVariant = product.variants.find((v) => v.inStock) || product.variants[0];
    if (firstVariant) setSelectedVariantId(firstVariant.id);
  }, []);

  useEffect(() => {
    if (!selectedProduct) return;
    const variant = selectedProduct.variants.find((v) => v.id === selectedVariantId);
    if (!variant) return;
    const hasCube = selectedProduct.saleUnit !== "PIECE" && variant.pricePerCube != null;
    const hasPiece = selectedProduct.saleUnit !== "CUBE" && variant.pricePerPiece != null;
    if (unitType === "CUBE" && !hasCube && hasPiece) setUnitType("PIECE");
    if (unitType === "PIECE" && !hasPiece && hasCube) setUnitType("CUBE");
  }, [selectedProduct, selectedVariantId, unitType]);

  const itemPrice = useMemo(() => {
    if (!selectedVariant) return 0;
    if (unitType === "CUBE") return Number(selectedVariant.pricePerCube ?? 0);
    return Number(selectedVariant.pricePerPiece ?? 0);
  }, [selectedVariant, unitType]);

  const addItem = useCallback(() => {
    if (!selectedProduct || !selectedVariant || !selectedVariant.inStock || !itemPrice || quantity <= 0) return;
    const name = selectedProduct.name;
    const shouldOpenMobileCart = typeof window !== "undefined" && window.innerWidth < 768;
    setItems((prev) => {
      const existingIndex = prev.findIndex((item) =>
        item.variantId === selectedVariantId &&
        item.unitType === unitType &&
        item.price === itemPrice
      );

      if (existingIndex >= 0) {
        return prev.map((item, index) =>
          index === existingIndex
            ? { ...item, quantity: +(item.quantity + quantity).toFixed(3) }
            : item
        );
      }

      return [
        ...prev,
        {
          variantId: selectedVariantId,
          productName: name,
          variantSize: selectedVariant.size,
          unitType,
          quantity,
          price: itemPrice,
        },
      ];
    });
    setOrderPanelView("cart");
    setAddedFlash(name);
    setTimeout(() => setAddedFlash(null), 1500);
    setSelectedProductId("");
    setSelectedVariantId("");
    setProductSearch("");
    setQuantity(1);
    if (shouldOpenMobileCart) {
      setShowMobileCart(true);
      searchRef.current?.blur();
    } else if (shouldRestoreTerminalSearchFocus()) {
      window.requestAnimationFrame(() => searchRef.current?.focus({ preventScroll: true }));
    } else {
      searchRef.current?.blur();
    }
  }, [selectedProduct, selectedVariant, selectedVariantId, itemPrice, unitType, quantity]);

  const removeItem = (i: number) => setItems((prev) => prev.filter((_, idx) => idx !== i));
  const updateQty = (i: number, q: number) => setItems((prev) => prev.map((it, idx) => idx === i ? { ...it, quantity: q } : it));
  const repeatOrder = useCallback((order: RecentOrder) => {
    setItems(order.items);
    setDeliveryCost(order.deliveryCost || 0);
    setDeliveryCostInput(order.deliveryCost ? String(order.deliveryCost) : "");
    setForm((current) => ({
      ...current,
      fulfillmentType: order.fulfillmentType || current.fulfillmentType,
      fulfillmentDetail: current.fulfillmentDetail || order.fulfillmentDetail || order.deliveryAddress || "",
      paymentMethod: order.paymentMethod || current.paymentMethod,
      comment: current.comment || order.comment || "",
    }));
    setAddedFlash(`Повтор заказа #${order.orderNumber}`);
    setTimeout(() => setAddedFlash(null), 1500);
    setOrderPanelView("cart");
    if (typeof window !== "undefined" && window.innerWidth < 768) setShowMobileCart(true);
  }, []);

  const addFavoriteItem = useCallback((favorite: CartItem) => {
    setItems((prev) => {
      const existingIndex = prev.findIndex((item) =>
        item.variantId === favorite.variantId &&
        item.unitType === favorite.unitType &&
        item.price === favorite.price
      );

      if (existingIndex >= 0) {
        return prev.map((item, index) =>
          index === existingIndex
            ? { ...item, quantity: +(item.quantity + favorite.quantity).toFixed(3) }
            : item
        );
      }

      return [...prev, favorite];
    });
    setOrderPanelView("cart");
    setAddedFlash(`Добавлено: ${favorite.productName}`);
    setTimeout(() => setAddedFlash(null), 1500);
  }, []);

  const hasCapability = useCallback((key: TerminalCapabilityKey) => enabledCapabilities.includes(key), [enabledCapabilities]);
  const visibleWorkModes = useMemo(
    () => WORK_MODES.filter((mode) => hasCapability(mode.capability as TerminalCapabilityKey)),
    [hasCapability]
  );
  const visiblePaymentOptions = useMemo(
    () => PAYMENT_OPTS.filter((option) => hasCapability(option.capability as TerminalCapabilityKey)),
    [hasCapability]
  );
  const visibleReceiptModes = useMemo(
    () => RECEIPT_MODES.filter((mode) => hasCapability(mode.capability as TerminalCapabilityKey)),
    [hasCapability]
  );
  const visibleFulfillment = useMemo(() => terminalProfile.fulfillment.filter((option) => {
    if (option.value === "DELIVERY" || option.hasDeliveryCost) return hasCapability("delivery");
    if (option.value === "PICKUP" || option.value === "TAKEAWAY" || option.value === "COUNTER") return hasCapability("pickup");
    if (option.value === "DINE_IN") return hasCapability("tables");
    if (option.value === "APPOINTMENT" || option.value === "CHAIR" || option.value === "HOME_VISIT") return hasCapability("appointments");
    if (option.value === "BOOKING") return hasCapability("booking");
    return true;
  }), [hasCapability, terminalProfile.fulfillment]);
  const activeFulfillment =
    visibleFulfillment.find((option) => option.value === form.fulfillmentType) ||
    visibleFulfillment[0] ||
    terminalProfile.fulfillment[0];
  const hasClientContact = Boolean(form.guestName.trim() || form.guestPhone.trim());
  const clientReady = terminalMode === "REGISTER" || hasClientContact;
  const deliveryReady = Boolean(!activeFulfillment?.requiresDetail || form.fulfillmentDetail.trim());
  const terminalSteps = [
    { label: terminalProfile.customerNameLabel, ready: clientReady, icon: User },
    { label: "Позиции", ready: items.length > 0, icon: Package },
    { label: terminalProfile.fulfillmentTitle, ready: deliveryReady, icon: Truck },
    { label: "Оплата", ready: Boolean(form.paymentMethod), icon: CreditCard },
  ];
  const selectedPayment = visiblePaymentOptions.find((opt) => opt.value === form.paymentMethod) || visiblePaymentOptions[0] || PAYMENT_OPTS[0];
  const selectedReceiptMode = visibleReceiptModes.find((mode) => mode.value === receiptMode) || visibleReceiptModes[0] || RECEIPT_MODES[0];
  const activeShift = useMemo(() => {
    if (!openShifts.length) return null;
    return (
      openShifts.find((shift) => shift.workstationId && shift.workstationId === selectedWorkstationId) ||
      openShifts[0]
    );
  }, [openShifts, selectedWorkstationId]);
  const selectedWorkstation = useMemo(
    () => workstations.find((workstation) => workstation.id === selectedWorkstationId) || null,
    [selectedWorkstationId, workstations]
  );
  const activeShiftExpectedCash = activeShift
    ? Number(activeShift.openingCash || 0) + Number(activeShift.expectedCash || 0)
    : 0;
  const activeShiftOrders = Number(activeShift?.orderCount || 0);
  const activeShiftSales = Number(activeShift?.salesTotal || 0);
  const cashRegisterLocked = terminalMode === "REGISTER" && !activeShift;

  useAdminPageHeader(
    terminalMode === "MARKET"
      ? {
          title: "Биржа пиломатериалов",
          subtitle: marketHeaderSubtitle,
          backLabel: "Рабочий стол",
          backHref: "/admin",
          logoSrc: "aray",
          logoAlt: "ARAY Production",
          context: marketHeaderContext,
          contextKey: marketHeaderContextKey,
        }
      : terminalMode === "REGISTER"
        ? {
            title: "Касса",
            subtitle: activeShift ? "смена открыта · можно пробивать продажу" : "откройте смену перед продажей",
            backLabel: "Заказы",
            backHref: "/admin/orders",
            contextKey: `register:${activeShift?.id || "closed"}`,
          }
        : {
            title: "Новый заказ",
            subtitle: `${items.length} поз. · ${fmt(totalAmount)}`,
            backLabel: "Заказы",
            backHref: "/admin/orders",
            contextKey: `order:${items.length}:${totalAmount}`,
          }
  );

  const activeSettingsSection = TERMINAL_SETTINGS_SECTIONS.find((section) => section.id === terminalSettingsSection) || TERMINAL_SETTINGS_SECTIONS[0];
  const ActiveSettingsIcon = activeSettingsSection.icon;
  const profileRelevantCapabilitySet = useMemo(
    () => new Set(PROFILE_RELEVANT_CAPABILITIES[terminalProfile.key] || PROFILE_RELEVANT_CAPABILITIES.universal),
    [terminalProfile.key]
  );
  const visibleSettingsCapabilities = useMemo(() => {
    const keys = TERMINAL_SETTINGS_CAPABILITIES[terminalSettingsSection] || [];
    return keys
      .filter((key) =>
        profileRelevantCapabilitySet.has(key) ||
        enabledCapabilities.includes(key) ||
        ALWAYS_ON_TERMINAL_CAPABILITIES.includes(key)
      )
      .map((key) => TERMINAL_CAPABILITIES[key])
      .filter(Boolean);
  }, [enabledCapabilities, profileRelevantCapabilitySet, terminalSettingsSection]);
  const hiddenSettingsCount = useMemo(() => {
    const keys = TERMINAL_SETTINGS_CAPABILITIES[terminalSettingsSection] || [];
    return keys.filter((key) =>
      !profileRelevantCapabilitySet.has(key) &&
      !enabledCapabilities.includes(key) &&
      !ALWAYS_ON_TERMINAL_CAPABILITIES.includes(key)
    ).length;
  }, [enabledCapabilities, profileRelevantCapabilitySet, terminalSettingsSection]);
  const salesScripts = useMemo(
    () => PROFILE_SALES_SCRIPTS[terminalProfile.key] || PROFILE_SALES_SCRIPTS.universal || SCRIPTS,
    [terminalProfile.key]
  );
  const shiftTimeline = useMemo(() => {
    const events = [];
    if (activeShift) {
      events.push({
        label: "Смена открыта",
        text: `${activeShift.workstation?.name || selectedWorkstation?.name || "Мобильная касса"} · ${new Date(activeShift.openedAt).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}`,
      });
      if (activeShiftOrders > 0) {
        events.push({ label: "Продажи", text: `${activeShiftOrders} заказов · ${fmt(activeShiftSales)}` });
      }
      events.push({ label: "К закрытию", text: `ожидаем наличные ${fmt(activeShiftExpectedCash)}` });
    }
    recentShifts.slice(0, 3).forEach((shift) => {
      events.push({
        label: "Смена закрыта",
        text: `${shift.workstation?.name || "Мобильная касса"} · ${fmt(Number(shift.salesTotal || 0))}`,
      });
    });
    return events;
  }, [activeShift, activeShiftExpectedCash, activeShiftOrders, activeShiftSales, recentShifts, selectedWorkstation]);
  const capabilityStatusLabel: Record<string, string> = {
    CORE: "работает",
    BETA: "бета",
    NEEDS_PROVIDER: "провайдер",
    NEEDS_CONNECTOR: "коннектор",
  };
  useEffect(() => {
    if (visibleWorkModes.length && !visibleWorkModes.some((mode) => mode.value === workMode)) {
      setWorkMode(visibleWorkModes[0].value);
    }
    if (visiblePaymentOptions.length && !visiblePaymentOptions.some((option) => option.value === form.paymentMethod)) {
      setForm((current) => ({ ...current, paymentMethod: visiblePaymentOptions[0].value }));
    }
    if (visibleReceiptModes.length && !visibleReceiptModes.some((mode) => mode.value === receiptMode)) {
      setReceiptMode(visibleReceiptModes[0].value);
    }
    if (visibleFulfillment.length && !visibleFulfillment.some((option) => option.value === form.fulfillmentType)) {
      setForm((current) => ({ ...current, fulfillmentType: visibleFulfillment[0].value, fulfillmentDetail: "" }));
    }
  }, [form.fulfillmentType, form.paymentMethod, receiptMode, visibleFulfillment, visiblePaymentOptions, visibleReceiptModes, visibleWorkModes, workMode]);
  const submitLabel = form.paymentMethod === "QR / ссылка"
    ? "Создать заказ и QR"
    : form.paymentMethod === "Безнал по счёту"
      ? "Создать заказ и счёт"
      : "Создать заказ";
  const orderActionLabel = !clientReady || !deliveryReady ? "Перейти к оформлению" : submitLabel;
  const orderFooterActionLabel =
    orderPanelView === "checkout" && (!clientReady || !deliveryReady)
      ? "Проверить оформление"
      : orderActionLabel;
  const contactSourceLabel =
    form.contactMethod === "WEBSITE"
      ? "Заявка / сайт"
      : form.contactMethod === "MESSENGER"
        ? "Мессенджер"
        : terminalProfile.sourceLabel;
  const contactSourcePlaceholder =
    form.contactMethod === "WEBSITE"
      ? "site, лендинг, номер заявки"
      : form.contactMethod === "MESSENGER"
        ? "@username или WhatsApp"
        : terminalProfile.sourcePlaceholder;

  const saveTerminalModules = async (nextModules = enabledCapabilities) => {
    setTerminalSettingsBusy("modules");
    setTerminalSettingsMessage("");
    try {
      const res = await fetch("/api/admin/terminal/assistant-actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "set_modules",
          profile: terminalProfile.key,
          modules: nextModules,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setTerminalSettingsMessage(data.error || "Не получилось сохранить модули");
        return;
      }
      if (Array.isArray(data.enabledModules)) {
        setEnabledCapabilities(data.enabledModules);
      }
      setTerminalSettingsMessage(data.message || "Настройки терминала сохранены");
    } catch {
      setTerminalSettingsMessage("Ошибка сети при сохранении модулей");
    } finally {
      setTerminalSettingsBusy("");
    }
  };

  const runAutoconfig = async () => {
    setTerminalSettingsBusy("autoconfig");
    setTerminalSettingsMessage("");
    try {
      const res = await fetch("/api/admin/terminal/assistant-actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "apply_autoconfig" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setTerminalSettingsMessage(data.error || "Не получилось применить автонастройку");
        return;
      }
      if (data.config?.profile) setTerminalProfile(data.config.profile);
      if (Array.isArray(data.config?.enabledModules)) setEnabledCapabilities(data.config.enabledModules);
      setTerminalSettingsMessage(data.message || "Автонастройка применена");
    } catch {
      setTerminalSettingsMessage("Ошибка сети при автонастройке");
    } finally {
      setTerminalSettingsBusy("");
    }
  };

  const toggleTerminalCapability = (key: TerminalCapabilityKey) => {
    if (ALWAYS_ON_TERMINAL_CAPABILITIES.includes(key)) return;
    setEnabledCapabilities((current) =>
      current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key]
    );
  };

  const openCashShift = async () => {
    if (shiftBusy) return;
    setShiftBusy("open");
    setShiftMessage("");
    const amount = Number(openingCash || 0);
    if (!Number.isFinite(amount) || amount < 0) {
      setShiftMessage("Проверьте стартовую сумму наличных");
      setShiftBusy("");
      return;
    }

    try {
      const res = await fetch("/api/admin/terminal/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "open",
          workstationId: selectedWorkstationId || null,
          openingCash: amount,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setShiftMessage(data.error || "Не получилось открыть кассу");
        return;
      }

      if (data.shift) {
        setOpenShifts((current) => [data.shift, ...current.filter((shift) => shift.id !== data.shift.id)]);
        setSelectedWorkstationId(data.shift.workstationId || selectedWorkstationId);
      }
      setWorkMode("STATION");
      setShiftMessage("Касса открыта. Время и сотрудник записаны автоматически.");
      setCashCloseOpen(false);
      setCashCenterOpen(true);
      setCashCenterTab("overview");
      loadShiftState().catch(() => {});
    } catch {
      setShiftMessage("Ошибка сети при открытии кассы");
    } finally {
      setShiftBusy("");
    }
  };

  const closeCashShift = async () => {
    if (!activeShift || shiftBusy) return;
    setShiftBusy("close");
    setShiftMessage("");
    const amount = Number(closingCash || activeShiftExpectedCash || 0);
    if (!Number.isFinite(amount) || amount < 0) {
      setShiftMessage("Проверьте фактические наличные перед закрытием смены");
      setShiftBusy("");
      return;
    }

    try {
      const res = await fetch("/api/admin/terminal/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "close",
          shiftId: activeShift.id,
          actualCash: amount,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setShiftMessage(data.error || "Не получилось закрыть кассу");
        return;
      }

      setOpenShifts((current) => current.filter((shift) => shift.id !== activeShift.id));
      setClosingCash("");
      setCashCloseOpen(false);
      setCashCenterOpen(true);
      setCashCenterTab("reports");
      setShiftMessage("Смена закрыта. Отчёт, журнал действий и расхождение сохранены.");
      loadShiftState().catch(() => {});
    } catch {
      setShiftMessage("Ошибка сети при закрытии кассы");
    } finally {
      setShiftBusy("");
    }
  };

  const handleSubmit = async () => {
    if (saving) return;
    if (items.length === 0) { setError("Добавьте хотя бы одну позицию"); return; }
    if (!clientReady || !deliveryReady) {
      setOrderPanelView("checkout");
      setShowClientForm(true);
      setError(
        !clientReady && !deliveryReady
          ? `Укажите клиента и ${activeFulfillment.detailLabel.toLowerCase()}`
          : !clientReady
            ? "Укажите имя или телефон клиента"
            : `Укажите ${activeFulfillment.detailLabel.toLowerCase()}`
      );
      return;
    }
    if (terminalMode === "REGISTER" && !activeShift) {
      setError("Для кассовой продажи сначала откройте смену или переключитесь в режим «Заказы»");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          guestName: form.guestName || (activeFulfillment?.label ? `${activeFulfillment.label}` : "Клиент"),
          deliveryAddress: form.fulfillmentDetail,
          terminalProfile: terminalProfile.key,
          items,
          totalAmount,
          deliveryCost,
          workMode: terminalMode === "REGISTER" ? "STATION" : workMode,
          receiptMode,
          shiftId: terminalMode === "REGISTER" && activeShift ? activeShift.id : null,
        }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error || "Ошибка"); return; }
      const data = await res.json();
      if (typeof window !== "undefined") window.localStorage.removeItem(TERMINAL_DRAFT_STORAGE_KEY);
      router.push(`/admin/orders/${data.id}`);
    } catch { setError("Ошибка сети"); }
    finally { setSaving(false); }
  };

  return (
    <div className="min-h-[calc(100dvh-148px)] md:h-[calc(100vh-84px)] flex flex-col overflow-visible md:overflow-hidden">
      {/* ── Top bar ── */}
      <div className="border-b border-border bg-card shrink-0">
        <div className="flex flex-col gap-2 px-3 py-2 md:px-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-center gap-2 overflow-x-auto scrollbar-hide">
            <span className="shrink-0 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
              Терминал
            </span>
            <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${
              terminalMode === "REGISTER" && activeShift
                ? "border-primary/30 bg-primary/10 text-primary"
                : "border-border bg-background text-muted-foreground"
            }`}>
              {terminalMode === "REGISTER"
                ? (activeShift ? "смена открыта" : "касса закрыта")
                : `${items.length} поз. · ${fmt(totalAmount)}`}
            </span>
            <div className="hidden min-w-0 items-center gap-1 lg:flex">
              {terminalSteps.map((step) => {
                const Icon = step.icon;
                return (
                  <span
                    key={step.label}
                    className={`flex h-8 shrink-0 items-center gap-1.5 rounded-xl border px-2.5 text-[11px] font-medium ${
                      step.ready
                        ? "border-primary/30 bg-primary/10 text-primary"
                        : "border-border bg-background text-muted-foreground"
                    }`}
                  >
                    {step.ready ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                    {step.label}
                  </span>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
            <div className="hidden shrink-0 rounded-2xl border border-border bg-background p-1 sm:flex">
              <button
                type="button"
                onClick={() => router.push("/admin/crm")}
                className="flex h-9 items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-semibold text-muted-foreground transition-colors hover:bg-primary/[0.08] hover:text-foreground"
              >
                <User className="h-3.5 w-3.5" />
                CRM
              </button>
            </div>
            <div className="flex rounded-2xl border border-border bg-background p-1">
              {TERMINAL_MODES.map((mode) => {
                const Icon = mode.icon;
                const selected = terminalMode === mode.value;
                return (
                  <button
                    key={mode.value}
                    type="button"
                    onClick={() => {
                      setTerminalMode(mode.value);
                      if (mode.value === "REGISTER") setWorkMode("STATION");
                      if (mode.value === "ORDER" && workMode === "STATION") setWorkMode("MOBILE");
                    }}
                    className={`flex h-10 min-w-24 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-semibold transition-colors ${
                      selected ? SOFT_SELECTED_CLASS : "border-transparent text-muted-foreground hover:border-primary/30 hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {mode.label}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => { setShowScripts(false); setShowTerminalSettings(true); }}
              className={`flex h-10 items-center gap-1.5 rounded-xl border px-3 text-sm font-medium transition-colors ${
                showTerminalSettings ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
              }`}
            >
              <Settings2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Настройки</span>
            </button>
            <button
              type="button"
              onClick={() => { setShowTerminalSettings(false); setShowScripts((v) => !v); }}
              className={`flex h-10 items-center gap-1.5 rounded-xl border px-3 text-sm font-medium transition-colors ${showScripts ? SOFT_SELECTED_CLASS : "border-border text-muted-foreground hover:text-foreground hover:border-primary/30"}`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Скрипты</span>
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving || items.length === 0}
              className="hidden h-10 items-center gap-1.5 rounded-xl border border-primary/45 bg-primary/10 px-4 text-sm font-semibold text-primary transition-colors hover:bg-primary/15 disabled:opacity-40 md:flex"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {orderActionLabel}
            </button>
          </div>
        </div>

        {terminalMode === "REGISTER" && (
          <div className={`border-t border-border px-3 py-2 md:px-4 ${
            activeShift ? "bg-primary/5" : "bg-primary/[0.035]"
          }`}>
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
              <div className="flex items-start gap-3 min-w-0">
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl shrink-0 ${
                  activeShift ? "bg-primary/10 text-primary" : "bg-background text-muted-foreground"
                }`}>
                  <Banknote className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    {activeShift ? "Смена открыта" : "Касса закрыта"}
                    {!activeShift && (
                      <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                        сначала смена
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {activeShift
                      ? `${activeShift.workstation?.name || selectedWorkstation?.name || "Рабочее место"} · ${new Date(activeShift.openedAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })} · старт ${fmt(Number(activeShift.openingCash || 0))}`
                      : "Перед продажами выберите рабочее место и введите наличные в кассе. Время и сотрудник запишутся автоматически."}
                  </p>
                </div>
              </div>

              {activeShift ? (
                <div className="grid grid-cols-4 gap-2 sm:flex sm:items-center sm:justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setCashCenterTab("overview");
                      setCashCenterOpen(true);
                    }}
                    className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-border bg-background px-3 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
                  >
                    <Banknote className="h-3.5 w-3.5" />
                    Смена
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCashCenterTab("reports");
                      setCashCenterOpen(true);
                    }}
                    className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-border bg-background px-3 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
                  >
                    <ReceiptText className="h-3.5 w-3.5" />
                    Отчёты
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCashCenterTab("journal");
                      setCashCenterOpen(true);
                    }}
                    className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-border bg-background px-3 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
                  >
                    <History className="h-3.5 w-3.5" />
                    Журнал
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setClosingCash(String(activeShiftExpectedCash || ""));
                      setCashCloseOpen(true);
                    }}
                    className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-primary/40 bg-primary/10 px-3 text-xs font-semibold text-primary transition-colors hover:bg-primary/15"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Закрыть
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_160px_auto] lg:w-[620px]">
                  <select
                    value={selectedWorkstationId}
                    onChange={(e) => setSelectedWorkstationId(e.target.value)}
                    className="h-11 rounded-xl border border-border bg-background px-3 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 sm:text-sm"
                    disabled={shiftLoading || shiftBusy === "open"}
                  >
                    <option value="">Мобильная касса</option>
                    {workstations.map((workstation) => (
                      <option key={workstation.id} value={workstation.id}>{workstation.name}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={0}
                    value={openingCash}
                    onChange={(e) => setOpeningCash(e.target.value)}
                    placeholder="Наличные на старте"
                    className="h-11 rounded-xl border border-border bg-background px-3 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 sm:text-sm"
                  />
                  <button
                    type="button"
                    onClick={openCashShift}
                    disabled={shiftBusy === "open"}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-primary/55 bg-primary/15 px-4 text-sm font-semibold text-primary transition-colors hover:bg-primary/20 disabled:opacity-50"
                  >
                    {shiftBusy === "open" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    Открыть кассу
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCashCenterTab("overview");
                      setCashCenterOpen(true);
                    }}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 text-sm font-semibold text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground sm:col-span-3"
                  >
                    <ReceiptText className="h-4 w-4" />
                    Как работает смена
                  </button>
                </div>
              )}
            </div>

            {!activeShift && (
              <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                {[
                  ["1", "Выберите рабочее место"],
                  ["2", "Введите стартовые наличные"],
                  ["3", "Откройте смену и продавайте"],
                ].map(([step, text]) => (
                  <div key={step} className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-[11px] font-bold text-primary">
                      {step}
                    </span>
                    <span>{text}</span>
                  </div>
                ))}
              </div>
            )}

            {activeShift && (
              <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                <div className="rounded-xl border border-border bg-background px-3 py-2">
                  <p className="text-muted-foreground">Ожидаем наличные</p>
                  <p className="mt-1 font-semibold text-foreground">{fmt(activeShiftExpectedCash)}</p>
                </div>
                <div className="rounded-xl border border-border bg-background px-3 py-2">
                  <p className="text-muted-foreground">Продажи смены</p>
                  <p className="mt-1 font-semibold text-foreground">{fmt(activeShiftSales)}</p>
                </div>
                <div className="rounded-xl border border-border bg-background px-3 py-2">
                  <p className="text-muted-foreground">Заказы</p>
                  <p className="mt-1 font-semibold text-foreground">{activeShiftOrders}</p>
                </div>
              </div>
            )}

            {shiftMessage && (
              <p className="mt-2 text-xs text-muted-foreground">{shiftMessage}</p>
            )}
          </div>
        )}

      </div>

      {activeShift && (
        <AdminModal
          open={cashCloseOpen}
          onClose={() => setCashCloseOpen(false)}
          title="Закрыть смену"
          subtitle="Проверьте наличные, отчёт и расхождение перед закрытием."
          size="md"
          bodyClassName="space-y-3 p-4 sm:p-5"
          footer={(
            <>
              <button
                type="button"
                onClick={() => setCashCloseOpen(false)}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-border bg-background px-4 text-sm font-semibold text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={closeCashShift}
                disabled={shiftBusy === "close"}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-primary/45 bg-primary/10 px-4 text-sm font-semibold text-primary transition-colors hover:bg-primary/15 disabled:opacity-50"
              >
                {shiftBusy === "close" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Закрыть
              </button>
            </>
          )}
        >
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="rounded-xl border border-border bg-background px-3 py-2">
                  <p className="text-muted-foreground">Старт</p>
                  <p className="mt-1 font-semibold text-foreground">{fmt(Number(activeShift.openingCash || 0))}</p>
                </div>
                <div className="rounded-xl border border-border bg-background px-3 py-2">
                  <p className="text-muted-foreground">Продажи</p>
                  <p className="mt-1 font-semibold text-foreground">{fmt(activeShiftSales)}</p>
                </div>
                <div className="rounded-xl border border-border bg-background px-3 py-2">
                  <p className="text-muted-foreground">Ожидаем</p>
                  <p className="mt-1 font-semibold text-foreground">{fmt(activeShiftExpectedCash)}</p>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-foreground">Фактические наличные</label>
                <input
                  type="number"
                  min={0}
                  value={closingCash}
                  onChange={(e) => setClosingCash(e.target.value)}
                  placeholder="Сколько денег в кассе сейчас"
                  className="h-12 w-full rounded-xl border border-border bg-background px-3 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  Карта, онлайн-оплата и QR будут сверяться отдельными платежными статусами.
                </p>
              </div>
        </AdminModal>
      )}

      {cashCenterOpen && (
        <AdminModal
          open
          onClose={() => setCashCenterOpen(false)}
          title="Кассовая смена"
          subtitle="Открытие, закрытие, отчёты и журнал действий без выхода из терминала."
          size="lg"
          bodyClassName="p-0"
          headerActions={(
            <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${
              activeShift ? "border-primary/35 bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground"
            }`}>
              {activeShift ? "открыта" : "закрыта"}
            </span>
          )}
          footer={(
            <>
              {activeShift && (
                <button
                  type="button"
                  onClick={() => {
                    setClosingCash(String(activeShiftExpectedCash || ""));
                    setCashCenterOpen(false);
                    setCashCloseOpen(true);
                  }}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-primary/45 bg-primary/10 px-4 text-sm font-semibold text-primary transition-colors hover:bg-primary/15"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Закрыть смену
                </button>
              )}
              <button
                type="button"
                onClick={() => setCashCenterOpen(false)}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-border bg-background px-4 text-sm font-semibold text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
              >
                Готово
              </button>
            </>
          )}
        >

            <div className="flex gap-2 overflow-x-auto border-b border-border px-4 py-3 scrollbar-hide">
              {[
                { id: "overview", label: "Смена", icon: Banknote },
                { id: "reports", label: "Отчёты", icon: ReceiptText },
                { id: "journal", label: "Журнал", icon: History },
              ].map((tab) => {
                const Icon = tab.icon;
                const selected = cashCenterTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setCashCenterTab(tab.id as CashCenterTab)}
                    className={`inline-flex h-10 items-center gap-2 rounded-xl border px-3 text-sm font-semibold transition-colors ${
                      selected ? SOFT_SELECTED_CLASS : "border-border bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {cashCenterTab === "overview" && (
                <div className="space-y-4">
                  <div className="grid gap-2 sm:grid-cols-4">
                    {[
                      ["Старт", fmt(Number(activeShift?.openingCash || 0))],
                      ["Ожидаем", fmt(activeShiftExpectedCash)],
                      ["Продажи", fmt(activeShiftSales)],
                      ["Заказы", String(activeShiftOrders)],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-xl border border-border bg-background px-3 py-3">
                        <p className="text-xs text-muted-foreground">{label}</p>
                        <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-2xl border border-border bg-background p-4">
                    <p className="text-sm font-semibold">Порядок работы</p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {[
                        ["1", "Открыть кассу", "Выбрать рабочее место и внести стартовые наличные."],
                        ["2", "Пробивать заказы", "Продажи, телефонные заказы и сайт идут в общий контур заказов."],
                        ["3", "Закрыть смену", "Ввести фактические наличные, система посчитает расхождение."],
                        ["4", "Отчёт руководителю", "Смена остаётся в журнале; PDF/отправку включим как подключаемый модуль."],
                      ].map(([step, title, text]) => (
                        <div key={step} className="rounded-xl border border-border bg-muted/15 p-3">
                          <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-primary/10 text-xs font-bold text-primary">{step}</span>
                          <p className="mt-2 text-sm font-semibold">{title}</p>
                          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{text}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {!activeShift && (
                    <div className="admin-alert admin-alert-info">
                      <Info className="h-4 w-4 shrink-0" />
                      <span>Касса закрыта. Для кассовой продажи откройте смену сверху; для телефонного заказа можно работать в режиме «Заказы».</span>
                    </div>
                  )}
                </div>
              )}

              {cashCenterTab === "reports" && (
                <div className="space-y-3">
                  <div className="rounded-2xl border border-border bg-background p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">Отчёт текущей смены</p>
                        <p className="mt-1 text-xs text-muted-foreground">PDF, отправка руководителю и фискальные отчёты помечены как бета до подключения провайдера.</p>
                      </div>
                      <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">бета</span>
                    </div>
                  </div>
                  {[activeShift, ...recentShifts.slice(0, 6)].filter(Boolean).map((shift) => (
                    <div key={shift!.id} className="rounded-xl border border-border bg-background p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold">{shift!.workstation?.name || "Мобильная касса"}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {new Date(shift!.openedAt).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                            {shift!.closedAt ? ` - ${new Date(shift!.closedAt).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}` : " - сейчас"}
                          </p>
                        </div>
                        <p className="text-sm font-bold text-primary">{fmt(Number(shift!.salesTotal || 0))}</p>
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                        <span className="rounded-xl border border-border bg-muted/15 px-2 py-2">Наличные {fmt(Number(shift!.expectedCash || 0))}</span>
                        <span className="rounded-xl border border-border bg-muted/15 px-2 py-2">Заказы {Number(shift!.orderCount || 0)}</span>
                        <span className="rounded-xl border border-border bg-muted/15 px-2 py-2">Разница {fmt(Number(shift!.cashDelta || 0))}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {cashCenterTab === "journal" && (
                <div className="space-y-2">
                  {shiftTimeline.length ? shiftTimeline.map((event, index) => (
                    <div key={`${event.label}-${index}`} className="flex gap-3 rounded-xl border border-border bg-background p-3">
                      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                      <div>
                        <p className="text-sm font-semibold">{event.label}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{event.text}</p>
                      </div>
                    </div>
                  )) : (
                    <div className="rounded-2xl border border-border bg-background p-4 text-sm text-muted-foreground">
                      Журнал появится после открытия первой смены.
                    </div>
                  )}
                </div>
              )}
            </div>

        </AdminModal>
      )}

      {/* ── Main POS Layout ── */}
      <div className="flex flex-1 overflow-visible md:overflow-hidden relative">

        {/* ── LEFT: Product Catalog ── */}
        <div className="flex flex-col flex-1 overflow-visible border-r border-border md:overflow-hidden">
          {/* Search bar */}
          <div className="sticky top-16 z-30 border-b border-border bg-card/95 px-3 py-2 backdrop-blur supports-[backdrop-filter]:bg-card/85 md:static md:shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                ref={searchRef}
                type="text"
                placeholder={
                  cashRegisterLocked
                    ? "Откройте кассу, чтобы начать продажу"
                    : terminalMode === "MARKET"
                      ? "Категория, магазин или товар..."
                      : "Найти товар, материал или услугу..."
                }
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                disabled={cashRegisterLocked}
                className="h-11 w-full rounded-xl border border-primary/20 bg-background py-2 pl-9 pr-8 text-sm focus:border-primary/45 focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-70"
              />
              {productSearch && (
                <button type="button" onClick={() => setProductSearch("")} className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-xl text-muted-foreground hover:text-foreground">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {terminalMode === "MARKET" && (
            <div className="sticky top-0 z-10 border-b border-border bg-card px-3 py-2">
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {marketCategories.map((cat) => (
                  <button
                    key={cat.slug}
                    type="button"
                    onClick={() => {
                      setMarketCategory(cat.slug);
                      setMarketShop("");
                      setSelectedProductId("");
                    }}
                    className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                      marketCategory === cat.slug
                        ? SOFT_SELECTED_CLASS
                        : "border-border bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground"
                    }`}
                  >
                    {cat.name}
                    <span className="ml-1 opacity-70">{cat.count}</span>
                  </button>
                ))}
                <span className="shrink-0 rounded-full border border-border bg-muted/25 px-3 py-1.5 text-xs font-semibold text-muted-foreground">
                  Акции: скоро
                </span>
                <span className="shrink-0 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
                  без выдуманных цифр
                </span>
              </div>
              <div className="mt-1 flex items-center gap-2 overflow-x-auto scrollbar-hide">
                {marketShops.map((shop) => (
                  <button
                    key={shop.id}
                    type="button"
                    onClick={() => {
                      setMarketShop(shop.id);
                      setSelectedProductId("");
                    }}
                    className={`shrink-0 rounded-2xl border px-3 py-2 text-left transition-colors ${
                      activeMarketShop?.id === shop.id
                        ? SOFT_SELECTED_CLASS
                        : "border-border bg-background text-foreground hover:border-primary/30"
                    }`}
                  >
                    <span className="block max-w-[220px] truncate text-sm font-semibold">{shop.name}</span>
                    <span className="mt-0.5 block text-[11px] text-muted-foreground">{shop.products.length} поз. · {shop.demand}</span>
                  </button>
                ))}
              </div>
              <div className="mt-2 flex items-center gap-2 overflow-x-auto scrollbar-hide">
                <button
                  type="button"
                  onClick={() => setShowMarketInsights(true)}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-primary/35 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/15"
                >
                  <TrendingUp className="h-3.5 w-3.5" />
                  Аналитика
                </button>
                {marketFilterPills.map((filter) => (
                  <button
                    key={filter.key}
                    type="button"
                    title={filter.hint}
                    onClick={() => setMarketFilter(filter.key)}
                    className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                      marketFilter === filter.key
                        ? SOFT_SELECTED_CLASS
                        : "border-border bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground"
                    }`}
                  >
                    {filter.label}
                    <span className="ml-1 opacity-70">{filter.count}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Category tabs */}
          <div className={`sticky top-[7.55rem] z-20 gap-1 overflow-x-auto border-b border-border bg-card/95 px-3 py-1.5 backdrop-blur supports-[backdrop-filter]:bg-card/85 md:static md:flex md:shrink-0 scrollbar-hide ${terminalMode === "MARKET" || cashRegisterLocked ? "hidden" : "flex"}`}>
            {categories.map((cat) => (
              <button
                key={cat.slug}
                onClick={() => setActiveCategory(cat.slug)}
                className={`shrink-0 rounded-xl border px-3 py-1 text-xs font-medium transition-colors ${activeCategory === cat.slug ? SOFT_SELECTED_CLASS : "border-transparent text-muted-foreground hover:border-primary/30 hover:text-foreground hover:bg-primary/[0.07]"}`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Product grid + variant selector */}
          <div className={`flex flex-col overflow-visible md:flex-1 md:min-h-0 md:overflow-hidden xl:flex-row ${cashRegisterLocked ? "hidden md:flex" : ""}`}>
            {/* Product grid */}
            <div className="overflow-visible p-3 pb-4 md:flex-1 md:overflow-y-auto md:pb-3">
              {cashRegisterLocked ? (
                <div className="flex min-h-[22rem] items-center justify-center">
                  <div className="w-full max-w-md rounded-2xl border border-border bg-card p-4 text-center shadow-sm">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <Banknote className="h-5 w-5" />
                    </div>
                    <p className="mt-3 text-base font-semibold">Касса ждёт открытия смены</p>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      После открытия смены здесь появится каталог для продажи. Так кассир не пробьёт заказ случайно в закрытую кассу.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setCashCenterTab("overview");
                        setCashCenterOpen(true);
                      }}
                      className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 text-sm font-semibold text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
                    >
                      <ReceiptText className="h-4 w-4" />
                      Порядок смены
                    </button>
                  </div>
                </div>
              ) : loadingProducts ? (
                <div className="flex items-center justify-center h-32 text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" /> Загрузка...
                </div>
              ) : (
                <div className={`grid gap-2 ${
                  terminalMode === "MARKET"
                    ? selectedProduct
                      ? "grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
                      : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                    : selectedProduct
                      ? "grid-cols-2 md:grid-cols-3 xl:grid-cols-3"
                      : "grid-cols-2 md:grid-cols-3 xl:grid-cols-4"
                }`}>
                  {visibleCatalogProducts.map((p) => {
                    const minP = p.variants.reduce((mn, v) => {
                      const price = v.pricePerCube ?? v.pricePerPiece ?? Infinity;
                      return price < mn ? price : mn;
                    }, Infinity);
                    const isSelected = selectedProductId === p.id;
                    const hasStock = p.variants.some((v) => v.inStock);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleSelectProduct(p)}
                        className={`relative flex flex-col items-start p-3 rounded-xl border text-left transition-all active:scale-[0.97] ${
                          isSelected
                            ? "bg-primary/10 border-primary ring-1 ring-primary/30"
                            : "bg-card border-border hover:border-primary/40 hover:bg-primary/[0.05]"
                        }`}
                      >
                        {!hasStock && (
                          <span className="absolute top-1.5 right-1.5 text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">нет</span>
                        )}
                        <Package className={`w-5 h-5 mb-1.5 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                        <p className="text-sm font-semibold leading-tight line-clamp-2">{p.name}</p>
                        {p.category && <p className="mt-1 text-xs text-muted-foreground">{p.category.name}</p>}
                        {minP !== Infinity && (
                          <p className={`mt-1.5 text-sm font-bold ${isSelected ? "text-primary" : "text-foreground"}`}>
                            от {minP.toLocaleString("ru-RU")} ₽
                          </p>
                        )}
                        <p className={`mt-0.5 text-xs ${isSelected ? "text-primary" : "text-muted-foreground"}`}>
                          {p.saleUnit === "CUBE" ? "м³" : p.saleUnit === "PIECE" ? "шт" : "м³/шт"} · {p.variants.length} разм.
                        </p>
                      </button>
                    );
                  })}
                  {visibleCatalogProducts.length === 0 && (
                    <div className="col-span-4 py-12 text-center text-sm text-muted-foreground">
                      Позиции не найдены
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Variant selector panel */}
            {selectedProduct && (
              <div className="hidden max-h-[46vh] shrink-0 flex-col border-t border-border bg-card md:flex xl:max-h-none xl:w-80 xl:border-l xl:border-t-0">
                <div className="space-y-3 border-b border-border px-4 py-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Подбор позиции</p>
                    <p className="mt-1 text-base font-semibold leading-tight line-clamp-2">{selectedProduct.name}</p>
                    {terminalMode === "MARKET" && activeMarketShop && (
                      <p className="mt-1 text-xs text-muted-foreground">{activeMarketShop.name}</p>
                    )}
                  </div>
                  {selectedVariant && itemPrice > 0 && (
                    <div className="rounded-xl border border-primary/20 bg-primary/10 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-mono text-sm font-semibold text-primary">{selectedVariant.size}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {fmt(itemPrice)} / {unitType === "CUBE" ? "м³" : "шт"}
                          </p>
                        </div>
                        <p className="shrink-0 text-lg font-bold text-primary">{fmt(itemPrice * quantity)}</p>
                      </div>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={addItem}
                    disabled={!selectedVariant || !selectedVariant.inStock || !itemPrice || quantity <= 0}
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-primary/45 bg-primary/10 px-4 text-sm font-semibold text-primary transition-colors hover:bg-primary/15 disabled:opacity-40 active:scale-[0.98]"
                  >
                    <Plus className="h-4 w-4" />
                    В заказ
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {/* Variants */}
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Размер <span className="text-muted-foreground normal-case">({selectedProduct.variants.length})</span>
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedProduct.variants.map((v) => {
                        const price = unitType === "CUBE" ? v.pricePerCube : v.pricePerPiece;
                        const isSelected = selectedVariantId === v.id;
                        const canUseVariant = v.inStock && price != null && Number(price) > 0;
                        return (
                          <button
                            key={v.id}
                            type="button"
                            disabled={!canUseVariant}
                            onClick={() => setSelectedVariantId(v.id)}
                            className={`relative flex min-h-16 flex-col items-start justify-between rounded-xl border px-3 py-2 text-left transition-colors ${
                              isSelected
                                ? "bg-primary/10 border-primary"
                                : canUseVariant
                                ? "border-border hover:border-primary/30 hover:bg-primary/[0.07]"
                                : "border-border/40 opacity-50"
                            }`}
                          >
                            {isSelected && (
                              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary" />
                            )}
                            <span className={`font-mono text-xs leading-tight ${isSelected ? "text-primary font-semibold" : ""}`}>
                              {v.size}
                            </span>
                            <span className={`mt-1 text-sm font-bold ${
                              isSelected ? "text-primary" : canUseVariant ? "text-foreground" : "text-muted-foreground"
                            }`}>
                              {price != null ? `${Number(price).toLocaleString()} ₽` : "—"}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Unit */}
                  {availableUnits.length > 1 && (
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Единица</p>
                      <div className="grid grid-cols-2 gap-2">
                        {availableUnits.map((u) => (
                          <button
                            key={u}
                            type="button"
                            onClick={() => setUnitType(u)}
                            className={`h-11 rounded-xl border text-sm font-semibold transition-colors ${unitType === u ? SOFT_SELECTED_CLASS : "border-border hover:border-primary/30"}`}
                          >
                            {u === "CUBE" ? "м³" : "шт"}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Quantity */}
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Количество</p>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => setQuantity((q) => Math.max(0.1, +(q - (unitType === "CUBE" ? 0.5 : 1)).toFixed(2)))}
                        className="flex h-11 w-11 items-center justify-center rounded-xl border border-border transition-colors hover:bg-primary/[0.08]"><Minus className="h-4 w-4" /></button>
                      <input
                        type="number"
                        min={0.01}
                        step={unitType === "CUBE" ? 0.1 : 1}
                        value={quantity}
                        onChange={(e) => setQuantity(Number(e.target.value))}
                        className="h-11 min-w-0 flex-1 rounded-xl border border-border bg-background text-center text-base font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                      <button type="button" onClick={() => setQuantity((q) => +(q + (unitType === "CUBE" ? 0.5 : 1)).toFixed(2))}
                        className="flex h-11 w-11 items-center justify-center rounded-xl border border-border transition-colors hover:bg-primary/[0.08]"><Plus className="h-4 w-4" /></button>
                    </div>
                    {selectedVariant && itemPrice > 0 && (
                      <div className="mt-3 rounded-xl border border-border bg-muted/30 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm text-muted-foreground">Сумма</span>
                          <span className="text-base font-bold text-primary">{fmt(itemPrice * quantity)}</span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{fmt(itemPrice)} / {unitType === "CUBE" ? "м³" : "шт"}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT: Order Panel ── */}
        <TerminalPortal active={showMobileCart}>
          {showMobileCart && (
            <button
              type="button"
              aria-label="Закрыть корзину"
              onClick={() => setShowMobileCart(false)}
              className="admin-mobile-popup-backdrop md:hidden"
            />
          )}
        <div className={`
          ${showMobileCart
             ? "admin-popup-liquid admin-mobile-popup-sheet flex flex-col border border-border bg-card shadow-2xl md:hidden"
             : "hidden md:relative md:flex md:w-80 md:flex-col md:border-l md:border-border xl:w-[22rem]"
           }
          overflow-hidden shrink-0
        `}>
          {/* Drawer close button */}
          {showMobileCart && (
            <>
            <div className="flex justify-center bg-card pt-2">
              <span className="admin-mobile-sheet-handle" />
            </div>
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card shrink-0">
              <div className="flex items-center gap-2">
                {orderPanelView === "checkout" ? (
                  <User className="h-4 w-4 shrink-0 text-primary" />
                ) : (
                  <ShoppingCart className="h-4 w-4 shrink-0 text-primary" />
                )}
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">
                    {orderPanelView === "checkout" ? "Оформление заказа" : `Корзина (${items.length} поз.)`}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {items.length} поз. · {fmt(totalAmount)}
                  </span>
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowMobileCart(false)}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
              >
                <X className="w-5 h-5" />
                <span className="sr-only">Закрыть</span>
              </button>
            </div>
            </>
          )}

          {false ? (
            <div className="flex h-full flex-col overflow-hidden">
              <div className="border-b border-border px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-sm font-semibold">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      Сводка по бирже
                    </p>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {activeMarketShop?.name || "Биржа"} · {marketProducts.length} поз.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setOrderPanelView("cart");
                      setShowMobileCart(true);
                    }}
                    className="inline-flex h-10 items-center gap-2 rounded-xl border border-primary/45 bg-primary/10 px-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/15"
                  >
                    <ShoppingCart className="h-4 w-4" />
                    {items.length || 0}
                  </button>
                </div>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                <div className="rounded-2xl border border-border bg-background p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{activeMarketShop?.name || "Магазин не выбран"}</p>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        {activeMarketShop?.delivery || "доставка не подключена"} · рейтинг, отзывы, просмотры и подписчики включаются только из реальных событий.
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full border border-primary/30 bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary">
                      честно
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                    {[
                      ["Просмотры", "нет данных"],
                      ["Подписчики", "нет данных"],
                      ["Куплено", `${items.length} в заказе`],
                      ["Остатки", `${activeMarketShop?.variantsCount || 0} вар.`],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-xl border border-border bg-card px-3 py-2">
                        <p className="text-muted-foreground">{label}</p>
                        <p className="mt-1 truncate font-semibold">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {selectedProduct && selectedProductMarketStats && (
                  <div className="rounded-2xl border border-primary/30 bg-primary/5 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Позиция</p>
                    <p className="mt-1 text-sm font-semibold leading-tight">{selectedProduct!.name}</p>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                      <div className="rounded-xl border border-border bg-background px-3 py-2">
                        <p className="text-muted-foreground">Цена</p>
                        <p className="mt-1 font-semibold">
                          {selectedProductMarketStats!.minPrice ? `${fmt(selectedProductMarketStats!.minPrice)}-${fmt(selectedProductMarketStats!.maxPrice)}` : "нет цены"}
                        </p>
                      </div>
                      <div className="rounded-xl border border-border bg-background px-3 py-2">
                        <p className="text-muted-foreground">Остаток</p>
                        <p className="mt-1 font-semibold">{selectedProductMarketStats!.inStockVariants}/{selectedProductMarketStats!.totalVariants}</p>
                      </div>
                      <div className="rounded-xl border border-border bg-background px-3 py-2">
                        <p className="text-muted-foreground">Рейтинг</p>
                        <p className="mt-1 font-semibold">{selectedProductMarketStats!.rating}</p>
                      </div>
                      <div className="rounded-xl border border-border bg-background px-3 py-2">
                        <p className="text-muted-foreground">Отзывы</p>
                        <p className="mt-1 truncate font-semibold">{selectedProductMarketStats!.reviews}</p>
                      </div>
                    </div>
                    <p className="mt-3 rounded-xl border border-border bg-background px-3 py-2 text-xs text-muted-foreground">
                      {selectedProductMarketStats!.priceHistory} · {selectedProductMarketStats!.demand}
                    </p>
                  </div>
                )}

                <div className="rounded-2xl border border-border bg-background p-3">
                  <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold">Котировки</p>
                    <span className="text-[11px] text-muted-foreground">цены из каталога</span>
                  </div>
                  <div className="mt-3 space-y-2">
                    {marketQuoteRows.length === 0 && (
                      <div className="rounded-xl border border-dashed border-border bg-card px-3 py-4 text-center text-xs text-muted-foreground">
                        По выбранному магазину пока нет позиций для котировок.
                      </div>
                    )}
                    {marketQuoteRows.map((row) => {
                      const width = `${Math.max(8, Math.round(((row.maxPrice || row.minPrice || 1) / marketQuoteMaxPrice) * 100))}%`;
                      return (
                        <button
                          key={row.id}
                          type="button"
                          onClick={() => handleSelectProduct(row.product)}
                          className="w-full rounded-xl border border-border bg-card px-3 py-2 text-left transition-colors hover:border-primary/30"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="min-w-0 truncate text-xs font-semibold">{row.name}</span>
                            <span className="shrink-0 text-xs font-bold text-primary">{row.minPrice ? fmt(row.minPrice) : "нет цены"}</span>
                          </div>
                          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                            <div className="h-full rounded-full bg-primary" style={{ width }} />
                          </div>
                          <p className="mt-1 text-[10px] text-muted-foreground">
                            {row.category} · {row.inStockVariants}/{row.variantsCount} вар. · куплено {row.inCartQuantity}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-background p-3">
                  <p className="text-sm font-semibold">Акции и скидки</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    Здесь будут только реальные правила скидок и подключённые предложения. Пока показываем позиции из каталога без выдуманных промо.
                  </p>
                </div>
              </div>

              <div className="border-t border-border px-4 py-3">
                <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">ARAY · честная сводка без выдуманных данных</p>
              </div>
            </div>
          ) : (
          <>
          <div className={`flex-1 overflow-y-auto ${showMobileCart ? "overscroll-contain" : ""}`}>
          {/* Order panel navigation */}
          <div className={`border-b border-border px-4 py-3 space-y-3 ${
            showMobileCart && orderPanelView === "checkout" ? "hidden" : ""
          }`}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                {terminalMode === "REGISTER" ? (
                  <Banknote className="h-4 w-4 text-primary" />
                ) : (
                  <ShoppingCart className="h-4 w-4 text-primary" />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{terminalMode === "REGISTER" ? "Кассовая продажа" : terminalMode === "MARKET" ? "Корзина" : "Заказ"}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {terminalMode === "REGISTER"
                      ? activeShift
                        ? "смена открыта, продажу можно пробивать"
                        : "сначала откройте кассу сверху"
                      : terminalMode === "MARKET"
                        ? `${activeMarketShop?.name || "магазин"} · ${items.length} поз.`
                      : `${items.length} поз. · ${fmt(totalAmount)}`}
                  </p>
                </div>
              </div>
              <span className="shrink-0 rounded-xl border border-primary/30 bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                {terminalMode === "REGISTER" ? "Касса" : terminalMode === "MARKET" ? "Заказ" : "Заказ"}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => setOrderPanelView("cart")}
                className={`flex min-h-12 items-center gap-2 rounded-xl border px-3 text-left transition-colors ${
                  orderPanelView === "cart"
                    ? SOFT_SELECTED_CLASS
                    : "border-border bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground"
                }`}
              >
                <ShoppingCart className="h-4 w-4 shrink-0" />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">Корзина</span>
                  <span className="block truncate text-xs opacity-80">{items.length ? `${items.length} поз.` : "пусто"}</span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setOrderPanelView("checkout");
                  setShowClientForm(true);
                }}
                className={`flex min-h-12 items-center gap-2 rounded-xl border px-3 text-left transition-colors ${
                  orderPanelView === "checkout"
                    ? SOFT_SELECTED_CLASS
                    : "border-border bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground"
                }`}
              >
                <User className="h-4 w-4 shrink-0" />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">Оформление</span>
                  <span className="block truncate text-xs opacity-80">{clientReady && deliveryReady ? "готово" : "данные клиента"}</span>
                </span>
              </button>
            </div>
          </div>

          {orderPanelView === "checkout" && (
          <>
          <div className="border-b border-border px-4 py-2">
            <button
              type="button"
              onClick={() => setOrderPanelView("cart")}
              className="inline-flex h-9 items-center gap-2 rounded-xl border border-border bg-background px-3 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Назад к корзине
            </button>
          </div>
          {/* Client section */}
          <div className="border-b border-border">
            <button
              onClick={() => setShowClientForm((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-primary/[0.05] transition-colors"
            >
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold">{terminalProfile.customerNameLabel}</span>
                {form.guestName && (
                  <span className="text-xs text-muted-foreground truncate max-w-24">{form.guestName}</span>
                )}
              </div>
              {showClientForm ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </button>
            {showClientForm && (
              <div className="px-4 pb-3 space-y-2.5">
                <div className="grid grid-cols-1 gap-2">
                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Канал</label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {ORDER_CHANNELS.map((channel) => {
                        const Icon = channel.icon;
                        const selected = form.contactMethod === channel.value;
                        return (
                          <button
                            key={channel.value}
                            type="button"
                            onClick={() => setForm((f) => ({ ...f, contactMethod: channel.value }))}
                            className={`flex h-10 items-center justify-center gap-1 rounded-xl border text-[11px] font-medium transition-colors ${
                              selected
                                ? SOFT_SELECTED_CLASS
                                : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
                            }`}
                          >
                            <Icon className="h-3.5 w-3.5 shrink-0" />
                            <span className="hidden xl:inline">{channel.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">{terminalProfile.customerNameLabel}</label>
                    <input
                      type="text"
                      placeholder={terminalProfile.customerNamePlaceholder}
                      value={form.guestName}
                      onChange={(e) => setForm((f) => ({ ...f, guestName: e.target.value }))}
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">{terminalProfile.customerPhoneLabel}</label>
                    <input
                      type="tel"
                      placeholder="+7 (___) ___-__-__"
                      value={form.guestPhone}
                      onChange={(e) => setForm((f) => ({ ...f, guestPhone: e.target.value }))}
                      className={INPUT_CLASS}
                    />
                  </div>
                  {(lookupLoading || clientLookup?.customer) && (
                    <div className="rounded-2xl border border-border bg-muted/20 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            {lookupLoading ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                            ) : (
                              <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                            )}
                            <p className="text-xs font-semibold">
                              {lookupLoading ? "Ищу клиента" : "Клиент найден"}
                            </p>
                          </div>
                          {clientLookup?.customer && (
                            <p className="mt-1 truncate text-[11px] text-muted-foreground">
                              {clientLookup.customer.orderCount} заказов · {fmt(clientLookup.customer.totalSpent)}
                            </p>
                          )}
                        </div>
                        {clientLookup?.customer?.source === "client" && (
                  <span className="rounded-xl bg-primary/10 px-2 py-1 text-[10px] font-medium text-primary">
                            база
                          </span>
                        )}
                      </div>

                      {clientLookup?.recentOrders.length ? (
                        <div className="mt-3 space-y-2">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Повторить</p>
                          {clientLookup.recentOrders.slice(0, 2).map((order) => (
                            <button
                              key={order.id}
                              type="button"
                              onClick={() => repeatOrder(order)}
                              className="flex w-full items-center justify-between gap-2 rounded-xl border border-border bg-background px-3 py-2 text-left transition-colors hover:border-primary/30"
                            >
                              <span className="min-w-0">
                                <span className="block truncate text-xs font-semibold">#{order.orderNumber} · {order.items.length} поз.</span>
                                <span className="block truncate text-[11px] text-muted-foreground">{new Date(order.createdAt).toLocaleDateString("ru-RU")}</span>
                              </span>
                              <span className="shrink-0 text-xs font-bold text-primary">{fmt(order.totalAmount + order.deliveryCost)}</span>
                            </button>
                          ))}
                        </div>
                      ) : null}

                      {clientLookup?.favoriteItems.length ? (
                        <div className="mt-3">
                          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Часто берёт</p>
                          <div className="flex flex-wrap gap-1.5">
                            {clientLookup.favoriteItems.map((item) => (
                              <button
                                key={`${item.variantId}-${item.unitType}`}
                                type="button"
                                onClick={() => addFavoriteItem(item)}
                                className="rounded-xl border border-border bg-background px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
                              >
                                {item.productName}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )}
                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Email</label>
                    <input
                      type="email"
                      placeholder="client@example.com"
                      value={form.guestEmail}
                      onChange={(e) => setForm((f) => ({ ...f, guestEmail: e.target.value }))}
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">{contactSourceLabel}</label>
                    <input
                      type="text"
                      placeholder={contactSourcePlaceholder}
                      value={form.contactUsername}
                      onChange={(e) => setForm((f) => ({ ...f, contactUsername: e.target.value }))}
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">{terminalProfile.fulfillmentTitle}</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {visibleFulfillment.map((option) => {
                        const selected = form.fulfillmentType === option.value;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => {
                              setForm((f) => ({ ...f, fulfillmentType: option.value }));
                              if (!option.hasDeliveryCost) {
                                setDeliveryCost(0);
                                setDeliveryCostInput("");
                              }
                            }}
                            className={`min-h-10 rounded-xl border px-2.5 py-2 text-left text-xs font-semibold transition-colors ${
                              selected
                                ? SOFT_SELECTED_CLASS
                                : "border-border bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground"
                            }`}
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">
                      {activeFulfillment.detailLabel}{activeFulfillment.requiresDetail ? " *" : ""}
                    </label>
                    <input
                      type="text"
                      placeholder={activeFulfillment.detailPlaceholder}
                      value={form.fulfillmentDetail}
                      onChange={(e) => setForm((f) => ({ ...f, fulfillmentDetail: e.target.value }))}
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Комментарий</label>
                    <textarea
                      rows={2}
                      placeholder="Пожелания, уточнения..."
                      value={form.comment}
                      onChange={(e) => setForm((f) => ({ ...f, comment: e.target.value }))}
                      className={`${INPUT_CLASS} resize-none`}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
          </>
          )}

          {/* Cart items */}
          {orderPanelView === "cart" && (
          <div className="border-y border-border bg-background/40">
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <ShoppingCart className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Корзина</p>
                  <p className="text-xs text-muted-foreground">{items.length ? `${items.length} поз. · ${fmt(itemsTotal)}` : "Пока пусто"}</p>
                </div>
              </div>
              {items.length > 0 && (
                <span className="rounded-xl border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                  {fmt(totalAmount)}
                </span>
              )}
            </div>
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-4 pb-5 pt-1 text-muted-foreground text-sm gap-2">
                <ShoppingCart className="w-8 h-8 opacity-30" />
                <p className="text-xs">Нажмите товар слева, выберите размер и добавьте в заказ</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {items.map((item, i) => (
                  <div key={i} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium line-clamp-1">{item.productName}</p>
                        <p className="text-[11px] text-muted-foreground font-mono">{item.variantSize}</p>
                      </div>
                      <button type="button" onClick={() => removeItem(i)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:text-destructive">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => updateQty(i, Math.max(0.1, +(item.quantity - (item.unitType === "CUBE" ? 0.5 : 1)).toFixed(2)))}
                          className="flex h-10 w-10 items-center justify-center rounded-xl border border-border transition-colors hover:bg-primary/[0.08]"
                        ><Minus className="h-4 w-4" /></button>
                        <span className="text-sm font-mono w-14 text-center font-semibold">
                          {item.quantity} {item.unitType === "CUBE" ? "м³" : "шт"}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQty(i, +(item.quantity + (item.unitType === "CUBE" ? 0.5 : 1)).toFixed(2))}
                          className="flex h-10 w-10 items-center justify-center rounded-xl border border-border transition-colors hover:bg-primary/[0.08]"
                        ><Plus className="h-4 w-4" /></button>
                      </div>
                      <p className="text-sm font-bold">{fmt(item.quantity * item.price)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          )}

          {/* Fulfillment cost */}
          {orderPanelView === "checkout" && (
          <>
          {(activeFulfillment.hasDeliveryCost || deliveryCost > 0) && (
          <div className="border-t border-border px-4 py-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                <Truck className="w-3.5 h-3.5" />
                {terminalProfile.costLabel}
              </div>
              <button
                type="button"
                onClick={() => setCalcOpen((v) => !v)}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                <Calculator className="w-3 h-3" />
                {terminalProfile.calculatorLabel}
                {totalVolume > 0 && <span className="text-muted-foreground">({totalVolume.toFixed(1)} м³)</span>}
              </button>
            </div>

            {calcOpen && (
              <div className="bg-muted/30 border border-border rounded-xl p-3 space-y-2">
                <div className="flex gap-2">
                  <input
                    type="number"
                    min={0.1}
                    step={0.1}
                    placeholder="м³"
                    value={calcVolume || (totalVolume > 0 ? totalVolume.toFixed(1) : "")}
                    onChange={(e) => setCalcVolume(e.target.value)}
                    className={`${COMPACT_INPUT_CLASS} min-w-0 flex-1`}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const vol = parseFloat(calcVolume || String(totalVolume));
                      if (!vol) return;
                      setCalcSuggestions(deliveryRates.filter((r) => r.maxVolume >= vol).sort((a, b) => a.basePrice - b.basePrice));
                    }}
                    className="min-h-10 rounded-xl border border-primary/45 bg-primary/10 px-3 text-xs font-semibold text-primary transition-colors hover:bg-primary/15"
                  >
                    Подобрать
                  </button>
                </div>
                {calcSuggestions.map((r, i) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => { setDeliveryCostInput(String(r.basePrice)); setDeliveryCost(r.basePrice); setCalcOpen(false); }}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs border transition-colors hover:border-primary/40 ${i === 0 ? "bg-muted/30 border-border" : "bg-background border-border"}`}
                  >
                    <span className="flex items-center gap-1">{i === 0 && <Star className="w-3 h-3 text-primary shrink-0" />}{r.vehicleName} · {r.payload}</span>
                    <span className="font-bold">{r.basePrice.toLocaleString()} ₽</span>
                  </button>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                placeholder={terminalProfile.costPlaceholder}
                value={deliveryCostInput}
                onChange={(e) => { setDeliveryCostInput(e.target.value); setDeliveryCost(Number(e.target.value) || 0); }}
                className={`${COMPACT_INPUT_CLASS} min-w-0 flex-1`}
              />
              <span className="text-xs text-muted-foreground shrink-0">₽</span>
            </div>
          </div>
          )}

          {/* Payment method */}
          <div className="border-t border-border px-4 py-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Оплата</p>
              <span className="text-[11px] font-medium text-primary">{selectedPayment.label}</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {visiblePaymentOptions.map((opt) => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, paymentMethod: opt.value }))}
                    className={`flex min-h-16 flex-col items-start justify-between rounded-xl border p-2 text-left text-xs font-medium transition-colors ${
                      form.paymentMethod === opt.value
                        ? SOFT_SELECTED_CLASS
                        : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>

            {form.paymentMethod === "QR / ссылка" && (
              <div className="mt-3 rounded-2xl border border-primary/20 bg-primary/5 p-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-background text-primary">
                    <QrCode className="h-7 w-7" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">QR для оплаты</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      После подключения провайдера здесь будет настоящий QR или ссылка. Сейчас заказ сохранится с выбранным способом оплаты.
                    </p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled
                    className="flex h-10 cursor-not-allowed items-center justify-center gap-1.5 rounded-xl border border-border bg-background text-xs font-semibold text-muted-foreground opacity-70"
                  >
                    <QrCode className="h-3.5 w-3.5" />
                    QR скоро
                  </button>
                  <button
                    type="button"
                    disabled
                    className="flex h-10 cursor-not-allowed items-center justify-center gap-1.5 rounded-xl border border-border bg-background text-xs font-semibold text-muted-foreground opacity-70"
                  >
                    <Send className="h-3.5 w-3.5" />
                    Отправка скоро
                  </button>
                </div>
              </div>
            )}

            <div className="mt-3 rounded-2xl border border-border bg-muted/20 p-3">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Чек</p>
                </div>
                <span className="text-[11px] font-medium text-primary">{selectedReceiptMode.label}</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {visibleReceiptModes.map((mode) => {
                  const Icon = mode.icon;
                  const selected = receiptMode === mode.value;
                  return (
                    <button
                      key={mode.value}
                      type="button"
                      onClick={() => setReceiptMode(mode.value)}
                      className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl border px-2 text-[11px] font-medium transition-colors ${
                        selected
                          ? SOFT_SELECTED_CLASS
                          : "border-border bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {mode.label}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                Фискальный чек включаем только через законную кассу/ОФД или проверенный платёжный сценарий. Заказ, оплата и чек хранятся отдельными статусами.
              </p>
            </div>
          </div>
          </>
          )}
          </div>

          {/* Total & submit */}
          <div
            className={`shrink-0 border-t border-border bg-muted/10 ${
              showMobileCart ? "px-3 pb-3 pt-3 sm:px-4" : "px-4 py-4"
            }`}
            style={showMobileCart ? { paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))" } : undefined}
          >
            {error && (
              <div className="admin-alert admin-alert-danger mb-3 flex items-center gap-2 px-3 py-2 text-xs">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {error}
              </div>
            )}
            <div className="space-y-1 mb-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Позиции ({items.length})</span>
                <span>{fmt(itemsTotal)}</span>
              </div>
              {deliveryCost > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{terminalProfile.costLabel}</span>
                  <span>{fmt(deliveryCost)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold border-t border-border pt-1.5 mt-1.5">
                <span>ИТОГО</span>
                <span className="text-primary text-lg">{fmt(totalAmount)}</span>
              </div>
              {totalVolume > 0 && (
                <p className="text-[11px] text-muted-foreground text-right">{totalVolume.toFixed(2)} м³</p>
              )}
            </div>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving || items.length === 0}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-primary/45 bg-primary/10 py-3 text-sm font-bold text-primary transition-colors hover:bg-primary/15 disabled:opacity-40 active:scale-[0.98]"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-5 h-5" />}
              {orderFooterActionLabel}
            </button>
          </div>
          </>
          )}
        </div>
        </TerminalPortal>

        {terminalMode === "MARKET" && (
          <AdminModal
            open={showMarketInsights}
            onClose={() => setShowMarketInsights(false)}
            title="Аналитика биржи"
            subtitle={`${activeMarketShop?.name || "ПилоРус"} · цены, наличие и спрос без шума`}
            size="lg"
            overlayClassName="admin-market-insights-overlay"
            className="admin-market-insights-panel"
            bodyClassName="admin-market-insights-body space-y-3 text-sm"
          >
            <div className="rounded-2xl border border-primary/25 bg-primary/5 p-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 text-primary">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">Вывод ARAY</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {marketPriceIntelligence.insight} Клиенту сначала показываем позиции с ценой и наличием; рейтинги, просмотры и отзывы не выдумываем.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold text-muted-foreground">
                      {marketPriceStats.withPriceProducts} с ценой
                    </span>
                    <span className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold text-muted-foreground">
                      {marketPriceStats.inStockProducts} в наличии
                    </span>
                    <span className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold text-muted-foreground">
                      {items.length} в заказе
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-[1fr_0.86fr]">
              <div className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{activeMarketShop?.name || "Площадка"}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{activeMarketShop?.category || "Категория"} · {activeMarketShop?.delivery || "условия доставки не указаны"}</p>
                  </div>
                  <span className="shrink-0 rounded-full border border-primary/30 bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary">
                    честно
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                  {[
                    ["Средняя цена", marketPriceStats.averagePrice ? fmt(marketPriceStats.averagePrice) : "нет цены"],
                    ["Диапазон", marketPriceStats.minPrice ? `${fmt(marketPriceStats.minPrice)} - ${fmt(marketPriceStats.maxPrice)}` : "нет цены"],
                    ["Остатки", `${activeMarketShop?.variantsCount || 0} вар.`],
                    ["Спрос", items.length ? `${items.length} в заказе` : "нет событий"],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-xl border border-border bg-background px-3 py-2">
                      <p className="text-muted-foreground">{label}</p>
                      <p className="mt-1 truncate font-semibold">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-4">
                <p className="text-sm font-semibold">Фильтры для менеджера</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Оставьте только то, что можно быстро предложить клиенту.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {marketFilterPills.map((filter) => (
                    <button
                      key={filter.key}
                      type="button"
                      onClick={() => setMarketFilter(filter.key)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                        marketFilter === filter.key
                          ? SOFT_SELECTED_CLASS
                          : "border-border bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground"
                      }`}
                    >
                      {filter.label}
                      <span className="ml-1 opacity-70">{filter.count}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold">Спрос из интернета</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    Wordstat и Google Keyword Planner подключаем как честные источники: запросы, регионы, динамика и похожие фразы. Без токенов цифры не рисуем.
                  </p>
                </div>
                <span className="shrink-0 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  {marketDemandLoading ? "обновляем" : marketDemand ? "каркас готов" : "подключение"}
                </span>
              </div>
              {marketDemandError && (
                <div className="mt-3 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
                  {marketDemandError}
                </div>
              )}
              <div className="mt-4 grid gap-3">
                <div className="rounded-2xl border border-border bg-background p-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <p className="text-sm font-semibold">Источники спроса</p>
                  </div>
                  <div className="mt-3 grid gap-2">
                    {(marketDemand?.providers || []).map((provider) => (
                      <div key={provider.key} className="rounded-xl border border-border/70 px-3 py-2">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold">{provider.name}</p>
                            <p className="mt-1 text-sm text-muted-foreground">{provider.regionScope}</p>
                          </div>
                          <span className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-semibold ${
                            provider.connected
                              ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
                              : "border-amber-500/25 bg-amber-500/10 text-amber-300"
                          }`}>
                            {provider.connected ? "готов" : "нужен токен"}
                          </span>
                        </div>
                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{provider.limitText}</p>
                      </div>
                    ))}
                    <div className="rounded-xl border border-border/70 px-3 py-2">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold">Yandex Direct</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            Черновики рекламы готовим из каталога и брифа. Запуск только после подтверждения.
                          </p>
                        </div>
                        <span className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-semibold ${
                          directStatus?.connected
                            ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
                            : "border-amber-500/25 bg-amber-500/10 text-amber-300"
                        }`}>
                          {directStatusLabel}
                        </span>
                      </div>
                      {directStatus?.campaigns[0] && (
                        <p className="mt-2 text-sm text-muted-foreground">
                          Найдена кампания: {directStatus.campaigns[0].name} · {directStatus.campaigns[0].state}
                        </p>
                      )}
                      {directStatus?.error && (
                        <p className="mt-2 text-sm text-amber-200">{directStatus.error}</p>
                      )}
                    </div>
                    {!marketDemand && (
                      <div className="rounded-xl border border-dashed border-border px-3 py-5 text-center text-sm text-muted-foreground">
                        Откроем подключение спроса после загрузки аналитики.
                      </div>
                    )}
                  </div>
                </div>

                <div className="hidden rounded-2xl border border-border bg-background p-3">
                  <div className="flex items-center gap-2">
                    <MapPinned className="h-4 w-4 text-primary" />
                    <p className="text-xs font-semibold">Тепловая карта регионов</p>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Карта готова для спроса по регионам. После подключения источников здесь будут обновлённые данные, а не ручные догадки.
                  </p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                    {demandHeatmapRegions.map((row) => (
                      <div
                        key={row.region}
                        className="rounded-xl border border-border/70 px-3 py-2"
                        style={{
                          background: `linear-gradient(135deg, hsl(var(--primary) / ${row.tone / 100}), hsl(var(--background) / 0.96))`,
                        }}
                      >
                        <p className="truncate text-xs font-semibold">{row.region}</p>
                        <p className="mt-1 text-[11px] text-muted-foreground">{row.status}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-3 rounded-2xl border border-border bg-background p-3">
                <p className="text-sm font-semibold">Запросы для проверки</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(marketDemand?.topics || []).slice(0, 12).map((topic) => (
                    <span key={`${topic.source}-${topic.phrase}`} className="rounded-full border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground">
                      {topic.phrase}
                    </span>
                  ))}
                  {(!marketDemand || marketDemand.topics.length === 0) && (
                    <span className="rounded-full border border-dashed border-border px-3 py-1.5 text-sm text-muted-foreground">
                      Запросы появятся из категории, товаров и региона
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="hidden rounded-2xl border border-border bg-card p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold">Умная цена по единицам</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Единый расчёт для розницы, опта, услуг и работ. Ориентиры считаем от каталога, реальные внешние данные подключаются отдельно.
                  </p>
                </div>
                <span className="shrink-0 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  система растёт
                </span>
              </div>
              <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {marketPriceIntelligence.summaries.length === 0 && (
                  <div className="rounded-xl border border-dashed border-border bg-background px-3 py-5 text-center text-xs text-muted-foreground md:col-span-2 xl:col-span-3">
                    Пока нет цен, чтобы посчитать розницу, опт и услуги.
                  </div>
                )}
                {marketPriceIntelligence.summaries.map((summary) => (
                  <div key={summary.unit} className="rounded-xl border border-border bg-background p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold">{summary.label}</p>
                        <p className="mt-1 text-[11px] text-muted-foreground">{summary.count} цен · спрос {summary.demand || "нет"}</p>
                      </div>
                      <span className="text-sm font-bold text-primary">{fmt(summary.average)}</span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                      <div className="rounded-lg border border-border/70 px-2 py-1.5">
                        <p className="text-muted-foreground">Опт ориентир</p>
                        <p className="font-semibold">{fmt(summary.wholesale)}</p>
                      </div>
                      <div className="rounded-lg border border-border/70 px-2 py-1.5">
                        <p className="text-muted-foreground">Розница</p>
                        <p className="font-semibold">{fmt(summary.retail)}</p>
                      </div>
                      <div className="rounded-lg border border-border/70 px-2 py-1.5">
                        <p className="text-muted-foreground">Услуги ориентир</p>
                        <p className="font-semibold">{fmt(summary.service)}</p>
                      </div>
                      <div className="rounded-lg border border-border/70 px-2 py-1.5">
                        <p className="text-muted-foreground">Работы ориентир</p>
                        <p className="font-semibold">{fmt(summary.freelance)}</p>
                      </div>
                    </div>
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      Диапазон: {fmt(summary.min)} - {fmt(summary.max)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {selectedProduct && selectedProductMarketStats && (
              <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Выбранная позиция</p>
                <p className="mt-1 text-sm font-semibold leading-tight">{selectedProduct.name}</p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                  <div className="rounded-xl border border-border bg-background px-3 py-2">
                    <p className="text-muted-foreground">Цена</p>
                    <p className="mt-1 font-semibold">
                      {selectedProductMarketStats.minPrice ? `${fmt(selectedProductMarketStats.minPrice)} - ${fmt(selectedProductMarketStats.maxPrice)}` : "нет цены"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border bg-background px-3 py-2">
                    <p className="text-muted-foreground">Остаток</p>
                    <p className="mt-1 font-semibold">{selectedProductMarketStats.inStockVariants}/{selectedProductMarketStats.totalVariants}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-background px-3 py-2">
                    <p className="text-muted-foreground">Рейтинг</p>
                    <p className="mt-1 font-semibold">{selectedProductMarketStats.rating}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-background px-3 py-2">
                    <p className="text-muted-foreground">Отзывы</p>
                    <p className="mt-1 truncate font-semibold">{selectedProductMarketStats.reviews}</p>
                  </div>
                </div>
                <p className="mt-3 rounded-xl border border-border bg-background px-3 py-2 text-xs text-muted-foreground">
                  {selectedProductMarketStats.priceHistory} · {selectedProductMarketStats.demand}
                </p>
              </div>
            )}

            <div className="hidden rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">Аналитика цен</p>
                  <p className="mt-1 text-xs text-muted-foreground">Спокойный срез по каталогу, без биржевого шума</p>
                </div>
                <span className="text-xs text-muted-foreground">цены из каталога</span>
              </div>
              <div className="mt-4 rounded-2xl border border-border bg-background p-3">
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="text-muted-foreground">минимум</span>
                  <span className="font-semibold">{marketPriceStats.averagePrice ? `средняя ${fmt(marketPriceStats.averagePrice)}` : "средняя не посчитана"}</span>
                  <span className="text-muted-foreground">максимум</span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: marketPriceStats.maxPrice ? `${Math.max(12, Math.round((marketPriceStats.averagePrice / marketPriceStats.maxPrice) * 100))}%` : "0%" }} />
                </div>
                <div className="mt-2 flex items-center justify-between text-xs font-semibold">
                  <span>{marketPriceStats.minPrice ? fmt(marketPriceStats.minPrice) : "нет цены"}</span>
                  <span>{marketPriceStats.maxPrice ? fmt(marketPriceStats.maxPrice) : "нет цены"}</span>
                </div>
              </div>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {marketQuoteRows.length === 0 && (
                  <div className="rounded-xl border border-dashed border-border bg-background px-3 py-5 text-center text-xs text-muted-foreground md:col-span-2">
                    По выбранной площадке пока нет цен для анализа.
                  </div>
                )}
                {marketQuoteRows.map((row) => {
                  const width = `${Math.max(8, Math.round(((row.maxPrice || row.minPrice || 1) / marketQuoteMaxPrice) * 100))}%`;
                  return (
                    <button
                      key={row.id}
                      type="button"
                      onClick={() => handleSelectProduct(row.product)}
                      className="rounded-xl border border-border bg-background px-3 py-2 text-left transition-colors hover:border-primary/30"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="min-w-0 truncate text-xs font-semibold">{row.name}</span>
                        <span className="shrink-0 text-xs font-bold text-primary">{row.minPrice ? fmt(row.minPrice) : "нет цены"}</span>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary" style={{ width }} />
                      </div>
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        {row.category} · {row.inStockVariants}/{row.variantsCount} вариантов · в заказе {row.inCartQuantity}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          </AdminModal>
        )}

        {/* ── SCRIPTS Drawer (over right panel) ── */}
        {showScripts && (
          <div className="absolute inset-0 z-[330] flex items-stretch bg-background/45 backdrop-blur-sm pointer-events-none">
            <div className="flex-1" onClick={() => setShowScripts(false)} style={{ pointerEvents: "auto" }} />
            <div className="admin-popup-liquid w-full max-w-96 bg-card border-l border-border shadow-2xl flex flex-col overflow-hidden pointer-events-auto">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-primary" />
                  <p className="font-semibold">Скрипты продаж</p>
                </div>
                <button onClick={() => setShowScripts(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground px-4 py-2 border-b border-border bg-muted/20">
                Нажмите на скрипт — текст готов к использованию в разговоре
              </p>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {salesScripts.map((s) => (
                  <div key={s.id} className={`rounded-xl border p-3 cursor-pointer transition-colors ${
                    activeScript === s.id
                      ? "border-primary/45 bg-primary/5 text-foreground"
                      : "border-border bg-card text-foreground hover:border-primary/30"
                  }`}
                    onClick={() => setActiveScript(activeScript === s.id ? null : s.id)}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <s.icon className={`w-4 h-4 shrink-0 ${activeScript === s.id ? "text-primary" : "text-muted-foreground"}`} />
                        <span className="text-sm font-semibold">{s.label}</span>
                      </div>
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${activeScript === s.id ? "rotate-180" : ""}`} />
                    </div>
                    {activeScript === s.id && (
                      <div className="mt-3 space-y-2">
                        <div className="rounded-xl border border-border bg-background p-3 text-sm leading-relaxed">
                          {s.text}
                        </div>
                        <div className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                          <Info className="w-3 h-3 shrink-0 mt-0.5 text-primary" />
                          <p>{s.tip}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {/* Quick tip at bottom */}
              <div className="border-t border-border p-4 bg-muted/20">
                <div className="flex items-start gap-2 text-[11px] text-muted-foreground leading-relaxed">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                  <p><strong>Главное правило:</strong> сначала выясните потребность, потом называйте цену. Уточните объём, срок, цель — и предложите точное решение.</p>
                </div>
                <button
                  type="button"
                  onClick={() => router.push("/admin/terminals/training")}
                  className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-primary/45 bg-primary/10 px-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/15"
                >
                  <BookOpen className="h-4 w-4" />
                  Открыть обучение терминала
                </button>
              </div>
            </div>
          </div>
        )}

        <AdminModal
          open={showTerminalSettings}
          onClose={() => setShowTerminalSettings(false)}
          size="full"
          title="Настройки терминала"
          subtitle={`${terminalProfile.label} · ${enabledCapabilities.length} модулей`}
          bodyClassName="p-0"
          headerActions={(
            <div className="hidden items-center gap-2 sm:flex">
              <button
                type="button"
                onClick={runAutoconfig}
                disabled={Boolean(terminalSettingsBusy)}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border bg-background px-3 text-sm font-semibold transition-colors hover:border-primary/40 disabled:opacity-50"
              >
                {terminalSettingsBusy === "autoconfig" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                Автонастройка
              </button>
              <button
                type="button"
                onClick={() => saveTerminalModules()}
                disabled={Boolean(terminalSettingsBusy)}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-primary/45 bg-primary/10 px-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/15 disabled:opacity-50"
              >
                {terminalSettingsBusy === "modules" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                Сохранить
              </button>
            </div>
          )}
          footer={(
            <div className="grid w-full grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setShowTerminalSettings(false)}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-border bg-background text-sm font-semibold text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
              >
                Готово
              </button>
              <button
                type="button"
                onClick={() => saveTerminalModules()}
                disabled={Boolean(terminalSettingsBusy)}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-primary/45 bg-primary/10 px-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/15 disabled:opacity-50"
              >
                {terminalSettingsBusy === "modules" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                Сохранить настройки
              </button>
            </div>
          )}
        >
              <div className="border-b border-border bg-muted/20 p-4 md:px-5">
                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_360px] md:items-center">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold">Быстрый запуск</p>
                      <span className="rounded-full border border-border bg-background px-2 py-0.5 text-xs text-muted-foreground">
                        просто
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      Арай включает только нужные функции сайта. Принтеры, банки и фискализация остаются скрытыми, пока их не подключили.
                    </p>
                  </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={runAutoconfig}
                    disabled={Boolean(terminalSettingsBusy)}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border bg-background px-3 text-sm font-semibold transition-colors hover:border-primary/40 disabled:opacity-50"
                  >
                    {terminalSettingsBusy === "autoconfig" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                    Автонастройка
                  </button>
                  <button
                    type="button"
                    onClick={() => saveTerminalModules()}
                    disabled={Boolean(terminalSettingsBusy)}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-primary/45 bg-primary/10 px-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/15 disabled:opacity-50"
                  >
                    {terminalSettingsBusy === "modules" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                    Сохранить
                  </button>
                </div>
                {terminalSettingsMessage && (
                  <div className="mt-3 rounded-xl border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
                    {terminalSettingsMessage}
                  </div>
                )}
              </div>
              </div>

              <div className="h-[min(72vh,760px)] overflow-hidden md:flex">
                <div className="flex gap-2 overflow-x-auto border-b border-border p-3 md:w-56 md:flex-col md:overflow-y-auto md:border-b-0 md:border-r lg:w-64 scrollbar-hide">
                  {TERMINAL_SETTINGS_SECTIONS.map((section) => {
                    const Icon = section.icon;
                    const selected = terminalSettingsSection === section.id;
                    return (
                      <button
                        key={section.id}
                        type="button"
                        onClick={() => setTerminalSettingsSection(section.id)}
                        className={`flex min-w-36 items-center gap-3 rounded-xl border p-3 text-left transition-colors md:min-w-0 ${
                          selected
                            ? SOFT_SELECTED_CLASS
                            : "border-border bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground"
                        }`}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold">{section.label}</span>
                          <span className={`hidden truncate text-xs md:block ${selected ? "text-primary/75" : "text-muted-foreground"}`}>
                            {section.description}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3 md:p-5">
                  <div className="rounded-2xl border border-border bg-background p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <ActiveSettingsIcon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">{activeSettingsSection.label}</p>
                        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{activeSettingsSection.description}</p>
                      </div>
                    </div>
                  </div>

                  {hiddenSettingsCount > 0 && (
                    <div className="admin-alert admin-alert-info">
                      <Info className="h-4 w-4 shrink-0" />
                      <span>
                        Для профиля «{terminalProfile.label}» скрыто {hiddenSettingsCount} нерелевантных модулей. Если модуль уже включён вручную, он останется здесь.
                      </span>
                    </div>
                  )}

                  {terminalSettingsSection === "cash" && (
                    <div className="rounded-2xl border border-border bg-background p-4">
                      <p className="text-sm font-semibold">{activeShift ? "Смена открыта" : "Смена закрыта"}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {activeShift
                          ? `${activeShift.workstation?.name || selectedWorkstation?.name || "Мобильная касса"} · старт ${fmt(Number(activeShift.openingCash || 0))}`
                          : "Открытие смены находится сверху в режиме «Касса». Сотрудник и время записываются автоматически."}
                      </p>
                    </div>
                  )}

                  {terminalSettingsSection === "aray" && (
                    <div className="rounded-2xl border border-border bg-background p-4">
                      <p className="text-sm font-semibold">Что может Арай</p>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                        Арай может подготовить настройки, объяснить шаги и включить безопасные модули. Деньги, фискализация, роли и провайдеры требуют подтверждения администратора.
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    {visibleSettingsCapabilities.map((capability) => {
                        const locked = ALWAYS_ON_TERMINAL_CAPABILITIES.includes(capability.key);
                        const active = locked || enabledCapabilities.includes(capability.key);
                        const setupGuide = TERMINAL_SETUP_GUIDES[capability.key];
                        const setupOpen = expandedSetupKey === capability.key;
                        const capabilityOpen = expandedCapabilityKey === capability.key;
                        return (
                          <div
                            key={capability.key}
                            className={`rounded-xl border transition-colors ${
                              active
                                ? "border-primary/35 bg-primary/5 text-foreground"
                                : "border-border bg-card text-muted-foreground"
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setExpandedCapabilityKey(capabilityOpen ? null : capability.key);
                                if (!capabilityOpen) setExpandedSetupKey(null);
                              }}
                              className="w-full p-3 text-left transition-colors hover:bg-primary/[0.04]"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <p className="truncate text-sm font-semibold">{capability.title}</p>
                                    {capability.requiresSetup && (
                                      <span className="rounded-full border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                                        настройка
                                      </span>
                                    )}
                                  </div>
                                  <p className="mt-1 truncate text-xs text-muted-foreground">{capability.setupHint}</p>
                                </div>
                                <span className="hidden shrink-0 rounded-full border border-border bg-background px-2 py-0.5 text-xs text-muted-foreground sm:inline-flex">
                                  {locked ? "ядро" : active ? capabilityStatusLabel[capability.trustLevel] : "выкл"}
                                </span>
                                <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${capabilityOpen ? "rotate-180" : ""}`} />
                              </div>
                            </button>

                            {capabilityOpen && (
                              <div className="space-y-3 border-t border-border/70 px-3 pb-3 pt-3">
                                <p className="text-sm leading-relaxed text-muted-foreground">{capability.description}</p>
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                  <span className="rounded-full border border-border bg-background px-2 py-1 text-xs text-muted-foreground sm:hidden">
                                    {locked ? "ядро" : active ? capabilityStatusLabel[capability.trustLevel] : "выкл"}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => toggleTerminalCapability(capability.key)}
                                    disabled={locked}
                                    className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-semibold transition-colors disabled:opacity-60 ${
                                      active
                                        ? "border-primary/45 bg-primary/10 text-primary hover:bg-primary/15"
                                        : "border-border bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground"
                                    }`}
                                  >
                                    <Check className="h-4 w-4" />
                                    {locked ? "Включено всегда" : active ? "Включено" : "Включить"}
                                  </button>
                                </div>

                                {setupGuide && (
                                  <>
                                <button
                                  type="button"
                                  onClick={() => setExpandedSetupKey(setupOpen ? null : capability.key)}
                                  className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-background px-3 py-2 text-left text-sm font-semibold text-foreground transition-colors hover:border-primary/30"
                                >
                                  <span className="flex items-center gap-2">
                                    <KeyRound className="h-4 w-4 text-primary" />
                                    Настроить подключение
                                  </span>
                                  <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${setupOpen ? "rotate-180" : ""}`} />
                                </button>

                                {setupOpen && (
                                  <div className="mt-3 space-y-3 rounded-xl border border-border bg-background p-3">
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="min-w-0">
                                        <p className="text-sm font-semibold">{setupGuide.title}</p>
                                        <p className="mt-1 text-sm text-muted-foreground">{setupGuide.status}</p>
                                      </div>
                                      <span className="shrink-0 rounded-full border border-border bg-card px-2 py-0.5 text-xs text-muted-foreground">
                                        {capability.trustLevel === "CORE" ? "готово" : "бета"}
                                      </span>
                                    </div>

                                    <div>
                                      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Что нужно</p>
                                      <div className="flex flex-wrap gap-1.5">
                                        {setupGuide.fields.map((field) => (
                                          <span key={field} className="rounded-full border border-border bg-card px-2 py-1 text-xs text-muted-foreground">
                                            {field}
                                          </span>
                                        ))}
                                      </div>
                                    </div>

                                    <div>
                                      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Инструкция</p>
                                      <div className="space-y-1.5">
                                        {setupGuide.steps.map((step, index) => (
                                          <div key={step} className="flex gap-2 text-sm text-muted-foreground">
                                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                                              {index + 1}
                                            </span>
                                            <span>{step}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>

                                    <div className="rounded-xl border border-border bg-card p-3">
                                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Где ключи и статус</p>
                                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{setupGuide.storage}</p>
                                    </div>

                                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                      <button
                                        type="button"
                                        onClick={() => setTerminalSettingsMessage("Детальные ключи, статусы и тесты откроем здесь же: человек не уходит из терминала, пока не закончит настройку.")}
                                        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 text-sm font-semibold text-foreground transition-colors hover:border-primary/30"
                                      >
                                        <ExternalLink className="h-4 w-4" />
                                        Открыть здесь
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setTerminalSettingsMessage("Тест подключения создаётся в центре терминалов: проверка коннекторов, очереди, QR и печати.")}
                                        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 text-sm font-semibold text-foreground transition-colors hover:border-primary/30"
                                      >
                                        <CheckCircle2 className="h-4 w-4" />
                                        Что тестировать
                                      </button>
                                    </div>
                                  </div>
                                )}
                                </>
                                )}
                              </div>
                            )}
                          </div>
                        );
                    })}
                  </div>
                </div>
              </div>
        </AdminModal>
      </div>

        {/* ── MOBILE: Variant Bottom Sheet ── */}
        {selectedProduct && (
          <PopupPortal>
            <button
              type="button"
              aria-label="Закрыть выбор варианта"
              className="admin-mobile-popup-backdrop md:hidden"
              onClick={() => setSelectedProductId("")}
            />
            <div className="admin-popup-liquid admin-mobile-popup-sheet flex flex-col border border-border bg-card shadow-2xl md:hidden">
            <div className="flex justify-center pt-2">
              <span className="admin-mobile-sheet-handle" />
            </div>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Выбор варианта</p>
                <p className="text-sm font-semibold line-clamp-1">{selectedProduct.name}</p>
              </div>
              <button type="button" onClick={() => setSelectedProductId("")}
                className="p-2 rounded-xl hover:bg-primary/[0.08] transition-colors text-muted-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-4">
              {/* Variants grid */}
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-2">
                  Размер <span className="text-muted-foreground/50 normal-case">({selectedProduct.variants.length})</span>
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {selectedProduct.variants.map((v) => {
                    const price = unitType === "CUBE" ? v.pricePerCube : v.pricePerPiece;
                    const isSel = selectedVariantId === v.id;
                    const canUseVariant = v.inStock && price != null && Number(price) > 0;
                    return (
                      <button key={v.id} type="button" disabled={!canUseVariant} onClick={() => setSelectedVariantId(v.id)}
                        className={`flex flex-col items-start px-3 py-2.5 rounded-xl text-left transition-colors border relative ${
                          isSel ? "bg-primary/10 border-primary/50" : canUseVariant ? "border-border hover:border-primary/30 hover:bg-primary/[0.07]" : "border-border/40 opacity-50"
                        }`}>
                        {isSel && <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary" />}
                        <span className={`font-mono text-xs leading-tight ${isSel ? "text-primary font-semibold" : ""}`}>{v.size}</span>
                        <span className={`text-xs font-bold mt-1 ${isSel ? "text-primary" : canUseVariant ? "text-primary" : "text-muted-foreground/50"}`}>
                          {price != null ? `${Number(price).toLocaleString()} ₽` : "—"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Unit type */}
              {availableUnits.length > 1 && (
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-2">Единица измерения</p>
                  <div className="flex gap-2">
                    {availableUnits.map((u) => (
                      <button key={u} type="button" onClick={() => setUnitType(u)}
                        className={`flex-1 py-3 rounded-xl text-sm font-medium border transition-colors ${unitType === u ? SOFT_SELECTED_CLASS : "border-border hover:border-primary/30"}`}>
                        {u === "CUBE" ? "м³" : "шт"}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quantity */}
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-2">Количество</p>
                <div className="flex items-center gap-2">
                  <button type="button"
                    onClick={() => setQuantity((q) => Math.max(0.1, +(q - (unitType === "CUBE" ? 0.5 : 1)).toFixed(2)))}
                    className="w-12 h-12 rounded-xl border border-border flex items-center justify-center text-xl font-bold hover:bg-primary/[0.08] active:scale-95">−</button>
                  <input type="number" min={0.01} step={unitType === "CUBE" ? 0.1 : 1} value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="flex-1 text-center py-3 text-base bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  <button type="button"
                    onClick={() => setQuantity((q) => +(q + (unitType === "CUBE" ? 0.5 : 1)).toFixed(2))}
                    className="w-12 h-12 rounded-xl border border-border flex items-center justify-center text-xl font-bold hover:bg-primary/[0.08] active:scale-95">+</button>
                </div>
                {selectedVariant && itemPrice > 0 && (
                  <div className="mt-3 p-3 bg-primary/5 rounded-xl border border-primary/10 flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Сумма</span>
                    <div className="text-right">
                      <p className="text-lg font-bold text-primary">{fmt(itemPrice * quantity)}</p>
                      <p className="text-xs text-muted-foreground">{fmt(itemPrice)} / {unitType === "CUBE" ? "м³" : "шт"}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Add button with safe area */}
            <div className="p-4 border-t border-border shrink-0" style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}>
              <button type="button" onClick={addItem}
                disabled={!selectedVariant || !selectedVariant.inStock || !itemPrice || quantity <= 0}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-primary/45 bg-primary/10 py-4 text-base font-bold text-primary transition-colors hover:bg-primary/15 disabled:opacity-40 active:scale-[0.98]">
                <Plus className="w-5 h-5" />
                В заказ {selectedVariant && itemPrice > 0 ? `· ${fmt(itemPrice * quantity)}` : ""}
              </button>
            </div>
            </div>
          </PopupPortal>
      )}

      {/* Added flash */}
      {addedFlash && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] bg-card text-foreground border border-primary/30 px-4 py-2.5 rounded-xl flex items-center gap-2 text-sm font-semibold animate-in slide-in-from-bottom-2 fade-in duration-200">
          <Check className="w-4 h-4 text-primary" />
          Добавлено: {addedFlash}
        </div>
      )}
    </div>
  );
}
