"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Users, ChevronRight, Eye, EyeOff } from "lucide-react";

const ROLES = [
  { value: "MANAGER", label: "Менеджер по продажам" },
  { value: "COURIER", label: "Курьер" },
  { value: "ACCOUNTANT", label: "Бухгалтер" },
  { value: "WAREHOUSE", label: "Складчик" },
  { value: "SELLER", label: "Продавец" },
  { value: "CUSTOM", label: "Другая должность..." },
];

export default function JoinPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
    role: "",
    customRole: "",
  });

  const set = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.name || !form.phone || !form.email || !form.password || !form.role) {
      setError("Пожалуйста, заполните все поля");
      return;
    }
    if (form.role === "CUSTOM" && !form.customRole.trim()) {
      setError("Укажите вашу должность");
      return;
    }
    if (form.password.length < 6) {
      setError("Пароль должен быть не менее 6 символов");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/staff/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка регистрации");
      setDone(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
            <span className="text-3xl">✅</span>
          </div>
          <h1 className="text-xl font-bold">Заявка отправлена!</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Ваша заявка на вступление в команду ПилоРус принята. Администратор получил
            уведомление и рассмотрит её в ближайшее время.
          </p>
          <p className="text-muted-foreground text-sm">
            После подтверждения вы сможете войти по email и паролю.
          </p>
          <Button asChild className="w-full">
            <Link href="/login">Перейти к входу</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="text-center">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <span className="font-display font-bold text-2xl">ПилоРус</span>
          </Link>
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Users className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-xl font-bold">Вступить в команду</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Заявка будет рассмотрена администратором
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <div>
            <Label>Имя и фамилия *</Label>
            <Input
              className="mt-1"
              placeholder="Иван Иванов"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              disabled={loading}
            />
          </div>

          <div>
            <Label>Телефон *</Label>
            <Input
              className="mt-1"
              placeholder="+7 (999) 000-00-00"
              type="tel"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              disabled={loading}
            />
          </div>

          <div>
            <Label>Email *</Label>
            <Input
              className="mt-1"
              placeholder="ivan@example.com"
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              disabled={loading}
            />
          </div>

          <div>
            <Label>Пароль *</Label>
            <div className="relative mt-1">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Минимум 6 символов"
                value={form.password}
                onChange={(e) => set("password", e.target.value)}
                disabled={loading}
                className="pr-10"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <Label>Должность *</Label>
            <select
              className="mt-1 w-full h-10 px-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
              value={form.role}
              onChange={(e) => set("role", e.target.value)}
              disabled={loading}
            >
              <option value="">Выберите должность...</option>
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {form.role === "CUSTOM" && (
            <div>
              <Label>Ваша должность *</Label>
              <Input
                className="mt-1"
                placeholder="Например: Логист, Диспетчер..."
                value={form.customRole}
                onChange={(e) => set("customRole", e.target.value)}
                disabled={loading}
              />
            </div>
          )}

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Отправляю заявку...</>
            ) : (
              <>Отправить заявку <ChevronRight className="w-4 h-4 ml-1" /></>
            )}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Уже есть аккаунт?{" "}
          <Link href="/login" className="text-primary hover:underline font-medium">
            Войти
          </Link>
        </p>
      </div>
    </div>
  );
}
