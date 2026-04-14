"use client";
export const dynamic = "force-dynamic";

import React, { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, User, Phone, Mail, MapPin, Lock, Eye, EyeOff, CheckCircle2, Palette, Sun, Moon, Camera, Trash2, Monitor, Film, ALargeSmall, Globe, Sparkles, Check } from "lucide-react";
// BackButton removed — AdminShell sidebar handles navigation
import { useTheme } from "next-themes";
import { usePalette, PALETTE_GROUPS } from "@/components/palette-provider";
import { AdminLangPickerInline } from "@/components/admin/admin-lang-picker";

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
  const { theme, setTheme } = useTheme();
  const { palette, setPalette, enabledIds } = usePalette();
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

  // Appearance settings (localStorage-based)
  const [bgMode, setBgModeState] = useState<"classic" | "video">("classic");
  const [fontSize, setFontSizeState] = useState("normal");

  useEffect(() => {
    // Read from localStorage
    const bg = localStorage.getItem("aray-bg-mode") as "classic" | "video" | null;
    if (bg) setBgModeState(bg);
    const fs = localStorage.getItem("aray-font-size");
    if (fs) setFontSizeState(fs);
  }, []);

  const setBgMode = (mode: "classic" | "video") => {
    setBgModeState(mode);
    localStorage.setItem("aray-bg-mode", mode);
    localStorage.setItem("aray-classic-mode", mode === "classic" ? "1" : "0");
    window.dispatchEvent(new Event("aray-classic-change"));
  };

  const setFontSize = (id: string) => {
    setFontSizeState(id);
    const sizes: Record<string, string> = { compact: "0.88", normal: "1", large: "1.14" };
    document.documentElement.style.setProperty("--aray-font-scale", sizes[id] || "1");
    localStorage.setItem("aray-font-size", id);
  };

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

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    if (file.size > 2 * 1024 * 1024) { setError("Максимум 2MB"); return; }
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
    const res = await fetch("/api/cabinet/avatar", { method: "POST", body: fd });
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

  if (!session) {
    router.push("/login");
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Avatar + Header */}
      <div className="bg-card rounded-2xl border border-border p-6 flex flex-col sm:flex-row items-center gap-5">
        <div className="relative group">
          <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-border bg-muted flex items-center justify-center">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Аватар" className="w-full h-full object-cover" />
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
            <input type="file" accept="image/*" className="hidden" onChange={handleAvatarSelect} />
          </label>
        </div>
        <div className="text-center sm:text-left flex-1">
          <h1 className="font-display font-bold text-xl">{session.user?.name || "Профиль"}</h1>
          <p className="text-muted-foreground text-xs mt-0.5">{session.user?.email}</p>
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

      {/* Appearance — WOW visual configurator */}
      <div id="appearance" className="rounded-2xl border border-border overflow-hidden">
        {/* Live Preview Header */}
        <div className="relative overflow-hidden">
          {/* Animated gradient background */}
          <div className="absolute inset-0 transition-all duration-700 ease-out"
            style={{
              background: (() => {
                const currentPalette = PALETTE_GROUPS.flatMap(g => g.palettes).find(p => p.id === palette);
                const sidebarColor = currentPalette?.sidebar ?? "#5C3317";
                const accentColor = currentPalette?.accent ?? "#E88A3A";
                return `linear-gradient(135deg, ${sidebarColor}dd 0%, ${accentColor}cc 50%, ${sidebarColor}99 100%)`;
              })(),
            }}
          />
          {/* Glass overlay */}
          <div className="absolute inset-0 backdrop-blur-sm bg-black/10" />

          {/* Preview content */}
          <div className="relative px-6 py-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-display font-bold text-lg text-white">Оформление</h2>
                <p className="text-white/60 text-xs">Настрой внешний вид под себя</p>
              </div>
            </div>

            {/* Mini live preview card */}
            <div className="rounded-xl overflow-hidden border border-white/20 shadow-2xl transition-all duration-500"
              style={{ maxWidth: 280 }}>
              {/* Mini header */}
              <div className="h-8 flex items-center gap-2 px-3"
                style={{
                  background: (() => {
                    const cp = PALETTE_GROUPS.flatMap(g => g.palettes).find(p => p.id === palette);
                    return cp?.sidebar ?? "#5C3317";
                  })(),
                }}>
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-white/30" />
                  <span className="w-2 h-2 rounded-full bg-white/30" />
                  <span className="w-2 h-2 rounded-full bg-white/30" />
                </div>
                <span className="text-[9px] text-white/70 font-medium">ПилоРус</span>
              </div>
              {/* Mini content */}
              <div className="p-3 transition-all duration-500"
                style={{
                  background: theme === "dark" ? "#1a1612" : "#faf8f5",
                  color: theme === "dark" ? "#f5ede5" : "#2c1f14",
                }}>
                <div className="flex gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg transition-all duration-500"
                    style={{
                      background: (() => {
                        const cp = PALETTE_GROUPS.flatMap(g => g.palettes).find(p => p.id === palette);
                        return `linear-gradient(135deg, ${cp?.sidebar ?? "#5C3317"}, ${cp?.accent ?? "#E88A3A"})`;
                      })(),
                    }} />
                  <div className="flex-1 space-y-1">
                    <div className="h-2 rounded-full w-3/4" style={{ background: theme === "dark" ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.08)" }} />
                    <div className="h-2 rounded-full w-1/2" style={{ background: theme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)" }} />
                  </div>
                </div>
                <div className="flex gap-1">
                  <div className="h-5 flex-1 rounded-md transition-all duration-500"
                    style={{
                      background: (() => {
                        const cp = PALETTE_GROUPS.flatMap(g => g.palettes).find(p => p.id === palette);
                        return cp?.accent ?? "#E88A3A";
                      })(),
                    }} />
                  <div className="h-5 flex-1 rounded-md" style={{ background: theme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)" }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Settings body */}
        <div className="bg-card p-6 space-y-8">

          {/* Theme mode — large touch-friendly cards */}
          <div>
            <p className="text-sm font-semibold mb-3 flex items-center gap-2">
              {theme === "dark" ? <Moon className="w-4 h-4 text-primary" /> : <Sun className="w-4 h-4 text-primary" />}
              Режим
            </p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: "light", label: "Светлая", icon: Sun, gradient: "from-amber-100 to-orange-50" },
                { value: "dark",  label: "Тёмная",  icon: Moon, gradient: "from-slate-800 to-slate-900" },
                { value: "system", label: "Авто",   icon: Monitor, gradient: "from-blue-50 to-indigo-50" },
              ].map((opt) => {
                const active = theme === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setTheme(opt.value)}
                    className={`relative flex flex-col items-center gap-2 min-h-[56px] py-3 px-2 rounded-xl border-2 transition-all duration-300 active:scale-95 ${
                      active
                        ? "border-primary bg-primary/10 shadow-lg shadow-primary/10"
                        : "border-border hover:border-primary/30 hover:bg-primary/5"
                    }`}
                  >
                    {active && (
                      <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center shadow-md">
                        <Check className="w-3 h-3 text-primary-foreground" />
                      </span>
                    )}
                    <opt.icon className={`w-5 h-5 transition-colors ${active ? "text-primary" : "text-muted-foreground"}`} />
                    <span className={`text-xs font-medium transition-colors ${active ? "text-primary" : "text-muted-foreground"}`}>
                      {opt.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Color palette — visual grid with names */}
          <div>
            <p className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Palette className="w-4 h-4 text-primary" />
              Цветовая тема
            </p>
            {PALETTE_GROUPS.map((group) => {
              const visiblePalettes = group.palettes.filter((p) => enabledIds.includes(p.id));
              if (visiblePalettes.length === 0) return null;
              return (
                <div key={group.label} className="mb-4 last:mb-0">
                  <p className="text-xs text-muted-foreground mb-2.5">{group.label}</p>
                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                    {visiblePalettes.map((p) => {
                      const active = palette === p.id;
                      return (
                        <button
                          key={p.id}
                          onClick={() => setPalette(p.id)}
                          title={p.name}
                          className={`relative flex flex-col items-center gap-1.5 py-2 rounded-xl border-2 transition-all duration-300 active:scale-90 ${
                            active
                              ? "border-primary bg-primary/8 shadow-md shadow-primary/10"
                              : "border-transparent hover:border-primary/20 hover:bg-primary/5"
                          }`}
                        >
                          <span
                            className={`w-10 h-10 rounded-full block transition-all duration-300 shadow-sm ${
                              active ? "scale-110 shadow-lg ring-2 ring-primary/30" : "hover:scale-105"
                            }`}
                            style={{ background: `linear-gradient(135deg, ${p.sidebar} 50%, ${p.accent} 50%)` }}
                          />
                          {active && (
                            <span className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-primary flex items-center justify-center shadow">
                              <Check className="w-2.5 h-2.5 text-primary-foreground" />
                            </span>
                          )}
                          <span className={`text-[10px] leading-tight text-center transition-colors ${active ? "text-primary font-semibold" : "text-muted-foreground"}`}>
                            {p.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Background mode */}
          <div>
            <p className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Film className="w-4 h-4 text-primary" />
              Фон панели
            </p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: "classic" as const, label: "Классика", desc: "Чистый фон", icon: Monitor },
                { id: "video" as const, label: "Видео", desc: "Живая природа", icon: Film },
              ].map((opt) => {
                const active = bgMode === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setBgMode(opt.id)}
                    className={`relative flex flex-col items-center gap-2 min-h-[64px] py-4 px-3 rounded-xl border-2 transition-all duration-300 active:scale-95 ${
                      active
                        ? "border-primary bg-primary/10 shadow-lg shadow-primary/10"
                        : "border-border hover:border-primary/30 hover:bg-primary/5"
                    }`}
                  >
                    {active && (
                      <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center shadow-md">
                        <Check className="w-3 h-3 text-primary-foreground" />
                      </span>
                    )}
                    <opt.icon className={`w-5 h-5 transition-colors ${active ? "text-primary" : "text-muted-foreground"}`} />
                    <div className="text-center">
                      <p className={`text-xs font-medium transition-colors ${active ? "text-primary" : "text-foreground"}`}>{opt.label}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{opt.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Font size — visual scale */}
          <div>
            <p className="text-sm font-semibold mb-3 flex items-center gap-2">
              <ALargeSmall className="w-4 h-4 text-primary" />
              Размер шрифта
            </p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "compact", label: "Компакт", preview: "Аа", previewSize: "text-sm" },
                { id: "normal", label: "Стандарт", preview: "Аа", previewSize: "text-base" },
                { id: "large", label: "Крупный", preview: "Аа", previewSize: "text-xl" },
              ].map((opt) => {
                const active = fontSize === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setFontSize(opt.id)}
                    className={`relative flex flex-col items-center gap-1.5 min-h-[64px] py-3 rounded-xl border-2 transition-all duration-300 active:scale-95 ${
                      active
                        ? "border-primary bg-primary/10 shadow-lg shadow-primary/10"
                        : "border-border hover:border-primary/30 hover:bg-primary/5"
                    }`}
                  >
                    {active && (
                      <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center shadow-md">
                        <Check className="w-3 h-3 text-primary-foreground" />
                      </span>
                    )}
                    <span className={`font-bold transition-all duration-300 ${opt.previewSize} ${active ? "text-primary" : "text-muted-foreground"}`}>
                      {opt.preview}
                    </span>
                    <span className={`text-[10px] transition-colors ${active ? "text-primary font-medium" : "text-muted-foreground"}`}>
                      {opt.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Language */}
          <div>
            <p className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Globe className="w-4 h-4 text-primary" />
              Язык
            </p>
            <AdminLangPickerInline />
          </div>

        </div>
      </div>
    </div>
  );
}

/** Crop modal — simple circular crop with drag & zoom */
function AvatarCropModal({ src, onSave, onClose }: { src: string; onSave: (blob: Blob) => void; onClose: () => void }) {
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
    img.onload = () => { imgRef.current = img; draw(img, pos, scale); };
    img.src = src;
  }, [src]);

  useEffect(() => {
    if (imgRef.current) draw(imgRef.current, pos, scale);
  }, [pos, scale]);

  const draw = (img: HTMLImageElement, p: { x: number; y: number }, s: number) => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, SIZE, SIZE);
    const aspect = img.width / img.height;
    let w: number, h: number;
    if (aspect > 1) { h = SIZE * s; w = h * aspect; }
    else { w = SIZE * s; h = w / aspect; }
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
    out.width = 256; out.height = 256;
    const ctx = out.getContext("2d")!;
    ctx.beginPath();
    ctx.arc(128, 128, 128, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(canvasRef.current!, 0, 0, SIZE, SIZE, 0, 0, 256, 256);
    out.toBlob((blob) => { if (blob) onSave(blob); }, "image/jpeg", 0.9);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4" onClick={onClose}>
      <div className="bg-card rounded-2xl border border-border p-5 w-full max-w-sm space-y-4" onClick={(e) => e.stopPropagation()}>
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
          <Button variant="outline" onClick={onClose} className="flex-1">Отмена</Button>
          <Button onClick={handleSave} disabled={saving} className="flex-1">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
            Сохранить
          </Button>
        </div>
      </div>
    </div>
  );
}
