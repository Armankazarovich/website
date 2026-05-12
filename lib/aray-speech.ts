/**
 * ARAY speech preparation.
 *
 * One source of truth for text that goes into ElevenLabs or browser
 * SpeechSynthesis. Chat text can stay rich; spoken text must be calm, short,
 * punctuation-safe and predictable in Russian.
 */

export type AraySpeechOptions = {
  maxLength?: number;
  ensureSentenceEnd?: boolean;
};

const DEFAULT_MAX_LENGTH = 900;

function stripModelMarkers(text: string): string {
  return text
    .replace(/\n?__ARAY_META__[\s\S]*$/g, "")
    .replace(/__ARAY_ERR__/g, "")
    .replace(/__ARAY_REFRESH__/g, "")
    .replace(/__ARAY_ADD_CART:[\s\S]*?__/g, " ")
    .replace(/__ARAY_NAVIGATE:[\s\S]*?__/g, " ")
    .replace(/__ARAY_SHOW_URL:[\s\S]*?__/g, " ")
    .replace(/__ARAY_POPUP:[\s\S]*?__/g, " ")
    .replace(/ARAY_ACTIONS:[\s\S]*$/g, " ");
}

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*([^*\n]+)\*\*/g, "$1")
    .replace(/\*([^*\n]+)\*/g, "$1")
    .replace(/`([^`\n]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/~~([^~]+)~~/g, "$1")
    .replace(/[_>|]/g, " ");
}

function stripEmoji(text: string): string {
  return text
    .replace(/[\u{1F000}-\u{1FFFF}]/gu, "")
    .replace(/[\u{2600}-\u{27BF}]/gu, "")
    .replace(/[\u{FE00}-\u{FE0F}\u{200D}]/gu, "");
}

function stripLinks(text: string): string {
  return text
    .replace(/https?:\/\/\S+/gi, " ссылка ")
    .replace(/\S+@\S+\.\S+/g, " адрес почты ")
    .replace(/\b([a-z0-9-]+)\.(ru|com|net|org|io|app|store|online)\b/gi, " ссылка ");
}

const KNOWN_SPEECH_WORDS: Array<[RegExp, string]> = [
  [/\bARAY\b/gi, "Арай"],
  [/\bArai\b/gi, "Арай"],
  [/\bPiloRus\b/gi, "ПилоРус"],
  [/\bPWA\b/gi, "пи вэ эй"],
  [/\bCRM\b/gi, "си ар эм"],
  [/\bAPI\b/gi, "эй пи ай"],
  [/\bSEO\b/gi, "сео"],
  [/\bSMS\b/gi, "эс эм эс"],
  [/\bPDF\b/gi, "пэ дэ эф"],
  [/\bCSV\b/gi, "си эс ви"],
  [/\bJSON\b/gi, "джейсон"],
  [/\bXML\b/gi, "экс эм эл"],
  [/\bGPT\b/gi, "джи пи ти"],
  [/\bAI\b/gi, "эй ай"],
  [/\bID\b/gi, "ай ди"],
  [/\bSKU\b/gi, "эс ка ю"],
  [/\bURL\b/gi, "ю ар эл"],
  [/\bQR\b/gi, "кью ар"],
  [/\bUTM\b/gi, "ю ти эм"],
  [/\bCTR\b/gi, "си ти ар"],
  [/\bCPC\b/gi, "си пи си"],
  [/\bCPM\b/gi, "си пи эм"],
  [/\bROAS\b/gi, "роас"],
  [/\bOpenAI\b/gi, "Оупен эй ай"],
  [/\bYandex\b/gi, "Яндекс"],
  [/\bDirect\b/gi, "Директ"],
  [/\bMetrika\b/gi, "Метрика"],
  [/\bExcel\b/gi, "эксель"],
  [/\bOzon\b/gi, "озон"],
  [/\bWildberries\b/gi, "вайлдберриз"],
  [/\bVK\b/gi, "вэ ка"],
  [/\bWhatsApp\b/gi, "ватсап"],
  [/\bTelegram\b/gi, "телеграм"],
  [/\bemail\b/gi, "имэйл"],
  [/\be-mail\b/gi, "имэйл"],
  [/(?<![А-Яа-яЁё])ГОСТ(?![А-Яа-яЁё])/g, "гост"],
  [/(?<![А-Яа-яЁё])СНиП(?![А-Яа-яЁё])/gi, "снип"],
  [/(?<![А-Яа-яЁё])ООО(?![А-Яа-яЁё])/g, "о о о"],
  [/(?<![А-Яа-яЁё])ИП(?![А-Яа-яЁё])/g, "и п"],
  [/(?<![А-Яа-яЁё])ИНН(?![А-Яа-яЁё])/g, "и н н"],
  [/(?<![А-Яа-яЁё])КПП(?![А-Яа-яЁё])/g, "к п п"],
  [/(?<![А-Яа-яЁё])ОГРН(?![А-Яа-яЁё])/g, "о гэ эр эн"],
  [/(?<![А-Яа-яЁё])НДС(?![А-Яа-яЁё])/g, "эн дэ эс"],
];

