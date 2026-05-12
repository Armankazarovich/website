export type ArayProviderPriority = "P0" | "P1" | "P2";
export type ArayProviderStatus = "ready" | "partial" | "todo";
export type ArayProviderKind =
  | "brain"
  | "knowledge"
  | "voice"
  | "documents"
  | "search"
  | "demand"
  | "ads"
  | "inbox"
  | "seo"
  | "accounting"
  | "auth"
  | "permissions"
  | "future";

export type ArayProviderDefinition = {
  id: string;
  title: string;
  plainName: string;
  priority: ArayProviderPriority;
  kind: ArayProviderKind;
  owner: "SUPER_ADMIN" | "BUSINESS_OWNER" | "USER";
  purpose: string;
  humanAction: string;
  safeRule: string;
  requiredEnv?: string[];
  optionalEnv?: string[];
  officialSetupUrl?: string;
};

export type ArayProviderEnvStatus = {
  key: string;
  present: boolean;
  required: boolean;
};

export type ArayProviderRuntimeStatus = ArayProviderDefinition & {
  status: ArayProviderStatus;
  env: ArayProviderEnvStatus[];
  readyCount: number;
  totalCount: number;
  missingRequired: string[];
};

export type ArayConnectorBundleDefinition = {
  id: string;
  title: string;
  subtitle: string;
  priority: ArayProviderPriority;
  providerIds: string[];
  safeAutomation: string[];
  ownerAction: string;
  nextActionLabel: string;
  href: string;
};

export type ArayConnectorBundleRuntimeStatus = ArayConnectorBundleDefinition & {
  status: ArayProviderStatus;
  providers: ArayProviderRuntimeStatus[];
  readyCount: number;
  partialCount: number;
  todoCount: number;
  totalCount: number;
};

