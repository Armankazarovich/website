"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSession, signOut, signIn } from "next-auth/react";
import { useAccountDrawer } from "@/store/account-drawer";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  X, User, LogOut, ShoppingBag, Settings, Eye, EyeOff,
  Mail, Lock, Loader2, CheckCircle2, ChevronRight, Phone,
  Heart, Bell, Image as ImageIcon, Clock, BookmarkPlus,
  LayoutDashboard, PackagePlus, CalendarCheck, Star, Truck,
  LifeBuoy, Palette,
  Users, Package, BarChart3, Sun, Moon,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { UI_LAYERS } from "@/lib/ui-layers";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";

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

function formatPrice(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(".0", "") + " млн ₽";
  if (n >= 1_000) return Math.round(n / 1000) + " тыс ₽";
  return Math.round(n) + " ₽";
}

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
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-3">
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
              style={{ fontSize: 16 }}
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
              style={{ fontSize: 16 }}
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
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-3">
          <User className="w-7 h-7 text-primary" />
        </div>
        <h2 className="font-display font-bold text-xl text-foreground">Создать аккаунт</h2>
        <p className="text-muted-foreground text-sm mt-1 text-center">Быстрая регистрация</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex-1 px-5 space-y-3 overflow-y-auto pb-6">
        <div>
          <Label className="text-sm font-medium mb-1.5 block text-foreground">Ваше имя</Label>
          <Input placeholder="Иван Петров" className="h-11 rounded-xl" style={{ fontSize: 16 }} {...register("name")} />
          {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
        </div>
        <div>
          <Label className="text-sm font-medium mb-1.5 block text-foreground">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4 pointer-events-none" />
            <Input type="email" placeholder="ivan@mail.ru" autoComplete="email"
              className="pl-10 h-11 rounded-xl" style={{ fontSize: 16 }} {...register("email")} />
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
              className="pl-10 h-11 rounded-xl" style={{ fontSize: 16 }} />
          </div>
        </div>
        <div>
          <Label className="text-sm font-medium mb-1.5 block text-foreground">Пароль</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4 pointer-events-none" />
            <Input type={showPass ? "text" : "password"} placeholder="Минимум 6 символов"
              autoComplete="new-password"
              className="pl-10 pr-10 h-11 rounded-xl" style={{ fontSize: 16 }} {...register("password")} />
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

// ── Section row (Telegram-style: иконка без фона, чистая) ─────────────────────
type RowItem = {
  href: string;
  icon: LucideIcon;
  label: string;
  desc?: string;
  badge?: number | string;
};

function SectionRow({ item, onNavigate, isLast }: { item: RowItem; onNavigate: (href: string) => void; isLast: boolean }) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      onClick={() => onNavigate(item.href)}
      className={`flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors ${isLast ? "" : "border-b border-border"}`}
    >
      <Icon className="w-6 h-6 text-primary shrink-0" strokeWidth={1.75} />
      <div className="flex-1 min-w-0 text-left">
        <p className="text-sm font-medium text-foreground leading-tight">{item.label}</p>
        {item.desc && <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.desc}</p>}
      </div>
      {item.badge !== undefined && item.badge !== 0 && (
        <span className="bg-primary text-primary-foreground text-[11px] font-semibold rounded-full min-w-[22px] h-[22px] inline-flex items-center justify-center px-2 shrink-0">
          {item.badge}
        </span>
      )}
      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
    </button>
  );
}

function SectionGroup({ title, items, onNavigate }: { title: string; items: RowItem[]; onNavigate: (href: string) => void }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground px-1 mb-2">
        {title}
      </p>
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {items.map((item, idx) => (
          <SectionRow
            key={item.href}
            item={item}
            onNavigate={onNavigate}
            isLast={idx === items.length - 1}
          />
        ))}
      </div>
    </div>
  );
}

// ── Quick action card (Tinkoff-style: круглая primary заливка) ────────────────
function QuickActionCard({
  href, icon: Icon, label, onNavigate,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  onNavigate: (href: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onNavigate(href)}
      className="flex flex-col items-center gap-2 bg-card border border-border rounded-2xl p-3 hover:border-primary/40 transition-colors"
    >
      <div className="w-11 h-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5" strokeWidth={2} />
      </div>
      <span className="text-[11px] font-medium text-foreground text-center leading-tight">
        {label}
      </span>
    </button>
  );
}

// ── Logged-in panel ───────────────────────────────────────────────────────────
type ProfileData = {
  name?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  stats?: {
    activeOrders: number;
    finishedOrders: number;
    totalSpent: number;
    reviewsCount: number;
  };
  staffStats?: { todayNewOrders: number; pendingReviews: number } | null;
};

