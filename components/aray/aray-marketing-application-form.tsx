"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type FormState = {
  name: string;
  phone: string;
  company: string;
  city: string;
  business: string;
  service: string;
  message: string;
};

const initialForm: FormState = {
  name: "",
  phone: "",
  company: "",
  city: "",
  business: "",
  service: "Маркетинг под ключ",
  message: "",
};

const SERVICE_OPTIONS = [
  "Маркетинг под ключ",
  "Сайт и PWA",
  "SEO и индексация",
  "Реклама и заявки",
  "Брендинг и упаковка",
  "CRM и путь заявки",
];

export function ArayMarketingApplicationForm() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const update = (key: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (form.name.trim().length < 2 || form.phone.replace(/\D/g, "").length < 10) {
      setError("Заполните имя и корректный телефон.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/aray/marketing-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, partner: "Yuva Studio" }),
      });

      if (!response.ok) throw new Error("request failed");
      setSuccess(true);
      setForm(initialForm);
    } catch {
      setError("Не получилось отправить заявку. Попробуйте еще раз или свяжитесь с Yuva Studio напрямую.");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-6 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <h2 className="mt-4 text-2xl font-semibold text-foreground">Заявка отправлена</h2>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          Заявка попадет в ARAY CRM. Партнерская студия соберет вводные, а команда ARAY/Yuva подготовит следующий шаг.
        </p>
        <Button className="mt-5" onClick={() => setSuccess(false)} type="button">
          Отправить еще одну
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-border/10 bg-card/[0.04] p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="marketing-name" className="mb-1.5 block text-slate-200">
            Имя *
          </Label>
          <Input
            id="marketing-name"
            value={form.name}
            onChange={(event) => update("name", event.target.value)}
            placeholder="Ваше имя"
            autoComplete="name"
            className="border-border/10 bg-background/20 text-foreground placeholder:text-slate-500"
          />
        </div>
        <div>
          <Label htmlFor="marketing-phone" className="mb-1.5 block text-slate-200">
            Телефон *
          </Label>
          <Input
            id="marketing-phone"
            value={form.phone}
            onChange={(event) => update("phone", event.target.value)}
            placeholder="+7 999 000-00-00"
            autoComplete="tel"
            className="border-border/10 bg-background/20 text-foreground placeholder:text-slate-500"
          />
        </div>
        <div>
          <Label htmlFor="marketing-company" className="mb-1.5 block text-slate-200">
            Компания
          </Label>
          <Input
            id="marketing-company"
            value={form.company}
            onChange={(event) => update("company", event.target.value)}
            placeholder="Название бизнеса"
            autoComplete="organization"
            className="border-border/10 bg-background/20 text-foreground placeholder:text-slate-500"
          />
        </div>
        <div>
          <Label htmlFor="marketing-city" className="mb-1.5 block text-slate-200">
            Город / регион
          </Label>
          <Input
            id="marketing-city"
            value={form.city}
            onChange={(event) => update("city", event.target.value)}
            placeholder="Москва, Краснодар, Ереван..."
            className="border-border/10 bg-background/20 text-foreground placeholder:text-slate-500"
          />
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="marketing-business" className="mb-1.5 block text-slate-200">
            Сфера бизнеса
          </Label>
          <Input
            id="marketing-business"
            value={form.business}
            onChange={(event) => update("business", event.target.value)}
            placeholder="магазин, клиника, производство..."
            className="border-border/10 bg-background/20 text-foreground placeholder:text-slate-500"
          />
        </div>
        <div>
          <Label htmlFor="marketing-service" className="mb-1.5 block text-slate-200">
            Что интересно
          </Label>
          <select
            id="marketing-service"
            value={form.service}
            onChange={(event) => update("service", event.target.value)}
            className="h-10 w-full rounded-xl border border-border/10 bg-background/20 px-3 text-sm text-foreground outline-none transition focus:border-border focus:ring-2 focus:ring-[hsl(var(--primary))]/20"
          >
            {SERVICE_OPTIONS.map((service) => (
              <option key={service} value={service} className="bg-card text-foreground">
                {service}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4">
        <Label htmlFor="marketing-message" className="mb-1.5 block text-slate-200">
          Что хотите улучшить
        </Label>
        <textarea
          id="marketing-message"
          value={form.message}
          onChange={(event) => update("message", event.target.value)}
          rows={4}
          placeholder="Расскажите о бизнесе, целях, сайте, рекламе, проблемах и желаемом результате"
          className="w-full resize-none rounded-xl border border-border/10 bg-background/20 px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-border focus:ring-2 focus:ring-[hsl(var(--primary))]/20 placeholder:text-slate-500"
        />
      </div>

      {error && <p className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p>}

      <Button type="submit" size="lg" className="mt-5 h-12 w-full bg-card text-foreground hover:bg-card" disabled={submitting}>
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        Отправить заявку в ARAY CRM
      </Button>
      <p className="mt-3 text-center text-xs leading-5 text-slate-400">
        Стоимость пилотного пакета: 150 000 ₽ в месяц. Внутренняя партнерская экономика клиенту не показывается.
      </p>
    </form>
  );
}
