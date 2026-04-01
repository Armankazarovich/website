"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ClipboardList,
  CheckCircle2,
  Package,
  Truck,
  MapPin,
  PartyPopper,
  XCircle,
  Phone,
  ArrowLeft,
  Store,
  RefreshCw,
  CreditCard,
  MessageSquare,
  ShoppingBag,
} from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { getSetting } from "@/lib/site-settings";

// ─── Types ───────────────────────────────────────────────────────────────────

type OrderStatus =
  | "NEW"
  | "CONFIRMED"
  | "PROCESSING"
  | "SHIPPED"
  | "IN_DELIVERY"
  | "READY_PICKUP"
  | "DELIVERED"
  | "COMPLETED"
  | "CANCELLED";

type OrderItem = {
  id: string;
  productName: string;
  variantSize: string;
  unitType: string;
  quantity: number;
  price: number;
  productImage: string | null;
  productSlug: string | null;
};

type TrackOrder = {
  id: string;
  orderNumber: number;
  status: OrderStatus;
  guestName: string | null;
  guestPhone: string | null;
  guestEmail: string | null;
  deliveryAddress: string | null;
  paymentMethod: string;
  comment: string | null;
  totalAmount: number;
  deliveryCost: number;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
};

// ─── Timeline definition ─────────────────────────────────────────────────────

const DELIVERY_TIMELINE = [
  {
    status: "NEW" as OrderStatus,
    label: "Заказ принят",
    Icon: ClipboardList,
    desc: "Ваш заказ получен и ожидает подтверждения",
  },
  {
    status: "CONFIRMED" as OrderStatus,
    label: "Подтверждён",
    Icon: CheckCircle2,
    desc: "Менеджер подтвердил заказ и готовит его",
  },
  {
    status: "PROCESSING" as OrderStatus,
    label: "Комплектуется",
    Icon: Package,
    desc: "Ваш заказ готовится к отправке",
  },
  {
    status: "SHIPPED" as OrderStatus,
    label: "Отгружен",
    Icon: Truck,
    desc: "Заказ передан в доставку",
  },
  {
    status: "IN_DELIVERY" as OrderStatus,
    label: "В пути",
    Icon: MapPin,
    desc: "Курьер едет к вам",
  },
  {
    status: "DELIVERED" as OrderStatus,
    label: "Доставлен",
    Icon: PartyPopper,
    desc: "Заказ доставлен! Спасибо за покупку",
  },
];

const PICKUP_TIMELINE = [
  {
    status: "NEW" as OrderStatus,
    label: "Заказ принят",
    Icon: ClipboardList,
    desc: "Ваш заказ получен и ожидает подтверждения",
  },
  {
    status: "CONFIRMED" as OrderStatus,
    label: "Подтверждён",
    Icon: CheckCircle2,
    desc: "Менеджер подтвердил заказ",
  },
  {
    status: "PROCESSING" as OrderStatus,
    label: "Комплектуется",
    Icon: Package,
    desc: "Ваш заказ готовится",
  },
  {
    status: "READY_PICKUP" as OrderStatus,
    label: "Готов к выдаче",
    Icon: Store,
    desc: "Приезжайте — заказ ждёт вас",
  },
  {
    status: "COMPLETED" as OrderStatus,
    label: "Получен",
    Icon: PartyPopper,
    desc: "Спасибо за покупку!",
  },
];

// Rank for progress calculation (delivery flow)
const DELIVERY_RANK: Partial<Record<OrderStatus, number>> = {
  NEW: 0,
  CONFIRMED: 1,
  PROCESSING: 2,
  SHIPPED: 3,
  IN_DELIVERY: 4,
  DELIVERED: 5,
};

const PICKUP_RANK: Partial<Record<OrderStatus, number>> = {
  NEW: 0,
  CONFIRMED: 1,
  PROCESSING: 2,
  READY_PICKUP: 3,
  COMPLETED: 4,
};

function isPickupOrder(status: OrderStatus): boolean {
  return status === "READY_PICKUP" || status === "COMPLETED";
}

// ─── Status card config ───────────────────────────────────────────────────────

