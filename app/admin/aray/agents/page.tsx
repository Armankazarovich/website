import type { Metadata } from "next";
import type { ElementType } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Building2,
  CheckCircle2,
  Gauge,
  GitBranch,
  LockKeyhole,
  ShieldCheck,
  Users,
  Zap,
} from "lucide-react";
import {
  arayAgentRegistry,
  getAgentById,
  getAgentRegistrySummary,
  getDepartmentById,
  getDepartmentHealth,
  type ArayRiskStatus,
} from "@/lib/aray-agent-registry";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Agent Control Center",
};

const STATUS_LABEL: Record<ArayRiskStatus, string> = {
  green: "Здорово",
  yellow: "Внимание",
  red: "Риск",
  blocked: "Блок",
};

function statusClass(status: ArayRiskStatus) {
  if (status === "green") return "border-emerald-500/25 bg-emerald-500/10 text-emerald-500";
  if (status === "yellow") return "border-amber-500/25 bg-amber-500/10 text-amber-500";
  if (status === "red") return "border-red-500/25 bg-red-500/10 text-red-500";
  return "border-slate-500/25 bg-slate-500/10 text-slate-300";
}

function scoreClass(score: number) {
  if (score >= 80) return "text-emerald-500";
  if (score >= 60) return "text-amber-500";
  return "text-red-500";
}

export default function ArayAgentsPage() {
  const summary = getAgentRegistrySummary();
  const departments = getDepartmentHealth();
  const topRisks = [...arayAgentRegistry.controlledAreas]
    .sort((a, b) => a.qualityScore - b.qualityScore)
    .slice(0, 6);

  return (
    <div className="space-y-5">
      <section className="admin-liquid-surface rounded-2xl border p-5 md:p-6 overflow-hidden relative">
        <div className="absolute inset-0 pointer-events-none opacity-50 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.18),transparent_34%),radial-gradient(circle_at_bottom_left,hsl(var(--accent)/0.12),transparent_30%)]" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <ShieldCheck className="h-3.5 w-3.5" />
              ARAY Agent Mesh
            </div>
            <h1 className="mt-4 text-2xl md:text-3xl font-bold tracking-tight">
              Agent Control Center
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground leading-relaxed">
              Единая карта отделов, агентов, зон ответственности, качества и рисков. Здесь начинается кабинет контроля, чтобы у ARAY не было темных углов.
            </p>
          </div>
          <Link
            href="/admin/health"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background/60 px-4 py-2 text-sm font-medium hover:border-primary/40 hover:text-primary transition-colors"
          >
            Здоровье системы
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={Building2} label="Отделов" value={summary.departments} />
        <Metric icon={Users} label="Агентов" value={summary.agents} hint={`${summary.deputies} заместителей · ${summary.workers} рабочих`} />
        <Metric icon={GitBranch} label="Зон контроля" value={summary.controlledAreas} />
        <Metric icon={Gauge} label="Средний score" value={`${summary.averageQualityScore}%`} valueClass={scoreClass(summary.averageQualityScore)} />
      </section>

      <section className="grid gap-3 md:grid-cols-4">
        {(Object.keys(summary.statusCounts) as ArayRiskStatus[]).map((status) => (
          <div key={status} className={`rounded-2xl border p-4 ${statusClass(status)}`}>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold">{STATUS_LABEL[status]}</span>
              <span className="text-2xl font-bold">{summary.statusCounts[status]}</span>
            </div>
          </div>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="admin-liquid-surface rounded-2xl border p-4 md:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Отделы</h2>
              <p className="text-xs text-muted-foreground">Владелец, проверяющий и состояние зон</p>
            </div>
            <BadgeCheck className="h-5 w-5 text-primary" />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {departments.map(({ department, owner, reviewer, areas, averageQualityScore }) => (
              <div key={department.id} className="rounded-2xl border border-border bg-background/45 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold leading-tight">{department.name}</h3>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{department.mission}</p>
                  </div>
                  <span className={`shrink-0 text-lg font-bold ${scoreClass(averageQualityScore)}`}>
                    {averageQualityScore || "-"}%
                  </span>
                </div>
                <div className="mt-4 space-y-2 text-xs">
                  <OwnerLine label="Владелец" value={owner?.name || department.ownerAgent} />
                  <OwnerLine label="Проверка" value={reviewer?.name || department.reviewerAgent} />
                  <OwnerLine label="Зон" value={String(areas.length)} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="admin-liquid-surface rounded-2xl border p-4 md:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Приоритетные сигналы</h2>
              <p className="text-xs text-muted-foreground">Что нужно довести до зеленого первым</p>
            </div>
            <AlertTriangle className="h-5 w-5 text-amber-500" />
          </div>
          <div className="space-y-3">
            {topRisks.map((area) => {
              const owner = getAgentById(area.ownerAgent);
              const department = getDepartmentById(area.ownerDepartmentId);
              return (
                <div key={area.id} className="rounded-2xl border border-border bg-background/45 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-semibold leading-tight">{area.label}</h3>
                      <p className="mt-1 text-xs text-muted-foreground">{department?.name || area.ownerDepartmentId}</p>
                    </div>
                    <div className="text-right">
                      <div className={`text-lg font-bold ${scoreClass(area.qualityScore)}`}>{area.qualityScore}%</div>
                      <div className={`mt-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusClass(area.riskStatus)}`}>
                        {STATUS_LABEL[area.riskStatus]}
                      </div>
                    </div>
                  </div>
                  <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{area.nextAction}</p>
                  <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                    <Activity className="h-3.5 w-3.5 text-primary" />
                    {owner?.name || area.ownerAgent}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="admin-liquid-surface rounded-2xl border p-4 md:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Зоны контроля</h2>
            <p className="text-xs text-muted-foreground">Каждая зона имеет владельца, проверяющего, риск и следующий шаг</p>
          </div>
          <LockKeyhole className="h-5 w-5 text-primary" />
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          {arayAgentRegistry.controlledAreas.map((area) => {
            const owner = getAgentById(area.ownerAgent);
            const reviewer = getAgentById(area.reviewerAgent);
            return (
              <div key={area.id} className="rounded-2xl border border-border bg-background/45 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold leading-tight">{area.label}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">{area.paths.slice(0, 2).join(" · ")}</p>
                  </div>
                  <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold ${statusClass(area.riskStatus)}`}>
                    {STATUS_LABEL[area.riskStatus]}
                  </span>
                </div>
                <div className="mt-4 grid gap-2 text-xs sm:grid-cols-2">
                  <OwnerLine label="Владелец" value={owner?.name || area.ownerAgent} />
                  <OwnerLine label="Проверка" value={reviewer?.name || area.reviewerAgent} />
                </div>
                <div className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3">
                  <p className="text-xs text-muted-foreground line-clamp-2">{area.nextAction}</p>
                  <span className={`shrink-0 text-lg font-bold ${scoreClass(area.qualityScore)}`}>{area.qualityScore}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  hint,
  valueClass,
}: {
  icon: ElementType;
  label: string;
  value: number | string;
  hint?: string;
  valueClass?: string;
}) {
  return (
    <div className="admin-liquid-surface rounded-2xl border p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="rounded-xl aray-icon-tone p-2.5">
          <Icon className="h-5 w-5" />
        </div>
        <Zap className="h-4 w-4 text-primary/60" />
      </div>
      <div className="mt-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className={`mt-1 text-2xl font-bold ${valueClass || ""}`}>{value}</p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </div>
    </div>
  );
}

function OwnerLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-muted/30 px-3 py-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="truncate font-medium">{value}</span>
    </div>
  );
}
