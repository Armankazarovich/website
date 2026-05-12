export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { Trash2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { formatPrice } from "@/lib/utils";
import { TrashActions } from "./trash-actions";
import { ClearTrashButton } from "./clear-trash-button";

const formatDeletedAt = (value: Date | null) =>
  value
    ? new Date(value).toLocaleString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Дата удаления не записана";

export default async function OrdersTrashPage() {
  const session = await auth();
  const role = session?.user?.role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") redirect("/admin/orders");

  const deleted = await prisma.order.findMany({
    where: { deletedAt: { not: null } },
    orderBy: { deletedAt: "desc" },
    include: { items: { select: { id: true } } },
  });

  return (
    <div className="admin-page-frame admin-page-frame-readable">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <h1 className="font-display flex items-center gap-2 text-2xl font-bold">
            <Trash2 className="h-5 w-5 text-destructive" />
            Корзина
          </h1>
          <span className="text-sm text-muted-foreground">Удалено: {deleted.length}</span>
        </div>
        {deleted.length > 0 && <ClearTrashButton count={deleted.length} />}
      </div>

      {deleted.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-6 text-center sm:p-12">
          <Trash2 className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <p className="font-medium text-foreground">Корзина пуста</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Удаленные заказы появятся здесь после переноса в корзину.
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {deleted.map((order) => (
              <article key={order.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-semibold">#{order.orderNumber}</h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {order.items.length} позиций
                    </p>
                  </div>
                  <p className="shrink-0 text-right font-semibold">
                    {formatPrice(Number(order.totalAmount))}
                  </p>
                </div>

                <div className="mt-4 grid gap-3 text-sm">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      Клиент
                    </p>
                    <p className="break-words">{order.guestName || "Не указан"}</p>
                    {order.guestPhone && (
                      <p className="mt-0.5 break-words text-xs text-muted-foreground">
                        {order.guestPhone}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      Удален
                    </p>
                    <p className="text-xs text-muted-foreground">{formatDeletedAt(order.deletedAt)}</p>
                  </div>
                </div>

                <div className="mt-4">
                  <TrashActions orderId={order.id} />
                </div>
              </article>
            ))}
          </div>

          <div className="hidden overflow-hidden rounded-2xl border border-border bg-card md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Заказ</th>
                    <th className="px-4 py-3 text-left font-semibold">Клиент</th>
                    <th className="px-4 py-3 text-right font-semibold">Сумма</th>
                    <th className="px-4 py-3 text-right font-semibold">Удален</th>
                    <th className="px-4 py-3 text-right font-semibold">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {deleted.map((order) => (
                    <tr key={order.id}>
                      <td className="px-4 py-3">
                        <span className="font-semibold">#{order.orderNumber}</span>
                        <p className="text-xs text-muted-foreground">{order.items.length} позиций</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="break-words">{order.guestName || "Не указан"}</p>
                        {order.guestPhone && (
                          <p className="text-xs text-muted-foreground">{order.guestPhone}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">
                        {formatPrice(Number(order.totalAmount))}
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                        {formatDeletedAt(order.deletedAt)}
                      </td>
                      <td className="px-4 py-3">
                        <TrashActions orderId={order.id} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
