import Link from "next/link";
import {
  CheckCircle2,
  ExternalLink,
  GitBranch,
  Globe2,
  LockKeyhole,
  Network,
  Rocket,
  ShieldCheck,
  Store,
} from "lucide-react";
import {
  getArayReleaseControl,
  type ArayDeploymentTargetStatus,
  type ArayReleaseGateStatus,
} from "@/lib/aray-release-control";

const gateStatusLabel: Record<ArayReleaseGateStatus, string> = {
  passed: "прошло",
  ready: "готово",
  "manual-confirm": "подтверждение",
  next: "следующий слой",
};

const gateStatusClassName: Record<ArayReleaseGateStatus, string> = {
  passed: "border-emerald-500/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  ready: "border-sky-500/35 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  "manual-confirm": "border-amber-500/35 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  next: "border-primary/30 bg-primary/10 text-primary",
};

const targetStatusLabel: Record<ArayDeploymentTargetStatus, string> = {
  synced: "в ядре",
  preview: "превью",
  "needs-channel": "нужен канал",
  planned: "план",
};

const targetStatusClassName: Record<ArayDeploymentTargetStatus, string> = {
  synced: "border-emerald-500/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  preview: "border-sky-500/35 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  "needs-channel": "border-amber-500/35 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  planned: "border-border bg-background text-muted-foreground",
};

const boundaryClassName = {
  self: "border-emerald-500/25 bg-emerald-500/10",
  confirm: "border-amber-500/25 bg-amber-500/10",
  blocked: "border-red-500/25 bg-red-500/10",
} as const;

