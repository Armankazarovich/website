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

// ⚠️ JS \b НЕ работает с кириллицей! Используем lookbehind/lookahead
// (?<![а-яёА-ЯЁ]) = перед буквой нет кириллицы (начало слова)
// (?![а-яёА-ЯЁ])  = после буквы нет кириллицы (конец слова)
const CYR_START = "(?<![а-яёА-ЯЁ])";
const CYR_END   = "(?![а-яёА-ЯЁ])";

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

  // Листовые — ⚠️ используем кириллические границы слов вместо \b
  { pattern: /фанера/i,                                                              label: "Фанера",  keyword: "фанера" },
  { pattern: /осб|osb/i,                                                             label: "ОСБ",     keyword: "осб" },
  { pattern: new RegExp(`${CYR_START}дсп${CYR_END}`, "i"),                           label: "ДСП",     keyword: "дсп" },
  { pattern: new RegExp(`${CYR_START}двп${CYR_END}|оргалит`, "i"),                   label: "ДВП",     keyword: "двп" },
  { pattern: new RegExp(`${CYR_START}мдф${CYR_END}|mdf`, "i"),                       label: "МДФ",     keyword: "мдф" },
  { pattern: new RegExp(`${CYR_START}цсп${CYR_END}`, "i"),                           label: "ЦСП",     keyword: "цсп" },
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
 * Группы типов — для "быстрых переходов" на главной.
 * type=доска → показать все доски (обрезную, строганную, террасную, пола)
 */
const TYPE_GROUPS: Record<string, { label: string; keywords: string[] }> = {
  "доска": {
    label: "Доска",
    keywords: ["террасная", "доска пола", "строганн", "обрезн"],
  },
};

/**
 * Находит ProductTypeInfo по keyword (из URL параметра type=XXX)
 */
export function findTypeByKeyword(keyword: string): ProductTypeInfo | null {
  // Проверяем сначала группы
  if (TYPE_GROUPS[keyword]) {
    return { label: TYPE_GROUPS[keyword].label, keyword };
  }
  const rule = TYPE_RULES.find(r => r.keyword === keyword);
  return rule ? { label: rule.label, keyword: rule.keyword } : null;
}

/**
 * Если keyword — групповой (например "доска"),
 * возвращает список дочерних keyword'ов.
 * Если нет — возвращает null (обычная фильтрация по одному типу).
 */
export function getTypeGroupKeywords(keyword: string): string[] | null {
  const group = TYPE_GROUPS[keyword];
  return group ? group.keywords : null;
}
