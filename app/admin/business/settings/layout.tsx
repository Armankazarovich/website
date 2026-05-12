import { redirect } from "next/navigation";
import { getSessionRole } from "@/lib/auth-helpers";
import { getArayModuleAccess } from "@/lib/aray-module-state";

export default async function BusinessSettingsModuleLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionRole();
  if (!session) redirect("/login");

  const access = await getArayModuleAccess({
    moduleId: "business.role-os",
    role: session.role,
  });

  if (!access.allowed) {
    redirect("/admin/aray/modules?module=business.role-os");
  }

  return <>{children}</>;
}