export default function AdminSiteReleasesPage() {
  const release = getArayReleaseControl();

  return (
    <main className="admin-page-frame admin-page-frame-fluid pb-16" data-aray-release-control>
      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              ARAY Release Control
            </p>
            <h1 className="mt-2 text-2xl font-bold text-foreground md:text-4xl">
              Ядро ARAY и выпуск сайтов
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Это центр ARAY Network по логике Multisite: одно ядро обновляет PiloRus,
              будущие ARAY-сайты, но данные каждого бизнеса остаются отдельно.
              Боевой запуск идет только после проверок.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              href="/admin/site/benchmarks"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 text-sm font-semibold text-foreground transition hover:border-primary/40"
            >
              <Store className="h-4 w-4" />
              Сайты
            </Link>
            <Link
              href="/admin/site/constructor"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
            >
              <Rocket className="h-4 w-4" />
              Новый сайт
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {[
          { title: "Версия ядра", value: release.version, text: release.channel, icon: GitBranch },
          { title: "Сайты", value: String(release.summary.targets), text: `${release.summary.liveTargets} уже в работе`, icon: Globe2 },
          { title: "Проверки", value: String(release.summary.passedGates), text: "прошли перед следующим слоем", icon: CheckCircle2 },
          { title: "Защита", value: String(release.summary.manualGates), text: "действия только с подтверждением", icon: ShieldCheck },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <article key={item.title} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{item.title}</p>
                  <p className="mt-2 truncate text-xl font-bold text-foreground">{item.value}</p>
                </div>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-primary">
                  <Icon className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-3 text-xs leading-5 text-muted-foreground">{item.text}</p>
            </article>
          );
        })}
      </section>

      <section className="mt-5 rounded-2xl border border-primary/20 bg-card p-5" data-aray-release-targets>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              куда раскатывается ядро
            </p>
            <h2 className="mt-2 text-lg font-bold text-foreground">
              Отдельные сайты без смешивания данных
            </h2>
          </div>
          <span className="w-fit rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            {release.status}
          </span>
        </div>
        <div className="mt-4 grid gap-3 xl:grid-cols-3">
          {release.targets.map((target) => (
            <article key={target.id} className="rounded-xl border border-border bg-background p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className={`rounded-xl border px-2.5 py-1 text-xs font-semibold ${targetStatusClassName[target.status]}`}>
                    {targetStatusLabel[target.status]}
                  </span>
                  <h3 className="mt-3 text-base font-bold text-foreground">{target.name}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{target.domain}</p>
                </div>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-primary">
                  <Store className="h-4 w-4" />
                </span>
              </div>
              <div className="mt-4 grid gap-2 text-xs text-muted-foreground">
                <span>tenant: {target.tenantId}</span>
                <span>основа: {target.sourceTenantId}</span>
                <span>версия: {target.currentVersion}</span>
              </div>
              <p className="mt-3 text-xs leading-5 text-muted-foreground">{target.nextAction}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <a
                  href={target.publicHref}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 text-xs font-semibold text-foreground transition hover:border-primary/40"
                >
                  <Globe2 className="h-3.5 w-3.5" />
                  Сайт
                </a>
                <a
                  href={target.adminHref}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 text-xs font-semibold text-foreground transition hover:border-primary/40"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Админка
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <article className="rounded-2xl border border-border bg-card p-5" data-aray-release-gates>
          <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Проверки перед выпуском
          </h2>
          <div className="mt-4 grid gap-3">
            {release.gates.map((gate) => (
              <div key={gate.id} className="rounded-xl border border-border bg-background p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">{gate.title}</h3>
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">{gate.text}</p>
                  </div>
                  <span className={`w-fit shrink-0 rounded-xl border px-2.5 py-1 text-xs font-semibold ${gateStatusClassName[gate.status]}`}>
                    {gateStatusLabel[gate.status]}
                  </span>
                </div>
                <p className="mt-3 text-xs font-medium text-muted-foreground">Ответственный: {gate.owner}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-border bg-card p-5" data-aray-operator-boundary>
          <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
            <LockKeyhole className="h-5 w-5 text-primary" />
            Руки Арая с защитой
          </h2>
          <div className="mt-4 grid gap-3">
            {release.operatorBoundary.map((item) => (
              <div key={item.title} className={`rounded-xl border p-4 ${boundaryClassName[item.level]}`}>
                <h3 className="text-sm font-bold text-foreground">{item.title}</h3>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">{item.text}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-xl border border-border bg-background p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              правило запуска
            </p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              ARAY может подготовить работу и показать результат. Боевой выпуск на домене, платежи,
              роли и удаление данных всегда проходят через подтверждение.
            </p>
          </div>
        </article>
      </section>

      <section className="mt-5 rounded-2xl border border-primary/20 bg-card p-5" data-aray-duplicate-site-flow>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Duplicate Site с партнером
            </p>
            <h2 className="mt-2 text-lg font-bold text-foreground">
              Копируем рабочую механику, а не чужой бизнес
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              Партнер выбирает шаблон, ARAY делает дубликат, очищает приватные данные,
              меняет товары, фото, тексты и стиль, а потом показывает превью.
            </p>
          </div>
          <span className="w-fit rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            partner guided clone
          </span>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {release.duplicateSiteSteps.map((step, index) => (
            <article key={step.title} className="rounded-xl border border-border bg-background p-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-sm font-bold text-primary">
                {index + 1}
              </span>
              <h3 className="mt-3 text-sm font-bold text-foreground">{step.title}</h3>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">{step.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-5 rounded-2xl border border-border bg-card p-5" data-aray-new-site-release-flow>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              как появляется 3-й сайт
            </p>
            <h2 className="mt-2 text-lg font-bold text-foreground">
              Новый бизнес из шаблона, но со своей админкой
            </h2>
          </div>
          <Link
            href="/admin/site/constructor"
            className="inline-flex h-10 w-fit items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
          >
            <Rocket className="h-4 w-4" />
            Собрать сайт
          </Link>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {release.newSiteSteps.map((step, index) => (
            <article key={step.title} className="rounded-xl border border-border bg-background p-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-sm font-bold text-primary">
                {index + 1}
              </span>
              <h3 className="mt-3 text-sm font-bold text-foreground">{step.title}</h3>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">{step.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-5 rounded-2xl border border-border bg-card p-5">
        <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
          <Network className="h-5 w-5 text-primary" />
          Что делаем следующим ходом
        </h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {[
            "Подключаем deploy-канал для нового ARAY-сайта и фиксируем версию ядра перед публикацией.",
            "Добавляем smoke-проверку конкретного домена перед каждым обновлением.",
            "После этого мастер сможет выпускать 3-й сайт с превью, tenant, админкой и доменом по той же схеме.",
          ].map((text, index) => (
            <div key={text} className="flex gap-3 rounded-xl border border-border bg-background p-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-sm font-bold text-primary">
                {index + 1}
              </span>
              <p className="text-sm leading-6 text-foreground">{text}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
