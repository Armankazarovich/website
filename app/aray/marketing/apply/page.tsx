import Link from "next/link";
import { ArrowLeft, BadgeCheck, CheckCircle2, FileText, Megaphone, Rocket, Workflow } from "lucide-react";
import { ArayAMark } from "@/components/shared/aray-a-mark";
import { ArayMarketingApplicationForm } from "@/components/aray/aray-marketing-application-form";

export const metadata = {
  title: "Заказать маркетинговый отдел · ARAY Production",
  description: "Заявка на маркетинг под ключ от Yuva Studio и ARAY Production.",
};

const INCLUDED = [
  "Сайт и PWA-приложение",
  "SEO и индексация",
  "Реклама и заявки",
  "Брендинг и упаковка",
  "CRM и путь заявки",
  "Отчет и сопровождение",
];

const FLOW = [
  "заявка клиента",
  "бриф и материалы",
  "подтверждение предложения",
  "счет и оплата",
  "производство",
  "запуск и сопровождение",
];

const READY_LAUNCH = [
  "создать проект в ARAY CRM",
  "собрать бриф и материалы",
  "показать превью сайта",
  "подключить домен после проверки",
];

export default function ArayMarketingApplyPage() {
  return (
    <main className="min-h-screen bg-card text-foreground">
      <section className="border-b border-border/10 bg-card">
        <div className="mx-auto max-w-6xl px-5 py-8 lg:px-8">
          <Link href="/aray/partners/yuva-studio" className="inline-flex items-center gap-2 text-sm text-slate-300 hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Назад к Yuva Studio
          </Link>

          <div className="mt-8 grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <div className="mb-6 flex items-center gap-3">
                <ArayAMark size={52} variant="official" />
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.28em]">ARAY Production</p>
                  <p className="text-xs text-slate-300">Yuva Studio / Client Request</p>
                </div>
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.26em] text-foreground">
                Маркетинг под ключ
              </p>
              <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
                Заказать маркетинговый отдел
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-200">
                Получите сайт, приложение, рекламу, SEO, PR, брендинг, автоматизацию и ИИ-сопровождение через одну команду.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {[
                  { label: "Пакет", value: "150 000 ₽ / месяц", icon: BadgeCheck },
                  { label: "Партнер", value: "Yuva Studio", icon: Megaphone },
                  { label: "Производство", value: "ARAY / Yuva", icon: Workflow },
                  { label: "Следующий шаг", value: "бриф и ТЗ", icon: FileText },
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

            <ArayMarketingApplicationForm />
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-8 px-5 py-10 lg:grid-cols-[1fr_1fr] lg:px-8">
        <div className="rounded-2xl border border-border/10 bg-card/[0.04] p-5">
          <h2 className="text-xl font-semibold">Что входит</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {INCLUDED.map((item) => (
              <div key={item} className="flex gap-3 rounded-xl border border-border/10 bg-card p-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-foreground" />
                <span className="text-sm leading-6 text-slate-200">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border/10 bg-card/[0.04] p-5">
          <h2 className="text-xl font-semibold">Как пойдет работа</h2>
          <div className="mt-5 grid gap-3">
            {FLOW.map((step, index) => (
              <div key={step} className="flex gap-4 rounded-xl border border-border/10 bg-card p-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-foreground">
                  {index + 1}
                </span>
                <p className="text-sm leading-6 text-slate-200">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border/10 bg-card/[0.025]">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-10 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Rocket className="h-4 w-4" />
              Готовый запуск
            </div>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">Создать проект и показать первый результат</h2>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              После заявки проект попадает в ARAY CRM. Команда собирает бриф, готовит превью сайта, проверяет формы и запускает домен только после подтверждения.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {READY_LAUNCH.map((step, index) => (
              <div key={step} className="flex gap-3 rounded-xl border border-border/10 bg-card p-4 text-sm leading-6 text-slate-200">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-card text-xs font-bold text-foreground">
                  {index + 1}
                </span>
                <span>{step}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
