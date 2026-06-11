import Link from "next/link";
import { ArrowRight, BadgeCheck, Building2, CheckCircle2, FileText, Globe2, Handshake, Megaphone, Send } from "lucide-react";
import { ArayAMark } from "@/components/shared/aray-a-mark";
import {
  ARAY_PARTNER_PUBLIC_SERVICES,
  ARAY_PARTNER_PUBLIC_STEPS,
  ARAY_PILOT_PARTNER,
  ARAY_PILOT_PARTNER_PROJECTS,
} from "@/lib/aray-pilot-partner";

export const metadata = {
  title: "Yuva Studio · Партнер ARAY Production",
  description: "Партнерская студия ARAY Production / Yuva Studio для маркетинга под ключ.",
};

export default function AraikVardanyanPartnerPage() {
  return (
    <main className="min-h-screen bg-card text-foreground">
      <section className="relative overflow-hidden border-b border-border/10 bg-card">
        <div className="mx-auto grid min-h-[88vh] max-w-6xl content-center gap-8 px-5 py-10 lg:grid-cols-[1fr_0.8fr] lg:px-8">
          <div className="flex flex-col justify-center">
            <div className="mb-6 flex items-center gap-3">
              <ArayAMark size={54} variant="official" />
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.28em]">ARAY Production</p>
                <p className="text-xs text-slate-300">B2B Partner Studio</p>
              </div>
            </div>

            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-foreground">
              {ARAY_PILOT_PARTNER.publicRole}
            </p>
            <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              {ARAY_PILOT_PARTNER.name}
            </h1>
            <p className="mt-5 max-w-2xl text-xl leading-8 text-slate-200">
              {ARAY_PILOT_PARTNER.publicHeadline}
            </p>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
              {ARAY_PILOT_PARTNER.publicStory}
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                href="/aray/marketing/apply"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-card px-5 text-sm font-semibold text-foreground transition hover:bg-card"
              >
                Оставить заявку
                <Send className="h-4 w-4" />
              </Link>
              <Link
                href="/aray/brand-assets/documents/aray-commercial-offer-ru.html"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-border/18 bg-card/5 px-5 text-sm font-semibold text-foreground transition hover:bg-card/10"
              >
                Посмотреть предложение
                <FileText className="h-4 w-4" />
              </Link>
              <Link
                href={ARAY_PILOT_PARTNER.website}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-border/18 bg-card/5 px-5 text-sm font-semibold text-foreground transition hover:bg-card/10"
              >
                Сайт Yuva Studio
                <Globe2 className="h-4 w-4" />
              </Link>
              <Link
                href="/aray/partners/apply"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-primary/35 bg-card px-5 text-sm font-semibold text-foreground transition hover:bg-card"
              >
                Стать партнером
                <Handshake className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="flex items-center justify-center lg:justify-end">
            <div className="w-full max-w-md rounded-2xl border border-border/12 bg-background/24 p-5 shadow-2xl shadow-black/30 ">
              <div className="rounded-xl border border-border/10 bg-card p-6">
                <ArayAMark size={190} variant="official" className="mx-auto" />
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {[
                  { label: "Статус", value: "партнерская студия" },
                  { label: "Регион", value: ARAY_PILOT_PARTNER.region },
                  { label: "Модель", value: "B2B-платформа" },
                  { label: "Производство", value: "ARAY / Yuva" },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl border border-border/10 bg-card/[0.04] p-3">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">{item.label}</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-10 lg:px-8">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { title: "Маркетинг", text: "Сайт, приложение, реклама, SEO, PR и упаковка бизнеса.", icon: Megaphone },
            { title: "Автоматизация", text: "CRM, заказы, отчеты, процессы и единая админка.", icon: Building2 },
            { title: "Партнерство", text: "Партнер ведет клиента, ARAY/Yuva выполняет производство.", icon: BadgeCheck },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.title} className="rounded-2xl border border-border/10 bg-card/[0.04] p-5">
                <Icon className="h-5 w-5 text-foreground" />
                <h2 className="mt-4 text-lg font-semibold">{item.title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-300">{item.text}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="border-y border-border/10 bg-card/[0.03]">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-10 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-foreground">Услуги</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">Что можно заказать</h2>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              Партнер помогает собрать заявку, бриф и подтверждение, а команда ARAY/Yuva берет производство и сопровождение после оплаты.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {ARAY_PARTNER_PUBLIC_SERVICES.map((service) => (
              <div key={service} className="flex gap-3 rounded-xl border border-border/10 bg-card p-4">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-foreground" />
                <span className="text-sm leading-6 text-slate-200">{service}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-8 px-5 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
        <div>
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold">
            <Globe2 className="h-4 w-4 text-foreground" />
            Как работает заявка
          </div>
          <div className="space-y-3">
            {ARAY_PARTNER_PUBLIC_STEPS.map((step, index) => (
              <div key={step} className="flex gap-4 rounded-xl border border-border/10 bg-card/[0.04] p-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-foreground">
                  {index + 1}
                </span>
                <p className="text-sm leading-6 text-slate-200">{step}</p>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold">
            <BadgeCheck className="h-4 w-4 text-foreground" />
            Пилотные проекты
          </div>
          <div className="space-y-3">
            {ARAY_PILOT_PARTNER_PROJECTS.map((project) => (
              <article key={project.id} className="rounded-xl border border-border/10 bg-card/[0.04] p-5">
                <h3 className="text-lg font-semibold">{project.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-300">{project.role}</p>
                <div className="mt-4 inline-flex rounded-full border border-primary/30 bg-card px-3 py-1 text-xs font-semibold text-foreground">
                  прикреплен к партнеру
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-12 lg:px-8">
        <div className="flex flex-col gap-4 rounded-2xl border border-border/10 bg-card p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Хотите такой же маркетинговый отдел?</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Оставьте заявку, партнер ARAY соберет вводные, подтвердит предложение и запустит производство после оплаты.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              href="/aray/marketing/apply"
              className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-card px-5 text-sm font-semibold text-foreground transition hover:bg-slate-100"
            >
              Начать
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/aray/partners/apply"
              className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl border border-border/14 bg-card/5 px-5 text-sm font-semibold text-foreground transition hover:bg-card/10"
            >
              Стать партнером
              <Handshake className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
