export type PublicEditSurface =
  | "home"
  | "catalog"
  | "product"
  | "cart"
  | "checkout"
  | "content"
  | "business"
  | "marketing";

export type PublicEditTargetId =
  | "home.hero"
  | "home.promotions"
  | "catalog.filters"
  | "catalog.product-card"
  | "product.detail"
  | "product.related"
  | "product.reviews"
  | "product.calculator"
  | "cart.summary"
  | "checkout.flow"
  | "content.news"
  | "content.services"
  | "business.contacts"
  | "business.delivery"
  | "marketing.promotions";

export type PublicEditTarget = {
  id: PublicEditTargetId;
  surface: PublicEditSurface;
  label: string;
  adminHref: string;
  adminLabel: string;
  module: string;
  arayPrompt: string;
};

export const PUBLIC_EDIT_TARGETS: Record<PublicEditTargetId, PublicEditTarget> = {
  "home.hero": {
    id: "home.hero",
    surface: "home",
    label: "Главный экран",
    adminHref: "/admin/site",
    adminLabel: "Настроить главный экран",
    module: "site",
    arayPrompt: "Помоги улучшить главный экран сайта: оффер, фото, кнопки и доверие.",
  },
  "home.promotions": {
    id: "home.promotions",
    surface: "home",
    label: "Акции на главной",
    adminHref: "/admin/promotions",
    adminLabel: "Изменить акции",
    module: "marketing",
    arayPrompt: "Помоги обновить акции на главной странице без лишнего шума.",
  },
  "catalog.filters": {
    id: "catalog.filters",
    surface: "catalog",
    label: "Фильтры каталога",
    adminHref: "/admin/categories",
    adminLabel: "Настроить каталог",
    module: "store",
    arayPrompt: "Помоги привести категории, типы и фильтры каталога в порядок.",
  },
  "catalog.product-card": {
    id: "catalog.product-card",
    surface: "catalog",
    label: "Карточка товара",
    adminHref: "/admin/products",
    adminLabel: "Изменить товар",
    module: "store",
    arayPrompt: "Помоги улучшить товар: фото, цену, размеры, описание и SEO.",
  },
  "product.detail": {
    id: "product.detail",
    surface: "product",
    label: "Страница товара",
    adminHref: "/admin/products",
    adminLabel: "Редактировать товар",
    module: "store",
    arayPrompt: "Помоги улучшить страницу товара: выгоду, цену, размеры и описание.",
  },
  "product.related": {
    id: "product.related",
    surface: "product",
    label: "Похожие товары",
    adminHref: "/admin/appearance",
    adminLabel: "Настроить",
    module: "store",
    arayPrompt: "Помоги настроить блок похожих товаров и рекомендации на странице товара.",
  },
  "product.reviews": {
    id: "product.reviews",
    surface: "product",
    label: "Отзывы",
    adminHref: "/admin/reviews",
    adminLabel: "Управлять отзывами",
    module: "trust",
    arayPrompt: "Помоги проверить отзывы, ответы и доверие на странице товара.",
  },
  "product.calculator": {
    id: "product.calculator",
    surface: "product",
    label: "Калькулятор товара",
    adminHref: "/admin/appearance",
    adminLabel: "Настроить",
    module: "store",
    arayPrompt: "Помоги проверить калькулятор, единицы измерения и понятность цены.",
  },
  "cart.summary": {
    id: "cart.summary",
    surface: "cart",
    label: "Корзина",
    adminHref: "/admin/appearance",
    adminLabel: "Настроить корзину",
    module: "store",
    arayPrompt: "Помоги сделать корзину понятной: состав, сумма, подсказки и следующий шаг.",
  },
  "checkout.flow": {
    id: "checkout.flow",
    surface: "checkout",
    label: "Оформление заказа",
    adminHref: "/admin/appearance",
    adminLabel: "Настроить checkout",
    module: "store",
    arayPrompt: "Помоги упростить оформление заказа и убрать лишние поля.",
  },
  "content.news": {
    id: "content.news",
    surface: "content",
    label: "Статьи",
    adminHref: "/admin/posts",
    adminLabel: "Изменить статью",
    module: "content",
    arayPrompt: "Помоги улучшить статью: SEO, заголовок, пользу и перелинковку.",
  },
  "content.services": {
    id: "content.services",
    surface: "content",
    label: "Услуги",
    adminHref: "/admin/services",
    adminLabel: "Изменить услугу",
    module: "content",
    arayPrompt: "Помоги улучшить услугу: выгоду, сроки, цену и заявку.",
  },
  "business.contacts": {
    id: "business.contacts",
    surface: "business",
    label: "Контакты",
    adminHref: "/admin/site",
    adminLabel: "Изменить контакты",
    module: "business",
    arayPrompt: "Помоги проверить телефоны, адрес, мессенджеры и график работы.",
  },
  "business.delivery": {
    id: "business.delivery",
    surface: "business",
    label: "Доставка",
    adminHref: "/admin/delivery",
    adminLabel: "Настроить доставку",
    module: "delivery",
    arayPrompt: "Помоги настроить доставку, самовывоз, зоны и условия разгрузки.",
  },
  "marketing.promotions": {
    id: "marketing.promotions",
    surface: "marketing",
    label: "Акции",
    adminHref: "/admin/promotions",
    adminLabel: "Изменить акцию",
    module: "marketing",
    arayPrompt: "Помоги сделать акцию понятной, честной и продающей.",
  },
};

export function getPublicEditTarget(id: PublicEditTargetId) {
  return PUBLIC_EDIT_TARGETS[id];
}

export function getProductEditTarget(productId: string) {
  return {
    ...PUBLIC_EDIT_TARGETS["product.detail"],
    adminHref: `/admin/products/${productId}`,
  };
}

