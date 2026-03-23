import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CabinetSidebar } from "@/components/cabinet/cabinet-sidebar";

export default async function CabinetLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true, phone: true, createdAt: true, role: true },
  });

  return (
    <div className="container py-6 lg:py-10">
      <div className="flex flex-col lg:flex-row gap-6">
        <CabinetSidebar user={user} />
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}
