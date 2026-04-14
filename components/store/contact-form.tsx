"use client";

import { useState } from "react";
import { Phone } from "lucide-react";

export function ContactForm() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!phone.trim()) { setError("Укажите телефон"); return; }

    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim(), message: message.trim() }),
      });
      if (!res.ok) throw new Error();
      setDone(true);
    } catch {
      setError("Ошибка отправки. Позвоните нам напрямую.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-card rounded-2xl border border-border p-6">
      <h2 className="font-display font-bold text-xl mb-2">Оставить заявку</h2>
      <p className="text-sm text-muted-foreground mb-6">
        Отправьте нам сообщение — перезвоним в течение 15 минут
      </p>

      {done ? (
        <div className="text-center py-10">
          <div className="w-16 h-16 rounded-full bg-brand-green/10 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">✅</span>
          </div>
          <h3 className="font-display font-semibold text-lg mb-2">Заявка отправлена!</h3>
          <p className="text-muted-foreground text-sm">
            Мы перезвоним вам в ближайшее время
          </p>
          <a
            href="tel:+79859707133"
            className="inline-flex items-center gap-2 mt-5 text-brand-orange font-semibold hover:underline text-sm"
          >
            <Phone className="w-4 h-4" /> Или звоните прямо сейчас
          </a>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium block mb-1">Ваше имя</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Иван Иванов"
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Телефон *</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+7 (999) 000-00-00"
              required
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Вопрос или пожелание</label>
            <textarea
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Что вас интересует?"
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60"
          >
            {loading ? "Отправляем..." : "Отправить заявку"}
          </button>

          <a
            href="tel:+79859707133"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
          >
            <Phone className="w-4 h-4 text-brand-orange" />
            Позвонить сейчас
          </a>
        </form>
      )}
    </div>
  );
}
