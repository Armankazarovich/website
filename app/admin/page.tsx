export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { formatPrice, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from "@/lib/utils";
import {
  ShoppingBag, Package, Star, Clock, Users, Truck, Warehouse, Target,
  Mail, Bell, Settings, Wallet, BarChart2, CheckSquare, HeartPulse,
  UserCircle, FileDown, ChevronRight, Zap, Activity,
} from "lucide-react";
import Link from "next/link";
import { AutoRefresh } from "@/components/admin/auto-refresh";
import { DashboardTopItems } from "@/components/admin/dashboard-top-items";
import { DashboardGreeting } from "@/components/admin/dashboard-greeting";
import { DashboardMetrics, CourierMetrics } from "@/components/admin/dashboard-metrics";
import { DashboardChart } from "@/components/admin/dashboard-chart";
import { DashboardActions } from "@/components/admin/dashboard-actions";
// DashboardArayRail убран — Арай теперь fixed справа в AdminShell на ВСЕЙ админке
// (сессия 40 hotfix: видение Армана для сенсорных мониторов/телевизоров)

// ─────────────────────────────────────────────────────────────────────────────
// Сессия 40 (28.04.2026) — Дашборд-шедевр.
// Полная переписка под calm UI магазина:
//  - Все aray-stat-card / arayglass-grid-* убраны.
//  - bg-card border-border rounded-2xl на каждом блоке.
//  - Цветные иконки в кружках semantic (emerald revenue / amber orders /
//    primary blue / violet analytics / pink reviews).
//  - font-display для крупных значений, primary акцент на имени и сумме.
//  - Quick Actions grid 2/3/4 col с цветными лейблами + иконкой в круге.
//  - Чистый адаптив 375 / 640 / 1024 / 1280.
//  - DashboardActions (client) регистрирует "Новый заказ" в хедер AppHeader.
//  - DashboardArayRail справа на ≥lg как превью архитектуры pinned-rail.
// ─────────────────────────────────────────────────────────────────────────────

// ── Тон-карточки для Quick Actions (palette-aware semantic) ──
type QuickTone = "primary" | "emerald" | "amber" | "violet" | "rose" | "blue" | "slate";

interface QuickAction {
  href: string;
  label: string;
  icon: React.ElementType;
  tone: QuickTone;
}

const TONE_BG: Record<QuickTone, string> = {
  primary: "bg-background/70 text-primary ring-1 ring-border/70 dark:bg-background/35 dark:ring-white/10",
  emerald: "bg-background/70 text-emerald-600 ring-1 ring-border/70 dark:bg-background/35 dark:text-emerald-400 dark:ring-white/10",
  amber: "bg-background/70 text-amber-600 ring-1 ring-border/70 dark:bg-background/35 dark:text-amber-400 dark:ring-white/10",
  violet: "bg-background/70 text-violet-600 ring-1 ring-border/70 dark:bg-background/35 dark:text-violet-400 dark:ring-white/10",
  rose: "bg-background/70 text-rose-600 ring-1 ring-border/70 dark:bg-background/35 dark:text-rose-400 dark:ring-white/10",
  blue: "bg-background/70 text-blue-600 ring-1 ring-border/70 dark:bg-background/35 dark:text-blue-400 dark:ring-white/10",
  slate: "bg-background/70 text-slate-600 ring-1 ring-border/70 dark:bg-background/35 dark:text-slate-300 dark:ring-white/10",
};

const QUICK_ACTIONS: Record<string, QuickAction[]> = {
  owner: [
    { href: "/admin/orders", label: "Заказы", icon: ShoppingBag, tone: "primary" },
    { href: "/admin/clients", label: "Клиенты", icon: UserCircle, tone: "blue" },
    { href: "/admin/analytics", label: "Аналитика", icon: BarChart2, tone: "violet" },
    { href: "/admin/finance", label: "Финансы", icon: Wallet, tone: "emerald" },
    { href: "/admin/products", label: "Каталог", icon: Package, tone: "amber" },
    { href: "/admin/email", label: "Email", icon: Mail, tone: "rose" },
    { href: "/admin/notifications", label: "Push", icon: Bell, tone: "blue" },
    { href: "/admin/settings", label: "Настройки", icon: Settings, tone: "slate" },
  ],
  manager: [
    { href: "/admin/orders", label: "Заказы", icon: ShoppingBag, tone: "primary" },
    { href: "/admin/clients", label: "Клиенты", icon: UserCircle, tone: "blue" },
    { href: "/admin/crm", label: "CRM", icon: Target, tone: "violet" },
    { href: "/admin/delivery", label: "Доставка", icon: Truck, tone: "emerald" },
    { href: "/admin/products", label: "Каталог", icon: Package, tone: "amber" },
    { href: "/admin/reviews", label: "Отзывы", icon: Star, tone: "rose" },
    { href: "/admin/tasks", label: "Задачи", icon: CheckSquare, tone: "blue" },
    { href: "/admin/inventory", label: "Склад", icon: Warehouse, tone: "slate" },
  ],
  courier: [
    { href: "/admin/delivery", label: "Доставки", icon: Truck, tone: "emerald" },
    { href: "/admin/orders", label: "Заказы", icon: ShoppingBag, tone: "primary" },
    { href: "/admin/tasks", label: "Задачи", icon: CheckSquare, tone: "blue" },
    { href: "/admin/help", label: "Помощь", icon: HeartPulse, tone: "rose" },
  ],
  accountant: [
    { href: "/admin/finance", label: "Финансы", icon: Wallet, tone: "emerald" },
    { href: "/admin/orders", label: "Заказы", icon: ShoppingBag, tone: "primary" },
    { href: "/admin/analytics", label: "Аналитика", icon: BarChart2, tone: "violet" },
    { href: "/admin/clients", label: "Клиенты", icon: UserCircle, tone: "blue" },
  ],
  warehouse: [
    { href: "/admin/inventory", label: "Склад", icon: Warehouse, tone: "primary" },
    { href: "/admin/products", label: "Каталог", icon: Package, tone: "amber" },
    { href: "/admin/import", label: "Импорт", icon: FileDown, tone: "blue" },
    { href: "/admin/orders", label: "Заказы", icon: ShoppingBag, tone: "emerald" },
  ],
  seller: [
    { href: "/admin/products", label: "Каталог", icon: Package, tone: "amber" },
    { href: "/admin/orders", label: "Заказы", icon: ShoppingBag, tone: "primary" },
    { href: "/admin/clients", label: "Клиенты", icon: UserCircle, tone: "blue" },
    { href: "/admin/reviews", label: "Отзывы", icon: Star, tone: "rose" },
  ],
};

const ROLE_GREETINGS: Record<string, string> = {
  SUPER_ADMIN: "Владелец платформы",
  ADMIN: "Администратор",
  MANAGER: "Менеджер",
  COURIER: "Курьер",
  ACCOUNTANT: "Бухгалтер",
  WAREHOUSE: "Кладовщик",
  SELLER: "Продавец",
};

const ORDER_FLOW = [
  { status: "NEW", href: "/admin/orders?status=NEW", tone: "bg-blue-500", iconTone: "bg-blue-500/10 text-blue-700 dark:text-blue-400" },
  { status: "CONFIRMED", href: "/admin/orders?status=CONFIRMED", tone: "bg-purple-500", iconTone: "bg-purple-500/10 text-purple-700 dark:text-purple-400" },
  { status: "PROCESSING", href: "/admin/orders?status=PROCESSING", tone: "bg-amber-500", iconTone: "bg-amber-500/10 text-amber-700 dark:text-amber-400" },
  { status: "IN_DELIVERY", href: "/admin/orders?status=IN_DELIVERY", tone: "bg-sky-500", iconTone: "bg-sky-500/10 text-sky-700 dark:text-sky-400" },
  { status: "READY_PICKUP", href: "/admin/orders?status=READY_PICKUP", tone: "bg-violet-500", iconTone: "bg-violet-500/10 text-violet-700 dark:text-violet-400" },
  { status: "DELIVERED", href: "/admin/orders?status=DELIVERED", tone: "bg-green-500", iconTone: "bg-green-500/10 text-green-700 dark:text-green-400" },
  { status: "COMPLETED", href: "/admin/orders?status=COMPLETED", tone: "bg-teal-500", iconTone: "bg-teal-500/10 text-teal-700 dark:text-teal-400" },
] as const;

function getRoleGroup(role: string): string {
  if (role === "SUPER_ADMIN" || role === "ADMIN") return "owner";
  if (role === "MANAGER") return "manager";
  if (role === "COURIER") return "courier";
  if (role === "ACCOUNTANT") return "accountant";
  if (role === "WAREHOUSE") return "warehouse";
  if (role === "SELLER") return "seller";
  return "manager";
}

export default async function AdminDashboard() {
  const session = await auth();
  const role = (session?.user as any)?.role || "MANAGER";
  const userId = (session?.user as any)?.id;
  let userName = session?.user?.name || "Коллега";
  const roleGroup = getRoleGroup(role);
  const isOwner = roleGroup === "owner";
  const canCreateOrder = isOwner || roleGroup === "manager" || roleGroup === "seller";
  const quickActions = QUICK_ACTIONS[roleGroup] || QUICK_ACTIONS.manager;

  if ((!session?.user?.name || session.user.name.trim().length === 0) && userId) {
    const freshUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    }).catch(() => null);
    if (freshUser?.name) userName = freshUser.name;
  }

  const now = new Date();
  const today = new Date(now); today.setHours(0, 0, 0, 0);
  const days7ago = new Date(now); days7ago.setDate(now.getDate() - 6); days7ago.setHours(0, 0, 0, 0);
  const days30ago = new Date(now); days30ago.setDate(now.getDate() - 29); days30ago.setHours(0, 0, 0, 0);

  const [
    totalOrders, newOrders, todayOrders, totalProducts,
    pendingReviews, recentOrders, revenue30, revenue7, revenueToday,
    allOrdersForChart, statusCounts, pendingStaff,
  ] = await Promise.all([
    prisma.order.count({ where: { deletedAt: null } }),
    prisma.order.count({ where: { status: "NEW", deletedAt: null } }),
    prisma.order.count({ where: { createdAt: { gte: today }, deletedAt: null } }),
    prisma.product.count({ where: { active: true } }),
    prisma.review.count({ where: { approved: false } }),
    prisma.order.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, orderNumber: true, guestName: true, totalAmount: true, status: true, createdAt: true },
    }),
    prisma.order.aggregate({ _sum: { totalAmount: true, deliveryCost: true }, where: { status: { not: "CANCELLED" }, createdAt: { gte: days30ago }, deletedAt: null } }),
    prisma.order.aggregate({ _sum: { totalAmount: true, deliveryCost: true }, where: { status: { not: "CANCELLED" }, createdAt: { gte: days7ago }, deletedAt: null } }),
    prisma.order.aggregate({ _sum: { totalAmount: true, deliveryCost: true }, where: { status: { not: "CANCELLED" }, createdAt: { gte: today }, deletedAt: null } }),
    prisma.order.findMany({ where: { createdAt: { gte: days7ago }, status: { not: "CANCELLED" }, deletedAt: null }, select: { createdAt: true, totalAmount: true, deliveryCost: true }, orderBy: { createdAt: "asc" } }),
    prisma.order.groupBy({ by: ["status"], where: { deletedAt: null }, _count: { _all: true } }),
    prisma.user.count({ where: { staffStatus: "PENDING" } }).catch(() => 0),
  ]);

  // Chart data за последние 7 дней
  const chartDays: { label: string; amount: number; date: Date }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0);
    chartDays.push({ label: d.toLocaleDateString("ru-RU", { weekday: "short" }), amount: 0, date: d });
  }
  for (const o of allOrdersForChart) {
    const d = new Date(o.createdAt); d.setHours(0, 0, 0, 0);
    const slot = chartDays.find((c) => c.date.getTime() === d.getTime());
    if (slot) slot.amount += Number(o.totalAmount) + Number(o.deliveryCost || 0);
  }

  const orders30count = await prisma.order.count({ where: { status: { not: "CANCELLED" }, createdAt: { gte: days30ago }, deletedAt: null } });
  const revenue30total = Number(revenue30._sum.totalAmount || 0) + Number(revenue30._sum.deliveryCost || 0);
  const revenue7total = Number(revenue7._sum.totalAmount || 0) + Number(revenue7._sum.deliveryCost || 0);
  const revenueTodayTotal = Number(revenueToday._sum.totalAmount || 0) + Number(revenueToday._sum.deliveryCost || 0);
  const avgOrder = orders30count > 0 ? revenue30total / orders30count : 0;
  const statusCountMap = new Map(statusCounts.map((item) => [item.status, item._count._all]));
  const orderFlow = ORDER_FLOW.map((item) => ({
    ...item,
    label: ORDER_STATUS_LABELS[item.status] || item.status,
    count: statusCountMap.get(item.status) || 0,
  }));
  const liveOrderCount = orderFlow.reduce((sum, item) => sum + item.count, 0);
  const readinessCards = [
    {
      href: "/admin/orders",
      label: "Сегодня",
      value: todayOrders.toLocaleString("ru-RU"),
      helper: "заказов с полуночи",
      icon: Clock,
      tone: "bg-primary/10 text-primary",
      show: true,
    },
    {
      href: "/admin/products",
      label: "Каталог",
      value: totalProducts.toLocaleString("ru-RU"),
      helper: "активных товаров",
      icon: Package,
      tone: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
      show: isOwner || ["manager", "warehouse", "seller"].includes(roleGroup),
    },
    {
      href: "/admin/reviews",
      label: "Отзывы",
      value: pendingReviews.toLocaleString("ru-RU"),
      helper: "ждут модерации",
      icon: Star,
      tone: "bg-rose-500/10 text-rose-700 dark:text-rose-400",
      show: isOwner || roleGroup === "manager",
    },
    {
      href: "/admin/staff",
      label: "Команда",
      value: pendingStaff.toLocaleString("ru-RU"),
      helper: "заявок на доступ",
      icon: Users,
      tone: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
      show: isOwner,
    },
  ].filter((card) => card.show);

  return (
    <div className="admin-dashboard-standard space-y-4 sm:space-y-5 min-w-0">
        <AutoRefresh intervalMs={60000} />
        <DashboardActions showNewOrder={canCreateOrder} />

        {/* ── HERO: приветствие ── */}
        <DashboardGreeting
          userName={userName}
          roleLabel={ROLE_GREETINGS[role] || role}
        />

        {/* ── АЛЕРТЫ ── */}
        {(newOrders > 0 || pendingReviews > 0 || pendingStaff > 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {newOrders > 0 && (
              <Link
                href="/admin/orders?status=NEW"
                className="admin-liquid-surface admin-liquid-interactive flex items-center gap-3 px-4 py-3 rounded-2xl group min-w-0"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <Clock className="w-[18px] h-[18px]" strokeWidth={1.75} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground leading-tight">
                    {newOrders} {pluralizeRu(newOrders, ["новый заказ", "новых заказа", "новых заказов"])}
                  </p>
                  <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                    Ждут подтверждения
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0" />
              </Link>
            )}
            {pendingReviews > 0 && isOwner && (
              <Link
                href="/admin/reviews"
                className="admin-liquid-surface admin-liquid-interactive flex items-center gap-3 px-4 py-3 rounded-2xl group min-w-0"
              >
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                  <Star className="w-[18px] h-[18px]" strokeWidth={1.75} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground leading-tight">
                    {pendingReviews} {pluralizeRu(pendingReviews, ["отзыв", "отзыва", "отзывов"])}
                  </p>
                  <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                    Ждут модерации
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0" />
              </Link>
            )}
            {pendingStaff > 0 && isOwner && (
              <Link
                href="/admin/staff"
                className="admin-liquid-surface admin-liquid-interactive flex items-center gap-3 px-4 py-3 rounded-2xl group min-w-0"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <Users className="w-[18px] h-[18px]" strokeWidth={1.75} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground leading-tight">
                    {pendingStaff} {pluralizeRu(pendingStaff, ["сотрудник", "сотрудника", "сотрудников"])}
                  </p>
                  <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                    Ждут одобрения
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0" />
              </Link>
            )}
          </div>
        )}

        {/* ── ГЛАВНЫЕ МЕТРИКИ (для владельца / менеджера / бухгалтера) ── */}
        {(isOwner || roleGroup === "manager" || roleGroup === "accountant") && (
          <DashboardMetrics
            revenue30={revenue30total}
            revenueToday={revenueTodayTotal}
            newOrders={newOrders}
            avgOrder={avgOrder}
          />
        )}

        {/* ── КУРЬЕР: его доставки ── */}
        {roleGroup === "courier" && (
          <CourierMetrics newOrders={newOrders} todayOrders={todayOrders} />
        )}

        {/* ── ОПЕРАЦИОННЫЙ ПУЛЬС ── */}
        <div className="grid grid-cols-1 2xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)] gap-3 sm:gap-4 min-w-0">
          <div className="admin-liquid-surface rounded-2xl p-4 sm:p-5 min-w-0">
            <div className="flex items-start sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Activity className="w-[18px] h-[18px]" strokeWidth={1.75} />
                </div>
                <div className="min-w-0">
                  <p className="font-display font-semibold text-sm text-foreground leading-tight">
                    Пульс заказов
                  </p>
                  <p className="text-[11px] text-muted-foreground leading-tight mt-0.5 truncate">
                    {liveOrderCount.toLocaleString("ru-RU")} в рабочем контуре · {totalOrders.toLocaleString("ru-RU")} всего
                  </p>
                </div>
              </div>
              <Link
                href="/admin/orders"
                className="text-xs text-primary flex items-center gap-0.5 hover:gap-1 transition-all shrink-0"
              >
                Заказы <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7 gap-2.5 min-w-0">
              {orderFlow.map((item) => {
                const pct = liveOrderCount > 0 ? Math.round((item.count / liveOrderCount) * 100) : 0;
                return (
                  <Link
                    key={item.status}
                    href={item.href}
                    className="group rounded-2xl border border-border/70 bg-background/45 p-3 min-w-0 hover:border-primary/30 hover:bg-background/65 transition-colors"
                    style={{ WebkitTapHighlightColor: "transparent" }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${item.iconTone}`}>
                        <ShoppingBag className="w-4 h-4" strokeWidth={1.75} />
                      </span>
                      <span className="text-lg font-display font-bold leading-none text-foreground tabular-nums">
                        {item.count}
                      </span>
                    </div>
                    <p className="mt-2 text-xs font-medium text-foreground leading-tight truncate">
                      {item.label}
                    </p>
                    <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full ${item.tone}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="admin-liquid-surface rounded-2xl p-4 sm:p-5 min-w-0">
            <div className="flex items-center gap-3 mb-4 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <CheckSquare className="w-[18px] h-[18px]" strokeWidth={1.75} />
              </div>
              <div className="min-w-0">
                <p className="font-display font-semibold text-sm text-foreground leading-tight">
                  Контроль готовности
                </p>
                <p className="text-[11px] text-muted-foreground leading-tight mt-0.5 truncate">
                  Короткие входы в важные зоны
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 xs:grid-cols-2 2xl:grid-cols-1 gap-2.5">
              {readinessCards.map((card) => {
                const Icon = card.icon;
                return (
                  <Link
                    key={card.href}
                    href={card.href}
                    className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background/45 p-3 min-w-0 hover:border-primary/30 hover:bg-background/65 transition-colors"
                    style={{ WebkitTapHighlightColor: "transparent" }}
                  >
                    <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${card.tone}`}>
                      <Icon className="w-[18px] h-[18px]" strokeWidth={1.75} />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-semibold text-foreground leading-tight truncate">
                        {card.label}
                      </span>
                      <span className="block text-[11px] text-muted-foreground leading-tight mt-0.5 truncate">
                        {card.helper}
                      </span>
                    </span>
                    <span className="text-base font-display font-bold text-foreground tabular-nums shrink-0">
                      {card.value}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── БЫСТРЫЕ ДЕЙСТВИЯ ── */}
        <div>
          <div className="admin-section-kicker mb-3">
            <span className="admin-section-kicker-icon">
              <Zap className="w-4 h-4" strokeWidth={1.75} />
            </span>
            <p className="font-display font-semibold text-sm text-foreground">
              Быстрый доступ
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3 min-w-0">
            {quickActions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="admin-liquid-surface admin-liquid-interactive group flex flex-col items-center justify-center gap-2.5 p-3 sm:p-4 rounded-2xl active:scale-[0.96] min-h-[88px] min-w-0"
                style={{ WebkitTapHighlightColor: "transparent" }}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 ${TONE_BG[action.tone]}`}
                >
                  <action.icon className="w-[18px] h-[18px]" strokeWidth={1.75} />
                </div>
                <span className="text-xs sm:text-[13px] font-medium text-center leading-tight text-foreground">
                  {action.label}
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* ── ГРАФИК 7 ДНЕЙ ── */}
        {(isOwner || roleGroup === "manager" || roleGroup === "accountant") && (
          <DashboardChart
            days={chartDays.map((d) => ({ label: d.label, amount: d.amount }))}
            revenue7={formatPrice(revenue7total)}
            revenue30={formatPrice(revenue30total)}
          />
        )}

        {/* ── ПОСЛЕДНИЕ ЗАКАЗЫ + ТОП ТОВАРОВ ── */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 sm:gap-4 min-w-0">
          {/* Recent orders */}
          <div className="admin-liquid-surface rounded-2xl overflow-hidden min-w-0">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <ShoppingBag className="w-[18px] h-[18px]" strokeWidth={1.75} />
                </div>
                <div className="min-w-0">
                  <p className="font-display font-semibold text-sm text-foreground leading-tight">
                    Последние заказы
                  </p>
                  <p className="text-[11px] text-muted-foreground leading-tight mt-0.5 truncate">
                    {totalOrders.toLocaleString("ru-RU")} всего · {todayOrders} сегодня
                  </p>
                </div>
              </div>
              <Link
                href="/admin/orders"
                className="text-xs text-primary flex items-center gap-0.5 hover:gap-1 transition-all shrink-0"
              >
                Все <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="divide-y divide-border">
              {recentOrders.map((order) => {
                const color = ORDER_STATUS_COLORS[order.status] || "bg-muted text-muted-foreground";
                const label = ORDER_STATUS_LABELS[order.status] || order.status;
                return (
                  <Link
                    key={order.id}
                    href={`/admin/orders/${order.id}`}
                    className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/40 active:bg-muted/60 transition-colors"
                    style={{ WebkitTapHighlightColor: "transparent" }}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">
                        №{order.orderNumber}
                        <span className="text-muted-foreground font-normal"> · {order.guestName || "Клиент"}</span>
                      </p>
                      <span
                        className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${color}`}
                      >
                        {label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <p className="text-sm font-bold text-foreground tabular-nums">
                        {formatPrice(Number(order.totalAmount))}
                      </p>
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40" />
                    </div>
                  </Link>
                );
              })}
              {recentOrders.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8 px-4">
                  Заказов ещё нет
                </p>
              )}
            </div>
          </div>

          {/* Top items (live) */}
          {(isOwner || roleGroup === "manager" || roleGroup === "seller") ? (
            <DashboardTopItems />
          ) : (
            <div />
          )}
        </div>
    </div>
  );
}

// Helper для русского склонения
function pluralizeRu(n: number, forms: [string, string, string]): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return forms[1];
  return forms[2];
}
