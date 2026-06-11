import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentTenantId } from "@/lib/tenant-context";
import { TasksKanban } from "./tasks-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Задачи — Канбан | ПилоРус Админ" };

export default async function TasksPage() {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!session || !["SUPER_ADMIN", "ADMIN", "MANAGER", "ACCOUNTANT", "WAREHOUSE", "SELLER", "COURIER"].includes(role)) {
    redirect("/login");
  }
  const tenantId = getCurrentTenantId();

  const [tasks, staff] = await Promise.all([
    prisma.task.findMany({
      where: { tenantId },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true } },
        order: { select: { id: true, orderNumber: true, guestName: true, guestPhone: true } },
        relations: { orderBy: { createdAt: "asc" } },
        comments: {
          include: { user: { select: { id: true, name: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: [{ status: "asc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
    }),
    prisma.user.findMany({
      where: {
        tenantId,
        role: { in: ["SUPER_ADMIN", "ADMIN", "MANAGER", "ACCOUNTANT", "WAREHOUSE", "SELLER", "COURIER"] },
      },
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: "asc" },
    }),
  ]);

  // Serialize decimals
  const serialized = tasks.map(t => ({
    ...t,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    dueDate: t.dueDate?.toISOString() ?? null,
    completedAt: t.completedAt?.toISOString() ?? null,
    relations: t.relations.map((relation) => ({
      ...relation,
      createdAt: relation.createdAt.toISOString(),
    })),
    comments: t.comments.map(c => ({
      ...c,
      createdAt: c.createdAt.toISOString(),
    })),
  }));

  return (
    <div className="flex min-h-[calc(100dvh-148px)] flex-col pb-24 lg:h-[calc(100vh-64px)] lg:min-h-0 lg:overflow-hidden lg:pb-0">
      <TasksKanban initialTasks={serialized as any} initialStaff={staff as any} />
    </div>
  );
}
