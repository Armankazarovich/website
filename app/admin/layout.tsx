import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  const role = (session?.user as any)?.role;
  const staffStatus = (session?.user as any)?.staffStatus;
  const isStaff = role && role !== "USER";
  const isBlocked = staffStatus === "PENDING" || staffStatus === "SUSPENDED";

  if (!session || !isStaff || isBlocked) {
    redirect("/login");
  }

  return (
    <AdminShell role={role} email={session.user?.email}>
      {children}
    </AdminShell>
  );
}
