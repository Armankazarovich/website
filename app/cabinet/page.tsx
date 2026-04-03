export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { formatDate, formatPrice, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from "@/lib/utils";
import Link from "next/link";
import {
  ShoppingBag, ArrowRight, Package, Clock, CheckCircle, Truck,
  User, Bell, MapPin, Phone, ChevronRight, Star, Repeat2,
  ReceiptText, HeartHandshake, Calculator,
} from "lucide-react";
import { RepeatOrderButton } from "@/components/cabinet/repeat-order-button";

const STATUS_ICONS: Record<string, React.ElementType> = {
  NEW: Clock, CONFIRMED: CheckCircle, PROCESSING: Package,
  SHIPPED: Truck, IN_DELIVERY: Truck, DELIVERED: CheckCircle,
  COMPLETED: CheckCircle, CANCELLED: ShoppingBag,
};

export default async function CabinetDashboard() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [orders, user] = await Promise.all([
    prisma.order.findMany({
      where: { userId: session.user.id },
      include: { items: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true, phone: true, createdAt: true, address: true },
    }),
  ]);

  const totalSpent = orders
    .filter(o => o.status !== "CANCELLED")
    .reduce((s, o) => s + Number(o.totalAmount), 0);

  const activeOrders = orders.filter(o => !["DELIVERED", "COMPLETED", "CANCELLED"].includes(o.status));
  const completedOrders = orders.filter(o => ["DELIVERED", "COMPLETED"].includes(o.status));
  const recentOrders = orders.slice(0, 3);

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Доброе утро" : hour < 17 ? "Добрый день" : "Добрый вечер";
  const firstName = user?.name?.split(" ")[0] || "Гость";

  return (
    <div className="space-y-4 pb-4">

      {/* ── ШАПКА ── */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{greeting},</p>
          <h1 className="font-display font-bold text-xl leading-tight">{firstName}</h1>
        </div>
        <Link href="/cabinet/notifications" className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center relative">
          <Bell className="w-4 h-4 text-muted-foreground" />
        </Link>
      </div>

      {/* ── АЛЕРТ: активные заказы ── */}
      {activeOrders.length > 0 && (
        <Link href="/cabinet" className="flex items-center justify-between px-4 py-3 bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800 rounded-2xl">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse shrink-0" />
            <div>
              <p className="text-sm font-semibold text-orange-800 dark:text-orange-200">
                {activeOrders.length === 1 ? "1 заказ в работе" : `${activeOrders.length} заказа в работе`}
              </p>
              <p className="text-xs text-orange-600 dark:text-orange-400">
                {ORDER_STATUS_LABELS[activeOrders[0].status]} · #{activeOrders[0].orderNumber}
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-orange-500 shrink-0" />
        </Link>
      )}

      {/* ── СТАТИСТИКА ── */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-card border border-border rounded-2xl p-3 text-center">
          <p className="text-xl font-display font-bold text-primary">{orders.length}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Заказов</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-3 text-center">
          <p className="text-xl font-display font-bold text-emerald-600">{completedOrders.length}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Выполнено</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-3 text-center">
          <p className="text-lg font-display font-bold leading-tight">{totalSpent > 0 ? `${Math.round(totalSpent / 1000)}к` : "0"}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Потрачено ₽</p>
        </div>
      </div>

      {/* ── БЫСТРЫЕ ДЕЙСТВИЯ ── */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">Быстрый доступ</p>
        <div className="grid grid-cols-4 gap-2">
          {[
            { href: "/catalog",          label: "Каталог",    icon: Package,       color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-950/50" },
            { href: "/checkout",         label: "Заказать",   icon: ShoppingBag,   color: "text-primary",    bg: "bg-primary/8" },
            { href: "/track",            label: "Трекинг",    icon: MapPin,        color: "text-blue-600",   bg: "bg-blue-50 dark:bg-blue-950/50" },
            { href: "/calculator",       label: "Калькулятор",icon: Calculator,    color: "text-violet-600", bg: "bg-violet-50 dark:bg-violet-950/50" },
            { href: "/cabinet/profile",  label: "Профиль",    icon: User,          color: "text-slate-600",  bg: "bg-slate-50 dark:bg-slate-800/50" },
            { href: "/cabinet",          label: "Заказы",     icon: ReceiptText,   color: "text-emerald-600",bg: "bg-emerald-50 dark:bg-emerald-950/50" },
            { href: "tel:+79859707133",  label: "Позвонить",  icon: Phone,         color: "text-green-600",  bg: "bg-green-50 dark:bg-green-950/50" },
            { href: "/reviews",          label: "Отзывы",     icon: Star,          color: "text-yellow-600", bg: "bg-yellow-50 dark:bg-yellow-950/50" },
          ].map((action) => (
            <Link
              key={action.href + action.label}
              href={action.href}
              className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-border/60 p-3 min-h-[72px] active:scale-[0.95] transition-transform aray-icon-spin ${action.bg}`}
            >
              <action.icon className={`w-5 h-5 ${action.color}`} />
              <span className={`text-[10px] font-semibold text-center leading-tight ${action.color}`}>
                {action.label}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* ── ПОСЛЕДНИЕ ЗАКАЗЫ ── */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <h2 className="font-semibold text-sm">Последние заказы</h2>
          {orders.length > 3 && (
            <span className="text-xs text-muted-foreground">{orders.length} всего</span>
          )}
        </div>

        {orders.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <ShoppingBag className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm font-medium mb-1">Заказов пока нет</p>
            <p className="text-xs text-muted-foreground mb-4">Перейдите в каталог и сделайте первый заказ</p>
            <Link href="/catalog" className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-semibold">
              В каталог <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {recentOrders.map((order) => {
              const StatusIcon = STATUS_ICONS[order.status] ?? ShoppingBag;
              const color = ORDER_STATUS_COLORS[order.status] || "bg-gray-100 text-gray-800";
              return (
                <div key={order.id} className="p-4">
                  {/* Order top row */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <StatusIcon className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">#{order.orderNumber}</p>
                        <p className="text-[10px] text-muted-foreground">{formatDate(order.createdAt)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${color}`}>
                        {ORDER_STATUS_LABELS[order.status]}
                      </span>
                      <span className="font-bold text-sm text-primary">{formatPrice(Number(order.totalAmount))}</span>
                    </div>
                  </div>

                  {/* Items */}
                  <div className="space-y-1 mb-3">
                    {order.items.slice(0, 2).map((item) => (
                      <div key={item.id} className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="truncate flex-1 mr-2">{item.productName} · {item.variantSize}</span>
                        <span className="shrink-0">{Number(item.quantity)} {item.unitType === "CUBE" ? "м³" : "шт"}</span>
                      </div>
                    ))}
                    {order.items.length > 2 && (
                      <p className="text-[10px] text-muted-foreground">+{order.items.length - 2} позиций</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <RepeatOrderButton orderId={order.id} />
                    <Link
                      href={`/track?order=${order.orderNumber}`}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-border text-xs font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
                    >
                      <MapPin className="w-3.5 h-3.5" /> Отследить
                    </Link>
                  </div>
                </div>
              );
            })}

            {orders.length > 3 && (
              <div className="px-5 py-3">
                <Link href="/cabinet" className="flex items-center justify-center gap-2 text-sm text-primary font-medium py-2 rounded-xl hover:bg-primary/5 transition-colors">
                  Все заказы ({orders.length}) <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── ПРОФИЛЬ ── */}
      <Link href="/cabinet/profile" className="flex items-center justify-between bg-card border border-border rounded-2xl p-4 active:scale-[0.98] transition-transform">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <User className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold">{user?.name || "Профиль"}</p>
            <p className="text-xs text-muted-foreground">{user?.email || user?.phone || "Настройки профиля"}</p>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
      </Link>

      {/* ── БОНУСНЫЙ БЛОК: позвонить менеджеру ── */}
      <div className="bg-primary/5 border border-primary/15 rounded-2xl p-4 flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <HeartHandshake className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">Нужна помощь?</p>
          <p className="text-xs text-muted-foreground">Менеджер поможет с выбором и расчётом</p>
        </div>
        <a href="tel:+79859707133" className="shrink-0 bg-primary text-white text-xs font-bold px-3 py-2 rounded-xl">
          Позвонить
        </a>
      </div>
    </div>
  );
}
