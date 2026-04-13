/**
 * ARAY Model Router v2 — Sonnet 4.6 основная, Opus 4.6 для сложных задач.
 *
 * Никаких дешёвых моделей. Арай — премиум ассистент.
 * Sonnet: быстрый, умный, покрывает 90% задач.
 * Opus: глубокий анализ, стратегия, сложные расчёты, обучение.
 */

export type ModelTier = "sonnet" | "opus";

export interface ModelConfig {
  model: string;
  maxTokens: number;
  tier: ModelTier;
  costPer1kInput: number;
  costPer1kOutput: number;
}

const MODELS: Record<ModelTier, ModelConfig> = {
  sonnet: {
    model: "claude-sonnet-4-6",
    maxTokens: 2048,
    tier: "sonnet",
    costPer1kInput: 0.003,
    costPer1kOutput: 0.015,
  },
  opus: {
    model: "claude-opus-4-6",
    maxTokens: 4096,
    tier: "opus",
    costPer1kInput: 0.015,
    costPer1kOutput: 0.075,
  },
};

/**
 * Классификация → Sonnet или Opus.
 * Opus только для задач которые реально требуют глубокого мышления.
 */
export function classifyQuery(
  message: string,
  context: { role: "customer" | "staff" | "admin"; hasTools: boolean; messageCount: number }
): ModelTier {
  const msg = message.toLowerCase().trim();
  const wordCount = msg.split(/\s+/).length;

  // ── OPUS: глубокий анализ, стратегия, обучение ─────────────────────────
  const opusPatterns = [
    // Стратегия и анализ
    /\b(стратег|проанализируй|сравни .{20,}|аудит|оптимизац|рекоменд.*стратег)/,
    // Длинные объяснения
    /\b(объясни.*подробно|расскажи.*детально|научи|обуч)\b/,
    // Финансовый анализ
    /\b(рентабельн|себестоимост|маржинальн|прогноз.*продаж|бюджет.*планиров|финансов.*план)/,
    // Бизнес-план
    /\b(бизнес.план|масштабирован|франшиз|инвестиц)/,
    // Сложные креативные задачи
    /\b(напиши.{40,}|составь.{40,}|создай.*план.{20,})/,
    // Сложные технические
    /\b(архитектур.*систем|интеграц.*api|миграц.*данн)/,
    // Многошаговый анализ
    /\b(пошагов|поэтапн|разбери.*по.*пункт|детальн.*разбор)/,
  ];

  if (opusPatterns.some(p => p.test(msg))) {
    return "opus";
  }

  // Очень длинные развёрнутые вопросы (>50 слов) → Opus
  if (wordCount > 50) {
    return "opus";
  }

  // ── SONNET: всё остальное ─────────────────────────────────────────────
  return "sonnet";
}

export function getModelConfig(tier: ModelTier): ModelConfig {
  return MODELS[tier];
}

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
 * Инструкция по длине ответа.
 */
export function getBrevityInstruction(tier: ModelTier): string {
  switch (tier) {
    case "sonnet":
      return "\n\nОТВЕТ: 2-6 предложений. Коротко, конкретно, по делу. Данные из инструментов — компактно.";
    case "opus":
      return "\n\nОТВЕТ: до 10 предложений. Подробно и структурировано. Каждое слово несёт смысл.";
  }
}
