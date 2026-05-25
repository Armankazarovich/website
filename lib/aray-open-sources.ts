export type ArayOpenSourceKind =
  | "auto"
  | "web"
  | "image"
  | "video"
  | "music"
  | "playlist"
  | "movie"
  | "reviews"
  | "route"
  | "document"
  | "learning"
  | "audiobook"
  | "wellbeing";

export type ArayOpenSourceCard = {
  title: string;
  url: string;
  source: string;
  kind: Exclude<ArayOpenSourceKind, "auto">;
  access: "free_search" | "free_content_possible" | "subscription_or_paid" | "official" | "rights_check";
  note: string;
};

export type ArayOpenSourceRequest = {
  query: string;
  kind?: ArayOpenSourceKind | string | null;
  from?: string | null;
  to?: string | null;
  city?: string | null;
  autoOpen?: boolean;
};

export type ArayOpenSourceResponse = {
  query: string;
  kind: Exclude<ArayOpenSourceKind, "auto">;
  summary: string;
  policy: string;
  firstUrl: string | null;
  cards: ArayOpenSourceCard[];
  message: string;
  action?: string;
};

const LEGAL_POLICY =
  "Ищу и открываю только открытые или официальные источники. Если контент платный, по подписке или защищен правами, показываю где смотреть/слушать легально; пиратские скачивания и обход доступа не предлагаю.";

function cleanQuery(value?: string | null) {
  return (value || "")
    .replace(/\s+/g, " ")
    .replace(/[<>{}[\]\\]/g, "")
    .trim()
    .slice(0, 180);
}

