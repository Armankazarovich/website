export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { formatDate, formatPrice, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from "@/lib/utils";
import { getSiteSettings, getSetting } from "@/lib/site-settings";
import Link from "next/link";
import {
  ShoppingBag,
  ArrowRight,
  Clock,
  Heart,
  Star,
  User,
  ChevronRight,
  Phone,
  HeadphonesIcon,
  Package,
} from "lucide-react";
import type { OrderStatus } from "@prisma/client";

const ACTIVE_STATUSES: OrderStatus[] = ["NEW", "CONFIRMED", "PROCESSING", "SHIPPED", "IN_DELIVERY", "READY_PICKUP"];
const DONE_STATUSES: OrderStatus[] = ["DELIVERED", "COMPLETED"];

export default async function CabinetDashboard() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const settings = await getSiteSettings();
  const phoneLink = getSetting(settings, "phone_link") || "+79850670888";

  const [recentOrders, totalAll, countDone, countActive, firstActive, revenueAgg, user, subsCount] =
    await Promise.all([
      prisma.order.findMany({
        where: { userId: session.user.id, deletedAt: null },
        include: { items: true },
        orderBy: { createdAt: "desc" },
        take: 3,
      }),
      prisma.order.count({ where: { userId: session.user.id, deletedAt: null } }),
      prisma.order.count({
        where: { userId: session.user.id, deletedAt: null, status: { in: DONE_STATUSES } },
      }),
      prisma.order.count({
        where: { userId: session.user.id, deletedAt: null, status: { in: ACTIVE_STATUSES } },
      }),
      prisma.order.findFirst({
        where: { userId: session.user.id, deletedAt: null, status: { in: ACTIVE_STATUSES } },
        orderBy: { createdAt: "desc" },
        select: { orderNumber: true, status: true, id: true },
      }),
      prisma.order.aggregate({
        where: { userId: session.user.id, deletedAt: null, status: { not: "CANCELLED" } },
        _sum: { totalAmount: true },
      }),
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: { name: true, email: true, phone: true, createdAt: true, address: true, avatarUrl: true },
      }),
      prisma.subscription.count({ where: { userId: session.user.id } }).catch(() => 0),
    ]);

  const totalSpent = Number(revenueAgg._sum.totalAmount ?? 0);
  const firstName = user?.name?.split(" ")[0] || "Гость";
  const initials = firstName.slice(0, 1).toUpperCase();

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Доброе утро" : hour < 17 ? "Добрый день" : "Добрый вечер";

  // ── Карточки разделов (4 ключевых) ──
  const sections: Array<{
    href: string;
    icon: React.ElementType;
    label: string;
    desc: string;
    badge?: number | string;
  }> = [
    {
      href: "/cabinet/orders",
      icon: ShoppingBag,
      label: "Мои заказы",
      desc: countActive > 0 ? `${countActive} в работе · ${countDone} готово` : `${countDone} выполнено · ${totalAll} всего`,
      badge: countActive > 0 ? countActive : undefined,
    },
    {
      href: "/cabinet/subscriptions",
      icon: Heart,
      label: "Подписки",
      desc: subsCount > 0 ? `${subsCount} категорий` : "Узнавайте о новинках первыми",
      badge: subsCount > 0 ? subsCount : undefined,
    },
    {
      href: "/cabinet/reviews",
      icon: Star,
      label: "Мои отзывы",
      desc: "История ваших оценок",
    },
    {
      href: "/cabinet/profile",
      icon: User,
      label: "Профиль",
      desc: user?.email || "Имя, телефон, адрес",
    },
  ];

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* ── HERO — приветствие ── */}
      <div className="bg-card border border-border rounded-2xl p-5 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center shrink-0">
          {user?.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-primary font-display font-bold text-xl">{initials}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground">{greeting},</p>
          <h1 className="font-display font-bold text-xl leading-tight truncate">{firstName}</h1>
          {totalAll > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              <span className="text-foreground font-medium">{totalAll}</span>{" "}
              {totalAll === 1 ? "заказ" : totalAll < 5 ? "заказа" : "заказов"}
              {totalSpent > 0 && (
                <>
                  {" · "}
                  <span className="text-foreground font-medium">{formatPrice(totalSpent)}</span>
                </>
              )}
            </p>
          )}
        </div>
      </div>

      {/* ── АЛЕРТ: активный заказ ── */}
      {countActive > 0 && firstActive && (
        <Link
          href={`/cabinet/orders/${firstActive.id}`}
          className="block bg-card border border-border rounded-2xl p-4 hover:border-primary/40 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">
                {countActive === 1 ? "Заказ в работе" : `${countActive} заказа в работе`}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                #{firstActive.orderNumber} · {ORDER_STATUS_LABELS[firstActive.status]}
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
          </div>
        </Link>
      )}

      {/* ── РАЗДЕЛЫ КАБИНЕТА ── */}
      <div className="space-y-2">
        {sections.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="flex items-center gap-3 bg-card border border-border rounded-2xl p-4 hover:border-primary/40 transition-colors"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <s.icon className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{s.label}</p>
              <p className="text-xs text-muted-foreground truncate">{s.desc}</p>
            </div>
            {s.badge !== undefined && (
              <span className="bg-primary text-primary-foreground text-xs font-semibold rounded-full min-w-[22px] h-[22px] inline-flex items-center justify-center px-2">
                {s.badge}
              </span>
            )}
            <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
          </Link>
        ))}
      </div>

      {/* ── ПОСЛЕДНИЕ ЗАКАЗЫ — превью ── */}
      {recentOrders.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2 px-1">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Последние заказы</h2>
            {totalAll > 3 && (
              <Link href="/cabinet/orders" className="text-xs text-primary hover:underline">
                Все →
              </Link>
            )}
          </div>
          <div className="bg-card border border-border rounded-2xl divide-y divide-border overflow-hidden">
            {recentOrders.map((order) => {
              const color = ORDER_STATUS_COLORS[order.status] || "bg-muted text-muted-foreground";
              return (
                <Link
                  key={order.id}
                  href={`/cabinet/orders/${order.id}`}
                  className="flex items-center gap-3 p-4 hover:bg-muted/40 transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                    <Package className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-medium">#{order.orderNumber}</p>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${color}`}>
                        {ORDER_STATUS_LABELS[order.status]}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {formatDate(order.createdAt)} · {order.items.length}{" "}
                      {order.items.length === 1 ? "позиция" : "позиций"}
                    </p>
                  </div>
                  <p className="text-sm font-semibold shrink-0">
                    {formatPrice(
                      Number(order.totalAmount) +
                        Number((order as { deliveryCost?: unknown }).deliveryCost ?? 0)
                    )}
                  </p>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* ── EMPTY STATE — никаких заказов ── */}
      {recentOrders.length === 0 && (
        <div className="bg-card border border-border rounded-2xl p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <ShoppingBag className="w-7 h-7 text-primary" />
          </div>
          <p className="text-sm font-medium mb-1">У вас пока нет заказов</p>
          <p className="text-xs text-muted-foreground mb-5">Перейдите в каталог и сделайте первый заказ</p>
          <Link
            href="/catalog"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 h-11 rounded-xl text-sm font-semibold hover:brightness-110 transition-all"
          >
            В каталог <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* ── ПОДДЕРЖКА — всегда полезно ── */}
      <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
          <HeadphonesIcon className="w-5 h-5 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">Нужна помощь?</p>
          <p className="text-xs text-muted-foreground">Менеджер ответит на любой вопрос</p>
        </div>
        <a
          href={`tel:${phoneLink}`}
          className="shrink-0 bg-primary text-primary-foreground text-xs font-semibold px-3 h-10 inline-flex items-center gap-1.5 rounded-xl"
        >
          <Phone className="w-3.5 h-3.5" /> Позвонить
        </a>
      </div>
    </div>
  );
}
