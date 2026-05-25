export type ArayLanguageRoute = {
  code: string;
  names: string[];
};

export const ARAY_LANGUAGE_ROUTES: ArayLanguageRoute[] = [
  { code: "ru-RU", names: ["ru", "russian", "русский", "русском", "русски"] },
  { code: "en-US", names: ["en", "english", "английский", "английском", "английски"] },
  { code: "hy-AM", names: ["hy", "armenian", "армянский", "армянском", "армянски"] },
  { code: "zh-CN", names: ["zh", "chinese", "китайский", "китайском", "китайски"] },
  { code: "es-ES", names: ["es", "spanish", "испанский", "испанском", "испански"] },
  { code: "de-DE", names: ["de", "german", "немецкий", "немецком", "немецки"] },
  { code: "fr-FR", names: ["fr", "french", "французский", "французском", "французски"] },
  { code: "tr-TR", names: ["tr", "turkish", "турецкий", "турецком", "турецки"] },
  { code: "ar-SA", names: ["ar", "arabic", "арабский", "арабском", "арабски"] },
  { code: "ja-JP", names: ["ja", "japanese", "японский", "японском", "японски"] },
  { code: "ko-KR", names: ["ko", "korean", "корейский", "корейском", "корейски"] },
  { code: "ka-GE", names: ["ka", "georgian", "грузинский", "грузинском", "грузински"] },
  { code: "it-IT", names: ["it", "italian", "итальянский", "итальянском", "итальянски"] },
  { code: "pt-PT", names: ["pt", "portuguese", "португальский", "португальском", "португальски"] },
  { code: "pl-PL", names: ["pl", "polish", "польский", "польском", "польски"] },
  { code: "el-GR", names: ["el", "greek", "греческий", "греческом", "гречески"] },
  { code: "he-IL", names: ["he", "hebrew", "иврит", "иврите", "еврейский"] },
  { code: "hi-IN", names: ["hi", "hindi", "хинди", "индийский"] },
  { code: "th-TH", names: ["th", "thai", "тайский", "тайском", "тайски"] },
  { code: "uk-UA", names: ["uk", "ukrainian", "украинский", "украинском", "украински"] },
  { code: "kk-KZ", names: ["kk", "kazakh", "казахский", "казахском", "казахски"] },
  { code: "uz-UZ", names: ["uz", "uzbek", "узбекский", "узбекском", "узбекски"] },
];

