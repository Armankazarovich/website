import {
  CheckCircle2,
  ClipboardList,
  Globe2,
  ListChecks,
  ShieldCheck,
  Store,
} from "lucide-react";
import {
  ONE_CLICK_STORE_DOMAIN_STEPS,
  ONE_CLICK_STORE_IMPORT_COLUMNS,
  ONE_CLICK_STORE_ONBOARDING_STEPS,
  ONE_CLICK_STORE_QUESTIONNAIRE,
  ONE_CLICK_STORE_QUALITY_GATES,
  STORE_CONSTRUCTOR_BUSINESS_TYPES,
  getOneClickStoreLaunchContract,
  getStoreConstructorBlueprint,
  getStoreConstructorReadinessMatrix,
} from "@/lib/store-constructor-blueprints";
import { LaunchControlPanel } from "./launch-control-panel";

const statusLabel = {
  ready: "Готово",
  guarded: "Под защитой",
  "owner-input": "Нужны данные",
} as const;

const statusClassName = {
  ready: "border-emerald-500/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  guarded: "border-sky-500/35 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  "owner-input": "border-amber-500/35 bg-amber-500/10 text-amber-700 dark:text-amber-300",
} as const;

export default function AdminSiteConstructorPage() {
  const contract = getOneClickStoreLaunchContract("lumber");
  const readiness = getStoreConstructorReadinessMatrix();
  const blueprints = STORE_CONSTRUCTOR_BUSINESS_TYPES.map((type) => getStoreConstructorBlueprint(type));

  return (
    <main className="admin-page-frame admin-page-frame-fluid pb-16" data-store-constructor-page>
      <LaunchControlPanel
        blueprints={blueprints}
        onboardingSteps={ONE_CLICK_STORE_ONBOARDING_STEPS}
        domainSteps={ONE_CLICK_STORE_DOMAIN_STEPS}
        questionnaire={ONE_CLICK_STORE_QUESTIONNAIRE}
        importColumns={ONE_CLICK_STORE_IMPORT_COLUMNS}
      />

      <details className="mt-6 rounded-2xl border border-border bg-card p-5">
        <summary className="cursor-pointer text-base font-semibold text-foreground">
          Технический паспорт запуска
        </summary>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          Это служебная часть для нас: проверяем, что магазин запускается как PiloRus, но с отдельной базой, доменом и настройками.
        </p>

        <section className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4" data-one-click-store-contract>
          {[
            { title: "Контракт", value: contract.version, detail: "версия правила запуска", icon: ShieldCheck },
            { title: "Маршруты", value: contract.requiredRoutes.length, detail: "витрина, админка, PWA и служебные связи", icon: Globe2 },
            { title: "Бизнесы", value: blueprints.length, detail: "пиломатериалы, стройматериалы и другие", icon: Store },
            { title: "Проверки", value: ONE_CLICK_STORE_QUALITY_GATES.length, detail: "качество перед публикацией", icon: ListChecks },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.title} className="rounded-xl border border-border bg-background p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">{item.title}</p>
                    <p className="mt-2 truncate text-xl font-bold text-foreground">{item.value}</p>
                  </div>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-primary">
                    <Icon className="h-4 w-4" />
                  </span>
                </div>
                <p className="mt-3 text-xs leading-5 text-muted-foreground">{item.detail}</p>
              </article>
            );
          })}
        </section>

        <section className="mt-5" data-store-constructor-onboarding-checklist>
          <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <ClipboardList className="h-4 w-4 text-primary" />
            Мастер запуска
          </h2>
          <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {ONE_CLICK_STORE_ONBOARDING_STEPS.map((step, index) => (
              <article key={step.id} className="rounded-xl border border-border bg-background p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-primary">{String(index + 1).padStart(2, "0")}</p>
                    <h3 className="mt-1 text-sm font-semibold text-foreground">{step.title}</h3>
                  </div>
                  <span className={`shrink-0 rounded-xl border px-2.5 py-1 text-xs font-semibold ${statusClassName[step.status]}`}>
                    {statusLabel[step.status]}
                  </span>
                </div>
                <p className="mt-3 text-xs leading-5 text-muted-foreground">
                  {step.systemOutput.join(", ")}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-5" data-store-constructor-domain-plan>
          <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <Globe2 className="h-4 w-4 text-primary" />
            Домен
          </h2>
          <div className="mt-3 grid gap-3 lg:grid-cols-5">
            {ONE_CLICK_STORE_DOMAIN_STEPS.map((step, index) => (
              <article key={step.id} className="rounded-xl border border-border bg-background p-4">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-card text-xs font-bold text-primary">
                  {index + 1}
                </span>
                <h3 className="mt-3 text-sm font-semibold text-foreground">{step.title}</h3>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">{step.verification}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]" data-store-constructor-questionnaire>
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
              <ClipboardList className="h-4 w-4 text-primary" />
              Анкета клиента
            </h2>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {ONE_CLICK_STORE_QUESTIONNAIRE.map((group) => (
                <article key={group.id} className="rounded-xl border border-border bg-background p-3">
                  <h3 className="text-sm font-semibold text-foreground">{group.title}</h3>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">
                    {group.fields.join(", ")}
                  </p>
                </article>
              ))}
            </div>
          </div>
          <aside className="rounded-xl border border-border bg-background p-4">
            <h2 className="text-base font-semibold text-foreground">Поля прайса</h2>
            <div className="mt-3 grid gap-2">
              {ONE_CLICK_STORE_IMPORT_COLUMNS.slice(0, 8).map((column) => (
                <div key={column.key} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-3 py-2">
                  <span className="text-sm font-semibold text-foreground">{column.label}</span>
                  <span className="text-xs text-muted-foreground">{column.required ? "обяз." : "опц."}</span>
                </div>
              ))}
            </div>
          </aside>
        </section>

        <section className="mt-5" data-store-constructor-blueprint-grid>
          <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <Store className="h-4 w-4 text-primary" />
            Типы магазинов
          </h2>
          <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {blueprints.map((blueprint) => (
              <article key={blueprint.key} className="rounded-xl border border-border bg-background p-4">
                <h3 className="text-sm font-semibold text-foreground">{blueprint.title}</h3>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  {blueprint.catalogSeed.categories.slice(0, 4).join(", ")}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-5 rounded-xl border border-border bg-background p-4" data-store-constructor-quality-gates>
          <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            Финальные проверки
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {ONE_CLICK_STORE_QUALITY_GATES.map((gate) => (
              <span key={gate} className="rounded-xl border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-muted-foreground">
                {gate}
              </span>
            ))}
          </div>
          <div className="mt-4 grid gap-2">
            {readiness.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-3 py-2">
                <span className="text-sm font-semibold text-foreground">{item.title}</span>
                <span className={`shrink-0 rounded-xl border px-2.5 py-1 text-xs font-semibold ${statusClassName[item.status]}`}>
                  {statusLabel[item.status]}
                </span>
              </div>
            ))}
          </div>
        </section>
      </details>
    </main>
  );
}
