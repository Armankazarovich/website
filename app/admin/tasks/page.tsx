import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { TasksKanban } from "./tasks-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Задачи — Канбан | ПилоРус Админ" };

export default async function TasksPage() {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!session || !["ADMIN", "MANAGER", "ACCOUNTANT", "WAREHOUSE", "SELLER", "COURIER"].includes(role)) {
    redirect("/admin/login");
  }

  const [tasks, staff] = await Promise.all([
    prisma.task.findMany({
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true } },
        order: { select: { id: true, orderNumber: true, guestName: true, guestPhone: true } },
        comments: {
          include: { user: { select: { id: true, name: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: [{ status: "asc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
    }),
    prisma.user.findMany({
      where: { role: { in: ["ADMIN", "MANAGER", "ACCOUNTANT", "WAREHOUSE", "SELLER", "COURIER"] } },
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
    comments: t.comments.map(c => ({
      ...c,
      createdAt: c.createdAt.toISOString(),
    })),
  }));

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col overflow-hidden">
      <TasksKanban initialTasks={serialized as any} initialStaff={staff as any} />
    </div>
  );
}
