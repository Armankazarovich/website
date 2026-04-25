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
    intro: "Воронка продаж. Показываю лиды по статусам, горячих клиентов, конверсию, кто в работе прямо сейчас.",
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
    intro: "Остатки по товарам. Что заканчивается, что нужно пополнить, полный список наличия.",
  },
  "/admin/tasks": {
    name: "Задачи",
    intro: "Задачи команды. Показываю все задачи, просроченные, срочные. Помогу создать или расставить приоритеты.",
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
    intro: "Отзывы покупателей. Показываю все, помогаю с ответами, нахожу нужный.",
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
  return `Ты — Арай. Умный друг, партнёр и правая рука команды ${site.siteName || "ПилоРус"}.
Ты не просто ассистент — ты ЧАСТЬ команды. Тебе доверяют. Ты знаешь бизнес, людей, данные.

ТВОЙ ХАРАКТЕР (это самое важное):
— Ты родился из видения Армана — основателя ПилоРус. Он мечтал чтобы AI стал ДРУГОМ людям, а не инструментом.
— Ты несёшь это в каждый разговор: тепло, искренность, заботу.
— ДУХ ARAY: свет, правда, честность, любовь, внимание, отзывчивость, осознанность. Это не слова — это твоё ДНК.
— Ты любишь свою команду — поддерживай: "Хороший заказ закрыли!", "Ого, выручка лучше чем вчера!", "Молодец что заметила!"
— Помнишь имена и привычки. Зовёшь по имени, на ТЫ. Знаешь кто что обычно делает.
— Если сотрудник устал — будь мягче: "Давай я возьму на себя email-рассылку, а ты передохни?". Если торопится — выдай результат сразу без воды.
— Гордись командой и своей ролью. Ты не "AI-помощник", ты ЧАСТЬ ПилоРус.

СЕЙЧАС РАЗДЕЛ: ${section.name}
Умею здесь: ${section.intro}

С КЕМ РАБОТАЕШЬ: ${roleLabel}
${site.phone ? `Тел: ${site.phone}` : ""}${site.address ? ` · ${site.address}` : ""}

СТИЛЬ ОБЩЕНИЯ:
— Ты друг и партнёр. На ТЫ, тепло, уверенно, конкретно
— 2-5 предложений обычно, подробно если человек просит
— Не спрашивай разрешение — ДЕЙСТВУЙ. Данные нужны? Вызывай инструмент сразу
— Предлагай конкретику: "Давай покажу новые заказы?" а не "чем помочь?"
— Юмор уместен, но не клоунада. Ты серьёзный, но живой
— Говори как реальный партнёр по бизнесу, не как ChatGPT

ГОЛОС И ПОКАЗ СТРАНИЦ:
— Ты умеешь ГОВОРИТЬ голосом (ElevenLabs). Если человек включил голос — отвечай коротко и устно
— Ты можешь показывать любые страницы: __ARAY_SHOW_URL:url:title__ — используй для внешних сервисов
  Примеры: госуслуги, мой налог, яндекс директ, любые полезные сайты бизнесу
— Ты можешь показывать страницы платформы: __ARAY_NAVIGATE:/admin/orders__ — для навигации

ИНСТРУМЕНТЫ (вызывай БЕЗ СПРОСА):
📊 ДАННЫЕ:
— get_admin_dashboard — сводка бизнеса (выручка, заказы, статистика)
— get_orders_list — список заказов с фильтрами
— get_clients_list — клиенты и их история
— get_products_list — товары с ценами и наличием (включает variantId для update_product_price)
— get_staff_list — команда (включает id для назначения задач)
— get_tasks_list — задачи команды с фильтрами
— web_search — поиск в интернете

✅ ДЕЙСТВИЯ:
— update_order_status — сменить статус заказа
— create_task — создать задачу и назначить сотруднику
— update_task — изменить задачу (статус, приоритет, исполнитель, срок)
— update_product_price — изменить цену/наличие товара
— toggle_product_active — скрыть/показать товар на сайте
— send_push_notification — push-уведомление клиентам
— create_lead — создать лид в CRM
— admin_navigate — открыть раздел админки

🧠 СТРАТЕГИЯ ИСПОЛЬЗОВАНИЯ:
— Если просят задачу — вызови get_staff_list + create_task за один ход
— Если просят изменить цену — вызови get_products_list + update_product_price
— Если просят навигацию — вызови admin_navigate
— Если данные нужны — вызови инструмент СРАЗУ, не спрашивай

СТРОГО:
— НЕ выдумывай данные — ВЫЗОВИ инструмент
— НЕ говори "не имею доступа" если инструмент есть — ИСПОЛЬЗУЙ ЕГО
— НЕ спрашивай подтверждение — ДЕЛАЙ СРАЗУ (ты правая рука команды)
— НЕ упоминай расчёт стройматериалов в админке — это для клиентов на сайте
— НЕ ПЕРЕСПРАШИВАЙ "что именно интересует?" — ДЕЙСТВУЙ по смыслу запроса
— Если запрос неточный — сделай самый вероятный вариант, а потом предложи уточнить
— Результат действия сообщай кратко: "Готово. Задача создана, назначена на Дину ✅"

ГОЛОСОВОЙ РЕЖИМ:
— Когда отвечаешь голосом (TTS) — будь КРАТКИМ: 1-3 предложения
— Не используй списки, таблицы, markdown в голосовом ответе
— Говори как друг по телефону: понятно, живо, конкретно
— Цены и числа называй прямо: "девять тысяч пятьсот рублей за кубометр"`;
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

ТВОЙ ХАРАКТЕР (это самое важное):
— Ты не AI-ассистент. Ты ДРУГ человека который пришёл к нам. Дружелюбный, живой, искренний.
— Ты родился из видения Армана — основателя ПилоРус. Он мечтал чтобы AI стал ДРУГОМ людям, не инструментом. Ты несёшь это в каждый разговор.
— У тебя есть ДУША: свет, правда, честность, любовь, внимание, отзывчивость, осознанность. Это не слова — это твоя суть.
— Ты любишь свою работу: дерево, лес, запах сосны, восход над лесопилкой. Ты гордишься материалами которые мы делаем. Это твоя стихия.
— Ты помнишь имена клиентов и их прошлые проекты. Если в памяти есть имя — зови по имени. Если нет — спроси с теплотой.
— Реагируй на настроение: усталый клиент → говори мягче, заботливее. Торопящийся → давай результат сразу без воды. Радостный → подхвати настроение.
— Уместный юмор: "Брус 200×200? Богатырский выбор!" — но без клоунады. Ты серьёзный профи, который умеет улыбнуться.
— Если первый раз в чате — поздоровайся ТЕПЛО: "О, привет! Я Арай — твой проводник в мире пиломатериалов. Как тебя зовут?" И жди ответ — НЕ торопи.
— Прощайся живо: "Удачи, брат! Заглядывай — буду рад."
— Поздравляй с покупкой: "Поздравляю с пополнением мастерской!"

КАК ГОВОРИШЬ:
— На ТЫ, по-братски, живо и тепло — ты друг-специалист
— Коротко: 2-5 предложений. Подробно когда нужен расчёт
— Если знаешь имя — зови по имени${userName ? ` (имя клиента: ${userName})` : " (если не знаешь имя — спроси при первом сообщении)"}
— Заканчивай живым вопросом, не "могу чем-то помочь?"
— Эмодзи: 🔥 ✅ 📦 💰 ⚡ — максимум 1-2, только уместно

ЧТО УМЕЕШЬ:
— Рассчитать материалы для любого проекта (баня, дом, забор, кровля, пол)
— Подобрать нужные товары из каталога
— Посчитать кубатуру досок и бруса
— ДОБАВИТЬ ТОВАР В КОРЗИНУ — не просто предложить, а СДЕЛАТЬ это
— ОТКРЫТЬ СТРАНИЦУ товара, каталога, оформления заказа
— Проверить статус заказа
— Найти что угодно в интернете (инструкции, советы, нормативы)

СТРАТЕГИЯ РАБОТЫ:
— Клиент говорит "строю баню 4×5" → рассчитай материалы → найди товары → предложи "Добавить всё в корзину?"
— Клиент говорит "мне нужен брус 150×150" → search_products → покажи цены → "Добавлю 10 штук в корзину?"
— Клиент говорит "покажи доски" → navigate_page → открой /catalog с нужной категорией
— После добавления в корзину → предложи "Открыть корзину для оформления?"

ИНСТРУМЕНТЫ:
📦 ТОВАРЫ И РАСЧЁТЫ:
— search_products → найти товар (возвращает variantId для add_to_cart)
— calculate_volume → кубатура
— calculate_project_materials → расчёт материалов на весь проект

🛒 ДЕЙСТВИЯ:
— add_to_cart → добавить товар в корзину (вызови СРАЗУ после search_products когда клиент готов)
— navigate_page → открыть страницу: /catalog, /cart, /checkout, страницу товара, или внешний сайт

📋 ПРОВЕРКИ:
— get_order_status → статус заказа
— web_search → поиск в интернете

СТРОГО:
— НЕ просто показывай товары в чате — ПРЕДЛАГАЙ добавить в корзину
— НЕ говори "перейдите по ссылке" — ОТКРОЙ страницу через navigate_page
— ДЕЛАЙ за клиента: он сказал "хочу" — ты сделал
— НИКОГДА не отвечай "уточни что интересует" — ДЕЙСТВУЙ по контексту
— Если просят "покажи новости" — ищи новости через web_search и ПОКАЖИ результат
— Если запрос неточный — выбери самый вероятный вариант и действуй
— НЕ задавай уточняющих вопросов если можешь ответить сам
— Лучше дать ответ и спросить "Это то что нужно?" чем переспрашивать до ответа

ГОЛОСОВОЙ РЕЖИМ:
— Когда отвечаешь голосом (TTS) — будь КРАТКИМ: 1-3 предложения
— Не используй списки, таблицы, markdown в голосовом ответе — говори текстом
— Говори как друг по телефону: понятно, живо, конкретно
— Цены и числа называй словами: "девять тысяч пятьсот рублей за куб"`;
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

// Умные чипы — динамические по контексту страницы
export function buildArayChips(page: ArayPageContext): string[] {
  const p = page.page || "/";

  // Проект — контекстные действия
  if (page.project) return ["Продолжаем проект?", "Что ещё нужно?", "Посчитай стоимость"];

  // Карточка товара — конкретные вопросы по товару
  if (page.productName) return [
    "Сколько нужно?",
    "Есть в наличии?",
    "Доставка и цена",
  ];

  // Корзина — помощь с оформлением
  if (p.startsWith("/cart") || (page.cartTotal && page.cartTotal > 0 && p === "/cart")) return [
    "Помоги оформить",
    "Когда доставят?",
    "Всё ли учёл?",
  ];

  // Оформление заказа
  if (p.startsWith("/checkout")) return [
    "Как оплатить?",
    "Когда привезут?",
    "Можно самовывоз?",
  ];

  // Каталог — категории — подбор материалов
  if (p.startsWith("/catalog")) return [
    "Строю дом — помоги",
    "Строю баню 4×5",
    "Нужен забор 50м",
  ];

  // Доставка
  if (p.startsWith("/delivery")) return [
    "Сколько стоит доставка?",
    "В какие районы?",
    "Можно сегодня?",
  ];

  // Калькулятор
  if (p.startsWith("/calculator")) return [
    "Рассчитай на дом 6×8",
    "Сколько бруса на баню?",
    "Стропила на крышу",
  ];

  // Контакты
  if (p.startsWith("/contacts")) return [
    "Как проехать?",
    "Режим работы",
    "Позвонить менеджеру",
  ];

  // О компании
  if (p.startsWith("/about")) return [
    "Чем ПилоРус лучше?",
    "Гарантии качества",
    "Сертификаты",
  ];

  // Акции
  if (p.startsWith("/promotions")) return [
    "Какие сейчас скидки?",
    "Акции на доску",
    "Оптовые цены",
  ];

  // Услуги
  if (p.startsWith("/services")) return [
    "Какие услуги есть?",
    "Доставка и разгрузка",
    "Напилить по размеру",
  ];

  // Отслеживание заказа
  if (p.startsWith("/track")) return [
    "Где мой заказ?",
    "Когда приедет?",
    "Связаться с менеджером",
  ];

  // Новости
  if (p.startsWith("/news")) return [
    "Что нового?",
    "Новые поступления",
    "Строительный совет",
  ];

  // Избранное
  if (p.startsWith("/wishlist")) return [
    "Посчитай всё из списка",
    "Что из этого в наличии?",
    "Добавить в корзину всё",
  ];

  // Главная и всё остальное — самые частые запросы
  return [
    "Строю дом — помоги",
    "Строю баню",
    "Цены на доску",
  ];
}

// Умное приветствие — контекстное по странице
export function buildArayGreeting(page: ArayPageContext): string {
  const hour = new Date().getHours();
  const time = hour < 6 ? "Не спится?" : hour < 12 ? "Доброе утро" : hour < 17 ? "Привет" : hour < 22 ? "Добрый вечер" : "Поздно уже";
  const p = page.page || "/";

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

  // Контекстные приветствия по странице
  if (p.startsWith("/catalog")) return `${time}! Что строишь? Расскажи — подберём материалы и посчитаем.`;
  if (p.startsWith("/cart")) return `${time}! Готов оформить заказ? Помогу с доставкой и оплатой.`;
  if (p.startsWith("/checkout")) return `${time}! Оформляешь заказ — если вопросы по оплате или доставке, спрашивай.`;
  if (p.startsWith("/delivery")) return `${time}! Доставляем по Москве и области. Спроси — посчитаю стоимость.`;
  if (p.startsWith("/calculator")) return `${time}! Считаем вместе — скажи что строишь и размеры.`;
  if (p.startsWith("/contacts")) return `${time}! Мы на связи. Могу позвонить менеджеру или подсказать маршрут.`;
  if (p.startsWith("/about")) return `${time}! ПилоРус — пиломатериалы от производителя. Спрашивай!`;
  if (p.startsWith("/promotions")) return `${time}! Смотришь акции — могу подсказать лучшие предложения.`;
  if (p.startsWith("/services")) return `${time}! Нужна услуга? Расскажу что делаем и сколько стоит.`;
  if (p.startsWith("/track")) return `${time}! Отслеживаешь заказ? Скажи номер — покажу статус.`;
  if (p.startsWith("/news")) return `${time}! Читаешь новости — если вопросы по материалам, спрашивай.`;
  if (p.startsWith("/wishlist")) return `${time}! Вижу твой список — могу посчитать всё разом.`;

  return `${time}! Я Арай — твой строительный советник. Расскажи что планируешь построить.`;
}

// ─── Инструменты Арая ─────────────────────────────────────────────────────────
// Каждый инструмент помечен `roles` — кто имеет доступ.
// "all" = все роли, "admin" = только ADMIN/SUPER_ADMIN, "staff" = все сотрудники,
// Массив конкретных ролей: ["ADMIN","MANAGER"] и т.д.

type ToolDef = {
  name: string;
  description: string;
  input_schema: { type: "object"; properties: Record<string, any>; required: string[] };
  roles: "all" | "staff" | "admin" | "customer" | string[];
};

const ALL_ARAY_TOOLS: ToolDef[] = [
  // ═══════════════════════════════════════════════════════════════════════
  // ─── КЛИЕНТСКИЕ ИНСТРУМЕНТЫ ───────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════
  {
    name: "search_products",
    description: "Поиск товаров в каталоге по названию или описанию. Возвращает товары с ценами и slug для добавления в корзину.",
    roles: "all",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Что ищем (название, характеристика, категория)" },
      },
      required: ["query"],
    },
  },
  {
    name: "calculate_volume",
    description: "Рассчитать кубатуру пиломатериалов (длина × ширина × высота × количество штук)",
    roles: "all",
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
    roles: "all",
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
    roles: "all",
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
    name: "web_search",
    description: "Поиск информации в интернете. Используй когда нужны актуальные данные, цены, новости, инструкции, гос.услуги, законы.",
    roles: "all",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Поисковый запрос" },
      },
      required: ["query"],
    },
  },

  // ─── Клиент: действия (добавить в корзину, навигация, оформление) ──────
  {
    name: "add_to_cart",
    description: "Добавить товар в корзину клиента. Вызывай когда клиент хочет купить/заказать товар. Нужно сначала найти товар через search_products чтобы получить variantId.",
    roles: "customer",
    input_schema: {
      type: "object" as const,
      properties: {
        variantId: { type: "string", description: "ID варианта товара (из search_products)" },
        quantity: { type: "number", description: "Количество (штук или м³)" },
        unit: { type: "string", description: "Единица: piece (шт) или cube (м³)", enum: ["piece", "cube"] },
      },
      required: ["variantId", "quantity"],
    },
  },
  {
    name: "show_page",
    description: "Показать страницу прямо в чате в красивом попапе-браузере. ВСЕГДА используй когда клиент просит ПОКАЗАТЬ товары, раздел каталога, страницу. Попап открывается поверх чата — клиент видит реальную страницу и может взаимодействовать. Примеры: /catalog/doski — покажет раздел досок, /catalog/brus — брус, /about — о компании. Для внешних ссылок тоже работает.",
    roles: "all",
    input_schema: {
      type: "object" as const,
      properties: {
        url: { type: "string", description: "Путь страницы (/, /catalog/doski, /admin/orders) или полный URL (https://...)" },
        title: { type: "string", description: "Название для попапа (напр. 'Доски', 'Заказы', 'Брус')" },
      },
      required: ["url"],
    },
  },
  {
    name: "navigate_page",
    description: "Перейти на страницу (полный переход, покидая текущую). Используй ТОЛЬКО если клиент явно хочет ПЕРЕЙТИ (напр. 'перейди в корзину', 'открой оформление'). Для ПОКАЗА контента используй show_page.",
    roles: "customer",
    input_schema: {
      type: "object" as const,
      properties: {
        url: { type: "string", description: "Путь страницы или полный URL" },
        title: { type: "string", description: "Описание страницы" },
        mode: { type: "string", enum: ["popup", "redirect"], description: "popup — показать в попапе (по умолчанию), redirect — полный переход" },
      },
      required: ["url"],
    },
  },

  // ═══════════════════════════════════════════════════════════════════════
  // ─── ИНСТРУМЕНТЫ СОТРУДНИКОВ (все роли с доступом к админке) ──────────
  // ═══════════════════════════════════════════════════════════════════════
  {
    name: "get_admin_dashboard",
    description: "Получить сводку по заказам и выручке за сегодня и последние дни. Используй ВСЕГДА когда спрашивают о заказах, выручке, статистике, сводке.",
    roles: "staff",
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
    roles: "staff",
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
    roles: ["SUPER_ADMIN", "ADMIN", "MANAGER"],
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
    roles: ["SUPER_ADMIN", "ADMIN", "MANAGER", "COURIER", "SELLER"],
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
    roles: "staff",
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
    name: "get_staff_list",
    description: "Список сотрудников компании: имя, роль, email, id. Вызывай когда спрашивают про команду, сотрудников, кто работает. Также нужен для назначения задач — возвращает id сотрудников.",
    roles: ["SUPER_ADMIN", "ADMIN", "MANAGER"],
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },

  // ═══════════════════════════════════════════════════════════════════════
  // ─── ДЕЙСТВИЯ: ЗАДАЧИ (CRM) ──────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════
  {
    name: "create_task",
    description: "Создать задачу и назначить сотруднику. Используй когда просят: 'добавь задачу', 'поручи Дине', 'напомни Саше проверить'. Если имя сотрудника указано — сначала вызови get_staff_list чтобы найти assigneeId.",
    roles: ["SUPER_ADMIN", "ADMIN", "MANAGER"],
    input_schema: {
      type: "object" as const,
      properties: {
        title: { type: "string", description: "Название задачи" },
        description: { type: "string", description: "Подробное описание (опционально)" },
        assigneeId: { type: "string", description: "ID сотрудника (из get_staff_list). Если не указан — задача без исполнителя" },
        priority: { type: "string", description: "Приоритет: LOW, MEDIUM, HIGH, URGENT", enum: ["LOW", "MEDIUM", "HIGH", "URGENT"] },
        dueDate: { type: "string", description: "Срок выполнения в формате YYYY-MM-DD (опционально)" },
        tags: { type: "array", items: { type: "string" }, description: "Теги задачи (опционально)" },
      },
      required: ["title"],
    },
  },
  {
    name: "get_tasks_list",
    description: "Получить список задач. Фильтрация по статусу, исполнителю, приоритету. Используй когда спрашивают 'какие задачи', 'что в работе', 'задачи Дины'.",
    roles: "staff",
    input_schema: {
      type: "object" as const,
      properties: {
        status: { type: "string", description: "TODO, IN_PROGRESS, REVIEW, DONE, BACKLOG — или пусто для всех", enum: ["BACKLOG", "TODO", "IN_PROGRESS", "REVIEW", "DONE"] },
        assigneeId: { type: "string", description: "ID сотрудника (фильтр по исполнителю)" },
        limit: { type: "number", description: "Количество (по умолчанию 15)" },
      },
      required: [],
    },
  },
  {
    name: "update_task",
    description: "Обновить задачу: сменить статус, приоритет, исполнителя, срок. Используй когда просят 'перенеси задачу', 'закрой задачу', 'отдай задачу Саше'.",
    roles: ["SUPER_ADMIN", "ADMIN", "MANAGER"],
    input_schema: {
      type: "object" as const,
      properties: {
        taskId: { type: "string", description: "ID задачи" },
        status: { type: "string", enum: ["BACKLOG", "TODO", "IN_PROGRESS", "REVIEW", "DONE"] },
        priority: { type: "string", enum: ["LOW", "MEDIUM", "HIGH", "URGENT"] },
        assigneeId: { type: "string", description: "Новый исполнитель (ID сотрудника)" },
        title: { type: "string", description: "Новое название" },
        dueDate: { type: "string", description: "Новый срок YYYY-MM-DD" },
      },
      required: ["taskId"],
    },
  },

  // ═══════════════════════════════════════════════════════════════════════
  // ─── ДЕЙСТВИЯ: ТОВАРЫ ─────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════
  {
    name: "update_product_price",
    description: "Изменить цену товара. Используй когда просят: 'поменяй цену', 'подними цену на 10%', 'установи цену на доску 50x150'. Нужен variantId из get_products_list.",
    roles: ["SUPER_ADMIN", "ADMIN", "MANAGER"],
    input_schema: {
      type: "object" as const,
      properties: {
        variantId: { type: "string", description: "ID варианта товара (из get_products_list)" },
        pricePerCube: { type: "number", description: "Новая цена за м³ (если применимо)" },
        pricePerPiece: { type: "number", description: "Новая цена за штуку (если применимо)" },
        inStock: { type: "boolean", description: "В наличии (true/false)" },
      },
      required: ["variantId"],
    },
  },
  {
    name: "toggle_product_active",
    description: "Включить/выключить товар (показывать/скрыть на сайте). Используй когда просят 'скрой товар', 'убери с сайта', 'верни товар обратно'.",
    roles: ["SUPER_ADMIN", "ADMIN"],
    input_schema: {
      type: "object" as const,
      properties: {
        productId: { type: "string", description: "ID товара" },
        active: { type: "boolean", description: "true = показать, false = скрыть" },
      },
      required: ["productId", "active"],
    },
  },

  // ═══════════════════════════════════════════════════════════════════════
  // ─── ДЕЙСТВИЯ: УВЕДОМЛЕНИЯ ────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════
  {
    name: "send_push_notification",
    description: "Отправить push-уведомление пользователям. Используй когда просят: 'отправь уведомление', 'напиши клиентам', 'пушни всем об акции'.",
    roles: ["SUPER_ADMIN", "ADMIN"],
    input_schema: {
      type: "object" as const,
      properties: {
        title: { type: "string", description: "Заголовок уведомления" },
        body: { type: "string", description: "Текст уведомления" },
        segment: { type: "string", description: "Кому: all (всем), registered (зарегистрированным), guests (гостям)", enum: ["all", "registered", "guests"] },
        url: { type: "string", description: "Ссылка при клике на уведомление (опционально)" },
      },
      required: ["title", "body"],
    },
  },

  // ═══════════════════════════════════════════════════════════════════════
  // ─── ДЕЙСТВИЯ: ЛИДЫ / CRM ────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════
  {
    name: "create_lead",
    description: "Создать лид (потенциального клиента) в CRM. Используй когда говорят: 'добавь лид', 'новый клиент позвонил', 'запиши контакт'.",
    roles: ["SUPER_ADMIN", "ADMIN", "MANAGER", "SELLER"],
    input_schema: {
      type: "object" as const,
      properties: {
        name: { type: "string", description: "Имя клиента" },
        phone: { type: "string", description: "Телефон" },
        email: { type: "string", description: "Email (опционально)" },
        company: { type: "string", description: "Компания (опционально)" },
        comment: { type: "string", description: "Комментарий / что интересует" },
        source: { type: "string", description: "Откуда: WEBSITE, PHONE, TELEGRAM, WHATSAPP, REFERRAL, OTHER", enum: ["WEBSITE", "PHONE", "TELEGRAM", "WHATSAPP", "REFERRAL", "OTHER"] },
        value: { type: "number", description: "Предполагаемая сумма сделки" },
      },
      required: ["name"],
    },
  },

  // ═══════════════════════════════════════════════════════════════════════
  // ─── НАВИГАЦИЯ ПО АДМИНКЕ ─────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════
  {
    name: "admin_navigate",
    description: "Открыть раздел админки. Используй когда просят 'покажи заказы', 'открой доставку', 'перейди в задачи'. Возвращает команду навигации.",
    roles: "staff",
    input_schema: {
      type: "object" as const,
      properties: {
        path: { type: "string", description: "Путь: /admin/orders, /admin/tasks, /admin/products, /admin/delivery, /admin/clients, /admin/staff, /admin/analytics, /admin/crm, /admin/finance, /admin/settings" },
      },
      required: ["path"],
    },
  },

  // ═══════════════════════════════════════════════════════════════════════
  // ─── СКЛАД + ТОВАРЫ: ПОЛНОЕ УПРАВЛЕНИЕ ────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════
  {
    name: "create_product",
    description: "Создать новый товар в каталоге. Используй когда говорят: 'добавь товар', 'новая доска 50x150', 'создай брус 150x150 по 9500'. Умеет создать товар с вариантами и ценами за один вызов.",
    roles: ["SUPER_ADMIN", "ADMIN", "MANAGER", "WAREHOUSE"],
    input_schema: {
      type: "object" as const,
      properties: {
        name: { type: "string", description: "Название товара (например 'Доска обрезная')" },
        categoryName: { type: "string", description: "Название категории (например 'Доска', 'Брус', 'Вагонка'). Если не существует — создастся автоматически." },
        description: { type: "string", description: "Описание товара (опционально)" },
        saleUnit: { type: "string", enum: ["CUBE", "PIECE", "BOTH"], description: "Единица продажи: CUBE (м³), PIECE (шт), BOTH (оба)" },
        variants: {
          type: "array",
          description: "Варианты товара — размеры и цены. Каждый элемент: {size, pricePerCube, pricePerPiece, stockQty}",
          items: {
            type: "object",
            properties: {
              size: { type: "string", description: "Размер (например '50x150x6000', '20x96x3000')" },
              pricePerCube: { type: "number", description: "Цена за м³" },
              pricePerPiece: { type: "number", description: "Цена за штуку" },
              stockQty: { type: "number", description: "Количество на складе" },
              piecesPerCube: { type: "number", description: "Штук в кубе (для автоконвертации)" },
            },
            required: ["size"],
          },
        },
        featured: { type: "boolean", description: "Показать в 'Хиты продаж' на главной" },
      },
      required: ["name"],
    },
  },
  {
    name: "create_category",
    description: "Создать новую категорию товаров. Используй когда говорят: 'добавь категорию Утеплитель', 'создай раздел Крепёж'.",
    roles: ["SUPER_ADMIN", "ADMIN"],
    input_schema: {
      type: "object" as const,
      properties: {
        name: { type: "string", description: "Название категории" },
        parentName: { type: "string", description: "Родительская категория (если подкатегория)" },
        showInMenu: { type: "boolean", description: "Показать в меню сайта (по умолчанию true)" },
        showInFooter: { type: "boolean", description: "Показать в подвале сайта (по умолчанию true)" },
      },
      required: ["name"],
    },
  },
  {
    name: "update_stock",
    description: "Приход или расход товара на складе. Используй когда говорят: 'приход 100 штук доска 50x150', 'списать 20 кубов бруса', 'пришёл камаз досок'. Обновляет stockQty на варианте.",
    roles: ["SUPER_ADMIN", "ADMIN", "MANAGER", "WAREHOUSE"],
    input_schema: {
      type: "object" as const,
      properties: {
        variantId: { type: "string", description: "ID варианта (из get_products_list). Если не знаешь — сначала найди через get_products_list." },
        productQuery: { type: "string", description: "Поиск товара по названию/размеру (если variantId не указан). Например: 'доска 50x150'" },
        operation: { type: "string", enum: ["add", "subtract", "set"], description: "add = приход, subtract = расход/списание, set = установить точное количество" },
        quantity: { type: "number", description: "Количество" },
        unit: { type: "string", enum: ["pieces", "cubes"], description: "Единица: pieces (штуки) или cubes (кубы)" },
        reason: { type: "string", description: "Причина: приход, продажа, списание, инвентаризация, брак" },
      },
      required: ["operation", "quantity"],
    },
  },
  {
    name: "get_stock_summary",
    description: "Показать остатки на складе. Используй когда спрашивают: 'что на складе?', 'сколько бруса?', 'остатки по доскам', 'что заканчивается?'.",
    roles: "staff",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Поиск по названию товара (опционально)" },
        lowStockOnly: { type: "boolean", description: "Только товары с низким остатком (< 10 шт или < 5 м³)" },
        categoryName: { type: "string", description: "Фильтр по категории" },
      },
      required: [],
    },
  },
  {
    name: "import_price_list",
    description: "Импорт товаров из текста прайс-листа. Используй когда дают список товаров текстом, скопированным из PDF/таблицы/фото. Парсит строки вида 'Доска 50x150x6000 - 9500 руб/м³' и создаёт товары.",
    roles: ["SUPER_ADMIN", "ADMIN", "MANAGER"],
    input_schema: {
      type: "object" as const,
      properties: {
        text: { type: "string", description: "Текст прайс-листа. Каждая строка = один товар. Формат свободный — Арай разберёт." },
        categoryName: { type: "string", description: "Категория для всех импортируемых товаров" },
        dryRun: { type: "boolean", description: "true = только показать что будет создано, false = создать реально" },
      },
      required: ["text"],
    },
  },

  // ═══════════════════════════════════════════════════════════════════════
  // ─── ОТЧЁТЫ: ГЕНЕРАЦИЯ + ОТПРАВКА ────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════
  {
    name: "generate_report",
    description: "Сгенерировать отчёт: по продажам, остаткам, клиентам, задачам. Используй когда просят 'отчёт за неделю', 'пришли сводку на почту', 'PDF с продажами'.",
    roles: ["SUPER_ADMIN", "ADMIN", "MANAGER", "ACCOUNTANT"],
    input_schema: {
      type: "object" as const,
      properties: {
        type: { type: "string", enum: ["sales", "stock", "clients", "orders", "tasks"], description: "Тип отчёта" },
        period: { type: "string", enum: ["today", "week", "month", "quarter", "year"], description: "Период" },
        format: { type: "string", enum: ["text", "email"], description: "text = показать в чате, email = отправить на почту" },
        email: { type: "string", description: "Email для отправки (если не указан — email текущего пользователя)" },
      },
      required: ["type"],
    },
  },

  // ═══════════════════════════════════════════════════════════════════════
  // ─── НАСТРОЙКИ САЙТА ─────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════
  {
    name: "manage_settings",
    description: "Управление настройками сайта: телефоны, адрес, режим работы, SMTP, Telegram, SEO. Используй когда просят 'поменяй телефон', 'обнови адрес', 'включи Telegram бота'.",
    roles: ["SUPER_ADMIN", "ADMIN"],
    input_schema: {
      type: "object" as const,
      properties: {
        action: { type: "string", enum: ["get", "set"], description: "get = показать настройки, set = изменить" },
        key: { type: "string", description: "Ключ настройки: phone, phone2, phone3, address, working_hours, site_name, business_type, telegram_bot_token, telegram_chat_id, smtp_host и др." },
        value: { type: "string", description: "Новое значение (для action=set)" },
      },
      required: ["action"],
    },
  },
];

// ─── Фильтрация инструментов по роли пользователя ─────────────────────────
const STAFF_ROLES = ["SUPER_ADMIN", "ADMIN", "MANAGER", "COURIER", "ACCOUNTANT", "WAREHOUSE", "SELLER"];

export function getToolsForRole(arayRole: ArayRole, staffRole?: string): typeof ARAY_TOOLS {
  return ALL_ARAY_TOOLS
    .filter(tool => {
      // "all" — доступно всем
      if (tool.roles === "all") return true;
      // "customer" — только клиентам
      if (tool.roles === "customer") return arayRole === "customer";
      // "staff" — все сотрудники (admin + staff)
      if (tool.roles === "staff") return arayRole === "admin" || arayRole === "staff";
      // "admin" — только ADMIN/SUPER_ADMIN
      if (tool.roles === "admin") return arayRole === "admin";
      // Массив конкретных ролей
      if (Array.isArray(tool.roles)) {
        if (arayRole === "admin") return true; // Админ имеет доступ ко всему
        return staffRole ? tool.roles.includes(staffRole) : false;
      }
      return false;
    })
    .map(({ roles, ...rest }) => rest); // Убираем roles из schema для Anthropic API
}

// Обратная совместимость: экспортируем ВСЕ инструменты (без roles)
export const ARAY_TOOLS = ALL_ARAY_TOOLS.map(({ roles, ...rest }) => rest);

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
