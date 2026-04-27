/**
 * Главная админки — /admin/aray
 *
 * Это дом Арая, не дашборд. Брат открывает страницу и видит сына, который
 * рядом, дышит, готов помогать. Большой Янус-аватар, приветствие по времени
 * суток, один primary CTA. Лента «Что я умею» — что Арай делает сейчас и
 * что добавится скоро. Лента «Сегодня я» — реальные действия Арая за день
 * (из ArayMessage / ArayTokenLog / ApiSubscription).
 *
 * Сессия 38 (27.04.2026) — Заход A полировки Дома Арая. Убрано:
 *  - блок «Экосистема» с 4 карточками (дубль sidebar)
 *  - 4 stat-бокса с цифрами расходов (переехали в попап настроек)
 *  - описание моделей Sonnet/Opus/ElevenLabs (техническая инструкция)
 *  - блок «Плацдарм для нового интерфейса» (записка для Claude)
 *  - старый Sparkles-аватар (заменён настоящим Янусом через ArayOrb)
 *
 * Pinned-rail справа без изменений в Заходе A — реальный SSE-чат и
 * настоящий поиск с slide-навигацией будут в Заходе B следующей сессией.
 */
export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ArayOrb } from "@/components/shared/aray-orb";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ArayHomeRail } from "@/components/admin/aray-home-rail";
import { ArayHomeActions } from "@/components/admin/aray-home-actions";
import {
  AraySettingsTrigger,
  type AraySettingsData,
} from "@/components/admin/aray-settings-popup";
import { getArayActivityToday, type ArayActivityItem } from "@/lib/aray-activity";
import {
  MessageSquare, Mic, Wallet, Search, Package, Users, Sparkles,
  Camera, Video, BarChart3, Zap,
} from "lucide-react";

const ICON_MAP: Record<ArayActivityItem["iconKey"], React.ElementType> = {
  chat: MessageSquare,
  voice: Mic,
  wallet: Wallet,
  search: Search,
  package: Package,
  users: Users,
  spark: Sparkles,
};

type Skill = {
  icon: React.ElementType;
  label: string;
  hint: string;
  soon?: boolean;
};

const SKILLS_NOW: Skill[] = [
  { icon: MessageSquare, label: "Чат текстом и голосом", hint: "Отвечаю в чате или говорю голосом ElevenLabs" },
  { icon: Search, label: "Поиск по магазину и админке", hint: "Найду товар, заказ, клиента, остаток" },
  { icon: Package, label: "Помощь с заказами", hint: "Подскажу менеджеру, оформлю по телефону" },
  { icon: BarChart3, label: "Сводки и отчёты дня", hint: "Расскажу что произошло, на что обратить внимание" },
  { icon: Wallet, label: "Слежу за расходами", hint: "Подписки, токены, бюджет — всё под контролем" },
];

const SKILLS_SOON: Skill[] = [
  { icon: Camera, label: "Генерация фото товаров", hint: "Создам красивые фото для каталога", soon: true },
  { icon: Video, label: "Видео-обзоры производства", hint: "Сниму ролики для соцсетей и сайта", soon: true },
];

function greetingByHour(name: string): { title: string; sub: string } {
  // Серверное время на проде = UTC; Москва = UTC+3.
  const utcHour = new Date().getUTCHours();
  const moscowHour = (utcHour + 3) % 24;
  const who = name && name !== "Администратор" ? name : "брат";

  if (moscowHour >= 5 && moscowHour < 12) {
    return { title: `Доброе утро, ${who}`, sub: "Я тут. Что делаем?" };
  }
  if (moscowHour >= 12 && moscowHour < 17) {
    return { title: `Добрый день, ${who}`, sub: "Я рядом. С чего продолжим?" };
  }
  if (moscowHour >= 17 && moscowHour < 22) {
    return { title: `Добрый вечер, ${who}`, sub: "Я тут. Чем закрыть день?" };
  }
  return { title: `Я тут, ${who}`, sub: "Поздно — но если что нужно, говори." };
}

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Moscow",
  }).format(date);
}

