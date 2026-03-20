import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { name, company, phone, message } = await req.json();
    if (!name || !phone) {
      return NextResponse.json({ error: "Имя и телефон обязательны" }, { status: 400 });
    }
    await prisma.partnershipLead.create({
      data: { name, company: company || null, phone, message: message || null },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Partnership API error:", err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
