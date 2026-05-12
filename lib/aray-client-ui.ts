"use client";

export type ArayPageContext = {
  page?: string;
  productName?: string;
  cartTotal?: number;
  isReturning?: boolean;
  project?: string;
};

export function buildArayChips(page: ArayPageContext): string[] {
  const p = page.page || "/";

  if (page.project) return ["Продолжаем проект?", "Что ещё нужно?", "Посчитай стоимость"];

  if (page.productName) {
    return ["Сколько нужно?", "Есть в наличии?", "Доставка и цена"];
  }

  if (p.startsWith("/cart") || (page.cartTotal && page.cartTotal > 0 && p === "/cart")) {
    return ["Помоги оформить", "Когда доставят?", "Всё ли учёл?"];
  }

  if (p.startsWith("/checkout")) return ["Как оплатить?", "Когда привезут?", "Можно самовывоз?"];
  if (p.startsWith("/catalog")) return ["Строю дом — помоги", "Строю баню 4×5", "Нужен забор 50м"];
  if (p.startsWith("/delivery")) return ["Сколько стоит доставка?", "В какие районы?", "Можно сегодня?"];
  if (p.startsWith("/calculator")) return ["Рассчитай на дом 6×8", "Сколько бруса на баню?", "Стропила на крышу"];
  if (p.startsWith("/contacts")) return ["Как проехать?", "Режим работы", "Позвонить менеджеру"];
  if (p.startsWith("/about")) return ["Чем ПилоРус лучше?", "Гарантии качества", "Сертификаты"];
  if (p.startsWith("/promotions")) return ["Какие сейчас скидки?", "Акции на доску", "Оптовые цены"];
  if (p.startsWith("/services")) return ["Какие услуги есть?", "Доставка и разгрузка", "Напилить по размеру"];
  if (p.startsWith("/track")) return ["Где мой заказ?", "Когда приедет?", "Связаться с менеджером"];
  if (p.startsWith("/news")) return ["Что нового?", "Новые поступления", "Строительный совет"];
  if (p.startsWith("/wishlist")) return ["Посчитай всё из списка", "Что из этого в наличии?", "Добавить в корзину всё"];

  return ["Строю дом — помоги", "Строю баню", "Цены на доску"];
}

export function buildArayGreeting(page: ArayPageContext): string {
  const hour = new Date().getHours();
  const time = hour < 6 ? "Не спится?" : hour < 12 ? "Доброе утро" : hour < 17 ? "Привет" : hour < 22 ? "Добрый вечер" : "Поздно уже";
  const p = page.page || "/";

  if (page.project) {
    const short = page.project.length > 60 ? `${page.project.slice(0, 57)}...` : page.project;
    return `${time}! Помню твой проект: ${short} Продолжаем?`;
  }

  if (page.isReturning) {
    if (page.productName) return `С возвращением! Смотришь «${page.productName}» — уже решил или ещё думаешь?`;
    return "С возвращением! Расскажи что строишь — помогу рассчитать всё до гвоздя.";
  }

  if (page.productName) return `${time}! Смотришь «${page.productName}» — скажи что строишь, посчитаю сколько нужно.`;
  if (page.cartTotal && page.cartTotal > 0) return `${time}! Вижу, уже набрал на ${page.cartTotal.toLocaleString("ru-RU")} ₽. Помочь оформить?`;

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
