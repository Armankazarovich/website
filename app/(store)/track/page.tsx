"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Search, Package, Clock, CheckCircle, Truck, XCircle, Phone, ArrowRight } from "lucide-react";
import { BackButton } from "@/components/ui/back-button";
import { PHONE_LINK } from "@/lib/phone-constants";
import { Button } from "@/components/ui/button";

type OrderStatus = "NEW" | "CONFIRMED" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED";

type OrderItem = {
  productName: string;
  variantSize: string;
  quantity: number;
  unitType: string;
  price: number;
};

type TrackResult = {
  orderNumber: number;
  status: OrderStatus;
  createdAt: string;
  guestName: string;
  deliveryAddress: string;
  items: OrderItem[];
  totalAmount: number;
};

const STATUS_STEPS: { status: OrderStatus; label: string; icon: React.ElementType; desc: string }[] = [
  { status: "NEW",        label: "Принят",        icon: Clock,        desc: "Заявка получена" },
  { status: "CONFIRMED",  label: "Подтверждён",   icon: CheckCircle,  desc: "Менеджер подтвердил" },
  { status: "PROCESSING", label: "Комплектация",  icon: Package,      desc: "Готовим к отгрузке" },
  { status: "SHIPPED",    label: "В пути",        icon: Truck,        desc: "Доставляем к вам" },
  { status: "DELIVERED",  label: "Доставлен",     icon: CheckCircle,  desc: "Получено" },
];

const STATUS_ORDER: Record<OrderStatus, number> = {
  NEW: 0, CONFIRMED: 1, PROCESSING: 2, SHIPPED: 3, DELIVERED: 4, CANCELLED: -1,
};

