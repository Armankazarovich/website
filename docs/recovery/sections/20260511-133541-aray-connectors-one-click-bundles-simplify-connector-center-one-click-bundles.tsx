import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, CheckCircle2, CircleDashed, KeyRound, LockKeyhole, ShieldCheck } from "lucide-react";
import { ADMIN_ROLES, getSessionRole } from "@/lib/auth-helpers";
import { getArayProviderStatuses, getArayProviderSummary, type ArayProviderRuntimeStatus } from "@/lib/aray-provider-matrix";
import { getArayModuleControlItemsForRole } from "@/lib/aray-module-state";
import type { ArayModuleControlItem } from "@/lib/aray-module-registry";
import { getCurrentTenantId } from "@/lib/tenant-context";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Подключения ARAY",
};

const statusLabel = {
  ready: "Подключено",
  partial: "Частично",
  todo: "Нужно подключить",
};

const CONNECTOR_TYPE_LABELS: Record<string, string> = {
  orders: "Заказы",
  catalog: "Каталог",
  search: "Поиск",
  notifications: "Уведомления",
  ai: "ARAY",
};

type ModuleConnectorRow = {
  type: string;
  label: string;
  status: "ready" | "missing";
  usedBy: string[];
  activeCount: number;
  missingCount: number;
};

function buildModuleConnectorRows(modules: ArayModuleControlItem[]): ModuleConnectorRow[] {
  const rows = new Map<string, ModuleConnectorRow>();

  for (const module of modules) {
    for (const type of module.connectors.requiredTypes) {
      const row = rows.get(type) || {
        type,
        label: CONNECTOR_TYPE_LABELS[type] || type,
        status: "ready" as const,
        usedBy: [],
        activeCount: 0,
        missingCount: 0,
      };

      row.usedBy.push(module.name);
      if (module.connectors.activeTypes.includes(type)) {
        row.activeCount += 1;
      } else {
        row.missingCount += 1;
        row.status = "missing";
      }
      rows.set(type, row);
    }
  }

  return Array.from(rows.values()).sort((a, b) => a.label.localeCompare(b.label, "ru"));
}

function connectorRowClass(status: ModuleConnectorRow["status"]) {
  if (status === "ready") return "border-emerald-500/25 bg-emerald-500/10 text-emerald-400";
  return "border-amber-500/25 bg-amber-500/10 text-amber-300";
}

function statusClass(status: ArayProviderRuntimeStatus["status"]) {
  if (status === "ready") return "border-emerald-500/25 bg-emerald-500/10 text-emerald-400";
  if (status === "partial") return "border-amber-500/25 bg-amber-500/10 text-amber-300";
  return "border-border bg-muted/30 text-muted-foreground";
}

function priorityClass(priority: ArayProviderRuntimeStatus["priority"]) {
  if (priority === "P0") return "border-primary/30 bg-primary/10 text-primary";
  if (priority === "P1") return "border-sky-500/20 bg-sky-500/10 text-sky-300";
  return "border-border bg-muted/30 text-muted-foreground";
}

export default async function ArayConnectorsPage() {
  const auth = await getSessionRole();
  if (!auth) redirect("/login?callbackUrl=/admin/aray/connectors");
  if (!ADMIN_ROLES.includes(auth.role as any)) redirect("/admin");

  const providers = getArayProviderStatuses();
  const summary = getArayProviderSummary(providers);
  const tenantId = getCurrentTenantId();
  const [modules, dbConnectors] = await Promise.all([
    getArayModuleControlItemsForRole({ role: auth.role, tenantId }),
    prisma.terminalConnector.findMany({
      where: { tenantId },
      orderBy: [{ status: "asc" }, { type: "asc" }, { provider: "asc" }],
      select: {
        id: true,
        name: true,
        type: true,
        provider: true,
        status: true,
        trustLevel: true,
        direction: true,
        mode: true,
        capabilities: true,
        updatedAt: true,
      },
    }).catch(() => []),
  ]);
  const moduleConnectorRows = buildModuleConnectorRows(modules);
  const modulesWithConnectors = modules.filter((module) => module.connectors.status !== "not-required");
  const missingModuleConnections = moduleConnectorRows.reduce((sum, row) => sum + row.missingCount, 0);
  const p0 = providers.filter((provider) => provider.priority === "P0");
  const later = providers.filter((provider) => provider.priority !== "P0");

  return (
    <div className="admin-page-frame admin-page-frame-readable space-y-5">
      <section className="rounded-2xl border border-border bg-card p-5 md:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <ShieldCheck className="h-3.5 w-3.5" />
              ADMIN+
            </div>
            <h1 className="mt-4 text-2xl font-bold tracking-tight">Подключения ARAY</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Здесь ARAY видит свои руки: модели, голос, поиск, SEO, рекламу, inbox, бухгалтерию и входы.
              Секреты не показываются, только статус и понятный следующий шаг.
            </p>
          </div>
          <Link
            href="/admin/aray/costs"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background/60 px-4 py-2 text-sm font-medium transition-colors hover:border-primary/40 hover:text-primary"
          >
            Расходы и оплаты
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Metric label="Всего контуров" value={summary.total} />
        <Metric label="Подключено" value={summary.ready} tone="ready" />
        <Metric label="Частично" value={summary.partial} tone="partial" />
        <Metric label="P0 сейчас" value={summary.byPriority.P0} tone="primary" />
        <Metric label="Связей модулей" value={missingModuleConnections} tone={missingModuleConnections > 0 ? "partial" : "ready"} />
      </section>

      <ModuleConnectorSection rows={moduleConnectorRows} moduleCount={modulesWithConnectors.length} />
      <DatabaseConnectorSection connectors={dbConnectors} />

      <ConnectorSection title="Сначала делаем это" subtitle="Фундамент: ARAY, биржа, голос, SEO, реклама, inbox." providers={p0} />
      <ConnectorSection title="Следующий слой" subtitle="Не теряем, но не мешаем запуску P0." providers={later} />
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: number; tone?: "ready" | "partial" | "primary" }) {
  const toneClass =
    tone === "ready"
      ? "text-emerald-400"
      : tone === "partial"
        ? "text-amber-300"
        : tone === "primary"
          ? "text-primary"
          : "text-foreground";

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`mt-3 text-3xl font-bold ${toneClass}`}>{value}</div>
    </div>
  );
}

