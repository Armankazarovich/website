import { prepareAraySpeechText } from "../lib/aray-speech";

type Case = {
  name: string;
  input: string;
  includes: string[];
  excludes?: RegExp[];
};

const unsafeRawSymbols = /[₽€$№#@<>{}[\]\\^~×]/;

const cases: Case[] = [
  {
    name: "prices, dimensions, VAT, percent",
    input: "Цена 9 500 ₽/м³, доска 50×150×6000, НДС 20%.",
    includes: ["9500 рублей за кубометр", "50 на 150 на 6000", "эн дэ эс", "20 процентов"],
  },
  {
    name: "phone and order number",
    input: "Телефон +7 (985) 123-45-67, заказ №15.",
    includes: ["плюс 7 9 8 5 1 2 3 4 5 6 7", "номер 15"],
  },
  {
    name: "ranges, math, decimals",
    input: "Диапазон 3-5 дней, формула 5+3=8, 2,5 м².",
    includes: ["от 3 до 5", "5 плюс 3 равно 8", "2 целых 5 десятых квадратных метра"],
  },
  {
    name: "codes and marketing terms",
    input: "Код SKU AB-123, UTM, CTR, CPC, Direct, Metrika, JSON, CSV.",
    includes: ["эс ка ю", "эй би 1 2 3", "ю ти эм", "си ти ар", "си пи си", "Директ", "Метрика", "джейсон", "си эс ви"],
  },
  {
    name: "human empty states",
    input: "Нет заказов. Задач по этому фильтру нет. Клиентов пока нет.",
    includes: ["Нет заказов", "Задач по этому фильтру нет", "Клиентов пока нет"],
    excludes: [/\b0\s+(?:заказ|заказов|заказа|задач|клиент)/i],
  },
  {
    name: "task date and time",
    input: "Срок: 2026-05-21T14:00:00.000Z.",
    includes: ["21 мая 2026 года", "17 часов", "по Москве"],
    excludes: [/T14:00:00/i, /\.000Z/i, /\b2026-05-21\b/],
  },
];

const failures: string[] = [];

for (const item of cases) {
  const output = prepareAraySpeechText(item.input, { maxLength: 1500 });
  for (const expected of item.includes) {
    if (!output.includes(expected)) {
      failures.push(`${item.name}: expected "${expected}" in "${output}"`);
    }
  }
  if (unsafeRawSymbols.test(output)) {
    failures.push(`${item.name}: unsafe raw symbol remains in "${output}"`);
  }
  for (const pattern of item.excludes || []) {
    if (pattern.test(output)) {
      failures.push(`${item.name}: forbidden pattern ${pattern} in "${output}"`);
    }
  }
  console.log(`[ARAY TTS] ${item.name}: ${output}`);
}

if (failures.length > 0) {
  console.error("\n[ARAY TTS] Pronunciation guard failed:");
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log("\n[ARAY TTS] Pronunciation guard passed");
