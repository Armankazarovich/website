import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { MediaClient } from "./media-client";
import { canViewGlobalMedia } from "@/lib/media-permissions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Медиабиблиотека" };

export default async function MediaPage() {
  const session = await auth();
  if (!session) redirect("/login");
  const role = (session.user as { role?: string })?.role;
  if (!canViewGlobalMedia(role)) redirect("/admin");

  return (
    <div className="p-4 lg:p-6">
      <MediaClient />
    </div>
  );
}
