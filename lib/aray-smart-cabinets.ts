import type { ElementType } from "react";
import {
  BarChart3,
  BriefcaseBusiness,
  Calendar,
  CheckSquare,
  FileText,
  Network,
  Package,
  Settings,
  ShoppingBag,
  Target,
  Truck,
  UserCircle,
  Users,
  Wallet,
  Warehouse,
} from "lucide-react";

export type AraySmartCabinetProfile = {
  role: string;
  title: string;
  subtitle: string;
  focus: string[];
  primaryHrefs: string[];
  icon: ElementType;
  canSeeFinance: boolean;
  canSeePeople: boolean;
  canSeeStrategy: boolean;
};

export type ArayAdminOrchestrationLayer = {
  label: string;
  description: string;
  href: string;
  owner: string;
  state: string;
  icon: ElementType;
};

export type ArayRoleConstructorRule = {
  label: string;
  description: string;
  result: string;
  icon: ElementType;
};

export type ArayAdminGap = {
  label: string;
  state: string;
  href: string;
  owner: string;
  icon: ElementType;
};

export type ArayRolePermissionCard = {
  role: string;
  label: string;
  purpose: string;
  sees: string[];
  actions: string[];
  confirmations: string[];
  href: string;
  icon: ElementType;
};

export const ARAY_SMART_CABINET_PROFILES: Record<string, AraySmartCabinetProfile> = {
  SUPER_ADMIN: {
    role: "SUPER_ADMIN",
    title: "Роли, разделы и автоматизация",
    subtitle: "Владелец управляет всей админкой как единым кабинетом: роли, разделы, деньги, люди, продажи, риски и автоматизация",
    focus: ["прибыль и расходы", "команда и роли", "стратегия", "интеграции", "риски дня"],
    primaryHrefs: ["/admin/director", "/admin/finance", "/admin/staff", "/admin/aray/modules"],
    icon: BriefcaseBusiness,
    canSeeFinance: true,
    canSeePeople: true,
    canSeeStrategy: true,
  },
  ADMIN: {
    role: "ADMIN",
    title: "Роли, разделы и автоматизация",
    subtitle: "Администратор собирает админку в понятную систему: роли, разделы, отчеты, настройки, качество и автоматизация",
    focus: ["операционка", "команда", "отчеты", "модули", "подключения"],
    primaryHrefs: ["/admin/director", "/admin/finance", "/admin/staff", "/admin/settings"],
    icon: BriefcaseBusiness,
    canSeeFinance: true,
    canSeePeople: true,
    canSeeStrategy: true,
  },
  MANAGER: {
    role: "MANAGER",
    title: "Кабинет менеджера",
    subtitle: "Лиды, заказы, клиенты, задачи, консультации и следующий лучший шаг",
    focus: ["лиды", "заказы", "клиенты", "задачи", "консультации"],
    primaryHrefs: ["/admin/crm", "/admin/orders", "/admin/tasks", "/admin/clients"],
    icon: Target,
    canSeeFinance: false,
    canSeePeople: false,
    canSeeStrategy: false,
  },
  SELLER: {
    role: "SELLER",
    title: "Кабинет продавца",
    subtitle: "Товары, консультации, сторис, отзывы, вопросы и быстрые ответы клиентам",
    focus: ["товары", "консультации", "сторис", "отзывы", "вопросы"],
    primaryHrefs: ["/admin/orders/new", "/admin/products", "/admin/stories", "/admin/reviews"],
    icon: ShoppingBag,
    canSeeFinance: false,
    canSeePeople: false,
    canSeeStrategy: false,
  },
  COURIER: {
    role: "COURIER",
    title: "Кабинет курьера",
    subtitle: "Маршруты, доставки, заказы, адреса, статусы и подтверждения",
    focus: ["маршруты", "доставки", "статусы", "адреса", "задачи"],
    primaryHrefs: ["/admin/delivery", "/admin/orders", "/admin/tasks", "/admin/help"],
    icon: Truck,
    canSeeFinance: false,
    canSeePeople: false,
    canSeeStrategy: false,
  },
  ACCOUNTANT: {
    role: "ACCOUNTANT",
    title: "Кабинет бухгалтера",
    subtitle: "Финансы, расходы, документы, отчеты, платежи и контроль подтверждений",
    focus: ["финансы", "расходы", "документы", "отчеты", "платежи"],
    primaryHrefs: ["/admin/finance", "/admin/orders", "/admin/analytics", "/admin/tasks"],
    icon: Wallet,
    canSeeFinance: true,
    canSeePeople: false,
    canSeeStrategy: false,
  },
  WAREHOUSE: {
    role: "WAREHOUSE",
    title: "Кабинет склада",
    subtitle: "Остатки, карточки, движение товара, доступность и подготовка к заказам",
    focus: ["остатки", "карточки", "движение", "наличие", "подготовка"],
    primaryHrefs: ["/admin/inventory", "/admin/products", "/admin/import", "/admin/orders"],
    icon: Warehouse,
    canSeeFinance: false,
    canSeePeople: false,
    canSeeStrategy: false,
  },
};

