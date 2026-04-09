"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";

// Названия разделов по пути
const PATH_LABELS: Record<string, string> = {
  "/admin":               "Дашборд",
  "/admin/orders":        "Заказы",
  "/admin/crm":           "CRM",
  "/admin/tasks":         "Задачи",
  "/admin/delivery":      "Доставка",
  "/admin/products":      "Каталог",
  "/admin/categories":    "Категории",
  "/admin/inventory":     "Склад",
  "/admin/import":        "Импорт",
  "/admin/media":         "Медиа",
  "/admin/promotions":    "Акции",
  "/admin/reviews":       "Отзывы",
  "/admin/email":         "Email",
  "/admin/finance":       "Финансы",
  "/admin/clients":       "Клиенты",
  "/admin/analytics":     "Аналитика",
  "/admin/health":        "Здоровье",
  "/admin/site":          "Сайт",
  "/admin/settings":      "Настройки",
  "/admin/appearance":    "Оформление",
  "/admin/watermark":     "Водяной знак",
  "/admin/staff":         "Команда",
  "/admin/notifications": "Уведомления",
  "/admin/help":          "Помощь",
};

export function AdminBack({ className }: { className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [canGoBack, setCanGoBack] = useState(false);

  useEffect(() => {
    const fromAdmin = document.referrer.includes("/admin");
    setCanGoBack(window.history.length > 1 && fromAdmin);
  }, []);

  // Родительский путь = все сегменты кроме последнего
  const segments = pathname.split("/").filter(Boolean);
  segments.pop();
  const parentHref = "/" + segments.join("/") || "/admin";
  const parentLabel = PATH_LABELS[parentHref] ?? "Назад";

  return (
    <button
      onClick={() => canGoBack ? router.back() : router.push(parentHref)}
      className={`group inline-flex items-center gap-2 pl-2.5 pr-3.5 py-2 rounded-xl
        border border-border/50 bg-background hover:bg-primary/[0.08]
        text-muted-foreground hover:text-foreground
        transition-all duration-200 active:scale-[0.96] shrink-0
        ${className ?? ""}`}
    >
      {/* Иконка стрелки — уезжает влево при hover */}
      <span className="w-5 h-5 rounded-lg bg-muted/80 group-hover:bg-primary/10 flex items-center justify-center transition-colors duration-200 shrink-0">
        <ArrowLeft className="w-3 h-3 transition-transform duration-300 group-hover:-translate-x-0.5 group-hover:text-primary" />
      </span>
      <span className="text-xs font-semibold tracking-wide">{parentLabel}</span>
    </button>
  );
}
