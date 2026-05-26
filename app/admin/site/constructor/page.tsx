import Link from "next/link";
import {
  ArrowRight,
  Boxes,
  CheckCircle2,
  Globe2,
  ListChecks,
  MessageCircle,
  Package,
  Rocket,
  ShieldCheck,
  Smartphone,
  Store,
  Terminal,
} from "lucide-react";
import {
  ONE_CLICK_STORE_QUALITY_GATES,
  ONE_CLICK_STORE_REQUIRED_MODULES,
  ONE_CLICK_STORE_REQUIRED_ROUTES,
  STORE_CONSTRUCTOR_BUSINESS_TYPES,
  getOneClickStoreLaunchContract,
  getStoreConstructorBlueprint,
  getStoreConstructorReadinessMatrix,
} from "@/lib/store-constructor-blueprints";

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
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary/80">
            ARAY Constructor
          </p>
          <h1 className="mt-2 font-display text-2xl font-bold text-foreground">
            Конструктор магазина в один клик
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Фиксируем эталон: новый магазин создаётся только через тенант, профиль бизнеса, единый
            Арай-виджет, каталог, checkout, PWA и преддеплойные проверки.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Link
            href="/admin/aray/modules"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold text-foreground transition-colors hover:border-primary/45 hover:text-primary"
          >
            <ShieldCheck className="h-4 w-4" />
            Модули
          </Link>
          <Link
            href="/admin/business/settings"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Rocket className="h-4 w-4" />
            Бизнес-настройки
          </Link>
        </div>
      </div>

      <section
        className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
        data-one-click-store-contract
      >
        {[
          {
            title: "Модули",
            value: ONE_CLICK_STORE_REQUIRED_MODULES.length,
            detail: "ядро, заказы, терминал, Арай, финансы",
            icon: Boxes,
          },
          {
            title: "Маршруты",
            value: ONE_CLICK_STORE_REQUIRED_ROUTES.length,
            detail: "витрина, админка, PWA и сервер",
            icon: Globe2,
          },
          {
            title: "Бизнесы",
            value: blueprints.length,
            detail: "пиломатериалы, retail, услуги и другие",
            icon: Store,
          },
          {
            title: "Проверки",
            value: ONE_CLICK_STORE_QUALITY_GATES.length,
            detail: "качество, мобильный браузер и деплой",
            icon: ListChecks,
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <article key={item.title} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                    {item.title}
                  </p>
                  <p className="mt-2 text-3xl font-bold text-foreground">{item.value}</p>
                </div>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-primary">
                  <Icon className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-3 text-xs leading-5 text-muted-foreground">{item.detail}</p>
            </article>
          );
        })}
      </section>

      <section className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="rounded-xl border border-border bg-card">
          <div className="border-b border-border p-4">
            <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              Контракт запуска
            </h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Версия {contract.version}. Это не фейковая кнопка, а порядок создания магазина, который
              можно безопасно превратить в автоматический запуск.
            </p>
          </div>
          <div className="divide-y divide-border">
            {contract.launchSteps.map((step, index) => (
              <div key={step.id} className="grid gap-3 p-4 md:grid-cols-[52px_minmax(0,1fr)_160px] md:items-start">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-background text-sm font-bold text-primary">
                  {String(index + 1).padStart(2, "0")}
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-foreground">{step.title}</h3>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Данные: {step.dataObjects.length ? step.dataObjects.join(", ") : "без новых таблиц"}
                  </p>
                  <p className="mt-1 break-words text-xs leading-5 text-muted-foreground">
                    Маршруты: {step.routes.join(", ")}
                  </p>
                </div>
                <span className={`inline-flex h-8 items-center justify-center rounded-xl border px-3 text-xs font-semibold ${statusClassName[step.status]}`}>
                  {statusLabel[step.status]}
                </span>
              </div>
            ))}
          </div>
        </div>

        <aside className="rounded-xl border border-border bg-card">
          <div className="border-b border-border p-4">
            <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Матрица готовности
            </h2>
          </div>
          <div className="divide-y divide-border">
            {readiness.map((item) => (
              <div key={item.id} className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
                  <span className={`shrink-0 rounded-xl border px-2.5 py-1 text-xs font-semibold ${statusClassName[item.status]}`}>
                    {statusLabel[item.status]}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  {item.evidence.join(" · ")}
                </p>
              </div>
            ))}
          </div>
        </aside>
      </section>

      <section className="mt-6" data-store-constructor-blueprint-grid>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-foreground">Готовые типы магазина</h2>
          <Link
            href="/admin/site"
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-border px-3 text-sm font-semibold text-foreground transition-colors hover:border-primary/45 hover:text-primary"
          >
            Настройки сайта
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {blueprints.map((blueprint) => (
            <article key={blueprint.key} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-foreground">{blueprint.title}</h3>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{blueprint.storeKind}</p>
                </div>
                <span className="rounded-xl border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                  {blueprint.terminalProfile}
                </span>
              </div>

              <div className="mt-4 grid gap-3 text-xs text-muted-foreground">
                <div className="flex gap-2">
                  <Package className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                  <span>{blueprint.catalogSeed.categories.slice(0, 4).join(", ")}</span>
                </div>
                <div className="flex gap-2">
                  <Terminal className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                  <span>{blueprint.checkoutModes.join(", ")}</span>
                </div>
                <div className="flex gap-2">
                  <MessageCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                  <span>{blueprint.arayChannels.join(", ")}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-border bg-card p-4" data-store-constructor-quality-gates>
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-primary">
            <Smartphone className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-foreground">Финальный стандарт перед запуском</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Каждый новый магазин должен пройти те же проверки, что и PiloRus: сборка, PWA, корзина,
              мобильный сценарий, сравнение/желания, сторис и преддеплой.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {ONE_CLICK_STORE_QUALITY_GATES.map((gate) => (
                <span key={gate} className="rounded-xl border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-muted-foreground">
                  {gate}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
