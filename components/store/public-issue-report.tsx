"use client";

import { useState } from "react";
import { AlertCircle, Send, X } from "lucide-react";
import { usePathname } from "next/navigation";

export function PublicIssueReport() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [contact, setContact] = useState("");
  const [busy, setBusy] = useState(false);
  const [doneCode, setDoneCode] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function submit() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/support/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Сообщение об ошибке на сайте",
          message,
          contact,
          page: typeof window !== "undefined" ? window.location.href : pathname,
          device: typeof navigator !== "undefined" ? navigator.platform : "",
          userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
          viewport: typeof window !== "undefined" ? `${window.innerWidth}x${window.innerHeight}` : "",
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Не получилось отправить");
      setDoneCode(json.code || "принято");
      setMessage("");
      setContact("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не получилось отправить");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setDoneCode(null);
          setError("");
        }}
        className="fixed bottom-[calc(6.4rem+env(safe-area-inset-bottom,0px))] left-3 z-[95] inline-flex h-10 items-center gap-2 rounded-full border border-border/80 bg-background/90 px-3 text-xs font-semibold text-foreground shadow-lg shadow-black/10 backdrop-blur transition-colors hover:border-primary/50 hover:text-primary sm:bottom-5 sm:left-5"
        aria-label="Сообщить об ошибке"
      >
        <AlertCircle className="h-4 w-4 text-primary" />
        Ошибка?
      </button>

      {open && (
        <div className="fixed inset-x-3 bottom-[calc(6.25rem+env(safe-area-inset-bottom,0px))] z-[210] mx-auto max-w-sm rounded-2xl border border-border bg-background p-4 shadow-2xl sm:bottom-20 sm:left-5 sm:right-auto sm:mx-0">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-foreground">Сообщить об ошибке</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Цена, размер, корзина или страница.</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Закрыть"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {doneCode ? (
            <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3 text-sm text-foreground">
              Спасибо, приняли. Номер: <span className="font-bold">{doneCode}</span>
            </div>
          ) : (
            <div className="space-y-2.5">
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value.slice(0, 1200))}
                rows={4}
                placeholder="Что не работает или где цена/размер выглядит неверно?"
                className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
              />
              <input
                value={contact}
                onChange={(event) => setContact(event.target.value.slice(0, 160))}
                placeholder="Телефон или email, если нужен ответ"
                className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
              />
              {error && <p className="text-xs font-medium text-destructive">{error}</p>}
              <button
                type="button"
                onClick={submit}
                disabled={busy || message.trim().length < 5}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? "Отправляем..." : "Отправить"}
                <Send className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
