import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AdminMessengerClient } from "./messenger-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "ARAY Messenger — переписки и CRM",
};

const MESSENGER_ROLES = ["SUPER_ADMIN", "ADMIN", "MANAGER", "SELLER"];

export default async function AdminMessengerPage() {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!session || !MESSENGER_ROLES.includes(role)) redirect("/login");

  return (
    <div className="flex min-h-[calc(100dvh-148px)] flex-col pb-24 lg:h-[calc(100vh-64px)] lg:min-h-0 lg:overflow-hidden lg:pb-0">
      <AdminMessengerClient staffName={(session.user as any)?.name || "Команда"} />
    </div>
  );
}
