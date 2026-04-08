export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";

export async function GET() {
  const key = process.env.ANTHROPIC_API_KEY;
  const elKey = process.env.ELEVENLABS_API_KEY;

  if (!key) {
    return NextResponse.json({ status: "error", reason: "ANTHROPIC_API_KEY не найден в env" });
  }

  // Тест Anthropic — простой запрос
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 10,
        messages: [{ role: "user", content: "Say: OK" }],
      }),
    });

    const data = await res.json();

    if (res.ok) {
      return NextResponse.json({
        status: "ok",
        anthropic: "✅ работает",
        keyPrefix: key.slice(0, 20) + "...",
        elevenlabs: elKey ? "✅ ключ есть" : "❌ нет ключа",
        response: data?.content?.[0]?.text || "got response",
      });
    } else {
      return NextResponse.json({
        status: "error",
        anthropic: "❌ ошибка",
        httpStatus: res.status,
        error: data?.error?.message || JSON.stringify(data),
        keyPrefix: key.slice(0, 20) + "...",
        elevenlabs: elKey ? "✅ ключ есть" : "❌ нет ключа",
      });
    }
  } catch (e: any) {
    return NextResponse.json({
      status: "error",
      anthropic: "❌ сеть",
      error: e?.message,
      keyPrefix: key.slice(0, 20) + "...",
    });
  }
}
