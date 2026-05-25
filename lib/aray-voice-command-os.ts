export type ArayVoiceCommandAction = {
  type: "navigate" | "prompt";
  url?: string;
  prompt?: string;
  label: string;
  icon?: string;
};

export type ArayVoiceCommandEffect =
  | "open"
  | "back"
  | "refresh"
  | "scroll-top"
  | "scroll-bottom"
  | "scroll-up"
  | "scroll-down"
  | "theme-dark"
  | "theme-light"
  | "blocked-terminal";

export type ArayVoiceCommand = {
  id: string;
  label: string;
  effect: ArayVoiceCommandEffect;
  href?: string;
  reply: string;
  actions?: ArayVoiceCommandAction[];
};

function normalizeVoiceCommand(value: string) {
  return value
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^a-zа-я0-9+]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasAny(text: string, words: string[]) {
  return words.some((word) => text.includes(normalizeVoiceCommand(word)));
}

function openCommand(id: string, href: string, label: string, reply: string, icon = "target"): ArayVoiceCommand {
  return {
    id,
    label,
    effect: "open",
    href,
    reply,
    actions: [{ type: "navigate", url: href, label, icon }],
  };
}

export function resolveArayVoiceCommand(
  raw: string,
  options: {
    isAdmin: boolean;
    pathname: string;
  },
): ArayVoiceCommand | null {
  const text = normalizeVoiceCommand(raw);
  if (!text) return null;

  const hasNavigationIntent =
    /\b(открой|открыть|покажи|показать|перейди|перейти|зайди|зайти|верни|вернуться|обнови|обновить|прокрути|скролл|включи|включить)\b/.test(text) ||
    text.split(" ").length <= 3;

  const asksSystemTerminal =
    hasAny(text, ["powershell", "cmd", "bash", "shell", "командная строка", "системный терминал", "серверный терминал"]) ||
    (text.includes("терминал") && hasAny(text, ["выполни команду", "запусти команду", "команда"]));

  if (asksSystemTerminal) {
    return {
      id: "blocked-system-terminal",
      label: "Системный терминал",
      effect: "blocked-terminal",
      reply:
        "Системные команды голосом не запускаю напрямую. Могу открыть бизнес-терминал продаж, подготовить команду как черновик и попросить подтверждение.",
      actions: [{ type: "navigate", url: "/admin/orders/new", label: "Бизнес-терминал", icon: "check" }],
    };
  }

  if (!hasNavigationIntent) return null;

  if (hasAny(text, ["обнови страницу", "перезагрузи страницу", "refresh"])) {
    return {
      id: "refresh-page",
      label: "Обновить",
      effect: "refresh",
      reply: "Обновляю страницу. Голосовой слой остается включенным.",
    };
  }

  if (hasAny(text, ["назад", "вернись назад", "предыдущая страница"])) {
    return {
      id: "go-back",
      label: "Назад",
      effect: "back",
      reply: "Возвращаюсь назад. Я остаюсь рядом.",
    };
  }

  if (hasAny(text, ["в самый верх", "наверх", "к началу", "прокрути вверх до конца"])) {
    return {
      id: "scroll-top",
      label: "Наверх",
      effect: "scroll-top",
      reply: "Поднял страницу наверх.",
    };
  }

  if (hasAny(text, ["в самый низ", "вниз до конца", "к концу страницы"])) {
    return {
      id: "scroll-bottom",
      label: "Вниз",
      effect: "scroll-bottom",
      reply: "Опустил страницу вниз.",
    };
  }

  if (hasAny(text, ["прокрути вниз", "скролл вниз", "ниже"])) {
    return {
      id: "scroll-down",
      label: "Ниже",
      effect: "scroll-down",
      reply: "Прокрутил ниже.",
    };
  }

  if (hasAny(text, ["прокрути вверх", "скролл вверх", "выше"])) {
    return {
      id: "scroll-up",
      label: "Выше",
      effect: "scroll-up",
      reply: "Прокрутил выше.",
    };
  }

  if (hasAny(text, ["темная тема", "темный режим", "включи темную"])) {
    return {
      id: "theme-dark",
      label: "Темная тема",
      effect: "theme-dark",
      reply: "Включил темную тему.",
    };
  }

  if (hasAny(text, ["светлая тема", "светлый режим", "включи светлую"])) {
    return {
      id: "theme-light",
      label: "Светлая тема",
      effect: "theme-light",
      reply: "Включил светлую тему.",
    };
  }

  if (hasAny(text, ["публичный сайт", "витрина", "главная сайта", "открой сайт"])) {
    return openCommand("open-storefront", "/", "Сайт", "Открыл публичный сайт. Можно управлять витриной голосом.", "external");
  }

  if (options.isAdmin && hasAny(text, ["админка", "панель", "рабочий стол", "дашборд"])) {
    return openCommand("open-admin", "/admin", "Админка", "Открыл рабочий стол админки.", "target");
  }

  if (options.isAdmin && hasAny(text, ["терминал", "касса", "продажа", "новый заказ", "оформить заказ"])) {
    return openCommand(
      "open-sales-terminal",
      "/admin/orders/new",
      "Терминал",
      "Открыл бизнес-терминал продаж. Здесь можно голосом собрать заказ и дальше подтвердить действия.",
      "check",
    );
  }

  if (options.isAdmin && hasAny(text, ["заказы", "заказ"])) {
    return openCommand("open-orders", "/admin/orders", "Заказы", "Открыл заказы. Можно попросить найти новые, срочные или проблемные.", "check");
  }

  if (options.isAdmin && hasAny(text, ["товары", "каталог", "прайс", "номенклатура"])) {
    return openCommand("open-products", "/admin/products", "Каталог", "Открыл каталог. Можно голосом искать товар, цену, остаток или карточку.", "product");
  }

  if (options.isAdmin && hasAny(text, ["склад", "остатки", "наличие"])) {
    return openCommand("open-inventory", "/admin/inventory", "Склад", "Открыл склад и остатки. Изменения наличия только после подтверждения.", "product");
  }

  if (options.isAdmin && hasAny(text, ["crm", "црм", "лиды", "сделки", "клиенты"])) {
    return openCommand("open-crm", "/admin/crm", "CRM", "Открыл CRM. Можно голосом найти клиента или следующий шаг.", "target");
  }

  if (options.isAdmin && hasAny(text, ["мессенджер", "переписка", "сообщения", "диалоги"])) {
    return openCommand("open-messenger", "/admin/messenger", "Мессенджер", "Открыл мессенджер. Диалоги, CRM и звонки будут рядом.", "prompt");
  }

  if (options.isAdmin && hasAny(text, ["финансы", "кошелек", "деньги", "выручка", "расходы", "прибыль", "бонусы", "бонусная программа"])) {
    return openCommand(
      "open-finance",
      "/admin/finance",
      "Финансы",
      "Открыл финансы. Оплаты, кошелек, бонусы и расходы показываю как управленческий контур, без опасного доступа к банку.",
      "wallet",
    );
  }

  if (options.isAdmin && hasAny(text, ["оплаты", "платежи", "счета", "счет", "эквайринг", "qr", "сбп"])) {
    return openCommand(
      "open-payments",
      "/admin/finance",
      "Платежи",
      "Открыл платежный контур. Ссылки, QR и статусы оплаты выполняются только через провайдера или подтверждение.",
      "payment",
    );
  }

  if (options.isAdmin && hasAny(text, ["банк", "банковские счета", "реквизиты", "организация", "инн"])) {
    return openCommand(
      "open-bank-setup",
      "/admin/terminals",
      "Банк",
      "Открыл настройки банковского и терминального контура. Подключение банка делаем только через официальный доступ.",
      "bank",
    );
  }

  if (options.isAdmin && hasAny(text, ["продвижение", "реклама", "директ", "метрика", "seo", "сео"])) {
    return openCommand("open-promotion", "/admin/promotion", "Продвижение", "Открыл продвижение. Рекламные деньги не запускаю без подтверждения.", "direct");
  }

  if (options.isAdmin && hasAny(text, ["аналитика", "статистика", "отчеты", "отчет"])) {
    return openCommand("open-analytics", "/admin/analytics", "Аналитика", "Открыл аналитику. Можно голосом спросить выручку, конверсию или проблемные места.", "analytics");
  }

  if (!options.isAdmin && hasAny(text, ["каталог", "товары", "материалы"])) {
    return openCommand("open-public-catalog", "/catalog", "Каталог", "Открыл каталог на сайте.", "catalog");
  }

  if (!options.isAdmin && hasAny(text, ["корзина", "открой корзину", "покажи корзину"])) {
    return openCommand(
      "open-public-cart",
      "/cart",
      "Корзина",
      "Открыл корзину. Оформление и оплата только после подтверждения.",
      "check",
    );
  }

  if (!options.isAdmin && hasAny(text, ["оформить заказ", "checkout", "перейди к оплате", "доставка и оплата"])) {
    return openCommand(
      "open-public-checkout",
      "/checkout",
      "Оформление",
      "Открыл оформление заказа. Перед отправкой заявки всё покажу на подтверждение.",
      "check",
    );
  }

  if (!options.isAdmin && hasAny(text, ["услуги", "сервисы", "работы"])) {
    return openCommand("open-public-services", "/services", "Услуги", "Открыл услуги.", "target");
  }

  if (!options.isAdmin && hasAny(text, ["контакты", "телефон", "адрес", "как добраться"])) {
    return openCommand("open-public-contacts", "/contacts", "Контакты", "Открыл контакты.", "phone");
  }

  return null;
}