const STATUS_CARD: Record<
  OrderStatus,
  { bg: string; border: string; text: string; label: string; icon: React.ElementType }
> = {
  NEW: {
    bg: "bg-blue-50 dark:bg-blue-950/30",
    border: "border-blue-200 dark:border-blue-800",
    text: "text-blue-700 dark:text-blue-300",
    label: "Заказ принят",
    icon: ClipboardList,
  },
  CONFIRMED: {
    bg: "bg-purple-50 dark:bg-purple-950/30",
    border: "border-purple-200 dark:border-purple-800",
    text: "text-purple-700 dark:text-purple-300",
    label: "Подтверждён",
    icon: CheckCircle2,
  },
  PROCESSING: {
    bg: "bg-amber-50 dark:bg-amber-950/30",
    border: "border-amber-200 dark:border-amber-800",
    text: "text-amber-700 dark:text-amber-300",
    label: "Комплектуется",
    icon: Package,
  },
  SHIPPED: {
    bg: "bg-orange-50 dark:bg-orange-950/30",
    border: "border-orange-200 dark:border-orange-800",
    text: "text-orange-700 dark:text-orange-300",
    label: "Отгружен",
    icon: Truck,
  },
  IN_DELIVERY: {
    bg: "bg-sky-50 dark:bg-sky-950/30",
    border: "border-sky-200 dark:border-sky-800",
    text: "text-sky-700 dark:text-sky-300",
    label: "Курьер в пути",
    icon: MapPin,
  },
  READY_PICKUP: {
    bg: "bg-violet-50 dark:bg-violet-950/30",
    border: "border-violet-200 dark:border-violet-800",
    text: "text-violet-700 dark:text-violet-300",
    label: "Готов к выдаче",
    icon: Store,
  },
  DELIVERED: {
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    border: "border-emerald-200 dark:border-emerald-800",
    text: "text-emerald-700 dark:text-emerald-300",
    label: "Доставлен",
    icon: PartyPopper,
  },
  COMPLETED: {
    bg: "bg-teal-50 dark:bg-teal-950/30",
    border: "border-teal-200 dark:border-teal-800",
    text: "text-teal-700 dark:text-teal-300",
    label: "Получен (самовывоз)",
    icon: PartyPopper,
  },
  CANCELLED: {
    bg: "bg-red-50 dark:bg-red-950/30",
    border: "border-red-200 dark:border-red-800",
    text: "text-red-700 dark:text-red-300",
    label: "Отменён",
    icon: XCircle,
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function formatDateShort(iso: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}

// ─── Timeline component ───────────────────────────────────────────────────────

function StatusTimeline({
  status,
  isCancelled,
}: {
  status: OrderStatus;
  isCancelled: boolean;
}) {
  const usePickup = isPickupOrder(status);
  const timeline = usePickup ? PICKUP_TIMELINE : DELIVERY_TIMELINE;
  const rankMap = usePickup ? PICKUP_RANK : DELIVERY_RANK;
  const currentRank = rankMap[status] ?? 0;

  if (isCancelled) {
    return (
      <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-950/30 rounded-2xl border border-red-200 dark:border-red-800">
        <XCircle className="w-6 h-6 text-red-500 shrink-0" />
        <div>
          <p className="font-semibold text-red-700 dark:text-red-300">Заказ отменён</p>
          <p className="text-sm text-red-600/70 dark:text-red-400/70 mt-0.5">
            Если это ошибка — пожалуйста, свяжитесь с нами
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Vertical connector line behind circles */}
      <div
        className="absolute left-5 top-5 bottom-5 w-0.5 bg-border"
        aria-hidden="true"
      />

      <div className="space-y-0">
        {timeline.map((step, idx) => {
          const stepRank = rankMap[step.status] ?? idx;
          const isDone = currentRank > stepRank;
          const isCurrent = currentRank === stepRank;
          const { Icon } = step;

          return (
            <div key={step.status} className="relative flex items-start gap-4 pb-6 last:pb-0">
              {/* Circle */}
              <div className="relative z-10 shrink-0">
                {isCurrent ? (
                  <div className="relative">
                    <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
                    <div className="relative w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-md shadow-primary/30">
                      <Icon className="w-5 h-5 text-primary-foreground" />
                    </div>
                  </div>
                ) : isDone ? (
                  <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-sm">
                    <CheckCircle2 className="w-5 h-5 text-primary-foreground" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-muted border-2 border-border flex items-center justify-center">
                    <Icon className="w-5 h-5 text-muted-foreground/50" />
                  </div>
                )}
              </div>

              {/* Text */}
              <div className="pt-1.5 min-w-0">
                <p
                  className={`font-semibold text-sm leading-tight ${
                    isDone || isCurrent
                      ? "text-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  {step.label}
                  {isCurrent && (
                    <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary">
                      сейчас
                    </span>
                  )}
                </p>
                <p
                  className={`text-xs mt-0.5 ${
                    isCurrent
                      ? "text-muted-foreground"
                      : isDone
                      ? "text-muted-foreground/70"
                      : "text-muted-foreground/40"
                  }`}
                >
                  {step.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main client component ────────────────────────────────────────────────────

export function TrackOrderClient({
  order: initialOrder,
  settings,
}: {
  order: TrackOrder;
  settings: Record<string, string>;
}) {
  const [order, setOrder] = useState<TrackOrder>(initialOrder);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [refreshing, setRefreshing] = useState(false);

  const phone = getSetting(settings, "phone");
  const phoneLink = getSetting(settings, "phone_link");

  const refresh = useCallback(async () => {
    try {
      setRefreshing(true);
      const res = await fetch(`/api/track/${order.id}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setOrder((prev) => ({
        ...prev,
        status: data.status,
        updatedAt: data.updatedAt,
      }));
      setLastRefreshed(new Date());
    } catch {
      // silent — don't break the UI
    } finally {
      setRefreshing(false);
    }
  }, [order.id]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const timer = setInterval(refresh, 30_000);
    return () => clearInterval(timer);
  }, [refresh]);

  const isCancelled = order.status === "CANCELLED";
  const isFinished =
    order.status === "DELIVERED" || order.status === "COMPLETED";

  const cardConfig = STATUS_CARD[order.status];
  const CardIcon = cardConfig.icon;

  const shortId = order.id.slice(0, 8).toUpperCase();

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-2xl py-8 px-4 sm:px-6 space-y-5">

        {/* ── Back link ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Вернуться на сайт
          </Link>
          <button
            onClick={refresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            title="Обновить статус"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Обновить
          </button>
        </div>

        {/* ── Page header ───────────────────────────────────────────────── */}
        <div>
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
              <ShoppingBag className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="font-display font-bold text-2xl sm:text-3xl leading-tight">
                Заказ #{order.orderNumber}
              </h1>
              <p className="text-muted-foreground text-sm mt-0.5">
                Оформлен {formatDateShort(order.createdAt)} · ID: {shortId}
              </p>
            </div>
          </div>
        </div>

        {/* ── Current status card ───────────────────────────────────────── */}
        <div
          className={`rounded-2xl border p-5 flex items-start gap-4 ${cardConfig.bg} ${cardConfig.border}`}
        >
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
              isFinished
                ? "bg-emerald-500/20 dark:bg-emerald-500/10"
                : isCancelled
                ? "bg-red-500/20 dark:bg-red-500/10"
                : "bg-primary/10"
            }`}
          >
            <CardIcon
              className={`w-6 h-6 ${
                isFinished
                  ? "text-emerald-600 dark:text-emerald-400"
                  : isCancelled
                  ? "text-red-500"
                  : "text-primary"
              }`}
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className={`font-bold text-lg leading-tight ${cardConfig.text}`}>
              {cardConfig.label}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {isCancelled
                ? "Если это ошибка или у вас есть вопросы — позвоните нам"
                : isFinished
                ? "Спасибо за покупку! Будем рады видеть вас снова"
                : `Обновлено ${formatDateTime(order.updatedAt)}`}
            </p>
            {!isCancelled && !isFinished && (
              <p className="text-xs text-muted-foreground/60 mt-1">
                Статус обновляется автоматически каждые 30 секунд
              </p>
            )}
          </div>
        </div>

        {/* ── Timeline ─────────────────────────────────────────────────── */}
        {!isCancelled && (
          <div className="bg-card rounded-2xl border border-border p-6">
            <h2 className="font-semibold mb-6 text-sm uppercase tracking-wide text-muted-foreground">
              Статус доставки
            </h2>
            <StatusTimeline status={order.status} isCancelled={isCancelled} />
          </div>
        )}

        {/* ── Order info ───────────────────────────────────────────────── */}
        <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
          <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
            Детали заказа
          </h2>
          <div className="space-y-3 text-sm">
            {order.guestName && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Получатель</p>
                  <p className="font-medium mt-0.5">{order.guestName}</p>
                </div>
              </div>
            )}
            {order.guestPhone && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Телефон</p>
                  <a
                    href={`tel:${order.guestPhone}`}
                    className="font-medium mt-0.5 text-primary hover:underline"
                  >
                    {order.guestPhone}
                  </a>
                </div>
              </div>
            )}
            {order.deliveryAddress && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Адрес доставки</p>
                  <p className="font-medium mt-0.5">{order.deliveryAddress}</p>
                </div>
              </div>
            )}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <CreditCard className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Способ оплаты</p>
                <p className="font-medium mt-0.5">{order.paymentMethod}</p>
              </div>
            </div>
            {order.comment && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <MessageSquare className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Комментарий</p>
                  <p className="font-medium mt-0.5">{order.comment}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Order items ──────────────────────────────────────────────── */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="font-semibold flex items-center gap-2">
              <Package className="w-4 h-4 text-muted-foreground" />
              Состав заказа
            </h2>
          </div>

          <div className="divide-y divide-border">
            {order.items.map((item) => {
              const unit = item.unitType === "CUBE" ? "м³" : "шт";
              const lineTotal = item.price * item.quantity;

              return (
                <div key={item.id} className="flex items-start gap-4 px-5 py-4">
                  {/* Thumbnail */}
                  <div className="w-14 h-14 rounded-xl bg-muted overflow-hidden shrink-0 border border-border">
                    {item.productImage ? (
                      <Image
                        src={item.productImage}
                        alt={item.productName}
                        width={56}
                        height={56}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-6 h-6 text-muted-foreground/40" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm leading-tight truncate">
                      {item.productName}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {item.variantSize} · {item.quantity} {unit}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatPrice(item.price)} / {unit}
                    </p>
                  </div>

                  {/* Line total */}
                  <div className="text-right shrink-0">
                    <p className="font-semibold text-sm">{formatPrice(lineTotal)}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Totals */}
          <div className="border-t border-border px-5 py-4 space-y-1.5 bg-muted/30">
            {order.deliveryCost > 0 && (
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Стоимость доставки</span>
                <span>{formatPrice(order.deliveryCost)}</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="font-semibold">Итого:</span>
              <span className="font-display font-bold text-xl text-primary">
                {formatPrice(order.totalAmount + order.deliveryCost)}
              </span>
            </div>
          </div>
        </div>

        {/* ── Contact section ───────────────────────────────────────────── */}
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5">
          <div className="flex items-start sm:items-center justify-between gap-4 flex-col sm:flex-row">
            <div>
              <p className="font-semibold">Есть вопросы по заказу?</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                Наш менеджер ответит на любые вопросы
              </p>
            </div>
            <a
              href={`tel:${phoneLink}`}
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors shrink-0"
            >
              <Phone className="w-4 h-4" />
              {phone}
            </a>
          </div>
        </div>

        {/* ── Footer info ───────────────────────────────────────────────── */}
        <div className="text-center pb-4">
          <p className="text-xs text-muted-foreground">
            Последнее обновление:{" "}
            {lastRefreshed.toLocaleTimeString("ru-RU", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 mt-3 text-sm text-primary hover:underline font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Вернуться на сайт
          </Link>
        </div>
      </div>
    </div>
  );
}
