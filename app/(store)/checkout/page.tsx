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
import { useSession, signIn } from "next-auth/react";

type ClientType = "individual" | "company";

const checkoutSchema = z.object({
  name: z.string().min(2, "Введите имя"),
  phone: z.string().min(10, "Введите корректный номер телефона"),
  email: z.string().email("Введите корректный email").optional().or(z.literal("")),
  address: z.string().min(5, "Введите адрес доставки"),
  paymentMethod: z.enum(["cash", "invoice"]),
  comment: z.string().optional(),
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
        className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
      <input
        type="password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        placeholder="Пароль"
        className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
      {error && <p className="text-destructive text-xs">{error}</p>}
      <button type="submit" disabled={loading} className="bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
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
      <input value={name} onChange={e => setName(e.target.value)} placeholder="Ваше имя" className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
      <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
      <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Пароль (минимум 6 символов)" className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
      {error && <p className="text-destructive text-xs">{error}</p>}
      <button type="submit" disabled={loading} className="bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
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
  const [clientType, setClientType] = useState<ClientType>("individual");
  const [authMode, setAuthMode] = useState<"guest" | "login" | "register">("guest");
  const [mounted, setMounted] = useState(false);
  const { data: session } = useSession();

  useEffect(() => { setMounted(true); }, []);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CheckoutForm>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: { paymentMethod: "cash" },
  });

  // Автозаполнение данных залогиненного пользователя
  useEffect(() => {
    if (!session?.user?.id) return;
    fetch("/api/me")
      .then((r) => r.json())
      .then((user) => {
        if (user.name) setValue("name", user.name);
        if (user.phone) setValue("phone", user.phone);
        if (user.email) setValue("email", user.email);
        if (user.address) setValue("address", user.address);
      })
      .catch(() => {});
  }, [session?.user?.id, setValue]);

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
      // Build comment with company info if needed
      let comment = data.comment || "";
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
      <h1 className="font-display font-bold text-3xl mb-8">Оформление заказа</h1>

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
                className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
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
              <div>
                <Label htmlFor="orgName">Название организации *</Label>
                <Input id="orgName" placeholder='ООО "Ромашка" / ИП Иванов И.И.' className="mt-1" {...register("orgName")} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="inn">ИНН *</Label>
                  <Input id="inn" placeholder="7712345678" className="mt-1" maxLength={12} {...register("inn")} />
                  <p className="text-xs text-muted-foreground mt-1">10 цифр для ООО, 12 для ИП</p>
                </div>
                <div>
                  <Label htmlFor="kpp">КПП</Label>
                  <Input id="kpp" placeholder="773501001" className="mt-1" maxLength={9} {...register("kpp")} />
                  <p className="text-xs text-muted-foreground mt-1">Для ИП не требуется</p>
                </div>
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
                <Input id="phone" placeholder="+7 (999) 000-00-00" className="mt-1" {...register("phone")} />
                {errors.phone && <p className="text-xs text-destructive mt-1">{errors.phone.message}</p>}
              </div>
            </div>
            <div>
              <Label htmlFor="email">Email (необязательно)</Label>
              <Input id="email" type="email" placeholder="email@example.ru" className="mt-1" {...register("email")} />
            </div>
          </div>

          {/* Delivery */}
          <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
            <h2 className="font-display font-semibold text-lg">Адрес доставки</h2>
            <div>
              <Label htmlFor="address">Адрес *</Label>
              <Input id="address" placeholder="г. Москва, ул. Примерная, д.1" className="mt-1" {...register("address")} />
              {errors.address && <p className="text-xs text-destructive mt-1">{errors.address.message}</p>}
              <p className="text-xs text-muted-foreground mt-1">Доставляем по Москве и МО. Стоимость уточняется менеджером.</p>
            </div>
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

          {/* Comment */}
          <div className="bg-card rounded-2xl border border-border p-5">
            <Label htmlFor="comment">Комментарий к заказу</Label>
            <textarea
              id="comment"
              placeholder="Особые пожелания, удобное время доставки..."
              rows={3}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
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
