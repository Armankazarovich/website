"use client";
export const dynamic = "force-dynamic";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCartStore } from "@/store/cart";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { CheckCircle, Loader2, User, Building2 } from "lucide-react";
import { BackButton } from "@/components/ui/back-button";
import { useSession, signIn } from "next-auth/react";

type ClientType = "individual" | "company";

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

const checkoutSchema = z.object({
  name: z.string().min(2, "Введите имя"),
  phone: z.string().min(10, "Введите корректный номер телефона"),
  email: z.string().email("Введите корректный email — пришлём подтверждение заказа"),
  address: z.string().min(5, "Введите адрес доставки"),
  paymentMethod: z.enum(["cash", "invoice"]),
  comment: z.string().optional(),
  contactMethod: z.enum(["phone", "whatsapp", "telegram", "sms"]).optional(),
  contactExtra: z.string().optional(),
  // Company fields (optional, validated manually)
  orgName: z.string().optional(),
  inn: z.string().optional(),
  kpp: z.string().optional(),
});

type CheckoutForm = z.infer<typeof checkoutSchema>;

function CheckoutLoginForm({ onSuccess }: { onSuccess: () => void }) {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await signIn("credentials", { login, password, redirect: false });
    if (res?.error) {
      setError("Неверный логин или пароль");
    } else {
      onSuccess();
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleLogin} className="space-y-3">
      <input
        value={login}
        onChange={e => setLogin(e.target.value)}
        placeholder="Телефон или email"
        className="w-full px-3 py-3 sm:py-2 rounded-xl border border-border bg-background text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
      <input
        type="password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        placeholder="Пароль"
        className="w-full px-3 py-3 sm:py-2 rounded-xl border border-border bg-background text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
      {error && <p className="text-destructive text-xs">{error}</p>}
      <button type="submit" disabled={loading} className="bg-primary text-primary-foreground px-4 py-3 sm:py-2 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
        {loading ? "Входим..." : "Войти"}
      </button>
    </form>
  );
}

function CheckoutRegisterForm({ onSuccess }: { onSuccess: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Ошибка регистрации");
      setLoading(false);
      return;
    }
    await signIn("credentials", { login: email, password, redirect: false });
    onSuccess();
    setLoading(false);
  };

  return (
    <form onSubmit={handleRegister} className="space-y-3">
      <input value={name} onChange={e => setName(e.target.value)} placeholder="Ваше имя" className="w-full px-3 py-3 sm:py-2 rounded-xl border border-border bg-background text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
      <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="w-full px-3 py-3 sm:py-2 rounded-xl border border-border bg-background text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
      <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Пароль (минимум 6 символов)" className="w-full px-3 py-3 sm:py-2 rounded-xl border border-border bg-background text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
      {error && <p className="text-destructive text-xs">{error}</p>}
      <button type="submit" disabled={loading} className="bg-primary text-primary-foreground px-4 py-3 sm:py-2 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
        {loading ? "Регистрируем..." : "Зарегистрироваться"}
      </button>
    </form>
  );
}

