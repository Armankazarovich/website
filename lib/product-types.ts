/**
 * Автоматическое определение типа товара по названию.
 *
 * Когда добавляется новый товар — он автоматически попадает
 * в правильный фильтр по ключевым словам в названии.
 *
 * Порядок важен: более специфичные паттерны идут первыми.
 */

export interface ProductTypeInfo {
  label: string;    // Что видит пользователь: "Доска обрезная"
  keyword: string;  // Для Prisma name.contains(): "обрезная"
}

// Порядок: от специфичных к общим
// Каждый паттерн — regex для проверки названия товара
const TYPE_RULES: { pattern: RegExp; label: string; keyword: string }[] = [
  // Доска — подтипы
  { pattern: /террасная\s*доска/i,                   label: "Террасная доска",   keyword: "террасная" },
  { pattern: /доска\s*пола|европол/i,                label: "Доска пола",        keyword: "доска пола" },
  { pattern: /доска.*(строганн|антисепт.*строганн)|строганн.*доска/i,  label: "Доска строганная", keyword: "строганн" },
  { pattern: /доска.*(обрезн|антисепт)|обрезн.*доска/i,               label: "Доска обрезная",   keyword: "обрезн" },

  // Брус — подтипы
  { pattern: /имитаци[яюи]\s*бруса/i,               label: "Имитация бруса",    keyword: "имитаци" },
  { pattern: /брус.*клеен|клеен.*брус/i,             label: "Брус клееный",      keyword: "клеен" },
  { pattern: /брусок/i,                              label: "Брусок",            keyword: "брусок" },
  { pattern: /брус.*(строган|антисепт.*строган)|строган.*брус/i,  label: "Брус строганный", keyword: "строган" },
  { pattern: /брус.*(обрезн|антисепт)|обрезн.*брус/i,            label: "Брус обрезной",   keyword: "брус" },

  // Отделка
  { pattern: /блок[\s-]*хаус/i,                      label: "Блок-хаус",         keyword: "блок-хаус" },
  { pattern: /евровагонка/i,                         label: "Евровагонка",       keyword: "евровагонка" },
  { pattern: /вагонка/i,                             label: "Вагонка",           keyword: "вагонка" },
  { pattern: /планкен/i,                             label: "Планкен",           keyword: "планкен" },
  { pattern: /плинтус/i,                             label: "Плинтус",           keyword: "плинтус" },

  // Листовые
  { pattern: /фанера/i,                              label: "Фанера",            keyword: "фанера" },
  { pattern: /осб|osb/i,                             label: "ОСБ",               keyword: "осб" },
  { pattern: /\bдсп\b/i,                             label: "ДСП",               keyword: "дсп" },
  { pattern: /\bдвп\b|оргалит/i,                     label: "ДВП",               keyword: "двп" },
  { pattern: /\bмдф\b|mdf/i,                         label: "МДФ",               keyword: "мдф" },
  { pattern: /\bцсп\b/i,                             label: "ЦСП",               keyword: "цсп" },
];

/**
 * Определяет тип товара по названию.
 * Возвращает null если тип не определён.
 */
export function extractProductType(name: string): ProductTypeInfo | null {
  for (const rule of TYPE_RULES) {
    if (rule.pattern.test(name)) {
      return { label: rule.label, keyword: rule.keyword };
    }
  }
  return null;
}

/**
 * Извлекает уникальные типы товаров из списка названий.
 * Возвращает только те типы, для которых есть хотя бы один товар.
 * Порядок сохраняется из TYPE_RULES (от важных к менее важным).
 */
export function getAvailableTypes(productNames: string[]): ProductTypeInfo[] {
  const found = new Map<string, ProductTypeInfo>();

  for (const name of productNames) {
    const type = extractProductType(name);
    if (type && !found.has(type.label)) {
      found.set(type.label, type);
    }
  }

  // Сохраняем порядок из TYPE_RULES
  const ordered: ProductTypeInfo[] = [];
  for (const rule of TYPE_RULES) {
    if (found.has(rule.label)) {
      ordered.push(found.get(rule.label)!);
    }
  }

  return ordered;
}

/**
 * Находит ProductTypeInfo по keyword (из URL параметра type=XXX)
 */
export function findTypeByKeyword(keyword: string): ProductTypeInfo | null {
  const rule = TYPE_RULES.find(r => r.keyword === keyword);
  return rule ? { label: rule.label, keyword: rule.keyword } : null;
}
