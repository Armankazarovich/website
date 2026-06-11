"use client";

import { useState } from "react";
import { CalendarCheck, Check, Phone, Send } from "lucide-react";
import { trackArayMetrikaGoal } from "@/lib/aray-metrika-goals";

type ServiceRequestFormProps = {
  serviceTitle: string;
  serviceSlug: string;
  phoneLink?: string;
};

export function ServiceRequestForm({
  serviceTitle,
  serviceSlug,
  phoneLink = "+74993720441",
}: ServiceRequestFormProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!phone.trim()) {
      setError("Укажите телефон");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          message: message.trim(),
          source: "SERVICE",
          serviceTitle,
          serviceSlug,
          preferredDate,
          preferredTime,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Не удалось отправить заявку");
      trackArayMetrikaGoal("aray_lead_sent", {
        source: "service_page",
        service: serviceSlug,
      });
      setDone(true);
    } catch (err: any) {
      setError(err.message || "Ошибка отправки. Позвоните нам напрямую.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-primary/25 bg-primary/10 p-5 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <Check className="h-7 w-7" />
        </div>
        <h2 className="font-display text-xl font-bold">Заявка по услуге отправлена</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
          Мы получили запрос и передали его в CRM. Менеджер свяжется с вами,
          уточнит детали и предложит следующий шаг.
        </p>
        <a
          href={`tel:${phoneLink}`}
          className="mt-5 inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold transition-colors hover:border-primary/35"
        >
          <Phone className="h-4 w-4 text-primary" />
          Позвонить сейчас
        </a>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-border bg-card p-5"
    >
      <div className="mb-5">
        <div className="mb-2 flex items-center gap-2 text-primary">
          <CalendarCheck className="h-4 w-4" />
          <span className="text-xs font-semibold uppercase tracking-[0.16em]">
            Заявка / бронь
          </span>
        </div>
        <h2 className="font-display text-xl font-bold">Обсудить услугу</h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          Укажите телефон и удобное время. Заявка попадёт в CRM с привязкой к
          услуге.
        </p>
      </div>

      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-muted-foreground">
            Имя
          </label>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Как к вам обращаться"
            className="min-h-11 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary/45 focus:ring-2 focus:ring-primary/15"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-muted-foreground">
            Телефон *
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="+7 (999) 000-00-00"
            required
            className="min-h-11 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary/45 focus:ring-2 focus:ring-primary/15"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">
              День
            </label>
            <input
              type="date"
              value={preferredDate}
              onChange={(event) => setPreferredDate(event.target.value)}
              className="min-h-11 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary/45 focus:ring-2 focus:ring-primary/15"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">
              Время
            </label>
            <input
              type="time"
              value={preferredTime}
              onChange={(event) => setPreferredTime(event.target.value)}
              className="min-h-11 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary/45 focus:ring-2 focus:ring-primary/15"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-muted-foreground">
            Комментарий
          </label>
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={4}
            placeholder={`Интересует услуга: ${serviceTitle}`}
            className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary/45 focus:ring-2 focus:ring-primary/15"
          />
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
      >
        <Send className="h-4 w-4" />
        {loading ? "Отправляем..." : "Отправить в CRM"}
      </button>
    </form>
  );
}
