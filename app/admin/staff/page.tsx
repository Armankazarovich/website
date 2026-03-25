import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { StaffList } from "./staff-list";

export default async function StaffPage() {
  const session = await auth();
  if ((session?.user as any)?.role !== "ADMIN") redirect("/admin");

  const staff = await prisma.user.findMany({
    where: {
      role: { not: "USER" },
    },
    orderBy: [
      { staffStatus: "asc" }, // PENDING first (alphabetically P < A < S)
      { createdAt: "desc" },
    ],
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      staffStatus: true,
      customRole: true,
      createdAt: true,
      lastActiveAt: true,
    },
  });

  // Sort: PENDING first, then ACTIVE, then SUSPENDED
  const sorted = [
    ...staff.filter((s) => s.staffStatus === "PENDING"),
    ...staff.filter((s) => s.staffStatus === "ACTIVE"),
    ...staff.filter((s) => s.staffStatus === "SUSPENDED"),
    ...staff.filter((s) => !s.staffStatus), // legacy admins without staffStatus
  ];

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold">Команда</h1>
        <p className="text-muted-foreground mt-1">
          Управление сотрудниками — подтверждение заявок, роли, доступ
        </p>
      </div>
      <StaffList staff={sorted} />
    </div>
  );
}
