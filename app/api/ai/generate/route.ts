/**
 * Google Gemini AI Generation API Route
 * POST /api/ai/generate
 *
 * Body: { prompt: string, type: "image" | "text", options?: {...} }
 * Returns: { success: boolean, data?: string (base64), error?: string }
 */

export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { generateImage, generateText } from "@/lib/google-ai";
import { z } from "zod";

// Validation schemas
const GenerateImageParamsSchema = z.object({
  prompt: z.string().min(1, "Промпт не может быть пустым").max(1000),
  type: z.literal("image"),
  sampleCount: z.number().int().min(1).max(4).optional(),
  aspectRatio: z
    .enum(["1:1", "3:4", "4:3", "9:16", "16:9"])
    .optional(),
});

const GenerateTextParamsSchema = z.object({
  prompt: z.string().min(1, "Промпт не может быть пустым").max(1000),
  type: z.literal("text"),
  maxTokens: z.number().int().min(100).max(4000).optional(),
});

const RequestBodySchema = z.union([
  GenerateImageParamsSchema,
  GenerateTextParamsSchema,
]);

type RequestBody = z.infer<typeof RequestBodySchema>;

interface ApiResponse {
  success: boolean;
  data?: string;
  error?: string;
  type?: string;
  generatedAt?: string;
}

/**
 * POST /api/ai/generate
 * Обработка запросов на генерацию контента через Google Gemini
 */
export async function POST(req: NextRequest): Promise<Response> {
  const encoder = new TextEncoder();

  try {
    // Проверка наличия API ключа
    if (!process.env.GOOGLE_AI_API_KEY) {
      const response: ApiResponse = {
        success: false,
        error: "GOOGLE_AI_API_KEY не настроен на сервере",
      };

      return new Response(JSON.stringify(response), {
        status: 503,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Парсинг тела запроса
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      const response: ApiResponse = {
        success: false,
        error: "Некорректный JSON в теле запроса",
      };

      return new Response(JSON.stringify(response), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Валидация данных
    const validation = RequestBodySchema.safeParse(body);
    if (!validation.success) {
      const errors = validation.error.errors
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join("; ");

      const response: ApiResponse = {
        success: false,
        error: `Ошибка валидации: ${errors}`,
      };

      return new Response(JSON.stringify(response), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const params = validation.data as RequestBody;

    // Обработка запроса на генерацию изображения
    if (params.type === "image") {
      const result = await generateImage({
        prompt: params.prompt,
        sampleCount: params.sampleCount,
        aspectRatio: params.aspectRatio,
      });

      const response: ApiResponse = {
        success: result.success,
        ...(result.success
          ? { data: result.data, type: "image" }
          : { error: result.error }),
        generatedAt: new Date().toISOString(),
      };

      return new Response(JSON.stringify(response), {
        status: result.success ? 200 : 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Обработка запроса на генерацию текста
    if (params.type === "text") {
      const result = await generateText({
        prompt: params.prompt,
        maxTokens: params.maxTokens,
      });

      const response: ApiResponse = {
        success: result.success,
        ...(result.success
          ? { data: result.data, type: "text" }
          : { error: result.error }),
        generatedAt: new Date().toISOString(),
      };

      return new Response(JSON.stringify(response), {
        status: result.success ? 200 : 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Неизвестный тип генерации
    const response: ApiResponse = {
      success: false,
      error: `Неизвестный тип генерации: ${(params as any).type}`,
    };

    return new Response(JSON.stringify(response), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("[AI Generate Route Error]", error?.message || error);

    const response: ApiResponse = {
      success: false,
      error: "Ошибка сервера при обработке запроса",
    };

    return new Response(JSON.stringify(response), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

/**
 * GET /api/ai/generate
 * Возвращает информацию об API и примеры использования
 */
export async function GET(req: NextRequest): Promise<Response> {
  const info = {
    endpoint: "/api/ai/generate",
    methods: ["POST"],
    description: "Генерация изображений и текста через Google Gemini API",
    exampleImageRequest: {
      method: "POST",
      body: {
        prompt: "красивый пейзаж с горами",
        type: "image",
        sampleCount: 1,
        aspectRatio: "1:1",
      },
    },
    exampleTextRequest: {
      method: "POST",
      body: {
        prompt: "Напиши рецепт борща",
        type: "text",
        maxTokens: 1024,
      },
    },
    responseFormat: {
      success: "boolean",
      data: "string (base64 для image, текст для text)",
      error: "string (если success = false)",
      generatedAt: "ISO 8601 timestamp",
    },
    requiredEnvVars: ["GOOGLE_AI_API_KEY"],
    models: {
      image: "imagen-3.0-generate-002",
      text: "gemini-2.0-flash",
    },
  };

  return new Response(JSON.stringify(info), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
