"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, Send, ShieldCheck } from "lucide-react";

type VendorLeadFormProps = {
  sellerName: string;
  sellerSlug: string;
  phone?: string | null;
};

type FormState = {
  name: string;
  phone: string;
  email: string;
  volume: string;
  deliveryAddress: string;
  message: string;
  website: string;
  legalConsent: boolean;
};

const initialState: FormState = {
  name: "",
  phone: "",
  email: "",
  volume: "",
  deliveryAddress: "",
  message: "",
  website: "",
  legalConsent: false,
};

export function VendorLeadForm({ sellerName, sellerSlug, phone }: VendorLeadFormProps) {
  const [form, setForm] = useState<FormState>(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (key: keyof FormState, value: string | boolean) => {
    setForm((current) => ({ ...current, [key]: value }));
    if (error) setError(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSent(false);

    if (form.name.trim().length < 2) {
      setError("Укажите имя");
      return;
    }
    if (form.phone.trim().length < 6) {
      setError("Укажите телефон");
      return;
    }
    if (!form.legalConsent) {
      setError("Подтвердите согласие на обработку персональных данных");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/vendors/${sellerSlug}/lead`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || data?.ok !== true) {
        throw new Error(typeof data?.error === "string" ? data.error : "Не удалось отправить заявку");
      }
      setForm(initialState);
      setSent(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Не удалось отправить заявку");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="vendor-request" className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-start">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Send className="h-3.5 w-3.5" />
            Запрос продавцу
          </div>
          <h2 className="mt-4 font-display text-2xl font-bold text-foreground">
            Получить предложение от {sellerName}
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Напишите, что нужно купить, какой объем и куда доставить. Менеджер уточнит наличие, цену и удобный срок.
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              Заявка уходит в работу
            </span>
            {phone ? (
              <a href={`tel:${phone.replace(/[^\d+]/g, "")}`} className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1.5 font-semibold text-foreground hover:bg-accent">
                Позвонить сразу
              </a>
            ) : null}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-3">
          <input
            aria-hidden="true"
            tabIndex={-1}
            autoComplete="off"
            value={form.website}
            onChange={(event) => update("website", event.target.value)}
            name="website"
            className="hidden"
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium text-foreground">Имя *</span>
              <input
                value={form.name}
                onChange={(event) => update("name", event.target.value)}
                autoComplete="name"
                placeholder="Как к вам обращаться"
                className="min-h-[44px] rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary"
              />
            </label>
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium text-foreground">Телефон *</span>
              <input
                value={form.phone}
                onChange={(event) => update("phone", event.target.value)}
                autoComplete="tel"
                inputMode="tel"
                placeholder="+7 999 000-00-00"
                className="min-h-[44px] rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary"
              />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium text-foreground">Объем или размеры</span>
              <input
                value={form.volume}
                onChange={(event) => update("volume", event.target.value)}
                placeholder="Например: доска 50x150, 5 м3"
                className="min-h-[44px] rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary"
              />
            </label>
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium text-foreground">Адрес доставки</span>
              <input
                value={form.deliveryAddress}
                onChange={(event) => update("deliveryAddress", event.target.value)}
                placeholder="Город, район или адрес"
                className="min-h-[44px] rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary"
              />
            </label>
          </div>

          <label className="grid gap-1.5 text-sm">
            <span className="font-medium text-foreground">Комментарий</span>
            <textarea
              value={form.message}
              onChange={(event) => update("message", event.target.value)}
              rows={3}
              placeholder="Напишите породу, сорт, срок, самовывоз или доставку"
              className="min-h-[96px] resize-y rounded-xl border border-border bg-background px-3 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary"
            />
          </label>

          <label className="flex items-start gap-2 text-xs leading-5 text-muted-foreground">
            <input
              type="checkbox"
              checked={form.legalConsent}
              onChange={(event) => update("legalConsent", event.target.checked)}
              className="mt-1 h-4 w-4 shrink-0 rounded border-border accent-primary"
            />
            <span>
              Согласен на обработку персональных данных и принимаю{" "}
              <Link href="/privacy" className="font-semibold text-primary hover:underline">
                политику конфиденциальности
              </Link>
            </span>
          </label>

          {error ? (
            <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
              {error}
            </p>
          ) : null}
          {sent ? (
            <p className="inline-flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              Заявка отправлена. Менеджер свяжется с вами и уточнит детали.
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Отправить запрос
          </button>
        </form>
      </div>
    </section>
  );
}
