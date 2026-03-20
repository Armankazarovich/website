"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Eye, EyeOff, User, Mail, Phone, Lock, CheckCircle2 } from "lucide-react";

const schema = z.object({
  name: z.string().min(2, "Введите имя (минимум 2 символа)"),
  email: z.string().email("Введите корректный email"),
  phone: z.string().optional(),
  password: z.string().min(6, "Минимум 6 символов"),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Пароли не совпадают",
  path: ["confirmPassword"],
});

type Form = z.infer<typeof schema>;

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  let d = digits;
  if (d[0] === "8") d = "7" + d.slice(1);
  if (d[0] !== "7") d = "7" + d;
  d = d.slice(0, 11);

  let result = "+7";
  if (d.length > 1) result += " (" + d.slice(1, 4);
  if (d.length > 4) result += ") " + d.slice(4, 7);
  if (d.length > 7) result += "-" + d.slice(7, 9);
  if (d.length > 9) result += "-" + d.slice(9, 11);
  return result;
}

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [phoneValue, setPhoneValue] = useState("");
  const [success, setSuccess] = useState(false);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
  });

  const handlePhoneInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setPhoneValue(formatted);
    setValue("phone", formatted);
  };

  const onSubmit = async (data: Form) => {
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.name,
        email: data.email,
        phone: data.phone || undefined,
        password: data.password,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "Ошибка регистрации");
      setLoading(false);
    } else {
      setSuccess(true);
      setTimeout(() => router.push("/login?registered=1"), 1500);
    }
  };

  if (success) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/30 px-4 py-12">
        <div className="text-center">
          <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
          <h2 className="font-display font-bold text-2xl mb-2">Аккаунт создан!</h2>
          <p className="text-muted-foreground">Переходим на страницу входа…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center bg-muted/30 px-4 py-12">
      <div className="w-full max-w-sm">

        {/* Заголовок */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 mb-4">
            <User className="w-7 h-7 text-primary" />
          </div>
          <h1 className="font-display font-bold text-2xl">Создать аккаунт</h1>
          <p className="text-muted-foreground text-sm mt-1">Быстрая регистрация в ПилоРус</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" autoComplete="on">

          {/* Имя */}
          <div>
            <Label htmlFor="name" className="text-sm font-medium mb-1.5 block">Ваше имя</Label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                <User className="w-4 h-4" />
              </div>
              <Input
                id="name"
                autoComplete="name"
                placeholder="Иван Петров"
                className="pl-10 h-12 rounded-xl border-border/60 focus:border-primary"
                {...register("name")}
              />
            </div>
            {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
          </div>

          {/* Телефон */}
          <div>
            <Label htmlFor="phone" className="text-sm font-medium mb-1.5 block">
              Телефон <span className="text-muted-foreground font-normal">(для отслеживания заказов)</span>
            </Label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                <Phone className="w-4 h-4" />
              </div>
              <Input
                id="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="+7 (999) 000-00-00"
                value={phoneValue}
                onChange={handlePhoneInput}
                className="pl-10 h-12 rounded-xl border-border/60 focus:border-primary"
              />
            </div>
            {errors.phone && <p className="text-xs text-destructive mt-1">{errors.phone.message}</p>}
          </div>

          {/* Email */}
          <div>
            <Label htmlFor="email" className="text-sm font-medium mb-1.5 block">Email</Label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                <Mail className="w-4 h-4" />
              </div>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="ivan@example.com"
                className="pl-10 h-12 rounded-xl border-border/60 focus:border-primary"
                {...register("email")}
              />
            </div>
            {errors.email && <p className="text-xs text-destructive mt-1">{errors.email.message}</p>}
          </div>

          {/* Пароль */}
          <div>
            <Label htmlFor="password" className="text-sm font-medium mb-1.5 block">Пароль</Label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                <Lock className="w-4 h-4" />
              </div>
              <Input
                id="password"
                type={showPass ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Минимум 6 символов"
                className="pl-10 pr-10 h-12 rounded-xl border-border/60 focus:border-primary"
                {...register("password")}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && <p className="text-xs text-destructive mt-1">{errors.password.message}</p>}
          </div>

          {/* Повторите пароль */}
          <div>
            <Label htmlFor="confirmPassword" className="text-sm font-medium mb-1.5 block">Повторите пароль</Label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                <Lock className="w-4 h-4" />
              </div>
              <Input
                id="confirmPassword"
                type={showConfirm ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Повторите пароль"
                className="pl-10 pr-10 h-12 rounded-xl border-border/60 focus:border-primary"
                {...register("confirmPassword")}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.confirmPassword && <p className="text-xs text-destructive mt-1">{errors.confirmPassword.message}</p>}
          </div>

          {/* Ошибка */}
          {error && (
            <div className="bg-destructive/8 border border-destructive/20 rounded-xl px-4 py-3">
              <p className="text-sm text-destructive text-center">{error}</p>
            </div>
          )}

          {/* Кнопка */}
          <Button
            type="submit"
            className="w-full h-12 rounded-xl text-base font-semibold"
            disabled={loading}
          >
            {loading
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Создаём аккаунт…</>
              : "Зарегистрироваться"
            }
          </Button>

          {/* Соглашение */}
          <p className="text-xs text-muted-foreground text-center leading-relaxed">
            Регистрируясь, вы соглашаетесь с{" "}
            <Link href="/privacy" className="text-primary hover:underline">
              политикой конфиденциальности
            </Link>
          </p>
        </form>

        {/* Разделитель */}
        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground">или</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Вход */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Уже есть аккаунт?{" "}
            <Link href="/login" className="text-primary font-semibold hover:underline">
              Войти
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}
