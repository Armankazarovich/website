/**
 * Дом Арая — /admin/aray
 *
 * День 2 (27.04.2026): прототип pinned-rail архитектуры.
 * Безопасный плацдарм — НЕ дашборд, не ломаем рабочие страницы.
 * Здесь Арман увидит как будет выглядеть весь интерфейс админки
 * после миграции (видение из visions/aray-pinned-rail.md, утверждено 27.04 утром).
 *
 * Слева: статус Арая, разделы экосистемы, последние диалоги.
 * Справа: ArayPinnedRail с Quick Actions для контекста "Дом Арая".
 */
export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import Link from "next/link";
import {
  Sparkles, Wallet, FlaskConical, Settings, History,
  MessageSquare, Mic, TrendingUp, ChevronRight, Cpu,
  Zap, BookOpen,
} from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ArayPinnedRail, type ArayQuickAction } from "@/components/admin/aray-pinned-rail";

const QUICK_ACTIONS: ArayQuickAction[] = [
  { href: "/admin/aray/costs", label: "Расходы", icon: Wallet },
  { href: "/admin/aray-lab",   label: "Лаб",      icon: FlaskConical },
  { href: "#prompts",          label: "Промпты",  icon: BookOpen },
  { href: "#history",          label: "История",  icon: History },
];

