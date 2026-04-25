export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { formatDate, formatPrice, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from "@/lib/utils";
import { ShoppingBag, ChevronRight, Search } from "lucide-react";
import type { OrderStatus } from "@prisma/client";

const PAGE_SIZE = 20;

// Статусы для фильтра
const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: "", label: "Все" },
  { value: "active", label: "В работе" },
  { value: "NEW", label: "Новые" },
  { value: "CONFIRMED", label: "Подтверждены" },
  { value: "PROCESSING", label: "В обработке" },
  { value: "IN_DELIVERY", label: "Доставляются" },
  { value: "DELIVERED", label: "Доставлены" },
  { value: "COMPLETED", label: "Завершены" },
  { value: "CANCELLED", label: "Отменены" },
];

const ACTIVE_STATUSES: OrderStatus[] = ["NEW", "CONFIRMED", "PROCESSING", "SHIPPED", "IN_DELIVERY", "READY_PICKUP"];

type SearchParams = { status?: string; q?: string; page?: string };

export default async function CabinetOrdersPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const status = (searchParams.status || "").trim();
  const q = (searchParams.q || "").trim();
  const page = Math.max(1, Number(searchParams.page) || 1);

  // Основной where
  const where: Record<string, unknown> = { userId: session.user.id, deletedAt: null };

  if (status === "active") {
    where.status = { in: ACTIVE_STATUSES };
  } else if (status && ORDER_STATUS_LABELS[status]) {
    where.status = status as OrderStatus;
  }

  if (q) {
    const num = Number(q.replace(/\D/g, ""));
    if (!isNaN(num) && num > 0) {
      where.orderNumber = num;
    }
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: { items: true },
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
    }),
    prisma.order.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const buildHref = (p: { status?: string; q?: string; page?: number }) => {
    const sp = new URLSearchParams();
    const newStatus = p.status !== undefined ? p.status : status;
    const newQ = p.q !== undefined ? p.q : q;
    const newPage = p.page !== undefined ? p.page : page;
    if (newStatus) sp.set("status", newStatus);
    if (newQ) sp.set("q", newQ);
    if (newPage > 1) sp.set("page", String(newPage));
    const qs = sp.toString();
    return `/cabinet/orders${qs ? "?" + qs : ""}`;
  };

  return (
    <div className="space-y-4 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-xl">Мои заказы</h1>
          <p className="text-xs text-muted-foreground mt-1">{total} {total === 1 ? "заказ" : total < 5 ? "заказа" : "заказов"}</p>
        </div>
      </div>

      {/* Search (GET form) */}
      <form method="get" action="/cabinet/orders" className="relative">
        {status && <input type="hidden" name="status" value={status} />}
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Поиск по номеру заказа…"
          inputMode="numeric"
          className="w-full pl-10 pr-4 h-11 rounded-xl bg-card border border-border text-base sm:text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          style={{ fontSize: 16 }}
        />
      </form>

      {/* Status filter pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto -mx-1 px-1 pb-1">
        {STATUS_FILTERS.map((f) => {
          const isActive = f.value === status || (f.value === "" && !status);
          return (
            <Link
              key={f.value || "all"}
              href={buildHref({ status: f.value, page: 1 })}
              className={`shrink-0 px-3.5 py-2 rounded-full text-xs font-semibold transition-colors border ${
                isActive
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:border-primary/30 hover:text-foreground"
              }`}
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      {/* List */}
      {orders.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-10 text-center">
          <ShoppingBag className="w-12 h-12 text-muted-foreground/15 mx-auto mb-3" />
          <p className="font-medium mb-1">
            {q || status ? "Ничего не найдено" : "У вас пока нет заказов"}
          </p>
          <p className="text-xs text-muted-foreground mb-4">
            {q || status
              ? "Попробуйте изменить фильтры или запрос"
              : "Перейдите в каталог и сделайте первый заказ"}
          </p>
          <Link
            href={q || status ? "/cabinet/orders" : "/catalog"}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-semibold"
          >
            {q || status ? "Сбросить фильтры" : "В каталог"}
          </Link>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl divide-y divide-border overflow-hidden">
          {orders.map((order) => {
            const color = ORDER_STATUS_COLORS[order.status] || "bg-muted text-muted-foreground";
            return (
              <Link
                key={order.id}
                href={`/cabinet/orders/${order.id}`}
                className="flex items-center gap-3 p-4 hover:bg-muted/40 transition-colors"
              >
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <ShoppingBag className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-semibold truncate">#{order.orderNumber}</p>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${color}`}>
                      {ORDER_STATUS_LABELS[order.status]}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {formatDate(order.createdAt)} · {order.items.length} {order.items.length === 1 ? "позиция" : "позиций"}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-sm text-primary">
                    {formatPrice(Number(order.totalAmount) + Number((order as { deliveryCost?: unknown }).deliveryCost ?? 0))}
                  </p>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/50 inline" />
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {page > 1 && (
            <Link
              href={buildHref({ page: page - 1 })}
              className="px-4 h-11 inline-flex items-center justify-center rounded-xl border border-border text-sm font-medium hover:bg-muted/40 transition-colors"
            >
              ← Назад
            </Link>
          )}
          <span className="px-4 h-11 inline-flex items-center text-sm text-muted-foreground">
            {page} из {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={buildHref({ page: page + 1 })}
              className="px-4 h-11 inline-flex items-center justify-center rounded-xl border border-border text-sm font-medium hover:bg-muted/40 transition-colors"
            >
              Далее →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