function expandKnownSpeechWords(text: string): string {
  let s = text;
  for (const [regex, replacement] of KNOWN_SPEECH_WORDS) {
    s = s.replace(regex, replacement);
  }
  return s;
}

function amountValue(raw: string): string {
  return raw.replace(/[\s\u00A0]/g, "").replace(",", ".");
}

function decimalFractionWord(frac: string): string {
  if (frac.length === 1) return wordByAmount(frac, ["десятая", "десятых", "десятых"]);
  if (frac.length === 2) return wordByAmount(frac, ["сотая", "сотых", "сотых"]);
  if (frac.length === 3) return wordByAmount(frac, ["тысячная", "тысячных", "тысячных"]);
  return `точка ${frac.split("").join(" ")}`;
}

function amountSpeechValue(raw: string): string {
  const normalized = amountValue(raw);
  if (!normalized.includes(".")) return normalized;
  const [whole, fraction = ""] = normalized.split(".");
  const cleanFraction = fraction.replace(/[^\d]/g, "");
  if (!cleanFraction) return whole;
  return `${whole} целых ${cleanFraction} ${decimalFractionWord(cleanFraction)}`;
}

function rubleWord(rawAmount: string): "рубль" | "рубля" | "рублей" {
  const normalized = amountValue(rawAmount);
  if (!normalized) return "рублей";
  if (normalized.includes(".")) return "рубля";

  const n = Math.abs(Number.parseInt(normalized, 10));
  if (!Number.isFinite(n)) return "рублей";

  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) return "рублей";
  if (mod10 === 1) return "рубль";
  if (mod10 >= 2 && mod10 <= 4) return "рубля";
  return "рублей";
}

type WordForms = readonly [one: string, few: string, many: string];

function wordByAmount(rawAmount: string, forms: WordForms): string {
  const normalized = amountValue(rawAmount);
  if (!normalized) return forms[2];
  if (normalized.includes(".")) return forms[1];

  const n = Math.abs(Number.parseInt(normalized, 10));
  if (!Number.isFinite(n)) return forms[2];

  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) return forms[2];
  if (mod10 === 1) return forms[0];
  if (mod10 >= 2 && mod10 <= 4) return forms[1];
  return forms[2];
}

const AMOUNT = String.raw`((?:\d{1,3}(?:[\s\u00A0]\d{3})+|\d+)(?:[,.]\d+)?)`;
const RUB_TOKEN = String.raw`(?:₽|руб\.?(?![а-яё])|р\.?(?![а-яё]))`;
const UNIT_END = String.raw`(?![а-яёa-z0-9])`;
const UNIT_PRICE_SEPARATOR = String.raw`(?:/|за)`;

