import type { NavItem } from "@/components/admin/admin-navigation-registry";

export const ADMIN_NAV_GROUP_ORDER = [
  "main",
  "sales",
  "products",
  "marketing",
  "finance",
  "settings",
  "help",
  "personal",
];

export const ADMIN_NAV_GROUP_DESCRIPTIONS: Record<string, string> = {
  main: "сводка дня, роли, риски и быстрые действия",
  sales: "заказы, терминал, клиенты, доставка, CRM и задачи",
  products: "каталог, карточки, цены, склад, медиа и импорт",
  marketing: "Direct, SEO, акции, сторис, отзывы, контент и аналитика",
  finance: "деньги, расходы, платежи и финансовая картина",
  settings: "бизнес, сайт, команда, ARAY, рабочие места и здоровье",
  help: "гайды, обучение, база знаний и быстрые подсказки",
  personal: "профиль клиента, заказы, история и подписки",
};

const ADMIN_NAV_SECTIONS: Record<string, Array<{ label: string; hrefs: string[] }>> = {
  main: [
    { label: "Рабочий день", hrefs: ["/admin"] },
    { label: "Роли и система", hrefs: ["/admin/director"] },
  ],
  sales: [
    { label: "Заказы", hrefs: ["/admin/orders", "/admin/orders/new"] },
    { label: "Клиенты и CRM", hrefs: ["/admin/clients", "/admin/crm", "/admin/workflows"] },
    { label: "Доставка", hrefs: ["/admin/delivery"] },
    { label: "Задачи", hrefs: ["/admin/tasks"] },
  ],
  products: [
    { label: "Карточки и цены", hrefs: ["/admin/products", "/admin/products/new", "/admin/products/audit"] },
    { label: "Структура каталога", hrefs: ["/admin/categories", "/admin/product-types", "/catalog"] },
    { label: "Склад / остатки", hrefs: ["/admin/inventory"] },
    { label: "Медиа и защита", hrefs: ["/admin/media", "/admin/watermark"] },
    { label: "Импорт", hrefs: ["/admin/import"] },
  ],
  marketing: [
    { label: "Реклама и SEO", hrefs: ["/admin/promotion", "/admin/analytics"] },
    { label: "Акции", hrefs: ["/admin/promotions"] },
    { label: "Сторис и доверие", hrefs: ["/admin/stories", "/admin/reviews"] },
    { label: "Коммуникации", hrefs: ["/admin/email", "/admin/notifications"] },
    { label: "Контент", hrefs: ["/admin/posts", "/admin/services"] },
  ],
  finance: [
    { label: "Финансы", hrefs: ["/admin/finance"] },
  ],
  settings: [
    { label: "Бизнес и роли", hrefs: ["/admin/business/settings", "/admin/staff"] },
    { label: "Сайт и оформление", hrefs: ["/admin/site", "/admin/site/constructor", "/admin/appearance"] },
    { label: "ARAY и модули", hrefs: ["/admin/aray"] },
    { label: "Рабочие места", hrefs: ["/admin/terminals"] },
    { label: "Система", hrefs: ["/admin/settings", "/admin/health"] },
    { label: "Личный кабинет", hrefs: ["/cabinet/notifications", "/cabinet/appearance"] },
  ],
  help: [
    { label: "Помощь", hrefs: ["/admin/help", "/admin/terminals/training"] },
  ],
  personal: [
    { label: "Клиент", hrefs: ["/cabinet", "/cabinet/orders", "/cabinet/profile", "/cabinet/reviews", "/cabinet/media", "/cabinet/subscriptions", "/cabinet/history"] },
  ],
};

export type AdminNavSection = {
  label: string;
  items: NavItem[];
};

export function buildAdminNavSections(group: string, items: NavItem[]): AdminNavSection[] {
  const definitions = ADMIN_NAV_SECTIONS[group] || [];
  const used = new Set<string>();

  const sections = definitions
    .map((section) => {
      const sectionItems = section.hrefs
        .map((href) => items.find((item) => item.href === href))
        .filter(Boolean) as NavItem[];
      sectionItems.forEach((item) => used.add(item.href));
      return { label: section.label, items: sectionItems };
    })
    .filter((section) => section.items.length > 0);

  const rest = items.filter((item) => !used.has(item.href));
  if (rest.length > 0) {
    sections.push({
      label: sections.length > 0 ? "Другое" : "Разделы",
      items: rest,
    });
  }

  return sections;
}
