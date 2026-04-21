"use client";

import { useState } from "react";
import { CheckCircle, Loader2, Package, Phone } from "lucide-react";
import { PHONE_LINK } from "@/lib/phone-constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SidePanel } from "./side-panel";

interface Props {
  open: boolean;
  onClose: () => void;
  phoneLink?: string;
}

export function PromoQuoteModal({ open, onClose, phoneLink }: Props) {
  const effectivePhone = phoneLink || PHONE_LINK;
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", volume: "", message: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim() || form.name.length < 2) errs.name = "Введите имя";
    if (!form.phone.trim() || form.phone.replace(/\D/g, "").length < 10) errs.phone = "Введите телефон";
    if (!form.volume.trim()) errs.volume = "Укажите примерный объём";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleClose = () => {
    onClose();
    // Сброс после закрытия (чтобы не мигнуло во время анимации выезда)
    setTimeout(() => {
      setSuccess(false);
      setForm({ name: "", phone: "", volume: "", message: "" });
      setErrors({});
    }, 300);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/promo-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone.trim(),
          volume: form.volume.trim(),
          message: form.message.trim(),
          promoType: "volume-discount",
        }),
      });
      if (!res.ok) throw new Error();
      setSuccess(true);
      setTimeout(() => handleClose(), 4000);
    } catch {
      setErrors({ submit: "Ошибка отправки. Позвоните нам напрямую." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SidePanel
      open={open}
      onClose={handleClose}
      title="Рассчитать предложение"
      subtitle="Скажите объём — подготовим цену"
      icon={<Package className="w-4 h-4" strokeWidth={2} />}
      iconTone="bg-brand-green/15 text-brand-green"
    >
      {success ? (
        /* Success state */
        <div className="px-6 py-10 text-center">
          <div className="w-20 h-20 rounded-full bg-brand-green/10 flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="w-10 h-10 text-brand-green" strokeWidth={2} />
          </div>
          <h3 className="font-display font-bold text-2xl mb-3">Заявка принята!</h3>
          <p className="text-muted-foreground mb-6 leading-relaxed">
            Менеджер свяжется с вами в течение 15 минут — рассчитаем лучшее предложение по вашему объёму.
          </p>
          <a
            href={`tel:${effectivePhone}`}
            className="inline-flex items-center gap-2 text-brand-orange font-semibold hover:underline"
          >
            <Phone className="w-4 h-4" strokeWidth={2} />
            Или позвоните прямо сейчас
          </a>
        </div>
      ) : (
        /* Form */
        <form onSubmit={handleSubmit} className="px-5 py-5 space-y-4">
          <div>
            <Label htmlFor="promo-name" className="mb-1.5 block">Ваше имя *</Label>
            <Input
              id="promo-name"
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Иван Иванов"
              autoComplete="name"
            />
            {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
          </div>

          <div>
            <Label htmlFor="promo-phone" className="mb-1.5 block">Телефон *</Label>
            <Input
              id="promo-phone"
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+7 (999) 000-00-00"
              autoComplete="tel"
            />
            {errors.phone && <p className="text-xs text-destructive mt-1">{errors.phone}</p>}
          </div>

          <div>
            <Label htmlFor="promo-volume" className="mb-1.5 block">Примерный объём *</Label>
            <Input
              id="promo-volume"
              type="text"
              value={form.volume}
              onChange={(e) => setForm({ ...form, volume: e.target.value })}
              placeholder="например, 20 м³ обрезной доски"
            />
            {errors.volume && <p className="text-xs text-destructive mt-1">{errors.volume}</p>}
            <p className="text-xs text-muted-foreground mt-1.5">
              В м³, штуках или просто опишите задачу — подскажем сами
            </p>
          </div>

          <div>
            <Label htmlFor="promo-message" className="mb-1.5 block">Комментарий</Label>
            <textarea
              id="promo-message"
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder="Что строите? Сроки? Какие размеры нужны?"
              rows={3}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-base sm:text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
            />
          </div>

          {errors.submit && (
            <p className="text-sm text-destructive text-center">{errors.submit}</p>
          )}

          <Button
            type="submit"
            disabled={submitting}
            className="w-full h-12 text-base font-semibold bg-brand-green hover:bg-brand-green/90 text-white"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Отправляем...
              </>
            ) : (
              "Получить расчёт"
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Отправляя форму, вы соглашаетесь с{" "}
            <a href="/privacy" target="_blank" className="underline hover:text-foreground">
              политикой конфиденциальности
            </a>
          </p>
        </form>
      )}
    </SidePanel>
  );
}
