export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Trash2 } from "lucide-react";
import { AdminBack } from "@/components/admin/admin-back";
import { TrashActions } from "./trash-actions";
import { ClearTrashButton } from "./clear-trash-button";

export default async function OrdersTrashPage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/admin/orders");

  const deleted = await prisma.order.findMany({
    where: { deletedAt: { not: null } },
    orderBy: { deletedAt: "desc" },
    include: { items: { select: { id: true } } },
  });

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <AdminBack />
          <h1 className="font-display font-bold text-2xl flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-destructive" />
            Корзина
          </h1>
          <span className="text-sm text-muted-foreground">({deleted.length})</span>
        </div>
        {deleted.length > 0 && <ClearTrashButton count={deleted.length} />}
      </div>

      {deleted.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-12 text-center">
          <Trash2 className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Корзина пуста</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Заказ</th>
                <th className="text-left px-4 py-3 font-semibold">Клиент</th>
                <th className="text-right px-4 py-3 font-semibold">Сумма</th>
                <th className="text-right px-4 py-3 font-semibold">Удалён</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {deleted.map((order) => (
                <tr key={order.id} className="hover:bg-primary/[0.05] transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-semibold">#{order.orderNumber}</span>
                    <p className="text-xs text-muted-foreground">{order.items.length} позиций</p>
                  </td>
                  <td className="px-4 py-3">
                    <p>{order.guestName || "—"}</p>
                    <p className="text-xs text-muted-foreground">{order.guestPhone || ""}</p>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">
                    {Number(order.totalAmount).toLocaleString("ru-RU")} ₽
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                    {order.deletedAt
                      ? new Date(order.deletedAt).toLocaleDateString("ru-RU", {
                          day: "2-digit", month: "2-digit", year: "numeric",
                          hour: "2-digit", minute: "2-digit",
                        })
                      : "—"}
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
      )}
    </div>
  );
}
