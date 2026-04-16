export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { formatPrice, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from "@/lib/utils";
import {
  ShoppingBag, Package, Star, TrendingUp, Clock, Users, BarChart3,
  ArrowUpRight, Truck, Warehouse, Target, Mail, Bell,
  Settings, Wallet, BarChart2, CheckSquare, HeartPulse,
  UserCircle, FileDown, ChevronRight, Zap,
} from "lucide-react";
import Link from "next/link";
import { AutoRefresh } from "@/components/admin/auto-refresh";
import { AdminSectionTitle } from "@/components/admin/admin-section-title";
import { DashboardTopItems } from "@/components/admin/dashboard-top-items";
import { DashboardGreeting } from "@/components/admin/dashboard-greeting";
import { DashboardMetrics, CourierMetrics } from "@/components/admin/dashboard-metrics";
import { DashboardChart } from "@/components/admin/dashboard-chart";

// ── Быстрые действия по ролям ──────────────────────────────────────────────
// Все иконки = text-primary (следуют палитре), фон = bg-card (тёмное стекло в nature-mode)
const C = "text-primary";
const B = "bg-card";
const QUICK_ACTIONS: Record<string, { href: string; label: string; icon: React.ElementType; color: string; bg: string }[]> = {
  owner: [
    { href: "/admin/orders",       label: "Заказы",      icon: ShoppingBag, color: C, bg: B },
    { href: "/admin/clients",      label: "Клиенты",     icon: UserCircle,  color: C, bg: B },
    { href: "/admin/analytics",    label: "Аналитика",   icon: BarChart2,   color: C, bg: B },
    { href: "/admin/finance",      label: "Финансы",     icon: Wallet,      color: C, bg: B },
    { href: "/admin/products",     label: "Каталог",     icon: Package,     color: C, bg: B },
    { href: "/admin/email",        label: "Email",       icon: Mail,        color: C, bg: B },
    { href: "/admin/notifications",label: "Уведомления", icon: Bell,        color: C, bg: B },
    { href: "/admin/settings",     label: "Настройки",   icon: Settings,    color: C, bg: B },
  ],
  manager: [
    { href: "/admin/orders",    label: "Заказы",    icon: ShoppingBag, color: C, bg: B },
    { href: "/admin/clients",   label: "Клиенты",   icon: UserCircle,  color: C, bg: B },
    { href: "/admin/crm",       label: "CRM",       icon: Target,      color: C, bg: B },
    { href: "/admin/delivery",  label: "Доставка",  icon: Truck,       color: C, bg: B },
    { href: "/admin/products",  label: "Каталог",   icon: Package,     color: C, bg: B },
    { href: "/admin/reviews",   label: "Отзывы",    icon: Star,        color: C, bg: B },
    { href: "/admin/tasks",     label: "Задачи",    icon: CheckSquare, color: C, bg: B },
    { href: "/admin/inventory", label: "Склад",     icon: Warehouse,   color: C, bg: B },
  ],
  courier: [
    { href: "/admin/delivery", label: "Мои доставки", icon: Truck,       color: C, bg: B },
    { href: "/admin/orders",   label: "Заказы",       icon: ShoppingBag, color: C, bg: B },
    { href: "/admin/tasks",    label: "Задачи",       icon: CheckSquare, color: C, bg: B },
    { href: "/admin/help",     label: "Помощь",       icon: HeartPulse,  color: C, bg: B },
  ],
  accountant: [
    { href: "/admin/finance",   label: "Финансы",   icon: Wallet,      color: C, bg: B },
    { href: "/admin/orders",    label: "Заказы",    icon: ShoppingBag, color: C, bg: B },
    { href: "/admin/analytics", label: "Аналитика", icon: BarChart2,   color: C, bg: B },
    { href: "/admin/clients",   label: "Клиенты",   icon: UserCircle,  color: C, bg: B },
  ],
  warehouse: [
    { href: "/admin/inventory", label: "Склад",    icon: Warehouse,   color: C, bg: B },
    { href: "/admin/products",  label: "Каталог",  icon: Package,     color: C, bg: B },
    { href: "/admin/import",    label: "Импорт",   icon: FileDown,    color: C, bg: B },
    { href: "/admin/orders",    label: "Заказы",   icon: ShoppingBag, color: C, bg: B },
  ],
  seller: [
    { href: "/admin/products",  label: "Каталог",  icon: Package,     color: C, bg: B },
    { href: "/admin/orders",    label: "Заказы",   icon: ShoppingBag, color: C, bg: B },
    { href: "/admin/clients",   label: "Клиенты",  icon: UserCircle,  color: C, bg: B },
    { href: "/admin/reviews",   label: "Отзывы",   icon: Star,        color: C, bg: B },
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

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200",
  ADMIN: "bg-primary/10 text-primary",
  MANAGER: "bg-primary/10 text-primary",
  COURIER: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  ACCOUNTANT: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  WAREHOUSE: "bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200",
  SELLER: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
};

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
  const userName = session?.user?.name || "Добро пожаловать";
  const roleGroup = getRoleGroup(role);
  const isOwner = roleGroup === "owner";
  const quickActions = QUICK_ACTIONS[roleGroup] || QUICK_ACTIONS.manager;

  const now = new Date();
  const today = new Date(now); today.setHours(0, 0, 0, 0);
  const days7ago = new Date(now); days7ago.setDate(now.getDate() - 6); days7ago.setHours(0, 0, 0, 0);
  const days30ago = new Date(now); days30ago.setDate(now.getDate() - 29); days30ago.setHours(0, 0, 0, 0);

  const [
    totalOrders, newOrders, todayOrders, totalProducts,
    pendingReviews, recentOrders, revenue30, revenue7, revenueToday,
    allOrdersForChart, topItems, statusCounts, pendingStaff,
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
    prisma.orderItem.groupBy({ by: ["productName"], _sum: { price: true }, _count: { _all: true } }),
    prisma.order.groupBy({ by: ["status"], where: { deletedAt: null }, _count: { _all: true } }),
    prisma.user.count({ where: { staffStatus: "PENDING" } }).catch(() => 0),
  ]);

  // Chart data
  const chartDays: { label: string; amount: number; date: Date }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0);
    chartDays.push({ label: d.toLocaleDateString("ru-RU", { weekday: "short" }), amount: 0, date: d });
  }
  for (const o of allOrdersForChart) {
    const d = new Date(o.createdAt); d.setHours(0, 0, 0, 0);
    const slot = chartDays.find(c => c.date.getTime() === d.getTime());
    if (slot) slot.amount += Number(o.totalAmount) + Number(o.deliveryCost || 0);
  }

  const orders30count = await prisma.order.count({ where: { status: { not: "CANCELLED" }, createdAt: { gte: days30ago }, deletedAt: null } });
  const revenue30total = Number(revenue30._sum.totalAmount || 0) + Number(revenue30._sum.deliveryCost || 0);
  const revenue7total = Number(revenue7._sum.totalAmount || 0) + Number(revenue7._sum.deliveryCost || 0);
  const revenueTodayTotal = Number(revenueToday._sum.totalAmount || 0) + Number(revenueToday._sum.deliveryCost || 0);
  const avgOrder = orders30count > 0 ? revenue30total / orders30count : 0;

  return (
    <div className="space-y-4 pb-6">
      <AutoRefresh intervalMs={60000} />

      {/* ── ПРИВЕТСТВИЕ ── */}
      <DashboardGreeting
        userName={userName}
        roleLabel={ROLE_GREETINGS[role] || role}
        roleColor={ROLE_COLORS[role] || "bg-primary/10 text-primary"}
      />

      {/* ── АЛЕРТЫ ── */}
      {(newOrders > 0 || pendingReviews > 0 || pendingStaff > 0) && (
        <div className="flex flex-col gap-2">
          {newOrders > 0 && (
            <Link href="/admin/orders?status=NEW" className="flex items-center justify-between px-4 py-3 bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800 rounded-2xl hover:border-orange-400 transition-colors">
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                <span className="text-sm font-semibold text-orange-800 dark:text-orange-200">{newOrders} новых заказов</span>
              </div>
              <ChevronRight className="w-4 h-4 text-orange-500" />
            </Link>
          )}
          {pendingReviews > 0 && isOwner && (
            <Link href="/admin/reviews" className="flex items-center justify-between px-4 py-3 bg-yellow-50 dark:bg-yellow-950/40 border border-yellow-200 dark:border-yellow-800 rounded-2xl hover:border-yellow-400 transition-colors">
              <div className="flex items-center gap-2.5">
                <Star className="w-4 h-4 text-yellow-600" />
                <span className="text-sm font-semibold text-yellow-800 dark:text-yellow-200">{pendingReviews} отзывов ждут модерации</span>
              </div>
              <ChevronRight className="w-4 h-4 text-yellow-500" />
            </Link>
          )}
          {pendingStaff > 0 && isOwner && (
            <Link href="/admin/staff" className="flex items-center justify-between px-4 py-3 bg-primary/10 dark:bg-primary/15 border border-primary/30 rounded-2xl hover:border-primary/50 transition-colors">
              <div className="flex items-center gap-2.5">
                <Users className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">{pendingStaff} сотрудников ждут одобрения</span>
              </div>
              <ChevronRight className="w-4 h-4 text-primary" />
            </Link>
          )}
        </div>
      )}

      {/* ── ГЛАВНЫЕ МЕТРИКИ (владелец/менеджер/бухгалтер) ── */}
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

      {/* ── БЫСТРЫЕ ДЕЙСТВИЯ ── */}
      <div>
        <AdminSectionTitle icon={Zap} title="Быстрый доступ" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {quickActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className={`group flex flex-col items-center justify-center gap-2 rounded-2xl border border-primary/20 p-2.5 min-h-[76px] active:scale-[0.93] transition-all duration-200 aray-icon-spin hover:border-primary/55 hover:bg-primary/[0.10] hover:scale-[1.03] hover:shadow-[0_0_18px_hsl(var(--primary)/0.22)] ${action.bg}`}
              style={{ WebkitTapHighlightColor: "transparent" }}
            >
              <action.icon className={`w-6 h-6 ${action.color} transition-all duration-200 group-hover:scale-110`} />
              <span className={`text-[10px] font-semibold text-center leading-tight ${action.color}`}>
                {action.label}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* ── ГРАФИК 7 ДНЕЙ ── */}
      {(isOwner || roleGroup === "manager" || roleGroup === "accountant") && (
        <DashboardChart
          days={chartDays.map(d => ({ label: d.label, amount: d.amount }))}
          revenue7={formatPrice(revenue7total)}
          revenue30={formatPrice(revenue30total)}
        />
      )}

      {/* ── ПОСЛЕДНИЕ ЗАКАЗЫ ── */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <AdminSectionTitle icon={ShoppingBag} title="Последние заказы" className="mb-0" />
          <Link href="/admin/orders" className="text-xs text-primary flex items-center gap-0.5 hover:gap-1 transition-all">Все <ChevronRight className="w-3 h-3" /></Link>
        </div>
        <div className="divide-y divide-border">
          {recentOrders.map((order) => {
            const color = ORDER_STATUS_COLORS[order.status] || "bg-muted text-muted-foreground";
            const label = ORDER_STATUS_LABELS[order.status] || order.status;
            return (
              <Link key={order.id} href={`/admin/orders/${order.id}`} className="flex items-center justify-between px-4 py-3.5 hover:bg-primary/[0.05] active:bg-primary/10 transition-colors" style={{ WebkitTapHighlightColor: "transparent" }}>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">#{order.orderNumber} · {order.guestName || "Клиент"}</p>
                  <span className={`inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium ${color}`}>{label}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <p className="text-sm font-bold">{formatPrice(Number(order.totalAmount))}</p>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50" />
                </div>
              </Link>
            );
          })}
          {recentOrders.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">Заказов ещё нет</p>}
        </div>
      </div>

      {/* ── ТОП ТОВАРОВ — live обновление каждые 30с ── */}
      {(isOwner || roleGroup === "manager" || roleGroup === "seller") && (
        <DashboardTopItems />
      )}

    </div>
  );
}
