"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Eye, EyeOff, Phone, Mail, Lock, CheckCircle2 } from "lucide-react";

const schema = z.object({
  login: z.string().min(1, "Введите телефон или email"),
  password: z.string().min(6, "Минимум 6 символов"),
  rememberMe: z.boolean().optional(),
});

type Form = z.infer<typeof schema>;

function isPhone(value: string) {
  return /^[\d\s\-\+\(\)]{7,}$/.test(value.trim()) && !value.includes("@");
}

// Форматируем телефон по мере набора: +7 (985) 970-71-33
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

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [loginValue, setLoginValue] = useState("");
  const [success, setSuccess] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const loginRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { rememberMe: true },
  });

  const handleLoginInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    // Если похоже на телефон — форматируем
    if (isPhone(val) && val.length > 1) {
      val = formatPhone(val);
    }
    setLoginValue(val);
    setValue("login", val);
  };

  const onSubmit = async (data: Form) => {
    setLoading(true);
    setError("");

    const res = await signIn("credentials", {
      login: data.login,
      password: data.password,
      rememberMe: String(rememberMe),
      redirect: false,
    });

    if (res?.error) {
      setError("Неверный телефон/email или пароль");
      setLoading(false);
    } else {
      setSuccess(true);
      router.push("/cabinet");
      router.refresh();
    }
  };

  const inputType = isPhone(loginValue) ? "tel" : "email";

  if (success) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/30 px-4 py-12">
        <div className="text-center">
          <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
          <h2 className="font-display font-bold text-2xl mb-2">Добро пожаловать!</h2>
          <p className="text-muted-foreground">Переходим в личный кабинет…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center bg-muted/30 px-4 py-12">
      <div className="w-full max-w-sm">

        {/* Логотип-заголовок */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-primary">
              <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="font-display font-bold text-2xl">Войти в кабинет</h1>
          <p className="text-muted-foreground text-sm mt-1">ПилоРус — личный кабинет</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" autoComplete="on">

          {/* Телефон или Email */}
          <div>
            <Label htmlFor="login" className="text-sm font-medium mb-1.5 block">
              Телефон или Email
            </Label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                {isPhone(loginValue)
                  ? <Phone className="w-4 h-4" />
                  : <Mail className="w-4 h-4" />
                }
              </div>
              <Input
                ref={loginRef}
                id="login"
                type={inputType}
                inputMode={isPhone(loginValue) ? "tel" : "email"}
                autoComplete={isPhone(loginValue) ? "tel" : "email"}
                placeholder="+7 (999) 000-00-00 или email"
                value={loginValue}
                onChange={handleLoginInput}
                className="pl-10 h-12 rounded-xl border-border/60 focus:border-primary"
              />
            </div>
            {errors.login && (
              <p className="text-xs text-destructive mt-1">{errors.login.message}</p>
            )}
          </div>

          {/* Пароль */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label htmlFor="password" className="text-sm font-medium">Пароль</Label>
              <Link
                href="/forgot-password"
                className="text-xs text-primary hover:underline"
                tabIndex={-1}
              >
                Забыли пароль?
              </Link>
            </div>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                <Lock className="w-4 h-4" />
              </div>
              <Input
                id="password"
                type={showPass ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Ваш пароль"
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
            {errors.password && (
              <p className="text-xs text-destructive mt-1">{errors.password.message}</p>
            )}
          </div>

          {/* Запомнить меня */}
          <button
            type="button"
            onClick={() => setRememberMe(!rememberMe)}
            className="flex items-center gap-3 cursor-pointer group w-full text-left"
          >
            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
              rememberMe
                ? "bg-primary border-primary"
                : "bg-background border-border group-hover:border-primary/60"
            }`}>
              {rememberMe && (
                <svg width="11" height="8" viewBox="0 0 11 8" fill="none">
                  <path d="M1 4L4 7L10 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </div>
            <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
              Запомнить меня на 30 дней
            </span>
          </button>

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
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Входим…</>
              : "Войти"
            }
          </Button>
        </form>

        {/* Разделитель */}
        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground">или</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Регистрация */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Нет аккаунта?{" "}
            <Link href="/register" className="text-primary font-semibold hover:underline">
              Зарегистрироваться
            </Link>
          </p>
          <p className="text-xs text-muted-foreground/60 mt-3 leading-relaxed">
            Войдите чтобы отслеживать заказы,<br />
            сохранять адреса и получать скидки
          </p>
        </div>

      </div>
    </div>
  );
}
