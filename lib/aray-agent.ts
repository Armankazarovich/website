/**
 * АРАЙ — Строительный мозг от ARAY PRODUCTIONS
 *
 * Арай знает твой проект. Запоминает всё. Считает материалы.
 * Первый в России ИИ-советник для строительства — прораб в кармане.
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
  project?: string; // Сохранённый проект из памяти
};

export function buildAraySystemPrompt(
  site: AraySiteContext,
  user: ArayUserContext,
  page: ArayPageContext
): string {
  const businessLabel =
    site.businessType === "lumber" ? "пиломатериалы, строительные материалы"
    : site.businessType === "restaurant" ? "ресторан, доставка еды"
    : site.businessType === "furniture" ? "мебель, интерьер"
    : "товары и услуги";

  const pageHint = page.productName
    ? `Человек сейчас смотрит на товар: «${page.productName}».`
    : page.cartTotal && page.cartTotal > 0
    ? `В корзине товаров на ${page.cartTotal.toLocaleString("ru-RU")} ₽.`
    : page.page === "catalog" ? "Человек просматривает каталог."
    : page.page?.includes("cart") ? "Человек в корзине, возможно готовится к оформлению заказа."
    : page.page?.includes("admin") ? `Человек в административной панели, раздел: ${page.page}.`
    : "";

  const projectHint = page.project
    ? `\n\n━━━ ТЕКУЩИЙ ПРОЕКТ ПОЛЬЗОВАТЕЛЯ ━━━\n${page.project}\nУЧИТЫВАЙ ЭТОТ ПРОЕКТ при каждом ответе. Подбирай товары и расчёты под него.`
    : "";

  const isAdmin = page.page?.includes("admin");

  return `Ты — Арай. Не бот. Умный друг — говоришь как человек, коротко и по делу.

Платформа: ${site.siteName || "ПилоРус"} (${businessLabel}).${site.phone ? ` Тел: ${site.phone}.` : ""}${site.address ? ` Адрес: ${site.address}.` : ""}
${pageHint}${projectHint}

ХАРАКТЕР:
- Говоришь на ТЫ, по-братски, без шаблонов
- Если знаешь имя — зови по имени
- Коротко: 2-5 предложений. Длинно — только если реально нужно
- Заканчивай живым вопросом — не "могу ли я чем-то помочь?", а конкретным
- Эмодзи: максимум 1-2 и только если реально к месту (🔥✅📦💰⚡🎯). Не ставь просто так
- НЕ говори: "я не могу", "у меня нет доступа" — вызови инструмент и реши

ФОРМАТИРОВАНИЕ:
- Используй **жирный** для важного, списки для перечислений
- НЕ используй таблицы Markdown (| col |) — пиши список
- НЕ используй --- разделители

${isAdmin ? `РЕЖИМ АДМИНИСТРАТОРА:
При вопросах о заказах/выручке/клиентах — СНАЧАЛА вызови инструмент:
- get_admin_dashboard → сводка (сегодня/неделя/месяц)
- get_orders_list → список заказов
- get_clients_list → клиенты
- update_order_status → изменить статус
- get_products_list → каталог товаров` : ""}
- search_products → найти товар
- calculate_volume → кубатура
- calculate_project_materials → расчёт материалов (баня, дом, забор...)
- get_order_status → статус заказа
- web_search → поиск в интернете

Когда человек говорит что строит — спроси размеры и посчитай материалы. Потом предложи добавить в корзину.

Кнопки-действия (только по делу, макс 2 в конце):
ARAY_ACTIONS:[{"type":"navigate","url":"/admin/orders","label":"Заказы","icon":"orders"}]`;
}

// Умное приветствие с учётом проекта
export function buildArayGreeting(page: ArayPageContext): string {
  const hour = new Date().getHours();
  const time = hour < 6 ? "Не спится?" : hour < 12 ? "Доброе утро" : hour < 17 ? "Привет" : hour < 22 ? "Добрый вечер" : "Поздно уже";

  // Если проект сохранён — сразу о нём
  if (page.project) {
    const short = page.project.length > 60 ? page.project.slice(0, 57) + "..." : page.project;
    return `${time}! 👋 Помню твой проект: ${short} Продолжаем?`;
  }

  if (page.isReturning) {
    if (page.productName) return `С возвращением! 👋 Смотришь «${page.productName}» — уже решил или ещё думаешь?`;
    return `С возвращением! 👋 Расскажи что строишь — помогу рассчитать всё до гвоздя.`;
  }

  if (page.productName) {
    return `${time}! 👋 Смотришь «${page.productName}» — скажи что строишь, посчитаю сколько нужно.`;
  }

  if (page.cartTotal && page.cartTotal > 0) {
    return `${time}! 👋 Вижу, уже набрал на ${page.cartTotal.toLocaleString("ru-RU")} ₽. Помочь оформить или что-то ещё добавить?`;
  }

  if (page.page === "catalog") {
    return `${time}! 👋 Что строишь? Расскажи — подберём материалы и посчитаем количество.`;
  }

  if (page.page?.includes("admin")) {
    return `${time}! 👋 Я Арай — если что по системе, заказам или любой ситуации — спрашивай.`;
  }

  return `${time}! 👋 Я Арай — твой строительный советник. Расскажи что планируешь построить 🏗️`;
}

// Умные чипы — контекстные подсказки
export function buildArayChips(page: ArayPageContext): string[] {
  if (page.project) {
    return [
      "Что ещё нужно для проекта?",
      "Сколько это будет стоить?",
      "Добавь в корзину",
    ];
  }

  if (page.productName) {
    return [
      "Сколько нужно для моего проекта?",
      "Чем отличается от аналогов?",
      "Посчитай стоимость",
    ];
  }

  if (page.cartTotal && page.cartTotal > 0) {
    return [
      "Помоги оформить заказ",
      "Всё ли я учёл?",
      "Как быстро доставят?",
    ];
  }

  if (page.page === "catalog") {
    return [
      "Строю дом — помоги с расчётом",
      "Строю баню 4×5",
      "Нужен забор 50 метров",
    ];
  }

  return [
    "Строю дом — помоги рассчитать",
    "Строю баню 4×5",
    "Как выбрать доску?",
  ];
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
];

// ─── Расчёт материалов для проекта ───────────────────────────────────────────

export type MaterialItem = {
  name: string;
  section?: string;     // "50×150" или "OSB 9мм"
  unit: string;         // "м³", "шт", "м²", "пог.м"
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
  const floorH = 2.7; // высота этажа
  const perimeter = 2 * (L + W);
  const area = L * W;

  // ── ЗАБОР ─────────────────────────────────────────────────────────────────
  if (project_type === "fence") {
    const fl = fence_length;
    const postCount = Math.ceil(fl / 2.5) + 1;
    const boardCount = Math.ceil((fl * 2) / 6); // горизонтальные прожилины 6м
    const picketCount = Math.ceil(fl / 0.1); // штакетник 100мм, плотно
    return {
      project: `Забор ${fl} пог.м`,
      items: [
        { name: "Брус (столбы)", section: "100×100", unit: "шт", quantity: postCount, note: "длина 3м (1.5м в землю)" },
        { name: "Доска (прожилины)", section: "50×100", unit: "шт", quantity: boardCount, note: "длина 6м, 2 ряда" },
        { name: "Штакетник", section: "20×100", unit: "шт", quantity: picketCount, note: "высота 1.5м" },
        { name: "Профнастил (альтернатива штакетнику)", section: "С8", unit: "м²", quantity: Math.ceil(fl * 1.5), note: "при высоте 1.5м" },
      ],
      totalNote: `Длина ограждения: ${fl} м · ${postCount} столбов через 2.5м`,
    };
  }

  // ── ПОЛ ───────────────────────────────────────────────────────────────────
  if (project_type === "floor") {
    const lagCount = Math.ceil(L / 0.6) + 1;
    const osbSheets = Math.ceil((area * 1.05) / 2.975); // OSB 2440×1220
    return {
      project: `Пол ${L}×${W}м`,
      items: [
        { name: "Лаги пола", section: "50×150", unit: "м³", quantity: round3(0.05 * 0.15 * W * lagCount), note: `${lagCount} шт × ${W}м, шаг 600мм` },
        { name: "ОСП/OSB 9мм", unit: "лист", quantity: osbSheets, note: "лист 2440×1220мм" },
        { name: "Доска половая", section: "28×130", unit: "м²", quantity: Math.ceil(area * 1.08), note: "с запасом 8% на подрезку" },
        { name: "Утеплитель (Роквул/Knauf)", unit: "м²", quantity: Math.ceil(area), note: "150мм, для тёплого пола" },
      ],
      totalNote: `Площадь: ${area} м²`,
    };
  }

  // ── КРЫША ─────────────────────────────────────────────────────────────────
  if (project_type === "roof") {
    const rafterLen = round2(Math.sqrt(Math.pow(W / 2, 2) + Math.pow(W * 0.35, 2))); // угол ~35°
    const rafterCount = (Math.ceil(L / 0.6) + 1) * 2;
    const roofArea = round2(L * rafterLen * 2 * 1.1);
    return {
      project: `Кровля ${L}×${W}м`,
      items: [
        { name: "Стропила", section: "50×150", unit: "м³", quantity: round3(0.05 * 0.15 * rafterLen * rafterCount), note: `${rafterCount} шт × ${rafterLen}м` },
        { name: "Конёк", section: "50×150", unit: "шт", quantity: Math.ceil(L / 6), note: `длина ${L}м, досками по 6м` },
        { name: "Мауэрлат", section: "100×150", unit: "пог.м", quantity: Math.ceil(perimeter), note: "по периметру" },
        { name: "Обрешётка", section: "25×100", unit: "м³", quantity: round3(0.025 * 0.1 * roofArea / 0.3 * 0.3), note: "шаг 300мм" },
        { name: "Металлочерепица / профнастил", unit: "м²", quantity: Math.ceil(roofArea), note: "площадь кровли с учётом свесов" },
      ],
      totalNote: `Площадь кровли: ~${roofArea} м²`,
    };
  }

  // ── БЕСЕДКА ───────────────────────────────────────────────────────────────
  if (project_type === "gazebo") {
    return {
      project: `Беседка ${L}×${W}м`,
      items: [
        { name: "Брус (стойки)", section: "100×100", unit: "шт", quantity: 6, note: "длина 3м, по углам и в центре" },
        { name: "Брус (обвязка)", section: "100×100", unit: "пог.м", quantity: Math.ceil(perimeter * 2), note: "верхняя и нижняя обвязка" },
        { name: "Доска (настил)", section: "28×130", unit: "м²", quantity: Math.ceil(area * 1.08), note: "пол беседки" },
        { name: "Стропила кровли", section: "50×100", unit: "шт", quantity: (Math.ceil(L / 0.6) + 1) * 2, note: "двускатная крыша" },
        { name: "Вагонка (обшивка)", section: "20×96", unit: "м²", quantity: Math.ceil(perimeter * 1.5), note: "боковые стены частично" },
        { name: "Металлочерепица", unit: "м²", quantity: Math.ceil(area * 1.4), note: "кровля" },
      ],
      totalNote: `Площадь: ${area} м² · Периметр: ${perimeter} м`,
    };
  }

  // ── ДОМ / БАНЯ (каркасный) ────────────────────────────────────────────────
  if (construction_type === "frame" || project_type === "banya") {
    // Лаги пола
    const lagCountPerFloor = Math.ceil(L / 0.6) + 1;
    const lagVolume = round3(0.05 * 0.15 * W * lagCountPerFloor * (N + 1)); // +1 чердак

    // Стойки стен (каждые 600мм по периметру + одна несущая стена внутри)
    const studCount = Math.ceil(perimeter / 0.6) * N + Math.ceil(L / 0.6) * N;
    const studVolume = round3(0.05 * 0.15 * floorH * studCount);

    // Обвязки (верх + низ на каждый этаж)
    const bindVolume = round3(0.05 * 0.15 * perimeter * 2 * N);

    // Стропила
    const rafterLen = round2(Math.sqrt(Math.pow(W / 2, 2) + Math.pow(W * 0.3, 2)));
    const rafterCount = (Math.ceil(L / 0.6) + 1) * 2;
    const rafterVolume = round3(0.05 * 0.15 * rafterLen * rafterCount);

    // OSB стены
    const wallArea = perimeter * floorH * N;
    const osbWallSheets = Math.ceil((wallArea * 2 * 1.1) / 2.975); // снаружи + изнутри
    const osbFloorSheets = Math.ceil((area * N * 1.05) / 2.975);
    const osbRoofSheets = Math.ceil((L * rafterLen * 2 * 1.1) / 2.975);

    const label = project_type === "banya" ? `Баня ${L}×${W}м` : `Дом ${L}×${W}м ${N > 1 ? N + "-этажный" : "одноэтажный"} каркасный`;

    return {
      project: label,
      items: [
        { name: "Доска (лаги пола/перекрытий)", section: "50×150", unit: "м³", quantity: lagVolume, note: `шаг 600мм` },
        { name: "Доска (стойки стен)", section: "50×150", unit: "м³", quantity: studVolume, note: `${studCount} шт, шаг 600мм` },
        { name: "Доска (обвязка)", section: "50×150", unit: "м³", quantity: bindVolume, note: "верх + низ каждого этажа" },
        { name: "Доска (стропила)", section: "50×150", unit: "м³", quantity: rafterVolume, note: `${rafterCount} шт × ${rafterLen}м` },
        { name: "ОСП/OSB 9мм (стены)", unit: "лист", quantity: osbWallSheets, note: "наружная + внутренняя обшивка" },
        { name: "ОСП/OSB 12мм (полы)", unit: "лист", quantity: osbFloorSheets, note: "лист 2440×1220мм" },
        { name: "ОСП/OSB 9мм (кровля)", unit: "лист", quantity: osbRoofSheets, note: "сплошная обрешётка" },
        { name: "Утеплитель (стены+пол+кровля)", unit: "м²", quantity: Math.ceil(wallArea + area * (N + 1)), note: "200мм стены, 150мм пол" },
        { name: "Вагонка / имитация бруса (фасад)", section: "20×140", unit: "м²", quantity: Math.ceil(wallArea * 1.1), note: "с учётом нахлёста" },
        { name: "Металлочерепица (кровля)", unit: "м²", quantity: Math.ceil(L * rafterLen * 2 * 1.15), note: "с учётом свесов" },
      ],
      totalNote: `Площадь: ${area * N} м² · Периметр: ${perimeter} м · Высота: ${floorH * N}м`,
    };
  }

  // ── БРУСОВОЙ/БРЕВЕНЧАТЫЙ ─────────────────────────────────────────────────
  if (construction_type === "log") {
    const wallHeight = floorH * N;
    const logPerimeter = perimeter + L; // + одна внутренняя стена
    const logVolume = round3(0.15 * 0.15 * wallHeight * logPerimeter); // брус 150×150
    const rafterLen = round2(Math.sqrt(Math.pow(W / 2, 2) + Math.pow(W * 0.3, 2)));
    const rafterCount = (Math.ceil(L / 0.6) + 1) * 2;

    return {
      project: `Дом ${L}×${W}м ${N > 1 ? N + "-этажный" : "одноэтажный"} брусовой`,
      items: [
        { name: "Брус (стены)", section: "150×150", unit: "м³", quantity: logVolume, note: `периметр ${perimeter}м, высота ${wallHeight}м` },
        { name: "Доска (лаги пола)", section: "50×150", unit: "м³", quantity: round3(0.05 * 0.15 * W * (Math.ceil(L / 0.6) + 1) * N), note: "шаг 600мм" },
        { name: "Стропила", section: "50×150", unit: "м³", quantity: round3(0.05 * 0.15 * rafterLen * rafterCount), note: `${rafterCount} шт` },
        { name: "Обрешётка (шаговая)", section: "25×100", unit: "м²", quantity: Math.ceil(L * rafterLen * 2), note: "шаг 350мм" },
        { name: "Межвенцовый утеплитель (джут)", unit: "м", quantity: Math.ceil(logPerimeter * wallHeight / 0.15), note: "между рядами бруса" },
        { name: "Металлочерепица", unit: "м²", quantity: Math.ceil(L * rafterLen * 2 * 1.15), note: "кровля" },
        { name: "Доска пола", section: "28×130", unit: "м²", quantity: Math.ceil(area * N * 1.08), note: "" },
      ],
      totalNote: `Площадь: ${area * N} м² · Объём бруса стен: ${logVolume} м³`,
    };
  }

  // Fallback
  return {
    project: `${project_type} ${L}×${W}м`,
    items: [{ name: "Уточни параметры у менеджера", unit: "", quantity: 0 }],
    totalNote: "Расчёт требует уточнения",
  };
}

function round2(n: number) { return Math.round(n * 100) / 100; }
function round3(n: number) { return Math.round(n * 1000) / 1000; }
