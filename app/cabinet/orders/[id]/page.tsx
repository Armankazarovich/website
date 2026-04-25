export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { formatDate, formatPrice, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from "@/lib/utils";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Package,
  Truck,
  MapPin,
  FileDown,
  Phone,
  Mail,
  User,
  CreditCard,
  MessageSquare,
} from "lucide-react";
import { RepeatOrderButton } from "@/components/cabinet/repeat-order-button";
import { CancelOrderButton } from "@/components/cabinet/cancel-order-button";
import { getSiteSettings, getSetting } from "@/lib/site-settings";

// Шаги stepper'а — общий путь заказа
const STATUS_STEPS = [
  { key: "NEW", label: "Принят", icon: Clock },
  { key: "CONFIRMED", label: "Подтверждён", icon: CheckCircle2 },
  { key: "PROCESSING", label: "В обработке", icon: Package },
  { key: "IN_DELIVERY", label: "Доставляется", icon: Truck },
  { key: "DELIVERED", label: "Доставлен", icon: CheckCircle2 },
];

// Индекс статуса в stepper (для cross-status типа SHIPPED/READY_PICKUP/COMPLETED)
const STATUS_INDEX: Record<string, number> = {
  NEW: 0,
  CONFIRMED: 1,
  PROCESSING: 2,
  SHIPPED: 3,
  IN_DELIVERY: 3,
  READY_PICKUP: 3,
  DELIVERED: 4,
  COMPLETED: 4,
  CANCELLED: -1,
};

const CANCELLABLE = ["NEW", "CONFIRMED"];

export default async function CabinetOrderDetailPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: { items: true },
  });

  if (!order || order.userId !== session.user.id) notFound();

  const settings = await getSiteSettings();
  const phoneLink = getSetting(settings, "phone_link") || "+79850670888";

  const currentIdx = STATUS_INDEX[order.status] ?? 0;
  const isCancelled = order.status === "CANCELLED";
  const canCancel = CANCELLABLE.includes(order.status);
  const color = ORDER_STATUS_COLORS[order.status] || "bg-muted text-muted-foreground";

  const deliveryCost = Number((order as { deliveryCost?: unknown }).deliveryCost ?? 0);
  const totalWithDelivery = Number(order.totalAmount) + deliveryCost;

  return (
    <div className="space-y-4 pb-4 max-w-3xl mx-auto">
      {/* Back */}
      <Link
        href="/cabinet/orders"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Все заказы
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display font-bold text-xl">Заказ #{order.orderNumber}</h1>
          <p className="text-xs text-muted-foreground mt-1">от {formatDate(order.createdAt)}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${color}`}>
          {ORDER_STATUS_LABELS[order.status]}
        </span>
      </div>

      {/* Stepper */}
      {!isCancelled && (
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="relative">
            <div className="flex items-center justify-between">
              {STATUS_STEPS.map((step, idx) => {
                const Icon = step.icon;
                const isDone = idx < currentIdx;
                const isCurrent = idx === currentIdx;
                return (
                  <div key={step.key} className="flex flex-col items-center gap-1.5 flex-1 relative z-10">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                        isDone
                          ? "bg-emerald-500 text-white"
                          : isCurrent
                            ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                            : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <span
                      className={`text-[10px] font-medium text-center leading-tight ${
                        isDone ? "text-emerald-600 dark:text-emerald-400" : isCurrent ? "text-primary" : "text-muted-foreground"
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
            {/* Connecting line */}
            <div className="absolute top-5 left-5 right-5 h-0.5 bg-muted -z-0">
              <div
                className="h-full bg-emerald-500 transition-all"
                style={{ width: `${Math.min(100, (currentIdx / (STATUS_STEPS.length - 1)) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Cancelled notice */}
      {isCancelled && (
        <div className="bg-destructive/5 border border-destructive/20 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 text-destructive" />
          </div>
          <div>
            <p className="text-sm font-semibold text-destructive">Заказ отменён</p>
            <p className="text-xs text-muted-foreground mt-0.5">Если это по ошибке — позвоните менеджеру.</p>
          </div>
        </div>
      )}

      {/* Items */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border">
          <h2 className="font-semibold text-sm">Состав заказа</h2>
        </div>
        <div className="divide-y divide-border">
          {order.items.map((item) => (
            <div key={item.id} className="px-5 py-3 flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.productName}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {item.variantSize} · {Number(item.quantity)} {item.unitType === "CUBE" ? "м³" : "шт"} × {formatPrice(Number(item.price))}
                </p>
              </div>
              <p className="text-sm font-semibold shrink-0">
                {formatPrice(Number(item.price) * Number(item.quantity))}
              </p>
            </div>
          ))}
        </div>
        <div className="px-5 py-3 border-t border-border space-y-1.5 bg-muted/20">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Сумма товаров</span>
            <span>{formatPrice(Number(order.totalAmount))}</span>
          </div>
          {deliveryCost > 0 && (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Доставка</span>
              <span>{formatPrice(deliveryCost)}</span>
            </div>
          )}
          <div className="flex items-center justify-between pt-1.5 border-t border-border/60">
            <span className="text-sm font-semibold">Итого</span>
            <span className="text-lg font-bold text-primary">{formatPrice(totalWithDelivery)}</span>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
        <h2 className="font-semibold text-sm mb-2">Детали заказа</h2>

        <InfoRow icon={User} label="Получатель" value={order.guestName || "—"} />
        <InfoRow icon={Phone} label="Телефон" value={order.guestPhone || "—"} />
        {order.guestEmail && <InfoRow icon={Mail} label="Email" value={order.guestEmail} />}
        {order.deliveryAddress && <InfoRow icon={MapPin} label="Адрес" value={order.deliveryAddress} />}
        <InfoRow icon={CreditCard} label="Оплата" value={order.paymentMethod} />
        {order.comment && <InfoRow icon={MessageSquare} label="Комментарий" value={order.comment} />}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <a
          href={`/api/cabinet/orders/${order.id}/pdf`}
          target="_blank"
          rel="noopener"
          className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 h-11 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:brightness-110 transition-all"
        >
          <FileDown className="w-4 h-4" /> Скачать счёт
        </a>

        <RepeatOrderButton orderId={order.id} variant="button" />

        {order.deliveryAddress && (
          <Link
            href={`/track?order=${order.orderNumber}`}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 h-11 rounded-xl border border-border text-sm font-medium hover:bg-muted/40 transition-colors"
          >
            <Truck className="w-4 h-4" /> Трекинг
          </Link>
        )}

        {canCancel && <CancelOrderButton orderId={order.id} orderNumber={order.orderNumber} />}
      </div>

      {/* Support */}
      <div className="bg-primary/5 border border-primary/15 rounded-2xl p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Phone className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">Есть вопросы?</p>
          <p className="text-xs text-muted-foreground">Менеджер поможет по телефону</p>
        </div>
        <a href={`tel:${phoneLink}`} className="shrink-0 bg-primary text-primary-foreground text-xs font-bold px-3 h-10 inline-flex items-center rounded-xl">
          Позвонить
        </a>
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
        <p className="text-sm font-medium break-words">{value}</p>
      </div>
    </div>
  );
}