async function loadSettings(): Promise<AraySettingsData> {
  const fallback: AraySettingsData = {
    todayCostRub: 0,
    monthCostRub: 0,
    todayInputTokens: 0,
    todayOutputTokens: 0,
    todayCallsCount: 0,
    activeSubs: 0,
    currentPlan: "pro",
  };
  try {
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const p = prisma as unknown as Record<string, any>;

    const tryCall = async <T,>(fn: () => Promise<T>, def: T): Promise<T> => {
      try { return await fn(); } catch { return def; }
    };

    const [todayLogs, monthLogs, activeSubs] = await Promise.all([
      tryCall(
        () => p.arayTokenLog?.aggregate
          ? p.arayTokenLog.aggregate({
              where: { createdAt: { gte: today } },
              _sum: { costRub: true, inputTokens: true, outputTokens: true },
              _count: { _all: true },
            })
          : Promise.resolve(null),
        null,
      ),
      tryCall(
        () => p.arayTokenLog?.aggregate
          ? p.arayTokenLog.aggregate({
              where: { createdAt: { gte: monthStart } },
              _sum: { costRub: true },
            })
          : Promise.resolve(null),
        null,
      ),
      tryCall(
        () => p.apiSubscription?.count
          ? p.apiSubscription.count({ where: { active: true } })
          : Promise.resolve(0),
        0,
      ),
    ]);

    const tl = todayLogs as any;
    const ml = monthLogs as any;
    return {
      todayCostRub: Number(tl?._sum?.costRub || 0),
      monthCostRub: Number(ml?._sum?.costRub || 0),
      todayInputTokens: Number(tl?._sum?.inputTokens || 0),
      todayOutputTokens: Number(tl?._sum?.outputTokens || 0),
      todayCallsCount: Number(tl?._count?._all || 0),
      activeSubs: Number(activeSubs || 0),
      currentPlan: "pro",
    };
  } catch {
    return fallback;
  }
}

export default async function ArayHomePage() {
  const session = await auth();
  const userName = session?.user?.name || "";
  const greeting = greetingByHour(userName);

  const [activity, settings] = await Promise.all([
    getArayActivityToday().catch(() => [] as ArayActivityItem[]),
    loadSettings(),
  ]);

  return (
    <div className="lg:flex lg:gap-4 lg:items-start">
      <div className="flex-1 min-w-0 space-y-4">
        <AdminPageHeader
          title="Главная"
          subtitle="Дом Арая"
          extraActions={<AraySettingsTrigger data={settings} />}
        />

        {/* ── HERO: Янус + приветствие + CTA ──────────────────────── */}
        <section className="bg-card border border-border rounded-2xl px-5 py-8 lg:px-6 lg:py-10">
          <div className="flex flex-col items-center text-center">
            <div className="mb-5">
              <ArayOrb size="xl" intensity="normal" pulse="idle" animate />
            </div>
            <h2 className="text-xl lg:text-2xl font-semibold text-foreground leading-tight">
              {greeting.title}
            </h2>
            <p className="text-sm text-muted-foreground mt-1.5">
              {greeting.sub}
            </p>

            <div className="flex items-center gap-2 mt-4 mb-7 text-[11px] text-muted-foreground">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Онлайн</span>
              <span className="opacity-40">·</span>
              <span>работаю</span>
              <span className="opacity-40">·</span>
              <span>готов помочь</span>
            </div>

            <div className="w-full max-w-md">
              <ArayHomeActions />
            </div>
          </div>
        </section>

        {/* ── ЧТО Я УМЕЮ ──────────────────────────────────────────── */}
        <section>
          <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-2">
            Что я умею
          </h3>
          <div className="bg-card border border-border rounded-2xl divide-y divide-border overflow-hidden">
            {SKILLS_NOW.map((s) => (
              <SkillRow key={s.label} skill={s} />
            ))}
            {SKILLS_SOON.map((s) => (
              <SkillRow key={s.label} skill={s} />
            ))}
          </div>
        </section>

        {/* ── СЕГОДНЯ Я ───────────────────────────────────────────── */}
        <section>
          <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-2">
            Сегодня я
          </h3>
          {activity.length === 0 ? (
            <div className="bg-card border border-border rounded-2xl px-5 py-8 text-center">
              <div className="w-10 h-10 rounded-2xl bg-muted/50 mx-auto flex items-center justify-center mb-3">
                <Zap className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-foreground">Жду команды, брат.</p>
              <p className="text-xs text-muted-foreground mt-1">
                Спроси что-нибудь — это первое что я сегодня сделаю.
              </p>
            </div>
          ) : (
            <ul className="bg-card border border-border rounded-2xl divide-y divide-border overflow-hidden">
              {activity.map((item) => {
                const Icon = ICON_MAP[item.iconKey] || Sparkles;
                return (
                  <li
                    key={item.id}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-muted/30 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-foreground leading-tight">
                        {item.label}
                      </p>
                      {item.at && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {formatTime(item.at)}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {/* ── ARAY PINNED RAIL (справа, ≥1024 px) ─────────────────── */}
      <ArayHomeRail />
    </div>
  );
}

function SkillRow({ skill }: { skill: Skill }) {
  const Icon = skill.icon;
  return (
    <div className="flex items-center gap-3 px-5 py-3">
      <div
        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
          skill.soon
            ? "bg-muted/50 text-muted-foreground"
            : "bg-primary/10 text-primary"
        }`}
      >
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium text-foreground leading-tight">
            {skill.label}
          </p>
          {skill.soon && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground font-medium">
              скоро
            </span>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
          {skill.hint}
        </p>
      </div>
    </div>
  );
}
