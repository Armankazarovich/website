import { redirect } from "next/navigation";
import { getSessionRole } from "@/lib/auth-helpers";
import { getArayModuleAccess } from "@/lib/aray-module-state";

export default async function ArayModulesLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionRole();
  if (!session) redirect("/login");

  const access = await getArayModuleAccess({
    moduleId: "core.module-control-center",
    role: session.role,
  });

  if (!access.allowed) {
    redirect("/admin/health");
  }

  return <>{children}</>;
}
