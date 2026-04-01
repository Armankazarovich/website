import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { MediaClient } from "./media-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Медиабиблиотека" };

export default async function MediaPage() {
  const session = await auth();
  if (!session) redirect("/admin/login");
  const role = (session.user as { role?: string })?.role;
  if (!["ADMIN", "MANAGER"].includes(role || "")) redirect("/admin");

  return (
    <div className="p-4 lg:p-6">
      <MediaClient />
    </div>
  );
}
