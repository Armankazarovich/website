import { redirect } from "next/navigation";
import { getSessionRole } from "@/lib/auth-helpers";
import { ArayLabClient } from "./aray-lab-client";

export const metadata = { title: "ARAY Design Lab" };
export const dynamic = "force-dynamic";

const MANAGEMENT_ROLES = ["SUPER_ADMIN", "ADMIN", "MANAGER"];

export default async function ArayLabPage() {
  const data = await getSessionRole();
  if (!data || !MANAGEMENT_ROLES.includes(data.role)) {
    redirect("/login?from=/admin/aray-lab");
  }

  return (
    <div className="admin-page-frame admin-page-frame-fluid">
      <ArayLabClient />
    </div>
  );
}
