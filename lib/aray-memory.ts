/**
 * АРАЙ — Система памяти
 * Автоматически запоминает факты о каждом человеке
 * Работает для авторизованных (userId) и гостей (sessionId)
 */

import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";

export type ArayFacts = Record<string, string | number | boolean>;

// ─── Получить или создать память ──────────────────────────────────────────────

export async function getOrCreateMemory(userId?: string | null, sessionId?: string | null) {
  if (!userId && !sessionId) return null;

  try {
    // Авторизованный пользователь
    if (userId) {
      const existing = await prisma.arayMemory.findUnique({ where: { userId } });
      if (existing) return existing;
      return await prisma.arayMemory.create({ data: { userId } });
    }

    // Гость по sessionId
    if (sessionId) {
      const existing = await prisma.arayMemory.findUnique({ where: { sessionId } });
      if (existing) return existing;
      return await prisma.arayMemory.create({ data: { sessionId } });
    }
  } catch (err) {
    console.error("[ArayMemory] getOrCreate error:", err);
  }
  return null;
}

// ─── Форматировать память для системного промпта ──────────────────────────────

export function formatMemoryForPrompt(memory: Awaited<ReturnType<typeof getOrCreateMemory>>): string {
  if (!memory) return "";

  const facts = memory.facts as ArayFacts;
  const factEntries = Object.entries(facts).filter(([_, v]) => v !== null && v !== undefined && v !== "");

  if (factEntries.length === 0 && !memory.summary) return "";

  const lines: string[] = ["\n━━━ ЧТО Я ПОМНЮ О ТЕБЕ ━━━"];

  if (factEntries.length > 0) {
    factEntries.forEach(([key, val]) => {
      lines.push(`• ${key}: ${val}`);
    });
  }

  if (memory.summary) {
    lines.push(`\nИстория: ${memory.summary}`);
  }

  const levelLabels = {
    NOVICE: "Новичок",
    BUILDER: "Строитель",
    MASTER: "Мастер",
    PARTNER: "Партнёр ARAY",
  };
  lines.push(`\nУровень: ${levelLabels[memory.level as keyof typeof levelLabels] || "Новичок"} · ${memory.totalChats} диалогов`);

  lines.push("\nИспользуй эти знания — обращайся по имени если знаешь, учитывай проект, не переспрашивай то что уже знаешь.");

  return lines.join("\n");
}

// ─── Автоматически извлечь факты из диалога ──────────────────────────────────

export async function extractAndUpdateMemory(
  memoryId: string,
  existingFacts: ArayFacts,
  messages: { role: string; content: string }[],
  anthropic: Anthropic
): Promise<void> {
  if (messages.length < 2) return; // Слишком мало сообщений

  try {
    // Берём последние 6 сообщений для извлечения фактов
    const recentMessages = messages.slice(-6);
    const conversation = recentMessages
      .map(m => `${m.role === "user" ? "Человек" : "Арай"}: ${m.content}`)
      .join("\n");

    const extraction = await anthropic.messages.create({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 400,
      system: `Ты извлекаешь факты о пользователе из диалога с ИИ-ассистентом магазина пиломатериалов.

Верни ТОЛЬКО валидный JSON объект с новыми фактами на русском языке.
Ключи — короткие описания (имя, проект, материал, размер_участка, бюджет, город, способ_связи и т.д.)
Значения — конкретные данные.

Уже известные факты: ${JSON.stringify(existingFacts)}

Если нет новых фактов — верни {}
Не повторяй уже известные факты.
ТОЛЬКО JSON, без пояснений.`,
      messages: [{ role: "user", content: conversation }],
    });

    const textBlock = extraction.content.find(b => b.type === "text");
    if (!textBlock || textBlock.type !== "text") return;

    // Парсим JSON — безопасно
    const text = textBlock.text.trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return;

    const newFacts = JSON.parse(jsonMatch[0]) as ArayFacts;
    const updatedFacts = Object.keys(newFacts).length > 0
      ? { ...existingFacts, ...newFacts }
      : existingFacts;

    // Обновляем память — totalChats всегда растёт, факты только если есть новые
    await prisma.arayMemory.update({
      where: { id: memoryId },
      data: {
        facts: updatedFacts,
        lastMessages: messages.slice(-10) as any,
        totalChats: { increment: 1 },
        updatedAt: new Date(),
      },
    });
  } catch (err) {
    console.error("[ArayMemory] extract error:", err);
  }
}

// ─── Обновить уровень клиента по количеству заказов ──────────────────────────

export async function updateCustomerLevel(memoryId: string, userId: string): Promise<void> {
  try {
    const orderCount = await prisma.order.count({
      where: { userId, status: { notIn: ["CANCELLED"] } },
    });

    const level =
      orderCount >= 25 ? "PARTNER" :
      orderCount >= 10 ? "MASTER" :
      orderCount >= 3  ? "BUILDER" :
      "NOVICE";

    await prisma.arayMemory.update({
      where: { id: memoryId },
      data: { level: level as any, totalPoints: orderCount * 100 },
    });
  } catch (err) {
    console.error("[ArayMemory] level update error:", err);
  }
}
