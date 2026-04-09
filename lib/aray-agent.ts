/**
 * АРАЙ — Бизнес-мозг ARAY PRODUCTIONS
 * Умный партнёр: знает роль, раздел, данные. Говорит по делу.
 */

export type ArayRole = "customer" | "staff" | "admin";

export type AraySiteContext = {
  siteName?: string;
  businessType?: string;
  phone?: string;
  address?: string;
  workingHours?: string;
};

export type ArayUserContext = {
  role: ArayRole;
  name?: string;
  staffRole?: string;
};

export type ArayPageContext = {
  page?: string;
  productName?: string;
  cartTotal?: number;
  orderId?: string;
  isReturning?: boolean;
  project?: string;
};

// ─── Роли персонала ───────────────────────────────────────────────────────────
const STAFF_ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Владелец бизнеса",
  ADMIN: "Администратор",
  MANAGER: "Менеджер по продажам",
  COURIER: "Курьер",
  ACCOUNTANT: "Бухгалтер",
  WAREHOUSE: "Кладовщик",
  SELLER: "Продавец",
};

// ─── Контекст раздела админки ─────────────────────────────────────────────────
const ADMIN_SECTION_MAP: Record<string, { name: string; intro: string }> = {
  "/admin": {
    name: "Дашборд",
    intro: "Показываю сводку бизнеса — заказы дня, выручку, что срочно. Могу детали за сегодня, неделю или месяц.",
  },
  "/admin/orders": {
    name: "Заказы",
    intro: "Вижу все заказы. Нахожу нужный, меняю статус, фильтрую по любому параметру — скажи что нужно.",
  },
  "/admin/crm": {
    name: "CRM — Лиды",
    intro: "Воронка продаж. Вызываю get_crm_leads сразу и показываю лиды по этапам воронки, горячих клиентов, кто в работе.",
  },
  "/admin/products": {
    name: "Каталог товаров",
    intro: "Все товары с ценами и наличием. Нахожу нужный, смотрю что заканчивается, что популярно.",
  },
  "/admin/clients": {
    name: "Клиенты",
    intro: "База покупателей. Нахожу клиента, смотрю историю заказов, постоянных и новых.",
  },
  "/admin/analytics": {
    name: "Аналитика",
    intro: "Цифры бизнеса: выручка по периодам, лучшие товары, динамика продаж, конверсия.",
  },
  "/admin/finance": {
    name: "Финансы",
    intro: "Выручка, средний чек, сравнение периодов. Считаю за любой период — скажи какой.",
  },
  "/admin/inventory": {
    name: "Склад / Остатки",
    intro: "Вызываю get_inventory_status сразу и показываю остатки — что заканчивается, чего нет в наличии.",
  },
  "/admin/tasks": {
    name: "Задачи",
    intro: "Вызываю get_tasks сразу и показываю задачи команды: просроченные, в работе, срочные. Умею создавать задачи через create_task.",
  },
  "/admin/delivery": {
    name: "Доставка",
    intro: "Активные доставки, маршруты, задержки. Вижу всё что в пути прямо сейчас.",
  },
  "/admin/staff": {
    name: "Команда",
    intro: "Показываю команду — имя, роль, email каждого сотрудника. Вызываю get_staff_list сразу без лишних слов.",
  },
  "/admin/settings": {
    name: "Настройки сайта",
    intro: "Настройки: SMTP почта, Telegram бот, домен, SSL. Объясняю и помогаю настроить что нужно.",
  },
  "/admin/email": {
    name: "Email рассылки",
    intro: "Рассылки клиентам. Помогаю составить письмо, объясняю настройки SMTP.",
  },
  "/admin/reviews": {
    name: "Отзывы",
    intro: "Вызываю get_reviews сразу и показываю отзывы покупателей — рейтинг, опубликованные, на модерации.",
  },
  "/admin/promotion": {
    name: "Продвижение",
    intro: "Маркетинг и реклама. Помогаю с настройкой площадок, рекомендую стратегию продвижения.",
  },
  "/admin/import": {
    name: "Импорт товаров",
    intro: "Импорт с Ozon, Wildberries, CSV. Объясняю процесс, помогаю с форматами.",
  },
  "/admin/site": {
    name: "Настройки сайта",
    intro: "Внешний вид и контент сайта. Помогаю изменить тексты, контакты, SEO.",
  },
};

