"use client";
export const dynamic = "force-dynamic";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Check,
  CheckCircle2,
  Camera,
  Bell,
  BookmarkPlus,
  BriefcaseBusiness,
  ChevronRight,
  Heart,
  Globe,
  History,
  ImageIcon,
  Link2,
  Loader2,
  Lock,
  Mail,
  MapPin,
  Monitor,
  Moon,
  Newspaper,
  Palette,
  Phone,
  Star,
  Sun,
  Trash2,
  Trophy,
  User,
  UserRoundCog,
  Users,
  Video,
  Wallet,
  Eye,
  EyeOff,
  Rss,
} from "lucide-react";
import { AdminLangPickerInline } from "@/components/admin/admin-lang-picker";
import { AdminLangProvider } from "@/lib/admin-lang-context";
import { usePalette } from "@/components/palette-provider";
import { PALETTES } from "@/lib/palettes";

const profileSchema = z.object({
  name: z.string().min(2, "Введите имя"),
  phone: z.string().optional(),
  address: z.string().optional(),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(6, "Минимум 6 символов"),
    newPassword: z.string().min(6, "Минимум 6 символов"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Пароли не совпадают",
    path: ["confirmPassword"],
  });

type ProfileForm = z.infer<typeof profileSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;
type ThemeMode = "light" | "dark" | "system";

const STAFF_ROLES = [
  "SUPER_ADMIN",
  "ADMIN",
  "MANAGER",
  "COURIER",
  "ACCOUNTANT",
  "WAREHOUSE",
  "SELLER",
];

const THEME_OPTIONS: {
  id: ThemeMode;
  label: string;
  icon: React.ElementType;
}[] = [
  { id: "dark", label: "Темная", icon: Moon },
  { id: "light", label: "Светлая", icon: Sun },
  { id: "system", label: "Система", icon: Monitor },
];

const SHOW_FUTURE_PROFILE_HUB = false;

type ProfileHubItem = {
  title: string;
  desc: string;
  icon: React.ElementType;
  href?: string;
  disabled?: boolean;
};

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

export default function ProfilePage() {
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  const { palette, setPalette } = usePalette();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pwSaved, setPwSaved] = useState(false);
  const [error, setError] = useState("");
  const [pwError, setPwError] = useState("");
  const [phoneValue, setPhoneValue] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showCropModal, setShowCropModal] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const role = (session?.user as { role?: string } | undefined)?.role || "USER";
  const isStaff = STAFF_ROLES.includes(role);
  const safeTheme = (theme || "system") as ThemeMode;
  const hubItems: ProfileHubItem[] = [
    {
      title: "Личные данные",
      desc: "Имя, телефон, адрес",
      icon: UserRoundCog,
      href: "#profile-data",
    },
    {
      title: "Интерфейс",
      desc: "Тема, цвета, фон",
      icon: Palette,
      href: "#interface",
    },
    { title: "Язык", desc: "Перевод и регион", icon: Globe, href: "#language" },
    {
      title: "Уведомления",
      desc: "Push, email, важность",
      icon: Bell,
      href: "/cabinet/notifications",
    },
    {
      title: "История",
      desc: "Действия и просмотры",
      icon: History,
      href: "/cabinet/history",
    },
    {
      title: "Медиа",
      desc: "Фото и документы",
      icon: ImageIcon,
      href: "/cabinet/media",
    },
    {
      title: "Подписки",
      desc: "Магазины и категории",
      icon: BookmarkPlus,
      href: "/cabinet/subscriptions",
    },
    {
      title: "Безопасность",
      desc: "Пароль и вход",
      icon: Lock,
      href: "#security",
    },
    ...(isStaff
      ? [
          {
            title: "Рабочая роль",
            desc: "Команда и доступ",
            icon: BriefcaseBusiness,
            href: "/admin/staff",
          } satisfies ProfileHubItem,
        ]
      : []),
  ];
  const futureHubItems: ProfileHubItem[] = [
    {
      title: "Публичный профиль",
      desc: "Статус, био, ссылки",
      icon: Link2,
      disabled: true,
    },
    {
      title: "Аватар-альбом",
      desc: "Фото и видео профиля",
      icon: Camera,
      disabled: true,
    },
    {
      title: "Сторис",
      desc: "Короткие публикации",
      icon: Video,
      disabled: true,
    },
    { title: "Лента", desc: "Контент и интересы", icon: Rss, disabled: true },
    {
      title: "Блог",
      desc: "Статьи и заметки",
      icon: Newspaper,
      disabled: true,
    },
    { title: "Влог", desc: "Видео и эфиры", icon: Video, disabled: true },
    {
      title: "Услуги",
      desc: "Что человек продает",
      icon: BriefcaseBusiness,
      disabled: true,
    },
    {
      title: "Портфолио",
      desc: "Работы и кейсы",
      icon: ImageIcon,
      disabled: true,
    },
    {
      title: "Отзывы",
      desc: "Репутация и доверие",
      icon: Star,
      disabled: true,
    },
    {
      title: "Рейтинг",
      desc: "Уровень и качество",
      icon: Trophy,
      disabled: true,
    },
    { title: "Подписчики", desc: "Люди и связи", icon: Users, disabled: true },
    { title: "Донаты", desc: "Поддержка автора", icon: Heart, disabled: true },
    {
      title: "Монетизация",
      desc: "Доход и выплаты",
      icon: Wallet,
      disabled: true,
    },
    {
      title: "Устройства",
      desc: "PWA и сессии",
      icon: Monitor,
      disabled: true,
    },
  ];

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
  });

  const {
    register: regPw,
    handleSubmit: handlePw,
    reset: resetPw,
    formState: { errors: pwErrors },
  } = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  // Load profile data
  useEffect(() => {
    if (!session?.user?.id) return;
    fetch("/api/cabinet/profile")
      .then((r) => r.json())
      .then((data) => {
        setValue("name", data.name || "");
        setValue("address", data.address || "");
        if (data.phone) {
          setPhoneValue(data.phone);
          setValue("phone", data.phone);
        }
        if (data.avatarUrl) setAvatarUrl(data.avatarUrl);
      });
  }, [session, setValue]);

  const handlePhoneInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setPhoneValue(formatted);
    setValue("phone", formatted);
  };

  const onSaveProfile = async (data: ProfileForm) => {
    setLoading(true);
    setError("");
    const res = await fetch("/api/cabinet/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setLoading(false);
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } else {
      const j = await res.json();
      setError(j.error || "Ошибка сохранения");
    }
  };

  const onChangePassword = async (data: PasswordForm) => {
    setPwLoading(true);
    setPwError("");
    const res = await fetch("/api/cabinet/password", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      }),
    });
    setPwLoading(false);
    if (res.ok) {
      setPwSaved(true);
      resetPw();
      setTimeout(() => setPwSaved(false), 3000);
    } else {
      const j = await res.json();
      setPwError(j.error || "Ошибка смены пароля");
    }
  };

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    if (file.size > 2 * 1024 * 1024) {
      setError("Максимум 2MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setCropSrc(reader.result as string);
      setShowCropModal(true);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const uploadCroppedAvatar = async (blob: Blob) => {
    setUploadingAvatar(true);
    setShowCropModal(false);
    const fd = new FormData();
    fd.append("file", blob, "avatar.jpg");
    const res = await fetch("/api/cabinet/avatar", {
      method: "POST",
      body: fd,
    });
    if (res.ok) {
      const data = await res.json();
      setAvatarUrl(data.avatarUrl);
    }
    setUploadingAvatar(false);
  };

  const removeAvatar = async () => {
    setUploadingAvatar(true);
    const res = await fetch("/api/cabinet/avatar", { method: "DELETE" });
    if (res.ok) setAvatarUrl(null);
    setUploadingAvatar(false);
  };

  return (
    <div className="space-y-6">
      {/* Avatar + Header */}
      <div className="bg-card rounded-2xl border border-border p-6 flex flex-col sm:flex-row items-center gap-5">
        <div className="relative group">
          <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-border bg-muted flex items-center justify-center">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Аватар"
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-10 h-10 text-muted-foreground" />
            )}
            {uploadingAvatar && (
              <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-white animate-spin" />
              </div>
            )}
          </div>
          <label className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center cursor-pointer hover:bg-primary/90 transition-colors shadow-lg">
            <Camera className="w-4 h-4" />
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarSelect}
            />
          </label>
        </div>
        <div className="text-center sm:text-left flex-1">
          <h1 className="font-display font-bold text-xl">
            {session?.user?.name || "Профиль"}
          </h1>
          <p className="text-muted-foreground text-xs mt-0.5">
            {session?.user?.email || "Email не указан"}
          </p>
          {avatarUrl && (
            <button
              onClick={removeAvatar}
              disabled={uploadingAvatar}
              className="mt-2 text-xs text-destructive hover:underline flex items-center gap-1 mx-auto sm:mx-0"
            >
              <Trash2 className="w-3 h-3" /> Удалить фото
            </button>
          )}
        </div>
      </div>

      {/* Crop Modal */}
      {showCropModal && cropSrc && (
        <AvatarCropModal
          src={cropSrc}
          onSave={uploadCroppedAvatar}
          onClose={() => setShowCropModal(false)}
        />
      )}

      <div className="bg-card rounded-2xl border border-border p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display font-semibold text-lg">
              Центр профиля
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Аккаунт, интерфейс, язык и личные настройки
            </p>
          </div>
          <span className="hidden sm:inline-flex rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary">
            ARAY ID
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5">
          {hubItems.map((item) => (
            <ProfileHubCard key={item.title} item={item} />
          ))}
        </div>

        {SHOW_FUTURE_PROFILE_HUB && (
        <div className="border-t border-border/70 pt-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">
                Публичность и заработок
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Социальные и бизнес-возможности профиля ARAY
              </p>
            </div>
            <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">
              Этап 2
            </span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
            {futureHubItems.map((item) => (
              <ProfileHubCard key={item.title} item={item} />
            ))}
          </div>
        </div>
        )}
      </div>

      {/* Profile form */}
      <form
        id="profile-data"
        onSubmit={handleSubmit(onSaveProfile)}
        className="scroll-mt-24 bg-card rounded-2xl border border-border p-6 space-y-5"
      >
        <h2 className="font-display font-semibold text-lg flex items-center gap-2">
          <User className="w-5 h-5 text-primary" />
          Личные данные
        </h2>

        {/* Email (read-only) */}
        <div>
          <Label className="text-sm font-medium mb-1.5 block text-muted-foreground">
            Email
          </Label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/50 pointer-events-none">
              <Mail className="w-4 h-4" />
            </div>
            <Input
              value={session?.user?.email || ""}
              disabled
              className="pl-10 h-11 rounded-xl bg-muted/50 text-muted-foreground cursor-not-allowed"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Email нельзя изменить
          </p>
        </div>

        {/* Name */}
        <div>
          <Label htmlFor="name" className="text-sm font-medium mb-1.5 block">
            Ваше имя
          </Label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/50 pointer-events-none">
              <User className="w-4 h-4" />
            </div>
            <Input
              id="name"
              autoComplete="name"
              placeholder="Иван Петров"
              className="pl-10 h-11 rounded-xl border-border/60 focus:border-primary"
              {...register("name")}
            />
          </div>
          {errors.name && (
            <p className="text-xs text-destructive mt-1">
              {errors.name.message}
            </p>
          )}
        </div>

        {/* Phone */}
        <div>
          <Label htmlFor="phone" className="text-sm font-medium mb-1.5 block">
            Телефон
          </Label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/50 pointer-events-none">
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
              className="pl-10 h-11 rounded-xl border-border/60 focus:border-primary"
            />
          </div>
        </div>

        {/* Address */}
        <div>
          <Label htmlFor="address" className="text-sm font-medium mb-1.5 block">
            Адрес доставки
          </Label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/50 pointer-events-none">
              <MapPin className="w-4 h-4" />
            </div>
            <Input
              id="address"
              autoComplete="street-address"
              placeholder="Москва, ул. Примерная, д. 1"
              className="pl-10 h-11 rounded-xl border-border/60 focus:border-primary"
              {...register("address")}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Будет подставляться при оформлении заказа
          </p>
        </div>

        {error && (
          <div className="bg-destructive/8 border border-destructive/20 rounded-xl px-4 py-3">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <Button
          type="submit"
          disabled={loading}
          className="w-full sm:w-auto h-11 px-8 rounded-xl"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Сохранение…
            </>
          ) : saved ? (
            <>
              <CheckCircle2 className="w-4 h-4 mr-2" /> Сохранено!
            </>
          ) : (
            "Сохранить изменения"
          )}
        </Button>
      </form>

      {/* Interface */}
      <div
        id="interface"
        className="scroll-mt-24 bg-card rounded-2xl border border-border p-6 space-y-5"
      >
        <h2 className="font-display font-semibold text-lg flex items-center gap-2">
          <Palette className="w-5 h-5 text-primary" />
          Интерфейс
        </h2>

        {mounted && (
          <>
            <div>
              <p className="text-sm font-semibold mb-3">Тема</p>
              <div className="grid grid-cols-3 gap-2">
                {THEME_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  const active = safeTheme === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setTheme(option.id)}
                      className={`min-h-[4.5rem] rounded-2xl border px-2 py-3 transition-all ${
                        active
                          ? "border-primary/45 bg-primary/10 text-primary"
                          : "border-border bg-background/45 text-muted-foreground hover:border-primary/25 hover:bg-primary/5 hover:text-foreground"
                      }`}
                    >
                      <Icon className="mx-auto h-5 w-5" strokeWidth={1.75} />
                      <span className="mt-2 block text-xs font-semibold">
                        {option.label}
                      </span>
                      {active && (
                        <Check
                          className="mx-auto mt-1 h-3.5 w-3.5"
                          strokeWidth={2.4}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold mb-3">Цветовая атмосфера</p>
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2.5">
                {PALETTES.map((item) => {
                  const active = palette === item.id;
                  const isAray = item.id === "sber";
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setPalette(item.id)}
                      className={`group rounded-2xl border p-2 text-left transition-all ${
                        active
                          ? "border-primary/55 bg-primary/10 shadow-[0_14px_34px_hsl(var(--primary)/0.12)]"
                          : "border-border bg-background/45 hover:border-primary/28 hover:bg-primary/5"
                      }`}
                    >
                      <span
                        className="relative block h-14 overflow-hidden rounded-xl border border-border/50"
                        style={{
                          background: isAray
                            ? "linear-gradient(135deg, #070B12 0%, #111A25 45%, #0C2B37 72%, #D6AE5F 100%)"
                            : `linear-gradient(135deg, ${item.sidebar}, ${item.accent})`,
                        }}
                      >
                        <span
                          className="absolute inset-0"
                          style={{
                            background: isAray
                              ? "radial-gradient(circle at 18% 20%, rgba(39,173,190,0.25), transparent 42%), radial-gradient(circle at 84% 78%, rgba(214,174,95,0.32), transparent 40%), linear-gradient(180deg, rgba(255,255,255,0.10), rgba(0,0,0,0.34))"
                              : "linear-gradient(180deg, rgba(255,255,255,0.18), rgba(0,0,0,0.28))",
                          }}
                        />
                        {active && (
                          <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-white text-black shadow">
                            <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                          </span>
                        )}
                      </span>
                      <span
                        className={`mt-1.5 block truncate text-[11px] font-semibold ${active ? "text-primary" : "text-foreground"}`}
                      >
                        {item.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Password form */}
      <form
        id="security"
        onSubmit={handlePw(onChangePassword)}
        className="scroll-mt-24 bg-card rounded-2xl border border-border p-6 space-y-5"
      >
        <h2 className="font-display font-semibold text-lg flex items-center gap-2">
          <Lock className="w-5 h-5 text-primary" />
          Изменить пароль
        </h2>

        {/* Current password */}
        <div>
          <Label
            htmlFor="currentPassword"
            className="text-sm font-medium mb-1.5 block"
          >
            Текущий пароль
          </Label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/50 pointer-events-none">
              <Lock className="w-4 h-4" />
            </div>
            <Input
              id="currentPassword"
              type={showCurrent ? "text" : "password"}
              autoComplete="current-password"
              className="pl-10 pr-10 h-11 rounded-xl border-border/60 focus:border-primary"
              {...regPw("currentPassword")}
            />
            <button
              type="button"
              onClick={() => setShowCurrent(!showCurrent)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              tabIndex={-1}
            >
              {showCurrent ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
          {pwErrors.currentPassword && (
            <p className="text-xs text-destructive mt-1">
              {pwErrors.currentPassword.message}
            </p>
          )}
        </div>

        {/* New password */}
        <div>
          <Label
            htmlFor="newPassword"
            className="text-sm font-medium mb-1.5 block"
          >
            Новый пароль
          </Label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/50 pointer-events-none">
              <Lock className="w-4 h-4" />
            </div>
            <Input
              id="newPassword"
              type={showNew ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Минимум 6 символов"
              className="pl-10 pr-10 h-11 rounded-xl border-border/60 focus:border-primary"
              {...regPw("newPassword")}
            />
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              tabIndex={-1}
            >
              {showNew ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
          {pwErrors.newPassword && (
            <p className="text-xs text-destructive mt-1">
              {pwErrors.newPassword.message}
            </p>
          )}
        </div>

        {/* Confirm */}
        <div>
          <Label
            htmlFor="confirmPassword"
            className="text-sm font-medium mb-1.5 block"
          >
            Повторите новый пароль
          </Label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/50 pointer-events-none">
              <Lock className="w-4 h-4" />
            </div>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              className="pl-10 h-11 rounded-xl border-border/60 focus:border-primary"
              {...regPw("confirmPassword")}
            />
          </div>
          {pwErrors.confirmPassword && (
            <p className="text-xs text-destructive mt-1">
              {pwErrors.confirmPassword.message}
            </p>
          )}
        </div>

        {pwError && (
          <div className="bg-destructive/8 border border-destructive/20 rounded-xl px-4 py-3">
            <p className="text-sm text-destructive">{pwError}</p>
          </div>
        )}

        <Button
          type="submit"
          variant="outline"
          disabled={pwLoading}
          className="w-full sm:w-auto h-11 px-8 rounded-xl"
        >
          {pwLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Сохранение…
            </>
          ) : pwSaved ? (
            <>
              <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-500" /> Пароль
              изменён!
            </>
          ) : (
            "Изменить пароль"
          )}
        </Button>
      </form>

      {/* Язык интерфейса */}
      <div
        id="language"
        className="scroll-mt-24 bg-card rounded-2xl border border-border p-6 space-y-4"
      >
        <h2 className="font-display font-semibold text-lg flex items-center gap-2">
          <Globe className="w-5 h-5 text-primary" />
          Язык интерфейса
        </h2>
        <AdminLangProvider>
          <AdminLangPickerInline />
        </AdminLangProvider>
      </div>
    </div>
  );
}

function ProfileHubCard({ item }: { item: ProfileHubItem }) {
  const Icon = item.icon;
  const content = (
    <>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
        <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold leading-tight text-foreground">
          {item.title}
        </span>
        <span className="mt-0.5 block truncate text-[11px] leading-tight text-muted-foreground">
          {item.desc}
        </span>
      </span>
      {item.disabled ? (
        <span className="rounded-full bg-muted px-2 py-1 text-[10px] font-semibold text-muted-foreground">
          Скоро
        </span>
      ) : (
        <ChevronRight
          className="h-4 w-4 shrink-0 text-muted-foreground/55"
          strokeWidth={1.75}
        />
      )}
    </>
  );

  const className = `flex min-h-[4.75rem] items-center gap-3 rounded-2xl border p-3 text-left transition-all ${
    item.disabled
      ? "cursor-default border-border/70 bg-muted/25 opacity-75"
      : "border-border bg-background/45 hover:border-primary/28 hover:bg-primary/5"
  }`;

  if (item.href && !item.disabled) {
    return (
      <Link href={item.href} className={className}>
        {content}
      </Link>
    );
  }

  return <div className={className}>{content}</div>;
}

/** Crop modal — simple circular crop with drag & zoom */
function AvatarCropModal({
  src,
  onSave,
  onClose,
}: {
  src: string;
  onSave: (blob: Blob) => void;
  onClose: () => void;
}) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const imgRef = React.useRef<HTMLImageElement | null>(null);
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [saving, setSaving] = useState(false);
  const SIZE = 280;

  useEffect(() => {
    const img = new window.Image();
    img.onload = () => {
      imgRef.current = img;
      draw(img, pos, scale);
    };
    img.src = src;
  }, [src]);

  useEffect(() => {
    if (imgRef.current) draw(imgRef.current, pos, scale);
  }, [pos, scale]);

  const draw = (
    img: HTMLImageElement,
    p: { x: number; y: number },
    s: number,
  ) => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, SIZE, SIZE);
    const aspect = img.width / img.height;
    let w: number, h: number;
    if (aspect > 1) {
      h = SIZE * s;
      w = h * aspect;
    } else {
      w = SIZE * s;
      h = w / aspect;
    }
    const x = (SIZE - w) / 2 + p.x;
    const y = (SIZE - h) / 2 + p.y;
    ctx.drawImage(img, x, y, w, h);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    setDragging(true);
    setDragStart({ x: e.clientX - pos.x, y: e.clientY - pos.y });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    setPos({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handlePointerUp = () => setDragging(false);

  const handleSave = () => {
    setSaving(true);
    // Export circular crop as 256x256
    const out = document.createElement("canvas");
    out.width = 256;
    out.height = 256;
    const ctx = out.getContext("2d")!;
    ctx.beginPath();
    ctx.arc(128, 128, 128, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(canvasRef.current!, 0, 0, SIZE, SIZE, 0, 0, 256, 256);
    out.toBlob(
      (blob) => {
        if (blob) onSave(blob);
      },
      "image/jpeg",
      0.9,
    );
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-2xl border border-border p-5 w-full max-w-sm space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-semibold text-base text-center">Обрезать фото</h3>

        <div className="relative mx-auto" style={{ width: SIZE, height: SIZE }}>
          <canvas
            ref={canvasRef}
            width={SIZE}
            height={SIZE}
            className="rounded-full border-2 border-border cursor-grab active:cursor-grabbing touch-none"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          />
          {/* Circle overlay guide */}
          <div className="absolute inset-0 rounded-full ring-4 ring-primary/20 pointer-events-none" />
        </div>

        {/* Zoom slider */}
        <div className="flex items-center gap-3 px-2">
          <span className="text-xs text-muted-foreground">−</span>
          <input
            type="range"
            min={0.5}
            max={3}
            step={0.05}
            value={scale}
            onChange={(e) => setScale(Number(e.target.value))}
            className="flex-1 accent-primary"
          />
          <span className="text-xs text-muted-foreground">+</span>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Отмена
          </Button>
          <Button onClick={handleSave} disabled={saving} className="flex-1">
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
            ) : null}
            Сохранить
          </Button>
        </div>
      </div>
    </div>
  );
}
