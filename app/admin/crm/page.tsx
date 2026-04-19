import { Metadata } from "next";
import { CrmClient } from "./crm-client";

export const metadata: Metadata = {
  title: "ARAY CRM — Воронка продаж",
};

export default function CrmPage() {
  return <CrmClient />;
}