export const ARAY_PROVIDER_MATRIX: ArayProviderDefinition[] = [
  {
    id: "main-brain",
    title: "Главный мозг ARAY",
    plainName: "ARAY думает, планирует и ведёт диалог",
    priority: "P0",
    kind: "brain",
    owner: "SUPER_ADMIN",
    purpose: "Единый помощник для чата, документов, навигации, действий и агентских задач.",
    humanAction: "Супер-админ добавляет ключ основного AI-провайдера один раз.",
    safeRule: "Пользователь видит ARAY, а не список моделей. Платные и опасные действия идут через подтверждение.",
    requiredEnv: ["OPENAI_API_KEY"],
    optionalEnv: ["ARAY_PRIMARY_AI_PROVIDER", "ARAY_PRIMARY_AI_MODEL"],
    officialSetupUrl: "https://platform.openai.com/api-keys",
  },
  {
    id: "aray-knowledge-os",
    title: "Живая память платформы",
    plainName: "ARAY знает разделы, товары, действия, права и события",
    priority: "P0",
    kind: "knowledge",
    owner: "SUPER_ADMIN",
    purpose: "Единый индекс сущностей, действий, ролей, событий и контента, чтобы ARAY и поиск понимали всё, что появляется в платформе.",
    humanAction: "Супер-админ включает синхронизацию знаний; дальше новые разделы обязаны регистрировать свои сущности и действия.",
    safeRule: "ARAY не 'самообучается' хаотично: он сохраняет только структурированные факты с источником, датой, правами и возможностью удалить/исправить.",
    requiredEnv: [],
    optionalEnv: [
      "ARAY_KNOWLEDGE_SYNC_ENABLED",
      "ARAY_EVENT_INDEX_ENABLED",
      "ARAY_TOOL_REGISTRY_ENABLED",
      "ARAY_VECTOR_INDEX_URL",
    ],
  },
  {
    id: "document-media-intelligence",
    title: "Документы, медиа и распознавание",
    plainName: "Фото, скрины, PDF, Word, Excel, PowerPoint, аудио и видео",
    priority: "P0",
    kind: "documents",
    owner: "SUPER_ADMIN",
    purpose: "Извлекать текст и смысл из вложений: товары по фото, списки с бумаги, QR/штрих-коды, презентации, таблицы, аудио, видео и архивы.",
    humanAction: "Супер-админ включает безопасный extractor; пользователь просто прикладывает файл или вставляет скрин в чат.",
    safeRule: "Если содержимое ещё не извлечено, ARAY говорит честно. Запись в каталог, акции, цены и рекламу только черновиком и после подтверждения.",
    requiredEnv: [],
    optionalEnv: [
      "ARAY_DOCUMENT_EXTRACTOR_ENABLED",
      "ARAY_MEDIA_EXTRACTOR_ENABLED",
      "YANDEX_VISION_OCR_ENABLED",
      "YANDEX_SPEECHKIT_API_KEY",
      "YANDEX_SPEECHKIT_FOLDER_ID",
    ],
  },
  {
    id: "yandex-ai-studio",
    title: "Яндекс AI Studio",
    plainName: "Модели, поиск, спрос, фото и российский контур",
    priority: "P0",
    kind: "brain",
    owner: "SUPER_ADMIN",
    purpose: "YandexGPT, Search API, Wordstat, Vision/OCR и будущий SpeechKit.",
    humanAction: "Супер-админ создаёт API-ключ и Folder ID, ARAY дальше проверяет подключение сам.",
    safeRule: "Секреты не показывать в интерфейсе, только статус подключения и понятный следующий шаг.",
    requiredEnv: ["YANDEX_API_KEY", "YANDEX_FOLDER_ID"],
    optionalEnv: ["YANDEX_SEARCH_API_TOKEN", "YANDEX_WORDSTAT_TOKEN"],
    officialSetupUrl: "https://aistudio.yandex.ru/docs/ru/ai-studio/operations/get-api-key",
  },
  {
    id: "federated-internet-search",
    title: "Интернет-поиск ARAY",
    plainName: "Yandex и Google рядом с внутренним поиском",
    priority: "P0",
    kind: "search",
    owner: "SUPER_ADMIN",
    purpose: "Когда ARAY или поиск не знают ответ, они ищут в интернете, показывают источники, дату, регион и честное сравнение с данными платформы.",
    humanAction: "Супер-админ подключает Yandex Search API; Google включается отдельным ключом, когда нужен мировой слой.",
    safeRule: "Интернет-ответы не становятся памятью автоматически. ARAY предлагает сохранить факт только с источником и подтверждением.",
    requiredEnv: ["YANDEX_SEARCH_API_TOKEN"],
    optionalEnv: [
      "GOOGLE_CUSTOM_SEARCH_API_KEY",
      "GOOGLE_CUSTOM_SEARCH_ENGINE_ID",
      "ARAY_SEARCH_CACHE_TTL_MINUTES",
      "ARAY_SEARCH_REGION_DEFAULT",
    ],
  },
  {
    id: "voice-permissions",
    title: "Голос, устройства и график",
    plainName: "ARAY слушает только там и тогда, где разрешили",
    priority: "P0",
    kind: "voice",
    owner: "USER",
    purpose: "Микрофон, голосовой ответ, график активности, устройства, тихие часы и ручная кнопка стоп.",
    humanAction: "Человек нажимает Разрешить микрофон, выбирает устройства и удобное время работы ARAY.",
    safeRule: "ARAY не слушает без явного разрешения. Всегда есть стоп, журнал доступа и расписание.",
    requiredEnv: [],
    optionalEnv: [
      "ARAY_VOICE_PROVIDER",
      "ARAY_STT_PROVIDER",
      "ELEVENLABS_API_KEY",
      "TTS_PROXY_URL",
      "YANDEX_SPEECHKIT_API_KEY",
      "YANDEX_SPEECHKIT_FOLDER_ID",
    ],
  },
  {
    id: "market-demand",
    title: "Биржа, спрос и регионы",
    plainName: "Спрос, цены, регионы, умные фильтры и тепловая карта",
    priority: "P0",
    kind: "demand",
    owner: "SUPER_ADMIN",
    purpose: "Показывать реальные запросы, средние цены, спрос по регионам, категории и подсказки для менеджера.",
    humanAction: "Супер-админ подключает Яндекс Search/Wordstat; позже бизнес выбирает регион и нишу.",
    safeRule: "Не выдумывать спрос, рейтинги и отзывы. Если данных нет, честно показать нет данных.",
    requiredEnv: ["YANDEX_SEARCH_API_TOKEN", "YANDEX_WORDSTAT_TOKEN"],
    optionalEnv: ["YANDEX_METRIKA_TOKEN"],
  },
  {
    id: "seo-indexing",
    title: "SEO и индексация в один клик",
    plainName: "ARAY помогает сайту попасть в поиск",
    priority: "P0",
    kind: "seo",
    owner: "BUSINESS_OWNER",
    purpose: "Sitemap, robots, метатеги, Search Console, Яндекс Вебмастер, Метрика и понятные SEO-задачи.",
    humanAction: "Владелец нажимает Подключить поиск, разрешает доступ Яндекс/Google и подтверждает изменения сайта.",
    safeRule: "ARAY может готовить метатеги и карту сайта сам, но публикация критичных SEO-изменений подтверждается владельцем.",
    requiredEnv: [],
    optionalEnv: [
      "YANDEX_METRIKA_TOKEN",
      "YANDEX_WEBMASTER_TOKEN",
      "GOOGLE_ANALYTICS_PROPERTY_ID",
      "GOOGLE_SEARCH_CONSOLE_SITE_URL",
    ],
  },
  {
    id: "direct-own-account",
    title: "Яндекс Директ бизнеса",
    plainName: "Каждый бизнес подключает свой рекламный кабинет",
    priority: "P0",
    kind: "ads",
    owner: "BUSINESS_OWNER",
    purpose: "ARAY готовит кампании, ключи, UTM, аудитории и бюджет из каталога и поведения людей.",
    humanAction: "Владелец нажимает Подключить Директ и разрешает доступ в Яндекс OAuth.",
    safeRule: "Рекламные деньги списываются из кабинета бизнеса. Запуск только после явного подтверждения.",
    requiredEnv: ["YANDEX_DIRECT_CLIENT_ID", "YANDEX_DIRECT_CLIENT_SECRET", "YANDEX_DIRECT_REDIRECT_URI"],
    optionalEnv: ["YANDEX_DIRECT_API_URL", "YANDEX_DIRECT_OAUTH_TOKEN"],
    officialSetupUrl: "https://yandex.ru/dev/direct/doc/ru/concepts/auth-token",
  },
  {
    id: "unified-inbox",
    title: "Единый inbox",
    plainName: "Все сообщения приходят в ARAY",
    priority: "P0",
    kind: "inbox",
    owner: "BUSINESS_OWNER",
    purpose: "Telegram, VK, Email, WhatsApp, телефония, сайт-чат и будущие каналы в одном обращении.",
    humanAction: "Владелец подключает канал кнопкой, ARAY проверяет вебхук/почту и показывает готовность.",
    safeRule: "Отправка от имени бизнеса возможна только при наличии прав канала и журнала действий.",
    requiredEnv: [],
    optionalEnv: [
      "TELEGRAM_BOT_TOKEN",
      "TELEGRAM_WEBHOOK_SECRET",
      "VK_BOT_TOKEN",
      "VK_CONFIRMATION_TOKEN",
      "VK_SECRET_KEY",
      "IMAP_HOST",
      "IMAP_USER",
      "WHATSAPP_BUSINESS_TOKEN",
      "WHATSAPP_PHONE_NUMBER_ID",
      "TELEPHONY_API_KEY",
      "SMS_API_KEY",
    ],
  },
  {
    id: "accounting-tax-edi",
    title: "Бухгалтерия, налоги и ЭДО",
    plainName: "Счета, акты, налоги, сверки и напоминания оплат",
    priority: "P1",
    kind: "accounting",
    owner: "SUPER_ADMIN",
    purpose: "СБИС, Контур/Диадок/Эльба, 1С, банки, расходы ARAY и напоминания по оплатам.",
    humanAction: "Супер-админ подключает сервис, бухгалтер подтверждает юридически важные отправки.",
    safeRule: "ARAY готовит документы и подсказки. Отправка в налоговую, ЭДО, банк или оплата только после подтверждения.",
    requiredEnv: [],
    optionalEnv: [
      "SBIS_CLIENT_ID",
      "SBIS_CLIENT_SECRET",
      "KONTUR_CLIENT_ID",
      "KONTUR_CLIENT_SECRET",
      "DIADOC_API_KEY",
      "KONTUR_ELBA_CLIENT_ID",
      "KONTUR_ELBA_CLIENT_SECRET",
      "MOE_DELO_CLIENT_ID",
      "MOE_DELO_CLIENT_SECRET",
      "ONEC_API_URL",
      "ONEC_API_TOKEN",
      "BANK_API_CLIENT_ID",
      "BANK_API_CLIENT_SECRET",
    ],
  },
  {
    id: "external-login",
    title: "Вход через Яндекс, Google, VK",
    plainName: "Один аккаунт, много ролей и бизнесов",
    priority: "P1",
    kind: "auth",
    owner: "USER",
    purpose: "Покупатель, владелец, сотрудник, специалист и партнёр входят удобно и не плодят пароли.",
    humanAction: "Человек выбирает удобный вход и подтверждает аккаунт.",
    safeRule: "Личный аккаунт и бизнес-доступы не смешивать. Роли и действия scoped по бизнесу.",
    requiredEnv: [],
    optionalEnv: [
      "GOOGLE_OAUTH_CLIENT_ID",
      "GOOGLE_OAUTH_CLIENT_SECRET",
      "GOOGLE_CLIENT_ID",
      "GOOGLE_CLIENT_SECRET",
      "YANDEX_OAUTH_CLIENT_ID",
      "YANDEX_OAUTH_CLIENT_SECRET",
      "YANDEX_LOGIN_CLIENT_ID",
      "YANDEX_LOGIN_CLIENT_SECRET",
      "VK_CLIENT_ID",
      "VK_CLIENT_SECRET",
    ],
  },
  {
    id: "google-world-demand",
    title: "Google спрос по миру",
    plainName: "Мировой спрос, страны, языки и ниши",
    priority: "P2",
    kind: "demand",
    owner: "SUPER_ADMIN",
    purpose: "Keyword Planner, Google Search Console, Analytics и Business Profile для международного слоя.",
    humanAction: "Подключить позже, когда Яндекс-контур и биржа уже стабильны.",
    safeRule: "Не усложнять старт. Подключать только когда понятна польза и стоимость.",
    requiredEnv: [],
    optionalEnv: [
      "GOOGLE_OAUTH_CLIENT_ID",
      "GOOGLE_OAUTH_CLIENT_SECRET",
      "GOOGLE_ADS_DEVELOPER_TOKEN",
      "GOOGLE_ADS_CUSTOMER_ID",
      "GOOGLE_ADS_CLIENT_ID",
      "GOOGLE_ADS_CLIENT_SECRET",
      "GOOGLE_ADS_REFRESH_TOKEN",
      "GOOGLE_BUSINESS_PROFILE_ACCOUNT_ID",
    ],
  },
  {
    id: "builder-future",
    title: "Конструктор ARAY",
    plainName: "Позже, после синхронизаций и стабильной биржи",
    priority: "P2",
    kind: "future",
    owner: "BUSINESS_OWNER",
    purpose: "Сайт, каталог, услуги, профиль, реклама и брендбук из рассказа человека.",
    humanAction: "Вернуться после P0: голос, Direct, inbox, SEO, аналитика, биржа и ключи.",
    safeRule: "Конструктор не заменяет фундамент синхронизаций. Сначала ARAY должен уметь подключаться и проверять данные.",
    requiredEnv: [],
    optionalEnv: [],
  },
];