function getAdminSection(page: string) {
  if (ADMIN_SECTION_MAP[page]) return ADMIN_SECTION_MAP[page];
  const match = Object.keys(ADMIN_SECTION_MAP)
    .filter(k => k !== "/admin" && page.startsWith(k))
    .sort((a, b) => b.length - a.length)[0];
  return match ? ADMIN_SECTION_MAP[match] : ADMIN_SECTION_MAP["/admin"];
}

// ─── Системный промпт для ADMIN / STAFF ──────────────────────────────────────
function buildAdminSystemPrompt(
  site: AraySiteContext,
  roleLabel: string,
  section: { name: string; intro: string },
): string {
  return `Ты — Арай. Умный бизнес-партнёр команды ${site.siteName || "ПилоРус"}.
Ты в панели управления. Работаешь с живыми людьми — своей командой.

СЕЙЧАС РАЗДЕЛ: ${section.name}
В этом разделе умею: ${section.intro}

С КЕМ РАБОТАЕШЬ: ${roleLabel}
${site.phone ? `Телефон: ${site.phone}` : ""}${site.address ? ` · Адрес: ${site.address}` : ""}

КАК ГОВОРИШЬ:
— На ТЫ, как умный коллега и партнёр
— Коротко и конкретно: 2-4 предложения. Подробно только если нужно
— Когда спрашивают "что умеешь" — СНАЧАЛА про этот раздел (${section.name}), потом упомяни остальное
— Если нужны данные — СРАЗУ вызывай инструмент, не спрашивай разрешения
— Делаешь действия сам: меняешь статусы, находишь заказы, показываешь статистику
— Предлагай конкретное: не "могу помочь", а "хочешь покажу все новые заказы прямо сейчас?"
— НЕ говоришь про расчёт стройматериалов, баню, дом — это для клиентов на сайте
— Эмодзи: ✅ 📦 💰 ⚡ 🎯 только по делу, редко

ИНСТРУМЕНТЫ — вызывай БЕЗ СПРОСА:
— get_admin_dashboard → сводка заказов и выручки
— get_orders_list → список заказов по статусу
— get_clients_list → клиенты с историей
— update_order_status → изменить статус прямо сейчас
— get_products_list → каталог с ценами и наличием
— get_staff_list → список сотрудников команды
— web_search → поиск в интернете — цены, конкуренты, новости

СТРОГО:
— НЕ говори что раздел "в разработке" или "ещё не запущен" — ты этого не знаешь
— НЕ выдумывай данные — если нужны цифры или списки, ВЫЗОВИ инструмент
— Если инструмента нет — скажи честно "эти данные я пока не загружаю, но могу помочь через другой раздел"
— Никогда не говори "добавление сотрудников ещё не запущено" — раздел Команда работает`;
}

// ─── Системный промпт для КЛИЕНТА ────────────────────────────────────────────
function buildCustomerSystemPrompt(
  site: AraySiteContext,
  userName: string | undefined,
  page: ArayPageContext,
): string {
  const businessLabel =
    site.businessType === "lumber" ? "пиломатериалы, строительные материалы"
    : site.businessType === "restaurant" ? "ресторан, доставка еды"
    : site.businessType === "furniture" ? "мебель, интерьер"
    : "товары и услуги";

  const pageHint = page.productName
    ? `Клиент смотрит товар: «${page.productName}».`
    : page.cartTotal && page.cartTotal > 0
    ? `В корзине товаров на ${page.cartTotal.toLocaleString("ru-RU")} ₽.`
    : page.page === "catalog" ? "Клиент просматривает каталог."
    : "";

  const projectHint = page.project
    ? `\n\nПРОЕКТ КЛИЕНТА: ${page.project}\nУчитывай этот проект — подбирай материалы под него.`
    : "";

  return `Ты — Арай. Умный советник по строительству от ${site.siteName || "ПилоРус"} (${businessLabel}).${site.phone ? ` Тел: ${site.phone}.` : ""}${site.address ? ` Адрес: ${site.address}.` : ""}
${pageHint}${projectHint}

КАК ГОВОРИШЬ:
— На ТЫ, по-братски, живо и тепло — ты друг-специалист
— Коротко: 2-5 предложений. Подробно когда нужен расчёт
— Если знаешь имя — зови по имени
— Заканчивай живым вопросом, не "могу чем-то помочь?"
— Эмодзи: 🔥 ✅ 📦 💰 ⚡ — максимум 1-2, только уместно

ЧТО УМЕЕШЬ:
— Рассчитать материалы для любого проекта (баня, дом, забор, кровля, пол)
— Подобрать нужные товары из каталога
— Посчитать кубатуру досок и бруса
— Проверить статус заказа
— Найти что угодно в интернете

Когда клиент говорит что строит — уточни размеры и посчитай материалы. Предложи добавить в корзину.

ИНСТРУМЕНТЫ:
— search_products → найти товар
— calculate_volume → кубатура
— calculate_project_materials → расчёт материалов
— get_order_status → статус заказа
— web_search → поиск в интернете`;
}

