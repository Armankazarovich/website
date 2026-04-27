"use client";

/**
 * ArayHomeRail — client wrapper над ArayPinnedRail с фиксированными Quick Actions
 * для раздела «Дом Арая» (/admin/aray).
 *
 * Зачем нужен: server component не может передать функциональные компоненты
 * (lucide иконки — это React.ElementType, не сериализуется) через props
 * в client component. Поэтому массив quickActions с icon-полем должен
 * жить внутри client-границы.
 */

import { BarChart3, Package, CheckSquare, Boxes } from "lucide-react";
import { ArayPinnedRail, type ArayQuickAction } from "@/components/admin/aray-pinned-rail";

/**
 * Quick Actions для контекста «Дом Арая» — ровно те 4 которые Арман
 * показал на скриншоте чата 27.04 (сессия 38). Это самые частые задачи
 * в админке: посмотреть как день, разобрать новые заказы, проверить
 * свои задачи, увидеть остатки.
 */
const QUICK_ACTIONS: ArayQuickAction[] = [
  { href: "/admin",           label: "Сводка дня",   icon: BarChart3 },
  { href: "/admin/orders",    label: "Новые заказы", icon: Package },
  { href: "/admin/tasks",     label: "Мои задачи",   icon: CheckSquare },
  { href: "/admin/inventory", label: "Остатки",      icon: Boxes },
];

export function ArayHomeRail() {
  return (
    <ArayPinnedRail
      page="aray-home"
      contextLabel="Главная"
      quickActions={QUICK_ACTIONS}
      inputHint="Спроси Арая или дай команду"
    />
  );
}
