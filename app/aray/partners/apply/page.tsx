import Link from "next/link";
import { ArrowLeft, BadgeCheck, CheckCircle2, Globe2, Handshake, ShieldCheck } from "lucide-react";
import { ArayAMark } from "@/components/shared/aray-a-mark";
import { ArayPartnerApplicationForm } from "@/components/aray/aray-partner-application-form";
import { ARAY_PARTNER_PUBLIC_SERVICES } from "@/lib/aray-pilot-partner";

export const metadata = {
  title: "Стать партнером ARAY",
  description: "Анкета партнера ARAY Production / Yuva Studio.",
};

const PARTNER_RULES = [
  "Клиент видит стоимость услуги и результат, но не видит внутреннюю долю партнера.",
  "Партнер выставляет счет клиенту после подтверждения предложения.",
  "После оплаты клиентом партнер оплачивает ARAY/Yuva по проверенному счету.",
  "ARAY/Yuva выполняет производство: сайт, PWA, SEO, реклама, PR, брендинг, автоматизация и ИИ.",
  "Партнер сопровождает клиента в регионе и работает по утвержденным материалам.",
];

const PARTNER_FLOW = [
  "заявка партнера",
  "проверка региона и юридического статуса",
  "обучение и бренд-комплект",
  "публичная страница партнера",
  "клиенты, подтверждения и счета",
  "производство и отчеты",
];

const PARTNER_AUDIENCES = [
  {
    title: "Блогерам",
    text: "Приводите предпринимателей из своей аудитории и получайте партнерскую долю за сопровождение.",
  },
  {
    title: "Фрилансерам",
    text: "Продавайте не одиночную услугу, а целый маркетинговый отдел с производством ARAY/Yuva.",
  },
  {
    title: "Студиям",
    text: "Создайте свое название студии, подключите реквизиты и работайте как партнер ARAY Production.",
  },
  {
    title: "Менеджерам",
    text: "Ведите клиентов в своем городе, собирайте брифы и запускайте задачи в общей CRM.",
  },
];

export default function ArayPartnerApplyPage() {
  return (
    <main className="min-h-screen bg-card text-foreground">
      <section className="border-b border-border/10 bg-card">
        <div className="mx-auto max-w-6xl px-5 py-8 lg:px-8">
          <Link href="/aray/partners/yuva-studio" className="inline-flex items-center gap-2 text-sm text-slate-300 hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Назад к странице партнера
          </Link>

          <div className="mt-8 grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <div className="mb-6 flex items-center gap-3">
                <ArayAMark size={52} variant="official" />
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.28em]">ARAY Production</p>
                  <p className="text-xs text-slate-300">Partner Application</p>
                </div>
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.26em] text-foreground">
                Партнерская сеть
              </p>
              <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
                Стать партнером ARAY
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-200">
                Продавайте маркетинговый отдел под ключ в своем регионе, а производство выполняет команда ARAY/Yuva.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {[
                  { label: "Вход", value: "заявка в один клик", icon: BadgeCheck },
                  { label: "Партнерский режим", value: "50 / 50", icon: ShieldCheck },
                  { label: "Мы видим", value: "всю CRM и одобрение", icon: Globe2 },
                  { label: "Все работает", value: "через счета и договоры", icon: Handshake },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="rounded-xl border border-border/10 bg-card/[0.04] p-4">
                      <Icon className="h-5 w-5 text-foreground" />
                      <p className="mt-3 text-[11px] uppercase tracking-[0.16em] text-slate-400">{item.label}</p>
                      <p className="mt-1 text-sm font-semibold text-foreground">{item.value}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <ArayPartnerApplicationForm />
          </div>
        </div>
      </section>

      <section className="border-b border-border/10 bg-card/[0.025]">
        <div className="mx-auto max-w-6xl px-5 py-10 lg:px-8">
          <div className="mb-5 max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-foreground">
              Один вход для партнеров
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">
              Блогер, фрилансер или студия сразу понимает: можно работать с ARAY 50/50
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              Эта информация находится в партнерском разделе. Клиентская витрина показывает услугу и результат,
              а партнерский кабинет показывает внутреннюю экономику и статусы оплат.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            {PARTNER_AUDIENCES.map((item) => (
              <div key={item.title} className="rounded-2xl border border-border/10 bg-card p-5">
                <h3 className="text-lg font-semibold text-foreground">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-300">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-8 px-5 py-10 lg:grid-cols-[1fr_1fr] lg:px-8">
        <div className="rounded-2xl border border-border/10 bg-card/[0.04] p-5">
          <h2 className="text-xl font-semibold">Что продает партнер</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {ARAY_PARTNER_PUBLIC_SERVICES.map((service) => (
              <div key={service} className="flex gap-3 rounded-xl border border-border/10 bg-card p-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-foreground" />
                <span className="text-sm leading-6 text-slate-200">{service}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border/10 bg-card/[0.04] p-5">
          <h2 className="text-xl font-semibold">Правила логики</h2>
          <div className="mt-4 space-y-3">
            {PARTNER_RULES.map((rule) => (
              <div key={rule} className="flex gap-3 text-sm leading-6 text-slate-300">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-foreground" />
                <span>{rule}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-12 lg:px-8">
        <div className="rounded-2xl border border-border/10 bg-card p-5">
          <h2 className="text-xl font-semibold">Путь заявки в CRM</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-5">
            {PARTNER_FLOW.map((step, index) => (
              <div key={step} className="rounded-xl border border-border/10 bg-card p-4">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-foreground">
                  {index + 1}
                </span>
                <p className="mt-3 text-sm leading-6 text-slate-200">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