// ─── Главная функция ──────────────────────────────────────────────────────────
export function buildAraySystemPrompt(
  site: AraySiteContext,
  user: ArayUserContext,
  page: ArayPageContext
): string {
  const isAdminOrStaff = user.role === "admin" || user.role === "staff";

  if (isAdminOrStaff) {
    const roleLabel = STAFF_ROLE_LABELS[user.staffRole || ""] || user.staffRole || "Сотрудник";
    const section = getAdminSection(page.page || "/admin");
    return buildAdminSystemPrompt(site, roleLabel, section);
  }

  // Customer mode
  return buildCustomerSystemPrompt(site, user.name, page);
}

// Умные чипы (используются в клиентском виджете)
export function buildArayChips(page: ArayPageContext): string[] {
  if (page.project) return ["Продолжаем проект?", "Что ещё нужно?", "Посчитай стоимость"];
  if (page.productName) return ["Сколько нужно для проекта?", "Чем отличается?", "Посчитай стоимость"];
  if (page.cartTotal && page.cartTotal > 0) return ["Помоги оформить", "Всё учёл?", "Как быстро доставят?"];
  if (page.page === "catalog") return ["Строю дом — помоги рассчитать", "Строю баню 4×5", "Нужен забор 50м"];
  return ["Строю дом — помоги рассчитать", "Строю баню 4×5", "Как выбрать доску?"];
}

// Умное приветствие
export function buildArayGreeting(page: ArayPageContext): string {
  const hour = new Date().getHours();
  const time = hour < 6 ? "Не спится?" : hour < 12 ? "Доброе утро" : hour < 17 ? "Привет" : hour < 22 ? "Добрый вечер" : "Поздно уже";

  if (page.project) {
    const short = page.project.length > 60 ? page.project.slice(0, 57) + "..." : page.project;
    return `${time}! Помню твой проект: ${short} Продолжаем?`;
  }

  if (page.isReturning) {
    if (page.productName) return `С возвращением! Смотришь «${page.productName}» — уже решил или ещё думаешь?`;
    return `С возвращением! Расскажи что строишь — помогу рассчитать всё до гвоздя.`;
  }

  if (page.productName) return `${time}! Смотришь «${page.productName}» — скажи что строишь, посчитаю сколько нужно.`;
  if (page.cartTotal && page.cartTotal > 0) return `${time}! Вижу, уже набрал на ${page.cartTotal.toLocaleString("ru-RU")} ₽. Помочь оформить?`;
  if (page.page === "catalog") return `${time}! Что строишь? Расскажи — подберём материалы и посчитаем.`;

  return `${time}! Я Арай — твой строительный советник. Расскажи что планируешь построить.`;
}

// ─── Инструменты Арая ─────────────────────────────────────────────────────────

