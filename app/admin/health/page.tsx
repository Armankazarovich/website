"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Loader2,
  ExternalLink,
  ChevronRight,
  Shield,
  Zap,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

type CheckResult = {
  id: string;
  name: string;
  status: "ok" | "warn" | "error";
  message: string;
  fix?: string;
  autoFixable?: boolean;
};

type HealthData = {
  checks: CheckResult[];
  summary: { ok: number; warn: number; error: number };
  checkedAt: string;
};

const FIX_LINKS: Record<string, { href: string; label: string; external?: boolean }> = {
  smtp:             { href: "/admin/email",         label: "Email рассылка" },
  metrika:          { href: "/admin/analytics",     label: "Аналитика" },
  sitemap:          { href: "https://pilo-rus.ru/sitemap.xml", label: "Открыть Sitemap", external: true },
  yml:              { href: "/admin/analytics",     label: "Аналитика" },
  push:             { href: "/admin/notifications", label: "Уведомления" },
  watermark_backup: { href: "/admin/watermark",     label: "Водяной знак" },
  stale_orders:     { href: "/admin/orders",        label: "Заказы" },
  product_images:   { href: "/admin/products",      label: "Каталог товаров" },
  product_prices:   { href: "/admin/products",      label: "Каталог товаров" },
};

function StatusIcon({ status, size = "md" }: { status: "ok" | "warn" | "error"; size?: "sm" | "md" | "lg" }) {
  const sizeClass = size === "lg" ? "w-8 h-8" : size === "sm" ? "w-4 h-4" : "w-5 h-5";
  if (status === "ok")   return <CheckCircle2 className={`${sizeClass} text-emerald-500 shrink-0`} />;
  if (status === "warn") return <AlertTriangle className={`${sizeClass} text-amber-500 shrink-0`} />;
  return                        <XCircle       className={`${sizeClass} text-red-500 shrink-0`} />;
}

function statusBg(status: "ok" | "warn" | "error") {
  if (status === "ok")   return "bg-emerald-500/10";
  if (status === "warn") return "bg-amber-500/10";
  return                        "bg-red-500/10";
}

function statusBorder(status: "ok" | "warn" | "error") {
  if (status === "ok")   return "border-emerald-500/20";
  if (status === "warn") return "border-amber-500/20";
  return                        "border-red-500/20";
}

