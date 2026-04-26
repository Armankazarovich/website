"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Wallet, TrendingUp, Calendar, Database, Mic, Globe, Server, Link as LinkIcon,
  Plus, Pencil, Trash2, RefreshCw, Loader2, X, Bot, Sparkles, Users, Activity,
  AlertCircle, CheckCircle2, Bell, CalendarClock,
} from "lucide-react";

// ── Типы ─────────────────────────────────────────────────────────────────────
type Summary = {
  today:    { calls: number; costUsd: number; costRub: number };
  week:     { calls: number; costUsd: number; costRub: number };
  month:    { calls: number; costUsd: number; costRub: number };
  allTime:  { calls: number; costUsd: number; costRub: number };
  monthlyFixedRub: number;
  usdRubRate: number;
};

type ProviderRow = {
  provider: string;
  calls: number;
  costUsd: number;
  costRub: number;
  inputTokens: number;
  outputTokens: number;
  characters: number;
};

type ModelRow = {
  provider: string;
  model: string;
  tier: string | null;
  calls: number;
  costUsd: number;
  costRub: number;
};

type SourceRow = {
  source: string;
  calls: number;
  costUsd: number;
  costRub: number;
};

type DailySeriesRow = {
  day: string;
  provider: string;
  costUsd: number;
  costRub: number;
  calls: number;
};

type TopUser = {
  userId: string;
  name: string | null;
  email: string | null;
  role: string | null;
  calls: number;
  costUsd: number;
  costRub: number;
};

type RecentLog = {
  id: string;
  provider: string;
  model: string;
  tier: string | null;
  inputTokens: number;
  outputTokens: number;
  characters: number | null;
  costUsd: number;
  costRub: number | null;
  feature: string;
  source: string | null;
  createdAt: string;
  userId: string | null;
};

type Subscription = {
  id: string;
  provider: string;
  name: string;
  costUsd: number | null;
  costRub: number | null;
  billingDay: number | null;
  billingType: string;
  active: boolean;
  notes: string | null;
  startedAt: string | null;
  endsAt: string | null;
};

type Data = {
  ok: boolean;
  summary: Summary;
  byProvider: ProviderRow[];
  byModel: ModelRow[];
  bySource: SourceRow[];
  dailySeries: DailySeriesRow[];
  topUsers: TopUser[];
  recent: RecentLog[];
  subscriptions: Subscription[];
};

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmtRub = (n: number) => `${Math.round(n).toLocaleString("ru-RU")} ₽`;
const fmtUsd = (n: number) => `$${n.toFixed(2)}`;

const PROVIDER_LABELS: Record<string, string> = {
  anthropic: "Anthropic Claude",
  elevenlabs: "ElevenLabs TTS",
  google: "Google AI",
  openai: "OpenAI",
  beget: "Beget VPS",
  domain: "Домен",
};

const PROVIDER_ICONS: Record<string, React.ElementType> = {
  anthropic: Sparkles,
  elevenlabs: Mic,
  google: Globe,
  openai: Bot,
  beget: Server,
  domain: LinkIcon,
};

const SOURCE_LABELS: Record<string, string> = {
  "voice-mode": "Голосовой режим",
  store: "Магазин",
  admin: "Админка",
  cabinet: "Кабинет",
};