export const ARAY_SMART_CABINET_MODULES = [
  { label: "Продажи", href: "/admin/orders", icon: ShoppingBag, owner: "директор / менеджер" },
  { label: "Клиенты", href: "/admin/clients", icon: UserCircle, owner: "менеджер" },
  { label: "Команда", href: "/admin/staff", icon: Users, owner: "директор" },
  { label: "Графики", href: "/admin/tasks", icon: Calendar, owner: "директор / команда" },
  { label: "Зарплаты", href: "/admin/finance", icon: Wallet, owner: "директор / бухгалтер" },
  { label: "Склад", href: "/admin/inventory", icon: Package, owner: "склад" },
  { label: "Документы", href: "/admin/finance", icon: FileText, owner: "бухгалтер / менеджер" },
  { label: "Отчеты", href: "/admin/analytics", icon: BarChart3, owner: "директор" },
  { label: "Задачи", href: "/admin/tasks", icon: CheckSquare, owner: "команда" },
];

export const ARAY_ADMIN_ORCHESTRATION_LAYERS: ArayAdminOrchestrationLayer[] = [
  {
    label: "Рабочий стол",
    description: "единый вход, сводка и первые действия дня",
    href: "/admin",
    owner: "все роли",
    state: "синхронизирован",
    icon: BarChart3,
  },
  {
    label: "Роли и права",
    description: "кто что видит, что может менять и где нужно подтверждение",
    href: "/admin/business/settings",
    owner: "директор",
    state: "конструктор",
    icon: Users,
  },
  {
    label: "Продажи",
    description: "заказы, лиды, клиенты, задачи и следующий лучший шаг",
    href: "/admin/orders",
    owner: "менеджер",
    state: "рабочий поток",
    icon: ShoppingBag,
  },
  {
    label: "Каталог",
    description: "товары, склад, медиа, импорт и готовность к продаже",
    href: "/admin/products",
    owner: "продавец / склад",
    state: "связан",
    icon: Package,
  },
  {
    label: "Автоматизация",
    description: "сценарии, уведомления, модули и действия через Арай",
    href: "/admin/workflows",
    owner: "администратор",
    state: "расширяем",
    icon: Network,
  },
  {
    label: "Документы и отчеты",
    description: "финансы, расходы, зарплаты, документы и контроль",
    href: "/admin/finance",
    owner: "директор / бухгалтер",
    state: "по правам",
    icon: FileText,
  },
];

export const ARAY_ROLE_CONSTRUCTOR_RULES: ArayRoleConstructorRule[] = [
  {
    label: "Роль",
    description: "кто человек в бизнесе: директор, менеджер, продавец, склад, курьер или бухгалтер",
    result: "определяет доступные разделы",
    icon: UserCircle,
  },
  {
    label: "Зона ответственности",
    description: "продажи, каталог, склад, доставка, финансы, команда или контент",
    result: "собирает быстрые действия",
    icon: BriefcaseBusiness,
  },
  {
    label: "Чувствительные данные",
    description: "деньги, зарплаты, роли, внешние подключения и документы",
    result: "требуют права и подтверждения",
    icon: Wallet,
  },
  {
    label: "Навигация",
    description: "каждой роли показываются нужные разделы, поиск и быстрые переходы",
    result: "админка не перегружает человека",
    icon: Settings,
  },
  {
    label: "Арай",
    description: "подсказывает, готовит тексты, задачи и планы, но не делает важное без согласия",
    result: "помощь без хаоса",
    icon: Target,
  },
];

