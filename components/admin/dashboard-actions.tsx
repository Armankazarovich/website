"use client";

/**
 * DashboardActions — client-компонент, который регистрирует actions/refresh
 * для главной /admin через useAdminPageActions хук.
 *
 * Server-page рендерит его пустым — он не выводит UI, только подписывается
 * на context AdminPageActionsProvider. AppHeader подхватывает actions из контекста
 * и рендерит в правом слоте.
 *
 * Сессия 40 (28.04.2026): первый пример того, как страницы должны
 * регистрировать свои контекстные действия. Будет повторено на /admin/orders,
 * /admin/clients, /admin/products, /admin/delivery в этом же деплое.
 */
import { useRouter } from "next/navigation";
import { Plus, BarChart2 } from "lucide-react";
import { useAdminPageActions } from "@/components/admin/admin-page-actions";

interface Props {
  /** Скрывать "Новый заказ" если у роли нет прав */
  showNewOrder?: boolean;
}

export function DashboardActions({ showNewOrder = true }: Props) {
  const router = useRouter();

  useAdminPageActions({
    onRefresh: () => router.refresh(),
    actions: [
      ...(showNewOrder
        ? [
            {
              id: "new-order",
              label: "Новый заказ",
              icon: Plus,
              variant: "primary" as const,
              onClick: () => router.push("/admin/orders/new"),
            },
          ]
        : []),
      {
        id: "analytics",
        label: "Аналитика",
        icon: BarChart2,
        onClick: () => router.push("/admin/analytics"),
        hideOnMobile: true,
      },
    ],
  });

  return null;
}
