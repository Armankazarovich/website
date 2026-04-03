/**
 * Haptic Feedback — вибрация как на iPhone/Android
 * Работает через Web Vibration API (Android Chrome)
 * На iOS Safari — минимальная поддержка, но touchstart даёт отклик
 */

export type HapticStyle = "light" | "medium" | "heavy" | "success" | "error" | "selection";

const PATTERNS: Record<HapticStyle, number | number[]> = {
  selection: 8,          // лёгкое касание — переключение, выбор
  light:     12,         // обычная кнопка
  medium:    20,         // важное действие
  heavy:     35,         // критическое действие
  success:   [10, 40, 10],   // подтверждение — добавил в корзину и тп
  error:     [30, 20, 30],   // ошибка
};

export function haptic(style: HapticStyle = "light") {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(PATTERNS[style]);
    }
  } catch {
    // Тихо игнорируем — на iOS может выбросить ошибку
  }
}

/**
 * Глобальный обработчик — вешается на document один раз.
 * Автоматически срабатывает на button, a, [role="button"], input[type="checkbox"]
 */
export function initGlobalHaptics() {
  if (typeof document === "undefined") return;
  if ((window as any).__hapticInited) return;
  (window as any).__hapticInited = true;

  document.addEventListener("touchstart", (e) => {
    const target = e.target as HTMLElement;
    if (!target) return;

    const el = target.closest(
      'button, a, [role="button"], label[for], input[type="checkbox"], input[type="radio"]'
    ) as HTMLElement | null;

    if (!el) return;

    // Не вибрировать на disabled элементах
    if (el.hasAttribute("disabled") || el.getAttribute("aria-disabled") === "true") return;

    // Определяем силу вибрации по классу или data-атрибуту
    const style = (el.dataset.haptic as HapticStyle) || "light";
    haptic(style);
  }, { passive: true });
}
