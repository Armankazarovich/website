/**
 * Google Generative AI Helper Functions
 * Работа с Gemini API для генерации изображений и текста
 */

export interface GenerateImageParams {
  prompt: string;
  sampleCount?: number;
  aspectRatio?: "1:1" | "3:4" | "4:3" | "9:16" | "16:9";
}

export interface GenerateTextParams {
  prompt: string;
  maxTokens?: number;
}

export interface GenerateResponse {
  success: boolean;
  data?: string; // base64 или текст
  error?: string;
}

/**
 * Очистка и оптимизация промпта для лучшего результата
 */
function cleanPrompt(prompt: string): string {
  return prompt
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 1000); // Ограничиваем до 1000 символов
}

/**
 * Генерация изображения через Imagen 3.0
 */
export async function generateImage(
  params: GenerateImageParams
): Promise<GenerateResponse> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;

  if (!apiKey) {
    return {
      success: false,
      error: "GOOGLE_AI_API_KEY не настроен на сервере",
    };
  }

  try {
    const cleanedPrompt = cleanPrompt(params.prompt);

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict",
      {
        method: "POST",
        headers: {
          "x-goog-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          instances: [
            {
              prompt: cleanedPrompt,
            },
          ],
          parameters: {
            sampleCount: params.sampleCount ?? 1,
            aspectRatio: params.aspectRatio ?? "1:1",
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Google AI Image Error]", response.status, errorText);

      if (response.status === 400) {
        return {
          success: false,
          error: "Некорректный промпт для генерации. Проверь текст запроса.",
        };
      }

      if (response.status === 403) {
        return {
          success: false,
          error: "Доступ запрещен. Проверь API ключ и права доступа.",
        };
      }

      if (response.status === 429) {
        return {
          success: false,
          error: "Слишком много запросов. Попробуй через минуту.",
        };
      }

      if (response.status === 500) {
        return {
          success: false,
          error: "Сервер Google временно недоступен. Попробуй позже.",
        };
      }

      return {
        success: false,
        error: `Ошибка API: ${response.status}`,
      };
    }

    const data = await response.json();

    if (!data.predictions || !data.predictions.length) {
      return {
        success: false,
        error: "Не удалось сгенерировать изображение. Попробуй другой промпт.",
      };
    }

    // predictions[0].bytesBase64 содержит base64 изображения
    const base64 = data.predictions[0].bytesBase64;

    if (!base64) {
      return {
        success: false,
        error: "Не удалось получить данные изображения.",
      };
    }

    return {
      success: true,
      data: base64,
    };
  } catch (error: any) {
    console.error("[Google AI Image Exception]", error?.message || error);

    return {
      success: false,
      error: error?.message || "Неизвестная ошибка при генерации изображения",
    };
  }
}

/**
 * Генерация текста через Gemini 2.0 Flash
 */
export async function generateText(
  params: GenerateTextParams
): Promise<GenerateResponse> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;

  if (!apiKey) {
    return {
      success: false,
      error: "GOOGLE_AI_API_KEY не настроен на сервере",
    };
  }

  try {
    const cleanedPrompt = cleanPrompt(params.prompt);

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
      {
        method: "POST",
        headers: {
          "x-goog-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: cleanedPrompt,
                },
              ],
            },
          ],
          generationConfig: {
            maxOutputTokens: params.maxTokens ?? 1024,
            temperature: 0.7,
            topP: 0.95,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Google AI Text Error]", response.status, errorText);

      if (response.status === 400) {
        return {
          success: false,
          error: "Некорректный запрос. Проверь формат промпта.",
        };
      }

      if (response.status === 403) {
        return {
          success: false,
          error: "Доступ запрещен. Проверь API ключ.",
        };
      }

      if (response.status === 429) {
        return {
          success: false,
          error: "Слишком много запросов. Подожди немного.",
        };
      }

      if (response.status === 500) {
        return {
          success: false,
          error: "Сервер Google временно недоступен.",
        };
      }

      return {
        success: false,
        error: `Ошибка API: ${response.status}`,
      };
    }

    const data = await response.json();

    if (!data.candidates || !data.candidates.length) {
      return {
        success: false,
        error: "Не удалось сгенерировать текст.",
      };
    }

    const textContent = data.candidates[0].content?.parts?.[0]?.text;

    if (!textContent) {
      return {
        success: false,
        error: "Не удалось получить текстовый ответ.",
      };
    }

    return {
      success: true,
      data: textContent,
    };
  } catch (error: any) {
    console.error("[Google AI Text Exception]", error?.message || error);

    return {
      success: false,
      error: error?.message || "Неизвестная ошибка при генерации текста",
    };
  }
}

/**
 * Универсальная функция для генерации контента
 */
export async function generateContent(
  type: "image" | "text",
  prompt: string,
  options?: {
    sampleCount?: number;
    aspectRatio?: "1:1" | "3:4" | "4:3" | "9:16" | "16:9";
    maxTokens?: number;
  }
): Promise<GenerateResponse> {
  if (type === "image") {
    return generateImage({
      prompt,
      sampleCount: options?.sampleCount,
      aspectRatio: options?.aspectRatio,
    });
  }

  if (type === "text") {
    return generateText({
      prompt,
      maxTokens: options?.maxTokens,
    });
  }

  return {
    success: false,
    error: `Неизвестный тип генерации: ${type}`,
  };
}