function expandSymbols(text: string): string {
  return text
    .replace(/(\d{4})\s*г\.?(?![а-яёa-z0-9])/gi, "$1 год")
    .replace(/№\s*/g, " номер ")
    .replace(/#\s*(\d+)/g, " номер $1")
    .replace(/\bN[º°]?\s*(\d+)/gi, "номер $1")
    .replace(/(\d)\s*°\s*C\b/gi, "$1 градусов Цельсия")
    .replace(/(\d)\s*°/g, "$1 градусов")
    .replace(/±/g, " плюс минус ")
    .replace(/≈/g, " примерно ")
    .replace(/≥|>=/g, " больше или равно ")
    .replace(/≤|<=/g, " меньше или равно ")
    .replace(/>/g, " больше ")
    .replace(/</g, " меньше ")
    .replace(/=/g, " равно ")
    .replace(/&/g, " и ")
    .replace(/@/g, " ");
}

const LATIN_LETTER_NAMES: Record<string, string> = {
  A: "эй",
  B: "би",
  C: "си",
  D: "ди",
  E: "и",
  F: "эф",
  G: "джи",
  H: "эйч",
  I: "ай",
  J: "джей",
  K: "кей",
  L: "эл",
  M: "эм",
  N: "эн",
  O: "оу",
  P: "пи",
  Q: "кью",
  R: "ар",
  S: "эс",
  T: "ти",
  U: "ю",
  V: "ви",
  W: "дабл ю",
  X: "икс",
  Y: "уай",
  Z: "зэд",
};

const DIGIT_SPEECH: Record<string, string> = {
  "0": "ноль",
  "1": "один",
  "2": "два",
  "3": "три",
  "4": "четыре",
  "5": "пять",
  "6": "шесть",
  "7": "семь",
  "8": "восемь",
  "9": "девять",
};

function spellDigitsForSpeech(raw: string): string {
  return raw
    .replace(/\D/g, "")
    .split("")
    .map((digit) => DIGIT_SPEECH[digit] || digit)
    .join(" ");
}

function spellLatinCodeChunk(chunk: string): string {
  return chunk
    .split("")
    .map((char) => {
      if (/\d/.test(char)) return char;
      return LATIN_LETTER_NAMES[char.toUpperCase()] || char;
    })
    .join(" ");
}

function normalizeCodes(text: string): string {
  return text.replace(/\b([A-Z]{2,})([- ]?\d{2,})(?:[- ]?([A-Z0-9]{1,}))?\b/g, (_match, letters: string, digits: string, tail?: string) => {
    const spoken = [
      spellLatinCodeChunk(letters),
      digits.replace(/\D/g, "").split("").join(" "),
      tail ? spellLatinCodeChunk(tail) : "",
    ].filter(Boolean);
    return spoken.join(" ");
  });
}

function normalizePhones(text: string): string {
  return text.replace(/(?:\+\d|8)[\d\s().-]{8,}\d/g, (match) => {
    const digits = match.replace(/\D/g, "");
    if (digits.length < 10 || digits.length > 15) return match;
    const prefix = match.trim().startsWith("+") ? "плюс " : "";
    return `${prefix}${spellDigitsForSpeech(digits)}`;
  });
}

function normalizeLongIdentifiers(text: string): string {
  const context = String.raw`(?:сч[её]тчик(?:\s+Метрики)?|номер(?:\s+сч[её]тчика)?|Метрик[аи]|counter(?:\s*id)?|counter_id|client\s*id|ай\s+ди|ID|ym)`;
  const idNumber = String.raw`([0-9][0-9\s-]{5,}[0-9])`;

  return text.replace(new RegExp(`(${context}[^.!?\\n\\d]{0,80})${idNumber}`, "gi"), (_match: string, before: string, value: string) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length < 7 || digits.length > 20) return `${before}${value}`;
    return `${before}${spellDigitsForSpeech(digits)}`;
  });
}

function replaceAmountUnit(text: string, unitPattern: string, forms: WordForms): string {
  return text.replace(new RegExp(`${AMOUNT}\\s*${unitPattern}`, "gi"), (_match: string, amount: string) => {
    const normalized = amountSpeechValue(amount);
    return `${normalized} ${wordByAmount(amount, forms)}`;
  });
}