function TrackForm() {
  const searchParams = useSearchParams();
  const [orderNum, setOrderNum] = useState(searchParams.get("order") || "");
  const [phone, setPhone] = useState(searchParams.get("phone") || "");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TrackResult | null>(null);
  const [error, setError] = useState("");

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    const res = await fetch(`/api/orders/track?order=${encodeURIComponent(orderNum)}&phone=${encodeURIComponent(phone)}`);
    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Заказ не найден. Проверьте номер и телефон.");
    } else {
      setResult(data);
    }
    setLoading(false);
  };

  const currentStep = result ? STATUS_ORDER[result.status] : -1;
  const isCancelled = result?.status === "CANCELLED";

  return (
    <div className="space-y-6">
      {/* Search form */}
      <div className="bg-card rounded-2xl border border-border p-6">
        <form onSubmit={handleTrack} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Номер заказа</label>
              <input
                value={orderNum}
                onChange={e => setOrderNum(e.target.value)}
                placeholder="Например: 42"
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Телефон (при оформлении)</label>
              <input
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+7 (985) 067-08-88"
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                required
              />
            </div>
          </div>
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <Button type="submit" disabled={loading} className="gap-2">
            {loading ? "Ищем..." : <><Search className="w-4 h-4" /> Отследить заказ</>}
          </Button>
        </form>
      </div>

      {/* Result */}
      {result && (
        <div className="space-y-4">
          {/* Order header */}
          <div className="bg-card rounded-2xl border border-border p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="font-display font-bold text-xl">Заказ #{result.orderNumber}</h2>
                <p className="text-muted-foreground text-sm mt-0.5">
                  Оформлен {new Date(result.createdAt).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}
                </p>
              </div>
              {!isCancelled && (
                <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                  result.status === "DELIVERED"
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                    : "bg-primary/10 text-primary"
                }`}>
                  {result.status === "NEW" && "Новый"}
                  {result.status === "CONFIRMED" && "Подтверждён"}
                  {result.status === "PROCESSING" && "Комплектация"}
                  {result.status === "SHIPPED" && "В пути"}
                  {result.status === "DELIVERED" && "Доставлен ✓"}
                </span>
              )}
              {isCancelled && (
                <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-destructive/10 text-destructive">
                  Отменён
                </span>
              )}
            </div>

            {/* Progress timeline */}
            {!isCancelled ? (
              <div className="mt-6">
                <div className="flex items-start gap-0">
                  {STATUS_STEPS.map((step, idx) => {
                    const isDone = currentStep >= idx;
                    const isCurrent = currentStep === idx;
                    const isLast = idx === STATUS_STEPS.length - 1;
                    const Icon = step.icon;
                    return (
                      <div key={step.status} className="flex flex-col items-center flex-1">
                        {/* Step circle + line */}
                        <div className="flex items-center w-full">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 transition-colors ${
                            isDone
                              ? "bg-primary border-primary"
                              : "bg-background border-border"
                          } ${isCurrent ? "ring-4 ring-primary/20" : ""}`}>
                            <Icon className={`w-4 h-4 ${isDone ? "text-white" : "text-muted-foreground"}`} />
                          </div>
                          {!isLast && (
                            <div className={`flex-1 h-0.5 ${currentStep > idx ? "bg-primary" : "bg-border"}`} />
                          )}
                        </div>
                        {/* Label */}
                        <div className="mt-2 text-center px-1">
                          <p className={`text-xs font-medium ${isDone ? "text-foreground" : "text-muted-foreground"}`}>
                            {step.label}
                          </p>
                          <p className="text-[10px] text-muted-foreground hidden sm:block">{step.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 mt-4 p-4 bg-destructive/5 rounded-xl border border-destructive/20">
                <XCircle className="w-5 h-5 text-destructive shrink-0" />
                <div>
                  <p className="text-sm font-medium text-destructive">Заказ отменён</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Если это ошибка — позвоните нам</p>
                </div>
              </div>
            )}
          </div>

          {/* Order items */}
          <div className="bg-card rounded-2xl border border-border p-6">
            <h3 className="font-semibold mb-4">Состав заказа</h3>
            <div className="space-y-3">
              {result.items.map((item, i) => (
                <div key={i} className="flex justify-between items-start text-sm">
                  <div>
                    <p className="font-medium">{item.productName}</p>
                    <p className="text-muted-foreground text-xs mt-0.5">
                      {item.variantSize} · {item.unitType === "CUBE" ? `${item.quantity} м³` : `${item.quantity} шт`}
                    </p>
                  </div>
                  <span className="font-medium shrink-0 ml-4">
                    {(item.price * item.quantity).toLocaleString("ru-RU")} ₽
                  </span>
                </div>
              ))}
            </div>
            <div className="border-t border-border mt-4 pt-4 flex justify-between items-center">
              <span className="font-semibold">Итого:</span>
              <span className="font-display font-bold text-xl text-primary">
                {Number(result.totalAmount).toLocaleString("ru-RU")} ₽
              </span>
            </div>
          </div>

          {/* Delivery info */}
          {result.deliveryAddress && (
            <div className="bg-card rounded-2xl border border-border p-5 flex items-start gap-3">
              <Truck className="w-5 h-5 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-sm">Адрес доставки</p>
                <p className="text-muted-foreground text-sm mt-0.5">{result.deliveryAddress}</p>
              </div>
            </div>
          )}

          {/* Contact */}
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Вопросы по заказу?</p>
              <p className="text-muted-foreground text-xs mt-0.5">Менеджер ответит на все вопросы</p>
            </div>
            <a href={`tel:${PHONE_LINK}`} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors">
              <Phone className="w-4 h-4" />
              Позвонить
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TrackPage() {
  return (
    <div className="container py-10 max-w-2xl">
      <div className="mb-8">
        <div className="flex items-start gap-3 mb-1">
          <BackButton href="/cabinet" label="Мои заказы" className="mt-0.5 mb-0 shrink-0" />
          <div>
            <h1 className="font-display font-bold text-3xl">Отслеживание заказа</h1>
            <p className="text-muted-foreground mt-1">
              Введите номер заказа и телефон, который указали при оформлении
            </p>
          </div>
        </div>
      </div>
      <Suspense>
        <TrackForm />
      </Suspense>
    </div>
  );
}