function cleanIntentQuery(value?: string | null) {
  let query = cleanQuery(value)
    .replace(/^(?:арай|арей|пожалуйста|плиз|брат)\s+/i, "")
    .replace(/^(?:найди|покажи|открой|включи|построй|дай|подбери|собери|посмотри|где)\s+/i, "")
    .replace(/^(?:мне|нам|для меня|пожалуйста)\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();
  query = query || cleanQuery(value);
  return query.slice(0, 180);
}

function enc(value: string) {
  return encodeURIComponent(value);
}

function detectKind(rawQuery: string, rawKind?: string | null): Exclude<ArayOpenSourceKind, "auto"> {
  const kind = String(rawKind || "auto").toLowerCase();
  if (["web", "image", "video", "music", "playlist", "movie", "reviews", "route", "document", "learning", "audiobook", "wellbeing"].includes(kind)) {
    return kind as Exclude<ArayOpenSourceKind, "auto">;
  }

  const q = rawQuery.toLowerCase();
  if (/маршрут|навигатор|как\s+доехать|проехать|дорог[ауи]|адрес|карты|maps?/.test(q)) return "route";
  if (/медитац|успоко|нервнича|стресс|тревог|выгор|сон|дыхан|расслаб/.test(q)) return "wellbeing";
  if (/аудиокниг|слушать\s+книг|книга\s+слушат/.test(q)) return "audiobook";
  if (/урок|обуч|курс|научи|туториал|мастер.?класс|как\s+научиться|фриланс|развит|тренинг|лекци/.test(q)) return "learning";
  if (/плейлист|подборк[ауи]\s+музык|музыку\s+для|музыка\s+для/.test(q)) return "playlist";
  if (/музык|песн|трек|альбом|исполнитель|слушат|включи/.test(q)) return "music";
  if (/фильм|сериал|кино|мультфильм|кинопоиск|смотреть/.test(q)) return "movie";
  if (/клип|видео|youtube|ютуб|ролик|трейлер/.test(q)) return "video";
  if (/картинк|фото|изображен|логотип|обложк|референс|цвет[аоы]?/.test(q)) return "image";
  if (/отзыв|рейтинг|репутац|организац|компани[яю]/.test(q)) return "reviews";
  if (/документ|pdf|инструкц|договор|бланк|форма|шаблон|регламент|закон/.test(q)) return "document";
  return "web";
}

function removeKindPrefix(query: string, kind: Exclude<ArayOpenSourceKind, "auto">) {
  const patterns: Partial<Record<Exclude<ArayOpenSourceKind, "auto">, RegExp>> = {
    music: /^(?:музыку|музыка|песню|песня|трек|композицию)\s+/i,
    playlist: /^(?:плейлист|подборку|музыку)\s+/i,
    movie: /^(?:фильм|сериал|кино|мультфильм)\s+/i,
    video: /^(?:видео|клип|ролик)\s+/i,
    image: /^(?:картинку|картинки|фото|изображение|изображения)\s+/i,
    document: /^(?:документ|договор|бланк|инструкцию|pdf)\s+/i,
    route: /^(?:маршрут|дорогу|путь)\s+/i,
    learning: /^(?:урок|курс|обучение|туториал)\s+/i,
    audiobook: /^(?:аудиокнигу|аудиокнига)\s+/i,
  };
  const next = query.replace(patterns[kind] || /^$/, "").trim();
  return next || query;
}

function normalizeOpenSourceQueryTypos(query: string, kind: Exclude<ArayOpenSourceKind, "auto">) {
  let next = query.trim();
  if (!next) return next;

  const mediaLike = ["music", "playlist", "movie", "video", "audiobook", "wellbeing", "learning", "web"].includes(kind);
  if (mediaLike) {
    next = next
      .replace(/\bприкас[ао]вени[ея]\b/gi, "прикосновения")
      .replace(/\bприк[ао]сновение\b/gi, "прикосновение")
      .replace(/\bсопран[ао]\b/gi, "сопрано")
      .replace(/\bютуб\b/gi, "youtube")
      .replace(/\bяндекс\s+музык[ауи]\b/gi, "яндекс музыка");
  }

  return next.replace(/\s+/g, " ").trim() || query;
}

function card(
  title: string,
  url: string,
  source: string,
  kind: Exclude<ArayOpenSourceKind, "auto">,
  access: ArayOpenSourceCard["access"],
  note: string,
): ArayOpenSourceCard {
  return { title, url, source, kind, access, note };
}

function yandexSearch(query: string) {
  return `https://yandex.ru/search/?text=${enc(query)}`;
}

function buildCards(input: ArayOpenSourceRequest, kind: Exclude<ArayOpenSourceKind, "auto">) {
  const query = cleanQuery(input.query);
  const city = cleanQuery(input.city);
  const from = cleanQuery(input.from);
  const to = cleanQuery(input.to);
  const placeQuery = city ? `${query} ${city}` : query;
  const routeTo = to || query;
  const routeFrom = from || "мое местоположение";

  if (kind === "route") {
    return [
      card(
        "Маршрут в Яндекс Картах",
        `https://yandex.ru/maps/?rtext=${enc(routeFrom)}~${enc(routeTo)}&rtt=auto`,
        "Яндекс Карты",
        "route",
        "free_search",
        "Откроет построение маршрута. Если браузер попросит геолокацию, человек сам разрешает.",
      ),
      card(
        "Поиск места на карте",
        `https://yandex.ru/maps/?text=${enc(routeTo)}`,
        "Яндекс Карты",
        "route",
        "free_search",
        "Полезно, если точный адрес пока неизвестен.",
      ),
    ];
  }

  if (kind === "image") {
    return [
      card("Картинки в Яндексе", `https://yandex.ru/images/search?text=${enc(placeQuery)}`, "Яндекс Картинки", "image", "rights_check", "Показываю изображения; права на коммерческое использование надо проверять."),
      card("Открытый поиск", yandexSearch(`${placeQuery} фото изображение`), "Яндекс Поиск", "image", "free_search", "Подходит для быстрых референсов и источников."),
    ];
  }

  if (kind === "video") {
    return [
      card("Видео в Яндексе", `https://yandex.ru/video/search?text=${enc(placeQuery)}`, "Яндекс Видео", "video", "free_content_possible", "Ищу ролики и клипы в открытых источниках."),
      card("YouTube поиск", `https://www.youtube.com/results?search_query=${enc(placeQuery)}`, "YouTube", "video", "free_content_possible", "Официальные каналы и авторские ролики; реклама/ограничения зависят от сервиса."),
    ];
  }

  if (kind === "music" || kind === "playlist") {
    const musicQuery = kind === "playlist" ? `${query} плейлист` : query;
    return [
      card("Яндекс Музыка", `https://music.yandex.ru/search?text=${enc(musicQuery)}`, "Яндекс Музыка", kind, "subscription_or_paid", "Можно найти трек, альбом или плейлист; часть прослушивания может требовать подписку."),
      card("YouTube Music / клипы", `https://www.youtube.com/results?search_query=${enc(musicQuery)}`, "YouTube", kind, "free_content_possible", "Часто есть официальные клипы и подборки; скачивание не предлагаю."),
      card("Поиск по открытым источникам", yandexSearch(`${musicQuery} слушать официально`), "Яндекс Поиск", kind, "free_search", "Покажет легальные страницы, радио, артистов и сервисы."),
    ];
  }

  if (kind === "movie") {
    return [
      card("Кинопоиск", `https://www.kinopoisk.ru/index.php?kp_query=${enc(query)}`, "Кинопоиск", "movie", "subscription_or_paid", "Покажет карточку фильма, рейтинг и где смотреть легально; может потребоваться подписка."),
      card("Трейлеры и обзоры", `https://yandex.ru/video/search?text=${enc(`${query} трейлер`)}`, "Яндекс Видео", "movie", "free_content_possible", "Трейлеры и обзоры обычно доступны открыто."),
      card("Официальные варианты просмотра", yandexSearch(`${query} смотреть официально`), "Яндекс Поиск", "movie", "subscription_or_paid", "Ищу официальные кинотеатры и сервисы, без пиратских ссылок."),
    ];
  }

  if (kind === "reviews") {
    return [
      card("Отзывы в Яндекс Картах", `https://yandex.ru/maps/?text=${enc(placeQuery)}`, "Яндекс Карты", "reviews", "free_search", "Ищу карточку организации, рейтинг, отзывы, адрес и маршрут."),
      card("Отзывы и репутация в поиске", yandexSearch(`${placeQuery} отзывы рейтинг`), "Яндекс Поиск", "reviews", "free_search", "Покажет открытые страницы с отзывами. Итоговые оценки не выдумываю."),
      card("2ГИС поиск", `https://2gis.ru/search/${enc(placeQuery)}`, "2ГИС", "reviews", "free_search", "Дополнительный источник по организациям и отзывам."),
    ];
  }

  if (kind === "document") {
    return [
      card("Документы PDF в поиске", yandexSearch(`${query} filetype:pdf`), "Яндекс Поиск", "document", "free_search", "Ищу открытые PDF и документы; источник надо проверять перед использованием."),
      card("Официальные источники", yandexSearch(`${query} официальный документ инструкция закон`), "Яндекс Поиск", "document", "official", "Сначала смотрим официальные сайты, затем шаблоны и примеры."),
    ];
  }

  if (kind === "learning") {
    return [
      card("Обучающие видео", `https://yandex.ru/video/search?text=${enc(`${query} урок обучение`)}`, "Яндекс Видео", "learning", "free_content_possible", "Ищу уроки, мастер-классы и разборы по теме."),
      card("YouTube уроки", `https://www.youtube.com/results?search_query=${enc(`${query} урок обучение`)}`, "YouTube", "learning", "free_content_possible", "Часто есть бесплатные уроки; качество и авторов нужно оценивать."),
      card("Курсы и статьи", yandexSearch(`${query} курс обучение бесплатно официально`), "Яндекс Поиск", "learning", "free_search", "Покажет курсы, статьи, школы и бесплатные материалы."),
    ];
  }

  if (kind === "audiobook") {
    return [
      card("Аудиокниги в Яндексе", `https://music.yandex.ru/search?text=${enc(`${query} аудиокнига`)}`, "Яндекс Музыка", "audiobook", "subscription_or_paid", "Часть аудиокниг может быть по подписке или покупке."),
      card("Официальные аудиокниги", yandexSearch(`${query} аудиокнига официально слушать`), "Яндекс Поиск", "audiobook", "subscription_or_paid", "Ищу легальные площадки и открытые записи."),
      card("Видео/лекции по книге", `https://yandex.ru/video/search?text=${enc(`${query} аудиокнига лекция`)}`, "Яндекс Видео", "audiobook", "free_content_possible", "Может найти открытые лекции, обзоры и фрагменты."),
    ];
  }

  if (kind === "wellbeing") {
    return [
      card("Спокойная музыка", `https://music.yandex.ru/search?text=${enc(`${query} спокойная музыка медитация`)}`, "Яндекс Музыка", "wellbeing", "subscription_or_paid", "Музыка/медитации могут требовать подписку; ARAY честно откроет источник."),
      card("Дыхательные практики", `https://yandex.ru/video/search?text=${enc(`${query} дыхательная практика медитация`)}`, "Яндекс Видео", "wellbeing", "free_content_possible", "Ищу короткие открытые практики. Это поддержка, не медицинская помощь."),
      card("Открытые материалы", yandexSearch(`${query} медитация дыхание стресс бесплатно`), "Яндекс Поиск", "wellbeing", "free_search", "Подборка открытых источников для мягкой поддержки."),
    ];
  }

  return [
    card("Открытый поиск", yandexSearch(placeQuery), "Яндекс Поиск", "web", "free_search", "Быстрый открытый поиск с источниками."),
    card("Видео по теме", `https://yandex.ru/video/search?text=${enc(placeQuery)}`, "Яндекс Видео", "video", "free_content_possible", "Если нужен ролик, обзор или демонстрация."),
  ];
}

function kindLabel(kind: Exclude<ArayOpenSourceKind, "auto">) {
  const labels: Record<Exclude<ArayOpenSourceKind, "auto">, string> = {
    web: "поиск",
    image: "картинки",
    video: "видео",
    music: "музыка",
    playlist: "плейлист",
    movie: "фильм/сериал",
    reviews: "отзывы",
    route: "маршрут",
    document: "документы",
    learning: "обучение",
    audiobook: "аудиокнига",
    wellbeing: "поддержка/медитация",
  };
  return labels[kind];
}

function accessLabel(access: ArayOpenSourceCard["access"]) {
  const labels: Record<ArayOpenSourceCard["access"], string> = {
    free_search: "бесплатный поиск",
    free_content_possible: "может быть бесплатно",
    subscription_or_paid: "возможна подписка/оплата",
    official: "официальный источник",
    rights_check: "проверить права",
  };
  return labels[access];
}

export function buildArayOpenSourceSearch(input: ArayOpenSourceRequest): ArayOpenSourceResponse {
  const rawQuery = cleanIntentQuery(input.query);
  const kind = detectKind(rawQuery, input.kind);
  const strippedQuery = removeKindPrefix(rawQuery, kind);
  const query = normalizeOpenSourceQueryTypos(strippedQuery, kind);
  const corrected = query !== strippedQuery;
  const cards = buildCards({ ...input, query }, kind).slice(0, 5);
  const firstUrl = cards[0]?.url || null;
  const autoOpen = Boolean(input.autoOpen && firstUrl);
  const list = cards
    .slice(0, 3)
    .map((item) => `- [${item.title}](${item.url}) — ${accessLabel(item.access)}`)
    .join("\n");
  const actions = cards.slice(0, 3).map((item) => ({
    type: "navigate",
    url: item.url,
    label: `Открыть: ${item.title}`,
    icon: item.kind === "route" ? "map" : "external",
  }));
  const summary = `Нашёл легальный путь: ${kindLabel(kind)} по запросу "${query}".`;
  const correctionLine = corrected
    ? `Похоже, в запросе была опечатка. Пробую понятнее: "${query}".`
    : "";
  const message = [
    summary,
    correctionLine,
    "Кнопки ниже откроют источники. Платное и подписки помечаю честно.",
    list,
    actions.length ? `ARAY_ACTIONS:${JSON.stringify(actions)}` : "",
  ].filter(Boolean).join("\n");

  return {
    query,
    kind,
    summary,
    policy: LEGAL_POLICY,
    firstUrl,
    cards,
    message,
    action: autoOpen && firstUrl ? `__ARAY_SHOW_URL:${firstUrl}:${cards[0]?.title || "Источник"}__` : undefined,
  };
}

export function shouldUseOpenSourceShortcut(text: string): boolean {
  const q = text.toLowerCase();
  if (!/(найди|покажи|открой|включи|построй|дай|подбери|собери|посмотри|где)/.test(q)) return false;
  return /(фильм|сериал|кино|мультфильм|клип|видео|музык|песн|трек|альбом|плейлист|картинк|фото|изображен|маршрут|навигатор|проехать|карты|отзыв|рейтинг|документ|pdf|инструкц|договор|бланк|официальн|урок|обуч|курс|аудиокниг|медитац|стресс|нервнича|фриланс|развит|тренинг|лекци|дыхан)/.test(q);
}

export function wantsOpenSourceAutoOpen(text: string): boolean {
  return /(открой|включи|покажи|построй|веди|запусти)/i.test(text);
}