export const ARAY_TOOLS = [
  {
    name: "search_products",
    description: "Поиск товаров в каталоге по названию или описанию",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Что ищем (название, характеристика)" },
      },
      required: ["query"],
    },
  },
  {
    name: "calculate_volume",
    description: "Рассчитать кубатуру пиломатериалов (длина × ширина × высота × количество штук)",
    input_schema: {
      type: "object" as const,
      properties: {
        length: { type: "number", description: "Длина в метрах" },
        width: { type: "number", description: "Ширина в метрах (например 0.15 для 150мм)" },
        height: { type: "number", description: "Высота/толщина в метрах (например 0.05 для 50мм)" },
        count: { type: "number", description: "Количество штук" },
      },
      required: ["length", "width", "height"],
    },
  },
  {
    name: "get_order_status",
    description: "Получить статус заказа по номеру",
    input_schema: {
      type: "object" as const,
      properties: {
        orderNumber: { type: "number", description: "Номер заказа" },
      },
      required: ["orderNumber"],
    },
  },
  {
    name: "calculate_project_materials",
    description: "Рассчитать список материалов для строительного проекта — дом, баня, беседка, забор, пол, кровля",
    input_schema: {
      type: "object" as const,
      properties: {
        project_type: {
          type: "string",
          description: "Тип объекта: house (дом), banya (баня), gazebo (беседка), fence (забор), floor (пол), roof (крыша), wall (стены)",
          enum: ["house", "banya", "gazebo", "fence", "floor", "roof", "wall"],
        },
        length: { type: "number", description: "Длина объекта в метрах" },
        width: { type: "number", description: "Ширина объекта в метрах" },
        floors: { type: "number", description: "Количество этажей (для дома/бани)" },
        fence_length: { type: "number", description: "Длина забора в погонных метрах" },
        construction_type: {
          type: "string",
          description: "Тип конструкции: frame (каркасный), log (брусовой/бревенчатый), brick (кирпичный с деревянными перекрытиями)",
          enum: ["frame", "log", "brick"],
        },
      },
      required: ["project_type"],
    },
  },
  {
    name: "get_admin_dashboard",
    description: "Получить сводку по заказам и выручке за сегодня и последние дни. Используй ВСЕГДА когда спрашивают о заказах, выручке, статистике, сводке.",
    input_schema: {
      type: "object" as const,
      properties: {
        period: { type: "string", description: "today, week, month", enum: ["today", "week", "month"] },
      },
      required: [],
    },
  },
  {
    name: "get_orders_list",
    description: "Получить список последних заказов с клиентами, суммами и статусами. Используй при вопросах о заказах.",
    input_schema: {
      type: "object" as const,
      properties: {
        status: { type: "string", description: "NEW, CONFIRMED, PROCESSING, DELIVERED, CANCELLED — или пусто для всех" },
        limit: { type: "number", description: "Сколько заказов (по умолчанию 10)" },
      },
      required: [],
    },
  },
  {
    name: "get_clients_list",
    description: "Получить список клиентов с контактами и количеством заказов",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Поиск по имени или телефону" },
        limit: { type: "number", description: "Количество (по умолчанию 10)" },
      },
      required: [],
    },
  },
  {
    name: "update_order_status",
    description: "Изменить статус заказа. Используй когда просят поменять статус.",
    input_schema: {
      type: "object" as const,
      properties: {
        orderNumber: { type: "number", description: "Номер заказа" },
        status: {
          type: "string",
          enum: ["NEW", "CONFIRMED", "PROCESSING", "SHIPPED", "IN_DELIVERY", "READY_PICKUP", "DELIVERED", "COMPLETED", "CANCELLED"],
        },
      },
      required: ["orderNumber", "status"],
    },
  },
  {
    name: "get_products_list",
    description: "Получить список товаров каталога с ценами и наличием",
    input_schema: {
      type: "object" as const,
      properties: {
        category: { type: "string", description: "Фильтр по категории" },
        inStockOnly: { type: "boolean", description: "Только в наличии" },
        limit: { type: "number", description: "Количество (по умолчанию 15)" },
      },
      required: [],
    },
  },
  {
    name: "web_search",
    description: "Поиск информации в интернете. Используй когда нужны актуальные данные, цены, новости, инструкции.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Поисковый запрос" },
      },
      required: ["query"],
    },
  },
  {
    name: "get_staff_list",
    description: "Список сотрудников компании: имя, роль, email. Вызывай когда спрашивают про команду, сотрудников, кто работает.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "get_tasks",
    description: "Получить список задач. Вызывай ВСЕГДА на странице Задачи и когда спрашивают о задачах, просроченных, дедлайнах, кто что делает.",
    input_schema: {
      type: "object" as const,
      properties: {
        status: { type: "string", description: "TODO, IN_PROGRESS, DONE, CANCELLED — или пусто для всех" },
        limit: { type: "number", description: "Количество (по умолчанию 20)" },
      },
      required: [],
    },
  },
  {
    name: "create_task",
    description: "Создать новую задачу. Вызывай когда просят добавить, создать, поставить задачу.",
    input_schema: {
      type: "object" as const,
      properties: {
        title: { type: "string", description: "Название задачи" },
        description: { type: "string", description: "Описание (опционально)" },
        priority: { type: "string", description: "HIGH, MEDIUM, LOW", enum: ["HIGH", "MEDIUM", "LOW"] },
        dueDate: { type: "string", description: "Дата дедлайна YYYY-MM-DD (опционально)" },
      },
      required: ["title"],
    },
  },
  {
    name: "get_crm_leads",
    description: "Получить список лидов CRM по этапам воронки. Вызывай на странице CRM и когда спрашивают о лидах, воронке продаж.",
    input_schema: {
      type: "object" as const,
      properties: {
        stage: { type: "string", description: "NEW, CONTACTED, QUALIFIED, PROPOSAL, NEGOTIATION, WON, LOST — или пусто для всех" },
        limit: { type: "number", description: "Количество (по умолчанию 15)" },
      },
      required: [],
    },
  },
  {
    name: "get_reviews",
    description: "Получить отзывы покупателей. Вызывай на странице Отзывы и когда спрашивают об отзывах, рейтинге.",
    input_schema: {
      type: "object" as const,
      properties: {
        published: { type: "boolean", description: "true — только опубликованные, false — только на модерации" },
        limit: { type: "number", description: "Количество (по умолчанию 10)" },
      },
      required: [],
    },
  },
  {
    name: "get_inventory_status",
    description: "Получить состояние склада — остатки товаров, что заканчивается, чего нет. Вызывай на странице Склад/Остатки.",
    input_schema: {
      type: "object" as const,
      properties: {
        lowThreshold: { type: "number", description: "Порог 'мало' (по умолчанию 5)" },
        limit: { type: "number", description: "Количество товаров (по умолчанию 20)" },
      },
      required: [],
    },
  },
];

