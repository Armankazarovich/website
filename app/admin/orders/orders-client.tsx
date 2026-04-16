"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { OrderStatusSelect } from "@/components/admin/order-status-select";
import { AdminQuickView } from "@/components/admin/admin-quick-view";
import { formatDate, formatPrice, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from "@/lib/utils";
import {
  Trash2, Loader2, Download, Phone, MapPin,
  Package, CreditCard, Truck, MessageSquare, ExternalLink,
  ChevronLeft, ChevronRight, Clock,
} from "lucide-react";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";

type Order = {
  id: string;
  orderNumber: number;
  guestName: string | null;
  guestPhone: string | null;
  deliveryAddress: string | null;
  createdAt: Date;
  totalAmount: any;
  deliveryCost: any;
  status: string;
  items: { id: string }[];
};

type Stats = { todayCount: number; todayRevenue: number; newCount: number };

// ── QuickView контент для заказа ─────────────────────────────────────────────
function OrderQuickViewContent({ orderId, onOpenFull }: { orderId: string; onOpenFull: () => void }) {
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  // Use CSS variable-based styling — works with both classic and glass themes
  // Glass mode sets these vars to white-based values, classic uses standard theme values

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/orders/${orderId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { setOrder(data); setLoading(false); })
      .catch(() => setLoading(false));
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
  const total = Number(order.totalAmount || 0) + Number(order.deliveryCost || 0);

  return (
    <div className="p-4 space-y-4">

      {/* Статус + дата */}
      <div className="flex items-center justify-between">
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
        <div className="flex items-center justify-between">
          <p className="text-base font-semibold text-foreground">{order.guestName || "—"}</p>
          {order.guestPhone && (
            <a href={`tel:${order.guestPhone}`}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium bg-primary/15 border border-primary/40 text-primary">
              <Phone className="w-3.5 h-3.5" />
              {order.guestPhone}
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
      {order.items?.length > 0 && (
        <div className="rounded-2xl overflow-hidden border border-border">
          <div className="px-4 py-2.5 bg-muted/30 border-b border-border">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] flex items-center gap-2 text-muted-foreground">
              <Package className="w-3.5 h-3.5" /> Позиции ({order.items.length})
            </p>
          </div>
          <div className="divide-y divide-border">
            {order.items.map((item: any) => (
              <div key={item.id} className="px-4 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate text-foreground">{item.productName}</p>
                  {item.variantName && (
                    <p className="text-xs mt-0.5 text-muted-foreground">{item.variantName}</p>
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
          <span>{formatPrice(Number(order.totalAmount))}</span>
        </div>
        {Number(order.deliveryCost) > 0 && (
          <div className="flex justify-between text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><Truck className="w-3.5 h-3.5" />Доставка</span>
            <span>{formatPrice(Number(order.deliveryCost))}</span>
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
        <OrderStatusSelect orderId={order.id} currentStatus={order.status} />
      </div>

      {/* Открыть полную страницу */}
      <button
        onClick={onOpenFull}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-semibold transition-all active:scale-[0.98] bg-primary/20 border-[1.5px] border-primary/40 text-primary hover:bg-primary/30"
      >
        <ExternalLink className="w-4 h-4" />
        Открыть полную страницу
      </button>
    </div>
  );
}

// ── Главный компонент ─────────────────────────────────────────────────────────
export function OrdersClient({ orders: initialOrders, stats: initialStats }: { orders: Order[]; stats: Stats }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [orders, setOrders] = useState(initialOrders);
  const [search, setSearch] = useState("");

  // Статус фильтр берём из URL (?status=NEW) — синхронизируется со Smart Command Bar
  const statusFilter = searchParams.get("status") || "ALL";
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);

  // QuickView state
  const [quickViewId, setQuickViewId] = useState<string | null>(null);

  // Автообновление каждые 30 секунд
  useEffect(() => {
    const timer = setInterval(() => router.refresh(), 30000);
    return () => clearInterval(timer);
  }, [router]);

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      const matchStatus = statusFilter === "ALL" || o.status === statusFilter;
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        (o.guestName || "").toLowerCase().includes(q) ||
        (o.guestPhone || "").includes(q) ||
        String(o.orderNumber).includes(q);
      return matchStatus && matchSearch;
    });
  }, [orders, statusFilter, search]);

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const stats = useMemo(() => {
    const todayOrders = orders.filter((o) => new Date(o.createdAt) >= today);
    return {
      todayCount: todayOrders.filter((o) => o.status !== "CANCELLED").length,
      todayRevenue: todayOrders
        .filter((o) => o.status !== "CANCELLED")
        .reduce((s, o) => s + Number(o.totalAmount) + Number(o.deliveryCost ?? 0), 0),
      newCount: orders.filter((o) => o.status === "NEW").length,
    };
  }, [orders]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((o) => o.id)));
  };

  const handleExportCSV = () => {
    const rows = [
      ["№", "Клиент", "Телефон", "Адрес", "Дата", "Сумма", "Статус"],
      ...filtered.map((o) => [
        `#${o.orderNumber}`,
        o.guestName || "",
        o.guestPhone || "",
        o.deliveryAddress || "",
        new Date(o.createdAt).toLocaleDateString("ru-RU"),
        Number(o.totalAmount),
        o.status,
      ]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `orders_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const handleBulkDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch("/api/admin/orders/bulk-delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [...selected] }),
      });
      if (res.ok) {
        setOrders((prev) => prev.filter((o) => !selected.has(o.id)));
        setSelected(new Set());
      }
    } finally { setDeleting(false); }
  };

  // Навигация между заказами внутри попапа
  const quickViewIdx = filtered.findIndex(o => o.id === quickViewId);
  const goPrev = () => { if (quickViewIdx > 0) setQuickViewId(filtered[quickViewIdx - 1].id); };
  const goNext = () => { if (quickViewIdx < filtered.length - 1) setQuickViewId(filtered[quickViewIdx + 1].id); };

  const quickOrder = filtered.find(o => o.id === quickViewId);

  return (
    <div className="space-y-5">

      {/* Статистика */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <div className="bg-card border border-border rounded-2xl px-3 py-3 min-w-0 overflow-hidden">
          <p className="text-[10px] text-muted-foreground leading-tight">Сегодня</p>
          <p className="text-lg sm:text-xl font-bold mt-0.5 truncate">{stats.todayCount}</p>
        </div>
        <div className="bg-card border border-border rounded-2xl px-3 py-3 min-w-0 overflow-hidden">
          <p className="text-[10px] text-muted-foreground leading-tight">Выручка</p>
          <p className="text-lg sm:text-xl font-bold mt-0.5 truncate">{formatPrice(stats.todayRevenue)}</p>
        </div>
        <div className="bg-card border border-border rounded-2xl px-3 py-3 min-w-0 overflow-hidden">
          <p className="text-[10px] text-muted-foreground leading-tight">Новых</p>
          <p className="text-lg sm:text-xl font-bold mt-0.5 text-primary truncate">{stats.newCount}</p>
        </div>
      </div>

      {/* Инструменты — CSV + массовые действия */}
      <div className="flex items-center gap-2 justify-end flex-wrap">
        {statusFilter !== "ALL" && (
          <span className="text-xs text-muted-foreground px-2 py-1 rounded-lg bg-muted/50">
            {filtered.length} из {orders.length}
          </span>
        )}
        <button onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-muted text-foreground rounded-xl text-sm font-semibold hover:bg-muted/80 transition-colors shrink-0">
          <Download className="w-4 h-4" /> CSV
        </button>
        {selected.size > 0 && (
          <button onClick={() => setConfirmBulkDelete(true)} disabled={deleting}
            className="flex items-center gap-2 px-4 py-2 bg-destructive text-destructive-foreground rounded-xl text-sm font-semibold hover:bg-destructive/90 transition-colors shrink-0">
            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Удалить ({selected.size})
          </button>
        )}
      </div>

      {/* Мобильные карточки (< md) */}
      <div className="md:hidden space-y-1.5">
        {filtered.map((order) => (
          <div
            key={order.id}
            onClick={() => setQuickViewId(order.id)}
            className={`bg-card rounded-2xl border px-3.5 py-3 cursor-pointer active:scale-[0.98] transition-all ${
              quickViewId === order.id ? "border-primary/60 bg-primary/5" : "border-border"
            }`}
            style={{ WebkitTapHighlightColor: "transparent" }}
          >
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-bold text-primary text-sm">#{order.orderNumber}</span>
                <span className="font-semibold text-sm truncate">{order.guestName || "—"}</span>
              </div>
              <p className="font-bold text-base shrink-0">{formatPrice(Number(order.totalAmount))}</p>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0 text-muted-foreground text-xs">
                <span>{order.guestPhone || "—"}</span>
                <span>{formatDate(order.createdAt)}</span>
              </div>
              <div onClick={e => e.stopPropagation()}>
                <OrderStatusSelect orderId={order.id} currentStatus={order.status} />
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-muted-foreground py-12">
            {orders.length === 0 ? "Заказов ещё нет" : "Ничего не найдено"}
          </p>
        )}
      </div>

      {/* Десктопная таблица (≥ md) */}
      <div className="hidden md:block bg-card rounded-2xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-3 py-3">
                  <input type="checkbox"
                    checked={selected.size > 0 && selected.size === filtered.length}
                    onChange={toggleAll} className="rounded" />
                </th>
                <th className="text-left px-4 py-3 font-semibold">№</th>
                <th className="text-left px-4 py-3 font-semibold">Клиент</th>
                <th className="text-left px-4 py-3 font-semibold">Телефон</th>
                <th className="text-left px-4 py-3 font-semibold hidden md:table-cell">Адрес</th>
                <th className="text-left px-4 py-3 font-semibold">Дата</th>
                <th className="text-right px-4 py-3 font-semibold">Сумма</th>
                <th className="text-center px-4 py-3 font-semibold">Статус</th>
                <th className="text-left px-4 py-3 font-semibold hidden lg:table-cell">Поз.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((order) => (
                <tr
                  key={order.id}
                  onClick={() => setQuickViewId(order.id)}
                  className={`hover:bg-primary/[0.05] transition-colors cursor-pointer ${
                    selected.has(order.id) ? "bg-destructive/5" : ""
                  } ${quickViewId === order.id ? "bg-primary/15 border-l-2 border-primary" : ""}`}
                >
                  <td className="px-3 py-3 text-center" onClick={e => e.stopPropagation()}>
                    <input type="checkbox"
                      checked={selected.has(order.id)}
                      onChange={() => toggleSelect(order.id)}
                      className="rounded" />
                  </td>
                  <td className="px-4 py-3 font-medium text-primary">#{order.orderNumber}</td>
                  <td className="px-4 py-3 font-medium">{order.guestName || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{order.guestPhone || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs hidden md:table-cell max-w-[160px] truncate">
                    {order.deliveryAddress || "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(order.createdAt)}</td>
                  <td className="px-4 py-3 text-right font-bold">{formatPrice(Number(order.totalAmount))}</td>
                  <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                    <OrderStatusSelect orderId={order.id} currentStatus={order.status} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{order.items.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <p className="text-center text-muted-foreground py-12">
            {orders.length === 0 ? "Заказов ещё нет" : "Ничего не найдено"}
          </p>
        )}
      </div>

      {/* QuickView попап */}
      <AdminQuickView
        open={!!quickViewId}
        onClose={() => setQuickViewId(null)}
        title={quickOrder ? `Заказ #${quickOrder.orderNumber}` : "Заказ"}
        subtitle={quickOrder?.guestName || undefined}
      >
        {/* Навигация между заказами */}
        <div className="flex items-center justify-between px-4 pt-3 pb-1">
          <button onClick={goPrev} disabled={quickViewIdx <= 0}
            className="flex items-center gap-1.5 text-xs text-muted-foreground disabled:opacity-20 hover:text-foreground transition-colors">
            <ChevronLeft className="w-4 h-4" /> Предыдущий
          </button>
          <span className="text-xs text-muted-foreground">{quickViewIdx + 1} / {filtered.length}</span>
          <button onClick={goNext} disabled={quickViewIdx >= filtered.length - 1}
            className="flex items-center gap-1.5 text-xs text-muted-foreground disabled:opacity-20 hover:text-foreground transition-colors">
            Следующий <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {quickViewId && (
          <OrderQuickViewContent
            orderId={quickViewId}
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
