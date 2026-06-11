export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminDeferredClientTools } from "@/components/admin/admin-deferred-client-tools";
import { AdminConfirmProvider } from "@/components/admin/admin-confirm-provider";
import { prisma } from "@/lib/prisma";
import { getArayModuleControlItemsForRole } from "@/lib/aray-module-state";
import { canUserBusinessRoleAccessAction } from "@/lib/business-role-access";
import { getArayManagedSiteProfiles } from "@/lib/multisite-sites";

const LAST_ACTIVE_UPDATE_INTERVAL_MS = 5 * 60 * 1000;
const ACTIVE_ADMIN_SITE_COOKIE = "aray-active-site";
const MANAGED_ADMIN_SITE_IDS = new Set(getArayManagedSiteProfiles().map((site) => site.id));

function normalizeActiveAdminSite(value: string | undefined) {
  return value && MANAGED_ADMIN_SITE_IDS.has(value as any) ? value : "pilorus";
}

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
      { url: "/api/pwa/icon?s=32&v=pilorus-brand-header-20260526", sizes: "32x32", type: "image/png" },
      { url: "/api/pwa/icon?s=96&v=pilorus-brand-header-20260526", sizes: "96x96", type: "image/png" },
      { url: "/api/pwa/icon?s=192&v=pilorus-brand-header-20260526", sizes: "192x192", type: "image/png" },
    ],
    apple: "/api/pwa/icon?s=180&v=pilorus-brand-header-20260526",
    shortcut: "/api/pwa/icon?s=192&v=pilorus-brand-header-20260526",
  },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  const role = (session?.user as any)?.role;
  const userId = (session?.user as any)?.id;
  const isStaff = role && role !== "USER";
  const isSuperAdmin = role === "SUPER_ADMIN";
  const isPlatformAdmin = role === "ADMIN";

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
  const activeSiteId = normalizeActiveAdminSite(cookies().get(ACTIVE_ADMIN_SITE_COOKIE)?.value);
  const canCreateAraySite =
    isSuperAdmin ||
    isPlatformAdmin ||
    (await canUserBusinessRoleAccessAction(userId, "store.constructor.launch").catch(() => false));

  return (
    <AdminConfirmProvider>
      <AdminShell
        role={role}
        email={session.user?.email}
        userName={userName}
        disabledModuleIds={disabledModuleIds}
        initialActiveSiteId={activeSiteId}
        canCreateAraySite={canCreateAraySite}
      >
        {children}
      </AdminShell>
      <AdminDeferredClientTools role={role} />
    </AdminConfirmProvider>
  );
}
