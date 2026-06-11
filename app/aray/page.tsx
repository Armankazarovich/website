import type { Metadata } from "next";
import { ArayProductionSite } from "@/components/aray/aray-production-site";
import { ArayGlobalAssistant } from "@/components/store/aray-global-assistant";

export const metadata: Metadata = {
  title: "ARAY Production | Сайт, PWA, CRM и маркетинг под ключ",
  description:
    "ARAY Production строит сайты-системы: витрина, PWA-приложение, CRM-заявки, маркетинг, бренд, автоматизация и производство внутри ARAY/Yuva.",
};

export default function ArayPage() {
  return (
    <>
      <ArayProductionSite />
      <ArayGlobalAssistant enabled page="/aray" />
    </>
  );
}
