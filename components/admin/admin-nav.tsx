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
} from "lucide-react";

const allNavItems = [
  { href: "/admin", label: "Дашборд", icon: LayoutDashboard, exact: true, roles: ["ADMIN", "MANAGER", "COURIER", "ACCOUNTANT", "WAREHOUSE", "SELLER"] },
  { href: "/admin/orders", label: "Заказы", icon: ShoppingBag, roles: ["ADMIN", "MANAGER", "COURIER", "ACCOUNTANT", "WAREHOUSE", "SELLER"] },
  { href: "/admin/delivery", label: "Доставка", icon: Truck, roles: ["ADMIN", "MANAGER", "COURIER"] },
  { href: "/admin/products", label: "Товары", icon: Package, roles: ["ADMIN", "MANAGER", "WAREHOUSE", "SELLER"] },
  { href: "/admin/categories", label: "Категории", icon: Tag, roles: ["ADMIN"] },
  { href: "/admin/promotions", label: "Акции", icon: Megaphone, roles: ["ADMIN", "MANAGER"] },
  { href: "/admin/reviews", label: "Отзывы", icon: Star, roles: ["ADMIN", "MANAGER"] },
  { href: "/admin/site", label: "Сайт", icon: Globe, roles: ["ADMIN"] },
  { href: "/admin/settings", label: "Настройки", icon: Settings, roles: ["ADMIN"] },
  { href: "/admin/appearance", label: "Оформление", icon: Palette, roles: ["ADMIN"] },
  { href: "/admin/clients", label: "Клиенты", icon: UserCircle, roles: ["ADMIN", "MANAGER"] },
  { href: "/admin/staff", label: "Команда", icon: Users, roles: ["ADMIN"] },
  { href: "/admin/notifications", label: "Уведомления", icon: Bell, roles: ["ADMIN"] },
  { href: "/admin/help", label: "Помощь", icon: HelpCircle, roles: ["ADMIN", "MANAGER", "COURIER", "ACCOUNTANT", "WAREHOUSE", "SELLER"] },
];

export function AdminNav({ role, onNavigate }: { role?: string; onNavigate?: () => void }) {
  const pathname = usePathname();
  const visibleItems = allNavItems.filter((item) =>
    !item.roles || item.roles.includes(role || "")
  );

  return (
    <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
      {visibleItems.map((item) => {
        const isActive = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors group ${
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
        );
      })}
    </nav>
  );
}
