"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSession, signOut } from "next-auth/react";
import { signIn } from "next-auth/react";
import { useAccountDrawer } from "@/store/account-drawer";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useTheme } from "next-themes";
import {
  X, User, LogOut, ShoppingBag, Settings, Eye, EyeOff,
  Mail, Lock, Loader2, CheckCircle2, ArrowRight, Phone, Sun, Moon, Palette,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { usePalette, PALETTES } from "@/components/palette-provider";

// ── helpers ──────────────────────────────────────────────────────────────────
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
function isPhone(v: string) { return /^[\d\s\-\+\(\)]{7,}$/.test(v.trim()) && !v.includes("@"); }

// ── Login form ────────────────────────────────────────────────────────────────
const loginSchema = z.object({
  login: z.string().min(1, "Введите телефон или email"),
  password: z.string().min(6, "Минимум 6 символов"),
});
type LoginForm = z.infer<typeof loginSchema>;

function LoginPanel({ onSwitch }: { onSwitch: () => void }) {
  const { setOpen } = useAccountDrawer();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loginValue, setLoginValue] = useState("");
  const [success, setSuccess] = useState(false);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const handleLoginInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    if (isPhone(val)) val = formatPhone(val);
    setLoginValue(val);
    setValue("login", val);
  };

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    setError("");
    const res = await signIn("credentials", {
      redirect: false,
      login: data.login,
      password: data.password,
    });
    setLoading(false);
    if (res?.error) {
      setError("Неверный логин или пароль");
    } else {
      setSuccess(true);
      setTimeout(() => setOpen(false), 800);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Logo area */}
      <div className="flex flex-col items-center pt-8 pb-6 px-6">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
          <User className="w-7 h-7 text-primary" />
        </div>
        <h2 className="font-display font-bold text-xl">Войти в кабинет</h2>
        <p className="text-muted-foreground text-sm mt-1 text-center">Телефон или email + пароль</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex-1 px-5 space-y-4">
        {/* Login */}
        <div>
          <Label className="text-sm font-medium mb-1.5 block">Телефон или Email</Label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
              {isPhone(loginValue) ? <Phone className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
            </div>
            <Input
              value={loginValue}
              onChange={handleLoginInput}
              placeholder="+7 (985) 970-71-33"
              className="pl-10 h-11 rounded-xl border-border/60 focus:border-primary"
              autoComplete="username"
            />
          </div>
          {errors.login && <p className="text-xs text-destructive mt-1">{errors.login.message}</p>}
        </div>

        {/* Password */}
        <div>
          <Label className="text-sm font-medium mb-1.5 block">Пароль</Label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
              <Lock className="w-4 h-4" />
            </div>
            <Input
              type={showPass ? "text" : "password"}
              placeholder="••••••••"
              autoComplete="current-password"
              className="pl-10 pr-10 h-11 rounded-xl border-border/60 focus:border-primary"
              {...register("password")}
            />
            <button type="button" onClick={() => setShowPass(!showPass)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" tabIndex={-1}>
              {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password && <p className="text-xs text-destructive mt-1">{errors.password.message}</p>}
        </div>

        <div className="text-right -mt-2">
          <Link href="/forgot-password" onClick={() => setOpen(false)}
            className="text-xs text-muted-foreground hover:text-primary transition-colors">
            Забыли пароль?
          </Link>
        </div>

        {error && (
          <div className="bg-destructive/8 border border-destructive/20 rounded-xl px-4 py-3">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <Button type="submit" disabled={loading || success} className="w-full h-11 rounded-xl text-base">
          {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Вход…</>
            : success ? <><CheckCircle2 className="w-4 h-4 mr-2" /> Успешно!</>
            : "Войти"}
        </Button>

        <div className="text-center">
          <button type="button" onClick={onSwitch}
            className="text-sm text-muted-foreground hover:text-primary transition-colors">
            Нет аккаунта? <span className="text-primary font-medium">Зарегистрироваться</span>
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Register form ─────────────────────────────────────────────────────────────
const regSchema = z.object({
  name: z.string().min(2, "Введите имя"),
  phone: z.string().optional(),
  email: z.string().email("Неверный email"),
  password: z.string().min(6, "Минимум 6 символов"),
});
type RegForm = z.infer<typeof regSchema>;

function RegisterPanel({ onSwitch }: { onSwitch: () => void }) {
  const { setOpen } = useAccountDrawer();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [phoneValue, setPhoneValue] = useState("");

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<RegForm>({
    resolver: zodResolver(regSchema),
  });

  const handlePhoneInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setPhoneValue(formatted);
    setValue("phone", formatted);
  };

  const onSubmit = async (data: RegForm) => {
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const j = await res.json();
      setError(j.error || "Ошибка регистрации");
      setLoading(false);
      return;
    }
    await signIn("credentials", { redirect: false, login: data.email, password: data.password });
    setLoading(false);
    setOpen(false);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col items-center pt-8 pb-6 px-6">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
          <User className="w-7 h-7 text-primary" />
        </div>
        <h2 className="font-display font-bold text-xl">Создать аккаунт</h2>
        <p className="text-muted-foreground text-sm mt-1 text-center">Быстрая регистрация</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex-1 px-5 space-y-3 overflow-y-auto pb-6">
        <div>
          <Label className="text-sm font-medium mb-1.5 block">Ваше имя</Label>
          <Input placeholder="Иван Петров" className="h-11 rounded-xl border-border/60 focus:border-primary" {...register("name")} />
          {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
        </div>
        <div>
          <Label className="text-sm font-medium mb-1.5 block">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4 pointer-events-none" />
            <Input type="email" placeholder="ivan@mail.ru" autoComplete="email"
              className="pl-10 h-11 rounded-xl border-border/60 focus:border-primary" {...register("email")} />
          </div>
          {errors.email && <p className="text-xs text-destructive mt-1">{errors.email.message}</p>}
        </div>
        <div>
          <Label className="text-sm font-medium mb-1.5 block">Телефон <span className="text-muted-foreground font-normal">(необязательно)</span></Label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4 pointer-events-none" />
            <Input type="tel" placeholder="+7 (985) 000-00-00" value={phoneValue} onChange={handlePhoneInput}
              className="pl-10 h-11 rounded-xl border-border/60 focus:border-primary" />
          </div>
        </div>
        <div>
          <Label className="text-sm font-medium mb-1.5 block">Пароль</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4 pointer-events-none" />
            <Input type={showPass ? "text" : "password"} placeholder="Минимум 6 символов"
              autoComplete="new-password"
              className="pl-10 pr-10 h-11 rounded-xl border-border/60 focus:border-primary" {...register("password")} />
            <button type="button" onClick={() => setShowPass(!showPass)} tabIndex={-1}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
              {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password && <p className="text-xs text-destructive mt-1">{errors.password.message}</p>}
        </div>

        {error && (
          <div className="bg-destructive/8 border border-destructive/20 rounded-xl px-4 py-3">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <Button type="submit" disabled={loading} className="w-full h-11 rounded-xl text-base">
          {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Регистрация…</> : "Зарегистрироваться"}
        </Button>

        <div className="text-center">
          <button type="button" onClick={onSwitch}
            className="text-sm text-muted-foreground hover:text-primary transition-colors">
            Уже есть аккаунт? <span className="text-primary font-medium">Войти</span>
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Logged-in panel ───────────────────────────────────────────────────────────
function ProfilePanel() {
  const { data: session } = useSession();
  const { setOpen } = useAccountDrawer();
  const user = session?.user;

  const menuItems = [
    { href: "/cabinet", icon: ShoppingBag, label: "Мои заказы", desc: "История и статусы" },
    { href: "/cabinet/profile", icon: Settings, label: "Профиль", desc: "Данные и настройки" },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* User info */}
      <div className="px-5 pt-8 pb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shrink-0 shadow-lg shadow-primary/20">
            <span className="font-display font-bold text-white text-xl">
              {user?.name?.[0]?.toUpperCase() ?? "A"}
            </span>
          </div>
          <div className="min-w-0">
            <p className="font-display font-bold text-lg leading-tight truncate">{user?.name ?? "Пользователь"}</p>
            <p className="text-muted-foreground text-sm truncate">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Menu */}
      <div className="flex-1 px-4 space-y-2">
        {menuItems.map((item) => (
          <Link key={item.href} href={item.href} onClick={() => setOpen(false)}
            className="flex items-center gap-4 p-4 rounded-2xl bg-muted/50 hover:bg-muted border border-border/40 hover:border-border transition-all group">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
              <item.icon className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{item.label}</p>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
          </Link>
        ))}
      </div>

      {/* Logout */}
      <div className="px-5 pb-8 pt-4">
        <button
          onClick={() => { signOut({ redirect: false }); setOpen(false); }}
          className="w-full flex items-center justify-center gap-2 h-11 rounded-xl border border-border/60 text-muted-foreground hover:text-destructive hover:border-destructive/30 hover:bg-destructive/5 transition-all text-sm font-medium"
        >
          <LogOut className="w-4 h-4" />
          Выйти из аккаунта
        </button>
      </div>
    </div>
  );
}

// ── Palette footer (shown for all users) ─────────────────────────────────────
function ThemePaletteBar() {
  const { palette, setPalette, enabledIds } = usePalette();
  const { theme, setTheme } = useTheme();
  const visible = PALETTES.filter((p) => enabledIds.includes(p.id));

  return (
    <div className="px-5 py-3 border-t border-border shrink-0">
      <div className="flex items-center gap-2 mb-2">
        <Palette className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Цвет интерфейса</span>
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
        {visible.map((p) => (
          <button
            key={p.id}
            onClick={() => setPalette(p.id)}
            title={p.name}
            className={`w-7 h-7 rounded-full transition-all shrink-0 ${
              palette === p.id
                ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-110"
                : "opacity-60 hover:opacity-100 hover:scale-105"
            }`}
            style={{ background: `linear-gradient(135deg, ${p.sidebar} 50%, ${p.accent} 50%)` }}
          />
        ))}
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          title={theme === "dark" ? "Светлая тема" : "Тёмная тема"}
          className="w-7 h-7 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center transition-all ml-1 shrink-0"
        >
          {theme === "dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
}

// ── Main Drawer ───────────────────────────────────────────────────────────────
export function AccountDrawer() {
  const { open, setOpen } = useAccountDrawer();
  const { status } = useSession();
  const [mode, setMode] = useState<"login" | "register">("login");

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[200] flex justify-end" onClick={() => setOpen(false)}>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 400, damping: 40 }}
            className="relative w-[88vw] max-w-[360px] h-full bg-background border-l border-border shadow-2xl flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                {status === "authenticated" ? "Личный кабинет" : mode === "login" ? "Вход" : "Регистрация"}
              </p>
              <button
                onClick={() => setOpen(false)}
                className="w-8 h-8 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors"
                aria-label="Закрыть"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {status === "loading" && (
                <div className="flex items-center justify-center h-40">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              )}
              {status === "authenticated" && <ProfilePanel />}
              {status === "unauthenticated" && (
                mode === "login"
                  ? <LoginPanel onSwitch={() => setMode("register")} />
                  : <RegisterPanel onSwitch={() => setMode("login")} />
              )}
            </div>

            {/* Theme palette — always visible */}
            <ThemePaletteBar />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
