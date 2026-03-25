"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { OrderStatusSelect } from "@/components/admin/order-status-select";
import { formatDate, formatPrice } from "@/lib/utils";
import { Search, Trash2, Loader2, Download } from "lucide-react";

const STATUS_FILTERS = [
  { key: "ALL", label: "Все" },
  { key: "NEW", label: "Новые" },
  { key: "CONFIRMED", label: "Подтверждённые" },
  { key: "PROCESSING", label: "В обработке" },
  { key: "SHIPPED", label: "Отгружены" },
  { key: "IN_DELIVERY", label: "В пути" },
  { key: "READY_PICKUP", label: "Самовывоз" },
  { key: "DELIVERED", label: "Доставлены" },
  { key: "COMPLETED", label: "Завершены" },
  { key: "CANCELLED", label: "Отменены" },
];

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

export function OrdersClient({ orders: initialOrders, stats: initialStats }: { orders: Order[]; stats: Stats }) {
  const router = useRouter();
  const [orders, setOrders] = useState(initialOrders);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  // Автообновление каждые 30 секунд — новые заказы всегда видны
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
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((o) => o.id)));
    }
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
    const a = document.createElement("a");
    a.href = url;
    a.download = `orders_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Переместить ${selected.size} заказ(ов) в корзину?`)) return;
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
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Статистика */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Заказов сегодня</p>
          <p className="text-2xl font-bold mt-1">{stats.todayCount}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Выручка сегодня</p>
          <p className="text-2xl font-bold mt-1">{formatPrice(stats.todayRevenue)}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Новых заказов</p>
          <p className="text-2xl font-bold mt-1 text-blue-600 dark:text-blue-400">{stats.newCount}</p>
        </div>
      </div>

      {/* Фильтры + поиск + bulk delete */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Имя, телефон или №..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-muted/40 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div className="flex flex-wrap gap-1.5 flex-1">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === f.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-muted text-foreground rounded-xl text-sm font-semibold hover:bg-muted/80 transition-colors shrink-0"
        >
          <Download className="w-4 h-4" />
          CSV
        </button>
        {selected.size > 0 && (
          <button
            onClick={handleBulkDelete}
            disabled={deleting}
            className="flex items-center gap-2 px-4 py-2 bg-destructive text-destructive-foreground rounded-xl text-sm font-semibold hover:bg-destructive/90 transition-colors shrink-0"
          >
            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Удалить ({selected.size})
          </button>
        )}
      </div>

      {/* Таблица */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-3 py-3">
                  <input
                    type="checkbox"
                    checked={selected.size > 0 && selected.size === filtered.length}
                    onChange={toggleAll}
                    className="rounded"
                  />
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
                  className={`hover:bg-muted/30 transition-colors ${selected.has(order.id) ? "bg-destructive/5" : ""}`}
                >
                  <td className="px-3 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={selected.has(order.id)}
                      onChange={() => toggleSelect(order.id)}
                      className="rounded"
                    />
                  </td>
                  <td className="px-4 py-3 font-medium">
                    <Link href={`/admin/orders/${order.id}`} className="hover:text-primary transition-colors">
                      #{order.orderNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/orders/${order.id}`} className="hover:text-primary transition-colors block">
                      {order.guestName || "—"}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    {order.guestPhone ? (
                      <a href={`tel:${order.guestPhone}`} className="text-primary hover:underline">
                        {order.guestPhone}
                      </a>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs hidden md:table-cell max-w-[160px] truncate">
                    {order.deliveryAddress || "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(order.createdAt)}</td>
                  <td className="px-4 py-3 text-right font-bold">{formatPrice(Number(order.totalAmount))}</td>
                  <td className="px-4 py-3 text-center">
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
    </div>
  );
}
