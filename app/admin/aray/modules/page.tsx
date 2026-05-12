import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ModuleControlCenter } from "@/components/admin/module-control-center";
import { ADMIN_ROLES, getSessionRole } from "@/lib/auth-helpers";
import { getArayModuleRegistrySummary } from "@/lib/aray-module-registry";
import { getArayModuleControlItemsForRole } from "@/lib/aray-module-state";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Модули ARAY",
  description: "Module Control Center: паспорта модулей, статусы, зависимости, права, ARAY skills и quality checks.",
};

export default async function ArayModulesPage() {
  const auth = await getSessionRole();
  if (!auth) redirect("/login?callbackUrl=/admin/aray/modules");
  if (!ADMIN_ROLES.includes(auth.role as any)) redirect("/admin");

  return (
    <ModuleControlCenter
      modules={await getArayModuleControlItemsForRole({ role: auth.role })}
      summary={getArayModuleRegistrySummary()}
      canManage={auth.role === "SUPER_ADMIN"}
    />
  );
}