function statusText(status: "ok" | "warn" | "error") {
  if (status === "ok")   return "text-emerald-700 dark:text-emerald-400";
  if (status === "warn") return "text-amber-700 dark:text-amber-400";
  return                        "text-red-700 dark:text-red-400";
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export default function HealthPage() {
  const [data, setData]       = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded]   = useState(0);
  const [error, setError]     = useState<string | null>(null);

  const runChecks = useCallback(async () => {
    setLoading(true);
    setLoaded(0);
    setError(null);
    setData(null);

    // Simulate incremental progress while fetch runs
    const interval = setInterval(() => {
      setLoaded((prev) => (prev < 9 ? prev + 1 : prev));
    }, 400);

    try {
      const res = await fetch("/api/admin/health");
      clearInterval(interval);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || `Ошибка ${res.status}`);
        return;
      }
      const json: HealthData = await res.json();
      setLoaded(json.checks.length);
      setData(json);
    } catch (e: any) {
      clearInterval(interval);
      setError("Не удалось выполнить проверку. Попробуйте ещё раз.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { runChecks(); }, [runChecks]);

  /* ─── Summary banner ─── */
  function SummaryBanner() {
    if (!data) return null;
    const { ok, warn, error: err } = data.summary;
    const total = ok + warn + err;

    if (err > 0) {
      return (
        <div className="rounded-2xl bg-red-500/10 border border-red-500/20 p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-500/15 flex items-center justify-center shrink-0">
            <XCircle className="w-6 h-6 text-red-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-red-700 dark:text-red-400 text-lg leading-tight">
              Критические ошибки!
            </p>
            <p className="text-sm text-red-600/80 dark:text-red-400/70 mt-0.5">
              {err} {err === 1 ? "компонент требует" : "компонента требуют"} немедленного внимания
            </p>
          </div>
          <div className="text-right shrink-0 hidden sm:block">
            <p className="text-2xl font-bold text-red-500">{err} / {total}</p>
            <p className="text-xs text-muted-foreground">с ошибками</p>
          </div>
        </div>
      );
    }

    if (warn > 0) {
      return (
        <div className="rounded-2xl bg-amber-500/10 border border-amber-500/20 p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6 text-amber-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-amber-700 dark:text-amber-400 text-lg leading-tight">
              Есть предупреждения
            </p>
            <p className="text-sm text-amber-600/80 dark:text-amber-400/70 mt-0.5">
              {warn} {warn === 1 ? "пункт требует" : "пункта требуют"} вашего внимания, но сайт работает
            </p>
          </div>
          <div className="text-right shrink-0 hidden sm:block">
            <p className="text-2xl font-bold text-amber-500">{warn} / {total}</p>
            <p className="text-xs text-muted-foreground">предупреждений</p>
          </div>
        </div>
      );
    }

    return (
      <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-5 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0">
          <CheckCircle2 className="w-6 h-6 text-emerald-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-emerald-700 dark:text-emerald-400 text-lg leading-tight">
            Всё отлично!
          </p>
          <p className="text-sm text-emerald-600/80 dark:text-emerald-400/70 mt-0.5">
            Все {total} компонентов работают без ошибок
          </p>
        </div>
        <div className="text-right shrink-0 hidden sm:block">
          <p className="text-2xl font-bold text-emerald-500">{ok} / {total}</p>
          <p className="text-xs text-muted-foreground">в норме</p>
        </div>
      </div>
    );
  }

  /* ─── Progress bar during loading ─── */
  function LoadingState() {
    return (
      <div className="bg-card border border-border rounded-2xl p-8 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
          <Zap className="w-7 h-7 text-primary animate-pulse" />
        </div>
        <div>
          <p className="font-semibold text-base">Проверяем систему…</p>
          <p className="text-sm text-muted-foreground mt-1">
            Проверено {loaded} из 10 компонентов
          </p>
        </div>
        <div className="max-w-xs mx-auto">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${(loaded / 10) * 100}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-1.5">
            <span>База данных</span>
            <span>Заказы</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Тестируем подключения — это займёт несколько секунд
        </p>
      </div>
    );
  }

  /* ─── Single check card ─── */
  function CheckCard({ check }: { check: CheckResult }) {
    const link = FIX_LINKS[check.id];
    const isNotOk = check.status !== "ok";

    return (
      <div
        className={`bg-card border rounded-2xl transition-all duration-200 overflow-hidden ${
          isNotOk ? `${statusBorder(check.status)} border` : "border-border"
        }`}
      >
        <div className="flex items-start gap-4 p-4 sm:p-5">
          {/* Status icon */}
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${statusBg(check.status)}`}
          >
            <StatusIcon status={check.status} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-sm leading-tight">{check.name}</p>
                <p className={`text-sm mt-0.5 ${isNotOk ? statusText(check.status) : "text-muted-foreground"}`}>
                  {check.message}
                </p>
              </div>
              {/* Status pill */}
              <span
                className={`shrink-0 text-[11px] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full ${statusBg(check.status)} ${statusText(check.status)}`}
              >
                {check.status === "ok" ? "OK" : check.status === "warn" ? "Внимание" : "Ошибка"}
              </span>
            </div>

            {/* Fix instructions */}
            {isNotOk && check.fix && (
              <div
                className={`mt-3 rounded-xl p-3 border flex items-start gap-2.5 ${statusBg(check.status)} ${statusBorder(check.status)}`}
              >
                <ArrowRight className={`w-4 h-4 shrink-0 mt-0.5 ${statusText(check.status)}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground mb-0.5">Как исправить:</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{check.fix}</p>
                </div>
              </div>
            )}

            {/* Navigation link */}
            {isNotOk && link && (
              <div className="mt-3">
                {link.external ? (
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    {link.label}
                  </a>
                ) : (
                  <Link
                    href={link.href}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold bg-primary/10 hover:bg-primary/20 text-primary px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Перейти: {link.label}
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ─── Stats row ─── */
  function StatsRow() {
    if (!data) return null;
    const { ok, warn, error: err } = data.summary;
    const total = ok + warn + err;
    return (
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-emerald-500">{ok}</p>
          <p className="text-xs text-muted-foreground mt-0.5">В норме</p>
        </div>
        <div className={`border rounded-2xl p-4 text-center ${warn > 0 ? "bg-amber-500/10 border-amber-500/20" : "bg-muted/40 border-border"}`}>
          <p className={`text-2xl font-bold ${warn > 0 ? "text-amber-500" : "text-muted-foreground"}`}>{warn}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Предупреждений</p>
        </div>
        <div className={`border rounded-2xl p-4 text-center ${err > 0 ? "bg-red-500/10 border-red-500/20" : "bg-muted/40 border-border"}`}>
          <p className={`text-2xl font-bold ${err > 0 ? "text-red-500" : "text-muted-foreground"}`}>{err}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Ошибок</p>
        </div>
      </div>
    );
  }

  /* ─── Group checks by importance ─── */
  const errors  = data?.checks.filter(c => c.status === "error") ?? [];
  const warns   = data?.checks.filter(c => c.status === "warn")  ?? [];
  const oks     = data?.checks.filter(c => c.status === "ok")    ?? [];

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Page header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="font-display font-bold text-xl leading-tight">Здоровье системы</h1>
            <p className="text-xs text-muted-foreground">
              {data
                ? `Последняя проверка: ${formatTime(data.checkedAt)}`
                : loading
                ? "Выполняется проверка…"
                : "Не проверялось"}
            </p>
          </div>
        </div>
        <button
          onClick={runChecks}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          <span className="hidden sm:inline">Перепроверить всё</span>
          <span className="sm:hidden">Проверить</span>
        </button>
      </div>

      {/* Error state */}
      {error && !loading && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-5 flex items-start gap-3">
          <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-700 dark:text-red-400 text-sm">Не удалось выполнить проверку</p>
            <p className="text-xs text-muted-foreground mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading && <LoadingState />}

      {/* Results */}
      {!loading && data && (
        <>
          {/* Summary banner */}
          <SummaryBanner />

          {/* Stats counters */}
          <StatsRow />

          {/* Errors section */}
          {errors.length > 0 && (
            <section className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <XCircle className="w-4 h-4 text-red-500" />
                <h2 className="text-sm font-bold text-red-700 dark:text-red-400 uppercase tracking-wide">
                  Критические ошибки — {errors.length}
                </h2>
              </div>
              {errors.map(c => <CheckCard key={c.id} check={c} />)}
            </section>
          )}

          {/* Warnings section */}
          {warns.length > 0 && (
            <section className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <h2 className="text-sm font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wide">
                  Требуют внимания — {warns.length}
                </h2>
              </div>
              {warns.map(c => <CheckCard key={c.id} check={c} />)}
            </section>
          )}

          {/* OK section */}
          {oks.length > 0 && (
            <section className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <h2 className="text-sm font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">
                  Работает нормально — {oks.length}
                </h2>
              </div>
              {oks.map(c => <CheckCard key={c.id} check={c} />)}
            </section>
          )}

          {/* Footer tip */}
          <div className="bg-muted/40 border border-border rounded-2xl p-4 flex items-start gap-3">
            <Zap className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              Эта страница проверяет все ключевые компоненты сайта в реальном времени.
              Нажмите «Перепроверить всё» после внесения изменений, чтобы убедиться что проблема устранена.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