function expandStandaloneUnits(text: string): string {
  let s = text;

  const units: Array<[string, WordForms]> = [
    [String.raw`(?:м[³3]|куб\.?\s*м\.?|кубометр(?:а|ов)?)${UNIT_END}`, ["кубометр", "кубометра", "кубометров"]],
    [String.raw`(?:м[²2]|кв\.?\s*м\.?|квадратн(?:ый|ого|ых)?\s*м(?:етр(?:а|ов)?)?)${UNIT_END}`, ["квадратный метр", "квадратных метра", "квадратных метров"]],
    [String.raw`(?:п\.?\s*м\.?|пог\.?\s*м\.?|погонн(?:ый|ого|ых)?\s*м(?:етр(?:а|ов)?)?)${UNIT_END}`, ["погонный метр", "погонных метра", "погонных метров"]],
    [String.raw`(?:мм|миллиметр(?:а|ов)?)${UNIT_END}`, ["миллиметр", "миллиметра", "миллиметров"]],
    [String.raw`(?:см|сантиметр(?:а|ов)?)${UNIT_END}`, ["сантиметр", "сантиметра", "сантиметров"]],
    [String.raw`(?:км|километр(?:а|ов)?)${UNIT_END}`, ["километр", "километра", "километров"]],
    [String.raw`(?:кг|килограмм(?:а|ов)?)${UNIT_END}`, ["килограмм", "килограмма", "килограммов"]],
    [String.raw`(?:г\.?|гр\.?|грамм(?:а|ов)?)${UNIT_END}`, ["грамм", "грамма", "граммов"]],
    [String.raw`(?:л\.?|литр(?:а|ов)?)${UNIT_END}`, ["литр", "литра", "литров"]],
    [String.raw`(?:т\.?|тонн(?:а|ы)?)${UNIT_END}`, ["тонна", "тонны", "тонн"]],
    [String.raw`(?:шт\.?|штук(?:а|и)?)${UNIT_END}`, ["штука", "штуки", "штук"]],
    [String.raw`(?:%)`, ["процент", "процента", "процентов"]],
    [String.raw`(?:м\.?|метр(?:а|ов)?)${UNIT_END}`, ["метр", "метра", "метров"]],
  ];

  for (const [unitPattern, forms] of units) {
    s = replaceAmountUnit(s, unitPattern, forms);
  }

  return s;
}

function expandCurrencyAndUnits(text: string): string {
  let s = text;

  const replacements: Array<[RegExp, string]> = [
    [new RegExp(`${AMOUNT}\\s*${RUB_TOKEN}\\s*${UNIT_PRICE_SEPARATOR}\\s*(?:м[³3]|куб\\.?\\s*м\\.?|кубометр(?:а|ов)?)${UNIT_END}`, "gi"), "за кубометр"],
    [new RegExp(`${AMOUNT}\\s*${RUB_TOKEN}\\s*${UNIT_PRICE_SEPARATOR}\\s*(?:м[²2]|кв\\.?\\s*м\\.?|квадратн(?:ый|ого)?\\s*м(?:етр)?)${UNIT_END}`, "gi"), "за квадратный метр"],
    [new RegExp(`${AMOUNT}\\s*${RUB_TOKEN}\\s*${UNIT_PRICE_SEPARATOR}\\s*(?:п\\.?\\s*м\\.?|пог\\.?\\s*м\\.?|погонн(?:ый|ого)?\\s*м(?:етр)?)${UNIT_END}`, "gi"), "за погонный метр"],
    [new RegExp(`${AMOUNT}\\s*${RUB_TOKEN}\\s*${UNIT_PRICE_SEPARATOR}\\s*(?:шт\\.?|штук(?:а|и)?)${UNIT_END}`, "gi"), "за штуку"],
    [new RegExp(`${AMOUNT}\\s*${RUB_TOKEN}\\s*${UNIT_PRICE_SEPARATOR}\\s*(?:кг|килограмм(?:а|ов)?)${UNIT_END}`, "gi"), "за килограмм"],
    [new RegExp(`${AMOUNT}\\s*${RUB_TOKEN}\\s*${UNIT_PRICE_SEPARATOR}\\s*(?:л\\.?|литр(?:а|ов)?)${UNIT_END}`, "gi"), "за литр"],
    [new RegExp(`${AMOUNT}\\s*${RUB_TOKEN}\\s*${UNIT_PRICE_SEPARATOR}\\s*(?:т\\.?|тонн(?:а|ы)?)${UNIT_END}`, "gi"), "за тонну"],
  ];

  for (const [regex, unitLabel] of replacements) {
    s = s.replace(regex, (_match: string, amount: string) => {
      const normalized = amountSpeechValue(amount);
      return `${normalized} ${rubleWord(amount)} ${unitLabel}`;
    });
  }

  s = s.replace(new RegExp(`${AMOUNT}\\s*${RUB_TOKEN}`, "gi"), (_match: string, amount: string) => {
    const normalized = amountSpeechValue(amount);
    return `${normalized} ${rubleWord(amount)}`;
  });

  s = s
    .replace(/₽/g, " рублей ")
    .replace(/(?<![а-яё])руб\.?(?![а-яё])/gi, " рублей ")
    .replace(/(?<![а-яё])р\.(?![а-яё])/gi, " рублей ")
    .replace(/\$/g, " долларов ")
    .replace(/€/g, " евро ");

  s = expandStandaloneUnits(s);

  return s;
}

