import { AutoRefresh } from "@/components/admin/auto-refresh";
import { AutomationClient } from "./automation-client";

export const dynamic = "force-dynamic";

export default function AutomationPage() {
  return (
    <>
      <AutoRefresh intervalMs={30000} />
      <AutomationClient />
    </>
  );
}
