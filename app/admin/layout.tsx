export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { prisma } from "@/lib/prisma";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  const role = (session?.user as any)?.role;
  const staffStatus = (session?.user as any)?.staffStatus;
  const userId = (session?.user as any)?.id;
  const isStaff = role && role !== "USER";
  const isSuperAdmin = role === "SUPER_ADMIN";
  const isBlocked = (staffStatus === "PENDING" || staffStatus === "SUSPENDED") && !isSuperAdmin;

  if (!session || !isStaff || isBlocked) {
    redirect("/login");
  }

  // Обновляем lastActiveAt асинхронно (не блокируем рендер)
  if (userId) {
    prisma.user.update({
      where: { id: userId },
      data: { lastActiveAt: new Date() },
    }).catch(() => {});
  }

  return (
    <AdminShell role={role} email={session.user?.email}>
      {children}
    </AdminShell>
  );
}
