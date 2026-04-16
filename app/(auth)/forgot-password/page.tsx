"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { PHONE_LINK, PHONE_DISPLAY } from "@/lib/phone-constants";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Mail, ArrowLeft, CheckCircle2, KeyRound } from "lucide-react";
import { BackButton } from "@/components/ui/back-button";

const schema = z.object({
  email: z.string().email("Введите корректный email"),
});

type Form = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<Form>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: Form) => {
    setServerError("");
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) {
      setServerError(json.error || "Ошибка сервера");
      return;
    }
    setSent(true);
  };

  return (
    <div className="min-h-[calc(100vh-180px)] flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        <BackButton href="/" label="Главная" />
        {/* Card */}
        <div className="bg-card border border-border rounded-3xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-br from-brand-brown to-brand-brown/80 px-8 py-7">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mb-4">
              <KeyRound className="w-6 h-6 text-white" />
            </div>
            <h1 className="font-display font-bold text-2xl text-white">Забыли пароль?</h1>
            <p className="text-white/60 text-sm mt-1">
              Введите email — пришлём ссылку для восстановления
            </p>
          </div>

          <div className="px-8 py-7">
            {sent ? (
              /* Success state */
              <div className="text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                </div>
                <div>
                  <h2 className="font-display font-bold text-lg mb-2">Письмо отправлено!</h2>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Мы отправили инструкции на{" "}
                    <span className="font-medium text-foreground">{getValues("email")}</span>.
                    Проверьте почту и папку «Спам».
                  </p>
                </div>
                <div className="bg-muted/50 rounded-2xl p-4 text-left">
                  <p className="text-xs text-muted-foreground">
                    💡 Ссылка действительна <strong>1 час</strong>. Если письмо не пришло через 5 минут — попробуйте ещё раз или позвоните нам:{" "}
                    <a href={`tel:${PHONE_LINK}`} className="text-primary hover:underline">{PHONE_DISPLAY}</a>
                  </p>
                </div>
                <div className="flex flex-col gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setSent(false)}
                    className="w-full"
                  >
                    Отправить ещё раз
                  </Button>
                  <Link href="/login">
                    <Button variant="ghost" className="w-full">
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Вернуться ко входу
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              /* Form */
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      autoFocus
                      placeholder="your@email.ru"
                      className="pl-9"
                      {...register("email")}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-destructive text-xs">{errors.email.message}</p>
                  )}
                </div>

                {serverError && (
                  <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
                    {serverError}
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Отправляем...</>
                  ) : (
                    "Отправить ссылку"
                  )}
                </Button>

                <Link href="/login" className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Вернуться ко входу
                </Link>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
