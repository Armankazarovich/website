/**
 * CRM Document Templates — CRUD + генерация
 * GET  — список шаблонов
 * POST — создать шаблон или сгенерировать документ
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireManager } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const authResult = await requireManager();
  if (!authResult.authorized) return authResult.response;

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type"); // KP, CONTRACT, INVOICE, ACT, UPD, CUSTOM
  const includeGenerated = searchParams.get("generated") === "true";

  try {
    const where: any = {};
    if (type) where.type = type;

    const templates = await prisma.documentTemplate.findMany({
      where,
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: includeGenerated
        ? { documents: { take: 10, orderBy: { createdAt: "desc" } } }
        : undefined,
    });

    return NextResponse.json({ templates });
  } catch (e: any) {
    return NextResponse.json({ templates: [] });
  }
}

export async function POST(req: Request) {
  const authResult = await requireManager();
  if (!authResult.authorized) return authResult.response;

  try {
    const body = await req.json();

    // Генерация документа из шаблона
    if (body.generate) {
      const { templateId, data, orderId, leadId } = body;
      const template = await prisma.documentTemplate.findUnique({ where: { id: templateId } });
      if (!template) return NextResponse.json({ error: "Шаблон не найден" }, { status: 404 });

      // Заменяем переменные в шаблоне
      let html = template.content;
      for (const [key, value] of Object.entries(data || {})) {
        html = html.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), String(value ?? ""));
      }

      const fileName = `${template.type}_${Date.now()}.pdf`;

      const doc = await prisma.generatedDocument.create({
        data: {
          templateId,
          orderId: orderId || null,
          leadId: leadId || null,
          fileName,
          fileUrl: `/uploads/documents/${fileName}`,
          data: data || {},
        },
      });

      return NextResponse.json({ ok: true, document: doc, html });
    }

    // Создать шаблон
    const { name, type, content, variables, nicheTag } = body;
    if (!name || !type || !content) {
      return NextResponse.json({ error: "Название, тип и содержимое обязательны" }, { status: 400 });
    }

    const template = await prisma.documentTemplate.create({
      data: {
        name,
        type,
        content,
        variables: variables || [],
        nicheTag: nicheTag || null,
      },
    });

    return NextResponse.json({ ok: true, template });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
