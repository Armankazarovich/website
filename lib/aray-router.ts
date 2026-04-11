/**
 * ARAY Smart Model Router — выбирает модель Anthropic по сложности запроса.
 *
 * Принцип: чем умнее ответ — тем короче. Чем короче — тем дешевле.
 * ARAY бесплатен для всех. Мы платим Anthropic из 50% дохода ARAY.
 * Каждый токен на счету — поэтому роутер выбирает минимально достаточную модель.
 *
 * Стоимость (на апрель 2026):
 *   Haiku 4.5:  $0.80/$4 за 1M input/output  — FAQ, приветствия, навигация
 *   Sonnet 4.6: $3/$15 за 1M input/output     — бизнес-вопросы, расчёты, инструменты
 *   Opus 4.6:   $15/$75 за 1M input/output    — сложный анализ, стратегия, обучение
 *
 * Разница: Opus в ~19x дороже Haiku. Важно не тратить Opus на "привет".
 */

export type ModelTier = "haiku" | "sonnet" | "opus";

export interface ModelConfig {
  model: string;           // Полное имя модели Anthropic
  maxTokens: number;       // Лимит ответа
  tier: ModelTier;         // Уровень для аналитики
  costPer1kInput: number;  // Стоимость в $ за 1000 input-токенов
  costPer1kOutput: number; // Стоимость в $ за 1000 output-токенов
}

const MODELS: Record<ModelTier, ModelConfig> = {
  haiku: {
    model: "claude-haiku-4-5-20251001",
    maxTokens: 600,
    tier: "haiku",
    costPer1kInput: 0.0008,
    costPer1kOutput: 0.004,
  },
  sonnet: {
    model: "claude-sonnet-4-6",
    maxTokens: 1200,
    tier: "sonnet",
    costPer1kInput: 0.003,
    costPer1kOutput: 0.015,
  },
  opus: {
    model: "claude-opus-4-6",
    maxTokens: 2000,
    tier: "opus",
    costPer1kInput: 0.015,
    costPer1kOutput: 0.075,
  },
};

/**
 * Классификация сообщения пользователя → уровень модели.
 * Выполняется мгновенно (regex/heuristics), без вызова API.
 */
export function classifyQuery(
  message: string,
  context: { role: "customer" | "staff" | "admin"; hasTools: boolean; messageCount: number }
): ModelTier {
  const msg = message.toLowerCase().trim();
  const wordCount = msg.split(/\s+/).length;

  // ── HAIKU: простые вопросы, приветствия, навигация ──────────────────────
  const haikuPatterns = [
    // Приветствия
    /^(привет|здравствуй|хай|хелло|добрый|доброе|здарова|ку|йо|hello|hi|hey)\b/,
    // Благодарности
    /^(спасибо|благодарю|мерси|пасиб|thanks)\b/,
    // Прощание
    /^(пока|до свидания|удачи|бай|bye|досвидос)\b/,
    // Простые ответы
    /^(да|нет|ок|окей|ладно|хорошо|понял|ясно|норм|гуд|ага|угу)\b/,
    // Кто ты / что умеешь
    /^(кто ты|что ты|что умеешь|как тебя зовут|ты кто)/,
    // Время/дата
    /^(который час|какой день|какое число|сколько время)/,
    // Навигация
    /^(покажи|открой|перейди|где|куда)\s+(заказы|товары|клиенты|доставку|настройки|каталог|главную)/,
    // Однословные
  ];

  if (wordCount <= 3 || haikuPatterns.some(p => p.test(msg))) {
    // Но если это админ и просит данные — нужен Sonnet (инструменты)
    if (context.hasTools && /заказ|выручк|клиент|товар|статус|статист|сводк/.test(msg)) {
      return "sonnet";
    }
    return "haiku";
  }

  // ── OPUS: глубокий анализ, стратегия, обучение ─────────────────────────
  const opusPatterns = [
    // Стратегия и анализ
    /\b(стратег|анализ|проанализируй|сравни .{20,}|оценка|аудит|оптимизац|рекоменд.*стратег)/,
    // Обучение / длинные объяснения
    /\b(объясни.*подробно|расскажи.*детально|научи|обуч|лекц|курс|урок)\b/,
    // Финансовый анализ
    /\b(рентабельн|себестоимост|маржинальн|прогноз.*продаж|бюджет.*планиров|финансов.*план)/,
    // Бизнес-план
    /\b(бизнес.план|масштабирован|франшиз|инвестиц)/,
    // Длинные креативные задачи
    /\b(напиши.{30,}|составь.{30,}|создай.*текст.{20,}|придумай.{30,})/,
    // Сложные технические
    /\b(архитектур.*систем|интеграц.*api|миграц.*данн|рефакторинг)/,
  ];

  if (opusPatterns.some(p => p.test(msg))) {
    return "opus";
  }

  // Длинные развёрнутые вопросы (>40 слов) → скорее Opus
  if (wordCount > 40) {
    return "opus";
  }

  // ── SONNET: всё остальное — бизнес, инструменты, расчёты ───────────────
  return "sonnet";
}

/**
 * Получить конфиг модели по уровню.
 */
export function getModelConfig(tier: ModelTier): ModelConfig {
  return MODELS[tier];
}

/**
 * Рассчитать стоимость запроса (для логирования и аналитики).
 */
export function estimateCost(
  tier: ModelTier,
  inputTokens: number,
  outputTokens: number
): number {
  const config = MODELS[tier];
  return (inputTokens / 1000) * config.costPer1kInput +
         (outputTokens / 1000) * config.costPer1kOutput;
}

/**
 * Инструкция модели по краткости ответа (добавляется в system prompt).
 * Чем дороже модель — тем строже лимит на слова.
 */
export function getBrevityInstruction(tier: ModelTier): string {
  switch (tier) {
    case "haiku":
      return "\n\nОТВЕТ: 1-2 предложения. Максимально коротко.";
    case "sonnet":
      return "\n\nОТВЕТ: 2-5 предложений. Коротко и по делу. Данные из инструментов — компактно.";
    case "opus":
      return "\n\nОТВЕТ: до 8 предложений. Подробно, но без воды. Каждое слово несёт смысл.";
  }
}
