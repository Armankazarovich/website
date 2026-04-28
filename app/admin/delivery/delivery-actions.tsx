"use client";

/**
 * DeliveryActions — client-обёртка для регистрации page actions на /admin/delivery.
 *
 * Сессия 40 (28.04.2026): /admin/delivery — server async page, не может
 * напрямую вызвать useAdminPageActions. Этот mini-wrapper рендерится
 * пустым и регистрирует actions в context.
 */
import { useRouter } from "next/navigation";
import { Calculator } from "lucide-react";
import { useAdminPageActions } from "@/components/admin/admin-page-actions";

export function DeliveryActions() {
  const router = useRouter();

  useAdminPageActions({
    onRefresh: () => router.refresh(),
    actions: [
      {
        id: "rates",
        label: "Тарифы",
        icon: Calculator,
        onClick: () => router.push("/admin/delivery/rates"),
      },
    ],
  });

  return null;
}