function ProfilePanel() {
  const { data: session } = useSession();
  const { setOpen } = useAccountDrawer();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [data, setData] = useState<ProfileData | null>(null);
  const [mounted, setMounted] = useState(false);
  const user = session?.user;
  const role = ((user as { role?: string })?.role) || "USER";
  const isStaff = STAFF_ROLES.includes(role);
  const isAdmin = ADMIN_ROLES.includes(role);
  const isDark = mounted && theme === "dark";

  useEffect(() => setMounted(true), []);

  // Подгружаем профиль + stats (один fetch)
  useEffect(() => {
    let active = true;
    fetch("/api/cabinet/profile", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!active || !d) return;
        setData(d);
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const close = () => setOpen(false);
  const navigate = (href: string) => {
    router.push(href);
    setOpen(false);
  };
  const stats = data?.stats;
  const staffStats = data?.staffStats;
  const avatarUrl = data?.avatarUrl ?? null;
  const totalOrders = stats ? stats.activeOrders + stats.finishedOrders : 0;
  const initial = (user?.name?.[0] || user?.email?.[0] || "U").toUpperCase();

  // ── Группы разделов (без soon-обещаний) ──

  // Для STAFF — секция "Управление" с админскими разделами
  const managementItems: RowItem[] = isStaff ? [
    {
      href: "/admin/orders",
      icon: ShoppingBag,
      label: "Заказы",
      desc: staffStats?.todayNewOrders
        ? `${staffStats.todayNewOrders} ${pluralOrders(staffStats.todayNewOrders)} сегодня`
        : "Все заказы и статусы",
      badge: staffStats?.todayNewOrders || undefined,
    },
    { href: "/admin/clients", icon: Users, label: "Клиенты", desc: "База покупателей" },
    { href: "/admin/products", icon: Package, label: "Товары", desc: "Каталог и наличие" },
    { href: "/admin/delivery", icon: Truck, label: "Доставка", desc: "Маршруты и тарифы" },
    {
      href: "/admin/reviews",
      icon: Star,
      label: "Отзывы",
      desc: staffStats?.pendingReviews
        ? `${staffStats.pendingReviews} ожидают модерации`
        : "Модерация и ответы",
      badge: staffStats?.pendingReviews || undefined,
    },
    ...(isAdmin ? [
      { href: "/admin/analytics" as const, icon: BarChart3, label: "Аналитика", desc: "Выручка и динамика" },
      { href: "/admin/staff" as const, icon: Users, label: "Команда", desc: "Сотрудники и роли" },
    ] : []),
  ] : [];

  const purchasesItems: RowItem[] = [
    {
      href: "/cabinet/orders",
      icon: ShoppingBag,
      label: "Мои заказы",
      desc: stats
        ? stats.activeOrders > 0
          ? `${stats.activeOrders} в работе · ${stats.finishedOrders} готово`
          : `${stats.finishedOrders} заказов`
        : "История и статусы",
      badge: stats?.activeOrders || undefined,
    },
    { href: "/wishlist", icon: Heart, label: "Избранное", desc: "Сохранённые товары" },
  ];

  const accountItems: RowItem[] = [
    { href: "/cabinet/profile", icon: Settings, label: "Профиль", desc: "Имя, телефон, адрес" },
    {
      href: "/cabinet/reviews",
      icon: Star,
      label: "Мои отзывы",
      desc: stats?.reviewsCount
        ? `${stats.reviewsCount} ${stats.reviewsCount === 1 ? "отзыв" : "отзывов"}`
        : "Оценки и ответы",
    },
    { href: "/cabinet/media", icon: ImageIcon, label: "Медиабиблиотека", desc: "Фото и документы" },
    { href: "/cabinet/subscriptions", icon: BookmarkPlus, label: "Подписки", desc: "Магазины и категории" },
    { href: "/cabinet/history", icon: Clock, label: "История действий", desc: "Просмотры и заказы" },
  ];

  const settingsItems: RowItem[] = [
    { href: "/cabinet/notifications", icon: Bell, label: "Уведомления", desc: "Push и email" },
    { href: "/cabinet/appearance", icon: Palette, label: "Оформление", desc: "Палитра, тема, шрифт" },
    { href: "/contacts", icon: LifeBuoy, label: "Помощь", desc: "Связь с магазином" },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* User card hero — кликабельный, ведёт в профиль */}
      <div className="px-4 pt-4 pb-3">
        <button
          type="button"
          onClick={() => navigate("/cabinet/profile")}
          className="flex items-center gap-3 bg-card border border-border rounded-2xl p-4 hover:border-primary/40 transition-colors"
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={user?.name ?? "avatar"}
              className="w-12 h-12 rounded-full object-cover shrink-0"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 font-semibold text-lg">
              {initial}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm leading-tight truncate text-foreground">
              {user?.name ?? "Пользователь"}
            </p>
            <p className="text-xs text-muted-foreground truncate mt-0.5">{user?.email}</p>
            {!isStaff && stats && totalOrders > 0 && (
              <p className="text-[11px] text-muted-foreground mt-1">
                {totalOrders} {totalOrders === 1 ? "заказ" : totalOrders < 5 ? "заказа" : "заказов"}
                {stats.totalSpent > 0 && ` · ${formatPrice(stats.totalSpent)}`}
              </p>
            )}
            {isStaff && (
              <span className="inline-block mt-1.5 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-medium">
                {ROLE_LABELS[role] ?? role}
              </span>
            )}
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
        </button>
      </div>

      {/* Контент со скроллом */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-4 space-y-5">
        {/* Staff: Quick actions */}
        {isStaff && (
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground px-1 mb-2">
              Быстрые действия
            </p>
            <div className="grid grid-cols-3 gap-2">
              <QuickActionCard
                href="/admin"
                icon={LayoutDashboard}
                label="Админка"
                onNavigate={navigate}
              />
              {isAdmin ? (
                <QuickActionCard
                  href="/admin/orders/new"
                  icon={PackagePlus}
                  label="Новый заказ"
                  onNavigate={navigate}
                />
              ) : (
                <QuickActionCard
                  href="/admin/orders"
                  icon={ShoppingBag}
                  label="Заказы"
                  onNavigate={navigate}
                />
              )}
              <QuickActionCard
                href="/admin/delivery"
                icon={CalendarCheck}
                label="Доставка"
                onNavigate={navigate}
              />
            </div>
          </div>
        )}

        {/* Группы разделов */}
        {isStaff && managementItems.length > 0 && (
          <SectionGroup title="Управление" items={managementItems} onNavigate={navigate} />
        )}
        <SectionGroup title="Покупки" items={purchasesItems} onNavigate={navigate} />
        <SectionGroup title="Аккаунт" items={accountItems} onNavigate={navigate} />
        <SectionGroup title="Настройки" items={settingsItems} onNavigate={navigate} />

        {mounted && (
          <button
            type="button"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="w-full flex items-center gap-3 px-4 py-3 bg-card border border-border rounded-2xl hover:bg-muted/40 transition-colors"
          >
            {isDark ? (
              <Sun className="w-6 h-6 text-primary shrink-0" strokeWidth={1.75} />
            ) : (
              <Moon className="w-6 h-6 text-primary shrink-0" strokeWidth={1.75} />
            )}
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-medium text-foreground leading-tight">
                {isDark ? "Светлая тема" : "Тёмная тема"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                Переключить оформление интерфейса
              </p>
            </div>
          </button>
        )}

        {/* Logout — destructive outline */}
        <button
          onClick={() => { signOut({ redirect: false }); close(); }}
          className="w-full flex items-center justify-center gap-2 h-11 rounded-xl border border-destructive/30 text-destructive hover:bg-destructive/5 transition-colors text-sm font-medium"
        >
          <LogOut className="w-4 h-4" />
          Выйти из аккаунта
        </button>
      </div>
    </div>
  );
}

function pluralOrders(n: number): string {
  if (n === 1) return "новый заказ";
  if (n >= 2 && n <= 4) return "новых заказа";
  return "новых заказов";
}

// ── Main Drawer ───────────────────────────────────────────────────────────────
export function AccountDrawer() {
  const { open, setOpen } = useAccountDrawer();
  const { status } = useSession();
  const pathname = usePathname();
  const [mode, setMode] = useState<"login" | "register">("login");
  const opensFromLeft = pathname?.startsWith("/admin");

  // Escape + body scroll lock
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, setOpen]);

  return (
    <AnimatePresence>
      {open && (
        <div
          className={`fixed inset-0 ${UI_LAYERS.overlay} flex ${opensFromLeft ? "justify-start" : "justify-end"}`}
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Личный кабинет"
        >
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
            initial={{ x: opensFromLeft ? "-100%" : "100%" }}
            animate={{ x: 0 }}
            exit={{ x: opensFromLeft ? "-100%" : "100%" }}
            transition={{ type: "spring", stiffness: 400, damping: 40 }}
            className={`relative w-full sm:w-[420px] max-w-full h-full bg-background ${opensFromLeft ? "border-r" : "border-l"} border-border shadow-2xl flex flex-col overflow-hidden`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border shrink-0">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.2em]">
                {status === "authenticated" ? "Личный кабинет" : mode === "login" ? "Вход" : "Регистрация"}
              </p>
              <button
                onClick={() => setOpen(false)}
                className="w-9 h-9 rounded-full border border-border hover:bg-muted/40 flex items-center justify-center transition-colors"
                aria-label="Закрыть"
              >
                <X className="w-4 h-4 text-muted-foreground" />
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
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
