"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, User, Phone, Mail, MapPin, Lock, Eye, EyeOff, CheckCircle2 } from "lucide-react";

const profileSchema = z.object({
  name: z.string().min(2, "Введите имя"),
  phone: z.string().optional(),
  address: z.string().optional(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(6, "Минимум 6 символов"),
  newPassword: z.string().min(6, "Минимум 6 символов"),
  confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: "Пароли не совпадают",
  path: ["confirmPassword"],
});

type ProfileForm = z.infer<typeof profileSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;

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
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pwSaved, setPwSaved] = useState(false);
  const [error, setError] = useState("");
  const [pwError, setPwError] = useState("");
  const [phoneValue, setPhoneValue] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
  });

  const { register: regPw, handleSubmit: handlePw, reset: resetPw, formState: { errors: pwErrors } } = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
  });

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
      body: JSON.stringify({ currentPassword: data.currentPassword, newPassword: data.newPassword }),
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

  if (!session) {
    router.push("/login");
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display font-bold text-2xl">Профиль</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Ваши данные и настройки аккаунта</p>
      </div>

      {/* Profile form */}
      <form onSubmit={handleSubmit(onSaveProfile)} className="bg-card rounded-2xl border border-border p-6 space-y-5">
        <h2 className="font-display font-semibold text-lg flex items-center gap-2">
          <User className="w-5 h-5 text-primary" />
          Личные данные
        </h2>

        {/* Email (read-only) */}
        <div>
          <Label className="text-sm font-medium mb-1.5 block text-muted-foreground">Email</Label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
              <Mail className="w-4 h-4" />
            </div>
            <Input
              value={session.user?.email || ""}
              disabled
              className="pl-10 h-11 rounded-xl bg-muted/50 text-muted-foreground cursor-not-allowed"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">Email нельзя изменить</p>
        </div>

        {/* Name */}
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
              className="pl-10 h-11 rounded-xl border-border/60 focus:border-primary"
              {...register("name")}
            />
          </div>
          {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
        </div>

        {/* Phone */}
        <div>
          <Label htmlFor="phone" className="text-sm font-medium mb-1.5 block">Телефон</Label>
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
              className="pl-10 h-11 rounded-xl border-border/60 focus:border-primary"
            />
          </div>
        </div>

        {/* Address */}
        <div>
          <Label htmlFor="address" className="text-sm font-medium mb-1.5 block">Адрес доставки</Label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
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
          <p className="text-xs text-muted-foreground mt-1">Будет подставляться при оформлении заказа</p>
        </div>

        {error && (
          <div className="bg-destructive/8 border border-destructive/20 rounded-xl px-4 py-3">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <Button type="submit" disabled={loading} className="w-full sm:w-auto h-11 px-8 rounded-xl">
          {loading ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Сохранение…</>
          ) : saved ? (
            <><CheckCircle2 className="w-4 h-4 mr-2" /> Сохранено!</>
          ) : "Сохранить изменения"}
        </Button>
      </form>

      {/* Password form */}
      <form onSubmit={handlePw(onChangePassword)} className="bg-card rounded-2xl border border-border p-6 space-y-5">
        <h2 className="font-display font-semibold text-lg flex items-center gap-2">
          <Lock className="w-5 h-5 text-primary" />
          Изменить пароль
        </h2>

        {/* Current password */}
        <div>
          <Label htmlFor="currentPassword" className="text-sm font-medium mb-1.5 block">Текущий пароль</Label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
              <Lock className="w-4 h-4" />
            </div>
            <Input
              id="currentPassword"
              type={showCurrent ? "text" : "password"}
              autoComplete="current-password"
              className="pl-10 pr-10 h-11 rounded-xl border-border/60 focus:border-primary"
              {...regPw("currentPassword")}
            />
            <button type="button" onClick={() => setShowCurrent(!showCurrent)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" tabIndex={-1}>
              {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {pwErrors.currentPassword && <p className="text-xs text-destructive mt-1">{pwErrors.currentPassword.message}</p>}
        </div>

        {/* New password */}
        <div>
          <Label htmlFor="newPassword" className="text-sm font-medium mb-1.5 block">Новый пароль</Label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
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
            <button type="button" onClick={() => setShowNew(!showNew)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" tabIndex={-1}>
              {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {pwErrors.newPassword && <p className="text-xs text-destructive mt-1">{pwErrors.newPassword.message}</p>}
        </div>

        {/* Confirm */}
        <div>
          <Label htmlFor="confirmPassword" className="text-sm font-medium mb-1.5 block">Повторите новый пароль</Label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
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
          {pwErrors.confirmPassword && <p className="text-xs text-destructive mt-1">{pwErrors.confirmPassword.message}</p>}
        </div>

        {pwError && (
          <div className="bg-destructive/8 border border-destructive/20 rounded-xl px-4 py-3">
            <p className="text-sm text-destructive">{pwError}</p>
          </div>
        )}

        <Button type="submit" variant="outline" disabled={pwLoading} className="w-full sm:w-auto h-11 px-8 rounded-xl">
          {pwLoading ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Сохранение…</>
          ) : pwSaved ? (
            <><CheckCircle2 className="w-4 h-4 mr-2 text-emerald-500" /> Пароль изменён!</>
          ) : "Изменить пароль"}
        </Button>
      </form>
    </div>
  );
}