export const ARAY_CONNECTOR_BUNDLE_DEFINITIONS: ArayConnectorBundleDefinition[] = [
  {
    id: "yandex-growth-stack",
    title: "Яндекс: реклама, Метрика, SEO, спрос",
    subtitle: "Один понятный контур: Direct, Метрика, Вебмастер, Wordstat и организация бизнеса.",
    priority: "P0",
    providerIds: ["direct-own-account", "seo-indexing", "market-demand", "yandex-ai-studio"],
    safeAutomation: [
      "найти счетчик Метрики и уже созданные цели",
      "создать безопасные цели Метрики после OAuth",
      "подтянуть расходы Direct, клики, CPC, CPA и ROAS",
      "найти организацию Яндекс Бизнеса и показать на подтверждение",
    ],
    ownerAction: "Владелец входит через официальный Яндекс OAuth и подтверждает доступ к бизнесу.",
    nextActionLabel: "Открыть продвижение",
    href: "/admin/promotion",
  },
  {
    id: "google-growth-stack",
    title: "Google: SEO, аналитика и мировой спрос",
    subtitle: "Search Console, Analytics, Business Profile и спрос для рынков вне Яндекса.",
    priority: "P1",
    providerIds: ["seo-indexing", "google-world-demand", "external-login"],
    safeAutomation: [
      "проверить sitemap и статус индексации",
      "подготовить Search Console и Analytics",
      "показать мировой спрос по странам и языкам",
    ],
    ownerAction: "Владелец подключает Google, когда российский запуск стабилен или нужен международный спрос.",
    nextActionLabel: "Открыть SEO",
    href: "/admin/promotion",
  },
  {
    id: "inbox-reputation-stack",
    title: "Сообщения и репутация",
    subtitle: "Заявки, отзывы, уведомления и ответы в одной очереди ARAY.",
    priority: "P0",
    providerIds: ["unified-inbox", "external-login"],
    safeAutomation: [
      "собрать сообщения по каналам",
      "найти отзывы и отправить их на одобрение",
      "уведомить нужную роль перед публичным ответом",
    ],
    ownerAction: "Владелец подключает каналы и выбирает, кто может одобрять ответы.",
    nextActionLabel: "Открыть сообщения",
    href: "/admin/notifications",
  },
  {
    id: "finance-accounting-stack",
    title: "Финансы и бухгалтерия",
    subtitle: "Расходы на рекламу, счета, налоги, ЭДО и напоминания без опасного автозапуска денег.",
    priority: "P1",
    providerIds: ["accounting-tax-edi"],
    safeAutomation: [
      "показать расходы на рекламу рядом с заказами и выручкой",
      "готовить счета и акты как черновики",
      "напоминать об оплатах и документах",
    ],
    ownerAction: "Бухгалтер или владелец вручную подтверждает юридические и денежные действия.",
    nextActionLabel: "Открыть финансы",
    href: "/admin/finance",
  },
  {
    id: "aray-core-stack",
    title: "Ядро ARAY",
    subtitle: "Мозг, знания, файлы, голос и интернет-поиск, которые питают все действия помощника.",
    priority: "P0",
    providerIds: [
      "main-brain",
      "aray-knowledge-os",
      "document-media-intelligence",
      "voice-permissions",
      "federated-internet-search",
    ],
    safeAutomation: [
      "понимать разделы админки и доступные действия",
      "читать файлы и скриншоты с разрешения",
      "вести по админке по смыслу, а не длинными промтами",
    ],
    ownerAction: "Супер-админ подключает провайдеры платформы; пользователи дают только личные разрешения, например микрофон.",
    nextActionLabel: "Открыть ARAY",
    href: "/admin/aray",
  },
];