function ModuleConnectorSection({ rows, moduleCount }: { rows: ModuleConnectorRow[]; moduleCount: number }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 md:p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Зависимости модулей</h2>
          <p className="mt-1 text-sm text-muted-foreground">{moduleCount} модулей проверяют подключения перед включением.</p>
        </div>
        <Link
          href="/admin/aray/modules"
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-border px-3 text-sm font-semibold text-muted-foreground transition-colors hover:border-primary/35 hover:text-primary"
        >
          Модули
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {rows.length > 0 ? (
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {rows.map((row) => (
            <article key={row.type} className="rounded-xl border border-border bg-background/45 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{row.label}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{row.usedBy.join(", ")}</p>
                </div>
                <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${connectorRowClass(row.status)}`}>
                  {row.status === "ready" ? "Готово" : "Нужно связать"}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                <span className="rounded-full border border-border px-2 py-0.5">активно {row.activeCount}</span>
                <span className="rounded-full border border-border px-2 py-0.5">не хватает {row.missingCount}</span>
                <span className="rounded-full border border-border px-2 py-0.5">{row.type}</span>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-dashed border-border bg-background/35 p-6 text-center text-sm text-muted-foreground">
          Модули пока не требуют внешних подключений.
        </div>
      )}
    </section>
  );
}

function DatabaseConnectorSection({
  connectors,
}: {
  connectors: Array<{
    id: string;
    name: string;
    type: string;
    provider: string;
    status: string;
    trustLevel: string;
    direction: string;
    mode: string;
    capabilities: string[];
    updatedAt: Date;
  }>;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 md:p-5">
      <div>
        <h2 className="text-lg font-semibold">Коннекторы в базе</h2>
        <p className="mt-1 text-sm text-muted-foreground">Строки TerminalConnector: реальные провайдеры, режимы и возможности.</p>
      </div>

      {connectors.length > 0 ? (
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {connectors.map((connector) => (
            <article key={connector.id} className="rounded-xl border border-border bg-background/45 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold text-foreground">{connector.name}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{connector.type} · {connector.provider}</p>
                </div>
                <span className="rounded-full border border-border bg-card px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                  {connector.status}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                <span className="rounded-full border border-border px-2 py-0.5">{connector.trustLevel}</span>
                <span className="rounded-full border border-border px-2 py-0.5">{connector.direction}</span>
                <span className="rounded-full border border-border px-2 py-0.5">{connector.mode}</span>
                {connector.capabilities.slice(0, 3).map((capability) => (
                  <span key={capability} className="rounded-full border border-primary/20 bg-primary/5 px-2 py-0.5 text-primary">
                    {capability}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-dashed border-border bg-background/35 p-6 text-center text-sm text-muted-foreground">
          Внешних коннекторов в базе пока нет. Внутренние связи ПилоРус закрывают базовые модули.
        </div>
      )}
    </section>
  );
}

function ConnectorSection({ title, subtitle, providers }: { title: string; subtitle: string; providers: ArayProviderRuntimeStatus[] }) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
      <div className="grid gap-3 xl:grid-cols-2">
        {providers.map((provider) => (
          <ConnectorCard key={provider.id} provider={provider} />
        ))}
      </div>
    </section>
  );
}

function ConnectorCard({ provider }: { provider: ArayProviderRuntimeStatus }) {
  return (
    <article className="rounded-2xl border border-border bg-card p-4 md:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${priorityClass(provider.priority)}`}>
              {provider.priority}
            </span>
            <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(provider.status)}`}>
              {statusLabel[provider.status]}
            </span>
          </div>
          <h3 className="mt-3 text-base font-semibold leading-tight">{provider.title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{provider.plainName}</p>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-background/70 text-primary">
          <KeyRound className="h-5 w-5" />
        </div>
      </div>

      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{provider.purpose}</p>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <InfoBlock label="Что делает человек" text={provider.humanAction} />
        <InfoBlock label="Правило безопасности" text={provider.safeRule} />
      </div>

      {provider.env.length > 0 && (
        <div className="mt-4 rounded-xl border border-border bg-background/45 p-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <LockKeyhole className="h-3.5 w-3.5" />
            Ключи без значений
          </div>
          <div className="flex flex-wrap gap-2">
            {provider.env.map((item) => (
              <span
                key={item.key}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[11px] font-medium ${
                  item.present
                    ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
                    : item.required
                      ? "border-amber-500/25 bg-amber-500/10 text-amber-200"
                      : "border-border bg-muted/20 text-muted-foreground"
                }`}
              >
                {item.present ? <CheckCircle2 className="h-3 w-3" /> : <CircleDashed className="h-3 w-3" />}
                {item.key}
              </span>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}

function InfoBlock({ label, text }: { label: string; text: string }) {
  return (
    <div className="rounded-xl border border-border bg-background/45 p-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm leading-relaxed text-foreground">{text}</div>
    </div>
  );
}
