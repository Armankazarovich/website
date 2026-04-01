"use client";

import { useState } from "react";
import { Link2, Copy, Check, ExternalLink } from "lucide-react";

interface TrackingLinkCardProps {
  orderId: string;
}

export function TrackingLinkCard({ orderId }: TrackingLinkCardProps) {
  const [copied, setCopied] = useState(false);

  const siteUrl =
    typeof window !== "undefined"
      ? `${window.location.protocol}//${window.location.host}`
      : process.env.NEXTAUTH_URL ?? "https://pilo-rus.ru";

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

      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0 bg-muted rounded-xl px-3 py-2 border border-border">
          <p className="text-xs font-mono text-muted-foreground truncate">{trackUrl}</p>
        </div>

        <button
          onClick={handleCopy}
          className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
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
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors shrink-0 border border-border"
          title="Открыть страницу отслеживания"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Открыть
        </a>
      </div>
    </div>
  );
}
