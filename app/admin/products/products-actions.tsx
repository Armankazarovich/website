"use client";

/**
 * ProductsActions — client-обёртка для регистрации page actions на /admin/products.
 *
 * Сессия 40 hotfix (28.04.2026): hydration #423 ловился когда useAdminPageActions
 * вызывался напрямую внутри огромного ProductsClient. Вынесено в маленький
 * standalone wrapper, рендерится сразу после ProductsClient в server-page.
 */
import { useRouter } from "next/navigation";
import { Plus, Download } from "lucide-react";
import { useAdminPageActions } from "@/components/admin/admin-page-actions";

export function ProductsActions() {
  const router = useRouter();
  useAdminPageActions({
    onRefresh: () => router.refresh(),
    actions: [
      {
        id: "new-product",
        label: "Новый товар",
        icon: Plus,
        variant: "primary",
        onClick: () => router.push("/admin/products/new"),
      },
      {
        id: "import-products",
        label: "Импорт",
        icon: Download,
        onClick: () => router.push("/admin/import"),
        hideOnMobile: true,
      },
    ],
  });
  return null;
}