export default function CheckoutPage() {
  const router = useRouter();
  const { items, totalPrice, clearCart } = useCartStore();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [orderNum, setOrderNum] = useState<number | null>(null);
  const [orderPhone, setOrderPhone] = useState("");
  const [pushState, setPushState] = useState<"idle" | "busy" | "done" | "denied" | "unsupported">("idle");

  useEffect(() => {
    if (!success) return;
    if (!("Notification" in window) || !("PushManager" in window) || !("serviceWorker" in navigator)) {
      setPushState("unsupported"); return;
    }
    if (Notification.permission === "granted") setPushState("done");
    else if (Notification.permission === "denied") setPushState("denied");
    else setPushState("idle");
  }, [success]);

  const handleEnablePush = async () => {
    setPushState("busy");
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") { setPushState("denied"); return; }
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_KEY;
      if (!vapidKey) { setPushState("done"); return; }
      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      const b64 = (s: string) => { const p = "=".repeat((4-s.length%4)%4); const b=(s+p).replace(/-/g,"+").replace(/_/g,"/"); return Uint8Array.from([...atob(b)].map(c=>c.charCodeAt(0))); };
      const sub = existing ?? await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(vapidKey) as unknown as BufferSource });
      const k = sub.getKey("p256dh"); const a = sub.getKey("auth");
      if (k && a) {
        const toB64 = (buf: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buf)));
        await fetch("/api/push/subscribe", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ endpoint: sub.endpoint, keys: { p256dh: toB64(k), auth: toB64(a) } }) });
      }
      setPushState("done");
    } catch { setPushState("idle"); }
  };
  const [phoneValue, setPhoneValue] = useState("");
  const [clientType, setClientType] = useState<ClientType>("individual");
  const [deliveryType, setDeliveryType] = useState<"delivery" | "pickup">("delivery");
  const [innLoading, setInnLoading] = useState(false);
  const [innError, setInnError] = useState("");
  const [geoLoading, setGeoLoading] = useState(false);
  const [authMode, setAuthMode] = useState<"guest" | "login" | "register">("guest");
  const [mounted, setMounted] = useState(false);
  const [workingHours, setWorkingHours] = useState("Пн–Сб: 09:00–20:00, Вс: 09:00–18:00");
  const [pickupAddress, setPickupAddress] = useState("Химки, ул. Заводская 2А, стр.28");
  const [pickupCoords, setPickupCoords] = useState("55.8945%2C37.3877");
  const { data: session } = useSession();

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    fetch("/api/site-settings")
      .then((r) => r.json())
      .then((data) => {
        if (data?.working_hours) setWorkingHours(data.working_hours);
        if (data?.address) setPickupAddress(data.address);
        if (data?.pickup_coords) setPickupCoords(data.pickup_coords);
      })
      .catch(() => {});
  }, []);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors },
  } = useForm<CheckoutForm>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: { paymentMethod: "cash" },
  });

  const contactMethod = watch("contactMethod");

  // Автозаполнение данных залогиненного пользователя
  useEffect(() => {
    if (!session?.user?.id) return;
    fetch("/api/me")
      .then((r) => r.json())
      .then((user) => {
        if (!user || user.error) return;
        const phone = user.phone || "";
        setPhoneValue(phone);
        reset({
          name: user.name || "",
          phone,
          email: user.email || "",
          address: user.address || "",
          paymentMethod: "cash",
        });
      })
      .catch(() => {});
  }, [session?.user?.id, reset]);

  // Wait for hydration before checking cart (localStorage loads after mount)
  if (!mounted) {
    return (
      <div className="container py-20 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (items.length === 0 && !success) {
    router.push("/cart");
    return null;
  }

  const handleClientTypeChange = (type: ClientType) => {
    setClientType(type);
    if (type === "company") {
      setValue("paymentMethod", "invoice");
    }
  };

  const onSubmit = async (data: CheckoutForm) => {
    // Validate company fields if company type selected
    if (clientType === "company") {
      if (!data.orgName || data.orgName.length < 2) {
        toast({ title: "Ошибка", description: "Введите название организации", variant: "destructive" });
        return;
      }
      if (!data.inn || !/^\d{10}(\d{2})?$/.test(data.inn)) {
        toast({ title: "Ошибка", description: "ИНН должен содержать 10 или 12 цифр", variant: "destructive" });
        return;
      }
    }

    setSubmitting(true);
    try {
      // Build comment with company info + preferred contact
      let comment = data.comment || "";
      if (data.contactMethod) {
        const labels: Record<string, string> = { phone: "📞 Телефон", whatsapp: "💬 WhatsApp", telegram: "✈️ Telegram", sms: "📱 SMS" };
        const contactLine = `Способ связи: ${labels[data.contactMethod]}${data.contactExtra ? ` — ${data.contactExtra}` : ""}`;
        comment = comment ? `${contactLine}\n${comment}` : contactLine;
      }
      if (clientType === "company" && data.orgName) {
        const companyInfo = `Юр. лицо: ${data.orgName}, ИНН: ${data.inn}${data.kpp ? `, КПП: ${data.kpp}` : ""}`;
        comment = comment ? `${companyInfo}\n${comment}` : companyInfo;
      }

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          comment,
          items: items.map((item) => ({
            variantId: item.variantId,
            productName: item.productName,
            variantSize: item.variantSize,
            unitType: item.unitType,
            quantity: item.quantity,
            price: item.price,
          })),
          totalAmount: totalPrice(),
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Ошибка при создании заказа");

      setOrderNum(json.orderNumber);
      setOrderPhone(data.phone);
      clearCart();
      setSuccess(true);
    } catch (err: any) {
      toast({ title: "Ошибка", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    const trackUrl = `/track?order=${orderNum}&phone=${encodeURIComponent(orderPhone)}`;
    return (
      <div className="container py-16 max-w-lg mx-auto">
        {/* Иконка успеха */}
        <div className="text-center mb-8">
          <div className="w-24 h-24 bg-emerald-100 dark:bg-emerald-950/40 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="w-12 h-12 text-emerald-500" />
          </div>
          <h1 className="font-display font-bold text-3xl mb-2">Заказ принят!</h1>
          <p className="text-muted-foreground">Менеджер позвонит вам в ближайшее время</p>
        </div>

        {/* Номер заказа — главный блок */}
        <div className="bg-card border-2 border-primary/20 rounded-2xl p-6 text-center mb-4">
          <p className="text-sm text-muted-foreground mb-1">Ваш номер заказа</p>
          <p className="font-display font-bold text-5xl text-primary mb-1">#{orderNum}</p>
          <p className="text-xs text-muted-foreground">Сохраните его для отслеживания</p>
        </div>

        {/* Кнопка отслеживания */}
        <a
          href={trackUrl}
          className="flex items-center justify-center gap-3 w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-4 rounded-2xl transition-colors mb-3 text-base"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          Отследить статус заказа
        </a>

        {/* Push-уведомления — показываем если не подписан */}
        {pushState !== "unsupported" && pushState !== "done" && (
          <div className={`rounded-2xl p-4 mb-4 border ${pushState === "denied" ? "bg-muted/30 border-border" : "bg-primary/5 border-primary/20"}`}>
            {pushState === "denied" ? (
              <p className="text-xs text-muted-foreground text-center">
                💡 Разрешите уведомления в настройках браузера — и мы пришлём статус заказа
              </p>
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-xl shrink-0">🔔</div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">Следите за заказом</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Пришлём уведомление когда заказ будет готов</p>
                </div>
                <button
                  onClick={handleEnablePush}
                  disabled={pushState === "busy"}
                  className="shrink-0 px-4 py-2.5 sm:py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 disabled:opacity-60 transition-colors"
                >
                  {pushState === "busy" ? "..." : "Включить"}
                </button>
              </div>
            )}
          </div>
        )}

        {pushState === "done" && (
          <div className="rounded-2xl p-3 mb-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-center">
            <p className="text-sm text-emerald-700 dark:text-emerald-400 font-medium">✓ Уведомления включены — пришлём статус заказа</p>
          </div>
        )}

        {/* Как ещё найти заказ */}
        <div className="bg-muted/50 rounded-2xl p-4 mb-6 text-sm text-muted-foreground space-y-2">
          <p className="font-medium text-foreground text-sm mb-2">📋 Как отслеживать заказ:</p>
          <div className="flex items-start gap-2">
            <span className="text-primary font-bold shrink-0">1.</span>
            <span>По ссылке выше — введите <strong>#{orderNum}</strong> и номер телефона</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-primary font-bold shrink-0">2.</span>
            <span>В письме на email — придёт когда статус изменится</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-primary font-bold shrink-0">3.</span>
            <span>В личном кабинете — если зарегистрированы</span>
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" asChild>
            <a href="/">На главную</a>
          </Button>
          <Button variant="outline" className="flex-1" asChild>
            <a href="/catalog">Продолжить покупки</a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-4xl">
      <div className="flex items-center gap-3 mb-8">
        <BackButton href="/cart" label="Корзина" className="mb-0 shrink-0" />
        <h1 className="font-display font-bold text-3xl">Оформление заказа</h1>
      </div>

      {/* Auth block — only show if not logged in */}
      {!session?.user && (
        <div className="bg-card rounded-2xl border border-border p-5 mb-6">
          <h2 className="font-display font-semibold text-base mb-3 flex items-center gap-2">
            <User className="w-4 h-4 text-primary" />
            Войдите для удобного отслеживания заказа
          </h2>
          <div className="flex gap-2 mb-4">
            {[
              { id: "guest", label: "Гость" },
              { id: "login", label: "Войти" },
              { id: "register", label: "Регистрация" },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setAuthMode(opt.id as any)}
                className={`px-4 py-2.5 sm:py-2 rounded-xl text-sm font-medium border transition-colors ${
                  authMode === opt.id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border hover:bg-accent text-muted-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {authMode === "login" && <CheckoutLoginForm onSuccess={() => {}} />}
          {authMode === "register" && <CheckoutRegisterForm onSuccess={() => {}} />}
          {authMode === "guest" && (
            <p className="text-sm text-muted-foreground">
              Оформляете как гость. Статус заказа можно отследить по номеру заказа и телефону на странице{" "}
              <a href="/track" className="text-primary hover:underline">отслеживания</a>.
            </p>
          )}
        </div>
      )}

      {/* If logged in — show welcome */}
      {session?.user && (
        <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4 mb-6 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
            <CheckCircle className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-medium">Вы вошли как <span className="text-emerald-700 dark:text-emerald-400">{session.user.name || session.user.email}</span></p>
            <p className="text-xs text-muted-foreground">Заказ сохранится в личном кабинете</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <form onSubmit={handleSubmit(onSubmit)} className="lg:col-span-3 space-y-5">

          {/* Client type toggle */}
          <div className="bg-card rounded-2xl border border-border p-5">
            <h2 className="font-display font-semibold text-lg mb-4">Тип клиента</h2>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleClientTypeChange("individual")}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  clientType === "individual"
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border hover:border-primary/40 text-muted-foreground"
                }`}
              >
                <User className={`w-6 h-6 ${clientType === "individual" ? "text-primary" : ""}`} />
                <span className="font-medium text-sm">Физическое лицо</span>
                <span className="text-xs text-muted-foreground text-center">Наличные или перевод</span>
              </button>
              <button
                type="button"
                onClick={() => handleClientTypeChange("company")}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  clientType === "company"
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border hover:border-primary/40 text-muted-foreground"
                }`}
              >
                <Building2 className={`w-6 h-6 ${clientType === "company" ? "text-primary" : ""}`} />
                <span className="font-medium text-sm">Юридическое лицо</span>
                <span className="text-xs text-muted-foreground text-center">ИП или ООО, счёт+НДС</span>
              </button>
            </div>
          </div>

          {/* Company fields */}
          {clientType === "company" && (
            <div className="bg-card rounded-2xl border border-primary/30 p-5 space-y-4">
              <h2 className="font-display font-semibold text-lg flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                Реквизиты организации
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="inn">ИНН *</Label>
                  <div className="relative mt-1">
                    <Input
                      id="inn"
                      placeholder="7712345678"
                      className="pr-8"
                      maxLength={12}
                      {...register("inn", {
                        onBlur: async (e) => {
                          const val = e.target.value.replace(/\D/g, "");
                          if (!/^\d{10}(\d{2})?$/.test(val)) return;
                          setInnLoading(true);
                          setInnError("");
                          try {
                            const res = await fetch(`/api/inn-lookup?inn=${val}`);
                            const data = await res.json();
                            if (data.error) { setInnError(data.error); return; }
                            if (data.name) setValue("orgName", data.name);
                            if (data.kpp) setValue("kpp", data.kpp);
                            if (data.address && deliveryType === "delivery") setValue("address", data.address);
                          } catch { setInnError("Ошибка поиска"); }
                          finally { setInnLoading(false); }
                        },
                      })}
                    />
                    {innLoading && (
                      <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-muted-foreground" />
                    )}
                  </div>
                  {innError && <p className="text-xs text-destructive mt-1">{innError}</p>}
                  {!innError && <p className="text-xs text-muted-foreground mt-1">10 цифр для ООО, 12 для ИП — данные заполнятся автоматически</p>}
                </div>
                <div>
                  <Label htmlFor="kpp">КПП</Label>
                  <Input id="kpp" placeholder="773501001" className="mt-1" maxLength={9} {...register("kpp")} />
                  <p className="text-xs text-muted-foreground mt-1">Для ИП не требуется</p>
                </div>
              </div>
              <div>
                <Label htmlFor="orgName">Название организации *</Label>
                <Input id="orgName" placeholder='Заполнится автоматически по ИНН' className="mt-1" {...register("orgName")} />
              </div>
            </div>
          )}

          {/* Contact info */}
          <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
            <h2 className="font-display font-semibold text-lg">Контактные данные</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">
                  {clientType === "company" ? "Контактное лицо *" : "Имя *"}
                </Label>
                <Input id="name" placeholder="Иван Иванов" className="mt-1" {...register("name")} />
                {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
              </div>
              <div>
                <Label htmlFor="phone">Телефон *</Label>
                <Input
                  id="phone"
                  placeholder="+7 (999) 000-00-00"
                  className="mt-1"
                  value={phoneValue}
                  onChange={e => {
                    const f = formatPhone(e.target.value);
                    setPhoneValue(f);
                    setValue("phone", f);
                  }}
                />
                {errors.phone && <p className="text-xs text-destructive mt-1">{errors.phone.message}</p>}
              </div>
            </div>
            <div>
              <Label htmlFor="email">
                Email <span className="text-destructive">*</span>
              </Label>
              <Input id="email" type="email" placeholder="email@example.ru" className="mt-1" {...register("email")} />
              {errors.email
                ? <p className="text-xs text-destructive mt-1">{errors.email.message}</p>
                : <p className="text-xs text-muted-foreground mt-1">Пришлём подтверждение заказа и PDF счёт</p>
              }
            </div>
          </div>

          {/* Delivery type */}
          <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
            <h2 className="font-display font-semibold text-lg">Способ получения</h2>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => { setDeliveryType("delivery"); setValue("address", ""); }}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  deliveryType === "delivery"
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border hover:border-primary/40 text-muted-foreground"
                }`}
              >
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none"><path d="M1 4h13v13H1V4z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M14 9h4.5L22 13v4h-8V9z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><circle cx="5" cy="19" r="2" stroke="currentColor" strokeWidth="1.5"/><circle cx="18" cy="19" r="2" stroke="currentColor" strokeWidth="1.5"/></svg>
                <span className="font-medium text-sm">Доставка</span>
                <span className="text-xs text-muted-foreground text-center">По Москве и МО</span>
              </button>
              <button
                type="button"
                onClick={() => { setDeliveryType("pickup"); setValue("address", `Самовывоз: ${pickupAddress}`); }}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  deliveryType === "pickup"
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border hover:border-primary/40 text-muted-foreground"
                }`}
              >
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="currentColor" strokeWidth="1.5"/><circle cx="12" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.5"/></svg>
                <span className="font-medium text-sm">Самовывоз</span>
                <span className="text-xs text-muted-foreground text-center">Бесплатно</span>
              </button>
            </div>

            {deliveryType === "delivery" ? (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label htmlFor="address">Адрес доставки *</Label>
                  <button
                    type="button"
                    disabled={geoLoading}
                    onClick={() => {
                      if (!navigator.geolocation) return;
                      setGeoLoading(true);
                      navigator.geolocation.getCurrentPosition(
                        async ({ coords }) => {
                          try {
                            const res = await fetch(
                              `https://nominatim.openstreetmap.org/reverse?lat=${coords.latitude}&lon=${coords.longitude}&format=json&accept-language=ru`,
                              { headers: { "User-Agent": "pilo-rus.ru" } }
                            );
                            const data = await res.json();
                            const a = data.address || {};
                            const parts = [
                              a.city || a.town || a.village || a.county,
                              a.road,
                              a.house_number,
                            ].filter(Boolean);
                            const addr = parts.length ? parts.join(", ") : data.display_name;
                            setValue("address", addr);
                          } catch { /* silent */ }
                          finally { setGeoLoading(false); }
                        },
                        () => setGeoLoading(false),
                        { timeout: 8000 }
                      );
                    }}
                    className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
                  >
                    {geoLoading
                      ? <Loader2 className="w-3 h-3 animate-spin" />
                      : <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="currentColor" strokeWidth="1.5"/><circle cx="12" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.5"/></svg>
                    }
                    {geoLoading ? "Определяем..." : "Определить местоположение"}
                  </button>
                </div>
                <Input id="address" placeholder="г. Москва, ул. Примерная, д.1" {...register("address")} />
                {errors.address && <p className="text-xs text-destructive mt-1">{errors.address.message}</p>}
                <p className="text-xs text-muted-foreground mt-1">Стоимость доставки уточняется менеджером.</p>
              </div>
            ) : (
              <div className="rounded-xl bg-primary/5 border border-primary/20 overflow-hidden">
                <div className="flex items-start gap-3 p-3">
                  <svg className="w-4 h-4 text-primary mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="currentColor" strokeWidth="1.5"/><circle cx="12" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.5"/></svg>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{pickupAddress}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{workingHours} · Есть погрузчик · Предзвоните перед приездом</p>
                  </div>
                </div>
                <a
                  href={`https://yandex.ru/maps/?mode=routes&rtext=~${pickupCoords}&rtt=auto`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3 sm:py-2.5 bg-primary/10 hover:bg-primary/20 transition-colors text-sm font-medium text-primary border-t border-primary/20"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="currentColor" strokeWidth="1.5"/><circle cx="12" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.5"/></svg>
                  Построить маршрут в Яндекс.Картах
                </a>
              </div>
            )}
          </div>

          {/* Payment */}
          <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
            <h2 className="font-display font-semibold text-lg">Способ оплаты</h2>
            <div className="space-y-3">
              {clientType === "individual" && (
                <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl border border-border hover:border-primary/50 transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                  <input type="radio" value="cash" {...register("paymentMethod")} className="mt-0.5" />
                  <div>
                    <p className="font-medium">Наличными при получении</p>
                    <p className="text-sm text-muted-foreground">Оплата наличными или переводом на карту</p>
                  </div>
                </label>
              )}
              <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl border border-border hover:border-primary/50 transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                <input type="radio" value="invoice" {...register("paymentMethod")} className="mt-0.5" />
                <div>
                  <p className="font-medium">Безналичный расчёт по счёту</p>
                  <p className="text-sm text-muted-foreground">Для ИП и ООО. Выставим счёт с реквизитами и НДС.</p>
                </div>
              </label>
            </div>
          </div>

          {/* Preferred contact */}
          <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
            <div>
              <h2 className="font-display font-semibold text-lg">Как вам удобнее связаться?</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Менеджер свяжется удобным для вас способом</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {([
                { value: "phone", label: "Телефон", icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C9.6 21 3 14.4 3 6c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg> },
                { value: "whatsapp", label: "WhatsApp", icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none"><path d="M20.5 3.5A11.9 11.9 0 0012 0C5.4 0 0 5.4 0 12c0 2.1.6 4.2 1.6 6L0 24l6.2-1.6C8 23.4 10 24 12 24c6.6 0 12-5.4 12-12 0-3.2-1.2-6.2-3.5-8.5zm-8.5 18.4c-1.8 0-3.6-.5-5.1-1.4l-.4-.2-3.7 1 1-3.6-.2-.4A9.9 9.9 0 012.1 12C2.1 6.5 6.5 2 12 2s9.9 4.5 9.9 10-4.4 9.9-9.9 9.9zm5.4-7.4c-.3-.1-1.7-.9-2-.9-.2-.1-.4-.1-.6.1-.2.2-.7.9-.9 1.1-.1.2-.3.2-.6.1-.3-.1-1.2-.5-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6l.4-.5c.1-.2.2-.3.2-.5 0-.2-.5-1.3-.7-1.8-.2-.4-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.3.3-1 1-1 2.4s1 2.7 1.2 2.9c.1.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.7-.7 2-1.4.2-.6.2-1.2.1-1.4-.1 0-.3-.1-.6-.2z" fill="currentColor" opacity=".9"/></svg> },
                { value: "telegram", label: "Telegram", icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M22 2L15 22l-4-9-9-4 20-7z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg> },
                { value: "sms", label: "SMS", icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg> },
              ] as const).map((m) => {
                const selected = contactMethod === m.value;
                return (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setValue("contactMethod", m.value)}
                    className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 transition-all text-sm font-medium ${
                      selected
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border hover:border-primary/40 text-muted-foreground"
                    }`}
                  >
                    <span className={selected ? "text-primary" : "text-muted-foreground"}>{m.icon}</span>
                    {m.label}
                  </button>
                );
              })}
            </div>
            {(contactMethod === "telegram" || contactMethod === "whatsapp") && (
              <div>
                <Label htmlFor="contactExtra">
                  {contactMethod === "telegram" ? "Ваш Telegram (@username)" : "Номер WhatsApp"}
                </Label>
                <Input
                  id="contactExtra"
                  placeholder={contactMethod === "telegram" ? "@username" : "+7 (999) 000-00-00"}
                  className="mt-1"
                  {...register("contactExtra")}
                />
              </div>
            )}
          </div>

          {/* Comment */}
          <div className="bg-card rounded-2xl border border-border p-5">
            <Label htmlFor="comment">Комментарий к заказу</Label>
            <textarea
              id="comment"
              placeholder="Особые пожелания, удобное время доставки..."
              rows={3}
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-3 sm:py-2 text-base sm:text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
              {...register("comment")}
            />
          </div>

          <Button type="submit" size="lg" className="w-full" disabled={submitting}>
            {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Отправить заявку
          </Button>
        </form>

        {/* Order summary */}
        <div className="lg:col-span-2">
          <div className="sticky top-24 bg-card rounded-2xl border border-border p-6 space-y-4">
            <h2 className="font-display font-bold text-xl">Ваш заказ</h2>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <div className="flex-1 min-w-0 mr-2">
                    <p className="font-medium line-clamp-1">{item.productName}</p>
                    <p className="text-muted-foreground text-xs">
                      {item.variantSize} · {item.unitType === "CUBE" ? item.quantity.toFixed(1) : item.quantity} {item.unitType === "CUBE" ? "м³" : "шт"}
                    </p>
                  </div>
                  <span className="shrink-0 font-medium">{formatPrice(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-border pt-4">
              <div className="flex justify-between items-center">
                <span className="font-medium">Товары:</span>
                <span className="font-display font-bold text-xl text-primary">{formatPrice(totalPrice())}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Стоимость доставки уточняется менеджером</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
