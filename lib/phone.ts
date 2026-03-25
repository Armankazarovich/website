/**
 * Нормализует номер телефона в формат +7XXXXXXXXXX
 * Принимает: +7..., 8..., 7..., 9... (10 цифр)
 * Возвращает: +7XXXXXXXXXX или null если не удалось распознать
 */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;

  // Убираем всё кроме цифр и +
  const cleaned = raw.replace(/[^\d+]/g, "");

  let digits = cleaned.replace(/\D/g, ""); // только цифры

  // +7XXXXXXXXXX → убираем +7, остаётся 10 цифр
  if (cleaned.startsWith("+7")) {
    digits = cleaned.slice(2).replace(/\D/g, "");
  }
  // 8XXXXXXXXXX → убираем 8, остаётся 10 цифр
  else if (digits.startsWith("8") && digits.length === 11) {
    digits = digits.slice(1);
  }
  // 7XXXXXXXXXX → убираем 7, остаётся 10 цифр
  else if (digits.startsWith("7") && digits.length === 11) {
    digits = digits.slice(1);
  }
  // 9XXXXXXXXX → уже 10 цифр, начиная с 9
  // digits remains as-is

  if (digits.length !== 10) return null;

  return `+7${digits}`;
}

/**
 * Форматирует телефон для отображения: +7 (977) 136-77-47
 */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return "—";
  const normalized = normalizePhone(phone);
  if (!normalized) return phone;
  const d = normalized.slice(2); // 10 цифр
  return `+7 (${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6, 8)}-${d.slice(8, 10)}`;
}
