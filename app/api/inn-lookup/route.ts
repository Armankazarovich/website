export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const inn = req.nextUrl.searchParams.get("inn");

  if (!inn || !/^\d{10}(\d{2})?$/.test(inn)) {
    return NextResponse.json({ error: "Неверный ИНН" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://api-fns.ru/api/egr?req=${inn}&key=free`,
      { headers: { "User-Agent": "Mozilla/5.0" }, next: { revalidate: 0 } }
    );

    if (!res.ok) {
      return NextResponse.json({ error: "Не найдено" }, { status: 404 });
    }

    const data = await res.json();
    const item = data?.items?.[0];

    if (!item) {
      return NextResponse.json({ error: "Организация не найдена" }, { status: 404 });
    }

    // Нормализуем ответ (ЮЛ или ИП)
    const isIP = !!item.ИП;
    const entity = item.ЮЛ || item.ИП;

    const name = isIP
      ? `ИП ${entity?.ФИОПолн || ""}`
      : entity?.НаимСокрЮЛ || entity?.НаимПолнЮЛ || "";

    const kpp = entity?.КПП || "";
    const address = entity?.Адрес?.АдресПолн || entity?.АдрМНЮЛ?.АдресПолн || "";

    return NextResponse.json({ name, kpp, address, inn });
  } catch {
    return NextResponse.json({ error: "Ошибка запроса" }, { status: 500 });
  }
}
