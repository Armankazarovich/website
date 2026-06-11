import Link from "next/link";
import {
  CheckCircle2,
  ClipboardList,
  Database,
  ExternalLink,
  Globe2,
  Layers3,
  Network,
  Rocket,
  ShieldCheck,
  Store,
} from "lucide-react";
import {
  getMultisiteDomainMapHint,
  getMultisiteAdminHref,
  getMultisitePath,
  getMultisitePublicHref,
  getArayManagedSiteProfiles,
} from "@/lib/multisite-sites";
import { getArayReleaseControl } from "@/lib/aray-release-control";

const sites = getArayManagedSiteProfiles();
const domainMapHint = getMultisiteDomainMapHint() || "client-site=client-domain.ru";

const multisiteModel = [
  {
    title: "ARAY Network",
    text: "Общая сеть ARAY CMS: ядро, модули, конструктор, проверки, роли и обновления живут сверху.",
    icon: Network,
  },
  {
    title: "Site Admin",
    text: "Каждый сайт получает свой домен, каталог, заявки, CRM, аналитику, финансы, оформление и рабочую админку.",
    icon: Store,
  },
  {
    title: "Общее без каши",
    text: "Мы развиваем ARAY один раз, а данные каждого сайта остаются разделенными.",
    icon: ShieldCheck,
  },
];

const separationLayers = [
  {
    title: "Общая система",
    text: "ARAY, интерфейс, конструктор, модули, помощник и правила качества остаются общими.",
    icon: Network,
  },
  {
    title: "Отдельный сайт",
    text: "Домен, настройки, каталог, заявки, CRM, пользователи, аналитика и финансы живут в своем проекте.",
    icon: Store,
  },
  {
    title: "Фундамент есть",
    text: "База уже размечена по сайтам, домен определяет проект, фильтр данных готовится к безопасному включению.",
    icon: Database,
  },
  {
    title: "Переключатель",
    text: "Следующий слой: выбираем активный сайт в шапке ARAY и дальше работаем только с ним.",
    icon: ShieldCheck,
  },
];

const coreSyncLayers = [
  {
    title: "Единое ядро ARAY",
    text: "Код админки, модули, конструктор, помощник, PWA, CRM-логика и проверки развиваются в одном репозитории.",
    icon: Network,
  },
  {
    title: "Отдельные установки",
    text: "Каждый сайт получает свою админку и домен, а обновления ядра приходят централизованно.",
    icon: Rocket,
  },
  {
    title: "Свои данные",
    text: "Товары, заявки, клиенты, финансы, аналитика, цвета, логотипы и ключи остаются внутри конкретного сайта.",
    icon: Database,
  },
  {
    title: "Версии без хаоса",
    text: "Перед запуском держим список версий ядра и прогоняем проверки, чтобы админки не расходились незаметно.",
    icon: ShieldCheck,
  },
];

const launchSteps = [
  "Выбираем шаблон ARAY CMS: магазин, заявки, CRM, PWA, роли, админка и Арай.",
  "Создаем профиль нового сайта: логотип, телефон, город, домен, цвет, источник каталога.",
  "Загружаем прайс и собираем категории, товары, цены и форму заявки.",
  "Показываем клиенту готовый магазин, а внутренние настройки держим в админке.",
  "После подтверждения подключаем домен и переводим сайт в боевой режим.",
];

