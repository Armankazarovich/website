import { Metadata } from "next";
import { CrmClient } from "./crm-client";

export const metadata: Metadata = {
  title: "ARAY CRM — Заказы, лиды и заявки",
};

export default function CrmPage() {
  return <CrmClient />;
}
