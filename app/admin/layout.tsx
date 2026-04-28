export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import dynamicImport from "next/dynamic";
import { AdminShell } from "@/components/admin/admin-shell";
import { prisma } from "@/lib/prisma";

// AccountDrawer — единый side drawer (тот же что в магазине), открывается из admin-mobile-bottom-nav
const AccountDrawer = dynamicImport(
  () => import("@/components/store/account-drawer").then((m) => ({ default: m.AccountDrawer })),
  { ssr: false }
);

// VoiceModeOverlay — fullscreen voice разговор с Араем (тот же что в магазине)
const VoiceModeOverlay = dynamicImport(
  () => import("@/components/store/voice-mode-overlay").then((m) => ({ default: m.VoiceModeOverlay })),
  { ssr: false }
);

// ArayDock — Telegram-style чат-бар Арая на ДЕСКТОПЕ админки (≥1024px).
// На мобилке/планшете админки используется AdminMobileBottomNav (с центральным орбом).
// БЕЗ этого dock'а на десктопе админки нет видимой кнопки открытия Арая.
const ArayDock = dynamicImport(
  () => import("@/components/store/aray-dock").then((m) => ({ default: m.ArayDock })),
  { ssr: false }
);

export const metadata: Metadata = {
  title: {
    default: "Панель управления",
    template: "%s | Панель ПилоРус",
  },
  manifest: "/admin-manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Арай",
  },
  icons: {
    apple: "/api/admin/pwa-icon?s=180",
  },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  const role = (session?.user as any)?.role;
  const userId = (session?.user as any)?.id;
  const isStaff = role && role !== "USER";
  const isSuperAdmin = role === "SUPER_ADMIN";

  if (!session || !isStaff) {
    redirect("/login");
  }

  // Всегда проверяем свежий статус из БД — чтобы блокировка/разблокировка работала мгновенно
  if (userId && !isSuperAdmin) {
    const freshUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { staffStatus: true },
    }).catch(() => null);

    if (freshUser?.staffStatus === "PENDING" || freshUser?.staffStatus === "SUSPENDED") {
      redirect("/login");
    }
  }

  // Обновляем lastActiveAt асинхронно (не блокируем рендер)
  if (userId) {
    prisma.user.update({
      where: { id: userId },
      data: { lastActiveAt: new Date() },
    }).catch(() => {});
  }

  // Получаем имя пользователя из БД (session.user.name может быть null)
  let userName: string | null = (session.user as any)?.name || null;
  if (!userName && userId) {
    const u = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } }).catch(() => null);
    if (u?.name) userName = u.name;
  }

  return (
    <>
      <AdminShell role={role} email={session.user?.email} userName={userName}>
        {children}
      </AdminShell>
      {/* Единый AccountDrawer — тот же что в магазине, открывается из bottom nav */}
      <AccountDrawer />
      {/* Voice Mode Overlay — fullscreen разговор по long-press на Арая */}
      <VoiceModeOverlay />
      {/* ArayDock — Telegram-style чат-бар на десктопе (lg:block) */}
      <ArayDock />
    </>
  );
}