function normalizeLanguageText(text: string): string {
  return text
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^a-zа-я0-9-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeArayLanguageCode(value?: string | null): string | null {
  if (!value) return null;
  const requested = value.trim().toLowerCase();
  const direct = ARAY_LANGUAGE_ROUTES.find((route) => route.code.toLowerCase() === requested);
  if (direct) return direct.code;
  const base = requested.split("-")[0];
  const byBase = ARAY_LANGUAGE_ROUTES.find((route) => route.code.toLowerCase().split("-")[0] === base);
  return byBase?.code ?? null;
}

export function inferRequestedLanguage(request?: string | null): string | null {
  if (!request) return null;
  const byCode = normalizeArayLanguageCode(request);
  if (byCode) return byCode;

  const normalized = normalizeLanguageText(request);
  if (!normalized) return null;

  for (const route of ARAY_LANGUAGE_ROUTES) {
    if (route.names.some((name) => normalized.includes(normalizeLanguageText(name)))) {
      return route.code;
    }
  }

  return null;
}

export function inferSpeechLanguage(text: string): string {
  if (/[\u3400-\u9FFF]/.test(text)) return "zh-CN";
  if (/[\u3040-\u30FF]/.test(text)) return "ja-JP";
  if (/[\uAC00-\uD7AF]/.test(text)) return "ko-KR";
  if (/[\u0530-\u058F]/.test(text)) return "hy-AM";
  if (/[\u10A0-\u10FF]/.test(text)) return "ka-GE";
  if (/[\u0600-\u06FF]/.test(text)) return "ar-SA";
  if (/[\u0E00-\u0E7F]/.test(text)) return "th-TH";
  if (/[\u0900-\u097F]/.test(text)) return "hi-IN";
  if (/[\u0590-\u05FF]/.test(text)) return "he-IL";
  if (/[\u0370-\u03FF]/.test(text)) return "el-GR";
  if (/[\u04D8\u04D9\u0492\u0493\u049A\u049B\u04A2\u04A3\u04E8\u04E9\u04B0\u04B1\u04AE\u04AF\u04BA\u04BB]/i.test(text)) return "kk-KZ";
  if (/[\u0490\u0491\u0404\u0454\u0406\u0456\u0407\u0457]/.test(text)) return "uk-UA";
  if (/[\u0400-\u04FF]/.test(text)) return "ru-RU";
  if (/[\u011E\u011F\u0130\u0131\u015E\u015F\u00D6\u00F6\u00DC\u00FC\u00C7\u00E7]/.test(text)) return "tr-TR";
  if (/[\u0104\u0105\u0106\u0107\u0118\u0119\u0141\u0142\u0143\u0144\u00D3\u00F3\u015A\u015B\u0179\u017A\u017B\u017C]/.test(text)) return "pl-PL";
  if (/[\u00D1\u00F1\u00C1\u00E1\u00C9\u00E9\u00CD\u00ED\u00D3\u00F3\u00DA\u00FA\u00DC\u00FC\u00BF\u00A1]/.test(text)) return "es-ES";
  if (/[\u00C0\u00E0\u00C2\u00E2\u00C6\u00E6\u00C7\u00E7\u00C8-\u00CB\u00E8-\u00EB\u00CE\u00EE\u00CF\u00EF\u00D4\u00F4\u0152\u0153\u00D9\u00F9\u00DB\u00FB\u00DC\u00FC\u0178\u00FF]/.test(text)) return "fr-FR";
  if (/[\u00C4\u00E4\u00D6\u00F6\u00DC\u00FC\u00DF]/.test(text)) return "de-DE";
  if (/[\u00C3\u00E3\u00D5\u00F5\u00C7\u00E7]/.test(text)) return "pt-PT";
  return "en-US";
}

export function resolveAraySpeechLanguage(text: string, requestOrCode?: string | null): string {
  return inferRequestedLanguage(requestOrCode) ?? inferSpeechLanguage(text);
}

const EN_TO_RU_KEYBOARD: Record<string, string> = {
  q: "й", w: "ц", e: "у", r: "к", t: "е", y: "н", u: "г", i: "ш", o: "щ", p: "з", "[": "х", "]": "ъ",
  a: "ф", s: "ы", d: "в", f: "а", g: "п", h: "р", j: "о", k: "л", l: "д", ";": "ж", "'": "э",
  z: "я", x: "ч", c: "с", v: "м", b: "и", n: "т", m: "ь", ",": "б", ".": "ю", "`": "ё",
  Q: "Й", W: "Ц", E: "У", R: "К", T: "Е", Y: "Н", U: "Г", I: "Ш", O: "Щ", P: "З", "{": "Х", "}": "Ъ",
  A: "Ф", S: "Ы", D: "В", F: "А", G: "П", H: "Р", J: "О", K: "Л", L: "Д", ":": "Ж", "\"": "Э",
  Z: "Я", X: "Ч", C: "С", V: "М", B: "И", N: "Т", M: "Ь", "<": "Б", ">": "Ю", "~": "Ё",
};

const RU_LAYOUT_HINTS = [
  "арай", "привет", "брат", "как", "ты", "да", "нет", "что", "где", "покажи", "открой", "найди",
  "заказ", "заказы", "клиент", "клиенты", "чат", "чаты", "диалог", "спасибо", "сделай", "проверь",
  "товар", "цена", "корзина", "задача", "сайт", "медиа", "аналитика",
];

export function convertEnglishKeyboardToRussian(text: string) {
  return Array.from(text).map((char) => EN_TO_RU_KEYBOARD[char] ?? char).join("");
}

export function normalizeArayHumanInput(text: string) {
  const original = text.trim();
  if (!original || /[а-яё]/i.test(original) || !/[a-z,[\].;'`]/i.test(original)) {
    return { text: original, corrected: false, original };
  }

  const converted = convertEnglishKeyboardToRussian(original).trim();
  if (!/[а-яё]/i.test(converted)) return { text: original, corrected: false, original };

  const normalizedConverted = converted.toLowerCase().replace(/ё/g, "е");
  const hasRussianHint = RU_LAYOUT_HINTS.some((word) => normalizedConverted.includes(word));

  return hasRussianHint
    ? { text: converted, corrected: true, original }
    : { text: original, corrected: false, original };
}

export function hasBrowserVoiceFor(lang: string): boolean {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
  try {
    const voices = window.speechSynthesis.getVoices();
    const requested = lang.toLowerCase();
    const base = requested.split("-")[0];
    return voices.some((voice) => {
      const voiceLang = voice.lang.toLowerCase();
      return voiceLang === requested || voiceLang.split("-")[0] === base;
    });
  } catch {
    return false;
  }
}

export function canUseArayTtsProxy(lang: string): boolean {
  return lang.toLowerCase().startsWith("ru");
}
