"use client";

import { ChevronRight, MessageCircle, Sparkles } from "lucide-react";
import { ARAY_ICON_TONE } from "@/lib/aray-design-tokens";

interface DashboardArayAdviceProps {
  label?: string;
  title: string;
  text: string;
  prompt: string;
}

export function DashboardArayAdvice({ label = "ARAY совет дня", title, text, prompt }: DashboardArayAdviceProps) {
  const askAray = () => {
    window.dispatchEvent(
      new CustomEvent("aray:prompt", {
        detail: { text: prompt },
      })
    );
  };

  return (
    <button
      type="button"
      data-testid="dashboard-aray-advice"
      onClick={askAray}
      aria-label={`${label}: ${title}`}
      title={`${label}: ${title}`}
      className="admin-liquid-surface admin-liquid-interactive group flex min-h-[84px] w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left min-w-0"
    >
      <span className={`${ARAY_ICON_TONE} flex h-10 w-10 shrink-0 items-center justify-center rounded-xl`}>
        <Sparkles className="h-[18px] w-[18px]" strokeWidth={1.75} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-primary">
          <MessageCircle className="h-3.5 w-3.5" strokeWidth={1.75} />
          {label}
        </span>
        <span className="mt-1 block font-display text-sm font-semibold leading-tight text-foreground">
          {title}
        </span>
        <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
          {text}
        </span>
      </span>
      <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground/45 transition-colors group-hover:text-primary" />
    </button>
  );
}