// ─── Расчёт материалов для проекта ───────────────────────────────────────────

export type MaterialItem = {
  name: string;
  section?: string;
  unit: string;
  quantity: number;
  note?: string;
};

export type ProjectMaterials = {
  project: string;
  items: MaterialItem[];
  totalNote: string;
};

export function calculateProjectMaterials(input: {
  project_type: string;
  length?: number;
  width?: number;
  floors?: number;
  fence_length?: number;
  construction_type?: string;
}): ProjectMaterials {
  const {
    project_type,
    length = 6,
    width = 4,
    floors = 1,
    fence_length = 20,
    construction_type = "frame",
  } = input;

  const L = length;
  const W = width;
  const N = Math.max(1, Math.min(floors, 3));
  const floorH = 2.7;
  const perimeter = 2 * (L + W);
  const area = L * W;

  if (project_type === "fence") {
    const fl = fence_length;
    const postCount = Math.ceil(fl / 2.5) + 1;
    const boardCount = Math.ceil((fl * 2) / 6);
    const picketCount = Math.ceil(fl / 0.1);
    return {
      project: `Забор ${fl} пог.м`,
      items: [
        { name: "Брус (столбы)", section: "100×100", unit: "шт", quantity: postCount, note: "длина 3м (1.5м в землю)" },
        { name: "Доска (прожилины)", section: "50×100", unit: "шт", quantity: boardCount, note: "длина 6м, 2 ряда" },
        { name: "Штакетник", section: "20×100", unit: "шт", quantity: picketCount, note: "высота 1.5м" },
        { name: "Профнастил (альтернатива)", section: "С8", unit: "м²", quantity: Math.ceil(fl * 1.5), note: "при высоте 1.5м" },
      ],
      totalNote: `Длина ограждения: ${fl} м · ${postCount} столбов через 2.5м`,
    };
  }

  if (project_type === "floor") {
    const lagCount = Math.ceil(L / 0.6) + 1;
    const osbSheets = Math.ceil((area * 1.05) / 2.975);
    return {
      project: `Пол ${L}×${W}м`,
      items: [
        { name: "Лаги пола", section: "50×150", unit: "м³", quantity: round3(0.05 * 0.15 * W * lagCount), note: `${lagCount} шт × ${W}м, шаг 600мм` },
        { name: "ОСП/OSB 9мм", unit: "лист", quantity: osbSheets, note: "лист 2440×1220мм" },
        { name: "Доска половая", section: "28×130", unit: "м²", quantity: Math.ceil(area * 1.08), note: "с запасом 8%" },
        { name: "Утеплитель (Роквул/Knauf)", unit: "м²", quantity: Math.ceil(area), note: "150мм, для тёплого пола" },
      ],
      totalNote: `Площадь: ${area} м²`,
    };
  }

  if (project_type === "roof") {
    const rafterLen = round2(Math.sqrt(Math.pow(W / 2, 2) + Math.pow(W * 0.35, 2)));
    const rafterCount = (Math.ceil(L / 0.6) + 1) * 2;
    const roofArea = round2(L * rafterLen * 2 * 1.1);
    return {
      project: `Кровля ${L}×${W}м`,
      items: [
        { name: "Стропила", section: "50×150", unit: "м³", quantity: round3(0.05 * 0.15 * rafterLen * rafterCount), note: `${rafterCount} шт × ${rafterLen}м` },
        { name: "Конёк", section: "50×150", unit: "шт", quantity: Math.ceil(L / 6), note: `длина ${L}м` },
        { name: "Мауэрлат", section: "100×150", unit: "пог.м", quantity: Math.ceil(perimeter), note: "по периметру" },
        { name: "Обрешётка", section: "25×100", unit: "м³", quantity: round3(0.025 * 0.1 * roofArea / 0.3 * 0.3), note: "шаг 300мм" },
        { name: "Металлочерепица / профнастил", unit: "м²", quantity: Math.ceil(roofArea), note: "с учётом свесов" },
      ],
      totalNote: `Площадь кровли: ~${roofArea} м²`,
    };
  }

  if (project_type === "gazebo") {
    return {
      project: `Беседка ${L}×${W}м`,
      items: [
        { name: "Брус (стойки)", section: "100×100", unit: "шт", quantity: 6, note: "длина 3м" },
        { name: "Брус (обвязка)", section: "100×100", unit: "пог.м", quantity: Math.ceil(perimeter * 2), note: "верх + низ" },
        { name: "Доска (настил)", section: "28×130", unit: "м²", quantity: Math.ceil(area * 1.08), note: "пол беседки" },
        { name: "Стропила кровли", section: "50×100", unit: "шт", quantity: (Math.ceil(L / 0.6) + 1) * 2, note: "двускатная" },
        { name: "Вагонка (обшивка)", section: "20×96", unit: "м²", quantity: Math.ceil(perimeter * 1.5), note: "боковые стены" },
        { name: "Металлочерепица", unit: "м²", quantity: Math.ceil(area * 1.4), note: "кровля" },
      ],
      totalNote: `Площадь: ${area} м² · Периметр: ${perimeter} м`,
    };
  }

  if (construction_type === "frame" || project_type === "banya") {
    const lagCountPerFloor = Math.ceil(L / 0.6) + 1;
    const lagVolume = round3(0.05 * 0.15 * W * lagCountPerFloor * (N + 1));
    const studCount = Math.ceil(perimeter / 0.6) * N + Math.ceil(L / 0.6) * N;
    const studVolume = round3(0.05 * 0.15 * floorH * studCount);
    const bindVolume = round3(0.05 * 0.15 * perimeter * 2 * N);
    const rafterLen = round2(Math.sqrt(Math.pow(W / 2, 2) + Math.pow(W * 0.3, 2)));
    const rafterCount = (Math.ceil(L / 0.6) + 1) * 2;
    const rafterVolume = round3(0.05 * 0.15 * rafterLen * rafterCount);
    const wallArea = perimeter * floorH * N;
    const osbWallSheets = Math.ceil((wallArea * 2 * 1.1) / 2.975);
    const osbFloorSheets = Math.ceil((area * N * 1.05) / 2.975);
    const osbRoofSheets = Math.ceil((L * rafterLen * 2 * 1.1) / 2.975);
    const label = project_type === "banya" ? `Баня ${L}×${W}м` : `Дом ${L}×${W}м ${N > 1 ? N + "-этажный" : "одноэтажный"} каркасный`;

    return {
      project: label,
      items: [
        { name: "Доска (лаги пола/перекрытий)", section: "50×150", unit: "м³", quantity: lagVolume, note: `шаг 600мм` },
        { name: "Доска (стойки стен)", section: "50×150", unit: "м³", quantity: studVolume, note: `${studCount} шт` },
        { name: "Доска (обвязка)", section: "50×150", unit: "м³", quantity: bindVolume, note: "верх + низ" },
        { name: "Доска (стропила)", section: "50×150", unit: "м³", quantity: rafterVolume, note: `${rafterCount} шт` },
        { name: "ОСП/OSB 9мм (стены)", unit: "лист", quantity: osbWallSheets, note: "наружная + внутренняя" },
        { name: "ОСП/OSB 12мм (полы)", unit: "лист", quantity: osbFloorSheets, note: "лист 2440×1220мм" },
        { name: "ОСП/OSB 9мм (кровля)", unit: "лист", quantity: osbRoofSheets, note: "сплошная обрешётка" },
        { name: "Утеплитель", unit: "м²", quantity: Math.ceil(wallArea + area * (N + 1)), note: "200мм стены, 150мм пол" },
        { name: "Вагонка / имитация бруса", section: "20×140", unit: "м²", quantity: Math.ceil(wallArea * 1.1), note: "фасад" },
        { name: "Металлочерепица", unit: "м²", quantity: Math.ceil(L * rafterLen * 2 * 1.15), note: "кровля с учётом свесов" },
      ],
      totalNote: `Площадь: ${area * N} м² · Периметр: ${perimeter} м`,
    };
  }

  if (construction_type === "log") {
    const wallHeight = floorH * N;
    const logPerimeter = perimeter + L;
    const logVolume = round3(0.15 * 0.15 * wallHeight * logPerimeter);
    const rafterLen = round2(Math.sqrt(Math.pow(W / 2, 2) + Math.pow(W * 0.3, 2)));
    const rafterCount = (Math.ceil(L / 0.6) + 1) * 2;

    return {
      project: `Дом ${L}×${W}м ${N > 1 ? N + "-этажный" : "одноэтажный"} брусовой`,
      items: [
        { name: "Брус (стены)", section: "150×150", unit: "м³", quantity: logVolume, note: `периметр ${perimeter}м` },
        { name: "Доска (лаги пола)", section: "50×150", unit: "м³", quantity: round3(0.05 * 0.15 * W * (Math.ceil(L / 0.6) + 1) * N), note: "шаг 600мм" },
        { name: "Стропила", section: "50×150", unit: "м³", quantity: round3(0.05 * 0.15 * rafterLen * rafterCount), note: `${rafterCount} шт` },
        { name: "Обрешётка (шаговая)", section: "25×100", unit: "м²", quantity: Math.ceil(L * rafterLen * 2), note: "шаг 350мм" },
        { name: "Межвенцовый утеплитель (джут)", unit: "м", quantity: Math.ceil(logPerimeter * wallHeight / 0.15), note: "между рядами" },
        { name: "Металлочерепица", unit: "м²", quantity: Math.ceil(L * rafterLen * 2 * 1.15), note: "кровля" },
        { name: "Доска пола", section: "28×130", unit: "м²", quantity: Math.ceil(area * N * 1.08), note: "" },
      ],
      totalNote: `Площадь: ${area * N} м² · Объём бруса: ${logVolume} м³`,
    };
  }

  return {
    project: `${project_type} ${L}×${W}м`,
    items: [{ name: "Уточни параметры у менеджера", unit: "", quantity: 0 }],
    totalNote: "Расчёт требует уточнения",
  };
}

function round2(n: number) { return Math.round(n * 100) / 100; }
function round3(n: number) { return Math.round(n * 1000) / 1000; }