export default function AdminSiteBenchmarksPage() {
  const release = getArayReleaseControl();

  return (
    <main className="admin-page-frame admin-page-frame-fluid pb-16" data-site-benchmarks-page>
      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              ARAY Multisite
            </p>
            <h1 className="mt-2 text-2xl font-bold text-foreground md:text-4xl">
              Мои сайты и проекты
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Рабочая схема простая: ARAY остается общей системой, а каждый
              сайт получает свой профиль, домен, логотип, телефон, каталог,
              заявки, CRM и аналитику. Новые клиенты открываются как
              отдельные ARAY-проекты.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              href="/admin/aray/orders#aray-site-import"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
            >
              <ExternalLink className="h-4 w-4" />
              Скан домена
            </Link>
            <Link
              href="/admin/site/constructor"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 text-sm font-semibold text-foreground transition hover:border-primary/40"
            >
              <Rocket className="h-4 w-4" />
              Конструктор
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-5 rounded-2xl border border-primary/20 bg-card p-5" data-aray-multisite-model>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              модель ARAY CMS
            </p>
            <h2 className="mt-2 text-lg font-bold text-foreground">
              Одна сеть ARAY, много отдельных сайтов
            </h2>
          </div>
          <span className="w-fit rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            network admin + site admin
          </span>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {multisiteModel.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.title} className="rounded-xl border border-border bg-background p-4">
                <Icon className="h-5 w-5 text-primary" />
                <h3 className="mt-3 text-sm font-bold text-foreground">{item.title}</h3>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">{item.text}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mt-5 rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              архитектура без путаницы
            </p>
            <h2 className="mt-2 text-lg font-bold text-foreground">
              Один ARAY, разные сайты
            </h2>
          </div>
          <span className="w-fit rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            tenant-разделение
          </span>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {separationLayers.map((layer) => {
            const Icon = layer.icon;
            return (
              <article key={layer.title} className="rounded-xl border border-border bg-background p-4">
                <Icon className="h-5 w-5 text-primary" />
                <h3 className="mt-3 text-sm font-bold text-foreground">{layer.title}</h3>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">{layer.text}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mt-5 rounded-2xl border border-primary/20 bg-card p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              как админки не расходятся
            </p>
            <h2 className="mt-2 text-lg font-bold text-foreground">
              Одно ядро, разные бизнесы
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              Мы развиваем ARAY один раз и раскатываем обновления на следующие ARAY-сайты.
              При этом данные каждого бизнеса остаются своими и не смешиваются.
            </p>
          </div>
          <span className="w-fit rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            core sync
          </span>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {coreSyncLayers.map((layer) => {
            const Icon = layer.icon;
            return (
              <article key={layer.title} className="rounded-xl border border-border bg-background p-4">
                <Icon className="h-5 w-5 text-primary" />
                <h3 className="mt-3 text-sm font-bold text-foreground">{layer.title}</h3>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">{layer.text}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mt-5 rounded-2xl border border-border bg-card p-5" data-aray-release-summary>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              слой запуска и обновлений
            </p>
            <h2 className="mt-2 text-lg font-bold text-foreground">
              Ядро ARAY обновляется как релиз, а не вручную
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Версия ядра, отдельные серверы, проверки и подтверждения собраны в одном пульте.
              Так каждый сайт развивается от одной системы, но со своими данными.
            </p>
          </div>
          <Link
            href="/admin/site/releases"
            className="inline-flex h-11 w-fit items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
          >
            <Rocket className="h-4 w-4" />
            Пульт релиза
          </Link>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {release.targets.slice(0, 3).map((target) => (
            <article key={target.id} className="rounded-xl border border-border bg-background p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-foreground">{target.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{target.domain}</p>
                </div>
                <span className="rounded-xl border border-border bg-card px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                  {target.status === "needs-channel" ? "канал" : target.status === "synced" ? "в ядре" : "план"}
                </span>
              </div>
              <p className="mt-3 text-xs leading-5 text-muted-foreground">{target.nextAction}</p>
            </article>
          ))}
        </div>
        <div className="mt-4 rounded-xl border border-border bg-background p-4" data-aray-partner-duplicate-summary>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold text-foreground">Для партнера: новый сайт с Араем</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Партнер выбирает тип проекта. ARAY создает отдельный сайт,
                очищает приватные данные, меняет сферу, товары, фото, тексты, стиль и показывает результат.
              </p>
            </div>
            <Link
              href="/admin/site/releases"
              className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold text-foreground transition hover:border-primary/40"
            >
              <Rocket className="h-4 w-4" />
              Посмотреть
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-5 grid gap-4 xl:grid-cols-2">
        {sites.map((site) => (
          <article key={site.id} className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span
                  className={
                    site.status === "template"
                      ? "rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300"
                      : "rounded-xl border border-orange-500/30 bg-orange-500/10 px-2.5 py-1 text-xs font-semibold text-orange-700 dark:text-orange-300"
                  }
                >
                  {site.status === "template" ? "база ARAY" : "отдельный сайт"}
                </span>
                <span className="ml-2 rounded-xl border border-border bg-background px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                  {site.deploymentMode === "external-server" ? "свой сервер" : "эта админка"}
                </span>
                <h2 className="mt-4 text-2xl font-bold text-foreground">{site.title}</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{site.description}</p>
                <div className="mt-4 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                  <span>код сайта: {site.tenantId}</span>
                  <span>домен: {site.domain}</span>
                  <span>система: ARAY CMS</span>
                  <span>путь: {site.basePath || "/"}</span>
                </div>
              </div>
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-primary">
                <Store className="h-5 w-5" />
              </span>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <a
                href={getMultisitePublicHref(site)}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 text-sm font-semibold text-foreground transition hover:border-primary/40"
              >
                <Globe2 className="h-4 w-4" />
                Сайт
              </a>
              <a
                href={getMultisiteAdminHref(site)}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
              >
                <ExternalLink className="h-4 w-4" />
                Админка
              </a>
              {site.deploymentMode === "external-server" && (
                <Link
                  href={getMultisitePath(site, "/")}
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-border bg-background px-4 text-sm font-semibold text-muted-foreground transition hover:border-primary/40"
                >
                  Сайт
                </Link>
              )}
            </div>
          </article>
        ))}
      </section>

      <section className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <article className="rounded-2xl border border-border bg-card p-5">
          <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
            <ClipboardList className="h-5 w-5 text-primary" />
            Как делаем следующий сайт
          </h2>
          <div className="mt-4 grid gap-3">
            {launchSteps.map((step, index) => (
              <div key={step} className="flex gap-3 rounded-xl border border-border bg-background p-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-sm font-bold text-primary">
                  {index + 1}
                </span>
                <p className="text-sm leading-6 text-foreground">{step}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-border bg-card p-5">
          <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
            <Network className="h-5 w-5 text-primary" />
            Домен нового ARAY-сайта
          </h2>
          <div className="mt-4 rounded-xl border border-border bg-background p-4">
            <p className="text-sm leading-6 text-muted-foreground">
              В Beget домен должен смотреть на сервер приложения. В окружении
              сервера добавляем карту доменов, чтобы система понимала, что
              новый домен относится к своему ARAY-проекту.
            </p>
            <div className="mt-4 rounded-xl border border-dashed border-primary/35 bg-primary/5 p-3 font-mono text-xs text-foreground">
              TENANT_DOMAIN_MAP={domainMapHint}
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-background p-4">
              <p className="text-sm font-bold text-foreground">Публично</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Клиент видит обычный магазин стройматериалов.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-background p-4">
              <p className="text-sm font-bold text-foreground">Внутри</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Мы видим профиль, CRM, заявки, источник каталога и этап запуска.
              </p>
            </div>
          </div>
        </article>
      </section>

      <section className="mt-5 grid gap-4 md:grid-cols-4">
        {[
          { title: "Товары", value: "из скана", text: "товары и услуги клиента", icon: Layers3 },
          { title: "Разделы", value: "из скана", text: "категории и направления", icon: Database },
          { title: "CRM", value: "готово", text: "заявка сохраняется с товарами", icon: CheckCircle2 },
          { title: "Домен", value: "после проверки", text: "подключаем после подтверждения", icon: ShieldCheck },
        ].map((item) => (
          <article key={item.title} className="rounded-2xl border border-border bg-card p-5">
            <item.icon className="mb-5 h-6 w-6 text-primary" />
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{item.title}</p>
            <p className="mt-2 text-2xl font-bold text-foreground">{item.value}</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.text}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
