import { Metadata } from "next";
import { CrmClient } from "./crm-client";

export const metadata: Metadata = {
  title: "CRM — Воронка продаж | ПилоРус Админ",
};

export default function CrmPage() {
  return <CrmClient />;
}
