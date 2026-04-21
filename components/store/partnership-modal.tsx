"use client";

import { useState } from "react";
import {
  CheckCircle,
  Loader2,
  Handshake,
  Building2,
  HardHat,
  TreePine,
  ShoppingBag,
  Wrench,
} from "lucide-react";
import { PHONE_DISPLAY } from "@/lib/phone-constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SidePanel } from "./side-panel";

const PARTNER_TYPES = [
  { icon: HardHat, label: "Строители", desc: "Подрядчики, бригады, застройщики" },
  { icon: TreePine, label: "Банщики и Сауны", desc: "Строительство бань, саун, беседок" },
  { icon: ShoppingBag, label: "Магазины", desc: "Стройматериалы, хозтовары" },
  { icon: Building2, label: "ЖКХ и УК", desc: "Управляющие компании, ТСЖ" },
  { icon: Wrench, label: "Производство", desc: "Мебельные цеха, столярни" },
];

const BENEFITS = [
  "Оптовые цены — скидка от 5% до 20%",
  "Персональный менеджер 24/7",
  "Отсрочка платежа до 30 дней",
  "Приоритетная отгрузка без очереди",
  "Полный пакет документов с НДС",
  "Бесплатный замер и консультация",
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
        body: JSON.stringify(form),
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
      title="Станьте партнёром"
      subtitle="Оптовые условия для бизнеса"
      icon={<Handshake className="w-4 h-4" strokeWidth={2} />}
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
            Наш менеджер свяжется с вами в течение часа для обсуждения условий сотрудничества
          </p>
          <Button onClick={handleClose} className="px-8">
            Закрыть
          </Button>
        </div>
      ) : (
        <div className="px-5 py-5 space-y-6">
          {/* For whom */}
          <div>
            <h3 className="font-display font-semibold text-sm mb-3 text-muted-foreground uppercase tracking-wider">
              Для кого подходит
            </h3>
            <div className="grid grid-cols-2 gap-2.5">
              {PARTNER_TYPES.map(({ icon: Icon, label, desc }) => (
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
              Ваши преимущества
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
                Компания / ИП
              </Label>
              <Input
                id="p-company"
                placeholder='ООО "Стройка" / ИП Иванов'
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
                placeholder="Расскажите о вашем бизнесе, примерных объёмах закупки..."
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
