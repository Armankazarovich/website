"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { OrderStatusSelect } from "@/components/admin/order-status-select";
import { formatDate, formatPrice, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from "@/lib/utils";
import { Search } from "lucide-react";

const STATUS_FILTERS = [
  { key: "ALL", label: "Все" },
  { key: "NEW", label: "Новые" },
  { key: "CONFIRMED", label: "Подтверждённые" },
  { key: "PROCESSING", label: "В обработке" },
  { key: "SHIPPED", label: "Отгружены" },
  { key: "IN_DELIVERY", label: "В пути" },
  { key: "READY_PICKUP", label: "Самовывоз" },
  { key: "DELIVERED", label: "Доставлены" },
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
  status: string;
  items: { id: string }[];
};

type Stats = {
  todayCount: number;
  todayRevenue: number;
  newCount: number;
};

export function OrdersClient({ orders, stats }: { orders: Order[]; stats: Stats }) {
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");

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

      {/* Фильтры + поиск */}
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
        <div className="flex flex-wrap gap-1.5">
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
      </div>

      {/* Таблица */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
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
                <tr key={order.id} className="hover:bg-muted/30 transition-colors group">
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
