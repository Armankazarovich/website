"use client";

import { useState } from "react";
import { CheckCircle2, Download, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type DownloadState = "idle" | "loading" | "done" | "error";

function filenameFromDisposition(disposition: string | null) {
  const match = disposition?.match(/filename="?([^"]+)"?/i);
  return match?.[1] || `pilorus-price-list-${new Date().toISOString().slice(0, 10)}.pdf`;
}

export function PriceListPdfDownload({
  href,
  className,
}: {
  href: string;
  className?: string;
}) {
  const [state, setState] = useState<DownloadState>("idle");

  const download = async () => {
    if (state === "loading") return;
    setState("loading");

    try {
      const response = await fetch(href, { cache: "no-store" });
      if (!response.ok) throw new Error("PDF download failed");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filenameFromDisposition(response.headers.get("Content-Disposition"));
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 2500);

      setState("done");
      window.setTimeout(() => setState("idle"), 1800);
    } catch {
      setState("error");
      window.location.href = href;
      window.setTimeout(() => setState("idle"), 2200);
    }
  };

  const isLoading = state === "loading";

  return (
    <button
      type="button"
      onClick={download}
      disabled={isLoading}
      data-price-list-pdf-download
      className={cn(
        "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-primary/35 bg-primary px-3 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-wait disabled:opacity-80",
        className,
      )}
      aria-live="polite"
      aria-label={isLoading ? "Готовим PDF прайс-лист" : "Скачать PDF прайс-лист"}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : state === "done" ? (
        <CheckCircle2 className="h-4 w-4" />
      ) : (
        <Download className="h-4 w-4" />
      )}
      <span>{isLoading ? "Готовим..." : state === "done" ? "Готово" : "PDF"}</span>
    </button>
  );
}
