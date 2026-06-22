import { Metadata } from "next";
import { CrmClient } from "./crm-client";

export const metadata: Metadata = {
  title: "ПилоРус CRM — Заказы, лиды и заявки",
};

export default function CrmPage() {
  return <CrmClient />;
}