function normalizeNumbersAndSizes(text: string): string {
  return text
    .replace(/(\d+(?:[,.]\d+)?)\s*[xхXХ×]\s*(\d+(?:[,.]\d+)?)(?:\s*[xхXХ×]\s*(\d+(?:[,.]\d+)?))?/g,
      (_match: string, a: string, b: string, c?: string) => c ? `${a} на ${b} на ${c}` : `${a} на ${b}`)
    .replace(/(\d)\s+(\d{3}\b)/g, "$1$2")
    .replace(/(\+)(\d)/g, " плюс $2")
    .replace(/(\d+(?:[,.]\d+)?)\s*\+\s*(\d+(?:[,.]\d+)?)/g, "$1 плюс $2")
    .replace(/(\d+(?:[,.]\d+)?)\s*\*\s*(\d+(?:[,.]\d+)?)/g, "$1 умножить на $2")
    .replace(/(\d+(?:[,.]\d+)?)\s*[-–—]\s*(\d+(?:[,.]\d+)?)/g, "от $1 до $2")
    .replace(/\((\d+)\)/g, " $1 ");
}

function normalizeDecimalNumbers(text: string): string {
  return text
    .replace(/(?<!\d)(\d+,\d+)(?!\d)/g, (match) => amountSpeechValue(match))
    .replace(/(?<![\d.])(\d+\.\d+)(?!\.\d)/g, (match) => amountSpeechValue(match));
}

function normalizePunctuation(text: string, ensureSentenceEnd: boolean): string {
  let s = text
    .replace(/\r\n/g, "\n")
    .replace(/\n{2,}/g, ". ")
    .replace(/\n/g, ", ")
    .replace(/^[\s]*[-•–—]\s+/gm, "")
    .replace(/^[\s]*\d+[.)]\s+/gm, "")
    .replace(/[•·]/g, ", ")
    .replace(/\s*;\s*/g, ", ")
    .replace(/\s*[—–]\s*/g, ", ")
    .replace(/\s+-\s+/g, ", ")
    .replace(/\//g, " ")
    .replace(/[<>{}[\]\\^~#@&]/g, " ")
    .replace(/[«»"„“”'’‘]/g, "")
    .replace(/\s*\(\s*/g, ", ")
    .replace(/\s*\)\s*/g, ", ")
    .replace(/\.{3,}/g, "...")
    .replace(/!{2,}/g, "!")
    .replace(/\?{2,}/g, "?")
    .replace(/,{2,}/g, ",")
    .replace(/\s+([.,!?:])/g, "$1")
    .replace(/,\s*([.!?:])/g, "$1")
    .replace(/\s{2,}/g, " ")
    .replace(/^[\s,]+|[\s,]+$/g, "")
    .trim();

  if (ensureSentenceEnd && s.length > 0 && !/[.!?]$/.test(s)) s += ".";
  return s;
}

function trimBySentence(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  const clipped = text.slice(0, maxLength);
  const lastEnd = Math.max(clipped.lastIndexOf("."), clipped.lastIndexOf("!"), clipped.lastIndexOf("?"));
  if (lastEnd > maxLength * 0.45) return clipped.slice(0, lastEnd + 1).trim();
  return `${clipped.replace(/[,.\s]+$/g, "").trim()}.`;
}

export function prepareAraySpeechText(text: string, options: AraySpeechOptions = {}): string {
  if (!text || typeof text !== "string") return "";

  const maxLength = options.maxLength ?? DEFAULT_MAX_LENGTH;
  const ensureSentenceEnd = options.ensureSentenceEnd ?? true;

  let s = text;
  s = stripModelMarkers(s);
  s = stripMarkdown(s);
  s = stripEmoji(s);
  s = stripLinks(s);
  s = expandKnownSpeechWords(s);
  s = normalizeCodes(s);
  s = expandSymbols(s);
  s = normalizeLongIdentifiers(s);
  s = normalizePhones(s);
  s = expandCurrencyAndUnits(s);
  s = normalizeNumbersAndSizes(s);
  s = normalizeDecimalNumbers(s);
  s = normalizePunctuation(s, ensureSentenceEnd);
  s = trimBySentence(s, maxLength);

  return s;
}