function formatRub(value: number): string {
  if (!Number.isFinite(value)) return "0 ₽";
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatDate(date: Date): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(date);
  const dayStart = new Date(d);
  dayStart.setHours(0, 0, 0, 0);
  if (dayStart.getTime() === today.getTime()) {
    return `Сегодня · ${formatTime(d)}`;
  }
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

type RecentMessage = {
  id: string;
  role: string;
  content: string;
  context: unknown;
  createdAt: Date;
  user: { name: string | null; email: string | null } | null;
};

async function loadStats() {
  const safe = {
    todayCostRub: 0,
    monthCostRub: 0,
    todayCallsCount: 0,
    todayMessagesCount: 0,
    todayInputTokens: 0,
    todayOutputTokens: 0,
    activeSubs: 0,
    recentMessages: [] as RecentMessage[],
  };
  try {
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Каждый запрос — независимый try/catch (если Prisma client не знает модель,
    // не валим всю страницу).
    const p = prisma as unknown as Record<string, any>;

    const tryCall = async <T,>(fn: () => Promise<T>, fallback: T): Promise<T> => {
      try { return await fn(); } catch { return fallback; }
    };

    const [todayLogs, monthLogs, todayMessagesCount, activeSubs, recentMessages] =
      await Promise.all([
        tryCall(
          () =>
            p.arayTokenLog?.aggregate
              ? p.arayTokenLog.aggregate({
                  where: { createdAt: { gte: today } },
                  _sum: { costUsd: true, costRub: true, inputTokens: true, outputTokens: true },
                  _count: { _all: true },
                })
              : Promise.resolve(null),
          null,
        ),
        tryCall(
          () =>
            p.arayTokenLog?.aggregate
              ? p.arayTokenLog.aggregate({
                  where: { createdAt: { gte: monthStart } },
                  _sum: { costUsd: true, costRub: true },
                })
              : Promise.resolve(null),
          null,
        ),
        tryCall(
          () =>
            p.arayMessage?.count
              ? p.arayMessage.count({ where: { createdAt: { gte: today } } })
              : Promise.resolve(0),
          0,
        ),
        tryCall(
          () =>
            p.apiSubscription?.count
              ? p.apiSubscription.count({ where: { active: true } })
              : Promise.resolve(0),
          0,
        ),
        tryCall(
          () =>
            p.arayMessage?.findMany
              ? p.arayMessage.findMany({
                  where: { createdAt: { gte: dayAgo } },
                  orderBy: { createdAt: "desc" },
                  take: 8,
                  select: {
                    id: true,
                    role: true,
                    content: true,
                    context: true,
                    createdAt: true,
                    user: { select: { name: true, email: true } },
                  },
                })
              : Promise.resolve([]),
          [] as RecentMessage[],
        ),
      ]);

    const tl = todayLogs as any;
    const ml = monthLogs as any;
    safe.todayCostRub = Number(tl?._sum?.costRub || 0);
    safe.monthCostRub = Number(ml?._sum?.costRub || 0);
    safe.todayCallsCount = Number(tl?._count?._all || 0);
    safe.todayInputTokens = Number(tl?._sum?.inputTokens || 0);
    safe.todayOutputTokens = Number(tl?._sum?.outputTokens || 0);
    safe.todayMessagesCount = Number(todayMessagesCount || 0);
    safe.activeSubs = Number(activeSubs || 0);
    safe.recentMessages = (recentMessages as RecentMessage[]) || [];
  } catch (err) {
    // Prisma вообще недоступен — отдаём страницу с дефолтами.
    console.error("[admin/aray] loadStats failed:", err);
  }
  return safe;
}

export default async function ArayHomePage() {
  await auth();

  const stats = await loadStats();
  const {
    todayCostRub,
    monthCostRub,
    todayCallsCount,
    todayMessagesCount,
    todayInputTokens,
    todayOutputTokens,
    activeSubs,
    recentMessages,
  } = stats;

  return (
    <div className="lg:flex lg:gap-4 lg:items-start">
      {/* ── ОСНОВНОЙ КОНТЕНТ (слева) ──────────────────────────────── */}
      <div className="flex-1 min-w-0 space-y-4">
        <AdminPageHeader
          title="Дом Арая"
          subtitle="Твой технический партнёр и команда"
        />

        {/* Hero — статус Арая */}
        <section className="bg-card border border-border rounded-2xl p-5 lg:p-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 lg:w-16 lg:h-16 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
              <Sparkles className="w-7 h-7 lg:w-8 lg:h-8 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base lg:text-lg font-semibold text-foreground leading-tight">
                Арай 1.0 на связи
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed mt-1">
                Sonnet 4.6 для повседневного, Opus 4.6 для сложного,
                ElevenLabs для голоса. Один характер, один маршрут, единая память.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
            <StatBox
              label="Расход сегодня"
              value={formatRub(todayCostRub)}
              icon={Wallet}
            />
            <StatBox
              label="Диалогов сегодня"
              value={String(todayMessagesCount)}
              icon={MessageSquare}
            />
            <StatBox
              label="Вызовов API"
              value={String(todayCallsCount)}
              icon={Cpu}
            />
            <StatBox
              label="Расход за месяц"
              value={formatRub(monthCostRub)}
              icon={TrendingUp}
            />
          </div>

          {(todayInputTokens > 0 || todayOutputTokens > 0) && (
            <p className="text-[11px] text-muted-foreground mt-3">
              Токены сегодня: {todayInputTokens.toLocaleString("ru-RU")} вход
              · {todayOutputTokens.toLocaleString("ru-RU")} ответ
            </p>
          )}
        </section>

        {/* Разделы экосистемы Арая */}
        <section>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-2">
            Экосистема
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <SectionCard
              href="/admin/aray/costs"
              icon={Wallet}
              title="Расходы"
              description="Дашборд токенов, моделей, подписок. Прогноз на месяц."
              badge={activeSubs > 0 ? `${activeSubs} подписок` : undefined}
            />
            <SectionCard
              href="/admin/aray-lab"
              icon={FlaskConical}
              title="Лаборатория"
              description="Прямой канал к Араю — задачи, тестовые промпты, эксперименты."
            />
            <SectionCard
              href="#prompts"
              icon={BookOpen}
              title="Промпты"
              description="Системные промпты USER/STAFF, дух ARAY, тон голоса. Редакция требует деплой."
              soon
            />
            <SectionCard
              href="#history"
              icon={History}
              title="История диалогов"
              description="Все разговоры Арая со всеми пользователями, фильтр по дате/источнику."
              soon
            />
          </div>
        </section>

        {/* Последние диалоги */}
        <section
          id="history"
          className="bg-card border border-border rounded-2xl overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Последние диалоги
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                За последние 24 часа · {recentMessages.length} сообщений
              </p>
            </div>
            <Link
              href="/admin/aray-lab"
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              В лабу <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          {recentMessages.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <div className="w-12 h-12 rounded-2xl bg-muted/40 mx-auto flex items-center justify-center mb-3">
                <MessageSquare className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                За последние 24 часа диалогов не было.
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Открой чат — Арай ответит и запишется здесь.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {recentMessages.map((m) => {
                const isUser = m.role === "user";
                const ctx =
                  m.context && typeof m.context === "object"
                    ? (m.context as Record<string, unknown>)
                    : {};
                const source = typeof ctx.source === "string" ? ctx.source : null;
                const page = typeof ctx.page === "string" ? ctx.page : null;
                const speaker = isUser
                  ? m.user?.name || m.user?.email || "Гость"
                  : "Арай";
                return (
                  <li key={m.id} className="px-5 py-3 hover:bg-muted/30 transition-colors">
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-[10px] font-semibold ${
                          isUser
                            ? "bg-muted text-muted-foreground"
                            : "bg-primary/10 text-primary"
                        }`}
                      >
                        {isUser ? "Ты" : "А"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-medium text-foreground">
                            {speaker}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {formatDate(m.createdAt)}
                          </span>
                          {source && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground">
                              {source}
                            </span>
                          )}
                          {page && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground">
                              {page}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-foreground/90 mt-1 leading-snug line-clamp-2">
                          {m.content}
                        </p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Подсказка для Армана */}
        <section className="bg-muted/30 border border-border rounded-2xl p-4 lg:p-5">
          <div className="flex items-start gap-3">
            <Zap className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">
                Это плацдарм для нового интерфейса
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                Здесь — первая страница админки в архитектуре pinned-rail.
                Когда отполируем, на эту же схему перейдут Дашборд, Заказы, Товары
                и остальные 22 раздела перед запуском Стройматериалов.
                Старый дашборд `/admin` пока работает как раньше — ничего не сломано.
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* ── ARAY PINNED RAIL (справа) ─────────────────────────────── */}
      <ArayPinnedRail
        page="aray-home"
        contextLabel="Дом Арая"
        quickActions={QUICK_ACTIONS}
        inputHint="Спроси про расход, промпт, модель"
      />
    </div>
  );
}

// ─── helpers ───────────────────────────────────────────────────────

function StatBox({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
}) {
  return (
    <div className="bg-muted/30 border border-border rounded-xl p-3">
      <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
        <Icon className="w-3.5 h-3.5" />
        <span className="text-[11px] uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-lg lg:text-xl font-bold text-foreground leading-tight tabular-nums">
        {value}
      </p>
    </div>
  );
}

function SectionCard({
  href,
  icon: Icon,
  title,
  description,
  badge,
  soon,
}: {
  href: string;
  icon: React.ElementType;
  title: string;
  description: string;
  badge?: string;
  soon?: boolean;
}) {
  return (
    <Link
      href={href}
      className="bg-card border border-border rounded-2xl p-4 lg:p-5 hover:border-primary/40 hover:bg-muted/20 transition-colors group"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-sm font-semibold text-foreground leading-tight">
              {title}
            </h4>
            {badge && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-primary/10 text-primary font-medium">
                {badge}
              </span>
            )}
            {soon && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground font-medium">
                скоро
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed mt-1">
            {description}
          </p>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
      </div>
    </Link>
  );
}
