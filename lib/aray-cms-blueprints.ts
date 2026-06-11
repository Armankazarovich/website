export type ArayCmsBlockKind =
  | "hero"
  | "catalog"
  | "product-card"
  | "cart"
  | "checkout"
  | "delivery"
  | "promotion"
  | "trust"
  | "content"
  | "contacts"
  | "footer"
  | "aray-widget";

export type ArayCmsBlock = {
  id: string;
  kind: ArayCmsBlockKind;
  title: string;
  purpose: string;
  editable: string[];
  dataNeeded: string[];
  automation: string[];
};

export type ArayCmsPalette = {
  id: string;
  title: string;
  text: string;
  colors: string[];
};

export type ArayCmsAutomation = {
  id: string;
  title: string;
  text: string;
  route: string;
};

export type ArayCmsTemplate = {
  id: string;
  title: string;
  badge: string;
  result: string;
  description: string;
  blocks: ArayCmsBlock[];
  palettes: ArayCmsPalette[];
  automations: ArayCmsAutomation[];
  qualityGates: string[];
};

export const ARAY_CMS_INTERNET_STORE_TEMPLATE: ArayCmsTemplate = {
  id: "internet-store",
  title: "Интернет-магазин",
  badge: "первый шаблон ARAY CMS",
  result: "сайт + каталог + корзина + заявки + CRM + PWA + уведомления",
  description:
    "ARAY собирает магазин как полноценную систему: витрина, товары, заявки, админка, роли, мобильное приложение и проверки перед доменом.",
  blocks: [
    {
      id: "store-hero",
      kind: "hero",
      title: "Главный экран магазина",
      purpose: "Сразу объясняет, что продает бизнес, где работает и какое действие нужно клиенту.",
      editable: ["заголовок", "подзаголовок", "кнопки", "фон", "город", "телефон"],
      dataNeeded: ["название бизнеса", "сфера", "город", "главная выгода", "фото или фон"],
      automation: ["кнопка ведет в каталог или заявку", "событие пишется в аналитику"],
    },
    {
      id: "store-catalog",
      kind: "catalog",
      title: "Каталог и категории",
      purpose: "Показывает товары по разделам с поиском, фильтрами, ценами, остатками и быстрым добавлением.",
      editable: ["категории", "порядок", "фильтры", "видимость", "SEO-тексты"],
      dataNeeded: ["прайс", "категории", "названия", "цены", "остатки", "единицы измерения"],
      automation: ["импорт товаров", "скрытие без цены", "проверка пустых категорий"],
    },
    {
      id: "store-product-card",
      kind: "product-card",
      title: "Карточка товара",
      purpose: "Дает клиенту фото, характеристики, варианты, цену, наличие и понятную заявку.",
      editable: ["фото", "описание", "характеристики", "варианты", "связанные товары"],
      dataNeeded: ["фото", "описание", "характеристики", "варианты", "цены"],
      automation: ["заявка сохраняет состав", "товар попадает в CRM", "SEO для товара"],
    },
    {
      id: "store-cart-checkout",
      kind: "checkout",
      title: "Корзина и оформление",
      purpose: "Собирает состав заказа, контакты клиента, доставку и комментарий без лишней сложности.",
      editable: ["поля формы", "способы доставки", "текст после отправки", "правила оплаты"],
      dataNeeded: ["телефон", "адрес", "доставка", "оплата", "ответственный"],
      automation: ["создание заказа", "уведомление менеджеру", "статус CRM"],
    },
    {
      id: "store-promotions",
      kind: "promotion",
      title: "Акции и предложения",
      purpose: "Показывает скидки, быстрые подборки, сезонные предложения и товары для запуска.",
      editable: ["карточки", "баннеры", "условия", "даты", "ссылки"],
      dataNeeded: ["акции", "условия", "товары", "даты"],
      automation: ["автоотключение по дате", "метки в каталоге", "событие аналитики"],
    },
    {
      id: "store-delivery-payment",
      kind: "delivery",
      title: "Доставка и оплата",
      purpose: "Объясняет зоны доставки, самовывоз, сроки, оплату и условия для юрлиц.",
      editable: ["города", "тарифы", "склады", "условия", "карта"],
      dataNeeded: ["адрес", "зоны доставки", "условия оплаты", "график"],
      automation: ["подсказки в checkout", "задача менеджеру при нестандартной доставке"],
    },
    {
      id: "store-trust",
      kind: "trust",
      title: "Доверие и преимущества",
      purpose: "Показывает причины купить здесь: производство, склад, гарантия, документы, опыт.",
      editable: ["преимущества", "цифры", "фото", "сертификаты", "история"],
      dataNeeded: ["факты бизнеса", "документы", "фото", "сильные стороны"],
      automation: ["ARAY предлагает формулировки", "проверка без пустых обещаний"],
    },
    {
      id: "store-contacts-footer",
      kind: "contacts",
      title: "Контакты, мессенджеры и футер",
      purpose: "Дает быстрый звонок, карту, реквизиты, соцсети, ссылки и повторную заявку.",
      editable: ["телефон", "WhatsApp", "адрес", "почта", "соцсети", "ссылки"],
      dataNeeded: ["контакты", "адрес", "график", "мессенджеры"],
      automation: ["клики пишутся в аналитику", "форма идет в CRM", "PWA получает контакты"],
    },
  ],
  palettes: [
    {
      id: "clear-commerce",
      title: "Чистый магазин",
      text: "Светлая витрина, понятные карточки, сильная кнопка покупки и высокая читаемость.",
      colors: ["hsl(var(--background))", "hsl(var(--foreground))", "hsl(var(--primary))", "hsl(var(--accent))"],
    },
    {
      id: "industrial-premium",
      title: "Производство",
      text: "Темнее, плотнее, с акцентом на склад, фактуру, надежность и B2B-заказы.",
      colors: ["hsl(var(--card))", "hsl(var(--background))", "hsl(var(--primary))", "hsl(var(--muted-foreground))"],
    },
    {
      id: "local-trust",
      title: "Локальный бизнес",
      text: "Спокойная палитра для регионального магазина, где важны доверие и быстрый контакт.",
      colors: ["hsl(var(--background))", "hsl(var(--foreground))", "hsl(var(--accent))", "hsl(var(--primary))"],
    },
  ],
  automations: [
    {
      id: "crm-order",
      title: "Заявка в CRM",
      text: "Каждый заказ сохраняет клиента, телефон, состав, источник, статус и следующий шаг.",
      route: "/admin/orders",
    },
    {
      id: "notifications",
      title: "Уведомления",
      text: "Менеджер получает событие о новой заявке, оплате, задаче или проблеме запуска.",
      route: "/admin/notifications",
    },
    {
      id: "pwa",
      title: "PWA и иконки",
      text: "Сайт получает название, иконки, манифест, быстрый вход и свежую версию приложения.",
      route: "/admin/site",
    },
    {
      id: "analytics",
      title: "Аналитика",
      text: "ARAY проверяет клики, заявки, источники, товары без цены и слабые места перед рекламой.",
      route: "/admin/analytics",
    },
    {
      id: "finance",
      title: "Финансы",
      text: "Счета, оплаты, обязательства партнера и контроль денег остаются в рабочем маршруте.",
      route: "/admin/finance",
    },
    {
      id: "domain-release",
      title: "Домен и выпуск",
      text: "Домен подключается только после проверки сайта, материалов, заявок, PWA и уведомлений.",
      route: "/admin/site/releases",
    },
  ],
  qualityGates: [
    "нет пустых карточек и фейковых товаров",
    "кнопки ведут в реальные действия",
    "каталог, корзина и заявка проходят тестовый путь",
    "мобильная версия читается без наложений",
    "PWA, иконки и контакты соответствуют сайту",
    "домены и платежи включаются только после подтверждения",
  ],
};
