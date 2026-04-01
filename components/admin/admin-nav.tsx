"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Tag,
  Star,
  Settings,
  Megaphone,
  ChevronRight,
  Globe,
  HelpCircle,
  Users,
  Bell,
  Truck,
  UserCircle,
  Palette,
  Stamp,
  Warehouse,
  FileDown,
  Images,
  BarChart2,
  Mail,
  HeartPulse,
  TrendingUp,
} from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  exact?: boolean;
  roles: string[];
  group: string;
};

const allNavItems: NavItem[] = [
  // ── Главная ──
  { href: "/admin", label: "Дашборд", icon: LayoutDashboard, exact: true, roles: ["ADMIN", "MANAGER", "COURIER", "ACCOUNTANT", "WAREHOUSE", "SELLER"], group: "main" },

  // ── Продажи ──
  { href: "/admin/orders", label: "Заказы", icon: ShoppingBag, roles: ["ADMIN", "MANAGER", "COURIER", "ACCOUNTANT", "WAREHOUSE", "SELLER"], group: "sales" },
  { href: "/admin/delivery", label: "Доставка", icon: Truck, roles: ["ADMIN", "MANAGER", "COURIER"], group: "sales" },

  // ── Товары ──
  { href: "/admin/products", label: "Каталог товаров", icon: Package, roles: ["ADMIN", "MANAGER", "WAREHOUSE", "SELLER"], group: "products" },
  { href: "/admin/categories", label: "Категории", icon: Tag, roles: ["ADMIN"], group: "products" },
  { href: "/admin/inventory", label: "Склад / Остатки", icon: Warehouse, roles: ["ADMIN", "MANAGER", "WAREHOUSE"], group: "products" },
  { href: "/admin/import", label: "Импорт / Экспорт", icon: FileDown, roles: ["ADMIN", "MANAGER", "WAREHOUSE"], group: "products" },
  { href: "/admin/media", label: "Медиабиблиотека", icon: Images, roles: ["ADMIN", "MANAGER"], group: "products" },

  // ── Маркетинг ──
  { href: "/admin/promotions", label: "Акции", icon: Megaphone, roles: ["ADMIN", "MANAGER"], group: "marketing" },
  { href: "/admin/reviews", label: "Отзывы", icon: Star, roles: ["ADMIN", "MANAGER"], group: "marketing" },
  { href: "/admin/email", label: "Email рассылка", icon: Mail, roles: ["ADMIN"], group: "marketing" },
  { href: "/admin/promotion", label: "Продвижение", icon: TrendingUp, roles: ["ADMIN", "MANAGER"], group: "marketing" },

  // ── Клиенты ──
  { href: "/admin/clients", label: "Клиенты", icon: UserCircle, roles: ["ADMIN", "MANAGER"], group: "clients" },

  // ── Настройки ──
  { href: "/admin/health", label: "Здоровье системы", icon: HeartPulse, roles: ["ADMIN"], group: "settings" },
  { href: "/admin/site", label: "Сайт", icon: Globe, roles: ["ADMIN"], group: "settings" },
  { href: "/admin/settings", label: "Настройки", icon: Settings, roles: ["ADMIN"], group: "settings" },
  { href: "/admin/appearance", label: "Оформление", icon: Palette, roles: ["ADMIN"], group: "settings" },
  { href: "/admin/analytics", label: "Аналитика", icon: BarChart2, roles: ["ADMIN"], group: "settings" },
  { href: "/admin/watermark", label: "Водяной знак", icon: Stamp, roles: ["ADMIN"], group: "settings" },
  { href: "/admin/staff", label: "Команда", icon: Users, roles: ["ADMIN"], group: "settings" },
  { href: "/admin/notifications", label: "Уведомления", icon: Bell, roles: ["ADMIN"], group: "settings" },

  // ── Помощь ──
  { href: "/admin/help", label: "Помощь", icon: HelpCircle, roles: ["ADMIN", "MANAGER", "COURIER", "ACCOUNTANT", "WAREHOUSE", "SELLER"], group: "help" },
];

const GROUP_LABELS: Record<string, string> = {
  sales: "Продажи",
  products: "Товары",
  marketing: "Маркетинг",
  clients: "Клиенты",
  settings: "Настройки",
  help: "",
};

export function AdminNav({ role, onNavigate }: { role?: string; onNavigate?: () => void }) {
  const pathname = usePathname();
  const visibleItems = allNavItems.filter(
    (item) => !item.roles || item.roles.includes(role || "")
  );

  let lastGroup = "";

  return (
    <nav className="flex-1 p-3 overflow-y-auto">
      {visibleItems.map((item) => {
        const isActive = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href);

        const showDivider = item.group !== lastGroup && item.group !== "main";
        lastGroup = item.group;

        return (
          <div key={item.href}>
            {/* Group separator */}
            {showDivider && GROUP_LABELS[item.group] !== undefined && (
              <div className="flex items-center gap-2 px-3 pt-4 pb-1.5 first:pt-2">
                <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-white/30 whitespace-nowrap">
                  {GROUP_LABELS[item.group]}
                </span>
                <div className="flex-1 h-px bg-white/10" />
              </div>
            )}

            <Link
              href={item.href}
              onClick={onNavigate}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors group mb-0.5 ${
                isActive
                  ? "bg-white/15 text-white"
                  : "text-white/70 hover:text-white hover:bg-white/10"
              }`}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {item.label}
              <ChevronRight
                className={`w-3 h-3 ml-auto transition-opacity ${
                  isActive ? "opacity-70" : "opacity-0 group-hover:opacity-100"
                }`}
              />
            </Link>
          </div>
        );
      })}
    </nav>
  );
}
