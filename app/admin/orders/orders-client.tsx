"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { OrderStatusSelect } from "@/components/admin/order-status-select";
import { AdminQuickView } from "@/components/admin/admin-quick-view";
import { formatDate, formatPrice, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from "@/lib/utils";
import {
  Trash2, Loader2, Download, Phone, MapPin,
  Package, CreditCard, Truck, MessageSquare, ExternalLink,
  ChevronLeft, ChevronRight, Clock, X, Plus,
  ListFilter, Inbox, ArrowRight,
} from "lucide-react";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { classifySource, humanizeSource, type SourceGroup } from "@/lib/utm";
import { useAdminPageActions } from "@/components/admin/admin-page-actions";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";

type Order = {
  id: string;
  orderNumber: number;
  guestName: string | null;
  guestPhone: string | null;
  deliveryAddress: string | null;
  createdAt: string;
  totalAmount: number | string;
  deliveryCost: number | string | null;
  status: string;
  items: { id: string }[];
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  gclid?: string | null;
  yclid?: string | null;
  referrer?: string | null;
};

type OrderKind = "ALL" | "delivery" | "pickup";
type OrderStatusFilter =
  | "ALL"
  | "NEW"
  | "CONFIRMED"
  | "PROCESSING"
  | "SHIPPED"
  | "IN_DELIVERY"
  | "READY_PICKUP"
  | "DELIVERED"
  | "COMPLETED"
  | "CANCELLED";

const ORDER_KIND_TABS: Array<{
  key: OrderKind;
  label: string;
  hint: string;
  icon: typeof Package;
}> = [
  { key: "ALL", label: "Все", hint: "Полный поток", icon: Package },
  { key: "delivery", label: "Доставка", hint: "Адрес клиента", icon: Truck },
  { key: "pickup", label: "Самовывоз", hint: "Забрать со склада", icon: MapPin },
];

const STATUS_FILTERS: Array<{ key: OrderStatusFilter; label: string }> = [
  { key: "ALL", label: "Все статусы" },
  { key: "NEW", label: "Новые" },
  { key: "CONFIRMED", label: "Подтверждены" },
  { key: "PROCESSING", label: "В работе" },
  { key: "SHIPPED", label: "Отгружены" },
  { key: "IN_DELIVERY", label: "В доставке" },
  { key: "READY_PICKUP", label: "К выдаче" },
  { key: "DELIVERED", label: "Доставлены" },
  { key: "COMPLETED", label: "Завершены" },
  { key: "CANCELLED", label: "Отменены" },
];

function getOrderKind(order: Order): Exclude<OrderKind, "ALL"> {
  const address = (order.deliveryAddress || "").trim().toLowerCase();
  if (
    order.status === "READY_PICKUP" ||
    address.startsWith("самовывоз")
  ) {
    return "pickup";
  }
  return "delivery";
}

function getOrderPlace(order: Order) {
  const raw = (order.deliveryAddress || "").trim();
  if (!raw) return "Адрес уточнить";
  if (getOrderKind(order) !== "pickup") return raw;
  return raw.replace(/^Самовывоз:\s*/i, "").trim() || "Склад";
}

function getOrderTotal(order: Pick<Order, "totalAmount">) {
  return Number(order.totalAmount || 0);
}

function OrderFulfillmentBadge({ order }: { order: Order }) {
  const kind = getOrderKind(order);
  const isPickup = kind === "pickup";
  const Icon = isPickup ? MapPin : Truck;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground">
      <Icon className="h-3.5 w-3.5 text-primary" />
      {isPickup ? "Самовывоз" : "Доставка"}
    </span>
  );
}

type QuickViewOrderItem = {
  id: string;
  productName: string;
  variantSize?: string | null;
  price: number | string;
  quantity: number | string;
};

type QuickViewOrder = {
  id: string;
  status: string;
  createdAt: string;
  guestName: string | null;
  guestPhone: string | null;
  deliveryAddress: string | null;
  contactMethod?: string | null;
  items?: QuickViewOrderItem[];
  totalAmount: number | string | null;
  deliveryCost?: number | string | null;
  paymentMethod?: string | null;
};

