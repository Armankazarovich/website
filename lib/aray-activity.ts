/**
 * lib/aray-activity.ts
 *
 * Что Арай сделал лично сегодня — для ленты «Сегодня я» на странице /admin/aray.
 *
 * Не статистика и не дашборд. Это эмоциональная лента, как в Notion home или
 * Linear inbox: «помог с 3 заказами», «ответил Арману», «обновил расходы».
 * Брат должен открыть Главную и увидеть что Арай рядом, дышит, работает.
 *
 * Защищено try/catch на каждом запросе — если Prisma не сгенерирован
 * или модель отсутствует, лента просто пустая, страница не падает.
 */
import { prisma } from "@/lib/prisma";

export type ArayActivityItem = {
  id: string;
  /** Идентификатор иконки (lucide-react). Page.tsx маппит в реальный компонент. */
  iconKey: "chat" | "voice" | "wallet" | "search" | "package" | "users" | "spark";
  label: string;
  /** Время последнего такого действия (для красивого относительного отображения). */
  at?: Date;
};

const startOfToday = (): Date => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

function pluralRu(n: number, forms: [string, string, string]): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return forms[1];
  return forms[2];
}

/**
 * Возвращает список действий Арая за сегодня. Пустой массив = тишина,
 * page.tsx покажет empty state «Жду команды, брат».
 */
export async function getArayActivityToday(): Promise<ArayActivityItem[]> {
  const today = startOfToday();
  const p = prisma as unknown as Record<string, any>;

  const safeCount = async (
    fn: () => Promise<number>,
  ): Promise<number> => {
    try { return await fn(); } catch { return 0; }
  };

  const safeFindFirst = async (
    fn: () => Promise<{ createdAt: Date } | null>,
  ): Promise<Date | null> => {
    try {
      const r = await fn();
      return r?.createdAt || null;
    } catch { return null; }
  };

  const [
    assistantMsgsToday,
    lastAssistantMsg,
    voiceCallsToday,
    lastVoiceCall,
    ttsCallsToday,
    adminCallsToday,
    activeSubs,
    opusUsesToday,
  ] = await Promise.all([
    safeCount(() =>
      p.arayMessage?.count
        ? p.arayMessage.count({
            where: { role: "assistant", createdAt: { gte: today } },
          })
        : Promise.resolve(0),
    ),
    safeFindFirst(() =>
      p.arayMessage?.findFirst
        ? p.arayMessage.findFirst({
            where: { role: "assistant", createdAt: { gte: today } },
            orderBy: { createdAt: "desc" },
            select: { createdAt: true },
          })
        : Promise.resolve(null),
    ),
    safeCount(() =>
      p.arayTokenLog?.count
        ? p.arayTokenLog.count({
            where: { source: "voice-mode", createdAt: { gte: today } },
          })
        : Promise.resolve(0),
    ),
    safeFindFirst(() =>
      p.arayTokenLog?.findFirst
        ? p.arayTokenLog.findFirst({
            where: { source: "voice-mode", createdAt: { gte: today } },
            orderBy: { createdAt: "desc" },
            select: { createdAt: true },
          })
        : Promise.resolve(null),
    ),
    safeCount(() =>
      p.arayTokenLog?.count
        ? p.arayTokenLog.count({
            where: { feature: "tts", createdAt: { gte: today } },
          })
        : Promise.resolve(0),
    ),
    safeCount(() =>
      p.arayTokenLog?.count
        ? p.arayTokenLog.count({
            where: { source: "admin", createdAt: { gte: today } },
          })
        : Promise.resolve(0),
    ),
    safeCount(() =>
      p.apiSubscription?.count
        ? p.apiSubscription.count({ where: { active: true } })
        : Promise.resolve(0),
    ),
    safeCount(() =>
      p.arayTokenLog?.count
        ? p.arayTokenLog.count({
            where: { tier: "opus", createdAt: { gte: today } },
          })
        : Promise.resolve(0),
    ),
  ]);

  const items: ArayActivityItem[] = [];

  if (assistantMsgsToday > 0) {
    const w = pluralRu(assistantMsgsToday, ["вопрос", "вопроса", "вопросов"]);
    items.push({
      id: "answers",
      iconKey: "chat",
      label: `Ответил на ${assistantMsgsToday} ${w}`,
      at: lastAssistantMsg || undefined,
    });
  }

  if (voiceCallsToday > 0) {
    const w = pluralRu(voiceCallsToday, ["раз", "раза", "раз"]);
    items.push({
      id: "voice",
      iconKey: "voice",
      label: `Поговорил голосом ${voiceCallsToday} ${w}`,
      at: lastVoiceCall || undefined,
    });
  }

  if (adminCallsToday > 0 && adminCallsToday !== voiceCallsToday) {
    const w = pluralRu(adminCallsToday, ["раз", "раза", "раз"]);
    items.push({
      id: "admin",
      iconKey: "spark",
      label: `Помог в админке ${adminCallsToday} ${w}`,
    });
  }

  if (ttsCallsToday > 0) {
    const w = pluralRu(ttsCallsToday, ["ответ", "ответа", "ответов"]);
    items.push({
      id: "tts",
      iconKey: "voice",
      label: `Озвучил ${ttsCallsToday} ${w}`,
    });
  }

  if (opusUsesToday > 0) {
    items.push({
      id: "opus",
      iconKey: "spark",
      label: `Подключил Opus для сложных задач`,
    });
  }

  if (activeSubs > 0) {
    const w = pluralRu(activeSubs, ["подпиской", "подписками", "подписками"]);
    items.push({
      id: "subs",
      iconKey: "wallet",
      label: `Слежу за ${activeSubs} ${w}`,
    });
  }

  return items;
}