// ── Главный компонент ───────────────────────────────────────────────────────
export function CostsClient() {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingSub, setEditingSub] = useState<Subscription | null>(null);
  const [showSubForm, setShowSubForm] = useState(false);

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true);
    if (silent) setRefreshing(true);
    try {
      const res = await fetch("/api/admin/aray/costs?days=30&limit=50", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Ошибка сервера");
      setData(json);
      setError(null);
    } catch (err: any) {
      setError(err?.message || "Ошибка загрузки данных");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Группировка ежедневных данных по дням (sum по провайдерам)
  const dailyByDay = useMemo(() => {
    if (!data?.dailySeries.length) return [];
    const map = new Map<string, { day: string; total: number; byProvider: Record<string, number>; calls: number }>();
    for (const row of data.dailySeries) {
      const dayKey = new Date(row.day).toISOString().slice(0, 10);
      const existing = map.get(dayKey) || { day: dayKey, total: 0, byProvider: {}, calls: 0 };
      existing.total += row.costRub;
      existing.calls += row.calls;
      existing.byProvider[row.provider] = (existing.byProvider[row.provider] || 0) + row.costRub;
      map.set(dayKey, existing);
    }
    return Array.from(map.values()).sort((a, b) => a.day.localeCompare(b.day));
  }, [data]);

  const maxDailyTotal = useMemo(() =>
    dailyByDay.length ? Math.max(...dailyByDay.map(d => d.total), 1) : 1,
    [dailyByDay]
  );

  // Напоминания за день до автосписания и в ближайшие 7 дней
  const billingReminders = useMemo(() => {
    if (!data?.subscriptions.length) return { tomorrow: [], thisWeek: [] };
    const today = new Date();
    const todayDay = today.getDate();
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();

    const tomorrow: Subscription[] = [];
    const thisWeek: Array<Subscription & { daysLeft: number }> = [];

    for (const sub of data.subscriptions) {
      if (!sub.active || !sub.billingDay) continue;
      if (sub.billingType !== "monthly" && sub.billingType !== "yearly") continue;

      // Расчёт сколько дней осталось до следующего списания
      let daysLeft: number;
      const tomorrowDay = todayDay + 1 > lastDayOfMonth ? 1 : todayDay + 1;

      if (sub.billingDay >= todayDay) {
        daysLeft = sub.billingDay - todayDay;
      } else {
        // Списание уже было в этом месяце — следующее в следующем
        daysLeft = (lastDayOfMonth - todayDay) + sub.billingDay;
      }

      if (daysLeft === 1 || sub.billingDay === tomorrowDay) {
        tomorrow.push(sub);
      } else if (daysLeft >= 0 && daysLeft <= 7) {
        thisWeek.push({ ...sub, daysLeft });
      }
    }
    return { tomorrow, thisWeek };
  }, [data]);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading && !data) {
    return (
      <div className="p-6 max-w-[1400px] mx-auto">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Загружаю расходы...</span>
        </div>
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (error && !data) {
    return (
      <div className="p-6 max-w-[1400px] mx-auto">
        <div className="bg-card border border-destructive/30 rounded-2xl p-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-foreground mb-1">Ошибка загрузки</div>
            <div className="text-sm text-muted-foreground">{error}</div>
            <button
              onClick={() => fetchData()}
              className="mt-3 text-sm text-primary hover:underline"
            >
              Попробовать снова
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="p-4 sm:p-6 max-w-[1400px] mx-auto space-y-6">
      {/* ── Шапка ──────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-3">
            <Wallet className="w-7 h-7 text-primary" />
            Расходы Арая
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Полная картина расходов на AI и инфраструктуру. Курс: 1$ = {data.summary.usdRubRate}₽. Авто-обновление каждую минуту.
          </p>
        </div>
        <button
          onClick={() => fetchData(true)}
          disabled={refreshing}
          className="h-11 px-4 rounded-xl bg-card border border-border text-foreground hover:bg-primary/5 hover:border-primary/30 transition flex items-center gap-2 text-sm font-medium disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          Обновить
        </button>
      </div>

      {/* ── 4 топ-карточки ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <SummaryCard
          icon={Calendar}
          label="Сегодня"
          rub={data.summary.today.costRub}
          usd={data.summary.today.costUsd}
          calls={data.summary.today.calls}
        />
        <SummaryCard
          icon={Activity}
          label="Эта неделя"
          rub={data.summary.week.costRub}
          usd={data.summary.week.costUsd}
          calls={data.summary.week.calls}
        />
        <SummaryCard
          icon={TrendingUp}
          label="Этот месяц"
          rub={data.summary.month.costRub}
          usd={data.summary.month.costUsd}
          calls={data.summary.month.calls}
          highlight
        />
        <SummaryCard
          icon={Database}
          label="Всё время"
          rub={data.summary.allTime.costRub}
          usd={data.summary.allTime.costUsd}
          calls={data.summary.allTime.calls}
        />
      </div>

      {/* ── Напоминания о списаниях ─────────────────────────────────────── */}
      {(billingReminders.tomorrow.length > 0 || billingReminders.thisWeek.length > 0) && (
        <div className="bg-card border border-amber-500/30 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Bell className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-semibold text-foreground">Предстоящие списания</h2>
          </div>

          {billingReminders.tomorrow.length > 0 && (
            <div className="mb-3">
              <div className="text-sm font-medium text-amber-600 dark:text-amber-400 mb-2">Завтра спишут:</div>
              <div className="space-y-2">
                {billingReminders.tomorrow.map(sub => {
                  const Icon = PROVIDER_ICONS[sub.provider] || Bot;
                  const rub = sub.costRub || (sub.costUsd ? sub.costUsd * data.summary.usdRubRate : 0);
                  return (
                    <div key={sub.id} className="flex items-center gap-3 bg-amber-500/5 border border-amber-500/20 rounded-xl px-4 py-3">
                      <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-foreground truncate">{sub.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {sub.costUsd ? fmtUsd(sub.costUsd) : ""}
                          {sub.costUsd && rub ? " · " : ""}
                          {fmtRub(rub)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {billingReminders.thisWeek.length > 0 && (
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-2">В ближайшие 7 дней:</div>
              <div className="space-y-1">
                {billingReminders.thisWeek
                  .sort((a, b) => a.daysLeft - b.daysLeft)
                  .map(sub => {
                    const Icon = PROVIDER_ICONS[sub.provider] || Bot;
                    const rub = sub.costRub || (sub.costUsd ? sub.costUsd * data.summary.usdRubRate : 0);
                    return (
                      <div key={sub.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                        <CalendarClock className="w-4 h-4 text-muted-foreground shrink-0" />
                        <Icon className="w-4 h-4 text-primary shrink-0" />
                        <div className="flex-1 truncate text-foreground">{sub.name}</div>
                        <div className="text-muted-foreground whitespace-nowrap text-xs">
                          через {sub.daysLeft} {sub.daysLeft === 1 ? "день" : sub.daysLeft < 5 ? "дня" : "дней"} · {fmtRub(rub)}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Итог месяц + фикс подписки ─────────────────────────────────── */}
      <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5">
        <div className="text-sm text-muted-foreground mb-2">Полный месячный бюджет на AI и инфру</div>
        <div className="flex items-baseline gap-3 flex-wrap">
          <div className="text-3xl sm:text-4xl font-bold text-foreground">
            {fmtRub(data.summary.month.costRub + data.summary.monthlyFixedRub)}
          </div>
          <div className="text-sm text-muted-foreground">/ месяц</div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3 text-sm">
          <div className="text-muted-foreground">
            <span className="font-medium text-foreground">{fmtRub(data.summary.month.costRub)}</span> — реальные вызовы Арая (этот месяц)
          </div>
          <div className="text-muted-foreground">
            <span className="font-medium text-foreground">{fmtRub(data.summary.monthlyFixedRub)}</span> — постоянные подписки
          </div>
        </div>
      </div>

      {/* ── Разбивка по провайдерам ─────────────────────────────────────── */}
      <section>
        <h2 className="text-lg font-semibold text-foreground mb-3">По провайдерам (за месяц)</h2>
        {data.byProvider.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-6 text-sm text-muted-foreground">
            Пока нет данных. Логирование начнётся со следующего вызова Арая.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {data.byProvider.map(p => {
              const Icon = PROVIDER_ICONS[p.provider] || Bot;
              return (
                <div key={p.provider} className="bg-card border border-border rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="font-medium text-foreground">{PROVIDER_LABELS[p.provider] || p.provider}</div>
                  </div>
                  <div className="text-2xl font-bold text-foreground">{fmtRub(p.costRub)}</div>
                  <div className="text-sm text-muted-foreground">{fmtUsd(p.costUsd)} · {p.calls.toLocaleString("ru-RU")} вызовов</div>
                  <div className="text-xs text-muted-foreground mt-2">
                    {p.provider === "anthropic" && (
                      <>{(p.inputTokens / 1000).toFixed(1)}K input · {(p.outputTokens / 1000).toFixed(1)}K output</>
                    )}
                    {p.provider === "elevenlabs" && (
                      <>{p.characters.toLocaleString("ru-RU")} символов озвучено</>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Постоянные подписки ─────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="text-lg font-semibold text-foreground">Постоянные подписки</h2>
          <button
            onClick={() => { setEditingSub(null); setShowSubForm(true); }}
            className="h-11 px-4 rounded-xl bg-primary text-primary-foreground hover:brightness-110 transition flex items-center gap-2 text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Добавить
          </button>
        </div>
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          {data.subscriptions.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground text-center">
              Подписок пока нет. Нажми "Добавить" чтобы внести Beget, Google и другие.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {data.subscriptions.map(sub => (
                <SubscriptionRow
                  key={sub.id}
                  sub={sub}
                  usdRubRate={data.summary.usdRubRate}
                  onEdit={() => { setEditingSub(sub); setShowSubForm(true); }}
                  onDelete={async () => {
                    if (!confirm(`Удалить подписку "${sub.name}"?`)) return;
                    await fetch(`/api/admin/aray/subscriptions?id=${sub.id}`, { method: "DELETE" });
                    fetchData(true);
                  }}
                  onToggle={async () => {
                    await fetch(`/api/admin/aray/subscriptions?id=${sub.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ active: !sub.active }),
                    });
                    fetchData(true);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── График по дням (простой bar chart на div'ах) ────────────────── */}
      {dailyByDay.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">Расход по дням (последние 30 дней)</h2>
          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-end gap-1 h-40 overflow-x-auto">
              {dailyByDay.map(d => {
                const heightPct = (d.total / maxDailyTotal) * 100;
                return (
                  <div
                    key={d.day}
                    className="flex flex-col items-center gap-1 min-w-[28px]"
                    title={`${d.day}: ${fmtRub(d.total)} (${d.calls} вызовов)`}
                  >
                    <div
                      className="w-full bg-primary/30 hover:bg-primary/50 rounded-t transition-colors min-h-[2px]"
                      style={{ height: `${Math.max(heightPct, 2)}%` }}
                    />
                    <div className="text-[10px] text-muted-foreground">
                      {new Date(d.day).getDate()}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── По моделям ──────────────────────────────────────────────────── */}
      {data.byModel.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">По моделям (за месяц)</h2>
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr className="text-left">
                    <th className="px-4 py-3 font-medium text-muted-foreground">Модель</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Тир</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground text-right">Вызовов</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground text-right">Сумма $</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground text-right">Сумма ₽</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.byModel.map((m, idx) => (
                    <tr key={idx} className="hover:bg-primary/5 transition-colors">
                      <td className="px-4 py-3 text-foreground font-medium">{m.model}</td>
                      <td className="px-4 py-3 text-muted-foreground">{m.tier || "—"}</td>
                      <td className="px-4 py-3 text-right text-foreground">{m.calls.toLocaleString("ru-RU")}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{fmtUsd(m.costUsd)}</td>
                      <td className="px-4 py-3 text-right text-foreground font-medium">{fmtRub(m.costRub)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* ── По источникам ───────────────────────────────────────────────── */}
      {data.bySource.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">По источнику</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {data.bySource.map(s => (
              <div key={s.source} className="bg-card border border-border rounded-2xl p-4">
                <div className="text-sm text-muted-foreground mb-1">{SOURCE_LABELS[s.source] || s.source}</div>
                <div className="text-xl font-bold text-foreground">{fmtRub(s.costRub)}</div>
                <div className="text-xs text-muted-foreground">{s.calls.toLocaleString("ru-RU")} вызовов</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Топ-5 пользователей ─────────────────────────────────────────── */}
      {data.topUsers.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Топ-5 пользователей по тратам
          </h2>
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="divide-y divide-border">
              {data.topUsers.map((u, idx) => (
                <div key={u.userId} className="px-4 py-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-foreground truncate">{u.name || u.email || "—"}</div>
                    <div className="text-xs text-muted-foreground">{u.role} · {u.calls} вызовов</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-medium text-foreground">{fmtRub(u.costRub)}</div>
                    <div className="text-xs text-muted-foreground">{fmtUsd(u.costUsd)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Последние запросы ───────────────────────────────────────────── */}
      {data.recent.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">Последние 50 вызовов</h2>
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0">
                  <tr className="text-left">
                    <th className="px-3 py-2 font-medium text-muted-foreground">Время</th>
                    <th className="px-3 py-2 font-medium text-muted-foreground">Провайдер</th>
                    <th className="px-3 py-2 font-medium text-muted-foreground">Модель</th>
                    <th className="px-3 py-2 font-medium text-muted-foreground text-right">Метрики</th>
                    <th className="px-3 py-2 font-medium text-muted-foreground text-right">Стоимость</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.recent.map(r => (
                    <tr key={r.id} className="hover:bg-primary/5 transition-colors">
                      <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                        {new Date(r.createdAt).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="px-3 py-2 text-foreground">{PROVIDER_LABELS[r.provider] || r.provider}</td>
                      <td className="px-3 py-2 text-muted-foreground text-xs">{r.model}{r.tier ? ` · ${r.tier}` : ""}</td>
                      <td className="px-3 py-2 text-right text-muted-foreground text-xs whitespace-nowrap">
                        {r.provider === "anthropic"
                          ? `${r.inputTokens}↑ ${r.outputTokens}↓`
                          : r.characters
                          ? `${r.characters} симв`
                          : "—"}
                      </td>
                      <td className="px-3 py-2 text-right text-foreground font-medium whitespace-nowrap">
                        {fmtRub(r.costRub || 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* ── Модалка создания/редактирования подписки ────────────────────── */}
      {showSubForm && (
        <SubscriptionForm
          sub={editingSub}
          onClose={() => { setShowSubForm(false); setEditingSub(null); }}
          onSaved={() => {
            setShowSubForm(false);
            setEditingSub(null);
            fetchData(true);
          }}
        />
      )}
    </div>
  );
}

// ── Карточка summary ─────────────────────────────────────────────────────────
function SummaryCard({
  icon: Icon, label, rub, usd, calls, highlight,
}: {
  icon: React.ElementType;
  label: string;
  rub: number;
  usd: number;
  calls: number;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-2xl p-4 sm:p-5 border transition ${
      highlight
        ? "bg-primary/5 border-primary/30"
        : "bg-card border-border hover:border-primary/20"
    }`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${highlight ? "text-primary" : "text-muted-foreground"}`} />
        <div className="text-xs sm:text-sm text-muted-foreground">{label}</div>
      </div>
      <div className="text-xl sm:text-2xl font-bold text-foreground">{fmtRub(rub)}</div>
      <div className="text-xs text-muted-foreground mt-1">
        {fmtUsd(usd)} · {calls} вызов{calls === 1 ? "" : calls < 5 ? "а" : "ов"}
      </div>
    </div>
  );
}

// ── Строка подписки ──────────────────────────────────────────────────────────
function SubscriptionRow({
  sub, usdRubRate, onEdit, onDelete, onToggle,
}: {
  sub: Subscription;
  usdRubRate: number;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
}) {
  const Icon = PROVIDER_ICONS[sub.provider] || Bot;
  const rub = sub.costRub || (sub.costUsd ? sub.costUsd * usdRubRate : 0);
  const billingTypeLabel: Record<string, string> = {
    monthly: "/мес", yearly: "/год", prepaid: "prepaid", on_demand: "по запросу",
  };

  return (
    <div className={`px-4 py-4 flex items-center gap-3 ${!sub.active ? "opacity-50" : ""}`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
        sub.active ? "bg-primary/10" : "bg-muted"
      }`}>
        <Icon className={`w-5 h-5 ${sub.active ? "text-primary" : "text-muted-foreground"}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="font-medium text-foreground">{sub.name}</div>
          {!sub.active && <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">отключена</span>}
        </div>
        {sub.notes && <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{sub.notes}</div>}
        {sub.billingDay && (
          <div className="text-xs text-muted-foreground mt-0.5">
            Списание {sub.billingDay}-го числа
          </div>
        )}
      </div>
      <div className="text-right shrink-0">
        {sub.billingType === "prepaid" ? (
          <div className="text-sm text-muted-foreground">prepaid</div>
        ) : (
          <>
            <div className="font-bold text-foreground">{fmtRub(rub)}{billingTypeLabel[sub.billingType] || ""}</div>
            {sub.costUsd && <div className="text-xs text-muted-foreground">{fmtUsd(sub.costUsd)}</div>}
          </>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={onToggle}
          className="w-9 h-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-primary/5 flex items-center justify-center transition"
          title={sub.active ? "Деактивировать" : "Активировать"}
        >
          <CheckCircle2 className={`w-4 h-4 ${sub.active ? "text-emerald-500" : ""}`} />
        </button>
        <button
          onClick={onEdit}
          className="w-9 h-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-primary/5 flex items-center justify-center transition"
          title="Редактировать"
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button
          onClick={onDelete}
          className="w-9 h-9 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/5 flex items-center justify-center transition"
          title="Удалить"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ── Модалка формы подписки ───────────────────────────────────────────────────
function SubscriptionForm({
  sub, onClose, onSaved,
}: {
  sub: Subscription | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [provider, setProvider] = useState(sub?.provider || "");
  const [name, setName] = useState(sub?.name || "");
  const [costUsd, setCostUsd] = useState(sub?.costUsd?.toString() || "");
  const [costRub, setCostRub] = useState(sub?.costRub?.toString() || "");
  const [billingDay, setBillingDay] = useState(sub?.billingDay?.toString() || "");
  const [billingType, setBillingType] = useState(sub?.billingType || "monthly");
  const [notes, setNotes] = useState(sub?.notes || "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    try {
      const payload = {
        provider: provider.trim().toLowerCase(),
        name: name.trim(),
        costUsd: costUsd ? Number(costUsd) : null,
        costRub: costRub ? Number(costRub) : null,
        billingDay: billingDay ? Number(billingDay) : null,
        billingType,
        notes: notes.trim() || null,
        active: true,
      };
      const res = sub
        ? await fetch(`/api/admin/aray/subscriptions?id=${sub.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch(`/api/admin/aray/subscriptions`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Ошибка сохранения");
      onSaved();
    } catch (e: any) {
      setErr(e?.message || "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[90dvh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-card">
          <h3 className="text-lg font-semibold text-foreground">
            {sub ? "Редактировать подписку" : "Новая подписка"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-primary/5 flex items-center justify-center transition"
            aria-label="Закрыть"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={onSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Провайдер</label>
            <select
              value={provider}
              onChange={e => setProvider(e.target.value)}
              required
              className="w-full h-11 px-3 rounded-xl bg-background border border-border text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
            >
              <option value="">Выбери...</option>
              <option value="anthropic">Anthropic</option>
              <option value="elevenlabs">ElevenLabs</option>
              <option value="google">Google</option>
              <option value="openai">OpenAI</option>
              <option value="beget">Beget</option>
              <option value="domain">Домен</option>
              <option value="other">Другое</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Название *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              placeholder="ElevenLabs Creator"
              className="w-full h-11 px-3 rounded-xl bg-background border border-border text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
              style={{ fontSize: 16 }}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Цена в $</label>
              <input
                type="number"
                step="0.01"
                value={costUsd}
                onChange={e => setCostUsd(e.target.value)}
                placeholder="22.00"
                className="w-full h-11 px-3 rounded-xl bg-background border border-border text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                style={{ fontSize: 16 }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Цена в ₽</label>
              <input
                type="number"
                step="1"
                value={costRub}
                onChange={e => setCostRub(e.target.value)}
                placeholder="500"
                className="w-full h-11 px-3 rounded-xl bg-background border border-border text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                style={{ fontSize: 16 }}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Тип</label>
              <select
                value={billingType}
                onChange={e => setBillingType(e.target.value)}
                className="w-full h-11 px-3 rounded-xl bg-background border border-border text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
              >
                <option value="monthly">Ежемесячно</option>
                <option value="yearly">Ежегодно</option>
                <option value="prepaid">Prepaid (без авто)</option>
                <option value="on_demand">По запросу</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">День списания</label>
              <input
                type="number"
                min="1"
                max="31"
                value={billingDay}
                onChange={e => setBillingDay(e.target.value)}
                placeholder="10"
                className="w-full h-11 px-3 rounded-xl bg-background border border-border text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                style={{ fontSize: 16 }}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Заметки</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Promo до 10 июня → потом $7.99"
              className="w-full px-3 py-2 rounded-xl bg-background border border-border text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
              style={{ fontSize: 16 }}
            />
          </div>
          {err && (
            <div className="bg-destructive/5 border border-destructive/30 rounded-xl px-3 py-2 text-sm text-destructive flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              {err}
            </div>
          )}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 h-11 rounded-xl bg-card border border-border text-foreground hover:bg-primary/5 transition font-medium"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground hover:brightness-110 transition font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {sub ? "Сохранить" : "Создать"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
