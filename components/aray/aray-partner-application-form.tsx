"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type FormState = {
  name: string;
  company: string;
  phone: string;
  city: string;
  channels: string;
  message: string;
};

const initialForm: FormState = {
  name: "",
  company: "",
  phone: "",
  city: "",
  channels: "",
  message: "",
};

export function ArayPartnerApplicationForm() {
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
      const message = [
        "ARAY partner application",
        form.city ? `Город / регион: ${form.city}` : null,
        form.channels ? `Каналы и аудитория: ${form.channels}` : null,
        form.message ? `Комментарий: ${form.message}` : null,
      ]
        .filter(Boolean)
        .join("\n");

      const response = await fetch("/api/partnership", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          company: form.company,
          phone: form.phone,
          message,
        }),
      });

      if (!response.ok) throw new Error("request failed");
      setSuccess(true);
      setForm(initialForm);
    } catch {
      setError("Не получилось отправить заявку. Попробуйте еще раз или свяжитесь с ARAY напрямую.");
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
          Мы увидим ее в ARAY CRM, проверим регион, формат работы и свяжемся для следующего шага.
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
          <Label htmlFor="aray-partner-name" className="mb-1.5 block text-slate-200">
            Имя *
          </Label>
          <Input
            id="aray-partner-name"
            value={form.name}
            onChange={(event) => update("name", event.target.value)}
            placeholder="Ваше имя"
            autoComplete="name"
            className="border-border/10 bg-background/20 text-foreground placeholder:text-slate-500"
          />
        </div>
        <div>
          <Label htmlFor="aray-partner-phone" className="mb-1.5 block text-slate-200">
            Телефон *
          </Label>
          <Input
            id="aray-partner-phone"
            value={form.phone}
            onChange={(event) => update("phone", event.target.value)}
            placeholder="+7 999 000-00-00"
            autoComplete="tel"
            className="border-border/10 bg-background/20 text-foreground placeholder:text-slate-500"
          />
        </div>
        <div>
          <Label htmlFor="aray-partner-company" className="mb-1.5 block text-slate-200">
            Компания / ИП
          </Label>
          <Input
            id="aray-partner-company"
            value={form.company}
            onChange={(event) => update("company", event.target.value)}
            placeholder="ИП, ООО или личный бренд"
            autoComplete="organization"
            className="border-border/10 bg-background/20 text-foreground placeholder:text-slate-500"
          />
        </div>
        <div>
          <Label htmlFor="aray-partner-city" className="mb-1.5 block text-slate-200">
            Город / регион
          </Label>
          <Input
            id="aray-partner-city"
            value={form.city}
            onChange={(event) => update("city", event.target.value)}
            placeholder="Москва, Краснодар, Ереван..."
            className="border-border/10 bg-background/20 text-foreground placeholder:text-slate-500"
          />
        </div>
      </div>

      <div className="mt-4">
        <Label htmlFor="aray-partner-channels" className="mb-1.5 block text-slate-200">
          Каналы и аудитория
        </Label>
        <Input
          id="aray-partner-channels"
          value={form.channels}
          onChange={(event) => update("channels", event.target.value)}
          placeholder="Блог, клиенты, городская база, продажи, связи"
          className="border-border/10 bg-background/20 text-foreground placeholder:text-slate-500"
        />
      </div>

      <div className="mt-4">
        <Label htmlFor="aray-partner-message" className="mb-1.5 block text-slate-200">
          Комментарий
        </Label>
        <textarea
          id="aray-partner-message"
          value={form.message}
          onChange={(event) => update("message", event.target.value)}
          rows={4}
          placeholder="Расскажите, почему хотите стать партнером ARAY и кого сможете приводить"
          className="w-full resize-none rounded-xl border border-border/10 bg-background/20 px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-border focus:ring-2 focus:ring-[hsl(var(--primary))]/20 placeholder:text-slate-500"
        />
      </div>

      {error && <p className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p>}

      <Button type="submit" size="lg" className="mt-5 h-12 w-full bg-card text-foreground hover:bg-card" disabled={submitting}>
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        Отправить в ARAY CRM
      </Button>
      <p className="mt-3 text-center text-xs leading-5 text-slate-400">
        После заявки мы проверяем регион, юридический статус и готовность работать по правилам ARAY/Yuva.
      </p>
    </form>
  );
}
