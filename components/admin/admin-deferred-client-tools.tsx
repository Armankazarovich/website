"use client";

import dynamic from "next/dynamic";
import { AdminPwaInstall, AdminPwaInstallBridge } from "@/components/admin/admin-pwa-install";
import { useAccountDrawer } from "@/store/account-drawer";

const AccountDrawer = dynamic(
  () => import("@/components/store/account-drawer").then((m) => ({ default: m.AccountDrawer })),
  { ssr: false },
);

export function AdminDeferredClientTools({ role: _role }: { role?: string }) {
  const accountOpen = useAccountDrawer((state) => state.open);

  return (
    <>
      <AdminPwaInstallBridge />
      <AdminPwaInstall />
      {accountOpen && <AccountDrawer />}
    </>
  );
}
