import { redirect } from "next/navigation";

export default function HiddenExchangePage() {
  redirect("/admin/orders/new");
}
