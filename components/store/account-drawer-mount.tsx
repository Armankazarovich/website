"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { useAccountDrawer } from "@/store/account-drawer";

function loadAccountDrawer() {
  return import("@/components/store/account-drawer").then((m) => ({
    default: m.AccountDrawer,
  }));
}

const AccountDrawer = dynamic(loadAccountDrawer, { ssr: false });

export function AccountDrawerMount() {
  const open = useAccountDrawer((state) => state.open);

  useEffect(() => {
    const preloadTimer = window.setTimeout(() => {
      void loadAccountDrawer();
    }, 900);

    return () => window.clearTimeout(preloadTimer);
  }, []);

  return open ? <AccountDrawer /> : null;
}
