"use client";

import { useState } from "react";
import { Link2, Copy, Check, ExternalLink } from "lucide-react";

interface TrackingLinkCardProps {
  orderId: string;
  baseUrl?: string;
}

export function TrackingLinkCard({ orderId, baseUrl }: TrackingLinkCardProps) {
  const [copied, setCopied] = useState(false);

  const fallbackUrl =
    typeof window !== "undefined"
      ? `${window.location.protocol}//${window.location.host}`
      : "https://pilo-rus.ru";

  const siteUrl = (baseUrl || fallbackUrl).replace(/\/$/, "");
  const trackUrl = `${siteUrl}/track/${orderId}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(trackUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const el = document.createElement("textarea");
      el.value = trackUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
      <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
        <Link2 className="w-4 h-4" />
        Ссылка для отслеживания
      </h2>

      <p className="text-xs text-muted-foreground">
        Отправьте клиенту эту ссылку — он увидит статус заказа в реальном времени без входа в систему.
      </p>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex-1 min-w-0 bg-muted rounded-xl px-3 py-2 border border-border">
          <p className="text-xs font-mono text-muted-foreground truncate">{trackUrl}</p>
        </div>

        <button
          onClick={handleCopy}
          className={`inline-flex min-h-11 items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all sm:shrink-0 ${
            copied
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
              : "bg-primary/10 text-primary hover:bg-primary/20"
          }`}
          title="Скопировать ссылку"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5" />
              Скопировано
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              Копировать
            </>
          )}
        </button>

        <a
          href={trackUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-muted text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground sm:shrink-0"
          title="Открыть страницу отслеживания"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Открыть
        </a>
      </div>
    </div>
  );
}
