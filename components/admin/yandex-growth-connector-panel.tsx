"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  CircleDashed,
  ExternalLink,
  KeyRound,
  Loader2,
  RefreshCw,
  Wand2,
} from "lucide-react";

type YandexChecklistItem = {
  id: string;
  label: string;
  ready: boolean;
  note: string;
};

type YandexGrowthOverview = {
  ok: boolean;
  readiness: {
    readyCount: number;
    totalCount: number;
    ready: boolean;
    nextAction: { action: string; label: string };
    checklist: YandexChecklistItem[];
  };
  actions: {
    yandexOauthUrl: string;
    directOauthUrl: string;
    metrikaOauthUrl: string;
    googleConnectUrl: string;
    yandexBusinessUrl: string;
    promotionUrl: string;
  };
  direct: {
    configured: boolean;
    connected: boolean;
    campaignsCount: number;
    error?: string | null;
  };
  metrika: {
    configured: boolean;
    connected: boolean;
    selectedCounterId: number | null;
    storedCounterId: number | null;
    counters: Array<{ id: number; name: string; site: string; goalsCount: number }>;
    goalReadyCount: number;
    goalTotalCount: number;
    goalsReady: boolean;
    error?: string | null;
  };
  organization: {
    id: string | null;
    ready: boolean;
    mode: string;
  };
  publicUrl: {
    baseUrl: string;
    isPublic: boolean;
  };
  safety: string;
};

type ActionState = {
  loading: boolean;
  message: string;
  error: string;
};

export function YandexGrowthConnectorPanel() {
  const [overview, setOverview] = useState<YandexGrowthOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<ActionState>({
    loading: false,
    message: "",
    error: "",
  });

  const detectedCounterId = useMemo(() => {
    return overview?.metrika.storedCounterId || overview?.metrika.selectedCounterId || overview?.metrika.counters[0]?.id || null;
  }, [overview]);

  async function loadOverview() {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/aray/connectors/yandex", {
        cache: "no-store",
      });
      const data = (await response.json()) as YandexGrowthOverview;
      if (!response.ok || !data.ok) throw new Error("Не удалось проверить Яндекс-пакет");
      setOverview(data);
    } catch (error) {
      setAction({
        loading: false,
        message: "",
        error: error instanceof Error ? error.message : "Яндекс-пакет не отвечает",
      });
    } finally {
      setLoading(false);
    }
  }

  async function runAction(payload: Record<string, unknown>) {
    setAction({ loading: true, message: "", error: "" });
    try {
      const response = await fetch("/api/admin/aray/connectors/yandex", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as {
        ok?: boolean;
        message?: string;
        error?: string;
        overview?: YandexGrowthOverview;
      };
      if (!response.ok || !data.ok) throw new Error(data.error || data.message || "Действие не выполнено");
      if (data.overview) setOverview(data.overview);
      setAction({ loading: false, message: data.message || "Готово", error: "" });
    } catch (error) {
      setAction({
        loading: false,
        message: "",
        error: error instanceof Error ? error.message : "Действие не выполнено",
      });
    }
  }

  useEffect(() => {
    void loadOverview();
  }, []);

  return (
    <section className="rounded-2xl border border-primary/25 bg-primary/[0.045] p-4 md:p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <KeyRound className="h-3.5 w-3.5" />
            Единый вход Яндекса
          </div>
          <h2 className="mt-3 text-lg font-semibold">Яндекс-пакет ARAY</h2>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            Один вход подключает Direct и Метрику, затем я сохраняю счетчик,
            создаю цели и готовлю аналитику. Запуск рекламы и публичные
            изменения остаются только после подтверждения владельца.
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Готовность</div>
          <div className="mt-1 text-2xl font-bold">
            {overview ? `${overview.readiness.readyCount}/${overview.readiness.totalCount}` : "..."}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <a
          href={overview?.actions.yandexOauthUrl || "/api/admin/aray/connectors/yandex/oauth/start"}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <KeyRound className="h-4 w-4" />
          Подключить Яндекс
        </a>
        <button
          type="button"
          onClick={() => runAction({ action: "auto_prepare" })}
          disabled={action.loading || loading}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
        >
          {action.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
          Подготовить автоматически
        </button>
        <a
          href={overview?.actions.directOauthUrl || "/api/admin/direct/oauth/start"}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
        >
          Direct отдельно
          <ExternalLink className="h-4 w-4" />
        </a>
        <a
          href={overview?.actions.metrikaOauthUrl || "/api/admin/metrika/oauth/start"}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
        >
          Метрика отдельно
          <ExternalLink className="h-4 w-4" />
        </a>
        <a
          href={overview?.actions.googleConnectUrl || "/admin/aray/connectors?provider=google"}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
        >
          Google
          <ExternalLink className="h-4 w-4" />
        </a>
        <button
          type="button"
          onClick={loadOverview}
          disabled={loading || action.loading}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-semibold transition-colors hover:border-primary/40 hover:text-primary disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Проверить
        </button>
        {overview?.metrika.connected && detectedCounterId && !overview.metrika.storedCounterId ? (
          <button
            type="button"
            onClick={() => runAction({ action: "save_counter", counterId: detectedCounterId })}
            disabled={action.loading}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-semibold transition-colors hover:border-primary/40 hover:text-primary disabled:opacity-60"
          >
            Сохранить счетчик #{detectedCounterId}
          </button>
        ) : null}
        {overview?.metrika.connected && detectedCounterId && !overview.metrika.goalsReady ? (
          <button
            type="button"
            onClick={() => runAction({ action: "ensure_metrika_goals", counterId: detectedCounterId })}
            disabled={action.loading}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-semibold transition-colors hover:border-primary/40 hover:text-primary disabled:opacity-60"
          >
            Создать цели
          </button>
        ) : null}
      </div>

      {(action.message || action.error) && (
        <div
          className={`mt-3 rounded-xl border px-3 py-2 text-sm ${
            action.error
              ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
              : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
          }`}
        >
          {action.error || action.message}
        </div>
      )}

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {(overview?.readiness.checklist || []).map((item) => (
          <div key={item.id} className="rounded-xl border border-border bg-card p-3">
            <div className="flex items-start gap-2">
              {item.ready ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
              ) : (
                <CircleDashed className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
              )}
              <div className="min-w-0">
                <div className="text-sm font-semibold">{item.label}</div>
                <div className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.note}</div>
              </div>
            </div>
          </div>
        ))}
        {!overview && (
          <div className="rounded-xl border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
            {loading ? "Проверяю Яндекс-пакет..." : "Нет данных по Яндекс-пакету."}
          </div>
        )}
      </div>

      {overview ? (
        <div className="mt-3 text-xs leading-relaxed text-muted-foreground">
          Следующий шаг: {overview.readiness.nextAction.label}. {overview.safety}
        </div>
      ) : null}
    </section>
  );
}
