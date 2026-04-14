export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AdminShell } from "@/components/admin/admin-shell";

export const metadata: Metadata = {
  title: {
    default: "Личный кабинет | ПилоРус",
    template: "%s | ПилоРус",
  },
};

export default async function CabinetLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true, role: true },
  }).catch(() => null);

  const role = user?.role || (session.user as any)?.role || "USER";

  // Для сотрудников: cabinet разделы (профиль, отзывы, медиа) работают как часть admin layout
  // Не редиректим — личные разделы доступны всем
  return (
    <AdminShell role={role} email={session.user?.email} userName={user?.name}>
      {children}
    </AdminShell>
  );
}
