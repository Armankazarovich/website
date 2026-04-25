/**
 * TTS Text Cleaner — подготовка текста для ElevenLabs voice "Anton Ru".
 *
 * Очищает markdown, эмодзи, спецсимволы. Расшифровывает аббревиатуры,
 * популярную латиницу, единицы измерения, валюты. Делает паузы из скобок.
 *
 * Цель: чтобы Арай произносил естественно и понятно — без "плюс семь тире..."
 * и без "ГОСТ восемь четыре восемь шесть тире" буквально.
 */

// ─── Базовые правила очистки ─────────────────────────────────────────────────

function stripMarkdown(s: string): string {
  return s
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`(.*?)`/g, "$1")
    .replace(/#{1,6}\s/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/~~(.*?)~~/g, "$1");
}

function stripEmoji(s: string): string {
  return s
    .replace(/[\u{1F300}-\u{1FFFF}]/gu, "")
    .replace(/[\u{2600}-\u{27BF}]/gu, "")
    .replace(/[\u{1F000}-\u{1F02F}]/gu, "")
    .replace(/[\u{2700}-\u{27BF}]/gu, "");
}

function stripUrlsAndEmails(s: string): string {
  return s
    .replace(/https?:\/\/[^\s]+/gi, " ссылка ")
    .replace(/(?<!\w)([\w.-]+@[\w.-]+\.\w+)(?!\w)/g, " адрес почты ")
    .replace(/\b([a-z0-9-]+)\.(ru|com|net|org|io|app|store|online)\b/gi, " ссылка ");
}

// ─── Аббревиатуры (по стандарту русского произношения) ───────────────────────

const ABBREVIATIONS: Array<[RegExp, string]> = [
  // Стандарты и нормативы
  [/\bГОСТ\b/g, "гост"],
  [/\bСНиП\b/g, "сни́п"],
  [/\bСанПиН\b/g, "санпи́н"],
  [/\bТУ\b/g, "те у"],
  [/\bТР\s+ТС\b/g, "те эр те эс"],
  [/\bФЗ\b/g, "эф зэ"],

  // Государство и органы
  [/\bРФ\b/g, "эр эф"],
  [/\bЕС\b/g, "евросоюз"],
  [/\bРЖД\b/g, "эр жэ дэ"],
  [/\bФНС\b/g, "эф эн эс"],
  [/\bМВД\b/g, "эм вэ дэ"],
  [/\bАЗС\b/g, "а зэ эс"],

  // Бизнес-формы
  [/\bООО\b/g, "общество с ограниченной ответственностью"],
  [/\bАО\b/g, "акционерное общество"],
  [/\bПАО\b/g, "пэ а о"],
  [/\bИП\b/g, "и пэ"],
  [/\bИНН\b/g, "и эн эн"],
  [/\bКПП\b/g, "ка пэ пэ"],
  [/\bОГРН\b/g, "о гэ эр эн"],
  [/\bБИК\b/g, "бик"],
  [/\bНДС\b/g, "эн дэ эс"],
  [/\bНДФЛ\b/g, "эн дэ эф эл"],

  // Регионы / адреса
  [/\bМО\b/g, "московская область"],
  [/\bЛО\b/g, "ленинградская область"],
  [/\bСПб\b/g, "санкт-петербург"],
  [/\bМКАД\b/g, "эм ка а дэ"],
  [/\bЦКАД\b/g, "цэ ка а дэ"],

  // Курьерские
  [/\bСДЭК\b/g, "сдэк"],
  [/\bDHL\b/gi, "дэ ха эл"],

  // Технические (популярные)
  [/\bAPI\b/g, "эй пи ай"],
  [/\bSEO\b/g, "сео"],
  [/\bSMS\b/g, "эс эм эс"],
  [/\bMMS\b/g, "эм эм эс"],
  [/\bIT\b/g, "ай ти"],
  [/\bAI\b/g, "эй ай"],
];

function expandAbbreviations(s: string): string {
  for (const [re, replacement] of ABBREVIATIONS) {
    s = s.replace(re, replacement);
  }
  return s;
}

// ─── Латиница (популярные слова → русское произношение) ──────────────────────

const LATIN_WORDS: Array<[RegExp, string]> = [
  [/\bWhatsApp\b/gi, "вотсап"],
  [/\bTelegram\b/gi, "телеграм"],
  [/\bViber\b/gi, "вайбер"],
  [/\bInstagram\b/gi, "инстаграм"],
  [/\bFacebook\b/gi, "фейсбук"],
  [/\bYouTube\b/gi, "ютьюб"],
  [/\bTikTok\b/gi, "тикток"],
  [/\bЯндекс\.Директ\b/gi, "яндекс директ"],
  [/\bЯндекс\.Метрика\b/gi, "яндекс метрика"],
  [/\bGoogle\b/gi, "гугл"],
  [/\bYandex\b/gi, "яндекс"],
  [/\biPhone\b/gi, "айфон"],
  [/\biPad\b/gi, "айпад"],
  [/\bAndroid\b/gi, "андроид"],
  [/\bemail\b/gi, "имэйл"],
  [/\be-mail\b/gi, "имэйл"],
  [/\bUSB\b/gi, "ю эс би"],
  [/\bPDF\b/gi, "пэ дэ эф"],
  [/\bUSD\b/gi, "доллар"],
  [/\bEUR\b/gi, "евро"],
  [/\bRUB\b/gi, "рубль"],
];

