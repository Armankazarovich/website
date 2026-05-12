import { redirect } from "next/navigation";
import { getSessionRole } from "@/lib/auth-helpers";
import { getArayModuleAccess } from "@/lib/aray-module-state";

export default async function NotificationsModuleLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionRole();
  if (!session) redirect("/login");

  const access = await getArayModuleAccess({
    moduleId: "core.notifications",
    role: session.role,
  });

  if (!access.allowed) {
    redirect("/admin/aray/modules?module=core.notifications");
  }

  return <>{children}</>;
}
