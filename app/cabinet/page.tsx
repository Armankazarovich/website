export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { formatDate, formatPrice, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from "@/lib/utils";
import Link from "next/link";
import { ShoppingBag, ArrowRight, Package, Clock, CheckCircle, Truck } from "lucide-react";
import { BackButton } from "@/components/ui/back-button";
import { RepeatOrderButton } from "@/components/cabinet/repeat-order-button";

const STATUS_ICONS: Record<string, React.ElementType> = {
  PENDING:    Clock,
  CONFIRMED:  CheckCircle,
  PROCESSING: Package,
  SHIPPED:    Truck,
  DELIVERED:  CheckCircle,
  CANCELLED:  ShoppingBag,
};

export default async function CabinetOrdersPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const orders = await prisma.order.findMany({
    where: { userId: session.user.id },
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-start gap-3">
          <BackButton href="/catalog" label="Каталог" className="mt-0.5 mb-0 shrink-0" />
          <div>
            <h1 className="font-display font-bold text-2xl">Мои заказы</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              {orders.length > 0 ? `${orders.length} заказ${orders.length === 1 ? "" : orders.length < 5 ? "а" : "ов"}` : "Заказов пока нет"}
            </p>
          </div>
        </div>
        <Link
          href="/catalog"
          className="hidden sm:flex items-center gap-2 text-sm text-primary hover:underline font-medium"
        >
          В каталог <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {orders.length === 0 ? (
        /* Empty state */
        <div className="bg-card rounded-2xl border border-border p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
            <ShoppingBag className="w-8 h-8 text-muted-foreground/40" />
          </div>
          <h3 className="font-display font-semibold text-lg mb-2">Заказов пока нет</h3>
          <p className="text-muted-foreground text-sm mb-6 max-w-xs mx-auto">
            Перейдите в каталог и оформите первый заказ — доставим за 1–3 дня
          </p>
          <Link
            href="/catalog"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            Перейти в каталог <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const StatusIcon = STATUS_ICONS[order.status] ?? ShoppingBag;
            return (
              <div key={order.id} className="bg-card rounded-2xl border border-border overflow-hidden hover:border-primary/30 transition-colors">
                {/* Order header */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-5 border-b border-border/60">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <StatusIcon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-display font-semibold">Заказ #{order.orderNumber}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(order.createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${ORDER_STATUS_COLORS[order.status]}`}>
                      {ORDER_STATUS_LABELS[order.status]}
                    </span>
                    <span className="font-bold text-lg text-primary">
                      {formatPrice(Number(order.totalAmount))}
                    </span>
                    <RepeatOrderButton orderId={order.id} />
                    <Link href={`/track?order=${order.orderNumber}`} className="text-xs text-primary hover:underline">
                      Отследить →
                    </Link>
                  </div>
                </div>

                {/* Items */}
                <div className="px-5 py-4 space-y-2">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-4 text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary/50 shrink-0" />
                        <span className="text-foreground truncate">{item.productName}</span>
                        <span className="text-muted-foreground shrink-0">· {item.variantSize}</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 text-muted-foreground">
                        <span>{Number(item.quantity)} {item.unitType === "CUBE" ? "м³" : "шт"}</span>
                        <span className="font-medium text-foreground">
                          {formatPrice(Number(item.price) * Number(item.quantity))}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer */}
                {(order.paymentMethod || order.deliveryAddress) && (
                  <div className="px-5 py-3 bg-muted/30 border-t border-border/60 flex flex-wrap gap-4 text-xs text-muted-foreground">
                    {order.paymentMethod && (
                      <span>💳 {order.paymentMethod}</span>
                    )}
                    {order.deliveryAddress && (
                      <span className="truncate">📍 {order.deliveryAddress}</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
