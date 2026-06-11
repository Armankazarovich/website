"use client";

/**
 * ProductsActions — client-обёртка для регистрации page actions на /admin/products.
 *
 * Сессия 40 hotfix (28.04.2026): hydration #423 ловился когда useAdminPageActions
 * вызывался напрямую внутри огромного ProductsClient. Вынесено в маленький
 * standalone wrapper, рендерится сразу после ProductsClient в server-page.
 */
import { useRouter } from "next/navigation";
import { Plus, FileCheck, Handshake, Stethoscope, Tags } from "lucide-react";
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
        href: "/admin/products/new",
        onClick: () => router.push("/admin/products/new"),
      },
      {
        id: "catalog-audit",
        label: "Аудит",
        icon: Stethoscope,
        href: "/admin/products/audit",
        onClick: () => router.push("/admin/products/audit"),
        hideOnMobile: true,
      },
      {
        id: "suppliers",
        label: "Поставщики",
        icon: Handshake,
        href: "/admin/suppliers",
        onClick: () => router.push("/admin/suppliers"),
        hideOnMobile: true,
      },
      {
        id: "product-types",
        label: "Типы",
        icon: Tags,
        href: "/admin/product-types",
        onClick: () => router.push("/admin/product-types"),
        hideOnMobile: true,
      },
      {
        id: "import-prices",
        label: "Импорт цен",
        icon: FileCheck,
        href: "/admin/products/import-prices",
        onClick: () => router.push("/admin/products/import-prices"),
        hideOnMobile: true,
      },
    ],
  });
  return null;
}
