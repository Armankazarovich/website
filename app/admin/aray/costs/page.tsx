import { redirect } from "next/navigation";
import { getSessionRole, ADMIN_ROLES } from "@/lib/auth-helpers";
import { CostsClient } from "./costs-client";
import { AutoRefresh } from "@/components/admin/auto-refresh";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Расходы Арая · Админка",
  description: "Полная картина расходов на AI и инфраструктуру: Anthropic, ElevenLabs, Google AI и постоянные подписки.",
};

export default async function ArayCostsPage() {
  const auth = await getSessionRole();
  if (!auth) redirect("/login?callbackUrl=/admin/aray/costs");
  if (!ADMIN_ROLES.includes(auth.role as any)) redirect("/admin");

  return (
    <>
      <AutoRefresh intervalMs={60000} />
      <CostsClient />
    </>
  );
}
