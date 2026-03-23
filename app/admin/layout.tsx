import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { AdminNav } from "@/components/admin/admin-nav";

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
    <div className="flex min-h-screen bg-muted/20">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 bg-brand-brown text-white flex flex-col">
        <div className="p-4 border-b border-white/10">
          <Link href="/" className="flex items-center gap-2">
            <span className="font-display font-bold text-xl text-white">ПилоРус</span>
          </Link>
          <p className="text-xs text-white/50 mt-0.5">Панель управления</p>
        </div>

        <AdminNav role={role} />

        <div className="p-3 border-t border-white/10">
          <div className="px-3 py-2 text-xs text-white/50">
            {session.user?.email}
          </div>
          <Link
            href="/"
            className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            На сайт
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 overflow-auto">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
