"use client";

import { useState, useEffect } from "react";
import { X, CheckCircle, Loader2, Handshake, Building2, HardHat, TreePine, ShoppingBag, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  onClose: () => void;
}

export function PartnershipModal({ onClose }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({ name: "", company: "", phone: "", message: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim() || form.name.length < 2) errs.name = "Введите имя";
    if (!form.phone.trim() || form.phone.length < 10) errs.phone = "Введите корректный телефон";
    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
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
      setErrors({ submit: "Ошибка отправки. Позвоните нам по телефону 8-985-970-71-33" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-card rounded-3xl shadow-2xl border border-border">

        {/* Header banner */}
        <div className="relative bg-gradient-to-br from-brand-orange via-brand-orange/90 to-brand-brown px-8 py-8 rounded-t-3xl overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-2 right-8 w-32 h-32 rounded-full border-4 border-white" />
            <div className="absolute -bottom-4 -left-4 w-20 h-20 rounded-full border-4 border-white" />
          </div>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
              <Handshake className="w-5 h-5 text-white" />
            </div>
            <h2 className="font-display font-bold text-2xl text-white">Станьте нашим партнёром</h2>
          </div>
          <p className="text-white/80 text-sm max-w-lg">
            Специальные условия для бизнеса: оптовые цены, персональный менеджер и приоритетная отгрузка
          </p>
        </div>

        <div className="px-8 py-6 space-y-6">

          {success ? (
            /* Success state */
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-brand-green/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-brand-green" />
              </div>
              <h3 className="font-display font-bold text-xl mb-2">Заявка отправлена!</h3>
              <p className="text-muted-foreground mb-6">
                Наш менеджер свяжется с вами в течение часа для обсуждения условий сотрудничества
              </p>
              <Button onClick={onClose} className="px-8">Закрыть</Button>
            </div>
          ) : (
            <>
              {/* For whom */}
              <div>
                <h3 className="font-display font-semibold text-base mb-3">Для кого подходит</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {PARTNER_TYPES.map(({ icon: Icon, label, desc }) => (
                    <div key={label} className="flex flex-col gap-1.5 p-3 rounded-xl bg-muted/50 border border-border">
                      <Icon className="w-5 h-5 text-brand-orange" />
                      <p className="font-medium text-sm leading-tight">{label}</p>
                      <p className="text-xs text-muted-foreground leading-tight">{desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Benefits */}
              <div>
                <h3 className="font-display font-semibold text-base mb-3">Ваши преимущества</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {BENEFITS.map((b) => (
                    <div key={b} className="flex items-start gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-brand-green mt-0.5 shrink-0" />
                      <span>{b}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <h3 className="font-display font-semibold text-base">Оставить заявку</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="p-name">Ваше имя *</Label>
                    <Input
                      id="p-name"
                      placeholder="Иван Иванов"
                      className="mt-1"
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    />
                    {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
                  </div>
                  <div>
                    <Label htmlFor="p-company">Компания / ИП</Label>
                    <Input
                      id="p-company"
                      placeholder='ООО "Стройка" / ИП Иванов'
                      className="mt-1"
                      value={form.company}
                      onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="p-phone">Телефон *</Label>
                  <Input
                    id="p-phone"
                    type="tel"
                    placeholder="+7 (999) 000-00-00"
                    className="mt-1"
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  />
                  {errors.phone && <p className="text-xs text-destructive mt-1">{errors.phone}</p>}
                </div>
                <div>
                  <Label htmlFor="p-message">Комментарий</Label>
                  <textarea
                    id="p-message"
                    placeholder="Расскажите о вашем бизнесе, примерных объёмах закупки..."
                    rows={3}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                    value={form.message}
                    onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                  />
                </div>
                {errors.submit && (
                  <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{errors.submit}</p>
                )}
                <Button type="submit" size="lg" className="w-full" disabled={submitting}>
                  {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Отправить заявку на партнёрство
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  Нажимая кнопку, вы соглашаетесь с{" "}
                  <a href="/privacy" className="underline hover:text-foreground">политикой конфиденциальности</a>
                </p>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
