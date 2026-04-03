"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
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
  Wallet,
  CheckSquare,
  Zap,
  Target,
} from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  exact?: boolean;
  roles: string[];
  group: string;
};

const SA = "SUPER_ADMIN";

const allNavItems: NavItem[] = [
  // ── Главная ──
  { href: "/admin", label: "Дашборд", icon: LayoutDashboard, exact: true, roles: [SA, "ADMIN", "MANAGER", "COURIER", "ACCOUNTANT", "WAREHOUSE", "SELLER"], group: "main" },

  // ── Продажи ──
  { href: "/admin/orders", label: "Заказы", icon: ShoppingBag, roles: [SA, "ADMIN", "MANAGER", "COURIER", "ACCOUNTANT", "WAREHOUSE", "SELLER"], group: "sales" },
  { href: "/admin/crm", label: "CRM — Лиды", icon: Target, roles: [SA, "ADMIN", "MANAGER", "SELLER"], group: "sales" },
  { href: "/admin/tasks", label: "Задачи", icon: CheckSquare, roles: [SA, "ADMIN", "MANAGER", "COURIER", "ACCOUNTANT", "WAREHOUSE", "SELLER"], group: "sales" },
  // { href: "/admin/workflows", label: "Автоворкфлоу", icon: Zap, roles: [SA, "ADMIN", "MANAGER"], group: "sales" },
  { href: "/admin/delivery", label: "Доставка", icon: Truck, roles: [SA, "ADMIN", "MANAGER", "COURIER"], group: "sales" },

  // ── Товары ──
  { href: "/admin/products", label: "Каталог товаров", icon: Package, roles: [SA, "ADMIN", "MANAGER", "WAREHOUSE", "SELLER"], group: "products" },
  { href: "/admin/categories", label: "Категории", icon: Tag, roles: [SA, "ADMIN"], group: "products" },
  { href: "/admin/inventory", label: "Склад / Остатки", icon: Warehouse, roles: [SA, "ADMIN", "MANAGER", "WAREHOUSE"], group: "products" },
  { href: "/admin/import", label: "Импорт / Экспорт", icon: FileDown, roles: [SA, "ADMIN", "MANAGER", "WAREHOUSE"], group: "products" },
  { href: "/admin/media", label: "Медиабиблиотека", icon: Images, roles: [SA, "ADMIN", "MANAGER"], group: "products" },

  // ── Маркетинг ──
  { href: "/admin/promotions", label: "Акции", icon: Megaphone, roles: [SA, "ADMIN", "MANAGER"], group: "marketing" },
  { href: "/admin/reviews", label: "Отзывы", icon: Star, roles: [SA, "ADMIN", "MANAGER"], group: "marketing" },
  { href: "/admin/email", label: "Email рассылка", icon: Mail, roles: [SA, "ADMIN"], group: "marketing" },
  { href: "/admin/promotion", label: "Продвижение", icon: TrendingUp, roles: [SA, "ADMIN", "MANAGER"], group: "marketing" },

  // ── Финансы ──
  { href: "/admin/finance", label: "Финансы", icon: Wallet, roles: [SA, "ADMIN", "ACCOUNTANT"], group: "finance" },

  // ── Клиенты ──
  { href: "/admin/clients", label: "Клиенты", icon: UserCircle, roles: [SA, "ADMIN", "MANAGER"], group: "clients" },

  // ── Настройки ──
  { href: "/admin/health", label: "Здоровье системы", icon: HeartPulse, roles: [SA, "ADMIN"], group: "settings" },
  { href: "/admin/site", label: "Сайт", icon: Globe, roles: [SA, "ADMIN"], group: "settings" },
  { href: "/admin/settings", label: "Настройки", icon: Settings, roles: [SA, "ADMIN"], group: "settings" },
  { href: "/admin/appearance", label: "Оформление", icon: Palette, roles: [SA, "ADMIN"], group: "settings" },
  { href: "/admin/analytics", label: "Аналитика", icon: BarChart2, roles: [SA, "ADMIN"], group: "settings" },
  { href: "/admin/watermark", label: "Водяной знак", icon: Stamp, roles: [SA, "ADMIN"], group: "settings" },
  { href: "/admin/staff", label: "Команда", icon: Users, roles: [SA, "ADMIN"], group: "settings" },
  { href: "/admin/notifications", label: "Уведомления", icon: Bell, roles: [SA, "ADMIN"], group: "settings" },

  // ── Помощь ──
  { href: "/admin/help", label: "Помощь", icon: HelpCircle, roles: [SA, "ADMIN", "MANAGER", "COURIER", "ACCOUNTANT", "WAREHOUSE", "SELLER"], group: "help" },
];

const GROUP_LABELS: Record<string, string> = {
  sales: "Продажи",
  products: "Товары",
  marketing: "Маркетинг",
  finance: "Финансы",
  clients: "Клиенты",
  settings: "Настройки",
  help: "",
};

export function AdminNav({ role, onNavigate }: { role?: string; onNavigate?: () => void }) {
  const pathname = usePathname();
  const [pendingCount, setPendingCount] = useState(0);

  // Fetch pending staff count (ADMIN / SUPER_ADMIN only)
  useEffect(() => {
    if (!role || !["SUPER_ADMIN", "ADMIN"].includes(role)) return;
    fetch("/api/admin/staff")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!data) return;
        const members: { staffStatus?: string }[] = data.members || data;
        const count = members.filter((m) => m.staffStatus === "PENDING").length;
        setPendingCount(count);
      })
      .catch(() => {});
  }, [role]);

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
              <div className="flex items-center gap-2 px-3 pt-4 pb-1.5">
                {GROUP_LABELS[item.group] && (
                  <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/35 whitespace-nowrap">
                    {GROUP_LABELS[item.group]}
                  </span>
                )}
                <div className="flex-1 aray-nav-divider" />
              </div>
            )}

            <Link
              href={item.href}
              onClick={onNavigate}
              className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group mb-0.5 overflow-hidden aray-icon-spin ${
                isActive
                  ? "aray-nav-active text-white"
                  : "text-white/65 hover:text-white hover:bg-white/[0.07]"
              }`}
            >
              <item.icon className={`w-4 h-4 shrink-0 transition-colors duration-200 ${
                isActive ? "text-primary" : "text-white/60 group-hover:text-white/90"
              }`} />
              <span className="flex-1">{item.label}</span>
              {/* Pending badge for staff page */}
              {item.href === "/admin/staff" && pendingCount > 0 && (
                <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-amber-400 text-[9px] font-bold text-black flex items-center justify-center leading-none">
                  {pendingCount > 9 ? "9+" : pendingCount}
                </span>
              )}
              <ChevronRight
                className={`w-3 h-3 transition-all duration-200 ${
                  isActive ? "opacity-60 text-primary" : "opacity-0 group-hover:opacity-50"
                }`}
              />
            </Link>
          </div>
        );
      })}
    </nav>
  );
}
