import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ImportClient } from "./import-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Импорт / Экспорт товаров" };

export default async function ImportPage() {
  const session = await auth();
  if (!session) redirect("/admin/login");
  const role = (session.user as { role?: string })?.role;
  if (!["ADMIN", "MANAGER", "WAREHOUSE"].includes(role || "")) redirect("/admin");

  return <ImportClient />;
}
