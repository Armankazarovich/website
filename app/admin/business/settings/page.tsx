import Link from "next/link";
import {
  BarChart2,
  Boxes,
  Brush,
  ChevronRight,
  Globe,
  Handshake,
  Images,
  Info,
  Package,
  Search,
  ShoppingCart,
  Tags,
  Truck,
  Wand2,
} from "lucide-react";
import { BusinessRoleOsPanel } from "@/components/admin/business-role-os-panel";

const settingGroups = [
  {
    title: "Витрина и контент",
    description: "Главная, блоки сайта, баннеры, тексты, SEO и внешний вид.",
    items: [
      { title: "Настройки витрины", href: "/admin/site", icon: Globe, text: "Контакты, SEO, аналитика, футер, виджеты." },
      { title: "Редактор витрины", href: "/admin/site/constructor", icon: Wand2, text: "Блоки, страницы, превью и правки текущего сайта." },
      { title: "Оформление", href: "/admin/appearance", icon: Brush, text: "Палитра, карточки, мобильный вид, ARAY на сайте." },
      { title: "Медиабиблиотека", href: "/admin/media", icon: Images, text: "Фото, документы, alt-тексты и бизнес-медиа." },
    ],
  },
  {
    title: "Каталог и склад",
    description: "Товары, категории, остатки, импорт и экспорт прайсов.",
    items: [
      { title: "Каталог товаров", href: "/admin/products", icon: Package, text: "Товары, цены, фото, варианты и публикация." },
      { title: "Категории", href: "/admin/categories", icon: Boxes, text: "Разделы, меню, футер, подкатегории и SEO." },
      { title: "Типы товаров", href: "/admin/product-types", icon: Tags, text: "Фильтры каталога, тексты разделов, SEO и индексация." },
      { title: "Продавцы / Поставщики", href: "/admin/suppliers", icon: Handshake, text: "Витрины продавцов, прайсы, предложения и мультивендор." },
      { title: "Склад / Остатки", href: "/admin/inventory", icon: Search, text: "Остатки, пороги, наличие и быстрые правки." },
      { title: "Импорт / Экспорт", href: "/admin/import", icon: Wand2, text: "Excel, CSV, Google Таблицы и безопасный перенос каталога." },
    ],
  },
  {
    title: "Продажи и получение",
    description: "Способы получения, оплаты, аналитика и связка с терминалом.",
    items: [
      { title: "Терминал", href: "/admin/orders/new", icon: ShoppingCart, text: "Касса, телефонные заказы, CRM и оформление." },
      { title: "Доставка и тарифы", href: "/admin/delivery", icon: Truck, text: "Операции, самовывоз, выдача, тарифы и маршруты." },
      { title: "Аналитика", href: "/admin/analytics", icon: BarChart2, text: "Продажи, клиенты, источники и будущие сегменты." },
    ],
  },
];

export default function BusinessSettingsPage() {
  return (
    <div className="admin-page-frame admin-page-frame-readable pb-16">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary/80">Управление бизнесом</p>
          <h1 className="mt-2 font-display text-2xl font-bold text-foreground">Настройки бизнеса</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            Всё, что относится к витрине, бирже, каталогу и продажам. Я смогу настраивать эти блоки пошагово, а ручные настройки остаются рядом.
          </p>
        </div>
        <Link
          href="/admin/site"
          className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl border border-primary/35 bg-primary/10 px-4 text-sm font-semibold text-primary transition-colors hover:bg-primary/15"
        >
          <Globe className="h-4 w-4" />
          Открыть настройки витрины
        </Link>
      </div>

      <div className="admin-alert admin-alert-info flex items-start gap-3 p-4 text-sm leading-6">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <p className="font-semibold text-foreground">ARAY-мастер для автозаполнения закреплен в редакторе витрины.</p>
          <p className="mt-1 text-muted-foreground">
            Сейчас ручные настройки остаются рядом, а редактор витрины держит контракт запуска: тип бизнеса, тенант, каталог, Арай, PWA и проверки перед деплоем.
          </p>
        </div>
      </div>

      <BusinessRoleOsPanel />

      <div className="grid gap-4 lg:grid-cols-3">
        {settingGroups.map((group) => (
          <section key={group.title} className="rounded-2xl border border-border bg-card">
            <div className="border-b border-border p-4">
              <h2 className="text-base font-semibold text-foreground">{group.title}</h2>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{group.description}</p>
            </div>
            <div className="space-y-2 p-3">
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="group flex min-h-[72px] items-center gap-3 rounded-xl border border-border bg-background/45 p-3 transition-colors hover:border-primary/35 hover:bg-primary/5"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-primary">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-foreground">{item.title}</span>
                      <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{item.text}</span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
