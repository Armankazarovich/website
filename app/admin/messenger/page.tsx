import { Suspense } from "react";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AdminMessengerHubClient } from "./messenger-hub-client";

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
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-background">
      <Suspense fallback={<div className="flex min-h-0 flex-1 items-center justify-center text-sm text-muted-foreground">Открываю ARAY Messenger...</div>}>
        <AdminMessengerHubClient staffName={(session.user as any)?.name || "Команда"} />
      </Suspense>
    </div>
  );
}
