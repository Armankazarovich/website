/**
 * Google Generative AI - Примеры использования
 * Документация по использованию API генерации контента
 */

/**
 * ПРИМЕР 1: Генерация изображения на клиенте (fetch)
 * ─────────────────────────────────────────────────
 */
export const exampleClientImageGeneration = async () => {
  const prompt = "красивая деревянная доска светлого цвета на фоне природы";

  try {
    const response = await fetch("/api/ai/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        type: "image",
        sampleCount: 1,
        aspectRatio: "1:1",
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const result = await response.json();

    if (result.success && result.data) {
      // result.data содержит base64-encoded PNG/JPEG
      // Можно использовать как <img src={`data:image/png;base64,${result.data}`} />
      console.log("Изображение успешно сгенерировано");
      return result.data;
    } else {
      console.error("Ошибка:", result.error);
      return null;
    }
  } catch (error) {
    console.error("Ошибка при запросе:", error);
    return null;
  }
};

/**
 * ПРИМЕР 2: Генерация текста на клиенте
 * ────────────────────────────────────────
 */
export const exampleClientTextGeneration = async () => {
  const prompt =
    "Напиши краткое описание преимуществ использования деревянных материалов в строительстве";

  try {
    const response = await fetch("/api/ai/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        type: "text",
        maxTokens: 500,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const result = await response.json();

    if (result.success && result.data) {
      console.log("Текст:", result.data);
      return result.data;
    } else {
      console.error("Ошибка:", result.error);
      return null;
    }
  } catch (error) {
    console.error("Ошибка при запросе:", error);
    return null;
  }
};

/**
 * ПРИМЕР 3: Использование на сервере (импорт функций напрямую)
 * ──────────────────────────────────────────────────────────────
 */
export const exampleServerSideGeneration = async () => {
  // В Server Component или API route можно импортировать функции напрямую
  const { generateImage, generateText } = await import("@/lib/google-ai");

  // Генерация изображения
  const imageResult = await generateImage({
    prompt: "современный интерьер деревянного дома",
    aspectRatio: "16:9",
    sampleCount: 1,
  });

  if (imageResult.success) {
    console.log("Изображение готово, размер base64:", imageResult.data?.length);
  }

  // Генерация текста
  const textResult = await generateText({
    prompt: "Какие виды пиломатериалов лучше всего подходят для строительства?",
    maxTokens: 800,
  });

  if (textResult.success) {
    console.log("Текст:", textResult.data);
  }

  return { imageResult, textResult };
};

/**
 * ПРИМЕР 4: React компонент для генерации изображения
 * ────────────────────────────────────────────────────
 * Использование в: components/ai/image-generator.tsx
 */
export const exampleReactComponent = `
"use client";

import { useState } from "react";

export function ImageGenerator() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          type: "image",
          aspectRatio: "1:1",
        }),
      });

      const result = await response.json();

      if (result.success) {
        setImageBase64(result.data);
      } else {
        setError(result.error || "Неизвестная ошибка");
      }
    } catch (err) {
      setError("Ошибка при запросе к серверу");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1>Генератор изображений</h1>

      <input
        type="text"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Опиши изображение..."
        className="w-full p-2 border rounded mb-4"
        disabled={loading}
      />

      <button
        onClick={handleGenerate}
        disabled={loading || !prompt}
        className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
      >
        {loading ? "Генерирую..." : "Сгенерировать"}
      </button>

      {error && <p className="text-red-600 mt-4">{error}</p>}

      {imageBase64 && (
        <div className="mt-6">
          <img
            src={\`data:image/png;base64,\${imageBase64}\`}
            alt="Генерированное изображение"
            className="w-full max-w-md rounded"
          />
        </div>
      )}
    </div>
  );
}
`;

/**
 * ПРИМЕР 5: Параметры и опции
 * ───────────────────────────
 */
export const parameterDocumentation = {
  image: {
    prompt: {
      type: "string",
      description: "Описание изображения",
      maxLength: 1000,
      example: "красивая деревянная фактура",
    },
    sampleCount: {
      type: "number",
      description: "Количество вариантов (1-4)",
      default: 1,
      example: 1,
    },
    aspectRatio: {
      type: "enum",
      description: "Соотношение сторон",
      values: ["1:1", "3:4", "4:3", "9:16", "16:9"],
      default: "1:1",
      example: "16:9",
    },
  },
  text: {
    prompt: {
      type: "string",
      description: "Промпт для текста",
      maxLength: 1000,
      example: "Напиши описание продукта",
    },
    maxTokens: {
      type: "number",
      description: "Максимальное количество токенов (100-4000)",
      default: 1024,
      example: 500,
    },
  },
};

/**
 * ПРИМЕР 6: Обработка ошибок
 * ──────────────────────────
 */
export const errorHandlingExample = `
// API может вернуть разные коды ошибок:

// 400 - Некорректный промпт или параметры
if (response.status === 400) {
  // Попроси пользователя переформулировать запрос
}

// 403 - Проблема с API ключом
if (response.status === 403) {
  // Проверь GOOGLE_AI_API_KEY в .env
}

// 429 - Слишком много запросов (rate limit)
if (response.status === 429) {
  // Внедри exponential backoff
  // Запроси подождать 1-2 секунды
}

// 500+ - Сервер Google временно недоступен
if (response.status >= 500) {
  // Предложи попробовать позже
}
`;

/**
 * ПРИМЕР 7: Сохранение изображения на диск
 * ────────────────────────────────────────────
 * Использование в Server Action или API route
 */
export const exampleSaveToFile = `
import fs from "fs/promises";
import path from "path";

export async function saveGeneratedImage(base64: string, filename: string) {
  // Убрать префикс data:image/png;base64, если есть
  const base64Data = base64.replace(/^data:image\\/\\w+;base64,/, "");

  // Преобразовать в Buffer
  const imageBuffer = Buffer.from(base64Data, "base64");

  // Сохранить в public/generated или custom папку
  const uploadDir = path.join(process.cwd(), "public", "generated");
  await fs.mkdir(uploadDir, { recursive: true });

  const filepath = path.join(uploadDir, filename);
  await fs.writeFile(filepath, imageBuffer);

  // Вернуть публичный URL
  return \`/generated/\${filename}\`;
}

// Использование:
// const url = await saveGeneratedImage(imageBase64, "product-01.png");
// console.log("Сохранено:", url);
`;
