"use client";

import { useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArayEmbeddedMessenger,
  type ArayEmbeddedMessengerContext,
  type ArayEmbeddedMessengerPrompt,
} from "@/components/store/aray-embedded-messenger";
import { requestArayOpen } from "@/components/store/aray-events";

type AdminMessengerHubClientProps = {
  staffName: string;
};

function normalizeInitialDial(value: string | null) {
  const clean = value?.trim().toUpperCase() || "";
  if (!clean) return "";
  const digits = clean.replace(/\D/g, "");
  if (clean.startsWith("AR") || digits.length < 8) return clean;
  return `AR ${digits.slice(-8, -4)} ${digits.slice(-4, -2)} ${digits.slice(-2)}`;
}

export function AdminMessengerHubClient({ staffName }: AdminMessengerHubClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialSearch = useMemo(() => {
    const addMode = searchParams.get("add")?.trim().toLowerCase();
    const dial = normalizeInitialDial(searchParams.get("dial"));
    if (addMode === "contact") return "__add_contact__";
    if (dial) return `__aray_dial__:${dial}`;
    return searchParams.get("q") || searchParams.get("search") || "";
  }, [searchParams]);

  const initialLeadId = useMemo(
    () => searchParams.get("leadId") || searchParams.get("threadId") || "",
    [searchParams],
  );

  const openMainAray = useCallback(() => {
    requestArayOpen("open");
    router.push("/admin");
  }, [router]);

  const askAray = useCallback((payload: ArayEmbeddedMessengerPrompt) => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent("aray:prompt", { detail: payload }));
  }, []);

  const syncArayContext = useCallback((context: ArayEmbeddedMessengerContext | null) => {
    if (typeof window === "undefined" || !context) return;
    window.dispatchEvent(new CustomEvent("aray:context", { detail: context }));
  }, []);

  return (
    <ArayEmbeddedMessenger
      staffName={staffName}
      onAskAray={askAray}
      onContextChange={syncArayContext}
      onBack={openMainAray}
      initialSearch={initialSearch}
      initialLeadId={initialLeadId}
    />
  );
}