// ── QuickView контент для заказа ─────────────────────────────────────────────
function OrderQuickViewContent({
  orderId,
  onOpenFull,
  onStatusChange,
}: {
  orderId: string;
  onOpenFull: () => void;
  onStatusChange?: (orderId: string, status: string) => void;
}) {
  const [order, setOrder] = useState<QuickViewOrder | null>(null);
  const [loading, setLoading] = useState(true);
  // Use CSS variable-based styling — works with both classic and glass themes
  // Glass mode sets these vars to white-based values, classic uses standard theme values

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    fetch(`/api/admin/orders/${orderId}`, { signal: controller.signal })
      .then(r => r.ok ? r.json() : null)
      .then(data => { setOrder(data); setLoading(false); })
      .catch((err) => {
        if (err?.name !== "AbortError") setLoading(false);
      });
    return () => controller.abort();
  }, [orderId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p>Не удалось загрузить заказ</p>
      </div>
    );
  }

  const statusColor = ORDER_STATUS_COLORS[order.status] || "bg-muted text-muted-foreground";
  const statusLabel = ORDER_STATUS_LABELS[order.status] || order.status;
  const total = Number(order.totalAmount || 0);
  const delivery = Number(order.deliveryCost || 0);
  const items = order.items ?? [];
  const itemsSubtotal = items.reduce((sum, item) => {
    return sum + Number(item.price || 0) * Number(item.quantity || 0);
  }, 0);
  const goodsTotal = itemsSubtotal > 0 ? itemsSubtotal : Math.max(total - delivery, 0);

  return (
    <div className="p-4 space-y-4">

      {/* Статус + дата */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${statusColor}`}>
          {statusLabel}
        </span>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Clock className="w-3.5 h-3.5" />
          <span className="text-xs">{formatDate(order.createdAt)}</span>
        </div>
      </div>

      {/* Клиент */}
      <div className="rounded-2xl p-4 space-y-3 bg-muted/50 border border-border">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Клиент</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="min-w-0 truncate text-base font-semibold text-foreground">{order.guestName || "—"}</p>
          {order.guestPhone && (
            <a href={`tel:${order.guestPhone}`}
              className="inline-flex min-h-11 max-w-full items-center gap-2 self-start rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-sm font-medium text-primary sm:self-auto">
              <Phone className="w-3.5 h-3.5" />
              <span className="truncate">{order.guestPhone}</span>
            </a>
          )}
        </div>
        {order.deliveryAddress && (
          <div className="flex items-start gap-2">
            <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{order.deliveryAddress}</p>
          </div>
        )}
        {order.contactMethod && (
          <div className="flex items-center gap-2">
            <MessageSquare className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Связь: {order.contactMethod}</p>
          </div>
        )}
      </div>

      {/* Позиции */}
      {items.length > 0 && (
        <div className="rounded-2xl overflow-hidden border border-border">
          <div className="px-4 py-2.5 bg-muted/30 border-b border-border">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] flex items-center gap-2 text-muted-foreground">
              <Package className="w-3.5 h-3.5" /> Позиции ({items.length})
            </p>
          </div>
          <div className="divide-y divide-border">
            {items.map((item) => (
              <div key={item.id} className="px-4 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate text-foreground">{item.productName}</p>
                  {item.variantSize && (
                    <p className="text-xs mt-0.5 text-muted-foreground">{item.variantSize}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-foreground">{formatPrice(Number(item.price))}</p>
                  <p className="text-xs text-muted-foreground">× {item.quantity}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Итого */}
      <div className="rounded-2xl p-4 space-y-2 bg-muted/50 border border-border">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] flex items-center gap-2 text-muted-foreground">
          <CreditCard className="w-3.5 h-3.5" /> Оплата
        </p>
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Товары</span>
          <span>{formatPrice(goodsTotal)}</span>
        </div>
        {delivery > 0 && (
          <div className="flex justify-between text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><Truck className="w-3.5 h-3.5" />Доставка</span>
            <span>{formatPrice(delivery)}</span>
          </div>
        )}
        <div className="flex justify-between text-base font-bold pt-2 border-t border-border text-foreground">
          <span>Итого</span>
          <span className="text-primary">{formatPrice(total)}</span>
        </div>
        {order.paymentMethod && (
          <p className="text-xs text-muted-foreground">{order.paymentMethod}</p>
        )}
      </div>

      {/* Изменить статус */}
      <div className="rounded-2xl p-4 bg-muted/50 border border-border">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-3 text-muted-foreground">Изменить статус</p>
        <OrderStatusSelect
          orderId={order.id}
          currentStatus={order.status}
          onStatusChange={(nextStatus) => {
            setOrder((current) => current ? { ...current, status: nextStatus } : current);
            onStatusChange?.(order.id, nextStatus);
          }}
        />
      </div>

      {/* Открыть полную страницу */}
      <Button
        type="button"
        onClick={onOpenFull}
        variant="outline"
        className="min-h-[44px] w-full rounded-xl border-primary/30 text-primary hover:border-primary/45 hover:bg-primary/10 hover:text-primary"
      >
        <ExternalLink className="w-4 h-4" />
        Открыть полную страницу
      </Button>
    </div>
  );
}

// ── Главный компонент ─────────────────────────────────────────────────────────
export function OrdersClient({
  orders: initialOrders,
  totalCount = initialOrders.length,
  limit = initialOrders.length,
}: {
  orders: Order[];
  totalCount?: number;
  limit?: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [orders, setOrders] = useState(initialOrders);

  // Статус фильтр берём из URL (?status=NEW) — синхронизируется со Smart Command Bar
  const rawStatusFilter = searchParams.get("status");
  const statusFilter: OrderStatusFilter = STATUS_FILTERS.some((item) => item.key === rawStatusFilter)
    ? (rawStatusFilter as OrderStatusFilter)
    : "ALL";
  // Вид заказа: общий поток, доставка или самовывоз.
  const rawOrderKindFilter = searchParams.get("type");
  const orderKindFilter: OrderKind =
    rawOrderKindFilter === "delivery" || rawOrderKindFilter === "pickup"
      ? rawOrderKindFilter
      : "ALL";
  // Источник поддерживаем только как deep-link из аналитики, без отдельной панели на странице заказов.
  const sourceFilter = (searchParams.get("source") || "ALL") as SourceGroup | "ALL";
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);

  // QuickView state
  const [quickViewId, setQuickViewId] = useState<string | null>(null);

  useEffect(() => {
    setOrders(initialOrders);
  }, [initialOrders]);

  // Автообновление только в активной вкладке, чтобы список не дёргал переходы и фоновые страницы.
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, 60000);
    return () => clearInterval(timer);
  }, [router]);

  // Регистрируем action-кнопки для AppHeader (сессия 40)
  useAdminPageActions({
    onRefresh: () => router.refresh(),
    actions: [
      {
        id: "new-order",
        label: "Новый заказ",
        icon: Plus,
        variant: "primary",
        href: "/admin/orders/new",
        onClick: () => router.push("/admin/orders/new"),
      },
      {
        id: "trash",
        label: "Корзина",
        icon: Trash2,
        href: "/admin/orders/trash",
        onClick: () => router.push("/admin/orders/trash"),
        hideOnMobile: true,
      },
    ],
  });

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      const matchStatus = statusFilter === "ALL" || o.status === statusFilter;
      const matchOrderKind =
        orderKindFilter === "ALL" || getOrderKind(o) === orderKindFilter;
      const matchSource =
        sourceFilter === "ALL" || classifySource(o) === sourceFilter;
      return matchStatus && matchOrderKind && matchSource;
    });
  }, [orders, statusFilter, orderKindFilter, sourceFilter]);

  useEffect(() => {
    setSelected(new Set());
  }, [statusFilter, orderKindFilter, sourceFilter]);

  const fulfillmentCounts = useMemo(() => {
    const counts: Record<Exclude<OrderKind, "ALL">, number> = {
      delivery: 0,
      pickup: 0,
    };
    for (const o of orders) {
      counts[getOrderKind(o)] += 1;
    }
    return counts;
  }, [orders]);

  const setOrderKind = (kind: OrderKind) => {
    const sp = new URLSearchParams(searchParams.toString());
    if (kind === "ALL") sp.delete("type");
    else sp.set("type", kind);
    router.push(`/admin/orders${sp.toString() ? "?" + sp.toString() : ""}`);
  };

  const setStatusFilter = (status: OrderStatusFilter) => {
    const sp = new URLSearchParams(searchParams.toString());
    if (status === "ALL") sp.delete("status");
    else sp.set("status", status);
    router.push(`/admin/orders${sp.toString() ? "?" + sp.toString() : ""}`);
  };

  const setSource = (s: SourceGroup | "ALL") => {
    const sp = new URLSearchParams(searchParams.toString());
    if (s === "ALL") sp.delete("source");
    else sp.set("source", s);
    router.push(`/admin/orders${sp.toString() ? "?" + sp.toString() : ""}`);
  };

  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayOrders = orders.filter((o) => new Date(o.createdAt) >= today);
    return {
      todayCount: todayOrders.filter((o) => o.status !== "CANCELLED").length,
      todayRevenue: todayOrders
        .filter((o) => o.status !== "CANCELLED")
        .reduce((s, o) => s + getOrderTotal(o), 0),
      newCount: orders.filter((o) => o.status === "NEW").length,
    };
  }, [orders]);

  const resetFilters = () => {
    router.push("/admin/orders");
  };

  const loadMoreOrders = () => {
    const sp = new URLSearchParams(searchParams.toString());
    sp.set("limit", String(Math.min(totalCount, Math.max(limit, orders.length) + 160)));
    router.push(`/admin/orders?${sp.toString()}`);
  };

  const handleStatusChange = (orderId: string, nextStatus: string) => {
    setOrders((prev) =>
      prev.map((order) => (order.id === orderId ? { ...order, status: nextStatus } : order))
    );
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (filtered.length === 0) return;
    if (filtered.every((order) => selected.has(order.id))) setSelected(new Set());
    else setSelected(new Set(filtered.map((order) => order.id)));
  };

  const handleExportCSV = () => {
    if (filtered.length === 0) return;
    const rows = [
      ["№", "Клиент", "Телефон", "Вид заказа", "Адрес / склад", "Дата", "Сумма", "Статус", "Источник", "Кампания", "utm_source", "utm_medium"],
      ...filtered.map((o) => {
        const g = classifySource(o);
        const kind = getOrderKind(o);
        return [
          `#${o.orderNumber}`,
          o.guestName || "",
          o.guestPhone || "",
          kind === "pickup" ? "Самовывоз" : "Доставка",
          getOrderPlace(o),
          new Date(o.createdAt).toLocaleDateString("ru-RU"),
          getOrderTotal(o),
          o.status,
          humanizeSource(g).label,
          o.utmCampaign || "",
          o.utmSource || "",
          o.utmMedium || "",
        ];
      }),
    ];
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `orders_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    const ids = [...selected];
    const deletedIds = new Set(ids);
    setDeleting(true);
    try {
      const res = await fetch("/api/admin/orders/bulk-delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) {
        throw new Error(`Bulk delete failed: ${res.status}`);
      }
      setOrders((prev) => prev.filter((o) => !deletedIds.has(o.id)));
      setSelected(new Set());
      setConfirmBulkDelete(false);
      if (quickViewId && deletedIds.has(quickViewId)) {
        setQuickViewId(null);
      }
      router.refresh();
    } catch {
      toast({
        title: "Заказы не удалены",
        description: "Сервер не подтвердил перенос в корзину.",
        variant: "destructive",
      });
    } finally { setDeleting(false); }
  };

  // Навигация между заказами внутри попапа
  const quickViewIdx = filtered.findIndex(o => o.id === quickViewId);
  const goPrev = () => { if (quickViewIdx > 0) setQuickViewId(filtered[quickViewIdx - 1].id); };
  const goNext = () => { if (quickViewIdx < filtered.length - 1) setQuickViewId(filtered[quickViewIdx + 1].id); };

  const quickOrder = filtered.find(o => o.id === quickViewId);
  const activeStatusLabel = STATUS_FILTERS.find((item) => item.key === statusFilter)?.label || "Все статусы";
  const hasOrders = orders.length > 0;
  const hasActiveFilters =
    statusFilter !== "ALL" || orderKindFilter !== "ALL" || sourceFilter !== "ALL";
  const allVisibleSelected = filtered.length > 0 && filtered.every((order) => selected.has(order.id));
  const hasMoreOrders = orders.length < totalCount;
  const loadedLabel = totalCount > orders.length
    ? `${orders.length} из ${totalCount}`
    : String(orders.length);

  return (
    <div className="space-y-5">

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card/95 p-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Сегодня</p>
          <p className="mt-3 text-3xl font-bold leading-none">{stats.todayCount}</p>
          <p className="mt-2 text-xs text-muted-foreground">заказов с полуночи</p>
        </div>
        <div className="rounded-2xl border border-border bg-card/95 p-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Выручка</p>
          <p className="mt-3 text-3xl font-bold leading-none">{formatPrice(stats.todayRevenue)}</p>
          <p className="mt-2 text-xs text-muted-foreground">без отменённых</p>
        </div>
        <div className="rounded-2xl border border-border bg-card/95 p-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Новые</p>
          <p className="mt-3 text-3xl font-bold leading-none text-primary">{stats.newCount}</p>
          <p className="mt-2 text-xs text-muted-foreground">ожидают обработки</p>
        </div>
      </div>

      <section className="rounded-2xl border border-border bg-card/95 p-4">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-semibold">Вид заказов</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Доставка и самовывоз отдельно, без источников рекламы.
              <span className="block sm:hidden">Показано {filtered.length}; загружено {loadedLabel}.</span>
            </p>
          </div>
          <span className="hidden rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground sm:inline-flex">
            {filtered.length}; загружено {loadedLabel}
          </span>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {ORDER_KIND_TABS.map((tab) => {
            const Icon = tab.icon;
            const count =
              tab.key === "ALL"
                ? orders.length
                : fulfillmentCounts[tab.key];
            const active = orderKindFilter === tab.key;
            return (
              <button
                type="button"
                key={tab.key}
                onClick={() => setOrderKind(tab.key)}
                className={`group flex items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors ${
                  active
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border bg-background text-foreground hover:border-primary/40 hover:bg-primary/[0.04]"
                }`}
              >
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
                  active
                    ? "border-primary/40 bg-primary/15 text-primary"
                    : "border-border bg-card text-muted-foreground group-hover:text-primary"
                }`}>
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold">{tab.label}</span>
                    <span className="text-sm font-bold text-primary">{count}</span>
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">{tab.hint}</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card/95 p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <h2 className="text-base font-semibold">Статусы</h2>
            <p className="mt-1 text-sm text-muted-foreground">Рабочая очередь и быстрые действия по выбранным заказам.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {sourceFilter !== "ALL" && (
              <Button
                type="button"
                onClick={() => setSource("ALL")}
                variant="outline"
                size="sm"
                className="h-10 rounded-xl px-3 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                Источник: {humanizeSource(sourceFilter).label}
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
            {hasActiveFilters && (
              <Button
                type="button"
                onClick={resetFilters}
                variant="outline"
                size="sm"
                className="h-10 rounded-xl px-3 text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                Сбросить
              </Button>
            )}
            {selected.size > 0 && (
              <Button
                type="button"
                onClick={() => setConfirmBulkDelete(true)}
                disabled={deleting}
                variant="destructive"
                size="sm"
                className="h-10 rounded-xl px-3 text-xs font-semibold"
              >
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Удалить ({selected.size})
              </Button>
            )}
            <Button
              type="button"
              onClick={handleExportCSV}
              disabled={filtered.length === 0}
              variant="secondary"
              size="sm"
              className="h-10 rounded-xl px-3 text-xs font-semibold"
            >
              <Download className="h-4 w-4" />
              CSV
            </Button>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <ListFilter className="h-4 w-4 text-primary" />
          {activeStatusLabel}
        </div>
        <div className="-mx-1 mt-2 overflow-x-auto px-1">
          <div className="flex min-w-max gap-2">
            {STATUS_FILTERS.map((filter) => {
              const active = statusFilter === filter.key;
              return (
                <button
                  type="button"
                  key={filter.key}
                  onClick={() => setStatusFilter(filter.key)}
                  className={`min-h-11 rounded-full border px-3 text-xs font-semibold transition-colors ${
                    active
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  }`}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/80 px-5 py-12 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-background text-primary">
            <Inbox className="h-5 w-5" />
          </span>
          <h2 className="mt-4 text-lg font-semibold">
            {hasOrders ? "По этим фильтрам заказов нет" : "Заказов пока нет"}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            {hasOrders
              ? "Сбросьте фильтры или измените статус / вид заказа."
              : "Когда появится первый заказ, здесь будет рабочая очередь с доставкой, самовывозом и статусами."}
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            {hasActiveFilters && (
              <Button
                type="button"
                onClick={resetFilters}
                variant="outline"
                className="h-10 rounded-xl px-4 text-sm font-semibold"
              >
                Сбросить фильтры
              </Button>
            )}
            {hasMoreOrders && (
              <Button
                type="button"
                onClick={loadMoreOrders}
                variant="secondary"
                className="h-10 rounded-xl px-4 text-sm font-semibold"
              >
                Загрузить ещё
              </Button>
            )}
            {!hasOrders && (
              <Button
                type="button"
                onClick={() => router.push("/admin/orders/new")}
                className="h-10 rounded-xl px-4 text-sm font-semibold"
              >
                Новый заказ
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="space-y-2 lg:hidden">
            {filtered.map((order) => (
              <div
                key={order.id}
                onClick={() => setQuickViewId(order.id)}
                className={`cursor-pointer rounded-2xl border bg-card px-3.5 py-3 transition-colors ${
                  quickViewId === order.id ? "border-primary/60 bg-primary/5" : "border-border"
                }`}
                style={{ WebkitTapHighlightColor: "transparent" }}
              >
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-2">
                    <label
                      className="-ml-2 -mt-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        aria-label={`Выбрать заказ #${order.orderNumber}`}
                        checked={selected.has(order.id)}
                        onChange={() => toggleSelect(order.id)}
                        className="h-5 w-5 rounded border-border"
                      />
                    </label>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-primary">#{order.orderNumber}</p>
                      <p className="mt-0.5 truncate text-sm font-semibold">{order.guestName || "—"}</p>
                    </div>
                  </div>
                  <p className="shrink-0 text-base font-bold">{formatPrice(getOrderTotal(order))}</p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 text-xs text-muted-foreground">
                    {order.guestPhone ? (
                      <a
                        href={`tel:${order.guestPhone}`}
                        onClick={(event) => event.stopPropagation()}
                        className="inline-flex min-h-11 items-center rounded-lg pr-2 text-primary"
                      >
                        {order.guestPhone}
                      </a>
                    ) : (
                      <p>—</p>
                    )}
                    <p>{formatDate(order.createdAt)}</p>
                  </div>
                  <div onClick={e => e.stopPropagation()}>
                    <OrderStatusSelect
                      orderId={order.id}
                      currentStatus={order.status}
                      onStatusChange={(nextStatus) => handleStatusChange(order.id, nextStatus)}
                    />
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <OrderFulfillmentBadge order={order} />
                  <span className="min-w-0 truncate text-xs text-muted-foreground">{getOrderPlace(order)}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden overflow-hidden rounded-2xl border border-border bg-card lg:block">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-3 py-3">
                      <input
                        type="checkbox"
                        aria-label="Выбрать все заказы"
                        checked={allVisibleSelected}
                        onChange={toggleAll}
                        className="rounded"
                      />
                    </th>
                    <th className="px-4 py-3 text-left font-semibold">№</th>
                    <th className="px-4 py-3 text-left font-semibold">Клиент</th>
                    <th className="px-4 py-3 text-left font-semibold">Телефон</th>
                    <th className="hidden px-4 py-3 text-left font-semibold md:table-cell">Адрес / склад</th>
                    <th className="px-4 py-3 text-left font-semibold">Дата</th>
                    <th className="px-4 py-3 text-right font-semibold">Сумма</th>
                    <th className="px-4 py-3 text-center font-semibold">Статус</th>
                    <th className="hidden px-4 py-3 text-left font-semibold xl:table-cell">Получение</th>
                    <th className="hidden px-4 py-3 text-left font-semibold lg:table-cell">Поз.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((order) => (
                    <tr
                      key={order.id}
                      onClick={() => setQuickViewId(order.id)}
                      className={`cursor-pointer transition-colors hover:bg-primary/[0.05] ${
                        selected.has(order.id) ? "bg-destructive/5" : ""
                      } ${quickViewId === order.id ? "border-l-2 border-primary bg-primary/15" : ""}`}
                    >
                      <td className="px-3 py-3 text-center" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          aria-label={`Выбрать заказ #${order.orderNumber}`}
                          checked={selected.has(order.id)}
                          onChange={() => toggleSelect(order.id)}
                          className="rounded"
                        />
                      </td>
                      <td className="px-4 py-3 font-medium text-primary">#{order.orderNumber}</td>
                      <td className="px-4 py-3 font-medium">{order.guestName || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{order.guestPhone || "—"}</td>
                      <td className="hidden max-w-[180px] truncate px-4 py-3 text-xs text-muted-foreground md:table-cell">
                        {getOrderPlace(order)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(order.createdAt)}</td>
                      <td className="px-4 py-3 text-right font-bold">{formatPrice(getOrderTotal(order))}</td>
                      <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                        <OrderStatusSelect
                          orderId={order.id}
                          currentStatus={order.status}
                          onStatusChange={(nextStatus) => handleStatusChange(order.id, nextStatus)}
                        />
                      </td>
                      <td className="hidden px-4 py-3 xl:table-cell">
                        <OrderFulfillmentBadge order={order} />
                      </td>
                      <td className="hidden px-4 py-3 text-muted-foreground lg:table-cell">{order.items.length}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {hasMoreOrders && (
            <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-card/70 px-4 py-4 text-center">
              <p className="text-sm text-muted-foreground">
                Загружено {orders.length} из {totalCount}. Для скорости открываем список порциями.
              </p>
              <Button
                type="button"
                onClick={loadMoreOrders}
                variant="secondary"
                className="h-10 rounded-xl px-4 text-sm font-semibold"
              >
                Показать ещё {Math.min(160, totalCount - orders.length)}
              </Button>
            </div>
          )}
        </>
      )}

      {/* QuickView попап */}
      <AdminQuickView
        open={!!quickViewId}
        onClose={() => setQuickViewId(null)}
        title={quickOrder ? `Заказ #${quickOrder.orderNumber}` : "Заказ"}
        subtitle={quickOrder?.guestName || undefined}
      >
        {/* Навигация между заказами */}
        <div className="flex items-center justify-between px-4 pt-3 pb-1">
          <Button type="button" variant="ghost" size="sm" onClick={goPrev} disabled={quickViewIdx <= 0}
            className="min-h-11 rounded-xl px-2 text-xs text-muted-foreground hover:text-foreground disabled:opacity-20">
            <ChevronLeft className="w-4 h-4" /> Предыдущий
          </Button>
          <span className="text-xs text-muted-foreground">{quickViewIdx + 1} / {filtered.length}</span>
          <Button type="button" variant="ghost" size="sm" onClick={goNext} disabled={quickViewIdx >= filtered.length - 1}
            className="min-h-11 rounded-xl px-2 text-xs text-muted-foreground hover:text-foreground disabled:opacity-20">
            Следующий <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {quickViewId && (
          <OrderQuickViewContent
            orderId={quickViewId}
            onStatusChange={handleStatusChange}
            onOpenFull={() => { router.push(`/admin/orders/${quickViewId}`); setQuickViewId(null); }}
          />
        )}
      </AdminQuickView>

      <ConfirmDialog
        open={confirmBulkDelete}
        onClose={() => setConfirmBulkDelete(false)}
        onConfirm={handleBulkDelete}
        title={`Переместить ${selected.size} заказ(ов) в корзину?`}
        description="Заказы будут перемещены в корзину. Их можно будет восстановить позже."
        confirmLabel="Переместить в корзину"
        variant="warning"
        loading={deleting}
      />
    </div>
  );
}