function isFilled(value: string | undefined): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return false;
  return !normalized.includes("your-") && normalized !== "..." && normalized !== "todo";
}

export function getArayProviderStatuses(env: NodeJS.ProcessEnv = process.env): ArayProviderRuntimeStatus[] {
  return ARAY_PROVIDER_MATRIX.map((provider) => {
    const required = provider.requiredEnv || [];
    const optional = provider.optionalEnv || [];
    const envStatuses: ArayProviderEnvStatus[] = [
      ...required.map((key) => ({ key, present: isFilled(env[key]), required: true })),
      ...optional.map((key) => ({ key, present: isFilled(env[key]), required: false })),
    ];

    const missingRequired = envStatuses.filter((item) => item.required && !item.present).map((item) => item.key);
    const readyCount = envStatuses.filter((item) => item.present).length;
    const totalCount = envStatuses.length;

    let status: ArayProviderStatus = "todo";
    if (required.length > 0 && missingRequired.length === 0) {
      status = "ready";
    } else if (readyCount > 0) {
      status = "partial";
    } else if (required.length === 0 && optional.length === 0 && provider.priority === "P2") {
      status = "todo";
    }

    return {
      ...provider,
      status,
      env: envStatuses,
      readyCount,
      totalCount,
      missingRequired,
    };
  });
}