export const ARAY_ADMIN_GAPS: ArayAdminGap[] = [
  { label: "Графики смен", state: "следующий слой", href: "/admin/tasks", owner: "команда", icon: Calendar },
  { label: "Зарплаты по людям", state: "следующий слой", href: "/admin/finance", owner: "директор / бухгалтер", icon: Wallet },
  { label: "Лента бизнес-событий", state: "нужно собрать", href: "/admin/director", owner: "Арай", icon: BarChart3 },
  { label: "План дня от Арая", state: "нужно действие", href: "/admin/aray", owner: "директор", icon: Target },
  { label: "Логистика и исполнители", state: "расширяем", href: "/admin/delivery", owner: "доставка", icon: Truck },
  { label: "Документы по процессам", state: "расширяем", href: "/admin/finance", owner: "бухгалтер", icon: FileText },
];

export const ARAY_ROLE_PERMISSION_MATRIX: ArayRolePermissionCard[] = [
  {
    role: "SUPER_ADMIN",
    label: "Владелец",
    purpose: "видит бизнес целиком и задает правила системы",
    sees: ["деньги", "команда", "роли", "модули", "отчеты", "риски"],
    actions: ["менять роли", "подключать модули", "управлять финансами", "видеть все разделы"],
    confirmations: ["роль", "зарплата", "документ", "внешнее подключение"],
    href: "/admin/staff",
    icon: BriefcaseBusiness,
  },
  {
    role: "ADMIN",
    label: "Администратор",
    purpose: "управляет операционкой, настройками и качеством",
    sees: ["заказы", "команда", "настройки", "модули", "финансы"],
    actions: ["настраивать разделы", "управлять сотрудниками", "проверять систему"],
    confirmations: ["роль", "документ", "подключение"],
    href: "/admin/business/settings",
    icon: Settings,
  },
  {
    role: "MANAGER",
    label: "Менеджер",
    purpose: "ведет клиентов, лиды, заказы и задачи",
    sees: ["заказы", "лиды", "клиенты", "задачи", "доставка"],
    actions: ["создать заказ", "вести лид", "поставить задачу", "ответить клиенту"],
    confirmations: ["отправка клиенту", "изменение заказа"],
    href: "/admin/crm",
    icon: Target,
  },
  {
    role: "SELLER",
    label: "Продавец",
    purpose: "работает с продажей, карточками, сторис и отзывами",
    sees: ["терминал", "товары", "сторис", "отзывы", "заказы"],
    actions: ["продать", "обновить карточку", "создать сторис", "ответить на вопрос"],
    confirmations: ["публикация", "ответ клиенту"],
    href: "/admin/orders/new",
    icon: ShoppingBag,
  },
  {
    role: "WAREHOUSE",
    label: "Склад",
    purpose: "контролирует наличие, остатки и подготовку заказов",
    sees: ["склад", "остатки", "товары", "импорт", "заказы"],
    actions: ["обновить остаток", "проверить наличие", "подготовить заказ"],
    confirmations: ["массовое изменение", "импорт"],
    href: "/admin/inventory",
    icon: Warehouse,
  },
  {
    role: "COURIER",
    label: "Курьер",
    purpose: "ведет доставку, маршруты и статусы",
    sees: ["доставки", "маршруты", "адреса", "задачи", "заказы"],
    actions: ["сменить статус", "подтвердить доставку", "сообщить проблему"],
    confirmations: ["смена статуса", "сообщение клиенту"],
    href: "/admin/delivery",
    icon: Truck,
  },
  {
    role: "ACCOUNTANT",
    label: "Бухгалтер",
    purpose: "контролирует деньги, документы, расходы и отчеты",
    sees: ["финансы", "расходы", "отчеты", "документы", "заказы"],
    actions: ["создать расход", "подготовить документ", "проверить отчет"],
    confirmations: ["документ", "платеж", "зарплата"],
    href: "/admin/finance",
    icon: Wallet,
  },
];

export function getAraySmartCabinetProfile(role?: string | null) {
  return ARAY_SMART_CABINET_PROFILES[role || ""] || ARAY_SMART_CABINET_PROFILES.MANAGER;
}

export function getAraySmartCabinetProfiles() {
  return Object.values(ARAY_SMART_CABINET_PROFILES);
}
