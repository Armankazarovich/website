"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  CircleDashed,
  ExternalLink,
  KeyRound,
  Loader2,
  RefreshCw,
} from "lucide-react";

type GoogleChecklistItem = {
  id: string;
  label: string;
  ready: boolean;
  note: string;
};

type GoogleGrowthOverview = {
  ok: boolean;
  readiness: {
    readyCount: number;
    totalCount: number;
    ready: boolean;
    nextAction: string;
    checklist: GoogleChecklistItem[];
  };
  actions: {
    googleOauthUrl: string;
    promotionUrl: string;
    analyticsUrl: string;
  };
  safety: string;
};

export function GoogleGrowthConnectorPanel() {
  const [overview, setOverview] = useState<GoogleGrowthOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadOverview() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/aray/connectors/google", {
        cache: "no-store",
      });
      const data = (await response.json()) as GoogleGrowthOverview;
      if (!response.ok || !data.ok) throw new Error("Не удалось проверить Google-пакет");
      setOverview(data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Google-пакет не отвечает");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadOverview();
  }, []);

  return (
    <section className="rounded-2xl border border-sky-500/20 bg-sky-500/[0.045] p-4 md:p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-300">
            <KeyRound className="h-3.5 w-3.5" />
            Единый вход Google
          </div>
          <h2 className="mt-3 text-lg font-semibold">Google-пакет ARAY</h2>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            Один вход сохраняет доступ для Google Ads, Analytics и Search Console. Я читаю данные,
            готовлю спрос, SEO и рекламные рекомендации, а рискованные действия оставляю на подтверждение владельца.
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
          href={overview?.actions.googleOauthUrl || "/api/admin/aray/connectors/google/oauth/start"}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <KeyRound className="h-4 w-4" />
          Подключить Google
        </a>
        <button
          type="button"
          onClick={loadOverview}
          disabled={loading}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-semibold transition-colors hover:border-sky-400/40 hover:text-sky-300 disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Проверить
        </button>
        <a
          href={overview?.actions.analyticsUrl || "/admin/analytics"}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:border-sky-400/40 hover:text-sky-300"
        >
          Аналитика
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>

      {error ? (
        <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
          {error}
        </div>
      ) : null}

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
            {loading ? "Проверяю Google-пакет..." : "Нет данных по Google-пакету."}
          </div>
        )}
      </div>

      {overview ? (
        <div className="mt-3 text-xs leading-relaxed text-muted-foreground">
          Следующий шаг: {overview.readiness.nextAction}. {overview.safety}
        </div>
      ) : null}
    </section>
  );
}
