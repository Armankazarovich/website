export const dynamic = "force-dynamic";

import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CheckCircle2,
  FileLock2,
  Globe2,
  Landmark,
  PlusCircle,
  Receipt,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ARAY_PARTNER_MONTHLY_ARAY_SHARE_RUB,
  ARAY_PARTNER_MONTHLY_PARTNER_SHARE_RUB,
  ARAY_PARTNER_MONTHLY_PRICE_RUB,
  ARAY_PAYMENT_CONTROL_RULES,
  ARAY_PAYMENT_PROFILE_ACTIONS,
  ARAY_PAYMENT_PROFILE_STATUS_CLASSES,
  ARAY_PAYMENT_PROFILE_STATUS_LABELS,
  ARAY_PAYMENT_PROFILES,
  ARAY_PAYMENT_SETUP_STEPS,
} from "@/lib/aray-payment-profiles";

const formatRub = (value: number) =>
  new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(value);

const ACTIVE_PROFILE = ARAY_PAYMENT_PROFILES[0];

export default function ArayRequisitesPage() {
  return (
    <div className="admin-page-frame admin-page-frame-readable">
      <section className="rounded-2xl border border-border bg-card px-5 py-6 lg:px-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              ARAY Payment Control
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
              Реквизиты и платежи
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Центр управления получателями платежей ARAY/Yuva: ИП, будущие ООО, банки, счета,
              страны, валюты и безопасная проверка перед выставлением счета партнеру.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href="/aray/brand-assets/documents/aray-payments-requisites-ru.html">
                Документ
                <Receipt className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild>
              <Link href="/admin/aray/orders">
                Заказы
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-4">
        {[
          { label: "Клиент платит партнеру", value: formatRub(ARAY_PARTNER_MONTHLY_PRICE_RUB), icon: Receipt },
          { label: "Доля партнера", value: formatRub(ARAY_PARTNER_MONTHLY_PARTNER_SHARE_RUB), icon: BadgeCheck },
          { label: "Платеж ARAY/Yuva", value: formatRub(ARAY_PARTNER_MONTHLY_ARAY_SHARE_RUB), icon: Landmark },
          { label: "Текущий режим", value: "счет и договор", icon: ShieldCheck },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="rounded-2xl border border-border bg-card p-4">
              <Icon className="h-5 w-5 text-primary" />
              <p className="mt-3 text-xs text-muted-foreground">{item.label}</p>
              <p className="mt-1 text-lg font-semibold text-foreground">{item.value}</p>
            </div>
          );
        })}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Landmark className="h-4 w-4 text-primary" />
                Активный платежный профиль
              </div>
              <h2 className="mt-3 text-xl font-semibold text-foreground">{ACTIVE_PROFILE.title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{ACTIVE_PROFILE.role}</p>
            </div>
            <span
              className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                ARAY_PAYMENT_PROFILE_STATUS_CLASSES[ACTIVE_PROFILE.status]
              }`}
            >
              {ARAY_PAYMENT_PROFILE_STATUS_LABELS[ACTIVE_PROFILE.status]}
            </span>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {[
              { label: "Тип", value: ACTIVE_PROFILE.entityType },
              { label: "Страна", value: ACTIVE_PROFILE.country },
              { label: "Валюта", value: ACTIVE_PROFILE.currency },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-border bg-background px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{item.label}</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-xl border border-primary/25 bg-primary/10 p-4">
            <div className="flex gap-3">
              <FileLock2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div>
                <p className="text-sm font-semibold text-foreground">{ACTIVE_PROFILE.bankDataState}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{ACTIVE_PROFILE.visibilityRule}</p>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">{ACTIVE_PROFILE.safeNote}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <PlusCircle className="h-4 w-4 text-primary" />
            Что можно будет менять
          </div>
          <div className="mt-4 space-y-3">
            {ARAY_PAYMENT_PROFILE_ACTIONS.map((action) => (
              <div key={action} className="flex gap-3 text-sm leading-6 text-muted-foreground">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>{action}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center gap-2 px-1 text-sm font-medium text-foreground">
          <Building2 className="h-4 w-4 text-primary" />
          Платежные профили
        </div>
        <div className="grid gap-3 lg:grid-cols-3">
          {ARAY_PAYMENT_PROFILES.map((profile) => (
            <div key={profile.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{profile.title}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {profile.entityType} · {profile.country} · {profile.currency}
                  </p>
                </div>
                <span
                  className={`rounded-full border px-2 py-1 text-[10px] font-semibold ${
                    ARAY_PAYMENT_PROFILE_STATUS_CLASSES[profile.status]
                  }`}
                >
                  {ARAY_PAYMENT_PROFILE_STATUS_LABELS[profile.status]}
                </span>
              </div>
              <p className="mt-4 text-xs leading-5 text-muted-foreground">{profile.role}</p>
              <p className="mt-3 text-xs leading-5 text-muted-foreground">{profile.safeNote}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Правила безопасности
          </div>
          <div className="mt-4 space-y-3">
            {ARAY_PAYMENT_CONTROL_RULES.map((rule) => (
              <div key={rule} className="flex gap-3 text-sm leading-6 text-muted-foreground">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>{rule}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Globe2 className="h-4 w-4 text-primary" />
            Как запускаем страны и банки
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {ARAY_PAYMENT_SETUP_STEPS.map((step, index) => (
              <div key={step.title} className="rounded-xl border border-border bg-background p-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {index + 1}
                </span>
                <h3 className="mt-3 text-sm font-semibold text-foreground">{step.title}</h3>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
