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
  main: "сводка дня, сигналы и быстрые действия",
  sales: "терминал, заказы, доставка, клиенты, CRM и задачи",
  products: "каталог, карточки, категории, склад, медиа и импорт",
  marketing: "продвижение, акции, отзывы, рассылки, контент и аналитика",
  finance: "деньги, выручка, платежи и финансовая картина",
  settings: "бизнес, сайт, ARAY, терминалы, команда и здоровье",
  help: "гайды, обучение, база знаний и быстрые подсказки",
  personal: "профиль клиента, заказы, история и подписки",
};

const ADMIN_NAV_SECTIONS: Record<string, Array<{ label: string; hrefs: string[] }>> = {
  main: [
    { label: "Рабочий стол", hrefs: ["/admin"] },
  ],
  sales: [
    { label: "Терминал", hrefs: ["/admin/orders/new"] },
    { label: "Заказы и доставка", hrefs: ["/admin/orders", "/admin/delivery"] },
    { label: "Клиенты и CRM", hrefs: ["/admin/clients", "/admin/crm", "/admin/workflows"] },
    { label: "Задачи", hrefs: ["/admin/tasks"] },
  ],
  products: [
    { label: "Каталог", hrefs: ["/admin/products", "/admin/products/new", "/admin/products/audit", "/admin/categories", "/admin/product-types", "/catalog"] },
    { label: "Склад / остатки", hrefs: ["/admin/inventory"] },
    { label: "Медиа и защита", hrefs: ["/admin/media", "/admin/watermark"] },
    { label: "Импорт", hrefs: ["/admin/import"] },
  ],
  marketing: [
    { label: "Продвижение", hrefs: ["/admin/promotion", "/admin/promotions"] },
    { label: "Коммуникации", hrefs: ["/admin/email", "/admin/notifications"] },
    { label: "Репутация", hrefs: ["/admin/reviews"] },
    { label: "Контент", hrefs: ["/admin/posts", "/admin/services"] },
    { label: "Аналитика", hrefs: ["/admin/analytics"] },
  ],
  finance: [
    { label: "Финансы", hrefs: ["/admin/finance"] },
  ],
  settings: [
    { label: "Главное", hrefs: ["/admin/settings"] },
    { label: "Бизнес и сайт", hrefs: ["/admin/business/settings", "/admin/site", "/admin/appearance"] },
    { label: "ARAY", hrefs: ["/admin/aray"] },
    { label: "Рабочие места", hrefs: ["/admin/terminals"] },
    { label: "Команда", hrefs: ["/admin/staff"] },
    { label: "Система", hrefs: ["/admin/health"] },
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
