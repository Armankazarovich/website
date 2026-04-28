"use client";

/**
 * DashboardArayRail — client-обёртка над <ArayPinnedRail> для главной /admin.
 *
 * Сессия 40 (28.04.2026): первый замах архитектуры pinned-rail на основном
 * дашборде. Превью того, как остальные 22 раздела будут выглядеть после
 * миграции. Если Арману зайдёт — расширяем на /admin/orders, /admin/clients
 * и далее по приоритету.
 *
 * Передаём 4 контекстные Quick Actions для дашборда:
 *   1. Новый заказ        → /admin/orders/new
 *   2. Новые заказы (NEW) → /admin/orders?status=NEW
 *   3. Финансы            → /admin/finance
 *   4. Дом Арая           → /admin/aray
 *
 * Server-page рендерит `<DashboardArayRail />` без props (server→client
 * boundary не любит React.ElementType иконки в массиве — урок сессии 36).
 */
import { ArayPinnedRail } from "@/components/admin/aray-pinned-rail";
import { Plus, BellRing, Wallet, Sparkles } from "lucide-react";

const QUICK_ACTIONS = [
  { href: "/admin/orders/new", label: "Новый заказ", icon: Plus },
  { href: "/admin/orders?status=NEW", label: "Новые заказы", icon: BellRing },
  { href: "/admin/finance", label: "Финансы", icon: Wallet },
  { href: "/admin/aray", label: "Дом Арая", icon: Sparkles },
];

export function DashboardArayRail() {
  return (
    <ArayPinnedRail
      page="dashboard"
      contextLabel="Главная"
      quickActions={QUICK_ACTIONS}
      inputHint="Спроси сводку дня или дай команду"
    />
  );
}
