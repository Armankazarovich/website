"use client";

import { useState } from "react";
import {
  CheckCircle,
  Loader2,
  Code2,
  ExternalLink,
  Globe2,
  Megaphone,
  Palette,
  Rocket,
  SearchCheck,
} from "lucide-react";
import { PHONE_DISPLAY } from "@/lib/phone-constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SidePanel } from "./side-panel";

const SERVICE_AREAS = [
  { icon: Globe2, label: "Сайт под ключ", desc: "Главная, каталог, страницы и заявки" },
  { icon: Palette, label: "Дизайн", desc: "Чистая витрина под бренд и нишу" },
  { icon: SearchCheck, label: "SEO", desc: "Структура страниц для поиска" },
  { icon: Megaphone, label: "Реклама", desc: "Подготовка к Яндекс Директ" },
  { icon: Rocket, label: "Запуск", desc: "PWA, фавиконы, формы и аналитика" },
];

const BENEFITS = [
  "Сайт выглядит как готовый бизнес, без технических лишних слов",
  "Каталог, заявки, звонки, SEO и аналитика собираются в одну систему",
  "PWA, фавиконы и иконки приводятся к одному чистому бренду",
  "Можно начать с текущего сайта и постепенно усилить рекламу",
  "Заявка сразу попадает менеджеру, чтобы не терять клиента",
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export function PartnershipModal({ open, onClose }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({ name: "", company: "", phone: "", message: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleClose = () => {
    onClose();
    // Сброс после анимации закрытия
    setTimeout(() => {
      setSuccess(false);
      setForm({ name: "", company: "", phone: "", message: "" });
      setErrors({});
    }, 300);
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim() || form.name.length < 2) errs.name = "Введите имя";
    if (!form.phone.trim() || form.phone.replace(/\D/g, "").length < 10)
      errs.phone = "Введите корректный телефон";
    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      const res = await fetch("/api/partnership", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          sourceTitle: "Разработка сайта — Юва студия",
          leadType: "website-development",
        }),
      });
      if (!res.ok) throw new Error("Ошибка отправки");
      setSuccess(true);
    } catch {
      setErrors({ submit: `Ошибка отправки. Позвоните нам по телефону ${PHONE_DISPLAY}` });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SidePanel
      open={open}
      onClose={handleClose}
      title="Разработка сайта — Юва студия"
      subtitle="Yuva-studia.ru · сайты, каталоги и заявки для бизнеса"
      icon={<Code2 className="w-4 h-4" strokeWidth={2} />}
      iconTone="bg-brand-orange/15 text-brand-orange"
    >
      {success ? (
        /* Success state */
        <div className="px-6 py-10 text-center">
          <div className="w-20 h-20 bg-brand-green/10 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="w-10 h-10 text-brand-green" strokeWidth={2} />
          </div>
          <h3 className="font-display font-bold text-2xl mb-3">Заявка отправлена!</h3>
          <p className="text-muted-foreground mb-6 leading-relaxed">
            Менеджер Юва студии свяжется с вами, уточнит задачу и подскажет следующий шаг.
          </p>
          <Button onClick={handleClose} className="px-8">
            Закрыть
          </Button>
        </div>
      ) : (
        <div className="px-5 py-5 space-y-6">
          {/* Services */}
          <div>
            <h3 className="font-display font-semibold text-sm mb-3 text-muted-foreground uppercase tracking-wider">
              Что можно заказать
            </h3>
            <div className="grid grid-cols-2 gap-2.5">
              {SERVICE_AREAS.map(({ icon: Icon, label, desc }) => (
                <div
                  key={label}
                  className="flex flex-col gap-1.5 p-3 rounded-xl bg-muted/50 border border-border"
                >
                  <Icon className="w-5 h-5 text-brand-orange" strokeWidth={1.75} />
                  <p className="font-medium text-sm leading-tight">{label}</p>
                  <p className="text-xs text-muted-foreground leading-tight">{desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Benefits */}
          <div>
            <h3 className="font-display font-semibold text-sm mb-3 text-muted-foreground uppercase tracking-wider">
              Что входит в запуск
            </h3>
            <div className="space-y-2">
              {BENEFITS.map((b) => (
                <div key={b} className="flex items-start gap-2 text-sm">
                  <CheckCircle
                    className="w-4 h-4 text-brand-green mt-0.5 shrink-0"
                    strokeWidth={2}
                  />
                  <span>{b}</span>
                </div>
              ))}
            </div>
            <a
              href="https://yuva-studia.ru"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
            >
              Открыть сайт Yuva-studia.ru
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 pt-2 border-t border-border">
            <h3 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wider pt-4">
              Оставить заявку
            </h3>
            <div>
              <Label htmlFor="p-name" className="mb-1.5 block">
                Ваше имя *
              </Label>
              <Input
                id="p-name"
                placeholder="Иван Иванов"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                autoComplete="name"
              />
              {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
            </div>
            <div>
              <Label htmlFor="p-company" className="mb-1.5 block">
                Компания или ниша
              </Label>
              <Input
                id="p-company"
                placeholder="Например: пиломатериалы, услуги, спортпит"
                value={form.company}
                onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                autoComplete="organization"
              />
            </div>
            <div>
              <Label htmlFor="p-phone" className="mb-1.5 block">
                Телефон *
              </Label>
              <Input
                id="p-phone"
                type="tel"
                placeholder="+7 (999) 000-00-00"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                autoComplete="tel"
              />
              {errors.phone && <p className="text-xs text-destructive mt-1">{errors.phone}</p>}
            </div>
            <div>
              <Label htmlFor="p-message" className="mb-1.5 block">
                Комментарий
              </Label>
              <textarea
                id="p-message"
                placeholder="Коротко расскажите, какой сайт нужен: каталог, услуги, интернет-магазин, реклама..."
                rows={3}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-base sm:text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                value={form.message}
                onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
              />
            </div>
            {errors.submit && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                {errors.submit}
              </p>
            )}
            <Button
              type="submit"
              size="lg"
              className="w-full h-12 text-base font-semibold"
              disabled={submitting}
            >
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Отправить заявку
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              Нажимая кнопку, вы соглашаетесь с{" "}
              <a href="/privacy" className="underline hover:text-foreground">
                политикой конфиденциальности
              </a>
            </p>
          </form>
        </div>
      )}
    </SidePanel>
  );
}
