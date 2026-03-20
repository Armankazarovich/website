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
} from "lucide-react";

const adminNav = [
  { href: "/admin", label: "Дашборд", icon: LayoutDashboard, exact: true },
  { href: "/admin/orders", label: "Заказы", icon: ShoppingBag },
  { href: "/admin/products", label: "Товары", icon: Package },
  { href: "/admin/categories", label: "Категории", icon: Tag },
  { href: "/admin/promotions", label: "Акции", icon: Megaphone },
  { href: "/admin/reviews", label: "Отзывы", icon: Star },
  { href: "/admin/site", label: "Сайт", icon: Globe },
  { href: "/admin/settings", label: "Настройки", icon: Settings },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex-1 p-3 space-y-1">
      {adminNav.map((item) => {
        const isActive = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
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
