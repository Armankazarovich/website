"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSession, signOut, signIn } from "next-auth/react";
import { useAccountDrawer } from "@/store/account-drawer";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useTheme } from "next-themes";
import {
  X, User, LogOut, ShoppingBag, Settings, Eye, EyeOff,
  Mail, Lock, Loader2, CheckCircle2, ArrowRight, Phone, Sun, Moon, Palette,
  Heart, Bell, Gift, Image as ImageIcon, Clock, BookmarkPlus,
  Sparkles, LayoutDashboard, PackagePlus, CalendarCheck, Star, Truck,
  LifeBuoy, MapPin,
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

const STAFF_ROLES = ["SUPER_ADMIN", "ADMIN", "MANAGER", "COURIER", "ACCOUNTANT", "WAREHOUSE", "SELLER"];
const ADMIN_ROLES = ["SUPER_ADMIN", "ADMIN", "MANAGER"];
const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Супер-админ",
  ADMIN: "Администратор",
  MANAGER: "Менеджер",
  COURIER: "Курьер",
  ACCOUNTANT: "Бухгалтер",
  WAREHOUSE: "Склад",
  SELLER: "Продавец",
  USER: "Клиент",
};

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
      <div className="flex flex-col items-center pt-8 pb-6 px-6">
        <div className="w-14 h-14 rounded-2xl arayglass arayglass-glow flex items-center justify-center mb-3">
          <User className="w-7 h-7 text-primary" />
        </div>
        <h2 className="font-display font-bold text-xl text-foreground">Войти в кабинет</h2>
        <p className="text-muted-foreground text-sm mt-1 text-center">Телефон или email + пароль</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex-1 px-5 space-y-4">
        <div>
          <Label className="text-sm font-medium mb-1.5 block text-foreground">Телефон или Email</Label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
              {isPhone(loginValue) ? <Phone className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
            </div>
            <Input
              value={loginValue}
              onChange={handleLoginInput}
              placeholder="+7 (985) 067-08-88"
              className="pl-10 h-11 rounded-xl"
              autoComplete="username"
            />
          </div>
          {errors.login && <p className="text-xs text-destructive mt-1">{errors.login.message}</p>}
        </div>

        <div>
          <Label className="text-sm font-medium mb-1.5 block text-foreground">Пароль</Label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
              <Lock className="w-4 h-4" />
            </div>
            <Input
              type={showPass ? "text" : "password"}
              placeholder="••••••••"
              autoComplete="current-password"
              className="pl-10 pr-10 h-11 rounded-xl"
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
          <div className="bg-destructive/10 border border-destructive/30 rounded-xl px-4 py-3">
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
        <div className="w-14 h-14 rounded-2xl arayglass arayglass-glow flex items-center justify-center mb-3">
          <User className="w-7 h-7 text-primary" />
        </div>
        <h2 className="font-display font-bold text-xl text-foreground">Создать аккаунт</h2>
        <p className="text-muted-foreground text-sm mt-1 text-center">Быстрая регистрация</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex-1 px-5 space-y-3 overflow-y-auto pb-6">
        <div>
          <Label className="text-sm font-medium mb-1.5 block text-foreground">Ваше имя</Label>
          <Input placeholder="Иван Петров" className="h-11 rounded-xl" {...register("name")} />
          {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
        </div>
        <div>
          <Label className="text-sm font-medium mb-1.5 block text-foreground">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4 pointer-events-none" />
            <Input type="email" placeholder="ivan@mail.ru" autoComplete="email"
              className="pl-10 h-11 rounded-xl" {...register("email")} />
          </div>
          {errors.email && <p className="text-xs text-destructive mt-1">{errors.email.message}</p>}
        </div>
        <div>
          <Label className="text-sm font-medium mb-1.5 block text-foreground">
            Телефон <span className="text-muted-foreground font-normal">(необязательно)</span>
          </Label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4 pointer-events-none" />
            <Input type="tel" placeholder="+7 (985) 000-00-00" value={phoneValue} onChange={handlePhoneInput}
              className="pl-10 h-11 rounded-xl" />
          </div>
        </div>
        <div>
          <Label className="text-sm font-medium mb-1.5 block text-foreground">Пароль</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4 pointer-events-none" />
            <Input type={showPass ? "text" : "password"} placeholder="Минимум 6 символов"
              autoComplete="new-password"
              className="pl-10 pr-10 h-11 rounded-xl" {...register("password")} />
            <button type="button" onClick={() => setShowPass(!showPass)} tabIndex={-1}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
              {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password && <p className="text-xs text-destructive mt-1">{errors.password.message}</p>}
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-xl px-4 py-3">
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

// ── Menu item (общий для всех разделов) ───────────────────────────────────────
type MenuItem = {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  desc?: string;
  soon?: boolean;
  external?: boolean;
};

function MenuRow({ item, onClick }: { item: MenuItem; onClick: () => void }) {
  const Icon = item.icon;
  const content = (
    <div className="flex items-center gap-3 p-3 rounded-2xl arayglass arayglass-shimmer transition-colors">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-primary/20 bg-primary/10">
        <Icon className="w-5 h-5 text-primary arayglass-icon" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-foreground flex items-center gap-2">
          {item.label}
          {item.soon && (
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border border-border rounded-full px-1.5 py-0.5">
              скоро
            </span>
          )}
        </p>
        {item.desc && <p className="text-xs text-muted-foreground truncate">{item.desc}</p>}
      </div>
      <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
    </div>
  );

  if (item.soon) {
    return (
      <button onClick={onClick} className="w-full text-left opacity-55 cursor-not-allowed" disabled aria-disabled>
        {content}
      </button>
    );
  }

  return (
    <Link href={item.href} onClick={onClick} className="block">
      {content}
    </Link>
  );
}

// ── Logged-in panel ───────────────────────────────────────────────────────────
function ProfilePanel() {
  const { data: session } = useSession();
  const { setOpen } = useAccountDrawer();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const user = session?.user;
  const role = (user?.role as string) || "USER";
  const isStaff = STAFF_ROLES.includes(role);
  const isAdmin = ADMIN_ROLES.includes(role);

  // Подгружаем свежий avatarUrl (JWT устаревает)
  useEffect(() => {
    let active = true;
    fetch("/api/cabinet/profile", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!active || !d) return;
        if (d.user?.avatarUrl) setAvatarUrl(d.user.avatarUrl);
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const close = () => setOpen(false);

  // Разделы клиентской CRM (видят все авторизованные)
  const clientSections: MenuItem[] = [
    { href: "/cabinet", icon: ShoppingBag, label: "Мои заказы", desc: "История и статусы" },
    { href: "/cabinet/tracking", icon: Truck, label: "Отслеживание", desc: "Живой трекинг доставки", soon: true },
    { href: "/wishlist", icon: Heart, label: "Избранное", desc: "Сохранённые товары" },
    { href: "/cabinet/reviews", icon: Star, label: "Мои отзывы", desc: "Рейтинги и ответы магазина" },
    { href: "/cabinet/notifications", icon: Bell, label: "Уведомления", desc: "Push + email настройки" },
    { href: "/cabinet/addresses", icon: MapPin, label: "Адреса доставки", desc: "Сохранённые адреса", soon: true },
    { href: "/cabinet/bonuses", icon: Gift, label: "Бонусы", desc: "Кешбэк и промокоды", soon: true },
    { href: "/cabinet/profile", icon: Settings, label: "Профиль", desc: "Данные и пароль" },
    { href: "/cabinet/media", icon: ImageIcon, label: "Медиабиблиотека", desc: "Фото и документы" },
    { href: "/cabinet/subscriptions", icon: BookmarkPlus, label: "Подписки", desc: "Магазины и бренды" },
    { href: "/cabinet/history", icon: Clock, label: "История действий", desc: "Просмотры и заказы" },
    { href: "/cabinet/appearance", icon: Palette, label: "Оформление", desc: "Палитра, тема, шрифт" },
    { href: "/contacts", icon: LifeBuoy, label: "Помощь", desc: "Связь с магазином" },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* User info card */}
      <div className="px-4 pt-5 pb-4">
        <div className="flex items-center gap-3 p-3 rounded-2xl arayglass arayglass-glow">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={user?.name ?? "avatar"}
              className="w-12 h-12 rounded-2xl object-cover shrink-0 border border-primary/30"
              onError={() => setAvatarUrl(null)}
            />
          ) : (
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shrink-0 shadow-lg shadow-primary/20">
              <span className="font-display font-bold text-white text-lg">
                {user?.name?.[0]?.toUpperCase() ?? "A"}
              </span>
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="font-display font-bold text-base leading-tight truncate text-foreground">
              {user?.name ?? "Пользователь"}
            </p>
            <p className="text-muted-foreground text-xs truncate">{user?.email}</p>
            <span className="inline-flex items-center arayglass-badge mt-1.5 text-primary">
              {ROLE_LABELS[role] ?? role}
            </span>
          </div>
        </div>
      </div>

      {/* Staff quick actions (только для сотрудников) */}
      {isStaff && (
        <div className="px-4 pb-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2 px-1">
            Быстрые действия
          </p>
          <div className="grid grid-cols-3 gap-2">
            <Link href="/admin" onClick={close}
              className="flex flex-col items-center gap-1 p-2.5 rounded-xl arayglass arayglass-shimmer">
              <LayoutDashboard className="w-4 h-4 text-primary" />
              <span className="text-[11px] text-foreground text-center leading-tight">Админка</span>
            </Link>
            {isAdmin ? (
              <Link href="/admin/orders/new" onClick={close}
                className="flex flex-col items-center gap-1 p-2.5 rounded-xl arayglass arayglass-shimmer">
                <PackagePlus className="w-4 h-4 text-primary" />
                <span className="text-[11px] text-foreground text-center leading-tight">Новый заказ</span>
              </Link>
            ) : (
              <Link href="/admin/orders" onClick={close}
                className="flex flex-col items-center gap-1 p-2.5 rounded-xl arayglass arayglass-shimmer">
                <ShoppingBag className="w-4 h-4 text-primary" />
                <span className="text-[11px] text-foreground text-center leading-tight">Заказы</span>
              </Link>
            )}
            <Link href="/admin/delivery" onClick={close}
              className="flex flex-col items-center gap-1 p-2.5 rounded-xl arayglass arayglass-shimmer">
              <CalendarCheck className="w-4 h-4 text-primary" />
              <span className="text-[11px] text-foreground text-center leading-tight">Доставка</span>
            </Link>
          </div>
        </div>
      )}

      {/* Разделы */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2 px-1">
          {isStaff ? "Личное" : "Мой кабинет"}
        </p>
        <div className="space-y-1.5">
          {clientSections.map((item) => (
            <MenuRow key={item.href} item={item} onClick={close} />
          ))}
        </div>
      </div>

      {/* ARAY Лаб баннер — только для staff */}
      {isStaff && (
        <div className="px-4 pt-2">
          <Link
            href="/admin"
            onClick={close}
            className="relative block p-3 rounded-2xl arayglass arayglass-shimmer overflow-hidden group"
            style={{
              boxShadow: "0 0 24px hsl(var(--primary) / 0.15), inset 0 1px 0 hsl(var(--primary) / 0.12)",
            }}
          >
            <div className="relative z-10 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center border border-primary/40 bg-primary/15 shrink-0">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground leading-tight">
                  Лаборатория маркетинга ARAY
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">
                  Дашборд, аналитика, инструменты
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-primary shrink-0 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>
        </div>
      )}

      {/* Logout */}
      <div className="px-4 pt-3 pb-4">
        <button
          onClick={() => { signOut({ redirect: false }); close(); }}
          className="w-full flex items-center justify-center gap-2 h-11 rounded-xl arayglass arayglass-shimmer text-muted-foreground hover:text-destructive transition-colors text-sm font-medium"
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
    <div className="px-4 py-3 border-t border-primary/10 shrink-0">
      <div className="flex items-center gap-2 mb-2">
        <Palette className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest">
          Цвет интерфейса
        </span>
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
        {visible.map((p) => (
          <button
            key={p.id}
            onClick={() => setPalette(p.id)}
            title={p.name}
            aria-label={`Палитра ${p.name}`}
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
          aria-label="Переключить тему"
          className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 hover:bg-primary/20 flex items-center justify-center transition-all ml-1 shrink-0"
        >
          {theme === "dark" ? <Sun className="w-3.5 h-3.5 text-primary" /> : <Moon className="w-3.5 h-3.5 text-primary" />}
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
            className="relative w-[92vw] max-w-[380px] h-full bg-background border-l border-primary/15 shadow-2xl flex flex-col overflow-hidden"
            style={{
              backdropFilter: "blur(24px) saturate(180%)",
              WebkitBackdropFilter: "blur(24px) saturate(180%)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-primary/10 shrink-0">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.2em]">
                {status === "authenticated" ? "Личный кабинет" : mode === "login" ? "Вход" : "Регистрация"}
              </p>
              <button
                onClick={() => setOpen(false)}
                className="w-8 h-8 rounded-full arayglass arayglass-shimmer flex items-center justify-center transition-colors"
                aria-label="Закрыть"
              >
                <X className="w-4 h-4 text-foreground" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden flex flex-col">
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
