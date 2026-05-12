export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminDeferredClientTools } from "@/components/admin/admin-deferred-client-tools";
import { prisma } from "@/lib/prisma";
import { getArayModuleControlItemsForRole } from "@/lib/aray-module-state";

const LAST_ACTIVE_UPDATE_INTERVAL_MS = 5 * 60 * 1000;

export const metadata: Metadata = {
  title: {
    default: "ARAY Production",
    template: "%s | ARAY Production",
    absolute: "ARAY Production",
  },
  manifest: "/api/pwa/manifest?app=aray-workspace",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Арай",
  },
  icons: {
    icon: [
      { url: "/api/pwa/icon?s=32&v=aray-production-20260508", sizes: "32x32", type: "image/png" },
      { url: "/api/pwa/icon?s=96&v=aray-production-20260508", sizes: "96x96", type: "image/png" },
      { url: "/api/pwa/icon?s=192&v=aray-production-20260508", sizes: "192x192", type: "image/png" },
    ],
    apple: "/api/pwa/icon?s=180&v=aray-production-20260508",
    shortcut: "/api/pwa/icon?s=192&v=aray-production-20260508",
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

  // Всегда проверяем свежий статус из БД, но heartbeat в lastActiveAt пишем не чаще тайм-окна.
  const freshUser = userId
    ? await prisma.user.findUnique({
        where: { id: userId },
        select: { staffStatus: true, lastActiveAt: true },
      }).catch(() => null)
    : null;

  if (freshUser && !isSuperAdmin) {
    if (freshUser?.staffStatus === "PENDING" || freshUser?.staffStatus === "SUSPENDED") {
      redirect("/login");
    }
  }

  // Обновляем lastActiveAt асинхронно и с троттлингом, чтобы RSC refresh не писал в БД на каждый переход.
  const shouldTouchLastActive =
    userId &&
    (!freshUser?.lastActiveAt ||
      Date.now() - freshUser.lastActiveAt.getTime() > LAST_ACTIVE_UPDATE_INTERVAL_MS);

  if (shouldTouchLastActive) {
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

  const disabledModuleIds = role
    ? (await getArayModuleControlItemsForRole({ role }).catch(() => []))
        .filter((module) => !module.effectiveEnabled || !module.role.canView)
        .map((module) => module.id)
    : [];

  return (
    <>
      <AdminShell role={role} email={session.user?.email} userName={userName} disabledModuleIds={disabledModuleIds}>
        {children}
      </AdminShell>
      <AdminDeferredClientTools role={role} />
    </>
  );
}