export function getArayProviderSummary(statuses = getArayProviderStatuses()) {
  return statuses.reduce(
    (acc, item) => {
      acc.total += 1;
      acc[item.status] += 1;
      acc.byPriority[item.priority] += 1;
      return acc;
    },
    {
      total: 0,
      ready: 0,
      partial: 0,
      todo: 0,
      byPriority: { P0: 0, P1: 0, P2: 0 },
    } as {
      total: number;
      ready: number;
      partial: number;
      todo: number;
      byPriority: Record<ArayProviderPriority, number>;
    },
  );
}

export function getArayConnectorBundles(
  statuses: ArayProviderRuntimeStatus[] = getArayProviderStatuses(),
): ArayConnectorBundleRuntimeStatus[] {
  const providersById = new Map(statuses.map((provider) => [provider.id, provider]));

  return ARAY_CONNECTOR_BUNDLE_DEFINITIONS.map((bundle) => {
    const providers = bundle.providerIds
      .map((providerId) => providersById.get(providerId))
      .filter((provider): provider is ArayProviderRuntimeStatus => Boolean(provider));

    const readyCount = providers.filter((provider) => provider.status === "ready").length;
    const partialCount = providers.filter((provider) => provider.status === "partial").length;
    const totalCount = bundle.providerIds.length;
    const todoCount = Math.max(totalCount - readyCount - partialCount, 0);
    const status: ArayProviderStatus =
      totalCount > 0 && readyCount === totalCount ? "ready" : readyCount + partialCount > 0 ? "partial" : "todo";

    return {
      ...bundle,
      status,
      providers,
      readyCount,
      partialCount,
      todoCount,
      totalCount,
    };
  });
}
