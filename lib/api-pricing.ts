/**
 * Централизованные тарифы AI-провайдеров для расчёта стоимости.
 *
 * Источник: страница /admin/aray/costs использует это для логирования.
 * Если Anthropic поднимет цены — обновляй ANTHROPIC_PRICING.
 * Если ElevenLabs изменит план — обновляй ELEVENLABS_PRICING.
 */

// ── Anthropic Claude (USD per 1 million tokens) ─────────────────────────────
// https://www.anthropic.com/pricing
export const ANTHROPIC_PRICING = {
  "claude-opus-4-6":     { input: 15.00, output: 75.00 },
  "claude-sonnet-4-6":   { input: 3.00,  output: 15.00 },
  "claude-haiku-4-5-20251001": { input: 0.80, output: 4.00 },
  "claude-haiku-4-5":    { input: 0.80, output: 4.00 },
} as const;

// ── ElevenLabs (USD per 1 million characters) ───────────────────────────────
// Creator план: $22/мес за 100,000 кредитов (1 кредит ≈ 1 символ для Multilingual v2)
// $22 / 100,000 = $0.00022 per char = $220 per 1M chars
// https://elevenlabs.io/pricing
export const ELEVENLABS_PRICING = {
  "eleven_multilingual_v2": { perChar: 0.00022 },
  "eleven_turbo_v2_5":      { perChar: 0.00011 }, // в 2 раза дешевле
  "eleven_flash_v2_5":      { perChar: 0.00011 },
} as const;

// ── Курс USD → RUB ──────────────────────────────────────────────────────────
// На этап 1 — фиксированный курс. На этап 2 — обновление через ЦБ РФ API.
export const USD_RUB_RATE = 95;

/**
 * Стоимость вызова Anthropic Claude.
 */
export function calculateAnthropicCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): { usd: number; rub: number } {
  const pricing = ANTHROPIC_PRICING[model as keyof typeof ANTHROPIC_PRICING];
  if (!pricing) {
    // Fallback на Sonnet тариф если модель неизвестна
    const fb = ANTHROPIC_PRICING["claude-sonnet-4-6"];
    const usd = (inputTokens / 1_000_000) * fb.input + (outputTokens / 1_000_000) * fb.output;
    return { usd, rub: usd * USD_RUB_RATE };
  }
  const usd = (inputTokens / 1_000_000) * pricing.input + (outputTokens / 1_000_000) * pricing.output;
  return { usd, rub: usd * USD_RUB_RATE };
}

/**
 * Стоимость вызова ElevenLabs TTS.
 */
export function calculateElevenLabsCost(
  model: string,
  characters: number
): { usd: number; rub: number } {
  const pricing = ELEVENLABS_PRICING[model as keyof typeof ELEVENLABS_PRICING];
  const perChar = pricing?.perChar ?? ELEVENLABS_PRICING["eleven_multilingual_v2"].perChar;
  const usd = characters * perChar;
  return { usd, rub: usd * USD_RUB_RATE };
}

/**
 * Конвертация USD в RUB.
 */
export function usdToRub(usd: number): number {
  return usd * USD_RUB_RATE;
}

/**
 * Форматирование рублей для UI (2,400 ₽).
 */
export function formatRub(rub: number): string {
  return `${Math.round(rub).toLocaleString("ru-RU")} ₽`;
}

/**
 * Форматирование долларов для UI ($24.50).
 */
export function formatUsd(usd: number): string {
  return `$${usd.toFixed(2)}`;
}
