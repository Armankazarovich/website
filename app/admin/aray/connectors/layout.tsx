import { redirect } from "next/navigation";
import { getSessionRole } from "@/lib/auth-helpers";
import { getArayModuleAccess } from "@/lib/aray-module-state";

export default async function ArayConnectorsLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionRole();
  if (!session) redirect("/login");

  const access = await getArayModuleAccess({
    moduleId: "core.connector-vault",
    role: session.role,
  });

  if (!access.allowed) {
    redirect("/admin/aray/modules?module=core.connector-vault");
  }

  return <>{children}</>;
}
