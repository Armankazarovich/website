export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { formatPrice, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from "@/lib/utils";
import {
  ShoppingBag, Package, Star, TrendingUp, Clock, Users, BarChart3,
  ArrowUpRight, Shield, Truck, Warehouse, Target, Mail, Bell,
  Settings, Wallet, BarChart2, Globe, HeartPulse, CheckSquare,
  Megaphone, UserCircle, FileDown, ChevronRight, Zap,
} from "lucide-react";
import Link from "next/link";
import { AutoRefresh } from "@/components/admin/auto-refresh";
import { AdminDashboardWidgets } from "@/components/admin/admin-dashboard-widgets";
import { AdminSectionTitle } from "@/components/admin/admin-section-title";
import { DashboardTopItems } from "@/components/admin/dashboard-top-items";

// ── Быстрые действия по ролям ──────────────────────────────────────────────
const QUICK_ACTIONS: Record<string, { href: string; label: string; icon: React.ElementType; color: string; bg: string }[]> = {
  owner: [
    { href: "/admin/orders",       label: "Заказы",        icon: ShoppingBag, color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50 dark:bg-white/[0.04]" },
    { href: "/admin/clients",      label: "Клиенты",       icon: UserCircle,  color: "text-blue-600 dark:text-blue-400",   bg: "bg-blue-50 dark:bg-white/[0.04]" },
    { href: "/admin/analytics",    label: "Аналитика",     icon: BarChart2,   color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-50 dark:bg-white/[0.04]" },
    { href: "/admin/finance",      label: "Финансы",       icon: Wallet,      color: "text-emerald-600 dark:text-emerald-400",bg: "bg-emerald-50 dark:bg-white/[0.04]" },
    { href: "/admin/products",     label: "Каталог",       icon: Package,     color: "text-amber-600 dark:text-amber-400",  bg: "bg-amber-50 dark:bg-white/[0.04]" },
    { href: "/admin/email",        label: "Email",         icon: Mail,        color: "text-red-600 dark:text-red-400",    bg: "bg-red-50 dark:bg-white/[0.04]" },
    { href: "/admin/notifications",label: "Уведомления",   icon: Bell,        color: "text-cyan-600 dark:text-cyan-400",   bg: "bg-cyan-50 dark:bg-white/[0.04]" },
    { href: "/admin/settings",     label: "Настройки",     icon: Settings,    color: "text-slate-600 dark:text-slate-300",  bg: "bg-slate-50 dark:bg-white/[0.04]" },
  ],
  manager: [
    { href: "/admin/orders",    label: "Заказы",    icon: ShoppingBag, color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50 dark:bg-white/[0.04]" },
    { href: "/admin/clients",   label: "Клиенты",   icon: UserCircle,  color: "text-blue-600 dark:text-blue-400",   bg: "bg-blue-50 dark:bg-white/[0.04]" },
    { href: "/admin/crm",       label: "CRM",       icon: Target,      color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-50 dark:bg-white/[0.04]" },
    { href: "/admin/delivery",  label: "Доставка",  icon: Truck,       color: "text-green-600 dark:text-green-400",  bg: "bg-green-50 dark:bg-white/[0.04]" },
    { href: "/admin/products",  label: "Каталог",   icon: Package,     color: "text-amber-600 dark:text-amber-400",  bg: "bg-amber-50 dark:bg-white/[0.04]" },
    { href: "/admin/reviews",   label: "Отзывы",    icon: Star,        color: "text-yellow-600 dark:text-yellow-400", bg: "bg-yellow-50 dark:bg-white/[0.04]" },
    { href: "/admin/tasks",     label: "Задачи",    icon: CheckSquare, color: "text-teal-600 dark:text-teal-400",   bg: "bg-teal-50 dark:bg-white/[0.04]" },
    { href: "/admin/inventory", label: "Склад",     icon: Warehouse,   color: "text-slate-600 dark:text-slate-300",  bg: "bg-slate-50 dark:bg-white/[0.04]" },
  ],
  courier: [
    { href: "/admin/delivery", label: "Мои доставки", icon: Truck,       color: "text-green-600 dark:text-green-400",  bg: "bg-green-50 dark:bg-white/[0.04]" },
    { href: "/admin/orders",   label: "Заказы",       icon: ShoppingBag, color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50 dark:bg-white/[0.04]" },
    { href: "/admin/tasks",    label: "Задачи",       icon: CheckSquare, color: "text-teal-600 dark:text-teal-400",   bg: "bg-teal-50 dark:bg-white/[0.04]" },
    { href: "/admin/help",     label: "Помощь",       icon: HeartPulse,  color: "text-red-600 dark:text-red-400",    bg: "bg-red-50 dark:bg-white/[0.04]" },
  ],
  accountant: [
    { href: "/admin/finance",   label: "Финансы",   icon: Wallet,      color: "text-emerald-600 dark:text-emerald-400",bg: "bg-emerald-50 dark:bg-white/[0.04]" },
    { href: "/admin/orders",    label: "Заказы",    icon: ShoppingBag, color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50 dark:bg-white/[0.04]" },
    { href: "/admin/analytics", label: "Аналитика", icon: BarChart2,   color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-50 dark:bg-white/[0.04]" },
    { href: "/admin/clients",   label: "Клиенты",   icon: UserCircle,  color: "text-blue-600 dark:text-blue-400",   bg: "bg-blue-50 dark:bg-white/[0.04]" },
  ],
  warehouse: [
    { href: "/admin/inventory", label: "Склад",    icon: Warehouse,   color: "text-slate-600 dark:text-slate-300",  bg: "bg-slate-50 dark:bg-white/[0.04]" },
    { href: "/admin/products",  label: "Каталог",  icon: Package,     color: "text-amber-600 dark:text-amber-400",  bg: "bg-amber-50 dark:bg-white/[0.04]" },
    { href: "/admin/import",    label: "Импорт",   icon: FileDown,    color: "text-cyan-600 dark:text-cyan-400",   bg: "bg-cyan-50 dark:bg-white/[0.04]" },
    { href: "/admin/orders",    label: "Заказы",   icon: ShoppingBag, color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50 dark:bg-white/[0.04]" },
  ],
  seller: [
    { href: "/admin/products",  label: "Каталог",  icon: Package,     color: "text-amber-600 dark:text-amber-400",  bg: "bg-amber-50 dark:bg-white/[0.04]" },
    { href: "/admin/orders",    label: "Заказы",   icon: ShoppingBag, color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50 dark:bg-white/[0.04]" },
    { href: "/admin/clients",   label: "Клиенты",  icon: UserCircle,  color: "text-blue-600 dark:text-blue-400",   bg: "bg-blue-50 dark:bg-white/[0.04]" },
    { href: "/admin/reviews",   label: "Отзывы",   icon: Star,        color: "text-yellow-600 dark:text-yellow-400", bg: "bg-yellow-50 dark:bg-white/[0.04]" },
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
  MANAGER: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
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
    prisma.order.aggregate({ _sum: { totalAmount: true }, where: { status: { not: "CANCELLED" }, createdAt: { gte: days30ago }, deletedAt: null } }),
    prisma.order.aggregate({ _sum: { totalAmount: true }, where: { status: { not: "CANCELLED" }, createdAt: { gte: days7ago }, deletedAt: null } }),
    prisma.order.aggregate({ _sum: { totalAmount: true }, where: { status: { not: "CANCELLED" }, createdAt: { gte: today }, deletedAt: null } }),
    prisma.order.findMany({ where: { createdAt: { gte: days7ago }, status: { not: "CANCELLED" }, deletedAt: null }, select: { createdAt: true, totalAmount: true }, orderBy: { createdAt: "asc" } }),
    prisma.orderItem.groupBy({ by: ["productName"], _sum: { price: true }, _count: { _all: true } }),
    prisma.order.groupBy({ by: ["status"], where: { deletedAt: null }, _count: { _all: true } }),
    prisma.user.count({ where: { staffStatus: "PENDING" } }).catch(() => 0),
  ]);

  // Chart
  const chartDays: { label: string; amount: number; date: Date }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0);
    chartDays.push({ label: d.toLocaleDateString("ru-RU", { weekday: "short" }), amount: 0, date: d });
  }
  for (const o of allOrdersForChart) {
    const d = new Date(o.createdAt); d.setHours(0, 0, 0, 0);
    const slot = chartDays.find(c => c.date.getTime() === d.getTime());
    if (slot) slot.amount += Number(o.totalAmount);
  }
  const maxAmount = Math.max(...chartDays.map(d => d.amount), 1);

  const topItemsSorted = [...topItems].sort((a, b) => Number(b._sum.price || 0) - Number(a._sum.price || 0)).slice(0, 5);
  const statusMap: Record<string, number> = {};
  for (const s of statusCounts) statusMap[s.status] = s._count._all;

  const orders30count = await prisma.order.count({ where: { status: { not: "CANCELLED" }, createdAt: { gte: days30ago }, deletedAt: null } });
  const revenue30total = Number(revenue30._sum.totalAmount || 0);
  const revenue7total = Number(revenue7._sum.totalAmount || 0);
  const revenueTodayTotal = Number(revenueToday._sum.totalAmount || 0);
  const avgOrder = orders30count > 0 ? revenue30total / orders30count : 0;

  const greetingHour = now.getHours();
  const greeting = greetingHour < 12 ? "Доброе утро" : greetingHour < 17 ? "Добрый день" : "Добрый вечер";

  return (
    <div className="space-y-4 pb-6">
      <AutoRefresh intervalMs={60000} />

      {/* ── ШАПКА ── */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{greeting},</p>
          <h1 className="font-display font-bold text-xl leading-tight">{userName.split(" ")[0]}</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${ROLE_COLORS[role] || "bg-muted text-muted-foreground"}`}>
            {ROLE_GREETINGS[role] || role}
          </span>
          <p className="text-xs text-muted-foreground hidden sm:block">
            {now.toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}
          </p>
        </div>
      </div>

      {/* ── ЧАСЫ + КАЛЕНДАРЬ + АФОРИЗМ ── */}
      <AdminDashboardWidgets />

      {/* ── АЛЕРТЫ ── */}
      {(newOrders > 0 || pendingReviews > 0 || pendingStaff > 0) && (
        <div className="flex flex-col gap-2">
          {newOrders > 0 && (
            <Link href="/admin/orders?status=NEW" className="flex items-center justify-between px-4 py-3 bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800 rounded-2xl">
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                <span className="text-sm font-semibold text-orange-800 dark:text-orange-200">{newOrders} новых заказов</span>
              </div>
              <ChevronRight className="w-4 h-4 text-orange-500" />
            </Link>
          )}
          {pendingReviews > 0 && isOwner && (
            <Link href="/admin/reviews" className="flex items-center justify-between px-4 py-3 bg-yellow-50 dark:bg-yellow-950/40 border border-yellow-200 dark:border-yellow-800 rounded-2xl">
              <div className="flex items-center gap-2.5">
                <Star className="w-4 h-4 text-yellow-600" />
                <span className="text-sm font-semibold text-yellow-800 dark:text-yellow-200">{pendingReviews} отзывов ждут модерации</span>
              </div>
              <ChevronRight className="w-4 h-4 text-yellow-500" />
            </Link>
          )}
          {pendingStaff > 0 && isOwner && (
            <Link href="/admin/staff" className="flex items-center justify-between px-4 py-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-2xl">
              <div className="flex items-center gap-2.5">
                <Users className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-semibold text-blue-800 dark:text-blue-200">{pendingStaff} сотрудников ждут одобрения</span>
              </div>
              <ChevronRight className="w-4 h-4 text-blue-500" />
            </Link>
          )}
        </div>
      )}

      {/* ── ГЛАВНЫЕ МЕТРИКИ (владелец/менеджер) ── */}
      {(isOwner || roleGroup === "manager" || roleGroup === "accountant") && (
        <div className="grid grid-cols-2 gap-3">
          <Link href="/admin/finance" className="bg-card rounded-2xl border border-border p-4 active:scale-[0.97] transition-all group relative overflow-hidden hover:border-primary/25">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3 transition-transform group-hover:scale-110" style={{ background: "hsl(var(--primary)/0.12)" }}>
              <TrendingUp className="w-[18px] h-[18px] text-primary" />
            </div>
            <p className="text-2xl font-display font-bold leading-tight">{formatPrice(revenue30total)}</p>
            <p className="text-xs text-muted-foreground mt-1">Выручка за 30 дн.</p>
          </Link>

          <Link href="/admin/analytics" className="bg-card rounded-2xl border border-border p-4 active:scale-[0.97] transition-all group relative overflow-hidden hover:border-primary/25">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3 transition-transform group-hover:scale-110" style={{ background: "hsl(var(--primary)/0.12)" }}>
              <BarChart3 className="w-[18px] h-[18px] text-primary" />
            </div>
            <p className="text-2xl font-display font-bold leading-tight">{formatPrice(revenueTodayTotal)}</p>
            <p className="text-xs text-muted-foreground mt-1">Сегодня</p>
          </Link>

          <Link href="/admin/orders" className="bg-card rounded-2xl border border-border p-4 active:scale-[0.97] transition-all group relative overflow-hidden hover:border-primary/25">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3 transition-transform group-hover:scale-110" style={{ background: "hsl(var(--primary)/0.12)" }}>
              <Clock className="w-[18px] h-[18px] text-primary" />
            </div>
            <p className="text-2xl font-display font-bold leading-tight">{newOrders}</p>
            <p className="text-xs text-muted-foreground mt-1">Новых заказов</p>
          </Link>

          <Link href="/admin/analytics" className="bg-card rounded-2xl border border-border p-4 active:scale-[0.97] transition-all group relative overflow-hidden hover:border-primary/25">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3 transition-transform group-hover:scale-110" style={{ background: "hsl(var(--primary)/0.12)" }}>
              <ArrowUpRight className="w-[18px] h-[18px] text-primary" />
            </div>
            <p className="text-2xl font-display font-bold leading-tight">{formatPrice(avgOrder)}</p>
            <p className="text-xs text-muted-foreground mt-1">Средний чек</p>
          </Link>
        </div>
      )}

      {/* ── КУРЬЕР: его доставки ── */}
      {roleGroup === "courier" && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card rounded-2xl border border-border p-4">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: "hsl(var(--primary)/0.12)" }}>
              <Clock className="w-[18px] h-[18px] text-primary" />
            </div>
            <p className="text-2xl font-display font-bold leading-tight">{newOrders}</p>
            <p className="text-xs text-muted-foreground mt-1">Новых заказов</p>
          </div>
          <div className="bg-card rounded-2xl border border-border p-4">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: "hsl(var(--primary)/0.12)" }}>
              <Truck className="w-[18px] h-[18px] text-primary" />
            </div>
            <p className="text-2xl font-display font-bold leading-tight">{todayOrders}</p>
            <p className="text-xs text-muted-foreground mt-1">Заказов сегодня</p>
          </div>
        </div>
      )}

      {/* ── БЫСТРЫЕ ДЕЙСТВИЯ ── */}
      <div>
        <AdminSectionTitle icon={Zap} title="Быстрый доступ" />
        <div className="grid grid-cols-4 gap-2">
          {quickActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-border/60 p-3 min-h-[72px] active:scale-[0.95] transition-all aray-icon-spin hover:border-border hover:scale-[1.03] ${action.bg}`}
            >
              <action.icon className={`w-5 h-5 ${action.color}`} />
              <span className={`text-[10px] font-semibold text-center leading-tight ${action.color}`}>
                {action.label}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* ── ВТОРИЧНЫЕ МЕТРИКИ ── */}
      {isOwner && (
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "Всего", value: totalOrders, href: "/admin/orders", icon: ShoppingBag },
            { label: "Сегодня", value: todayOrders, href: "/admin/orders", icon: Users },
            { label: "Товаров", value: totalProducts, href: "/admin/products", icon: Package },
            { label: "7 дней", value: formatPrice(revenue7total), href: "/admin/analytics", icon: TrendingUp },
          ].map((s) => (
            <Link key={s.label} href={s.href} className="bg-card rounded-2xl border border-border p-3 text-center active:scale-[0.97] transition-all hover:border-primary/25 group">
              <s.icon className="w-3.5 h-3.5 text-primary/50 mx-auto mb-1.5 transition-transform group-hover:scale-110" />
              <p className="text-[15px] font-bold leading-tight">{s.value}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
            </Link>
          ))}
        </div>
      )}

      {/* ── ГРАФИК 7 ДНЕЙ ── */}
      {(isOwner || roleGroup === "manager" || roleGroup === "accountant") && (
        <Link href="/admin/analytics" className="block bg-card rounded-2xl border border-border p-5 active:scale-[0.99] transition-transform">
          <div className="flex items-center justify-between mb-4">
            <AdminSectionTitle icon={BarChart3} title="Выручка — 7 дней" className="mb-0" />
            <span className="text-xs text-primary flex items-center gap-1">Аналитика <ChevronRight className="w-3 h-3" /></span>
          </div>
          <div className="flex items-end gap-1.5 h-24">
            {chartDays.map((d) => {
              const pct = Math.max((d.amount / maxAmount) * 100, d.amount > 0 ? 5 : 0);
              return (
                <div key={d.label} className="flex-1 flex flex-col items-center gap-1">
                  <div className="relative flex-1 w-full flex items-end">
                    <div
                      className="w-full bg-primary/25 hover:bg-primary/50 rounded-t-lg transition-colors"
                      style={{ height: `${pct}%`, minHeight: d.amount > 0 ? "4px" : "0" }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground">{d.label}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-3 pt-3 border-t border-border flex justify-between text-xs text-muted-foreground">
            <span>7 дн: <strong className="text-foreground">{formatPrice(revenue7total)}</strong></span>
            <span>30 дн: <strong className="text-foreground">{formatPrice(revenue30total)}</strong></span>
          </div>
        </Link>
      )}

      {/* ── ПОСЛЕДНИЕ ЗАКАЗЫ ── */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <AdminSectionTitle icon={ShoppingBag} title="Последние заказы" className="mb-0" />
          <Link href="/admin/orders" className="text-xs text-primary flex items-center gap-0.5">Все <ChevronRight className="w-3 h-3" /></Link>
        </div>
        <div className="divide-y divide-border">
          {recentOrders.map((order) => {
            const color = ORDER_STATUS_COLORS[order.status] || "bg-gray-100 text-gray-800";
            const label = ORDER_STATUS_LABELS[order.status] || order.status;
            return (
              <Link key={order.id} href={`/admin/orders/${order.id}`} className="flex items-center justify-between px-5 py-3.5 hover:bg-muted/30 active:bg-muted/50 transition-colors">
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

      {/* ── СИСТЕМНЫЕ ССЫЛКИ (только владелец) ── */}
      {isOwner && (
        <div className="grid grid-cols-2 gap-2">
          <Link href="/admin/health" className="flex items-center gap-3 aray-nature-card rounded-2xl p-3.5 active:scale-[0.97] transition-transform">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Shield className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold leading-tight">Здоровье</p>
              <p className="text-[10px] text-muted-foreground">системы</p>
            </div>
          </Link>
          <Link href="/admin/staff" className="flex items-center gap-3 aray-nature-card rounded-2xl p-3.5 active:scale-[0.97] transition-transform">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
              <Users className="w-4 h-4 text-blue-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold leading-tight">Команда</p>
              <p className="text-[10px] text-muted-foreground">{pendingStaff > 0 ? `${pendingStaff} ждут` : "сотрудники"}</p>
            </div>
          </Link>
          <Link href="/admin/site" className="flex items-center gap-3 aray-nature-card rounded-2xl p-3.5 active:scale-[0.97] transition-transform">
            <div className="w-8 h-8 rounded-xl bg-slate-500/10 flex items-center justify-center shrink-0">
              <Globe className="w-4 h-4 text-slate-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold leading-tight">Сайт</p>
              <p className="text-[10px] text-muted-foreground">настройки</p>
            </div>
          </Link>
          <Link href="/admin/appearance" className="flex items-center gap-3 aray-nature-card rounded-2xl p-3.5 active:scale-[0.97] transition-transform">
            <div className="w-8 h-8 rounded-xl bg-violet-500/10 flex items-center justify-center shrink-0">
              <Zap className="w-4 h-4 text-violet-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold leading-tight">Оформление</p>
              <p className="text-[10px] text-muted-foreground">стили, цвета</p>
            </div>
          </Link>
        </div>
      )}
    </div>
  );
}
