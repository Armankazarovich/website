import { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminMessengerHubClient } from "./messenger-hub-client";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "ARAY Messenger — переписки и CRM",
};

const MESSENGER_ROLES = ["SUPER_ADMIN", "ADMIN", "MANAGER", "SELLER"];

export default async function AdminMessengerPage() {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!session || !MESSENGER_ROLES.includes(role)) redirect("/login");
  const staffName = session.user?.name || session.user?.email || "Команда";

  return (
    <div className="admin-page-frame">
      <AdminMessengerHubClient staffName={staffName} />
    </div>
  );
}