function expandLatinWords(s: string): string {
  for (const [re, replacement] of LATIN_WORDS) {
    s = s.replace(re, replacement);
  }
  return s;
}

// ─── Единицы измерения и валюты ──────────────────────────────────────────────

function expandUnits(s: string): string {
  // Составные ЕДИНИЦЫ (сначала, чтобы не было конфликтов с одиночными)
  s = s.replace(/₽\s*\/\s*м[³3]/gi, " рублей за кубометр");
  s = s.replace(/₽\s*\/\s*шт\.?/gi, " рублей за штуку");
  s = s.replace(/₽\s*\/\s*м[²2]/gi, " рублей за квадратный метр");
  s = s.replace(/₽\s*\/\s*п\.?\s*м\.?/gi, " рублей за погонный метр");
  s = s.replace(/₽\s*\/\s*уп\.?/gi, " рублей за упаковку");
  s = s.replace(/₽\s*\/\s*кг/gi, " рублей за килограмм");
  s = s.replace(/₽\s*\/\s*т(?![а-яА-Я])/gi, " рублей за тонну");

  // Валюты одиночные
  s = s.replace(/₽/g, " рублей");
  s = s.replace(/\$/g, " долларов");
  s = s.replace(/€/g, " евро");
  s = s.replace(/£/g, " фунтов");
  s = s.replace(/¥/g, " йен");

  // Метрические единицы
  s = s.replace(/м[³3]/gi, "кубометров");
  s = s.replace(/м[²2]/gi, "квадратных метров");
  s = s.replace(/п\.?\s*м\.?(?!\w)/g, "погонных метров");
  s = s.replace(/(\d)\s*мм(?![а-яА-Я])/gi, "$1 миллиметров");
  s = s.replace(/(\d)\s*см(?![а-яА-Я])/gi, "$1 сантиметров");
  s = s.replace(/(\d)\s*кг(?![а-яА-Я])/gi, "$1 килограмм");
  s = s.replace(/(\d)\s*т(?![а-яА-Я])/g, "$1 тонн");

  return s;
}

// ─── Числа, размеры, телефоны ────────────────────────────────────────────────

function normalizeNumbers(s: string): string {
  // 1. Размеры через × / x → "на"
  s = s.replace(/(\d+(?:[.,]\d+)?)\s*[xхXХ×]\s*(\d+(?:[.,]\d+)?)/g, "$1 на $2");

  // 2. Телефоны: тире между цифрами → пробел
  s = s.replace(/(\d)\s*[-–—]\s*(\d)/g, "$1 $2");

  // 3. Скобки в номерах телефонов
  s = s.replace(/\((\d+)\)/g, " $1 ");

  // 4. "+7" в начале → "плюс 7"
  s = s.replace(/(\+)(\d)/g, "плюс $2");

  // 5. Пробелы в больших числах: "25 000" → "25000"
  s = s.replace(/(\d)\s+(\d{3}\b)/g, "$1$2");

  return s;
}

// ─── Спецсимволы и пунктуация ────────────────────────────────────────────────

function normalizePunctuation(s: string): string {
  // Bullet points и тире → запятые (паузы)
  s = s.replace(/[•·]/g, ", ");
  s = s.replace(/\s*[—–]\s*/g, ", ");

  // Слеши и техсимволы
  s = s.replace(/\//g, " ");
  s = s.replace(/[<>{}[\]|\\^~`#@&]/g, " ");

  // Скобки → запятые (паузы вокруг)
  s = s.replace(/\s*\(\s*/g, ", ");
  s = s.replace(/\s*\)\s*/g, ", ");

  // Кавычки → удалить (ElevenLabs читает их буквально)
  s = s.replace(/[«»""„""''']/g, "");

  // Множественные знаки
  s = s.replace(/\.{3,}/g, "...");
  s = s.replace(/!{2,}/g, "!");
  s = s.replace(/\?{2,}/g, "?");

  // Лишние запятые
  s = s.replace(/\s*,\s*,+/g, ",");
  s = s.replace(/^[\s,]+/, "");
  s = s.replace(/[\s,]+$/, "");

  // Множественные пробелы
  s = s.replace(/\s{2,}/g, " ");

  // Пробел перед знаком препинания убрать
  s = s.replace(/\s+([.,!?:])/g, "$1");

  return s.trim();
}

// ─── Главная функция ─────────────────────────────────────────────────────────

const MAX_LENGTH = 1500;

export function cleanForTTS(text: string): string {
  if (!text || typeof text !== "string") return "";

  let s = text;

  s = stripMarkdown(s);
  s = stripEmoji(s);
  s = stripUrlsAndEmails(s);
  s = expandAbbreviations(s);
  s = expandLatinWords(s);
  s = expandUnits(s);
  s = normalizeNumbers(s);
  s = normalizePunctuation(s);

  // Финальный лимит
  if (s.length > MAX_LENGTH) {
    s = s.slice(0, MAX_LENGTH);
    // Обрезаем по последнему предложению
    const lastDot = Math.max(s.lastIndexOf("."), s.lastIndexOf("!"), s.lastIndexOf("?"));
    if (lastDot > MAX_LENGTH * 0.7) s = s.slice(0, lastDot + 1);
  }

  return s;
}
